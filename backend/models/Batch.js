const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Purchase',
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    remainingQty: {
      type: Number,
      required: true,
      min: [0, 'Remaining quantity cannot be negative'],
    },
    imeiNumbers: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient lookups
batchSchema.index({ product: 1, remainingQty: -1 });
batchSchema.index({ purchase: 1 });
batchSchema.index({ supplier: 1 });
batchSchema.index({ createdAt: 1 });

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
