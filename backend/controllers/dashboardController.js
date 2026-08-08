const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Bill = require('../models/Bill');
const Purchase = require('../models/Purchase');
const Batch = require('../models/Batch');
const Investment = require('../models/Investment');
const Expense = require('../models/Expense');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // 1. Total Products (Active)
  const totalProducts = await Product.countDocuments({ isActive: true });

  // 2. Total Quantity (Sum of stock)
  const quantityAgg = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, totalQty: { $sum: '$stock' } } },
  ]);
  const totalQuantity = quantityAgg[0]?.totalQty || 0;

  // 3. Today's Sales (Non-cancelled bills created today)
  const todayBills = await Bill.find({
    createdAt: { $gte: startOfToday },
    status: { $ne: 'Cancelled' },
  });
  const todaySales = todayBills.reduce((sum, bill) => sum + bill.finalAmount, 0);

  // 4. Today's Purchase (All purchase bills created today)
  const todayPurchases = await Purchase.find({
    createdAt: { $gte: startOfToday },
  });
  const todayPurchase = todayPurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);

  // 5. Today's Profit & Loss
  let todayProfit = 0;
  let todayLoss = 0;
  for (const bill of todayBills) {
    let billProfit = 0;
    for (const item of bill.items) {
      const costOfGoods = item.purchasePrice * item.quantity;
      const itemProfit = item.taxableAmount - costOfGoods;
      billProfit += itemProfit;
    }
    billProfit += (bill.discount || 0);

    if (billProfit > 0) {
      todayProfit += billProfit;
    } else if (billProfit < 0) {
      todayLoss += Math.abs(billProfit);
    }
  }

  // 6. Pending Credit & Pending Customers
  const customerCreditAgg = await Customer.aggregate([
    { $match: { pendingCredit: { $gt: 0 }, isActive: true } },
    { $group: { _id: null, totalCredit: { $sum: '$pendingCredit' }, count: { $sum: 1 } } },
  ]);
  const pendingCredit = customerCreditAgg[0]?.totalCredit || 0;
  const pendingCustomers = customerCreditAgg[0]?.count || 0;

  // 7. Stock Value (Sum of remainingQty * purchasePrice from Batch collection)
  const stockValueAgg = await Batch.aggregate([
    { $match: { remainingQty: { $gt: 0 } } },
    { $group: { _id: null, value: { $sum: { $multiply: ['$purchasePrice', '$remainingQty'] } } } },
  ]);
  const stockValue = stockValueAgg[0]?.value || 0;

  // 8. Low Stock & Out of Stock Items
  const lowStockItems = await Product.countDocuments({
    isActive: true,
    $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] },
  });
  const outOfStock = await Product.countDocuments({ isActive: true, stock: 0 });

  // 9. Today's Bills Count
  const todayBillsCount = todayBills.length;

  // 10. Monthly Sales & Profit & Purchase
  const monthlyBills = await Bill.find({
    createdAt: { $gte: startOfMonth },
    status: { $ne: 'Cancelled' },
  });
  const monthlySales = monthlyBills.reduce((sum, bill) => sum + bill.finalAmount, 0);

  let monthlyProfit = 0;
  for (const bill of monthlyBills) {
    let billProfit = 0;
    for (const item of bill.items) {
      const costOfGoods = item.purchasePrice * item.quantity;
      const itemProfit = item.taxableAmount - costOfGoods;
      billProfit += itemProfit;
    }
    billProfit += (bill.discount || 0);
    if (billProfit > 0) {
      monthlyProfit += billProfit;
    }
  }

  const monthlyPurchasesList = await Purchase.find({
    createdAt: { $gte: startOfMonth },
  });
  const monthlyPurchase = monthlyPurchasesList.reduce((sum, p) => sum + p.totalAmount, 0);

  // All-time Totals (Sales, Purchase, Profit, Loss)
  const totalSalesAgg = await Bill.aggregate([
    { $match: { status: { $ne: 'Cancelled' } } },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } },
  ]);
  const totalSales = totalSalesAgg[0]?.total || 0;

  const totalPurchaseAgg = await Purchase.aggregate([
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const totalPurchase = totalPurchaseAgg[0]?.total || 0;

  const allBills = await Bill.find({ status: { $ne: 'Cancelled' } });
  let totalProfit = 0;
  let totalLoss = 0;
  for (const bill of allBills) {
    let billProfit = 0;
    for (const item of bill.items) {
      const costOfGoods = (item.purchasePrice || 0) * item.quantity;
      const itemProfit = (item.taxableAmount || 0) - costOfGoods;
      billProfit += itemProfit;
    }
    billProfit += (bill.discount || 0);
    if (billProfit > 0) {
      totalProfit += billProfit;
    } else if (billProfit < 0) {
      totalLoss += Math.abs(billProfit);
    }
  }

  // 11. Total Partner Investments (Investments - Withdrawals)
  const investmentsAgg = await Investment.aggregate([
    {
      $group: {
        _id: null,
        netCapital: {
          $sum: { $cond: [{ $eq: ['$type', 'Investment'] }, '$amount', { $multiply: ['$amount', -1] }] },
        },
      },
    },
  ]);
  const totalInvestments = investmentsAgg[0]?.netCapital || 0;

  // 12. Total Paid Sales (Money received from retail shops)
  const paidBillsAgg = await Bill.aggregate([
    { $match: { status: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } },
  ]);
  const totalPaidSales = paidBillsAgg[0]?.total || 0;

  // 13. Total Paid Purchases (Money paid to suppliers)
  const paidPurchasesAgg = await Purchase.aggregate([
    { $match: { paymentStatus: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const totalPaidPurchases = paidPurchasesAgg[0]?.total || 0;

  // 14. Total Store Expenses
  const expensesAgg = await Expense.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalExpenses = expensesAgg[0]?.total || 0;

  // Amount in Hand = Initial Capital + Paid Sales - Paid Purchases - Expenses
  const cashInHand = totalInvestments + totalPaidSales - totalPaidPurchases - totalExpenses;

  // 15. Pending Collection: Total unpaid bill amounts from retail stores
  const pendingCollectionAgg = await Bill.aggregate([
    { $match: { status: { $in: ['Pending', 'Partially Paid'] } } },
    { $group: { _id: null, total: { $sum: { $subtract: ['$finalAmount', { $ifNull: ['$paidAmount', 0] }] } } } },
  ]);
  const pendingCollection = pendingCollectionAgg[0]?.total || 0;

  // 16. Total Quantity Sold (Sum of items quantity across all non-cancelled bills)
  const totalQuantitySoldAgg = await Bill.aggregate([
    { $match: { status: { $ne: 'Cancelled' } } },
    { $unwind: '$items' },
    { $group: { _id: null, totalQtySold: { $sum: '$items.quantity' } } },
  ]);
  const totalQuantitySold = totalQuantitySoldAgg[0]?.totalQtySold || 0;

  res.status(200).json({
    success: true,
    data: {
      totalProducts,
      totalQuantity,
      totalQuantitySold,
      totalSales: Math.round(totalSales),
      totalPurchase: Math.round(totalPurchase),
      totalProfit: Math.round(totalProfit),
      totalLoss: Math.round(totalLoss),
      todaySales: Math.round(todaySales),
      todayPurchase: Math.round(todayPurchase),
      todayProfit: Math.round(todayProfit),
      todayLoss: Math.round(todayLoss),
      pendingCredit: Math.round(pendingCredit),
      pendingCustomers,
      stockValue: Math.round(stockValue),
      lowStockItems,
      outOfStock,
      todayBills: todayBillsCount,
      monthlySales: Math.round(monthlySales),
      monthlyProfit: Math.round(monthlyProfit),
      monthlyPurchase: Math.round(monthlyPurchase),
      cashInHand: Math.round(cashInHand),
      pendingCollection: Math.round(pendingCollection),
      totalInvestments: Math.round(totalInvestments),
      totalExpenses: Math.round(totalExpenses),
    },
  });
});

/**
 * @desc    Get dashboard charts (30 days of Sales vs Purchase vs Profit)
 * @route   GET /api/dashboard/charts
 * @access  Private
 */
const getDashboardChartData = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const bills = await Bill.find({
    createdAt: { $gte: thirtyDaysAgo },
    status: { $ne: 'Cancelled' },
  }).sort({ createdAt: 1 });

  const purchases = await Purchase.find({
    createdAt: { $gte: thirtyDaysAgo },
  }).sort({ createdAt: 1 });

  // Pre-populate last 30 days
  const dailyData = {};
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    // e.g. "16 Jul" or "05 Jun"
    const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    dailyData[dateStr] = { date: dateStr, sales: 0, purchase: 0, profit: 0 };
  }

  // Populate Sales and Profit
  for (const bill of bills) {
    const dateStr = new Date(bill.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });

    let billProfit = 0;
    for (const item of bill.items) {
      const costOfGoods = item.purchasePrice * item.quantity;
      billProfit += item.taxableAmount - costOfGoods;
    }
    billProfit += (bill.discount || 0);

    if (dailyData[dateStr]) {
      dailyData[dateStr].sales += bill.finalAmount;
      dailyData[dateStr].profit += billProfit;
    }
  }

  // Populate Purchase Data
  for (const purchase of purchases) {
    const dateStr = new Date(purchase.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });

    if (dailyData[dateStr]) {
      dailyData[dateStr].purchase += purchase.totalAmount;
    }
  }

  // Convert to array and round values
  const chartData = Object.values(dailyData).map((day) => ({
    ...day,
    sales: Math.round(day.sales),
    purchase: Math.round(day.purchase),
    profit: Math.round(day.profit),
  }));

  res.status(200).json({
    success: true,
    data: chartData,
  });
});

