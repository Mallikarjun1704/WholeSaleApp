const { asyncHandler } = require('../middleware/errorHandler');
const WholesalerSeller = require('../models/WholesalerSeller');
const WholesalerPrice = require('../models/WholesalerPrice');
const WholesalerNormalization = require('../models/WholesalerNormalization');
const { parseRawMessage } = require('../utils/priceParser');

/**
 * @desc    Create a new wholesaler seller
 * @route   POST /api/wholesaler/seller
 * @access  Private
 */
const createSeller = asyncHandler(async (req, res) => {
  const { name, phone, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Seller name is required' });
  }

  const existing = await WholesalerSeller.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Seller with this name already exists' });
  }

  const seller = await WholesalerSeller.create({
    name: name.trim(),
    phone: phone || '',
    notes: notes || '',
  });

  res.status(201).json({
    success: true,
    data: seller,
  });
});

/**
 * @desc    Get all wholesaler sellers
 * @route   GET /api/wholesaler/sellers
 * @access  Private
 */
const getSellers = asyncHandler(async (req, res) => {
  const sellers = await WholesalerSeller.find().sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: sellers,
  });
});

/**
 * @desc    Import raw WhatsApp price list for a seller
 * @route   POST /api/wholesaler/import
 * @access  Private
 */
const importPrices = asyncHandler(async (req, res) => {
  const { sellerId, importDate, rawText } = req.body;

  if (!sellerId) {
    return res.status(400).json({ success: false, message: 'Seller selection is required' });
  }

  if (!rawText || !rawText.trim()) {
    return res.status(400).json({ success: false, message: 'Raw price list text is required' });
  }

  const seller = await WholesalerSeller.findById(sellerId);
  if (!seller) {
    return res.status(404).json({ success: false, message: 'Wholesaler seller not found' });
  }

  // Parse import date (default to today at 00:00:00)
  const targetDate = importDate ? new Date(importDate) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  // Fetch normalization rules
  const normRules = await WholesalerNormalization.find();

  // Parse raw text
  const { validRecords, skippedLines } = parseRawMessage(rawText, normRules);

  // Wipe existing prices for this seller to guarantee only the latest prices exist in DB
  const deletedOld = await WholesalerPrice.deleteMany({ seller: seller._id });

  // Deduplicate parsed records: if the same product appears multiple times in the raw text,
  // keep only the last occurrence (which typically has the most accurate/latest price)
  const dedupeMap = new Map();
  for (const item of validRecords) {
    const key = `${item.phoneName.toUpperCase()}|${item.model.toUpperCase()}|${item.variant.toUpperCase()}|${(item.color || '').toUpperCase()}`;
    dedupeMap.set(key, item); // last occurrence wins
  }
  const uniqueRecords = Array.from(dedupeMap.values());

  const docsToInsert = uniqueRecords.map((item) => ({
    seller: seller._id,
    sellerName: seller.name,
    phoneName: item.phoneName.toUpperCase(),
    model: item.model.toUpperCase(),
    variant: item.variant.toUpperCase(),
    color: item.color || '',
    price: item.price,
    importDate: targetDate,
    rawText: item.rawText,
  }));

  if (docsToInsert.length > 0) {
    try {
      await WholesalerPrice.insertMany(docsToInsert, { ordered: false });
    } catch (bulkErr) {
      // If some docs failed due to duplicate key, the rest are still inserted when ordered:false
      if (bulkErr.code !== 11000 && !bulkErr.writeErrors) {
        throw bulkErr;
      }
    }
  }

  const allSkipped = [...skippedLines];

  res.status(200).json({
    success: true,
    message: `Imported ${docsToInsert.length} latest prices for ${seller.name} (wiped ${deletedOld.deletedCount} prior records)`,
    importedCount: docsToInsert.length,
    createdCount: docsToInsert.length,
    wipedCount: deletedOld.deletedCount,
    skippedCount: allSkipped.length,
    skippedLines: allSkipped,
  });
});

