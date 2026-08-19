'use strict';

const express = require('express');
const {
  getPublicProducts,
  getPublicReviews,
  submitReview,
} = require('../controllers/productController');
const { getPublicCategories } = require('../controllers/categoryController');
const { getPublicSettings } = require('../controllers/settingsController');
const { reviewSubmitLimiter } = require('../middleware/rateLimit');
const { sanitizeBody } = require('../middleware/sanitize');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/products', asyncHandler(getPublicProducts));
router.get('/categories', asyncHandler(getPublicCategories));
router.get('/settings', asyncHandler(getPublicSettings));
router.get('/reviews', asyncHandler(getPublicReviews));

router.post(
  '/reviews',
  reviewSubmitLimiter,
  sanitizeBody({ author_name: 100, review_text: 2000 }),
  asyncHandler(submitReview)
);

module.exports = router;
