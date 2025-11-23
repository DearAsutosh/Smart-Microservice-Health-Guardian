import express from 'express';
import Service from '../models/Service.js';
import Metric from '../models/Metric.js';
import Event from '../models/Event.js';
import Alert from '../models/Alert.js';
import Baseline from '../models/Baseline.js';
import { evaluateService, WindowStats, getDiagnostics, anomalyConfig as config } from '../utils/anomalyDetector.js';
import { createNotificationService } from '../services/notificationService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Initialize notification service
const notificationService = createNotificationService();

// Store WindowStats for each service
const serviceWindows = {};

// POST /ingest/metrics - Receive metrics from microservices
router.post('/metrics', async (req, res) => {
  try {
    const { serviceName, latency, errorRate, statusCode, memoryUsage, requestCount, totalRequests } = req.body;
    logger.debug(`Received metrics from ${serviceName}`, { requestCount, totalRequests });

    // Validate required fields
    if (!serviceName || latency === undefined) {
      return res.status(400).json({
        success: false,
        error: 'serviceName and latency are required'
      });
    }

    // Find or create service
    let service = await Service.findOne({ name: serviceName });

    if (!service) {
      // Auto-register new service
      const portMap = {
        'auth-service': 3001,
        'booking-service': 3002,
        'storage-service': 3003
      };

      service = await Service.create({
        name: serviceName,
        url: `http://localhost:${portMap[serviceName] || 3000}`,
        port: portMap[serviceName] || 3000,
        status: 'unknown'
      });

      logger.info(`Auto-registered new service: ${serviceName}`);
    }

    // If this is the first metrics received for the service, record a start event
    if (!service.lastHeartbeat) {
      await Event.create({
        serviceId: service._id,
        serviceName: service.name,
        eventType: 'service_started',
        severity: 'info',
        message: `✅ Service ${service.name} started`,
        metadata: {}
      });
    }

    // Initialize WindowStats for new services OR if service restarted (totalRequests reset)
    const isRestart = totalRequests < (service.currentMetrics?.totalRequests || 0);

    if (!serviceWindows[serviceName] || isRestart) {
      if (isRestart) {
        logger.info(`Detected service restart for ${serviceName} - Resetting baseline`);
      }

      serviceWindows[serviceName] = {
        latency: new WindowStats(60), // 60 samples = 2 mins (must be > warmupSamples which is 45)
        errorRate: new WindowStats(60),
        requestCount: new WindowStats(60),
        startTime: Date.now() // Track when service started for accurate timer
      };
      logger.info(`Initialized anomaly detection windows for ${serviceName}`);

      // Send Telegram notification for service start/restart
      await notificationService.sendAlert(
        service,
        'info',
        '🚀 Service Started',
        {
          message: `${serviceName} has started and is now being monitored.`,
          status: 'analyzing'
        }
      );
    }

    // Get current metrics
    const currentMetrics = {
      latency: latency || 0,
      errorRate: errorRate || 0,
      requestCount: requestCount || 0,
      memoryUsage: memoryUsage || 0,
      totalRequests: totalRequests || 0
    };

    // Evaluate service health using smart anomaly detection
    const windows = serviceWindows[serviceName];
    const detectedStatus = evaluateService(currentMetrics, windows);

    // Map detected status to Service model status
    const statusMap = {
      healthy: 'healthy',
      degraded: 'warning',
      unhealthy: 'critical',
      learning: 'analyzing' // Show analyzing during warm-up
    };
    const newStatus = statusMap[detectedStatus.status] || 'unknown';
    const oldStatus = service.status;

    // Get diagnostics for logging and events
    const diagnostics = getDiagnostics(windows);

    const emoji = { healthy: '🟢', warning: '🟡', critical: '🔴', analyzing: '🔵', unknown: '⚪' };
    const severityMap = {
      critical: 'critical',
      warning: 'warning',
      healthy: 'info',
      analyzing: 'info'
    };

    // Only create event if status actually changed
    if (oldStatus !== newStatus) {
      // Format reason for display
      const reasonText = detectedStatus.reason ? ` (${detectedStatus.reason})` : '';
      const detailsText = detectedStatus.details ? `: ${detectedStatus.details}` : '';
      
      await Event.create({
        serviceId: service._id,
        serviceName: service.name,
        eventType: 'status_change',
        severity: severityMap[newStatus] || 'info',
        message: `${emoji[newStatus]} Status changed: ${oldStatus} → ${newStatus}${reasonText}${detailsText}`,
        metadata: {
          oldStatus,
          newStatus,
          reason: detectedStatus.reason,
          details: detectedStatus.details,
          diagnostics
        }
      });
    }

    // Send notification for critical/warning status (but NOT during learning)
    if ((newStatus === 'warning' || newStatus === 'critical') && detectedStatus.status !== 'learning') {
      await notificationService.sendAlert(
        service,
        newStatus,
        `${detectedStatus.reason}: ${detectedStatus.details || ''}`,
        currentMetrics
      );
    } else if (detectedStatus.status === 'learning') {
      // Log learning progress periodically
      const samplesCollected = Math.min(
        windows.latency.values.length,
        windows.errorRate.values.length,
        windows.requestCount.values.length
      );
      if (samplesCollected % 10 === 0) {
        logger.debug(`Analyzing ${serviceName}: ${samplesCollected}/45 samples collected`);
      }
    }

    // Update service with new status and metrics
    service.status = newStatus;
    service.lastHeartbeat = new Date();
    service.currentMetrics = {
      avgLatency: currentMetrics.latency,
      errorRate: currentMetrics.errorRate,
      memoryUsage: currentMetrics.memoryUsage,
      requestCount: currentMetrics.requestCount,
      totalRequests: currentMetrics.totalRequests,
      // Add analyzing progress for UI timer based on actual elapsed time
      analyzingProgress: detectedStatus.status === 'learning' ? (() => {
        const elapsedSeconds = Math.floor((Date.now() - windows.startTime) / 1000);
        const totalSeconds = config.warmupSamples * 2; // 45 samples * 2 seconds per sample = 90 seconds
        const secondsRemaining = Math.max(0, totalSeconds - elapsedSeconds);
        return {
          current: Math.min(windows.latency.values.length, windows.errorRate.values.length, windows.requestCount.values.length),
          total: config.warmupSamples,
          secondsRemaining: secondsRemaining
        };
      })() : null,
      trend: parseFloat(diagnostics.latency.slope) > 0.5 ? 'rising' : (parseFloat(diagnostics.latency.slope) < -0.5 ? 'falling' : 'stable')
    };
    await service.save();

    // Create metric record
    const metric = await Metric.create({
      serviceId: service._id,
      serviceName,
      latency,
      errorRate: errorRate || 0,
      statusCode: statusCode || 200,
      memoryUsage: memoryUsage || 0,
      requestCount: requestCount || 0,
      totalRequests: totalRequests || 0,
      timestamp: new Date()
    });

    const fs = await import('fs');
    fs.appendFileSync('backend-debug.log', `Received: ${JSON.stringify(req.body)}\nSaved: ${JSON.stringify(metric)}\n`);

    res.status(201).json({
      success: true,
      message: 'Metrics ingested successfully',
      data: {
        metricId: metric._id,
        serviceId: service._id,
        detectedStatus: newStatus,
        anomalyDetection: {
          status: detectedStatus,
          diagnostics: diagnostics
        }
      }
    });
  } catch (error) {
    logger.error('Error ingesting metrics', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to ingest metrics',
      details: error.message
    });
  }
});

export default router;