/**
 * @desc    Get dynamic price comparison matrix using MongoDB Aggregation
 * @route   GET /api/wholesaler/prices
 * @access  Private
 */
const getComparisonPrices = asyncHandler(async (req, res) => {
  const {
    search,
    brand,
    color,
    variant,
    importDate,
    sellerId,
    page = 1,
    limit = 50,
    sortBy = 'phoneName',
    sortOrder = 'asc',
  } = req.query;

  // Build match filters
  const matchStage = {};

  if (importDate) {
    const d = new Date(importDate);
    const startOfDay = new Date(d);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);
    matchStage.importDate = { $gte: startOfDay, $lte: endOfDay };
  }

  if (sellerId) {
    matchStage.seller = new (require('mongoose').Types.ObjectId)(sellerId);
  }

  if (brand) {
    matchStage.phoneName = { $regex: brand, $options: 'i' };
  }

  if (color) {
    matchStage.color = { $regex: color, $options: 'i' };
  }

  if (variant) {
    matchStage.variant = { $regex: variant, $options: 'i' };
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    matchStage.$or = [
      { phoneName: searchRegex },
      { model: searchRegex },
      { variant: searchRegex },
      { color: searchRegex },
      { sellerName: searchRegex },
    ];
  }

  // Get list of active sellers for dynamic table columns
  const activeSellers = await WholesalerSeller.find().sort({ name: 1 });

  // MongoDB Aggregation Pipeline:
  // 1. Match filters
  // 2. Sort by importDate DESC so newest records come first
  // 3. Group by uppercase (phoneName, variant) keeping latest price per seller
  const pipeline = [
    { $match: matchStage },
    { $sort: { importDate: -1, createdAt: -1 } },
    {
      $group: {
        _id: {
          phoneName: { $toUpper: '$phoneName' },
          variant: { $toUpper: '$variant' },
          seller: '$seller',
        },
        sellerName: { $first: '$sellerName' },
        price: { $first: '$price' },
        importDate: { $first: '$importDate' },
        model: { $first: { $toUpper: '$model' } },
        color: { $first: '$color' },
        priceId: { $first: '$_id' },
      },
    },
    // Regroup by product (phoneName + variant) collecting seller prices
    {
      $group: {
        _id: {
          phoneName: '$_id.phoneName',
          variant: '$_id.variant',
        },
        model: { $first: '$model' },
        color: { $first: '$color' },
        prices: {
          $push: {
            sellerId: '$_id.seller',
            sellerName: '$sellerName',
            price: '$price',
            importDate: '$importDate',
            priceId: '$priceId',
          },
        },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $project: {
        _id: 0,
        phoneName: '$_id.phoneName',
        variant: '$_id.variant',
        model: 1,
        color: 1,
        prices: 1,
        minPrice: 1,
        maxPrice: 1,
        priceDiff: { $subtract: ['$maxPrice', '$minPrice'] },
      },
    },
  ];

  // Sorting stage
  const sortDirection = sortOrder === 'desc' ? -1 : 1;
  const sortStage = {};
  if (['phoneName', 'model', 'variant', 'minPrice', 'priceDiff'].includes(sortBy)) {
    sortStage[sortBy] = sortDirection;
  } else {
    sortStage.phoneName = 1;
    sortStage.variant = 1;
  }
  pipeline.push({ $sort: sortStage });

  // Count total matching groups before pagination
  const totalPipeline = [...pipeline, { $count: 'total' }];
  const totalResult = await WholesalerPrice.aggregate(totalPipeline);
  const totalRecords = totalResult.length > 0 ? totalResult[0].total : 0;

  // Pagination stage
  const isShowAll = limit === 'all' || limit === '0' || parseInt(limit, 10) <= 0;
  const pageNum = isShowAll ? 1 : (parseInt(page, 10) || 1);
  const limitNum = isShowAll ? 0 : (parseInt(limit, 10) || 50);

  if (!isShowAll && limitNum > 0) {
    const skip = (pageNum - 1) * limitNum;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });
  }

  const rows = await WholesalerPrice.aggregate(pipeline);

  res.status(200).json({
    success: true,
    data: {
      sellers: activeSellers,
      rows,
      pagination: {
        total: totalRecords,
        page: pageNum,
        limit: isShowAll ? totalRecords : limitNum,
        pages: isShowAll ? 1 : Math.ceil(totalRecords / (limitNum || 1)),
      },
    },
  });
});

