const mongoose = require('mongoose');

const wholesalerSellerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Seller name is required'],
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
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

const WholesalerSeller = mongoose.model('WholesalerSeller', wholesalerSellerSchema);

module.exports = WholesalerSeller;
