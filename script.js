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
    const visible = allCategories.slice(0, categoriesShown);

    const existingBtns = list.querySelectorAll('.category-btn:not(.category-btn-all)');
    existingBtns.forEach(b => b.remove());

    visible.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = c.name;
        btn.onclick = () => filterCategory(c.name, btn);
        list.appendChild(btn);
    });

    const loadMoreBtn = document.getElementById('loadMoreCategories');
    loadMoreBtn.style.display = categoriesShown < allCategories.length ? 'block' : 'none';
}

function loadMoreCategories() {
    categoriesShown += CATEGORIES_STEP;
    renderCategories();
}

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
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
    let items = Array.isArray(allProducts) ? [...allProducts] : [];

    if (currentCategory !== 'الكل') {
        items = items.filter(p => p.category_name === currentCategory);
    }
    if (currentSearch) {
        items = items.filter(p => p.name && p.name.toLowerCase().includes(currentSearch));
    }

    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<p class="muted" style="text-align: center; width: 100%; padding: 20px;">لا توجد منتجات حالياً</p>';
        document.getElementById('loadMoreProducts').style.display = 'none';
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

    document.getElementById('loadMoreProducts').style.display = productsShown < items.length ? 'block' : 'none';
}

function loadMoreProducts() {
    productsShown += PRODUCTS_STEP;
    renderProducts();
}

function filterProducts() {
    currentSearch = document.getElementById('searchInput').value.toLowerCase();
    productsShown = PRODUCTS_STEP;
    renderProducts();
}

function filterCategory(category, btn) {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = category;
    productsShown = PRODUCTS_STEP;
    renderProducts();
}

async function loadReviews() {
    const scroll = document.getElementById('reviewsScroll');
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
    scroll.innerHTML = '';

    const validReviews = Array.isArray(allReviews) ? allReviews.filter(Boolean) : [];

    if (validReviews.length === 0) {
        scroll.innerHTML = '<p class="muted" style="text-align: center; width: 100%; padding: 20px;">لا توجد آراء حالياً</p>';
        document.getElementById('loadMoreReviews').style.display = 'none';
        return;
    }

    const visible = validReviews.slice(0, reviewsShown);
    visible.forEach(r => {
        scroll.appendChild(buildReviewCard(r.author_name || 'زائر', r.review_text || ''));
    });

    document.getElementById('loadMoreReviews').style.display = reviewsShown < validReviews.length ? 'block' : 'none';
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
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}

async function submitReview() {
    let name = document.getElementById('reviewerName').value.trim();
    let text = document.getElementById('reviewText').value.trim();

    if (!name || !text) {
        alert('الرجاء تعبئة الاسم والرأي');
        return;
    }

    const btn = document.getElementById('submitReviewBtn');
    btn.disabled = true;
    try {
        await api.post('/reviews', { author_name: name, review_text: text });
        alert('تم إرسال رأيك بنجاح — سيظهر بعد مراجعته من إدارة المتجر');
        document.getElementById('reviewerName').value = '';
        document.getElementById('reviewText').value = '';
        document.getElementById('reviewForm').style.display = 'none';
    } catch (err) {
        alert(err.message || 'تعذر إرسال الرأي، حاول مرة أخرى');
    } finally {
        btn.disabled = false;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

const termsModal = document.getElementById('termsModal');
const footerTermsBtn = document.getElementById('footerTermsBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

if (footerTermsBtn && termsModal && closeModalBtn) {
    footerTermsBtn.onclick = function() {
        termsModal.style.display = 'flex';
    }
    closeModalBtn.onclick = function() {
        termsModal.style.display = 'none';
    }
    window.onclick = function(event) {
        if (event.target == termsModal) {
            termsModal.style.display = 'none';
        }
    }
}

const backToTopBtn = document.getElementById('backToTopBtn');
if (backToTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ربط الأزرار والأحداث برمجياً لتجاوز حظر CSP للـ Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterProducts);
    }

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

    const addReviewBtn = document.querySelector('.add-review-btn');
    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', toggleReviewForm);
    }

    const submitRevBtn = document.getElementById('submitReviewBtn');
    if (submitRevBtn) {
        submitRevBtn.addEventListener('click', submitReview);
    }

    // ربط أزرار التصنيفات (الكل والتصنيفات الأخرى)
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterCategory(btn.textContent.trim(), btn);
        });
    });
});

loadStoreSettings();
loadCategories();
loadProducts();
loadReviews();


