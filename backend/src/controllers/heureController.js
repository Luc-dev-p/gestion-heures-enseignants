const { query } = require('../config/database');

// Récupérer toutes les heures
exports.getAll = async (req, res) => {
  try {
    const result = await query(
      `SELECT h.*, e.nom as enseignant_nom, e.prenom as enseignant_prenom, 
              m.intitule as matiere_intitule, a.libelle as annee_libelle
       FROM heures h
       LEFT JOIN enseignants e ON h.enseignant_id = e.id
       LEFT JOIN matieres m ON h.matiere_id = m.id
       LEFT JOIN annees_academiques a ON h.annee_id = a.id
       ORDER BY h.date_cours DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer par enseignant
exports.getByEnseignant = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT h.*, m.intitule as matiere_intitule, a.libelle as annee_libelle
       FROM heures h
       LEFT JOIN matieres m ON h.matiere_id = m.id
       LEFT JOIN annees_academiques a ON h.annee_id = a.id
       WHERE h.enseignant_id = $1
       ORDER BY h.date_cours DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Résumé des heures par enseignant
exports.getResume = async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer les équivalences
    const eqCM = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_cm_td'");
    const eqTP = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_tp_td'");
    const eqCmTd = parseFloat(eqCM.rows[0]?.valeur || 1.5);
    const eqTpTd = parseFloat(eqTP.rows[0]?.valeur || 1);

    // Heures par type (uniquement les heures validées)
    const heures = await query(
      `SELECT type_heure, SUM(duree) as total 
       FROM heures WHERE enseignant_id = $1 AND statut = 'valide'
       GROUP BY type_heure`,
      [id]
    );

    let cm = 0, td = 0, tp = 0;
    heures.rows.forEach(h => {
      if (h.type_heure === 'CM') cm = parseFloat(h.total);
      else if (h.type_heure === 'TD') td = parseFloat(h.total);
      else if (h.type_heure === 'TP') tp = parseFloat(h.total);
    });

    // Heures équivalentes TD
    const heuresEqTD = (cm * eqCmTd) + td + (tp * eqTpTd);

    // Heures contractuelles
    const ens = await query('SELECT heures_contractuelles, taux_horaire FROM enseignants WHERE id = $1', [id]);
    const contractuelles = parseFloat(ens.rows[0]?.heures_contractuelles || 0);
    const taux = parseFloat(ens.rows[0]?.taux_horaire || 0);

    const complementaires = heuresEqTD > contractuelles ? heuresEqTD - contractuelles : 0;
    const montantComplementaires = complementaires * taux;

    // Compter les heures en attente et rejetées
    const enAttente = await query(
      `SELECT COUNT(*) as total FROM heures WHERE enseignant_id = $1 AND statut = 'en_attente'`, [id]
    );
    const rejetees = await query(
      `SELECT COUNT(*) as total FROM heures WHERE enseignant_id = $1 AND statut = 'rejete'`, [id]
    );

    res.json({
      cm, td, tp,
      heures_eq_td: heuresEqTD,
      heures_contractuelles: contractuelles,
      heures_complementaires: complementaires,
      taux_horaire: taux,
      montant_complementaires: montantComplementaires,
      eq_cm_td: eqCmTd,
      eq_tp_td: eqTpTd,
      nb_en_attente: parseInt(enAttente.rows[0]?.total || 0),
      nb_rejetees: parseInt(rejetees.rows[0]?.total || 0),
    });
  } catch (err) {
    console.error('Erreur resume:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer une heure (statut par défaut : en_attente)
exports.create = async (req, res) => {
  try {
    const { enseignant_id, matiere_id, annee_id, date_cours, type_heure, duree, salle, observations } = req.body;
    const result = await query(
      `INSERT INTO heures (enseignant_id, matiere_id, annee_id, date_cours, type_heure, duree, salle, observations, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'en_attente') RETURNING *`,
      [enseignant_id, matiere_id, annee_id || 2, date_cours, type_heure, duree, salle, observations]
    );
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'CREATE', 'heures', $2, $3)`,
      [req.user?.id, result.rows[0].id, `${type_heure} ${duree}h le ${date_cours} (en_attente)`]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Valider une heure
exports.valider = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE heures SET statut = 'valide' WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Heure non trouvee' });
    }
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'VALIDATE', 'heures', $2, 'Validation heure')`,
      [req.user?.id, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Rejeter une heure
exports.rejeter = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE heures SET statut = 'rejete' WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Heure non trouvee' });
    }
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'REJECT', 'heures', $2, 'Rejet heure')`,
      [req.user?.id, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer une heure
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM heures WHERE id = $1', [id]);
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'DELETE', 'heures', $2, 'Suppression heure')`,
      [req.user?.id, id]
    );
    res.json({ message: 'Heure supprimee' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Années académiques
exports.getAnnees = async (req, res) => {
  try {
    const result = await query('SELECT * FROM annees_academiques ORDER BY libelle DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};