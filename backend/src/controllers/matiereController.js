const { query } = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const result = await query('SELECT * FROM matieres ORDER BY intitule ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM matieres WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Matiere non trouvee' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  try {
    const { intitule, filiere, niveau, volume_horaire_prevu } = req.body;
    const result = await query(
      `INSERT INTO matieres (intitule, filiere, niveau, volume_horaire_prevu)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [intitule, filiere, niveau, volume_horaire_prevu || 0]
    );
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'CREATE', 'matieres', $2, $3)`,
      [req.user?.id, result.rows[0].id, `Creation de ${intitule}`]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { intitule, filiere, niveau, volume_horaire_prevu } = req.body;
    const result = await query(
      `UPDATE matieres SET intitule=$1, filiere=$2, niveau=$3, volume_horaire_prevu=$4 WHERE id=$5 RETURNING *`,
      [intitule, filiere, niveau, volume_horaire_prevu, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Matiere non trouvee' });
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'UPDATE', 'matieres', $2, $3)`,
      [req.user?.id, id, `Modification de ${intitule}`]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const mat = await query('SELECT intitule FROM matieres WHERE id = $1', [id]);
    if (mat.rows.length === 0) return res.status(404).json({ message: 'Matiere non trouvee' });
    await query('DELETE FROM matieres WHERE id = $1', [id]);
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'DELETE', 'matieres', $2, $3)`,
      [req.user?.id, id, `Suppression de ${mat.rows[0].intitule}`]
    );
    res.json({ message: 'Matiere supprimee' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};