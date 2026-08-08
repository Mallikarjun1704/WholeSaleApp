const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getDashboardStats,
  getDashboardChartData,
  getRecentActivities,
  getDashboardDetails,
} = require('../controllers/dashboardController');

// All dashboard routes are protected
router.get('/stats', authenticate, getDashboardStats);
router.get('/charts', authenticate, getDashboardChartData);
router.get('/activities', authenticate, getRecentActivities);
router.get('/details/:type', authenticate, getDashboardDetails);

module.exports = router;
