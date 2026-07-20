const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../controllers/brandController');

// All brand routes require authentication
router.get('/', authenticate, getBrands);

// Admin-only write operations
router.post('/', authenticate, authorize('admin'), createBrand);
router.put('/:id', authenticate, authorize('admin'), updateBrand);
router.delete('/:id', authenticate, authorize('admin'), deleteBrand);

module.exports = router;
