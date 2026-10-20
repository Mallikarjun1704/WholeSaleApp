const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get all suppliers
 * @route   GET /api/suppliers
 * @access  Private
 */
const getSuppliers = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword ? req.query.keyword.trim() : '';
  const query = { isActive: true };

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { phone: { $regex: keyword, $options: 'i' } },
    ];
  }

  const suppliers = await Supplier.find(query).sort({ name: 1 });

  // Attach purchase count, total purchases, and total owed for each supplier
  const suppliersWithStats = await Promise.all(
    suppliers.map(async (supplier) => {
      const purchaseCount = await Purchase.countDocuments({ supplier: supplier._id });
      const totalPurchasesAgg = await Purchase.aggregate([
        { $match: { supplier: supplier._id } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]);
      const unpaidPurchases = await Purchase.aggregate([
        { $match: { supplier: supplier._id, paymentStatus: { $in: ['Unpaid', 'Partially Paid'] } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] } } } },
      ]);
      return {
        ...supplier.toObject(),
        purchaseCount,
        totalPurchases: totalPurchasesAgg[0]?.total || 0,
        unpaidAmount: Math.max(0, unpaidPurchases[0]?.total || 0),
      };
    })
  );

  res.status(200).json({
    success: true,
    data: suppliersWithStats,
  });
});

/**
 * @desc    Get supplier by ID with purchase history
 * @route   GET /api/suppliers/:id
 * @access  Private
 */
const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  const purchases = await Purchase.find({ supplier: supplier._id })
    .sort({ createdAt: -1 })
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    data: {
      supplier,
      purchases,
    },
  });
});

/**
 * @desc    Create a supplier
 * @route   POST /api/suppliers
 * @access  Private/Admin
 */
const createSupplier = asyncHandler(async (req, res) => {
  const { name, phone, email, address, gstNumber } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Supplier name is required' });
  }

  const supplier = await Supplier.create({
    name: name.trim(),
    phone: phone || '',
    email: email || '',
    address: address || '',
    gstNumber: gstNumber || '',
  });

  res.status(201).json({
    success: true,
    data: supplier,
  });
});

/**
 * @desc    Update a supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private/Admin
 */
const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  const { name, phone, email, address, gstNumber } = req.body;

  if (name) supplier.name = name.trim();
  if (phone !== undefined) supplier.phone = phone;
  if (email !== undefined) supplier.email = email;
  if (address !== undefined) supplier.address = address;
  if (gstNumber !== undefined) supplier.gstNumber = gstNumber;

  await supplier.save();

  res.status(200).json({
    success: true,
    data: supplier,
  });
});

/**
 * @desc    Delete a supplier (soft delete)
 * @route   DELETE /api/suppliers/:id
 * @access  Private/Admin
 */
const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  const purchaseCount = await Purchase.countDocuments({ supplier: supplier._id });
  if (purchaseCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete supplier. They have ${purchaseCount} purchase bill(s) linked.`,
    });
  }

  supplier.isActive = false;
  await supplier.save();

  res.status(200).json({
    success: true,
    message: 'Supplier deleted successfully',
  });
});

/**
 * @desc    Record bulk payment for a supplier (distribute FIFO across unpaid purchase bills)
 * @route   POST /api/suppliers/:id/payment
 * @access  Private/Admin
 */
const recordSupplierPayment = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, note, paymentDate } = req.body;
  const supplierId = req.params.id;

  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  const payAmount = Number(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
  }

  // Find all unpaid / partially paid purchase bills for this supplier sorted by purchaseDate/createdAt ASC (FIFO)
  const unpaidPurchases = await Purchase.find({
    supplier: supplierId,
    paymentStatus: { $in: ['Unpaid', 'Partially Paid'] },
  }).sort({ purchaseDate: 1, createdAt: 1 });

  if (unpaidPurchases.length === 0) {
    return res.status(400).json({ success: false, message: 'No outstanding purchase bills found for this supplier' });
  }

  let remainingToDistribute = payAmount;
  let totalDistributed = 0;
  const updatedPurchases = [];
  const pDate = paymentDate ? new Date(paymentDate) : new Date();
  const pMethod = paymentMethod || 'Cash';
  const paymentGroupId = `SPAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  for (const purchase of unpaidPurchases) {
    if (remainingToDistribute <= 0) break;

    const currentPaid = purchase.paidAmount || 0;
    const purchaseOwed = Math.max(0, purchase.totalAmount - currentPaid);

    if (purchaseOwed <= 0) continue;

    const alloc = Math.min(purchaseOwed, remainingToDistribute);
    const newPaid = currentPaid + alloc;
    let newStatus = 'Unpaid';

    if (newPaid >= purchase.totalAmount) {
      newStatus = 'Paid';
      purchase.paidDate = pDate;
    } else if (newPaid > 0) {
      newStatus = 'Partially Paid';
    }

    purchase.paidAmount = newPaid;
    purchase.paymentStatus = newStatus;
    purchase.paymentMethod = pMethod;

    if (!purchase.payments) {
      purchase.payments = [];
    }
    purchase.payments.push({
      amount: alloc,
      paymentDate: pDate,
      paymentMethod: pMethod,
      paymentGroupId,
      note: note || '',
      recordedBy: req.user?._id,
    });

    await purchase.save();

    totalDistributed += alloc;
    remainingToDistribute -= alloc;
    updatedPurchases.push(purchase);
  }

  // Recalculate supplier's total pendingCredit based on remaining unpaid bills
  const remainingPurchasesAgg = await Purchase.aggregate([
    { $match: { supplier: supplier._id, paymentStatus: { $in: ['Unpaid', 'Partially Paid'] } } },
    { $group: { _id: null, totalPending: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] } } } },
  ]);
  const newPendingCredit = remainingPurchasesAgg[0]?.totalPending || 0;
  supplier.pendingCredit = Math.max(0, Math.round(newPendingCredit));
  await supplier.save();

  // Log activity
  try {
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      userId: req.user?._id,
      userName: req.user?.fullName || 'System',
      action: 'PAYMENT',
      resource: 'SUPPLIER',
      resourceId: supplier._id,
      description: `Bulk payment of ₹${totalDistributed} recorded for supplier "${supplier.name}"`,
    });
  } catch (e) {
    // Non-fatal if activity log is not configured or optional
  }

  res.status(200).json({
    success: true,
    data: {
      supplier,
      totalDistributed,
      updatedPurchases,
    },
  });
});

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  recordSupplierPayment,
};
