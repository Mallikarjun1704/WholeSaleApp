const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  login,
  refreshToken,
  logout,
  getMe,
  updatePassword,
  setup,
  checkSetup,
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

module.exports = router;
