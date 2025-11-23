import cron from 'node-cron';
import Service from '../models/Service.js';
import Metric from '../models/Metric.js';
import Event from '../models/Event.js';
import Baseline from '../models/Baseline.js';
import Alert from '../models/Alert.js';
import axios from 'axios';
import { createNotificationService } from '../services/notificationService.js';

// Initialize notification service
const notificationService = createNotificationService();

// Statistical helper functions
const calculateMean = (values) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

const calculateStdDev = (values, mean) => {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
};

const detectTrend = (recentValues) => {
  if (recentValues.length < 3) return 'stable';
  
  const firstHalf = recentValues.slice(0, Math.floor(recentValues.length / 2));
  const secondHalf = recentValues.slice(Math.floor(recentValues.length / 2));
  
  const firstAvg = calculateMean(firstHalf);
  const secondAvg = calculateMean(secondHalf);
  
  const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (percentChange > 15) return 'rising';
  if (percentChange < -15) return 'falling';
  return 'stable';
};

// Update baseline for a service
const updateBaseline = async (service) => {
  try {
    // Get healthy metrics from last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const healthyMetrics = await Metric.find({
      serviceId: service._id,
      timestamp: { $gte: tenMinutesAgo },
      errorRate: { $lt: 5 } // Only use metrics with low error rates
    }).sort({ timestamp: -1 }).limit(100);

    if (healthyMetrics.length < 5) {
      // Not enough data yet
      return null;
    }

    const latencies = healthyMetrics.map(m => m.latency);
    const errorRates = healthyMetrics.map(m => m.errorRate);
    const memoryUsages = healthyMetrics.map(m => m.memoryUsage);

    const avgLatency = calculateMean(latencies);
    const stdDevLatency = calculateStdDev(latencies, avgLatency);
    const avgErrorRate = calculateMean(errorRates);
    const avgMemoryUsage = calculateMean(memoryUsages);

    // Update or create baseline
    let baseline = await Baseline.findOne({ serviceId: service._id });
    
    if (!baseline) {
      baseline = await Baseline.create({
        serviceId: service._id,
        serviceName: service.name,
        avgLatency,
        stdDevLatency,
        avgErrorRate,
        avgMemoryUsage,
        sampleCount: healthyMetrics.length,
        lastUpdated: new Date(),
        isLearning: true
      });
      
      await Event.create({
        serviceId: service._id,
        serviceName: service.name,
        eventType: 'baseline_update',
        severity: 'info',
        message: `Baseline established for ${service.name}`,
        metadata: { avgLatency, stdDevLatency }
      });
      
      console.log(`📊 Baseline established for ${service.name}: ${avgLatency.toFixed(2)}ms ± ${stdDevLatency.toFixed(2)}ms`);
    } else {
      // Smooth update using exponential moving average
      const alpha = 0.3; // Weight for new data
      baseline.avgLatency = alpha * avgLatency + (1 - alpha) * baseline.avgLatency;
      baseline.stdDevLatency = alpha * stdDevLatency + (1 - alpha) * baseline.stdDevLatency;
      baseline.avgErrorRate = alpha * avgErrorRate + (1 - alpha) * baseline.avgErrorRate;
      baseline.avgMemoryUsage = alpha * avgMemoryUsage + (1 - alpha) * baseline.avgMemoryUsage;
      baseline.sampleCount += healthyMetrics.length;
      baseline.lastUpdated = new Date();
      
      await baseline.save();
    }

    return baseline;
  } catch (error) {
    console.error(`Error updating baseline for ${service.name}:`, error);
    return null;
  }
};
// Evaluate service health (simplified - only check heartbeats)
// Real anomaly detection happens in metrics endpoint
const evaluateServiceHealth = async (service) => {
  try {
    // Check heartbeat status
    const timeSinceHeartbeat = service.lastHeartbeat 
      ? Date.now() - service.lastHeartbeat.getTime()
      : Infinity;

    // Critical: No heartbeat for >60 seconds
    if (timeSinceHeartbeat > 60000) {
      return { 
        status: 'critical', 
        reason: 'no_heartbeat',
        currentAvgLatency: 0,
        currentErrorRate: 0,
        currentMemoryUsage: 0,
        currentRequestCount: 0,
        currentTotalRequests: service.currentMetrics?.totalRequests || 0
      };
    }

    // Use the status already set by the metrics endpoint
    // But if it's 'unknown', default to 'healthy' if heartbeat is recent
    let status = service.status;
    if (status === 'unknown' && timeSinceHeartbeat < 60000) {
      status = 'healthy';
    }

    return {
      status: status,
      reason: 'status_from_metrics_endpoint',
      currentAvgLatency: service.currentMetrics?.avgLatency || 0,
      currentErrorRate: service.currentMetrics?.errorRate || 0,
      currentMemoryUsage: service.currentMetrics?.memoryUsage || 0,
      currentRequestCount: service.currentMetrics?.requestCount || 0,
      currentTotalRequests: service.currentMetrics?.totalRequests || 0,
      metadata: service.currentMetrics?.analyzingProgress // Pass analyzing progress
    };

  } catch (error) {
    console.error(`Error evaluating health for ${service.name}:`, error);
    return { status: 'unknown', reason: 'evaluation_error' };
  }
};

