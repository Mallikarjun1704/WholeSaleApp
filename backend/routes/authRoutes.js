const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  login,
  refreshToken,
  logout,
  getMe,
  updatePassword,
  setup,
  checkSetup,
  getUsers,
  toggleUserAccess,
  createUser,
} = require('../controllers/authController');

// Public routes
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/check-setup', checkSetup);
router.post('/setup', setup);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/password', authenticate, updatePassword);

// Admin-only user management routes
router.get('/users', authenticate, authorize('admin'), getUsers);
router.post('/users', authenticate, authorize('admin'), createUser);
router.put('/users/:id/toggle-access', authenticate, authorize('admin'), toggleUserAccess);

module.exports = router;
