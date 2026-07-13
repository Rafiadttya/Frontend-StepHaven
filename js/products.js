/* =========================================================
   STEPHAVEN — products.js
   Handles:
   - Product card template (reused on home, products, detail pages)
   - Home page: new arrivals & popular product rails
   - Products page: search, filter, sort, pagination
   - Product detail page: gallery, sizes/colors, related items
   ========================================================= */

StepHaven.Products = {

  state: {
    search: '',
    category: 'all',
    sizes: [],
    minPrice: 0,
    maxPrice: 3000000,
    sort: 'newest',
    page: 1,
    perPage: 8
  },

  /* -------------------- PRODUCT CARD TEMPLATE -------------------- */
  cardTemplate(p){
    const finalPrice = p.discount > 0 ? Math.round(p.price * (1 - p.discount/100)) : p.price;
    const wishlist = StepHaven.getWishlist();
    const isFav = wishlist.includes(p.id);
    let stockBadge = '';
    if(p.stock === 0) stockBadge = '<span class="stock-pill out">Habis</span>';
    else if(p.stock <= 5) stockBadge = '<span class="stock-pill low">Stok Sedikit</span>';
    else stockBadge = '<span class="stock-pill in">Tersedia</span>';

    let cornerTag = '';
    if(p.category === 'Limited Edition' || p.subCategory === 'Exclusive Release')
      cornerTag = '<span class="tag-corner limited">Limited</span>';
    else if(p.discount > 0) cornerTag = `<span class="tag-corner sale">-${p.discount}%</span>`;

    return `
    <div class="col-6 col-md-4 col-lg-3 product-col" data-id="${p.id}">
      <div class="product-card reveal in">
        <div class="img-wrap">
          ${cornerTag}
          <button class="fav-btn ${isFav ? 'active' : ''}" data-fav="${p.id}" aria-label="Favorit">
            <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
          </button>
          <a href="detail.html?id=${p.id}"><img src="${p.img}" alt="${p.name}" loading="lazy"></a>
        </div>
        <div class="body">
          <span class="brand">${p.brand}</span>
          <h3 class="name"><a href="detail.html?id=${p.id}" class="text-reset">${p.name}</a></h3>
          <div class="stars">${StepHaven.renderStars(p.rating)} <span class="text-muted ms-1" style="font-size:0.78rem;">(${p.reviews})</span></div>
          <div class="price-row">
            <span class="price-now">${StepHaven.formatRupiah(finalPrice)}</span>
            ${p.discount > 0 ? `<span class="price-old">${StepHaven.formatRupiah(p.price)}</span>` : ''}
          </div>
          ${stockBadge}
          <div class="actions">
            <a href="detail.html?id=${p.id}" class="btn btn-outline-ink btn-sm">Detail</a>
            <button class="btn btn-leather btn-sm" data-addcart="${p.id}" ${p.stock===0?'disabled':''}>
              <i class="bi bi-bag-plus"></i> Keranjang
            </button>
          </div>
        </div>
      </div>
    </div>`;
  },

  bindCardEvents(container){
    container.querySelectorAll('[data-addcart]').forEach(btn => {
      btn.addEventListener('click', () => {
        StepHaven.addToCart(btn.dataset.addcart, 1);
      });
    });
    container.querySelectorAll('[data-fav]').forEach(btn => {
      btn.addEventListener('click', () => {
        StepHaven.toggleWishlist(btn.dataset.fav);
        const icon = btn.querySelector('i');
        btn.classList.toggle('active');
        icon.className = btn.classList.contains('active') ? 'bi bi-heart-fill' : 'bi bi-heart';
      });
    });
  },

  /* -------------------- HOME PAGE RAILS -------------------- */
  renderHomeRails(){
    const products = StepHaven.getProducts();

    /* NEW ARRIVALS — sorted by date descending, show latest 4 */
    const newest = document.getElementById('newArrivalsRail');
    if(newest){
      const sorted = [...products]
        .sort((a,b) => new Date(b.date) - new Date(a.date))
        .slice(0,4);
      newest.innerHTML = sorted.length
        ? sorted.map(p => this.cardTemplate(p)).join('')
        : '<div class="col-12 empty-state"><i class="bi bi-inbox"></i><p class="text-muted">Belum ada produk.</p></div>';
      this.bindCardEvents(newest);
    }

    /* BEST SELLER — only products explicitly marked bestSeller=true by admin */
    const popular = document.getElementById('popularRail');
    if(popular){
      const bestSellers = [...products]
        .filter(p => p.bestSeller === true)
        .sort((a,b) => b.sold - a.sold)
        .slice(0, 8); /* Allow up to 8 so carousel has cards to slide through */
      if(bestSellers.length === 0){
        popular.innerHTML = `
          <div class="col-12 empty-state">
            <i class="bi bi-star"></i>
            <p class="text-muted">Belum ada produk Best Seller.<br>
            <small>Admin dapat menandai produk sebagai Best Seller di halaman Inventory.</small></p>
          </div>`;
        /* Disable nav buttons when no products */
        const p = document.getElementById('bestsellerPrev');
        const n = document.getElementById('bestsellerNext');
        if(p) p.disabled = true;
        if(n) n.disabled = true;
      } else {
        popular.innerHTML = bestSellers.map(p => this.cardTemplate(p)).join('');
        this.bindCardEvents(popular);
        /* Init carousel AFTER cards are in the DOM */
        this.initBestSellerCarousel(bestSellers.length);
      }
    }

    /* Notify app.js that home rails are ready — so navbar search can attach */
    document.dispatchEvent(new CustomEvent('homeRailsReady'));
  },

  /* -------------------- BEST SELLER CAROUSEL -------------------- */
  initBestSellerCarousel(totalCards){
    const track   = document.getElementById('popularRail');
    const prevBtn = document.getElementById('bestsellerPrev');
    const nextBtn = document.getElementById('bestsellerNext');
    if(!track || !prevBtn || !nextBtn) return;

    /* Visible cards per viewport width */
    const perSlide = () => {
      if(window.innerWidth >= 992) return 4;
      if(window.innerWidth >= 768) return 3;
      return 2;
    };

    let currentStep = 0;

    const maxStep = () => Math.max(0, totalCards - perSlide());

    const update = () => {
      const cardWidthPct = 100 / perSlide();
      track.style.transform = `translateX(-${currentStep * cardWidthPct}%)`;
      prevBtn.disabled = currentStep <= 0;
      nextBtn.disabled = currentStep >= maxStep();
    };

    prevBtn.addEventListener('click', () => {
      if(currentStep > 0){ currentStep--; update(); }
    });
    nextBtn.addEventListener('click', () => {
      if(currentStep < maxStep()){ currentStep++; update(); }
    });

    /* Re-clamp on resize (debounced 150ms) */
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        currentStep = Math.min(currentStep, maxStep());
        update();
      }, 150);
    });

    update(); /* Set initial state */
  },

  /* -------------------- PRODUCTS PAGE -------------------- */
  initProductsPage(){
    const grid = document.getElementById('productGrid');
    if(!grid) return;

    // Read category from URL query if present (?category=Sneakers)
    const params = new URLSearchParams(location.search);
    if(params.get('category')) this.state.category = params.get('category');
    if(params.get('q')) this.state.search = params.get('q');

    const searchInput = document.getElementById('searchInput');
    if(searchInput){
      searchInput.value = this.state.search;
      searchInput.addEventListener('input', () => {
        this.state.search = searchInput.value.trim().toLowerCase();
        this.state.page = 1;
        this.renderProductsPage();
      });
    }

    document.querySelectorAll('[data-category-filter]').forEach(el => {
      el.addEventListener('change', () => {
        this.state.category = el.checked ? el.value : 'all';
        this.state.page = 1;
        this.renderProductsPage();
      });
      if(el.value === this.state.category) el.checked = true;
    });

    document.querySelectorAll('.size-box').forEach(box => {
      box.addEventListener('click', () => {
        const size = parseInt(box.dataset.size);
        const idx = this.state.sizes.indexOf(size);
        if(idx > -1){ this.state.sizes.splice(idx,1); box.classList.remove('active'); }
        else{ this.state.sizes.push(size); box.classList.add('active'); }
        this.state.page = 1;
        this.renderProductsPage();
      });
    });

    const priceRange = document.getElementById('priceRange');
    if(priceRange){
      priceRange.addEventListener('input', () => {
        this.state.maxPrice = parseInt(priceRange.value);
        document.getElementById('priceRangeLabel').textContent = StepHaven.formatRupiah(this.state.maxPrice);
        this.state.page = 1;
        this.renderProductsPage();
      });
    }

    const sortSelect = document.getElementById('sortSelect');
    if(sortSelect){
      sortSelect.addEventListener('change', () => {
        this.state.sort = sortSelect.value;
        this.renderProductsPage();
      });
    }

    const resetBtn = document.getElementById('resetFilters');
    if(resetBtn){
      resetBtn.addEventListener('click', () => {
        this.state = { search:'', category:'all', sizes:[], minPrice:0, maxPrice:3000000, sort:'newest', page:1, perPage:8 };
        document.querySelectorAll('.size-box').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('[data-category-filter]').forEach(el => el.checked = el.value === 'all');
        if(searchInput) searchInput.value = '';
        if(priceRange){ priceRange.value = 3000000; document.getElementById('priceRangeLabel').textContent = StepHaven.formatRupiah(3000000); }
        this.renderProductsPage();
      });
    }

    this.renderProductsPage();
  },

  getFilteredProducts(){
    let products = StepHaven.getProducts();

    if(this.state.search){
      products = products.filter(p =>
        p.name.toLowerCase().includes(this.state.search) ||
        p.brand.toLowerCase().includes(this.state.search) ||
        p.category.toLowerCase().includes(this.state.search)
      );
    }
    if(this.state.category && this.state.category !== 'all'){
      /* Match parent category OR subCategory so sub-filters work correctly */
      products = products.filter(p =>
        p.category === this.state.category ||
        (p.subCategory && p.subCategory === this.state.category)
      );
    }
    if(this.state.sizes.length){
      products = products.filter(p => p.sizes.some(s => this.state.sizes.includes(s)));
    }
    products = products.filter(p => {
      const finalPrice = p.discount > 0 ? Math.round(p.price * (1 - p.discount/100)) : p.price;
      return finalPrice <= this.state.maxPrice;
    });

    switch(this.state.sort){
      case 'price-asc':
        products.sort((a,b) => (a.price*(1-a.discount/100)) - (b.price*(1-b.discount/100))); break;
      case 'price-desc':
        products.sort((a,b) => (b.price*(1-b.discount/100)) - (a.price*(1-a.discount/100))); break;
      case 'newest':
        products.sort((a,b) => new Date(b.date) - new Date(a.date)); break;
      case 'bestseller':
        products.sort((a,b) => b.sold - a.sold); break;
    }
    return products;
  },

  renderProductsPage(){
    const grid = document.getElementById('productGrid');
    const countLabel = document.getElementById('resultCount');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');

    const filtered = this.getFilteredProducts();
    if(countLabel) countLabel.textContent = `${filtered.length} produk ditemukan`;

    if(filtered.length === 0){
      grid.innerHTML = '';
      if(emptyState) emptyState.classList.remove('d-none');
      if(pagination) pagination.innerHTML = '';
      return;
    }
    if(emptyState) emptyState.classList.add('d-none');

    const totalPages = Math.ceil(filtered.length / this.state.perPage);
    if(this.state.page > totalPages) this.state.page = totalPages;
    const start = (this.state.page - 1) * this.state.perPage;
    const pageItems = filtered.slice(start, start + this.state.perPage);

    grid.innerHTML = pageItems.map(p => this.cardTemplate(p)).join('');
    this.bindCardEvents(grid);

    if(pagination){
      let html = '';
      html += `<li class="page-item ${this.state.page===1?'disabled':''}"><a class="page-link" href="#" data-page="${this.state.page-1}">&laquo;</a></li>`;
      for(let i=1;i<=totalPages;i++){
        html += `<li class="page-item ${i===this.state.page?'active':''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
      }
      html += `<li class="page-item ${this.state.page===totalPages?'disabled':''}"><a class="page-link" href="#" data-page="${this.state.page+1}">&raquo;</a></li>`;
      pagination.innerHTML = html;
      pagination.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const page = parseInt(link.dataset.page);
          if(page >= 1 && page <= totalPages){
            this.state.page = page;
            this.renderProductsPage();
            window.scrollTo({ top: document.getElementById('productGrid').offsetTop - 120, behavior:'smooth' });
          }
        });
      });
    }
  },

  /* -------------------- DETAIL PAGE -------------------- */
  initDetailPage(){
    const wrap = document.getElementById('detailWrap');
    if(!wrap) return;

    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const product = StepHaven.getProductById(id);

    if(!product){
      wrap.innerHTML = '<div class="empty-state"><i class="bi bi-emoji-frown"></i><h4>Produk tidak ditemukan</h4><a href="products.html" class="btn btn-leather mt-3">Kembali Belanja</a></div>';
      return;
    }

    StepHaven.pushRecentlyViewed(product.id);

    const finalPrice = product.discount > 0 ? Math.round(product.price * (1 - product.discount/100)) : product.price;
    document.title = `${product.name} — StepHaven`;

    document.getElementById('detailBrand').textContent = product.brand;
    document.getElementById('detailName').textContent = product.name;
    document.getElementById('detailStars').innerHTML = StepHaven.renderStars(product.rating) + ` <span class="text-muted ms-1">(${product.reviews} ulasan · terjual ${product.sold})</span>`;
    document.getElementById('detailPriceNow').textContent = StepHaven.formatRupiah(finalPrice);
    const oldPriceEl = document.getElementById('detailPriceOld');
    if(product.discount > 0){
      oldPriceEl.textContent = StepHaven.formatRupiah(product.price);
      oldPriceEl.classList.remove('d-none');
      document.getElementById('detailDiscountBadge').textContent = `Hemat ${product.discount}%`;
      document.getElementById('detailDiscountBadge').classList.remove('d-none');
    }
    document.getElementById('detailDesc').textContent = product.desc;
    document.getElementById('mainImage').src = product.img;

    // Gallery thumbnails — use new images[] array if available, fallback to img/img2
    const thumbs = document.getElementById('galleryThumbs');
    let images = [];
    if(product.images && product.images.length){
      images = product.images.filter(Boolean);
    } else {
      images = [product.img, product.img2].filter(Boolean);
    }
    // Deduplicate
    images = [...new Set(images)];

    thumbs.innerHTML = images.map((img, i) => `
      <div class="gallery-thumb ${i===0?'active':''}" data-img="${img}">
        <img src="${img}" alt="thumbnail ${i+1}">
      </div>`).join('');
    thumbs.querySelectorAll('.gallery-thumb').forEach(t => {
      t.addEventListener('click', () => {
        document.getElementById('mainImage').src = t.dataset.img;
        thumbs.querySelectorAll('.gallery-thumb').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
      });
    });

    // Sizes
    const sizeWrap = document.getElementById('sizeOptions');
    let selectedSize = product.sizes[0];
    sizeWrap.innerHTML = product.sizes.map((s,i) => `<span class="size-box ${i===0?'active':''}" data-size="${s}">${s}</span>`).join('');
    sizeWrap.querySelectorAll('.size-box').forEach(box => {
      box.addEventListener('click', () => {
        sizeWrap.querySelectorAll('.size-box').forEach(b => b.classList.remove('active'));
        box.classList.add('active');
        selectedSize = parseInt(box.dataset.size);
      });
    });

    // Colors
    const colorWrap = document.getElementById('colorOptions');
    let selectedColor = product.colors[0];
    /* Render dots WITHOUT inline border — let CSS .active class control it.
       The previous inline style="border:..." was overriding the .active CSS rule,
       which caused the active indicator to never visually move. */
    colorWrap.innerHTML = product.colors.map((c,i) => `
      <span class="color-dot ${i===0?'active':''}"
            data-color="${c}"
            style="background:${c};"
            title="${c}"></span>`).join('');
    colorWrap.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        /* Remove active from all, add to clicked */
        colorWrap.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        selectedColor = dot.dataset.color;
      });
    });

    // Stock status
    const stockEl = document.getElementById('detailStock');
    if(product.stock === 0) stockEl.innerHTML = '<span class="stock-pill out">Stok Habis</span>';
    else if(product.stock <= 5) stockEl.innerHTML = `<span class="stock-pill low">Tersisa ${product.stock}</span>`;
    else stockEl.innerHTML = `<span class="stock-pill in">Stok Tersedia (${product.stock})</span>`;

    // Quantity selector
    let qty = 1;
    const qtyInput = document.getElementById('qtyInput');
    document.getElementById('qtyMinus').addEventListener('click', () => { if(qty>1){ qty--; qtyInput.value = qty; } });
    document.getElementById('qtyPlus').addEventListener('click', () => { if(qty<product.stock){ qty++; qtyInput.value = qty; } });

    // Add to cart / buy now
    document.getElementById('addToCartBtn').addEventListener('click', () => {
      StepHaven.addToCart(product.id, qty, selectedSize, selectedColor);
    });
    document.getElementById('buyNowBtn').addEventListener('click', () => {
      StepHaven.addToCart(product.id, qty, selectedSize, selectedColor);
      location.href = 'cart.html';
    });

    // Favorite button
    const favBtn = document.getElementById('detailFavBtn');
    const isFav = StepHaven.getWishlist().includes(product.id);
    favBtn.classList.toggle('active', isFav);
    favBtn.innerHTML = `<i class="bi ${isFav?'bi-heart-fill':'bi-heart'}"></i> Favorit`;
    favBtn.addEventListener('click', () => {
      StepHaven.toggleWishlist(product.id);
      const nowFav = favBtn.classList.toggle('active');
      favBtn.innerHTML = `<i class="bi ${nowFav?'bi-heart-fill':'bi-heart'}"></i> Favorit`;
    });

    if(product.stock === 0){
      document.getElementById('addToCartBtn').disabled = true;
      document.getElementById('buyNowBtn').disabled = true;
    }

    // Related products (same category, exclude self)
    const related = StepHaven.getProducts().filter(p => p.category === product.category && p.id !== product.id).slice(0,4);
    const relatedWrap = document.getElementById('relatedProducts');
    if(relatedWrap){
      relatedWrap.innerHTML = related.map(p => this.cardTemplate(p)).join('');
      this.bindCardEvents(relatedWrap);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  StepHaven.Products.renderHomeRails();
  StepHaven.Products.initProductsPage();
  StepHaven.Products.initDetailPage();
});
