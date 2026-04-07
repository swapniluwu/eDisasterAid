const express = require('express');
const { body } = require('express-validator');
const {
  logDonation,
  getMyDonations,
  getDonationsByDisaster,
  getDonationReceipt,
  confirmDonationArrival,
} = require('../controllers/donationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// ─── Validation rules ───
const donationValidation = [
  body('disasterId')
    .notEmpty().withMessage('Disaster ID is required')
    .isMongoId().withMessage('Invalid disaster ID'),

  body('itemName')
    .trim()
    .notEmpty().withMessage('Item name is required')
    .isLength({ max: 100 }).withMessage('Item name cannot exceed 100 characters'),

  body('category')
    .optional()
    .isIn(['food', 'water', 'medicine', 'clothing', 'shelter', 'hygiene', 'other'])
    .withMessage('Invalid category'),

  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 1 }).withMessage('Quantity must be at least 1'),

  body('unit')
    .notEmpty().withMessage('Unit is required')
    .isIn(['kg', 'litre', 'piece', 'box', 'packet', 'bottle'])
    .withMessage('Unit must be one of: kg, litre, piece, box, packet, bottle'),

  body('expiryDate')
    .optional()
    .isISO8601().withMessage('Expiry date must be a valid date'),

  body('estimatedArrival')
    .optional()
    .isISO8601().withMessage('Estimated arrival must be a valid date'),
];

const confirmArrivalValidation = [
  body('arrivedQuantity')
    .notEmpty().withMessage('Arrived quantity is required')
    .isFloat({ min: 1 }).withMessage('Arrived quantity must be at least 1'),
];

// All routes require login
router.use(protect);

// ─── Routes ───

// NGO routes
router.post('/', authorize('ngo'), donationValidation, logDonation);
router.get('/my-donations', authorize('ngo'), getMyDonations);
router.get('/receipt/:itemId', authorize('ngo', 'admin'), getDonationReceipt);

// Admin routes
router.get('/disaster/:disasterId', authorize('admin'), getDonationsByDisaster);
router.patch('/confirm/:itemId', authorize('admin'), confirmArrivalValidation, confirmDonationArrival);

module.exports = router;