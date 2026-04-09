const AuditLog = require('../models/AuditLog');

/**
 * Creates an append-only audit log entry.
 * Call this inside any controller after a significant admin action.
 *
 * @param {string}   action           - Human-readable action e.g. 'Approved registration'
 * @param {ObjectId} performedBy      - The admin user's _id
 * @param {ObjectId} targetId         - The _id of the affected document
 * @param {string}   targetCollection - Name of the affected collection
 * @param {Object}   meta             - Optional before/after values or extra context
 * @param {Object}   req              - Express request object (for IP logging)
 */
const logAction = async (
  action,
  performedBy,
  targetId,
  targetCollection,
  meta = {},
  req = null
) => {
  try {
    const ipAddress = req
      ? req.headers['x-forwarded-for'] || req.socket?.remoteAddress
      : null;

    await AuditLog.create({
      action,
      performedBy,
      targetId,
      targetCollection,
      meta,
      ipAddress,
    });
  } catch (error) {
    // Audit log failure should NEVER crash the main request flow
    console.error('Audit log error:', error.message);
  }
};

module.exports = { logAction };