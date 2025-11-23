import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import metricsRoutes from './routes/metrics.js';
import servicesRoutes from './routes/services.js';
import authRoutes from './routes/auth.js';
import { startIntelligentEvaluator } from './jobs/intelligentEvaluator.js';
import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import Service from './models/Service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Microservice Health Guardian API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth/login',
      metrics: '/ingest/metrics',
      services: '/services',
      serviceHistory: '/services/:id/history',
      autoRestart: '/actions/restart'
    }
  });
});

app.use('/auth', authRoutes);
app.use('/ingest', metricsRoutes);
app.use('/services', servicesRoutes);

// Error handling middleware (must be after routes)
app.use(errorHandler);

// 404 handler (must be last)
app.use((req, res) => {
  logger.warn('404 - Endpoint not found', { path: req.path, method: req.method });
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Reset all service statuses to 'unknown' on startup
    // This prevents false "Service Stopped" alerts from old data
    await Service.updateMany({}, { status: 'unknown' });
    logger.info('Reset all service statuses to unknown');

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`Health Guardian Backend running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start intelligent evaluator cron job
    startIntelligentEvaluator();

  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;
