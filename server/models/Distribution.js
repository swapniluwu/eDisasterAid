const mongoose = require('mongoose');

// ─── Sub-schema for tracking each status stage change ───
// Every time a distribution moves to a new stage, we log who did it and when
const statusHistorySchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ['Submitted', 'Verified', 'Approved', 'Assigned', 'Dispatched', 'Delivered', 'Closed'],
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { _id: false } // No separate _id for sub-documents
);

const distributionSchema = new mongoose.Schema(
  {
    // The verified victim receiving the aid
    victimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Victim',
      required: [true, 'Victim is required'],
    },

    // Which disaster this distribution is for
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DisasterEvent',
      required: [true, 'Disaster event is required'],
    },

    // The inventory item being distributed
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: [true, 'Inventory item is required'],
    },

    // How much of the item
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },

    // Volunteer responsible for physical delivery
    assignedVolunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Current lifecycle stage
    status: {
      type: String,
      enum: {
        values: ['Submitted', 'Verified', 'Approved', 'Assigned', 'Dispatched', 'Delivered', 'Closed'],
        message: '{VALUE} is not a valid distribution status',
      },
      default: 'Submitted',
    },

    // Full history of every stage transition
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    // Set when volunteer marks as Delivered
    deliveredAt: {
      type: Date,
    },

    // Optional admin/volunteer notes
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },

    // Admin who created this distribution record
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound unique index ───
// Prevents the same victim from receiving the same item twice in one disaster
distributionSchema.index({ victimId: 1, itemId: 1, disasterId: 1 }, { unique: true });

// Fast fetch for volunteer task list
distributionSchema.index({ assignedVolunteerId: 1, status: 1 });

// Fast fetch for admin distribution board
distributionSchema.index({ disasterId: 1, status: 1 });

// ─── Method: advance to next stage ───
// Validates that stages only move forward, never backward
distributionSchema.methods.advanceStage = function (newStage, changedBy, note = '') {
  const stageOrder = [
    'Submitted', 'Verified', 'Approved', 'Assigned',
    'Dispatched', 'Delivered', 'Closed',
  ];

  const currentIndex = stageOrder.indexOf(this.status);
  const newIndex = stageOrder.indexOf(newStage);

  if (newIndex <= currentIndex) {
    throw new Error(`Cannot move from '${this.status}' to '${newStage}'`);
  }

  // Record this transition in history
  this.statusHistory.push({ stage: newStage, changedBy, note });
  this.status = newStage;

  // Record delivery timestamp when marked delivered
  if (newStage === 'Delivered') {
    this.deliveredAt = new Date();
  }
};

module.exports = mongoose.model('Distribution', distributionSchema);