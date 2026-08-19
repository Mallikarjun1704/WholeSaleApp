const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');

async function checkProducts() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/techmart');
  const p = await Purchase.findOne({ invoiceNumber: 'INV-20260807-003' }).lean();
  for (const item of p.items) {
    const prod = await Product.findById(item.product).lean();
    console.log(`Product: ${prod?.name}, purchasePrice in item: ${item.purchasePrice}, product purchasePrice: ${prod?.purchasePrice}, sellingPrice: ${prod?.sellingPrice}`);
  }
  await mongoose.disconnect();
}
checkProducts();
