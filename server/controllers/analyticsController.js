const DisasterEvent = require('../models/DisasterEvent');
const Victim = require('../models/Victim');
const Inventory = require('../models/Inventory');
const Distribution = require('../models/Distribution');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ─────────────────────────────────────────
// @route   GET /api/analytics/dashboard/:disasterId
// @access  Private (admin only)
// @desc    All 5 chart datasets in one call
// ─────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const disaster = await DisasterEvent.findById(req.params.disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    const [
      victimRegistrationsOverTime,
      distributionStatusBreakdown,
      inventoryStockLevels,
      regionWiseVictims,
      volunteerActivity,
      summaryStats,
    ] = await Promise.all([

      // Chart 1: Victims registered per day
      Victim.aggregate([
        { $match: { disasterId: disaster._id } },
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

      // Chart 2: Distribution status breakdown (donut chart)
      Distribution.aggregate([
        { $match: { disasterId: disaster._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        { $project: { status: '$_id', count: 1, _id: 0 } },
      ]),

      // Chart 3: Inventory stock levels (bar chart)
      Inventory.aggregate([
        {
          $match: {
            disasterId: disaster._id,
            isActive: true,
          },
        },
        {
          $project: {
            itemName: 1,
            category: 1,
            available: '$quantity',
            distributed: '$totalDistributed',
            unit: 1,
          },
        },
        { $sort: { distributed: -1 } },
        { $limit: 10 }, // Top 10 items
      ]),

      // Chart 4: Region-wise victim density (bar chart)
      Victim.aggregate([
        { $match: { disasterId: disaster._id } },
        {
          $group: {
            _id: '$address',
            count: { $sum: 1 },
            verified: {
              $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] },
            },
            avgPriorityScore: { $avg: '$priorityScore' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $project: {
            region: '$_id',
            count: 1,
            verified: 1,
            avgPriorityScore: { $round: ['$avgPriorityScore', 1] },
            _id: 0,
          },
        },
      ]),

      // Chart 5: Volunteer activity (horizontal bar)
      Distribution.aggregate([
        {
          $match: {
            disasterId: disaster._id,
            assignedVolunteerId: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$assignedVolunteerId',
            totalTasks: { $sum: 1 },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
            },
            dispatched: {
              $sum: { $cond: [{ $eq: ['$status', 'Dispatched'] }, 1, 0] },
            },
            assigned: {
              $sum: { $cond: [{ $eq: ['$status', 'Assigned'] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'volunteer',
          },
        },
        { $unwind: '$volunteer' },
        {
          $project: {
            volunteerName: '$volunteer.name',
            region: '$volunteer.region',
            totalTasks: 1,
            delivered: 1,
            dispatched: 1,
            assigned: 1,
            _id: 0,
          },
        },
        { $sort: { delivered: -1 } },
      ]),

      // Summary counters for stat cards
      Promise.all([
        Victim.countDocuments({ disasterId: disaster._id }),
        Victim.countDocuments({ disasterId: disaster._id, status: 'verified' }),
        Victim.countDocuments({ disasterId: disaster._id, status: 'pending' }),
        Distribution.countDocuments({ disasterId: disaster._id }),
        Distribution.countDocuments({ disasterId: disaster._id, status: 'Delivered' }),
        Distribution.countDocuments({
          disasterId: disaster._id,
          status: { $in: ['Submitted', 'Verified', 'Approved', 'Assigned', 'Dispatched'] },
        }),
        Inventory.countDocuments({ disasterId: disaster._id, isActive: true }),
        User.countDocuments({ role: 'volunteer', isActive: true }),
      ]).then(([
        totalVictims, verifiedVictims, pendingVictims,
        totalDistributions, deliveredDistributions, pendingDistributions,
        inventoryItems, totalVolunteers,
      ]) => ({
        totalVictims,
        verifiedVictims,
        pendingVictims,
        totalDistributions,
        deliveredDistributions,
        pendingDistributions,
        inventoryItems,
        totalVolunteers,
      })),
    ]);

    return successResponse(res, 200, 'Dashboard data fetched successfully', {
      disaster: {
        id: disaster._id,
        title: disaster.title,
        location: disaster.location,
        status: disaster.status,
        type: disaster.type,
        severity: disaster.severity,
        startDate: disaster.startDate,
        daysActive: disaster.daysActive,
      },
      summaryStats,
      charts: {
        victimRegistrationsOverTime,
        distributionStatusBreakdown,
        inventoryStockLevels,
        regionWiseVictims,
        volunteerActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/analytics/overview
// @access  Private (admin only)
// @desc    Platform-wide stats across all disasters
// ─────────────────────────────────────────
const getPlatformOverview = async (req, res, next) => {
  try {
    const [
      disasterStats,
      userStats,
      distributionStats,
      recentActivity,
    ] = await Promise.all([

      // Disasters by status
      DisasterEvent.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Users by role
      User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),

      // All-time distribution stats
      Distribution.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
            },
            pending: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      ['Submitted', 'Verified', 'Approved', 'Assigned', 'Dispatched'],
                    ],
                  },
                  1, 0,
                ],
              },
            },
          },
        },
      ]),

      // Last 5 active disasters
      DisasterEvent.find({ status: 'active' })
        .select('title location type severity startDate totalVictimsRegistered')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    return successResponse(res, 200, 'Platform overview fetched', {
      disasterStats,
      userStats,
      distributionStats: distributionStats[0] || { total: 0, delivered: 0, pending: 0 },
      recentActiveDisasters: recentActivity,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/analytics/report/:disasterId
// @access  Private (admin, ngo)
// @desc    Full closure report data
// ─────────────────────────────────────────
const getClosureReport = async (req, res, next) => {
  try {
    const disaster = await DisasterEvent.findById(req.params.disasterId)
      .populate('createdBy', 'name email');

    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    const [
      victimSummary,
      distributionSummary,
      inventorySummary,
      volunteerSummary,
      donorSummary,
    ] = await Promise.all([

      // Victim summary
      Victim.aggregate([
        { $match: { disasterId: disaster._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgPriorityScore: { $avg: '$priorityScore' },
            totalFamilySize: { $sum: '$familySize' },
          },
        },
      ]),

      // Distribution summary by item
      Distribution.aggregate([
        { $match: { disasterId: disaster._id } },
        {
          $lookup: {
            from: 'inventories',
            localField: 'itemId',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: '$item' },
        {
          $group: {
            _id: '$item.itemName',
            category: { $first: '$item.category' },
            unit: { $first: '$item.unit' },
            totalQuantityDistributed: { $sum: '$quantity' },
            deliveryCount: { $sum: 1 },
            deliveredCount: {
              $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
            },
          },
        },
        { $sort: { totalQuantityDistributed: -1 } },
      ]),

      // Inventory usage
      Inventory.aggregate([
        { $match: { disasterId: disaster._id, isActive: true } },
        {
          $group: {
            _id: '$category',
            totalDonated: { $sum: { $add: ['$quantity', '$totalDistributed'] } },
            totalDistributed: { $sum: '$totalDistributed' },
            remaining: { $sum: '$quantity' },
          },
        },
      ]),

      // Volunteer performance — include both Delivered AND Closed (cancelled after delivery)
Distribution.aggregate([
  {
    $match: {
      disasterId: disaster._id,
      assignedVolunteerId: { $exists: true, $ne: null },
      status: { $in: ['Delivered', 'Closed'] }, // Include Closed too
    },
  },
  {
    $group: {
      _id: '$assignedVolunteerId',
      deliveriesCompleted: { $sum: 1 },
      totalQuantityDelivered: { $sum: '$quantity' },
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'volunteer',
    },
  },
  { $unwind: '$volunteer' },
  {
    $project: {
      name: '$volunteer.name',
      region: '$volunteer.region',
      deliveriesCompleted: 1,
      totalQuantityDelivered: 1,
    },
  },
  { $sort: { deliveriesCompleted: -1 } },
]),
      // Donor contributions
      Inventory.aggregate([
        {
          $match: {
            disasterId: disaster._id,
            donorId: { $exists: true, $ne: null },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'donorId',
            foreignField: '_id',
            as: 'donor',
          },
        },
        { $unwind: '$donor' },
        {
          $group: {
            _id: '$donorId',
            donorName: { $first: '$donor.name' },
            itemsContributed: { $sum: 1 },
            totalQuantity: { $sum: { $add: ['$quantity', '$totalDistributed'] } },
          },
        },
        { $sort: { totalQuantity: -1 } },
      ]),
    ]);

    const report = {
      generatedAt: new Date().toISOString(),
      disaster: {
        title: disaster.title,
        type: disaster.type,
        location: disaster.location,
        severity: disaster.severity,
        status: disaster.status,
        startDate: disaster.startDate,
        endDate: disaster.endDate,
        daysActive: disaster.daysActive,
        createdBy: disaster.createdBy,
      },
      victimSummary,
      distributionSummary,
      inventorySummary,
      volunteerSummary,
      donorSummary,
    };

    return successResponse(res, 200, 'Closure report generated', { report });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/analytics/notifications
// @access  Private (all roles)
// @desc    Get notifications for logged-in user
// ─────────────────────────────────────────
const getMyNotifications = async (req, res, next) => {
  try {
    const Notification = require('../models/Notification');
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipientId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments({
        recipientId: req.user._id,
        isRead: false,
      }),
    ]);

    return successResponse(res, 200, 'Notifications fetched', {
      unreadCount,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/analytics/notifications/read
// @access  Private (all roles)
// @desc    Mark all notifications as read
// ─────────────────────────────────────────
const markNotificationsRead = async (req, res, next) => {
  try {
    const Notification = require('../models/Notification');

    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return successResponse(res, 200, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getPlatformOverview,
  getClosureReport,
  getMyNotifications,
  markNotificationsRead,
};