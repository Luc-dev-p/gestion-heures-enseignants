const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const heureController = require('../controllers/heureController');

// Routes publiques (authentifiées)
router.get('/', protect, heureController.getAll);
router.get('/enseignant/:id', protect, heureController.getByEnseignant);
router.get('/resume/:id', protect, heureController.getResume);
router.get('/annees', protect, heureController.getAnnees);

// Routes RH / Admin uniquement
router.post('/', protect, authorize('admin', 'rh'), heureController.create);
router.put('/valider/:id', protect, authorize('admin', 'rh'), heureController.valider);
router.put('/rejeter/:id', protect, authorize('admin', 'rh'), heureController.rejeter);
router.delete('/:id', protect, authorize('admin', 'rh'), heureController.delete);

module.exports = router;