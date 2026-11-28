// Evidence board landing page: pan/zoom, folder zoom, hover effects, pinned-card sway.
  // The board is an infinite-feeling canvas: #viewport fills the whole browser
  // window (and carries the cork-dark background), #board is the content layer
  // moved with translate + scale. Wheel zooms toward the cursor, drag pans.
  const board = document.getElementById('board');
  const vp = document.getElementById('viewport');
  const MIN = 0.08, MAX = 3;
  let scale = 1, tx = 0, ty = 0;
  function apply() {
    board.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
  }
  // Zoom to a new scale, keeping the board point under (px, py) fixed on screen.
  function zoomAt(f, px, py) {
    const next = Math.min(MAX, Math.max(MIN, scale * f));
    const k = next / scale;
    tx = px - (px - tx) * k;
    ty = py - (py - ty) * k;
    scale = next;
    apply();
  }
  function zoom(f) { zoomAt(f, vp.clientWidth / 2, vp.clientHeight / 2); }
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
  // Responsive spread: the generated layout is a fixed ~1.2:1 composition. On a
  // wider (or taller) window we move each folder's cluster apart as a rigid
  // group, so the pages fill the window while every folder keeps its tight
  // internal arrangement. Clusters only ever move away from the top-left, so
  // nothing slides under the masthead. Wires are re-anchored to the moved cards.
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
  const groupCentroid = {};
  (function () {
    const acc = {};
    cardEls.forEach(c => {
      const g = c.dataset.group, a = acc[g] || (acc[g] = { x: 0, y: 0, n: 0 });
      a.x += +c.dataset.ox; a.y += +c.dataset.oy; a.n++;
    });
    Object.keys(acc).forEach(g => { groupCentroid[g] = [acc[g].x / acc[g].n, acc[g].y / acc[g].n]; });
  })();
  const gKeys = Object.keys(groupCentroid);
  const gMinX = Math.min.apply(null, gKeys.map(g => groupCentroid[g][0]));
  const gMaxX = Math.max.apply(null, gKeys.map(g => groupCentroid[g][0]));
  const gMinY = Math.min.apply(null, gKeys.map(g => groupCentroid[g][1]));
  const gMaxY = Math.max.apply(null, gKeys.map(g => groupCentroid[g][1]));
  // Place the folder clusters evenly along one axis (never closer than they
  // were in the generated layout), keeping their position on the other axis.
  function spreadTargets(axis, newSpan) {
    const other = 1 - axis;
    const order = gKeys.slice().sort((a, b) =>
      groupCentroid[a][axis] - groupCentroid[b][axis] || groupCentroid[a][other] - groupCentroid[b][other]);
    const start = groupCentroid[order[0]][axis];
    const t = {};
    order.forEach((g, i) => {
      const even = start + (i / (order.length - 1)) * newSpan;
      const minPos = i ? t[order[i - 1]] + (groupCentroid[g][axis] - groupCentroid[order[i - 1]][axis]) : start;
      t[g] = Math.max(even, minPos);
    });
    return t;
  }
  function spread(R) {
    let axis = -1, targets = null;
    if (gKeys.length > 1) {
      const wt = BBOX.h * R, ht = BBOX.w / R;
      if (wt > BBOX.w && gMaxX > gMinX) { axis = 0; targets = spreadTargets(0, (gMaxX - gMinX) + (wt - BBOX.w)); }
      else if (ht > BBOX.h && gMaxY > gMinY) { axis = 1; targets = spreadTargets(1, (gMaxY - gMinY) + (ht - BBOX.h)); }
    }
    const sx = axis === 0 ? 2 : 1, sy = axis === 1 ? 2 : 1;
    const delta = g => {
      if (axis < 0) return [0, 0];
      const d = targets[g] - groupCentroid[g][axis];
      return axis === 0 ? [d, 0] : [0, d];
    };
    cardEls.forEach(c => {
      const d = delta(c.dataset.group);
      c.style.left = (+c.dataset.ox + d[0]) + 'px';
      c.style.top = (+c.dataset.oy + d[1]) + 'px';
    });
    labelEls.forEach(l => {
      const d = delta(l.dataset.g);
      l.style.left = (+l.dataset.ox + d[0]) + 'px';
      l.style.top = (+l.dataset.oy + d[1]) + 'px';
    });
    pathEls.forEach(p => {
      const o = p.__orig;
      if (!o) return;
      const da = delta(cardById[p.dataset.a].dataset.group), db = delta(cardById[p.dataset.b].dataset.group);
      const mx = (da[0] + db[0]) / 2, my = (da[1] + db[1]) / 2;
      p.setAttribute('d', 'M' + (o[0] + da[0]) + ',' + (o[1] + da[1]) + ' Q' + (o[2] + mx) + ',' + (o[3] + my) + ' ' + (o[4] + db[0]) + ',' + (o[5] + db[1]));
    });
    // content bounds measured from the moved elements (plus the masthead)
    let x0 = BBOX.x, y0 = BBOX.y, x1 = BBOX.x + BBOX.w, y1 = BBOX.y + BBOX.h;
    if (sx > 1 || sy > 1) {
      x0 = mast.offsetLeft - 30; y0 = mast.offsetTop - 30; x1 = -1e9; y1 = -1e9;
      cardEls.forEach(c => {
        const cx = parseFloat(c.style.left), cy = parseFloat(c.style.top);
        x1 = Math.max(x1, cx + c.offsetWidth / 2 + 30); y1 = Math.max(y1, cy + c.offsetHeight / 2 + 30);
      });
      labelEls.forEach(l => {
        const cx = parseFloat(l.style.left), cy = parseFloat(l.style.top);
        x1 = Math.max(x1, cx + l.offsetWidth / 2 + 30); y1 = Math.max(y1, cy + l.offsetHeight / 2 + 30);
      });
      x1 = Math.max(x1, mast.offsetLeft + mast.offsetWidth + 30);
    }
    cur = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    const bd = Math.max(cur.x + cur.w, 0), bdy = Math.max(cur.y + cur.h, 0);
    board.style.width = Math.max(bd, +board.dataset.bw) + 'px';
    board.style.height = Math.max(bdy, +board.dataset.bh) + 'px';
  }
  let cur = BBOX;
  // Centre the board rectangle (bx, by, bw, bh) in the usable view.
  function showRect(bx, by, bw, bh, fill, minScale) {
    const u = usableView();
    scale = Math.min(MAX, Math.max(minScale, Math.min(u.vw / bw, u.vh / bh) * fill));
    tx = (u.vw - bw * scale) / 2 - bx * scale;
    ty = (u.vh - bh * scale) / 2 - by * scale;
    apply();
  }
  function fit() {
    const u = usableView();
    spread(u.vw / u.vh);
    showRect(cur.x, cur.y, cur.w, cur.h, 0.94, MIN);
  }
  if (location.hash === '#zoom') { scale = 0.85; tx = -650 * scale; ty = -300 * scale; apply(); } else { fit(); }
  let lastW = vp.clientWidth, lastH = vp.clientHeight, rzT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rzT);
    rzT = setTimeout(() => {
      const w = vp.clientWidth, h = vp.clientHeight;
      // ignore small height changes (mobile address bar); refit on real changes
      if (Math.abs(w - lastW) < 40 && Math.abs(h - lastH) < 150) return;
      lastW = w; lastH = h;
      if (getComputedStyle(document.getElementById('bigpic')).display === 'none') fit();
    }, 150);
  });
  // Web fonts change the legend's height; refit once they load unless the user already moved the view.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!touched && getComputedStyle(document.getElementById('bigpic')).display === 'none') fit(); });
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
  const strings = document.getElementById('strings');
  const cards = {};
  document.querySelectorAll('.card').forEach(c => cards[c.dataset.id] = c);
  // pinned-to-a-real-board feel: each card gets its own random sway noise on hover
  document.querySelectorAll('.card, .glabel').forEach(c => {
    c.style.setProperty('--sway', (0.5 + Math.random() * 1.6).toFixed(2) + 'deg');
    c.style.setProperty('--swaydur', (1.2 + Math.random() * 1.8).toFixed(2) + 's');
    c.style.setProperty('--swaydelay', (-Math.random() * 2).toFixed(2) + 's');
  });
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
    });
    c.addEventListener('mouseleave', () => {
      strings.classList.remove('dim');
      strings.querySelectorAll('.hot').forEach(p => p.classList.remove('hot'));
      Object.values(cards).forEach(k => k.classList.remove('dim'));
    });
  });
  function zoomFolder(g) {
    const inG = Object.values(cards).filter(c => c.dataset.group === g);
    if (!inG.length) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    inG.forEach(c => {
      const cx = parseFloat(c.style.left), cy = parseFloat(c.style.top);
      const w = c.offsetWidth, h = c.offsetHeight;
      x0 = Math.min(x0, cx - w / 2); x1 = Math.max(x1, cx + w / 2);
      y0 = Math.min(y0, cy - h / 2); y1 = Math.max(y1, cy + h / 2);
    });
    document.getElementById('bigpic').style.display = 'block';
    showRect(x0 - 90, y0 - 90, x1 - x0 + 180, y1 - y0 + 180, 0.92, 0.15);
    const ids = new Set(inG.map(c => c.dataset.id));
    Object.values(cards).forEach(c => c.classList.toggle('faded', !ids.has(c.dataset.id)));
    document.querySelectorAll('.glabel').forEach(l => l.classList.toggle('faded', l.dataset.g !== g));
    strings.querySelectorAll('path').forEach(p => {
      p.classList.toggle('faded', !(ids.has(p.dataset.a) && ids.has(p.dataset.b)));
    });
  }
  function bigPicture() {
    Object.values(cards).forEach(c => c.classList.remove('faded'));
    document.querySelectorAll('.glabel').forEach(l => l.classList.remove('faded'));
    strings.querySelectorAll('.faded').forEach(p => p.classList.remove('faded'));
    document.getElementById('bigpic').style.display = 'none';
    fit();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') bigPicture(); });
