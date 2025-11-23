import express from 'express';
import { createHealthAgent } from './health-agent.js';

const app = express();
const PORT = 3001;
const SERVICE_NAME = 'auth-service';

// Create health agent
const healthAgent = createHealthAgent(SERVICE_NAME);

// Middleware
app.use(express.json());
app.use(healthAgent.middleware());

// Simulate random delays and failures
const simulateRealisticBehavior = () => {
  // 80% of the time: normal latency (50-300ms)
  // 15% of the time: elevated latency (300-700ms)
  // 4% of the time: high latency (700-1500ms)
  // 1% of the time: critical latency (1500-3000ms)
  
  const rand = Math.random();
  let delay, shouldFail;

  if (rand < 0.80) {
    // Normal - increased from 70% to 80%
    delay = 50 + Math.random() * 250;
    shouldFail = Math.random() < 0.01; // 1% error rate
  } else if (rand < 0.95) {
    // Elevated - adjusted range
    delay = 300 + Math.random() * 400;
    shouldFail = Math.random() < 0.03; // 3% error rate (reduced from 5%)
  } else if (rand < 0.99) {
    // High - reduced from 8% to 4%
    delay = 700 + Math.random() * 800;
    shouldFail = Math.random() < 0.08; // 8% error rate (reduced from 10%)
  } else {
    // Critical - reduced from 2% to 1%
    delay = 1500 + Math.random() * 1500;
    shouldFail = Math.random() < 0.15; // 15% error rate (reduced from 20%)
  }

  return { delay, shouldFail };
};

// Routes
app.get('/', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'running',
    port: PORT,
    endpoints: ['/login', '/verify', '/logout']
  });
});

app.post('/login', async (req, res) => {
  const { delay, shouldFail } = simulateRealisticBehavior();
  
  await new Promise(resolve => setTimeout(resolve, delay));

  if (shouldFail) {
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }

  res.json({
    success: true,
    token: 'dummy-jwt-token-' + Date.now(),
    user: { id: 1, username: 'testuser' }
  });
});

app.post('/verify', async (req, res) => {
  const { delay, shouldFail } = simulateRealisticBehavior();
  
  await new Promise(resolve => setTimeout(resolve, delay));

  if (shouldFail) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  res.json({
    success: true,
    valid: true,
    user: { id: 1, username: 'testuser' }
  });
});

app.post('/logout', async (req, res) => {
  const { delay, shouldFail } = simulateRealisticBehavior();
  
  await new Promise(resolve => setTimeout(resolve, delay));

  if (shouldFail) {
    return res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const status = healthAgent.getStatus();
  res.json(status);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🔐 ${SERVICE_NAME} running on port ${PORT}`);
  console.log(`📡 Endpoints: http://localhost:${PORT}\n`);
  
  // Start health agent
  healthAgent.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Shutting down...');
  healthAgent.stop();
  process.exit(0);
});
