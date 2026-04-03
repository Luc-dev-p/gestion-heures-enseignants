const { query } = require('../config/database');

// Récupérer tous les paramètres
exports.getAll = async (req, res) => {
  try {
    const result = await query('SELECT * FROM parametres ORDER BY cle ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Modifier un paramètre
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { valeur } = req.body;
    const result = await query(
      'UPDATE parametres SET valeur=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
      [valeur, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Parametre non trouve' });
    res.json(result.rows[0]);
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

// Définir l'année active
exports.setAnneeActive = async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE annees_academiques SET is_active = false');
    const result = await query(
      'UPDATE annees_academiques SET is_active = true WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Annee non trouvee' });
    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'UPDATE', 'annees_academiques', $2, $3)`,
      [req.user?.id, id, `Annee active changee: ${result.rows[0].libelle}`]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Ajouter une année
exports.addAnnee = async (req, res) => {
  try {
    const { libelle } = req.body;
    const existing = await query('SELECT id FROM annees_academiques WHERE libelle = $1', [libelle]);
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Cette annee existe deja' });
    const result = await query(
      'INSERT INTO annees_academiques (libelle) VALUES ($1) RETURNING *',
      [libelle]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
// Supprimer une année académique
exports.deleteAnnee = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'année n'est pas active
    const annee = await query('SELECT * FROM annees_academiques WHERE id = $1', [id]);
    if (annee.rows.length === 0) return res.status(404).json({ message: 'Annee non trouvee' });
    if (annee.rows[0].is_active) return res.status(400).json({ message: 'Impossible de supprimer l\'annee active' });

    // Vérifier qu'aucune heure n'est liée à cette année
    const heuresLiees = await query('SELECT COUNT(*) as total FROM heures WHERE annee_id = $1', [id]);
    if (parseInt(heuresLiees.rows[0].total) > 0) {
      return res.status(400).json({ message: 'Impossible de supprimer : des heures sont liees a cette annee' });
    }

    await query('DELETE FROM annees_academiques WHERE id = $1', [id]);

    await query(
      `INSERT INTO action_logs (user_id, action, table_concernee, enregistrement_id, details)
       VALUES ($1, 'DELETE', 'annees_academiques', $2, $3)`,
      [req.user?.id, id, `Annee supprimee: ${annee.rows[0].libelle}`]
    );

    res.json({ message: 'Annee supprimee' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};