const mongoose = require('mongoose');

const wholesalerPriceSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WholesalerSeller',
      required: true,
    },
    sellerName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneName: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
      default: '',
    },
    variant: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    importDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    rawText: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB indexes for single-current-price per seller per product specs
wholesalerPriceSchema.index({ seller: 1 });
wholesalerPriceSchema.index({ phoneName: 1 });
wholesalerPriceSchema.index({ model: 1 });
wholesalerPriceSchema.index({ variant: 1 });
wholesalerPriceSchema.index({ importDate: -1 });
wholesalerPriceSchema.index({ seller: 1, phoneName: 1, variant: 1, color: 1 }, { unique: true });

const WholesalerPrice = mongoose.model('WholesalerPrice', wholesalerPriceSchema);

module.exports = WholesalerPrice;
