const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const crypto = require('crypto');
require('dotenv').config();

// Inscription
exports.register = async (req, res) => {
  try {
    const { nom, email, password, role } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (nom, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, nom, email, role',
      [nom, email, hashedPassword, role || 'enseignant']
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Erreur register:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Connexion
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    // Si le mot de passe est le placeholder, le mettre à jour
    if (!isMatch && user.password === '$2a$10$placeholder') {
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(password, salt);
      await query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
    } else if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Profil utilisateur
exports.getProfile = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nom, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==========================================
// NOUVEAU : Demande de mot de passe oublié
// ==========================================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Vérifier si l'email existe (message identique que l'email existe ou non — sécurité)
    const result = await query('SELECT id, nom, email, role FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Générer un token de reset (valide 1 heure)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1h

      // Stocker le token dans la table password_resets
      await query(
        `INSERT INTO password_resets (user_id, token, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3`,
        [user.id, resetToken, resetExpires]
      );

      // Journaliser la demande
      await query(
        `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
         VALUES ($1, 'REQUEST', 'password_resets', $2, $3)`,
        [user.id, user.id, `Demande reset mot de passe pour ${user.email}`]
      );
    }

    // Toujours retourner le même message (ne jamais révéler si l'email existe)
    res.json({
      message: 'Si cette adresse email est associée a un compte, un lien de reinitialisation a ete genere. Contactez l\'administrateur pour obtenir un nouveau mot de passe.'
    });
  } catch (err) {
    console.error('Erreur forgotPassword:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==========================================
// NOUVEAU : Vérifier un token de reset
// ==========================================
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const result = await query(
      `SELECT pr.*, u.nom, u.email FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = $1 AND pr.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Token invalide ou expire' });
    }

    res.json({
      valid: true,
      email: result.rows[0].email,
      nom: result.rows[0].nom,
    });
  } catch (err) {
    console.error('Erreur verifyResetToken:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==========================================
// NOUVEAU : Réinitialiser le mot de passe (via token)
// ==========================================
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Token et mot de passe requis (min 6 caracteres)' });
    }

    // Vérifier le token
    const tokenResult = await query(
      `SELECT * FROM password_resets WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'Token invalide ou expire' });
    }

    const { user_id } = tokenResult.rows[0];

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Mettre à jour le mot de passe
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user_id]);

    // Supprimer le token utilisé
    await query('DELETE FROM password_resets WHERE user_id = $1', [user_id]);

    // Journaliser
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'UPDATE', 'users', $2, 'Mot de passe reinitialise via token')`,
      [user_id, user_id]
    );

    res.json({ message: 'Mot de passe reinitialise avec succes' });
  } catch (err) {
    console.error('Erreur resetPassword:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==========================================
// NOUVEAU : Changer son propre mot de passe
// ==========================================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caracteres' });
    }

    // Récupérer l'utilisateur avec le mot de passe hashé
    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }

    // Vérifier le mot de passe actuel
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    // Hasher et mettre à jour
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);

    // Journaliser
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'UPDATE', 'users', $2, 'Changement de mot de passe')`,
      [req.user.id, req.user.id]
    );

    res.json({ message: 'Mot de passe modifie avec succes' });
  } catch (err) {
    console.error('Erreur changePassword:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==========================================
// NOUVEAU : Admin réinitialise le mot de passe d'un utilisateur
// ==========================================
exports.adminResetPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Nouveau mot de passe requis (min 6 caracteres)' });
    }

    // Vérifier que l'utilisateur cible existe
    const userResult = await query('SELECT id, nom, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouve' });
    }

    // Hasher et mettre à jour
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

    // Supprimer les tokens de reset existants
    await query('DELETE FROM password_resets WHERE user_id = $1', [userId]);

    // Journaliser
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'UPDATE', 'users', $2, $3)`,
      [req.user.id, userId, `Admin a reinitialise le mot de passe de ${userResult.rows[0].nom} (${userResult.rows[0].email})`]
    );

    res.json({ message: `Mot de passe de ${userResult.rows[0].nom} reinitialise avec succes` });
  } catch (err) {
    console.error('Erreur adminResetPassword:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==========================================
// NOUVEAU : Admin liste les demandes de reset
// ==========================================
exports.getResetRequests = async (req, res) => {
  try {
    const result = await query(
      `SELECT pr.id, pr.user_id, pr.created_at, pr.expires_at, u.nom, u.email, u.role
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.expires_at > NOW()
       ORDER BY pr.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur getResetRequests:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};