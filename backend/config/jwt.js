module.exports = {
  secret: process.env.JWT_SECRET || 'tmw_jwt_secret_default',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'tmw_refresh_secret_default',
  expiresIn: process.env.JWT_EXPIRE || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
};
