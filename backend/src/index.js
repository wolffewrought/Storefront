import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { initializeDatabase } from './db.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import ipRoutes from './routes/ips.js';
import modellerRoutes from './routes/modellers.js';
import reviewRoutes from './routes/reviews.js';
import orderRoutes from './routes/orders.js';
import mediaRoutes from './routes/media.js';
import downloadRoutes from './routes/downloads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Static file serving for PDFs
app.use('/tickets', express.static(config.ticketStoragePath));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ips', ipRoutes);
app.use('/api/modellers', modellerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/downloads', downloadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// API-only server — frontend is hosted separately on Vercel
app.get('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Not found. API lives under /api' });
});

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  try {
    console.log('🚀 Initializing database...');
    await initializeDatabase();
    
    app.listen(config.port, () => {
      console.log(`✓ Server running on http://localhost:${config.port}`);
      console.log(`✓ Environment: ${config.nodeEnv}`);
      console.log(`✓ Database: ${config.dbType}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
