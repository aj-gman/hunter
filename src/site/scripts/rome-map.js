// Rome map. Published data lives in src/site/_data/romePins.json:
//   { "pins": [ {name, lat, lng, note?, link?, icon?} ], "areas": [ {name, color, points:[[lat,lng],...], note?, link?} ] }
// link must start with / or http(s):// (site-relative links need the /hunter/ prefix).
// icon: dot (default), star, skull, cross, eye, flag, house, warning, question, castle, crown, ghost, sword, drop, book.
// color: red, green, gold, blue, purple, grey.
// Local editor: open /hunter/map/?edit=1. Edits stay in this browser (localStorage) until
// exported; replace romePins.json with the exported file to publish.
(function () {
  var map = L.map("map", { center: [41.9028, 12.4964], zoom: 13, minZoom: 9, maxZoom: 18 });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '<a href="https://www.openstreetmap.org/fixthemap">Report a map issue</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(map);

  // Pin icons: Lucide (https://lucide.dev), ISC License, Copyright (c) 2026 Lucide Icons and Contributors.
  // Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby
  // granted, provided that the above copyright notice and this permission notice appear in all copies.
  // THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL
  // IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  // INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN
  // AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  // PERFORMANCE OF THIS SOFTWARE.
  // Key -> inner SVG markup (24x24 viewBox). Presets only; "dot" has no glyph.
  var ICONS = {
    dot: "",
    star: "<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />",
    skull: "<path d=\"m12.5 17-.5-1-.5 1h1z\" /> <path d=\"M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z\" /> <circle cx=\"15\" cy=\"12\" r=\"1\" /> <circle cx=\"9\" cy=\"12\" r=\"1\" />",
    cross: "<path d=\"M4 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4a1 1 0 0 1 1 1v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4a1 1 0 0 1 1-1h4a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4a1 1 0 0 1-1-1V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4a1 1 0 0 1-1 1z\" />",
    eye: "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />",
    flag: "<path d=\"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528\" />",
    house: "<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" /> <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />",
    warning: "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" /> <path d=\"M12 9v4\" /> <path d=\"M12 17h.01\" />",
    question: "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M9 9.5a3 2.5 0 016 0c0 2-2 2-3 3.5\" /> <path d=\"M12 17h.01\" />",
    castle: "<path d=\"M10 5V3\" /> <path d=\"M14 5V3\" /> <path d=\"M15 21v-3a3 3 0 0 0-6 0v3\" /> <path d=\"M18 3v8\" /> <path d=\"M18 5H6\" /> <path d=\"M22 11H2\" /> <path d=\"M22 9v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9\" /> <path d=\"M6 3v8\" />",
    crown: "<path d=\"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z\" /> <path d=\"M5 21h14\" />",
    ghost: "<path d=\"M15 10v1\" /> <path d=\"M7.528 20.472a1.6 1.6 0 012.277 0l1.057 1.056a1.6 1.6 0 002.276 0l1.057-1.056a1.6 1.6 0 012.277 0l1.114 1.114a1.4 1.4 0 002.414-1V10a8 8 0 00-16 0v10.586a1.4 1.4 0 002.414 1z\" /> <path d=\"M9 10v1\" />",
    sword: "<path d=\"m11 19-6-6\" /> <path d=\"m5 21-2-2\" /> <path d=\"m8 16-4 4\" /> <path d=\"M9.5 17.5 20.414 6.586A2 2 0 0021 5.172V3h-2.172a2 2 0 00-1.414.586L6.5 14.5\" />",
    drop: "<path d=\"M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z\" />",
    book: "<path d=\"M12 5v16\" /> <path d=\"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z\" />"
  };
  var COLORS = { red: "#b04a4a", green: "#4A6B62", gold: "#c9a227", blue: "#4a6fa5", purple: "#7a5aa6", grey: "#8a8a8a" };
  function has(o, k) { return typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k); }
  function iconFor(key) {
    var g = has(ICONS, key) ? ICONS[key] : "";
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + g + "</svg>";
    return L.divIcon({ className: "rome-pin", html: g ? svg : "", iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -13] });
  }
  function el(tag, text, attrs) {
    var e = document.createElement(tag);
    if (text) e.textContent = text;
    for (var k in (attrs || {})) e.setAttribute(k, attrs[k]);
    return e;
  }
  function safeLink(l) { return typeof l === "string" && /^(\/|https?:\/\/)/.test(l); }
  function viewPopup(p) {
    var d = el("div");
    d.appendChild(el("strong", p.name));
    if (p.note) d.appendChild(el("p", p.note));
    if (safeLink(p.link)) d.appendChild(el("a", "Open note", { href: p.link }));
    return d;
  }
  function areaStyle(a) {
    var c = has(COLORS, a.color) ? COLORS[a.color] : COLORS.green;
    return { color: c, weight: 2, fillColor: c, fillOpacity: 0.25 };
  }

  var raw = window.ROME_PINS;
  var published = Array.isArray(raw) ? { pins: raw, areas: [] } : (raw || {});
  published = { pins: published.pins || [], areas: published.areas || [] };
  var editing = /[?&]edit=1(&|$)/.test(location.search);
  var KEY = "hunter-rome-pins-draft";
  var areaLayer = L.layerGroup().addTo(map);
  var pinLayer = L.layerGroup().addTo(map);

  if (!editing) {
    published.areas.forEach(function (a) {
      L.polygon(a.points, areaStyle(a)).addTo(areaLayer).bindPopup(viewPopup(a)).bindTooltip(a.name, { sticky: true });
    });
    published.pins.forEach(function (p) {
      L.marker([p.lat, p.lng], { icon: iconFor(p.icon), title: p.name }).addTo(pinLayer).bindPopup(viewPopup(p));
    });
    return;
  }

  // ---- local editor ----
  var data, dirty = false;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  try {
    var s = localStorage.getItem(KEY);
    if (s) { var d0 = JSON.parse(s); if (d0 && Array.isArray(d0.pins) && Array.isArray(d0.areas)) { data = d0; dirty = true; } }
  } catch (e) {}
  if (!data) data = clone(published);

  var handleLayer = L.layerGroup().addTo(map);
  var bar = el("div", "", { id: "edit-bar" });
  var status = el("span");
  var bAdd = el("button", "Add pin", { type: "button" });
  var bArea = el("button", "Add area", { type: "button" });
  var bFin = el("button", "Finish area", { type: "button" });
  var bExp = el("button", "Export (file only)", { type: "button" });
  var bImp = el("button", "Import JSON", { type: "button" });
  var bRes = el("button", "Discard local draft", { type: "button" });
  var file = el("input", "", { type: "file", accept: ".json,application/json" });
  file.style.display = "none"; bFin.style.display = "none";
  var help = el("div", "Edits stay in this browser only. To publish: export, then send the file to Instinct; it is committed only after explicit approval.", { class: "edit-help" });
  [status, bAdd, bArea, bFin, bExp, bImp, bRes, file, help].forEach(function (x) { bar.appendChild(x); });
  document.body.appendChild(bar);

  function save() {
    dirty = true;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    render();
  }
  function setStatus() {
    status.textContent = "EDIT MODE | " + data.pins.length + " pin" + (data.pins.length === 1 ? "" : "s") + ", " +
      data.areas.length + " area" + (data.areas.length === 1 ? "" : "s") + (dirty ? " | local draft, NOT published" : " | matches published");
  }
  function select(map_, cur) {
    var sel = el("select");
    Object.keys(map_).forEach(function (k) { var o = el("option", k, { value: k }); if (cur === k) o.selected = true; sel.appendChild(o); });
    return sel;
  }
  function form(item, kind, remove) {
    var f = el("form", "", { class: "pin-form" });
    var n = el("input", "", { placeholder: "Name", value: item.name || "" });
    var t = el("textarea", "", { placeholder: "Note" }); t.value = item.note || "";
    var l = el("input", "", { placeholder: "Link (/hunter/... or https://...)", value: item.link || "" });
    var sel = kind === "pin" ? select(ICONS, item.icon || "dot") : select(COLORS, item.color || "green");
    var ok = el("button", "Save", { type: "submit" });
    var del = el("button", "Delete", { type: "button" });
    [n, t, l, sel, ok, del].forEach(function (x) { f.appendChild(x); });
    f.onsubmit = function (ev) {
      ev.preventDefault();
      if (l.value.trim() && !safeLink(l.value.trim())) { alert("Link must start with / or http(s)://"); return; }
      item.name = n.value.trim() || "Untitled";
      item.note = t.value.trim(); item.link = l.value.trim();
      if (!item.note) delete item.note;
      if (!item.link) delete item.link;
      if (kind === "pin") { item.icon = sel.value; if (item.icon === "dot") delete item.icon; }
      else item.color = sel.value;
      map.closePopup(); save();
    };
    del.onclick = function () { if (confirm("Delete this " + kind + " from the local draft?")) { remove(); map.closePopup(); save(); } };
    setTimeout(function () { n.focus(); n.select(); }, 0);
    return f;
  }

  var polys = [];
  function render() {
    areaLayer.clearLayers(); pinLayer.clearLayers(); handleLayer.clearLayers(); polys = [];
    data.areas.forEach(function (a, i) {
      var pg = L.polygon(a.points, areaStyle(a)).addTo(areaLayer);
      pg.bindPopup(function () { return form(a, "area", function () { data.areas.splice(i, 1); }); }, { closeOnClick: false });
      pg.bindTooltip(a.name, { sticky: true });
      pg.on("popupopen", function () { showHandles(i); });
      pg.on("popupclose", function () { handleLayer.clearLayers(); });
      polys.push(pg);
    });
    data.pins.forEach(function (p, i) {
      var m = L.marker([p.lat, p.lng], { icon: iconFor(p.icon), title: p.name, draggable: true }).addTo(pinLayer);
      m.bindPopup(function () { return form(p, "pin", function () { data.pins.splice(i, 1); }); });
      m.on("dragend", function () { var c = m.getLatLng(); p.lat = +c.lat.toFixed(6); p.lng = +c.lng.toFixed(6); save(); });
    });
    setStatus();
  }
  function reopen(i) { if (polys[i]) polys[i].openPopup(polys[i].getBounds().getCenter()); }

  // vertex handles: drag to move, double-click to delete (min 3), click a midpoint to add a vertex
  function showHandles(i) {
    handleLayer.clearLayers();
    var a = data.areas[i], pts = a.points, vi = L.divIcon({ className: "vertex", iconSize: [22, 22], iconAnchor: [11, 11] });
    var mi = L.divIcon({ className: "vertex mid", iconSize: [16, 16], iconAnchor: [8, 8] });
    pts.forEach(function (pt, j) {
      var m = L.marker(pt, { icon: vi, draggable: true, zIndexOffset: 1000 }).addTo(handleLayer);
      m.on("drag", function () { pts[j] = [m.getLatLng().lat, m.getLatLng().lng]; polys[i].setLatLngs(pts); });
      m.on("dragend", function () { pts[j] = [+m.getLatLng().lat.toFixed(6), +m.getLatLng().lng.toFixed(6)]; save(); reopen(i); });
      m.on("dblclick", function (e) { L.DomEvent.stop(e); if (pts.length > 3) { pts.splice(j, 1); save(); reopen(i); } });
      var nx = pts[(j + 1) % pts.length];
      var mid = [(pt[0] + nx[0]) / 2, (pt[1] + nx[1]) / 2];
      L.marker(mid, { icon: mi, zIndexOffset: 900 }).addTo(handleLayer).on("click", function (e) {
        L.DomEvent.stop(e); pts.splice(j + 1, 0, [+mid[0].toFixed(6), +mid[1].toFixed(6)]); save(); reopen(i);
      });
    });
  }

  // add pin / add area modes
  var mode = null, drawPts = [], drawLine = null;
  function setMode(m) {
    mode = m;
    bAdd.classList.toggle("on", m === "pin"); bAdd.textContent = m === "pin" ? "Click map to place pin" : "Add pin";
    bArea.classList.toggle("on", m === "area"); bArea.textContent = m === "area" ? "Cancel area" : "Add area";
    bFin.style.display = m === "area" ? "" : "none";
    if (m !== "area") { drawPts = []; if (drawLine) { map.removeLayer(drawLine); drawLine = null; } }
  }
  bAdd.onclick = function () { setMode(mode === "pin" ? null : "pin"); };
  bArea.onclick = function () { setMode(mode === "area" ? null : "area"); };
  bFin.onclick = function () {
    if (drawPts.length < 3) { alert("An area needs at least 3 points. Click the map to place them."); return; }
    data.areas.push({ name: "New area", color: "green", points: drawPts.slice() });
    setMode(null); save(); reopen(data.areas.length - 1);
  };
  map.on("click", function (e) {
    if (mode === "pin") {
      data.pins.push({ name: "New pin", lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) });
      setMode(null); save(); pinLayer.getLayers()[data.pins.length - 1].openPopup();
    } else if (mode === "area") {
      drawPts.push([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]);
      if (drawLine) map.removeLayer(drawLine);
      drawLine = L.polygon(drawPts, { color: "#e8e0d0", weight: 2, dashArray: "5 5", fillOpacity: 0.1, interactive: false }).addTo(map);
    }
  });

  bExp.onclick = function () {
    var blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
    var a = el("a", "", { href: URL.createObjectURL(blob), download: "romePins.json" });
    document.body.appendChild(a); a.click(); a.remove();
    alert("Exported romePins.json to your downloads. This does NOT publish anything. The live map changes only after the file is sent for publishing and approved.");
  };
  bImp.onclick = function () { file.click(); };

  function num(v, lim) { return typeof v === "number" && isFinite(v) && Math.abs(v) <= lim; }
  function cleanText(it, o) {
    if (typeof it.note === "string" && it.note) o.note = it.note.slice(0, 2000);
    if (safeLink(it.link)) o.link = it.link;
    return o;
  }
  function cleanPins(list) {
    if (!Array.isArray(list) || list.length > 500) throw 0;
    return list.map(function (p) {
      if (!p || typeof p.name !== "string" || !num(p.lat, 90) || !num(p.lng, 180)) throw 0;
      var o = cleanText(p, { name: p.name.slice(0, 200), lat: p.lat, lng: p.lng });
      if (has(ICONS, p.icon) && p.icon !== "dot") o.icon = p.icon;
      return o;
    });
  }
  function cleanAreas(list) {
    if (!Array.isArray(list) || list.length > 200) throw 0;
    return list.map(function (a) {
      if (!a || typeof a.name !== "string" || !Array.isArray(a.points) || a.points.length < 3 || a.points.length > 500) throw 0;
      var pts = a.points.map(function (q) {
        if (!Array.isArray(q) || !num(q[0], 90) || !num(q[1], 180)) throw 0;
        return [q[0], q[1]];
      });
      return cleanText(a, { name: a.name.slice(0, 200), color: has(COLORS, a.color) ? a.color : "green", points: pts });
    });
  }
  file.onchange = function () {
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result), next;
        if (Array.isArray(d)) next = { pins: cleanPins(d), areas: data.areas };   // old pins-only file keeps current areas
        else if (d && typeof d === "object") next = { pins: cleanPins(d.pins || []), areas: cleanAreas(d.areas || []) };
        else throw 0;
        data = next; save();
      } catch (e) { alert("Not a valid map file (needs pins with name/lat/lng and areas with name and 3+ points)."); }
    };
    if (file.files[0]) r.readAsText(file.files[0]);
    file.value = "";
  };
  bRes.onclick = function () {
    if (!confirm("Discard the local draft and go back to the published map?")) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    data = clone(published); dirty = false; setMode(null); render();
  };
  render();
})();
