const express = require('express');
const { body } = require('express-validator');
const {
  addInventoryItem,
  getInventoryByDisaster,
  getInventoryItemById,
  updateInventoryItem,
  restockItem,
  deleteInventoryItem,
  getStockAlerts,
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// ─── Validation rules ───
const addItemValidation = [
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
    .isFloat({ min: 0 }).withMessage('Quantity must be 0 or greater'),

  body('unit')
    .notEmpty().withMessage('Unit is required')
    .isIn(['kg', 'litre', 'piece', 'box', 'packet', 'bottle'])
    .withMessage('Unit must be one of: kg, litre, piece, box, packet, bottle'),

  body('lowStockThreshold')
    .optional()
    .isFloat({ min: 0 }).withMessage('Low stock threshold must be 0 or greater'),

  body('expiryDate')
    .optional()
    .isISO8601().withMessage('Expiry date must be a valid date'),
];

const restockValidation = [
  body('quantity')
    .notEmpty().withMessage('Restock quantity is required')
    .isFloat({ min: 1 }).withMessage('Restock quantity must be at least 1'),
];

// All routes require login
router.use(protect);

// ─── Routes ───
router.post('/', authorize('admin'), addItemValidation, addInventoryItem);
router.get('/alerts/:disasterId', authorize('admin'), getStockAlerts);
router.get('/:disasterId', authorize('admin', 'ngo'), getInventoryByDisaster);
router.get('/item/:id', authorize('admin', 'ngo'), getInventoryItemById);
router.patch('/item/:id', authorize('admin'), updateInventoryItem);
router.patch('/item/:id/restock', authorize('admin'), restockValidation, restockItem);
router.delete('/item/:id', authorize('admin'), deleteInventoryItem);

module.exports = router;