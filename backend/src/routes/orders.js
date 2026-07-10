import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { generateOrderPDF } from '../services/pdfService.js';
import { sendOrderSubmitted, sendAdminNewOrder, sendOrderDelivered } from '../services/emailService.js';
import fs from 'fs';
import path from 'path';
import config from '../config.js';

const router = express.Router();

// Get user's orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;
    
    let sql = 'SELECT * FROM order_tickets WHERE user_id = ?';
    const params = [userId];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const orders = await queryAll(sql, params);
    
    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get ALL orders (admin only) — must be defined before /:ticketId
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT ot.*, u.username, u.email
      FROM order_tickets ot
      JOIN users u ON ot.user_id = u.id
    `;
    const params = [];

    if (status) {
      sql += ' WHERE ot.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY ot.created_at DESC';

    const orders = await queryAll(sql, params);

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete any order (admin only) — must be defined before /:ticketId routes
router.delete('/admin/:ticketId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const order = await queryOne(
      'SELECT id FROM order_tickets WHERE ticket_id = ?',
      [ticketId]
    );
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    await queryAll('DELETE FROM order_tickets WHERE id = ?', [order.id]);
    res.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get single order with items
router.get('/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId;
    
    const order = await queryOne(
      'SELECT * FROM order_tickets WHERE ticket_id = ? AND user_id = ?',
      [ticketId, userId]
    );
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    const items = await queryAll(`
      SELECT oi.*, p.name, p.description
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_ticket_id = ?
    `, [order.id]);
    
    res.json({
      success: true,
      data: {
        ...order,
        items,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Create new order ticket (draft)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { items, customerName, customerEmail, customerNotes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in order' });
    }
    
    // Ticket naming: {customerNo}-{customerOrderSeq}-{HHMM}-{DDMMYYYY}
    // e.g. the 67th customer's first order at 21:32 on 25/07/2026
    // becomes 67-0001-2132-25072026
    const now = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const prior = await queryOne(
      'SELECT COUNT(*) AS c FROM order_tickets WHERE user_id = ?',
      [userId]
    );
    const seq = pad((prior?.c || 0) + 1, 4);
    // Format the ticket time in UK time (auto BST/GMT), not server UTC.
    // en-GB gives DD/MM/YYYY, HH:MM(:SS) which we strip to digits.
    const ukParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now).reduce((a, p) => (a[p.type] = p.value, a), {});
    const hhmm = ukParts.hour + ukParts.minute;
    const ddmmyyyy = ukParts.day + ukParts.month + ukParts.year;
    let ticketId = `${userId}-${seq}-${hhmm}-${ddmmyyyy}`;

    // Uniqueness guard (e.g. an earlier order in the sequence was deleted,
    // then a new one lands in the same minute)
    const clash = await queryOne('SELECT id FROM order_tickets WHERE ticket_id = ?', [ticketId]);
    if (clash) {
      ticketId += `-${uuidv4().substring(0, 4)}`;
    }
    
    // Calculate total
    let totalPrice = 0;
    for (const item of items) {
      const product = await queryOne('SELECT price FROM products WHERE id = ?', [item.productId]);
      if (!product) {
        return res.status(400).json({ success: false, error: `Product ${item.productId} not found` });
      }
      totalPrice += product.price * item.quantity;
    }
    
    // Create order
    const result = await queryAll(`
      INSERT INTO order_tickets (ticket_id, user_id, customer_name, customer_email, customer_notes, total_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [ticketId, userId, customerName || null, customerEmail || null, customerNotes || null, totalPrice]);
    
    const orderId = result.lastID;
    
    // Add items
    for (const item of items) {
      const product = await queryOne('SELECT price FROM products WHERE id = ?', [item.productId]);
      await queryAll(`
        INSERT INTO order_items (order_ticket_id, product_id, quantity, price_at_purchase)
        VALUES (?, ?, ?, ?)
      `, [orderId, item.productId, item.quantity, product.price]);
    }
    
    res.status(201).json({
      success: true,
      data: {
        id: orderId,
        ticketId,
        status: 'draft',
        totalPrice,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update order (draft only)
router.put('/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId;
    const { items, customerName, customerEmail, customerNotes } = req.body;
    
    const order = await queryOne(
      'SELECT id, status FROM order_tickets WHERE ticket_id = ? AND user_id = ?',
      [ticketId, userId]
    );
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    if (order.status !== 'draft') {
      return res.status(409).json({ success: false, error: 'Cannot edit non-draft orders' });
    }
    
    // Calculate new total if items provided
    let totalPrice = 0;
    if (items) {
      for (const item of items) {
        const product = await queryOne('SELECT price FROM products WHERE id = ?', [item.productId]);
        if (!product) {
          return res.status(400).json({ success: false, error: `Product ${item.productId} not found` });
        }
        totalPrice += product.price * item.quantity;
      }
      
      // Delete old items
      await queryAll('DELETE FROM order_items WHERE order_ticket_id = ?', [order.id]);
      
      // Add new items
      for (const item of items) {
        const product = await queryOne('SELECT price FROM products WHERE id = ?', [item.productId]);
        await queryAll(`
          INSERT INTO order_items (order_ticket_id, product_id, quantity, price_at_purchase)
          VALUES (?, ?, ?, ?)
        `, [order.id, item.productId, item.quantity, product.price]);
      }
    }
    
    // If items weren't changed, keep the existing total
    if (!items) {
      const existing = await queryOne('SELECT total_price FROM order_tickets WHERE id = ?', [order.id]);
      totalPrice = existing.total_price;
    }

    // Update order
    await queryAll(`
      UPDATE order_tickets
      SET customer_name = ?, customer_email = ?, customer_notes = ?, total_price = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [customerName || null, customerEmail || null, customerNotes || null, totalPrice, order.id]);
    
    res.json({ success: true, message: 'Order updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Submit order (draft -> submitted)
router.post('/:ticketId/submit', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId;
    
    const order = await queryOne(
      `SELECT id FROM order_tickets WHERE ticket_id = ? AND user_id = ?
       AND status IN ('draft', 'submitted')`,
      [ticketId, userId]
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found, or it has already been paid — contact us to cancel a paid order',
      });
    }
    
    // Generate PDF
    const pdfUrl = await generateOrderPDF(order.id, ticketId);
    
    // Update order
    await queryAll(`
      UPDATE order_tickets
      SET status = ?, submitted_at = CURRENT_TIMESTAMP, pdf_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, ['submitted', pdfUrl, order.id]);

    // Notify customer + admin (fire-and-forget; never block the response)
    try {
      const full = await queryOne(
        `SELECT ot.*, u.email, u.username FROM order_tickets ot
         JOIN users u ON ot.user_id = u.id WHERE ot.id = ?`, [order.id]);
      const custEmail = full.customer_email || full.email;
      const custName = full.customer_name || full.username;
      sendOrderSubmitted({ to: custEmail, name: custName, ticketId, total: full.total_price });
      sendAdminNewOrder({ ticketId, customerName: custName, customerEmail: custEmail, total: full.total_price });
    } catch (e) { console.error('submit email error', e); }

    res.json({ success: true, message: 'Order submitted', pdfUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Mark as paid (admin only)
router.post('/:ticketId/pay', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // TODO: Check if admin
    
    const order = await queryOne(
      'SELECT id FROM order_tickets WHERE ticket_id = ? AND status = ?',
      [ticketId, 'submitted']
    );
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Submitted order not found' });
    }
    
    await queryAll(`
      UPDATE order_tickets
      SET status = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, ['paid', order.id]);
    
    res.json({ success: true, message: 'Order marked as paid' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Mark as delivered (admin only, auto-archives)
router.post('/:ticketId/deliver', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // TODO: Check if admin
    
    const order = await queryOne(
      'SELECT id FROM order_tickets WHERE ticket_id = ? AND status = ?',
      [ticketId, 'paid']
    );
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Paid order not found' });
    }
    
    await queryAll(`
      UPDATE order_tickets
      SET status = ?, delivered_at = CURRENT_TIMESTAMP, archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, ['archived', order.id]);

    // Bump download_count for each digital product in the order
    let hasDigital = false;
    try {
      const files = await queryAll(
        `SELECT DISTINCT p.id FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN product_files pf ON pf.product_id = p.id
         WHERE oi.order_ticket_id = ?`, [order.id]);
      hasDigital = files.length > 0;
      for (const f of files) {
        await queryAll('UPDATE products SET download_count = COALESCE(download_count,0) + 1 WHERE id = ?', [f.id]);
      }
    } catch (e) { console.error('download_count error', e); }

    // Notify customer
    try {
      const full = await queryOne(
        `SELECT ot.*, u.email, u.username FROM order_tickets ot
         JOIN users u ON ot.user_id = u.id WHERE ot.id = ?`, [order.id]);
      sendOrderDelivered({
        to: full.customer_email || full.email,
        name: full.customer_name || full.username,
        ticketId, hasDigital,
      });
    } catch (e) { console.error('deliver email error', e); }

    res.json({ success: true, message: 'Order delivered and archived' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Download PDF
router.get('/:ticketId/pdf', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId;
    
    const order = await queryOne(
      'SELECT pdf_url, user_id FROM order_tickets WHERE ticket_id = ?',
      [ticketId]
    );
    
    if (order && order.user_id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Not your order' });
    }
    
    if (!order || !order.pdf_url) {
      return res.status(404).json({ success: false, error: 'PDF not found' });
    }
    
    const filePath = path.join(config.ticketStoragePath, path.basename(order.pdf_url));
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    res.download(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete draft order
router.delete('/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.userId;
    
    const order = await queryOne(
      `SELECT id FROM order_tickets WHERE ticket_id = ? AND user_id = ?
       AND status IN ('draft', 'submitted')`,
      [ticketId, userId]
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found, or it has already been paid — contact us to cancel a paid order',
      });
    }
    
    await queryAll('DELETE FROM order_tickets WHERE id = ?', [order.id]);
    
    res.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
