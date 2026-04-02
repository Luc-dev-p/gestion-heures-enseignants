const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

// Récupérer tous les enseignants
exports.getAll = async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, u.email, u.role 
       FROM enseignants e 
       LEFT JOIN users u ON e.user_id = u.id 
       ORDER BY e.nom ASC, e.prenom ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur getAll:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer un enseignant par ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT e.*, u.email, u.role 
       FROM enseignants e 
       LEFT JOIN users u ON e.user_id = u.id 
       WHERE e.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Enseignant non trouve' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un enseignant + son compte utilisateur automatiquement
exports.create = async (req, res) => {
  try {
    const { nom, prenom, grade, statut, departement, taux_horaire, heures_contractuelles, email, password } = req.body;

    // Vérifier si l'email existe déjà
    if (email) {
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'Un compte avec cet email existe deja' });
      }
    }

    // 1. Créer le compte utilisateur
    let userId = null;
    if (email && password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const userResult = await query(
        'INSERT INTO users (nom, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [`${nom} ${prenom}`, email, hashedPassword, 'enseignant']
      );
      userId = userResult.rows[0].id;
    }

    // 2. Créer l'enseignant lié au compte utilisateur
    const result = await query(
      `INSERT INTO enseignants (user_id, nom, prenom, grade, statut, departement, taux_horaire, heures_contractuelles)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, nom, prenom, grade, statut, departement, taux_horaire || 0, heures_contractuelles || 0]
    );

    // Journal
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'CREATE', 'enseignants', $2, $3)`,
      [req.user?.id, result.rows[0].id, `Creation de ${nom} ${prenom}${email ? ' (compte: ' + email + ')' : ''}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur create:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Modifier un enseignant
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, grade, statut, departement, taux_horaire, heures_contractuelles, email, password } = req.body;

    // Mettre à jour l'enseignant
    const result = await query(
      `UPDATE enseignants 
       SET nom=$1, prenom=$2, grade=$3, statut=$4, departement=$5, 
           taux_horaire=$6, heures_contractuelles=$7, updated_at=CURRENT_TIMESTAMP
       WHERE id=$8 RETURNING *`,
      [nom, prenom, grade, statut, departement, taux_horaire, heures_contractuelles, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Enseignant non trouve' });

    const ens = result.rows[0];

    // Mettre à jour le compte utilisateur lié
    if (ens.user_id) {
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);
        await query(
          'UPDATE users SET nom=$1, email=$2, password=$3 WHERE id=$4',
          [`${nom} ${prenom}`, email, hashed, ens.user_id]
        );
      } else {
        await query(
          'UPDATE users SET nom=$1, email=$2 WHERE id=$3',
          [`${nom} ${prenom}`, email, ens.user_id]
        );
      }
    } else if (email && password) {
      // Créer un compte utilisateur si l'enseignant n'en a pas encore
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);
      const userResult = await query(
        'INSERT INTO users (nom, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [`${nom} ${prenom}`, email, hashed, 'enseignant']
      );
      await query('UPDATE enseignants SET user_id=$1 WHERE id=$2', [userResult.rows[0].id, id]);
    }

    // Journal
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'UPDATE', 'enseignants', $2, $3)`,
      [req.user?.id, id, `Modification de ${nom} ${prenom}`]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur update:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un enseignant + son compte utilisateur
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const ens = await query('SELECT nom, prenom, user_id FROM enseignants WHERE id = $1', [id]);
    if (ens.rows.length === 0) return res.status(404).json({ message: 'Enseignant non trouve' });

    // Supprimer le compte utilisateur lié
    if (ens.rows[0].user_id) {
      await query('DELETE FROM users WHERE id = $1', [ens.rows[0].user_id]);
    }

    // Supprimer l'enseignant
    await query('DELETE FROM enseignants WHERE id = $1', [id]);

    // Journal
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'DELETE', 'enseignants', $2, $3)`,
      [req.user?.id, id, `Suppression de ${ens.rows[0].nom} ${ens.rows[0].prenom}`]
    );

    res.json({ message: 'Enseignant et compte utilisateur supprimes' });
  } catch (err) {
    console.error('Erreur delete:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Statistiques
exports.getStats = async (req, res) => {
  try {
    const total = await query('SELECT COUNT(*) FROM enseignants');
    const permanents = await query("SELECT COUNT(*) FROM enseignants WHERE statut = 'Permanent'");
    const vacataires = await query("SELECT COUNT(*) FROM enseignants WHERE statut = 'Vacataire'");
    const departements = await query(
      'SELECT departement, COUNT(*) as nb FROM enseignants GROUP BY departement ORDER BY nb DESC'
    );
    res.json({
      total: parseInt(total.rows[0].count),
      permanents: parseInt(permanents.rows[0].count),
      vacataires: parseInt(vacataires.rows[0].count),
      departements: departements.rows,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer un enseignant par user_id
exports.getByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await query(
      'SELECT * FROM enseignants WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Enseignant non trouve' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};