/**
 * @desc    Get historical price records for a specific product
 * @route   GET /api/wholesaler/history
 * @access  Private
 */
const getPriceHistory = asyncHandler(async (req, res) => {
  const { phoneName, model, variant, color, sellerId } = req.query;

  const query = {};
  if (phoneName) query.phoneName = phoneName;
  if (model) query.model = model;
  if (variant) query.variant = variant;
  if (color) query.color = color;
  if (sellerId) query.seller = sellerId;

  const history = await WholesalerPrice.find(query)
    .sort({ importDate: -1, createdAt: -1 })
    .populate('seller', 'name phone');

  res.status(200).json({
    success: true,
    data: history,
  });
});

/**
 * @desc    Delete imported price records by seller and date
 * @route   DELETE /api/wholesaler/import
 * @access  Private
 */
const deleteImportBatch = asyncHandler(async (req, res) => {
  const { sellerId, importDate } = req.query;

  if (!sellerId || !importDate) {
    return res.status(400).json({ success: false, message: 'sellerId and importDate parameters are required' });
  }

  const d = new Date(importDate);
  const startOfDay = new Date(d);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(d);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await WholesalerPrice.deleteMany({
    seller: sellerId,
    importDate: { $gte: startOfDay, $lte: endOfDay },
  });

  res.status(200).json({
    success: true,
    message: `Deleted ${result.deletedCount} price records`,
    deletedCount: result.deletedCount,
  });
});

/**
 * @desc    Get product normalization dictionary rules
 * @route   GET /api/wholesaler/normalizations
 * @access  Private
 */
const getNormalizations = asyncHandler(async (req, res) => {
  const rules = await WholesalerNormalization.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: rules,
  });
});

/**
 * @desc    Add product normalization dictionary rule
 * @route   POST /api/wholesaler/normalizations
 * @access  Private
 */
const addNormalization = asyncHandler(async (req, res) => {
  const { rawPattern, normalizedName } = req.body;

  if (!rawPattern || !normalizedName) {
    return res.status(400).json({ success: false, message: 'rawPattern and normalizedName are required' });
  }

  const rule = await WholesalerNormalization.create({
    rawPattern: rawPattern.trim().toLowerCase(),
    normalizedName: normalizedName.trim(),
  });

  res.status(201).json({
    success: true,
    data: rule,
  });
});

/**
 * @desc    Delete all price list records for a specific seller from DB
 * @route   DELETE /api/wholesaler/seller-prices/:sellerId
 * @access  Private
 */
const deleteSellerPrices = asyncHandler(async (req, res) => {
  const { sellerId } = req.params;

  if (!sellerId) {
    return res.status(400).json({ success: false, message: 'sellerId parameter is required' });
  }

  const seller = await WholesalerSeller.findById(sellerId);
  if (!seller) {
    return res.status(404).json({ success: false, message: 'Wholesaler seller not found' });
  }

  const result = await WholesalerPrice.deleteMany({ seller: sellerId });

  res.status(200).json({
    success: true,
    message: `Cleared all price list records for ${seller.name} (${result.deletedCount} records deleted from database)`,
    deletedCount: result.deletedCount,
  });
});

module.exports = {
  createSeller,
  getSellers,
  importPrices,
  getComparisonPrices,
  getPriceHistory,
  deleteImportBatch,
  deleteSellerPrices,
  getNormalizations,
  addNormalization,
};
