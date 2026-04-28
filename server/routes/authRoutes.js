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



module.exports = router;