const User = require('../models/User');
const Setting = require('../models/Setting');

const DEFAULT_EXPENSE_CATEGORIES = [
  'Staff Salary',
  'Store Rent',
  'Marketing',
  'Travel Allowance',
  'Packaging Material',
  'Commission',
  'Electricity Bill',
  'Internet Bill',
  'Maintenance',
  'Office Expenses',
  'Courier Charges',
  'Fuel',
  'Repairs',
  'Bank Charges',
  'Miscellaneous',
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Checking database seed status...');

    // 1. Create default admin if no admin exists
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

      await User.create({
        username: defaultUsername,
        password: defaultPassword,
        fullName: 'Administrator',
        role: 'admin',
        isActive: true,
      });

      console.log(`   ✅ Default admin created (username: ${defaultUsername})`);
    } else {
      console.log('   ✓ Admin account exists');
    }

    // 2. Create default settings if none exist
    const settings = await Setting.getSettings();
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists && !settings.isSetupComplete) {
      settings.isSetupComplete = true;
      await settings.save();
      console.log('   ✅ Settings configured with isSetupComplete = true');
    } else if (!settings.isSetupComplete) {
      console.log('   ✓ Default settings initialized');
    } else {
      console.log('   ✓ Settings configured');
    }

    // 3. Seed expense categories if ExpenseCategory model exists
    // (Will be created in Phase 8 - placeholder for now)
    try {
      const ExpenseCategory = require('../models/ExpenseCategory');
      const categoryCount = await ExpenseCategory.countDocuments();
      if (categoryCount === 0) {
        const categories = DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
          name,
          isDefault: true,
          isActive: true,
        }));
        await ExpenseCategory.insertMany(categories);
        console.log(`   ✅ ${categories.length} default expense categories created`);
      } else {
        console.log('   ✓ Expense categories exist');
      }
    } catch (e) {
      // ExpenseCategory model not yet created - skip silently
      console.log('   ⏭ Expense categories will be seeded when model is created');
    }

    console.log('🌱 Database seed check complete');
  } catch (error) {
    console.error('❌ Database seeding error:', error.message);
    // Don't throw - allow server to start even if seeding partially fails
  }
};

module.exports = { seedDatabase, DEFAULT_EXPENSE_CATEGORIES };
