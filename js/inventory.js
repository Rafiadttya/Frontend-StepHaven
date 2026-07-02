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

    /* ---- Image URL live preview ---- */
    ['img1','img2','img3'].forEach(name => {
      const input = document.querySelector(`[name="${name}"]`);
      if(!input) return;
      const previewWrap = document.getElementById(`${name}Preview`);
      const previewImg  = previewWrap ? previewWrap.querySelector('img') : null;
      input.addEventListener('input', () => {
        const val = input.value.trim();
        if(val && previewImg){
          previewImg.src = val;
          previewWrap.style.display = 'block';
        } else if(previewWrap){
          previewWrap.style.display = 'none';
        }
      });
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
    // Reset image previews
    ['img1','img2','img3'].forEach(n => {
      const wrap = document.getElementById(`${n}Preview`);
      if(wrap) wrap.style.display = 'none';
    });
    // Reset custom color chips
    const chipsWrap = document.getElementById('customColorChips');
    if(chipsWrap) chipsWrap.innerHTML = '';
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

      // Restore up to 3 images
      const imgs = p.images || [p.img, p.img2].filter(Boolean);
      ['img1','img2','img3'].forEach((name, i) => {
        const val = imgs[i] || '';
        form.elements[name].value = val;
        const wrap = document.getElementById(`${name}Preview`);
        const img  = wrap ? wrap.querySelector('img') : null;
        if(val && img){
          img.src = val;
          wrap.style.display = 'block';
        }
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

    // Collect up to 3 image URLs; filter empty strings
    const imgArr = ['img1','img2','img3']
      .map(n => form.elements[n].value.trim())
      .filter(Boolean);
    const fallback = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80';
    const images   = imgArr.length ? imgArr : [fallback];

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
      images,                     // array of up to 3 URLs (new field)
      img:    images[0],          // keep backward-compat primary
      img2:   images[1] || images[0],
      desc:   form.elements['desc'].value.trim(),
      colors: colors.length ? colors : ['#1A1A1D'],
      rating: 4.5, reviews: 0, sold: 0,
      date:   new Date().toISOString().slice(0,10)
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
