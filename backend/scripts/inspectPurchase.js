const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Purchase = require('../models/Purchase');

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techmart');
  const p = await Purchase.findOne({ invoiceNumber: 'INV-20260807-003' }).lean();
  console.log(JSON.stringify(p, null, 2));
  await mongoose.disconnect();
}
inspect();
