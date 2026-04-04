const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const backupController = require('../controllers/backupController');

router.get('/', verifyToken, isAdmin, backupController.listBackups);
router.post('/create', verifyToken, isAdmin, backupController.createBackup);
router.get('/schedule', verifyToken, isAdmin, backupController.getScheduleConfig);
router.put('/schedule', verifyToken, isAdmin, backupController.updateScheduleConfig);
router.get('/download/:filename', verifyToken, isAdmin, backupController.downloadBackup);
router.delete('/:filename', verifyToken, isAdmin, backupController.deleteBackup);
router.post('/restore/:filename', verifyToken, isAdmin, backupController.restoreBackup);

module.exports = router;