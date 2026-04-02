const express = require('express');
const router = express.Router();
const { getAll, update, getAnnees, setAnneeActive, addAnnee } = require('../controllers/parametreController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', authorize('admin'), getAll);
router.put('/:id', authorize('admin'), update);
router.get('/annees', getAnnees);
router.put('/annees/:id/active', authorize('admin'), setAnneeActive);
router.post('/annees', authorize('admin'), addAnnee);

module.exports = router;