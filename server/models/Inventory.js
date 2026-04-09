const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    // Which disaster this stock belongs to
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DisasterEvent',
      required: [true, 'Disaster event is required'],
    },

    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [100, 'Item name cannot exceed 100 characters'],
    },

    category: {
      type: String,
      enum: ['food', 'water', 'medicine', 'clothing', 'shelter', 'hygiene', 'other'],
      default: 'other',
    },

    // Current available quantity (deducted on each distribution)
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },

    unit: {
      type: String,
      enum: ['kg', 'litre', 'piece', 'box', 'packet', 'bottle'],
      required: [true, 'Unit is required'],
    },

    // NGO/donor who contributed this stock
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // For perishable items — admin can see what's expiring soon
    expiryDate: {
      type: Date,
    },

    // Alert fires when quantity drops to or below this value
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },

    // Running total of how much has been distributed
    totalDistributed: {
      type: Number,
      default: 0,
    },

    // Soft delete — mark as inactive instead of deleting
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Fast fetch of all stock for a given disaster
inventorySchema.index({ disasterId: 1, isActive: 1 });

// Virtual: whether this item is currently low on stock
inventorySchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.lowStockThreshold;
});

// Virtual: whether the item has expired
inventorySchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Include virtuals when converting to JSON (for API responses)
inventorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Inventory', inventorySchema);