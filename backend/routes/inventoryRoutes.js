const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getInventory } = require('../controllers/inventoryController');

// All inventory routes require authentication
router.get('/', authenticate, getInventory);

module.exports = router;
