const { query } = require('../config/database');

// ============================================================
// RÉCUPÉRER TOUTES LES HEURES (filtrable par annee_id)
// ============================================================
exports.getAll = async (req, res) => {
  try {
    const { annee_id } = req.query;
    let sql = `SELECT h.*, e.nom as enseignant_nom, e.prenom as enseignant_prenom, 
                      m.intitule as matiere_intitule, a.libelle as annee_libelle
               FROM heures h
               LEFT JOIN enseignants e ON h.enseignant_id = e.id
               LEFT JOIN matieres m ON h.matiere_id = m.id
               LEFT JOIN annees_academiques a ON h.annee_id = a.id`;
    const params = [];
    if (annee_id) {
      sql += ' WHERE h.annee_id = $1';
      params.push(annee_id);
    }
    sql += ' ORDER BY h.date_cours DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// RÉCUPÉRER PAR ENSEIGNANT (filtrable par annee_id)
// ============================================================
exports.getByEnseignant = async (req, res) => {
  try {
    const { id } = req.params;
    const { annee_id } = req.query;
    const params = [id];
    let anneeFilter = '';
    if (annee_id) {
      anneeFilter = ' AND h.annee_id = $2';
      params.push(annee_id);
    }
    const result = await query(
      `SELECT h.*, m.intitule as matiere_intitule, a.libelle as annee_libelle
       FROM heures h
       LEFT JOIN matieres m ON h.matiere_id = m.id
       LEFT JOIN annees_academiques a ON h.annee_id = a.id
       WHERE h.enseignant_id = $1${anneeFilter}
       ORDER BY h.date_cours DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// RÉSUMÉ DES HEURES PAR ENSEIGNANT (filtrable par annee_id)
// ============================================================
exports.getResume = async (req, res) => {
  try {
    const { id } = req.params;
    const { annee_id } = req.query;

    const eqCM = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_cm_td'");
    const eqTP = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_tp_td'");
    const eqCmTd = parseFloat(eqCM.rows[0]?.valeur || 1.5);
    const eqTpTd = parseFloat(eqTP.rows[0]?.valeur || 1);

    const heuresParams = [id];
    let anneeFilter = '';
    if (annee_id) {
      anneeFilter = ' AND annee_id = $2';
      heuresParams.push(annee_id);
    }

    const heures = await query(
      `SELECT type_heure, SUM(duree) as total 
       FROM heures WHERE enseignant_id = $1${anneeFilter} AND statut = 'valide'
       GROUP BY type_heure`,
      heuresParams
    );

    let cm = 0, td = 0, tp = 0;
    heures.rows.forEach(h => {
      if (h.type_heure === 'CM') cm = parseFloat(h.total);
      else if (h.type_heure === 'TD') td = parseFloat(h.total);
      else if (h.type_heure === 'TP') tp = parseFloat(h.total);
    });

    const heuresEqTD = (cm * eqCmTd) + td + (tp * eqTpTd);

    const ens = await query('SELECT heures_contractuelles, taux_horaire FROM enseignants WHERE id = $1', [id]);
    const contractuelles = parseFloat(ens.rows[0]?.heures_contractuelles || 0);
    const taux = parseFloat(ens.rows[0]?.taux_horaire || 0);

    const complementaires = heuresEqTD > contractuelles ? heuresEqTD - contractuelles : 0;
    const montantComplementaires = complementaires * taux;

    const enAttente = await query(
      `SELECT COUNT(*) as total FROM heures WHERE enseignant_id = $1${anneeFilter} AND statut = 'en_attente'`,
      heuresParams
    );
    const rejetees = await query(
      `SELECT COUNT(*) as total FROM heures WHERE enseignant_id = $1${anneeFilter} AND statut = 'rejete'`,
      heuresParams
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

// ============================================================
// CRÉER UNE HEURE (statut par défaut : en_attente)
// ============================================================
exports.create = async (req, res) => {
  try {
    const { enseignant_id, matiere_id, annee_id, date_cours, type_heure, duree, salle, observations } = req.body;

    if (!annee_id) {
      return res.status(400).json({ message: 'Annee academique requise' });
    }

    const result = await query(
      `INSERT INTO heures (enseignant_id, matiere_id, annee_id, date_cours, type_heure, duree, salle, observations, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'en_attente') RETURNING *`,
      [enseignant_id, matiere_id, annee_id, date_cours, type_heure, duree, salle, observations]
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

// ============================================================
// RÉCUPÉRER UNE HEURE PAR ID
// ============================================================
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT h.*, e.nom as enseignant_nom, e.prenom as enseignant_prenom, 
              m.intitule as matiere_intitule, a.libelle as annee_libelle
       FROM heures h
       LEFT JOIN enseignants e ON h.enseignant_id = e.id
       LEFT JOIN matieres m ON h.matiere_id = m.id
       LEFT JOIN annees_academiques a ON h.annee_id = a.id
       WHERE h.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Heure non trouvee' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// METTRE À JOUR UNE HEURE
// ============================================================
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { enseignant_id, matiere_id, annee_id, date_cours, type_heure, duree, salle, observations } = req.body;

    const result = await query(
      `UPDATE heures 
       SET enseignant_id = $1, matiere_id = $2, annee_id = $3, date_cours = $4, 
           type_heure = $5, duree = $6, salle = $7, observations = $8
       WHERE id = $9 RETURNING *`,
      [enseignant_id, matiere_id, annee_id, date_cours, type_heure, duree, salle, observations, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Heure non trouvee' });
    }

    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'UPDATE', 'heures', $2, $3)`,
      [req.user?.id, id, `Modification heure: ${type_heure} ${duree}h`]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// VALIDER UNE HEURE
// ============================================================
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

// ============================================================
// REJETER UNE HEURE
// ============================================================
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

// ============================================================
// SUPPRIMER UNE HEURE
// ============================================================
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

// ============================================================
// ANNÉES ACADÉMIQUES
// ============================================================
exports.getAnnees = async (req, res) => {
  try {
    const result = await query('SELECT * FROM annees_academiques ORDER BY libelle DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// IMPORT EXCEL EN MASSE
// ============================================================
exports.importExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Fichier Excel requis' });
    }

    const annee_id = parseInt(req.body.annee_id);
    if (!annee_id) {
      return res.status(400).json({ message: 'Annee academique requise' });
    }

    const anneeCheck = await query('SELECT id FROM annees_academiques WHERE id = $1', [annee_id]);
    if (anneeCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Annee academique introuvable' });
    }

    const XLSX = require('xlsx');
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    } catch (parseErr) {
      return res.status(400).json({ message: 'Fichier Excel invalide ou corrompu' });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ message: 'Le fichier ne contient aucune feuille' });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Le fichier Excel est vide' });
    }

    if (rows.length > 500) {
      return res.status(400).json({ message: 'Maximum 500 lignes par import' });
    }

    const [ensRes, matRes] = await Promise.all([
      query("SELECT id, nom, prenom, TRIM(nom || ' ' || prenom) as nom_complet FROM enseignants"),
      query('SELECT id, intitule FROM matieres'),
    ]);

    const enseignantMap = {};
    ensRes.rows.forEach(e => {
      const key1 = e.nom_complet.toLowerCase().trim();
      const key2 = (e.prenom + ' ' + e.nom).toLowerCase().trim();
      const key3 = e.nom.toLowerCase().trim();
      enseignantMap[key1] = e;
      enseignantMap[key2] = e;
      if (!enseignantMap[key3]) enseignantMap[key3] = e;
    });

    const matiereMap = {};
    matRes.rows.forEach(m => {
      matiereMap[m.intitule.toLowerCase().trim()] = m;
    });

    const typesAutorises = ['CM', 'TD', 'TP'];
    let importees = 0;
    const details_erreurs = [];
    const details_import = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const ligne = i + 2;

      try {
        const enseignantNom = String(
          row['Enseignant'] || row['enseignant'] || row['Nom Enseignant'] || row['Nom enseignant'] || ''
        ).trim();
        const matiereNom = String(
          row['Matière'] || row['Matiere'] || row['matiere'] || row['Intitulé'] || row['Intitule'] || ''
        ).trim();
        const dateCoursRaw = row['Date cours'] || row['Date'] || row['date'] || row['date_cours'] || row['Date du cours'] || '';
        const typeHeureRaw = String(
          row['Type heure'] || row['Type'] || row['type'] || row['type_heure'] || row["Type d'heure"] || ''
        ).trim();
        const dureeRaw = row['Durée (h)'] || row['Durée'] || row['Duree'] || row['duree'] || row['Durée(h)'] || '';
        const salleRaw = String(row['Salle'] || row['salle'] || '').trim();
        const observationsRaw = String(row['Observations'] || row['observations'] || row['Remarques'] || row['remarques'] || '').trim();

        const missingFields = [];
        if (!enseignantNom) missingFields.push('Enseignant');
        if (!matiereNom) missingFields.push('Matiere');
        if (!typeHeureRaw) missingFields.push('Type heure');
        if (dureeRaw === '' || dureeRaw === null || dureeRaw === undefined) missingFields.push('Duree');

        if (missingFields.length > 0) {
          details_erreurs.push(`Ligne ${ligne}: Champ(s) manquant(s) — ${missingFields.join(', ')}`);
          continue;
        }

        const typeUpper = typeHeureRaw.toUpperCase();
        if (!typesAutorises.includes(typeUpper)) {
          details_erreurs.push(`Ligne ${ligne}: Type invalide "${typeHeureRaw}" (CM, TD ou TP attendu)`);
          continue;
        }

        const dureeNum = parseFloat(dureeRaw);
        if (isNaN(dureeNum) || dureeNum <= 0 || dureeNum > 12) {
          details_erreurs.push(`Ligne ${ligne}: Duree invalide "${dureeRaw}"`);
          continue;
        }

        const ensKey = enseignantNom.toLowerCase().trim();
        const ensKeyReverse = enseignantNom.split(' ').reverse().join(' ').toLowerCase().trim();
        const ensMatch = enseignantMap[ensKey] || enseignantMap[ensKeyReverse];

        if (!ensMatch) {
          details_erreurs.push(`Ligne ${ligne}: Enseignant "${enseignantNom}" non trouve`);
          continue;
        }

        const matMatch = matiereMap[matiereNom.toLowerCase().trim()];

        if (!matMatch) {
          details_erreurs.push(`Ligne ${ligne}: Matiere "${matiereNom}" non trouvee`);
          continue;
        }

        let finalDate = null;
        if (dateCoursRaw) {
          if (dateCoursRaw instanceof Date && !isNaN(dateCoursRaw.getTime())) {
            finalDate = dateCoursRaw.toISOString().split('T')[0];
          } else {
            const dateStr = String(dateCoursRaw).trim();
            const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (dmyMatch) {
              finalDate = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
            } else {
              const ymdMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
              if (ymdMatch) {
                finalDate = `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
              } else {
                const genericDate = new Date(dateStr);
                if (!isNaN(genericDate.getTime())) {
                  finalDate = genericDate.toISOString().split('T')[0];
                }
              }
            }
          }
        }

        await query(
          `INSERT INTO heures (enseignant_id, matiere_id, annee_id, date_cours, type_heure, duree, salle, observations, statut)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'en_attente')`,
          [ensMatch.id, matMatch.id, annee_id, finalDate, typeUpper, dureeNum, salleRaw || null, observationsRaw || null]
        );

        importees++;
        details_import.push({
          ligne,
          enseignant: `${ensMatch.nom} ${ensMatch.prenom}`,
          matiere: matMatch.intitule,
          type: typeUpper,
          duree: dureeNum,
          date: finalDate || '—'
        });

      } catch (err) {
        details_erreurs.push(`Ligne ${ligne}: Erreur inattendue — ${err.message}`);
      }
    }

    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'CREATE', 'heures', NULL, $2)`,
      [req.user?.id, `Import Excel: ${importees} heures importees sur ${rows.length} lignes`]
    );

    res.json({
      message: `Import termine: ${importees} heure(s) importee(s) sur ${rows.length} ligne(s)`,
      total_lignes: rows.length,
      importees,
      erreurs: details_erreurs.length,
      details_erreurs,
      details_import,
    });

  } catch (err) {
    console.error('Erreur import Excel:', err);
    res.status(500).json({ message: "Erreur lors de l'import: " + err.message });
  }
};