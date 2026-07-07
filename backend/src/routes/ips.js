import express from 'express';
import { queryOne, queryAll } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all IPs
router.get('/', async (req, res) => {
  try {
    const ips = await queryAll('SELECT * FROM ips ORDER BY name');
    res.json({ success: true, data: ips });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Create IP (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name required' });
    }
    
    // TODO: Check if admin
    
    // Check if exists
    const existing = await queryOne('SELECT id FROM ips WHERE name = ?', [name]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'IP already exists' });
    }
    
    const result = await queryAll(
      'INSERT INTO ips (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.lastID, name, description },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update IP (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    // TODO: Check if admin
    
    const ip = await queryOne('SELECT id FROM ips WHERE id = ?', [id]);
    if (!ip) {
      return res.status(404).json({ success: false, error: 'IP not found' });
    }
    
    await queryAll(
      'UPDATE ips SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
    
    res.json({ success: true, message: 'IP updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete IP (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Check if admin
    
    const ip = await queryOne('SELECT id FROM ips WHERE id = ?', [id]);
    if (!ip) {
      return res.status(404).json({ success: false, error: 'IP not found' });
    }
    
    // Check if products use this IP
    const productsCount = await queryOne(
      'SELECT COUNT(*) as count FROM products WHERE ip_id = ?',
      [id]
    );
    
    if (productsCount && productsCount.count > 0) {
      return res.status(409).json({ success: false, error: 'Cannot delete IP with products' });
    }
    
    await queryAll('DELETE FROM ips WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'IP deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
