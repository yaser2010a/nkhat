'use strict';

const express = require('express');
const {
  login,
  verify2FA,
  logout,
  me,
  getPendingReviews,
  getAllReviews,
  approveReview,
  updateReview,
  deleteReview,
} = require('../controllers/adminController');
const {
  getAdminProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  restoreProduct,
  deleteProduct,
} = require('../controllers/productController');
const {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { getAdminSettings, updateSettings } = require('../controllers/settingsController');
const { authenticateAdmin } = require('../middleware/auth');
const { loginAttemptLimiter } = require('../middleware/rateLimit');
const { upload, handleUploadError } = require('../middleware/upload');
const { validateUploadedImage } = require('../middleware/validateImage');
const { sanitizeBody } = require('../middleware/sanitize');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.post('/login', loginAttemptLimiter, asyncHandler(login));
router.post('/verify-2fa', loginAttemptLimiter, asyncHandler(verify2FA));

router.use(authenticateAdmin);

router.post('/logout', asyncHandler(logout));
router.get('/me', asyncHandler(me));

router.get('/reviews/pending', asyncHandler(getPendingReviews));
router.get('/reviews', asyncHandler(getAllReviews));
router.put('/reviews/approve/:id', asyncHandler(approveReview));
router.put(
  '/reviews/:id',
  sanitizeBody({ author_name: 100, review_text: 2000 }),
  asyncHandler(updateReview)
);
router.delete('/reviews/:id', asyncHandler(deleteReview));

router.get('/products', asyncHandler(getAdminProducts));
router.post(
  '/products',
  upload.single('image'),
  handleUploadError,
  validateUploadedImage,
  sanitizeBody({ name: 255, details: 5000 }),
  asyncHandler(createProduct)
);
router.put(
  '/products/:id',
  upload.single('image'),
  handleUploadError,
  validateUploadedImage,
  sanitizeBody({ name: 255, details: 5000 }),
  asyncHandler(updateProduct)
);
router.put('/products/:id/archive', asyncHandler(archiveProduct));
router.put('/products/:id/restore', asyncHandler(restoreProduct));
router.delete('/products/:id', asyncHandler(deleteProduct));

router.get('/categories', asyncHandler(getAdminCategories));
router.post('/categories', sanitizeBody({ name: 100 }), asyncHandler(createCategory));
router.put('/categories/:id', sanitizeBody({ name: 100 }), asyncHandler(updateCategory));
router.delete('/categories/:id', asyncHandler(deleteCategory));

router.get('/settings', asyncHandler(getAdminSettings));
router.put(
  '/settings',
  upload.single('banner_image'),
  handleUploadError,
  validateUploadedImage,
  sanitizeBody({
    store_name: 150,
    store_tagline: 150,
    phone: 30,
    whatsapp: 30,
    whatsapp_message: 255,
    address: 255,
    maps_url: 512,
    instagram_url: 255,
    snapchat_url: 255,
    cr_number: 50,
    license_number: 50,
    about_title: 150,
    about_desc: 5000,
  }),
  asyncHandler(updateSettings)
);

module.exports = router;
