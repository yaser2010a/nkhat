let allProducts = [];
let allReviews = [];
let allCategories = [];
let currentCategory = 'الكل';
let currentSearch = '';

const PRODUCTS_STEP = 8;
const REVIEWS_STEP = 4;
const CATEGORIES_STEP = 6;

let productsShown = PRODUCTS_STEP;
let reviewsShown = REVIEWS_STEP;
let categoriesShown = CATEGORIES_STEP;

function apiOrigin() {
    return window.NKHAT_API_BASE.replace('/api', '');
}

async function loadStoreSettings() {
    try {
        const res = await api.get('/settings');
        const s = res.data;

        document.getElementById('storeName').textContent = s.store_name;
        document.getElementById('storeTagline').textContent = s.store_tagline;
        document.title = s.store_name;

        document.getElementById('callBtn').href = `tel:${s.phone}`;
        document.getElementById('footerCallBtn').href = `tel:${s.phone}`;

        const waLink = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(s.whatsapp_message || '')}`;
        document.getElementById('whatsappBtn').href = waLink;
        document.getElementById('socialWhatsapp').href = `https://wa.me/${s.whatsapp}`;

        if (s.instagram_url) document.getElementById('socialInstagram').href = s.instagram_url;
        if (s.snapchat_url) document.getElementById('socialSnapchat').href = s.snapchat_url;
        if (s.facebook_url) document.getElementById('socialfacebook').href = s.facebook_url;
        if (s.maps_url) document.getElementById('footerMapsBtn').href = s.maps_url;

        document.getElementById('footerStoreName').textContent = s.store_name;
        document.getElementById('footerStoreNameCopyright').textContent = `© ${new Date().getFullYear()} ${s.store_name}. جميع الحقوق محفوظة`;
        document.getElementById('footerAddress').textContent = s.address;
        document.getElementById('footerLocationText').textContent = s.address;
        document.getElementById('footerCr1').textContent = `السجل التجاري: ${s.cr_number}`;
        document.getElementById('footerCr2').textContent = `رخصة المتجر: ${s.license_number}`;

        document.getElementById('aboutTitle').textContent = s.about_title;
        document.getElementById('aboutDesc').textContent = s.about_desc;

        if (s.banner_image_url) {
            document.getElementById('bannerImage').src = apiOrigin() + s.banner_image_url;
        }

        // تعبئة بيانات المودال الخاصة بالشروط والأحكام
        const modalCr = document.getElementById('modalCrNumber');
        const modalLicense = document.getElementById('modalLicenseNumber');
        if (modalCr) modalCr.textContent = s.cr_number || '0000000000';
        if (modalLicense) modalLicense.textContent = s.license_number || '0000000000';

    } catch (err) {
        console.error('تعذر تحميل إعدادات المتجر', err);
    }
}

async function loadCategories() {
    try {
        const res = await api.get('/categories');
        allCategories = Array.isArray(res.data) ? res.data : [];
        renderCategories();
    } catch (err) {
        console.error('تعذر تحميل التصنيفات', err);
    }
}

function renderCategories() {
    const list = document.getElementById('categoriesList');
    if (!list) return;
    const visible = allCategories.slice(0, categoriesShown);

    const existingBtns = list.querySelectorAll('.category-btn:not(.category-btn-all)');
    existingBtns.forEach(b => b.remove());

    visible.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = c.name;
        btn.addEventListener('click', () => filterCategory(c.name, btn));
        list.appendChild(btn);
    });

    const loadMoreBtn = document.getElementById('loadMoreCategories');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = categoriesShown < allCategories.length ? 'block' : 'none';
    }
}

function loadMoreCategories() {
    categoriesShown += CATEGORIES_STEP;
    renderCategories();
}

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '<p class="muted" id="productsLoading">جاري تحميل المنتجات...</p>';
    try {
        const res = await api.get('/products?limit=200');
        allProducts = Array.isArray(res.data) ? res.data : (res.data?.products || []);
        renderProducts();
    } catch (err) {
        console.error('تعذر تحميل المنتجات', err);
        allProducts = [];
        renderProducts();
    }
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    let items = Array.isArray(allProducts) ? [...allProducts] : [];

    if (currentCategory !== 'الكل') {
        items = items.filter(p => p.category_name === currentCategory);
    }
    if (currentSearch) {
        items = items.filter(p => p.name && p.name.toLowerCase().includes(currentSearch));
    }

    grid.innerHTML = '';

    const loadMoreProdBtn = document.getElementById('loadMoreProducts');

    if (items.length === 0) {
        grid.innerHTML = '<p class="muted" style="text-align: center; width: 100%; padding: 20px;">لا توجد منتجات حالياً</p>';
        if (loadMoreProdBtn) loadMoreProdBtn.style.display = 'none';
        return;
    }

    const visible = items.slice(0, productsShown);

    visible.forEach(p => {
        const el = document.createElement('div');
        el.className = 'product-item';
        el.dataset.category = p.category_name || '';
        el.innerHTML = `
            <div class="product-icon"><img src="${apiOrigin()}${p.image_url}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div>
            <p class="product-name">${escapeHtml(p.name)}</p>
            <div class="product-footer">
                <span class="product-price">${p.price} ريال</span>
                <i class="ti ti-brand-whatsapp" aria-hidden="true"></i>
            </div>
        `;
        grid.appendChild(el);
    });

    if (loadMoreProdBtn) {
        loadMoreProdBtn.style.display = productsShown < items.length ? 'block' : 'none';
    }
}

function loadMoreProducts() {
    productsShown += PRODUCTS_STEP;
    renderProducts();
}

