import jwt from 'jsonwebtoken';
import config from '../config.js';
import { queryOne } from '../db.js';

export const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Use after authenticateToken: checks the JWT user's is_admin flag in DB
export const requireAdmin = async (req, res, next) => {
  if (!req.user?.userId) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const user = await queryOne('SELECT is_admin FROM users WHERE id = ?', [req.user.userId]);
    if (!user || !user.is_admin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const optionalAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (token) {
    jwt.verify(token, config.jwtSecret, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};
