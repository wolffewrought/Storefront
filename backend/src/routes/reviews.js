import express from 'express';
import { queryOne, queryAll } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const reviews = await queryAll(`
      SELECT r.id, r.rating, r.review_text, r.created_at, u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [productId, parseInt(limit), parseInt(offset)]);
    
    const countResult = await queryOne(
      'SELECT COUNT(*) as total FROM reviews WHERE product_id = ?',
      [productId]
    );
    
    res.json({
      success: true,
      data: reviews,
      total: countResult.total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Submit review (authenticated)
router.post('/product/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, reviewText } = req.body;
    const userId = req.user.userId;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be 1-5' });
    }
    
    // Check if product exists
    const product = await queryOne('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // Check if user already reviewed
    const existing = await queryOne(
      'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
      [productId, userId]
    );
    
    if (existing) {
      return res.status(409).json({ success: false, error: 'You already reviewed this product' });
    }
    
    // Create review
    const result = await queryAll(`
      INSERT INTO reviews (product_id, user_id, rating, review_text)
      VALUES (?, ?, ?, ?)
    `, [productId, userId, rating, reviewText || null]);
    
    // Update product average rating
    const avgResult = await queryOne(`
      SELECT AVG(rating) as avg, COUNT(*) as total
      FROM reviews
      WHERE product_id = ?
    `, [productId]);
    
    await queryAll(`
      UPDATE products
      SET average_rating = ?, total_ratings = ?
      WHERE id = ?
    `, [parseFloat(avgResult.avg).toFixed(2), avgResult.total, productId]);
    
    res.status(201).json({
      success: true,
      data: { id: result.lastID, rating, reviewText },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update review (authenticated)
router.put('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, reviewText } = req.body;
    const userId = req.user.userId;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be 1-5' });
    }
    
    // Check if review exists and belongs to user
    const review = await queryOne(
      'SELECT product_id FROM reviews WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    );
    
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }
    
    await queryAll(`
      UPDATE reviews
      SET rating = ?, review_text = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [rating, reviewText || null, reviewId]);
    
    // Update product average rating
    const avgResult = await queryOne(`
      SELECT AVG(rating) as avg, COUNT(*) as total
      FROM reviews
      WHERE product_id = ?
    `, [review.product_id]);
    
    await queryAll(`
      UPDATE products
      SET average_rating = ?, total_ratings = ?
      WHERE id = ?
    `, [parseFloat(avgResult.avg).toFixed(2), avgResult.total, review.product_id]);
    
    res.json({ success: true, message: 'Review updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete review (authenticated)
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;
    
    const review = await queryOne(
      'SELECT product_id FROM reviews WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    );
    
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }
    
    await queryAll('DELETE FROM reviews WHERE id = ?', [reviewId]);
    
    // Update product average rating
    const avgResult = await queryOne(`
      SELECT AVG(rating) as avg, COUNT(*) as total
      FROM reviews
      WHERE product_id = ?
    `, [review.product_id]);
    
    const avgRating = avgResult.avg ? parseFloat(avgResult.avg).toFixed(2) : 0;
    const totalRatings = avgResult.total || 0;
    
    await queryAll(`
      UPDATE products
      SET average_rating = ?, total_ratings = ?
      WHERE id = ?
    `, [avgRating, totalRatings, review.product_id]);
    
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
