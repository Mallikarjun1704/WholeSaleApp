const Customer = require('../models/Customer');
const Bill = require('../models/Bill');
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

  // Attach bill count for each customer
  const customersWithStats = await Promise.all(
    customers.map(async (customer) => {
      const billCount = await Bill.countDocuments({ customer: customer._id, status: { $ne: 'Cancelled' } });
      return {
        ...customer.toObject(),
        billCount,
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

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
