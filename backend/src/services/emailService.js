import { Resend } from 'resend';
import config from '../config.js';

// Email is optional — if RESEND_API_KEY isn't set, calls no-op gracefully
// so the store keeps working without email configured.
const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

const FROM = config.emailFrom || 'Wolffewrought <onboarding@resend.dev>';
const SHOP = 'https://wolffewrought.shop';

export const isEmailConfigured = () => Boolean(resend);

async function send({ to, subject, html }) {
  if (!resend) {
    console.log(`[email skipped — not configured] ${subject} -> ${to}`);
    return { skipped: true };
  }
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    return result;
  } catch (err) {
    console.error('Email send failed:', err);
    return { error: err };
  }
}

const wrap = (body) => `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
    <div style="text-align:center; padding: 16px 0; border-bottom: 2px solid #1a1a1a;">
      <h1 style="margin:0; font-size: 22px; letter-spacing: 1px;">WOLFFEWROUGHT</h1>
      <p style="margin:4px 0 0; font-size: 12px; color:#888;">wolffewrought.shop</p>
    </div>
    <div style="padding: 24px 8px;">${body}</div>
    <div style="text-align:center; padding: 16px; font-size: 11px; color:#999; border-top:1px solid #eee;">
      Wolffewrought · 3D prints, STLs & digital assets
    </div>
  </div>
`;

// To the customer when they submit an order (payment is arranged manually)
export const sendOrderSubmitted = ({ to, name, ticketId, total }) =>
  send({
    to,
    subject: `Order received — ${ticketId}`,
    html: wrap(`
      <p>Hi ${name || 'there'},</p>
      <p>Thanks for your order. We've received it and will be in touch at this email address with payment details, usually within 24 hours.</p>
      <p style="background:#f6f6f6; padding:12px; border-radius:8px;">
        <strong>Order:</strong> ${ticketId}<br/>
        <strong>Total:</strong> £${Number(total).toFixed(2)}
      </p>
      <p>Once payment is confirmed we'll prepare your order. For digital items, download links appear on your order page after we mark it delivered.</p>
      <p><a href="${SHOP}/orders" style="color:#007bff;">View your orders</a></p>
    `),
  });

// To the admin when a new order lands
export const sendAdminNewOrder = ({ ticketId, customerName, customerEmail, total }) => {
  if (!config.adminEmail) return Promise.resolve({ skipped: true });
  return send({
    to: config.adminEmail,
    subject: `New order: ${ticketId} (£${Number(total).toFixed(2)})`,
    html: wrap(`
      <p><strong>New order received.</strong></p>
      <p style="background:#f6f6f6; padding:12px; border-radius:8px;">
        <strong>Ticket:</strong> ${ticketId}<br/>
        <strong>Customer:</strong> ${customerName || '—'} (${customerEmail || '—'})<br/>
        <strong>Total:</strong> £${Number(total).toFixed(2)}
      </p>
      <p><a href="${SHOP}/admin" style="color:#007bff;">Open admin panel</a></p>
    `),
  });
};

// To the customer when the order is marked delivered
export const sendOrderDelivered = ({ to, name, ticketId, hasDigital }) =>
  send({
    to,
    subject: `Your order is ready — ${ticketId}`,
    html: wrap(`
      <p>Hi ${name || 'there'},</p>
      <p>Your order <strong>${ticketId}</strong> has been marked delivered.</p>
      ${hasDigital
        ? `<p>Your download links are now available on your order page:</p>
           <p><a href="${SHOP}/orders" style="color:#007bff;">Go to your downloads</a></p>
           <p style="font-size:12px;color:#888;">Links expire after a short time — reopen the page for fresh ones.</p>`
        : `<p>Thanks for shopping with us!</p>`}
    `),
  });

// Password reset
export const sendPasswordReset = ({ to, resetUrl }) =>
  send({
    to,
    subject: 'Reset your Wolffewrought password',
    html: wrap(`
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}" style="display:inline-block; padding:10px 18px; background:#007bff; color:#fff; border-radius:6px; text-decoration:none;">Reset password</a></p>
      <p style="font-size:12px;color:#888;">If you didn't request this, you can ignore this email. The link expires shortly.</p>
    `),
  });
