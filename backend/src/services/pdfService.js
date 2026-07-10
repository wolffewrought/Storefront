import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';
import { queryAll, queryOne } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Brand assets — upload logo.png and brand-banner.jpg to backend/src/assets/
const ASSETS = path.join(__dirname, '../assets');
const LOGO = path.join(ASSETS, 'logo.png');
const BANNER = path.join(ASSETS, 'brand-banner.jpg');

const PAGE_W = 595.28; // A4 points
const PAGE_H = 841.89;
const LOGO_SIZE = 90;  // large corner logos that frame the page
const M = 40; // margin

// Paint brand chrome on a page: faded banner, corner logos, centred name
function paintBrandChrome(doc) {
  if (fs.existsSync(BANNER)) {
    doc.save();
    doc.opacity(0.06);
    doc.image(BANNER, 0, 0, { cover: [PAGE_W, PAGE_H], align: 'center', valign: 'center' });
    doc.restore();
  }

  if (fs.existsSync(LOGO)) {
    // Tight, symmetric corner insets. Left x and right x mirror each other
    // (INSET from each edge); top y and bottom y likewise. Small INSET keeps
    // the logos hard in the corners and clear of the centred title block.
    // Push logos hard into the corners (small equal inset from every edge)
    // so the four marks visually box in the ticket content.
    const INSET = 8;
    const leftX = INSET;
    const rightX = PAGE_W - INSET - LOGO_SIZE;
    const topY = INSET;
    const bottomY = PAGE_H - INSET - LOGO_SIZE;
    const positions = [
      [leftX, topY],
      [rightX, topY],
      [leftX, bottomY],
      [rightX, bottomY],
    ];
    positions.forEach(([x, y]) => doc.image(LOGO, x, y, { width: LOGO_SIZE, height: LOGO_SIZE }));
  }

  doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a1a');
  doc.text('WOLFFEWROUGHT', 0, M + 2, { width: PAGE_W, align: 'center' });
  doc.fontSize(8).font('Helvetica').fillColor('#888');
  doc.text('wolffewrought.shop', 0, M + 26, { width: PAGE_W, align: 'center' });
  doc.fillColor('#333');
}

export const generateOrderPDF = async (orderId, ticketId) => {
  try {
    if (!fs.existsSync(config.ticketStoragePath)) {
      fs.mkdirSync(config.ticketStoragePath, { recursive: true });
    }

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

    const items = await queryAll(
      `SELECT oi.*, p.name 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_ticket_id = ?`,
      [orderId]
    );

    const doc = new PDFDocument({ size: 'A4', margin: M });
    const fileName = `order_${ticketId}.pdf`;
    const filePath = path.join(config.ticketStoragePath, fileName);

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    paintBrandChrome(doc);
    doc.on('pageAdded', () => {
      paintBrandChrome(doc);
      doc.y = M + 60;
    });

    doc.y = M + 60;
    doc.x = M + 10;

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#333');
    doc.text('Order Ticket', { align: 'center' });
    doc.moveDown(0.8);

    // PDFs are only generated at submission, so 'draft' here means SUBMITTED
    const statusLabel = order.status === 'draft' ? 'SUBMITTED' : order.status.toUpperCase();
    const created = new Date(order.created_at);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Ticket ID: ${ticketId}`);
    doc.text(`Status: ${statusLabel}`);
    const createdUK = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(created);
    doc.text(`Created: ${createdUK}`);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text('Customer Information', { underline: true });
    doc.font('Helvetica').fontSize(11);
    doc.text(`Name: ${order.customer_name || order.username}`);
    doc.text(`Email: ${order.customer_email || order.email}`);
    if (order.customer_notes) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Notes:');
      doc.font('Helvetica').text(order.customer_notes);
    }
    doc.moveDown(1);

    // Items table — all header cells share ONE y so columns align
    doc.fontSize(12).font('Helvetica-Bold').text('Order Items', { underline: true });
    doc.moveDown(0.6);

    const col = { qty: M + 10, product: M + 60, price: 350, total: 460 };
    const headerY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Qty', col.qty, headerY);
    doc.text('Product', col.product, headerY);
    doc.text('Price Each', col.price, headerY);
    doc.text('Total', col.total, headerY);

    doc.moveTo(M + 10, headerY + 14).lineTo(PAGE_W - M - 10, headerY + 14).stroke('#999');
    doc.y = headerY + 22;

    doc.font('Helvetica').fontSize(10);
    items.forEach((item) => {
      const y = doc.y;
      const lineTotal = item.quantity * parseFloat(item.price_at_purchase);
      doc.text(String(item.quantity), col.qty, y);
      doc.text(item.name, col.product, y, { width: col.price - col.product - 15 });
      doc.text('£' + parseFloat(item.price_at_purchase).toFixed(2), col.price, y);
      doc.text('£' + lineTotal.toFixed(2), col.total, y);
      doc.moveDown(0.9);
    });

    doc.moveTo(M + 10, doc.y + 2).lineTo(PAGE_W - M - 10, doc.y + 2).stroke('#999');
    doc.moveDown(0.6);
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a1a');
    doc.text('Total: £' + parseFloat(order.total_price).toFixed(2), M + 10, doc.y, {
      width: PAGE_W - 2 * M - 20,
      align: 'right',
    });
    doc.moveDown(2);

    doc.fontSize(9).font('Helvetica').fillColor('#999');
    doc.text('Please present this ticket to complete your order.', M + 10, doc.y, {
      width: PAGE_W - 2 * M - 20,
      align: 'center',
    });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve('/tickets/' + fileName);
      });
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};
