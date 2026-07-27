const express = require('express');
const router = express.Router();
const { getInvestments, createInvestment, deleteInvestment } = require('../controllers/investmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.route('/')
  .get(getInvestments)
  .post(authorize('admin'), createInvestment);

router.route('/:id')
  .delete(authorize('admin'), deleteInvestment);

module.exports = router;
