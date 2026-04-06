const { validationResult } = require('express-validator');
const Victim = require('../models/Victim');
const DisasterEvent = require('../models/DisasterEvent');
const Notification = require('../models/Notification');
const { calculatePriorityScore } = require('../utils/priorityEngine');
const { logAction } = require('../utils/auditLogger');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ─────────────────────────────────────────
// @route   POST /api/victims/register
// @access  Private (citizen only)
// @desc    Register as a victim under an active disaster
// ─────────────────────────────────────────
const registerVictim = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Validation failed', errors.array());
    }

    const {
      disasterId, name, phone, address, familySize,
      severity, hasElderly, hasChildren, hasDisabled, requiredItems,
    } = req.body;

    // Check the disaster exists and is active
    const disaster = await DisasterEvent.findById(disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }
    if (disaster.status !== 'active') {
      return errorResponse(res, 400, 'You can only register under an active disaster');
    }

    // Check if this citizen already registered for this disaster
    const existingRegistration = await Victim.findOne({
      userId: req.user._id,
      disasterId,
    });
    if (existingRegistration) {
      return errorResponse(
        res, 400,
        'You have already registered for this disaster event'
      );
    }

    // Also check by phone — catches attempts to register a family member separately
    const phoneExists = await Victim.findOne({ phone, disasterId });
    if (phoneExists) {
      return errorResponse(
        res, 400,
        'This phone number is already registered for this disaster'
      );
    }

    // Calculate priority score using the formula
    const priorityScore = calculatePriorityScore({
      severity,
      familySize,
      hasElderly: hasElderly || false,
      hasChildren: hasChildren || false,
    });

    const victim = await Victim.create({
      userId: req.user._id,
      disasterId,
      name,
      phone,
      address,
      familySize,
      severity,
      hasElderly: hasElderly || false,
      hasChildren: hasChildren || false,
      hasDisabled: hasDisabled || false,
      requiredItems: requiredItems || [],
      priorityScore,
    });

    // Update the disaster's victim count
    await DisasterEvent.findByIdAndUpdate(disasterId, {
      $inc: { totalVictimsRegistered: 1 },
    });

    return successResponse(res, 201, 'Registration submitted successfully. Pending admin verification.', {
      victim,
      priorityScore,
    });
  } catch (error) {
    // Mongoose duplicate key — the compound index on userId+disasterId
    if (error.code === 11000) {
      return errorResponse(res, 400, 'You have already registered for this disaster');
    }
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/victims
// @access  Private (admin only)
// @desc    Get all victims with filters
// ─────────────────────────────────────────
const getAllVictims = async (req, res, next) => {
  try {
    const { disasterId, status, search, sortBy } = req.query;

    const filter = {};
    if (disasterId) filter.disasterId = disasterId;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    // Default sort: highest priority first
    const sortOptions = {
      priority: { priorityScore: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    };
    const sort = sortOptions[sortBy] || { priorityScore: -1 };

    const victims = await Victim.find(filter)
      .populate('userId', 'name email')
      .populate('disasterId', 'title location')
      .populate('verifiedBy', 'name')
      .sort(sort);

    return successResponse(res, 200, 'Victims fetched successfully', {
      count: victims.length,
      victims,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/victims/my-registrations
// @access  Private (citizen only)
// @desc    Get all registrations for the logged-in citizen
// ─────────────────────────────────────────
const getMyRegistrations = async (req, res, next) => {
  try {
    const victims = await Victim.find({ userId: req.user._id })
      .populate('disasterId', 'title location status type')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Your registrations fetched successfully', {
      count: victims.length,
      victims,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/victims/:id
// @access  Private (admin | citizen — own record only)
// @desc    Get a single victim record
// ─────────────────────────────────────────
const getVictimById = async (req, res, next) => {
  try {
    const victim = await Victim.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('disasterId', 'title location status')
      .populate('verifiedBy', 'name email');

    if (!victim) {
      return errorResponse(res, 404, 'Victim record not found');
    }

    // Citizens can only view their own records
    if (
      req.user.role === 'citizen' &&
      victim.userId._id.toString() !== req.user._id.toString()
    ) {
      return errorResponse(res, 403, 'Not authorized to view this record');
    }

    return successResponse(res, 200, 'Victim record fetched successfully', { victim });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/victims/priority/:disasterId
// @access  Private (admin only)
// @desc    Get priority-sorted verified victims for a disaster
// ─────────────────────────────────────────
const getPriorityQueue = async (req, res, next) => {
  try {
    const disaster = await DisasterEvent.findById(req.params.disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    // Only verified victims enter the queue
    const victims = await Victim.find({
      disasterId: req.params.disasterId,
      status: 'verified',
    })
      .populate('userId', 'name email')
      .sort({ priorityScore: -1 }); // Highest score first

    return successResponse(res, 200, 'Priority queue fetched successfully', {
      disaster: { title: disaster.title, location: disaster.location },
      count: victims.length,
      queue: victims.map((v, index) => ({
        rank: index + 1,
        victimId: v._id,
        name: v.name,
        phone: v.phone,
        address: v.address,
        familySize: v.familySize,
        severity: v.severity,
        hasElderly: v.hasElderly,
        hasChildren: v.hasChildren,
        priorityScore: v.priorityScore,
        requiredItems: v.requiredItems,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/victims/:id/verify
// @access  Private (admin only)
// @desc    Approve or reject a victim registration
// ─────────────────────────────────────────
const verifyVictim = async (req, res, next) => {
  try {
    const { action, adminNotes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return errorResponse(res, 400, 'Action must be either approve or reject');
    }

    const victim = await Victim.findById(req.params.id);
    if (!victim) {
      return errorResponse(res, 404, 'Victim record not found');
    }

    if (victim.status !== 'pending') {
      return errorResponse(
        res, 400,
        `This registration has already been ${victim.status}`
      );
    }

    // Update verification fields
    victim.status = action === 'approve' ? 'verified' : 'rejected';
    victim.isVerified = action === 'approve';
    victim.verifiedBy = req.user._id;
    victim.verifiedAt = new Date();
    if (adminNotes) victim.adminNotes = adminNotes;

    await victim.save();

    // Send in-app notification to the citizen
    const notifType = action === 'approve'
      ? 'registration_approved'
      : 'registration_rejected';

    const notifMessage = action === 'approve'
      ? 'Your registration has been verified. You are now in the relief distribution queue.'
      : `Your registration has been rejected. ${adminNotes ? 'Reason: ' + adminNotes : ''}`;

    await Notification.create({
      recipientId: victim.userId,
      type: notifType,
      title: action === 'approve' ? 'Registration Approved' : 'Registration Rejected',
      message: notifMessage,
      relatedId: victim._id,
      relatedCollection: 'Victim',
    });

    // Audit log
    await logAction(
      `${action === 'approve' ? 'Approved' : 'Rejected'} victim registration: ${victim.name}`,
      req.user._id,
      victim._id,
      'Victim',
      { action, adminNotes },
      req
    );

    return successResponse(
      res, 200,
      `Registration ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      { victim }
    );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/victims/:id/rescore
// @access  Private (admin only)
// @desc    Recalculate priority score after admin adjusts severity
// ─────────────────────────────────────────
const rescoreVictim = async (req, res, next) => {
  try {
    const victim = await Victim.findById(req.params.id);
    if (!victim) {
      return errorResponse(res, 404, 'Victim record not found');
    }

    const { severity } = req.body;

    // Allow admin to correct self-reported severity
    if (severity) {
      if (severity < 1 || severity > 5) {
        return errorResponse(res, 400, 'Severity must be between 1 and 5');
      }
      victim.severity = severity;
    }

    const oldScore = victim.priorityScore;

    // Recalculate with updated values
    victim.priorityScore = calculatePriorityScore({
      severity: victim.severity,
      familySize: victim.familySize,
      hasElderly: victim.hasElderly,
      hasChildren: victim.hasChildren,
    });

    await victim.save();

    await logAction(
      `Rescored victim: ${victim.name} — ${oldScore} → ${victim.priorityScore}`,
      req.user._id,
      victim._id,
      'Victim',
      { oldScore, newScore: victim.priorityScore, severity },
      req
    );

    return successResponse(res, 200, 'Priority score recalculated successfully', {
      victim,
      oldScore,
      newScore: victim.priorityScore,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerVictim,
  getAllVictims,
  getMyRegistrations,
  getVictimById,
  getPriorityQueue,
  verifyVictim,
  rescoreVictim,
};