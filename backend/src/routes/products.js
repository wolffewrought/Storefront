import express from 'express';
import { queryOne, queryAll } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all products with filters
router.get('/', async (req, res) => {
  try {
    const { category, ip, modeller, type, minPrice, maxPrice, search } = req.query;
    
    let sql = `
      SELECT 
        p.*,
        c.name as category_name,
        c.type as category_type,
        i.name as ip_name,
        m.name as modeller_name,
        (SELECT pi.image_url FROM product_images pi
         WHERE pi.product_id = p.id
         ORDER BY pi.display_order ASC, pi.id ASC LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN ips i ON p.ip_id = i.id
      LEFT JOIN modellers m ON p.modeller_id = m.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (type) {
      sql += ` AND c.type = ?`;
      params.push(type);
    }
    
    if (category) {
      sql += ` AND p.category_id = ?`;
      params.push(category);
    }
    
    if (ip) {
      sql += ` AND p.ip_id = ?`;
      params.push(ip);
    }
    
    if (modeller) {
      sql += ` AND p.modeller_id = ?`;
      params.push(modeller);
    }
    
    if (minPrice) {
      sql += ` AND p.price >= ?`;
      params.push(minPrice);
    }
    
    if (maxPrice) {
      sql += ` AND p.price <= ?`;
      params.push(maxPrice);
    }
    
    if (search) {
      sql += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    sql += ` ORDER BY p.created_at DESC`;
    
    const products = await queryAll(sql, params);
    
    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get single product with images, videos, files, reviews
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await queryOne(`
      SELECT 
        p.*,
        c.name as category_name,
        c.type as category_type,
        i.name as ip_name,
        m.name as modeller_name,
        (SELECT pi.image_url FROM product_images pi
         WHERE pi.product_id = p.id
         ORDER BY pi.display_order ASC, pi.id ASC LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN ips i ON p.ip_id = i.id
      LEFT JOIN modellers m ON p.modeller_id = m.id
      WHERE p.id = ?
    `, [id]);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // Get media
    const images = await queryAll('SELECT id, image_url, display_order FROM product_images WHERE product_id = ? ORDER BY display_order', [id]);
    const videos = await queryAll('SELECT id, video_url, display_order FROM product_videos WHERE product_id = ? ORDER BY display_order', [id]);
    const files = await queryAll('SELECT id, file_name, file_url, file_type FROM product_files WHERE product_id = ?', [id]);
    
    // Get reviews
    const reviews = await queryAll(`
      SELECT r.id, r.rating, r.review_text, r.created_at, u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `, [id]);
    
    res.json({
      success: true,
      data: {
        ...product,
        images,
        videos,
        files,
        reviews,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Create product (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, categoryId, ipId, modellerId, price, stockCount } = req.body;
    
    if (!name || !categoryId || !modellerId || price === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // TODO: Check if admin
    
    const result = await queryAll(
      `INSERT INTO products (name, description, category_id, ip_id, modeller_id, price, stock_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, categoryId, ipId || null, modellerId, price, stockCount || null]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.lastID, name, categoryId, modellerId, price },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update product (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, categoryId, ipId, modellerId, price, stockCount } = req.body;
    
    // TODO: Check if admin
    
    const product = await queryOne('SELECT id FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    await queryAll(
      `UPDATE products 
       SET name = ?, description = ?, category_id = ?, ip_id = ?, modeller_id = ?, price = ?, stock_count = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description, categoryId, ipId || null, modellerId, price, stockCount || null, id]
    );
    
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete product (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Check if admin
    
    const product = await queryOne('SELECT id FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    await queryAll('DELETE FROM products WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Increment download counter
router.post('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    
    await queryAll(
      'UPDATE products SET download_count = download_count + 1 WHERE id = ?',
      [id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