// Handle status changes and intelligent alerting
const handleStatusChange = async (service, oldStatus, newStatus, reason, metadata) => {
  try {
    // Only alert on status changes (intelligent alerting - no spam)
    if (oldStatus !== newStatus) {
      const severityMap = {
        'critical': 'critical',
        'warning': 'warning',
        'healthy': 'info'
      };

      const severity = severityMap[newStatus] || 'info';
      const emoji = { healthy: '🟢', warning: '🟡', critical: '🔴', unknown: '⚪' };

      const message = `${emoji[newStatus]} ${service.name} status changed: ${oldStatus} → ${newStatus} (${reason})`;

      // Create event
      await Event.create({
        serviceId: service._id,
        serviceName: service.name,
        eventType: 'status_change',
        severity,
        message,
        metadata: { oldStatus, newStatus, reason, ...metadata }
      });

      // Create alert for warning/critical
      if (newStatus === 'warning' || newStatus === 'critical') {
        // Check if similar unresolved alert exists
        const existingAlert = await Alert.findOne({
          serviceId: service._id,
          alertType: reason,
          acknowledged: false,
          resolvedAt: null
        });

        if (!existingAlert) {
          await Alert.create({
            serviceId: service._id,
            serviceName: service.name,
            alertType: reason,
            severity: newStatus === 'critical' ? 'critical' : 'warning',
            message,
            acknowledged: false
          });
        }
      } else if (newStatus === 'healthy') {
        // Resolve existing alerts
        await Alert.updateMany(
          { serviceId: service._id, resolvedAt: null },
          { resolvedAt: new Date() }
        );
      }

      console.log(message);

      // Send mobile notification for warning status (immediate)
      // For critical status, we wait 30s to avoid spam (handled in main loop)
      if (newStatus === 'warning' && oldStatus !== 'unknown') {
        await notificationService.sendAlert(
          service,
          newStatus,
          reason,
          service.currentMetrics || {}
        );
      }

      // Track when service became critical
      if (newStatus === 'critical') {
        if (!service.criticalSince) {
          service.criticalSince = new Date();
          service.criticalNotificationSent = false;
          await service.save();
        }
      } else {
        service.criticalSince = null;
        service.criticalNotificationSent = false;
        await service.save();
      }
    }
  } catch (error) {
    console.error('Error handling status change:', error);
  }
};

// Detect cascading failures
const detectCascadingFailures = async () => {
  try {
    const authService = await Service.findOne({ name: 'auth-service' });
    
    if (authService && authService.status === 'critical') {
      // Mark dependent services as at risk
      await Service.updateMany(
        { name: { $in: ['booking-service', 'storage-service'] } },
        { isAtRisk: true }
      );

      // Create cascading failure alerts
      const dependentServices = await Service.find({
        name: { $in: ['booking-service', 'storage-service'] }
      });

      for (const svc of dependentServices) {
        const existingAlert = await Alert.findOne({
          serviceId: svc._id,
          alertType: 'cascading_failure',
          resolvedAt: null
        });

        if (!existingAlert) {
          await Alert.create({
            serviceId: svc._id,
            serviceName: svc.name,
            alertType: 'cascading_failure',
            severity: 'warning',
            message: `⚠️ ${svc.name} at risk due to auth-service failure`,
            acknowledged: false
          });

          await Event.create({
            serviceId: svc._id,
            serviceName: svc.name,
            eventType: 'alert',
            severity: 'warning',
            message: `Cascading failure risk detected: auth-service is critical`,
            metadata: { relatedService: 'auth-service' }
          });
        }
      }
    } else {
      // Clear at-risk flags
      await Service.updateMany({}, { isAtRisk: false });
      
      // Resolve cascading failure alerts
      await Alert.updateMany(
        { alertType: 'cascading_failure', resolvedAt: null },
        { resolvedAt: new Date() }
      );
    }
  } catch (error) {
    console.error('Error detecting cascading failures:', error);
  }
};

