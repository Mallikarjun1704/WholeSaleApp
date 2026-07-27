const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    partnerName: {
      type: String,
      required: [true, 'Partner name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    type: {
      type: String,
      enum: ['Investment', 'Withdrawal'],
      default: 'Investment',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

investmentSchema.index({ partnerName: 1 });
investmentSchema.index({ date: -1 });

const Investment = mongoose.model('Investment', investmentSchema);

module.exports = Investment;
