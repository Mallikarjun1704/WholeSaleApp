const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Purchase = require('../models/Purchase');

async function inspectAllWithTravel() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techmart');
  const purchases = await Purchase.find({ travelCharge: { $gt: 0 } }).lean();
  for (const p of purchases) {
    console.log(`\n=== ${p.invoiceNumber} (travel=${p.travelCharge}, comm%=${p.commissionPercent}) ===`);
    let sum = 0;
    for (const item of p.items) {
      console.log(`  ${item.name}: ${item.quantity} x ${item.purchasePrice} = ${item.quantity * item.purchasePrice}`);
      sum += item.quantity * item.purchasePrice;
    }
    console.log(`  Sum of items: ${sum}`);
    console.log(`  Sum + travel: ${sum + p.travelCharge}`);
  }
  await mongoose.disconnect();
}
inspectAllWithTravel();
