const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
      default: 'System',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
        'SALE', 'PURCHASE', 'PAYMENT', 'REFUND', 'CANCEL',
        'BACKUP', 'RESTORE', 'IMPORT', 'EXPORT',
        'PRICE_CHANGE', 'STOCK_ADJUSTMENT', 'SETTINGS_UPDATE',
      ],
    },
    resource: {
      type: String,
      required: true,
      // e.g., 'Product', 'Bill', 'Customer', 'User', 'Settings'
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    description: {
      type: String,
      default: '',
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ resource: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
