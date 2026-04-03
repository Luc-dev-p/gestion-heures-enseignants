const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { exportExcelGlobal, exportExcelEnseignant, exportPdfEnseignant, exportExcelComptabilite, exportPdfComptabilite, exportPdfBulletin, exportPdfRapportAnnuel, exportPdfLogs } = require('../controllers/exportController');

router.use(protect);
router.get('/excel/global', authorize('admin', 'rh'), exportExcelGlobal);
router.get('/excel/comptabilite', authorize('admin', 'rh'), exportExcelComptabilite);
router.get('/excel/enseignant/:id', exportExcelEnseignant);
router.get('/pdf/comptabilite', authorize('admin', 'rh'), exportPdfComptabilite);
router.get('/pdf/enseignant/:id', exportPdfEnseignant);
router.get('/pdf/bulletin/:id', authorize('admin', 'rh'), exportPdfBulletin);
router.get('/pdf/rapport-annuel', authorize('admin', 'rh'), exportPdfRapportAnnuel);
router.get('/pdf/logs', exportPdfLogs);

module.exports = router;