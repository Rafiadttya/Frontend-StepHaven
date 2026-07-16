/* =========================================================
   STEPHAVEN — cart.js
   Handles the shopping cart page:
   - Render cart items from localStorage
   - Update quantity / remove item
   - Calculate subtotal, tax, shipping, total
   - Promo code field
   ========================================================= */

StepHaven.Cart = {

  TAX_RATE: 0.08,      // 8% pajak
  SHIPPING_FLAT: 25000, // ongkir flat
  promoDiscount: 0,

  init(){
    const wrap = document.getElementById('cartItemsWrap');
    if(!wrap) return;
    this.render();

    const promoBtn = document.getElementById('applyPromoBtn');
    if(promoBtn){
      promoBtn.addEventListener('click', () => {
        const code = document.getElementById('promoInput').value.trim().toUpperCase();
        if(code === 'STEPHAVEN10'){
          this.promoDiscount = 0.10;
          StepHaven.showToast('Kode promo berhasil diterapkan (-10%)', 'success');
        }else{
          this.promoDiscount = 0;
          StepHaven.showToast('Kode promo tidak valid', 'danger');
        }
        this.render();
      });
    }
  },

  render(){
    const wrap = document.getElementById('cartItemsWrap');
    const cart = StepHaven.getCart();
    const emptyState = document.getElementById('cartEmptyState');
    const summaryWrap = document.getElementById('cartSummaryWrap');

    if(cart.length === 0){
      wrap.innerHTML = '';
      if(emptyState) emptyState.classList.remove('d-none');
      if(summaryWrap) summaryWrap.classList.add('d-none');
      return;
    }
    if(emptyState) emptyState.classList.add('d-none');
    if(summaryWrap) summaryWrap.classList.remove('d-none');

    let subtotal = 0;
    wrap.innerHTML = cart.map((item, index) => {
      const product = StepHaven.getProductById(item.id);
      if(!product) return '';
      const finalPrice = product.discount > 0 ? Math.round(product.price * (1 - product.discount/100)) : product.price;
      const lineTotal = finalPrice * item.qty;
      subtotal += lineTotal;
      return `
      <div class="cart-item" data-index="${index}">
        <img src="${product.img}" alt="${product.name}">
        <div class="flex-grow-1">
          <h6 class="mb-1">${product.name}</h6>
          <div class="text-muted small mb-1">${product.brand} ${item.size ? '· Size ' + item.size : ''} ${item.color ? '· <span class="d-inline-block" style=\"width:10px;height:10px;border-radius:50%;background:'+item.color+'\"></span>' : ''}</div>
          <div class="fw-semibold font-mono">${StepHaven.formatRupiah(finalPrice)}</div>
        </div>
        <div class="qty-control">
          <button data-decrease="${index}" aria-label="Kurangi">-</button>
          <input type="text" readonly value="${item.qty}">
          <button data-increase="${index}" aria-label="Tambah">+</button>
        </div>
        <div class="text-end" style="min-width:120px;">
          <div class="fw-bold font-mono">${StepHaven.formatRupiah(lineTotal)}</div>
          <button class="btn btn-sm btn-link text-danger p-0 mt-1" data-remove="${index}"><i class="bi bi-trash3"></i> Hapus</button>
        </div>
      </div>`;
    }).join('');

    // Bind quantity & remove
    wrap.querySelectorAll('[data-increase]').forEach(btn => {
      btn.addEventListener('click', () => this.changeQty(parseInt(btn.dataset.increase), 1));
    });
    wrap.querySelectorAll('[data-decrease]').forEach(btn => {
      btn.addEventListener('click', () => this.changeQty(parseInt(btn.dataset.decrease), -1));
    });
    wrap.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        StepHaven.removeFromCart(parseInt(btn.dataset.remove));
        StepHaven.showToast('Produk dihapus dari keranjang', 'info');
        this.render();
      });
    });

    this.renderSummary(subtotal);
  },

  changeQty(index, delta){
    const cart = StepHaven.getCart();
    const item = cart[index];
    if(!item) return;
    const product = StepHaven.getProductById(item.id);
    const newQty = item.qty + delta;
    if(newQty < 1) return;
    if(product && newQty > product.stock){
      StepHaven.showToast('Jumlah melebihi stok tersedia', 'warning');
      return;
    }
    item.qty = newQty;
    StepHaven.saveCart(cart);
    this.render();
  },

  renderSummary(subtotal){
    const discountAmount = subtotal * this.promoDiscount;
    const afterDiscount = subtotal - discountAmount;
    const tax = Math.round(afterDiscount * this.TAX_RATE);
    const shipping = subtotal > 0 ? this.SHIPPING_FLAT : 0;
    const total = afterDiscount + tax + shipping;

    document.getElementById('sumSubtotal').textContent = StepHaven.formatRupiah(subtotal);
    document.getElementById('sumTax').textContent = StepHaven.formatRupiah(tax);
    document.getElementById('sumShipping').textContent = StepHaven.formatRupiah(shipping);
    document.getElementById('sumTotal').textContent = StepHaven.formatRupiah(total);

    const discountRow = document.getElementById('sumDiscountRow');
    if(discountRow){
      if(this.promoDiscount > 0){
        discountRow.classList.remove('d-none');
        document.getElementById('sumDiscount').textContent = '-' + StepHaven.formatRupiah(discountAmount);
      }else{
        discountRow.classList.add('d-none');
      }
    }

    // Persist total for checkout page to read
    sessionStorage.setItem('sh_checkout_total', total);
  }
};

document.addEventListener('stephavenReady', () => StepHaven.Cart.init());
