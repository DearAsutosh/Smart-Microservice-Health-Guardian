import mongoose from 'mongoose';

const metricSchema = new mongoose.Schema({
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
  latency: {
    type: Number,
    required: true
  },
  errorRate: {
    type: Number,
    default: 0
  },
  statusCode: {
    type: Number,
    default: 200
  },
  memoryUsage: {
    type: Number,
    default: 0
  },
  requestCount: {
    type: Number,
    default: 0
  },
  totalRequests: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Compound index for efficient time-series queries
metricSchema.index({ serviceId: 1, timestamp: -1 });

// TTL index to automatically delete old metrics after 7 days
metricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

const Metric = mongoose.model('Metric', metricSchema);

export default Metric;
