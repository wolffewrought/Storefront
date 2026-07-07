import express from 'express';
import { queryOne, queryAll } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all categories (grouped by type)
router.get('/', async (req, res) => {
  try {
    const categories = await queryAll(
      'SELECT * FROM categories ORDER BY type, name'
    );
    
    // Group by type
    const grouped = categories.reduce((acc, cat) => {
      if (!acc[cat.type]) acc[cat.type] = [];
      acc[cat.type].push(cat);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Create category (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, type, description } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // TODO: Check if admin
    
    // Check if already exists
    const existing = await queryOne(
      'SELECT id FROM categories WHERE name = ? AND type = ?',
      [name, type]
    );
    
    if (existing) {
      return res.status(409).json({ success: false, error: 'Category already exists' });
    }
    
    const result = await queryAll(
      'INSERT INTO categories (name, type, description) VALUES (?, ?, ?)',
      [name, type, description || null]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.lastID, name, type, description },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update category (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    // TODO: Check if admin
    
    const category = await queryOne('SELECT id FROM categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    await queryAll(
      'UPDATE categories SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description || null, id]
    );
    
    res.json({ success: true, message: 'Category updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Check if admin
    
    const category = await queryOne('SELECT id FROM categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    // Check if products exist
    const productsCount = await queryOne(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );
    
    if (productsCount && productsCount.count > 0) {
      return res.status(409).json({ success: false, error: 'Cannot delete category with products' });
    }
    
    await queryAll('DELETE FROM categories WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
