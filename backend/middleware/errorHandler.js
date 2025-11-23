import logger from '../utils/logger.js';

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Default error status and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Send error response
  res.status(statusCode).json({
    success: false,
    message: message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// Async error wrapper - wraps async route handlers to catch errors
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
