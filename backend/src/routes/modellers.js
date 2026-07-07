import express from 'express';
import { queryOne, queryAll } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all modellers
router.get('/', async (req, res) => {
  try {
    const modellers = await queryAll('SELECT * FROM modellers ORDER BY name');
    res.json({ success: true, data: modellers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Create modeller (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name required' });
    }
    
    // TODO: Check if admin
    
    // Check if exists
    const existing = await queryOne('SELECT id FROM modellers WHERE name = ?', [name]);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Modeller already exists' });
    }
    
    const result = await queryAll(
      'INSERT INTO modellers (name, description) VALUES (?, ?)',
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

// Update modeller (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    // TODO: Check if admin
    
    const modeller = await queryOne('SELECT id FROM modellers WHERE id = ?', [id]);
    if (!modeller) {
      return res.status(404).json({ success: false, error: 'Modeller not found' });
    }
    
    await queryAll(
      'UPDATE modellers SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );
    
    res.json({ success: true, message: 'Modeller updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete modeller (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Check if admin
    
    const modeller = await queryOne('SELECT id FROM modellers WHERE id = ?', [id]);
    if (!modeller) {
      return res.status(404).json({ success: false, error: 'Modeller not found' });
    }
    
    // Check if products use this modeller
    const productsCount = await queryOne(
      'SELECT COUNT(*) as count FROM products WHERE modeller_id = ?',
      [id]
    );
    
    if (productsCount && productsCount.count > 0) {
      return res.status(409).json({ success: false, error: 'Cannot delete modeller with products' });
    }
    
    await queryAll('DELETE FROM modellers WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Modeller deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
