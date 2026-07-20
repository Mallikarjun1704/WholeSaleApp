const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Setting = require('../models/Setting');
const jwtConfig = require('../config/jwt');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { logActivity } = require('../middleware/auditLog');

/**
 * Generate JWT tokens (access + refresh)
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });

  const refreshToken = jwt.sign({ id: userId }, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new AppError('Please provide username and password', 400);
  }

  // Find user with password field included
  const user = await User.findOne({ username: username.toLowerCase() }).select('+password');

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Contact administrator.', 403);
  }

  // Check password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save refresh token and last login
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Log the login
  await logActivity({
    userId: user._id,
    userName: user.fullName,
    action: 'LOGIN',
    resource: 'User',
    resourceId: user._id,
    description: `${user.fullName} logged in`,
  });

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        phone: user.phone,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new AppError('Refresh token is required', 400);
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(token, jwtConfig.refreshSecret);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Find user and verify stored refresh token
  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== token) {
    throw new AppError('Invalid refresh token', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403);
  }

  // Generate new tokens
  const tokens = generateTokens(user._id);

  // Save new refresh token
  user.refreshToken = tokens.refreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Clear refresh token
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

  await logActivity({
    userId: req.user._id,
    userName: req.user.fullName,
    action: 'LOGOUT',
    resource: 'User',
    resourceId: req.user._id,
    description: `${req.user.fullName} logged out`,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update current user password
 * @route   PUT /api/auth/password
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Please provide current password and new password', 400);
  }

  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.password = newPassword;
  await user.save();

  // Generate new tokens
  const tokens = generateTokens(user._id);

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
});

/**
 * @desc    First-run setup - create admin account + shop details
 * @route   POST /api/auth/setup
 * @access  Public (only works if no admin exists)
 */
const setup = asyncHandler(async (req, res) => {
  // Check if setup is already complete
  const existingAdmin = await User.findOne({ role: 'admin' });

  if (existingAdmin) {
    throw new AppError('Setup is already complete. Admin account exists.', 400);
  }

  const { username, password, fullName, phone, email, shopDetails } = req.body;

  if (!username || !password || !fullName) {
    throw new AppError('Username, password, and full name are required', 400);
  }

  // Create admin user
  const admin = await User.create({
    username,
    password,
    fullName,
    role: 'admin',
    phone,
    email,
  });

  // Update shop settings if provided
  if (shopDetails) {
    await Setting.updateSettings({
      ...shopDetails,
      isSetupComplete: true,
    });
  } else {
    await Setting.updateSettings({ isSetupComplete: true });
  }

  // Generate tokens
  const tokens = generateTokens(admin._id);

  // Save refresh token
  admin.refreshToken = tokens.refreshToken;
  await admin.save({ validateBeforeSave: false });

  await logActivity({
    userId: admin._id,
    userName: admin.fullName,
    action: 'CREATE',
    resource: 'User',
    resourceId: admin._id,
    description: 'Initial admin account created during setup',
  });

  res.status(201).json({
    success: true,
    message: 'Setup complete. Admin account created.',
    data: {
      user: {
        id: admin._id,
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
});

/**
 * @desc    Check if setup is needed
 * @route   GET /api/auth/check-setup
 * @access  Public
 */
const checkSetup = asyncHandler(async (req, res) => {
  const settings = await Setting.getSettings();
  const adminExists = await User.findOne({ role: 'admin' });

  res.status(200).json({
    success: true,
    data: {
      isSetupComplete: settings.isSetupComplete && !!adminExists,
    },
  });
});

module.exports = {
  login,
  refreshToken,
  logout,
  getMe,
  updatePassword,
  setup,
  checkSetup,
};
