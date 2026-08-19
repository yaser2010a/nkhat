'use strict';

const { query, execute } = require('../config/db');

function formatCategory(row) {
  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

async function getPublicCategories(_req, res) {
  const rows = await query('SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, name ASC');
  res.json({ success: true, data: rows.map(formatCategory) });
}

async function getAdminCategories(_req, res) {
  const rows = await query('SELECT id, name, sort_order, created_at FROM categories ORDER BY sort_order ASC, name ASC');
  res.json({ success: true, data: rows.map(formatCategory) });
}

async function createCategory(req, res) {
  const name = (req.body.name || '').trim();
  if (!name || name.length < 2) {
    return res.status(400).json({ success: false, message: 'اسم التصنيف مطلوب (حرفين على الأقل)' });
  }
  if (name.length > 100) {
    return res.status(400).json({ success: false, message: 'اسم التصنيف طويل جداً' });
  }

  const [existing] = await query('SELECT id FROM categories WHERE name = $1 LIMIT 1', [name]);
  if (existing) {
    return res.status(409).json({ success: false, message: 'هذا التصنيف موجود مسبقاً' });
  }

  const [maxRow] = await query('SELECT COALESCE(MAX(sort_order), -1) AS "maxOrder" FROM categories');
  const insertResult = await execute(
    'INSERT INTO categories (name, sort_order) VALUES ($1, $2) RETURNING id',
    [name, maxRow.maxOrder + 1]
  );

  const [category] = await query('SELECT id, name, sort_order, created_at FROM categories WHERE id = $1', [insertResult.rows[0].id]);
  res.status(201).json({ success: true, message: 'تمت إضافة التصنيف', data: formatCategory(category) });
}

async function updateCategory(req, res) {
  const id = parseInt(req.params.id, 10);
  const [existing] = await query('SELECT id FROM categories WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'التصنيف غير موجود' });
  }

  const name = (req.body.name || '').trim();
  if (!name || name.length < 2) {
    return res.status(400).json({ success: false, message: 'اسم التصنيف غير صالح' });
  }
  if (name.length > 100) {
    return res.status(400).json({ success: false, message: 'اسم التصنيف طويل جداً' });
  }

  const [duplicate] = await query('SELECT id FROM categories WHERE name = $1 AND id != $2 LIMIT 1', [name, id]);
  if (duplicate) {
    return res.status(409).json({ success: false, message: 'يوجد تصنيف آخر بنفس الاسم' });
  }

  await query('UPDATE categories SET name = $1 WHERE id = $2', [name, id]);
  const [category] = await query('SELECT id, name, sort_order, created_at FROM categories WHERE id = $1', [id]);
  res.json({ success: true, message: 'تم تحديث التصنيف', data: formatCategory(category) });
}

async function deleteCategory(req, res) {
  const id = parseInt(req.params.id, 10);
  
  // 1. تحقق من وجود التصنيف أولاً
  const [existing] = await query('SELECT id FROM categories WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'التصنيف غير موجود' });
  }

  // 2. تنفيذ الحذف بأمان
  await execute('DELETE FROM categories WHERE id = $1', [id]);
  
  // 3. إرجاع النجاح
  res.json({ success: true, message: 'تم حذف التصنيف' });
}

module.exports = {
  getPublicCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};