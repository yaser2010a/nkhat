'use strict';

const rateLimit = require('express-rate-limit');

const reviewSubmitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'يمكنك إرسال رأي واحد كل 5 دقائق — يرجى المحاولة لاحقاً',
  },
  keyGenerator: (req) => req.ip,
});

const loginAttemptLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'محاولات كثيرة — يرجى الانتظار دقيقة',
  },
});

module.exports = { reviewSubmitLimiter, loginAttemptLimiter };
