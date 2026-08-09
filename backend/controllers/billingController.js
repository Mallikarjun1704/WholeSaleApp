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
    finalAmount,
    paidAmount: initialPaid,
    paymentMethod: paymentMethod || 'Cash',
    status,
    billDate: billDate ? new Date(billDate) : new Date(),
    paidDate: status === 'Paid' ? new Date() : null,
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

  if (status && ['Pending', 'Partially Paid', 'Paid', 'Cancelled'].includes(status)) {
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
 * @desc    Update bill payment status (Support partial payments)
 * @route   PATCH /api/billing/:id/payment
 * @access  Private/Admin
 */
const updateBillPaymentStatus = asyncHandler(async (req, res) => {
  const { status, amount } = req.body;

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

  // Once Paid, status cannot be changed back
  if (bill.status === 'Paid') {
    return res.status(400).json({
      success: false,
      message: 'Once marked as Paid, the sales bill status cannot be changed.',
    });
  }

  let payAmount = 0;
  const currentPaid = bill.paidAmount || 0;
  const remaining = Math.max(0, bill.finalAmount - currentPaid);

  if (amount !== undefined && amount !== null && !isNaN(Number(amount))) {
    payAmount = Math.min(remaining, Math.max(0, Number(amount)));
  } else if (status === 'Paid') {
    payAmount = remaining;
  }

  const newPaidAmount = currentPaid + payAmount;
  let newStatus = 'Pending';
  if (newPaidAmount >= bill.finalAmount) {
    newStatus = 'Paid';
    bill.paidDate = new Date();
  } else if (newPaidAmount > 0) {
    newStatus = 'Partially Paid';
  }

  bill.paidAmount = newPaidAmount;
  bill.status = newStatus;
  await bill.save();

  // Deduct actual paid amount from customer pending credit
  if (payAmount > 0) {
    await Customer.findByIdAndUpdate(bill.customer, {
      $inc: { pendingCredit: -payAmount },
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

/**
 * @desc    Generate and stream PDF bill
 * @route   GET /api/billing/:id/pdf
 * @access  Private
 */
const getBillPdf = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id)
    .populate('customer', 'shopName ownerName name phone address gstNumber')
    .populate('items.product', 'name sku brand category');

  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found' });
  }

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
 * @desc    Edit bill details (Admin only, allowed until fully paid)
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

  if (bill.status === 'Paid') {
    return res.status(400).json({
      success: false,
      message: 'This bill has been fully paid. Fully paid bills cannot be edited.',
    });
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
  const oldFinal = bill.finalAmount;
  const newFinal = bill.subtotal + bill.gstAmount + packingCharges;
  const diff = newFinal - oldFinal;

  bill.discount = packingCharges;
  bill.finalAmount = newFinal;
  if (billDate) {
    bill.billDate = new Date(billDate);
  }

  // Adjust payment status if needed
  const paid = bill.paidAmount || 0;
  if (paid >= newFinal) {
    bill.status = 'Paid';
    bill.paidDate = new Date();
  } else if (paid > 0) {
    bill.status = 'Partially Paid';
  } else {
    bill.status = 'Pending';
  }

  await bill.save();

  // Adjust customer pending debt if total changed
  if (diff !== 0 && bill.customer) {
    await Customer.findByIdAndUpdate(bill.customer, {
      $inc: { pendingCredit: diff },
    });
  }

  const updatedBill = await Bill.findById(bill._id)
    .populate('customer', 'shopName ownerName phone')
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
};
