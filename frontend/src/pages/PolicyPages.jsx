import React from 'react';

const PolicyLayout = ({ title, children }) => (
  <div className="container" style={{ maxWidth: 760, padding: '2rem 1rem' }}>
    <h1>{title}</h1>
    <p className="text-muted" style={{ marginBottom: '2rem' }}>
      Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}
    </p>
    <div style={{ lineHeight: 1.7 }}>{children}</div>
  </div>
);

export const PrivacyPage = () => (
  <PolicyLayout title="Privacy Policy">
    <p>This policy explains what personal data Wolffewrought collects and how it's used.</p>
    <h3>What we collect</h3>
    <p>When you create an account we store your username, email address, and a securely hashed password. When you place an order we store the items, order total, and any contact details or notes you provide.</p>
    <h3>How we use it</h3>
    <p>Your data is used solely to operate the store: to manage your account, process and fulfil orders, arrange payment, deliver digital files, and contact you about your orders. We do not sell your data or use it for third-party advertising.</p>
    <h3>Third parties</h3>
    <p>We use Cloudflare R2 to store files, Railway to host the backend, Vercel to host the site, and Resend to send transactional emails (such as order confirmations and password resets). These providers process data only as needed to deliver their service.</p>
    <h3>Your rights</h3>
    <p>You may request a copy of your data, ask for corrections, or request deletion of your account and associated data. Contact us using the details on the Contact page.</p>
    <h3>Cookies</h3>
    <p>We use only the minimal storage needed to keep you signed in and remember your cart. We do not use third-party tracking cookies.</p>
  </PolicyLayout>
);

export const TermsPage = () => (
  <PolicyLayout title="Terms of Service">
    <h3>Overview</h3>
    <p>By using Wolffewrought and placing an order you agree to these terms. Wolffewrought sells 3D-printed items, STL files, and digital 3D assets.</p>
    <h3>Orders and payment</h3>
    <p>Placing an order creates an order ticket. Payment is arranged directly after you order — you'll receive contact with payment details, usually within 24 hours. Your order is confirmed once payment is received.</p>
    <h3>Digital products</h3>
    <p>Digital items (STL files and 3D assets) are licensed for your personal use. You may print and use them for yourself. You may not resell, redistribute, or share the files themselves. Download links are provided after your order is marked delivered and expire after a short time for security; reopen your order page to generate fresh links.</p>
    <h3>Physical products</h3>
    <p>Printed items are made to order and shipped once payment is confirmed. Delivery timescales are provided at the time of order.</p>
    <h3>Acceptable use</h3>
    <p>You agree not to misuse the site, attempt to access other users' data, or use purchased files in breach of the licence above.</p>
    <h3>Changes</h3>
    <p>We may update these terms; the current version is always shown here.</p>
  </PolicyLayout>
);

export const RefundsPage = () => (
  <PolicyLayout title="Refunds & Returns">
    <h3>Digital items</h3>
    <p>Because STL files and digital assets are delivered electronically and can be downloaded immediately, they are generally exempt from the standard 14-day cancellation right once download has begun, in line with UK consumer law for digital content. If a file is faulty or not as described, contact us and we'll put it right or refund you.</p>
    <h3>Physical printed items</h3>
    <p>For physical goods you have the right to cancel within 14 days of receiving your order under the UK Consumer Contracts Regulations. Items must be returned in their original condition. Made-to-order or personalised items may be exempt where production has begun — this will be made clear at the time of order.</p>
    <h3>Faulty items</h3>
    <p>If a physical item arrives damaged or faulty, contact us within a reasonable time and we'll arrange a replacement or refund.</p>
    <h3>How to request</h3>
    <p>Use the details on the Contact page, quoting your order ticket number.</p>
  </PolicyLayout>
);

export const ContactPage = () => (
  <PolicyLayout title="Contact">
    <p>Questions about an order, a product, or your account? Get in touch and we'll respond as soon as we can.</p>
    <p style={{ background: '#f6f6f6', padding: '1rem', borderRadius: 8 }}>
      <strong>Email:</strong> shop@wolffewrought.shop
    </p>
    <p>When contacting us about an order, please include your order ticket number so we can find it quickly.</p>
  </PolicyLayout>
);
