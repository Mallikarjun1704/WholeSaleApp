const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const Customer = require('../models/Customer');
const Setting = require('../models/Setting');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateBillPdfStream } = require('../utils/pdfGenerator');

/**
 * Generate a unique bill number
 */
const generateBillNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const totalCount = await Bill.countDocuments();
  let counter = totalCount + 1;
  let unique = false;
  let billNum = '';

  while (!unique) {
    billNum = `TM-${dateStr}-${String(counter).padStart(3, '0')}`;
    const exists = await Bill.findOne({ billNumber: billNum });
    if (!exists) {
      unique = true;
    } else {
      counter++;
    }
  }
  return billNum;
};

/**
 * @desc    Create a sales bill
 * @route   POST /api/billing
 * @access  Private
 */
const createBill = asyncHandler(async (req, res) => {
  const { customerId, items, discount, paymentMethod, billDate, paidAmount } = req.body;

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
    const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : 0;
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

  const packingCharges = Number(discount) || 0;
  const finalAmount = subtotal + totalGst + packingCharges;
  const customerOutstanding = Number(customer.pendingCredit) || 0;

  // Calculate initial paid amount & status
  const initialPaid = Math.min(finalAmount, Math.max(0, Number(paidAmount) || 0));
  let status = 'Pending';
  if (initialPaid >= finalAmount) {
    status = 'Paid';
  } else if (initialPaid > 0) {
    status = 'Partially Paid';
  }

  // Generate bill number
  const billNumber = await generateBillNumber();

  // Create the bill
  const bill = await Bill.create({
    billNumber,
    customer: customer._id,
    items: processedItems,
    subtotal,
    discount: packingCharges,
    gstAmount: totalGst,
    outstandingAmount: customerOutstanding,
    finalAmount,
    paidAmount: initialPaid,
    paymentMethod: paymentMethod || 'Cash',
    status,
    billDate: billDate ? new Date(billDate) : new Date(),
    paidDate: status === 'Paid' ? new Date() : null,
    payments: initialPaid > 0 ? [{
      amount: initialPaid,
      paymentDate: billDate ? new Date(billDate) : new Date(),
      paymentMethod: paymentMethod || 'Cash',
      note: 'Initial payment at bill creation',
      recordedBy: req.user?._id,
    }] : [],
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

  // Update customer pending credit (remaining balance)
  const remainingDebt = Math.max(0, finalAmount - initialPaid);
  if (remainingDebt > 0) {
    await Customer.findByIdAndUpdate(customer._id, {
      $inc: { pendingCredit: remainingDebt },
    });
  }

  // Populate and return
  const populatedBill = await Bill.findById(bill._id)
    .populate('customer', 'shopName ownerName phone pendingCredit')
    .populate('items.product', 'name sku');

  res.status(201).json({
    success: true,
    data: populatedBill,
  });
});

/**
 * Helper to compute the accurate Old Outstanding Amount for a bill
 * based on all prior unpaid bills of that customer in chronological sequence.
 */
const attachOutstandingToBills = async (bills, customerId) => {
  if (!bills || bills.length === 0) return bills;

  const custId = customerId || bills[0]?.customer?._id || bills[0]?.customer;
  if (!custId) return bills;

  const allCustomerBills = await Bill.find({
    customer: custId,
    status: { $ne: 'Cancelled' },
  }).sort({ billDate: 1, createdAt: 1, _id: 1 });

  const billOutstandingMap = new Map();
  for (let i = 0; i < allCustomerBills.length; i++) {
    const curBill = allCustomerBills[i];
    const priorBills = allCustomerBills.slice(0, i);
    const priorOutstanding = priorBills.reduce((sum, prev) => {
      const unpaid = Math.max(0, (prev.finalAmount || 0) - (prev.paidAmount || 0));
      return sum + unpaid;
    }, 0);
    billOutstandingMap.set(curBill._id.toString(), priorOutstanding);
  }

  return bills.map((b) => {
    const bObj = b.toObject ? b.toObject() : { ...b };
    const calculatedOutstanding = billOutstandingMap.get(bObj._id.toString());
    if (typeof calculatedOutstanding === 'number') {
      bObj.outstandingAmount = calculatedOutstanding;
    }
    return bObj;
  });
};

const computeSingleBillOutstanding = async (bill) => {
  if (!bill || !bill.customer) return bill?.outstandingAmount || 0;
  const custId = bill.customer._id || bill.customer;

  const allCustomerBills = await Bill.find({
    customer: custId,
    status: { $ne: 'Cancelled' },
  }).sort({ billDate: 1, createdAt: 1, _id: 1 });

  const targetId = bill._id.toString();
  const index = allCustomerBills.findIndex((b) => b._id.toString() === targetId);
  if (index === -1) {
    return allCustomerBills.reduce((sum, prev) => {
      const unpaid = Math.max(0, (prev.finalAmount || 0) - (prev.paidAmount || 0));
      return sum + unpaid;
    }, 0);
  }

  const priorBills = allCustomerBills.slice(0, index);
  return priorBills.reduce((sum, prev) => {
    const unpaid = Math.max(0, (prev.finalAmount || 0) - (prev.paidAmount || 0));
    return sum + unpaid;
  }, 0);
};

/**
 * @desc    Get all bills
 * @route   GET /api/billing
 * @access  Private
 */
const getBills = asyncHandler(async (req, res) => {
  const { status, customerId } = req.query;
  const query = {};

  if (status && ['Pending', 'Partially Paid', 'Paid', 'Cancelled'].includes(status)) {
    query.status = status;
  }
  if (customerId) {
    query.customer = customerId;
  }

  const bills = await Bill.find(query)
    .sort({ createdAt: -1 })
    .populate('customer', 'shopName ownerName phone pendingCredit')
    .populate('items.product', 'name sku');

  let processedBills = bills;
  if (customerId) {
    processedBills = await attachOutstandingToBills(bills, customerId);
  }

  res.status(200).json({
    success: true,
    data: processedBills,
  });
});

/**
 * @desc    Get bill by ID
 * @route   GET /api/billing/:id
 * @access  Private
 */
const getBillById = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id)
    .populate('customer', 'shopName ownerName phone address gstNumber pendingCredit')
    .populate('items.product', 'name sku brand category');

  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found' });
  }

  const billObj = bill.toObject ? bill.toObject() : { ...bill };
  billObj.outstandingAmount = await computeSingleBillOutstanding(bill);

  res.status(200).json({
    success: true,
    data: billObj,
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
    .populate('customer', 'shopName ownerName phone pendingCredit')
    .populate('items.product', 'name sku');

  const processedBills = await attachOutstandingToBills(bills, req.params.customerId);

  res.status(200).json({
    success: true,
    data: processedBills,
  });
});

