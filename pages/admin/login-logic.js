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
        
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const btn = document.getElementById('loginBtn');
        
        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.6';
        }
        
        try {
            const res = await api.post('/admin/login', { email, password });
            
            if (res && res.pendingToken) {
                pendingToken = res.pendingToken;
                document.getElementById('loginForm').style.display = 'none';
                
                const twoFAForm = document.getElementById('twoFAForm');
                if (twoFAForm) twoFAForm.style.display = 'block';
                
                const subtitle = document.getElementById('stepSubtitle');
                if (subtitle) subtitle.textContent = 'أدخل رمز التحقق المرسل لبريدك';
                
                const codeInput = document.getElementById('twoFACode');
                if (codeInput) codeInput.focus();
            } else {
                showError(res.message || 'استجابة غير متوقعة من الخادم');
            }
        } catch (err) {
            // التقاط الخطأ وعرضه في واجهة المستخدم بدلاً من تجميد الشاشة
            const errorMsg = err.response?.data?.message || err.message || 'حدث خطأ أثناء الاتصال بالخادم';
            showError(errorMsg);
            console.error('Login Error:', err);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
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