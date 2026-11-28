// Evidence board home page: generates the board markup at build time from the
// published notes in src/site/notes. Runs on every build via the
// "evidence-board" transform in .eleventy.js, so adding, renaming, moving or
// deleting a published note updates cards, folders, wires and counts
// automatically. Deterministic: same notes in, same markup out.

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const matterOptions = require("./src/helpers/matterOptions");

const NOTES_ROOT = path.join(__dirname, "src/site/notes");
// Absolute card links, built the same way as the siteUrl filter in
// .eleventy.js: works whether SITE_BASE_URL already includes SITE_BASE_PATH
// (.env) or not (CI workflow).
const { normalizeBasePath } = require("./src/helpers/sitePath");
const BASE_PATH = normalizeBasePath() || "/hunter"; // matches pathPrefix in .eleventy.js
let SITE_ORIGIN = (process.env.SITE_BASE_URL || "https://aj-gman.github.io").replace(/\/+$/, "");
if (SITE_ORIGIN.endsWith(BASE_PATH)) SITE_ORIGIN = SITE_ORIGIN.slice(0, -BASE_PATH.length);
const SITE_BASE = SITE_ORIGIN + BASE_PATH;

// Display-name overrides for group folders; any other folder shows its own
// name in uppercase.
const GROUP_LABELS = {
  "Core/Systems/HTV": "HTV SYSTEMS",
};

// ---------- deterministic PRNG ----------
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- escaping ----------
function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
const norm = (s) => String(s).normalize("NFC").trim().toLowerCase();