/**
 * @desc    Update bill payment status (Support partial payments & reverting to unpaid)
 * @route   PATCH /api/billing/:id/payment
 * @access  Private/Admin
 */
const updateBillPaymentStatus = asyncHandler(async (req, res) => {
  const { status, amount, setPaidAmount, paymentMethod, note, paymentDate } = req.body;

  // Only master / admin can update payment status
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only master/admin user can change payment status',
    });
  }

  const bill = await Bill.findById(req.params.id);

  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found' });
  }

  // Prevent changing payment status if the customer has fully paid and status is already 'Paid'
  if (bill.status === 'Paid' && (bill.paidAmount || 0) >= (bill.finalAmount || 0)) {
    return res.status(400).json({
      success: false,
      message: 'Payment status cannot be changed for a fully paid bill',
    });
  }

  const billTotal = bill.finalAmount || 0;
  const currentPaid = bill.paidAmount || 0;
  let newPaidAmount = currentPaid;
  let newStatus = bill.status;
  let logPayment = false;
  let logAmount = 0;
  let logNote = note || '';

  // Handle explicit revert to Unpaid / Pending
  if (status === 'Pending' || status === 'Unpaid' || req.body.action === 'revert' || (setPaidAmount !== undefined && Number(setPaidAmount) === 0)) {
    newPaidAmount = 0;
    newStatus = 'Pending';
    bill.paidDate = null;
    bill.payments = [];
    logPayment = false;
    logAmount = 0;
    logNote = logNote || 'Payment status reverted to Unpaid (Pending) by Admin';
  } else if (status === 'Paid') {
    // Explicitly mark as Paid in full
    logAmount = Math.max(0, billTotal - currentPaid);
    newPaidAmount = billTotal;
    newStatus = 'Paid';
    bill.paidDate = paymentDate ? new Date(paymentDate) : new Date();
    logPayment = logAmount > 0;
    logNote = logNote || 'Marked as fully Paid by Admin';
  } else if (setPaidAmount !== undefined && !isNaN(Number(setPaidAmount))) {
    // Directly set exact paid amount
    const targetPaid = Math.max(0, Math.min(billTotal, Number(setPaidAmount)));
    logAmount = targetPaid - currentPaid;
    newPaidAmount = targetPaid;
    if (newPaidAmount >= billTotal) {
      newStatus = 'Paid';
      bill.paidDate = paymentDate ? new Date(paymentDate) : (bill.paidDate || new Date());
    } else if (newPaidAmount > 0) {
      newStatus = 'Partially Paid';
      bill.paidDate = null;
    } else {
      newStatus = 'Pending';
      bill.paidDate = null;
    }

    if (newPaidAmount === 0) {
      bill.payments = [];
      logPayment = false;
    } else {
      bill.payments = [
        {
          amount: newPaidAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod: paymentMethod || bill.paymentMethod || 'Cash',
          note: note || `Paid amount set to ₹${newPaidAmount} by Admin`,
          recordedBy: req.user?._id,
        },
      ];
      logPayment = false;
    }
  } else if (amount !== undefined && amount !== null && !isNaN(Number(amount))) {
    // Add additional payment amount (e.g. paying partial/full balance)
    const payAmount = Number(amount);
    if (payAmount <= 0) {
      // Revert / decrease paid amount
      newPaidAmount = Math.max(0, currentPaid + payAmount);
      if (newPaidAmount === 0) {
        bill.payments = [];
      } else {
        // Adjust existing payment logs or set single log
        bill.payments = [
          {
            amount: newPaidAmount,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentMethod: paymentMethod || bill.paymentMethod || 'Cash',
            note: note || `Paid amount adjusted to ₹${newPaidAmount}`,
            recordedBy: req.user?._id,
          },
        ];
      }
      logPayment = false;
    } else {
      const remaining = Math.max(0, billTotal - currentPaid);
      const applied = Math.min(remaining, payAmount);
      newPaidAmount = currentPaid + applied;
      logAmount = applied;
      logPayment = true;
    }

    if (newPaidAmount >= billTotal) {
      newStatus = 'Paid';
      bill.paidDate = paymentDate ? new Date(paymentDate) : new Date();
    } else if (newPaidAmount > 0) {
      newStatus = 'Partially Paid';
      bill.paidDate = null;
    } else {
      newStatus = 'Pending';
      bill.paidDate = null;
    }
    logNote = logNote || 'Payment updated by Admin';
  }

  bill.paidAmount = newPaidAmount;
  bill.status = newStatus;

  if (logPayment && logAmount > 0) {
    if (!bill.payments) {
      bill.payments = [];
    }
    bill.payments.push({
      amount: logAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || bill.paymentMethod || 'Cash',
      note: logNote,
      recordedBy: req.user?._id,
    });
  }

  await bill.save();

  // Recalculate customer's pending credit from all unpaid bills
  if (bill.customer) {
    const remainingBillsAgg = await Bill.aggregate([
      { $match: { customer: bill.customer, status: { $in: ['Pending', 'Partially Paid'] } } },
      { $group: { _id: null, totalPending: { $sum: { $subtract: ['$finalAmount', { $ifNull: ['$paidAmount', 0] }] } } } },
    ]);
    const newPendingCredit = remainingBillsAgg[0]?.totalPending || 0;
    await Customer.findByIdAndUpdate(bill.customer, {
      pendingCredit: Math.max(0, Math.round(newPendingCredit)),
    });
  }

  // Log activity safely
  try {
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      userId: req.user?._id,
      userName: req.user?.fullName || 'System',
      action: 'PAYMENT',
      resource: 'BILL',
      resourceId: bill._id,
      description: `Payment of ₹${logAmount} recorded for bill ${bill.billNumber} (${newStatus})`,
    });
  } catch (logErr) {
    console.error('Activity log error in updateBillPaymentStatus:', logErr.message);
  }

  const updatedBill = await Bill.findById(bill._id)
    .populate('customer', 'shopName ownerName phone pendingCredit')
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    message: `Payment status updated to ${newStatus}`,
    data: updatedBill,
  });
});

