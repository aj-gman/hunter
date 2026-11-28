// Evidence board landing page: pan/zoom, folder tiles, folder zoom, hover effects, pinned-card sway.
  // The board is an infinite-feeling canvas: #viewport fills the whole browser
  // window (and carries the cork-dark background), #board is the content layer
  // moved with translate + scale. Wheel zooms toward the cursor, drag pans.
  const board = document.getElementById('board');
  const vp = document.getElementById('viewport');
  const MIN = 0.08, MAX = 3;
  let scale = 1, tx = 0, ty = 0;
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function apply() {
    board.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
  }
  // Camera animation: scale is interpolated in log space around the board point at
  // the screen centre, so zooms feel even instead of snapping. Any user input cancels it.
  let camAnim = 0;
  function cancelCam() { if (camAnim) { cancelAnimationFrame(camAnim); camAnim = 0; } }
  function camTo(ntx, nty, ns, dur) {
    cancelCam();
    if (reduceMotion || !dur) { scale = ns; tx = ntx; ty = nty; apply(); return; }
    const vw = vp.clientWidth, vh = vp.clientHeight;
    const c0x = (vw / 2 - tx) / scale, c0y = (vh / 2 - ty) / scale;
    const c1x = (vw / 2 - ntx) / ns, c1y = (vh / 2 - nty) / ns;
    const l0 = Math.log(scale), l1 = Math.log(ns), t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      scale = Math.exp(l0 + (l1 - l0) * e);
      tx = vw / 2 - (c0x + (c1x - c0x) * e) * scale;
      ty = vh / 2 - (c0y + (c1y - c0y) * e) * scale;
      apply();
      camAnim = p < 1 ? requestAnimationFrame(step) : 0;
    })(t0);
  }
  // Zoom to a new scale, keeping the board point under (px, py) fixed on screen.
  function zoomAt(f, px, py) {
    cancelCam();
    const next = Math.min(MAX, Math.max(MIN, scale * f));
    const k = next / scale;
    tx = px - (px - tx) * k;
    ty = py - (py - ty) * k;
    scale = next;
    apply();
  }
  function zoom(f) {
    const px = vp.clientWidth / 2, py = vp.clientHeight / 2;
    const next = Math.min(MAX, Math.max(MIN, scale * f)), k = next / scale;
    camTo(px - (px - tx) * k, py - (py - ty) * k, next, 260);
  }
  // Content bounds are generated into the board element at build time
  // (see generate-board.js); fallbacks keep zoom sane if they are missing.
  const BBOX = {
    x: +board.dataset.bx || 0,
    y: +board.dataset.by || 0,
    w: +board.dataset.bw || 1000,
    h: +board.dataset.bh || 1000,
  };
  // Usable view area: the viewport minus the fixed legend, controls and the
  // Bigger picture button, so fitted content can never slide under them.
  function usableView() {
    const vw = vp.clientWidth;
    let bottom = vp.clientHeight;
    ['legend', 'controls', 'bigpic'].forEach(id => {
      const el = document.getElementById(id);
      if (el && getComputedStyle(el).display !== 'none') {
        const r = el.getBoundingClientRect();
        if (r.height > 0) bottom = Math.min(bottom, r.top - 8);
      }
    });
    return { vw: vw, vh: Math.max(120, bottom) };
  }
  // Styles for folder tiles and the animated expand (kept here so the board stays one file).
  (function () {
    const st = document.createElement('style');
    st.textContent = [
      '#evidence-board svg#strings{overflow:visible;transition:opacity .25s}',
      '#evidence-board svg#strings.moving{opacity:0}',
      '#evidence-board svg#strings path.hid{display:none !important}',
      '#evidence-board #board.anim .card,#evidence-board #board.anim .glabel{transition:left .8s cubic-bezier(.4,0,.2,1),top .8s cubic-bezier(.4,0,.2,1),opacity .5s,transform .12s,box-shadow .12s}',
      '#evidence-board .card.collapsed{opacity:0 !important;pointer-events:none}',
      '#evidence-board #masthead{transition:opacity .3s}',
      '#evidence-board #masthead.faded{opacity:.06;pointer-events:none}',
      '#evidence-board .glabel.small{font-size:14px;padding:8px 18px 8px 12px;border-left-width:8px;letter-spacing:1.5px}',
      '#evidence-board .folder{position:absolute;width:14em;height:10em;transform:translate(-50%,-50%) rotate(var(--rot,0deg));z-index:6;cursor:pointer;transition:opacity .4s,transform .12s;filter:drop-shadow(0 .3em .5em rgba(0,0,0,.7));font-family:"Special Elite","Courier New",monospace}',
      '#evidence-board .folder:hover,#evidence-board .folder:focus-visible{transform:translate(-50%,-50%) rotate(0deg) scale(1.04);outline:none}',
      '#evidence-board .folder.open{opacity:0;pointer-events:none}',
      '#evidence-board .folder.dim{opacity:.16}',
      '#evidence-board .folder.faded{opacity:.06 !important;pointer-events:none}',
      '#evidence-board .folder .fb{position:absolute;border-radius:.3em .3em 0 0}',
      '#evidence-board .folder .fb::before{content:"";position:absolute;top:-.9em;height:.9em;width:30%;background:inherit;border-radius:.4em .4em 0 0}',
      '#evidence-board .folder .fb1{top:0;left:7%;width:92%;height:88%;background:#b98d52}',
      '#evidence-board .folder .fb1::before{left:62%}',
      '#evidence-board .folder .fb2{top:.9em;left:3.5%;width:92%;height:88%;background:#c49b5f}',
      '#evidence-board .folder .fb2::before{left:32%}',
      '#evidence-board .folder .fb3{top:1.8em;left:0;width:92%;height:86%;background:#cfa96c}',
      '#evidence-board .folder .fb3::before{left:4%}',
      '#evidence-board .folder .fsheets{position:absolute;left:8%;right:10%;top:1.6em;bottom:0}',
      '#evidence-board .folder .fsheets span{position:absolute;left:0;right:0;height:4.4em;background:#f1ead8;border-radius:.15em;padding:.3em .6em;font-size:.72em;line-height:1.3;color:#2c2318;box-shadow:0 0 .3em rgba(0,0,0,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#evidence-board .folder .ff{position:absolute;left:0;right:4%;bottom:0;height:5.2em;background:linear-gradient(170deg,#dcb878,#c79c5c);border-radius:.2em .6em .25em .25em;box-shadow:inset 0 .15em 0 rgba(255,255,255,.25)}',
      '#evidence-board .folder .ff::before{content:"";position:absolute;top:-.9em;left:52%;width:36%;height:.9em;background:#dcb878;border-radius:.4em .4em 0 0}',
      '#evidence-board .folder .ff b{position:absolute;left:.8em;bottom:.55em;font-weight:400;font-size:.8em;color:#4a3515;letter-spacing:.06em}'
    ].join('\n');
    document.head.appendChild(st);
  })();
  const cardEls = Array.prototype.slice.call(document.querySelectorAll('.card'));
  const labelEls = Array.prototype.slice.call(document.querySelectorAll('.glabel'));
  const mast = document.getElementById('masthead');
  const strEl = document.getElementById('strings');
  const pathEls = Array.prototype.slice.call(strEl.querySelectorAll('path'));
  cardEls.forEach(c => { c.dataset.ox = parseFloat(c.style.left); c.dataset.oy = parseFloat(c.style.top); });
  labelEls.forEach(l => { l.dataset.ox = parseFloat(l.style.left); l.dataset.oy = parseFloat(l.style.top); });
  const cardById = {};
  cardEls.forEach(c => { cardById[c.dataset.id] = c; });
  pathEls.forEach(p => {
    const n = (p.getAttribute('d').match(/-?\d+(\.\d+)?/g) || []).map(Number);
    if (n.length === 6) p.__orig = n;
  });
  // Folder model. A folder with more than 5 files, and every sub-folder, is drawn as a
  // manila folder tile showing its file edges; its files stay hidden until it is opened.
  // Sub-folders stay visible as smaller tiles beneath their top-level folder.
  const G = {};
  const grp = k => G[k] || (G[k] = { key: k, cards: [], label: null, root: k, sub: false, tile: false, collapsed: false, cx: 0, cy: 0, ex: 0, ey: 0, dx: 0, dy: 0, el: null });
  cardEls.forEach(c => grp(c.dataset.group).cards.push(c));
  labelEls.forEach(l => { grp(l.dataset.g).label = l; });
  const keys = Object.keys(G);
  keys.forEach(k => {
    let best = null;
    keys.forEach(o => { if (o !== k && k.indexOf(o + '/') === 0 && (!best || o.length > best.length)) best = o; });
    G[k].parentKey = best;
  });
  keys.forEach(k => { let r = k; while (G[r].parentKey) r = G[r].parentKey; G[k].root = r; G[k].sub = r !== k; });
  keys.forEach(k => { G[k].kids = []; G[k].depth = 0; for (let q = G[k].parentKey; q; q = G[q].parentKey) G[k].depth++; });
  keys.forEach(k => { if (G[k].parentKey) G[G[k].parentKey].kids.push(k); });
  keys.forEach(k => { const g = G[k]; g.tile = g.sub || g.cards.length > 5; g.collapsed = g.tile; });
  const TW = 280, TH = 200, UGAP = 64, SGAP = 44, SUBW = 900;
  const sf = g => Math.pow(0.78, g.depth);
  function hsh(k, n) { let h = 2166136261 ^ n; for (let i = 0; i < k.length; i++) { h = Math.imul(h ^ k.charCodeAt(i), 16777619); } return ((h >>> 0) % 1000) / 1000; }
  function tileDims(g) {
    return g.sub ? { w: 168 * sf(g), h: 120 * sf(g), top: 22 * sf(g), rw: 172 * sf(g), rh: 148 * sf(g) } : { w: TW, h: TH, top: 31, rw: TW, rh: 237 };
  }
  function cardTitle(c) { const t = c.querySelector('.dttl,.rttl,.sttl,.cap'); return t ? t.textContent.trim() : ''; }
  keys.forEach(k => {
    const g = G[k];
    if (!g.tile) return;
    const d = tileDims(g), el = document.createElement('div');
    el.className = 'folder'; el.dataset.g = k; el.tabIndex = 0; el.setAttribute('role', 'button');
    el.style.fontSize = (g.sub ? 12 * sf(g) : 20) + 'px';
    el.style.setProperty('--rot', (g.sub ? (hsh(k, 1) - 0.5) * 7 : -0.8) + 'deg');
    ['fb fb1', 'fb fb2', 'fb fb3'].forEach(cl => { const i = document.createElement('i'); i.className = cl; el.appendChild(i); });
    const sh = document.createElement('span'); sh.className = 'fsheets';
    const titles = g.cards.map(cardTitle).filter(Boolean).slice(0, g.sub ? 3 : 4);
    titles.forEach((t, i) => {
      const sp = document.createElement('span');
      sp.textContent = t; sp.style.top = (i * 0.95) + 'em'; sp.style.transform = 'rotate(' + (i % 2 ? 1.2 : -1.2) + 'deg)';
      sh.appendChild(sp);
    });
    el.appendChild(sh);
    const ff = document.createElement('span'); ff.className = 'ff';
    const nsub = g.kids.length;
    const b = document.createElement('b');
    b.textContent = g.cards.length + (g.cards.length === 1 ? ' file' : ' files') + (nsub ? ' + ' + nsub + (nsub === 1 ? ' folder' : ' folders') : '');
    ff.appendChild(b); el.appendChild(ff);
    const name = (g.label ? g.label.textContent.trim() : k.split('/').pop());
    el.setAttribute('aria-label', 'Open folder ' + name);
    el.addEventListener('click', () => zoomFolder(k));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoomFolder(k); } });
    board.appendChild(el);
    g.el = el;
  });
  const mastOx = parseFloat(getComputedStyle(mast).left) || 0, mastOy = parseFloat(getComputedStyle(mast).top) || 0;
  // Original (generated) bounds of one folder's files plus its label.
  function clusterRect(g) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    g.cards.forEach(c => { const x = +c.dataset.ox, y = +c.dataset.oy, hw = c.offsetWidth / 2 + 10, hh = c.offsetHeight / 2 + 10; x0 = Math.min(x0, x - hw); y0 = Math.min(y0, y - hh); x1 = Math.max(x1, x + hw); y1 = Math.max(y1, y + hh); });
    if (g.label) { const l = g.label, x = +l.dataset.ox, y = +l.dataset.oy, hw = l.offsetWidth / 2 + 6, hh = l.offsetHeight / 2 + 6; x0 = Math.min(x0, x - hw); y0 = Math.min(y0, y - hh); x1 = Math.max(x1, x + hw); y1 = Math.max(y1, y + hh); }
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 };
  }
  const strings = document.getElementById('strings');
  let motionT = 0;
  function motion() {
    if (reduceMotion) return;
    board.classList.add('anim'); strings.classList.add('moving');
    clearTimeout(motionT);
    motionT = setTimeout(() => { board.classList.remove('anim'); strings.classList.remove('moving'); }, 900);
  }
  // Folder-to-sub-folder threads (thin dashed strings), so the hierarchy reads on the board.
  const SVGNS = 'http://www.w3.org/2000/svg';
  const threads = [];
  keys.forEach(k => {
    if (!G[k].parentKey) return;
    const ln = document.createElementNS(SVGNS, 'line');
    ln.setAttribute('stroke', '#c9a45c'); ln.setAttribute('stroke-width', '2.2'); ln.setAttribute('stroke-dasharray', '7 6'); ln.setAttribute('stroke-linecap', 'round'); ln.setAttribute('opacity', '.75');
    strEl.insertBefore(ln, strEl.firstChild);
    threads.push({ ln: ln, k: k });
  });
  function anchorOf(g) {
    if (g.tile) return { x: g.cx, y: g.cy };
    const c = clusterRect(g); return { x: (c.x0 + c.x1) / 2 + g.dx, y: c.y1 + g.dy - 20 };
  }
  function applyThreads() {
    threads.forEach(t => {
      const g = G[t.k], p = G[g.parentKey], a = anchorOf(p), b = anchorOf(g);
      const open = keys.some(q => G[q].tile && !G[q].collapsed);
      t.ln.style.display = open ? 'none' : '';
      t.ln.setAttribute('x1', a.x); t.ln.setAttribute('y1', a.y); t.ln.setAttribute('x2', b.x); t.ln.setAttribute('y2', b.y);
    });
  }
  function applyWires() {
    applyThreads();
    pathEls.forEach(p => {
      const o = p.__orig;
      if (!o) return;
      const a = cardById[p.dataset.a], b = cardById[p.dataset.b], ga = G[a.dataset.group];
      p.classList.toggle('hid', ga === G[b.dataset.group] && ga.tile && ga.collapsed);
      const ax = parseFloat(a.style.left), ay = parseFloat(a.style.top), bx = parseFloat(b.style.left), by = parseFloat(b.style.top);
      const cx = (ax + bx) / 2 + (o[2] - (o[0] + o[4]) / 2), cy = (ay + by) / 2 + (o[3] - (o[1] + o[5]) / 2);
      p.setAttribute('d', 'M' + ax + ',' + ay + ' Q' + cx + ',' + cy + ' ' + bx + ',' + by);
    });
  }
  function applyPositions() {
    keys.forEach(k => {
      const g = G[k], d = tileDims(g), hid = g.tile && g.collapsed;
      g.cards.forEach(c => {
        let x, y;
        if (g.tile) { if (g.collapsed) { x = g.cx; y = g.cy; } else { x = +c.dataset.ox + g.ex; y = +c.dataset.oy + g.ey; } }
        else { x = +c.dataset.ox + g.dx; y = +c.dataset.oy + g.dy; }
        c.style.left = x + 'px'; c.style.top = y + 'px';
        c.classList.toggle('collapsed', hid);
      });
      if (g.label) {
        const l = g.label; let x, y;
        if (g.tile) { if (g.collapsed) { x = g.cx; y = g.cy - d.h / 2 - 2; } else { x = +l.dataset.ox + g.ex; y = +l.dataset.oy + g.ey; } }
        else { x = +l.dataset.ox + g.dx; y = +l.dataset.oy + g.dy; }
        l.style.left = x + 'px'; l.style.top = y + 'px';
        l.classList.toggle('small', g.sub && hid);
        l.style.fontSize = (g.sub && hid) ? (14 * sf(g)) + 'px' : '';
      }
      if (g.el) { g.el.style.left = g.cx + 'px'; g.el.style.top = g.cy + 'px'; g.el.classList.toggle('open', !g.collapsed); }
    });
    applyWires();
  }
  // Opening a tile: its files fan out above the tile (bottom edges aligned).
  function openTile(g) {
    if (g.label) g.label.classList.remove('small');
    const cr = clusterRect(g), d = tileDims(g);
    g.ex = g.cx - (cr.x0 + cr.x1) / 2;
    g.ey = (g.cy + d.h / 2) - cr.y1;
    g.collapsed = false;
  }
  // Rigid packing: top-level folder units (folder or its files, plus sub-folder tiles
  // beneath) and the masthead are packed tightly into the window's shape.
  const GAP = 70, PAD = 40;
  function buildUnits() {
    const mr = { k: '__mast', w: mast.offsetWidth, h: mast.offsetHeight };
    const units = [];
    // Recursive unit: the folder (tile or its open files), then its immediate sub-folders beneath it.
    function unit(k) {
      const g = G[k];
      let rr;
      if (g.sub) rr = { w: 172 * sf(g), h: 148 * sf(g) };
      else if (g.tile) rr = { w: TW, h: 237 };
      else { const c = clusterRect(g); rr = { w: c.w, h: c.h, x0: c.x0, y0: c.y0 }; }
      const kids = g.kids.map(unit), rows = []; let row = [], rw = 0;
      kids.forEach(u => {
        if (row.length && rw + SGAP + u.w > SUBW) { rows.push({ items: row, w: rw, h: row.reduce((m, q) => Math.max(m, q.h), 0) }); row = []; rw = 0; }
        rw += (row.length ? SGAP : 0) + u.w; row.push(u);
      });
      if (row.length) rows.push({ items: row, w: rw, h: row.reduce((m, q) => Math.max(m, q.h), 0) });
      const sw = rows.reduce((m, r) => Math.max(m, r.w), 0), uw = Math.max(rr.w, sw);
      const rh = rows.reduce((t, r) => t + r.h, 0) + Math.max(0, rows.length - 1) * SGAP;
      return { k: k, w: uw, h: rr.h + (rows.length ? UGAP + rh : 0), rr: rr, rows: rows };
    }
    keys.filter(k => !G[k].sub).forEach(k => units.push(unit(k)));
    return { mr: mr, units: units };
  }
  function shelf(order, W) {
    let x = 0, y = 0, rowH = 0, usedW = 0, row = [];
    const rows = [];
    order.forEach(r => {
      if (x > 0 && x + r.w > W) { rows.push({ items: row, h: rowH, y: y }); y += rowH + GAP; x = 0; rowH = 0; row = []; }
      row.push({ r: r, x: x }); x += r.w + GAP; usedW = Math.max(usedW, x - GAP); rowH = Math.max(rowH, r.h);
    });
    rows.push({ items: row, h: rowH, y: y });
    return { rows: rows, w: usedW, h: y + rowH };
  }
  function permute(a, n, out, cap) {
    if (out.length > cap) return;
    if (n <= 1) { out.push(a.slice()); return; }
    for (let i = 0; i < n; i++) {
      permute(a, n - 1, out, cap);
      const j = n % 2 ? 0 : i, t = a[n - 1]; a[n - 1] = a[j]; a[j] = t;
    }
  }
  function place(r, nx, ny) {
    const g = G[r.k], rx = nx + (r.w - r.rr.w) / 2;
    if (g.sub) { const d = tileDims(g); g.cx = rx + d.rw / 2 + (hsh(r.k, 2) - 0.5) * 36; g.cy = ny + d.top + d.h / 2 + (hsh(r.k, 3) - 0.5) * 36; }
    else if (g.tile) { g.cx = rx + TW / 2; g.cy = ny + 31 + TH / 2; }
    else { g.dx = rx - r.rr.x0; g.dy = ny - r.rr.y0; }
    let y = ny + r.rr.h + UGAP;
    r.rows.forEach(rw => {
      let x = nx + (r.w - rw.w) / 2;
      rw.items.forEach(u => { place(u, x, y); x += u.w + SGAP; });
      y += rw.h + SGAP;
    });
  }
  function spread(vw, vh) {
    const bu = buildUnits(), mr = bu.mr, gr = bu.units;
    let orders = [];
    if (gr.length <= 6) permute(gr.slice(), gr.length, orders, 6000);
    else orders = [gr.slice().sort((a, b) => b.h - a.h)];
    orders = orders.map(o => [mr].concat(o));
    const all = [mr].concat(gr);
    const minW = Math.max.apply(null, all.map(r => r.w)), totW = all.reduce((s, r) => s + r.w + GAP, 0);
    let best = null;
    orders.forEach(o => {
      for (let W = minW; W <= totW; W += 40) {
        const L = shelf(o, W), sc = Math.min(vw / (L.w + 2 * PAD), vh / (L.h + 2 * PAD));
        if (!best || sc > best.sc + 1e-9) best = { sc: sc, L: L };
      }
    });
    best.L.rows.forEach(row => {
      const rwid = row.items[row.items.length - 1].x + row.items[row.items.length - 1].r.w;
      row.items.forEach(p => {
        const r = p.r, nx = PAD + p.x + (best.L.w - rwid) / 2, ny = PAD + row.y + (row.h - r.h) / 2;
        if (r.k === '__mast') { mast.style.left = (mastOx + nx - 0) + 'px'; mast.style.top = (mastOy + ny - 0) + 'px'; mast.style.left = nx + 'px'; mast.style.top = ny + 'px'; return; }
        place(r, nx, ny);
      });
    });
    applyPositions();
    cur = { x: 0, y: 0, w: best.L.w + 2 * PAD, h: best.L.h + 2 * PAD };
    board.style.width = Math.max(cur.w, 1) + 'px';
    board.style.height = Math.max(cur.h, 1) + 'px';
  }
  let cur = BBOX;
  // Centre the board rectangle (bx, by, bw, bh) in the usable view.
  function showRect(bx, by, bw, bh, fill, minScale, dur) {
    const u = usableView();
    const ns = Math.min(MAX, Math.max(minScale, Math.min(u.vw / bw, u.vh / bh) * fill));
    camTo((u.vw - bw * ns) / 2 - bx * ns, (u.vh - bh * ns) / 2 - by * ns, ns, dur || 0);
  }
  function bigpicShown() { return getComputedStyle(document.getElementById('bigpic')).display !== 'none'; }
  function fit(anim) {
    if (anim === undefined) anim = true;
    if (anim && bigpicShown()) { bigPicture(); return; }
    const u = usableView();
    spread(u.vw, u.vh);
    showRect(cur.x, cur.y, cur.w, cur.h, 0.98, MIN, anim ? 700 : 0);
  }
  if (location.hash === '#zoom') { scale = 0.85; tx = -650 * scale; ty = -300 * scale; apply(); } else { fit(false); }
  let lastW = vp.clientWidth, lastH = vp.clientHeight, rzT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rzT);
    rzT = setTimeout(() => {
      const w = vp.clientWidth, h = vp.clientHeight;
      // ignore small height changes (mobile address bar); refit on real changes
      if (Math.abs(w - lastW) < 40 && Math.abs(h - lastH) < 150) return;
      lastW = w; lastH = h;
      if (!bigpicShown()) fit(false);
    }, 150);
  });
  // Web fonts change the legend's height; refit once they load unless the user already moved the view.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!touched && !bigpicShown()) fit(false); });
  // Mouse wheel / trackpad zoom toward the cursor (pinch on a trackpad arrives as ctrl+wheel).
  let touched = false;
  vp.addEventListener('wheel', e => {
    e.preventDefault(); touched = true;
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16; else if (e.deltaMode === 2) dy *= 400;
    const f = Math.exp(-Math.max(-120, Math.min(120, dy)) * (e.ctrlKey ? 0.01 : 0.0015));
    zoomAt(f, e.clientX, e.clientY);
  }, { passive: false });
  // Drag to pan. A drag that moved more than a few pixels must not open a note.
  let drag = null, moved = false;
  vp.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    cancelCam();
    drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, id: e.pointerId };
    moved = false;
  });
  vp.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) > 5) { moved = true; vp.classList.add('panning'); try { vp.setPointerCapture(e.pointerId); } catch (_) {} }
    if (moved) { touched = true; tx = drag.tx + dx; ty = drag.ty + dy; apply(); }
  });
  function endDrag(e) {
    if (drag && e.pointerId === drag.id) { drag = null; vp.classList.remove('panning'); }
  }
  vp.addEventListener('dragstart', e => e.preventDefault());
  vp.addEventListener('pointerup', endDrag);
  vp.addEventListener('pointercancel', endDrag);
  vp.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  document.addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') zoom(1.25); if (e.key === '-') zoom(0.8); if (e.key === '0') fit();
  });
  function toggleAll(btn) {
    const s = document.getElementById('strings');
    s.classList.toggle('all');
    const strong = +s.dataset.strong || 0, total = +s.dataset.total || 0;
    btn.textContent = s.classList.contains('all') ? 'Strong ties only (' + strong + ')' : 'All wires (' + total + ')';
  }
  const cards = {};
  document.querySelectorAll('.card').forEach(c => cards[c.dataset.id] = c);
  const tileEls = Array.prototype.slice.call(document.querySelectorAll('.folder'));
  // pinned-to-a-real-board feel: each card gets its own random sway noise on hover
  document.querySelectorAll('.card, .glabel').forEach(c => {
    c.style.setProperty('--sway', (0.5 + Math.random() * 1.6).toFixed(2) + 'deg');
    c.style.setProperty('--swaydur', (1.2 + Math.random() * 1.8).toFixed(2) + 's');
    c.style.setProperty('--swaydelay', (-Math.random() * 2).toFixed(2) + 's');
  });
  function clearHover() {
    strings.classList.remove('dim');
    strings.querySelectorAll('.hot').forEach(p => p.classList.remove('hot'));
    Object.values(cards).forEach(k => k.classList.remove('dim'));
    tileEls.forEach(t => t.classList.remove('dim'));
  }
  document.querySelectorAll('.card').forEach(c => {
    c.addEventListener('mouseenter', () => {
      const id = c.dataset.id;
      strings.classList.add('dim');
      const linked = new Set([id]);
      strings.querySelectorAll('path').forEach(p => {
        if (p.dataset.a === id || p.dataset.b === id) {
          p.classList.add('hot');
          linked.add(p.dataset.a === id ? p.dataset.b : p.dataset.a);
        }
      });
      Object.values(cards).forEach(k => { if (!linked.has(k.dataset.id)) k.classList.add('dim'); });
      const lg = new Set(); linked.forEach(i => lg.add(cards[i].dataset.group));
      tileEls.forEach(t => { if (!lg.has(t.dataset.g)) t.classList.add('dim'); });
    });
    c.addEventListener('mouseleave', clearHover);
  });
  tileEls.forEach(t => {
    t.addEventListener('mouseenter', () => {
      const g = t.dataset.g, lg = new Set([g]);
      strings.classList.add('dim');
      strings.querySelectorAll('path').forEach(p => {
        const ga = cardById[p.dataset.a].dataset.group, gb = cardById[p.dataset.b].dataset.group;
        if ((ga === g || gb === g) && ga !== gb) { p.classList.add('hot'); lg.add(ga); lg.add(gb); }
      });
      tileEls.forEach(o => { if (!lg.has(o.dataset.g)) o.classList.add('dim'); });
    });
    t.addEventListener('mouseleave', clearHover);
  });
  function zoomFolder(g) {
    const grp0 = G[g];
    if (!grp0) return;
    // one folder open at a time; opening one closes the others
    keys.forEach(k => { if (k !== g && G[k].tile) G[k].collapsed = true; });
    if (grp0.tile && grp0.collapsed) openTile(grp0);
    motion();
    applyPositions();
    const vis = new Set([g]);
    G[g].kids.forEach(k => vis.add(k));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const grow = (cx, cy, w, h) => { x0 = Math.min(x0, cx - w / 2); x1 = Math.max(x1, cx + w / 2); y0 = Math.min(y0, cy - h / 2); y1 = Math.max(y1, cy + h / 2); };
    grp0.cards.forEach(c => grow(parseFloat(c.style.left), parseFloat(c.style.top), c.offsetWidth, c.offsetHeight));
    if (grp0.label) grow(parseFloat(grp0.label.style.left), parseFloat(grp0.label.style.top), grp0.label.offsetWidth, grp0.label.offsetHeight);
    vis.forEach(k => { if (k !== g) { const d = tileDims(G[k]); grow(G[k].cx, G[k].cy - 18, d.rw, d.h + 40); } });
    document.getElementById('bigpic').style.display = 'block';
    showRect(x0 - 90, y0 - 90, x1 - x0 + 180, y1 - y0 + 180, 0.92, 0.15, 900);
    Object.values(cards).forEach(c => c.classList.toggle('faded', c.dataset.group !== g));
    document.querySelectorAll('.glabel').forEach(l => l.classList.toggle('faded', !vis.has(l.dataset.g)));
    tileEls.forEach(t => t.classList.toggle('faded', !vis.has(t.dataset.g) && t.dataset.g !== g));
    mast.classList.add('faded');
    strings.querySelectorAll('path').forEach(p => {
      p.classList.toggle('faded', !(cardById[p.dataset.a].dataset.group === g && cardById[p.dataset.b].dataset.group === g));
    });
  }
  function bigPicture() {
    keys.forEach(k => { if (G[k].tile) G[k].collapsed = true; });
    motion();
    Object.values(cards).forEach(c => c.classList.remove('faded'));
    document.querySelectorAll('.glabel').forEach(l => l.classList.remove('faded'));
    tileEls.forEach(t => t.classList.remove('faded'));
    mast.classList.remove('faded');
    strings.querySelectorAll('.faded').forEach(p => p.classList.remove('faded'));
    document.getElementById('bigpic').style.display = 'none';
    fit(true);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') bigPicture(); });
