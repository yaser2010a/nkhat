// ============================================================
// عميل API بسيط — يُستخدم من صفحة اللاندينق ولوحة الأدمن
// ============================================================

const API_BASE = 'https://nkhat-shamya.onrender.com/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: options.body instanceof FormData
      ? undefined
      : { 'Content-Type': 'application/json' },
    ...options,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: 'تعذر الاتصال بالخادم' };
  }

  if (!res.ok) {
    const error = new Error(data.message || 'حدث خطأ غير متوقع');
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, body) => apiFetch(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  put: (path, body) => apiFetch(path, {
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
  }),
  del: (path) => apiFetch(path, { method: 'DELETE' }),
};
