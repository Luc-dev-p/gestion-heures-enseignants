const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nom, email, role, created_at FROM users ORDER BY nom ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.create = async (req, res) => {
  try {
    const { nom, email, password, role } = req.body;
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Email deja utilise' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (nom, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, nom, email, role',
      [nom, email, hashed, role]
    );
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'CREATE', 'users', $2, $3)`,
      [req.user?.id, result.rows[0].id, `Creation utilisateur ${nom}`]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, email, role, password } = req.body;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);
      const result = await query(
        'UPDATE users SET nom=$1, email=$2, role=$3, password=$4 WHERE id=$5 RETURNING id, nom, email, role',
        [nom, email, role, hashed, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouve' });
      res.json(result.rows[0]);
    } else {
      const result = await query(
        'UPDATE users SET nom=$1, email=$2, role=$3 WHERE id=$4 RETURNING id, nom, email, role',
        [nom, email, role, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouve' });
      res.json(result.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Utilisateur supprime' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};