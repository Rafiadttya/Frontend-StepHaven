/* =========================================================
   STEPHAVEN — db.js
   IndexedDB wrapper for product storage.

   STRATEGY: In-memory cache + async IndexedDB persistence.
   ─────────────────────────────────────────────────────────
   - All reads  (getProducts, getProductById) stay synchronous
     via the in-memory cache array.
   - All writes (saveProducts) update the cache immediately,
     then persist to IndexedDB asynchronously (fire-and-forget).
   - This means ZERO changes needed to inventory.js, products.js,
     orders.js, cart.js, wishlist.js — they all call
     StepHaven.getProducts() / saveProducts() exactly as before.

   INITIALIZATION (async, called once at page load):
     await StepHavenDB.init(StepHaven)
   ─────────────────────────────────────────────────────────
   IndexedDB is used ONLY for the products object store.
   Everything else (cart, wishlist, user, orders, reviews)
   remains in localStorage as-is — those are small key/value
   pairs that never hit the quota limit.
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
     IDB WRITE: replace entire products store.
     Waits for clear() to succeed before putting records,
     then resolves only after tx.oncomplete confirming
     that all data is durably committed.
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
     PUBLIC: awaitable save — MUST be used by all writes
     that need guaranteed persistence (Inventory CRUD,
     stock deduction, rating updates).
     Updates cache synchronously, then waits for IDB to
     confirm the transaction is fully committed before
     returning. Callers should await this.
  ────────────────────────────────────────────────────── */
  persistAsync(products){
    this._cache = products;          /* immediate cache update */
    return this._putAll(products);   /* awaitable IDB write   */
  },

  /* ──────────────────────────────────────────────────────
     PUBLIC: init — called once before StepHaven.init()

     Flow:
     1. Open IndexedDB.
     2. If data version changed → re-seed into IDB.
     3. Else try to load from IDB.
     4. If IDB is empty → migrate from localStorage (old data).
     5. If still empty → seed fresh.
     6. Populate in-memory cache.
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
