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
  const count = await Purchase.countDocuments({
    createdAt: {
      $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    },
  });
  return `BATCH-${dateStr}-${String(count + 1).padStart(3, '0')}`;
};

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
  } = req.body;

  // Validate supplier
  if (!supplierId) {
    return res.status(400).json({ success: false, message: 'Supplier is required' });
  }
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found' });
  }

  if (!invoiceNumber) {
    return res.status(400).json({ success: false, message: 'Invoice number is required' });
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
  const commPercent = Number(commissionPercent) || 0;
  const commAmount = Math.round((subtotal * commPercent) / 100);
  const travel = Number(travelCharge) || 0;
  const totalAmount = subtotal + commAmount + travel;

  // Generate batch ID
  const batchId = await generateBatchId();

  // Create the purchase record
  const purchase = await Purchase.create({
    invoiceNumber: invoiceNumber.trim(),
    batchId,
    supplier: supplier._id,
    items: processedItems,
    subtotal,
    commissionPercent: commPercent,
    commissionAmount: commAmount,
    travelCharge: travel,
    totalAmount,
    paymentStatus: 'Unpaid',
    notes: notes || '',
  });

  // Create Batch records and update Product stock for each item
  for (const item of processedItems) {
    // Create batch record
    await Batch.create({
      batchId,
      product: item.product,
      purchase: purchase._id,
      supplier: supplier._id,
      purchasePrice: item.purchasePrice,
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

  // Update supplier pending credit
  await Supplier.findByIdAndUpdate(supplier._id, {
    $inc: { pendingCredit: totalAmount },
  });

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
 * @desc    Update purchase bill payment status
 * @route   PATCH /api/purchases/:id/payment
 * @access  Private/Admin
 */
const updatePurchasePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  const purchase = await Purchase.findById(req.params.id);

  if (!purchase) {
    return res.status(404).json({ success: false, message: 'Purchase not found' });
  }

  if (!['Paid', 'Unpaid'].includes(paymentStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid payment status' });
  }

  // Prevent duplicate status change
  if (purchase.paymentStatus === paymentStatus) {
    return res.status(400).json({
      success: false,
      message: `Purchase is already marked as ${paymentStatus}`,
    });
  }

  const previousStatus = purchase.paymentStatus;
  purchase.paymentStatus = paymentStatus;
  purchase.paidDate = paymentStatus === 'Paid' ? new Date() : null;
  await purchase.save();

  // Update supplier pending credit
  if (paymentStatus === 'Paid' && previousStatus === 'Unpaid') {
    await Supplier.findByIdAndUpdate(purchase.supplier, {
      $inc: { pendingCredit: -purchase.totalAmount },
    });
  } else if (paymentStatus === 'Unpaid' && previousStatus === 'Paid') {
    await Supplier.findByIdAndUpdate(purchase.supplier, {
      $inc: { pendingCredit: purchase.totalAmount },
    });
  }

  res.status(200).json({
    success: true,
    data: purchase,
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

module.exports = {
  createPurchase,
  getPurchases,
  getPurchasesBySupplier,
  getPurchaseById,
  updatePurchasePaymentStatus,
};
