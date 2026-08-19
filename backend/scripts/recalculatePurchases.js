const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Purchase = require('../models/Purchase');
const Batch = require('../models/Batch');

async function recalculatePurchases() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techmart';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const purchases = await Purchase.find({});
  console.log(`Found ${purchases.length} purchase record(s) to inspect.\n`);

  let updatedCount = 0;

  for (const purchase of purchases) {
    let subtotal = 0;
    const updatedItems = (purchase.items || []).map((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.purchasePrice) || 0;
      const itemTotal = qty * price;
      subtotal += itemTotal;
      return {
        ...item.toObject ? item.toObject() : item,
        total: itemTotal,
      };
    });

    const commPercent = Number(purchase.commissionPercent) || 0;
    const travel = Number(purchase.travelCharge) || 0;
    const correctCommAmount = Math.round((subtotal * commPercent) / 100);
    const correctTotalAmount = subtotal + correctCommAmount + travel;
    const paidAmount = Number(purchase.paidAmount) || 0;

    let correctStatus = 'Unpaid';
    if (paidAmount >= correctTotalAmount && correctTotalAmount > 0) {
      correctStatus = 'Paid';
    } else if (paidAmount > 0) {
      correctStatus = 'Partially Paid';
    }

    const changed =
      purchase.subtotal !== subtotal ||
      purchase.commissionAmount !== correctCommAmount ||
      purchase.totalAmount !== correctTotalAmount ||
      purchase.paymentStatus !== correctStatus;

    if (changed) {
      console.log(`Updating Invoice #${purchase.invoiceNumber} (${purchase.batchId}):`);
      console.log(`  Subtotal: ${purchase.subtotal} -> ${subtotal}`);
      console.log(`  Commission: ${purchase.commissionAmount} -> ${correctCommAmount} (${commPercent}%)`);
      console.log(`  Travel: ${purchase.travelCharge} -> ${travel}`);
      console.log(`  Total: ${purchase.totalAmount} -> ${correctTotalAmount}`);
      console.log(`  Status: ${purchase.paymentStatus} -> ${correctStatus} (Paid: ${paidAmount})`);

      purchase.subtotal = subtotal;
      purchase.commissionAmount = correctCommAmount;
      purchase.totalAmount = correctTotalAmount;
      purchase.paymentStatus = correctStatus;
      purchase.items = updatedItems;
      await purchase.save();

      // Recalculate Batches effective prices
      const overheadRatio = subtotal > 0 ? (correctCommAmount + travel) / subtotal : 0;
      for (const item of updatedItems) {
        const effectivePrice = Math.round(item.purchasePrice * (1 + overheadRatio));
        await Batch.updateMany(
          { purchase: purchase._id, product: item.product },
          { $set: { purchasePrice: effectivePrice } }
        );
      }

      updatedCount++;
    } else {
      console.log(`Invoice #${purchase.invoiceNumber} is already up to date.`);
    }
  }

  console.log(`\nRecalculation complete. Updated ${updatedCount} / ${purchases.length} purchases.`);
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

recalculatePurchases().catch((err) => {
  console.error('Error running recalculation:', err);
  process.exit(1);
});
