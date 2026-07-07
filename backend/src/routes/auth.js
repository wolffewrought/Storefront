import express from 'express';
import { queryOne, queryAll } from '../db.js';
import { 
  generateToken, 
  hashPassword, 
  verifyPassword, 
  createResetToken, 
  validateResetToken, 
  clearResetToken 
} from '../services/authService.js';
import validator from 'validator';

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    // Validate
    if (!email || !username || !password) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    
    // Check if user exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email or username already exists' });
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const result = await queryAll(
      'INSERT INTO users (email, username, password_hash, is_admin) VALUES (?, ?, ?, ?)',
      [email, username, passwordHash, 0]
    );
    
    const userId = result.lastID;
    const token = generateToken(userId);
    
    res.status(201).json({
      success: true,
      data: {
        userId,
        email,
        username,
        token,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    
    if (!emailOrUsername || !password) {
      return res.status(400).json({ success: false, error: 'Missing credentials' });
    }
    
    const user = await queryOne(
      'SELECT id, email, username, password_hash, is_admin FROM users WHERE email = ? OR username = ?',
      [emailOrUsername, emailOrUsername]
    );
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const token = generateToken(user.id);
    
    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.is_admin,
        token,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' });
    }
    
    const user = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    
    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If email exists, reset link sent' });
    }
    
    const token = await createResetToken(user.id);
    
    // TODO: Send email with reset link
    // For now, log it
    console.log(`Password reset token for ${email}: ${token}`);
    
    res.json({
      success: true,
      message: 'Reset link sent (check console in dev)',
      token, // Only in dev
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    
    const resetRecord = await validateResetToken(token);
    
    if (!resetRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }
    
    const passwordHash = await hashPassword(newPassword);
    
    await queryAll(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, resetRecord.user_id]
    );
    
    await clearResetToken(token);
    
    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