// ---------- 1. scan notes ----------
function scanNotes() {
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) files.push(full);
    }
  })(NOTES_ROOT);
  files.sort();

  const notes = [];
  for (const full of files) {
    const rel = path.relative(NOTES_ROOT, full).split(path.sep).join("/");
    const parsed = matter(fs.readFileSync(full, "utf8"), matterOptions);
    const fm = parsed.data || {};
    if (fm["dg-publish"] !== true) continue;
    const tags = Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : [];
    if (tags.includes("gardenEntry")) continue; // the board itself is not a card
    const dgpath = fm["dg-path"] || rel;
    const noext = dgpath.replace(/\.md$/i, "");
    const title = noext.split("/").pop();
    // An explicit permalink wins. Without one, 11ty's default output URL for
    // these notes is /notes/<original relative path>/ (case and spaces kept).
    const relNoExt = rel.replace(/\.md$/i, "");
    const permalink = fm.permalink || "/notes/" + relNoExt + "/";

    const fmLinks = [];
    const props = fm["dg-note-properties"] || {};
    for (const [key, val] of Object.entries(props)) {
      const vals = Array.isArray(val) ? val : [val];
      for (const v of vals) {
        if (typeof v !== "string") continue;
        const re = /\[\[([^\[\]|#]+)/g;
        let m;
        while ((m = re.exec(v))) fmLinks.push([key, m[1].trim()]);
      }
    }
    const bodyLinks = [];
    const bre = /\[\[([^\[\]|#]+)(?:#[^\[\]|]*)?(?:\|[^\[\]]*)?\]\]/g;
    let bm;
    while ((bm = bre.exec(parsed.content))) {
      bodyLinks.push(bm[1].replace(/\\+$/, "").trim());
    }
    notes.push({
      rel,
      dgpath,
      title,
      permalink,
      fmLinks,
      bodyLinks,
      dir: rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "",
    });
  }
  return notes;
}

// ---------- 2. link graph ----------
function buildGraph(notes) {
  const byShort = new Map(); // norm title -> [indices]
  const byFull = new Map(); // norm path -> index
  notes.forEach((n, i) => {
    const key = norm(n.title);
    if (!byShort.has(key)) byShort.set(key, []);
    byShort.get(key).push(i);
    byFull.set(norm(n.dgpath.replace(/\.md$/i, "")), i);
  });
  function resolve(link) {
    const l = norm(link);
    if (byFull.has(l)) return byFull.get(l);
    const c = byShort.get(norm(l.split("/").pop()));
    return c && c.length === 1 ? c[0] : null;
  }

  const edgeW = new Map(); // "a|b" (a<b) -> count
  const edgeLabels = new Map(); // "a|b" -> Map(label -> count)
  const directed = new Map(); // i -> Set(j)
  function add(i, j, label) {
    if (i === null || j === null || i === j || i === undefined || j === undefined) return;
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    const k = a + "|" + b;
    edgeW.set(k, (edgeW.get(k) || 0) + 1);
    if (!edgeLabels.has(k)) edgeLabels.set(k, new Map());
    const lm = edgeLabels.get(k);
    lm.set(label, (lm.get(label) || 0) + 1);
    if (!directed.has(i)) directed.set(i, new Set());
    directed.get(i).add(j);
  }
  notes.forEach((n, i) => {
    n.fmLinks.forEach(([k, l]) => add(i, resolve(l), k));
    n.bodyLinks.forEach((l) => add(i, resolve(l), "mentioned"));
  });

  const edges = [];
  for (const [k, count] of edgeW) {
    const [a, b] = k.split("|").map(Number);
    const mutual =
      directed.get(a) && directed.get(a).has(b) && directed.get(b) && directed.get(b).has(a);
    const w = count + (mutual ? 1 : 0);
    const lm = edgeLabels.get(k);
    let label = "mentioned";
    let best = -1;
    for (const [l, c] of lm) if (c > best) { best = c; label = l; }
    edges.push({ a, b, w, label });
  }
  const deg = new Array(notes.length).fill(0);
  for (const e of edges) {
    deg[e.a] += e.w;
    deg[e.b] += e.w;
  }
  return { edges, deg };
}

// ---------- 3. groups (folders) ----------
// A note joins the folder it sits in. Sub-folders (e.g. "Mental Tactics" under
// "Tactics") stay their own groups so the board can show them under their parent.
function groupDirOf(relDir) {
  // Every folder is its own group; the board script nests a group under its nearest parent group.
  return relDir.split("/").filter(Boolean).join("/");
}
function groupLabel(dir) {
  if (GROUP_LABELS[dir]) return GROUP_LABELS[dir];
  if (!dir) return "NOTES";
  return dir.split("/").pop().toUpperCase();
}

// ---------- 4. layout ----------
const DIMS = {
  polaroid: [165, 205],
  "polaroid-hub": [200, 245],
  doc: [215, 150],
  "doc-hub": [250, 185],
  ruled: [200, 135],
  "ruled-hub": [235, 165],
  sticky: [165, 110],
};

function layoutBoard(nodes, edges, deg) {
  const rand = mulberry32(42);
  const N = nodes.length;

  // hub = highest-degree page; it gets the big polaroid
  let hub = -1;
  nodes.forEach((n, i) => {
    if (deg[i] >= 2 && (hub < 0 || deg[i] > deg[hub])) hub = i;
  });
  const hubGroup = hub >= 0 ? nodes[hub].group : null;

  const types = nodes.map((n, i) => {
    if (i === hub) return "polaroid-hub";
    if (deg[i] <= 1) return "sticky";
    if (hubGroup && n.group === hubGroup && deg[i] >= 3) return "doc";
    return "ruled";
  });
  const dims = types.map((t) => DIMS[t]);

  // group anchors: biggest folder gets the large left area, the rest stack in
  // a right-hand column, smallest on top
  const groupNames = [...new Set(nodes.map((n) => n.group))];
  const countOf = (g) => nodes.filter((n) => n.group === g).length;
  const bySizeDesc = [...groupNames].sort(
    (a, b) => countOf(b) - countOf(a) || a.localeCompare(b)
  );
  const sideGroups = bySizeDesc
    .slice(1)
    .sort((a, b) => countOf(a) - countOf(b) || a.localeCompare(b));
  const centers = {};
  const sizes = {};
  bySizeDesc.forEach((g, idx) => {
    if (idx === 0) {
      centers[g] = [750, 620];
      sizes[g] = [950, 950];
    } else {
      const k = sideGroups.indexOf(g);
      const n = countOf(g);
      centers[g] = [1400, 240 + k * 480];
      sizes[g] = [260 + 34 * n, 180 + 114 * n];
    }
  });

  const pos = nodes.map((n) => {
    const [cx, cy] = centers[n.group];
    const [w, h] = sizes[n.group];
    return [cx + (rand() * 2 - 1) * (w / 2), cy + (rand() * 2 - 1) * (h / 2)];
  });

  // force-directed pass: repulsion between cards, springs along wires,
  // gravity toward the folder anchor
  const iters = 2200;
  for (let it = 0; it < iters; it++) {
    const t = 1 - it / iters;
    const disp = pos.map(() => [0, 0]);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = pos[i][0] - pos[j][0];
        let dy = pos[i][1] - pos[j][1];
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          d2 = 1;
          dx = 0.5;
          dy = 0.5;
        }
        if (d2 > 810000) continue;
        const d = Math.sqrt(d2);
        const f = (1700.0 / d2) * d;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        disp[i][0] += fx;
        disp[i][1] += fy;
        disp[j][0] -= fx;
        disp[j][1] -= fy;
      }
    }
    for (const e of edges) {
      const dx = pos[e.b][0] - pos[e.a][0];
      const dy = pos[e.b][1] - pos[e.a][1];
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const rest = 200 - Math.min(e.w, 6) * 14;
      const f = (d - rest) * 0.012 * (1 + 0.35 * Math.min(e.w, 5));
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      disp[e.a][0] += fx;
      disp[e.a][1] += fy;
      disp[e.b][0] -= fx;
      disp[e.b][1] -= fy;
    }
    nodes.forEach((n, i) => {
      const [cx, cy] = centers[n.group];
      disp[i][0] += (cx - pos[i][0]) * 0.012;
      disp[i][1] += (cy - pos[i][1]) * 0.012;
    });
    const maxstep = 30 * t + 2;
    for (let i = 0; i < N; i++) {
      const [dx, dy] = disp[i];
      const l = Math.sqrt(dx * dx + dy * dy) || 1;
      const step = Math.min(l, maxstep);
      pos[i][0] += (dx / l) * step;
      pos[i][1] += (dy / l) * step;
      const [cx, cy] = centers[nodes[i].group];
      const [w, h] = sizes[nodes[i].group];
      pos[i][0] = Math.max(cx - w / 2 - 110, Math.min(cx + w / 2 + 110, pos[i][0]));
      pos[i][1] = Math.max(cy - h / 2 - 110, Math.min(cy + h / 2 + 110, pos[i][1]));
    }
  }

  // organic de-overlap: only separate deep collisions
  for (let iter = 0; iter < 500; iter++) {
    let moved = false;
    for (let i = 0; i < N; i++) {
      const [wi, hi] = dims[i];
      for (let j = i + 1; j < N; j++) {
        const [wj, hj] = dims[j];
        const dx = pos[j][0] - pos[i][0];
        const dy = pos[j][1] - pos[i][1];
        const ox = ((wi + wj) / 2) * 0.92 - Math.abs(dx);
        const oy = ((hi + hj) / 2) * 0.97 - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          moved = true;
          if (ox < oy) {
            const push = ox / 2 + 1;
            const s = dx >= 0 ? 1 : -1;
            pos[i][0] -= s * push;
            pos[j][0] += s * push;
          } else {
            const push = oy / 2 + 1;
            const s = dy >= 0 ? 1 : -1;
            pos[i][1] -= s * push;
            pos[j][1] += s * push;
          }
        }
      }
    }
    if (!moved) break;
  }

  // normalize to positive coordinates
  let minx = Infinity;
  let miny = Infinity;
  pos.forEach((p, i) => {
    minx = Math.min(minx, p[0] - dims[i][0] / 2);
    miny = Math.min(miny, p[1] - dims[i][1] / 2);
  });
  pos.forEach((p) => {
    p[0] -= minx - 150;
    p[1] -= miny - 240;
  });
  let W = 0;
  let H = 0;
  pos.forEach((p, i) => {
    W = Math.max(W, p[0] + dims[i][0] / 2);
    H = Math.max(H, p[1] + dims[i][1] / 2);
  });
  W += 150;
  H += 150;

  // keep each folder's pages tightly clustered (accepted draft: 0.42 pull
  // toward the folder centroid, then a declutter pass)
  const CLUSTER = 0.42;
  const cByGroup = {};
  nodes.forEach((n, i) => {
    (cByGroup[n.group] = cByGroup[n.group] || []).push(pos[i]);
  });
  const centroids = {};
  for (const [g, ps] of Object.entries(cByGroup)) {
    centroids[g] = [
      ps.reduce((s, p) => s + p[0], 0) / ps.length,
      ps.reduce((s, p) => s + p[1], 0) / ps.length,
    ];
  }
  nodes.forEach((n, i) => {
    const [cx, cy] = centroids[n.group];
    pos[i][0] = cx + (pos[i][0] - cx) * CLUSTER;
    pos[i][1] = cy + (pos[i][1] - cy) * CLUSTER;
  });
  for (let iter = 0; iter < 80; iter++) {
    let moved = false;
    for (const g of Object.keys(centroids)) {
      const idx = nodes.map((n, i) => (n.group === g ? i : -1)).filter((i) => i >= 0);
      for (let a = 0; a < idx.length; a++) {
        for (let b = a + 1; b < idx.length; b++) {
          const i = idx[a];
          const j = idx[b];
          const ox = (dims[i][0] + 18 + dims[j][0] + 18) / 2 - Math.abs(pos[j][0] - pos[i][0]);
          const oy = (dims[i][1] + 18 + dims[j][1] + 18) / 2 - Math.abs(pos[j][1] - pos[i][1]);
          if (ox > 0 && oy > 0) {
            moved = true;
            if (ox < oy) {
              const s = (ox / 2 + 1) * (pos[j][0] >= pos[i][0] ? 1 : -1);
              pos[i][0] -= s;
              pos[j][0] += s;
            } else {
              const s = (oy / 2 + 1) * (pos[j][1] >= pos[i][1] ? 1 : -1);
              pos[i][1] -= s;
              pos[j][1] += s;
            }
          }
        }
      }
    }
    if (!moved) break;
  }

  return { pos, W, H, types, dims, centers, hub };
}

// ---------- 5. markup ----------
const SIL =
  '<svg viewBox="0 0 100 100" class="sil"><circle cx="50" cy="34" r="18" fill="#3d3630"/>' +
  '<path d="M14 92 C14 62 34 56 50 56 C66 56 86 62 86 92 Z" fill="#3d3630"/></svg>';

function generateBoardMarkup() {
  const notes = scanNotes();
  if (!notes.length) return "";
  const { edges, deg } = buildGraph(notes);
  const nodes = notes.map((n, i) => ({
    id: i,
    title: n.title,
    permalink: n.permalink,
    group: groupDirOf(n.dir),
    deg: deg[i],
  }));
  const { pos, W, H, types, dims } = layoutBoard(nodes, edges, deg);
  const rand = mulberry32(7);

  function edgePath(x1, y1, x2, y2, sag) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d;
    const ny = dx / d;
    const off = sag * (0.15 * d) * (rand() > 0.5 ? 1 : -1) + 0.04 * d;
    const cx = mx + nx * off;
    const cy = my + ny * off + 0.03 * d;
    return `M${x1.toFixed(0)},${y1.toFixed(0)} Q${cx.toFixed(0)},${cy.toFixed(0)} ${x2.toFixed(0)},${y2.toFixed(0)}`;
  }

  const svg = [];
  for (const e of edges) {
    const [x1, y1] = pos[e.a];
    const [x2, y2] = pos[e.b];
    const width = 1.3 + Math.min(e.w, 6) * 0.9;
    const op = 0.32 + Math.min(e.w, 6) * 0.09;
    const d = edgePath(x1, y1, x2, y2, 0.2 + rand() * 0.4);
    const minor = e.w < 2 ? " minor" : "";
    svg.push(
      `<path class="str${minor}" data-a="${e.a}" data-b="${e.b}" d="${d}" stroke-width="${width.toFixed(1)}" opacity="${op.toFixed(2)}"/>`
    );
  }

  const top3 = new Set(
    nodes
      .map((n, i) => [i, n.deg])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 3)
      .map(([i]) => i)
  );

  const cards = [];
  nodes.forEach((n, i) => {
    const [x, y] = pos[i];
    const t = types[i];
    const [w, h] = dims[i];
    const rot = -6 + rand() * 12;
    const z = 2 + Math.floor(rand() * 5) + (t.includes("hub") ? 5 : 0);
    const pinCls = rand() < 0.35 ? "pin silver" : "pin";
    const url = `${SITE_BASE}${n.permalink}`;
    const common =
      `id="n${i}" data-id="${i}" data-group="${escHtml(n.group)}" href="${escHtml(url)}" target="_blank" rel="noopener" ` +
      `style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;--rot:${rot.toFixed(1)}deg;z-index:${z};width:${w}px;height:${h}px"`;
    const title = escHtml(n.title);
    let inner;
    let cls;
    if (t.startsWith("polaroid")) {
      inner =
        `<span class="${pinCls}"></span><span class="photo">${SIL}` +
        `<span class="init">${escHtml(n.title[0].toUpperCase())}</span></span>` +
        `<span class="cap">${title}</span>`;
      cls = "card polaroid" + (t.includes("hub") ? " hub" : "");
    } else if (t.startsWith("doc")) {
      let lines = "";
      for (let k = 0; k < 4; k++) {
        lines += `<span class="tl" style="width:${55 + Math.floor(rand() * 38)}%"></span>`;
      }
      const stamp = top3.has(i) ? '<span class="dstamp">CASE</span>' : "";
      inner = `<span class="${pinCls}"></span><span class="dttl">${title}</span>${lines}${stamp}`;
      cls = "card doc" + (t.includes("hub") ? " hub" : "");
    } else if (t.startsWith("ruled")) {
      inner = `<span class="${pinCls}"></span><span class="rttl">${title}</span>`;
      cls = "card ruled" + (t.includes("hub") ? " hub" : "");
    } else {
      inner = `<span class="tape"></span><span class="sttl">${title}</span>`;
      cls = "card sticky";
    }
    cards.push(`<a class="${cls}" ${common}>${inner}</a>`);
  });

  // folder badges: placed above each folder's cards, never overlapping cards,
  // the masthead, or each other
  const cardRects = nodes.map((n, i) => {
    const [x, y] = pos[i];
    const [w, h] = dims[i];
    return [x - w / 2 - 10, y - h / 2 - 10, w + 20, h + 20];
  });
  cardRects.push([140, 26, 760, 210]); // masthead exclusion zone

  function resolveLabel(lx, ly, bw, bh, obstacles) {
    for (let iter = 0; iter < 80; iter++) {
      let hit = null;
      for (const [rx, ry, rw, rh] of obstacles) {
        if (lx - bw / 2 < rx + rw && lx + bw / 2 > rx && ly - bh / 2 < ry + rh && ly + bh / 2 > ry) {
          hit = [rx, ry, rw, rh];
          break;
        }
      }
      if (!hit) return [lx, ly];
      ly = hit[1] - bh / 2 - 14;
    }
    return [lx, ly];
  }

  const groupOrder = [...new Set(nodes.map((n) => n.group))].sort(
    (a, b) =>
      nodes.filter((n) => n.group === b).length - nodes.filter((n) => n.group === a).length ||
      a.localeCompare(b)
  );
  const labels = [];
  const labelRects = [];
  for (const g of groupOrder) {
    const idxs = nodes.map((n, i) => (n.group === g ? i : -1)).filter((i) => i >= 0);
    if (!idxs.length) continue;
    const text = groupLabel(g);
    const bw = 11 * text.length + 56;
    const bh = 38;
    let ly = Math.min(...idxs.map((i) => pos[i][1] - dims[i][1] / 2)) - 44;
    let lx = idxs.reduce((s, i) => s + pos[i][0], 0) / idxs.length;
    [lx, ly] = resolveLabel(lx, ly, bw, bh, cardRects.concat(labelRects));
    labelRects.push([lx - bw / 2, ly - bh / 2, bw, bh]);
    const rot = -2.5 + rand() * 5;
    labels.push(
      `<div class="glabel" data-g="${escHtml(g)}" onclick="zoomFolder('${escJs(g)}')" title="Zoom into the ${escHtml(text)} folder" style="left:${lx.toFixed(0)}px;top:${ly.toFixed(0)}px;--rot:${rot.toFixed(1)}deg"><span class="pin silver"></span>${escHtml(text)}</div>`
    );
  }

  // occupied content bounds (cards + badges + masthead) for viewport centering
  const allRects = cardRects.concat(labelRects);
  const BX = Math.min(...allRects.map((r) => r[0])) - 30;
  const BY = Math.min(...allRects.map((r) => r[1])) - 30;
  const BW = Math.max(...allRects.map((r) => r[0] + r[2])) + 30 - BX;
  const BH = Math.max(...allRects.map((r) => r[1] + r[3])) + 30 - BY;

  const total = edges.length;
  const strong = edges.filter((e) => e.w >= 2).length;

  return `<div id="viewport"><div id="board" data-bx="${BX.toFixed(0)}" data-by="${BY.toFixed(0)}" data-bw="${BW.toFixed(0)}" data-bh="${BH.toFixed(0)}" style="width:${W.toFixed(0)}px;height:${H.toFixed(0)}px">
  <div id="masthead">
    <h1>THE BOARD</h1>
    <p>Every note in the case file, arranged by how the pages connect. Red strings link pages that reference each other; the thicker the string, the stronger the tie.</p>
    <div class="stamp">OPEN CASE</div>
  </div>
  <svg id="strings" class="all" data-strong="${strong}" data-total="${total}">${svg.join("")}</svg>
  ${labels.join("")}
  ${cards.join("")}
</div></div>
<div id="controls">
  <button onclick="zoom(1.25)">+</button>
  <button onclick="zoom(0.8)">−</button>
  <button onclick="fit()">Fit</button>
  <button onclick="toggleAll(this)">Strong ties only (${strong})</button>
</div>
<button id="bigpic" onclick="bigPicture()">Bigger picture</button>
<div id="legend"><b>${nodes.length} notes · ${total} links.</b> Hover a note to see only its wires. Click opens the page on the site. Wire thickness = link strength. All wires are shown on load; the button hides the weaker ones. Click a folder label to zoom into its pages.</div>`;
}

module.exports = { generateBoardMarkup };
