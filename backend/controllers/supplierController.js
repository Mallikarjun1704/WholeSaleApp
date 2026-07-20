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

  // Attach purchase count and total owed for each supplier
  const suppliersWithStats = await Promise.all(
    suppliers.map(async (supplier) => {
      const purchaseCount = await Purchase.countDocuments({ supplier: supplier._id });
      const unpaidPurchases = await Purchase.aggregate([
        { $match: { supplier: supplier._id, paymentStatus: 'Unpaid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]);
      return {
        ...supplier.toObject(),
        purchaseCount,
        unpaidAmount: unpaidPurchases[0]?.total || 0,
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

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
