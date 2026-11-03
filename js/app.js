/* ==========================================================================
   F7 MARKETT — lógica del catálogo
   --------------------------------------------------------------------------
   1. Configuración y datos (edita aquí teléfono, precios y modelos)
   2. Utilidades
   3. Estado y renderizado
   4. Cambio de modelo (animado)
   5. Escenario: tilt, arrastre, teclado
   6. Filtro, tallas, tema
   7. Pedido por WhatsApp
   8. Scroll: header, reveal, barra móvil
   9. Arranque
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     1. CONFIGURACIÓN Y DATOS
     ------------------------------------------------------------------------ */
  const CONFIG = {
    storeName: 'F7 Markett',
    handle: '@f7_markett',
    phone: '56912345678',        // ← reemplaza por el WhatsApp real (código de país + número, sin + ni espacios)
    imgDir: 'img/',              // carpeta de imágenes (el build "standalone" las incrusta)
  };

  const SIZES = [
    { EUR: '37', US: '5',   CM: '23.5' },
    { EUR: '38', US: '6',   CM: '24' },
    { EUR: '39', US: '7',   CM: '25' },
    { EUR: '40', US: '7.5', CM: '25.5' },
    { EUR: '41', US: '8',   CM: '26' },
    { EUR: '42', US: '8.5', CM: '26.5' },
  ];

  // Los datos (productos, precios, WhatsApp) viven en js/catalog.js y se editan desde /admin.html
  let PRODUCTS = [];


  /* ------------------------------------------------------------------------
     2. UTILIDADES
     ------------------------------------------------------------------------ */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  };

  const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const price = (n) => money.format(n);
  const name  = (p) => p.lines.filter(Boolean).join(' ');
  const brandLabel = (b) => (b === 'jordan' ? 'Jordan' : 'Nike');

  // Las imágenes pueden venir incrustadas (window.__IMG, build standalone) o de /img
  const src = (p, small = false) => {
    if (p.img) return small ? (p.thumb || p.img) : p.img;   // foto subida desde el panel
    const key = p.file + (small ? '-sm' : '');
    return (window.__IMG && window.__IMG[key]) || `${CONFIG.imgDir}${key}.webp`;
  };

  // Precarga y decodifica para que el cambio de modelo nunca parpadee
  const preloaded = new Map();
  const preload = (p) => {
    const url = src(p);
    if (!preloaded.has(url)) {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      preloaded.set(url, img.decode ? img.decode().catch(() => {}) : Promise.resolve());
    }
    return preloaded.get(url);
  };


  /* ------------------------------------------------------------------------
     3. ESTADO Y REFERENCIAS
     ------------------------------------------------------------------------ */
  const state = { brand: 'all', list: [], index: 0, unit: 'EUR', size: 4, busy: false };

  const el = {
    header: $('[data-header]'),
    hero: $('[data-hero]'),
    stage: $('[data-stage]'),
    wrap: $('[data-shoe-wrap]'),
    shoe: $('[data-shoe]'),
    watermark: $('[data-watermark]'),
    watermarkBox: $('[data-watermark-box]'),
    info: $('[data-info]'),
    title: $('[data-title]'),
    brand: $('[data-brand-label]'),
    color: $('[data-color]'),
    desc: $('[data-desc]'),
    price: $('[data-price]'),
    sizes: $('[data-sizes]'),
    rail: $('[data-rail]'),
    current: $('[data-current]'),
    total: $('[data-total]'),
    grid: $('[data-grid]'),
    count: $('[data-count]'),
    buy: $('[data-buy]'),
    dock: $('[data-dock]'),
    dockImg: $('[data-dock-img]'),
    dockName: $('[data-dock-name]'),
    dockMeta: $('[data-dock-meta]'),
    modal: $('[data-modal]'),
    themeBtn: $('[data-theme-toggle]'),
  };

  const current = () => state.list[state.index];
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* --- Riel de miniaturas --------------------------------------------------- */
  function renderRail() {
    el.rail.innerHTML = state.list.map((p, i) => `
      <button type="button" role="listitem" data-i="${i}" aria-label="${esc(name(p))} ${esc(p.color)}">
        <img src="${esc(src(p, true))}" alt="" loading="lazy" decoding="async">
      </button>`).join('');
    el.total.textContent = pad(state.list.length);
  }

  function markRail(i, behavior = 'smooth') {
    $$('button', el.rail).forEach((b, idx) => b.setAttribute('aria-current', String(idx === i)));
    const active = el.rail.children[i];
    if (active) {
      const left = active.offsetLeft - el.rail.clientWidth / 2 + active.clientWidth / 2;
      el.rail.scrollTo({ left, behavior: reduceMotion ? 'auto' : behavior });
    }
  }

  /* --- Catálogo ------------------------------------------------------------- */
  function renderGrid() {
    el.grid.innerHTML = state.list.map((p, i) => `
      <a class="card reveal" href="#${esc(p.id)}" data-i="${i}" style="--c:${esc(p.accent)};--i:${i % 8}" aria-label="${esc(name(p))}, ${esc(p.color)}, ${esc(price(p.price))}">
        <img class="card__img" src="${esc(src(p, true))}" alt="" loading="lazy" decoding="async">
        <h3>${p.lines.filter(Boolean).map(esc).join('<br>')}</h3>
        <p class="card__color">${esc(p.color)}</p>
        <div class="card__foot">
          <span class="card__price">${esc(price(p.price))}</span>
          <span class="card__go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
        </div>
      </a>`).join('');
    el.count.textContent = `${state.list.length} ${state.list.length === 1 ? 'modelo' : 'modelos'}`;
    observeReveals();
    markCards();
  }
  function markCards() {
    const id = current() && current().id;
    $$('.card', el.grid).forEach((c) => c.setAttribute('aria-current', String(state.list[+c.dataset.i].id === id)));
  }

  /* --- Tallas --------------------------------------------------------------- */
  function renderSizes(flip = false) {
    el.sizes.innerHTML = SIZES.map((s, i) => `
      <button type="button" class="size${flip ? ' is-flip' : ''}" role="radio" aria-checked="${i === state.size}" data-s="${i}" style="animation-delay:${flip ? i * 35 : 0}ms">${s[state.unit]}</button>`).join('');
  }
  const sizeText = () => {
    const s = SIZES[state.size];
    return `EUR ${s.EUR} · US ${s.US} · ${s.CM} cm`;
  };

  /* --- Panel de información ------------------------------------------------- */
  function paint(p) {
    document.documentElement.style.setProperty('--accent', p.accent);
    el.title.innerHTML = p.lines.filter(Boolean).map((l, i) => `<span style="--l:${i}">${esc(l)}</span>`).join('');
    el.brand.textContent = brandLabel(p.brand);
    el.color.textContent = p.color;
    el.desc.textContent = p.desc;
    el.price.textContent = price(p.price);
    el.watermark.textContent = p.mark;
    el.shoe.alt = `${name(p)} ${p.color}`;
    el.dockImg.src = src(p, true);
    el.dockName.textContent = name(p);
    el.dockMeta.textContent = `EUR ${SIZES[state.size].EUR} · ${price(p.price)}`;
    el.current.textContent = pad(state.index + 1);
    el.current.classList.remove('is-ticking'); void el.current.offsetWidth; el.current.classList.add('is-ticking');
    document.title = `${name(p)} ${p.color} — ${CONFIG.storeName}`;
    markRail(state.index);
    markCards();
  }

  // Reinicia la animación de entrada del texto
  function replayInfo(delay = 0) {
    el.info.style.setProperty('--d', `${delay}ms`);
    el.info.classList.remove('is-in');
    void el.info.offsetWidth;
    el.info.classList.add('is-in');
  }


  /* ------------------------------------------------------------------------
     4. CAMBIO DE MODELO (ANIMADO)
     ------------------------------------------------------------------------ */
  async function show(index, dir = 'next', { instant = false } = {}) {
    if (state.busy) return;
    const n = state.list.length;
    index = (index + n) % n;
    const p = state.list[index];
    state.busy = true;

    if (instant || reduceMotion) {
      state.index = index;
      await preload(p);
      el.shoe.src = src(p);
      paint(p);
      replayInfo(instant ? 1500 : 0);
    } else {
      el.wrap.dataset.dir = dir;
      el.wrap.classList.add('is-leaving');
      el.watermarkBox.classList.add('is-swapping');
      const loading = preload(p);
      await wait(300);
      await loading;

      state.index = index;
      el.shoe.src = src(p);
      paint(p);
      replayInfo();

      // Entra desde el lado contrario: se coloca sin transición y se suelta en el siguiente frame
      el.wrap.classList.remove('is-leaving');
      el.wrap.classList.add('is-entering');
      el.watermarkBox.classList.remove('is-swapping');
      void el.wrap.offsetWidth;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      el.wrap.classList.remove('is-entering');
      await wait(450);
    }

    // Precarga vecinos y guarda el enlace compartible
    preload(state.list[(index + 1) % n]);
    preload(state.list[(index - 1 + n) % n]);
    try { history.replaceState(null, '', `#${p.id}`); } catch { /* file:// puede bloquearlo */ }
    state.busy = false;
  }

  const next = () => show(state.index + 1, 'next');
  const prev = () => show(state.index - 1, 'prev');


  /* ------------------------------------------------------------------------
     5. ESCENARIO: TILT, ARRASTRE, TECLADO
     ------------------------------------------------------------------------ */
  function setupStage() {
    let dragging = false, startX = 0, dx = 0, pid = null;
    const set = (k, v) => el.shoe.style.setProperty(k, v);
    const reset = () => { ['--rx', '--ry', '--tx', '--ty', '--s'].forEach((k) => el.shoe.style.removeProperty(k)); el.hero.style.setProperty('--px', 0); el.hero.style.setProperty('--py', 0); };

    el.stage.addEventListener('pointermove', (e) => {
      const r = el.stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      el.hero.style.setProperty('--px', x.toFixed(3));
      el.hero.style.setProperty('--py', y.toFixed(3));
      if (dragging) {
        dx = e.clientX - startX;
        set('--ry', `${clamp(dx * .22, -38, 38)}deg`);
        set('--tx', `${clamp(dx * .35, -120, 120)}px`);
        set('--rx', '0deg');
      } else if (e.pointerType === 'mouse') {
        set('--ry', `${(x * 20).toFixed(2)}deg`);
        set('--rx', `${(-y * 14).toFixed(2)}deg`);
        set('--tx', `${(x * 16).toFixed(1)}px`);
        set('--ty', `${(y * 10).toFixed(1)}px`);
        set('--s', '1.04');
      }
    });

    el.stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.arrow')) return;
      dragging = true; startX = e.clientX; dx = 0; pid = e.pointerId;
      el.stage.classList.add('is-dragging');
      try { el.stage.setPointerCapture(pid); } catch { /* noop */ }
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      el.stage.classList.remove('is-dragging');
      const moved = dx;
      reset();
      if (Math.abs(moved) > 90) (moved < 0 ? next : prev)();
    };
    el.stage.addEventListener('pointerup', end);
    el.stage.addEventListener('pointercancel', end);
    el.stage.addEventListener('pointerleave', () => { if (!dragging) reset(); });

    $('[data-next]').addEventListener('click', next);
    $('[data-prev]').addEventListener('click', prev);

    // Teclado: flechas cuando no se está escribiendo
    addEventListener('keydown', (e) => {
      if (el.modal.open || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });

    // Riel y catálogo
    el.rail.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-i]'); if (!b) return;
      const i = +b.dataset.i;
      if (i !== state.index) show(i, i > state.index ? 'next' : 'prev');
    });
    el.grid.addEventListener('click', (e) => {
      const card = e.target.closest('.card'); if (!card) return;
      e.preventDefault();
      const i = +card.dataset.i;
      el.hero.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (i !== state.index) show(i, i > state.index ? 'next' : 'prev');
    });
  }


  /* ------------------------------------------------------------------------
     6. FILTRO, TALLAS, TEMA
     ------------------------------------------------------------------------ */
  function setSeg(seg, value, attr) {
    const btns = $$(`[${attr}]`, seg);
    const idx = Math.max(0, btns.findIndex((b) => b.getAttribute(attr) === value));
    btns.forEach((b, i) => b.setAttribute('aria-checked', String(i === idx)));
    seg.style.setProperty('--idx', idx);
  }

  function setBrand(brand, { keepCurrent = true } = {}) {
    const keepId = keepCurrent && current() ? current().id : null;
    state.brand = brand;
    state.list = PRODUCTS.filter((p) => brand === 'all' || p.brand === brand);
    $$('[data-brand-seg]').forEach((s) => setSeg(s, brand, 'data-brand'));
    const at = state.list.findIndex((p) => p.id === keepId);
    renderRail();
    renderGrid();
    if (at >= 0) { state.index = at; markRail(at, 'auto'); el.current.textContent = pad(at + 1); }
    else { state.busy = false; show(0, 'next'); }
  }

  function setupControls() {
    $$('[data-brand-seg]').forEach((seg) => seg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-brand]'); if (!b || b.dataset.brand === state.brand) return;
      setBrand(b.dataset.brand, { keepCurrent: true });
    }));

    const unitSeg = $('[data-unit-seg]');
    unitSeg.addEventListener('click', (e) => {
      const b = e.target.closest('[data-unit]'); if (!b || b.dataset.unit === state.unit) return;
      state.unit = b.dataset.unit;
      setSeg(unitSeg, state.unit, 'data-unit');
      renderSizes(true);
    });
    el.sizes.addEventListener('click', (e) => {
      const b = e.target.closest('[data-s]'); if (!b) return;
      state.size = +b.dataset.s;
      $$('.size', el.sizes).forEach((s) => { s.classList.remove('is-flip'); s.setAttribute('aria-checked', String(+s.dataset.s === state.size)); });
      el.dockMeta.textContent = `EUR ${SIZES[state.size].EUR} · ${price(current().price)}`;
    });

    // Tema con revelado circular desde el botón (View Transitions, si existe)
    if (el.themeBtn) el.themeBtn.addEventListener('click', () => {
      const to = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      const apply = () => applyTheme(to);
      if (document.startViewTransition && !reduceMotion) {
        const r = el.themeBtn.getBoundingClientRect();
        document.documentElement.style.setProperty('--vt-x', `${r.left + r.width / 2}px`);
        document.documentElement.style.setProperty('--vt-y', `${r.top + r.height / 2}px`);
        document.startViewTransition(apply);
      } else apply();
    });
  }

  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    /* F7 Markett es solo oscuro: sin selector de tema */
  }


  /* ------------------------------------------------------------------------
     7. PEDIDO POR WHATSAPP
     ------------------------------------------------------------------------ */
  function setupOrder() {
    const m = el.modal;
    const open = () => {
      const p = current();
      $('[data-m-img]').src = src(p, true);
      $('[data-m-name]').textContent = `${name(p)} ${p.color}`;
      $('[data-m-size]').textContent = sizeText();
      $('[data-m-price]').textContent = `${price(p.price)} CLP`;
      if (typeof m.showModal === 'function') m.showModal(); else m.setAttribute('open', '');
      requestAnimationFrame(() => m.classList.add('is-open'));
      setTimeout(() => $('[data-name]').focus({ preventScroll: true }), 350);
    };
    const close = async () => {
      m.classList.remove('is-open');
      await wait(reduceMotion ? 0 : 300);
      if (m.open) m.close();
    };

    $$('[data-order]').forEach((b) => b.addEventListener('click', open));
    $('[data-close]').addEventListener('click', close);
    m.addEventListener('cancel', (e) => { e.preventDefault(); close(); });         // Esc
    m.addEventListener('click', (e) => { if (e.target === m) close(); });          // clic en el fondo

    $('[data-order-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      const p = current();
      const who = $('[data-name]').value.trim();
      const text =
        `${who ? `Hola ${CONFIG.handle}, mi nombre es *${who}*.` : `Hola ${CONFIG.handle}.`}\n\n` +
        `Me interesa encargar:\n` +
        `👟 *Modelo:* ${name(p)} – ${p.color}\n` +
        `📏 *Talla:* ${sizeText()}\n` +
        `💰 *Precio:* ${price(p.price)} CLP\n\n` +
        `¿Tienen disponibilidad y cómo coordinamos el pago y la entrega? ¡Gracias!`;
      window.open(`https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      close();
    });
  }


  /* ------------------------------------------------------------------------
     8. SCROLL: HEADER, REVEAL, BARRA MÓVIL
     ------------------------------------------------------------------------ */
  let revealIO;
  function observeReveals() {
    if (!revealIO) {
      revealIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    }
    $$('.reveal:not(.is-in)').forEach((n) => revealIO.observe(n));
  }

  function setupScroll() {
    const onScroll = () => el.header.classList.toggle('is-stuck', scrollY > 12);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });

    // La barra móvil aparece cuando el botón principal sale de la pantalla
    const io = new IntersectionObserver(([en]) => {
      const show = !en.isIntersecting;
      el.dock.classList.toggle('is-visible', show);
      el.dock.inert = !show;
    }, { threshold: 0 });
    io.observe(el.buy);
  }


  /* ------------------------------------------------------------------------
     9. ARRANQUE
     ------------------------------------------------------------------------ */
  // Textos de la tienda que dependen de los ajustes del panel
  function applySettings() {
    $$('[data-handle]').forEach((n) => { n.textContent = (n.dataset.prefix || '') + CONFIG.handle; });
    $$('[data-store-name]').forEach((n) => { n.textContent = CONFIG.storeName; });
    $$('[data-ig]').forEach((n) => { n.href = 'https://instagram.com/' + CONFIG.handle.replace(/^@/, ''); });
  }

  async function init() {
    // Tema inicial (oscuro por defecto)
    applyTheme('dark');

    // Modelo inicial desde el enlace (#id) o el primero
    // Catálogo: viene del panel (o del catálogo inicial si aún no se publicó nada)
    const data = await (window.LoucsCatalog ? window.LoucsCatalog.load() : Promise.resolve({ products: [], settings: {} }));
    Object.assign(CONFIG, data.settings || {});
    applySettings();
    PRODUCTS = data.products.filter((p) => p.visible !== false);
    if (!PRODUCTS.length) { document.body.classList.remove('is-loading'); document.body.classList.add('is-ready', 'is-empty');
      $('main').innerHTML = '<p style="min-height:60vh;display:grid;place-items:center;text-align:center;padding:2rem;opacity:.7">Estamos actualizando el catálogo.<br>Vuelve en un momento o escríbenos por Instagram.</p>'; return; }
    $$('[data-total]').forEach((n) => { n.textContent = pad(PRODUCTS.length); });

    const hash = decodeURIComponent(location.hash.slice(1));
    const start = Math.max(0, PRODUCTS.findIndex((p) => p.id === hash));
    state.list = PRODUCTS.slice();
    state.index = start;

    renderRail();
    renderGrid();
    renderSizes();
    setSeg($('[data-unit-seg]'), state.unit, 'data-unit');
    $$('[data-brand-seg]').forEach((s) => setSeg(s, 'all', 'data-brand'));
    setupStage();
    setupControls();
    setupOrder();
    setupScroll();
    observeReveals();

    // Primer modelo (sin animación), luego se retira el preloader
    const first = PRODUCTS[start];
    await preload(first);
    el.shoe.src = src(first);
    paint(first);
    markRail(start, 'auto');

    const minLoad = wait(reduceMotion ? 0 : 2600);
    const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, wait(1500)]) : Promise.resolve();
    await Promise.all([minLoad, fonts]);

    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    replayInfo(1500);
    preload(PRODUCTS[(start + 1) % PRODUCTS.length]);
  }

  init();
})();
