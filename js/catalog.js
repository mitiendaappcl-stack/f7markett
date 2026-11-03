/* ==========================================================================
   CATÁLOGO — capa de datos compartida por la tienda (index.html) y el panel
   (admin.html). Aquí vive TODO lo que cambia según el cliente.
   --------------------------------------------------------------------------
   window.LoucsCatalog = {
     load()        → { products, settings }   (la tienda y el panel leen igual)
     save(data)    → publica los cambios      (solo el panel)
     saveImages()  → sube una foto            (solo el panel)
     auth          → login / logout / reset   (solo el panel)
   El ORDEN del array `products` es el orden de toda la página.
   ========================================================================== */
(() => {
  'use strict';
  const B = window.LOUCS_BACKEND || { mode: 'local', demoPassword: 'loucs' };
  const KEY = 'f7.catalog.v1';
  const FB_VERSION = '10.14.1';

  const DEFAULT_SETTINGS = { storeName: 'F7 Markett', handle: '@f7_markett', phone: '56912345678' };

  // Catálogo inicial (el que ya traía la web). Se usa mientras el panel no haya publicado nada.
  const DEFAULT_PRODUCTS = [
    { id: "aj3-white-cement", file: "01", brand: "jordan", lines: ["Air Jordan 3", "Retro"], mark: "Jordan 3", color: "White Cement", price: 149990, accent: "#e3d6bc",
      desc: "Jordan 3 en blanco hueso con estampado cemento gris, burbuja Air visible y detalles rojos." },
    { id: "aj7-raptor", file: "02", brand: "jordan", lines: ["Air Jordan 7", "Retro"], mark: "Jordan 7", color: "Raptor", price: 139990, accent: "#d4313c",
      desc: "Jordan 7 en nubuck negro con detalles rojos y morados en la suela. Silueta clásica." },
    { id: "aj6-black-gold", file: "03", brand: "jordan", lines: ["Air Jordan 6", "Retro"], mark: "Jordan 6", color: "Black & Gold", price: 149990, accent: "#d9a82f",
      desc: "Jordan 6 negro con detalles dorados en la suela y el talón, y suela clara." },
    { id: "aj4-pure-money", file: "04", brand: "jordan", lines: ["Air Jordan 4", "Retro"], mark: "Jordan 4", color: "Pure Money", price: 139990, accent: "#c3cde0",
      desc: "Jordan 4 todo blanco con detalles plateados. Limpio y fácil de combinar." },
    { id: "aj5-black-metallic", file: "05", brand: "jordan", lines: ["Air Jordan 5", "Retro"], mark: "Jordan 5", color: "Black Metallic", price: 129990, accent: "#a9b4c6",
      desc: "Jordan 5 en negro con malla gris, cordones blancos, detalles plateados y suela translúcida." },
    { id: "am95-grey-fade", file: "06", brand: "nike", lines: ["Air Max", "95"], mark: "Air Max 95", color: "Degradé gris", price: 119990, accent: "#9fb0b8",
      desc: "Air Max 95 con degradé de grises, cordones blancos y burbuja Air visible en el talón." },
    { id: "aj1-high-dior", file: "07", brand: "jordan", lines: ["Air Jordan 1", "High Dior"], mark: "Jordan 1", color: "Grey & White", price: 249990, accent: "#b8c0cc",
      desc: "Jordan 1 High en gris y blanco con estampado Dior en el swoosh y suela translúcida." },
    { id: "shox-tl-black", file: "08", brand: "nike", lines: ["Nike Shox", "TL"], mark: "Shox TL", color: "Triple Black", price: 119990, accent: "#ff5a36",
      desc: "Shox TL en negro total con columnas de amortiguación a la vista. Suela alta y mucha presencia." },
    { id: "am95-corteiz", file: "09", brand: "nike", lines: ["Air Max 95", "Corteiz"], mark: "Air Max 95", color: "Black & Gold", price: 129990, accent: "#ffb000",
      desc: "Air Max 95 negro con burbujas de aire en naranja y detalles dorados en el talón y el lateral." },
    { id: "aj4-midnight-navy", file: "10", brand: "jordan", lines: ["Air Jordan 4", "Retro"], mark: "Jordan 4", color: "Midnight Navy", price: 139990, accent: "#5b8bd9",
      desc: "Jordan 4 en blanco con azul marino y salpicado gris en la suela y las alas laterales." },
    { id: "am-plus-white", file: "11", brand: "nike", lines: ["Air Max Plus", "(TN)"], mark: "Air Max Plus", color: "Triple White", price: 119990, accent: "#cfe3ff",
      desc: "Air Max Plus blanco total con las líneas onduladas en el empeine y burbuja Air en el talón." },
    { id: "am-dn-black", file: "12", brand: "nike", lines: ["Air Max", "Dn"], mark: "Air Max Dn", color: "Triple Black", price: 139990, accent: "#4fc3f7",
      desc: "Air Max Dn negro total con las cámaras de aire a la vista en el talón." },
    { id: "af1-mid-white", file: "13", brand: "nike", lines: ["Air Force 1", "Mid"], mark: "AF1 Mid", color: "Triple White", price: 99990, accent: "#d9dde6",
      desc: "El Air Force 1 de caña media en blanco total, con correa al tobillo." },
    { id: "aj4-black-grey", file: "14", brand: "jordan", lines: ["Air Jordan 4", "Retro"], mark: "Jordan 4", color: "Black & Grey", price: 139990, accent: "#8f9bb3",
      desc: "Jordan 4 en negro y gris con salpicado, detalles blancos y suela clara." },
    { id: "aj1-low-travis", file: "15", brand: "jordan", lines: ["Air Jordan 1", "Low"], mark: "Jordan 1", color: "Travis Scott Black", price: 189990, accent: "#a1856b",
      desc: "Jordan 1 Low en ante negro con costuras claras y swoosh invertido. Edición Travis Scott." },
    { id: "af1-low-white", file: "16", brand: "nike", lines: ["Air Force 1", "'07 Low"], mark: "AF1", color: "Triple White", price: 89990, accent: "#dfe3ea",
      desc: "El AF1 bajo en blanco total. Combina con todo y es el más fácil de usar a diario." },
    { id: "aj1-mid-black-patent", file: "17", brand: "jordan", lines: ["Air Jordan 1", "Mid"], mark: "Jordan 1", color: "Black Patent", price: 119990, accent: "#7fb3ff",
      desc: "Jordan 1 Mid en charol negro con suela translúcida. Brillo en el empeine y el talón." },
    { id: "af1-low-white-2", file: "18", brand: "nike", lines: ["Air Force 1", "Low"], mark: "AF1", color: "White", price: 89990, accent: "#d3d8e0",
      desc: "AF1 bajo en cuero blanco, otra versión del clásico. Suela gruesa y perfil limpio." },
    { id: "aj11-cool-grey", file: "19", brand: "jordan", lines: ["Air Jordan 11", "Retro"], mark: "Jordan 11", color: "Cool Grey", price: 169990, accent: "#aeb8c6",
      desc: "Jordan 11 en gris frío y blanco, con charol en la base y suela translúcida." },
    { id: "aj3-black-cat", file: "20", brand: "jordan", lines: ["Air Jordan 3", "Retro"], mark: "Jordan 3", color: "Black Cat", price: 149990, accent: "#8a8a99",
      desc: "Jordan 3 completamente negro, en nubuck con estampado elefante en la puntera y el talón." },
    { id: "aj11-white-black-gold", file: "21", brand: "jordan", lines: ["Air Jordan 11", "Retro"], mark: "Jordan 11", color: "White Black Gold", price: 169990, accent: "#d4af37",
      desc: "Jordan 11 en blanco y negro con charol y logo dorado. Suela translúcida." },
    { id: "aj11-low-black", file: "22", brand: "jordan", lines: ["Air Jordan 11", "Low"], mark: "Jordan 11", color: "Black Patent", price: 159990, accent: "#6aa8ff",
      desc: "Jordan 11 Low en negro con charol y suela translúcida. Mismo diseño en perfil bajo." },
    { id: "aj13-flint", file: "23", brand: "jordan", lines: ["Air Jordan 13", "Retro"], mark: "Jordan 13", color: "Flint", price: 139990, accent: "#3d6bff",
      desc: "Jordan 13 en azul marino y gris, con el ojo de pantera en el lateral y suela blanca." },
    { id: "am97-black-red", file: "24", brand: "nike", lines: ["Air Max", "97"], mark: "Air Max 97", color: "Black & Red", price: 129990, accent: "#ff2d2d",
      desc: "Air Max 97 en negro con swoosh rojo y líneas onduladas en todo el lateral." },
    { id: "aj5-fire-red", file: "25", brand: "jordan", lines: ["Air Jordan 5", "Retro"], mark: "Jordan 5", color: "Fire Red", price: 139990, accent: "#e8201a",
      desc: "Jordan 5 en blanco con rojo fuego, suela translúcida y el 23 en el lateral." },
    { id: "aj3-black-cement", file: "26", brand: "jordan", lines: ["Air Jordan 3", "Retro"], mark: "Jordan 3", color: "Black Cement", price: 149990, accent: "#ff3a1d",
      desc: "Jordan 3 en cuero negro con cemento gris y toques rojos; burbuja Air visible." },
    { id: "af1-low-black", file: "27", brand: "nike", lines: ["Air Force 1", "'07 Low"], mark: "AF1", color: "Triple Black", price: 89990, accent: "#8f9bb3",
      desc: "El AF1 bajo de siempre en negro total. Cuero liso, suela gruesa y burbuja Air en el talón." },
    { id: "aj4-toro-bravo", file: "28", brand: "jordan", lines: ["Air Jordan 4", "Retro"], mark: "Jordan 4", color: "Toro Bravo", price: 139990, accent: "#ff3b30",
      desc: "Jordan 4 en ante rojo con detalles negros y grises, malla lateral y burbuja Air visible." },
    { id: "shox-tl-white", file: "29", brand: "nike", lines: ["Nike Shox", "TL"], mark: "Shox TL", color: "White & Silver", price: 119990, accent: "#cfd3da",
      desc: "Shox TL en blanco con detalles plateados y columnas de amortiguación a la vista." },
    { id: "aj1-high-black-patent", file: "30", brand: "jordan", lines: ["Air Jordan 1", "High"], mark: "Jordan 1", color: "Black Patent", price: 139990, accent: "#e8201a",
      desc: "Jordan 1 High en charol negro con suela roja. Brillo y contraste en la silueta clásica." },
    { id: "aj8-chrome", file: "31", brand: "jordan", lines: ["Air Jordan 8", "Retro"], mark: "Jordan 8", color: "Chrome", price: 149990, accent: "#b9c2cc",
      desc: "Jordan 8 en negro con paneles cromados y correas cruzadas en el empeine." },
    { id: "aj11-gamma-blue", file: "32", brand: "jordan", lines: ["Air Jordan 11", "Retro"], mark: "Jordan 11", color: "Gamma Blue", price: 169990, accent: "#35b8c9",
      desc: "Jordan 11 en negro con Jumpman azul turquesa y suela translúcida azul." },
    { id: "nocta-hot-step", file: "33", brand: "nike", lines: ["Nike Nocta", "Hot Step"], mark: "Hot Step", color: "Triple White", price: 159990, accent: "#e6e6ea",
      desc: "Nike NOCTA Hot Step en blanco, con líneas envolventes y suela voluminosa." },
    { id: "am-plus-black", file: "34", brand: "nike", lines: ["Air Max Plus", "(TN)"], mark: "Air Max Plus", color: "Triple Black", price: 119990, accent: "#5d6bff",
      desc: "Air Max Plus negro total con burbuja Air en el talón. Perfil agresivo." },
  ];

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const defaults = () => ({ products: clone(DEFAULT_PRODUCTS), settings: { ...DEFAULT_SETTINGS } });
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const normalize = (d) => {
    const base = defaults();
    if (!d || !Array.isArray(d.products)) return base;
    return { products: d.products, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } };
  };
  const isReal = () => B.mode === 'firebase' && B.firebase && B.firebase.projectId;

  /* --- Miniaturas: Cloudinary las genera con la URL --------------------- */
  const thumbOf = (url) => (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/'))
    ? url.replace('/upload/', '/upload/c_limit,w_520,f_auto,q_auto/') : url;
  const heroOf = (url) => (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/upload/'))
    ? url.replace('/upload/', '/upload/c_limit,w_1200,f_auto,q_auto/') : url;

  /* --- LECTURA ------------------------------------------------------------
     Modo real: una sola petición REST a Firestore (sin cargar el SDK, rápido).
     El catálogo entero va en un único documento: stores/main { json: "..." }  */
  async function fetchRemote() {
    const f = B.firebase;
    const url = `https://firestore.googleapis.com/v1/projects/${f.projectId}/databases/(default)/documents/stores/${B.storeId || 'main'}` +
      (f.apiKey ? `?key=${encodeURIComponent(f.apiKey)}` : '');
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4500);
    try {
      const r = await fetch(url, { cache: 'no-store', signal: ctl.signal });
      if (r.status === 404) return null;            // aún no se ha publicado nada
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const doc = await r.json();
      const s = doc.fields && doc.fields.json && doc.fields.json.stringValue;
      return s ? JSON.parse(s) : null;
    } finally { clearTimeout(t); }
  }

  async function load() {
    if (isReal()) {
      try {
        const remote = await fetchRemote();
        if (remote) { try { localStorage.setItem(KEY + '.cache', JSON.stringify(remote)); } catch {} return normalize(remote); }
        return defaults();
      } catch (e) {
        try { const c = JSON.parse(localStorage.getItem(KEY + '.cache')); if (c) return normalize(c); } catch {}
        return defaults();
      }
    }
    return normalize(readLocal());
  }

  /* --- FIREBASE (solo panel) ------------------------------------------- */
  let fb;
  async function firebase() {
    if (fb) return fb;
    const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}/`;
    const [app, auth, fs] = await Promise.all([
      import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js'),
    ]);
    const a = app.initializeApp(B.firebase);
    fb = { app: a, auth: auth, fs: fs, authInst: auth.getAuth(a), db: fs.getFirestore(a) };
    return fb;
  }

  /* --- ESCRITURA --------------------------------------------------------- */
  async function save(data) {
    const clean = { products: data.products, settings: data.settings, updatedAt: Date.now() };
    if (isReal()) {
      const f = await firebase();
      await f.fs.setDoc(f.fs.doc(f.db, 'stores', (B.storeId || 'main')), { json: JSON.stringify(clean), updatedAt: clean.updatedAt });
      try { localStorage.setItem(KEY + '.cache', JSON.stringify(clean)); } catch {}
      return;
    }
    try { localStorage.setItem(KEY, JSON.stringify(clean)); }
    catch { throw new Error('El navegador no tiene espacio para guardar más fotos en modo demo.'); }
  }

  /* Sube una foto. hero/thumb son Blob. Devuelve { img, thumb } */
  async function saveImages({ hero, thumb }) {
    if (isReal()) {
      const c = B.cloudinary || {};
      if (!c.cloudName || !c.uploadPreset) throw new Error('Falta configurar Cloudinary en js/config.js');
      const fd = new FormData();
      fd.append('file', hero);
      fd.append('upload_preset', c.uploadPreset);
      if (c.folder) fd.append('folder', c.folder);
      const r = await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/image/upload`, { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok || !j.secure_url) throw new Error((j.error && j.error.message) || 'No se pudo subir la foto');
      return { img: heroOf(j.secure_url), thumb: thumbOf(j.secure_url) };
    }
    const toUrl = (b) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });
    return { img: await toUrl(hero), thumb: await toUrl(thumb) };
  }

  /* --- AUTENTICACIÓN (solo panel) --------------------------------------- */
  const auth = {
    real: isReal,
    async current() {
      if (isReal()) {
        const f = await firebase();
        await f.authInst.authStateReady();
        return f.authInst.currentUser ? { email: f.authInst.currentUser.email } : null;
      }
      return sessionStorage.getItem('f7.admin') ? { email: 'demo' } : null;
    },
    async login(email, pass) {
      if (isReal()) {
        const f = await firebase();
        try { const c = await f.auth.signInWithEmailAndPassword(f.authInst, email, pass); return { email: c.user.email }; }
        catch (e) { throw new Error('Correo o contraseña incorrectos'); }
      }
      if (pass !== (B.demoPassword || 'loucs')) throw new Error('Contraseña incorrecta');
      sessionStorage.setItem('f7.admin', '1');
      return { email: 'demo' };
    },
    async logout() {
      if (isReal()) { const f = await firebase(); await f.auth.signOut(f.authInst); }
      sessionStorage.removeItem('f7.admin');
    },
    async reset(email) {
      if (!isReal()) throw new Error('En modo demo la contraseña es la de config.js');
      const f = await firebase();
      await f.auth.sendPasswordResetEmail(f.authInst, email);
    },
  };

  window.LoucsCatalog = {
    mode: () => (isReal() ? 'firebase' : 'local'),
    cloudinaryReady: () => !isReal() || !!(B.cloudinary && B.cloudinary.cloudName && B.cloudinary.uploadPreset),
    load, save, saveImages, auth, defaults, thumbOf, heroOf,
    resetDemo() { try { localStorage.removeItem(KEY); } catch {} },
  };
})();
