const express = require('express');
const router = express.Router();
const { getGlobalStats, getHeuresParDepartement, getHeuresParFiliere, getHeuresParMois, getDepassements, getRecentLogs, resetLogs } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/stats', getGlobalStats);
router.get('/departements', getHeuresParDepartement);
router.get('/filieres', getHeuresParFiliere);
router.get('/mois', getHeuresParMois);
router.get('/depassements', getDepassements);
router.get('/logs', getRecentLogs);
router.delete('/logs', authorize('admin'), resetLogs);

module.exports = router;