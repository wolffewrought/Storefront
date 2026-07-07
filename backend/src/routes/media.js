import express from 'express';
import { queryOne, queryAll } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Add image to product
router.post('/images/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { imageUrl, displayOrder } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'Image URL required' });
    }
    
    // TODO: Check if admin
    
    const product = await queryOne('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const result = await queryAll(
      'INSERT INTO product_images (product_id, image_url, display_order) VALUES (?, ?, ?)',
      [productId, imageUrl, displayOrder || 0]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.lastID, imageUrl, displayOrder },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete image
router.delete('/images/:imageId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { imageId } = req.params;
    
    // TODO: Check if admin
    
    const image = await queryOne('SELECT id FROM product_images WHERE id = ?', [imageId]);
    if (!image) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    
    await queryAll('DELETE FROM product_images WHERE id = ?', [imageId]);
    
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Add video to product
router.post('/videos/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { videoUrl, displayOrder } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ success: false, error: 'Video URL required' });
    }
    
    // TODO: Check if admin
    
    const product = await queryOne('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const result = await queryAll(
      'INSERT INTO product_videos (product_id, video_url, display_order) VALUES (?, ?, ?)',
      [productId, videoUrl, displayOrder || 0]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.lastID, videoUrl, displayOrder },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete video
router.delete('/videos/:videoId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // TODO: Check if admin
    
    const video = await queryOne('SELECT id FROM product_videos WHERE id = ?', [videoId]);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    
    await queryAll('DELETE FROM product_videos WHERE id = ?', [videoId]);
    
    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Add file to product (STL, OBJ, etc.)
router.post('/files/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { fileName, fileUrl, fileType } = req.body;
    
    if (!fileName || !fileUrl) {
      return res.status(400).json({ success: false, error: 'File name and URL required' });
    }
    
    // TODO: Check if admin
    
    const product = await queryOne('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const result = await queryAll(
      'INSERT INTO product_files (product_id, file_name, file_url, file_type) VALUES (?, ?, ?, ?)',
      [productId, fileName, fileUrl, fileType || null]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.lastID, fileName, fileUrl, fileType },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete file
router.delete('/files/:fileId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // TODO: Check if admin
    
    const file = await queryOne('SELECT id FROM product_files WHERE id = ?', [fileId]);
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    await queryAll('DELETE FROM product_files WHERE id = ?', [fileId]);
    
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
