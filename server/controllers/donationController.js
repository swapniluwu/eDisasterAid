const { validationResult } = require('express-validator');
const Inventory = require('../models/Inventory');
const DisasterEvent = require('../models/DisasterEvent');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendLowStockAlert } = require('./inventoryController');
const { logAction } = require('../utils/auditLogger');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ─── In-memory donation store ───
// We use the Inventory model itself as the source of truth.
// Donations are tracked via a separate sub-document approach
// using a DonationLog embedded approach on Inventory.
// For simplicity and to avoid an extra collection, we track
// donations as inventory additions tagged with donorId + meta.

// ─────────────────────────────────────────
// @route   POST /api/donations
// @access  Private (ngo only)
// @desc    NGO logs a new donation (creates or adds to inventory)
// ─────────────────────────────────────────
const logDonation = async (req, res, next) => {
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
      expiryDate,
      estimatedArrival,
      notes,
    } = req.body;

    // Verify disaster is active
    const disaster = await DisasterEvent.findById(disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }
    if (disaster.status !== 'active') {
      return errorResponse(res, 400, 'Donations can only be made to active disasters');
    }

    // Check if an inventory item with the same name and unit already exists
    // for this disaster and this NGO — if so, restock it instead of creating new
    const existingItem = await Inventory.findOne({
      disasterId,
      itemName: { $regex: new RegExp(`^${itemName}$`, 'i') }, // case-insensitive match
      unit,
      donorId: req.user._id,
      isActive: true,
    });

    let item;
    let isRestock = false;

    if (existingItem) {
      // Restock existing item
      const previousQuantity = existingItem.quantity;
      existingItem.quantity += quantity;
      if (expiryDate) existingItem.expiryDate = expiryDate;
      await existingItem.save();
      item = existingItem;
      isRestock = true;

      await logAction(
        `NGO donation restock: ${itemName} +${quantity} ${unit} by ${req.user.name}`,
        req.user._id,
        item._id,
        'Inventory',
        {
          previousQuantity,
          addedQuantity: quantity,
          newQuantity: item.quantity,
          estimatedArrival,
          notes,
        },
        req
      );
    } else {
      // Create new inventory item linked to this NGO
      item = await Inventory.create({
        disasterId,
        itemName,
        category: category || 'other',
        quantity,
        unit,
        donorId: req.user._id,
        expiryDate: expiryDate || null,
        lowStockThreshold: 10,
      });

      await logAction(
        `NGO donation: ${itemName} (${quantity} ${unit}) by ${req.user.name}`,
        req.user._id,
        item._id,
        'Inventory',
        {
          disasterId,
          quantity,
          unit,
          category,
          estimatedArrival,
          notes,
        },
        req
      );
    }

    // Notify all admins about the new donation
    const admins = await User.find({ role: 'admin', isActive: true });
    const notifications = admins.map((admin) => ({
      recipientId: admin._id,
      type: 'general',
      title: 'New Donation Received',
      message: `${req.user.name} (NGO) donated ${quantity} ${unit} of ${itemName} for ${disaster.title}.`,
      relatedId: item._id,
      relatedCollection: 'Inventory',
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return successResponse(
      res,
      isRestock ? 200 : 201,
      isRestock
        ? `Donation added to existing stock of ${itemName}`
        : `Donation of ${itemName} recorded successfully`,
      {
        item,
        isRestock,
        receipt: {
          donorName: req.user.name,
          donorEmail: req.user.email,
          disasterTitle: disaster.title,
          itemName,
          quantity,
          unit,
          estimatedArrival: estimatedArrival || 'Not specified',
          notes: notes || '',
          loggedAt: new Date().toISOString(),
        },
      }
    );
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/donations/my-donations
// @access  Private (ngo only)
// @desc    Get all donations made by this NGO
// ─────────────────────────────────────────
const getMyDonations = async (req, res, next) => {
  try {
    const { disasterId } = req.query;

    const filter = {
      donorId: req.user._id,
      isActive: true,
    };

    if (disasterId) filter.disasterId = disasterId;

    const donations = await Inventory.find(filter)
      .populate('disasterId', 'title location status type')
      .sort({ createdAt: -1 });

    // Summary for the NGO dashboard
    const summary = {
      totalDonations: donations.length,
      totalQuantityDonated: donations.reduce((sum, d) => sum + d.quantity, 0),
      totalDistributed: donations.reduce((sum, d) => sum + d.totalDistributed, 0),
      byCategory: {},
    };

    donations.forEach((d) => {
      if (!summary.byCategory[d.category]) {
        summary.byCategory[d.category] = {
          itemCount: 0,
          totalQuantity: 0,
          distributed: 0,
        };
      }
      summary.byCategory[d.category].itemCount += 1;
      summary.byCategory[d.category].totalQuantity += d.quantity;
      summary.byCategory[d.category].distributed += d.totalDistributed;
    });

    return successResponse(res, 200, 'Your donations fetched successfully', {
      summary,
      donations,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/donations/disaster/:disasterId
// @access  Private (admin only)
// @desc    Get all donations for a disaster grouped by NGO
// ─────────────────────────────────────────
const getDonationsByDisaster = async (req, res, next) => {
  try {
    const disaster = await DisasterEvent.findById(req.params.disasterId);
    if (!disaster) {
      return errorResponse(res, 404, 'Disaster event not found');
    }

    // Aggregate donations grouped by donor
    const donationsByNGO = await Inventory.aggregate([
      {
        $match: {
          disasterId: disaster._id,
          donorId: { $exists: true, $ne: null },
          isActive: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'donorId',
          foreignField: '_id',
          as: 'donor',
        },
      },
      { $unwind: '$donor' },
      {
        $group: {
          _id: '$donorId',
          donorName: { $first: '$donor.name' },
          donorEmail: { $first: '$donor.email' },
          totalItems: { $sum: 1 },
          totalQuantityDonated: { $sum: '$quantity' },
          totalDistributed: { $sum: '$totalDistributed' },
          items: {
            $push: {
              itemName: '$itemName',
              category: '$category',
              quantity: '$quantity',
              unit: '$unit',
              totalDistributed: '$totalDistributed',
            },
          },
        },
      },
      { $sort: { totalQuantityDonated: -1 } },
    ]);

    return successResponse(res, 200, 'Donations by disaster fetched successfully', {
      disaster: { title: disaster.title, location: disaster.location },
      totalNGOs: donationsByNGO.length,
      donationsByNGO,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/donations/receipt/:itemId
// @access  Private (ngo — own donations only)
// @desc    Get donation receipt for a specific inventory item
// ─────────────────────────────────────────
const getDonationReceipt = async (req, res, next) => {
  try {
    const item = await Inventory.findById(req.params.itemId)
      .populate('donorId', 'name email phone region')
      .populate('disasterId', 'title location type startDate status');

    if (!item) {
      return errorResponse(res, 404, 'Donation record not found');
    }

    // NGO can only view their own receipts
    if (
      req.user.role === 'ngo' &&
      item.donorId._id.toString() !== req.user._id.toString()
    ) {
      return errorResponse(res, 403, 'Not authorized to view this receipt');
    }

    const receipt = {
      receiptId: item._id,
      generatedAt: new Date().toISOString(),
      donor: {
        name: item.donorId?.name,
        email: item.donorId?.email,
        phone: item.donorId?.phone,
        region: item.donorId?.region,
      },
      disaster: {
        title: item.disasterId?.title,
        location: item.disasterId?.location,
        type: item.disasterId?.type,
        startDate: item.disasterId?.startDate,
        status: item.disasterId?.status,
      },
      donation: {
        itemName: item.itemName,
        category: item.category,
        quantityDonated: item.quantity + item.totalDistributed,
        quantityRemaining: item.quantity,
        quantityDistributed: item.totalDistributed,
        unit: item.unit,
        expiryDate: item.expiryDate,
        donatedOn: item.createdAt,
      },
      impactNote: `${item.totalDistributed} ${item.unit} of ${item.itemName} has been distributed to disaster victims.`,
    };

    return successResponse(res, 200, 'Donation receipt generated', { receipt });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PATCH /api/donations/confirm/:itemId
// @access  Private (admin only)
// @desc    Admin confirms a donation has physically arrived
//          This is the trigger that makes stock "available" for distribution
// ─────────────────────────────────────────
const confirmDonationArrival = async (req, res, next) => {
  try {
    const { arrivedQuantity } = req.body;

    const item = await Inventory.findById(req.params.itemId)
      .populate('donorId', 'name email')
      .populate('disasterId', 'title');

    if (!item || !item.isActive) {
      return errorResponse(res, 404, 'Donation record not found');
    }

    if (!arrivedQuantity || arrivedQuantity <= 0) {
      return errorResponse(res, 400, 'Arrived quantity must be greater than 0');
    }

    // If arrived quantity is less than logged, adjust the stock
    const previousQuantity = item.quantity;
    if (arrivedQuantity < item.quantity) {
      item.quantity = arrivedQuantity;
    }

    await item.save();

    // Check if the confirmed quantity triggers a low stock alert
    if (item.isLowStock) {
      await sendLowStockAlert(item);
    }

    // Notify the NGO donor that their donation was confirmed
    if (item.donorId) {
      await Notification.create({
        recipientId: item.donorId._id,
        type: 'general',
        title: 'Donation Arrival Confirmed',
        message: `Your donation of ${arrivedQuantity} ${item.unit} of ${item.itemName} for ${item.disasterId.title} has been received and confirmed.`,
        relatedId: item._id,
        relatedCollection: 'Inventory',
      });
    }

    await logAction(
      `Confirmed donation arrival: ${item.itemName} — ${arrivedQuantity} ${item.unit}`,
      req.user._id,
      item._id,
      'Inventory',
      {
        loggedQuantity: previousQuantity,
        arrivedQuantity,
        adjustment: arrivedQuantity - previousQuantity,
      },
      req
    );

    return successResponse(res, 200, 'Donation arrival confirmed', {
      item,
      confirmedQuantity: arrivedQuantity,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  logDonation,
  getMyDonations,
  getDonationsByDisaster,
  getDonationReceipt,
  confirmDonationArrival,
};