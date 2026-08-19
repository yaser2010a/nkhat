'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, execute } = require('../config/db');
const env = require('../config/env');
const { send2FACode } = require('./mailer');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { isBlocked, getBlockRemaining, recordFailure, resetAttempts } = require('../utils/bruteForce');
const { generate2FACode, hash2FACode, verify2FACode } = require('../utils/twoFactor');

function formatReview(row) {
  return {
    id: row.id,
    author_name: row.author_name,
    review_text: row.review_text,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function login(req, res) {
  const ip = req.ip;

  if (isBlocked(ip)) {
    const remainingMs = getBlockRemaining(ip);
    const minutes = Math.ceil(remainingMs / 60000);
    return res.status(429).json({
      success: false,
      message: `تم حظر محاولات الدخول مؤقتاً — حاول بعد ${minutes} دقيقة`,
    });
  }

  const email = (req.body.email || '').toLowerCase().trim();
  const password = req.body.password || '';

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'البريد وكلمة المرور مطلوبان' });
  }

  const [admin] = await query('SELECT id, email, password_hash FROM admin WHERE email = $1 LIMIT 1', [email]);

  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    recordFailure(ip);
    if (isBlocked(ip)) {
      return res.status(429).json({
        success: false,
        message: 'تم حظر محاولات الدخول لمدة ساعة بعد 3 محاولات خاطئة',
      });
    }
    return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
  }

  resetAttempts(ip);

  const code = generate2FACode();
  const codeHash = await hash2FACode(code);

  await query('UPDATE admin_2fa SET used = TRUE WHERE admin_id = $1 AND used = FALSE', [admin.id]);
  await query(
    "INSERT INTO admin_2fa (admin_id, code_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '5 minutes')",
    [admin.id, codeHash]
  );

  try {
    await send2FACode(admin.email, code);
  } catch (err) {
    console.error('[mailer]', err.message);
    return res.status(503).json({
      success: false,
      message: 'تعذر إرسال رمز التحقق — تحقق من إعدادات SMTP',
    });
  }

  const pendingToken = jwt.sign(
    { sub: admin.id, email: admin.email, stage: '2fa' },
    env.jwt.secret,
    { expiresIn: '5m' }
  );

  res.json({
    success: true,
    message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
    requires2FA: true,
    pendingToken,
  });
}

async function verify2FA(req, res) {
  const { pendingToken, code } = req.body;

  if (!pendingToken || !code) {
    return res.status(400).json({ success: false, message: 'رمز التحقق مطلوب' });
  }

  let payload;
  try {
    payload = jwt.verify(pendingToken, env.jwt.secret);
  } catch {
    return res.status(401).json({ success: false, message: 'انتهت صلاحية جلسة التحقق — سجّل الدخول مجدداً' });
  }

  if (payload.stage !== '2fa') {
    return res.status(401).json({ success: false, message: 'رمز جلسة غير صالح' });
  }

  const [record] = await query(
    `SELECT id, code_hash FROM admin_2fa
     WHERE admin_id = $1 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [payload.sub]
  );

  if (!record) {
    return res.status(401).json({ success: false, message: 'رمز التحقق منتهي أو غير صالح' });
  }

  const valid = await verify2FACode(String(code).trim(), record.code_hash);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'رمز التحقق غير صحيح' });
  }

  await query('UPDATE admin_2fa SET used = TRUE WHERE id = $1', [record.id]);

  const token = jwt.sign(
    { sub: payload.sub, email: payload.email, role: 'admin' },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );

  res.cookie(env.cookie.name, token, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });

  res.json({
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    data: { email: payload.email },
  });
}

async function logout(_req, res) {
  res.clearCookie(env.cookie.name, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/',
  });
  res.json({ success: true, message: 'تم تسجيل الخروج' });
}

async function me(req, res) {
  res.json({ success: true, data: { email: req.admin.email } });
}

async function getPendingReviews(req, res) {
  const { page, limit, offset } = parsePagination(req.query);

  const [countRow] = await query("SELECT COUNT(*)::int AS total FROM reviews WHERE status = 'pending'");
  const total = countRow.total;

  const rows = await query(
    `SELECT id, author_name, review_text, status, created_at, updated_at
     FROM reviews WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json(paginatedResponse(rows.map(formatReview), total, page, limit));
}

async function getAllReviews(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const status = req.query.status;

  let where = '1=1';
  const params = [];
  let i = 1;
  if (status === 'pending' || status === 'approved') {
    where = `status = $${i++}`;
    params.push(status);
  }

  const [countRow] = await query(`SELECT COUNT(*)::int AS total FROM reviews WHERE ${where}`, params);
  const total = countRow.total;

  const rows = await query(
    `SELECT id, author_name, review_text, status, created_at, updated_at
     FROM reviews WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, limit, offset]
  );

  res.json(paginatedResponse(rows.map(formatReview), total, page, limit));
}

async function approveReview(req, res) {
  const id = parseInt(req.params.id, 10);
  
  const [existing] = await query('SELECT * FROM reviews WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'الرأي غير موجود' });
  }

  await execute(
    "UPDATE reviews SET status = 'approved' WHERE id = $1",
    [id]
  );
  
  const [review] = await query('SELECT * FROM reviews WHERE id = $1', [id]);
  res.json({ success: true, message: 'تم قبول الرأي', data: formatReview(review) });
}

async function updateReview(req, res) {
  const id = parseInt(req.params.id, 10);
  const [existing] = await query('SELECT * FROM reviews WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'الرأي غير موجود' });
  }

  const { author_name, review_text } = req.body;
  const updates = [];
  const params = [];
  let i = 1;

  if (author_name !== undefined) {
    if (author_name.length > 100) {
      return res.status(400).json({ success: false, message: 'اسم الكاتب طويل جداً' });
    }
    updates.push(`author_name = $${i++}`);
    params.push(author_name || 'مجهول');
  }

  if (review_text !== undefined) {
    if (!review_text || review_text.length < 3) {
      return res.status(400).json({ success: false, message: 'نص الرأي قصير جداً' });
    }
    if (review_text.length > 2000) {
      return res.status(400).json({ success: false, message: 'نص الرأي طويل جداً' });
    }
    updates.push(`review_text = $${i++}`);
    params.push(review_text);
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
  }

  updates.push('updated_at = NOW()');
  params.push(id);
  await query(`UPDATE reviews SET ${updates.join(', ')} WHERE id = $${i}`, params);

  const [review] = await query('SELECT * FROM reviews WHERE id = $1', [id]);
  res.json({ success: true, message: 'تم تحديث الرأي', data: formatReview(review) });
}

async function deleteReview(req, res) {
  const id = parseInt(req.params.id, 10);
  
  const [existing] = await query('SELECT id FROM reviews WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'الرأي غير موجود' });
  }

  await execute('DELETE FROM reviews WHERE id = $1', [id]);
  res.json({ success: true, message: 'تم حذف الرأي' });
}

module.exports = {
  login,
  verify2FA,
  logout,
  me,
  getPendingReviews,
  getAllReviews,
  approveReview,
  updateReview,
  deleteReview,
};