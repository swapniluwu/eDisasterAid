const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ─────────────────────────────────────────
// @route   GET /api/audit
// @access  Private (admin only)
// @desc    Get audit logs with filters and pagination
// ─────────────────────────────────────────
const getAuditLogs = async (req, res, next) => {
  try {
    const {
      performedBy,
      targetCollection,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 30,
    } = req.query;

    const filter = {};

    if (performedBy) filter.performedBy = performedBy;
    if (targetCollection) filter.targetCollection = targetCollection;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include full end day
        filter.createdAt.$lte = end;
      }
    }

    // Search in action description
    if (search) {
      filter.action = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(filter);

    const logs = await AuditLog.find(filter)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Audit logs fetched successfully', {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/audit/:id
// @access  Private (admin only)
// @desc    Get a single audit log entry
// ─────────────────────────────────────────
const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('performedBy', 'name email role');

    if (!log) {
      return errorResponse(res, 404, 'Audit log entry not found');
    }

    return successResponse(res, 200, 'Audit log fetched', { log });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/audit/stats
// @access  Private (admin only)
// @desc    Audit activity stats — actions per admin, per collection
// ─────────────────────────────────────────
const getAuditStats = async (req, res, next) => {
  try {
    const [actionsByAdmin, actionsByCollection, activityLast7Days] =
      await Promise.all([

        // Actions grouped by admin
        AuditLog.aggregate([
          {
            $group: {
              _id: '$performedBy',
              totalActions: { $sum: 1 },
              lastAction: { $max: '$createdAt' },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'admin',
            },
          },
          { $unwind: { path: '$admin', preserveNullAndEmpty: true } },
          {
            $project: {
              adminName: '$admin.name',
              adminEmail: '$admin.email',
              totalActions: 1,
              lastAction: 1,
            },
          },
          { $sort: { totalActions: -1 } },
        ]),

        // Actions grouped by collection
        AuditLog.aggregate([
          {
            $group: {
              _id: '$targetCollection',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $project: { collection: '$_id', count: 1, _id: 0 } },
        ]),

        // Daily activity for the last 7 days
        AuditLog.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { date: '$_id', count: 1, _id: 0 } },
        ]),
      ]);

    return successResponse(res, 200, 'Audit stats fetched', {
      actionsByAdmin,
      actionsByCollection,
      activityLast7Days,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs, getAuditLogById, getAuditStats };