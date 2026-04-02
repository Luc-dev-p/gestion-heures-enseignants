const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { getAll: getUsers, create: createUser, update: updateUser, delete: deleteUser } = require('../controllers/userController');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);

// Gestion des utilisateurs (admin seulement)
router.get('/users', protect, authorize('admin'), getUsers);
router.post('/users', protect, authorize('admin'), createUser);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;