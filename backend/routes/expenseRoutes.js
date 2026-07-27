const express = require('express');
const router = express.Router();
const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.route('/')
  .get(getExpenses)
  .post(authorize('admin'), createExpense);

router.route('/:id')
  .delete(authorize('admin'), deleteExpense);

module.exports = router;
