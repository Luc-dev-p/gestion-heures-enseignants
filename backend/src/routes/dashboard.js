const express = require('express');
const router = express.Router();
const { getGlobalStats, getHeuresParDepartement, getHeuresParFiliere, getHeuresParMois, getDepassements, getRecentLogs } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/stats', getGlobalStats);
router.get('/departements', getHeuresParDepartement);
router.get('/filieres', getHeuresParFiliere);
router.get('/mois', getHeuresParMois);
router.get('/depassements', getDepassements);
router.get('/logs', getRecentLogs);

module.exports = router;