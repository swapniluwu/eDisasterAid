const express = require('express');
const { body } = require('express-validator');
const {
  createDisaster,
  getAllDisasters,
  getDisasterById,
  updateDisaster,
  updateDisasterStatus,
  getDisasterSummary,
} = require('../controllers/disasterController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// ─── Validation rules ───
const createDisasterValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),

  body('type')
    .notEmpty().withMessage('Type is required')
    .isIn(['flood', 'earthquake', 'cyclone', 'fire', 'landslide', 'drought', 'other'])
    .withMessage('Invalid disaster type'),

  body('location')
    .trim()
    .notEmpty().withMessage('Location is required'),

  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be low, medium, high, or critical'),

  body('coordinates.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('coordinates.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];

// All routes require login
router.use(protect);

// ─── Routes ───
router.get('/', getAllDisasters);
router.get('/:id', getDisasterById);
router.get('/:id/summary', authorize('admin', 'ngo'), getDisasterSummary);

router.post('/', authorize('admin'), createDisasterValidation, createDisaster);
router.patch('/:id', authorize('admin'), createDisasterValidation, updateDisaster);
router.patch('/:id/status', authorize('admin'), updateDisasterStatus);

module.exports = router;