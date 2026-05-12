const { validationResult } = require('express-validator');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const AUTH_TOKEN_COOKIE = 'eDisasterAidToken';

const getAuthCookieOptions = () => {
  const options = [
    `${AUTH_TOKEN_COOKIE}=%s`,
    'Max-Age=604800',
    'Path=/',
    'SameSite=Lax',
  ];

  if (process.env.NODE_ENV === 'production') {
    options.push('Secure');
  }

  return options;
};

const setAuthCookie = (res, token) => {
  const cookieParts = getAuthCookieOptions();
  cookieParts[0] = cookieParts[0].replace('%s', encodeURIComponent(token));
  res.setHeader('Set-Cookie', cookieParts.join('; '));
};

// ─────────────────────────────────────────
// @route   POST /api/auth/register
// @access  Public
// @desc    Register a new user
// ─────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    // Check express-validator results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { name, email, password, role, phone, region, skillTags } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 400, 'An account with this email already exists');
    }

    // Build user object — only include skillTags if role is volunteer
    const userData = { name, email, password, role, phone, region };
    if (role === 'volunteer' && skillTags) {
      userData.skillTags = skillTags;
    }

    const user = await User.create(userData);

    // Generate JWT for immediate login after register
    const token = generateToken(user._id, user.role);
    setAuthCookie(res, token);

    return successResponse(res, 201, 'Account created successfully', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        region: user.region,
        skillTags: user.skillTags,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   POST /api/auth/login
// @access  Public
// @desc    Login user, return JWT
// ─────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { email, password } = req.body;

    // Find user AND include password (select: false by default)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    // Check account is active
    if (!user.isActive) {
      return errorResponse(res, 401, 'Your account has been deactivated. Contact admin.');
    }

    // Compare password using instance method
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    const token = generateToken(user._id, user.role);
    setAuthCookie(res, token);

    return successResponse(res, 200, 'Login successful', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        region: user.region,
        skillTags: user.skillTags,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/auth/me
// @access  Private (all roles)
// @desc    Get currently logged-in user
// ─────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    // req.user is set by authMiddleware after JWT verification
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'User fetched successfully', { user });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/auth/users
// @access  Private (admin only)
// @desc    Get all users — for admin user management
// ─────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive, search } = req.query;

    // Build dynamic filter
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    return successResponse(res, 200, 'Users fetched successfully', {
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/auth/users/:id/toggle
// @access  Private (admin only)
// @desc    Activate or deactivate a user account
// ─────────────────────────────────────────
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return errorResponse(res, 400, 'You cannot deactivate your own account');
    }

    user.isActive = !user.isActive;
    await user.save();

    return successResponse(
      res,
      200,
      `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      { user }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, getAllUsers, toggleUserStatus };