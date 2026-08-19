let pendingToken = null;

function showError(message) {
    const box = document.getElementById('loginError');
    if (box) {
        box.textContent = message;
        box.classList.add('show');
    }
}

function hideError() {
    const box = document.getElementById('loginError');
    if (box) box.classList.remove('show');
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        try {
            const res = await api.post('/admin/login', { email, password });
            pendingToken = res.pendingToken;
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('twoFAForm').style.display = 'block';
            document.getElementById('stepSubtitle').textContent = 'أدخل رمز التحقق المرسل لبريدك';
            document.getElementById('twoFACode').focus();
        } catch (err) {
            showError(err.message);
        } finally {
            btn.disabled = false;
        }
    });
}

const twoFAForm = document.getElementById('twoFAForm');
if (twoFAForm) {
    twoFAForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();
        const code = document.getElementById('twoFACode').value.trim();
        const btn = document.getElementById('verifyBtn');
        btn.disabled = true;
        try {
            await api.post('/admin/verify-2fa', { pendingToken, code });
            window.location.href = 'admin-base-sr67.html';
        } catch (err) {
            showError(err.message);
        } finally {
            btn.disabled = false;
        }
    });
}

const backToLogin = document.getElementById('backToLogin');
if (backToLogin) {
    backToLogin.addEventListener('click', () => {
        pendingToken = null;
        hideError();
        document.getElementById('twoFAForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('stepSubtitle').textContent = 'تسجيل الدخول إلى لوحة التحكم';
        document.getElementById('twoFACode').value = '';
    });
}

(async () => {
    try {
        await api.get('/admin/me');
        window.location.href = 'admin-base-sr67.html';
    } catch {}
})();