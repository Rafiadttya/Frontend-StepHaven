/* =========================================================
   STEPHAVEN — app.js
   Logika bersama yang digunakan di setiap halaman:
   - Penyimpanan data LocalStorage (produk, keranjang, wishlist, pengguna, tema)
   - Perilaku navbar sticky / offcanvas
   - Sistem notifikasi toast
   - Tombol gulir ke atas (scroll-to-top)
   - Penghitung badge keranjang
   - Formulir newsletter
   ========================================================= */

/* ---------------------------------------------------------
   NAMESPACE
   Segala sesuatu berada di bawah window.StepHaven agar halaman-halaman
   dapat berbagi fungsi tanpa terlalu mengotori lingkup global.
--------------------------------------------------------- */
const StepHaven = {

/* Tingkatkan DATA_VERSION setiap kali data awal (seed data) berubah secara signifikan
     agar pengunjung yang kembali secara otomatis mendapatkan data terbaru. */
  DATA_VERSION: '5',

  KEYS: {
    CART:     'sh_cart',
    WISHLIST: 'sh_wishlist',
    USER:     'sh_user',
    RECENT:   'sh_recent_viewed',
    DATA_VER: 'sh_data_version' 
  },

  /* -------------------- SEED DATA -------------------- */

  seedProducts(){
/* Sengaja dikosongkan — tidak ada produk yang dimasukkan secara otomatis.
       Semua produk harus ditambahkan secara manual melalui halaman Inventaris.
       Mengembalikan [] menginstruksikan db.js untuk membiarkan IndexedDB tetap kosong saat pertama kali dijalankan. */
    return [];
  },

/* -------------------- FUNGSI BANTU PENYIMPANAN -------------------- */
  /* ──────────────────────────────────────────────────────
     PENYIMPANAN PRODUK — IndexedDB (melalui cache StepHavenDB)
     getProducts()  = pembacaan sinkron dari cache in-memory
     saveProducts() = pembaruan cache secara sinkron + persistensi IDB secara asinkron
     getProductById() = tidak berubah (memanggil getProducts())
  ────────────────────────────────────────────────────── */
  getProducts(){

    return StepHavenDB.getCached();
  },

  saveProducts(products){
/* Mengembalikan Promise yang selesai (resolve) hanya setelah IndexedDB
       mengonfirmasi operasi tulis. */
    return StepHavenDB.persistAsync(products);
  },

  getProductById(id){
    return this.getProducts().find(p => p.id === id);
  },

  getCart(){
    return JSON.parse(localStorage.getItem(this.KEYS.CART) || '[]');
  },
  saveCart(cart){
    localStorage.setItem(this.KEYS.CART, JSON.stringify(cart));
    this.updateCartBadge();
  },
  addToCart(productId, qty=1, size=null, color=null){
    const cart = this.getCart();
    const existing = cart.find(c => c.id === productId && c.size === size && c.color === color);
    if(existing){
      existing.qty += qty;
    }else{
      cart.push({ id: productId, qty, size, color });
    }
    this.saveCart(cart);
    this.showToast('Ditambahkan ke keranjang', 'success');
  },
  removeFromCart(index){
    const cart = this.getCart();
    cart.splice(index,1);
    this.saveCart(cart);
  },

  getWishlist(){
    return JSON.parse(localStorage.getItem(this.KEYS.WISHLIST) || '[]');
  },
  toggleWishlist(productId){
    let wishlist = this.getWishlist();
    const idx = wishlist.indexOf(productId);
    if(idx > -1){
      wishlist.splice(idx,1);
      this.showToast('Dihapus dari wishlist', 'info');
    }else{
      wishlist.push(productId);
      this.showToast('Ditambahkan ke wishlist', 'success');
    }
    localStorage.setItem(this.KEYS.WISHLIST, JSON.stringify(wishlist));
    this.updateWishlistBadge();
    return wishlist;
  },

  pushRecentlyViewed(productId){
    let recent = JSON.parse(localStorage.getItem(this.KEYS.RECENT) || '[]');
    recent = recent.filter(id => id !== productId);
    recent.unshift(productId);
    recent = recent.slice(0,6);
    localStorage.setItem(this.KEYS.RECENT, JSON.stringify(recent));
  },

  formatRupiah(num){
    return 'Rp' + Number(num).toLocaleString('id-ID');
  },

  /* -------------------- UI: NAVBAR -------------------- */
  initNavbar(){
    const navbar = document.querySelector('.sh-navbar');
    if(!navbar) return;
    const onScroll = () => {
      if(window.scrollY > 12){ navbar.classList.add('scrolled'); }
      else{ navbar.classList.remove('scrolled'); }
    };
    window.addEventListener('scroll', onScroll);
    onScroll();

    // Highlight active link based on current page
    const current = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sh-navbar .nav-link').forEach(link => {
      if(link.getAttribute('href') === current) link.classList.add('active');
    });
  },

    /* ================================================================
      UI: NAVBAR SEARCH BAR — 
      ----------------------------------------------------------------
Perilaku:
      - Beranda / halaman mana pun dengan #navSearchInput:
          • Mencari di SELURUH produk dalam localStorage (bukan hanya kartu yang terlihat)
          • Menampilkan saran via dropdown (gambar kecil + nama + harga) secara real-time
          • Tekan Enter atau klik = mengalihkan ke products.html?q=kata_kunci
          • Dropdown tertutup saat diklik di luar area atau menekan tombol Escape
      - Toko (products.html):
          • Saat dimuat, membaca parameter ?q= dari URL = mengisi otomatis input di
            navbar maupun sidebar, lalu menjalankan filter Toko yang sudah ada
          • Mengetik di input navbar akan menyinkronkan = #searchInput sidebar = filter dijalankan
          • Mengetik di sidebar akan menyinkronkan balik = input navbar
      ================================================================ */
  initNavbarSearch(){
    const navInput   = document.getElementById('navSearchInput');
    const dropdown   = document.getElementById('navSearchDropdown');
    if(!navInput) return;  // halaman tidak memiliki kolom pencarian

    const page = (location.pathname.split('/').pop() || 'index.html');

    /* ─────────────────────────────────────────────────────────────
        SHOP PAGE —
    ───────────────────────────────────────────────────────────── */
    if(page === 'products.html'){
      const shopInput = document.getElementById('searchInput');
      if(!shopInput) return;

      /* Read keyword from URL e.g. ?q=loafer */
      const urlQ = new URLSearchParams(location.search).get('q') || '';
      if(urlQ){
        navInput.value  = urlQ;
        shopInput.value = urlQ;
        /* Trigger the existing Shop filter (products.js listens to 'input') */
        shopInput.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        navInput.value = shopInput.value;
      }

      /* Keep both inputs in sync */
      navInput.addEventListener('input', () => {
        shopInput.value = navInput.value;
        shopInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      shopInput.addEventListener('input', () => {
        if(document.activeElement !== navInput)
          navInput.value = shopInput.value;
      });

      /* Enter on navbar input on Shop page → just run the filter in-place */
      navInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter'){
          e.preventDefault();
          shopInput.value = navInput.value;
          shopInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      return;  // no dropdown needed on Shop page
    }

    /* ─────────────────────────────────────────────────────────────
        ALL OTHER PAGES (incl. HOME) — full suggestion dropdown
    ───────────────────────────────────────────────────────────── */
    if(!dropdown) return;

    const MAX_SUGGESTIONS = 8;

    /* Helpers */
    const formatRp = (num) => 'Rp' + Number(num).toLocaleString('id-ID');
    const finalPrice = (p) => p.discount > 0
      ? Math.round(p.price * (1 - p.discount / 100))
      : p.price;
    const highlight = (text, kw) => {
      if(!kw) return text;
      const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
      return text.replace(re, '<mark style="background:rgba(181,86,45,0.15);color:inherit;padding:0 1px;border-radius:2px;">$1</mark>');
    };

    /* Build and show dropdown */
    const showDropdown = (keyword) => {
      if(!keyword){ closeDropdown(); return; }

      const kw = keyword.toLowerCase();
      const all = StepHaven.getProducts();
      const results = all.filter(p =>
        p.name.toLowerCase().includes(kw)  ||
        p.brand.toLowerCase().includes(kw) ||
        (p.category    && p.category.toLowerCase().includes(kw))    ||
        (p.subCategory && p.subCategory.toLowerCase().includes(kw))
      ).slice(0, MAX_SUGGESTIONS);

      if(results.length === 0){
        dropdown.innerHTML = `<div class="nsd-empty"><i class="bi bi-search me-1"></i>Tidak ada produk yang ditemukan.</div>`;
      } else {
        dropdown.innerHTML =
          `<div class="nsd-label">${results.length} produk ditemukan</div>` +
          results.map(p => `
            <a class="nsd-item" href="products.html?q=${encodeURIComponent(keyword)}" data-id="${p.id}">
              ${p.img
                ? `<img class="nsd-thumb" src="${p.img}" alt="${p.name}" loading="lazy">`
                : `<div class="nsd-thumb-placeholder"><i class="bi bi-image"></i></div>`}
              <div class="nsd-info">
                <span class="nsd-name">${highlight(p.name, keyword)}</span>
                <div class="nsd-meta">
                  <span class="nsd-price">${formatRp(finalPrice(p))}</span>
                  <span class="nsd-cat">${p.subCategory || p.category}</span>
                </div>
              </div>
            </a>`).join('');
      }

      dropdown.classList.add('open');
    };

    const closeDropdown = () => {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
    };

    /* Redirect to Shop with keyword */
    const goToShop = (kw) => {
      if(!kw.trim()) return;
      location.href = `products.html?q=${encodeURIComponent(kw.trim())}`;
    };

    /* ── Event listeners ── */
    navInput.addEventListener('input', () => showDropdown(navInput.value.trim()));

    navInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){
        e.preventDefault();
        closeDropdown();
        goToShop(navInput.value);
      }
      if(e.key === 'Escape'){
        closeDropdown();
        navInput.blur();
      }
    });

    /* Clicking a suggestion navigates (href handles it), but update input first */
    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.nsd-item');
      if(item){
        e.preventDefault();
        const kw = navInput.value.trim();
        closeDropdown();
        goToShop(kw);
      }
    });

    /* Close when clicking outside */
    document.addEventListener('click', (e) => {
      if(!navInput.closest('.navbar-search-wrap').contains(e.target)){
        closeDropdown();
      }
    });

    /* Re-open on focus if input has content */
    navInput.addEventListener('focus', () => {
      if(navInput.value.trim()) showDropdown(navInput.value.trim());
    });
  },

  updateCartBadge(){
    const cart = this.getCart();
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.cart-badge').forEach(b => {
      b.textContent = totalQty;
      b.style.display = totalQty > 0 ? 'flex' : 'none';
    });
  },
  updateWishlistBadge(){
    const count = this.getWishlist().length;
    document.querySelectorAll('.wishlist-badge').forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  /* -------------------- UI: TOAST -------------------- */
  showToast(message, type='info'){
    let stack = document.querySelector('.toast-stack');
    if(!stack){
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const icons = { success:'bi-check-circle-fill', danger:'bi-x-circle-fill', info:'bi-info-circle-fill', warning:'bi-exclamation-triangle-fill' };
    const colors = { success:'#4C7A4C', danger:'#B33A3A', info:'#1A1A1D', warning:'#C9A85C' };
    const toastEl = document.createElement('div');
    toastEl.className = 'toast align-items-center border-0 show';
    toastEl.style.background = '#fff';
    toastEl.style.borderLeft = `4px solid ${colors[type] || colors.info}`;
    toastEl.style.borderRadius = '10px';
    toastEl.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icons[type] || icons.info}" style="color:${colors[type] || colors.info}"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close me-2 m-auto" aria-label="Close"></button>
      </div>`;
    stack.appendChild(toastEl);
    toastEl.querySelector('.btn-close').addEventListener('click', () => toastEl.remove());
    setTimeout(() => toastEl.remove(), 3200);
  },

  /* -------------------- UI: SCROLL TO TOP -------------------- */
  initScrollTop(){
    const btn = document.createElement('button');
    btn.id = 'scrollTopBtn';
    btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    btn.setAttribute('aria-label','Scroll to top');
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      btn.classList.toggle('show', window.scrollY > 400);
    });
    btn.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
  },

  /* -------------------- UI: NEWSLETTER FORM -------------------- */
  initNewsletter(){
    const form = document.getElementById('newsletterForm');
    if(!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if(input.checkValidity() && input.value.trim() !== ''){
        this.showToast('Terima kasih telah berlangganan!', 'success');
        form.reset();
      }else{
        this.showToast('Masukkan alamat email yang valid', 'danger');
      }
    });
  },

  /* -------------------- UI: REVEAL ON SCROLL -------------------- */
  initReveal(){
    const items = document.querySelectorAll('.reveal');
    if(!items.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){ entry.target.classList.add('in'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    items.forEach(item => observer.observe(item));
  },

  /* -------------------- UI: STAR RENDER -------------------- */
  renderStars(rating){
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    let html = '';
    for(let i=0;i<full;i++) html += '<i class="bi bi-star-fill"></i>';
    if(half) html += '<i class="bi bi-star-half"></i>';
    for(let i=full+(half?1:0); i<5; i++) html += '<i class="bi bi-star"></i>';
    return html;
  },

  /* -------------------- UI: SESSION / NAVBAR STATE -------------------- */
  /*
* updateNavbar()
   * Membaca sh_user dari localStorage setiap kali halaman dimuat.
   *
   * Status Masuk (Logged IN) = sembunyikan .nav-login-btn
   *                           ubah .nav-profile-btn yang ada menjadi dropdown Bootstrap
   *                            (ikonnya sendiri berfungsi sebagai tombol pemicu/toggle; menu disisipkan
   *                             tepat setelahnya — TIDAK ada elemen baru yang ditambahkan ke tata letak)
   *                       
   *
   * Status Keluar (Logged OUT) → tampilkan .nav-login-btn (href=login.html)
   *                            .nav-profile-btn sebagai tautan biasa menuju login.html
   *                            hapus menu dropdown yang sebelumnya disisipkan
   */
  updateNavbar(){
    const userRaw = localStorage.getItem(this.KEYS.USER);
    const user    = userRaw ? JSON.parse(userRaw) : null;

    /* ---- Targets (present on every page) ---- */
    const loginBtns   = document.querySelectorAll('.nav-login-btn');
    const profileBtns = document.querySelectorAll('.nav-profile-btn');

    if(user){
      /* ── LOGGED IN ── */

      /* 1. Hide Login button */
      loginBtns.forEach(btn => { btn.style.display = 'none'; });

      /* 2. Transform each profile icon into a dropdown */
      profileBtns.forEach(btn => {
        /* Avoid double-init if updateNavbar() is called twice */
        if(btn.dataset.sessionReady === '1') return;
        btn.dataset.sessionReady = '1';

        /* Make the <a> a Bootstrap dropdown toggle */
        btn.removeAttribute('href');          // prevent navigation on click
        btn.setAttribute('role', 'button');
        btn.setAttribute('data-bs-toggle', 'dropdown');
        btn.setAttribute('aria-expanded', 'false');
        btn.style.color = 'var(--color-leather)'; // tint icon to show "active" state

        /* Build dropdown menu and insert after the icon */
        const menu = document.createElement('ul');
        menu.className = 'dropdown-menu dropdown-menu-end shadow-sm';
        menu.style.minWidth = '190px';
        menu.innerHTML = `
          <li class="px-3 py-2" style="border-bottom:1px solid var(--color-line);">
            <div class="fw-semibold small">${user.name || user.email}</div>
            <div class="text-muted" style="font-size:0.75rem;">${user.email || ''}</div>
          </li>
          <li><a class="dropdown-item" href="profile.html"><i class="bi bi-person me-2"></i>Profil Saya</a></li>
  
          ${user.role === 'admin'
            ? '<li><a class="dropdown-item" href="inventory.html">'
            : ''}
          <li><hr class="dropdown-divider my-1"></li>
          <li><a class="dropdown-item text-danger btn-logout-nav" href="#"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>`;

        /* Wrap btn + menu in a div.dropdown so Bootstrap positions the menu */
        const wrapper = document.createElement('div');
        wrapper.className = 'dropdown';
        btn.parentNode.insertBefore(wrapper, btn);
        wrapper.appendChild(btn);
        wrapper.appendChild(menu);

        /* Logout handler inside this dropdown */
        wrapper.querySelector('.btn-logout-nav').addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      });

    } else {
      /* ── LOGGED OUT ── */

      /* 1. Show Login button */
      loginBtns.forEach(btn => { btn.style.display = ''; });

      /* 2. Keep profile icon as a plain link to login (no dropdown) */
      profileBtns.forEach(btn => {
        btn.setAttribute('href', 'login.html');
        btn.style.color = '';
      });
    }
  },

  /* ---- Shared logout: clear session and redirect ---- */
  logout(){
    localStorage.removeItem(this.KEYS.USER);
    this.showToast('Berhasil keluar', 'info');
    setTimeout(() => location.href = 'login.html', 800);
  },

  /* -------------------- INIT EVERYTHING -------------------- */
  init(){
    /* Note: StepHavenDB.init(this) is called BEFORE this method,
       so the product cache is already populated. */
    this.initNavbar();
    this.initNavbarSearch();     
    this.updateNavbar(); 
    this.initScrollTop();
    this.initNewsletter();
    this.updateCartBadge();
    this.updateWishlistBadge();
    this.initReveal();

    /* Legacy .btn-logout support (profile.html logout button) */
    document.querySelectorAll('.btn-logout').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    });
  }
};

/* ─────────────────────────────────────────────────────────
BOOTSTRAP
    1. Tunggu DOM.
    2. Inisialisasi IndexedDB dan muat cache produk (secara asinkron).
    3. Kemudian dijalankan StepHaven.init() secara sinkron seperti sebelumnya.
    memastikan StepHaven.getProducts() selalu mengembalikan data.
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await StepHavenDB.init(StepHaven);
  } catch(err) {
    console.warn('[StepHavenDB] IndexedDB unavailable, using seed data:', err);
    StepHavenDB._cache = StepHaven.seedProducts();
  }
  StepHaven.init();
  /* Menandakan bahwa cache IDB telah dimuat dan StepHaven siap.
      products.js, inventory.js, dan wishlist.js memantau peristiwa INI
      alih-alih DOMContentLoaded, sehingga skrip-skrip tersebut tidak akan berjalan
      sebelum cache terisi. Ini adalah satu-satunya sumber acuan untuk status "siap". */
  document.dispatchEvent(new CustomEvent('stephavenReady'));
});
