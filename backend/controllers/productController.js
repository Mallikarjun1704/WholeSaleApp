const Product = require('../models/Product');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get all products (paginated, with search and filters)
 * @route   GET /api/products
 * @access  Private
 */
const getProducts = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1;
  const limit = Number(req.query.pageSize) || 12;
  const keyword = req.query.keyword ? req.query.keyword.trim() : '';
  const categoryId = req.query.category || '';
  const brandId = req.query.brand || '';
  const lowStock = req.query.lowStock === 'true';

  const query = { isActive: true };

  // Search keyword (matches SKU, name, barcode, or modelNumber)
  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { sku: { $regex: keyword, $options: 'i' } },
      { modelNumber: { $regex: keyword, $options: 'i' } },
      { barcode: { $regex: keyword, $options: 'i' } },
    ];
  }

  // Category filter
  if (categoryId) {
    query.category = categoryId;
  }

  // Brand filter
  if (brandId) {
    query.brand = brandId;
  }

  // Low stock warning filter
  if (lowStock) {
    query.$expr = {
      $and: [
        { $gt: ['$stock', 0] },
        { $lte: ['$stock', '$lowStockThreshold'] }
      ]
    };
  }

  const count = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('brand', 'name description')
    .populate('category', 'name description')
    .sort({ name: 1 })
    .skip(limit * (page - 1))
    .limit(limit);

  res.status(200).json({
    success: true,
    data: {
      products,
      page,
      pages: Math.ceil(count / limit),
      total: count,
    },
  });
});

/**
 * @desc    Get product by ID
 * @route   GET /api/products/:id
 * @access  Private
 */
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('brand', 'name')
    .populate('category', 'name');

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

/**
 * @desc    Create a product
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    modelNumber,
    sku,
    barcode,
    category,
    brand,
    purchasePrice,
    sellingPrice,
    gstRate,
    stock,
    lowStockThreshold,
    imeiTracking,
    imeiList,
    warrantyMonths,
  } = req.body;

  // Validate required
  if (!name || !sku || !category || !brand) {
    return res.status(400).json({
      success: false,
      message: 'Name, SKU, Category, and Brand are required fields',
    });
  }

  // Check duplicate SKU
  const skuExists = await Product.findOne({ sku: sku.trim() });
  if (skuExists) {
    return res.status(400).json({ success: false, message: 'SKU code already exists' });
  }

  // Check duplicate Barcode if provided
  if (barcode) {
    const barcodeExists = await Product.findOne({ barcode: barcode.trim() });
    if (barcodeExists) {
      return res.status(400).json({ success: false, message: 'Barcode already exists' });
    }
  }

  // Calculate final stock if tracking IMEIs
  let finalStock = Number(stock) || 0;
  let parsedImeis = [];
  if (imeiTracking && Array.isArray(imeiList)) {
    parsedImeis = imeiList.map((i) => i.trim()).filter((i) => i.length > 0);
    finalStock = parsedImeis.length;
  }

  const product = await Product.create({
    name: name.trim(),
    modelNumber: modelNumber ? modelNumber.trim() : '',
    sku: sku.trim(),
    barcode: barcode ? barcode.trim() : undefined,
    category,
    brand,
    purchasePrice: Number(purchasePrice) || 0,
    sellingPrice: Number(sellingPrice) || 0,
    gstRate: Number(gstRate) || 18,
    stock: finalStock,
    lowStockThreshold: Number(lowStockThreshold) || 5,
    imeiTracking: !!imeiTracking,
    imeiList: parsedImeis,
    warrantyMonths: Number(warrantyMonths) || 12,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    data: product,
  });
});

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const {
    name,
    modelNumber,
    sku,
    barcode,
    category,
    brand,
    purchasePrice,
    sellingPrice,
    gstRate,
    stock,
    lowStockThreshold,
    imeiTracking,
    imeiList,
    warrantyMonths,
    isActive,
  } = req.body;

  // Validate SKU duplicates if changing
  if (sku && sku.trim() !== product.sku) {
    const skuExists = await Product.findOne({ sku: sku.trim() });
    if (skuExists) {
      return res.status(400).json({ success: false, message: 'SKU code already exists' });
    }
    product.sku = sku.trim();
  }

  // Validate barcode duplicates if changing
  if (barcode && barcode.trim() !== product.barcode) {
    const barcodeExists = await Product.findOne({ barcode: barcode.trim() });
    if (barcodeExists) {
      return res.status(400).json({ success: false, message: 'Barcode already exists' });
    }
    product.barcode = barcode.trim();
  } else if (barcode === '') {
    product.barcode = undefined;
  }

  if (name) product.name = name.trim();
  if (modelNumber !== undefined) product.modelNumber = modelNumber.trim();
  if (category) product.category = category;
  if (brand) product.brand = brand;
  if (purchasePrice !== undefined) product.purchasePrice = Number(purchasePrice) || 0;
  if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice) || 0;
  if (gstRate !== undefined) product.gstRate = Number(gstRate) || 18;
  if (lowStockThreshold !== undefined) product.lowStockThreshold = Number(lowStockThreshold) || 5;
  if (warrantyMonths !== undefined) product.warrantyMonths = Number(warrantyMonths) || 12;
  if (isActive !== undefined) product.isActive = !!isActive;

  // Update IMEI details
  if (imeiTracking !== undefined) product.imeiTracking = !!imeiTracking;

  if (product.imeiTracking && Array.isArray(imeiList)) {
    product.imeiList = imeiList.map((i) => i.trim()).filter((i) => i.length > 0);
    product.stock = product.imeiList.length;
  } else if (stock !== undefined) {
    product.stock = Number(stock) || 0;
  }

  await product.save();

  const updatedProduct = await Product.findById(product._id)
    .populate('brand', 'name')
    .populate('category', 'name');

  res.status(200).json({
    success: true,
    data: updatedProduct,
  });
});

/**
 * @desc    Delete a product (Soft delete by setting isActive to false)
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // To preserve transaction logs, we will do a soft-delete by toggling isActive: false
  product.isActive = false;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
