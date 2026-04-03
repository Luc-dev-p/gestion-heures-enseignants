const { query } = require('../config/database');

exports.getGlobalStats = async (req, res) => {
  try {
    const totalEns = await query('SELECT COUNT(*) FROM enseignants');
    const totalMat = await query('SELECT COUNT(*) FROM matieres');
    const totalH = await query('SELECT SUM(duree) as total FROM heures');
    const totalHRows = await query('SELECT COUNT(*) FROM heures');

    res.json({
      enseignants: parseInt(totalEns.rows[0].count),
      matieres: parseInt(totalMat.rows[0].count),
      heures_total: parseFloat(totalH.rows[0].total) || 0,
      heures_saisies: parseInt(totalHRows.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getHeuresParDepartement = async (req, res) => {
  try {
    const result = await query(
      `SELECT e.departement, SUM(h.duree) as total_heures
       FROM heures h
       JOIN enseignants e ON h.enseignant_id = e.id
       GROUP BY e.departement
       ORDER BY total_heures DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getHeuresParFiliere = async (req, res) => {
  try {
    const result = await query(
      `SELECT m.filiere, SUM(h.duree) as total_heures
       FROM heures h
       JOIN matieres m ON h.matiere_id = m.id
       GROUP BY m.filiere
       ORDER BY total_heures DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getHeuresParMois = async (req, res) => {
  try {
    const result = await query(
      `SELECT TO_CHAR(date_cours, 'YYYY-MM') as mois, SUM(duree) as total_heures
       FROM heures
       GROUP BY TO_CHAR(date_cours, 'YYYY-MM')
       ORDER BY mois ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getDepassements = async (req, res) => {
  try {
    const eqCM = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_cm_td'");
    const eqTP = await query("SELECT valeur FROM parametres WHERE cle = 'equivalence_tp_td'");
    const eqCmTd = parseFloat(eqCM.rows[0]?.valeur || 1.5);
    const eqTpTd = parseFloat(eqTP.rows[0]?.valeur || 1);

    const result = await query(
      `SELECT e.id, e.nom, e.prenom, e.departement, e.heures_contractuelles, e.taux_horaire,
              SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree * ${eqCmTd}
                       WHEN h.type_heure = 'TD' THEN h.duree
                       WHEN h.type_heure = 'TP' THEN h.duree * ${eqTpTd} ELSE 0 END) as heures_eq_td
       FROM enseignants e
       LEFT JOIN heures h ON e.id = h.enseignant_id
       GROUP BY e.id
       HAVING SUM(CASE WHEN h.type_heure = 'CM' THEN h.duree * ${eqCmTd}
                       WHEN h.type_heure = 'TD' THEN h.duree
                       WHEN h.type_heure = 'TP' THEN h.duree * ${eqTpTd} ELSE 0 END) > e.heures_contractuelles
       ORDER BY heures_eq_td DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ CORRECTION : Logs filtrés par rôle
// Admin voit tous les logs, RH voit uniquement les logs des utilisateurs RH
exports.getRecentLogs = async (req, res) => {
  try {
    let sql;
    const userRole = req.user?.role;

    if (userRole === 'admin') {
      // Admin : voir tous les logs
      sql = `
        SELECT al.*, u.nom as user_nom, u.email as user_email, u.role as user_role
        FROM action_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 50
      `;
    } else {
      // RH : voir uniquement les logs des utilisateurs RH
      sql = `
        SELECT al.*, u.nom as user_nom, u.email as user_email, u.role as user_role
        FROM action_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE u.role = 'rh'
        ORDER BY al.created_at DESC
        LIMIT 50
      `;
    }

    const result = await query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ NOUVEAU : Réinitialiser les logs (admin uniquement)
exports.resetLogs = async (req, res) => {
  try {
    await query('DELETE FROM action_logs');
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'DELETE', 'action_logs', NULL, 'Journal reinitialise')`,
      [req.user?.id]
    );
    res.json({ message: 'Journal reinitialise' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};