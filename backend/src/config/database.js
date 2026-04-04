const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('connect', () => {
  console.log('✅ Connexion PostgreSQL réussie');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
// ============================================================
// IMPORT EXCEL EN MASSE
// ============================================================
exports.importExcel = async (req, res) => {
  const client = await require('../config/database').getClient();

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const annee_id = parseInt(req.body.annee_id);
    if (!annee_id) {
      return res.status(400).json({ message: 'Année académique requise' });
    }

    // Vérifier que l'année existe
    const anneeCheck = await client.query('SELECT id FROM annees_academiques WHERE id = $1', [annee_id]);
    if (anneeCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Année académique introuvable' });
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

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (data.length === 0) {
      return res.status(400).json({ message: 'La feuille Excel est vide (aucune ligne de données)' });
    }

    if (data.length > 500) {
      return res.status(400).json({ message: 'Maximum 500 lignes par import' });
    }

    await client.query('BEGIN');

    const results = { success: 0, errors: [], total: data.length };

    // Types valides
    const validTypes = ['CM', 'TD', 'TP'];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Ligne Excel (1 = en-tête)

      try {
        // --- Mapper les colonnes (plusieurs variantes acceptées) ---
        const enseignantNom = String(row['Enseignant'] || row['enseignant'] || row['Nom Enseignant'] || row['Nom enseignant'] || '').trim();
        const matiereNom = String(row['Matière'] || row['Matiere'] || row['matiere'] || row['Intitulé'] || row['Intitule'] || '').trim();
        const dateCoursRaw = row['Date cours'] || row['Date'] || row['date_cours'] || row['Date du cours'] || '';
        const typeHeureRaw = String(row['Type heure'] || row['Type'] || row['type_heure'] || row["Type d'heure"] || '').trim();
        const dureeRaw = row['Durée (h)'] || row['Durée'] || row['Duree'] || row['duree'] || row['Durée(h)'] || '';
        const salleRaw = String(row['Salle'] || row['salle'] || '').trim();
        const observationsRaw = String(row['Observations'] || row['observations'] || row['Remarques'] || row['remarques'] || '').trim();

        // --- Validation des champs obligatoires ---
        const missingFields = [];
        if (!enseignantNom) missingFields.push('Enseignant');
        if (!matiereNom) missingFields.push('Matière');
        if (!typeHeureRaw) missingFields.push('Type heure');
        if (dureeRaw === '' || dureeRaw === null || dureeRaw === undefined) missingFields.push('Durée');

        if (missingFields.length > 0) {
          results.errors.push({
            row: rowNum,
            enseignant: enseignantNom || '—',
            message: `Champ(s) manquant(s) : ${missingFields.join(', ')}`
          });
          continue;
        }

        // --- Valider type_heure ---
        const typeUpper = typeHeureRaw.toUpperCase();
        if (!validTypes.includes(typeUpper)) {
          results.errors.push({
            row: rowNum,
            enseignant: enseignantNom,
            message: `Type d'heure invalide "${typeHeureRaw}" (attendu : CM, TD ou TP)`
          });
          continue;
        }

        // --- Valider durée ---
        const dureeNum = parseFloat(dureeRaw);
        if (isNaN(dureeNum) || dureeNum <= 0 || dureeNum > 12) {
          results.errors.push({
            row: rowNum,
            enseignant: enseignantNom,
            message: `Durée invalide "${dureeRaw}" (nombre entre 0 et 12 attendu)`
          });
          continue;
        }

        // --- Trouver l'enseignant ---
        const enseignantResult = await client.query(
          `SELECT id, nom, prenom FROM enseignants 
           WHERE TRIM(nom || ' ' || prenom) ILIKE $1 
              OR TRIM(prenom || ' ' || nom) ILIKE $1
              OR nom ILIKE $2 AND prenom ILIKE $3
           LIMIT 1`,
          [
            '%' + enseignantNom + '%',
            enseignantNom.split(' ')[0] + '%',
            enseignantNom.split(' ').slice(-1)[0] + '%'
          ]
        );

        if (enseignantResult.rows.length === 0) {
          results.errors.push({
            row: rowNum,
            enseignant: enseignantNom,
            message: `Enseignant non trouvé : "${enseignantNom}"`
          });
          continue;
        }

        const enseignantId = enseignantResult.rows[0].id;

        // --- Trouver la matière ---
        const matiereResult = await client.query(
          `SELECT id, intitule FROM matieres WHERE intitule ILIKE $1 LIMIT 1`,
          ['%' + matiereNom + '%']
        );

        if (matiereResult.rows.length === 0) {
          results.errors.push({
            row: rowNum,
            enseignant: enseignantNom,
            message: `Matière non trouvée : "${matiereNom}"`
          });
          continue;
        }

        const matiereId = matiereResult.rows[0].id;

        // --- Parser la date ---
        let parsedDate = null;
        if (dateCoursRaw) {
          // Si c'est déjà un objet Date (cellDates: true)
          if (dateCoursRaw instanceof Date && !isNaN(dateCoursRaw.getTime())) {
            parsedDate = dateCoursRaw.toISOString().split('T')[0];
          } else {
            const dateStr = String(dateCoursRaw).trim();

            // Format DD/MM/YYYY
            const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (dmyMatch) {
              parsedDate = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
            } else {
              // Format YYYY-MM-DD
              const ymdMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
              if (ymdMatch) {
                parsedDate = `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
              } else {
                // Tentative de parsing générique
                const genericDate = new Date(dateStr);
                if (!isNaN(genericDate.getTime())) {
                  parsedDate = genericDate.toISOString().split('T')[0];
                } else {
                  results.errors.push({
                    row: rowNum,
                    enseignant: enseignantNom,
                    message: `Date invalide "${dateCoursRaw}" (formats acceptés : JJ/MM/AAAA ou AAAA-MM-JJ)`
                  });
                  continue;
                }
              }
            }
          }
        }

        // --- Insérer l'heure ---
        await client.query(
          `INSERT INTO heures (enseignant_id, matiere_id, annee_id, date_cours, type_heure, duree, salle, observations, statut)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'en_attente')`,
          [enseignantId, matiereId, annee_id, parsedDate, typeUpper, dureeNum, salleRaw, observationsRaw]
        );

        // --- Logger l'action ---
        await client.query(
          `INSERT INTO action_logs (utilisateur_id, action, details)
           VALUES ($1, $2, $3)`,
          [
            req.user?.id || null,
            'IMPORT_HEURE',
            JSON.stringify({
              enseignant_id: enseignantId,
              matiere_id: matiereId,
              annee_id,
              type_heure: typeUpper,
              duree: dureeNum,
              ligne_excel: rowNum
            })
          ]
        );

        results.success++;
      } catch (rowErr) {
        results.errors.push({
          row: rowNum,
          enseignant: enseignantNom || '—',
          message: `Erreur : ${rowErr.message}`
        });
      }
    }

    await client.query('COMMIT');

    res.status(200).json({
      message: `Import terminé : ${results.success} ligne(s) importée(s) avec succès, ${results.errors.length} erreur(s)`,
      total: results.total,
      success: results.success,
      errors: results.errors
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erreur import Excel:', error);
    res.status(500).json({ message: "Erreur lors de l'import : " + error.message });
  } finally {
    client.release();
  }
};