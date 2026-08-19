const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Purchase = require('../models/Purchase');

async function testFix() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techmart');
  const purchases = await Purchase.find({ travelCharge: { $gt: 0 } }).lean();

  for (const p of purchases) {
    const oldItemSum = p.items.reduce((s, i) => s + (i.quantity * i.purchasePrice), 0);
    const targetSubtotal = oldItemSum + p.travelCharge;
    const commAmt = Math.round((targetSubtotal * p.commissionPercent) / 100);
    const totalAmt = targetSubtotal + commAmt + p.travelCharge;

    console.log(`\n${p.invoiceNumber}:`);
    console.log(`  Subtotal: ${oldItemSum} -> ${targetSubtotal}`);
    console.log(`  Commission (${p.commissionPercent}%): ${commAmt}`);
    console.log(`  Travel Charge: ${p.travelCharge}`);
    console.log(`  Total: ${totalAmt}`);

    // Check which item has qty = 1 to absorb travel charge cleanly
    const singleQtyItem = p.items.find((i) => i.quantity === 1);
    if (singleQtyItem) {
      console.log(`  Can adjust item "${singleQtyItem.name}": ${singleQtyItem.purchasePrice} -> ${singleQtyItem.purchasePrice + p.travelCharge}`);
    } else {
      console.log(`  No qty=1 item. Items: ${p.items.map(i => `${i.name} (qty ${i.quantity})`).join(', ')}`);
    }
  }
  await mongoose.disconnect();
}
testFix();
