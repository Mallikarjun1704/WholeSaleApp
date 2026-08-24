const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  recordCustomerPayment,
  getCustomerStatement,
  getCustomerStatementPdf,
} = require('../controllers/customerController');

// All customer routes require authentication
router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id/statement', getCustomerStatement);
router.get('/:id/statement/pdf', getCustomerStatementPdf);
router.get('/:id', getCustomerById);

// Admin-only write operations
router.post('/', authorize('admin'), createCustomer);
router.post('/:id/payment', authorize('admin'), recordCustomerPayment);
router.put('/:id', authorize('admin'), updateCustomer);
router.delete('/:id', authorize('admin'), deleteCustomer);

module.exports = router;
