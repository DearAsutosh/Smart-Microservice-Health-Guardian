/**
 * Production-Grade Anomaly Detection System
 * 
 * Industry-standard anomaly detection with:
 * - Warm-up period (learning phase)
 * - Adaptive baselines (learns YOUR environment)
 * - Statistical significance (3σ thresholds)
 * - Hysteresis (prevents flapping)
 * - Configurable sensitivity
 * 
 * Based on practices from DataDog, New Relic, Prometheus
 */

// Load configuration from environment
const config = {
  warmupSamples: parseInt(process.env.ANOMALY_WARMUP_SAMPLES) || 50,
  warningSigma: parseFloat(process.env.ANOMALY_WARNING_SIGMA) || 2.5,
  criticalSigma: parseFloat(process.env.ANOMALY_CRITICAL_SIGMA) || 3.5,
  minConsecutive: parseInt(process.env.ANOMALY_MIN_CONSECUTIVE) || 3,
  trendThreshold: parseFloat(process.env.ANOMALY_TREND_THRESHOLD) || 25,
  heartbeatTimeout: parseInt(process.env.ANOMALY_HEARTBEAT_TIMEOUT) || 60,
};

console.log('🔧 Anomaly Detection Config:', {
  warmupSamples: config.warmupSamples,
  warningSigma: config.warningSigma,
  criticalSigma: config.criticalSigma,
  minConsecutive: config.minConsecutive,
});

/**
 * Adaptive Window Statistics with Warm-up Period
 * 
 * Collects samples and builds adaptive baseline
 */
class WindowStats {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.values = [];
    this.consecutiveBreaches = 0;
    this.isWarmedUp = false;
    
    // Adaptive baseline (exponential moving average)
    this.ema = null;
    this.emaAlpha = 0.2; // Smoothing factor (0.2 = 20% weight to new data)
    
    // Statistics
    this.mean = 0;
    this.stdDev = 0;
    this.min = Infinity;
    this.max = -Infinity;
    this.p95 = 0;
    this.p99 = 0;
  }

  /**
   * Add new value to window
   */
  push(value) {
    if (typeof value !== 'number' || isNaN(value)) return;
    
    this.values.push(value);
    if (this.values.length > this.maxSize) {
      this.values.shift();
    }

    // Update EMA
    if (this.ema === null) {
      this.ema = value;
    } else {
      this.ema = this.emaAlpha * value + (1 - this.emaAlpha) * this.ema;
    }

    // Check if warmed up
    if (!this.isWarmedUp && this.values.length >= config.warmupSamples) {
      this.isWarmedUp = true;
      console.log(`✅ Warm-up complete: ${this.values.length} samples collected`);
    }

    // Recalculate statistics
    this.updateStats();
  }

  /**
   * Update statistical measures
   */
  updateStats() {
    if (this.values.length === 0) return;

    // Mean
    this.mean = this.values.reduce((sum, v) => sum + v, 0) / this.values.length;

    // Standard deviation
    const squaredDiffs = this.values.map(v => Math.pow(v - this.mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / this.values.length;
    this.stdDev = Math.sqrt(variance);

    // Min/Max
    this.min = Math.min(...this.values);
    this.max = Math.max(...this.values);

    // Percentiles
    const sorted = [...this.values].sort((a, b) => a - b);
    this.p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    this.p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  }

  /**
   * Calculate linear regression slope (trend detection)
   */
  getSlope() {
    if (this.values.length < 3) return 0;

    const n = this.values.length;
    const recentValues = this.values.slice(-Math.min(10, n)); // Last 10 samples
    const x = recentValues.map((_, i) => i);
    const y = recentValues;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (recentValues.length * sumXY - sumX * sumY) / 
                  (recentValues.length * sumX2 - sumX * sumX);

    return slope || 0;
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      mean: this.mean.toFixed(2),
      stdDev: this.stdDev.toFixed(2),
      ema: this.ema?.toFixed(2) || '0',
      min: this.min === Infinity ? 0 : this.min.toFixed(2),
      max: this.max === -Infinity ? 0 : this.max.toFixed(2),
      p95: this.p95.toFixed(2),
      p99: this.p99.toFixed(2),
      slope: this.getSlope().toFixed(4),
      samples: this.values.length,
      warmedUp: this.isWarmedUp,
    };
  }
}

/**
 * Detect anomaly for a single metric
 * 
 * Returns: { status: 'normal'|'warning'|'critical', reason: string }
 */
