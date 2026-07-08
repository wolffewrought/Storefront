import sqlite3 from 'sqlite3';
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT 0,
  google_id TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, type)
);

CREATE TABLE IF NOT EXISTS ips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modellers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER NOT NULL,
  ip_id INTEGER,
  modeller_id INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock_count INTEGER,
  download_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (ip_id) REFERENCES ips(id),
  FOREIGN KEY (modeller_id) REFERENCES modellers(id)
);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  video_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  review_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(product_id, user_id)
);

CREATE TABLE IF NOT EXISTS order_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT DEFAULT 'draft',
  customer_name TEXT,
  customer_email TEXT,
  customer_notes TEXT,
  total_price DECIMAL(10, 2) DEFAULT 0,
  pdf_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  paid_at DATETIME,
  delivered_at DATETIME,
  archived_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_ticket_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_purchase DECIMAL(10, 2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_ticket_id) REFERENCES order_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_ip ON products(ip_id);
CREATE INDEX IF NOT EXISTS idx_products_modeller ON products(modeller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_order_tickets_user ON order_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_order_tickets_status ON order_tickets(status);
CREATE INDEX IF NOT EXISTS idx_order_items_ticket ON order_items(order_ticket_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
`;

// PostgreSQL dialect version of the same schema
const pgSchema = schema
  .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
  .replace(/DATETIME/g, 'TIMESTAMP')
  .replace(/BOOLEAN DEFAULT 0/g, 'BOOLEAN DEFAULT FALSE');

// For INSERTs, PostgreSQL only returns the new row id if asked
function withReturning(sql) {
  if (/^\s*INSERT\b/i.test(sql) && !/RETURNING/i.test(sql)) {
    return sql.replace(/;?\s*$/, ' RETURNING id');
  }
  return sql;
}

export async function initializeDatabase() {
  try {
    if (config.dbType === 'postgresql') {
      db = new Pool({
        connectionString: config.databaseUrl,
      });
      
      const client = await db.connect();
      await client.query(pgSchema);
      client.release();
      console.log('✓ PostgreSQL database initialized');
    } else {
      // SQLite
      const dbDir = path.dirname(config.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      db = new sqlite3.Database(config.dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          process.exit(1);
        }
      });
      
      db.exec(schema, (err) => {
        if (err) {
          console.error('Schema initialization error:', err);
          process.exit(1);
        }
      });
      
      console.log('✓ SQLite database initialized');
    }
    
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Wrapper functions for unified API
export async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (config.dbType === 'postgresql') {
      const isSelect = /^\s*SELECT\b/i.test(sql);
      const pgSql = toPgPlaceholders(withReturning(sql));
      db.query(pgSql, params, (err, result) => {
        if (err) reject(err);
        else if (isSelect) resolve({ rows: result.rows });
        else resolve({ lastID: result.rows?.[0]?.id, changes: result.rowCount, rows: result.rows });
      });
    } else {
      // SQLite
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      } else {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }
    }
  });
}

export async function queryOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (config.dbType === 'postgresql') {
      db.query(toPgPlaceholders(sql), params, (err, result) => {
        if (err) reject(err);
        else resolve(result.rows[0]);
      });
    } else {
      // SQLite
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }
  });
}

export async function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (config.dbType === 'postgresql') {
      const isSelect = /^\s*SELECT\b/i.test(sql);
      db.query(toPgPlaceholders(withReturning(sql)), params, (err, result) => {
        if (err) reject(err);
        else if (isSelect) resolve(result.rows);
        else resolve({ lastID: result.rows?.[0]?.id, changes: result.rowCount });
      });
    } else if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    } else {
      // INSERT / UPDATE / DELETE — must use run() to get lastID/changes
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    }
  });
}

// PostgreSQL uses $1, $2... instead of ?
function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export function getDb() {
  return db;
}
