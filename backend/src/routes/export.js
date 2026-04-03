const express = require('express');
const router = express.Router();
const { exportExcelGlobal, exportExcelEnseignant, exportPdfEnseignant, exportExcelComptabilite, exportPdfComptabilite, exportBulletinIndividuel, exportRapportAnnuel } = require('../controllers/exportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/excel/global', authorize('admin', 'rh'), exportExcelGlobal);
router.get('/excel/comptabilite', authorize('admin', 'rh'), exportExcelComptabilite);
router.get('/excel/enseignant/:id', exportExcelEnseignant);
router.get('/pdf/comptabilite', authorize('admin', 'rh'), exportPdfComptabilite);
router.get('/pdf/enseignant/:id', exportPdfEnseignant);
router.get('/pdf/bulletin/:id', authorize('admin', 'rh'), exportBulletinIndividuel);
router.get('/pdf/rapport-annuel', authorize('admin', 'rh'), exportRapportAnnuel);

module.exports = router;