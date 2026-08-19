const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Purchase = require('../models/Purchase');

async function checkAll() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techmart');
  const purchases = await Purchase.find({}).lean();
  for (const p of purchases) {
    const itemSum = (p.items || []).reduce((s, i) => s + (i.quantity * i.purchasePrice), 0);
    console.log(`${p.invoiceNumber}: itemsSum=${itemSum}, subtotal=${p.subtotal}, comm%=${p.commissionPercent}, commAmt=${p.commissionAmount}, travel=${p.travelCharge}, total=${p.totalAmount}, paid=${p.paidAmount}`);
  }
  await mongoose.disconnect();
}
checkAll();
