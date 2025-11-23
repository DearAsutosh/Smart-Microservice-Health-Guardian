import express from 'express';
import { createHealthAgent } from '../../shared/health-agent/index.js';

const app = express();
const PORT = 3003;
const SERVICE_NAME = 'storage-service';

// Create health agent
const healthAgent = createHealthAgent(SERVICE_NAME);

// Middleware
app.use(express.json());
app.use(healthAgent.middleware());

// Simulate random delays and failures
const simulateRealisticBehavior = () => {
  const rand = Math.random();
  let delay, shouldFail;

  if (rand < 0.80) {
    // Normal - most reliable service
    delay = 30 + Math.random() * 150;
    shouldFail = Math.random() < 0.005; // 0.5% error rate
  } else if (rand < 0.94) {
    // Elevated
    delay = 200 + Math.random() * 400;
    shouldFail = Math.random() < 0.03; // 3% error rate
  } else if (rand < 0.98) {
    // High
    delay = 600 + Math.random() * 900;
    shouldFail = Math.random() < 0.07; // 7% error rate
  } else {
    // Critical
    delay = 1500 + Math.random() * 2500;
    shouldFail = Math.random() < 0.12; // 12% error rate
  }

  return { delay, shouldFail };
};

// Routes
app.get('/', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    status: 'running',
    port: PORT,
    endpoints: ['/upload', '/download', '/delete']
  });
});

app.post('/upload', async (req, res) => {
  const { delay, shouldFail } = simulateRealisticBehavior();
  
  await new Promise(resolve => setTimeout(resolve, delay));

  if (shouldFail) {
    return res.status(507).json({
      success: false,
      error: 'Insufficient storage space'
    });
  }

  res.json({
    success: true,
    fileId: 'FILE-' + Date.now(),
    url: 'https://storage.example.com/files/' + Date.now(),
    size: Math.floor(Math.random() * 10000)
  });
});

app.get('/download/:fileId', async (req, res) => {
  const { delay, shouldFail } = simulateRealisticBehavior();
  
  await new Promise(resolve => setTimeout(resolve, delay));

  if (shouldFail) {
    return res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }

  res.json({
    success: true,
    fileId: req.params.fileId,
    url: 'https://storage.example.com/files/' + req.params.fileId,
    content: 'dummy-file-content'
  });
});

app.delete('/delete/:fileId', async (req, res) => {
  const { delay, shouldFail } = simulateRealisticBehavior();
  
  await new Promise(resolve => setTimeout(resolve, delay));

  if (shouldFail) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete file'
    });
  }

  res.json({
    success: true,
    message: 'File deleted successfully',
    fileId: req.params.fileId
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const status = healthAgent.getStatus();
  res.json(status);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n💾 ${SERVICE_NAME} running on port ${PORT}`);
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
