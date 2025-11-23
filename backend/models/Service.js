import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  url: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['healthy', 'warning', 'critical', 'analyzing', 'unknown'],
    default: 'unknown'
  },
  currentMetrics: {
    avgLatency: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
    uptime: { type: Number, default: 0 },
    memoryUsage: { type: Number, default: 0 },
    requestCount: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    analyzingProgress: {
      current: { type: Number },
      total: { type: Number },
      secondsRemaining: { type: Number }
    },
    trend: { type: String, default: 'stable' }
  },
  lastHeartbeat: {
    type: Date,
    default: null
  },
  isAtRisk: {
    type: Boolean,
    default: false
  },
  autoHealingInProgress: {
    type: Boolean,
    default: false
  },
  criticalSince: {
    type: Date,
    default: null
  },
  criticalNotificationSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
serviceSchema.index({ status: 1 });
serviceSchema.index({ lastHeartbeat: 1 });

const Service = mongoose.model('Service', serviceSchema);

export default Service;
