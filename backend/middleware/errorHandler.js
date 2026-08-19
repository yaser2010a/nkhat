'use strict';

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFound(_req, res) {
  res.status(404).json({ success: false, message: 'المسار غير موجود' });
}

function errorHandler(err, _req, res, _next) {
  console.error('[error]', err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? 'خطأ داخلي في الخادم' : (err.message || 'حدث خطأ'),
  });
}

module.exports = { asyncHandler, notFound, errorHandler };
