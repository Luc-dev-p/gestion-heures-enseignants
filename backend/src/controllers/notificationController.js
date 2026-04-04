const { query } = require('../config/database');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const nonLuesSeulement = req.query.non_lues === 'true';

    let sql = 'SELECT * FROM notifications WHERE utilisateur_id = $1';
    const params = [userId];

    if (nonLuesSeulement) {
      sql += ' AND lu = false';
    }

    sql += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);

    const result = await query(sql, params);

    const countResult = await query(
      'SELECT COUNT(*) as total FROM notifications WHERE utilisateur_id = $1 AND lu = false',
      [userId]
    );

    res.json({
      notifications: result.rows,
      non_lues: parseInt(countResult.rows[0]?.total || 0),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as total FROM notifications WHERE utilisateur_id = $1 AND lu = false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0]?.total || 0) });
  } catch {
    res.json({ count: 0 });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      'UPDATE notifications SET lu = true WHERE id = $1 AND utilisateur_id = $2',
      [id, req.user.id]
    );
    res.json({ message: 'Marquee comme lue' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET lu = true WHERE utilisateur_id = $1 AND lu = false',
      [req.user.id]
    );
    res.json({ message: 'Toutes marquees comme lues' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await query(
      'DELETE FROM notifications WHERE id = $1 AND utilisateur_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification supprimee' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.createNotification = async (utilisateurId, type, titre, message, donnees = null) => {
  try {
    await query(
      'INSERT INTO notifications (utilisateur_id, type, titre, message, donnees) VALUES ($1, $2, $3, $4, $5)',
      [utilisateurId, type, titre, message, donnees ? JSON.stringify(donnees) : null]
    );
  } catch (err) {
    console.error('Erreur creation notification:', err.message);
  }
};