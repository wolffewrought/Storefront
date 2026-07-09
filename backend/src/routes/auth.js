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
import { sendPasswordReset } from '../services/emailService.js';

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
    const resetUrl = `https://wolffewrought.shop/reset-password?token=${token}`;
    sendPasswordReset({ to: email, resetUrl });

    res.json({
      success: true,
      message: 'If email exists, reset link sent',
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

// One-time admin setup: only active while ADMIN_SETUP_SECRET env var is set.
// Usage: /api/auth/promote?secret=YOURSECRET&username=YOURNAME
// Remove the env var in Railway after use to disable this endpoint.
router.get('/promote', async (req, res) => {
  const setupSecret = process.env.ADMIN_SETUP_SECRET;
  if (!setupSecret) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  const { secret, username } = req.query;
  if (secret !== setupSecret || !username) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const result = await queryAll('UPDATE users SET is_admin = 1 WHERE username = ?', [username]);
  if (!result.changes) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.json({ success: true, message: `${username} is now admin. Remove ADMIN_SETUP_SECRET from Railway now.` });
});

export default router;
