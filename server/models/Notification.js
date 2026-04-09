const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },

    // Notification category — used for filtering and icons in UI
    type: {
      type: String,
      enum: [
        'registration_approved',    // Citizen: registration verified
        'registration_rejected',    // Citizen: registration rejected
        'status_update',            // Citizen: distribution stage changed
        'delivery_assigned',        // Volunteer: new task assigned
        'low_stock',                // Admin: inventory below threshold
        'new_volunteer',            // Admin: new volunteer registered
        'disaster_created',         // All: new disaster announced
        'disaster_closed',          // All: disaster closed
        'general',                  // Fallback
      ],
      default: 'general',
    },

    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },

    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },

    // Link to the relevant document (e.g. distribution ID, disaster ID)
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    relatedCollection: {
      type: String,
      enum: ['DisasterEvent', 'Victim', 'Distribution', 'Inventory'],
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Fast fetch of all unread notifications for a user
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);