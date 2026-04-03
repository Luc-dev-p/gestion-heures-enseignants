const { query } = require('../config/database');

// Récupérer tous les enseignants avec données de paiement (filtrable par annee_id)
exports.getAllPaiements = async (req, res) => {
  try {
    const { annee_id } = req.query;
    const eqCM = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_cm_td'");
    const eqTP = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_tp_td'");
    const eqCmTd = parseFloat(eqCM.rows[0]?.valeur || 1.5);
    const eqTpTd = parseFloat(eqTP.rows[0]?.valeur || 1);

    // Construire la requête avec filtre année sur les heures
    let heuresJoin = 'LEFT JOIN heures h ON e.id = h.enseignant_id';
    const params = [];
    if (annee_id) {
      heuresJoin += ' AND h.annee_id = $1';
      params.push(annee_id);
    }

    const result = await query(
      `SELECT e.id, e.nom, e.prenom, e.grade, e.statut, e.departement, e.taux_horaire, e.heures_contractuelles,
              COALESCE(SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree ELSE 0 END), 0) as cm,
              COALESCE(SUM(CASE WHEN h.type_heure = 'TD' THEN h.duree ELSE 0 END), 0) as td,
              COALESCE(SUM(CASE WHEN h.type_heure = 'TP' THEN h.duree ELSE 0 END), 0) as tp,
              COALESCE(SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree * ${eqCmTd}
                       WHEN h.type_heure = 'TD' THEN h.duree
                       WHEN h.type_heure = 'TP' THEN h.duree * ${eqTpTd} ELSE 0 END), 0) as heures_eq_td
       FROM enseignants e
       ${heuresJoin}
       GROUP BY e.id
       ORDER BY e.nom, e.prenom`,
      params
    );

    // Derniers paiements par enseignant
    const paiements = await query(
      `SELECT DISTINCT ON (enseignant_id) enseignant_id, date_paiement, montant, periode, notes
       FROM paiements
       ORDER BY enseignant_id, created_at DESC`
    );
    const paiementMap = {};
    paiements.rows.forEach(p => { paiementMap[p.enseignant_id] = p; });

    const data = result.rows.map(row => {
      const eqTD = parseFloat(row.heures_eq_td) || 0;
      const contract = parseFloat(row.heures_contractuelles) || 0;
      const complementaires = Math.max(0, eqTD - contract);
      const taux = parseFloat(row.taux_horaire) || 0;
      const montant = complementaires * taux;
      const lastP = paiementMap[row.id];

      return {
        id: row.id,
        nom: row.nom,
        prenom: row.prenom,
        grade: row.grade,
        statut: row.statut,
        departement: row.departement,
        taux_horaire: taux,
        heures_contractuelles: contract,
        cm: parseFloat(row.cm) || 0,
        td: parseFloat(row.td) || 0,
        tp: parseFloat(row.tp) || 0,
        heures_eq_td: eqTD,
        heures_complementaires: complementaires,
        montant: montant,
        dernier_paiement: lastP ? lastP.date_paiement : null,
        montant_dernier: lastP ? parseFloat(lastP.montant) : 0,
        periode_dernier: lastP ? lastP.periode : null,
      };
    });

    res.json(data);
  } catch (err) {
    console.error('Erreur paiements:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Stats paiements (filtrable par annee_id via les heures)
exports.getPaiementStats = async (req, res) => {
  try {
    const { annee_id } = req.query;
    const total = await query('SELECT COUNT(*) FROM enseignants');
    const payes = await query('SELECT COUNT(DISTINCT enseignant_id) FROM paiements');
    const totalPaiements = await query('SELECT COALESCE(SUM(montant), 0) as total_montant, COUNT(*) as nb FROM paiements');
    const periodes = await query('SELECT DISTINCT periode FROM paiements ORDER BY periode DESC LIMIT 10');

    // Si annee_id fourni, calculer les stats des heures complémentaires pour cette année
    let heuresCompl = null;
    if (annee_id) {
      const eqCM = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_cm_td'");
      const eqTP = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_tp_td'");
      const eqCmTd = parseFloat(eqCM.rows[0]?.valeur || 1.5);
      const eqTpTd = parseFloat(eqTP.rows[0]?.valeur || 1);

      const result = await query(
        `SELECT SUM(CASE WHEN h_eq.heures_eq_td > e.heures_contractuelles 
                          THEN (h_eq.heures_eq_td - e.heures_contractuelles) ELSE 0 END) as total_compl,
                SUM(CASE WHEN h_eq.heures_eq_td > e.heures_contractuelles 
                          THEN (h_eq.heures_eq_td - e.heures_contractuelles) * e.taux_horaire ELSE 0 END) as total_montant_compl
         FROM enseignants e
         LEFT JOIN (
           SELECT h.enseignant_id,
                  SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree * ${eqCmTd}
                           WHEN h.type_heure = 'TD' THEN h.duree
                           WHEN h.type_heure = 'TP' THEN h.duree * ${eqTpTd} ELSE 0 END) as heures_eq_td
           FROM heures h WHERE h.annee_id = $1 GROUP BY h.enseignant_id
         ) h_eq ON e.id = h_eq.enseignant_id`,
        [annee_id]
      );
      heuresCompl = result.rows[0];
    }

    res.json({
      total_enseignants: parseInt(total.rows[0].count),
      enseignants_payes: parseInt(payes.rows[0].count),
      total_montant_paye: parseFloat(totalPaiements.rows[0].total_montant) || 0,
      nb_paiements: parseInt(totalPaiements.rows[0].nb),
      periodes: periodes.rows.map(p => p.periode),
      ...(heuresCompl ? {
        total_heures_complementaires: parseFloat(heuresCompl.total_compl) || 0,
        total_montant_complementaires: parseFloat(heuresCompl.total_montant_compl) || 0,
      } : {}),
    });
  } catch (err) {
    console.error('Erreur stats paiements:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un paiement
exports.createPaiement = async (req, res) => {
  try {
    const { enseignant_id, periode, montant, nb_heures_cm, nb_heures_td, nb_heures_tp, nb_heures_eq_td, nb_heures_complementaires, taux_horaire, notes } = req.body;

    if (!enseignant_id || !periode || !montant) {
      return res.status(400).json({ message: 'enseignant_id, periode et montant sont requis' });
    }

    const result = await query(
      `INSERT INTO paiements (enseignant_id, periode, montant, nb_heures_cm, nb_heures_td, nb_heures_tp, nb_heures_eq_td, nb_heures_complementaires, taux_horaire, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [enseignant_id, periode, montant, nb_heures_cm || 0, nb_heures_td || 0, nb_heures_tp || 0, nb_heures_eq_td || 0, nb_heures_complementaires || 0, taux_horaire || 0, notes || null, req.user?.id]
    );

    const ens = await query('SELECT nom, prenom FROM enseignants WHERE id = $1', [enseignant_id]);
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'CREATE', 'paiements', $2, $3)`,
      [req.user?.id, result.rows[0].id, `Paiement de ${montant} FCFA pour ${ens.rows[0]?.nom || ''} ${ens.rows[0]?.prenom || ''}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur create paiement:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Historique des paiements d'un enseignant
exports.getHistorique = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, u.nom as createur_nom
       FROM paiements p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.enseignant_id = $1
       ORDER BY p.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un paiement
exports.deletePaiement = async (req, res) => {
  try {
    await query('DELETE FROM paiements WHERE id = $1', [req.params.id]);
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'DELETE', 'paiements', $2, 'Suppression paiement')`,
      [req.user?.id, req.params.id]
    );
    res.json({ message: 'Paiement supprime' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};