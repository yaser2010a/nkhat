# NKhat Backend API

نظام الواجهة الخلفية لموقع تموينات النكهة الشامية — Node.js + Express + MySQL.

## التشغيل المحلي

```bash
cd backend
cp .env.example .env
# عدّل .env ببيانات MySQL و SMTP والأدمن
npm install
npm run dev
```

السيرفر يعمل على `http://localhost:3000` ويخدم الواجهة الأمامية من المجلد الأب تلقائياً.

> عند أول تشغيل: تُنشأ قاعدة البيانات والجداول تلقائياً، ويُضاف حساب الأدمن من `.env` (بدون أي API للتسجيل).

---

## الأمان

| الميزة | التطبيق |
|--------|---------|
| XSS | `sanitize-html` على كل المدخلات النصية |
| Brute Force | حظر IP ساعة بعد 3 محاولات دخول خاطئة |
| 2FA | رمز 6 أرقام عبر البريد، صالح 5 دقائق |
| JWT | HttpOnly + Secure + SameSite Cookie |
| Rate Limit | رأي واحد كل 5 دقائق لكل IP |
| رفع الصور | multer + فحص MIME + magic bytes + UUID |
| SQL Injection | استعلامات مُعلّمة (parameterized) |
| Headers | Helmet + CORS مقيّد |

---

## API — عام (Public)

### `GET /api/health`
فحص حالة السيرفر.

### `GET /api/products?page=1&limit=20`
جلب المنتجات غير المؤرشفة للزوار.

**Response:**
```json
{
  "success": true,
  "data": [{ "id": 1, "name": "...", "price": 25.5, "details": "...", "image_url": "/uploads/products/uuid.jpg", "created_at": "..." }],
  "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3, "hasNext": true, "hasPrev": false }
}
```

### `GET /api/reviews?page=1&limit=20`
جلب الآراء المقبولة (`approved`) فقط.

### `POST /api/reviews`
إرسال رأي جديد (يُحفظ بحالة `pending`).

```json
{ "author_name": "أحمد", "review_text": "منتجات ممتازة" }
```

- `author_name` اختياري (افتراضي: مجهول)
- Rate limit: 1 طلب / 5 دقائق / IP

---

## API — الأدمن (Protected)

> كل الطلبات بعد الدخول تتطلب Cookie `nkhat_admin_token` — استخدم `credentials: 'include'`.

### `POST /api/admin/login`
```json
{ "email": "admin@example.com", "password": "..." }
```
→ يرسل رمز 2FA للبريد ويعيد `pendingToken`.

### `POST /api/admin/verify-2fa`
```json
{ "pendingToken": "...", "code": "123456" }
```
→ يضبط Cookie الجلسة.

### `POST /api/admin/logout`
### `GET /api/admin/me`

### المنتجات

| Method | Path | الوصف |
|--------|------|-------|
| GET | `/api/admin/products?page=1&limit=20` | كل المنتجات (مع المؤرشف) |
| GET | `/api/admin/products?archived=1` | المنتجات المؤرشفة فقط |
| POST | `/api/admin/products` | إضافة (multipart: name, price, details, image) |
| PUT | `/api/admin/products/:id` | تعديل (الصورة اختيارية) |
| PUT | `/api/admin/products/:id/archive` | أرشفة — إخفاء عن الزوار |
| PUT | `/api/admin/products/:id/restore` | استرجاع من الأرشيف |
| DELETE | `/api/admin/products/:id` | حذف نهائي |

### الآراء

| Method | Path | الوصف |
|--------|------|-------|
| GET | `/api/admin/reviews/pending?page=1` | الآراء المعلقة |
| GET | `/api/admin/reviews?status=approved` | كل الآراء (فلتر اختياري) |
| PUT | `/api/admin/reviews/approve/:id` | قبول ونشر |
| PUT | `/api/admin/reviews/:id` | تعديل `{ author_name, review_text }` |
| DELETE | `/api/admin/reviews/:id` | حذف |

---

## Pagination

كل القوائم تدعم `?page=1&limit=20` (الحد الأقصى 100).

---

## مثال Fetch من الواجهة

```javascript
// منتجات للزوار
const res = await fetch('/api/products?page=1&limit=20');
const { data, pagination } = await res.json();

// دخول الأدمن
const login = await fetch('/api/admin/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { pendingToken } = await login.json();

await fetch('/api/admin/verify-2fa', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pendingToken, code }),
});

// إضافة منتج
const form = new FormData();
form.append('name', 'قهوة');
form.append('price', '35');
form.append('details', 'قهوة سورية');
form.append('image', fileInput.files[0]);
await fetch('/api/admin/products', { method: 'POST', credentials: 'include', body: form });
```

---

## هيكل المجلدات

```
backend/
├── config/       # env, db, mailer, initDb
├── controllers/  # adminController, productController
├── middleware/   # auth, sanitize, upload, rateLimit, validateImage
├── routes/       # publicRoutes, adminRoutes
├── utils/        # pagination, bruteForce, twoFactor, fileCleanup
├── uploads/products/
├── app.js
└── server.js
```
