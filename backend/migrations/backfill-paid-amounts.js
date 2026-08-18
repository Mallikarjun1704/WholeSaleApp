/**
 * One-time migration: Backfill paidAmount for old Paid bills & purchases
 * 
 * Problem: Old bills/purchases marked as "Paid" have paidAmount = 0 because
 * paidAmount tracking was added later. This causes Amount in Hand to be wrong.
 * 
 * Fix:
 *  - Bills with status 'Paid' and paidAmount = 0 → set paidAmount = finalAmount
 *  - Purchases with paymentStatus 'Paid' and paidAmount = 0 → set paidAmount = totalAmount
 */

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techmart';

async function run() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;

  // ── 1. Fix Bills ──
  console.log('═══ BILLS ═══');

  // Check current state
  const billsPaidZero = await db.collection('bills').countDocuments({
    status: 'Paid',
    $or: [{ paidAmount: 0 }, { paidAmount: { $exists: false } }, { paidAmount: null }],
  });
  const billsPartialZero = await db.collection('bills').countDocuments({
    status: 'Partially Paid',
    $or: [{ paidAmount: 0 }, { paidAmount: { $exists: false } }, { paidAmount: null }],
  });
  console.log(`  Paid bills with paidAmount=0:           ${billsPaidZero}`);
  console.log(`  Partially Paid bills with paidAmount=0:  ${billsPartialZero}`);

  // Fix Paid bills: set paidAmount = finalAmount
  if (billsPaidZero > 0) {
    const result = await db.collection('bills').updateMany(
      {
        status: 'Paid',
        $or: [{ paidAmount: 0 }, { paidAmount: { $exists: false } }, { paidAmount: null }],
      },
      [{ $set: { paidAmount: '$finalAmount' } }]
    );
    console.log(`  ✅ Fixed ${result.modifiedCount} Paid bills → paidAmount = finalAmount`);
  } else {
    console.log('  ✅ No Paid bills need fixing');
  }

  // For Partially Paid bills with paidAmount=0, check if they have payment logs
  if (billsPartialZero > 0) {
    const partialBills = await db.collection('bills').find({
      status: 'Partially Paid',
      $or: [{ paidAmount: 0 }, { paidAmount: { $exists: false } }, { paidAmount: null }],
    }).toArray();

    let fixedCount = 0;
    for (const bill of partialBills) {
      // Sum payment logs if they exist
      const logSum = (bill.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
      if (logSum > 0) {
        await db.collection('bills').updateOne(
          { _id: bill._id },
          { $set: { paidAmount: logSum } }
        );
        fixedCount++;
      }
    }
    console.log(`  ✅ Fixed ${fixedCount}/${billsPartialZero} Partially Paid bills from payment logs`);
  }

  // ── 2. Fix Purchases ──
  console.log('\n═══ PURCHASES ═══');

  const purchasesPaidZero = await db.collection('purchases').countDocuments({
    paymentStatus: 'Paid',
    $or: [{ paidAmount: 0 }, { paidAmount: { $exists: false } }, { paidAmount: null }],
  });
  console.log(`  Paid purchases with paidAmount=0: ${purchasesPaidZero}`);

  if (purchasesPaidZero > 0) {
    const result = await db.collection('purchases').updateMany(
      {
        paymentStatus: 'Paid',
        $or: [{ paidAmount: 0 }, { paidAmount: { $exists: false } }, { paidAmount: null }],
      },
      [{ $set: { paidAmount: '$totalAmount' } }]
    );
    console.log(`  ✅ Fixed ${result.modifiedCount} Paid purchases → paidAmount = totalAmount`);
  } else {
    console.log('  ✅ No Paid purchases need fixing');
  }

  // ── 3. Summary ──
  console.log('\n═══ VERIFICATION ═══');
  const totalBillPaid = await db.collection('bills').aggregate([
    { $match: { status: { $ne: 'Cancelled' } } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$paidAmount', 0] } } } },
  ]).toArray();
  console.log(`  Total Paid Sales (from paidAmount):    Rs.${(totalBillPaid[0]?.total || 0).toLocaleString('en-IN')}`);

  const totalPurchasePaid = await db.collection('purchases').aggregate([
    { $group: { _id: null, total: { $sum: { $ifNull: ['$paidAmount', 0] } } } },
  ]).toArray();
  console.log(`  Total Paid Purchases (from paidAmount): Rs.${(totalPurchasePaid[0]?.total || 0).toLocaleString('en-IN')}`);

  console.log('\n✅ Migration complete!');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
