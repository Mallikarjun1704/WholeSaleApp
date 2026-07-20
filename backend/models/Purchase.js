const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  imeiNumbers: [
    {
      type: String,
      trim: true,
    },
  ],
  total: {
    type: Number,
    required: true,
  },
});

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
    },
    batchId: {
      type: String,
      required: true,
      unique: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    items: [purchaseItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    commissionPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      default: 0,
    },
    travelCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Unpaid'],
      default: 'Unpaid',
    },
    paidDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

purchaseSchema.index({ invoiceNumber: 1 });
purchaseSchema.index({ supplier: 1 });
purchaseSchema.index({ createdAt: -1 });
purchaseSchema.index({ paymentStatus: 1 });

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase;
