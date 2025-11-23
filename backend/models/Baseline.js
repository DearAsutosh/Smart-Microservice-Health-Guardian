import mongoose from 'mongoose';

const baselineSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    unique: true,
    index: true
  },
  serviceName: {
    type: String,
    required: true
  },
  avgLatency: {
    type: Number,
    default: 0
  },
  stdDevLatency: {
    type: Number,
    default: 0
  },
  avgErrorRate: {
    type: Number,
    default: 0
  },
  avgMemoryUsage: {
    type: Number,
    default: 0
  },
  sampleCount: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isLearning: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient lookups
baselineSchema.index({ serviceId: 1 });

const Baseline = mongoose.model('Baseline', baselineSchema);

export default Baseline;
