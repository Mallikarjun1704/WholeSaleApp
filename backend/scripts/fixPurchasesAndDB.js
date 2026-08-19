const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Purchase = require('../models/Purchase');
const Batch = require('../models/Batch');

async function fixPurchasesAndDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techmart';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('Connected.\n');

  const purchases = await Purchase.find({}).sort({ invoiceNumber: 1 });

  for (const purchase of purchases) {
    const travel = Number(purchase.travelCharge) || 0;
    const commPercent = Number(purchase.commissionPercent) || 0;

    // Check if this purchase had travel charge that was previously subtracted from items
    if (travel > 0) {
      // Find the best item to restore the travel charge to
      let adjusted = false;
      // 1. Try single qty item first
      for (let i = 0; i < purchase.items.length; i++) {
        if (purchase.items[i].quantity === 1) {
          purchase.items[i].purchasePrice += travel;
          purchase.items[i].total = purchase.items[i].quantity * purchase.items[i].purchasePrice;
          adjusted = true;
          break;
        }
      }
      // 2. If no qty=1, check items divisible by quantity
      if (!adjusted) {
        for (let i = 0; i < purchase.items.length; i++) {
          if (travel % purchase.items[i].quantity === 0) {
            const addPerUnit = travel / purchase.items[i].quantity;
            purchase.items[i].purchasePrice += addPerUnit;
            purchase.items[i].total = purchase.items[i].quantity * purchase.items[i].purchasePrice;
            adjusted = true;
            break;
          }
        }
      }
      // 3. Fallback: distribute across first item
      if (!adjusted && purchase.items.length > 0) {
        const addPerUnit = travel / purchase.items[0].quantity;
        purchase.items[0].purchasePrice += addPerUnit;
        purchase.items[0].total = purchase.items[0].quantity * purchase.items[0].purchasePrice;
      }
    }

    // Compute subtotal from items
    const subtotal = purchase.items.reduce((sum, item) => {
      item.total = item.quantity * item.purchasePrice;
      return sum + item.total;
    }, 0);

    const commAmount = Math.round((subtotal * commPercent) / 100);
    const totalAmount = subtotal + commAmount + travel;

    const oldTotal = purchase.totalAmount;
    purchase.subtotal = subtotal;
    purchase.commissionAmount = commAmount;
    purchase.totalAmount = totalAmount;

    // If bill is Paid, update paidAmount to match totalAmount
    if (purchase.paymentStatus === 'Paid') {
      purchase.paidAmount = totalAmount;
    }

    await purchase.save();

    // Update Batches
    const overheadRatio = subtotal > 0 ? (commAmount + travel) / subtotal : 0;
    for (const item of purchase.items) {
      const effectivePrice = Math.round(item.purchasePrice * (1 + overheadRatio));
      await Batch.updateMany(
        { purchase: purchase._id, product: item.product },
        { $set: { purchasePrice: effectivePrice } }
      );
    }

    console.log(`Updated ${purchase.invoiceNumber}:`);
    console.log(`  Subtotal = ${subtotal}`);
    console.log(`  Commission (${commPercent}%) = ${commAmount}`);
    console.log(`  Travel Charge = ${travel}`);
    console.log(`  Total = ${totalAmount} (was ${oldTotal})`);
    console.log(`  Paid = ${purchase.paidAmount} (${purchase.paymentStatus})\n`);
  }

  console.log('All purchase records and batches successfully updated.');
  await mongoose.disconnect();
}

fixPurchasesAndDB().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
