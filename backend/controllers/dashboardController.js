const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Bill = require('../models/Bill');
const Purchase = require('../models/Purchase');
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

  // 4. Today's Purchase (Received purchases created today)
  const todayPurchases = await Purchase.find({
    createdAt: { $gte: startOfToday },
    status: 'Received',
  });
  const todayPurchase = todayPurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);

  // 5. Today's Profit & Loss
  let todayProfit = 0;
  let todayLoss = 0;
  for (const bill of todayBills) {
    let billProfit = 0;
    for (const item of bill.items) {
      const costOfGoods = item.purchasePrice * item.quantity;
      // Taxable amount represents revenue before taxes
      const itemProfit = item.taxableAmount - costOfGoods;
      billProfit += itemProfit;
    }
    // Deduct discount from profit
    billProfit -= (bill.discount || 0);

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

  // 7. Stock Value (Sum of purchasePrice * stock)
  const stockValueAgg = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, value: { $sum: { $multiply: ['$purchasePrice', '$stock'] } } } },
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

  // 10. Monthly Sales & Profit
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
    billProfit -= (bill.discount || 0);
    if (billProfit > 0) {
      monthlyProfit += billProfit;
    }
  }

  // 11. Cash in Hand: Total received from paid bills minus total paid to suppliers
  const paidBillsAgg = await Bill.aggregate([
    { $match: { status: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } },
  ]);
  const totalPaidSales = paidBillsAgg[0]?.total || 0;

  const paidPurchasesAgg = await Purchase.aggregate([
    { $match: { paymentStatus: 'Paid' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const totalPaidPurchases = paidPurchasesAgg[0]?.total || 0;

  const cashInHand = totalPaidSales - totalPaidPurchases;

  // 12. Pending Collection: Total unpaid bill amounts from retail stores
  const pendingCollectionAgg = await Bill.aggregate([
    { $match: { status: 'Pending' } },
    { $group: { _id: null, total: { $sum: '$finalAmount' } } },
  ]);
  const pendingCollection = pendingCollectionAgg[0]?.total || 0;

  res.status(200).json({
    success: true,
    data: {
      totalProducts,
      totalQuantity,
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
      cashInHand: Math.round(cashInHand),
      pendingCollection: Math.round(pendingCollection),
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
    status: 'Received',
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
    billProfit -= (bill.discount || 0);

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

module.exports = {
  getDashboardStats,
  getDashboardChartData,
  getRecentActivities,
};
