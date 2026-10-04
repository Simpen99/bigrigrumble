const ARTIFACT_URL = "https://claude.ai/artifact/JzfVf1LkLBFjkJYbA7rbce";
const PRICE = 20, START_COINS = 10, N = 32;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rnd = n => Math.floor(Math.random() * n);
const rid = () => "k" + Math.random().toString(36).slice(2, 10);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
function F(s) { const m = s.match(/^(\d+)(?:([+-]\d+)c)?$/); return { m: +m[1], c: m[2] ? +m[2] : 0 }; }
const STD = ["1","2","3","4","5","6"].map(F);
const TRUCKS = [
  {name:"Crusher", kind:"monster", color:"#E5484D", accent:"#FFC83D", blurb:"Monster truck. All or nothing.", dice:["0","0","1","9","9","10"]},
  {name:"Sprinkles", kind:"icecream", color:"#FF9FCB", accent:"#FFFFFF", blurb:"Sells a cone at every slow stop.", dice:["2+2c","2+2c","3","3","4","4"]},
  {name:"Blaze", kind:"fire", color:"#D42A22", accent:"#F2F2F2", blurb:"Sirens on costs extra.", dice:["1","2","5","5","7-2c","7-2c"]},
  {name:"Steady Eddie", kind:"box", color:"#2F7DE1", accent:"#FFD23F", blurb:"Four. Every. Time.", dice:["4","4","4","4","4","4"]},
  {name:"Mixie", kind:"mixer", color:"#FF8A1F", accent:"#E8E8E8", blurb:"Slow churn or quick pour.", dice:["2","2","2","6","6","6"]},
  {name:"Dumpy", kind:"dump", color:"#FFC83D", accent:"#3B3F4A", blurb:"Stalls, but finds loose change.", dice:["0+5c","0+5c","5","5","7","7"]},
  {name:"Zoomer", kind:"pickup", color:"#6CCB2E", accent:"#1E5631", blurb:"Burns cash to go fast.", dice:["1","2","3","7-3c","8-3c","9-3c"]},
  {name:"Rusty", kind:"tow", color:"#B5622F", accent:"#FFB000", blurb:"Crawls along collecting fees.", dice:["1+3c","1+3c","2+2c","2+2c","3+1c","3+1c"]},
  {name:"Garbo", kind:"garbage", color:"#2E9E5B", accent:"#CFE8D6", blurb:"Usually slow. One big haul.", dice:["2","2","2","4","4","10"]},
  {name:"Glug", kind:"tanker", color:"#AEB8C6", accent:"#E5484D", blurb:"Swings between sip and gulp.", dice:["1","1","4","4","8","8"]},
  {name:"Postie", kind:"mail", color:"#F5F7FA", accent:"#2F5DE1", blurb:"Paid for every delivery.", dice:["1+1c","2+1c","3+1c","4+1c","5+1c","6+1c"]},
  {name:"Taco Tina", kind:"food", color:"#1FB5A8", accent:"#FFC83D", blurb:"Parks to sell, then zips off.", dice:["0+8c","3","3","4","4","5"]}
];
TRUCKS.forEach(t => t.faces = t.dice.map(F));
const PCOL = ["#E5484D","#2F7DE1","#FFC83D","#1FA35C","#8E5BE0","#FF8A1F","#FF7AC0","#16B3C9"];
// a player's colour is their truck's colour; if an earlier player already drives the same truck, fall back to their slot colour
function pcol(p) { const t = p && TRUCKS[p.truck], L = typeof G !== "undefined" && G && G.players; if (!t) return PCOL[(p && p.col) || 0]; if (L && L.some((q, i) => q.truck === p.truck && q.key !== p.key && i < L.findIndex(r => r.key === p.key))) return PCOL[p.col]; return t.color; }
const faceHTML = f => `<span class="f">${f.m}${f.c ? `<sub class="${f.c > 0 ? "up" : "dn"}">${f.c > 0 ? "+" : ""}${f.c}</sub>` : ""}</span>`;
const facesHTML = faces => `<span class="faces">${faces.map(faceHTML).join("")}</span>`;
const coinIco = `<svg class="ico" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="#FFC83D"/><circle cx="10" cy="10" r="5.5" fill="none" stroke="#E0A800" stroke-width="2"/></svg>`;
const batIco = `<svg class="ico" viewBox="0 0 20 20"><rect x="1.5" y="5" width="15" height="11" rx="2.5" fill="#1FA35C"/><rect x="16.5" y="8" width="2.5" height="5" rx="1" fill="#1FA35C"/><path d="M10 6.5 L6.5 11 H9.5 L8 14.5 L12 9.5 H9.5z" fill="#FFE27A"/></svg>`;
const bigBattery = `<svg viewBox="0 0 90 56"><rect x="3" y="6" width="74" height="46" rx="10" fill="#1FA35C"/><rect x="77" y="18" width="10" height="20" rx="3" fill="#157A44"/><path d="M44 10 L28 31 H42 L36 48 L56 24 H43z" fill="#FFE27A"/></svg>`;

