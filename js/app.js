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

  KEYS: {
    PRODUCTS: 'sh_products',
    CART: 'sh_cart',
    WISHLIST: 'sh_wishlist',
    THEME: 'sh_theme',
    USER: 'sh_user',
    RECENT: 'sh_recent_viewed'
  },

  /* -------------------- SEED DATA -------------------- */
  // Used only the first time the site runs (localStorage empty).
  seedProducts(){
    return [
      { id:'SH-1001', name:'Aerowave Runner', brand:'Velocon', category:'Running', price:1299000, discount:15, sizes:[39,40,41,42,43], colors:['#1A1A1D','#B5562D'], stock:24, rating:4.6, reviews:128, sold:340, img:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', img2:'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&q=80', desc:'Sepatu lari ringan dengan teknologi cushioning responsif, dirancang untuk performa lari jarak jauh maupun harian.', date:'2026-06-20' },
      { id:'SH-1002', name:'Heritage Sneak', brand:'Northfield', category:'Sneakers', price:899000, discount:0, sizes:[38,39,40,41,42], colors:['#F7F5F2','#1A1A1D'], stock:12, rating:4.3, reviews:64, sold:210, img:'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80', img2:'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80', desc:'Sneakers klasik dengan sentuhan kulit premium, cocok dipakai harian dengan gaya effortless.', date:'2026-05-02' },
      { id:'SH-1003', name:'Casual Drift', brand:'Lumora', category:'Casual', price:649000, discount:10, sizes:[39,40,41,42], colors:['#6B7156','#1A1A1D'], stock:0, rating:4.1, reviews:39, sold:98, img:'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80', img2:'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&q=80', desc:'Sepatu kasual serbaguna dengan bahan kanvas breathable, nyaman untuk aktivitas sehari-hari.', date:'2026-04-18' },
      { id:'SH-1004', name:'Court Sprint Pro', brand:'Velocon', category:'Sport', price:1499000, discount:20, sizes:[40,41,42,43,44], colors:['#B5562D','#F7F5F2'], stock:8, rating:4.8, reviews:201, sold:512, img:'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&q=80', img2:'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=600&q=80', desc:'Didesain untuk olahraga indoor intensitas tinggi dengan grip outsole yang superior.', date:'2026-06-26' },
      { id:'SH-1005', name:'Oxford Classic', brand:'Renwick', category:'Formal', price:1099000, discount:0, sizes:[39,40,41,42,43], colors:['#1A1A1D'], stock:15, rating:4.4, reviews:52, sold:140, img:'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&q=80', img2:'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&q=80', desc:'Sepatu formal kulit asli dengan jahitan rapi, pilihan sempurna untuk acara resmi.', date:'2026-03-11' },
      { id:'SH-1006', name:'Gold Crest LE', brand:'Aurum', category:'Limited Edition', price:2599000, discount:5, sizes:[40,41,42,43], colors:['#C9A85C','#1A1A1D'], stock:3, rating:4.9, reviews:18, sold:45, img:'https://images.unsplash.com/photo-1597248881519-db089d3744a3?w=600&q=80', img2:'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&q=80', desc:'Edisi terbatas dengan aksen emas dan nomor seri unik di setiap pasang.', date:'2026-06-28' },
      { id:'SH-1007', name:'Trailblazer X', brand:'Northfield', category:'Running', price:1199000, discount:0, sizes:[39,40,41,42,43,44], colors:['#6B7156','#B5562D'], stock:19, rating:4.5, reviews:88, sold:266, img:'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&q=80', img2:'https://images.unsplash.com/photo-1465453869711-7e174808ace9?w=600&q=80', desc:'Sepatu trail dengan sol agresif untuk genggaman optimal di medan tidak rata.', date:'2026-02-14' },
      { id:'SH-1008', name:'Urban Slip-on', brand:'Lumora', category:'Casual', price:549000, discount:25, sizes:[38,39,40,41], colors:['#1A1A1D','#E8E2D5'], stock:30, rating:4.0, reviews:71, sold:180, img:'https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=600&q=80', img2:'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80', desc:'Slip-on praktis tanpa tali, mudah dipakai-lepas dengan kenyamanan sepanjang hari.', date:'2026-01-30' },
      { id:'SH-1009', name:'Power Lift Trainer', brand:'Velocon', category:'Sport', price:1349000, discount:0, sizes:[40,41,42,43], colors:['#1A1A1D','#B5562D'], stock:6, rating:4.7, reviews:97, sold:230, img:'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&q=80', img2:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', desc:'Stabilitas maksimal untuk latihan beban dan cross-training intensif.', date:'2026-05-22' },
      { id:'SH-1010', name:'Derby Noir', brand:'Renwick', category:'Formal', price:1249000, discount:0, sizes:[39,40,41,42,43,44], colors:['#1A1A1D'], stock:0, rating:4.2, reviews:33, sold:75, img:'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&q=80', img2:'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&q=80', desc:'Derby shoe elegan berbahan kulit halus dengan finishing matte.', date:'2025-12-05' },
      { id:'SH-1011', name:'Featherlight Knit', brand:'Aurum', category:'Sneakers', price:949000, discount:12, sizes:[38,39,40,41,42], colors:['#E8E2D5','#6B7156'], stock:21, rating:4.4, reviews:59, sold:160, img:'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80', img2:'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80', desc:'Rajutan knit super ringan dengan ventilasi maksimal untuk kenyamanan tanpa batas.', date:'2026-06-01' },
      { id:'SH-1012', name:'Midnight Edition LE', brand:'Aurum', category:'Limited Edition', price:2899000, discount:0, sizes:[41,42,43], colors:['#1A1A1D','#C9A85C'], stock:2, rating:5.0, reviews:9, sold:21, img:'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&q=80', img2:'https://images.unsplash.com/photo-1597248881519-db089d3744a3?w=600&q=80', desc:'Kolaborasi eksklusif bernuansa gelap dengan detail emas, terbatas 200 pasang di dunia.', date:'2026-06-29' }
    ];
  },

  /* -------------------- STORAGE HELPERS -------------------- */
  getProducts(){
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

  /* -------------------- UI: DARK MODE -------------------- */
  initTheme(){
    const saved = localStorage.getItem(this.KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    document.querySelectorAll('.theme-toggle i').forEach(icon => {
      icon.className = saved === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
    });
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggleTheme());
    });
  },
  toggleTheme(){
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(this.KEYS.THEME, next);
    document.querySelectorAll('.theme-toggle i').forEach(icon => {
      icon.className = next === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
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

  /* -------------------- INIT EVERYTHING -------------------- */
  init(){
    this.getProducts(); // ensure seeded
    this.initNavbar();
    this.initTheme();
    this.initScrollTop();
    this.initNewsletter();
    this.updateCartBadge();
    this.updateWishlistBadge();
    this.initReveal();

    // Logout handler (shared across pages, simple demo only)
    document.querySelectorAll('.btn-logout').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem(this.KEYS.USER);
        this.showToast('Berhasil keluar', 'info');
        setTimeout(() => location.href = 'login.html', 800);
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => StepHaven.init());
