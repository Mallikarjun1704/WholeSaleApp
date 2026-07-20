const Product = require('../models/Product');
const Batch = require('../models/Batch');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get inventory (read-only view of all products with batch details)
 * @route   GET /api/inventory
 * @access  Private
 */
const getInventory = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword ? req.query.keyword.trim() : '';
  const categoryId = req.query.category || '';
  const brandId = req.query.brand || '';

  const query = { isActive: true };

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { sku: { $regex: keyword, $options: 'i' } },
      { modelNumber: { $regex: keyword, $options: 'i' } },
    ];
  }

  if (categoryId) {
    query.category = categoryId;
  }

  if (brandId) {
    query.brand = brandId;
  }

  const products = await Product.find(query)
    .populate('brand', 'name')
    .populate('category', 'name')
    .sort({ name: 1 });

  // Fetch batch details for each product
  const inventoryData = await Promise.all(
    products.map(async (product) => {
      const batches = await Batch.find({
        product: product._id,
        remainingQty: { $gt: 0 },
      })
        .populate('supplier', 'name')
        .sort({ createdAt: 1 });

      return {
        ...product.toObject(),
        batches: batches.map((batch) => ({
          _id: batch._id,
          batchId: batch.batchId,
          purchasePrice: batch.purchasePrice,
          quantity: batch.quantity,
          remainingQty: batch.remainingQty,
          supplier: batch.supplier?.name || 'Unknown',
          date: batch.createdAt,
        })),
      };
    })
  );

  res.status(200).json({
    success: true,
    data: inventoryData,
  });
});

module.exports = {
  getInventory,
};
