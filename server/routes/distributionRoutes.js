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
const { body } = require('express-validator');
const {
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
} = require('../controllers/distributionController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

const createDistributionValidation = [
  body('victimId')
    .notEmpty().withMessage('Victim ID is required')
    .isMongoId().withMessage('Invalid victim ID'),
  body('itemId')
    .notEmpty().withMessage('Item ID is required')
    .isMongoId().withMessage('Invalid item ID'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('disasterId')
    .notEmpty().withMessage('Disaster ID is required')
    .isMongoId().withMessage('Invalid disaster ID'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

const statusUpdateValidation = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['Submitted','Verified','Approved','Assigned','Dispatched','Delivered','Closed'])
    .withMessage('Invalid status value'),
  body('note')
    .optional()
    .isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),
];

const assignVolunteerValidation = [
  body('volunteerId')
    .notEmpty().withMessage('Volunteer ID is required')
    .isMongoId().withMessage('Invalid volunteer ID'),
];

router.use(protect);

// ── SPECIFIC named routes FIRST — order is critical ──
// These must come before /:id or Express matches /:id first

router.get('/my-tasks',    authorize('volunteer'), getMyTasks);
router.get('/my-tracking', authorize('citizen'),   getMyTracking);

router.get('/stats/:disasterId',  authorize('admin'),            getDistributionStats);
router.get('/victim/:victimId',   authorize('admin','citizen'),  getDistributionsByVictim);

// ── General collection routes ──
router.get('/',  authorize('admin'),                        getAllDistributions);
router.post('/', authorize('admin'), createDistributionValidation, createDistribution);

// ── ID-based routes LAST ──
router.get('/:id',          authorize('admin','volunteer','citizen'), getDistributionById);
router.patch('/:id/status', authorize('admin','volunteer'), statusUpdateValidation, updateDistributionStatus);
router.patch('/:id/assign', authorize('admin'),             assignVolunteerValidation, assignVolunteer);
router.delete('/:id',       authorize('admin'),             cancelDistribution);

module.exports = router;