/* ---------- 2D board layout ---------- */
const WAY = [[50,45],[310,45],[310,165],[125,165],[125,265],[310,265],[310,435],[50,435]];
const PTS = (() => {
  const segs = WAY.map((a, i) => { const b = WAY[(i + 1) % WAY.length]; return [a, b, Math.hypot(b[0]-a[0], b[1]-a[1])]; });
  const L = segs.reduce((s, x) => s + x[2], 0), out = [];
  for (let k = 0; k < N; k++) { let d = k * L / N; for (const [a, b, l] of segs) { if (d <= l) { out.push([a[0] + (b[0]-a[0]) * d / l, a[1] + (b[1]-a[1]) * d / l]); break; } d -= l; } }
  return out;
})();
const TYPES = Array.from({length: N}, (_, i) => i === 0 ? "S" : [3,8,13,18,24,29].includes(i) ? "E" : [5,11,16,21,26,31].includes(i) ? "R" : "B");
const ringDist = (a, b) => { const d = Math.abs(a - b) % N; return Math.min(d, N - d); };
const W3 = (x, y) => [(x - 180) / 15, (y - 240) / 15];
const TILE = PTS.map(([x, y]) => W3(x, y));

/* ---------- 3D engine ---------- */
const GFX = { ok: false, mode: "show", thumbs: {}, side: {}, top: {}, tok: {}, follow: true };
const MC = {};
function M(c, o) { const k = c + (o ? JSON.stringify(o) : ""); return MC[k] || (MC[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: .78, metalness: .04 }, o || {}))); }
function mesh(geo, c, o) { const m = new THREE.Mesh(varyColors(geo), M(c, Object.assign({ vertexColors: true }, o || {}))); m.castShadow = true; m.receiveShadow = true; return m; }
function B(w, h, d, c, x, y, z, o) { const m = mesh(new THREE.BoxGeometry(w, h, d), c, o); m.position.set(x, y, z); return m; }
function Cy(rt, rb, h, s, c, x, y, z, o) { const m = mesh(new THREE.CylinderGeometry(rt, rb, h, s), c, o); m.position.set(x, y, z); return m; }
function lights(scene, shadow) {
  scene.add(new THREE.HemisphereLight("#DDF0FF", "#5C7F45", .78));
  const d = new THREE.DirectionalLight("#FFF1D6", 1.05); d.position.set(14, 26, 12);
  if (shadow) { d.castShadow = true; d.shadow.mapSize.set(2048, 2048); const s = d.shadow.camera; s.left = -26; s.right = 26; s.top = 26; s.bottom = -26; s.near = 1; s.far = 80; d.shadow.bias = -.0005; d.shadow.normalBias = .04; }
  scene.add(d); return d;
}
function makeThumbs() {
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  r.setPixelRatio(1); r.setClearColor(0x000000, 0);
  const sc = new THREE.Scene(); lights(sc, false);
  const cp = new THREE.PerspectiveCamera(30, 1.5, .1, 50); cp.position.set(3.4, 2.3, 4.2); cp.lookAt(0, .75, 0);
  const co = new THREE.OrthographicCamera(-1.35, 1.35, 1.25, -.35, .1, 50); co.position.set(0, .9, 10); co.lookAt(0, .9, 0);
  const ct = new THREE.OrthographicCamera(-.66, .66, 1.2, -1.2, .1, 50); ct.up.set(1, 0, 0); ct.position.set(0, 10, 0); ct.lookAt(0, 0, 0);
  TRUCKS.forEach((t, i) => {
    const g = buildTruck(i); sc.add(g);
    r.setSize(240, 160); r.render(sc, cp); GFX.thumbs[i] = r.domElement.toDataURL("image/png");
    const s = new Image(); r.setSize(270, 160); r.render(sc, co); s.src = r.domElement.toDataURL("image/png"); GFX.side[i] = s;
    const tp = new Image(); r.setSize(132, 240); r.render(sc, ct); tp.src = r.domElement.toDataURL("image/png"); GFX.top[i] = tp;
    sc.remove(g);
  });
  r.dispose(); try { r.forceContextLoss(); } catch (e) {}
}
const thumb = i => GFX.thumbs[i] || "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
function noise(x, z) { return Math.sin(x * .31) * Math.cos(z * .27) + .6 * Math.sin(x * .13 + z * .19) + .35 * Math.cos(x * .57 - z * .43); }
function ground(scene, w, d, flatX, flatZ, base) {
  const geo = new THREE.PlaneGeometry(w, d, Math.round(w / 2), Math.round(d / 2)).toNonIndexed(); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, cols = [], col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const dd = Math.max(0, Math.abs(x) - flatX, Math.abs(z) - flatZ); p.setY(i, dd > 0 ? (noise(x, z) + 1.4) * Math.min(5, dd * .45) : 0); }
  for (let i = 0; i < p.count; i += 3) { const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3; col.set(y > 5.5 ? "#8FA27E" : base); col.offsetHSL((Math.random() - .5) * .02, 0, (Math.random() - .5) * .05 + y * .012); for (let k = 0; k < 3; k++) cols.push(col.r, col.g, col.b); }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95 })); m.receiveShadow = true; scene.add(m);
}
function tree(x, z, s = 1, kind = rnd(3)) {
  const g = new THREE.Group();
  g.add(Cy(.12 * s, .16 * s, .6 * s, 5, "#7A5234", 0, .3 * s, 0));
  if (kind === 0) { g.add(Cy(0, .8 * s, 1.3 * s, 6, "#2F8F4E", 0, 1.1 * s, 0), Cy(0, .6 * s, 1.0 * s, 6, "#3BA85C", 0, 1.7 * s, 0)); }
  else if (kind === 1) { const b = mesh(new THREE.IcosahedronGeometry(.8 * s, 0), "#4DB35E"); b.position.y = 1.2 * s; g.add(b); }
  else { const b = mesh(new THREE.DodecahedronGeometry(.7 * s, 0), "#6BBF4A"); b.position.y = 1.1 * s; g.add(b); const b2 = mesh(new THREE.DodecahedronGeometry(.45 * s, 0), "#58AD41"); b2.position.set(.4 * s, 1.5 * s, .1); g.add(b2); }
  g.position.set(x, 0, z); g.rotation.y = Math.random() * 6; g.userData.sway = Math.random() * 6; return g;
}
function rock(x, z, s) { const r = mesh(new THREE.DodecahedronGeometry(s, 0), "#9BA3AE"); r.position.set(x, s * .4, z); r.rotation.set(Math.random(), Math.random(), 0); r.scale.y = .7; return r; }
function cloud() { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1 + Math.random() * .8, 0), M("#FFFFFF", { roughness: 1 })); c.position.set(i * 1.3 - 2, Math.random() * .6, Math.random() - .5); g.add(c); } return g; }
function canvasTex(w, h, draw) { const k = 2, c = document.createElement("canvas"); c.width = w * k; c.height = h * k; const x = c.getContext("2d"); x.scale(k, k); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = GFX.r ? GFX.r.capabilities.getMaxAnisotropy() : 8; return t; }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function mountains(scene) {
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + Math.random() * .2, d = 44 + Math.random() * 10, h = 10 + Math.random() * 10, r = 7 + Math.random() * 6;
    const m = Cy(0, r, h, 6, i % 2 ? "#6F8C6B" : "#7F9A77", Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d); m.castShadow = false; scene.add(m);
    if (h > 14) { const s = Cy(0, r * .32, h * .32, 6, "#F4F7FA", m.position.x, h - h * .16 - 1, m.position.z); s.castShadow = false; scene.add(s); } }
}
function buildShowroom() {
  const s = new THREE.Scene(); s.background = new THREE.Color("#9FD4F5"); s.fog = new THREE.Fog("#9FD4F5", 30, 80);
  { const d = lights(s, true), c = d.shadow.camera; GFX.showSun = d; GFX.showHemi = s.children.find(o => o.isHemisphereLight); c.left = -7; c.right = 7; c.top = 7; c.bottom = -7; c.near = 10; c.far = 55; c.updateProjectionMatrix(); d.shadow.mapSize.set(2048, 2048); d.shadow.bias = -.0003; d.shadow.normalBias = .02; }
  ground(s, 120, 120, 9, 9, "#7CC66A"); mountains(s);
  const tt = Cy(3.3, 3.5, .3, 24, "#3A4150", 0, .15, 0); s.add(tt);
  s.add(Cy(3.35, 3.35, .06, 24, "#FFC83D", 0, .32, 0)); s.add(Cy(3.1, 3.1, .07, 24, "#4A5263", 0, .34, 0));
  [[-6, -4, 1.3], [6.5, -5, 1.1], [-7, 2, 1], [7, 1.5, 1.4], [-4, -8, 1.2], [4, -9, 1.6], [0, -11, 1.3], [-10, -2, 1.5], [10, -3, 1.2]].forEach(([x, z, k]) => s.add(tree(x, z, k)));
  s.add(rock(4.5, 3, .5), rock(-5, 3.5, .4));
  const clouds = []; for (let i = 0; i < 5; i++) { const c = cloud(); c.position.set(-30 + i * 14, 14 + Math.random() * 4, -25 - Math.random() * 10); s.add(c); clouds.push(c); }
  const hold = new THREE.Group(); hold.position.y = .34; s.add(hold);
  applySky(s, "def"); GFX.show = { scene: s, hold, clouds, key: "" };
}
function setShowroom(trucks) {
  const S = GFX.show; if (!S) return; const key = trucks.join(",");
  if (S.key === key) return; S.key = key;
  while (S.hold.children.length) S.hold.remove(S.hold.children[0]);
  const n = trucks.length;
  trucks.forEach((ti, k) => {
    const g = buildTruck(ti), sc = n === 1 ? 1.5 : n <= 3 ? 1 : .72;
    g.scale.setScalar(sc);
    if (n > 1) { const a = (k - (n - 1) / 2) * (n <= 3 ? .62 : .42); g.position.set(Math.sin(a) * 2.4, 0, Math.cos(a) * 2.4 - 1.6); g.rotation.y = a - Math.PI / 2 + .9; g.userData.bob = k; }
    else g.position.set(0, 0, 0);
    S.hold.add(g);
  });
  S.single = n === 1;
}
function tileTop(type) {
  return canvasTex(128, 128, (x, w, h) => {
    if (type === "E") { x.fillStyle = "#fff"; x.font = "900 96px Rubik, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("?", 64, 70); }
    if (type === "S") { for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { x.fillStyle = (i + j) % 2 ? "#151B24" : "#FFFFFF"; x.fillRect(16 + i * 16, 16 + j * 16, 16, 16); } }
  });
}
function nameTag(name, color) {
  const tex = canvasTex(320, 80, (x, w, h) => { x.font = "800 38px Rubik, Arial"; const tw = Math.min(w - 20, x.measureText(name).width + 50); x.fillStyle = "rgba(16,22,31,.85)"; rr(x, (w - tw) / 2, 8, tw, 60, 30); x.fill(); x.fillStyle = color; x.beginPath(); x.arc((w - tw) / 2 + 26, 38, 10, 0, 7); x.fill(); x.fillStyle = "#fff"; x.textBaseline = "middle"; x.fillText(name, (w - tw) / 2 + 44, 40, tw - 54); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); sp.scale.set(2.2, .55, 1); sp.renderOrder = 10; return sp;
}
function faceTex(f, color) {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = "#FBFBF7"; x.fillRect(0, 0, w, h); x.fillStyle = color; x.fillRect(0, 0, w, 18); x.fillRect(0, h - 18, w, 18); x.fillRect(0, 0, 18, h); x.fillRect(w - 18, 0, 18, h);
    x.fillStyle = "#151B24"; x.font = "900 150px Rubik, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(f.m, w / 2, h / 2 + (f.c ? -14 : 8));
    if (f.c) { x.fillStyle = f.c > 0 ? "#1FA35C" : "#E5484D"; rr(x, 58, 176, 140, 54, 27); x.fill(); x.fillStyle = "#fff"; x.font = "800 40px Rubik, Arial"; x.fillText((f.c > 0 ? "+" : "") + f.c + "c", w / 2, 204); }
  });
}
function showDie3D(faces, idx, color, key) {
  if (!GFX.ok || !GFX.board) return false;
  const bd = GFX.board;
  if (!bd.dieHold) { bd.dieHold = new THREE.Group(); bd.scene.add(bd.dieHold); }
  if (GFX.die) bd.dieHold.remove(GFX.die.m);
  const mats = faces.map(f => new THREE.MeshStandardMaterial({ map: faceTex(f, color), roughness: .5 }));
  const m = new THREE.Mesh(new THREE.BoxGeometry(.95, .95, .95), mats); m.castShadow = true; bd.dieHold.add(m);
  const E = [[0, -Math.PI / 2, 0], [0, Math.PI / 2, 0], [Math.PI / 2, 0, 0], [-Math.PI / 2, 0, 0], [0, 0, 0], [0, Math.PI, 0]][idx];
  const base = new THREE.Quaternion().setFromEuler(new THREE.Euler(E[0], E[1], E[2])), tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(.22, -.3, 0));
  GFX.die = { m, t: 0, key, target: tilt.multiply(base), spin: new THREE.Vector3(7 + Math.random() * 4, 9 + Math.random() * 4, 3) };
  return true;
}
function stepDie(dt) {
  const d = GFX.die; if (!d) return; d.t += dt;
  const bd = GFX.board, tk = GFX.tok[d.key];
  if (tk) bd.dieHold.position.set(tk.g.position.x, tk.g.position.y + 3.2, tk.g.position.z);
  bd.dieHold.quaternion.copy(GFX.cam.quaternion);
  if (d.t < 1.1) { d.m.rotation.x += d.spin.x * dt; d.m.rotation.y += d.spin.y * dt; d.m.rotation.z += d.spin.z * dt; d.m.position.y = Math.abs(Math.sin(d.t * 9)) * .5 * (1.1 - d.t); }
  else { d.m.quaternion.slerp(d.target, Math.min(1, dt * 10)); d.m.position.y *= .8; }
  const sc = d.t < .15 ? d.t / .15 : d.t > 2.1 ? Math.max(0, 1 - (d.t - 2.1) / .2) : 1; d.m.scale.setScalar(Math.max(.001, sc));
  if (d.t > 2.3) { bd.dieHold.remove(d.m); GFX.die = null; }
}
/* ---------- podium ending ---------- */
function buildPodium() {
  const s = new THREE.Scene(); s.background = new THREE.Color("#9FD4F5"); s.fog = new THREE.Fog("#9FD4F5", 30, 95);
  lights(s, true); ground(s, 130, 130, 11, 11, "#7CC66A"); mountains(s);
  s.add(Cy(7.2, 7.6, .3, 36, "#3A4150", 0, .15, 0), Cy(7.35, 7.35, .1, 36, "#FFC83D", 0, .33, 0), Cy(7, 7, .1, 36, "#4A5263", 0, .41, 0));
  const P = [{ x: 0, h: 2.4, c: "#FFC83D", n: 1 }, { x: -3.1, h: 1.6, c: "#D5DAE2", n: 2 }, { x: 3.1, h: 1.0, c: "#D08B4E", n: 3 }];
  P.forEach(p => { s.add(B(2.9, p.h, 2.6, p.c, p.x, .35 + p.h / 2, 0), B(3.0, .12, 2.7, "#FFFFFF", p.x, .35 + p.h, 0));
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(128, 128, (x, w, h) => { x.fillStyle = "#151B24"; x.font = "900 104px Rubik, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(p.n, w / 2, h / 2 + 8); }) }));
    lab.position.set(p.x, .35 + p.h / 2, 1.32); s.add(lab); });
  [[-8.5, -5, 1.3], [8.5, -6, 1.2], [-10.5, 1, 1.5], [10.5, 2, 1.4], [-5, -10, 1.6], [5, -11, 1.4], [0, -13, 1.8]].forEach(([x, z, k]) => s.add(tree(x, z, k)));
  const conf = [], cg = new THREE.PlaneGeometry(.16, .26);
  for (let i = 0; i < 170; i++) { const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: PCOL[i % 8], side: THREE.DoubleSide })); m.visible = false; s.add(m); conf.push({ m, on: false }); }
  const hold = new THREE.Group(); s.add(hold);
  applySky(s, "warm"); GFX.pod = { scene: s, P, hold, conf, t: 0, key: "", items: [], list: [] };
}
function setPodium(list) { const D = GFX.pod; if (!D) return; const key = list.map(p => p.truck + ":" + p.name).join(","); if (D.key === key) return; D.key = key; replayPodium(list); }
function replayPodium(list) {
  const D = GFX.pod; if (!D) return; list = list || D.list; D.list = list;
  while (D.hold.children.length) D.hold.remove(D.hold.children[0]);
  D.items = list.slice(0, 3).map((p, i) => { const g = new THREE.Group(), tr = buildTruck(p.truck); tr.rotation.y = -Math.PI / 2 + (i === 1 ? .4 : i === 2 ? -.4 : 0); tr.scale.setScalar(.95); g.add(tr);
    const tag = nameTag(p.name, pcol(p)); tag.position.y = 2.4; g.add(tag); g.position.set(D.P[i].x, 30, 0); D.hold.add(g); return { g, tr, top: .41 + D.P[i].h, at: [2.3, 1.4, .6][i] }; });
  setTimeout(() => sfx("fanfare"), 2400); D.t = 0; D.start = performance.now(); D.conf.forEach(c => { c.m.visible = false; c.on = false; });
}
function confReset(c, spread) { c.m.visible = true; c.m.position.set((Math.random() - .5) * 15, spread ? 7 + Math.random() * 10 : 13 + Math.random() * 3, (Math.random() - .5) * 7); c.vy = -(1.3 + Math.random() * 1.6); c.sx = (Math.random() - .5) * 8; c.sy = (Math.random() - .5) * 8; c.ph = Math.random() * 6; }
function stepPodium(dt) {
  const D = GFX.pod, prev = D.t; D.t = (performance.now() - (D.start || performance.now())) / 1000; const t = D.t; dt = Math.min(.1, Math.max(0, t - prev));
  D.items.forEach((it, i) => { const k = t - it.at; let y = 30;
    if (k >= 0) { const f = Math.min(1, k / .5); y = it.top + (1 - f * f) * 16; if (f >= 1) { const b = k - .5; y = it.top + Math.abs(Math.sin(b * 9)) * Math.exp(-b * 5) * .9; } }
    if (i === 0 && t > 3.5) y = it.top + Math.abs(Math.sin((t - 3.5) * 4)) * .4;
    it.g.position.y = y; animTruck(it.tr, dt); });
  if (t > 2.8) D.conf.forEach(c => { if (!c.on) { c.on = true; confReset(c, true); } c.m.position.y += c.vy * dt; c.m.position.x += Math.sin(t * 2 + c.ph) * dt * .7; c.m.rotation.x += c.sx * dt; c.m.rotation.y += c.sy * dt; if (c.m.position.y < .3) confReset(c, false); });
  const e = Math.min(1, t / 3.4), ease = 1 - Math.pow(1 - e, 3), asp = GFX.w / GFX.h, far = asp < 1 ? Math.min(1.9, .82 / asp) : 1, ang = Math.sin(t * .22) * .28, dist = (21 - 5 * ease) * far;
  const cam = GFX.cam; cam.position.set(Math.sin(ang) * dist, 1.6 + (1 - ease) * 4 + 1.6 * far, Math.cos(ang) * dist); cam.lookAt(0, 2, 0); cam.updateMatrixWorld();
}
function gfxResize() {
  if (!GFX.ok) return; const w = innerWidth, h = innerHeight; GFX.w = w; GFX.h = h;
  GFX.r.setSize(w, h, false); GFX.cam.aspect = w / h;
  const oy = GFX.mode === "board" ? h * (w > h ? .1 : .2) : GFX.mode === "mg" ? 0 : GFX.mode === "podium" ? h * .2 : h * .28; GFX.cam.setViewOffset(w, h, 0, oy, w, h); GFX.cam.updateProjectionMatrix();
}
function setMode(m) { if (GFX.mode === m) return; GFX.mode = m; gfxResize(); }
let lastT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  if (!GFX.ok) return;
  const dt = Math.min(.05, (t - lastT) / 1000 || 0); lastT = performance.now();
  if (document.hidden) return;
  if (GFX.mode === "edit") { if (ED) try { edFrame(dt, t / 1000); } catch (e) { console.error(e); } return; }
  if (GFX.mode === "mg") { if (TVS) { try { tvsFrame(); } catch (e) { console.error(e); } return; } if (W) { const now = performance.now(), real = Math.min(1, (now - (GFX.mgLast || now)) / 1000); GFX.mgLast = now; const n = Math.max(1, Math.ceil(real / .034));
      try { for (let i = 0; i < n && W; i++) stepMG(real / n); } catch (e) { console.error(e); } if (W) renderMG(W.sc, GFX.cam); } return; }
  if (mgOpen && !mgRes) return;
  if (GFX.ctl && !GFX.peek) return;
  const time = t / 1000;
  if (GFX.mode === "board" && G && GFX.board) { stepBoard(dt, time); stepDie(dt); renderMG(GFX.board.scene, GFX.cam); }
  else if (GFX.mode === "podium" && GFX.pod) { stepPodium(dt); swayStep(GFX.pod.scene); renderMG(GFX.pod.scene, GFX.cam); }
  else if (GFX.show) {
    const S = GFX.show; { const dim = ["lobby", "home", "join", "practice"].includes(view), kk = Math.min(1, dt * 3); if (GFX.showSun) GFX.showSun.intensity += ((dim ? .72 : 1.05) - GFX.showSun.intensity) * kk; if (GFX.showHemi) GFX.showHemi.intensity += ((dim ? .6 : .78) - GFX.showHemi.intensity) * kk; }
    S.hold.rotation.y = S.single ? time * .45 : Math.sin(time * .3) * .15;
    S.hold.children.forEach(g => { animTruck(g, dt); if (g.userData.bob !== undefined) g.position.y = Math.abs(Math.sin(time * 3 + g.userData.bob)) * .08; });
    S.clouds.forEach(c => { c.position.x += dt * .5; if (c.position.x > 40) c.position.x = -40; });
    const cam = GFX.cam, asp = GFX.w / GFX.h, n = S.hold.children.length, home = view === "home", w = GFX.w, h = GFX.h;
    const d = asp < 1 ? (n > 1 ? 17 + n * 1.3 : 19) : (n > 1 ? 11 + n * .5 : 10.5);
    cam.position.set(0, 1.2 + d * .3, d); cam.lookAt(0, .9, 0);
    cam.setViewOffset(w, h, home && n === 1 ? -w * (asp < 1 ? .16 : .12) : 0, h * (home ? .2 : .32), w, h); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    swayStep(S.scene); renderMG(S.scene, cam);
  }
}
function gfxInit() {
  if (typeof THREE === "undefined") return;
  try {
    const r = new THREE.WebGLRenderer({ canvas: $("#gl"), antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: true });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2.5)); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    GFX.r = r; GFX.cam = new THREE.PerspectiveCamera(40, 1, .5, 240); GFX.ok = true;
    makeThumbs(); buildShowroom(); buildPodium();
    gfxResize(); addEventListener("resize", gfxResize); requestAnimationFrame(frame);
  } catch (e) { console.warn("3D unavailable", e); GFX.ok = false; }
}
/* iPhone Safari ignores user-scalable=no: block pinch / gesture zoom everywhere, and double-tap zoom on the controller and minigame screens (controls fire on pointerdown, so fast repeated taps still count) */
document.addEventListener("gesturestart", e => e.preventDefault(), { passive: false });
document.addEventListener("gesturechange", e => e.preventDefault(), { passive: false });
document.addEventListener("touchmove", e => { if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault(); }, { passive: false });
{ let lastEnd = 0; document.addEventListener("touchend", e => { const now = Date.now(), b = document.body.classList; if (now - lastEnd < 350 && (b.contains("mglive") || b.contains("ctl"))) e.preventDefault(); lastEnd = now; }, { passive: false }); }
/* Android: short buzz on button presses on the phone controller and in minigames (iPhone Safari has no vibration API) */
document.addEventListener("pointerdown", e => { const b = document.body.classList; if (!navigator.vibrate || !(b.contains("ctl") || b.contains("mglive") || b.contains("tvphone"))) return; const t = e.target.closest && e.target.closest("button"); if (t && !t.disabled) { try { navigator.vibrate(10); } catch (x) {} } }, true);
