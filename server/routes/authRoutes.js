// const express = require('express');
// const { body } = require('express-validator');
// const {
//   register,
//   login,
//   getMe,
//   getAllUsers,
//   toggleUserStatus,
// } = require('../controllers/authController');
// const { protect } = require('../middleware/authMiddleware');
// const { authorize } = require('../middleware/roleMiddleware');

// const router = express.Router();

// // ─── Validation rules ───
// const registerValidation = [
//   body('name')
//     .trim()
//     .notEmpty().withMessage('Name is required')
//     .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

//   body('email')
//     .trim()
//     .notEmpty().withMessage('Email is required')
//     .isEmail().withMessage('Please provide a valid email'),

//   body('password')
//     .notEmpty().withMessage('Password is required')
//     .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

//   body('role')
//     .optional()
//     .isIn(['citizen', 'volunteer', 'ngo', 'admin'])
//     .withMessage('Role must be one of: citizen, volunteer, ngo, admin'),

//   body('phone')
//     .optional()
//     .matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),
// ];

// const loginValidation = [
//   body('email')
//     .trim()
//     .notEmpty().withMessage('Email is required')
//     .isEmail().withMessage('Please provide a valid email'),

//   body('password')
//     .notEmpty().withMessage('Password is required'),
// ];

// // ─── Public Routes ───
// router.post('/register', registerValidation, register);
// router.post('/login', loginValidation, login);

// // ─── Protected Routes ───
// router.get('/me', protect, getMe);
// router.get('/users', protect, authorize('admin'), getAllUsers);
// router.patch('/users/:id/toggle', protect, authorize('admin'), toggleUserStatus);

// module.exports = router;
const { errorResponse, successResponse } = require('../utils/apiResponse');
const User = require('../models/User');

const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  register,
  login,
  getMe,
  getAllUsers,
  toggleUserStatus,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// ─── Validation rules defined as plain arrays ───
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('role')
    .optional()
    .isIn(['citizen', 'volunteer', 'ngo', 'admin'])
    .withMessage('Role must be one of: citizen, volunteer, ngo, admin'),

  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ─── Public Routes ───
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// ─── Protected Routes ───
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.patch('/users/:id/toggle', protect, authorize('admin'), toggleUserStatus);

// ─── Profile update routes ───
router.patch('/profile', protect, async (req, res, next) => {
  try {
    const { name, phone, region, skillTags } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return errorResponse(res, 404, 'User not found');
    if (name)  user.name  = name;
    if (phone) user.phone = phone;
    if (region !== undefined) user.region = region;
    if (skillTags && user.role === 'volunteer') user.skillTags = skillTags;
    await user.save();
    return successResponse(res, 200, 'Profile updated', { user });
  } catch (err) { next(err); }
});

router.patch('/change-password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, 'Both current and new password are required');
    }
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return errorResponse(res, 401, 'Current password is incorrect');
    user.password = newPassword;
    await user.save();
    return successResponse(res, 200, 'Password changed successfully');
  } catch (err) { next(err); }
});

module.exports = router;