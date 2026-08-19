'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authenticateAdmin(req, res, next) {
  const token = req.cookies[env.cookie.name];
  if (!token) {
    return res.status(401).json({ success: false, message: 'غير مصرح — يرجى تسجيل الدخول' });
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    if (payload.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'صلاحيات غير كافية' });
    }
    req.admin = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.clearCookie(env.cookie.name, {
      httpOnly: true,
      secure: env.cookie.secure,
      sameSite: env.cookie.sameSite,
    });
    return res.status(401).json({ success: false, message: 'انتهت الجلسة — يرجى تسجيل الدخول مجدداً' });
  }
}

module.exports = { authenticateAdmin };
