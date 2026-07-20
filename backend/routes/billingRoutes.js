const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createBill,
  getBills,
  getBillById,
  getBillsByCustomer,
  updateBillPaymentStatus,
} = require('../controllers/billingController');

// All billing routes require authentication
router.use(authenticate);

router.post('/', createBill);
router.get('/', getBills);
router.get('/customer/:customerId', getBillsByCustomer);
router.get('/:id', getBillById);
router.patch('/:id/payment', authorize('admin'), updateBillPaymentStatus);

module.exports = router;