function filterProducts() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        currentSearch = searchInput.value.toLowerCase();
    }
    productsShown = PRODUCTS_STEP;
    renderProducts();
}

function filterCategory(category, btn) {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    currentCategory = category;
    productsShown = PRODUCTS_STEP;
    renderProducts();
}

async function loadReviews() {
    const scroll = document.getElementById('reviewsScroll');
    if (!scroll) return;
    scroll.innerHTML = '<p class="muted" id="reviewsLoading">جاري تحميل الآراء...</p>';
    try {
        const res = await api.get('/reviews?limit=200');
        allReviews = Array.isArray(res.data) ? res.data : [];
        renderReviews();
    } catch (err) {
        console.error('تعذر تحميل الآراء', err);
        allReviews = [];
        renderReviews();
    }
}

function renderReviews() {
    const scroll = document.getElementById('reviewsScroll');
    if (!scroll) return;
    scroll.innerHTML = '';

    const validReviews = Array.isArray(allReviews) ? allReviews.filter(Boolean) : [];
    const loadMoreRevBtn = document.getElementById('loadMoreReviews');

    if (validReviews.length === 0) {
        scroll.innerHTML = '<p class="muted" style="text-align: center; width: 100%; padding: 20px;">لا توجد آراء حالياً</p>';
        if (loadMoreRevBtn) loadMoreRevBtn.style.display = 'none';
        return;
    }

    const visible = validReviews.slice(0, reviewsShown);
    visible.forEach(r => {
        scroll.appendChild(buildReviewCard(r.author_name || 'زائر', r.review_text || ''));
    });

    if (loadMoreRevBtn) {
        loadMoreRevBtn.style.display = reviewsShown < validReviews.length ? 'block' : 'none';
    }
}

function loadMoreReviews() {
    reviewsShown += REVIEWS_STEP;
    renderReviews();
}

function buildReviewCard(name, text) {
    const initials = name.trim().split(' ').map(w => w[0]).slice(0, 2).join('.') + '.';
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
        <div class="reviewer-info">
            <div class="reviewer-avatar">${escapeHtml(initials)}</div>
            <span>${escapeHtml(name)}</span>
        </div>
        <div class="stars">★★★★★</div>
        <p class="review-text">${escapeHtml(text)}</p>
    `;
    return card;
}

function toggleReviewForm() {
    let form = document.getElementById('reviewForm');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    }
}

async function submitReview() {
    let nameInput = document.getElementById('reviewerName');
    let textInput = document.getElementById('reviewText');
    let name = nameInput ? nameInput.value.trim() : '';
    let text = textInput ? textInput.value.trim() : '';

    if (!name || !text) {
        alert('الرجاء تعبئة الاسم والرأي');
        return;
    }

    const btn = document.getElementById('submitReviewBtn');
    if (btn) btn.disabled = true;
    try {
        await api.post('/reviews', { author_name: name, review_text: text });
        alert('تم إرسال رأيك بنجاح — سيظهر بعد مراجعته من إدارة المتجر');
        if (nameInput) nameInput.value = '';
        if (textInput) textInput.value = '';
        let form = document.getElementById('reviewForm');
        if (form) form.style.display = 'none';
    } catch (err) {
        alert(err.message || 'تعذر إرسال الرأي، حاول مرة أخرى');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// تهيئة العناصر والأحداث عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // إدارة نافذة الشروط والأحكام
    const termsModal = document.getElementById('termsModal');
    const footerTermsBtn = document.getElementById('footerTermsBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (footerTermsBtn && termsModal) {
        footerTermsBtn.addEventListener('click', () => {
            termsModal.style.display = 'flex';
        });
    }
    if (closeModalBtn && termsModal) {
        closeModalBtn.addEventListener('click', () => {
            termsModal.style.display = 'none';
        });
    }
    window.addEventListener('click', (event) => {
        if (termsModal && event.target === termsModal) {
            termsModal.style.display = 'none';
        }
    });

    // إدارة زر العودة للأعلى والتحكم بظهوره
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
                backToTopBtn.style.display = 'flex';
            } else {
                backToTopBtn.classList.remove('show');
                backToTopBtn.style.display = 'none';
            }
        });
        backToTopBtn.addEventListener('click', scrollToTop);
    }

    // ربط خانة البحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterProducts);
    }

    // ربط أزرار عرض المزيد
    const loadMoreCatBtn = document.getElementById('loadMoreCategories');
    if (loadMoreCatBtn) {
        loadMoreCatBtn.addEventListener('click', loadMoreCategories);
    }

    const loadMoreProdBtn = document.getElementById('loadMoreProducts');
    if (loadMoreProdBtn) {
        loadMoreProdBtn.addEventListener('click', loadMoreProducts);
    }

    const loadMoreRevBtn = document.getElementById('loadMoreReviews');
    if (loadMoreRevBtn) {
        loadMoreRevBtn.addEventListener('click', loadMoreReviews);
    }

    // ربط أزرار إضافة وتقييم الآراء
    const addReviewBtn = document.querySelector('.add-review-btn');
    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', toggleReviewForm);
    }

    const submitRevBtn = document.getElementById('submitReviewBtn');
    if (submitRevBtn) {
        submitRevBtn.addEventListener('click', submitReview);
    }

    // زر "الكل" الافتراضي للتصنيفات
    const allCategoryBtn = document.querySelector('.category-btn');
    if (allCategoryBtn) {
        allCategoryBtn.addEventListener('click', (e) => {
            filterCategory('الكل', allCategoryBtn);
        });
    }
});

// تحميل البيانات الأولية للمتجر
loadStoreSettings();
loadCategories();
loadProducts();
loadReviews();