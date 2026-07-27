const Investment = require('../models/Investment');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get all investments
 * @route   GET /api/investments
 * @access  Private
 */
const getInvestments = asyncHandler(async (req, res) => {
  const investments = await Investment.find()
    .sort({ date: -1, createdAt: -1 })
    .populate('createdBy', 'fullName role');

  const summaryAgg = await Investment.aggregate([
    {
      $group: {
        _id: '$partnerName',
        totalInvested: {
          $sum: { $cond: [{ $eq: ['$type', 'Investment'] }, '$amount', 0] },
        },
        totalWithdrawn: {
          $sum: { $cond: [{ $eq: ['$type', 'Withdrawal'] }, '$amount', 0] },
        },
      },
    },
  ]);

  const partnerSummaries = summaryAgg.map((s) => ({
    partnerName: s._id,
    totalInvested: s.totalInvested,
    totalWithdrawn: s.totalWithdrawn,
    netCapital: s.totalInvested - s.totalWithdrawn,
  }));

  const totalCapital = partnerSummaries.reduce((acc, p) => acc + p.netCapital, 0);

  res.status(200).json({
    success: true,
    data: {
      investments,
      partnerSummaries,
      totalCapital,
    },
  });
});

/**
 * @desc    Create a new investment or withdrawal
 * @route   POST /api/investments
 * @access  Private/Admin
 */
const createInvestment = asyncHandler(async (req, res) => {
  const { partnerName, amount, type, date, notes } = req.body;

  if (!partnerName || !amount) {
    return res.status(400).json({ success: false, message: 'Partner name and amount are required' });
  }

  const investment = await Investment.create({
    partnerName: partnerName.trim(),
    amount: Number(amount),
    type: type === 'Withdrawal' ? 'Withdrawal' : 'Investment',
    date: date ? new Date(date) : new Date(),
    notes: notes ? notes.trim() : '',
    createdBy: req.user?._id,
  });

  await ActivityLog.create({
    userId: req.user?._id,
    userName: req.user?.fullName || 'System',
    action: 'CREATE',
    resource: 'INVESTMENT',
    description: `Recorded ${investment.type} of ₹${investment.amount} for partner ${investment.partnerName}`,
  });

  res.status(201).json({
    success: true,
    data: investment,
  });
});

/**
 * @desc    Delete an investment entry
 * @route   DELETE /api/investments/:id
 * @access  Private/Admin
 */
const deleteInvestment = asyncHandler(async (req, res) => {
  const investment = await Investment.findById(req.params.id);

  if (!investment) {
    return res.status(404).json({ success: false, message: 'Investment record not found' });
  }

  await investment.deleteOne();

  await ActivityLog.create({
    userId: req.user?._id,
    userName: req.user?.fullName || 'System',
    action: 'DELETE',
    resource: 'INVESTMENT',
    description: `Deleted ${investment.type} record of ₹${investment.amount} for ${investment.partnerName}`,
  });

  res.status(200).json({
    success: true,
    message: 'Investment entry removed',
  });
});

module.exports = {
  getInvestments,
  createInvestment,
  deleteInvestment,
};
