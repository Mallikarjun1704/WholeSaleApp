const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    modelNumber: {
      type: String,
      trim: true,
      default: '',
    },
    sku: {
      type: String,
      required: [true, 'SKU/Barcode is required'],
      unique: true,
      trim: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: [true, 'Brand is required'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
      default: 0,
    },
    gstRate: {
      type: Number,
      required: [true, 'GST rate is required'],
      default: 18,
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    imeiTracking: {
      type: Boolean,
      default: false,
    },
    imeiList: [
      {
        type: String,
        trim: true,
      },
    ],
    warrantyMonths: {
      type: Number,
      default: 12,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ name: 'text', modelNumber: 'text', sku: 'text', barcode: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
