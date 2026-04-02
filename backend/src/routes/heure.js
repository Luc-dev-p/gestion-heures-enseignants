const express = require('express');
const router = express.Router();
const { getAll, getByEnseignant, getResume, create, delete: remove, getAnnees } = require('../controllers/heureController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/annees', getAnnees);
router.get('/resume/:id', getResume);
router.get('/enseignant/:id', getByEnseignant);
router.get('/', authorize('admin', 'rh'), getAll);
router.post('/', authorize('admin', 'rh'), create);
router.delete('/:id', authorize('admin', 'rh'), remove);

module.exports = router;