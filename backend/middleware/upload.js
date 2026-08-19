'use strict';

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const env = require('../config/env');

const uploadDir = path.join(__dirname, '..', env.uploads.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!env.uploads.allowedExt.includes(ext) || !env.uploads.allowedMime.includes(file.mimetype)) {
    return cb(new Error('نوع الملف غير مسموح — jpeg, png, webp فقط'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.uploads.maxSizeBytes, files: 1 },
});

function handleUploadError(err, req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'حجم الصورة يتجاوز 5 ميغابايت' });
    }
    return res.status(400).json({ success: false, message: 'خطأ في رفع الملف' });
  }
  return res.status(400).json({ success: false, message: err.message || 'خطأ في رفع الملف' });
}

module.exports = { upload, handleUploadError, uploadDir };
