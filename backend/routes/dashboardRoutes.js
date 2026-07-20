const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getDashboardStats,
  getDashboardChartData,
  getRecentActivities,
} = require('../controllers/dashboardController');

// All dashboard routes are protected
router.get('/stats', authenticate, getDashboardStats);
router.get('/charts', authenticate, getDashboardChartData);
router.get('/activities', authenticate, getRecentActivities);

module.exports = router;
