/* =========================================================
   STEPHAVEN — wishlist.js
Menangani halaman Wishlist:
    - Menampilkan setiap produk yang tersimpan di wishlist (localStorage)
    - "Pindahkan ke keranjang" -> tambahkan ke keranjang + hapus dari wishlist
    - "Hapus dari wishlist" -> hapus satu item
    - Tampilan saat wishlist kosong (tidak ada item)
   ========================================================= */

StepHaven.Wishlist = {

  init(){
    const wrap = document.getElementById('wishlistGrid');
    if(!wrap) return;
    this.render();
  },

  render(){
    const wrap = document.getElementById('wishlistGrid');
    const emptyState = document.getElementById('wishlistEmptyState');
    const countLabel = document.getElementById('wishlistCount');

    const wishlistIds = StepHaven.getWishlist();
    const products = wishlistIds
      .map(id => StepHaven.getProductById(id))
      .filter(Boolean); // skip ids that may no longer exist in inventory

    if(countLabel) countLabel.textContent = `${products.length} produk favorit`;

    if(products.length === 0){
      wrap.innerHTML = '';
      if(emptyState) emptyState.classList.remove('d-none');
      return;
    }
    if(emptyState) emptyState.classList.add('d-none');

    wrap.innerHTML = products.map(p => this.cardTemplate(p)).join('');
    this.bindEvents(wrap);
  },

  cardTemplate(p){
    const finalPrice = p.discount > 0 ? Math.round(p.price * (1 - p.discount/100)) : p.price;
    let stockBadge = '';
    if(p.stock === 0) stockBadge = '<span class="stock-pill out">Habis</span>';
    else if(p.stock <= 5) stockBadge = '<span class="stock-pill low">Stok Sedikit</span>';
    else stockBadge = `<span class="stock-pill in">Stok ${p.stock}</span>`;

    return `
    <div class="col-12" data-wishlist-row="${p.id}">
      <div class="cart-item">
        <img src="${p.img}" alt="${p.name}">
        <div class="flex-grow-1">
          <span class="brand d-block">${p.brand}</span>
          <h6 class="mb-1"><a href="detail.html?id=${p.id}" class="text-reset">${p.name}</a></h6>
          <div class="stars mb-1">${StepHaven.renderStars(p.rating)} <span class="text-muted ms-1" style="font-size:0.78rem;">(${p.reviews})</span></div>
          ${stockBadge}
        </div>
        <div class="text-end" style="min-width:140px;">
          <div class="fw-bold font-mono mb-2">${StepHaven.formatRupiah(finalPrice)}</div>
          <div class="d-flex gap-2 justify-content-end flex-wrap">
            <button class="btn btn-leather btn-sm" data-move-cart="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>
              <i class="bi bi-bag-plus"></i> Ke Keranjang
            </button>
            <button class="btn btn-outline-ink btn-sm" data-remove-wishlist="${p.id}">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      </div>
    </div>`;
  },

  bindEvents(wrap){
    wrap.querySelectorAll('[data-move-cart]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.moveCart;
        StepHaven.addToCart(id, 1);
        StepHaven.toggleWishlist(id); // removes it since it's already in wishlist
        this.render();
      });
    });
    wrap.querySelectorAll('[data-remove-wishlist]').forEach(btn => {
      btn.addEventListener('click', () => {
        StepHaven.toggleWishlist(btn.dataset.removeWishlist);
        this.render();
      });
    });
  }
};

document.addEventListener('stephavenReady', () => StepHaven.Wishlist.init());