// Predictive auto-healing
const checkAutoHealing = async (service) => {
  try {
    if (service.status === 'critical' && service.criticalSince) {
      const criticalDuration = Date.now() - service.criticalSince.getTime();
      
      // If critical for more than 2 minutes and not already healing
      if (criticalDuration > 2 * 60 * 1000 && !service.autoHealingInProgress) {
        console.log(`🔧 Triggering auto-healing for ${service.name} (critical for ${Math.floor(criticalDuration / 1000)}s)`);
        
        // Trigger auto-recovery
        try {
          await axios.post('http://localhost:3000/services/actions/restart', {
            serviceId: service._id,
            serviceName: service.name
          });
        } catch (error) {
          console.error('Error triggering auto-healing:', error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error checking auto-healing:', error);
  }
};

// Global lock to prevent overlapping evaluations
let isEvaluating = false;

// Main intelligent evaluator function
const runIntelligentEvaluation = async () => {
  if (isEvaluating) return;
  isEvaluating = true;

  try {
    // console.log('\n🧠 Running intelligent health evaluation...'); // Reduce log spam
    
    const services = await Service.find();

    for (const service of services) {
      // Update baseline
      await updateBaseline(service);

      // Evaluate health
      const evaluation = await evaluateServiceHealth(service);
      
      const oldStatus = service.status;
      const newStatus = evaluation.status;

      // Update service
      service.status = newStatus;
      service.currentMetrics = {
        avgLatency: evaluation.currentAvgLatency || 0,
        errorRate: evaluation.currentErrorRate || 0,
        uptime: service.lastHeartbeat ? Date.now() - service.lastHeartbeat.getTime() : 0,
        memoryUsage: evaluation.currentMemoryUsage || 0,
        requestCount: evaluation.currentRequestCount || 0,
        totalRequests: evaluation.currentTotalRequests || 0
      };

      await service.save();

      // Handle status changes
      await handleStatusChange(service, oldStatus, newStatus, evaluation.reason, evaluation.metadata);
      
      // Check for delayed critical notifications (30s debounce)
      if (service.status === 'critical' && service.criticalSince && !service.criticalNotificationSent) {
        const duration = Date.now() - service.criticalSince.getTime();
        if (duration > 30000) { // 30 seconds
          console.log(`⚠️ Sending delayed critical alert for ${service.name} (critical for ${Math.floor(duration / 1000)}s)`);
          
          // Set flag IMMEDIATELY to prevent race conditions in next loop
          service.criticalNotificationSent = true;
          await service.save();

          if (evaluation.reason === 'no_heartbeat') {
            await notificationService.sendAlert(
              service,
              'critical',
              '🛑 Service Stopped',
              {
                message: `${service.name} has stopped responding. No heartbeat received for >60 seconds.`,
                ...service.currentMetrics
              }
            );
          } else {
            await notificationService.sendAlert(
              service,
              'critical',
              evaluation.reason,
              service.currentMetrics || {}
            );
          }
        }
      }

      // Check for auto-healing
      await checkAutoHealing(service);
    }

    // Detect cascading failures
    await detectCascadingFailures();

    // console.log('✅ Intelligent evaluation completed\n');

  } catch (error) {
    console.error('❌ Error in intelligent evaluation:', error);
  } finally {
    isEvaluating = false;
  }
};

// Start the cron job
export const startIntelligentEvaluator = () => {
  console.log('🧠 Starting AI-enabled Intelligent Evaluator...');
  console.log('⏰ Running every 5 seconds (premium real-time mode)\n');

  // Run immediately on startup
  setTimeout(runIntelligentEvaluation, 5000);

  // Schedule to run every 1 second for real-time updates
  cron.schedule('* * * * * *', runIntelligentEvaluation);
};

export default { startIntelligentEvaluator, runIntelligentEvaluation };
