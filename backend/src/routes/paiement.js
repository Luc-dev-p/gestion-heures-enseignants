const express = require('express');
const router = express.Router();
const { getAllPaiements, getPaiementStats, createPaiement, getHistorique, deletePaiement } = require('../controllers/paiementController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/stats', authorize('admin', 'rh'), getPaiementStats);
router.get('/historique/:id', authorize('admin', 'rh'), getHistorique);
router.get('/', authorize('admin', 'rh'), getAllPaiements);
router.post('/', authorize('admin', 'rh'), createPaiement);
router.delete('/:id', authorize('admin'), deletePaiement);

module.exports = router;