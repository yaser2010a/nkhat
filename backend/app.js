'use strict';

const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const env = require('./config/env');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * Middleware للتحقق من صحة JWT Token
 * يحمي لوحة الأدمن من الوصول المباشر بدون تسجيل دخول
 */
function requireAdminToken(req, res, next) {
  const token = req.cookies[env.cookie.name];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'غير مصرح — يرجى تسجيل الدخول أولاً' 
    });
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    if (payload.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'صلاحيات غير كافية' 
      });
    }
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    res.clearCookie(env.cookie.name, {
      httpOnly: true,
      secure: env.cookie.secure,
      sameSite: env.cookie.sameSite,
    });
    return res.status(401).json({ 
      success: false, 
      message: 'انتهت الجلسة — يرجى تسجيل الدخول مجدداً' 
    });
  }
}

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(compression());

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors({
    origin(origin, cb) {
      if (!origin || env.corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(cookieParser());

  // ════════════════════════════════════════════════════════════════════════════
  // 🔐 المسارات وصفحات الـ Frontend والـ Admin
  // ════════════════════════════════════════════════════════════════════════════

  // الصفحة الرئيسية للموقع (اللاندينق)
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
  });

  // أي محاولة للوصول إلى /admin → إعادة توجيه إلى صفحة الدخول
  app.get('/admin', (_req, res) => {
    res.redirect('/pages/admin/login.html');
  });

  // حماية صفحة اللوحة الرئيسية — تتطلب Token صحيح
  app.get('/pages/admin/admin-base-sr67.html', requireAdminToken, (_req, res) => {
    res.sendFile(path.join(__dirname, '../pages/admin/admin-base-sr67.html'));
  });

  // صفحة الدخول متاحة للجميع
  app.get('/pages/admin/login.html', (_req, res) => {
    res.sendFile(path.join(__dirname, '../pages/admin/login.html'));
  });

  // ════════════════════════════════════════════════════════════════════════════

  app.use(express.static(path.join(__dirname, '../')));
  app.use('/pages', express.static(path.join(__dirname, '../pages')));

  app.use('/uploads/products', express.static(path.join(__dirname, env.uploads.dir), {
    maxAge: env.isProd ? '7d' : 0,
    etag: true,
    lastModified: true,
  }));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', publicRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;