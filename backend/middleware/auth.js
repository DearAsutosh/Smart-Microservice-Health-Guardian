import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const verifyToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Unauthorized access attempt - No token provided', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No token provided'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    
    logger.debug('Token verified successfully', { userId: decoded.userId });
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token provided', {
        ip: req.ip,
        path: req.path,
        error: error.message
      });
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      logger.warn('Expired token provided', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Token expired'
      });
    }

    logger.error('Token verification error', { error: error.message });
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
};
