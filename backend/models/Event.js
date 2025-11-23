import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },
  serviceName: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['status_change', 'alert', 'auto_healing', 'baseline_update', 'trend_detected'],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Compound index for efficient queries
eventSchema.index({ serviceId: 1, timestamp: -1 });
eventSchema.index({ eventType: 1, timestamp: -1 });

// TTL index to automatically delete old events after 30 days
eventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
