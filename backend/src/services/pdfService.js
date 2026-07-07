import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';
import { queryAll, queryOne } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const generateOrderPDF = async (orderId, ticketId) => {
  try {
    // Create tickets directory if it doesn't exist
    if (!fs.existsSync(config.ticketStoragePath)) {
      fs.mkdirSync(config.ticketStoragePath, { recursive: true });
    }
    
    // Get order details
    const order = await queryOne(
      `SELECT ot.*, u.email, u.username 
       FROM order_tickets ot 
       JOIN users u ON ot.user_id = u.id 
       WHERE ot.id = ?`,
      [orderId]
    );
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Get order items
    const items = await queryAll(
      `SELECT oi.*, p.name 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_ticket_id = ?`,
      [orderId]
    );
    
    // Generate PDF
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const fileName = `order_${ticketId}.pdf`;
    const filePath = path.join(config.ticketStoragePath, fileName);
    
    // Pipe to file
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Order Ticket', { align: 'center' });
    doc.moveDown(0.5);
    
    // Ticket ID & Status
    doc.fontSize(12);
    doc.text(`Ticket ID: ${ticketId}`, { align: 'left' });
    doc.text(`Status: ${order.status.toUpperCase()}`, { align: 'left' });
    doc.text(`Created: ${new Date(order.created_at).toLocaleDateString()}`, { align: 'left' });
    doc.moveDown(1);
    
    // Customer Info
    doc.fontSize(12).font('Helvetica-Bold').text('Customer Information', { underline: true });
    doc.font('Helvetica').fontSize(11);
    doc.text(`Name: ${order.customer_name || order.username}`);
    doc.text(`Email: ${order.customer_email || order.email}`);
    if (order.customer_notes) {
      doc.moveDown(0.5);
      doc.text('Notes:', { underline: true });
      doc.text(order.customer_notes);
    }
    doc.moveDown(1);
    
    // Items Table
    doc.fontSize(12).font('Helvetica-Bold').text('Order Items', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    
    // Table header
    const col1 = 50, col2 = 280, col3 = 350, col4 = 450;
    doc.text('Qty', col1, doc.y);
    doc.text('Product', col2, doc.y);
    doc.text('Price Each', col3, doc.y);
    doc.text('Total', col4, doc.y);
    
    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
    doc.moveDown(0.8);
    
    // Table rows
    items.forEach((item) => {
      const y = doc.y;
      doc.text(item.quantity.toString(), col1, y);
      doc.text(item.name, col2, y, { width: 60 });
      doc.text(`£${parseFloat(item.price_at_purchase).toFixed(2)}`, col3, y);
      doc.text(`£${(item.quantity * parseFloat(item.price_at_purchase)).toFixed(2)}`, col4, y);
      doc.moveDown(1);
    });
    
    // Totals
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`Total: £${parseFloat(order.total_price).toFixed(2)}`, { align: 'right' });
    doc.moveDown(2);
    
    // Footer
    doc.fontSize(9).font('Helvetica').fillColor('#999');
    doc.text('Please present this ticket to complete your order.', { align: 'center' });
    
    // Finalize PDF
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve(`/tickets/${fileName}`);
      });
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};