/**
 * @desc    Generate and stream PDF bill
 * @route   GET /api/billing/:id/pdf
 * @access  Private
 */
const getBillPdf = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id)
    .populate('customer', 'shopName ownerName name phone address gstNumber pendingCredit')
    .populate('items.product', 'name sku brand category imeiList imeiTracking');

  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found' });
  }

  // Calculate accurate chronological old outstanding amount before this bill
  bill.outstandingAmount = await computeSingleBillOutstanding(bill);

  // Format filename as shopName_date_indexValue.pdf
  const rawShopName = bill.customer?.shopName || bill.customer?.ownerName || bill.customer?.name || 'Customer';
  const cleanShopName = rawShopName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const dateObj = bill.billDate ? new Date(bill.billDate) : new Date(bill.createdAt);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const billNumParts = (bill.billNumber || '').split('-');
  const indexValue = billNumParts.length > 0 ? billNumParts[billNumParts.length - 1] : '1';

  const pdfFileName = `${cleanShopName}_${dateStr}_${indexValue}.pdf`;

  const settings = await Setting.getSettings();
  const pdfStream = generateBillPdfStream(bill, settings);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${pdfFileName}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  pdfStream.pipe(res);
  pdfStream.end();
});

/**
 * @desc    Edit bill details (Admin only)
 * @route   PUT /api/billing/:id
 * @access  Private (Admin)
 */
