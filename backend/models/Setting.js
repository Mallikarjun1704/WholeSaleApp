const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    // Shop Information
    storeName: {
      type: String,
      default: 'TECH MART',
    },
    logo: {
      type: String, // Base64 or file path
      default: '',
    },
    gstNumber: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },

    // Bank Details
    bankDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      branch: { type: String, default: '' },
    },
    upiQRCode: {
      type: String, // Base64 or file path
      default: '',
    },
    upiId: {
      type: String,
      default: '',
    },

    // Invoice Settings
    invoice: {
      prefix: { type: String, default: 'TM' },
      counter: { type: Number, default: 0 },
      format: { type: String, default: 'TM-{YEAR}-{NUMBER}' }, // e.g., TM-2026-0001
      financialYearStart: { type: Number, default: 4 }, // April
      termsAndConditions: { type: String, default: '' },
    },

    // GST Settings
    gst: {
      enabled: { type: Boolean, default: true },
      defaultRate: { type: Number, default: 18 },
      cgstRate: { type: Number, default: 9 },
      sgstRate: { type: Number, default: 9 },
      igstRate: { type: Number, default: 18 },
    },

    // Printer Settings
    printer: {
      type: { type: String, enum: ['thermal', 'a4', 'both'], default: 'a4' },
      thermalWidth: { type: Number, default: 80 }, // mm
      paperSize: { type: String, default: 'A4' },
      autoPrint: { type: Boolean, default: false },
    },

    // Backup Settings
    backup: {
      autoBackup: { type: Boolean, default: true },
      backupTime: { type: String, default: '23:00' }, // 24hr format
      backupPath: { type: String, default: '../backups' },
      retentionDays: { type: Number, default: 30 },
      lastBackup: { type: Date },
    },

    // Notification Settings
    notifications: {
      lowStockThreshold: { type: Number, default: 5 },
      creditReminderDays: { type: Number, default: 3 }, // Days before due
      backupReminder: { type: Boolean, default: true },
    },

    // App Settings
    app: {
      currency: { type: String, default: '₹' },
      currencyCode: { type: String, default: 'INR' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      startWithWindows: { type: Boolean, default: false },
      minimizeToTray: { type: Boolean, default: true },
    },

    // First Run Flag
    isSetupComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// There should only be one settings document
settingSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

settingSchema.statics.updateSettings = async function (updateData) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updateData);
  } else {
    Object.assign(settings, updateData);
    await settings.save();
  }
  return settings;
};

// Generate next invoice number
settingSchema.methods.getNextInvoiceNumber = function () {
  this.invoice.counter += 1;
  const year = new Date().getFullYear();
  const number = String(this.invoice.counter).padStart(4, '0');
  const invoiceNumber = this.invoice.format
    .replace('{YEAR}', year)
    .replace('{NUMBER}', number);
  return invoiceNumber;
};

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;
