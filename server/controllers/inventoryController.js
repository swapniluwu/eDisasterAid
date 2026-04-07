const { validationResult } = require('express-validator');
const Inventory = require('../models/Inventory');
const DisasterEvent = require('../models/DisasterEvent');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { logAction } = require('../utils/auditLogger');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ─────────────────────────────────────────
// @route   POST /api/inventory
// @access  Private (admin only)
// @desc    Add a new inventory item for a disaster
// ─────────────────────────────────────────
const addInventoryItem = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Validation failed', errors.array());
    }

    const {
      disasterId,
      itemName,
      category,
      quantity,
      unit,
      donorId,
      expiryDate,
      lowStockThreshold,
    } = req.body;

    // Verify disaster exists and is active
    const disaster = await DisasterEvent.findById(disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }
    if (disaster.status === 'closed') {
      return errorResponse(res, 400, 'Cannot add inventory to a closed disaster');
    }

    // If donorId provided, verify the user is an NGO
    if (donorId) {
      const donor = await User.findById(donorId);
      if (!donor || donor.role !== 'ngo') {
        return errorResponse(res, 400, 'Donor must be a registered NGO user');
      }
    }

    const item = await Inventory.create({
      disasterId,
      itemName,
      category: category || 'other',
      quantity,
      unit,
      donorId: donorId || null,
      expiryDate: expiryDate || null,
      lowStockThreshold: lowStockThreshold || 10,
    });

    await logAction(
      `Added inventory item: ${itemName} (${quantity} ${unit})`,
      req.user._id,
      item._id,
      'Inventory',
      { disasterId, quantity, unit, category },
      req
    );

    return successResponse(res, 201, 'Inventory item added successfully', { item });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/inventory/:disasterId
