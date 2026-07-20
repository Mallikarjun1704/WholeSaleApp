const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createPurchase,
  getPurchases,
  getPurchasesBySupplier,
  getPurchaseById,
  updatePurchasePaymentStatus,
} = require('../controllers/purchaseController');

// All purchase routes require authentication
router.use(authenticate);

// Admin-only write operations, but staff can view
router.post('/', authorize('admin'), createPurchase);
router.get('/', getPurchases);
router.get('/supplier/:supplierId', getPurchasesBySupplier);
router.get('/:id', getPurchaseById);
router.patch('/:id/payment', authorize('admin'), updatePurchasePaymentStatus);

module.exports = router;
