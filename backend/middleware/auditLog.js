const ActivityLog = require('../models/ActivityLog');

/**
 * Middleware to automatically log API actions to the activity log.
 * Attach to routes that need auditing.
 *
 * Usage:
 *   router.post('/products', auditLog('CREATE', 'Product'), controller.create);
 *
 * Or call manually in controllers:
 *   await logActivity({ userId, action, resource, ... });
 */

const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300 && body.success !== false) {
        const logEntry = {
          userId: req.user ? req.user._id : null,
          userName: req.user ? req.user.fullName : 'System',
          action,
          resource,
          resourceId: body.data ? (body.data._id || body.data.id) : null,
          description: `${action} ${resource}`,
          ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
          metadata: {
            method: req.method,
            path: req.originalUrl,
          },
        };

        // Log asynchronously - don't block response
        ActivityLog.create(logEntry).catch((err) => {
          console.error('Failed to create audit log:', err.message);
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Direct logging function for use in controllers
 */
const logActivity = async ({
  userId = null,
  userName = 'System',
  action,
  resource,
  resourceId = null,
  description = '',
  oldValue = null,
  newValue = null,
  ipAddress = '127.0.0.1',
  metadata = null,
}) => {
  try {
    await ActivityLog.create({
      userId,
      userName,
      action,
      resource,
      resourceId,
      description,
      oldValue,
      newValue,
      ipAddress,
      metadata,
    });
  } catch (error) {
    console.error('Failed to create activity log:', error.message);
  }
};

module.exports = { auditLog, logActivity };
