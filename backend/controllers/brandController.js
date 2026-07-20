const Brand = require('../models/Brand');
const Product = require('../models/Product');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get all brands
 * @route   GET /api/brands
 * @access  Private
 */
const getBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find().sort({ name: 1 });
  res.status(200).json({
    success: true,
    data: brands,
  });
});

/**
 * @desc    Create a brand
 * @route   POST /api/brands
 * @access  Private/Admin
 */
const createBrand = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Brand name is required' });
  }

  // Check duplicate
  const exists = await Brand.findOne({ name: name.trim() });
  if (exists) {
    return res.status(400).json({ success: false, message: 'Brand name already exists' });
  }

  const brand = await Brand.create({
    name: name.trim(),
    description: description || '',
  });

  res.status(201).json({
    success: true,
    data: brand,
  });
});

/**
 * @desc    Update a brand
 * @route   PUT /api/brands/:id
 * @access  Private/Admin
 */
const updateBrand = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const brand = await Brand.findById(req.params.id);

  if (!brand) {
    return res.status(404).json({ success: false, message: 'Brand not found' });
  }

  if (name) {
    // Check duplicate
    const exists = await Brand.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Brand name already exists' });
    }
    brand.name = name.trim();
  }

  if (description !== undefined) {
    brand.description = description;
  }

  await brand.save();

  res.status(200).json({
    success: true,
    data: brand,
  });
});

/**
 * @desc    Delete a brand
 * @route   DELETE /api/brands/:id
 * @access  Private/Admin
 */
const deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);

  if (!brand) {
    return res.status(404).json({ success: false, message: 'Brand not found' });
  }

  // Check if brand is referenced by any products
  const productCount = await Product.countDocuments({ brand: req.params.id });
  if (productCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete brand. It is currently linked to ${productCount} product(s).`,
    });
  }

  await brand.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Brand deleted successfully',
  });
});

module.exports = {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
};
