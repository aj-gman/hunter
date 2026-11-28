// Decorative "worn paper" noise: random coffee stains, fingerprints, scribbles, tape and
// weathering drawn UNDER the page text, tinted with the site accent. Purely visual.
(function () {
  var cs = document.currentScript;
  var base = (cs && cs.src ? cs.src.replace(/scripts\/noise\.js.*$/, '') : '/') + 'img/noise/';
  var COUNT = 23, ACCENT_TINT = true;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches) return;
  function seeded(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    var a = h >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  var css = document.createElement('style');
  css.textContent =
    '.noise-layer{position:absolute;left:0;top:0;width:100%;pointer-events:none;overflow:hidden;user-select:none}' +
    '.noise-layer img{position:absolute;height:auto;max-width:none;pointer-events:none;user-select:none}' +
    '.noise-layer.on-page{z-index:-1}' +
    '.noise-layer.on-board{height:100%;overflow:visible;z-index:0}';
  document.head.appendChild(css);
  function fill(layer, n, rnd, place) {
    var pool = [];
    for (var k = 1; k <= COUNT; k++) pool.push(k);
    for (var j = pool.length - 1; j > 0; j--) { var m = Math.floor(rnd() * (j + 1)), t = pool[j]; pool[j] = pool[m]; pool[m] = t; }
    for (var i = 0; i < n && i < pool.length; i++) {
      var img = new Image();
      img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.decoding = 'async'; img.loading = 'lazy'; img.draggable = false;
      // files are stored as <k>-nKK.webp (e.g. 1-n01.webp, 10-n10.webp)
      img.src = base + pool[i] + '-n' + (pool[i] < 10 ? '0' : '') + pool[i] + '.webp';
      place(img, rnd);
      layer.appendChild(img);
    }
  }
  function onBoard() {
    var board = document.getElementById('board');
    var layer = document.createElement('div');
    layer.className = 'noise-layer on-board'; layer.setAttribute('aria-hidden', 'true');
    board.insertBefore(layer, board.firstChild);
    var rnd = seeded('board:' + location.pathname);
    fill(layer, 12, rnd, function (img, r) {
      var w = 260 + r() * 300, flip = r() < 0.5 ? -1 : 1;
      img.style.width = w + 'px'; img.style.left = (r() * 100) + '%'; img.style.top = (r() * 100) + '%';
      img.style.opacity = (0.1 + r() * 0.12).toFixed(2);
      img.style.transform = 'translate(-50%,-50%) rotate(' + ((r() * 360) | 0) + 'deg) scaleX(' + flip + ')';
    });
  }
  function onPage() {
    var layer = document.createElement('div');
    layer.className = 'noise-layer on-page'; layer.setAttribute('aria-hidden', 'true');
    document.body.style.position = document.body.style.position || 'relative';
    document.body.insertBefore(layer, document.body.firstChild);
    var rnd = seeded('page:' + location.pathname);
    var H = Math.max(document.documentElement.scrollHeight, 800);
    layer.style.height = H + 'px';
    var n = Math.max(4, Math.min(14, Math.round(H / 650)));
    fill(layer, n, rnd, function (img, r) {
      var w = 220 + r() * 360, flip = r() < 0.5 ? -1 : 1;
      img.style.width = w + 'px'; img.style.left = (r() * 100 - 8) + '%'; img.style.top = (r() * (H - 200)) + 'px';
      img.style.opacity = (0.1 + r() * 0.12).toFixed(2);
      img.style.transform = 'rotate(' + ((r() * 360) | 0) + 'deg) scaleX(' + flip + ')';
    });
    if (window.ResizeObserver) {
      var last = H;
      new ResizeObserver(function () {
        var h = Math.max(document.documentElement.scrollHeight, 800);
        if (Math.abs(h - last) > 4) { last = h; layer.style.height = h + 'px'; }
      }).observe(document.body);
    }
  }
  function go() { if (document.getElementById('board') && document.getElementById('evidence-board')) onBoard(); else if (document.body) onPage(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
