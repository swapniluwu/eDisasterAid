const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Human-readable description of what happened
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      maxlength: [200, 'Action description cannot exceed 200 characters'],
    },

    // The admin who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performer is required'],
    },

    // The record that was affected
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    // Which collection was affected — for building audit UI filters
    targetCollection: {
      type: String,
      enum: ['User', 'DisasterEvent', 'Victim', 'Inventory', 'Distribution', 'AuditLog', 'Notification'],
      required: [true, 'Target collection is required'],
    },

    // Optional before/after snapshot for sensitive changes
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // IP address of the request — useful for security audits
    ipAddress: {
      type: String,
    },
  },
  {
    // Only createdAt — updatedAt not needed since logs are append-only
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ─── IMPORTANT: No updates or deletes allowed ───
// These hooks enforce append-only at the Mongoose layer
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('deleteOne', function () {
  throw new Error('Audit logs cannot be deleted');
});

auditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('Audit logs cannot be deleted');
});

// Fast lookup by admin, by collection, and by time range
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ targetCollection: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 }); // General time-sorted view

module.exports = mongoose.model('AuditLog', auditLogSchema);