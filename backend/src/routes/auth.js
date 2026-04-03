const express = require('express');
const router = express.Router();
const {
  register, login, getProfile,
  forgotPassword, verifyResetToken, resetPassword,
  changePassword, adminResetPassword, getResetRequests
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { getAll: getUsers, create: createUser, update: updateUser, delete: deleteUser } = require('../controllers/userController');

// Routes publiques
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Routes authentifiées
router.get('/profile', protect, getProfile);
router.put('/change-password', protect, changePassword);

// Admin : réinitialisation de mot de passe
router.get('/reset-requests', protect, authorize('admin'), getResetRequests);
router.put('/reset-password/:userId', protect, authorize('admin'), adminResetPassword);

// Gestion des utilisateurs (admin seulement)
router.get('/users', protect, authorize('admin'), getUsers);
router.post('/users', protect, authorize('admin'), createUser);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;