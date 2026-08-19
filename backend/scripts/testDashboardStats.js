const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Bill = require('../models/Bill');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Investment = require('../models/Investment');

async function testDashboard() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techmart');

  const investments = await Investment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
  const totalInvestments = investments[0]?.total || 0;

  const paidSales = await Bill.aggregate([
    { $match: { status: { $ne: 'Cancelled' } } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$paidAmount', 0] } } } },
  ]);
  const totalPaidSales = paidSales[0]?.total || 0;

  const paidPurchases = await Purchase.aggregate([
    { $group: { _id: null, total: { $sum: { $ifNull: ['$paidAmount', 0] } } } },
  ]);
  const totalPaidPurchases = paidPurchases[0]?.total || 0;

  const expenses = await Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
  const totalExpenses = expenses[0]?.total || 0;

  const cashInHand = totalInvestments + totalPaidSales - totalPaidPurchases - totalExpenses;

  const supplierAgg = await Purchase.aggregate([
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: '$totalAmount' },
        totalComm: { $sum: '$commissionAmount' },
        totalTravel: { $sum: '$travelCharge' },
      },
    },
  ]);

  console.log('=== DASHBOARD RECALCULATED STATS ===');
  console.log(`Total Investments: Rs. ${totalInvestments.toLocaleString('en-IN')}`);
  console.log(`Total Paid Sales: Rs. ${totalPaidSales.toLocaleString('en-IN')}`);
  console.log(`Total Paid Purchases: Rs. ${totalPaidPurchases.toLocaleString('en-IN')}`);
  console.log(`Total Expenses: Rs. ${totalExpenses.toLocaleString('en-IN')}`);
  console.log(`Cash / Amount in Hand: Rs. ${cashInHand.toLocaleString('en-IN')}`);
  console.log(`Total Supplier Purchases: Rs. ${(supplierAgg[0]?.totalPurchases || 0).toLocaleString('en-IN')}`);
  console.log(`Total Commission: Rs. ${(supplierAgg[0]?.totalComm || 0).toLocaleString('en-IN')}`);
  console.log(`Total Travel Charge: Rs. ${(supplierAgg[0]?.totalTravel || 0).toLocaleString('en-IN')}`);

  await mongoose.disconnect();
}
testDashboard();
