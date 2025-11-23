import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '2h';

// POST /auth/login - Admin login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    logger.warn('Login attempt with missing credentials', { email });
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    logger.warn('Login attempt with non-existent email', { email });
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  
  if (!isPasswordValid) {
    logger.warn('Login attempt with incorrect password', { email });
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user._id,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  logger.info('User logged in successfully', { email: user.email });

  // Return success response
  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      email: user.email
    }
  });
}));

// POST /auth/change-password - Change user password (PROTECTED)
router.post('/change-password', verifyToken, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  // Validate input
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current and new passwords are required'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters long'
    });
  }

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    logger.warn('Password change failed: Incorrect current password', { userId });
    return res.status(401).json({
      success: false,
      message: 'Incorrect current password'
    });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  logger.info('Password changed successfully', { userId });

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
}));

export default router;
