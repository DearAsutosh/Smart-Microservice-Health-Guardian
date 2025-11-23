import { createHealthAgent } from './shared/health-agent/index.js';

const agent = createHealthAgent('test-service', 'http://localhost:3000');

// Simulate requests
for (let i = 0; i < 10; i++) {
  agent.recordRequest(100, 200);
}

const metrics = agent.calculateMetrics();
console.log('Metrics:', metrics);
console.log('Total Requests:', agent.metrics.totalRequests);

const payload = {
  serviceName: agent.serviceName,
  latency: metrics.avgLatency,
  errorRate: metrics.errorRate,
  statusCode: 200,
  memoryUsage: metrics.memoryUsage,
  requestCount: metrics.requestCount,
  totalRequests: agent.metrics.totalRequests
};

console.log('Payload:', payload);
