let categories = [];
let editingProductId = null;

function showToast(message, isError) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

(async () => {
    try {
        await api.get('/admin/me');
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('adminWrapper').style.display = 'flex';
        initAdmin();
    } catch {
        window.location.href = 'login.html';
    }
})();

document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api.post('/admin/logout', {}); } catch {}
    window.location.href = 'login.html';
});

function initAdmin() {
    document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('section-' + this.dataset.section).classList.add('active');
        });
    });

    loadCategories();
    loadProducts();
    loadReviews();
    loadSettings();
}

async function loadProducts() {
    try {
        const res = await api.get('/admin/products?limit=100');
        renderProducts(res.data);
        document.getElementById('statProducts').textContent = res.pagination ? res.pagination.total : res.data.length;
    } catch (err) {
        showToast(err.message, true);
    }
}

function renderProducts(products) {
    const body = document.getElementById('productsTableBody');
    body.innerHTML = '';
    products.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><div class="table-icon"><img src="${window.NKHAT_API_BASE.replace('/api','')}${p.image_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div></td>
            <td>${escapeHtml(p.name)}</td>
            <td class="muted">${p.category_name ? escapeHtml(p.category_name) : 'بدون تصنيف'}</td>
            <td>${p.price} ريال</td>
            <td>${p.archived ? '<span class="badge-muted">مؤرشف</span>' : '<span class="badge-success">متوفر</span>'}</td>
            <td class="actions-cell">
                <i class="ti ti-edit" onclick="editProduct(${p.id})" title="تعديل"></i>
                ${p.archived
                    ? `<i class="ti ti-refresh" onclick="restoreProduct(${p.id})" title="استرجاع"></i>`
                    : `<i class="ti ti-archive" onclick="archiveProductRow(${p.id})" title="أرشفة"></i>`}
                <i class="ti ti-trash" onclick="deleteProductRow(${p.id})" title="حذف نهائي"></i>
            </td>
        `;
        body.appendChild(row);
    });
    window._productsCache = products;
}

function openProductModal() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('productImageLabel').textContent = 'صورة المنتج';
    document.getElementById('productModal').style.display = 'flex';
}

function editProduct(id) {
    const p = (window._productsCache || []).find(x => x.id === id);
    if (!p) return;
    editingProductId = id;
    document.getElementById('modalTitle').textContent = 'تعديل المنتج';
    document.getElementById('productImageLabel').textContent = 'صورة المنتج (اتركها فارغة للإبقاء على الحالية)';
    document.getElementById('productName').value = p.name;
    document.getElementById('productCategory').value = p.category_id || '';
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productDesc').value = p.details || '';
    document.getElementById('productModal').style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productDesc').value = '';
    document.getElementById('productImage').value = '';
    editingProductId = null;
}

async function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const categoryId = document.getElementById('productCategory').value;
    const price = document.getElementById('productPrice').value;
    const desc = document.getElementById('productDesc').value.trim();
    const imageFile = document.getElementById('productImage').files[0];

    if (!name || !price) {
        showToast('الرجاء تعبئة اسم المنتج والسعر', true);
        return;
    }
    if (!editingProductId && !imageFile) {
        showToast('صورة المنتج مطلوبة', true);
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('details', desc);
    formData.append('category_id', categoryId);
    if (imageFile) formData.append('image', imageFile);

    const btn = document.getElementById('saveProductBtn');
    btn.disabled = true;
    try {
        if (editingProductId) {
            await api.put(`/admin/products/${editingProductId}`, formData);
            showToast('تم تحديث المنتج');
        } else {
            await api.post('/admin/products', formData);
            showToast('تمت إضافة المنتج');
        }
        closeProductModal();
        loadProducts();
    } catch (err) {
        showToast(err.message, true);
    } finally {
        btn.disabled = false;
    }
}

async function archiveProductRow(id) {
    try {
        await api.put(`/admin/products/${id}/archive`, {});
        showToast('تم أرشفة المنتج');
        loadProducts();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function restoreProduct(id) {
    try {
        await api.put(`/admin/products/${id}/restore`, {});
        showToast('تم استرجاع المنتج');
        loadProducts();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function deleteProductRow(id) {
    if (!confirm('حذف المنتج نهائياً؟ لا يمكن التراجع.')) return;
    try {
        await api.del(`/admin/products/${id}`);
        showToast('تم حذف المنتج');
        loadProducts();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function loadReviews() {
    try {
        const [pendingRes, allRes] = await Promise.all([
            api.get('/admin/reviews/pending?limit=100'),
            api.get('/admin/reviews?status=approved&limit=100'),
        ]);
        renderReviews(pendingRes.data, allRes.data);
    } catch (err) {
        showToast(err.message, true);
    }
}

function renderReviews(pending, approved) {
    const pendingList = document.getElementById('pendingReviewsList');
    pendingList.innerHTML = pending.length ? '' : '<p class="muted">لا توجد آراء بانتظار المراجعة</p>';
    pending.forEach(r => {
        const row = document.createElement('div');
        row.className = 'review-row';
        row.innerHTML = `
            <div>
                <p class="review-name">${escapeHtml(r.author_name)}</p>
                <p class="review-text">${escapeHtml(r.review_text)}</p>
            </div>
            <div class="review-actions">
                <i class="ti ti-check accept" onclick="approveReview(${r.id})" title="قبول"></i>
                <i class="ti ti-x reject" onclick="deleteReviewRow(${r.id})" title="رفض"></i>
            </div>
        `;
        pendingList.appendChild(row);
    });

    const publishedList = document.getElementById('publishedReviewsList');
    publishedList.innerHTML = approved.length ? '' : '<p class="muted">لا توجد آراء منشورة</p>';
    approved.forEach(r => {
        const row = document.createElement('div');
        row.className = 'review-row';
        row.innerHTML = `
            <div>
                <p class="review-name">${escapeHtml(r.author_name)}</p>
                <p class="review-text">${escapeHtml(r.review_text)}</p>
            </div>
            <i class="ti ti-trash reject" onclick="deleteReviewRow(${r.id})" title="حذف"></i>
        `;
        publishedList.appendChild(row);
    });

    document.getElementById('statPending').textContent = pending.length;
    document.getElementById('statReviews').textContent = approved.length;
}

async function approveReview(id) {
    try {
        await api.put(`/admin/reviews/approve/${id}`, {});
        showToast('تم قبول الرأي');
        loadReviews();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function deleteReviewRow(id) {
    if (!confirm('حذف هذا الرأي؟')) return;
    try {
        await api.del(`/admin/reviews/${id}`);
        showToast('تم الحذف');
        loadReviews();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function loadCategories() {
    try {
        const res = await api.get('/admin/categories');
        categories = res.data;
        renderCategories();
        populateCategorySelect();
    } catch (err) {
        showToast(err.message, true);
    }
}

function renderCategories() {
    const list = document.getElementById('categoriesList');
    list.innerHTML = '';
    categories.forEach(c => {
        const row = document.createElement('div');
        row.className = 'category-row';
        row.innerHTML = `
            <span>${escapeHtml(c.name)}</span>
            <i class="ti ti-trash" onclick="deleteCategory(${c.id})"></i>
        `;
        list.appendChild(row);
    });
    document.getElementById('statCategories').textContent = categories.length;
}

function populateCategorySelect() {
    const select = document.getElementById('productCategory');
    select.innerHTML = '<option value="">بدون تصنيف</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
    });
}

async function addCategory() {
    const name = prompt('اسم التصنيف الجديد');
    if (!name || !name.trim()) return;
    try {
        await api.post('/admin/categories', { name: name.trim() });
        showToast('تمت إضافة التصنيف');
        loadCategories();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function deleteCategory(id) {
    if (!confirm('حذف هذا التصنيف؟ المنتجات المرتبطة به تصبح بدون تصنيف.')) return;
    try {
        await api.del(`/admin/categories/${id}`);
        showToast('تم حذف التصنيف');
        loadCategories();
        loadProducts();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function loadSettings() {
    try {
        const res = await api.get('/admin/settings');
        const s = res.data;
        document.getElementById('setStoreName').value = s.store_name || '';
        document.getElementById('setStoreTagline').value = s.store_tagline || '';
        document.getElementById('setPhone').value = s.phone || '';
        document.getElementById('setWhatsapp').value = s.whatsapp || '';
        document.getElementById('setWhatsappMessage').value = s.whatsapp_message || '';
        document.getElementById('setAddress').value = s.address || '';
        document.getElementById('setMapsUrl').value = s.maps_url || '';
        document.getElementById('setInstagram').value = s.instagram_url || '';
        document.getElementById('setSnapchat').value = s.snapchat_url || '';
        document.getElementById('setCr').value = s.cr_number || '';
        document.getElementById('setLicense').value = s.license_number || '';
        document.getElementById('setAboutTitle').value = s.about_title || '';
        document.getElementById('setAboutDesc').value = s.about_desc || '';

        const preview = document.getElementById('setBannerPreview');
        if (s.banner_image_url) {
            preview.src = window.NKHAT_API_BASE.replace('/api', '') + s.banner_image_url;
            preview.style.display = 'block';
        }
    } catch (err) {
        showToast(err.message, true);
    }
}

async function saveSettings() {
    const formData = new FormData();
    formData.append('store_name', document.getElementById('setStoreName').value.trim());
    formData.append('store_tagline', document.getElementById('setStoreTagline').value.trim());
    formData.append('phone', document.getElementById('setPhone').value.trim());
    formData.append('whatsapp', document.getElementById('setWhatsapp').value.trim());
    formData.append('whatsapp_message', document.getElementById('setWhatsappMessage').value.trim());
    formData.append('address', document.getElementById('setAddress').value.trim());
    formData.append('maps_url', document.getElementById('setMapsUrl').value.trim());
    formData.append('instagram_url', document.getElementById('setInstagram').value.trim());
    formData.append('snapchat_url', document.getElementById('setSnapchat').value.trim());
    formData.append('cr_number', document.getElementById('setCr').value.trim());
    formData.append('license_number', document.getElementById('setLicense').value.trim());
    formData.append('about_title', document.getElementById('setAboutTitle').value.trim());
    formData.append('about_desc', document.getElementById('setAboutDesc').value.trim());

    const bannerFile = document.getElementById('setBannerImage').files[0];
    if (bannerFile) formData.append('banner_image', bannerFile);

    try {
        await api.put('/admin/settings', formData);
        showToast('تم حفظ إعدادات المتجر');
        loadSettings();
    } catch (err) {
        showToast(err.message, true);
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}