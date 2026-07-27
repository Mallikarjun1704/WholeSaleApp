const Expense = require('../models/Expense');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get all store expenses
 * @route   GET /api/expenses
 * @access  Private
 */
const getExpenses = asyncHandler(async (req, res) => {
  const { category, startDate, endDate } = req.query;
  const query = {};

  if (category) {
    query.category = category;
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const expenses = await Expense.find(query)
    .sort({ date: -1, createdAt: -1 })
    .populate('createdBy', 'fullName role');

  const categoryAgg = await Expense.aggregate([
    { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { totalAmount: -1 } },
  ]);

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  res.status(200).json({
    success: true,
    data: {
      expenses,
      categorySummaries: categoryAgg,
      totalExpense,
    },
  });
});

/**
 * @desc    Create a new expense entry
 * @route   POST /api/expenses
 * @access  Private/Admin
 */
const createExpense = asyncHandler(async (req, res) => {
  const { title, category, amount, date, notes } = req.body;

  if (!title || !amount) {
    return res.status(400).json({ success: false, message: 'Expense title and amount are required' });
  }

  const expense = await Expense.create({
    title: title.trim(),
    category: category || 'Other',
    amount: Number(amount),
    date: date ? new Date(date) : new Date(),
    notes: notes ? notes.trim() : '',
    createdBy: req.user?._id,
  });

  await ActivityLog.create({
    userId: req.user?._id,
    userName: req.user?.fullName || 'System',
    action: 'CREATE',
    resource: 'EXPENSE',
    description: `Recorded expense of ₹${expense.amount} for "${expense.title}" [${expense.category}]`,
  });

  res.status(201).json({
    success: true,
    data: expense,
  });
});

/**
 * @desc    Delete an expense entry
 * @route   DELETE /api/expenses/:id
 * @access  Private/Admin
 */
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    return res.status(404).json({ success: false, message: 'Expense record not found' });
  }

  await expense.deleteOne();

  await ActivityLog.create({
    userId: req.user?._id,
    userName: req.user?.fullName || 'System',
    action: 'DELETE',
    resource: 'EXPENSE',
    description: `Deleted expense record of ₹${expense.amount} ("${expense.title}")`,
  });

  res.status(200).json({
    success: true,
    message: 'Expense record removed',
  });
});

module.exports = {
  getExpenses,
  createExpense,
  deleteExpense,
};
