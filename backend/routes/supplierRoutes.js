const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');

// All supplier routes require authentication
router.use(authenticate);

router.get('/', getSuppliers);
router.get('/:id', getSupplierById);

// Admin-only write operations
router.post('/', authorize('admin'), createSupplier);
router.put('/:id', authorize('admin'), updateSupplier);
router.delete('/:id', authorize('admin'), deleteSupplier);

module.exports = router;
