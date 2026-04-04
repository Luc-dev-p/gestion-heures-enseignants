const express = require('express');
const router = express.Router();
// const multer = require('multer');        ← COMMENTE
const { verifyToken, isAdmin } = require('../middleware/auth');
const heureController = require('../controllers/heureController');

// COMMENTE tout le bloc upload jusqu'à la ligne 22

// Routes GET
router.get('/annees', verifyToken, heureController.getAnnees);
router.get('/enseignant/:id', verifyToken, heureController.getByEnseignant);
router.get('/resume/:id', verifyToken, heureController.getResume);
router.get('/:id', verifyToken, heureController.getById);
router.get('/', verifyToken, heureController.getAll);

// Routes POST / PUT / DELETE (admin)
router.post('/', verifyToken, isAdmin, heureController.create);
router.put('/:id', verifyToken, isAdmin, heureController.update);
router.delete('/:id', verifyToken, isAdmin, heureController.delete);

// COMMENTE la route import aussi
// router.post('/import', verifyToken, isAdmin, upload.single('file'), heureController.importExcel);

module.exports = router;