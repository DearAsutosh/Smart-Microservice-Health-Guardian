import axios from 'axios';

class HealthAgent {
  constructor(serviceName, guardianUrl = 'http://localhost:3000') {
    this.serviceName = serviceName;
    this.guardianUrl = guardianUrl;
    this.metrics = {
      requests: [],
      errors: 0,
      totalRequests: 0
    };
    this.heartbeatInterval = null;
    this.isRunning = false;
  }

  // Express middleware to track requests
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Capture the original end function
      const originalEnd = res.end;

      // Override res.end to capture response
      res.end = (...args) => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Record metric
        this.recordRequest(duration, statusCode);

        // Call original end
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  // Record individual request metrics
  recordRequest(duration, statusCode) {
    this.metrics.totalRequests++;
    
    // Keep last 60 requests for rolling average
    this.metrics.requests.push({
      duration,
      statusCode,
      timestamp: Date.now(),
      isError: statusCode >= 400
    });

    if (this.metrics.requests.length > 60) {
      this.metrics.requests.shift();
    }

    if (statusCode >= 400) {
      this.metrics.errors++;
    }
  }

  // Calculate current metrics
  calculateMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Filter requests from last minute
    const recentRequests = this.metrics.requests.filter(
      r => r.timestamp >= oneMinuteAgo
    );

    if (recentRequests.length === 0) {
      return {
        avgLatency: 0,
        errorRate: 0,
        requestCount: 0,
        memoryUsage: this.getMemoryUsage()
      };
    }

    // Calculate average latency
    const totalLatency = recentRequests.reduce((sum, r) => sum + r.duration, 0);
    const avgLatency = totalLatency / recentRequests.length;

    // Calculate error rate
    const errorCount = recentRequests.filter(r => r.isError).length;
    const errorRate = (errorCount / recentRequests.length) * 100;

    return {
      avgLatency: Math.round(avgLatency),
      errorRate: Math.round(errorRate * 100) / 100,
      requestCount: recentRequests.length,
      memoryUsage: this.getMemoryUsage()
    };
  }

  // Get memory usage
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }

  // Send metrics to Guardian backend
  async sendMetrics() {
    try {
      const metrics = this.calculateMetrics();

      const payload = {
        serviceName: this.serviceName,
        latency: metrics.avgLatency,
        errorRate: metrics.errorRate,
        statusCode: 200,
        memoryUsage: metrics.memoryUsage,
        requestCount: metrics.requestCount,
        totalRequests: this.metrics.totalRequests
      };

      console.log('DEBUG: totalRequests value:', this.metrics.totalRequests);
      console.log('DEBUG: payload constructed:', JSON.stringify(payload));

      await axios.post(`${this.guardianUrl}/ingest/metrics`, payload, {
        timeout: 3000
      });

      // console.log(`📊 Metrics sent for ${this.serviceName}: ${metrics.avgLatency}ms, ${metrics.errorRate}% errors`);

    } catch (error) {
      // Silently fail to avoid flooding logs
      if (error.code === 'ECONNREFUSED') {
        // Guardian backend not running yet
      } else {
        console.error(`Failed to send metrics: ${error.message}`);
      }
    }
  }

  // Start heartbeat
  start() {
    if (this.isRunning) {
      console.warn('Health agent already running');
      return;
    }

    this.isRunning = true;
    console.log(`💚 Health Agent started for ${this.serviceName}`);
    console.log(`📡 Sending heartbeat every 2 seconds to ${this.guardianUrl}`);

    // Send initial metrics
    this.sendMetrics();

    // Send heartbeat every 2 seconds (premium real-time updates)
    this.heartbeatInterval = setInterval(() => {
      this.sendMetrics();
    }, 2000);
  }

  // Stop heartbeat
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.isRunning = false;
      console.log(`Health Agent stopped for ${this.serviceName}`);
    }
  }

  // Get current status
  getStatus() {
    const metrics = this.calculateMetrics();
    return {
      serviceName: this.serviceName,
      isRunning: this.isRunning,
      totalRequests: this.metrics.totalRequests,
      currentMetrics: metrics
    };
  }
}

// Factory function for easy integration
export const createHealthAgent = (serviceName, guardianUrl) => {
  return new HealthAgent(serviceName, guardianUrl);
};

export default HealthAgent;
