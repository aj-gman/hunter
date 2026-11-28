// Evidence board landing page: pan/zoom, folder zoom, hover effects, pinned-card sway.
  let scale = 1;
  const board = document.getElementById('board');
  function apply() { board.style.transform = 'scale(' + scale + ')'; }
  function zoom(f) { scale = Math.min(3, Math.max(0.1, scale * f)); apply(); }
  const vp = document.getElementById('viewport');
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
  function fit() {
    const u = usableView(), vw = u.vw, vh = u.vh;
    scale = Math.min(vw / BBOX.w, vh / BBOX.h) * 0.94;
    scale = Math.min(3, Math.max(0.08, scale));
    apply();
    board.style.marginLeft = Math.max(0, (vw - BBOX.w * scale) / 2 - BBOX.x * scale) + 'px';
    board.style.marginTop = Math.max(0, (vh - BBOX.h * scale) / 2 - BBOX.y * scale) + 'px';
    vp.scrollLeft = Math.max(0, (BBOX.x + BBOX.w / 2) * scale + parseFloat(board.style.marginLeft) - vw / 2);
    vp.scrollTop = Math.max(0, (BBOX.y + BBOX.h / 2) * scale + parseFloat(board.style.marginTop) - vh / 2);
  }
  if (location.hash === '#zoom') { scale = 0.85; apply(); document.getElementById('viewport').scrollTo(650, 300); } else { fit(); }
  document.addEventListener('keydown', e => {
    if (e.key === '+') zoom(1.25); if (e.key === '-') zoom(0.8); if (e.key === '0') fit();
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
    const uv = usableView(), vw = uv.vw, vh = uv.vh;
    const bw = x1 - x0 + 180, bh = y1 - y0 + 180, bx = x0 - 90, by = y0 - 90;
    scale = Math.min(vw / bw, vh / bh) * 0.92;
    scale = Math.min(3, Math.max(0.15, scale));
    apply();
    board.style.marginLeft = Math.max(0, (vw - bw * scale) / 2 - bx * scale) + 'px';
    board.style.marginTop = Math.max(0, (vh - bh * scale) / 2 - by * scale) + 'px';
    const targetL = Math.max(0, (bx + bw / 2) * scale + parseFloat(board.style.marginLeft) - vw / 2);
    const targetT = Math.max(0, (by + bh / 2) * scale + parseFloat(board.style.marginTop) - vh / 2);
    vp.scrollLeft = targetL; vp.scrollTop = targetT;
    requestAnimationFrame(() => { vp.scrollLeft = targetL; vp.scrollTop = targetT; });
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
