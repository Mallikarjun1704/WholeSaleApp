const Purchase = require('../models/Purchase');
const Batch = require('../models/Batch');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Generate a unique batch ID
 */
const generateBatchId = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  let counter = (await Purchase.countDocuments()) + 1;
  let unique = false;
  let batchId = '';

  while (!unique) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    batchId = `BATCH-${dateStr}-${counter}-${randomSuffix}`;
    const existsPurchase = await Purchase.findOne({ batchId });
    const existsBatch = await Batch.findOne({ batchId });
    if (!existsPurchase && !existsBatch) {
      unique = true;
    } else {
      counter++;
    }
  }
  return batchId;
};

/**
 * Generate a unique purchase invoice number
 */
const generateInvoiceNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  let count = await Purchase.countDocuments();
  let unique = false;
  let invNum = '';

  while (!unique) {
    count++;
    invNum = `INV-${dateStr}-${String(count).padStart(3, '0')}`;
    const exists = await Purchase.findOne({ invoiceNumber: invNum });
    if (!exists) {
      unique = true;
    }
  }
  return invNum;
};

/**
 * @desc    Get next available auto-generated invoice number
 * @route   GET /api/purchases/next-invoice
 * @access  Private
 */
const getNextInvoiceNumber = asyncHandler(async (req, res) => {
  const invoiceNumber = await generateInvoiceNumber();
  res.status(200).json({
    success: true,
    data: { invoiceNumber },
  });
});

/**
 * @desc    Create a purchase bill (supplier stock receipt)
 * @route   POST /api/purchases
 * @access  Private/Admin
 */
