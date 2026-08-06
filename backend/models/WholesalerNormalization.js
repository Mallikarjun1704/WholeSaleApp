const mongoose = require('mongoose');

const wholesalerNormalizationSchema = new mongoose.Schema(
  {
    rawPattern: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const WholesalerNormalization = mongoose.model('WholesalerNormalization', wholesalerNormalizationSchema);

module.exports = WholesalerNormalization;
