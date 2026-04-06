const mongoose = require('mongoose');

const disasterEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Disaster title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    type: {
      type: String,
      required: [true, 'Disaster type is required'],
      enum: {
        values: ['flood', 'earthquake', 'cyclone', 'fire', 'landslide', 'drought', 'other'],
        message: '{VALUE} is not a valid disaster type',
      },
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },

    // Text location name — e.g. "Ludhiana, Punjab"
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },

    // GPS coordinates for map display
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // Overall severity of the event — used in admin dashboard
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'closed'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    // Set by admin when disaster is closed
    endDate: {
      type: Date,
    },

    // Admin who created the event
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Auto-updated counts — denormalized for fast dashboard reads
    totalVictimsRegistered: {
      type: Number,
      default: 0,
    },

    totalDistributions: {
      type: Number,
      default: 0,
    },

    totalVolunteersAssigned: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast status-based queries — most common filter
disasterEventSchema.index({ status: 1, createdAt: -1 });

// Virtual: days since disaster started
disasterEventSchema.virtual('daysActive').get(function () {
  const end = this.endDate || new Date();
  const diff = end - this.startDate;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('DisasterEvent', disasterEventSchema);