const updateBill = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only Admin can edit bills' });
  }

  const bill = await Bill.findById(req.params.id);
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found' });
  }

  const { discount, billDate, items } = req.body;

  // If items array is supplied in update payload, handle stock reconciliation and items update
  if (items !== undefined && Array.isArray(items)) {
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required in the bill' });
    }

    // Step 1: Revert previous stock deductions for old items
    for (const oldItem of bill.items) {
      await Product.findByIdAndUpdate(oldItem.product, {
        $inc: { stock: oldItem.quantity },
      });

      if (oldItem.batch) {
        await Batch.findByIdAndUpdate(oldItem.batch, {
          $inc: { remainingQty: oldItem.quantity },
        });
      } else {
        const lastBatch = await Batch.findOne({ product: oldItem.product }).sort({ createdAt: -1 });
        if (lastBatch) {
          lastBatch.remainingQty += oldItem.quantity;
          await lastBatch.save();
        }
      }
    }

    // Step 2: Validate and process new items list
    const processedItems = [];
    let newSubtotal = 0;
    let newTotalGst = 0;

    for (const item of items) {
      const prodId = item.productId || item.product;
      if (!prodId || !item.quantity || !item.sellingPrice) {
        return res.status(400).json({
          success: false,
          message: 'Each item requires product ID, quantity, and selling price',
        });
      }

      const product = await Product.findById(prodId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${prodId}`,
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
      const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : 0;
      const gstAmount = Math.round((taxableAmount * gstRate) / 100);
      const itemTotal = taxableAmount + gstAmount;

      // Find FIFO batch for purchase price reference
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

      newSubtotal += taxableAmount;
      newTotalGst += gstAmount;

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

    // Step 3: Deduct stock from products and batches for new processed items
    for (const newItem of processedItems) {
      await Product.findByIdAndUpdate(newItem.product, {
        $inc: { stock: -newItem.quantity },
      });

      let remainingToDeduct = newItem.quantity;
      const batches = await Batch.find({
        product: newItem.product,
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

    bill.items = processedItems;
    bill.subtotal = newSubtotal;
    bill.gstAmount = newTotalGst;
  }

  const packingCharges = discount !== undefined ? Number(discount) : bill.discount;
  const newFinal = bill.subtotal + bill.gstAmount + packingCharges;

  bill.discount = packingCharges;
  bill.finalAmount = newFinal;
  if (billDate) {
    bill.billDate = new Date(billDate);
  }

  // Adjust payment status based on new final amount and paid amount
  const paid = bill.paidAmount || 0;
  if (paid >= newFinal) {
    bill.status = 'Paid';
    bill.paidDate = bill.paidDate || new Date();
  } else if (paid > 0) {
    bill.status = 'Partially Paid';
    bill.paidDate = null;
  } else {
    bill.status = 'Pending';
    bill.paidDate = null;
  }

  await bill.save();

  // Recalculate customer's pending credit from all unpaid bills
  if (bill.customer) {
    const remainingBillsAgg = await Bill.aggregate([
      { $match: { customer: bill.customer, status: { $in: ['Pending', 'Partially Paid'] } } },
      { $group: { _id: null, totalPending: { $sum: { $subtract: ['$finalAmount', { $ifNull: ['$paidAmount', 0] }] } } } },
    ]);
    const newPendingCredit = remainingBillsAgg[0]?.totalPending || 0;
    await Customer.findByIdAndUpdate(bill.customer, {
      pendingCredit: Math.max(0, Math.round(newPendingCredit)),
    });
  }

  const updatedBill = await Bill.findById(bill._id)
    .populate('customer', 'shopName ownerName phone pendingCredit')
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    message: 'Bill updated successfully',
    data: updatedBill,
  });
});

module.exports = {
  createBill,
  getBills,
  getBillById,
  getBillsByCustomer,
  updateBillPaymentStatus,
  updateBill,
  getBillPdf,
  attachOutstandingToBills,
  computeSingleBillOutstanding,
};
