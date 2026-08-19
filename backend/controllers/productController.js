'use strict';

const { query, execute } = require('../config/db');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { deleteProductImage } = require('../utils/fileCleanup');

function formatProduct(row) {
  return {
    id: row.id,
    name: row.name,
    price: parseFloat(row.price),
    details: row.details,
    image_url: row.image_url,
    category_id: row.category_id,
    category_name: row.category_name || null,
    archived: !!row.archived,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getPublicProducts(req, res) {
  const { page, limit, offset } = parsePagination(req.query);

  const [countRow] = await query(
    'SELECT COUNT(*)::int AS total FROM products WHERE archived = FALSE'
  );
  const total = countRow.total;

  const rows = await query(
    `SELECT p.id, p.name, p.price, p.details, p.image_url, p.category_id, c.name AS category_name, p.created_at
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.archived = FALSE
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json(paginatedResponse(rows.map(formatProduct), total, page, limit));
}

async function getPublicReviews(req, res) {
  const { page, limit, offset } = parsePagination(req.query);

  const [countRow] = await query(
    "SELECT COUNT(*)::int AS total FROM reviews WHERE status = 'approved'"
  );
  const total = countRow.total;

  const rows = await query(
    `SELECT id, author_name, review_text, created_at
     FROM reviews
     WHERE status = 'approved'
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json(paginatedResponse(rows, total, page, limit));
}

async function submitReview(req, res) {
  const authorName = req.body.author_name?.trim() || 'مجهول';
  const reviewText = req.body.review_text?.trim();

  if (!reviewText || reviewText.length < 3) {
    return res.status(400).json({ success: false, message: 'نص الرأي قصير جداً (3 أحرف على الأقل)' });
  }
  if (reviewText.length > 2000) {
    return res.status(400).json({ success: false, message: 'نص الرأي طويل جداً' });
  }
  if (authorName.length > 100) {
    return res.status(400).json({ success: false, message: 'اسم الكاتب طويل جداً' });
  }

  const result = await execute(
    `INSERT INTO reviews (author_name, review_text, status) VALUES ($1, $2, 'pending') RETURNING id`,
    [authorName, reviewText]
  );

  res.status(201).json({
    success: true,
    message: 'تم إرسال رأيك بنجاح — سيتم مراجعته قبل النشر',
    data: { id: result.rows[0].id },
  });
}

async function getAdminProducts(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const showArchived = req.query.archived === '1' || req.query.archived === 'true';

  const where = showArchived ? 'p.archived = TRUE' : '1=1';
  const [countRow] = await query(`SELECT COUNT(*)::int AS total FROM products p WHERE ${where}`);
  const total = countRow.total;

  const rows = await query(
    `SELECT p.id, p.name, p.price, p.details, p.image_url, p.category_id, c.name AS category_name,
            p.archived, p.created_at, p.updated_at
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${where}
     ORDER BY p.archived ASC, p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json(paginatedResponse(rows.map(formatProduct), total, page, limit));
}

async function resolveCategoryId(categoryId) {
  if (categoryId === undefined || categoryId === null || categoryId === '') return null;
  const parsed = parseInt(categoryId, 10);
  if (Number.isNaN(parsed)) return undefined; // invalid marker
  const [category] = await query('SELECT id FROM categories WHERE id = $1', [parsed]);
  return category ? parsed : undefined;
}

async function createProduct(req, res) {
  const { name, price, details, category_id } = req.body;

  if (!name || name.length < 2) {
    return res.status(400).json({ success: false, message: 'اسم المنتج مطلوب' });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'صورة المنتج مطلوبة' });
  }

  const parsedPrice = parseFloat(price);
  if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ success: false, message: 'السعر غير صالح' });
  }

  let resolvedCategoryId = null;
  if (category_id !== undefined && category_id !== '') {
    resolvedCategoryId = await resolveCategoryId(category_id);
    if (resolvedCategoryId === undefined) {
      return res.status(400).json({ success: false, message: 'التصنيف المحدد غير موجود' });
    }
  }

  const imageUrl = `/uploads/products/${req.file.filename}`;

  const insertResult = await execute(
    'INSERT INTO products (name, price, details, image_url, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [name, parsedPrice, details || '', imageUrl, resolvedCategoryId]
  );

  const [product] = await query(
    `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
    [insertResult.rows[0].id]
  );
  res.status(201).json({ success: true, message: 'تمت إضافة المنتج', data: formatProduct(product) });
}

async function updateProduct(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ success: false, message: 'معرف غير صالح' });
  }

  const [existing] = await query('SELECT * FROM products WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
  }

  const { name, price, details, category_id } = req.body;
  const updates = [];
  const params = [];
  let i = 1;

  if (name !== undefined) {
    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, message: 'اسم المنتج غير صالح' });
    }
    updates.push(`name = $${i++}`);
    params.push(name);
  }

  if (price !== undefined) {
    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ success: false, message: 'السعر غير صالح' });
    }
    updates.push(`price = $${i++}`);
    params.push(parsedPrice);
  }

  if (details !== undefined) {
    updates.push(`details = $${i++}`);
    params.push(details);
  }

  if (category_id !== undefined) {
    if (category_id === '' || category_id === null) {
      updates.push(`category_id = $${i++}`);
      params.push(null);
    } else {
      const resolvedCategoryId = await resolveCategoryId(category_id);
      if (resolvedCategoryId === undefined) {
        return res.status(400).json({ success: false, message: 'التصنيف المحدد غير موجود' });
      }
      updates.push(`category_id = $${i++}`);
      params.push(resolvedCategoryId);
    }
  }

  if (req.file) {
    deleteProductImage(existing.image_url);
    updates.push(`image_url = $${i++}`);
    params.push(`/uploads/products/${req.file.filename}`);
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
  }

  updates.push('updated_at = NOW()');
  params.push(id);
  await query(`UPDATE products SET ${updates.join(', ')} WHERE id = $${i}`, params);

  const [product] = await query(
    `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
    [id]
  );
  res.json({ success: true, message: 'تم تحديث المنتج', data: formatProduct(product) });
}

async function archiveProduct(req, res) {
  const id = parseInt(req.params.id, 10);
  const result = await execute('UPDATE products SET archived = TRUE WHERE id = $1 AND archived = FALSE', [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ success: false, message: 'المنتج غير موجود أو مؤرشف مسبقاً' });
  }
  res.json({ success: true, message: 'تم أرشفة المنتج — لن يظهر للزوار' });
}

async function restoreProduct(req, res) {
  const id = parseInt(req.params.id, 10);
  const result = await execute('UPDATE products SET archived = FALSE WHERE id = $1 AND archived = TRUE', [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ success: false, message: 'المنتج غير موجود أو غير مؤرشف' });
  }
  res.json({ success: true, message: 'تم استرجاع المنتج من الأرشيف' });
}

async function deleteProduct(req, res) {
  const id = parseInt(req.params.id, 10);
  const [existing] = await query('SELECT image_url FROM products WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
  }

  await query('DELETE FROM products WHERE id = $1', [id]);
  deleteProductImage(existing.image_url);
  res.json({ success: true, message: 'تم حذف المنتج' });
}

module.exports = {
  getPublicProducts,
  getAdminProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  restoreProduct,
  deleteProduct,
  getPublicReviews,
  submitReview,
};