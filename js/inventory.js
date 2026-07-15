/* =========================================================
   STEPHAVEN — inventory.js
   Admin inventory dashboard:
   - Summary cards
   - Table with search + category filter (now shows color badges)
   - Add / Edit / Delete product
   - Supports up to 3 product images (img1/img2/img3)
   - Color picker: preset colors + custom color via <input type="color">
   - All data backed by localStorage
   ========================================================= */

StepHaven.Inventory = {

  state: { search: '', category: 'all' },
  editingId: null,
  customColors: [], // holds hex values added via custom color picker in current modal session

  /* ---- known preset hex values (match HTML chips) ---- */
  PRESET_COLORS: {
    '#1A1A1D': 'Hitam', '#FFFFFF': 'Putih', '#9E9E9E': 'Abu-abu',
    '#D32F2F': 'Merah', '#1565C0': 'Biru',  '#2E7D32': 'Hijau',
    '#B5562D': 'Coklat','#F7F5F2': 'Cream', '#003A70': 'Navy'
  },

  init(){
    const table = document.getElementById('inventoryTableBody');
    if(!table) return;

    this.renderSummary();
    this.render();

    document.getElementById('invSearch').addEventListener('input', (e) => {
      this.state.search = e.target.value.trim().toLowerCase();
      this.render();
    });
    document.getElementById('invCategoryFilter').addEventListener('change', (e) => {
      this.state.category = e.target.value;
      this.render();
    });

    document.getElementById('addProductBtn').addEventListener('click', () => this.openModal());
    document.getElementById('productForm').addEventListener('submit', (e) => this.handleSubmit(e));

    /* ---- Image file upload: wire each slot (1, 2, 3) ---- */
    this._imageBase64 = ['', '', ''];   /* holds Base64 for each slot */

    [1, 2, 3].forEach(slot => {
      const fileInput   = document.getElementById(`imgFile${slot}`);
      const previewImg  = document.getElementById(`imgPreviewImg${slot}`);
      const placeholder = document.getElementById(`imgPlaceholder${slot}`);
      const errEl       = document.getElementById(`imgError${slot}`);
      const chooseBtn   = document.querySelector(`.img-choose-btn[data-slot="${slot}"]`);
      const clearBtn    = document.querySelector(`.img-clear-btn[data-slot="${slot}"]`);

      if(!fileInput) return;

      /* Button → open file picker */
      chooseBtn.addEventListener('click', () => fileInput.click());

      /* File selected → validate + read as Base64 */
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        errEl.classList.add('d-none');
        if(!file){ this._clearImgSlot(slot); return; }

        const allowed = ['image/jpeg','image/jpg','image/png','image/webp'];
        if(!allowed.includes(file.type)){
          errEl.textContent = 'Format tidak didukung (JPG, JPEG, PNG, WEBP).';
          errEl.classList.remove('d-none'); return;
        }
        if(file.size > 2 * 1024 * 1024){
          errEl.textContent = 'Ukuran file melebihi 2 MB.';
          errEl.classList.remove('d-none'); return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          this._imageBase64[slot - 1] = e.target.result;
          previewImg.src           = e.target.result;
          previewImg.style.display = 'block';
          placeholder.style.display= 'none';
          clearBtn.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
      });

      /* Clear button */
      clearBtn.addEventListener('click', () => this._clearImgSlot(slot));
    });

    /* ---- Custom color picker preview + add button ---- */
    const colorPicker = document.getElementById('customColorPicker');
    const colorPreview = document.getElementById('customColorPreview');
    if(colorPicker && colorPreview){
      colorPicker.addEventListener('input', () => {
        colorPreview.style.background = colorPicker.value;
      });
    }
    const addCustomBtn = document.getElementById('addCustomColorBtn');
    if(addCustomBtn){
      addCustomBtn.addEventListener('click', () => {
        const hex = colorPicker.value;
        if(!this.customColors.includes(hex)){
          this.customColors.push(hex);
          this.renderCustomColorChips();
        } else {
          StepHaven.showToast('Warna ini sudah ditambahkan', 'warning');
        }
      });
    }
  },

  /* ---- Render the removable chips for custom-added colors ---- */
  renderCustomColorChips(){
    const wrap = document.getElementById('customColorChips');
    if(!wrap) return;
    wrap.innerHTML = this.customColors.map((hex, i) => `
      <span class="custom-color-chip">
        <span class="color-dot-chip" style="background:${hex};width:16px;height:16px;border-radius:50%;display:inline-block;border:1px solid #ccc;"></span>
        <span class="font-mono" style="font-size:0.75rem;">${hex}</span>
        <button type="button" data-remove-custom="${i}" title="Hapus"><i class="bi bi-x"></i></button>
      </span>`).join('');
    wrap.querySelectorAll('[data-remove-custom]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.customColors.splice(parseInt(btn.dataset.removeCustom), 1);
        this.renderCustomColorChips();
      });
    });
  },

  /* ---- Collect all selected colors from modal ---- */
  collectColors(form){
    const presets = [...form.querySelectorAll('input[name="colorPresets"]:checked')].map(el => el.value);
    return [...new Set([...presets, ...this.customColors])];
  },

  /* ---- Clear a single image slot ---- */
  _clearImgSlot(slot){
    this._imageBase64[slot - 1] = '';
    const previewImg  = document.getElementById(`imgPreviewImg${slot}`);
    const placeholder = document.getElementById(`imgPlaceholder${slot}`);
    const clearBtn    = document.querySelector(`.img-clear-btn[data-slot="${slot}"]`);
    const fileInput   = document.getElementById(`imgFile${slot}`);
    if(previewImg)  { previewImg.src = ''; previewImg.style.display = 'none'; }
    if(placeholder)   placeholder.style.display = '';
    if(clearBtn)      clearBtn.classList.add('d-none');
    if(fileInput)     fileInput.value = '';
  },

  /* ---- Summary cards ---- */
  renderSummary(){
    const products = StepHaven.getProducts();
    document.getElementById('sumTotalStock').textContent    = products.reduce((s,p) => s + p.stock, 0);
    document.getElementById('sumTotalProducts').textContent = products.length;
    document.getElementById('sumOutOfStock').textContent    = products.filter(p => p.stock === 0).length;
    const best = [...products].sort((a,b) => b.sold - a.sold)[0];
    document.getElementById('sumBestseller').textContent    = best ? best.name : '-';
  },

  getFiltered(){
    let products = StepHaven.getProducts();
    if(this.state.search){
      products = products.filter(p =>
        p.name.toLowerCase().includes(this.state.search) ||
        p.id.toLowerCase().includes(this.state.search) ||
        p.brand.toLowerCase().includes(this.state.search)
      );
    }
    if(this.state.category !== 'all'){
      products = products.filter(p =>
        p.category === this.state.category ||
        (p.subCategory && p.subCategory === this.state.category)
      );
    }
    return products;
  },

  /* ---- Render table rows ---- */
  render(){
    const tbody = document.getElementById('inventoryTableBody');
    const products = this.getFiltered();

    if(products.length === 0){
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-muted">
        <i class="bi bi-inbox d-block mb-2" style="font-size:2rem;"></i>Tidak ada produk ditemukan</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      let badge = p.stock === 0
        ? '<span class="badge" style="background:#B33A3A">Habis</span>'
        : (p.stock <= 5 ? '<span class="badge" style="background:#C9A85C;color:#1A1A1D">Menipis</span>' : '<span class="badge" style="background:#4C7A4C">Tersedia</span>');

      // Show up to 3 color dots for the product
      const colorDots = (p.colors || []).slice(0,3).map(hex =>
        `<span title="${hex}" style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${hex};border:1.5px solid rgba(0,0,0,0.15);margin-right:3px;"></span>`
      ).join('');

      // Show first image; fall back to img array if available
      const thumbSrc = (p.images && p.images[0]) ? p.images[0] : (p.img || '');

      return `
      <tr>
        <td><img src="${thumbSrc}" alt="${p.name}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;"></td>
        <td class="font-mono small">${p.id}</td>
        <td>${p.name}</td>
        <td>${p.brand}</td>
        <td><span class="small">${p.subCategory || p.category}</span></td>
        <td class="font-mono">${StepHaven.formatRupiah(p.price)}</td>
        <td>${colorDots || '<span class="text-muted small">-</span>'}</td>
        <td>${p.stock}</td>
        <td>${badge}</td>
        <td>
          <button class="btn btn-sm btn-outline-ink me-1" data-edit="${p.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-delete="${p.id}"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this.openModal(btn.dataset.edit));
    });
    tbody.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => this.deleteProduct(btn.dataset.delete));
    });
  },

  /* ---- Open Add / Edit modal ---- */
  openModal(productId = null){
    this.editingId   = productId;
    this.customColors = [];
    const form       = document.getElementById('productForm');
    form.reset();
    // Reset custom color chips
    const chipsWrap = document.getElementById('customColorChips');
    /* Reset image upload slots and Base64 store */
    this._imageBase64 = ['', '', ''];
    [1, 2, 3].forEach(s => this._clearImgSlot(s));
    // Reset Best Seller toggle
    const bsCheck = form.querySelector('[name="bestSeller"]');
    if(bsCheck) bsCheck.checked = false;
    // Uncheck all preset checkboxes
    form.querySelectorAll('input[name="colorPresets"]').forEach(cb => cb.checked = false);

    const modalTitle = document.getElementById('productModalLabel');

    if(productId){
      const p = StepHaven.getProductById(productId);
      if(!p) return;
      modalTitle.textContent = 'Edit Produk';

      form.elements['name'].value     = p.name;
      form.elements['brand'].value    = p.brand;
      form.elements['category'].value = p.subCategory || p.category;
      form.elements['price'].value    = p.price;
      form.elements['discount'].value = p.discount;
      form.elements['stock'].value    = p.stock;
      form.elements['sizes'].value    = p.sizes.join(',');
      form.elements['desc'].value     = p.desc;
      // Restore Best Seller toggle
      const bsCheck = form.querySelector('[name="bestSeller"]');
      if(bsCheck) bsCheck.checked = !!p.bestSeller;

      // Restore up to 3 existing images into upload slot previews
      const imgs = p.images || [p.img, p.img2].filter(Boolean);
      [1, 2, 3].forEach((slot, i) => {
        const val = imgs[i] || '';
        if(!val) return;
        this._imageBase64[i] = val;
        const previewImg  = document.getElementById(`imgPreviewImg${slot}`);
        const placeholder = document.getElementById(`imgPlaceholder${slot}`);
        const clearBtn    = document.querySelector(`.img-clear-btn[data-slot="${slot}"]`);
        if(previewImg)  { previewImg.src = val; previewImg.style.display = 'block'; }
        if(placeholder)   placeholder.style.display = 'none';
        if(clearBtn)      clearBtn.classList.remove('d-none');
      });

      // Restore colors: tick presets, push rest to custom
      const knownPresets = Object.keys(this.PRESET_COLORS);
      (p.colors || []).forEach(hex => {
        const cb = form.querySelector(`input[name="colorPresets"][value="${hex}"]`);
        if(cb){ cb.checked = true; }
        else if(!knownPresets.includes(hex)){ this.customColors.push(hex); }
      });
      this.renderCustomColorChips();

    } else {
      modalTitle.textContent = 'Tambah Produk Baru';
    }

    new bootstrap.Modal(document.getElementById('productModal')).show();
  },

  /* ---- Handle form submit (add or update) ---- */
  handleSubmit(e){
    e.preventDefault();
    const form = e.target;

    if(!form.checkValidity()){
      form.classList.add('was-validated');
      return;
    }

    const products  = StepHaven.getProducts();
    const sizesArr  = form.elements['sizes'].value.split(',').map(s => parseInt(s.trim())).filter(Boolean);
    const colors    = this.collectColors(form);

    // Collect up to 3 Base64 images from upload slots; filter empty
    const images = this._imageBase64.filter(Boolean);
    const fallback = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80';
    const finalImages = images.length ? images : [fallback];

    const data = {
      name:     form.elements['name'].value.trim(),
      brand:    form.elements['brand'].value.trim(),
      /* Store the selected value as subCategory; derive parent automatically */
      category: (() => {
        const v = form.elements['category'].value;
        if(['Sneakers Casual','Slip-On','Canvas Shoes','Casual Shoes'].includes(v)) return 'Casual Shoes';
        if(['Loafers','Oxford Style Casual','Leather Semi Formal','Semi Formal Shoes'].includes(v)) return 'Semi Formal Shoes';
        if(['Limited Edition','Exclusive Release'].includes(v)) return 'Limited Edition';
        return v;
      })(),
      subCategory: form.elements['category'].value,
      price:    parseInt(form.elements['price'].value),
      discount: parseInt(form.elements['discount'].value) || 0,
      stock:    parseInt(form.elements['stock'].value),
      sizes:    sizesArr.length ? sizesArr : [40,41,42],
      images: finalImages,              // array of up to 3 Base64/URL images
      img:    finalImages[0],           // keep backward-compat primary
      img2:   finalImages[1] || finalImages[0],
      desc:   form.elements['desc'].value.trim(),
      bestSeller: !!(form.querySelector('[name="bestSeller"]') && form.querySelector('[name="bestSeller"]').checked),
      colors: colors.length ? colors : ['#1A1A1D'],
      rating: 4.5, reviews: 0, sold: 0,
      /* Store full ISO timestamp (not just date) so sort by newest is
         always accurate even when multiple products are added the same day */
      date:   new Date().toISOString()
    };

    if(this.editingId){
      const idx = products.findIndex(p => p.id === this.editingId);
      products[idx] = { ...products[idx], ...data };
      StepHaven.showToast('Produk berhasil diperbarui', 'success');
    } else {
      const newId = 'SH-' + (1000 + products.length + Math.floor(Math.random()*900));
      products.push({ id: newId, ...data });
      StepHaven.showToast('Produk baru berhasil ditambahkan', 'success');
    }

    StepHaven.saveProducts(products);
    form.classList.remove('was-validated');
    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    this.render();
    this.renderSummary();
  },

  deleteProduct(productId){
    if(!confirm('Hapus produk ini dari inventory?')) return;
    let products = StepHaven.getProducts().filter(p => p.id !== productId);
    StepHaven.saveProducts(products);
    StepHaven.showToast('Produk dihapus', 'info');
    this.render();
    this.renderSummary();
  }
};

document.addEventListener('DOMContentLoaded', () => StepHaven.Inventory.init());
