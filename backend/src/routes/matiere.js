const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, delete: remove } = require('../controllers/matiereController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize('admin', 'rh'), create);
router.put('/:id', authorize('admin', 'rh'), update);
router.delete('/:id', authorize('admin', 'rh'), remove);

module.exports = router;