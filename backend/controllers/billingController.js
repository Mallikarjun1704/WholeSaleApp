const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const Customer = require('../models/Customer');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Generate a unique bill number
 */
const generateBillNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Bill.countDocuments({
    createdAt: {
      $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    },
  });
  return `TM-${dateStr}-${String(count + 1).padStart(3, '0')}`;
};

/**
 * @desc    Create a sales bill
 * @route   POST /api/billing
 * @access  Private
 */
const createBill = asyncHandler(async (req, res) => {
  const { customerId, items, discount, paymentMethod } = req.body;

  // Validate customer
  if (!customerId) {
    return res.status(400).json({ success: false, message: 'Customer (retail store) is required' });
  }
  const customer = await Customer.findById(customerId);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one item is required' });
  }

  const processedItems = [];
  let subtotal = 0;
  let totalGst = 0;

  for (const item of items) {
    if (!item.productId || !item.quantity || !item.sellingPrice) {
      return res.status(400).json({
        success: false,
        message: 'Each item requires productId, quantity, and sellingPrice',
      });
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found: ${item.productId}`,
      });
    }

    const qty = Number(item.quantity);
    if (qty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`,
      });
    }

    const sellingPrice = Number(item.sellingPrice);
    const taxableAmount = sellingPrice * qty;
    const gstRate = product.gstRate || 18;
    const gstAmount = Math.round((taxableAmount * gstRate) / 100);
    const itemTotal = taxableAmount + gstAmount;

    // FIFO: find the purchase price from the oldest batch with remaining stock
    let purchasePrice = 0;
    let batchRef = null;
    const oldestBatch = await Batch.findOne({
      product: product._id,
      remainingQty: { $gt: 0 },
    }).sort({ createdAt: 1 });

    if (oldestBatch) {
      purchasePrice = oldestBatch.purchasePrice;
      batchRef = oldestBatch._id;
    }

    subtotal += taxableAmount;
    totalGst += gstAmount;

    processedItems.push({
      product: product._id,
      batch: batchRef,
      name: product.name,
      quantity: qty,
      purchasePrice,
      sellingPrice,
      taxableAmount,
      gstRate,
      gstAmount,
      total: itemTotal,
    });
  }

  const discountAmount = Number(discount) || 0;
  const finalAmount = subtotal + totalGst - discountAmount;

  // Generate bill number
  const billNumber = await generateBillNumber();

  // Create the bill
  const bill = await Bill.create({
    billNumber,
    customer: customer._id,
    items: processedItems,
    subtotal,
    discount: discountAmount,
    gstAmount: totalGst,
    finalAmount,
    paymentMethod: paymentMethod || 'Cash',
    status: 'Pending',
  });

  // Deduct stock from products and batches (FIFO)
  for (const item of processedItems) {
    // Deduct from product total stock
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });

    // Deduct from batches (FIFO)
    let remainingToDeduct = item.quantity;
    const batches = await Batch.find({
      product: item.product,
      remainingQty: { $gt: 0 },
    }).sort({ createdAt: 1 });

    for (const batch of batches) {
      if (remainingToDeduct <= 0) break;

      const deductFromBatch = Math.min(batch.remainingQty, remainingToDeduct);
      batch.remainingQty -= deductFromBatch;
      await batch.save();
      remainingToDeduct -= deductFromBatch;
    }
  }

  // Update customer pending credit
  await Customer.findByIdAndUpdate(customer._id, {
    $inc: { pendingCredit: finalAmount },
  });

  // Populate and return
  const populatedBill = await Bill.findById(bill._id)
    .populate('customer', 'shopName ownerName phone')
    .populate('items.product', 'name sku');

  res.status(201).json({
    success: true,
    data: populatedBill,
  });
});

/**
 * @desc    Get all bills
 * @route   GET /api/billing
 * @access  Private
 */
const getBills = asyncHandler(async (req, res) => {
  const { status, customerId } = req.query;
  const query = {};

  if (status && ['Pending', 'Paid', 'Cancelled'].includes(status)) {
    query.status = status;
  }
  if (customerId) {
    query.customer = customerId;
  }

  const bills = await Bill.find(query)
    .sort({ createdAt: -1 })
    .populate('customer', 'shopName ownerName phone')
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    data: bills,
  });
});

/**
 * @desc    Get bill by ID
 * @route   GET /api/billing/:id
 * @access  Private
 */
const getBillById = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id)
    .populate('customer', 'shopName ownerName phone address gstNumber')
    .populate('items.product', 'name sku brand category');

  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found' });
  }

  res.status(200).json({
    success: true,
    data: bill,
  });
});

/**
 * @desc    Get bills for a specific customer
 * @route   GET /api/billing/customer/:customerId
 * @access  Private
 */
const getBillsByCustomer = asyncHandler(async (req, res) => {
  const bills = await Bill.find({
    customer: req.params.customerId,
    status: { $ne: 'Cancelled' },
  })
    .sort({ createdAt: -1 })
    .populate('customer', 'shopName ownerName phone')
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    data: bills,
  });
});

/**
 * @desc    Update bill payment status (Mark as Paid)
 * @route   PATCH /api/billing/:id/payment
 * @access  Private/Admin
 */
const updateBillPaymentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const bill = await Bill.findById(req.params.id);

  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found' });
  }

  if (!['Pending', 'Paid'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Use Pending or Paid.' });
  }

  if (bill.status === status) {
    return res.status(400).json({
      success: false,
      message: `Bill is already marked as ${status}`,
    });
  }

  const previousStatus = bill.status;
  bill.status = status;
  bill.paidDate = status === 'Paid' ? new Date() : null;
  await bill.save();

  // Update customer pending credit
  if (status === 'Paid' && previousStatus === 'Pending') {
    await Customer.findByIdAndUpdate(bill.customer, {
      $inc: { pendingCredit: -bill.finalAmount },
    });
  } else if (status === 'Pending' && previousStatus === 'Paid') {
    await Customer.findByIdAndUpdate(bill.customer, {
      $inc: { pendingCredit: bill.finalAmount },
    });
  }

  const updatedBill = await Bill.findById(bill._id)
    .populate('customer', 'shopName ownerName phone')
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    data: updatedBill,
  });
});

module.exports = {
  createBill,
  getBills,
  getBillById,
  getBillsByCustomer,
  updateBillPaymentStatus,
};
