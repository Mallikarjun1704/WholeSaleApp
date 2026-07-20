require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { seedDatabase } = require('./seeds');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Run database seeding (creates defaults if needed)
    await seedDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log('═══════════════════════════════════════════');
      console.log('   🏪 TECH MART API Server');
      console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   🚀 Server running on port: ${PORT}`);
      console.log(`   📡 API URL: http://localhost:${PORT}/api`);
      console.log('═══════════════════════════════════════════');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

startServer();
