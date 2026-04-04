const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/count', verifyToken, notificationController.getUnreadCount);
router.get('/', verifyToken, notificationController.getNotifications);
router.put('/read-all', verifyToken, notificationController.markAllAsRead);
router.put('/read/:id', verifyToken, notificationController.markAsRead);
router.delete('/:id', verifyToken, notificationController.deleteNotification);

module.exports = router;