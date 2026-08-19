'use strict';

require('dotenv').config();

const required = [
  'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD',
  'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS',
  'CORS_ORIGINS',
];

// لو ما فيه DATABASE_URL (رابط جاهز من Render Postgres)، نطلب المتغيرات المنفصلة
if (!process.env.DATABASE_URL) {
  required.push('DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME');
}

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      max: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    };

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'production',
  isProd: (process.env.NODE_ENV || 'production') === 'production',

  db: dbConfig,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  admin: {
    email: process.env.ADMIN_EMAIL.toLowerCase().trim(),
    password: process.env.ADMIN_PASSWORD,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  },

  corsOrigins: process.env.CORS_ORIGINS
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  cookie: {
    secure: (process.env.NODE_ENV || 'production') === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    name: 'nkhat_admin_token',
  },

  uploads: {
    dir: 'uploads/products',
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMime: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExt: ['.jpg', '.jpeg', '.png', '.webp'],
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
};