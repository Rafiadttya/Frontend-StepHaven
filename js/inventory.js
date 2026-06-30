/* =========================================================
   STEPHAVEN — inventory.js
   Simple admin-style inventory dashboard:
   - Summary cards (total stock, total products, out of stock, bestseller)
   - Table listing with search + category filter
   - Add / Edit / Delete product (modal form)
   - Backed entirely by localStorage (shared with products.js)
   ========================================================= */

StepHaven.Inventory = {

  state: { search: '', category: 'all' },
  editingId: null,

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

    // Populate size/color helper default values when modal opens fresh
  },

  renderSummary(){
    const products = StepHaven.getProducts();
    const totalStock = products.reduce((sum,p) => sum + p.stock, 0);
    const totalProducts = products.length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const bestseller = [...products].sort((a,b) => b.sold - a.sold)[0];

    document.getElementById('sumTotalStock').textContent = totalStock;
    document.getElementById('sumTotalProducts').textContent = totalProducts;
    document.getElementById('sumOutOfStock').textContent = outOfStock;
    document.getElementById('sumBestseller').textContent = bestseller ? bestseller.name : '-';
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
      products = products.filter(p => p.category === this.state.category);
    }
    return products;
  },

  render(){
    const tbody = document.getElementById('inventoryTableBody');
    const products = this.getFiltered();

    if(products.length === 0){
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5 text-muted">
        <i class="bi bi-inbox d-block mb-2" style="font-size:2rem;"></i>Tidak ada produk ditemukan</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => {
      let badge = p.stock === 0
        ? '<span class="badge" style="background:#B33A3A">Habis</span>'
        : (p.stock <= 5 ? '<span class="badge" style="background:#C9A85C;color:#1A1A1D">Menipis</span>' : '<span class="badge" style="background:#4C7A4C">Tersedia</span>');
      return `
      <tr>
        <td><img src="${p.img}" alt="${p.name}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;"></td>
        <td class="font-mono small">${p.id}</td>
        <td>${p.name}</td>
        <td>${p.brand}</td>
        <td>${p.category}</td>
        <td class="font-mono">${StepHaven.formatRupiah(p.price)}</td>
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

  openModal(productId = null){
    this.editingId = productId;
    const form = document.getElementById('productForm');
    form.reset();
    const modalTitle = document.getElementById('productModalLabel');

    if(productId){
      const p = StepHaven.getProductById(productId);
      modalTitle.textContent = 'Edit Produk';
      form.elements['name'].value = p.name;
      form.elements['brand'].value = p.brand;
      form.elements['category'].value = p.category;
      form.elements['price'].value = p.price;
      form.elements['discount'].value = p.discount;
      form.elements['stock'].value = p.stock;
      form.elements['sizes'].value = p.sizes.join(',');
      form.elements['img'].value = p.img;
      form.elements['desc'].value = p.desc;
    }else{
      modalTitle.textContent = 'Tambah Produk Baru';
    }

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
  },

  handleSubmit(e){
    e.preventDefault();
    const form = e.target;

    // Simple realtime-style validation
    if(!form.checkValidity()){
      form.classList.add('was-validated');
      return;
    }

    const products = StepHaven.getProducts();
    const sizesArr = form.elements['sizes'].value.split(',').map(s => parseInt(s.trim())).filter(Boolean);

    const data = {
      name: form.elements['name'].value.trim(),
      brand: form.elements['brand'].value.trim(),
      category: form.elements['category'].value,
      price: parseInt(form.elements['price'].value),
      discount: parseInt(form.elements['discount'].value) || 0,
      stock: parseInt(form.elements['stock'].value),
      sizes: sizesArr.length ? sizesArr : [40,41,42],
      img: form.elements['img'].value.trim() || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
      img2: form.elements['img'].value.trim() || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
      desc: form.elements['desc'].value.trim(),
      colors: ['#1A1A1D','#B5562D'],
      rating: 4.5, reviews: 0, sold: 0,
      date: new Date().toISOString().slice(0,10)
    };

    if(this.editingId){
      const idx = products.findIndex(p => p.id === this.editingId);
      products[idx] = { ...products[idx], ...data };
      StepHaven.showToast('Produk berhasil diperbarui', 'success');
    }else{
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
    let products = StepHaven.getProducts();
    products = products.filter(p => p.id !== productId);
    StepHaven.saveProducts(products);
    StepHaven.showToast('Produk dihapus', 'info');
    this.render();
    this.renderSummary();
  }
};

document.addEventListener('DOMContentLoaded', () => StepHaven.Inventory.init());
