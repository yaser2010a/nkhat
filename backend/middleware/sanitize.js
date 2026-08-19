'use strict';

const sanitizeHtml = require('sanitize-html');

const NO_HTML = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

function stripHtml(value) {
  if (typeof value !== 'string') return '';
  return sanitizeHtml(value, NO_HTML).trim();
}

function sanitizeText(value, maxLen = 5000) {
  const clean = stripHtml(value);
  if (clean.length > maxLen) return clean.slice(0, maxLen);
  return clean;
}

function sanitizeBody(fields = {}) {
  return (req, _res, next) => {
    for (const [field, maxLen] of Object.entries(fields)) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        req.body[field] = sanitizeText(String(req.body[field]), maxLen);
      }
    }
    next();
  };
}

module.exports = { stripHtml, sanitizeText, sanitizeBody };