// @access  Private (admin, ngo)
// @desc    Get all inventory for a disaster
// ─────────────────────────────────────────
const getInventoryByDisaster = async (req, res, next) => {
  try {
    const { category, lowStock, expired, search } = req.query;

    // Verify disaster exists
    const disaster = await DisasterEvent.findById(req.params.disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    const filter = {
      disasterId: req.params.disasterId,
      isActive: true,
    };

    if (category) filter.category = category;
    if (search) {
      filter.itemName = { $regex: search, $options: 'i' };
    }

    let items = await Inventory.find(filter)
      .populate('donorId', 'name email')
      .populate('disasterId', 'title location')
      .sort({ createdAt: -1 });

    // Filter low stock items in JS using the virtual field
    if (lowStock === 'true') {
      items = items.filter((item) => item.isLowStock);
    }

    // Filter expired items using the virtual field
    if (expired === 'true') {
      items = items.filter((item) => item.isExpired);
    }

    // Build summary stats
    const summary = {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      lowStockCount: items.filter((item) => item.isLowStock).length,
      expiredCount: items.filter((item) => item.isExpired).length,
      byCategory: {},
    };

    // Group quantities by category for dashboard
    items.forEach((item) => {
      if (!summary.byCategory[item.category]) {
        summary.byCategory[item.category] = { count: 0, totalQuantity: 0 };
      }
      summary.byCategory[item.category].count += 1;
      summary.byCategory[item.category].totalQuantity += item.quantity;
    });

    return successResponse(res, 200, 'Inventory fetched successfully', {
      disaster: { title: disaster.title, location: disaster.location },
      summary,
      items,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/inventory/item/:id
// @access  Private (admin, ngo)
// @desc    Get a single inventory item by ID
// ─────────────────────────────────────────
const getInventoryItemById = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .populate('donorId', 'name email')
      .populate('disasterId', 'title location status');

    if (!item || !item.isActive) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    return successResponse(res, 200, 'Inventory item fetched successfully', { item });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/inventory/item/:id
// @access  Private (admin only)
// @desc    Update an inventory item (quantity, threshold, expiry)
// ─────────────────────────────────────────
const updateInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item || !item.isActive) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    const allowedUpdates = [
      'itemName', 'category', 'quantity', 'unit',
      'expiryDate', 'lowStockThreshold', 'donorId',
    ];

    const before = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        before[field] = item[field];
        item[field] = req.body[field];
      }
    });

    // Quantity cannot go negative
    if (item.quantity < 0) {
      return errorResponse(res, 400, 'Quantity cannot be negative');
    }

    await item.save();

    // Check if stock is now low after update — notify admin
    if (item.isLowStock) {
      await sendLowStockAlert(item);
    }

    await logAction(
      `Updated inventory item: ${item.itemName}`,
      req.user._id,
      item._id,
      'Inventory',
      { before, after: req.body },
      req
    );

    return successResponse(res, 200, 'Inventory item updated successfully', { item });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/inventory/item/:id/restock
// @access  Private (admin only)
// @desc    Add more stock to an existing item
// ─────────────────────────────────────────
const restockItem = async (req, res, next) => {
  try {
    const { quantity, donorId, notes } = req.body;

    if (!quantity || quantity <= 0) {
      return errorResponse(res, 400, 'Restock quantity must be greater than 0');
    }

    const item = await Inventory.findById(req.params.id);
    if (!item || !item.isActive) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    const previousQuantity = item.quantity;
    item.quantity += quantity;

    // Update donor if a new one is provided with the restock
    if (donorId) item.donorId = donorId;

    await item.save();

    await logAction(
      `Restocked: ${item.itemName} +${quantity} ${item.unit} (${previousQuantity} → ${item.quantity})`,
      req.user._id,
      item._id,
      'Inventory',
      { previousQuantity, addedQuantity: quantity, newQuantity: item.quantity, notes },
      req
    );

    return successResponse(res, 200, 'Item restocked successfully', {
      item,
      addedQuantity: quantity,
      previousQuantity,
      newQuantity: item.quantity,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   DELETE /api/inventory/item/:id
// @access  Private (admin only)
// @desc    Soft delete an inventory item
// ─────────────────────────────────────────
const deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item || !item.isActive) {
      return errorResponse(res, 404, 'Inventory item not found');
    }

    // Soft delete — mark inactive instead of removing
    item.isActive = false;
    await item.save();

    await logAction(
      `Removed inventory item: ${item.itemName}`,
      req.user._id,
      item._id,
      'Inventory',
      { itemName: item.itemName, quantity: item.quantity },
      req
    );

    return successResponse(res, 200, 'Inventory item removed successfully');
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/inventory/alerts/:disasterId
// @access  Private (admin only)
// @desc    Get all low stock and expired items for a disaster
// ─────────────────────────────────────────
const getStockAlerts = async (req, res, next) => {
  try {
    const disaster = await DisasterEvent.findById(req.params.disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    const items = await Inventory.find({
      disasterId: req.params.disasterId,
      isActive: true,
    }).populate('donorId', 'name email');

    const lowStockItems = items.filter((item) => item.isLowStock);
    const expiredItems = items.filter((item) => item.isExpired);

    // Items expiring in the next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringSoon = items.filter(
      (item) =>
        item.expiryDate &&
        item.expiryDate <= sevenDaysFromNow &&
        item.expiryDate > new Date()
    );

    return successResponse(res, 200, 'Stock alerts fetched successfully', {
      lowStockItems,
      expiredItems,
      expiringSoon,
      counts: {
        lowStock: lowStockItems.length,
        expired: expiredItems.length,
        expiringSoon: expiringSoon.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// Internal helper — sends low stock notification to all admins
// Called after any stock deduction or manual update
// ─────────────────────────────────────────
const sendLowStockAlert = async (item) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true });

    const notifications = admins.map((admin) => ({
      recipientId: admin._id,
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `${item.itemName} is running low. Only ${item.quantity} ${item.unit} remaining (threshold: ${item.lowStockThreshold}).`,
      relatedId: item._id,
      relatedCollection: 'Inventory',
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    // Never crash the main flow for a notification failure
    console.error('Low stock notification error:', error.message);
  }
};

// Export the helper so donation controller can use it too
module.exports = {
  addInventoryItem,
  getInventoryByDisaster,
  getInventoryItemById,
  updateInventoryItem,
  restockItem,
  deleteInventoryItem,
  getStockAlerts,
  sendLowStockAlert,
};