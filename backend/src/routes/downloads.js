import express from 'express';
import { queryOne, queryAll } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  isStorageConfigured,
  makeKey,
  presignUpload,
  presignDownload,
  publicImageUrl,
} from '../services/storage.js';

const router = express.Router();

// Admin: get a presigned upload URL.
// Body: { fileName, contentType, kind: 'file' | 'image' }
// Browser then PUTs the file straight to R2, and registers the result
// via the existing /media routes (image_url = public URL, file_url = object key).
router.post('/upload-url', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!isStorageConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Storage not configured. Set R2_* environment variables.',
      });
    }

    const { fileName, contentType, kind } = req.body;
    if (!fileName || !['file', 'image'].includes(kind)) {
      return res.status(400).json({ success: false, error: 'fileName and kind (file|image) required' });
    }

    const key = makeKey(fileName);
    const { uploadUrl } = await presignUpload({ key, contentType, kind });

    res.json({
      success: true,
      data: {
        uploadUrl,
        key,
        publicUrl: kind === 'image' ? publicImageUrl(key) : null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Customer: get download links for a delivered order.
// Verifies: order exists, belongs to requester (or admin), status = delivered.
// Returns short-lived presigned URLs — safe to show in the UI.
router.get('/order/:ticketId', authenticateToken, async (req, res) => {
  try {
    if (!isStorageConfigured()) {
      return res.status(503).json({ success: false, error: 'Storage not configured' });
    }

    const { ticketId } = req.params;

    const order = await queryOne(
      'SELECT * FROM order_tickets WHERE ticket_id = ?',
      [ticketId]
    );

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.user_id !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Not your order' });
    }

    if (order.status !== 'archived') {
      return res.status(403).json({
        success: false,
        error: 'Downloads become available once the order is delivered',
      });
    }

    // All files attached to products in this order
    const files = await queryAll(
      `SELECT pf.id, pf.file_name, pf.file_type, pf.file_url, p.name AS product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN product_files pf ON pf.product_id = p.id
       WHERE oi.order_ticket_id = ?`,
      [order.id]
    );

    const downloads = await Promise.all(
      files.map(async (f) => ({
        id: f.id,
        productName: f.product_name,
        fileName: f.file_name,
        fileType: f.file_type,
        // file_url holds either an R2 object key (new uploads) or a legacy full URL
        url: f.file_url.startsWith('http')
          ? f.file_url
          : await presignDownload(f.file_url, f.file_name),
      }))
    );

    res.json({ success: true, data: downloads });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