function detectMetricAnomaly(currentValue, window, metricName) {
  // Still warming up - don't alert
  if (!window.isWarmedUp) {
    return { status: 'learning', reason: `collecting_baseline_${metricName}` };
  }

  // Calculate thresholds based on adaptive baseline
  const warningThreshold = window.mean + config.warningSigma * window.stdDev;
  const criticalThreshold = window.mean + config.criticalSigma * window.stdDev;

  // Check for breach
  const isCriticalBreach = currentValue > criticalThreshold;
  const isWarningBreach = currentValue > warningThreshold;

  // Hysteresis: require consecutive breaches
  if (isCriticalBreach || isWarningBreach) {
    window.consecutiveBreaches++;
  } else {
    window.consecutiveBreaches = 0;
  }

  // Only trigger if consecutive breaches meet threshold
  if (window.consecutiveBreaches >= config.minConsecutive) {
    if (isCriticalBreach) {
      return {
        status: 'critical',
        reason: `${metricName}_extremely_high`,
        details: `${currentValue.toFixed(2)} > ${criticalThreshold.toFixed(2)} (${config.criticalSigma}σ)`,
      };
    }
    if (isWarningBreach) {
      return {
        status: 'warning',
        reason: `${metricName}_elevated`,
        details: `${currentValue.toFixed(2)} > ${warningThreshold.toFixed(2)} (${config.warningSigma}σ)`,
      };
    }
  }

  // Check for rising trend
  const slope = window.getSlope();
  const trendPercent = (slope / window.mean) * 100;
  
  if (trendPercent > config.trendThreshold) {
    return {
      status: 'warning',
      reason: `${metricName}_rising_trend`,
      details: `+${trendPercent.toFixed(1)}% increase detected`,
    };
  }

  return { status: 'normal', reason: 'within_baseline' };
}

/**
 * Evaluate overall service health
 * 
 * Combines multiple metrics with intelligent logic
 */
export function evaluateService(metrics, windows) {
  const { latency, errorRate, requestCount } = metrics;

  // Push current values to windows
  windows.latency.push(latency);
  windows.errorRate.push(errorRate);
  windows.requestCount.push(requestCount);

  // Check if any window is still warming up
  const anyWarming = !windows.latency.isWarmedUp || 
                     !windows.errorRate.isWarmedUp || 
                     !windows.requestCount.isWarmedUp;

  if (anyWarming) {
    const samplesCollected = Math.min(
      windows.latency.values.length,
      windows.errorRate.values.length,
      windows.requestCount.values.length
    );
    return {
      status: 'learning',
      reason: 'collecting_baseline',
      details: `${samplesCollected}/${config.warmupSamples} samples`,
    };
  }

  // Detect anomalies for each metric
  const latencyAnomaly = detectMetricAnomaly(latency, windows.latency, 'latency');
  const errorAnomaly = detectMetricAnomaly(errorRate, windows.errorRate, 'error_rate');
  const requestAnomaly = detectMetricAnomaly(requestCount, windows.requestCount, 'request_count');

  // Collect all anomalies
  const anomalies = [latencyAnomaly, errorAnomaly, requestAnomaly];
  const criticalAnomalies = anomalies.filter(a => a.status === 'critical');
  const warningAnomalies = anomalies.filter(a => a.status === 'warning');

  // Decision logic (prioritize critical issues)
  
  // CRITICAL: Error rate is the most important metric
  if (errorRate > 50) {
    return {
      status: 'unhealthy',
      reason: 'high_error_rate',
      details: `${errorRate.toFixed(1)}% errors - service failing`,
    };
  }

  // CRITICAL: Any metric extremely out of range
  if (criticalAnomalies.length > 0) {
    return {
      status: 'unhealthy',
      reason: criticalAnomalies[0].reason,
      details: criticalAnomalies[0].details,
    };
  }

  // WARNING: Multiple metrics degraded
  if (warningAnomalies.length >= 2) {
    return {
      status: 'degraded',
      reason: 'multiple_metrics_elevated',
      details: warningAnomalies.map(a => a.reason).join(', '),
    };
  }

  // WARNING: Single metric elevated
  if (warningAnomalies.length === 1) {
    return {
      status: 'degraded',
      reason: warningAnomalies[0].reason,
      details: warningAnomalies[0].details,
    };
  }

  // HEALTHY: All metrics within baseline
  return {
    status: 'healthy',
    reason: 'all_metrics_normal',
    details: 'Operating within expected parameters',
  };
}

/**
 * Get diagnostic information for debugging
 */
export function getDiagnostics(windows) {
  return {
    latency: windows.latency.getStats(),
    errorRate: windows.errorRate.getStats(),
    requestCount: windows.requestCount.getStats(),
  };
}

export { WindowStats, config as anomalyConfig };
