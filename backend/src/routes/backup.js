import express from 'express';
import fs from 'fs';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import config from '../config.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Reuse R2 credentials (private files bucket) for backups
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

// Admin: back up the SQLite database file to the private R2 bucket.
// No-op-safe if not on SQLite or storage unconfigured.
router.post('/database', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (config.dbType !== 'sqlite') {
      return res.status(400).json({
        success: false,
        error: 'Backup endpoint currently supports SQLite only',
      });
    }
    if (!config.r2.accountId || !config.r2.accessKeyId) {
      return res.status(503).json({ success: false, error: 'Storage not configured' });
    }
    if (!fs.existsSync(config.dbPath)) {
      return res.status(404).json({ success: false, error: 'Database file not found' });
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `backups/storefront-${stamp}.db`;
    const body = fs.readFileSync(config.dbPath);

    await r2.send(new PutObjectCommand({
      Bucket: config.r2.filesBucket,
      Key: key,
      Body: body,
      ContentType: 'application/x-sqlite3',
    }));

    res.json({
      success: true,
      message: 'Backup uploaded',
      data: { key, sizeBytes: body.length, at: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Backup failed:', error);
    res.status(500).json({ success: false, error: 'Backup failed' });
  }
});

export default router;
