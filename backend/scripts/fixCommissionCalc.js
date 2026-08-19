const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Purchase = require('../models/Purchase');
const Batch = require('../models/Batch');

async function fixCommissionCalc() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techmart';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('Connected.\n');

  const purchases = await Purchase.find({}).sort({ invoiceNumber: 1 });
  let updatedCount = 0;

  for (const purchase of purchases) {
    const subtotal = purchase.subtotal;
    const travel = Number(purchase.travelCharge) || 0;
    const commPercent = Number(purchase.commissionPercent) || 0;

    // Correct formula: commission = (subtotal + travel) * commPercent / 100
    const correctCommAmount = Math.round(((subtotal + travel) * commPercent) / 100);
    const correctTotal = subtotal + correctCommAmount + travel;

    const changed =
      purchase.commissionAmount !== correctCommAmount ||
      purchase.totalAmount !== correctTotal;

    if (changed) {
      const oldComm = purchase.commissionAmount;
      const oldTotal = purchase.totalAmount;

      purchase.commissionAmount = correctCommAmount;
      purchase.totalAmount = correctTotal;

      // If bill was Paid, sync paidAmount to new total
      if (purchase.paymentStatus === 'Paid') {
        purchase.paidAmount = correctTotal;
      }

      await purchase.save();

      // Update batch effective prices
      const overheadRatio = subtotal > 0 ? (correctCommAmount + travel) / subtotal : 0;
      for (const item of purchase.items) {
        const effectivePrice = Math.round(item.purchasePrice * (1 + overheadRatio));
        await Batch.updateMany(
          { purchase: purchase._id, product: item.product },
          { $set: { purchasePrice: effectivePrice } }
        );
      }

      updatedCount++;
      console.log(`Updated ${purchase.invoiceNumber}:`);
      console.log(`  Commission: ${oldComm} -> ${correctCommAmount} (${commPercent}% of ${subtotal + travel})`);
      console.log(`  Total: ${oldTotal} -> ${correctTotal}`);
      console.log(`  Paid: ${purchase.paidAmount} (${purchase.paymentStatus})`);
    } else {
      console.log(`${purchase.invoiceNumber}: already correct.`);
    }
  }

  console.log(`\nDone. Updated ${updatedCount} / ${purchases.length} purchases.`);
  await mongoose.disconnect();
}

fixCommissionCalc().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
