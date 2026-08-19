'use strict';

const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool(env.db);

/**
 * تنفيذ query مع إرجاع الصفوف
 */
async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (err) {
    console.error('[db-query-error]', sql, err.message);
    throw err;
  }
}

/**
 * تنفيذ query بدون إرجاع (للعمليات مثل INSERT, UPDATE, DELETE)
 */
async function execute(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (err) {
    console.error('[db-execute-error]', sql, err.message);
    throw err;
  }
}

/**
 * فحص الاتصال بقاعدة البيانات
 */
async function ping() {
  try {
    await pool.query('SELECT NOW()');
    console.log('[db] PostgreSQL connected ✓');
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    throw new Error(`Database connection failed: ${err.message}`);
  }
}

/**
 * إغلاق الاتصال (استخدم عند الإيقاف)
 */
async function close() {
  await pool.end();
  console.log('[db] Connection pool closed');
}

module.exports = { pool, query, execute, ping, close };
