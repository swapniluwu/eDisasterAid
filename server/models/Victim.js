const mongoose = require('mongoose');

const victimSchema = new mongoose.Schema(
  {
    // Link to the citizen user account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Which disaster they are registering under
    disasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DisasterEvent',
      required: [true, 'Disaster event is required'],
    },

    // Stored here for fast lookup without joining User
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },

    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },

    familySize: {
      type: Number,
      required: [true, 'Family size is required'],
      min: [1, 'Family size must be at least 1'],
      max: [50, 'Family size cannot exceed 50'],
    },

    // Self-reported severity — admin verifies before using in score
    severity: {
      type: Number,
      required: [true, 'Severity is required'],
      min: [1, 'Severity must be between 1 and 5'],
      max: [5, 'Severity must be between 1 and 5'],
    },

    // Vulnerability flags — affect priority score
    hasElderly: {
      type: Boolean,
      default: false,
    },

    hasChildren: {
      type: Boolean,
      default: false,
    },

    hasDisabled: {
      type: Boolean,
      default: false,
    },

    // What the family needs — free text tags
    requiredItems: {
      type: [String],
      default: [],
    },

    // Computed by priorityEngine.js and stored on registration
    // Formula: (severity × 4) + (familySize × 2) + bonus, capped at 100
    priorityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Admin must verify before victim enters distribution queue
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Overall registration status
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },

    // Admin notes on rejection reason
    adminNotes: {
      type: String,
      trim: true,
    },

    // Admin who verified/rejected this registration
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound index ───
// Prevents a citizen from registering twice under the same disaster
victimSchema.index({ userId: 1, disasterId: 1 }, { unique: true });

// Fast lookup for admin: all victims under a disaster, sorted by priority
victimSchema.index({ disasterId: 1, priorityScore: -1 });

// Fast lookup for status filtering
victimSchema.index({ disasterId: 1, status: 1 });

module.exports = mongoose.model('Victim', victimSchema);