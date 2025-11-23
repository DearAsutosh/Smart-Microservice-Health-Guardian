import express from 'express';
import { createHealthAgent } from '../../shared/health-agent/index.js';

const app = express();
const PORT = 3002;
const SERVICE_NAME = 'booking-service';

// Create health agent
const healthAgent = createHealthAgent(SERVICE_NAME);

// Middleware
app.use(express.json());
app.use(healthAgent.middleware());

// Simulate random delays and failures
const simulateRealisticBehavior = () => {
  const rand = Math.random();
  let delay, shouldFail;

  if (rand < 0.75) {
    // Normal - slightly better than auth
    delay = 40 + Math.random() * 200;
    shouldFail = Math.random() < 0.008; // 0.8% error rate
  } else if (rand < 0.92) {
    // Elevated
    delay = 250 + Math.random() * 450;
    shouldFail = Math.random() < 0.04; // 4% error rate
  } else if (rand < 0.97) {
    // High
    delay = 700 + Math.random() * 1000;
    shouldFail = Math.random() < 0.08; // 8% error rate
  } else {
    // Critical
    delay = 1800 + Math.random() * 2200;
    shouldFail = Math.random() < 0.15; // 15% error rate
  }

  return { delay, shouldFail };
};

// Routes
app.get('/', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'running',
    port: PORT,
    endpoints: ['/book', '/cancel', '/list']
  });
});

app.post('/book', async (req, res) => {
  const { delay, shouldFail } = simulateRealisticBehavior();
  
  await new Promise(resolve => setTimeout(resolve, delay));

  if (shouldFail) {
    return res.status(500).json({
      success: false,
      error: 'Booking failed - service unavailable'
    });
  }

  res.json({
    success: true,
    bookingId: 'BK-' + Date.now(),
    status: 'confirmed',
    details: req.body
  });
});

app.post('/cancel', async (req, res) => {
  const { delay, shouldFail } = simulateRealisticBehavior();
  
  await new Promise(resolve => setTimeout(resolve, delay));

  if (shouldFail) {
    return res.status(404).json({
      success: false,
      error: 'Booking not found'
    });
  }

  res.json({
    success: true,
    message: 'Booking cancelled successfully',
    bookingId: req.body.bookingId
  });
});

app.get('/list', async (req, res) => {
  const { delay, shouldFail } = simulateRealisticBehavior();
  
  await new Promise(resolve => setTimeout(resolve, delay));

  if (shouldFail) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve bookings'
    });
  }

  res.json({
    success: true,
    bookings: [
      { id: 'BK-001', status: 'confirmed' },
      { id: 'BK-002', status: 'pending' }
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const status = healthAgent.getStatus();
  res.json(status);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n📅 ${SERVICE_NAME} running on port ${PORT}`);
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
