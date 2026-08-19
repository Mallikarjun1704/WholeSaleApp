const Customer = require('../models/Customer');
const Bill = require('../models/Bill');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get all customers (retail stores)
 * @route   GET /api/customers
 * @access  Private
 */
const getCustomers = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword ? req.query.keyword.trim() : '';
  const query = { isActive: true };

  if (keyword) {
    query.$or = [
      { shopName: { $regex: keyword, $options: 'i' } },
      { ownerName: { $regex: keyword, $options: 'i' } },
      { phone: { $regex: keyword, $options: 'i' } },
    ];
  }

  const customers = await Customer.find(query).sort({ shopName: 1 });

  // Attach bill count and total purchases for each customer
  const customersWithStats = await Promise.all(
    customers.map(async (customer) => {
      const billCount = await Bill.countDocuments({ customer: customer._id, status: { $ne: 'Cancelled' } });
      const purchaseSum = await Bill.aggregate([
        { $match: { customer: customer._id, status: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]);
      return {
        ...customer.toObject(),
        billCount,
        totalPurchases: purchaseSum[0]?.total || 0,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: customersWithStats,
  });
});

/**
 * @desc    Get customer by ID with bill history
 * @route   GET /api/customers/:id
 * @access  Private
 */
const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const bills = await Bill.find({ customer: customer._id, status: { $ne: 'Cancelled' } })
    .sort({ createdAt: -1 })
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    data: {
      customer,
      bills,
    },
  });
});

/**
 * @desc    Create a customer (retail store)
 * @route   POST /api/customers
 * @access  Private/Admin
 */
const createCustomer = asyncHandler(async (req, res) => {
  const { shopName, ownerName, phone, email, address, gstNumber } = req.body;

  if (!shopName || !ownerName) {
    return res.status(400).json({
      success: false,
      message: 'Shop name and owner name are required',
    });
  }

  const customer = await Customer.create({
    shopName: shopName.trim(),
    ownerName: ownerName.trim(),
    phone: phone || '',
    email: email || '',
    address: address || '',
    gstNumber: gstNumber || '',
  });

  res.status(201).json({
    success: true,
    data: customer,
  });
});

/**
 * @desc    Update a customer
 * @route   PUT /api/customers/:id
 * @access  Private/Admin
 */
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const { shopName, ownerName, phone, email, address, gstNumber } = req.body;

  if (shopName) customer.shopName = shopName.trim();
  if (ownerName) customer.ownerName = ownerName.trim();
  if (phone !== undefined) customer.phone = phone;
  if (email !== undefined) customer.email = email;
  if (address !== undefined) customer.address = address;
  if (gstNumber !== undefined) customer.gstNumber = gstNumber;

  await customer.save();

  res.status(200).json({
    success: true,
    data: customer,
  });
});

/**
 * @desc    Delete a customer (soft delete)
 * @route   DELETE /api/customers/:id
 * @access  Private/Admin
 */
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const billCount = await Bill.countDocuments({ customer: customer._id, status: { $ne: 'Cancelled' } });
  if (billCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete customer. They have ${billCount} bill(s) linked.`,
    });
  }

  customer.isActive = false;
  await customer.save();

  res.status(200).json({
    success: true,
    message: 'Customer deleted successfully',
  });
});

/**
 * @desc    Record bulk payment for a customer (distribute FIFO across unpaid bills)
 * @route   POST /api/customers/:id/payment
 * @access  Private/Admin
 */
const recordCustomerPayment = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, note, paymentDate } = req.body;
  const customerId = req.params.id;

  const customer = await Customer.findById(customerId);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const payAmount = Number(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
  }

  // Find all unpaid / partially paid bills for this customer sorted by billDate/createdAt ASC (FIFO)
  const unpaidBills = await Bill.find({
    customer: customerId,
    status: { $in: ['Pending', 'Partially Paid'] },
  }).sort({ billDate: 1, createdAt: 1 });

  if (unpaidBills.length === 0) {
    return res.status(400).json({ success: false, message: 'No outstanding bills found for this customer' });
  }

  let remainingToDistribute = payAmount;
  let totalDistributed = 0;
  const updatedBills = [];
  const pDate = paymentDate ? new Date(paymentDate) : new Date();
  const pMethod = paymentMethod || 'Cash';

  for (const bill of unpaidBills) {
    if (remainingToDistribute <= 0) break;

    const currentPaid = bill.paidAmount || 0;
    const billOwed = Math.max(0, bill.finalAmount - currentPaid);

    if (billOwed <= 0) continue;

    const alloc = Math.min(billOwed, remainingToDistribute);
    const newPaid = currentPaid + alloc;
    let newStatus = 'Pending';

    if (newPaid >= bill.finalAmount) {
      newStatus = 'Paid';
      bill.paidDate = pDate;
    } else if (newPaid > 0) {
      newStatus = 'Partially Paid';
    }

    bill.paidAmount = newPaid;
    bill.status = newStatus;
    bill.paymentMethod = pMethod;

    if (!bill.payments) {
      bill.payments = [];
    }
    bill.payments.push({
      amount: alloc,
      paymentDate: pDate,
      paymentMethod: pMethod,
      note: note || '',
      recordedBy: req.user?._id,
    });

    await bill.save();

    totalDistributed += alloc;
    remainingToDistribute -= alloc;
    updatedBills.push(bill);
  }

  // Recalculate customer's total pendingCredit based on remaining unpaid bills
  const remainingBillsAgg = await Bill.aggregate([
    { $match: { customer: customer._id, status: { $in: ['Pending', 'Partially Paid'] } } },
    { $group: { _id: null, totalPending: { $sum: { $subtract: ['$finalAmount', { $ifNull: ['$paidAmount', 0] }] } } } },
  ]);
  const newPendingCredit = remainingBillsAgg[0]?.totalPending || 0;
  customer.pendingCredit = Math.max(0, Math.round(newPendingCredit));
  await customer.save();

  // Log activity
  await ActivityLog.create({
    userId: req.user?._id,
    action: 'PAYMENT',
    details: `Bulk payment of ₹${totalDistributed} recorded for store "${customer.shopName}"`,
  });

  res.status(200).json({
    success: true,
    data: {
      customer,
      totalDistributed,
      updatedBills,
    },
  });
});

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  recordCustomerPayment,
};