/**
 * @desc    Get recent system activities
 * @route   GET /api/dashboard/activities
 * @access  Private
 */
const getRecentActivities = asyncHandler(async (req, res) => {
  const activities = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('userId', 'fullName role');

  res.status(200).json({
    success: true,
    data: activities,
  });
});

/**
 * @desc    Get dashboard card detail items for popups
 * @route   GET /api/dashboard/details/:type
 * @access  Private
 */
const getDashboardDetails = asyncHandler(async (req, res) => {
  const { type } = req.params;
  let details = [];

  switch (type) {
    case 'pendingCollections':
      details = await Bill.find({ status: { $ne: 'Cancelled' } })
        .populate('customer', 'shopName name phone')
        .sort({ createdAt: -1 });
      // Filter bills that have unpaid/pending balance
      details = details
        .map((bill) => {
          const paid = bill.paidAmount || 0;
          const pending = bill.finalAmount - paid;
          return {
            id: bill._id,
            invoiceNumber: bill.billNumber || bill.invoiceNumber || '-',
            storeName: bill.customer?.shopName || bill.customer?.name || 'Retail Store',
            phoneNumber: bill.customer?.phone || '-',
            date: bill.createdAt,
            totalAmount: bill.finalAmount,
            paidAmount: paid,
            pendingAmount: pending,
            status: bill.status,
          };
        })
        .filter((b) => b.pendingAmount > 0);
      break;

    case 'totalProducts':
      details = await Product.find({ isActive: true }).sort({ name: 1 });
      break;

    case 'totalQuantity':
      const qtyBills = await Bill.find({ status: { $ne: 'Cancelled' } })
        .populate('customer', 'shopName name phone')
        .sort({ createdAt: -1 });
      details = qtyBills.map((bill) => {
        const billQty = (bill.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
        return {
          id: bill._id,
          invoiceNumber: bill.billNumber || bill.invoiceNumber || '-',
          storeName: bill.customer?.shopName || bill.customer?.name || 'Retail Store',
          totalQuantity: billQty,
        };
      });
      break;

    case 'totalQuantitySold':
      const soldAgg = await Bill.aggregate([
        { $match: { status: { $ne: 'Cancelled' } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo',
          },
        },
        {
          $group: {
            _id: '$items.product',
            name: {
              $first: {
                $ifNull: ['$items.name', { $arrayElemAt: ['$productInfo.name', 0] }],
              },
            },
            stock: { $sum: '$items.quantity' },
          },
        },
        { $sort: { stock: -1 } },
      ]);
      details = soldAgg;
      break;

    case 'pendingCredit':
    case 'pendingCustomers':
      details = await Customer.find({ pendingCredit: { $gt: 0 }, isActive: true }).sort({ pendingCredit: -1 });
      break;

    case 'lowStockItems':
      details = await Product.find({
        isActive: true,
        $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] },
      }).sort({ stock: 1 });
      break;

    default:
      return res.status(400).json({ success: false, message: 'Invalid detail type requested' });
  }

  res.status(200).json({
    success: true,
    data: details,
  });
});

module.exports = {
  getDashboardStats,
  getDashboardChartData,
  getRecentActivities,
  getDashboardDetails,
};
