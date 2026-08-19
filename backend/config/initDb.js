'use strict';

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { pool, query, execute } = require('../config/db');
const env = require('../config/env');

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    details TEXT,
    image_url VARCHAR(512) NOT NULL,
    category_id INTEGER NULL REFERENCES categories(id) ON DELETE SET NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_products_archived ON products (archived)`,
  `CREATE INDEX IF NOT EXISTS idx_products_created ON products (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id)`,

  `CREATE TABLE IF NOT EXISTS site_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    store_name VARCHAR(150) NOT NULL DEFAULT '',
    store_tagline VARCHAR(150) NOT NULL DEFAULT '',
    phone VARCHAR(30) NOT NULL DEFAULT '',
    whatsapp VARCHAR(30) NOT NULL DEFAULT '',
    whatsapp_message VARCHAR(255) NOT NULL DEFAULT '',
    address VARCHAR(255) NOT NULL DEFAULT '',
    maps_url VARCHAR(512) NOT NULL DEFAULT '',
    instagram_url VARCHAR(255) NOT NULL DEFAULT '',
    snapchat_url VARCHAR(255) NOT NULL DEFAULT '',
    cr_number VARCHAR(50) NOT NULL DEFAULT '',
    license_number VARCHAR(50) NOT NULL DEFAULT '',
    about_title VARCHAR(150) NOT NULL DEFAULT '',
    about_desc TEXT,
    banner_image_url VARCHAR(512) NOT NULL DEFAULT '',
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    author_name VARCHAR(100) NOT NULL DEFAULT 'مجهول',
    review_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews (created_at)`,

  `CREATE TABLE IF NOT EXISTS admin_2fa (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_2fa_admin ON admin_2fa (admin_id)`,
  `CREATE INDEX IF NOT EXISTS idx_2fa_expires ON admin_2fa (expires_at)`,
];

async function initDatabase() {
  // ملاحظة: Render Postgres يجهز قاعدة البيانات جاهزة مسبقًا، فما نحتاج CREATE DATABASE / USE
  // (وأصلاً ما تصلح هالأوامر بصيغتها في Postgres)
  for (const stmt of SCHEMA_STATEMENTS) {
    await pool.query(stmt);
  }

  const uploadDir = path.join(__dirname, '..', env.uploads.dir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

async function seedAdmin() {
  const rows = await query('SELECT id FROM admin WHERE email = $1 LIMIT 1', [env.admin.email]);
  if (rows.length > 0) return;

  const hash = await bcrypt.hash(env.admin.password, 12);
  await query('INSERT INTO admin (email, password_hash) VALUES ($1, $2)', [env.admin.email, hash]);
  console.log(`[seed] Admin account created: ${env.admin.email}`);
}

async function seedCategories() {
  const [countRow] = await query('SELECT COUNT(*)::int AS total FROM categories');
  if (countRow.total > 0) return;

  const defaults = ['قهوة ومكسرات', 'حلويات سورية', 'توابل وبهارات', 'أخرى'];
  for (let i = 0; i < defaults.length; i++) {
    await query('INSERT INTO categories (name, sort_order) VALUES ($1, $2)', [defaults[i], i]);
  }
  console.log('[seed] Default categories created');
}

async function seedSettings() {
  const [row] = await query('SELECT id FROM site_settings WHERE id = 1');
  if (row) return;

  await query(
    `INSERT INTO site_settings
      (id, store_name, store_tagline, phone, whatsapp, whatsapp_message, address, maps_url,
       instagram_url, snapchat_url, cr_number, license_number, about_title, about_desc, banner_image_url)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      'تموينات النكهة الشامية',
      'للتسوق',
      '0541504955',
      '966591143114',
      'مرحبا، ابي استفسر عن منتجاتكم',
      'جازان - حي المطار، مقابل عالم فيتامين',
      'https://maps.app.goo.gl/Jz2MiFGpdmMiz6R46',
      'https://instagram.com/nkhat_shamya',
      'https://snapchat.com/add/nkhatchamea',
      '7008123456',
      '7688848484',
      'بقالة الشامية',
      'منتجات سورية أصيلة في قلب جازان، حي المطار. نقدم القهوة والمكسرات والحلويات والبهارات بجودة عالية منذ سنوات.',
      '',
    ]
  );
  console.log('[seed] Default site settings created');
}

async function cleanupExpired2FA() {
  await query("DELETE FROM admin_2fa WHERE expires_at < NOW() OR used = TRUE");
}

module.exports = { initDatabase, seedAdmin, seedCategories, seedSettings, cleanupExpired2FA };