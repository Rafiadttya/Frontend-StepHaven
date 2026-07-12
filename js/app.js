/* =========================================================
   STEPHAVEN — app.js
   Shared logic used across every page:
   - LocalStorage data store (products, cart, wishlist, user, theme)
   - Navbar sticky / offcanvas behaviour
   - Toast notification system
   - Scroll-to-top button
   - Cart badge counter
   - Newsletter form
   ========================================================= */

/* ---------------------------------------------------------
   NAMESPACE
   Everything lives under window.StepHaven so pages can share
   functions without polluting the global scope too much.
--------------------------------------------------------- */
const StepHaven = {

  /* Increment DATA_VERSION whenever seed data changes significantly
     so returning visitors automatically get the fresh data. */
  DATA_VERSION: '4',

KEYS: {
    PRODUCTS: 'sh_products',
    CART: 'sh_cart',
    WISHLIST: 'sh_wishlist',
    USER: 'sh_user',
    RECENT: 'sh_recent_viewed',
    DATA_VER: 'sh_data_version'
  },


  /* -------------------- STORAGE HELPERS -------------------- */
getProducts(){
  let data = localStorage.getItem(this.KEYS.PRODUCTS);

  if(!data){
    localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify([]));
    return [];
  }

  return JSON.parse(data);
},

  saveProducts(products){
    localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(products));
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
   * Reads sh_user from localStorage on every page load.
   *
   * Logged IN  → hide .nav-login-btn
   *            → convert existing .nav-profile-btn into a Bootstrap dropdown
   *              (the icon itself becomes the toggle; a menu is injected
   *               right after it — NO new elements are added to the layout)
   *            → show "Admin Panel" link only when role === 'admin'
   *
   * Logged OUT → show .nav-login-btn (href=login.html)
   *            → keep .nav-profile-btn as a plain link to login.html
   *            → remove any previously injected dropdown menu
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
          <li><a class="dropdown-item" href="wishlist.html"><i class="bi bi-heart me-2"></i>Wishlist</a></li>
          <li><a class="dropdown-item" href="cart.html"><i class="bi bi-bag me-2"></i>Keranjang</a></li>
          ${user.role === 'admin'
            ? '<li><a class="dropdown-item" href="inventory.html"><i class="bi bi-speedometer2 me-2"></i>Admin Panel</a></li>'
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
    this.getProducts(); // ensure seeded
    this.initNavbar();
    this.updateNavbar(); // ← reads session, adjusts login/profile on every page
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

document.addEventListener('DOMContentLoaded', () => StepHaven.init());