const createPurchase = asyncHandler(async (req, res) => {
  const {
    supplierId,
    invoiceNumber,
    items,
    commissionPercent,
    travelCharge,
    notes,
    purchaseDate,
    paidAmount,
  } = req.body;

  // Validate supplier
  if (!supplierId) {
    return res.status(400).json({ success: false, message: 'Supplier is required' });
  }
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  let finalInvoiceNumber = invoiceNumber ? invoiceNumber.trim() : '';
  if (!finalInvoiceNumber) {
    finalInvoiceNumber = await generateInvoiceNumber();
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one item is required' });
  }

  // Validate each item and calculate totals
  const processedItems = [];
  let subtotal = 0;

  for (const item of items) {
    if (!item.productId || !item.quantity || !item.purchasePrice) {
      return res.status(400).json({
        success: false,
        message: 'Each item requires productId, quantity, and purchasePrice',
      });
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found: ${item.productId}`,
      });
    }

    const itemTotal = Number(item.quantity) * Number(item.purchasePrice);
    subtotal += itemTotal;

    // Parse IMEI numbers (optional)
    let imeiNumbers = [];
    if (item.imeiNumbers && Array.isArray(item.imeiNumbers)) {
      imeiNumbers = item.imeiNumbers
        .map((imei) => imei.trim())
        .filter((imei) => imei.length > 0);
    }

    processedItems.push({
      product: product._id,
      name: product.name,
      quantity: Number(item.quantity),
      purchasePrice: Number(item.purchasePrice),
      imeiNumbers,
      total: itemTotal,
    });
  }

  // Calculate commission and total
  const commPercent = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  const travel = Math.max(0, Number(travelCharge) || 0);
  const commAmount = Math.round(((subtotal + travel) * commPercent) / 100);
  const totalAmount = subtotal + commAmount + travel;

  // Calculate initial paid amount & status
  const initialPaid = Math.min(totalAmount, Math.max(0, Number(paidAmount) || 0));
  let status = 'Unpaid';
  if (initialPaid >= totalAmount) {
    status = 'Paid';
  } else if (initialPaid > 0) {
    status = 'Partially Paid';
  }

  // Generate batch ID
  const batchId = await generateBatchId();

  // Create the purchase record
  const purchase = await Purchase.create({
    invoiceNumber: finalInvoiceNumber,
    batchId,
    supplier: supplier._id,
    items: processedItems,
    subtotal,
    commissionPercent: commPercent,
    commissionAmount: commAmount,
    travelCharge: travel,
    totalAmount,
    paidAmount: initialPaid,
    paymentStatus: status,
    purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
    paidDate: status === 'Paid' ? new Date() : null,
    notes: notes || '',
  });

  // Calculate overhead ratio (commission + travel charge) per subtotal
  const overheadRatio = subtotal > 0 ? (commAmount + travel) / subtotal : 0;

  // Create Batch records and update Product stock for each item
  for (let idx = 0; idx < processedItems.length; idx++) {
    const item = processedItems[idx];
    const effectivePrice = Math.round(item.purchasePrice * (1 + overheadRatio));
    // Create batch record per item
    await Batch.create({
      batchId: processedItems.length > 1 ? `${batchId}-${idx + 1}` : batchId,
      product: item.product,
      purchase: purchase._id,
      supplier: supplier._id,
      purchasePrice: effectivePrice,
      quantity: item.quantity,
      remainingQty: item.quantity,
      imeiNumbers: item.imeiNumbers,
    });

    // Update product stock
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
      $push: {
        imeiList: { $each: item.imeiNumbers },
      },
    });
  }

  // Update supplier pending credit (remaining balance)
  const remainingDebt = Math.max(0, totalAmount - initialPaid);
  if (remainingDebt > 0) {
    await Supplier.findByIdAndUpdate(supplier._id, {
      $inc: { pendingCredit: remainingDebt },
    });
  }

  // Populate and return
  const populatedPurchase = await Purchase.findById(purchase._id)
    .populate('supplier', 'name phone')
    .populate('items.product', 'name sku');

  res.status(201).json({
    success: true,
    data: populatedPurchase,
  });
});

/**
 * @desc    Get all purchases for a supplier
 * @route   GET /api/purchases/supplier/:supplierId
 * @access  Private
 */
const getPurchasesBySupplier = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ supplier: req.params.supplierId })
    .sort({ createdAt: -1 })
    .populate('supplier', 'name phone')
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    data: purchases,
  });
});

/**
 * @desc    Get single purchase bill details
 * @route   GET /api/purchases/:id
 * @access  Private
 */
const getPurchaseById = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id)
    .populate('supplier', 'name phone email address')
    .populate('items.product', 'name sku brand category');

  if (!purchase) {
    return res.status(404).json({ success: false, message: 'Purchase not found' });
  }

  res.status(200).json({
    success: true,
    data: purchase,
  });
});

/**
 * @desc    Update purchase bill payment status (Support partial payments)
 * @route   PATCH /api/purchases/:id/payment
 * @access  Private/Admin
 */
const updatePurchasePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus, amount } = req.body;

  // Only master / admin can update payment status
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only master/admin user can change payment status',
    });
  }

  const purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    return res.status(404).json({ success: false, message: 'Purchase not found' });
  }

  if (purchase.paymentStatus === 'Paid') {
    return res.status(400).json({
      success: false,
      message: 'Once marked as Paid, the bill status cannot be changed.',
    });
  }

  let payAmount = 0;
  const currentPaid = purchase.paidAmount || 0;
  const remaining = Math.max(0, purchase.totalAmount - currentPaid);

  if (amount !== undefined && amount !== null && !isNaN(Number(amount))) {
    payAmount = Math.min(remaining, Math.max(0, Number(amount)));
  } else if (paymentStatus === 'Paid') {
    payAmount = remaining;
  }

  const newPaidAmount = currentPaid + payAmount;
  let newStatus = 'Unpaid';
  if (newPaidAmount >= purchase.totalAmount) {
    newStatus = 'Paid';
    purchase.paidDate = new Date();
  } else if (newPaidAmount > 0) {
    newStatus = 'Partially Paid';
  }

  purchase.paidAmount = newPaidAmount;
  purchase.paymentStatus = newStatus;
  await purchase.save();

  // Deduct paid amount from supplier pending credit
  if (payAmount > 0) {
    await Supplier.findByIdAndUpdate(purchase.supplier, {
      $inc: { pendingCredit: -payAmount },
    });
  }

  const updatedPurchase = await Purchase.findById(purchase._id)
    .populate('supplier', 'name phone')
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    data: updatedPurchase,
  });
});

/**
 * @desc    Get all purchases (with optional filters)
 * @route   GET /api/purchases
 * @access  Private
 */
const getPurchases = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.query;
  const query = {};

  if (paymentStatus && ['Paid', 'Unpaid'].includes(paymentStatus)) {
    query.paymentStatus = paymentStatus;
  }

  const purchases = await Purchase.find(query)
    .sort({ createdAt: -1 })
    .populate('supplier', 'name phone')
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    data: purchases,
  });
});

/**
 * @desc    Update purchase bill (Admin only)
 * @route   PUT /api/purchases/:id
 * @access  Private (Admin)
 */
const updatePurchase = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only Admin can edit purchase bills' });
  }

  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) {
    return res.status(404).json({ success: false, message: 'Purchase bill not found' });
  }

  if (purchase.paymentStatus === 'Paid') {
    return res.status(400).json({
      success: false,
      message: 'Once fully paid, the purchase bill cannot be edited.',
    });
  }

  const { commissionPercent, travelCharge, notes, purchaseDate, items } = req.body;

  let processedItems = purchase.items;
  let hasItemsUpdate = false;

  // If items array is provided in request body
  if (items !== undefined && Array.isArray(items)) {
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required in purchase bill' });
    }

    hasItemsUpdate = true;

    // Step 1: Revert previous stock additions and IMEI numbers for old purchase items
    for (const oldItem of purchase.items) {
      await Product.findByIdAndUpdate(oldItem.product, {
        $inc: { stock: -oldItem.quantity },
        $pull: { imeiList: { $in: oldItem.imeiNumbers || [] } },
      });
    }
    await Batch.deleteMany({ purchase: purchase._id });

    // Step 2: Process new items
    processedItems = [];
    let newSubtotal = 0;

    for (const item of items) {
      const prodId = item.productId || item.product;
      if (!prodId || !item.quantity || !item.purchasePrice) {
        return res.status(400).json({
          success: false,
          message: 'Each item requires product ID, quantity, and purchase price',
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
      const price = Number(item.purchasePrice);
      const imeiArr = Array.isArray(item.imeiNumbers)
        ? item.imeiNumbers
        : typeof item.imeiNumbers === 'string'
        ? item.imeiNumbers.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const itemTotal = qty * price;
      newSubtotal += itemTotal;

      processedItems.push({
        product: product._id,
        name: product.name,
        quantity: qty,
        purchasePrice: price,
        imeiNumbers: imeiArr,
        total: itemTotal,
      });
    }

    purchase.items = processedItems;
    purchase.subtotal = newSubtotal;
  }

  // Recalculate overheads, commission & total amount
  const commPercent = commissionPercent !== undefined ? Number(commissionPercent) : purchase.commissionPercent;
  const travel = travelCharge !== undefined ? Number(travelCharge) : purchase.travelCharge;
  const commAmount = Math.round(((purchase.subtotal + travel) * commPercent) / 100);

  const newTotal = purchase.subtotal + commAmount + travel;

  purchase.commissionPercent = commPercent;
  purchase.travelCharge = travel;
  purchase.commissionAmount = commAmount;
  purchase.totalAmount = newTotal;
  if (notes !== undefined) purchase.notes = notes;
  if (purchaseDate) purchase.purchaseDate = new Date(purchaseDate);

  // If items were updated, re-create batches and update product stock & imeiList
  if (hasItemsUpdate) {
    const overheadRatio = purchase.subtotal > 0 ? (commAmount + travel) / purchase.subtotal : 0;
    for (let idx = 0; idx < processedItems.length; idx++) {
      const item = processedItems[idx];
      const effectivePrice = Math.round(item.purchasePrice * (1 + overheadRatio));

      await Batch.create({
        batchId: processedItems.length > 1 ? `${purchase.batchId}-${idx + 1}` : purchase.batchId,
        product: item.product,
        purchase: purchase._id,
        supplier: purchase.supplier,
        purchasePrice: effectivePrice,
        quantity: item.quantity,
        remainingQty: item.quantity,
        imeiNumbers: item.imeiNumbers,
      });

      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
        $push: { imeiList: { $each: item.imeiNumbers } },
      });
    }
  }

  // Reset payment status to Unpaid and clear paidAmount so payment can be submitted again
  purchase.paidAmount = 0;
  purchase.paymentStatus = 'Unpaid';
  purchase.paidDate = null;

  await purchase.save();

  // Recalculate supplier pending credit (unpaid balance) accurately
  if (purchase.supplier) {
    const unpaidPurchases = await Purchase.aggregate([
      { $match: { supplier: purchase.supplier } },
      {
        $project: {
          remaining: {
            $max: [{ $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] }, 0],
          },
        },
      },
      { $group: { _id: null, totalPending: { $sum: '$remaining' } } },
    ]);
    const newPendingCredit = unpaidPurchases[0]?.totalPending || 0;
    await Supplier.findByIdAndUpdate(purchase.supplier, {
      pendingCredit: Math.max(0, Math.round(newPendingCredit)),
    });
  }

  const updatedPurchase = await Purchase.findById(purchase._id)
    .populate('supplier', 'name phone')
    .populate('items.product', 'name sku');

  res.status(200).json({
    success: true,
    message: 'Purchase bill updated successfully',
    data: updatedPurchase,
  });
});

module.exports = {
  createPurchase,
  getPurchases,
  getPurchasesBySupplier,
  getPurchaseById,
  updatePurchasePaymentStatus,
  updatePurchase,
  getNextInvoiceNumber,
};
