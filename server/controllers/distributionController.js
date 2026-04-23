const { validationResult } = require('express-validator');
const Distribution = require('../models/Distribution');
const Victim = require('../models/Victim');
const Inventory = require('../models/Inventory');
const DisasterEvent = require('../models/DisasterEvent');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/auditLogger');
const { sendLowStockAlert } = require('./inventoryController');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ─────────────────────────────────────────
// @route   POST /api/distributions
// @access  Private (admin only)
// @desc    Create a new distribution record
//          Deducts stock immediately on creation
// ─────────────────────────────────────────
const createDistribution = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { victimId, itemId, quantity, disasterId, notes } = req.body;

    // ── Verify victim exists and is verified ──
    const victim = await Victim.findById(victimId);
    if (!victim) {
      return errorResponse(res, 404, 'Victim not found');
    }
    if (!victim.isVerified) {
      return errorResponse(
        res, 400,
        'Victim must be verified before distribution can be created'
      );
    }

    // ── Verify inventory item exists and has enough stock ──
    const inventoryItem = await Inventory.findById(itemId);
    if (!inventoryItem || !inventoryItem.isActive) {
      return errorResponse(res, 404, 'Inventory item not found');
    }
    if (inventoryItem.quantity < quantity) {
      return errorResponse(
        res, 400,
        `Insufficient stock. Available: ${inventoryItem.quantity} ${inventoryItem.unit}, Requested: ${quantity} ${inventoryItem.unit}`
      );
    }

    // ── Verify disaster matches ──
    const disaster = await DisasterEvent.findById(disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }
    if (disaster.status === 'closed') {
      return errorResponse(res, 400, 'Cannot create distributions for a closed disaster');
    }

    // ── Duplicate allocation check ──
    // One victim cannot receive the same item twice in the same disaster
    const duplicate = await Distribution.findOne({
      victimId,
      itemId,
      disasterId,
      status: { $nin: ['Closed'] }, // Allow if previous was closed/cancelled
    });
    if (duplicate) {
      return errorResponse(
        res, 400,
        `This victim has already been allocated ${inventoryItem.itemName}. Duplicate distributions are not allowed.`
      );
    }

    // ── Deduct stock immediately on distribution creation ──
    inventoryItem.quantity -= quantity;
    inventoryItem.totalDistributed += quantity;
    await inventoryItem.save();

    // Check if stock is now low after deduction
    if (inventoryItem.isLowStock) {
      await sendLowStockAlert(inventoryItem);
    }

    // ── Create distribution with initial status history entry ──
    // ── Create distribution with initial status history entry ──
