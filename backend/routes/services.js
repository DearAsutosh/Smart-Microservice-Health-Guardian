import express from 'express';
import Service from '../models/Service.js';
import Metric from '../models/Metric.js';
import Event from '../models/Event.js';
import Baseline from '../models/Baseline.js';
import { verifyToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// GET /services - List all services with current status (PROTECTED)
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const services = await Service.find().sort({ name: 1 });

  const servicesWithDetails = services.map(service => ({
    id: service._id,
    name: service.name,
    url: service.url,
    port: service.port,
    status: service.status,
    metrics: service.currentMetrics,
    lastHeartbeat: service.lastHeartbeat,
    isAtRisk: service.isAtRisk,
    autoHealingInProgress: service.autoHealingInProgress,
    criticalSince: service.criticalSince,
    updatedAt: service.updatedAt
  }));

  res.json({
    success: true,
    count: servicesWithDetails.length,
    data: servicesWithDetails
  });
}));

// GET /services/:id/history - Get historical metrics and events (PROTECTED)
router.get('/:id/history', verifyToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { timeRange = '1h' } = req.query;

  // Calculate time range
  const timeRangeMap = {
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
  };

  const timeMs = timeRangeMap[timeRange] || timeRangeMap['1h'];
  const startTime = new Date(Date.now() - timeMs);

  // Fetch service
  const service = await Service.findById(id);
  if (!service) {
    return res.status(404).json({
      success: false,
      error: 'Service not found'
    });
  }

  // Fetch metrics
  const metrics = await Metric.find({
    serviceId: id,
    timestamp: { $gte: startTime }
  }).sort({ timestamp: 1 }).limit(500);

  // Fetch events
  const events = await Event.find({
    serviceId: id,
    timestamp: { $gte: startTime }
  }).sort({ timestamp: -1 }).limit(100);

  // Fetch baseline
  const baseline = await Baseline.findOne({ serviceId: id });

  res.json({
    success: true,
    data: {
      service: {
        id: service._id,
        name: service.name,
        status: service.status,
        currentMetrics: service.currentMetrics
      },
      metrics: metrics.map(m => ({
        latency: m.latency,
        errorRate: m.errorRate,
        memoryUsage: m.memoryUsage,
        timestamp: m.timestamp
      })),
      events: events.map(e => ({
        id: e._id,
        type: e.eventType,
        severity: e.severity,
        message: e.message,
        timestamp: e.timestamp,
        metadata: e.metadata
      })),
      baseline: baseline ? {
        avgLatency: baseline.avgLatency,
        stdDevLatency: baseline.stdDevLatency,
        avgErrorRate: baseline.avgErrorRate,
        sampleCount: baseline.sampleCount,
        lastUpdated: baseline.lastUpdated
      } : null
    }
  });
}));

// POST /actions/restart - Trigger auto-recovery for a service (PROTECTED)
router.post('/actions/restart', verifyToken, asyncHandler(async (req, res) => {
  const { serviceId, serviceName } = req.body;

  if (!serviceId && !serviceName) {
    return res.status(400).json({
      success: false,
      error: 'serviceId or serviceName is required'
    });
  }

  // Find service
  const service = serviceId 
    ? await Service.findById(serviceId)
    : await Service.findOne({ name: serviceName });

  if (!service) {
    return res.status(404).json({
      success: false,
      error: 'Service not found'
    });
  }

  // Mark auto-healing in progress
  service.autoHealingInProgress = true;
  await service.save();

  // Log auto-healing event
  await Event.create({
    serviceId: service._id,
    serviceName: service.name,
    eventType: 'auto_healing',
    severity: 'warning',
    message: `Auto-healing initiated for ${service.name}`,
    metadata: {
      action: 'restart',
      triggeredBy: 'manual_request',
      requestedBy: req.user.email
    }
  });

  logger.info(`Auto-healing triggered for ${service.name}`, { 
    triggeredBy: req.user.email 
  });

  // Simulate recovery after 10 seconds
  setTimeout(async () => {
    try {
      const svc = await Service.findById(service._id);
      if (svc) {
        svc.autoHealingInProgress = false;
        svc.criticalSince = null;
        await svc.save();

        await Event.create({
          serviceId: svc._id,
          serviceName: svc.name,
          eventType: 'auto_healing',
          severity: 'info',
          message: `Auto-healing completed for ${svc.name}`,
          metadata: {
            action: 'restart_complete',
            duration: '10s'
          }
        });

        logger.info(`Auto-healing completed for ${svc.name}`);
      }
    } catch (err) {
      logger.error('Error completing auto-healing', { error: err.message });
    }
  }, 10000);

  res.json({
    success: true,
    message: `Auto-healing initiated for ${service.name}`,
    data: {
      serviceId: service._id,
      serviceName: service.name,
      estimatedRecoveryTime: '10s'
    }
  });
}));

export default router;
