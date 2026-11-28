(function () {
  'use strict';
  var FORMAT = 'hunter-vigil-2e-sheet', VERSION = 1;
  var RECOVERY = 'hunter-sheet-recovery-v1';
  var ATTRS = [['Mental', ['Intelligence', 'Wits', 'Resolve']], ['Physical', ['Strength', 'Dexterity', 'Stamina']], ['Social', ['Presence', 'Manipulation', 'Composure']]];
  var SKILLS = [
    ['Mental', '-3 unskilled', ['Academics', 'Computer', 'Crafts', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science']],
    ['Physical', '-1 unskilled', ['Athletics', 'Brawl', 'Drive', 'Firearms', 'Larceny', 'Stealth', 'Survival', 'Weaponry']],
    ['Social', '-1 unskilled', ['Animal Ken', 'Empathy', 'Expression', 'Intimidation', 'Persuasion', 'Socialize', 'Streetwise', 'Subterfuge']]];
  var HEADER = [['name', 'Name'], ['virtue', 'Virtue'], ['cell', 'Cell'], ['player', 'Player'], ['vice', 'Vice'], ['compact', 'Compact'], ['chronicle', 'Chronicle'], ['concept', 'Concept'], ['conspiracy', 'Conspiracy']];
  var MERIT_N = 9, ASP_N = 3, COND_N = 5, TOUCH_N = 2, CODE_N = 3, ENDOW_N = 12, TAC_N = 8, WEAPON_N = 5, EQUIP_N = 6, SAFE_N = 4;
  var EXP_MERITS = ['Allies', 'Mentor', 'Alternate Identity', 'Resources', 'Contacts', 'Status', 'Fame', 'Other'];
  var DESC = [['age', 'Age'], ['dob', 'Date of Birth'], ['hair', 'Hair'], ['eyes', 'Eyes'], ['race', 'Race'], ['nationality', 'Nationality'], ['height', 'Height'], ['weight', 'Weight'], ['sex', 'Sex']];

  var state = {};
  function blank() {
    var s = { format: FORMAT, version: VERSION, header: {}, attributes: {}, skills: {}, merits: [], aspirations: [], conditions: [], touchstones: [], code: [],
      health: [], willpowerSpent: 0, willpowerRisked: false, integrity: { value: 7, notes: {} }, stats: {}, beats: 0, groupBeats: 0,
      endowments: [], tactics: [], weapons: [], armor: {}, expandedMerits: {}, equipment: [], safehouse: [], history: '', goals: '', description: {}, notes: '', cellChart: '', sketch: '' };
    ATTRS.forEach(function (g) { g[1].forEach(function (a) { s.attributes[a] = 1; }); });
    SKILLS.forEach(function (g) { g[2].forEach(function (k) { s.skills[k] = { dots: 0, spec: false, specialty: '' }; }); });
    fill(s.merits, MERIT_N, function () { return { name: '', dots: 0 }; });
    fill(s.aspirations, ASP_N, ''); fill(s.conditions, COND_N, ''); fill(s.touchstones, TOUCH_N, ''); fill(s.code, CODE_N, '');
    fill(s.endowments, ENDOW_N, function () { return { name: '', dots: 0 }; });
    fill(s.tactics, TAC_N, function () { return { name: '', pool: '', desc: '' }; });
    fill(s.weapons, WEAPON_N, function () { return { name: '', damage: '', range: '', clip: '', size: '', strength: '', cost: '' }; });
    fill(s.equipment, EQUIP_N, function () { return { name: '', durability: '', structure: '', size: '', cost: '', notes: '' }; });
    fill(s.safehouse, SAFE_N, function () { return { location: '', desc: '' }; });
    return s;
  }
  function fill(arr, n, v) { for (var i = 0; i < n; i++) arr.push(typeof v === 'function' ? v() : v); }
  function num(v, lo, hi) { v = parseInt(v, 10); if (isNaN(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }

  // Merge a loaded object onto a blank sheet so missing fields never break rendering.
  function validate(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('not a character object');
    if (d.format !== FORMAT) throw new Error('not a Hunter sheet file');
    if (typeof d.version !== 'number' || d.version > VERSION) throw new Error('file is from a newer sheet version');
    var s = blank();
    function str(v) { return typeof v === 'string' ? v : ''; }
    Object.keys(d.header || {}).forEach(function (k) { s.header[k] = str(d.header[k]); });
    Object.keys(s.attributes).forEach(function (k) { if (d.attributes) s.attributes[k] = num(d.attributes[k], 1, 5); });
    Object.keys(s.skills).forEach(function (k) { var x = d.skills && d.skills[k]; if (x) s.skills[k] = { dots: num(x.dots, 0, 5), spec: !!x.spec, specialty: str(x.specialty) }; });
    function list(key, shape) {
      if (!Array.isArray(d[key])) return;
      s[key].forEach(function (_, i) {
        var x = d[key][i]; if (x == null) return;
        if (typeof s[key][i] === 'string') s[key][i] = str(x);
        else Object.keys(s[key][i]).forEach(function (f) { s[key][i][f] = typeof s[key][i][f] === 'number' ? num(x[f], 0, 5) : str(x[f]); });
      });
    }
    ['merits', 'aspirations', 'conditions', 'touchstones', 'code', 'endowments', 'tactics', 'weapons', 'equipment', 'safehouse'].forEach(list);
    if (Array.isArray(d.health)) s.health = d.health.slice(0, 30).map(function (v) { return num(v, 0, 3); });
    s.willpowerSpent = num(d.willpowerSpent, 0, 20); s.willpowerRisked = !!d.willpowerRisked;
    if (d.integrity) { s.integrity.value = num(d.integrity.value, 0, 10); Object.keys(d.integrity.notes || {}).forEach(function (k) { s.integrity.notes[k] = str(d.integrity.notes[k]); }); }
    Object.keys(d.stats || {}).forEach(function (k) { s.stats[k] = str(d.stats[k]); });
    s.beats = num(d.beats, 0, 5); s.groupBeats = num(d.groupBeats, 0, 5);
    Object.keys(d.armor || {}).forEach(function (k) { s.armor[k] = str(d.armor[k]); });
    Object.keys(d.expandedMerits || {}).forEach(function (k) { s.expandedMerits[k] = str(d.expandedMerits[k]); });
    Object.keys(d.description || {}).forEach(function (k) { s.description[k] = str(d.description[k]); });
    function img(v) { return typeof v === 'string' && /^data:image\/png;base64,[A-Za-z0-9+\/=]*$/.test(v) && v.length <= 250000 ? v : ''; }
    s.cellChart = img(d.cellChart); s.sketch = img(d.sketch);
    s.history = str(d.history); s.goals = str(d.goals); s.notes = str(d.notes);
    return s;
  }

  // ---------- DOM helpers ----------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'class') e.className = attrs[k]; else if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function sec(title, kids, cls) { var s = el('section', { class: 'sec ' + (cls || '') }, [el('h2', { text: title })]); kids.forEach(function (k) { s.appendChild(k); }); return s; }
  function text(get, set, attrs) { var i = el('input', Object.assign({ type: 'text', autocomplete: 'off' }, attrs || {})); i.value = get() || ''; i.addEventListener('input', function () { set(i.value); changed(); }); return i; }
  function area(get, set, attrs) { var i = el('textarea', attrs || {}); i.value = get() || ''; i.addEventListener('input', function () { set(i.value); changed(); }); return i; }
  function dots(max, get, set, label) {
    var wrap = el('span', { class: 'dots', role: 'group', 'aria-label': label });
    for (var i = 1; i <= max; i++) (function (n) {
      var b = el('button', { type: 'button', class: 'dot', 'aria-label': label + ' ' + n, 'aria-pressed': 'false' });
      b.addEventListener('click', function () { set(get() === n ? n - 1 : n); paintDots(wrap, get()); changed(); });
      wrap.appendChild(b);
    })(i);
    paintDots(wrap, get()); return wrap;
  }
  function paintDots(wrap, v) { Array.prototype.forEach.call(wrap.children, function (b, i) { var on = i < v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
  function field(label, input) { var l = el('label', { class: 'f' }); l.appendChild(document.createTextNode(label)); l.appendChild(input); return l; }

  // ---------- derived values ----------
  function derived() {
    var a = state.attributes, sk = state.skills, size = num(state.stats.size, 1, 20) || 5;
    if (!state.stats.size) size = 5;
    return {
      size: size, health: a.Stamina + size, willpower: a.Resolve + a.Composure,
      defense: Math.min(a.Dexterity, a.Wits) + sk.Athletics.dots, init: a.Dexterity + a.Composure, speed: a.Strength + a.Dexterity + 5
    };
  }
  var refreshers = [];
  function refresh() { refreshers.forEach(function (f) { f(); }); }


  // Freehand drawing pad stored as a PNG data URL (replaces the PDF's blank Cell Chart and Character Sketch boxes).
  var W = 600, H = 420, MAXPAD = 240000;
  function pad(key, title) {
    var cv = el('canvas', { class: 'pad', width: W, height: H, 'aria-label': title + ' drawing area' });
    var ctx = cv.getContext('2d'); var color = '#e8e0d0', size = 3, erase = false, drawing = false, last = null, undo = [];
    function bg() { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#121615'; ctx.fillRect(0, 0, W, H); }
    function load(url, cb) { bg(); if (!url) { if (cb) cb(); return; } var im = new Image(); im.onload = function () { ctx.drawImage(im, 0, 0, W, H); if (cb) cb(); }; im.src = url; }
    function commit() {
      var url = blankPad() ? '' : cv.toDataURL('image/png');
      if (url.length > MAXPAD) { var u = undo.pop(); setStatus('That drawing is too detailed to save. Last stroke undone.', true); if (u) load(u); return; }
      state[key] = url; changed();
    }
    var empty = null;
    function blankPad() { var d = ctx.getImageData(0, 0, W, H).data; for (var i = 0; i < d.length; i += 4) if (d[i] !== 0x12 || d[i + 1] !== 0x16 || d[i + 2] !== 0x15) return false; return true; }
    function pos(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }
    cv.addEventListener('pointerdown', function (e) { drawing = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {} undo.push(cv.toDataURL()); if (undo.length > 20) undo.shift(); last = pos(e); stroke(last, last); e.preventDefault(); });
    cv.addEventListener('pointermove', function (e) { if (!drawing) return; var p = pos(e); stroke(last, p); last = p; });
    function end() { if (!drawing) return; drawing = false; commit(); }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    function stroke(a, b) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = erase ? size * 4 : size; ctx.strokeStyle = erase ? '#121615' : color; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0] + 0.01, b[1]); ctx.stroke(); }
    var tools = el('div', { class: 'padtools' });
    [['#e8e0d0', 'Chalk'], ['#7fa89b', 'Green'], ['#e08b83', 'Red'], ['#e8c36a', 'Yellow']].forEach(function (c) {
      var b = el('button', { type: 'button', class: 'swatch', 'aria-label': c[1] + ' pen', title: c[1] }); b.style.background = c[0];
      b.addEventListener('click', function () { color = c[0]; erase = false; }); tools.appendChild(b);
    });
    var er = el('button', { type: 'button', class: 'btn small', text: 'Eraser' }); er.addEventListener('click', function () { erase = true; }); tools.appendChild(er);
    var sz = el('input', { type: 'range', min: 1, max: 12, value: 3, 'aria-label': 'Pen size' }); sz.addEventListener('input', function () { size = +sz.value; }); tools.appendChild(sz);
    var un = el('button', { type: 'button', class: 'btn small', text: 'Undo' }); un.addEventListener('click', function () { var u = undo.pop(); if (u) load(u, commit); }); tools.appendChild(un);
    var cl = el('button', { type: 'button', class: 'btn small danger', text: 'Clear' }); cl.addEventListener('click', function () { if (!blankPad() && !window.confirm('Clear the ' + title.toLowerCase() + '?')) return; undo.push(cv.toDataURL()); load('', commit); }); tools.appendChild(cl);
    load(state[key]);
    return el('div', {}, [el('h3', { text: title }), tools, cv]);
  }

  // ---------- build ----------
  function build() {
    var root = document.getElementById('sheet'); root.textContent = ''; refreshers = [];
    // header
    var hdr = el('div', { class: 'grid hdr' });
    HEADER.forEach(function (h) { hdr.appendChild(field(h[1], text(function () { return state.header[h[0]]; }, function (v) { state.header[h[0]] = v; }))); });
    root.appendChild(sec('Hunter: The Vigil', [hdr]));

    // attributes
    var attr = el('div', { class: 'attr' });
    for (var r = 0; r < 3; r++) ATTRS.forEach(function (g) {
      var name = g[1][r];
      attr.appendChild(el('div', { class: 'row' }, [el('span', { class: 'nm', text: name }), dots(5, function () { return state.attributes[name]; }, function (v) { state.attributes[name] = Math.max(1, v); refresh(); }, name)]));
    });
    // dots() above passes a set that cannot repaint itself when clamped to 1; re-render attribute dots through refresh
    root.appendChild(sec('Attributes', [el('div', { class: 'sub', text: 'Columns: Mental, Physical, Social. Attributes 5/4/3.' }), attr]));

    // skills + other traits
    var skills = el('section', { class: 'sec' }, [el('h2', { text: 'Skills' })]);
    SKILLS.forEach(function (g) {
      skills.appendChild(el('h3', { text: g[0] + ' (' + g[1] + ')' }));
      g[2].forEach(function (k) {
        var cb = el('input', { type: 'checkbox', class: 'spec', 'aria-label': k + ' specialty' }); cb.checked = state.skills[k].spec;
        cb.addEventListener('change', function () { state.skills[k].spec = cb.checked; changed(); });
        skills.appendChild(el('div', { class: 'row' }, [cb, el('span', { class: 'nm', text: k }), dots(5, function () { return state.skills[k].dots; }, function (v) { state.skills[k].dots = v; }, k)]));
      });
    });
    skills.appendChild(el('div', { class: 'hint', text: 'Checkbox marks a Specialty. Skills 11/7/4 (+3 Specialties).' }));

    var other = el('section', { class: 'sec' }, [el('h2', { text: 'Other Traits' })]);
    other.appendChild(el('h3', { text: 'Merits (7 at creation)' }));
    state.merits.forEach(function (m, i) { other.appendChild(el('div', { class: 'row' }, [text(function () { return m.name; }, function (v) { m.name = v; }, { 'aria-label': 'Merit ' + (i + 1) }), dots(5, function () { return m.dots; }, function (v) { m.dots = v; }, 'Merit ' + (i + 1)) ])); });
    other.appendChild(el('h3', { text: 'Aspirations' }));
    state.aspirations.forEach(function (_, i) { other.appendChild(text(function () { return state.aspirations[i]; }, function (v) { state.aspirations[i] = v; }, { 'aria-label': 'Aspiration ' + (i + 1) })); });
    other.appendChild(el('h3', { text: 'Conditions' }));
    state.conditions.forEach(function (_, i) { other.appendChild(text(function () { return state.conditions[i]; }, function (v) { state.conditions[i] = v; }, { 'aria-label': 'Condition ' + (i + 1) })); });
    other.appendChild(el('h3', { text: 'Touchstones' }));
    state.touchstones.forEach(function (_, i) { other.appendChild(text(function () { return state.touchstones[i]; }, function (v) { state.touchstones[i] = v; }, { 'aria-label': 'Touchstone ' + (i + 1) })); });

    var right = el('section', { class: 'sec' }, [el('h2', { text: 'Condition' })]);
    // health
    right.appendChild(el('h3', { text: 'Health' }));
    var hb = el('div', { class: 'boxes' }); right.appendChild(hb);
    var GLYPH = ['', '/', 'X', '*'], NAMES = ['empty', 'bashing', 'lethal', 'aggravated'];
    function paintHealth() {
      var d = derived(); hb.textContent = '';
      while (state.health.length < d.health) state.health.push(0);
      for (var i = 0; i < d.health; i++) (function (i) {
        var b = el('button', { type: 'button', class: 'box s' + state.health[i], text: GLYPH[state.health[i]], 'aria-label': 'Health box ' + (i + 1) + ': ' + NAMES[state.health[i]] });
        b.addEventListener('click', function () { state.health[i] = (state.health[i] + 1) % 4; paintHealth(); changed(); });
        hb.appendChild(b);
      })(i);
    }
    refreshers.push(paintHealth);
    right.appendChild(el('div', { class: 'hint', text: 'Click a box: bashing /, lethal X, aggravated *.' }));
    // willpower
    right.appendChild(el('h3', { text: 'Willpower' }));
    var wd = el('div', { class: 'boxes' }); right.appendChild(wd);
    function paintWill() {
      var d = derived(); wd.textContent = ''; state.willpowerSpent = Math.min(state.willpowerSpent, d.willpower);
      for (var i = 0; i < d.willpower; i++) (function (i) {
        var spent = i >= d.willpower - state.willpowerSpent;
        var b = el('button', { type: 'button', class: 'box s1', text: spent ? '/' : '', 'aria-label': 'Willpower ' + (i + 1) + (spent ? ' spent' : ' available') });
        b.addEventListener('click', function () { state.willpowerSpent = spent ? d.willpower - i - 1 : d.willpower - i; paintWill(); changed(); });
        wd.appendChild(b);
      })(i);
    }
    refreshers.push(paintWill);
    var risk = el('input', { type: 'checkbox', class: 'spec', 'aria-label': 'Willpower risked' }); risk.checked = state.willpowerRisked; risk.addEventListener('change', function () { state.willpowerRisked = risk.checked; changed(); });
    right.appendChild(el('div', { class: 'row' }, [el('span', { class: 'nm', text: 'Risked' }), risk]));
    // integrity
    right.appendChild(el('h3', { text: 'Integrity' }));
    var integ = el('div', { class: 'integ' }); right.appendChild(integ);
    for (var n = 10; n >= 1; n--) (function (n) {
      var d = el('button', { type: 'button', class: 'dot', 'aria-label': 'Integrity ' + n });
      d.addEventListener('click', function () { state.integrity.value = state.integrity.value === n ? n - 1 : n; paintInteg(); changed(); });
      d.dataset.n = n;
      integ.appendChild(el('div', { class: 'row' }, [el('span', { class: 'n', text: n }), el('span', { class: 'dots' }, [d]), text(function () { return state.integrity.notes[n]; }, function (v) { state.integrity.notes[n] = v; }, { 'aria-label': 'Integrity ' + n + ' note' })]));
    })(n);
    function paintInteg() { Array.prototype.forEach.call(integ.querySelectorAll('.dot'), function (d) { var on = +d.dataset.n <= state.integrity.value; d.classList.toggle('on', on); d.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    paintInteg();
    // derived stats
    var der = el('div', { class: 'derived' }); right.appendChild(der);
    var STATS = [['size', 'Size', 'size'], ['speed', 'Speed', 'speed'], ['defense', 'Defense', 'defense'], ['armor', 'Armor', null], ['initiative', 'Initiative Mod', 'init'], ['experience', 'Experience', null]];
    var autos = {};
    STATS.forEach(function (s) {
      var inp = text(function () { return state.stats[s[0]]; }, function (v) { state.stats[s[0]] = v; if (s[0] === 'size') refresh(); }, {});
      var lab = field(s[1], inp);
      if (s[2]) { var a = el('span', { class: 'auto' }); lab.appendChild(a); autos[s[2]] = a; }
      der.appendChild(lab);
    });
    refreshers.push(function () { var d = derived(); autos.size.textContent = 'adult human: 5'; autos.speed.textContent = 'auto: ' + d.speed; autos.defense.textContent = 'auto: ' + d.defense; autos.init.textContent = 'auto: ' + d.init; });
    [['beats', 'Beats'], ['groupBeats', 'Group Beats']].forEach(function (b) {
      var wrap = el('div', { class: 'row' }, [el('span', { class: 'nm', text: b[1] })]);
      var bx = el('span', { class: 'boxes' }); wrap.appendChild(bx);
      function p() { bx.textContent = ''; for (var i = 1; i <= 5; i++) (function (i) { var x = el('button', { type: 'button', class: 'box s1', text: state[b[0]] >= i ? 'X' : '', 'aria-label': b[1] + ' ' + i }); x.addEventListener('click', function () { state[b[0]] = state[b[0]] === i ? i - 1 : i; p(); changed(); }); bx.appendChild(x); })(i); }
      p(); refreshers.push(p); right.appendChild(wrap);
    });
    right.appendChild(el('h3', { text: 'The Code' }));
    state.code.forEach(function (_, i) { right.appendChild(text(function () { return state.code[i]; }, function (v) { state.code[i] = v; }, { 'aria-label': 'Code line ' + (i + 1) })); });

    var cols = el('div', { class: 'cols' }, [skills, other, right]); root.appendChild(cols);
    root.appendChild(el('div', { class: 'derivnote', text: 'Health = Stamina + Size | Willpower = Resolve + Composure | Defense = lower of Dexterity or Wits + Athletics | Initiative Mod = Dexterity + Composure | Speed = Strength + Dexterity + 5 | Starting Integrity 7' }));

    // endowments
    var endow = el('div', { class: 'grid g3' });
    state.endowments.forEach(function (e, i) { endow.appendChild(el('div', { class: 'row' }, [text(function () { return e.name; }, function (v) { e.name = v; }, { 'aria-label': 'Endowment ' + (i + 1) }), dots(5, function () { return e.dots; }, function (v) { e.dots = v; }, 'Endowment ' + (i + 1))])); });
    root.appendChild(sec('Endowments', [endow]));

    // tactics
    var tac = el('div', { class: 'grid g2' });
    state.tactics.forEach(function (t, i) {
      tac.appendChild(el('div', { class: 'tac' }, [field('Name', text(function () { return t.name; }, function (v) { t.name = v; })), field('Dice Pool', text(function () { return t.pool; }, function (v) { t.pool = v; })), field('Description', area(function () { return t.desc; }, function (v) { t.desc = v; }))]));
    });
    root.appendChild(sec('Tactics', [tac]));

    // combat
    function table(cols, rows, keys) {
      var t = el('table', { class: 't' }); t.appendChild(el('thead', {}, [el('tr', {}, cols.map(function (c) { return el('th', { text: c }); }))]));
      var tb = el('tbody'); rows.forEach(function (r, ri) { tb.appendChild(el('tr', {}, keys.map(function (k, ci) { return el('td', {}, [text(function () { return r[k]; }, function (v) { r[k] = v; }, { 'aria-label': cols[ci] + ' row ' + (ri + 1) })]); }))); });
      t.appendChild(tb); return el('div', { class: 'tbl-wrap' }, [t]);
    }
    var armor = el('div', { class: 'grid g2' });
    ['rating', 'strength', 'defense', 'speed'].forEach(function (k) { armor.appendChild(field(k.charAt(0).toUpperCase() + k.slice(1), text(function () { return state.armor[k]; }, function (v) { state.armor[k] = v; }))); });
    var armorWrap = el('div', {}, [el('h3', { text: 'Armor' }), armor, field('Description', area(function () { return state.armor.desc; }, function (v) { state.armor.desc = v; }))]);
    root.appendChild(sec('Combat', [table(['Weapon/Attack', 'Damage', 'Range', 'Clip', 'Size', 'Strength', 'Cost'], state.weapons, ['name', 'damage', 'range', 'clip', 'size', 'strength', 'cost']), armorWrap]));

    // expanded merits
    var em = el('div', { class: 'grid g2' });
    EXP_MERITS.forEach(function (m) { em.appendChild(field(m, area(function () { return state.expandedMerits[m]; }, function (v) { state.expandedMerits[m] = v; }))); });
    root.appendChild(sec('Expanded Merits', [em]));

    root.appendChild(sec('Equipment', [table(['Name', 'Durability', 'Structure', 'Size', 'Cost', 'Notes'], state.equipment, ['name', 'durability', 'structure', 'size', 'cost', 'notes'])]));
    root.appendChild(sec('Safehouse', [table(['Location', 'Description'], state.safehouse, ['location', 'desc'])]));
    root.appendChild(sec('History', [area(function () { return state.history; }, function (v) { state.history = v; }, { rows: 8 })]));
    root.appendChild(sec('Goals', [area(function () { return state.goals; }, function (v) { state.goals = v; }, { rows: 4 })]));
    var desc = el('div', { class: 'grid g3' });
    DESC.forEach(function (d) { desc.appendChild(field(d[1], text(function () { return state.description[d[0]]; }, function (v) { state.description[d[0]] = v; }))); });
    desc.appendChild(field('Distinguishing Characteristics', area(function () { return state.description.distinguishing; }, function (v) { state.description.distinguishing = v; })));
    root.appendChild(sec('Description', [desc]));
    root.appendChild(sec('Visuals', [el('div', { class: 'grid g2' }, [pad('cellChart', 'Cell Chart'), pad('sketch', 'Character Sketch')])]));
    root.appendChild(sec('Notes', [area(function () { return state.notes; }, function (v) { state.notes = v; }, { rows: 6 })]));
    refresh();
  }

  // ---------- storage ----------
  var loadedId = null, loadedRevision = null, clean = '', busy = false, timer = null;
  var $ = function (id) { return document.getElementById(id); };
  function snap() { return JSON.stringify(state); }
  function dirty() { return clean !== snap(); }
  function setStatus(msg, err) { var s = $('io-status'); s.textContent = msg; s.className = err ? 'err' : ''; }
  function setClean(s) { clean = s || snap(); $('edit-status').textContent = 'No unsaved changes'; try { localStorage.removeItem(RECOVERY); } catch (e) {} }
  function changed() {
    if (!clean) return; $('edit-status').textContent = dirty() ? 'Unsaved changes' : 'No unsaved changes';
    clearTimeout(timer); timer = setTimeout(function () { if (!dirty()) return; try { localStorage.setItem(RECOVERY, JSON.stringify({ data: state, id: loadedId, revision: loadedRevision })); } catch (e) { $('edit-status').textContent = 'Unsaved changes (no recovery storage). Export JSON.'; } }, 250);
  }
  function mayReplace() { return !dirty() || window.confirm('Replace unsaved changes? Export JSON first if you need a backup.'); }
  window.addEventListener('beforeunload', function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  function slug(id) { return String(id || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, ''); }
  function apiUrl() { return window.HUNTER_API_BASE ? window.HUNTER_API_BASE.replace(/\/$/, '') + '/hunter-character' : ''; }

  var action = '';
  function openModal(a) {
    action = a; $('modal-title').textContent = a === 'load' ? 'Load Character' : 'Save Character';
    var cloud = $('m-cloud'); cloud.textContent = a === 'load' ? '\u2601 From Cloud' : '\u2601 To Cloud';
    cloud.disabled = !apiUrl(); cloud.title = apiUrl() ? '' : 'Cloud save is not set up yet';
    $('m-json').textContent = a === 'load' ? '\u25A3 From JSON' : '\u25A3 To JSON';
    $('modal').classList.add('on'); (apiUrl() ? cloud : $('m-json')).focus();
  }
  function closeModal() { $('modal').classList.remove('on'); }
  function exportJSON() {
    var nm = (state.header.name || 'hunter').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'hunter';
    var a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })), download: nm + '_hunter.json' });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
  }
  async function saveCloud(id) {
    if (busy) return; busy = true; setStatus('Saving...');
    try {
      var sent = snap(), exp = slug(id) === loadedId ? loadedRevision : null;
      var r = await fetch(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id, data: state, expectedRevision: exp }) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || 'Server error ' + r.status);
      loadedId = j.id || slug(id); loadedRevision = j.revision; setClean(sent); setStatus('Saved "' + loadedId + '" at ' + new Date().toLocaleTimeString());
    } catch (e) { setStatus('Save failed: ' + e.message, true); } finally { busy = false; changed(); }
  }
  async function loadCloud(id) {
    if (busy || !mayReplace()) return; busy = true; setStatus('Loading...');
    try {
      var r = await fetch(apiUrl() + '?id=' + encodeURIComponent(id));
      if (r.status === 404) { setStatus('No save found for "' + id + '"', true); return; }
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || 'Server error ' + r.status);
      state = validate(j.data); build(); loadedId = j.id || slug(id); loadedRevision = j.revision; setClean(); setStatus('Loaded "' + loadedId + '"');
    } catch (e) { setStatus('Load failed: ' + e.message, true); } finally { busy = false; }
  }
  $('btn-load').addEventListener('click', function () { openModal('load'); });
  $('btn-save').addEventListener('click', function () { openModal('save'); });
  $('btn-new').addEventListener('click', function () { if (!mayReplace()) return; state = blank(); build(); loadedId = null; loadedRevision = null; setClean(); setStatus(''); });
  $('m-cancel').addEventListener('click', closeModal);
  $('modal').addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  $('m-json').addEventListener('click', function () { var a = action; closeModal(); if (a === 'load') $('importFile').click(); else exportJSON(); });
  $('m-cloud').addEventListener('click', function () {
    var a = action; closeModal(); var id = window.prompt('Character ID:'); if (!id || !id.trim()) return;
    if (a === 'load') loadCloud(id.trim()); else saveCloud(id.trim());
  });
  $('importFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
    rd.onload = function (ev) {
      try { var s = validate(JSON.parse(ev.target.result)); if (!mayReplace()) return; state = s; build(); loadedId = null; loadedRevision = null; clean = ''; clean = JSON.stringify(blank()); changed(); setStatus('JSON loaded. Save to cloud or keep a JSON backup.'); }
      catch (err) { window.alert('Import failed: ' + err.message + '. Current character was kept.'); }
    };
    rd.readAsText(f); e.target.value = '';
  });

  // ---------- start ----------
  state = blank();
  try { var rec = JSON.parse(localStorage.getItem(RECOVERY) || 'null'); if (rec && rec.data) { state = validate(rec.data); loadedId = rec.id || null; loadedRevision = rec.revision || null; build(); clean = JSON.stringify(blank()); changed(); setStatus('Recovery draft restored. Check it, then save or export JSON.'); } else build(); }
  catch (e) { state = blank(); build(); }
  if (!clean) setClean();
  window.__hunterSheet = { get: function () { return state; }, validate: validate, blank: blank };
})();
