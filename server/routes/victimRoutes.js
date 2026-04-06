const express = require('express');
const { body } = require('express-validator');
const {
  registerVictim,
  getAllVictims,
  getMyRegistrations,
  getVictimById,
  getPriorityQueue,
  verifyVictim,
  rescoreVictim,
} = require('../controllers/victimController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// ─── Validation rules ───
const registerVictimValidation = [
  body('disasterId')
    .notEmpty().withMessage('Disaster ID is required')
    .isMongoId().withMessage('Invalid disaster ID'),

  body('name')
    .trim()
    .notEmpty().withMessage('Name is required'),

  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),

  body('address')
    .trim()
    .notEmpty().withMessage('Address is required'),

  body('familySize')
    .notEmpty().withMessage('Family size is required')
    .isInt({ min: 1, max: 50 }).withMessage('Family size must be between 1 and 50'),

  body('severity')
    .notEmpty().withMessage('Severity is required')
    .isInt({ min: 1, max: 5 }).withMessage('Severity must be between 1 and 5'),

  body('hasElderly')
    .optional()
    .isBoolean().withMessage('hasElderly must be true or false'),

  body('hasChildren')
    .optional()
    .isBoolean().withMessage('hasChildren must be true or false'),

  body('requiredItems')
    .optional()
    .isArray().withMessage('Required items must be an array'),
];

// All routes require login
router.use(protect);

// ─── Routes ───

// Citizen routes
router.post('/register', authorize('citizen'), registerVictimValidation, registerVictim);
router.get('/my-registrations', authorize('citizen'), getMyRegistrations);

// Admin routes
router.get('/', authorize('admin'), getAllVictims);
router.get('/priority/:disasterId', authorize('admin'), getPriorityQueue);
router.patch('/:id/verify', authorize('admin'), verifyVictim);
router.patch('/:id/rescore', authorize('admin'), rescoreVictim);

// Admin + citizen (own record)
router.get('/:id', authorize('admin', 'citizen'), getVictimById);

module.exports = router;