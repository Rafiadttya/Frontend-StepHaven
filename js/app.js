/* =========================================================
   STEPHAVEN — app.js
   Shared logic used across every page:
   - LocalStorage data store (products, cart, wishlist, user, theme)
   - Navbar sticky / offcanvas behaviour
   - Dark mode toggle
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

  /* -------------------- SEED DATA -------------------- */
  // Used only the first time the site runs (localStorage empty).
  seedProducts(){
    return [
      { id:'SH-1001', name:'Aerowave Knit', brand:'Velocon', category:'Casual Shoes', subCategory:'Sneakers Casual', price:1299000, discount:15, sizes:[39,40,41,42,43], colors:['#1A1A1D','#B5562D'], stock:24, rating:4.6, reviews:128, sold:340, bestSeller:true,  img:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', img2:'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&q=80', desc:'Sneakers kasual knit ringan dengan cushioning responsif, cocok untuk aktivitas harian maupun santai.', date:'2026-06-20' },
      { id:'SH-1002', name:'Heritage Sneak', brand:'Northfield', category:'Casual Shoes', subCategory:'Sneakers Casual', price:899000, discount:0, sizes:[38,39,40,41,42], colors:['#F7F5F2','#1A1A1D'], stock:12, rating:4.3, reviews:64, sold:210, bestSeller:false, img:'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80', img2:'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80', desc:'Sneakers kasual klasik dengan sentuhan kulit premium, tampil effortless setiap hari.', date:'2026-05-02' },
      { id:'SH-1003', name:'Casual Drift Canvas', brand:'Lumora', category:'Casual Shoes', subCategory:'Canvas Shoes', price:649000, discount:10, sizes:[39,40,41,42], colors:['#6B7156','#1A1A1D'], stock:0, rating:4.1, reviews:39, sold:98, bestSeller:false, img:'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80', img2:'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&q=80', desc:'Sepatu kanvas breathable serbaguna, nyaman untuk aktivitas sehari-hari dari pagi hingga malam.', date:'2026-04-18' },
      { id:'SH-1004', name:'Elite Loafer Pro', brand:'Renwick', category:'Semi Formal Shoes', subCategory:'Loafers', price:1499000, discount:20, sizes:[40,41,42,43,44], colors:['#B5562D','#1A1A1D'], stock:8, rating:4.8, reviews:201, sold:512, bestSeller:true,  img:'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&q=80', img2:'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=600&q=80', desc:'Loafer premium yang sempurna antara kenyamanan kasual dan tampilan semi formal elegan.', date:'2026-06-26' },
      { id:'SH-1005', name:'Oxford Style Classic', brand:'Renwick', category:'Semi Formal Shoes', subCategory:'Oxford Style Casual', price:1099000, discount:0, sizes:[39,40,41,42,43], colors:['#1A1A1D'], stock:15, rating:4.4, reviews:52, sold:140, bestSeller:false, img:'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&q=80', img2:'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&q=80', desc:'Oxford style casual dengan konstruksi kokoh, ideal untuk meeting santai maupun acara semi formal.', date:'2026-03-11' },
      { id:'SH-1006', name:'Gold Crest LE', brand:'Aurum', category:'Limited Edition', subCategory:'Exclusive Release', price:2599000, discount:5, sizes:[40,41,42,43], colors:['#C9A85C','#1A1A1D'], stock:3, rating:4.9, reviews:18, sold:45, bestSeller:true,  img:'https://images.unsplash.com/photo-1597248881519-db089d3744a3?w=600&q=80', img2:'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&q=80', desc:'Edisi terbatas dengan aksen emas dan nomor seri unik di setiap pasang — koleksi eksklusif.', date:'2026-06-28' },
      { id:'SH-1007', name:'Urban Slip-On', brand:'Lumora', category:'Casual Shoes', subCategory:'Slip-On', price:549000, discount:25, sizes:[38,39,40,41], colors:['#1A1A1D','#E8E2D5'], stock:30, rating:4.0, reviews:71, sold:180, bestSeller:false, img:'https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=600&q=80', img2:'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80', desc:'Slip-on praktis tanpa tali, mudah dipakai-lepas dengan kenyamanan sepanjang hari.', date:'2026-01-30' },
      { id:'SH-1008', name:'Leather Semi Derby', brand:'Renwick', category:'Semi Formal Shoes', subCategory:'Leather Semi Formal', price:1349000, discount:0, sizes:[40,41,42,43], colors:['#1A1A1D','#B5562D'], stock:6, rating:4.7, reviews:97, sold:230, bestSeller:true,  img:'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&q=80', img2:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', desc:'Derby semi formal berbahan kulit asli dengan finishing premium, tampil profesional di segala suasana.', date:'2026-05-22' },
      { id:'SH-1009', name:'Derby Noir Leather', brand:'Renwick', category:'Semi Formal Shoes', subCategory:'Leather Semi Formal', price:1249000, discount:0, sizes:[39,40,41,42,43,44], colors:['#1A1A1D'], stock:0, rating:4.2, reviews:33, sold:75, bestSeller:false, img:'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&q=80', img2:'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&q=80', desc:'Leather semi formal dengan siluet ramping dan finishing matte yang anggun.', date:'2025-12-05' },
      { id:'SH-1010', name:'Featherlight Canvas', brand:'Aurum', category:'Casual Shoes', subCategory:'Canvas Shoes', price:949000, discount:12, sizes:[38,39,40,41,42], colors:['#E8E2D5','#6B7156'], stock:21, rating:4.4, reviews:59, sold:160, bestSeller:false, img:'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80', img2:'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80', desc:'Canvas ringan dengan rajutan ventilasi maksimal, kenyamanan sepanjang hari tanpa batas.', date:'2026-06-01' },
      { id:'SH-1011', name:'Midnight Edition LE', brand:'Aurum', category:'Limited Edition', subCategory:'Exclusive Release', price:2899000, discount:0, sizes:[41,42,43], colors:['#1A1A1D','#C9A85C'], stock:2, rating:5.0, reviews:9, sold:21, bestSeller:false, img:'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&q=80', img2:'https://images.unsplash.com/photo-1597248881519-db089d3744a3?w=600&q=80', desc:'Kolaborasi eksklusif bernuansa gelap dengan detail emas — terbatas 200 pasang di dunia.', date:'2026-06-29' },
      { id:'SH-1012', name:'Classic Loafer Slip', brand:'Northfield', category:'Semi Formal Shoes', subCategory:'Loafers', price:1150000, discount:10, sizes:[39,40,41,42,43], colors:['#B5562D','#1A1A1D'], stock:18, rating:4.5, reviews:42, sold:130, bestSeller:false, img:'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&q=80', img2:'https://images.unsplash.com/photo-1465453869711-7e174808ace9?w=600&q=80', desc:'Loafer slip-on semi formal dengan material suede lembut, cocok untuk suasana business casual.', date:'2026-02-14' }
    ];
  },

  /* -------------------- STORAGE HELPERS -------------------- */
  getProducts(){
    /* If stored data version doesn't match current version, re-seed.
       This ensures category changes propagate to returning users. */
    const storedVer = localStorage.getItem(this.KEYS.DATA_VER);
    if(storedVer !== this.DATA_VERSION){
      const seed = this.seedProducts();
      localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(seed));
      localStorage.setItem(this.KEYS.DATA_VER, this.DATA_VERSION);
      return seed;
    }
    let data = localStorage.getItem(this.KEYS.PRODUCTS);
    if(!data){
      const seed = this.seedProducts();
      localStorage.setItem(this.KEYS.PRODUCTS, JSON.stringify(seed));
      return seed;
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

  /* ================================================================
     UI: NAVBAR SEARCH BAR — v2
     ----------------------------------------------------------------
     Behaviour:
     - HOME / any page with #navSearchInput:
         • Searches ALL products in localStorage (not just visible cards)
         • Shows dropdown suggestion (thumbnail + name + price) realtime
         • Enter or click → redirect to products.html?q=keyword
         • Dropdown closes on outside click or Escape
     - SHOP (products.html):
         • On load, reads ?q= from URL → pre-fills both navbar + sidebar
           inputs and fires the existing Shop filter
         • Typing in navbar input syncs → sidebar #searchInput → filter runs
         • Typing in sidebar syncs back → navbar input
     ================================================================ */
  initNavbarSearch(){
    const navInput   = document.getElementById('navSearchInput');
    const dropdown   = document.getElementById('navSearchDropdown');
    if(!navInput) return;  // page has no search bar

    const page = (location.pathname.split('/').pop() || 'index.html');

    /* ─────────────────────────────────────────────────────────────
       SHOP PAGE — sync with existing sidebar #searchInput
       and auto-apply keyword from URL query string
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
    this.initNavbarSearch();     // navbar search bar (Home + Shop only)
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
