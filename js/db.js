/* =========================================================
    STEPHAVEN — db.js
  Wrapper IndexedDB untuk penyimpanan produk.

    STRATEGI: Cache in-memory + persistensi IndexedDB asinkron.
    ─────────────────────────────────────────────────────────
    - Semua operasi baca (getProducts, getProductById) tetap sinkron
      melalui array cache in-memory.
    - Semua operasi tulis (saveProducts) memperbarui cache secara langsung,
      lalu melakukan persistensi ke IndexedDB secara asinkron (fire-and-forget).
    - Ini TIDAK ADA perubahan yang diperlukan pada inventory.js, products.js,
      orders.js, cart.js, wishlist.js — semuanya memanggil
      StepHaven.getProducts() / saveProducts() persis seperti sebelumnya.

    INISIALISASI (asinkron, dipanggil sekali saat pemuatan halaman):
      await StepHavenDB.init(StepHaven)
    ─────────────────────────────────────────────────────────
    IndexedDB HANYA digunakan untuk object store produk.
    Data lainnya (keranjang, wishlist, pengguna, pesanan, ulasan)
    tetap berada di localStorage sebagaimana adanya — data tersebut
    berupa pasangan key/value kecil yang tidak akan pernah mencapai batas kuota.
   ========================================================= */

const StepHavenDB = {

  DB_NAME:    'StepHavenDB',
  DB_VERSION: 1,
  STORE:      'products',

  _db:    null,   /* IDBDatabase instance */
  _cache: null,   /* in-memory product array (sync access) */

  /* ──────────────────────────────────────────────────────
     LOW-LEVEL: open / ensure DB is ready
  ────────────────────────────────────────────────────── */
  _open(){
    if(this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if(!db.objectStoreNames.contains(this.STORE)){
          db.createObjectStore(this.STORE, { keyPath: 'id' });
        }
      };

      req.onsuccess = (e) => {
        this._db = e.target.result;
        /* Re-open on version change from another tab */
        this._db.onversionchange = () => { this._db.close(); this._db = null; };
        resolve(this._db);
      };

      req.onerror = () => reject(req.error);
    });
  },

  /* ──────────────────────────────────────────────────────
     IDB READ: return all products from IndexedDB
  ────────────────────────────────────────────────────── */
  _getAllFromIDB(){
    return this._open().then(db => new Promise((resolve, reject) => {
      const tx  = db.transaction(this.STORE, 'readonly');
      const req = tx.objectStore(this.STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => reject(req.error);
    }));
  },

  /* ──────────────────────────────────────────────────────
        IDB WRITE: mengganti keseluruhan penyimpanan produk.
        Menunggu keberhasilan `clear()` sebelum memasukkan data,
        lalu menyelesaikan operasi hanya setelah `tx.oncomplete` mengonfirmasi
        bahwa seluruh data telah tersimpan secara permanen.
  ────────────────────────────────────────────────────── */
  _putAll(products){
    return this._open().then(db => new Promise((resolve, reject) => {
      const tx    = db.transaction(this.STORE, 'readwrite');
      const store = tx.objectStore(this.STORE);

      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
      tx.onabort    = () => reject(tx.error || new Error('IDB tx aborted'));

      /* Wait for clear to finish before inserting records */
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        if(products.length === 0) return;
        products.forEach(p => { store.put(p); });
      };
      clearReq.onerror = () => { reject(clearReq.error); tx.abort(); };
    }));
  },

  /* ──────────────────────────────────────────────────────
     PUBLIC: synchronous cache read (used by getProducts)
  ────────────────────────────────────────────────────── */
  getCached(){
    return this._cache || [];
  },

  /* ──────────────────────────────────────────────────────
     PUBLIC: fire-and-forget (used internally by init)
  ────────────────────────────────────────────────────── */
  persist(products){
    this._cache = products;
    this._putAll(products).catch(err =>
      console.warn('[StepHavenDB] persist error:', err)
    );
  },

  /* ──────────────────────────────────────────────────────
PUBLIK: `save` yang dapat ditunggu (*awaitable*) — WAJIB digunakan untuk semua operasi penulisan
      yang memerlukan jaminan persistensi (CRUD Inventaris,
      pengurangan stok, pembaruan peringkat).
      Memperbarui *cache* secara sinkron, lalu menunggu IDB
      mengonfirmasi bahwa transaksi telah sepenuhnya di-*commit* sebelum
      mengembalikan kendali. Pemanggil harus melakukan `await` pada operasi ini.
  ────────────────────────────────────────────────────── */
  persistAsync(products){
    this._cache = products;          /* immediate cache update */
    return this._putAll(products);   /* awaitable IDB write   */
  },

  /* ──────────────────────────────────────────────────────
     PUBLIC: init — called once before StepHaven.init()
  ────────────────────────────────────────────────────── */
  async init(app){
    await this._open();

    const DATA_VER  = app ? app.DATA_VERSION : '4';
    const VER_KEY   = 'sh_data_version';
    const LS_KEY    = 'sh_products';
    const storedVer = localStorage.getItem(VER_KEY);
    let products;

    if(storedVer !== DATA_VER){
      /* ── Version bump: re-seed ── */
      products = app ? app.seedProducts() : [];
      await this._putAll(products);
      localStorage.setItem(VER_KEY, DATA_VER);
      /* Remove stale localStorage product blob to free space */
      localStorage.removeItem(LS_KEY);
      console.info('[StepHavenDB] re-seeded (version', DATA_VER, ')');

    } else {
      /* ── Same version: load from IDB ── */
      products = await this._getAllFromIDB();

      if(products.length === 0){
        /* IDB is empty — check if old data lives in localStorage */
        const lsRaw = localStorage.getItem(LS_KEY);
        if(lsRaw){
          try{
            products = JSON.parse(lsRaw);
            await this._putAll(products);
            /* Migration done — free localStorage space */
            localStorage.removeItem(LS_KEY);
            console.info('[StepHavenDB] migrated', products.length, 'products from localStorage');
          } catch(e){
            /* Corrupt localStorage data — seed fresh */
            products = app ? app.seedProducts() : [];
            await this._putAll(products);
          }
        } else {
          /* Truly fresh install — seed */
          products = app ? app.seedProducts() : [];
          await this._putAll(products);
          localStorage.setItem(VER_KEY, DATA_VER);
          console.info('[StepHavenDB] seeded fresh products');
        }
      }
    }

    this._cache = products;
    return products;
  }
};
