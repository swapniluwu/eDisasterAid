const User = require('../models/User');
const Distribution = require('../models/Distribution');
const DisasterEvent = require('../models/DisasterEvent');
const Notification = require('../models/Notification');
const { logAction } = require('../utils/auditLogger');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ─────────────────────────────────────────
// @route   GET /api/volunteers
// @access  Private (admin only)
// @desc    Get all volunteers with optional filters
// ─────────────────────────────────────────
const getAllVolunteers = async (req, res, next) => {
  try {
    const { region, skillTags, isActive, search } = req.query;

    const filter = { role: 'volunteer' };
    if (region) filter.region = { $regex: region, $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (skillTags) {
      const tags = skillTags.split(',');
      filter.skillTags = { $in: tags };
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const volunteers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    // Attach task count to each volunteer
    const volunteersWithStats = await Promise.all(
      volunteers.map(async (vol) => {
        const [totalTasks, completedTasks, pendingTasks] = await Promise.all([
          Distribution.countDocuments({ assignedVolunteerId: vol._id }),
          Distribution.countDocuments({
            assignedVolunteerId: vol._id,
            status: 'Delivered',
          }),
          Distribution.countDocuments({
            assignedVolunteerId: vol._id,
            status: { $in: ['Assigned', 'Dispatched'] },
          }),
        ]);
        return {
          ...vol.toObject(),
          stats: { totalTasks, completedTasks, pendingTasks },
        };
      })
    );

    return successResponse(res, 200, 'Volunteers fetched successfully', {
      count: volunteers.length,
      volunteers: volunteersWithStats,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/volunteers/:id
// @access  Private (admin only)
// @desc    Get a single volunteer with full task history
// ─────────────────────────────────────────
const getVolunteerById = async (req, res, next) => {
  try {
    const volunteer = await User.findOne({
      _id: req.params.id,
      role: 'volunteer',
    }).select('-password');

    if (!volunteer) {
      return errorResponse(res, 404, 'Volunteer not found');
    }

    // Full task history for this volunteer
    const tasks = await Distribution.find({
      assignedVolunteerId: volunteer._id,
    })
      .populate('victimId', 'name phone address')
      .populate('itemId', 'itemName category unit')
      .populate('disasterId', 'title location')
      .sort({ createdAt: -1 });

    const stats = {
      totalTasks: tasks.length,
      delivered: tasks.filter((t) => t.status === 'Delivered').length,
      dispatched: tasks.filter((t) => t.status === 'Dispatched').length,
      assigned: tasks.filter((t) => t.status === 'Assigned').length,
    };

    return successResponse(res, 200, 'Volunteer fetched successfully', {
      volunteer,
      stats,
      tasks,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/volunteers/:id/zone
// @access  Private (admin only)
// @desc    Assign a geographic zone to a volunteer
// ─────────────────────────────────────────
const assignZone = async (req, res, next) => {
  try {
    const { region } = req.body;

    if (!region || !region.trim()) {
      return errorResponse(res, 400, 'Region/zone is required');
    }

    const volunteer = await User.findOne({
      _id: req.params.id,
      role: 'volunteer',
    });

    if (!volunteer) {
      return errorResponse(res, 404, 'Volunteer not found');
    }

    if (!volunteer.isActive) {
      return errorResponse(res, 400, 'Cannot assign zone to an inactive volunteer');
    }

    const previousRegion = volunteer.region;
    volunteer.region = region.trim();
    await volunteer.save();

    // Notify the volunteer
    await Notification.create({
      recipientId: volunteer._id,
      type: 'general',
      title: 'Zone Assignment Updated',
      message: `You have been assigned to the ${region} zone. Please report for duties in this area.`,
    });

    await logAction(
      `Assigned zone to volunteer ${volunteer.name}: ${previousRegion || 'None'} → ${region}`,
      req.user._id,
      volunteer._id,
      'User',
      { previousRegion, newRegion: region },
      req
    );

    return successResponse(res, 200, 'Zone assigned successfully', {
      volunteer: {
        id: volunteer._id,
        name: volunteer.name,
        email: volunteer.email,
        region: volunteer.region,
        skillTags: volunteer.skillTags,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/volunteers/:id/skills
// @access  Private (admin only)
// @desc    Update skill tags for a volunteer
// ─────────────────────────────────────────
const updateSkillTags = async (req, res, next) => {
  try {
    const { skillTags } = req.body;

    const validSkills = ['medical', 'logistics', 'driving', 'food', 'rescue', 'communication'];

    if (!Array.isArray(skillTags)) {
      return errorResponse(res, 400, 'skillTags must be an array');
    }

    const invalidSkills = skillTags.filter((s) => !validSkills.includes(s));
    if (invalidSkills.length > 0) {
      return errorResponse(
        res, 400,
        `Invalid skills: ${invalidSkills.join(', ')}. Valid options: ${validSkills.join(', ')}`
      );
    }

    const volunteer = await User.findOne({
      _id: req.params.id,
      role: 'volunteer',
    });

    if (!volunteer) {
      return errorResponse(res, 404, 'Volunteer not found');
    }

    volunteer.skillTags = skillTags;
    await volunteer.save();

    await logAction(
      `Updated skills for volunteer ${volunteer.name}`,
      req.user._id,
      volunteer._id,
      'User',
      { skillTags },
      req
    );

    return successResponse(res, 200, 'Skill tags updated successfully', {
      volunteer: {
        id: volunteer._id,
        name: volunteer.name,
        skillTags: volunteer.skillTags,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/volunteers/available/:disasterId
// @access  Private (admin only)
// @desc    Get volunteers available for a disaster
//          — filters by region matching disaster location
//          — shows current workload per volunteer
// ─────────────────────────────────────────
const getAvailableVolunteers = async (req, res, next) => {
  try {
    const disaster = await DisasterEvent.findById(req.params.disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    const volunteers = await User.find({
      role: 'volunteer',
      isActive: true,
    }).select('-password');

    // Attach current workload — pending tasks in this disaster
    const volunteersWithLoad = await Promise.all(
      volunteers.map(async (vol) => {
        const pendingTasks = await Distribution.countDocuments({
          assignedVolunteerId: vol._id,
          disasterId: disaster._id,
          status: { $in: ['Assigned', 'Dispatched'] },
        });
        const completedTasks = await Distribution.countDocuments({
          assignedVolunteerId: vol._id,
          disasterId: disaster._id,
          status: 'Delivered',
        });
        return {
          ...vol.toObject(),
          currentWorkload: pendingTasks,
          completedInThisDisaster: completedTasks,
          // Volunteers in matching region are recommended
          isRecommended: vol.region &&
            disaster.location.toLowerCase().includes(vol.region.toLowerCase()),
        };
      })
    );

    // Sort: recommended first, then by lowest workload
    volunteersWithLoad.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return a.currentWorkload - b.currentWorkload;
    });

    return successResponse(res, 200, 'Available volunteers fetched', {
      disaster: { title: disaster.title, location: disaster.location },
      count: volunteersWithLoad.length,
      volunteers: volunteersWithLoad,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/volunteers/my-dashboard
// @access  Private (volunteer only)
// @desc    Volunteer's personal dashboard stats
// ─────────────────────────────────────────
const getMyDashboard = async (req, res, next) => {
  try {
    const volunteerId = req.user._id;

    const [allTasks, notifications] = await Promise.all([
      Distribution.find({ assignedVolunteerId: volunteerId })
        .populate('victimId', 'name phone address familySize')
        .populate('itemId', 'itemName category unit')
        .populate('disasterId', 'title location status')
        .sort({ createdAt: -1 }),

      Notification.find({
        recipientId: volunteerId,
        isRead: false,
      })
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const stats = {
      totalAssigned: allTasks.length,
      pending: allTasks.filter((t) => t.status === 'Assigned').length,
      inProgress: allTasks.filter((t) => t.status === 'Dispatched').length,
      completed: allTasks.filter((t) => t.status === 'Delivered').length,
      unreadNotifications: notifications.length,
    };

    // Split tasks by status for dashboard sections
    const pendingTasks = allTasks.filter((t) =>
      ['Assigned', 'Dispatched'].includes(t.status)
    );
    const completedTasks = allTasks.filter((t) => t.status === 'Delivered');

    return successResponse(res, 200, 'Dashboard data fetched', {
      volunteer: {
        name: req.user.name,
        region: req.user.region,
        skillTags: req.user.skillTags,
      },
      stats,
      pendingTasks,
      completedTasks,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/volunteers/my-tasks
// @access  Private (volunteer only)
// @desc    Get tasks with status filter
// ─────────────────────────────────────────
const getMyTasks = async (req, res, next) => {
  try {
    const { status, disasterId } = req.query;

    const filter = { assignedVolunteerId: req.user._id };
    if (status) filter.status = status;
    if (disasterId) filter.disasterId = disasterId;

    const tasks = await Distribution.find(filter)
      .populate('victimId', 'name phone address familySize requiredItems')
      .populate('itemId', 'itemName category unit')
      .populate('disasterId', 'title location type')
      .sort({ createdAt: -1 });

    return successResponse(res, 200, 'Tasks fetched successfully', {
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllVolunteers,
  getVolunteerById,
  assignZone,
  updateSkillTags,
  getAvailableVolunteers,
  getMyDashboard,
  getMyTasks,
};