import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  dbType: process.env.DB_TYPE || 'sqlite', // 'sqlite' or 'postgresql'
  dbPath: process.env.DB_PATH || './data/storefront.db',
  databaseUrl: process.env.DATABASE_URL, // For Railway PostgreSQL
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpire: '7d',
  
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // File Storage
  ticketStoragePath: process.env.TICKET_STORAGE_PATH || './data/tickets',
  
  // Session
  sessionSecret: process.env.SESSION_SECRET || 'session-secret-change-in-production',
};

export default config;
