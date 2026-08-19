'use strict';

const fs = require('fs');

const SIGNATURES = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header — WebP also has WEBP at offset 8
};

function matchesSignature(buffer, sig) {
  if (buffer.length < sig.length) return false;
  return sig.every((byte, i) => buffer[i] === byte);
}

function detectMime(buffer) {
  for (const [mime, sigList] of Object.entries(SIGNATURES)) {
    for (const sig of sigList) {
      if (matchesSignature(buffer, sig)) {
        if (mime === 'image/webp') {
          const tag = buffer.slice(8, 12).toString('ascii');
          if (tag !== 'WEBP') continue;
        }
        return mime;
      }
    }
  }
  return null;
}

function validateUploadedImage(req, res, next) {
  if (!req.file) return next();

  let buffer;
  try {
    buffer = fs.readFileSync(req.file.path);
  } catch {
    return res.status(400).json({ success: false, message: 'تعذر قراءة الملف المرفوع' });
  }

  const detected = detectMime(buffer);
  if (!detected || detected !== req.file.mimetype) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: 'محتوى الملف لا يطابق نوع الصورة المسموح' });
  }

  next();
}

module.exports = { validateUploadedImage };
