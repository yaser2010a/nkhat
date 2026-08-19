// ============================================================
// NKhat — Frontend config (auto-detect API base)
// ============================================================
// This file is safe to leave as-is. It tries to use an API base
// set at build time (window.NKHAT_API_BASE) and otherwise infers
// the backend URL from the current location:
// - localhost -> http://localhost:3000/api
// - otherwise -> https://<current-host>/api
// If you host frontend and backend on different domains, set
// window.NKHAT_API_BASE before this script runs or edit this file
// to hardcode your backend URL.

(function () {
  try {
    if (window.NKHAT_API_BASE && String(window.NKHAT_API_BASE).trim()) return;

    const host = window.location.hostname;
    let apiHost;

    if (host === 'localhost' || host === '127.0.0.1') {
      apiHost = 'http://localhost:3000';
    } else {
      apiHost = `${window.location.protocol}//${window.location.host}`;
    }

    window.NKHAT_API_BASE = apiHost.replace(/\/+$/, '') + '/api';
  } catch (err) {
    // fallback — keep the existing hardcoded value
    window.NKHAT_API_BASE = window.NKHAT_API_BASE || 'https://nkhat-api.onrender.com/api';
  }
})();
