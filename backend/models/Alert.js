import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
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
  alertType: {
    type: String,
    enum: ['high_latency', 'high_error_rate', 'no_heartbeat', 'trend_warning', 'cascading_failure'],
    required: true
  },
  severity: {
    type: String,
    enum: ['warning', 'critical'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date,
    default: null
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
alertSchema.index({ serviceId: 1, acknowledged: 1 });
alertSchema.index({ severity: 1, timestamp: -1 });

// TTL index to automatically delete resolved alerts after 7 days
alertSchema.index({ resolvedAt: 1 }, { expireAfterSeconds: 604800, partialFilterExpression: { resolvedAt: { $ne: null } } });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
