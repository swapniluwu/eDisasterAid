const { validationResult } = require('express-validator');
const DisasterEvent = require('../models/DisasterEvent');
const Victim = require('../models/Victim');
const Inventory = require('../models/Inventory');
const Distribution = require('../models/Distribution');
const { logAction } = require('../utils/auditLogger');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ─────────────────────────────────────────
// @route   POST /api/disasters
// @access  Private (admin only)
// @desc    Create a new disaster event
// ─────────────────────────────────────────
const createDisaster = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Validation failed', errors.array());
    }

    const {
      title, type, description, location,
      coordinates, severity, startDate,
    } = req.body;

    const disaster = await DisasterEvent.create({
      title,
      type,
      description,
      location,
      coordinates,
      severity,
      startDate: startDate || Date.now(),
      createdBy: req.user._id,
    });

    // Log this admin action
    await logAction(
      `Created disaster event: ${title}`,
      req.user._id,
      disaster._id,
      'DisasterEvent',
      { type, location, severity },
      req
    );

    return successResponse(res, 201, 'Disaster event created successfully', { disaster });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/disasters
// @access  Private (all roles)
// @desc    Get all disaster events with filters
// ─────────────────────────────────────────
const getAllDisasters = async (req, res, next) => {
  try {
    const { status, type, severity, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    // Citizens and volunteers only see active disasters
    if (['citizen', 'volunteer'].includes(req.user.role)) {
      filter.status = 'active';
    }

    const disasters = await DisasterEvent.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Disasters fetched successfully', {
      count: disasters.length,
      disasters,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/disasters/:id
// @access  Private (all roles)
// @desc    Get a single disaster event by ID
// ─────────────────────────────────────────
const getDisasterById = async (req, res, next) => {
  try {
    const disaster = await DisasterEvent.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    return successResponse(res, 200, 'Disaster fetched successfully', { disaster });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/disasters/:id
// @access  Private (admin only)
// @desc    Update disaster details
// ─────────────────────────────────────────
const updateDisaster = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Validation failed', errors.array());
    }

    const disaster = await DisasterEvent.findById(req.params.id);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    // Prevent editing a closed disaster
    if (disaster.status === 'closed') {
      return errorResponse(res, 400, 'Cannot edit a closed disaster event');
    }

    const allowedUpdates = [
      'title', 'type', 'description', 'location',
      'coordinates', 'severity', 'startDate',
    ];

    // Snapshot before state for audit log
    const before = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        before[field] = disaster[field];
        disaster[field] = req.body[field];
      }
    });

    await disaster.save();

    await logAction(
      `Updated disaster event: ${disaster.title}`,
      req.user._id,
      disaster._id,
      'DisasterEvent',
      { before, after: req.body },
      req
    );

    return successResponse(res, 200, 'Disaster updated successfully', { disaster });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/disasters/:id/status
// @access  Private (admin only)
// @desc    Change disaster status (active/inactive/closed)
// ─────────────────────────────────────────
const updateDisasterStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'closed'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, 400, 'Status must be one of: active, inactive, closed');
    }

    const disaster = await DisasterEvent.findById(req.params.id);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    // Cannot reopen a closed disaster
    if (disaster.status === 'closed') {
      return errorResponse(res, 400, 'A closed disaster cannot be reopened');
    }

    const previousStatus = disaster.status;
    disaster.status = status;

    // Set endDate when closing
    if (status === 'closed') {
      disaster.endDate = new Date();
    }

    await disaster.save();

    await logAction(
      `Changed disaster status: ${previousStatus} → ${status}`,
      req.user._id,
      disaster._id,
      'DisasterEvent',
      { previousStatus, newStatus: status },
      req
    );

    return successResponse(res, 200, `Disaster marked as ${status}`, { disaster });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/disasters/:id/summary
// @access  Private (admin, ngo)
// @desc    Get closure report summary for a disaster
// ─────────────────────────────────────────
const getDisasterSummary = async (req, res, next) => {
  try {
    const disaster = await DisasterEvent.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    // Aggregate all key stats in parallel for performance
    const [
      totalVictims,
      verifiedVictims,
      totalDistributions,
      deliveredDistributions,
      inventoryStats,
      volunteerCount,
    ] = await Promise.all([
      Victim.countDocuments({ disasterId: disaster._id }),
      Victim.countDocuments({ disasterId: disaster._id, status: 'verified' }),
      Distribution.countDocuments({ disasterId: disaster._id }),
      Distribution.countDocuments({ disasterId: disaster._id, status: 'Delivered' }),

      // Total items distributed per category
      Distribution.aggregate([
        { $match: { disasterId: disaster._id, status: 'Delivered' } },
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
            _id: '$item.category',
            totalQuantity: { $sum: '$quantity' },
            itemCount: { $sum: 1 },
          },
        },
      ]),

      // Unique volunteers who made at least one delivery
      Distribution.distinct('assignedVolunteerId', {
        disasterId: disaster._id,
        status: { $in: ['Dispatched', 'Delivered'] },
      }),
    ]);

    const summary = {
      disaster,
      stats: {
        totalVictimsRegistered: totalVictims,
        verifiedVictims,
        pendingVictims: totalVictims - verifiedVictims,
        totalDistributions,
        deliveredDistributions,
        pendingDistributions: totalDistributions - deliveredDistributions,
        totalVolunteersInvolved: volunteerCount.length,
        itemsByCategory: inventoryStats,
        daysActive: disaster.daysActive,
      },
    };

    return successResponse(res, 200, 'Disaster summary fetched successfully', { summary });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDisaster,
  getAllDisasters,
  getDisasterById,
  updateDisaster,
  updateDisasterStatus,
  getDisasterSummary,
};