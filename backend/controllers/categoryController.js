const Category = require('../models/Category');
const Product = require('../models/Product');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Private
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.status(200).json({
    success: true,
    data: categories,
  });
});

/**
 * @desc    Create a category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  // Check duplicate
  const exists = await Category.findOne({ name: name.trim() });
  if (exists) {
    return res.status(400).json({ success: false, message: 'Category already exists' });
  }

  const category = await Category.create({
    name: name.trim(),
    description: description || '',
  });

  res.status(201).json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  if (name) {
    // Check duplicate
    const exists = await Category.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }
    category.name = name.trim();
  }

  if (description !== undefined) {
    category.description = description;
  }

  await category.save();

  res.status(200).json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  // Check if referenced by any products
  const productCount = await Product.countDocuments({ category: req.params.id });
  if (productCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category. It is currently linked to ${productCount} product(s).`,
    });
  }

  await category.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
  });
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