const distribution = await Distribution.create({
  victimId,
  itemId,
  disasterId,
  quantity,
  notes,
  createdBy: req.user._id,
  status: 'Submitted',  // Always start at Submitted
  statusHistory: [
    {
      stage: 'Submitted',
      changedBy: req.user._id,
      note: 'Distribution created by admin',
    },
  ],
});

    // ── Update disaster distribution count ──
    await DisasterEvent.findByIdAndUpdate(disasterId, {
      $inc: { totalDistributions: 1 },
    });

    // ── Notify the citizen ──
    await Notification.create({
      recipientId: victim.userId,
      type: 'status_update',
      title: 'Aid Distribution Created',
      message: `A distribution of ${quantity} ${inventoryItem.unit} of ${inventoryItem.itemName} has been created for you. Current status: Submitted.`,
      relatedId: distribution._id,
      relatedCollection: 'Distribution',
    });

    await logAction(
      `Created distribution: ${quantity} ${inventoryItem.unit} of ${inventoryItem.itemName} for victim ${victim.name}`,
      req.user._id,
      distribution._id,
      'Distribution',
      {
        victimId,
        itemId,
        quantity,
        itemName: inventoryItem.itemName,
        remainingStock: inventoryItem.quantity,
      },
      req
    );

    // Populate for response
    const populated = await Distribution.findById(distribution._id)
      .populate('victimId', 'name phone address priorityScore')
      .populate('itemId', 'itemName category unit quantity')
      .populate('disasterId', 'title location')
      .populate('createdBy', 'name email');

    return successResponse(res, 201, 'Distribution created successfully', {
      distribution: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/distributions
// @access  Private (admin only)
// @desc    Get all distributions with filters
// ─────────────────────────────────────────
const getAllDistributions = async (req, res, next) => {
  try {
    const { disasterId, status, assignedVolunteerId, victimId, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (disasterId) filter.disasterId = disasterId;
    if (status) filter.status = status;
    if (assignedVolunteerId) filter.assignedVolunteerId = assignedVolunteerId;
    if (victimId) filter.victimId = victimId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Distribution.countDocuments(filter);

    const distributions = await Distribution.find(filter)
      .populate('victimId', 'name phone address priorityScore')
      .populate('itemId', 'itemName category unit')
      .populate('disasterId', 'title location')
      .populate('assignedVolunteerId', 'name phone')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, 200, 'Distributions fetched successfully', {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      count: distributions.length,
      distributions,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/distributions/:id
// @access  Private (admin | volunteer | citizen)
// @desc    Get a single distribution by ID
// ─────────────────────────────────────────
const getDistributionById = async (req, res, next) => {
  try {
    const distribution = await Distribution.findById(req.params.id)
      .populate('victimId', 'name phone address priorityScore familySize')
      .populate('itemId', 'itemName category unit quantity totalDistributed')
      .populate('disasterId', 'title location type')
      .populate('assignedVolunteerId', 'name phone region skillTags')
      .populate('createdBy', 'name email')
      .populate('statusHistory.changedBy', 'name role');

    if (!distribution) {
      return errorResponse(res, 404, 'Distribution not found');
    }

    // Citizens can only see their own distributions
    if (req.user.role === 'citizen') {
      const victim = await Victim.findOne({ userId: req.user._id });
      if (
        !victim ||
        distribution.victimId._id.toString() !== victim._id.toString()
      ) {
        return errorResponse(res, 403, 'Not authorized to view this distribution');
      }
    }

    // Volunteers can only see distributions assigned to them
    if (
      req.user.role === 'volunteer' &&
      distribution.assignedVolunteerId?._id.toString() !== req.user._id.toString()
    ) {
      return errorResponse(res, 403, 'Not authorized to view this distribution');
    }

    return successResponse(res, 200, 'Distribution fetched successfully', {
      distribution,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/distributions/victim/:victimId
// @access  Private (citizen — own records | admin)
// @desc    Get all distributions for a specific victim
// ─────────────────────────────────────────
const getDistributionsByVictim = async (req, res, next) => {
  try {
    const victim = await Victim.findById(req.params.victimId);
    if (!victim) {
      return errorResponse(res, 404, 'Victim not found');
    }

    // Citizens can only view their own distributions
    if (
      req.user.role === 'citizen' &&
      victim.userId.toString() !== req.user._id.toString()
    ) {
      return errorResponse(res, 403, 'Not authorized to view these distributions');
    }

    const distributions = await Distribution.find({
      victimId: req.params.victimId,
    })
      .populate('itemId', 'itemName category unit')
      .populate('disasterId', 'title location')
      .populate('assignedVolunteerId', 'name phone')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Distributions fetched successfully', {
      victim: {
        name: victim.name,
        priorityScore: victim.priorityScore,
        status: victim.status,
      },
      count: distributions.length,
      distributions,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/distributions/:id/status
// @access  Private (admin | volunteer)
// @desc    Advance distribution to next lifecycle stage
//          Volunteers can only update: Assigned → Dispatched → Delivered
// ─────────────────────────────────────────
const updateDistributionStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const validStatuses = [
      'Submitted', 'Verified', 'Approved',
      'Assigned', 'Dispatched', 'Delivered', 'Closed',
    ];

    if (!validStatuses.includes(status)) {
      return errorResponse(
        res, 400,
        `Status must be one of: ${validStatuses.join(', ')}`
      );
    }

    const distribution = await Distribution.findById(req.params.id)
      .populate('victimId', 'name userId')
      .populate('itemId', 'itemName unit');

    if (!distribution) {
      return errorResponse(res, 404, 'Distribution not found');
    }

    // ── Volunteer restriction ──
    // Volunteers can only move: Assigned → Dispatched → Delivered
    if (req.user.role === 'volunteer') {
      const volunteerAllowedStatuses = ['Dispatched', 'Delivered'];
      if (!volunteerAllowedStatuses.includes(status)) {
        return errorResponse(
          res, 403,
          'Volunteers can only update status to Dispatched or Delivered'
        );
      }
      // Volunteer can only update their own assigned distributions
      if (
        distribution.assignedVolunteerId?.toString() !== req.user._id.toString()
      ) {
        return errorResponse(
          res, 403,
          'You can only update distributions assigned to you'
        );
      }
    }

    // ── Use the model method to enforce forward-only stage transitions ──
    try {
      distribution.advanceStage(status, req.user._id, note || '');
    } catch (stageError) {
      return errorResponse(res, 400, stageError.message);
    }

    await distribution.save();

    // ── Notify victim of status change ──
    const statusMessages = {
      Verified: 'Your aid request has been verified.',
      Approved: 'Your aid request has been approved and is being prepared.',
      Assigned: 'A volunteer has been assigned to deliver your aid.',
      Dispatched: 'Your aid is on the way! The volunteer is en route.',
      Delivered: 'Your aid has been successfully delivered. Thank you.',
      Closed: 'Your distribution record has been closed.',
    };

    if (statusMessages[status]) {
      await Notification.create({
        recipientId: distribution.victimId.userId,
        type: 'status_update',
        title: `Aid Status: ${status}`,
        message: statusMessages[status],
        relatedId: distribution._id,
        relatedCollection: 'Distribution',
      });
    }

    await logAction(
      `Distribution status updated: ${distribution.status} for ${distribution.victimId.name}`,
      req.user._id,
      distribution._id,
      'Distribution',
      {
        newStatus: status,
        item: distribution.itemId.itemName,
        note,
      },
      req
    );

    const populated = await Distribution.findById(distribution._id)
      .populate('victimId', 'name phone address')
      .populate('itemId', 'itemName category unit')
      .populate('assignedVolunteerId', 'name phone')
      .populate('statusHistory.changedBy', 'name role');

    return successResponse(res, 200, `Status updated to ${status}`, {
      distribution: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/distributions/:id/assign
// @access  Private (admin only)
// @desc    Assign a volunteer to a distribution
// ─────────────────────────────────────────
const assignVolunteer = async (req, res, next) => {
  try {
    const { volunteerId } = req.body;

    // Hard block — must provide a real volunteerId
    if (!volunteerId || volunteerId === '' || volunteerId === 'null') {
      return errorResponse(res, 400, 'You must select a volunteer before assigning');
    }

    const volunteer = await User.findById(volunteerId);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return errorResponse(res, 404, 'Volunteer not found');
    }
    if (!volunteer.isActive) {
      return errorResponse(res, 400, 'This volunteer account is inactive');
    }

    const distribution = await Distribution.findById(req.params.id)
      .populate('victimId', 'name userId')
      .populate('itemId', 'itemName unit quantity');

    if (!distribution) {
      return errorResponse(res, 404, 'Distribution not found');
    }

    if (['Delivered', 'Closed'].includes(distribution.status)) {
      return errorResponse(
        res, 400,
        `Cannot assign volunteer to a ${distribution.status} distribution`
      );
    }

    const previousVolunteerId = distribution.assignedVolunteerId;

    // Save volunteer ID
    distribution.assignedVolunteerId = volunteerId;

    // Only push Assigned stage if not already there or beyond
    const stageOrder = ['Submitted','Verified','Approved','Assigned','Dispatched','Delivered','Closed'];
    const currentIdx = stageOrder.indexOf(distribution.status);
    const assignedIdx = stageOrder.indexOf('Assigned');

    if (currentIdx < assignedIdx) {
      // Auto-advance to Assigned
      for (let i = currentIdx + 1; i <= assignedIdx; i++) {
        distribution.statusHistory.push({
          stage: stageOrder[i],
          changedBy: req.user._id,
          note: i === assignedIdx
            ? `Assigned to volunteer: ${volunteer.name}`
            : 'Auto-advanced on assignment',
        });
      }
      distribution.status = 'Assigned';
    } else if (currentIdx === assignedIdx) {
      // Already Assigned — just update volunteer, add a note
      distribution.statusHistory.push({
        stage: 'Assigned',
        changedBy: req.user._id,
        note: `Volunteer updated to: ${volunteer.name}`,
      });
    }
    // If Dispatched — just update the volunteerId silently

    await distribution.save();

    // Update disaster volunteer count for fresh assignments only
    if (!previousVolunteerId) {
      await DisasterEvent.findByIdAndUpdate(distribution.disasterId, {
        $inc: { totalVolunteersAssigned: 1 },
      });
    }

    // Notify volunteer of new task
    await Notification.create({
      recipientId: volunteerId,
      type: 'delivery_assigned',
      title: 'New delivery task assigned',
      message: `You have been assigned to deliver ${distribution.quantity} ${distribution.itemId?.unit} of ${distribution.itemId?.itemName} to ${distribution.victimId?.name}.`,
      relatedId: distribution._id,
      relatedCollection: 'Distribution',
    });

    // Notify citizen that volunteer is coming
    if (distribution.victimId?.userId) {
      await Notification.create({
        recipientId: distribution.victimId.userId,
        type: 'status_update',
        title: 'Volunteer assigned to your delivery',
        message: `${volunteer.name} has been assigned to deliver your aid. They will contact you soon.`,
        relatedId: distribution._id,
        relatedCollection: 'Distribution',
      });
    }

    await logAction(
      `Assigned volunteer ${volunteer.name} to distribution for ${distribution.victimId?.name}`,
      req.user._id,
      distribution._id,
      'Distribution',
      { volunteerId, volunteerName: volunteer.name },
      req
    );

    const populated = await Distribution.findById(distribution._id)
      .populate('victimId', 'name phone address')
      .populate('itemId', 'itemName category unit')
      .populate('assignedVolunteerId', 'name phone skillTags region');

    return successResponse(res, 200, 'Volunteer assigned successfully', {
      distribution: populated,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/distributions/my-tasks
// @access  Private (volunteer only)
// @desc    Get all distributions assigned to this volunteer
// ─────────────────────────────────────────
const getMyTasks = async (req, res, next) => {
  try {
    const { status } = req.query;

    const filter = { assignedVolunteerId: req.user._id };
    if (status) filter.status = status;

    const tasks = await Distribution.find(filter)
      .populate('victimId', 'name phone address familySize requiredItems')
      .populate('itemId', 'itemName category unit')
      .populate('disasterId', 'title location type')
      .sort({ createdAt: -1 });

    // Summary for volunteer dashboard
    const summary = {
      total: tasks.length,
      assigned: tasks.filter((t) => t.status === 'Assigned').length,
      dispatched: tasks.filter((t) => t.status === 'Dispatched').length,
      delivered: tasks.filter((t) => t.status === 'Delivered').length,
    };

    return successResponse(res, 200, 'Your tasks fetched successfully', {
      summary,
      tasks,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/distributions/my-tracking
// @access  Private (citizen only)
// @desc    Get all distributions for the logged-in citizen
// ─────────────────────────────────────────
const getMyTracking = async (req, res, next) => {
  try {
    // Find all victim records for this citizen
    const victims = await Victim.find({ userId: req.user._id });
    if (!victims.length) {
      return successResponse(res, 200, 'No registrations found', {
        distributions: [],
      });
    }

    const victimIds = victims.map((v) => v._id);

    const distributions = await Distribution.find({
      victimId: { $in: victimIds },
    })
      .populate('victimId', 'name priorityScore')
      .populate('itemId', 'itemName category unit')
      .populate('disasterId', 'title location type')
      .populate('assignedVolunteerId', 'name phone')
      .populate('statusHistory.changedBy', 'name role')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Your distribution tracking fetched', {
      count: distributions.length,
      distributions,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   DELETE /api/distributions/:id
// @access  Private (admin only)
// @desc    Cancel a distribution and restore stock
//          Only allowed if status is Submitted or Verified
// ─────────────────────────────────────────
const cancelDistribution = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const distribution = await Distribution.findById(req.params.id)
      .populate('victimId', 'name userId')
      .populate('itemId', 'itemName unit');

    if (!distribution) {
      return errorResponse(res, 404, 'Distribution not found');
    }

    // Only cancel early-stage distributions
    const cancellableStatuses = ['Submitted', 'Verified'];
    if (!cancellableStatuses.includes(distribution.status)) {
      return errorResponse(
        res, 400,
        `Cannot cancel a distribution with status: ${distribution.status}. Only Submitted or Verified distributions can be cancelled.`
      );
    }

    // ── Restore stock ──
    await Inventory.findByIdAndUpdate(distribution.itemId._id, {
      $inc: {
        quantity: distribution.quantity,
        totalDistributed: -distribution.quantity,
      },
    });

    // Move to Closed with a cancel note
    distribution.status = 'Closed';
    distribution.statusHistory.push({
      stage: 'Closed',
      changedBy: req.user._id,
      note: `Cancelled by admin. Reason: ${reason || 'No reason provided'}`,
    });
    await distribution.save();

    // Notify citizen
    await Notification.create({
      recipientId: distribution.victimId.userId,
      type: 'status_update',
      title: 'Distribution Cancelled',
      message: `Your distribution of ${distribution.itemId.itemName} has been cancelled. ${reason ? 'Reason: ' + reason : ''}`,
      relatedId: distribution._id,
      relatedCollection: 'Distribution',
    });

    await logAction(
      `Cancelled distribution of ${distribution.itemId.itemName} for ${distribution.victimId.name}`,
      req.user._id,
      distribution._id,
      'Distribution',
      { reason, restoredQuantity: distribution.quantity },
      req
    );

    return successResponse(res, 200, 'Distribution cancelled and stock restored', {
      distribution,
      restoredQuantity: distribution.quantity,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/distributions/stats/:disasterId
// @access  Private (admin only)
// @desc    Get distribution statistics for a disaster
// ─────────────────────────────────────────
const getDistributionStats = async (req, res, next) => {
  try {
    const disaster = await DisasterEvent.findById(req.params.disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    // Run all aggregations in parallel
    const [statusBreakdown, dailyDeliveries, topVolunteers, itemBreakdown] =
      await Promise.all([

        // Count by status
        Distribution.aggregate([
          { $match: { disasterId: disaster._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Deliveries per day (last 14 days)
        Distribution.aggregate([
          {
            $match: {
              disasterId: disaster._id,
              status: 'Delivered',
              deliveredAt: {
                $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt' },
              },
              count: { $sum: 1 },
              totalQuantity: { $sum: '$quantity' },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Top performing volunteers
        Distribution.aggregate([
          {
            $match: {
              disasterId: disaster._id,
              status: 'Delivered',
              assignedVolunteerId: { $exists: true },
            },
          },
          {
            $group: {
              _id: '$assignedVolunteerId',
              deliveriesCompleted: { $sum: 1 },
              totalQuantityDelivered: { $sum: '$quantity' },
            },
          },
          { $sort: { deliveriesCompleted: -1 } },
          { $limit: 5 },
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
              volunteerPhone: '$volunteer.phone',
              deliveriesCompleted: 1,
              totalQuantityDelivered: 1,
            },
          },
        ]),

        // Distribution breakdown by item category
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
              _id: '$item.category',
              totalDistributions: { $sum: 1 },
              totalQuantity: { $sum: '$quantity' },
            },
          },
          { $sort: { totalDistributions: -1 } },
        ]),
      ]);

    return successResponse(res, 200, 'Distribution stats fetched successfully', {
      disaster: { title: disaster.title, location: disaster.location },
      statusBreakdown,
      dailyDeliveries,
      topVolunteers,
      itemBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDistribution,
  getAllDistributions,
  getDistributionById,
  getDistributionsByVictim,
  updateDistributionStatus,
  assignVolunteer,
  getMyTasks,
  getMyTracking,
  cancelDistribution,
  getDistributionStats,
};