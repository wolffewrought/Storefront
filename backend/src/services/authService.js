import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import { queryOne, queryAll } from '../db.js';

export const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpire });
};

export const hashPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

export const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export const generateResetToken = () => {
  return uuidv4();
};

export const createResetToken = async (userId) => {
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  
  await queryAll(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
    [userId, token, expiresAt.toISOString()]
  );
  
  return token;
};

export const validateResetToken = async (token) => {
  const resetRecord = await queryOne(
    `SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > datetime('now')`,
    [token]
  );
  return resetRecord;
};

export const clearResetToken = async (token) => {
  await queryAll(
    `DELETE FROM password_reset_tokens WHERE token = ?`,
    [token]
  );
};
