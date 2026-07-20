module.exports = {
  secret: process.env.JWT_SECRET || 'techmart_jwt_secret_default',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'techmart_refresh_secret_default',
  expiresIn: process.env.JWT_EXPIRE || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
};
