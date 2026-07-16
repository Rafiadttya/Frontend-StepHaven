/* =========================================================
   STEPHAVEN — orders.js
   =========================================================
   STATUS FLOW (4 stages, Tiba = pesanan diterima):
     0 Pembayaran Berhasil → after  20 s → 1
     1 Dikemas             → after  50 s → 2
     2 Dikirim             → after 120 s → 3
     3 Tiba                (final active — moves to Riwayat, unlock review)
   ========================================================= */

StepHaven.Orders = {

  STATUS_LABELS: [
    { label: 'Pembayaran Berhasil', icon: 'bi-check-circle-fill', color: '#4C7A4C' },
    { label: 'Dikemas',             icon: 'bi-box-seam',          color: '#1565C0' },
    { label: 'Dikirim',             icon: 'bi-truck',             color: '#6B7156' },
    { label: 'Tiba',                icon: 'bi-house-check',       color: '#B5562D' }
  ],

  /* ms until auto-advance FROM each status index (0→1, 1→2, 2→3) */
  STATUS_DURATIONS: [20000, 30000, 70000],  /* 20 s, 50 s total, 2 m total */

  KEY_ORDERS:  'sh_orders',
  KEY_REVIEWS: 'sh_reviews',

  /* =========================================================
     ORDER CRUD
  ========================================================= */
  getOrders(){
    return JSON.parse(localStorage.getItem(this.KEY_ORDERS) || '[]');
  },
  saveOrders(orders){
    localStorage.setItem(this.KEY_ORDERS, JSON.stringify(orders));
  },

  /**
   * Create a new order from the current cart + checkout form data.
   * Called by checkout.html on form submit.
   */
  createOrder({ invNumber, customerName, email, address, payment, total, items }){
    const orders = this.getOrders();
    const order = {
      invNumber,
      customerName,
      email,
      address,
      payment,
      total,
      items,            /* [{ id, name, brand, qty, size, color, price, img }] */
      status: 0,        /* Start at "Pembayaran Berhasil" — payment confirmed at checkout */
      createdAt: new Date().toISOString(),
      statusHistory: [{ status: 0, at: new Date().toISOString() }],
      reviewed: false
    };
    orders.unshift(order);  /* newest first */
    this.saveOrders(orders);
    return order;
  },

  /* =========================================================
     STATUS SIMULATION
     On every page load, call advanceAllStatuses() to catch up
     any orders whose time threshold has passed.
  ========================================================= */
  advanceAllStatuses(){
    const orders  = this.getOrders();
    const now     = Date.now();
    let changed   = false;

    orders.forEach(order => {
      /* Status 3 (Tiba) is the final active status — no further advancement */
      if(order.status >= 3) return;

      const elapsed = now - new Date(order.createdAt).getTime();
      let threshold = 0;
      for(let s = 0; s < this.STATUS_DURATIONS.length; s++){
        threshold += this.STATUS_DURATIONS[s];
        if(elapsed >= threshold && order.status <= s){
          const newStatus = s + 1;
          if(order.status < newStatus){
            order.status = newStatus;
            order.statusHistory.push({ status: newStatus, at: new Date().toISOString() });
            changed = true;
          }
        }
      }
    });

    if(changed) this.saveOrders(orders);
    return orders;
  },

  /**
   * Schedule a live timer that advances statuses in the current
   * browser session (so the user can watch status change without refresh).
   * Should be called on profile.html after orders are rendered.
   */
  startStatusTimer(onTick){
    /* Check every 5 seconds */
    return setInterval(() => {
      const updated = this.advanceAllStatuses();
      if(onTick) onTick(updated);
    }, 5000);
  },

  /* =========================================================
     STOCK DEDUCTION
  ========================================================= */
  /**
   * Deduct stock for each item in `items` array.
   * items: [{ id, qty }]
   * Never allows stock to go below 0.
   */
  async deductStock(items){
    const products = StepHaven.getProducts();
    let changed = false;

    items.forEach(item => {
      const prod = products.find(p => p.id === item.id);
      if(prod){
        prod.stock = Math.max(0, prod.stock - item.qty);
        prod.sold  = (prod.sold || 0) + item.qty;
        changed = true;
      }
    });

    if(changed){
      try { await StepHaven.saveProducts(products); }
      catch(err){ console.error('[Orders] deductStock save failed:', err); }
    }
  },

  /* =========================================================
     REVIEWS
  ========================================================= */
  getReviews(){
    return JSON.parse(localStorage.getItem(this.KEY_REVIEWS) || '[]');
  },
  saveReviews(reviews){
    localStorage.setItem(this.KEY_REVIEWS, JSON.stringify(reviews));
  },

  /**
   * Get all reviews for a specific product, newest first.
   */
  getProductReviews(productId){
    return this.getReviews()
      .filter(r => r.productId === productId)
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Add a new review.
   * Marks the corresponding order as reviewed.
   */
  addReview({ productId, orderId, rating, name, comment }){
    const reviews = this.getReviews();

    /* Prevent duplicate review for same order */
    if(reviews.some(r => r.orderId === orderId)){
      StepHaven.showToast('Kamu sudah memberikan ulasan untuk pesanan ini.', 'warning');
      return false;
    }

    reviews.unshift({
      id:        Date.now().toString(),
      productId,
      orderId,
      rating:    parseInt(rating),
      name:      name.trim() || 'Anonim',
      comment:   comment.trim(),
      createdAt: new Date().toISOString()
    });
    this.saveReviews(reviews);

    /* Mark order as reviewed */
    const orders = this.getOrders();
    const order  = orders.find(o => o.invNumber === orderId);
    if(order){ order.reviewed = true; this.saveOrders(orders); }

    /* Recalculate and persist product rating */
    this.recalcProductRating(productId);

    StepHaven.showToast('Ulasan berhasil dikirim. Terima kasih!', 'success');
    return true;
  },

  /**
   * Recalculate and save average rating for a product
   * based on all reviews in LocalStorage.
   */
  async recalcProductRating(productId){
    const productReviews = this.getProductReviews(productId);
    if(!productReviews.length) return;

    const avg = productReviews.reduce((s,r) => s + r.rating, 0) / productReviews.length;
    const products = StepHaven.getProducts();
    const prod = products.find(p => p.id === productId);
    if(prod){
      prod.rating  = Math.round(avg * 10) / 10;
      prod.reviews = productReviews.length;
      try { await StepHaven.saveProducts(products); }
      catch(err){ console.error('[Orders] recalcRating save failed:', err); }
    }
  },

  /* =========================================================
     UI HELPERS
  ========================================================= */

  /**
   * Render a Bootstrap-style progress step timeline for an order's status.
   * Returns HTML string.
   */
  renderStatusTimeline(order){
    return `
    <div class="order-status-timeline mt-3">
      ${this.STATUS_LABELS.map((s, i) => {
        const done    = i <  order.status;
        const current = i === order.status;
        const pending = i >  order.status;
        const histEntry = order.statusHistory && order.statusHistory.find(h => h.status === i);
        const timeStr   = histEntry
          ? new Date(histEntry.at).toLocaleString('id-ID',{ day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
          : '';
        return `
        <div class="ost-step ${done?'done':''} ${current?'current':''} ${pending?'pending':''}">
          <div class="ost-icon-wrap">
            <div class="ost-icon">
              ${done    ? '<i class="bi bi-check-lg"></i>'   : ''}
              ${current ? `<i class="${s.icon}"></i>`        : ''}
              ${pending ? `<i class="${s.icon}"></i>`        : ''}
            </div>
            ${i < this.STATUS_LABELS.length - 1 ? '<div class="ost-line"></div>' : ''}
          </div>
          <div class="ost-label-wrap">
            <div class="ost-label">${s.label}</div>
            ${timeStr ? `<div class="ost-time">${timeStr}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  },

  /**
   * Render star icons for a numeric rating (0–5, supports .5).
   * Reuses StepHaven.renderStars if available.
   */
  renderStars(rating){
    return StepHaven.renderStars ? StepHaven.renderStars(rating)
      : '★'.repeat(Math.round(rating));
  },

  /**
   * Build the review form modal HTML.
   * orderId & productId are embedded as data attributes.
   */
  reviewModalHTML(order, productId, productName){
    return `
    <div class="modal fade" id="reviewModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="bi bi-star me-2"></i>Beri Ulasan</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small mb-3">Produk: <strong>${productName}</strong></p>
            <form id="reviewForm" novalidate>
              <!-- Star rating picker -->
              <div class="mb-3">
                <label class="form-label fw-semibold">Rating</label>
                <div class="star-picker d-flex gap-2" id="starPicker">
                  ${[1,2,3,4,5].map(n => `
                    <button type="button" class="star-btn" data-val="${n}" aria-label="${n} bintang">
                      <i class="bi bi-star"></i>
                    </button>`).join('')}
                </div>
                <input type="hidden" name="rating" id="reviewRating" value="0" required>
                <div class="invalid-feedback d-block d-none" id="ratingError">Pilih rating 1–5 bintang.</div>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Nama Kamu</label>
                <input type="text" class="form-control" name="name" required minlength="2"
                       placeholder="Nama yang akan ditampilkan">
                <div class="invalid-feedback">Nama minimal 2 karakter.</div>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Komentar</label>
                <textarea class="form-control" name="comment" rows="3" required minlength="5"
                          placeholder="Bagikan pengalamanmu..."></textarea>
                <div class="invalid-feedback">Komentar minimal 5 karakter.</div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-ink" data-bs-dismiss="modal">Batal</button>
            <button type="button" class="btn btn-leather" id="submitReviewBtn"
                    data-order="${order.invNumber}"
                    data-product="${productId}">
              Kirim Ulasan
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }
};
