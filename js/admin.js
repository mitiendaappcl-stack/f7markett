/* ==========================================================================
   PANEL DE ADMINISTRACIÓN — lógica
   --------------------------------------------------------------------------
   1. Utilidades            5. Lista (precio, visible, orden, quitar)
   2. Estado y cambios      6. Formulario de zapatilla
   3. Login                 7. Procesado de fotos (fondo, tamaño, color)
   4. Arranque              8. Ajustes y publicar
   ========================================================================== */
(() => {
  'use strict';
  const C = window.LoucsCatalog;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------------------------------------------------------------- 1. UTILIDADES */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const fmtPrice = (n) => (n || n === 0) ? Number(n).toLocaleString('es-CL') : '';
  const parsePrice = (s) => parseInt(String(s).replace(/\D/g, ''), 10) || 0;
  const nameOf = (p) => (p.lines || []).filter(Boolean).join(' ');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const thumbSrc = (p) => p.img ? (p.thumb || p.img) : (window.__IMG?.[p.file + '-sm'] || `img/${p.file}-sm.webp`);

  let toastTimer;
  function toast(msg, bad = false) {
    const t = $('[data-toast]'); t.textContent = msg; t.classList.toggle('is-bad', bad); t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 3200);
  }
  function confirmDlg(title, text, yes = 'Quitar') {
    const d = $('[data-dlg-confirm]');
    $('[data-confirm-title]').textContent = title; $('[data-confirm-text]').textContent = text; $('[data-confirm-yes]').textContent = yes;
    return new Promise((res) => { d.returnValue = ''; d.addEventListener('close', () => res(d.returnValue === 'yes'), { once: true }); d.showModal(); });
  }
  const show = (name) => $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== name; });

  /* ---------------------------------------------------------------- 2. ESTADO */
  const S = { server: null, draft: null, brand: 'all', q: '', editing: null, photo: null, newIds: new Set() };

  const byId = (list, id) => list.find((p) => p.id === id);
  function changes() {
    // Cuenta cuántas cosas cambiaron respecto de lo publicado
    const a = S.server.products, b = S.draft.products;
    let n = 0;
    b.forEach((p, i) => {
      const o = byId(a, p.id);
      if (!o) n++; else if (JSON.stringify(o) !== JSON.stringify(p)) n++;
      else if (a.findIndex((x) => x.id === p.id) !== i) n += 0; // el orden se cuenta abajo
    });
    n += a.filter((p) => !byId(b, p.id)).length;
    const orderA = a.filter((p) => byId(b, p.id)).map((p) => p.id).join();
    const orderB = b.filter((p) => byId(a, p.id)).map((p) => p.id).join();
    if (orderA !== orderB) n++;
    if (JSON.stringify(S.server.settings) !== JSON.stringify(S.draft.settings)) n++;
    return n;
  }
  function refreshBar() {
    const n = changes();
    $('[data-publish]').hidden = n === 0;
    $('[data-dirty-count]').textContent = n === 1 ? '1 cambio' : `${n} cambios`;
    const total = S.draft.products.length, vis = S.draft.products.filter((p) => p.visible !== false).length;
    $('[data-summary]').textContent = `${total} en total · ${vis} visibles en la tienda`;
  }

  /* ---------------------------------------------------------------- 3. LOGIN */
  function setupLogin() {
    const real = C.auth.real();
    $('[data-email-field]').hidden = !real;
    $('[data-reset]').hidden = !real;
    $('[data-login-hint]').textContent = real ? 'Entra con tu correo y contraseña.' : 'Modo demo: la contraseña por defecto es “f7”.';
    $('[data-login-form]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.currentTarget, err = $('[data-login-error]'), btn = $('button[type=submit]', f);
      err.hidden = true; btn.disabled = true;
      try { await C.auth.login(f.email.value.trim(), f.password.value); await enter(); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; }
      btn.disabled = false;
    });
    $('[data-reset]').addEventListener('click', async () => {
      const email = $('[data-login-form]').email.value.trim();
      if (!email) { const err = $('[data-login-error]'); err.textContent = 'Escribe tu correo arriba y vuelve a pulsar.'; err.hidden = false; return; }
      try { await C.auth.reset(email); toast('Te enviamos un correo para cambiar la contraseña'); } catch (ex) { toast(ex.message, true); }
    });
  }

  /* ---------------------------------------------------------------- 4. ARRANQUE */
  async function enter() {
    const data = await C.load();
    S.server = data; S.draft = clone(data); S.newIds.clear();
    $('[data-demo]').hidden = C.mode() !== 'local';
    show('app'); renderList(); refreshBar();
    $$('[data-store-name]').forEach((n) => { n.textContent = S.draft.settings.storeName; });
  }
  async function init() {
    setupLogin(); setupList(); setupForm(); setupSettings(); setupBar();
    $('[data-logout]').addEventListener('click', async () => {
      if (changes() && !(await confirmDlg('Hay cambios sin publicar', 'Si sales ahora se perderán.', 'Salir igual'))) return;
      await C.auth.logout(); show('login');
    });
    $('[data-reset-demo]').addEventListener('click', async () => {
      if (!(await confirmDlg('Restaurar catálogo inicial', 'Se borran los cambios guardados en este navegador.', 'Restaurar'))) return;
      C.resetDemo(); await enter(); toast('Catálogo restaurado');
    });
    window.addEventListener('beforeunload', (e) => { if (S.draft && changes()) { e.preventDefault(); e.returnValue = ''; } });
    let me = null; try { me = await C.auth.current(); } catch {}
    if (me) await enter(); else show('login');
  }

  /* ---------------------------------------------------------------- 5. LISTA */
  function visibleRows() {
    const q = S.q.trim().toLowerCase();
    return S.draft.products.filter((p) => (S.brand === 'all' || p.brand === S.brand) &&
      (!q || (nameOf(p) + ' ' + p.color).toLowerCase().includes(q)));
  }
  function renderList() {
    const list = $('[data-list]'), rows = visibleRows();
    const canMove = S.brand === 'all' && !S.q.trim();
    const all = S.draft.products;
    list.innerHTML = rows.map((p, i) => {
      const idx = all.indexOf(p), orig = byId(S.server.products, p.id);
      const isNew = !orig, changed = orig && JSON.stringify(orig) !== JSON.stringify(p);
      return `<li class="row${p.visible === false ? ' is-hidden' : ''}${isNew ? ' is-new' : changed ? ' is-changed' : ''}" data-id="${esc(p.id)}" style="--i:${i}">
        <div class="row__order">
          <button type="button" data-up aria-label="Subir" ${!canMove || idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" data-down aria-label="Bajar" ${!canMove || idx === all.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <img class="row__img" src="${esc(thumbSrc(p))}" alt="" loading="lazy">
        <div class="row__info"><b>${esc(nameOf(p))}</b>
          <span>${isNew ? '<i class="chip chip--new">Nueva</i>' : ''}<i class="chip">${p.brand === 'jordan' ? 'Jordan' : 'Nike'}</i>${esc(p.color)}</span></div>
        <label class="price"><span>$</span><input inputmode="numeric" data-price value="${fmtPrice(p.price)}" aria-label="Precio de ${esc(nameOf(p))}"></label>
        <label class="switch"><input type="checkbox" data-visible ${p.visible !== false ? 'checked' : ''}><i></i><span>${p.visible !== false ? 'En tienda' : 'Oculta'}</span></label>
        <div class="row__btns">
          <button class="pill" type="button" data-edit>Editar</button>
          <button class="x" type="button" data-remove aria-label="Quitar ${esc(nameOf(p))}">✕</button>
        </div>
      </li>`;
    }).join('');
    $('[data-empty]').hidden = rows.length > 0;
  }
  function setupList() {
    const list = $('[data-list]');
    list.addEventListener('input', (e) => {
      const inp = e.target.closest('[data-price]'); if (!inp) return;
      const p = byId(S.draft.products, inp.closest('.row').dataset.id);
      const caret = inp.selectionStart, before = inp.value.length;
      p.price = parsePrice(inp.value); inp.value = fmtPrice(p.price) === '0' ? '' : fmtPrice(p.price);
      const pos = Math.max(0, caret + inp.value.length - before); inp.setSelectionRange(pos, pos);
      markRow(inp.closest('.row'), p); refreshBar();
    });
    list.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-price]')) e.target.blur(); });
    list.addEventListener('change', (e) => {
      const sw = e.target.closest('[data-visible]'); if (!sw) return;
      const row = sw.closest('.row'), p = byId(S.draft.products, row.dataset.id);
      p.visible = sw.checked; row.classList.toggle('is-hidden', !sw.checked);
      $('span:last-child', sw.closest('.switch')).textContent = sw.checked ? 'En tienda' : 'Oculta';
      markRow(row, p); refreshBar();
    });
    list.addEventListener('click', async (e) => {
      const row = e.target.closest('.row'); if (!row) return;
      const id = row.dataset.id, all = S.draft.products, i = all.findIndex((p) => p.id === id);
      if (e.target.closest('[data-up]') && i > 0) { [all[i - 1], all[i]] = [all[i], all[i - 1]]; moved(id); }
      else if (e.target.closest('[data-down]') && i < all.length - 1) { [all[i + 1], all[i]] = [all[i], all[i + 1]]; moved(id); }
      else if (e.target.closest('[data-edit]')) openForm(all[i]);
      else if (e.target.closest('[data-remove]')) {
        const ok = await confirmDlg(`¿Quitar ${nameOf(all[i])}?`, 'Desaparece de la tienda cuando publiques. Si te equivocas, pulsa “Descartar”.');
        if (!ok) return;
        row.classList.add('is-leaving');
        setTimeout(() => { S.draft.products = S.draft.products.filter((p) => p.id !== id); S.newIds.delete(id); renderList(); refreshBar(); }, 260);
      }
    });
    $('[data-add]').addEventListener('click', () => openForm(null));
    $('[data-search]').addEventListener('input', (e) => { S.q = e.target.value; renderList(); });
    $('[data-seg]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-brand]'); if (!b) return;
      S.brand = b.dataset.brand; $$('[data-brand]', e.currentTarget).forEach((x) => x.setAttribute('aria-pressed', x === b));
      renderList();
    });
  }
  function markRow(row, p) {
    const orig = byId(S.server.products, p.id);
    row.classList.toggle('is-changed', !!orig && JSON.stringify(orig) !== JSON.stringify(p));
  }
  function moved(id) {
    renderList(); refreshBar();
    const r = $(`.row[data-id="${CSS.escape(id)}"]`); if (r) { r.style.animation = 'none'; r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }

  /* ---------------------------------------------------------------- 6. FORMULARIO */
  const dlg = () => $('[data-dlg-product]');
  function setupForm() {
    const d = dlg(), f = $('[data-product-form]', d);
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    f.price.addEventListener('input', () => { const n = parsePrice(f.price.value); f.price.value = n ? fmtPrice(n) : ''; });
    $('[data-file]', d).addEventListener('change', (e) => { const file = e.target.files[0]; if (file) loadPhoto(file); });
    const drop = $('[data-drop]', d);
    ['dragover', 'dragenter'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => { const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) loadPhoto(file); });
    $('[data-bg-seg]', d).addEventListener('click', (e) => {
      const b = e.target.closest('[data-bg]'); if (!b || !S.photo) return;
      S.photo.mode = b.dataset.bg; syncBgSeg(); renderPhoto();
    });
    f.addEventListener('submit', (e) => { e.preventDefault(); saveProduct(); });
  }
  function syncBgSeg() {
    $$('[data-bg]', dlg()).forEach((b) => b.setAttribute('aria-pressed', S.photo && b.dataset.bg === S.photo.mode));
    const note = { none: 'Se usará la foto tal cual.', flat: 'Ideal para fondos lisos (blanco, gris…).', ai: 'Funciona con cualquier fondo. La primera vez tarda unos segundos.' };
    $('[data-bg-note]', dlg()).textContent = S.photo ? (S.photo.hasAlpha ? 'Esta foto ya tiene fondo transparente.' : note[S.photo.mode]) : '';
  }
  function openForm(p) {
    const d = dlg(), f = $('[data-product-form]', d);
    S.editing = p ? p.id : null; S.photo = null;
    f.reset(); $('[data-product-error]', d).hidden = true;
    $$('.is-bad', f).forEach((x) => x.classList.remove('is-bad'));
    $('[data-dlg-title]', d).textContent = p ? 'Editar zapatilla' : 'Agregar zapatilla';
    const prev = $('[data-preview]', d);
    if (p) {
      f.brand.value = p.brand; f.name.value = (p.lines || [])[0] || ''; f.detail.value = (p.lines || [])[1] || '';
      f.color.value = p.color || ''; f.price.value = fmtPrice(p.price); f.desc.value = p.desc || ''; f.accent.value = p.accent || '#9b5cff';
      prev.src = p.img || (window.__IMG?.[p.file] || `img/${p.file}.webp`);
    }
    prev.hidden = !p; $('[data-photo-empty]', d).hidden = !!p; $('[data-bg-opts]', d).hidden = true;
    d.showModal();
  }
  async function loadPhoto(file) {
    const d = dlg(), drop = $('[data-drop]', d);
    drop.classList.add('is-busy');
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const info = analyze(bmp);
      S.photo = { bmp, file, mode: info.hasAlpha ? 'none' : info.flat ? 'flat' : 'ai', hasAlpha: info.hasAlpha, result: null };
      $('[data-bg-opts]', d).hidden = false;
      $('[data-file]', d).value = '';
      syncBgSeg(); await renderPhoto();
    } catch (e) { showError('No pude leer esa foto. Prueba con JPG o PNG.'); }
    drop.classList.remove('is-busy');
  }
  async function renderPhoto() {
    const d = dlg(), drop = $('[data-drop]', d), P = S.photo; if (!P) return;
    drop.classList.add('is-busy');
    try {
      P.result = await processPhoto(P);
      const prev = $('[data-preview]', d); prev.src = URL.createObjectURL(P.result.hero); prev.hidden = false;
      $('[data-photo-empty]', d).hidden = true;
      if (!dlg().querySelector('[name=accent]').dataset.touched) dlg().querySelector('[name=accent]').value = P.result.accent;
    } catch (e) {
      showError(e.message || 'No se pudo procesar la foto.');
      if (P.mode === 'ai') { P.mode = 'flat'; syncBgSeg(); try { P.result = await processPhoto(P); } catch {} }
    }
    drop.classList.remove('is-busy');
  }
  function showError(msg) { const e = $('[data-product-error]', dlg()); e.textContent = msg; e.hidden = false; }

  async function saveProduct() {
    const d = dlg(), f = $('[data-product-form]', d), btn = $('[data-product-save]', d);
    $('[data-product-error]', d).hidden = true;
    const name = f.name.value.trim(), color = f.color.value.trim(), price = parsePrice(f.price.value);
    $$('.is-bad', f).forEach((x) => x.classList.remove('is-bad'));
    const bad = [];
    if (!name) bad.push(f.name); if (!color) bad.push(f.color); if (!price) bad.push(f.price);
    if (bad.length) { bad.forEach((x) => x.classList.add('is-bad')); bad[0].focus(); showError('Completa los campos marcados.'); return; }
    if (!S.editing && !(S.photo && S.photo.result)) { showError('Falta la foto de la zapatilla.'); return; }
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      let imgs = null;
      if (S.photo && S.photo.result) imgs = await C.saveImages(S.photo.result);
      const base = S.editing ? byId(S.draft.products, S.editing) : { id: slug(name + '-' + color) + '-' + Math.random().toString(36).slice(2, 6), visible: true };
      Object.assign(base, {
        brand: f.brand.value, lines: [name, f.detail.value.trim()].filter(Boolean), mark: name, color, price,
        accent: f.accent.value, desc: f.desc.value.trim(),
      });
      if (imgs) { base.img = imgs.img; base.thumb = imgs.thumb; delete base.file; }
      if (!S.editing) { S.draft.products.unshift(base); S.newIds.add(base.id); }   // lo nuevo va primero
      d.close(); renderList(); refreshBar();
      toast(S.editing ? 'Zapatilla actualizada (falta publicar)' : 'Agregada al inicio (falta publicar)');
    } catch (e) { showError(e.message || 'No se pudo guardar.'); }
    btn.disabled = false; btn.textContent = 'Guardar';
  }

  /* ---------------------------------------------------------------- 7. FOTOS */
  const W = 1200, H = 900;

  // Mira la foto: ¿ya es transparente? ¿el fondo es liso?
  function analyze(bmp) {
    const s = Math.min(1, 240 / Math.max(bmp.width, bmp.height));
    const c = new OffscreenCanvas(Math.max(1, Math.round(bmp.width * s)), Math.max(1, Math.round(bmp.height * s)));
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bmp, 0, 0, c.width, c.height);
    const { data, width: w, height: h } = x.getImageData(0, 0, c.width, c.height);
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 200) transparent++;
    const hasAlpha = transparent / (data.length / 4) > 0.02;
    const px = []; const add = (xx, yy) => { const i = (yy * w + xx) * 4; px.push([data[i], data[i + 1], data[i + 2]]); };
    for (let i = 0; i < w; i++) { add(i, 0); add(i, h - 1); } for (let j = 0; j < h; j++) { add(0, j); add(w - 1, j); }
    const m = [0, 1, 2].map((k) => px.reduce((a, p) => a + p[k], 0) / px.length);
    const sd = Math.sqrt(px.reduce((a, p) => a + (p[0] - m[0]) ** 2 + (p[1] - m[1]) ** 2 + (p[2] - m[2]) ** 2, 0) / px.length);
    return { hasAlpha, flat: sd < 28 };
  }

  // Quita un fondo liso: inunda desde los bordes con el color del fondo y conserva el objeto más grande
  function removeFlatBg(canvas) {
    const w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    // color de fondo = mediana del borde
    const samp = []; const take = (x, y) => { const i = (y * w + x) * 4; samp.push([d[i], d[i + 1], d[i + 2]]); };
    for (let x = 0; x < w; x += 3) { take(x, 0); take(x, h - 1); } for (let y = 0; y < h; y += 3) { take(0, y); take(w - 1, y); }
    const med = [0, 1, 2].map((k) => samp.map((p) => p[k]).sort((a, b) => a - b)[samp.length >> 1]);
    const TOL = 44 * 44;
    const isBg = (i) => (d[i] - med[0]) ** 2 + (d[i + 1] - med[1]) ** 2 + (d[i + 2] - med[2]) ** 2 < TOL;
    const bg = new Uint8Array(w * h), stack = [];
    const push = (p) => { if (!bg[p] && isBg(p * 4)) { bg[p] = 1; stack.push(p); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); } for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const p = stack.pop(), x = p % w;
      if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (p >= w) push(p - w); if (p < w * (h - 1)) push(p + w);
    }
    // objeto más grande (descarta restos de sombra sueltos)
    const lab = new Int32Array(w * h); let best = 0, bestN = 0, id = 0;
    for (let s = 0; s < w * h; s++) {
      if (bg[s] || lab[s]) continue; id++; let n = 0; const st = [s]; lab[s] = id;
      while (st.length) {
        const p = st.pop(); n++; const x = p % w;
        const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p < w * (h - 1) ? p + w : -1];
        for (const q of nb) if (q >= 0 && !bg[q] && !lab[q]) { lab[q] = id; st.push(q); }
      }
      if (n > bestN) { bestN = n; best = id; }
    }
    const keep = new Uint8Array(w * h); for (let p = 0; p < w * h; p++) keep[p] = lab[p] === best ? 1 : 0;
    // borde suave: 1px de erosión + alfa parcial en el contorno
    for (let p = 0; p < w * h; p++) {
      if (!keep[p]) { d[p * 4 + 3] = 0; continue; }
      const x = p % w; let out = 0;
      if (x > 0 && !keep[p - 1]) out++; if (x < w - 1 && !keep[p + 1]) out++; if (p >= w && !keep[p - w]) out++; if (p < w * (h - 1) && !keep[p + w]) out++;
      if (out) d[p * 4 + 3] = out >= 2 ? 0 : 120;
    }
    ctx.putImageData(img, 0, 0);
  }

  async function removeBgAI(file) {
    let mod;
    try { mod = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm'); }
    catch { throw new Error('No se pudo cargar el quitafondos con IA. Prueba “Quitar (liso)” o sube la foto ya sin fondo (PNG).'); }
    const fn = mod.removeBackground || mod.default;
    const blob = await fn(file, { output: { format: 'image/png' } });
    return createImageBitmap(blob);
  }

  async function processPhoto(P) {
    let bmp = P.bmp;
    if (P.mode === 'ai' && !P.hasAlpha) { if (!P.aiBmp) P.aiBmp = await removeBgAI(P.file); bmp = P.aiBmp; }
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const src = new OffscreenCanvas(Math.round(bmp.width * s), Math.round(bmp.height * s));
    src.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0, src.width, src.height);
    if (P.mode === 'flat' && !P.hasAlpha) removeFlatBg(src);

    // recorte al contenido visible
    const sx = src.getContext('2d', { willReadFrequently: true }), { data, width: w, height: h } = sx.getImageData(0, 0, src.width, src.height);
    let x0 = w, y0 = h, x1 = 0, y1 = 0, r = 0, g = 0, b = 0, wt = 0;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * 4; if (data[i + 3] < 40) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      const mx = Math.max(data[i], data[i + 1], data[i + 2]), mn = Math.min(data[i], data[i + 1], data[i + 2]), sat = (mx - mn) / (mx + 1);
      const k = sat * sat + 0.02; r += data[i] * k; g += data[i + 1] * k; b += data[i + 2] * k; wt += k;
    }
    if (x1 <= x0 || y1 <= y0) throw new Error('No se ve ninguna zapatilla en la foto.');
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, pad = 0.05;
    const sc = Math.min((W * (1 - 2 * pad)) / bw, (H * (1 - 2 * pad)) / bh);
    const out = new OffscreenCanvas(W, H), ox = out.getContext('2d');
    ox.imageSmoothingQuality = 'high';
    ox.drawImage(src, x0, y0, bw, bh, (W - bw * sc) / 2, (H - bh * sc) / 2, bw * sc, bh * sc);
    const th = new OffscreenCanvas(480, 360); const tx = th.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(out, 0, 0, 480, 360);
    const enc = (c, q) => c.convertToBlob({ type: 'image/webp', quality: q }).then((bl) => bl.type === 'image/webp' ? bl : c.convertToBlob({ type: 'image/png' }));
    const hex = '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v / wt))).toString(16).padStart(2, '0')).join('');
    return { hero: await enc(out, 0.86), thumb: await enc(th, 0.8), accent: hex };
  }
  // Si el usuario toca el selector de color, ya no lo pisamos con el automático
  document.addEventListener('input', (e) => { if (e.target.matches?.('[name=accent]')) e.target.dataset.touched = '1'; });
  document.addEventListener('click', (e) => { if (e.target.closest?.('[data-add],[data-edit]')) { const a = $('[name=accent]'); if (a) delete a.dataset.touched; } }, true);

  /* ---------------------------------------------------------------- 8. AJUSTES Y PUBLICAR */
  function setupSettings() {
    const d = $('[data-dlg-settings]'), f = $('[data-settings-form]', d), err = $('[data-settings-error]', d);
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    $('[data-open-settings]').addEventListener('click', () => {
      const s = S.draft.settings; f.storeName.value = s.storeName; f.handle.value = s.handle; f.phone.value = s.phone; err.hidden = true; d.showModal();
    });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = f.phone.value.replace(/\D/g, ''); let handle = f.handle.value.trim().replace(/\s/g, '');
      if (handle && !handle.startsWith('@')) handle = '@' + handle;
      if (!f.storeName.value.trim() || handle.length < 2) { err.textContent = 'Completa el nombre y el Instagram.'; err.hidden = false; return; }
      if (phone.length < 8 || phone.length > 15) { err.textContent = 'El WhatsApp debe tener entre 8 y 15 dígitos, con código de país.'; err.hidden = false; return; }
      S.draft.settings = { storeName: f.storeName.value.trim(), handle, phone };
      $$('[data-store-name]').forEach((n) => { n.textContent = S.draft.settings.storeName; });
      d.close(); refreshBar(); toast('Ajustes guardados (falta publicar)');
    });
  }
  function setupBar() {
    $('[data-discard]').addEventListener('click', async () => {
      if (!(await confirmDlg('¿Descartar los cambios?', 'Todo vuelve a como está publicado ahora.', 'Descartar'))) return;
      S.draft = clone(S.server); S.newIds.clear(); renderList(); refreshBar();
      $$('[data-store-name]').forEach((n) => { n.textContent = S.draft.settings.storeName; });
    });
    $('[data-publish-btn]').addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Publicando…';
      try {
        if (!S.draft.products.some((p) => p.visible !== false) && !(await confirmDlg('Tienda vacía', 'No hay ninguna zapatilla visible: los clientes no verán nada.', 'Publicar igual'))) throw 0;
        await C.save(S.draft);
        S.server = clone(S.draft); S.newIds.clear(); renderList(); refreshBar(); toast('✓ Publicado. La tienda ya está actualizada');
      } catch (ex) { if (ex) toast(ex.message || 'No se pudo publicar', true); }
      b.disabled = false; b.textContent = 'Publicar cambios';
    });
  }

  init();
})();
