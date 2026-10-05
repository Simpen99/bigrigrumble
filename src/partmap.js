
/* ---------- maps (graph of spaces) ---------- */
function mkGraph(nodes) {
  nodes.forEach((n, i) => { n.id = i; n.prev = []; });
  nodes.forEach((n, i) => n.next.forEach(j => nodes[j].prev.push(i)));
  const L = nodes.length, D = [], F = [];
  for (let s = 0; s < L; s++) {
    const d = new Array(L).fill(99), f = new Array(L).fill(99); d[s] = 0; f[s] = 0;
    let q = [s]; while (q.length) { const u = q.shift(); for (const v of nodes[u].next.concat(nodes[u].prev)) if (d[v] > d[u] + 1) { d[v] = d[u] + 1; q.push(v); } }
    q = [s]; while (q.length) { const u = q.shift(); for (const v of nodes[u].next) if (f[v] > f[u] + 1) { f[v] = f[u] + 1; q.push(v); } }
    D.push(d); F.push(f);
  }
  return { nodes, D, F };
}
const CLASSIC = Object.assign(mkGraph(TILE.map(([x, z], i) => ({ x, z, t: i === 10 ? "SH" : i === 20 ? "D" : TYPES[i], next: [(i + 1) % N] }))),
  { id: "classic", name: "Classic Loop", blurb: "One big loop. Good for learning.", ground: "#7CC66A" });
const JUNK = (() => {
  const nodes = [], add = (x, z, t) => { nodes.push({ x, z, t, next: [] }); return nodes.length - 1; };
  const line = (a, b, types) => types.map((t, k) => { const f = (k + 1) / (types.length + 1); return add(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, t); });
  const chain = ids => { for (let k = 0; k < ids.length - 1; k++) nodes[ids[k]].next.push(ids[k + 1]); };
  const S = add(-11, 13, "S"), L1 = line([-11, 13], [-11, 0], ["B", "R", "B"]), JL = add(-11, 0, "B");
  const T1 = line([-11, 0], [-11, -13], ["SH", "B", "E"]), C1 = add(-11, -13, "B"), T2 = line([-11, -13], [11, -13], ["R", "B", "CV", "B", "SC", "B"]), C2 = add(11, -13, "B"), T3 = line([11, -13], [11, 0], ["R", "E", "B"]);
  const JR = add(11, 0, "B"), M = line([-11, 0], [11, 0], ["CV", "SC", "CR", "CV", "D"]);
  const R1 = line([11, 0], [11, 13], ["R", "SH", "E"]), JB = add(11, 13, "B"), BT = line([11, 13], [-11, 13], ["B", "R", "SC", "B", "D"]);
  const H1 = line([11, 13], [0, 4.5], ["SC", "E"]), HM = add(0, 4.5, "CR"), H2 = line([0, 4.5], [-11, 13], ["SC", "R"]);
  chain([S, ...L1, JL]); chain([JL, ...T1, C1, ...T2, C2, ...T3, JR]); chain([JL, ...M, JR]); chain([JR, ...R1, JB]); chain([JB, ...BT, S]); chain([JB, ...H1, HM, ...H2, S]);
  nodes[JL].labels = { [T1[0]]: "Long way round (shop)", [M[0]]: "Conveyor shortcut" };
  nodes[JB].labels = { [BT[0]]: "Main road", [H1[0]]: "Through the Heap (scrap piles)" };
  nodes[M[0]].conv = { dir: -1, n: 2 }; nodes[M[3]].conv = { dir: -1, n: 2 }; nodes[T2[2]].conv = { dir: 1, n: 3 };
  return Object.assign(mkGraph(nodes), { id: "junk", name: "Junkyard Jumble", blurb: "Forks, conveyor belts, crushers and Magnet Mike.", ground: "#A39276", rival: true, rivalHome: HM });
})();
/* Volcano Quarry: the board is the crater of a volcano. The rim road runs round the crater lip (y 8, always safe); inside, separate rock ledges stand in the lava lake and wind smoothly down:
   upper ledges (y 7 → 5, `sl`, safe), lower ledges (y 4 → 3, `lv:2`, flood at high lava), crater floor (y ~1, `lv:1`, floods while lava rises). Rock conveyor bridge `br` spans the crater */
const VOLCANO = (() => {
  const nodes = [], D2R = Math.PI / 180, add = (r, deg, y, t, o) => { nodes.push(Object.assign({ x: r * Math.cos(deg * D2R), z: r * Math.sin(deg * D2R), y, t, next: [] }, o || {})); return nodes.length - 1; };
  const chain = ids => { for (let k = 0; k < ids.length - 1; k++) nodes[ids[k]].next.push(ids[k + 1]); };
  /* a winding ledge: radius and height change smoothly from the first space to the last */
  const arc = (r0, r1, y0, y1, degs, types, o) => degs.map((d, k) => { const f = degs.length > 1 ? k / (degs.length - 1) : 0; return add(r0 + (r1 - r0) * f, d, y0 + (y1 - y0) * f, types[k], o); });
  const JIT = [0, 1.5, -1, 2, 0, -2, 1, 0, -1.5, 2, 0, -1, 1.5, 0, -2, 0, 1, -1, 0, 1.5, 0, -1.5, 1, 0, 0, 2, -1, 1, 0, -1, 0, 1.5, -1, 0, 1, -1];
  const RIM = ["S", "B", "E", "B", "B", "R", "B", "SH", "B", "E", "B", "R", "B", "B", "D", "B", "E", "R", "B", "B", "E", "SH", "B", "R", "B", "B", "B", "E", "R", "B", "B", "D", "B", "R", "E", "B"];
  const rim = RIM.map((t, k) => add(29 + (k % 3 === 1 ? .25 : k % 3 === 2 ? -.2 : 0), 90 + 10 * k + JIT[k], 8, t, { rim: 1 }));
  const U1 = arc(23.5, 22.5, 7, 5.2, [143, 158, 173, 188, 203], ["B", "E", "B", "SC", "B"], { sl: 1 });
  const L1 = arc(16, 16, 4.1, 2.9, [218, 236, 254, 271], ["B", "GY", "B", "R"], { lv: 2 });
  const C = Array.from({ length: 10 }, (_, i) => add(9.5, 286 + i * 28.9, 1 + .35 * Math.abs(i - 4.5) / 4.5, ["B", "OB", "B", "E", "B", "GY", "B", "OB", "R", "B"][i], { lv: 1 }));
  const L2 = arc(16, 16, 2.9, 3.8, [166, 146, 126, 106], ["SC", "B", "E", "B"], { lv: 2 });
  /* refineries: a gate over a normal space (like the factory, it has no tile of its own) */
  [rim[25], U1[2], L2[3]].forEach(i => { nodes[i].ref = 1; });
  const U2 = arc(22.5, 23.2, 5, 7.2, [94, 76, 58, 40], ["B", "B", "SC", "E"], { sl: 1 });
  const U3 = arc(23, 22.5, 7, 5.2, [282, 296, 310, 324], ["B", "R", "E", "B"], { sl: 1 });
  const L3 = arc(16, 16, 4, 3.2, [337, 352], ["B", "SC"], { lv: 2 });
  const a = nodes[U1[3]], b = nodes[U2[2]], BT = ["CV", "B", "CV", "R", "B", "CV", "B", "E"];
  const BR = BT.map((t, k) => { const f = (k + 1) / (BT.length + 1); nodes.push({ x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, y: a.y + (b.y - a.y) * f + .7 * Math.sin(f * Math.PI), t, next: [], br: 1 }); return nodes.length - 1; });
  chain([...rim, rim[0]]); chain([rim[4], ...U1]); chain([U1[3], ...BR, U2[2]]); chain([U1[4], rim[12]]); chain([U1[4], ...L1, ...C, ...L2, ...U2, rim[30]]); chain([rim[18], ...U3, ...L3, C[3]]);
  nodes[rim[4]].labels = { [rim[5]]: "Rim road (safe)", [U1[0]]: "Down into the crater" };
  nodes[rim[18]].labels = { [rim[19]]: "Rim road (safe)", [U3[0]]: "Mine track to the crater floor" };
  nodes[U1[3]].labels = { [U1[4]]: "Keep to the ledge", [BR[0]]: "Rock conveyor bridge" };
  nodes[U1[4]].labels = { [rim[12]]: "Back up to the rim", [L1[0]]: "Deeper: crater floor (shards)" };
  nodes[L1[1]].gy = rim[15]; nodes[C[5]].gy = U2[1];
  BT.forEach((t, k) => { if (t === "CV") nodes[BR[k]].conv = { dir: 1, n: 2 }; });
  return Object.assign(mkGraph(nodes), { id: "volcano", name: "Volcano Quarry", blurb: "Mine obsidian shards in the crater, refine them into power cells, but watch the lava.", ground: "#3E322D", dice: 1.5, lava: true, shards: true,
    rules: ["Land on crater-floor blue spaces for +1 obsidian shard (no coins), or on obsidian for +2.", "Drive onto or past a refinery to turn 3 shards into a power cell. Your truck carries up to 5 shards and 2 cells.", "Battery factory: 1 power cell + 10 coins, or 50 coins without a cell.", "Landing on lava, or getting pushed uphill by rising lava, costs a shard."], size: 2, camY: 3, follow: 1.2 });
})();
/* layout and shape tuned in the map editor (2026-10-04) */
VOLCANO.bake = {
  p: {glow: 2.05,lava2: 4.55,lava1: 2.6,haze: 1,pebbles: 3,pillarR: 1.04,pillarSides: 14,edgeRound: 0.3,ledgeW: 1.95,rimW: 1.95,roadW: 2.75,tileSides: 10,tileR: 1.02},
  n: {
    12: {x: -24.727,y: 7.941,z: -15.152,r: 0,s: 1},
    32: {x: 18.227,y: 8,z: 22.529,r: 0,s: 1},
    36: {x: -18.106,y: 7.519,z: 14.752,r: 0,s: 1},
    37: {x: -21.336,y: 6.55,z: 9.199,r: 0,s: 1},
    39: {x: -22.529,y: 5.65,z: -3.166,r: -1.983,s: 1},
    40: {x: -20.711,y: 5.509,z: -8.791,r: 0,s: 1},
    41: {x: -13.489,y: 4.1,z: -10.439,r: 0,s: 1},
    42: {x: -9.532,y: 3.7,z: -14.32,r: 0,s: 1},
    44: {x: 0.569,y: 2.9,z: -14.988,r: 0,s: 1},
    45: {x: 4.975,y: 2.157,z: -11.423,r: 0,s: 1},
    46: {x: 5.43,y: 1.875,z: -6.457,r: 0,s: 1},
    47: {x: 7.671,y: 2.092,z: -2.962,r: 0,s: 1},
    48: {x: 8.339,y: 2.115,z: 0.604,r: 0,s: 1},
    49: {x: 6.976,y: 1.853,z: 4.374,r: 0,s: 1},
    50: {x: 3.791,y: 1.795,z: 6.791,r: 0,s: 1},
    51: {x: 0.191,y: 1.774,z: 6.497,r: 0,s: 1},
    52: {x: -3.754,y: 1.885,z: 4.897,r: 0,s: 1},
    53: {x: -6.465,y: 1.973,z: 1.713,r: 0,s: 1},
    54: {x: -8.21,y: 2.119,z: -2.27,r: 0,s: 1},
    55: {x: -13.638,y: 2.9,z: -2.708,r: 0,s: 1},
    56: {x: -17.826,y: 3.2,z: 3.318,r: 0,s: 1},
    57: {x: -13.714,y: 3.5,z: 9.836,r: 0,s: 1},
    58: {x: -7.344,y: 3.8,z: 14.593,r: 0,s: 1},
    59: {x: -3.121,y: 5,z: 20.874,r: 0,s: 1},
    60: {x: 4.201,y: 5.733,z: 21.844,r: 0,s: 1},
    61: {x: 12.17,y: 6.467,z: 19.477,r: -1.046,s: 1},
    66: {x: 17.273,y: 5.2,z: -12.191,r: 0,s: 1},
    67: {x: 17.105,y: 4,z: -6.791,r: 0,s: 1},
    68: {x: 13.946,y: 3.2,z: -2.182,r: 0,s: 1},
    70: {x: -14.096,y: 6.281,z: 2.482,r: 0,s: 1},
    71: {x: -9.968,y: 6.528,z: 5.207,r: 0,s: 1},
    72: {x: -6.429,y: 6.691,z: 7.569,r: 0,s: 1},
    73: {x: -2.449,y: 6.669,z: 10.015,r: 0,s: 1},
    74: {x: 0.923,y: 6.801,z: 12.228,r: 0,s: 1}
  },
  o: {island: {p: [0.87,0,-0.906],r: [0,0,0],s: [1.257,1.257,1.257]}}
};
const MAPS = { junk: JUNK, classic: CLASSIC, volcano: VOLCANO };
/* lava cycle (7 rounds): low 3, rising 2 (crater floods), high 1 (lower ledges too), eruption round (still high), then it drains */
const LAVA_CYCLE = 7, LAVA_Y = [.2, 2.05, 4.45];
const lavaPh = r => (Math.max(1, r) - 1) % LAVA_CYCLE;
function lavaLv(r) { const ph = lavaPh(r); return ph < 3 ? 0 : ph < 5 ? 1 : 2; }
function flooded(i, r) { const n = MAP.nodes[i]; return !!(MAP.lava && n && n.lv && n.lv <= lavaLv(r)); }
function lavaChip(r) { return ["🟢", "🟡", "🔴"][lavaLv(r)] + (lavaPh(r) === 6 ? "🌋" : ""); }
function lavaText(r) {
  const ph = lavaPh(r), lv = lavaLv(r), name = ["Lava low", "Lava rising", "Lava high"][lv];
  if (ph === 6) return `${name}: the volcano erupts at the end of this round!`;
  if (ph === 5) return `${name}: crater and lower ledges are flooded. Eruption next round.`;
  const left = (lv === 0 ? 3 : 5) - ph;
  return lv === 0 ? `${name}: the crater is open. Lava rises in ${left} round${left > 1 ? "s" : ""}.` : `${name}: the crater floor is flooded. Lower ledges flood in ${left} round${left > 1 ? "s" : ""}.`;
}
let MAP = JUNK;
function syncMap() { const m = G && MAPS[G.map || "classic"]; if (m && m !== MAP) MAP = m; }
/* map editor hooks: edits = { p: shape params, n: { space: {x, y, z, r (extra yaw), s (scale)} }, o: { prop id: {p, r, s} } }; baked ones live in map.bake, the editor's own in localStorage (trp_mapedit) */
const ED_PARAMS = [["tileSides", "Tile sides", 3, 12, 1, 6], ["tileR", "Tile size", .6, 1.6, .02, 1], ["roadW", "Road width", 1.2, 3.4, .05, 2],
  ["ledgeW", "Ledge half-width", 1, 3.5, .05, 1.75, 1], ["rimW", "Rim half-width", 1, 3.5, .05, 2.1, 1], ["edgeRound", "Rounded ledge edges", 0, 1.2, .05, 0, 1],
  ["pillarSides", "Pillar sides", 3, 16, 1, 8, 1], ["pillarR", "Pillar size", .6, 1.6, .02, 1, 1], ["pebbles", "Pebbles", 0, 3, .1, 1, 1],
  ["lava0", "Lava low", -1, 3, .05, .2, 1], ["lava1", "Lava rising", 0, 5, .05, 2.05, 1], ["lava2", "Lava high", 1, 7, .05, 4.45, 1], ["haze", "Haze", 0, 2, .05, 1, 1], ["glow", "Lava glow", 0, 3, .05, 1, 1]];
const ED_DEF = {}; ED_PARAMS.forEach(q => { ED_DEF[q[0]] = q[5]; });
let EDC = { p: {}, n: {}, o: {}, reg: {} };
const ep = k => { const v = EDC.p[k]; return typeof v === "number" ? v : ED_DEF[k]; };
function mapEdits(map) { const ls = (LS.get("trp_mapedit", {}) || {})[map.id] || {}, b = map.bake || {}; return { p: Object.assign({}, b.p, ls.p), n: Object.assign({}, b.n, ls.n), o: Object.assign({}, b.o, ls.o) }; }
function applyMapEdits(map) {
  EDC = Object.assign(mapEdits(map), { reg: {} }); map._fs = null;
  map.nodes.forEach((n, i) => { if (!n._o) n._o = { x: n.x, y: n.y, z: n.z }; const e = EDC.n[i] || {}; ["x", "y", "z"].forEach(k => { n[k] = typeof e[k] === "number" ? e[k] : n._o[k]; }); });
  if (map.lava) [0, 1, 2].forEach(i => { LAVA_Y[i] = ep("lava" + i); });
}
function edReg(o, id) { o.userData.edId = id; EDC.reg[id] = o; const e = EDC.o[id]; if (e) { if (e.p) o.position.fromArray(e.p); if (e.r) o.rotation.set(e.r[0], e.r[1], e.r[2]); if (e.s) o.scale.fromArray(e.s); } return o; }
const SPACE_COL = { B: "#2F7DE1", R: "#E5484D", E: "#8E5BE0", S: "#F4F6F9", SC: "#B0703C", CR: "#4B515E", CV: "#2A2F3A", D: "#FF8A1F", SH: "#1FB5A8", OB: "#3B2466", GY: "#4A525C" };
const SPACE_INFO = { B: "+3 coins", R: "−3 coins", E: "Surprise", SC: "Scrap pile: 0–15 coins", CR: "Crusher: −5 coins, free item", CV: "Conveyor belt", D: "Duel", SH: "Shop", OB: "Obsidian: +2 shards", GY: "Geyser: blasts you up the slope" };
function tileIcon(type) {
  return canvasTex(128, 128, (x, w, h) => {
    x.textAlign = "center"; x.textBaseline = "middle";
    if (type === "S") { for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { x.fillStyle = (i + j) % 2 ? "#151B24" : "#FFFFFF"; x.fillRect(16 + i * 16, 16 + j * 16, 16, 16); } return; }
    if (type === "CR") { x.save(); x.beginPath(); x.arc(64, 64, 50, 0, 7); x.clip(); for (let i = -8; i < 12; i++) { x.fillStyle = i % 2 ? "#151B24" : "#FFC83D"; x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16 + 16, 0); x.lineTo(i * 16 + 144, 128); x.lineTo(i * 16 + 128, 128); x.fill(); } x.restore(); x.fillStyle = "#151B24"; x.beginPath(); x.arc(64, 64, 36, 0, 7); x.fill(); return; }
    if (type === "GY") { /* geyser: rock vent with a steam column and a cloud on top */
      x.fillStyle = "#1E2530"; x.beginPath(); x.moveTo(30, 108); x.lineTo(46, 88); x.lineTo(82, 88); x.lineTo(98, 108); x.closePath(); x.fill();
      x.fillStyle = "#fff"; x.beginPath(); x.moveTo(54, 90); x.quadraticCurveTo(58, 62, 52, 44); x.lineTo(76, 44); x.quadraticCurveTo(70, 62, 74, 90); x.closePath(); x.fill();
      [[64, 34, 17], [45, 40, 12], [83, 40, 12], [54, 24, 11], [75, 24, 11]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
      [[36, 62, 4], [92, 58, 4], [30, 78, 3], [98, 74, 3]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }); return; }
    if (type === "OB") { x.fillStyle = "#B78CFF"; x.beginPath(); [[64, 10], [96, 46], [64, 118], [32, 46]].forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.fill(); x.fillStyle = "#fff"; x.font = "900 40px Rubik, Arial"; x.fillText("+2", 64, 62); return; }
    if (type === "SCO") { x.fillStyle = "#FF8A3D"; x.font = "900 54px Rubik, Arial"; x.fillText("−5", 64, 68); return; }
    x.fillStyle = "#fff"; const T = { E: ["?", 92], SC: ["$?", 58], D: ["VS", 58], SH: ["$", 88] }[type]; if (!T) return;
    x.font = `900 ${T[1]}px Rubik, Arial`; x.fillText(T[0], 64, 70);
  });
}
/* ---------- raised tile symbols (like the + / − bars): strokes and shapes extruded up from the tile top (y .48), glyph "up" = away from the camera (−z) ----------
   layers that cross get different heights (≥ .02 apart) so their tops never z-fight */
const arcPts = (cx, cy, r, a0, a1, n = 12) => Array.from({ length: n + 1 }, (_, k) => { const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
/* one outline shape for a stroke along a polyline: mitred joints, flat ends */
function strokeShape(pts, w) {
  const L = [], R = [], n = pts.length, h = w / 2, nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  for (let k = 0; k < n; k++) {
    const n0 = k > 0 ? nrm(pts[k - 1], pts[k]) : null, n1 = k < n - 1 ? nrm(pts[k], pts[k + 1]) : null; let nx, ny, m = 1;
    if (n0 && n1) { nx = n0[0] + n1[0]; ny = n0[1] + n1[1]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; m = 1 / Math.max(.35, nx * n1[0] + ny * n1[1]); } else [nx, ny] = n0 || n1;
    L.push([pts[k][0] + nx * h * m, pts[k][1] + ny * h * m]); R.push([pts[k][0] - nx * h * m, pts[k][1] - ny * h * m]);
  }
  return polyShape(L.concat(R.reverse()));
}
function polyShape(pts) { const sh = new THREE.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath(); return sh; }
function discShape(x, y, r) { const sh = new THREE.Shape(); sh.absarc(x, y, r, 0, Math.PI * 2, false); return sh; }
const rotPts = (pts, deg, ox, oy) => { const a = deg * Math.PI / 180, c = Math.cos(a), s_ = Math.sin(a); return pts.map(([x, y]) => [ox + x * c - y * s_, oy + x * s_ + y * c]); };
const SYM_W = "#FFFFFF";
/* per tile type: layers [shapes, height, colour] */
function symLayers(t) {
  const st = (pts, w) => strokeShape(pts, w);
  if (t === "E") return [[[st(arcPts(0, .17, .2, 160, -35, 16).concat([[.09, .0], [.025, -.05], [0, -.09], [0, -.17]]), .15), discShape(0, -.36, .09)], .08, SYM_W]];
  if (t === "SH") { const S = arcPts(0, .13, .17, 25, 270).concat(arcPts(0, -.21, .17, 90, -155).slice(1)); return [[[st(S, .12)], .07, SYM_W], [[st([[0, -.46], [0, .46]], .07)], .1, SYM_W]]; }
  if (t === "D") { const S = arcPts(.25, .1, .1, 30, 270, 10).concat(arcPts(.25, -.1, .1, 90, -150, 10).slice(1)); return [[[st([[-.42, .2], [-.27, -.2], [-.12, .2]], .1), st(S, .09)], .08, SYM_W]]; }
  if (t === "SC") { /* shovel */ const blade = rotPts([[-.16, .12], [.16, .12], [.16, -.08], [0, -.26], [-.16, -.08]], 45, .18, -.18);
    return [[[st([[-.33, .33], [.1, -.1]], .1)], .07, SYM_W], [[st([[-.43, .23], [-.23, .43]], .1), polyShape(blade)], .095, SYM_W]]; }
  if (t === "CR") { const five = [[.3, .2], [.08, .2], [.06, .02]].concat(arcPts(.16, -.08, .13, 130, -150, 12).slice(1)); return [[[st([[-.34, 0], [-.12, 0]], .09), st(five, .09)], .08, SYM_W]]; }
  if (t === "OB") { const plus = [st([[-.3, 0], [-.08, 0]], .075), st([[-.19, -.11], [-.19, .11]], .075)], two = st(arcPts(.13, .07, .1, 165, -35, 10).concat([[.03, -.14], [.25, -.14]]), .075);
    return [[[polyShape([[0, .5], [.36, .14], [0, -.5], [-.36, .14]])], .05, "#B78CFF"], [plus.concat([two]), .1, SYM_W]]; }
  if (t === "S") { const sq = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) { const x = -.58 + i * .194, y = -.58 + j * .194; sq.push(polyShape([[x, y], [x + .194, y], [x + .194, y + .194], [x, y + .194]])); } return [[sq, .04, "#151B24"]]; }
  return null;
}
const SYM_GEO = {};
function tileSymbol(t) {
  const L = SYM_GEO[t] || (SYM_GEO[t] = (symLayers(t) || []).map(([shapes, h, col]) => { const g = new THREE.ExtrudeGeometry(shapes, { depth: h, bevelEnabled: false, curveSegments: 14 }); g.rotateX(-Math.PI / 2); return [varyColors(g), col]; }));
  if (!L.length) return null; const g = new THREE.Group(), k = { SC: 1.35, GY: 1.35, OB: 1.1 }[t] || 1; g.position.y = .48; g.scale.set(k, 1, k);
  L.forEach(([geo, col]) => { const m = new THREE.Mesh(geo, M(col, { vertexColors: true })); m.castShadow = true; m.receiveShadow = true; g.add(m); });
  return g;
}
let CHEV_TEX = null;
function chevTex() { return CHEV_TEX || (CHEV_TEX = canvasTex(64, 64, (x) => { x.lineCap = x.lineJoin = "round"; x.beginPath(); x.moveTo(14, 46); x.lineTo(32, 20); x.lineTo(50, 46); x.strokeStyle = "#151B24"; x.lineWidth = 16; x.stroke(); x.strokeStyle = "#FFFFFF"; x.lineWidth = 8; x.stroke(); })); }
function beltTex() { const t = canvasTex(64, 64, (x, w, h) => { x.fillStyle = "#2A2F3A"; x.fillRect(0, 0, w, h); x.strokeStyle = "#FFC83D"; x.lineWidth = 9; x.lineCap = "round"; x.beginPath(); x.moveTo(14, 44); x.lineTo(32, 24); x.lineTo(50, 44); x.stroke(); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2); return t; }
function textSprite(txt, bg, fg, w = 2.2) {
  const tex = canvasTex(256, 96, (x, W_, H) => { x.fillStyle = bg; rr(x, 6, 6, W_ - 12, H - 12, 26); x.fill(); x.fillStyle = fg; x.font = "900 52px Rubik, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, W_ / 2, H / 2 + 3); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); sp.scale.set(w, w * 96 / 256, 1); return sp;
}
/* 3D title signs: a framed board facing +z, text on both faces. style: wood | barn | neon | race */
function signTex(txt, style, col, pw, ph) {
  return canvasTex(pw, ph, (x, w, h) => {
    const R = mulberry(txt.length * 97 + pw);
    if (style === "neon") { x.fillStyle = "#11141C"; x.fillRect(0, 0, w, h); x.strokeStyle = "#262C3A"; x.lineWidth = 4; for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(0, h * i / 6); x.lineTo(w, h * i / 6); x.stroke(); } }
    else if (style === "race") { x.fillStyle = "#151B24"; x.fillRect(0, 0, w, h); const q = h / 4; [0, w - q * 3].forEach(x0 => { for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? "#151B24" : "#F4F6F9"; x.fillRect(x0 + i * q, j * q, q, q); } }); }
    else {
      const n = 3, pl = h / n, base = style === "barn" ? ["#9C6B44", "#8E5F3A", "#A47249"] : ["#A0703F", "#8F6036", "#B07B45"];
      for (let i = 0; i < n; i++) { x.fillStyle = base[i % 3]; x.fillRect(0, i * pl, w, pl);
        for (let k = 0; k < 9; k++) { const y0 = i * pl + 3 + R() * (pl - 6); x.strokeStyle = `rgba(55,30,12,${.12 + R() * .14})`; x.lineWidth = .8 + R() * 1.4; x.beginPath(); x.moveTo(0, y0); x.bezierCurveTo(w * .3, y0 + (R() - .5) * 6, w * .7, y0 + (R() - .5) * 6, w, y0 + (R() - .5) * 4); x.stroke(); }
        if (R() < .8) { x.fillStyle = "rgba(60,32,14,.45)"; x.beginPath(); x.ellipse(w * (.1 + R() * .8), i * pl + pl * (.3 + R() * .4), 4 + R() * 5, 2 + R() * 2, 0, 0, 7); x.fill(); }
        x.fillStyle = "rgba(38,20,8,.75)"; x.fillRect(0, i * pl - 1.5, w, 3);
        x.fillStyle = "#3A3F4A"; [9, w - 9].forEach(nx => [pl * .3, pl * .7].forEach(ny => { x.beginPath(); x.arc(nx, i * pl + ny, 2.2, 0, 7); x.fill(); })); }
      if (style === "barn") { x.fillStyle = "rgba(168,40,34,.84)"; x.fillRect(0, 0, w, h); x.strokeStyle = "#F3EEE4"; x.lineWidth = h * .07; x.strokeRect(h * .12, h * .12, w - h * .24, h - h * .24);
        for (let k = 0; k < 40; k++) { x.fillStyle = "rgba(150,100,60,.35)"; x.fillRect(R() * w, R() * h, 2 + R() * 10, 1 + R() * 2); } }
    }
    let fs = h * (style === "race" ? .62 : .56); const fnt = () => `${Math.round(fs)}px Bungee, 'Arial Black', Impact, sans-serif`; x.font = fnt();
    const mw = w * (style === "race" ? .66 : style === "barn" ? .74 : .86), tw = x.measureText(txt).width; if (tw > mw) { fs *= mw / tw; x.font = fnt(); }
    x.textAlign = "center"; x.textBaseline = "middle"; const cy = h / 2 + fs * .06;
    if (style === "neon") { x.shadowColor = col; x.shadowBlur = fs * .5; x.fillStyle = col; x.fillText(txt, w / 2, cy); x.fillText(txt, w / 2, cy); x.shadowBlur = fs * .15; x.lineWidth = Math.max(1.5, fs * .045); x.strokeStyle = "#FFF0F7"; x.strokeText(txt, w / 2, cy); x.shadowBlur = 0; }
    else if (style === "race") { x.fillStyle = col; x.fillText(txt, w / 2, cy); }
    else { x.save(); x.translate(w / 2, cy); x.rotate(style === "wood" ? -.02 : 0); x.lineJoin = "round"; x.lineWidth = fs * .16; x.strokeStyle = style === "barn" ? "#5A1612" : "#3B2414"; x.strokeText(txt, 0, 0); x.fillStyle = col; x.fillText(txt, 0, 0);
      x.globalCompositeOperation = "destination-out"; for (let k = 0; k < 26; k++) { x.fillStyle = `rgba(0,0,0,${.15 + R() * .3})`; x.fillRect((R() - .5) * w * .8, (R() - .5) * fs, 2 + R() * 7, 1 + R() * 3); } x.restore(); }
  });
}
function signBoard(txt, o = {}) {
  const style = o.style || "wood", w = o.w || 6, h = o.h || 1.8, col = o.col || (style === "neon" ? "#FF6FAE" : style === "race" ? "#FFC83D" : "#FFE9B8"), g = new THREE.Group();
  const pw = Math.min(1024, Math.round(w * 96)), ph = Math.max(48, Math.round(pw * h / w)), tex = signTex(txt, style, col, pw, ph);
  const mat = style === "neon" ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshStandardMaterial({ map: tex, roughness: .88, metalness: 0 });
  const dep = style === "neon" ? .3 : .22, fc = { wood: "#5E3A20", barn: "#4A2A16", neon: "#0B0E14", race: "#151B24" }[style];
  g.add(B(w + .2, h + .2, dep, fc, 0, 0, 0));
  [1, -1].forEach(sd => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.z = sd * (dep / 2 + .012); if (sd < 0) p.rotation.y = Math.PI; g.add(p); });
  if (style === "wood" || style === "barn") g.add(B(w + .5, .16, dep + .18, "#4A2E18", 0, h / 2 + .18, 0));
  if (style === "neon") { const nm = new THREE.MeshBasicMaterial({ color: col }); [[w + .1, .06, 0, h / 2 + .04], [w + .1, .06, 0, -h / 2 - .04], [.06, h + .1, w / 2 + .04, 0], [.06, h + .1, -w / 2 - .04, 0]].forEach(([bw, bh, bx, by]) => [1, -1].forEach(sd => { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, .05), nm); b.position.set(bx, by, sd * (dep / 2 + .05)); g.add(b); })); }
  return g;
}
function junkPile(s, x, z, k = 1, rng = Math.random) {
  const cols = ["#8C5A3C", "#6F7682", "#A0673A", "#5B6B4E", "#7A4E3A", "#9AA3AE", "#C28A4A"];
  for (let i = 0; i < 9; i++) { const r = (1 - i / 10) * 1.6 * k, a = rng() * 6.28, sz = (.5 + rng() * .7) * k;
    const m = rng() < .35 ? Cy(sz * .45, sz * .45, sz * .9, 7, cols[i % 7], x + Math.cos(a) * r, sz * .45 + i * .18 * k, z + Math.sin(a) * r) : B(sz, sz * .7, sz * 1.2, cols[(i + 3) % 7], x + Math.cos(a) * r, sz * .35 + i * .16 * k, z + Math.sin(a) * r);
    m.rotation.set(rng() * .8, rng() * 6, rng() * .8); s.add(m); }
}
function tireStack(s, x, z, n = 3) { for (let i = 0; i < n; i++) { const t = mesh(new THREE.TorusGeometry(.42, .2, 6, 10), "#23272F"); t.rotation.x = Math.PI / 2; t.position.set(x + (Math.random() - .5) * .1, .2 + i * .36, z); s.add(t); } }
function wreck(s, x, z, col, rot) { const g = new THREE.Group(); g.add(B(2.2, .5, 1.1, col, 0, .25, 0), B(1.1, .35, 1, col, -.2, .6, 0), B(.6, .25, 1.02, "#5A6070", .25, .6, 0)); g.position.set(x, 0, z); g.rotation.set(0, rot, .12); s.add(g); }
function fence(s, x1, z1, x2, z2) { const L = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(L / 3); for (let i = 0; i <= n; i++) s.add(B(.14, 1.8, .14, "#7A818E", x1 + (x2 - x1) * i / n, .9, z1 + (z2 - z1) * i / n));
  const p = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.5), new THREE.MeshStandardMaterial({ color: "#B8C0CC", transparent: true, opacity: .35, side: THREE.DoubleSide })); p.position.set((x1 + x2) / 2, .95, (z1 + z2) / 2); p.rotation.y = -Math.atan2(z2 - z1, x2 - x1); s.add(p); }
function classicScenery(s) {
  [[95,100,1.3],[150,118,.9],[262,98,1.2],[215,128,.8],[120,78,.8],[88,215,1],[90,330,1.1],[265,318,1],[104,398,.9],[265,400,1.1],[160,300,.8],[20,250,1.2],[20,140,1],[345,120,1.1],[345,380,1],[180,475,1.3],[100,12,1],[250,10,1.2],[345,230,.9],[18,380,1.1],[-10,60,1.4],[372,40,1.3],[375,470,1.2],[-15,470,1.3],[200,500,1.1]].forEach(([x, y, k], i) => { const [wx, wz] = W3(x, y); s.add(edReg(tree(wx, wz, k), "tree" + i)); });
  const [px, pz] = W3(195, 360), pg = new THREE.Group(); pg.position.set(px, 0, pz); s.add(edReg(pg, "pond"));
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 18), new THREE.MeshStandardMaterial({ color: "#4FB3E8", roughness: .15, metalness: .2, flatShading: true })); pond.rotation.x = -Math.PI / 2; pond.scale.set(3.6, 1.9, 1); pond.position.set(0, .05, 0); pg.add(pond);
  const rim = Cy(1, 1.05, .08, 18, "#D9C79A", 0, .02, 0); rim.scale.set(3.9, 1, 2.15); rim.castShadow = false; pg.add(rim);
}
function junkScenery(s) {
  const rng = mulberry(7);
  [[0, -6.5, 1.3], [-5.5, -6, .9], [5.5, -7, 1], [4.5, 9.5, .7], [-4.5, 9.8, .6], [-17, -6, 1.2], [17, 6, 1.1], [-17, 8, 1], [17, -9, 1.3], [0, -18, 1.2], [-8, 18.5, .9], [8, 18.5, 1]].forEach(([x, z, k]) => junkPile(s, x, z, k, rng));
  [[-6, 7.5], [6.5, 3], [-15, 0], [15, -3], [-2, -9.5]].forEach(([x, z], i) => tireStack(s, x, z, 2 + i % 3));
  [[3, -4, "#E5484D", .4], [-3.5, -3.5, "#2F7DE1", -.6], [-14.5, -12, "#6CCB2E", 1.2], [15, 11, "#FFC83D", .3], [-14, 15, "#8E5BE0", -.3]].forEach(([x, z, c, r]) => wreck(s, x, z, c, r));
  [[8, -9.5], [-8, -9], [14.5, 14.5], [-15, 3]].forEach(([x, z]) => { for (let i = 0; i < 3; i++) s.add(Cy(.35, .35, .9, 10, ["#2F7DE1", "#E5484D", "#1FA35C"][i], x + i * .75, .45, z)); });
  fence(s, -19, -19, 19, -19); fence(s, 19, -19, 19, 19); fence(s, 19, 19, -19, 19); fence(s, -19, 19, -19, -19);
  const cr = new THREE.Group(); cr.position.set(-16.5, 0, -16);
  for (let i = 0; i < 6; i++) cr.add(B(.9, .12, .12, "#E0A800", 0, 1 + i * 1.6, .45), B(.9, .12, .12, "#E0A800", 0, 1 + i * 1.6, -.45));
  cr.add(B(.12, 10, .12, "#E0A800", .45, 5, .45), B(.12, 10, .12, "#E0A800", -.45, 5, .45), B(.12, 10, .12, "#E0A800", .45, 5, -.45), B(.12, 10, .12, "#E0A800", -.45, 5, -.45), B(9, .5, .5, "#E0A800", 3.2, 10, 0), B(1.4, 1, 1, "#3A4150", -.9, 10, 0));
  s.add(edReg(cr, "crane"));
  const bb = new THREE.Group(); bb.position.set(3, 0, -21.4); bb.rotation.y = .04; s.add(edReg(bb, "sign"));
  const sg = signBoard("JUNKYARD", { style: "wood", w: 10, h: 2.6, col: "#FFC83D" }); sg.position.set(0, 4.3, 0); sg.rotation.set(-.16, 0, .025); bb.add(sg);
  [-3.4, 3.4].forEach(x => { bb.add(B(.32, 5.4, .32, "#5E3A20", x, 2.7, -.35)); const br = B(.16, 3.1, .16, "#6B4426", x * .72, 1.5, -.35); br.rotation.z = x > 0 ? .55 : -.55; bb.add(br); });
  tireStack(s, 7.2, -21.2, 2); s.add(Cy(.35, .35, .9, 10, "#E5484D", -.8, .45, -21));
}
function buildRival() {
  const g = new THREE.Group(), tr = buildTruck(7); tr.scale.setScalar(.8); g.add(tr);
  const crane = new THREE.Group(); crane.position.set(-.45, 0, 0); g.add(crane);
  crane.add(Cy(.3, .34, .22, 10, "#3A4150", 0, .8, 0), B(.16, 2.5, .16, "#3A4150", 0, 1.95, 0), B(1.95, .16, .16, "#FFC83D", -.85, 3.2, 0), B(.36, .32, .32, "#5A6272", .28, 3.15, 0));
  for (let k = 0; k < 4; k++) crane.add(B(.05, .17, .17, "#151B24", -.35 - k * .42, 3.2, 0));
  const cable = B(.04, 1, .04, "#1D2230", -1.78, 2.7, 0); crane.add(cable);
  const mag = new THREE.Group(); mag.add(Cy(.42, .42, .24, 14, "#E5484D", 0, 0, 0), Cy(.43, .43, .06, 14, "#D8DDE5", 0, -.15, 0), B(.5, .05, .05, "#FFFFFF", 0, .13, 0)); mag.position.set(-1.78, 2.15, 0); crane.add(mag);
  const tag = nameTag("Magnet Mike", "#8E5BE0"); tag.scale.multiplyScalar(1.5); tag.position.y = 4.2; g.add(tag);
  g.userData = { mag, cable, crane };
  return g;
}
/* ---------- Volcano Quarry scenery ---------- */
function obsidianMesh(k = 1) {
  const g = new THREE.Group();
  [[0, 0, 0, 1], [.32, -.08, .18, .65], [-.28, -.12, .1, .55], [.05, -.15, -.3, .5]].forEach(([x, y, z, s]) => { const c = mesh(new THREE.OctahedronGeometry(.32 * s * k, 0), "#5B2BB5", { emissive: "#7A3CFF", emissiveIntensity: .45, roughness: .25 }); c.scale.y = 1.7; c.position.set(x * k, (y + .3 * s) * k, z * k); c.rotation.set(.2 * x, x * 3, .25 * z); g.add(c); });
  return g;
}
/* Volcano Quarry buildings (same 2.2 × 1.6 footprint as the battery factory). A glowing pipe runs from the building down the outside of its rock pillar into the lava (r 2.05 clears the pillar);
   each returns a group with userData { sign (swings), puff: steam origin, puffs } */
const GEO_PIPE = { emissive: "#FF3A00", emissiveIntensity: .55 };
function geoPipe(g, x, z, top, len) {
  g.add(Cy(.11, .11, len, 8, "#D9480F", x, top - len / 2, z, GEO_PIPE));
  for (let y = top - 1.2; y > top - len + .5; y -= 2.4) g.add(Cy(.16, .16, .14, 8, "#3A302B", x, y, z));
}
function geoPuffs(g, n, col = "#F1F3F6") { const ps = []; for (let k = 0; k < n; k++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(.25, 0), new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: .85, flatShading: true, depthWrite: false })); p.userData.t = k / n; g.add(p); ps.push(p); } return ps; }
/* refinery gate over the road (trucks drive through it): a heat-exchanger tank on the lava side, a stone tower with a steam stack on the other, a girder and a glowing pipe across,
   a double-sided shard → cell sign on top and the hot pipe running from the tank down over the ledge edge into the lava. Local x runs along the road; sd = which side (±z) faces the lava */
function geoRefinery(w, sd) {
  const g = new THREE.Group(), zc = w + .45, zt = sd * zc, zs = -sd * zc;
  [zt, zs].forEach(z => g.add(B(1.05, 1.7, .95, "#4A3C36", 0, -.83, z)));
  g.add(Cy(.42, .46, 3, 10, "#8C7A6A", 0, 1.5, zt), Cy(.44, .44, .14, 10, "#D9480F", 0, 1.1, zt, GEO_PIPE), Cy(.44, .44, .14, 10, "#D9480F", 0, 2.3, zt, GEO_PIPE), Cy(.18, .42, .3, 10, "#6B5A50", 0, 3.15, zt));
  g.add(B(.9, 3.1, .8, "#6B5A50", 0, 1.55, zs), B(1, .14, .9, "#3A302B", 0, 3.15, zs), B(.05, .4, .3, "#E8620F", .46, 1.9, zs, { emissive: "#FF4500", emissiveIntensity: .5 }), B(.05, .4, .3, "#E8620F", -.46, 1.9, zs, { emissive: "#FF4500", emissiveIntensity: .5 }));
  g.add(Cy(.14, .18, .9, 8, "#4A3C36", .18, 3.65, zs), Cy(.2, .2, .1, 8, "#2A211E", .18, 4.1, zs));
  g.add(B(.32, .32, 2 * zc + .5, "#3A302B", 0, 3.3, 0));
  const xp = Cy(.12, .12, 2 * zc, 8, "#D9480F", 0, 0, 0, GEO_PIPE); xp.rotation.x = Math.PI / 2; xp.position.set(.3, 3.02, 0); g.add(xp);
  const op = Cy(.11, .11, .75, 8, "#D9480F", 0, 0, 0, GEO_PIPE); op.rotation.x = Math.PI / 2; op.position.set(0, .6, sd * (zc + .45)); g.add(op);
  geoPipe(g, 0, sd * (zc + .8), .71, 13);
  /* sign: a dark plate with shard → cell on both faces, each face read left to right from its own side (crystals sit in front of the plate, not through it) */
  const sg = new THREE.Group(); sg.add(B(1.5, .75, .1, "#151B24", 0, 0, 0), B(.1, .3, .1, "#3A302B", -.5, -.5, 0), B(.1, .3, .1, "#3A302B", .5, -.5, 0));
  const arrow = new THREE.ExtrudeGeometry(polyShape([[-.13, .035], [.03, .035], [.03, .085], [.14, 0], [.03, -.085], [.03, -.035], [-.13, -.035]]), { depth: .04, bevelEnabled: false });
  [1, -1].forEach(f => { const face = new THREE.Group(); face.rotation.y = f > 0 ? 0 : Math.PI; sg.add(face);
    const sh = obsidianMesh(.45); sh.position.set(-.42, -.18, .17); face.add(sh);
    const ar = mesh(arrow, "#FFFFFF"); ar.position.set(.02, 0, .05); face.add(ar);
    face.add(B(.18, .34, .06, "#FF9A3D", .44, 0, .08, { emissive: "#FF6A1F", emissiveIntensity: .7 }), B(.09, .06, .06, "#FF9A3D", .44, .2, .08)); });
  sg.rotation.y = Math.PI / 2; sg.position.set(0, 3.98, 0); g.add(sg);
  /* intake: a funnel under the girder, a faint purple cone of suction down to the tile, and spiral arms of half-transparent shards that bend as they climb */
  g.add(Cy(.16, .55, .45, 10, "#3A302B", 0, 2.95, 0), Cy(.57, .57, .06, 10, "#B78CFF", 0, 2.72, 0, { emissive: "#7A3CFF", emissiveIntensity: .8 }));
  const coneM = new THREE.MeshBasicMaterial({ color: "#B78CFF", transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide }), cone = new THREE.Mesh(new THREE.CylinderGeometry(.52, 1.15, 2.1, 28, 1, true), coneM);
  cone.position.y = 1.66; g.add(cone);
  const sg2 = new THREE.OctahedronGeometry(.1, 0), sm = new THREE.MeshStandardMaterial({ color: "#7A3CFF", emissive: "#7A3CFF", emissiveIntensity: .6, flatShading: true, roughness: .3, transparent: true, opacity: .5, depthWrite: false }), bits = [], ARMS = 4, PER = 6;
  for (let k = 0; k < ARMS * PER; k++) { const m = new THREE.Mesh(sg2, sm); g.add(m); bits.push(m); }
  const tick = time => { coneM.opacity = .08 + Math.sin(time * 2.2) * .025;
    bits.forEach((m, k) => { const arm = k % ARMS, u = (time * .32 + (k / ARMS | 0) / PER) % 1, a = arm / ARMS * Math.PI * 2 + time * 1.1 + u * u * Math.PI * 2.4, r = 1.1 * Math.pow(1 - u, 1.25) + .16, sc = u < .1 ? u / .1 : u > .88 ? (1 - u) / .12 : 1;
      m.position.set(Math.cos(a) * r, .58 + u * 2.1, Math.sin(a) * r); m.rotation.y = a * 2; m.scale.set(sc, sc * 1.6, sc); }); };
  g.userData = { puff: [.18, 4.2, zs], puffs: geoPuffs(g, 5), tick };
  return g;
}
/* ---------- battery factory models: two looks per style, FAC_LOOK picks the one in use ----------
   all face +z (the camera side), ~2.7 × 2 footprint; each returns a group with userData { sign (swings, optional), puff: steam origin, puffs, tick(time) } */
const FAC_LOOK = { def: "works", volc: "forge" };
const FAC_MODELS = { works: () => facWorks(), plant: () => facPlant(), forge: () => facForge(), reactor: () => facReactor() };
const glowMat = (c, e, k) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: k, flatShading: true });
/* one sawtooth roof tooth running along x: glazed vertical face toward +z, slope falling back to −z */
function sawTooth(len, d, h, col, gcol, gopt) {
  const geo = new THREE.ExtrudeGeometry(polyShape([[0, 0], [-d, 0], [0, h]]), { depth: len, bevelEnabled: false }); geo.rotateY(-Math.PI / 2); geo.translate(len / 2, 0, 0);
  const g = new THREE.Group(); g.add(mesh(geo, col), B(len * .9, h * .72, .03, gcol, 0, h * .42, .025, gopt)); return g;
}
function sawRoof(g, n, len, d, h, x, y, zFront, col, gcol, gopt) { for (let k = 0; k < n; k++) { const t = sawTooth(len, d, h, col, gcol, gopt); t.position.set(x, y, zFront - k * d); g.add(t); } }
/* a little battery riding a conveyor */
function miniBat(col, cap) { const b = new THREE.Group(); b.add(B(.2, .13, .13, col, 0, 0, 0), B(.05, .07, .07, cap, .125, 0, 0)); return b; }
/* conveyor belt along z from z0 to z1 with rails, carrying n batteries; returns a tick */
function facBelt(g, x, z0, z1, y, col, cap, n = 3) {
  const L = z1 - z0, zc = (z0 + z1) / 2; g.add(B(.38, .08, L, "#2A2F3A", x, y, zc), B(.04, .12, L, "#FFC83D", x - .21, y + .03, zc), B(.04, .12, L, "#FFC83D", x + .21, y + .03, zc));
  [z0 + .08, z1 - .08].forEach(z => g.add(B(.3, y, .08, "#5A6272", x, y / 2, z)));
  const bats = Array.from({ length: n }, () => { const b = miniBat(col, cap); b.rotation.y = Math.PI / 2; g.add(b); return b; });
  return time => bats.forEach((b, k) => { const u = (time * .18 + k / n) % 1; b.position.set(x, y + .11, z0 + .1 + u * (L - .2)); b.scale.setScalar(u < .08 ? u / .08 : u > .92 ? (1 - u) / .08 : 1); });
}
function batSign(purple) {
  const sg = new THREE.Group();
  if (purple) { const bat = batteryMesh(true); bat.scale.setScalar(.62); sg.add(B(1.25, .78, .1, "#151B24", 0, 0, -.12), bat); return sg; }
  sg.add(B(1.2, .72, .16, "#1FA35C", 0, 0, 0), B(.14, .32, .18, "#1FA35C", .66, 0, 0), B(1.3, .82, .08, "#151B24", 0, 0, -.1));
  const bolt = new THREE.Shape(); [[.05, .3], [-.18, -.02], [-.02, -.02], [-.08, -.3], [.18, .06], [.02, .06]].forEach(([x, y], i) => i ? bolt.lineTo(x, y) : bolt.moveTo(x, y));
  const bm = mesh(new THREE.ExtrudeGeometry(bolt, { depth: .06, bevelEnabled: false }), "#FFE27A", { emissive: "#FFC83D", emissiveIntensity: .6 }); bm.position.z = .08; sg.add(bm); return sg;
}
/* Battery Works: brick-based hall with ribbed walls and a glazed sawtooth roof, blue office annex, acid tanks, banded chimney, roll-up door and a battery conveyor */
function facWorks() {
  const g = new THREE.Group(), glass = { roughness: .15, metalness: .1 };
  g.add(B(2.7, .14, 2, "#8E96A3", 0, .07, 0));
  g.add(B(1.66, 1.1, 1.4, "#D8DDE5", -.42, .69, -.1), B(1.72, .32, 1.46, "#B5523B", -.42, .3, -.1), B(1.74, .06, 1.48, "#8E3E2C", -.42, .48, -.1));
  for (let x = -1.18; x < .38; x += .13) if (x < -.5 || x > .27) g.add(B(.035, .72, .04, "#BCC3CE", x, .88, .625));
  sawRoof(g, 3, 1.66, .46, .38, -.42, 1.245, .6, "#8E96A3", "#9FD6F7", glass);
  g.add(B(.66, .66, .04, "#3E4450", -.12, .47, .64), B(.6, .6, .04, "#6A717E", -.12, .45, .66));
  for (let k = 0; k < 4; k++) g.add(B(.58, .025, .02, "#4B515E", -.12, .25 + k * .13, .69));
  [-.5, .26].forEach(x => { g.add(Cy(.05, .05, .7, 8, "#FFC83D", x, .49, .74)); [.3, .56].forEach(y => g.add(Cy(.065, .065, .09, 8, "#151B24", x, y, .74))); });
  g.add(B(.8, .9, 1, "#2F7DE1", .85, .59, .25), B(.86, .08, 1.06, "#1E2530", .85, 1.08, .25), B(.24, .4, .03, "#1E2530", .98, .34, .76));
  [[.68, .52], [.68, .82], [.98, .82]].forEach(([x, y]) => g.add(B(.22, .17, .03, "#9FD6F7", x, y, .765, glass)));
  g.add(B(.3, .16, .3, "#AEB5C1", .78, 1.2, .12), Cy(.1, .1, .02, 10, "#5A6272", .78, 1.29, .12));
  [[.62, -.6], [1.06, -.52]].forEach(([x, z]) => { g.add(Cy(.22, .22, 1, 12, "#1FA35C", x, .64, z), Cy(.14, .22, .14, 12, "#157A44", x, 1.21, z), Cy(.24, .24, .05, 12, "#C9CED8", x, .42, z), Cy(.24, .24, .05, 12, "#C9CED8", x, .9, z));
    g.add(B(.03, .9, .03, "#5A6272", x - .07, .6, z + .23), B(.03, .9, .03, "#5A6272", x + .07, .6, z + .23)); for (let y = .25; y < 1.05; y += .14) g.add(B(.14, .02, .02, "#5A6272", x, y, z + .23)); });
  const tp = Cy(.05, .05, .78, 8, "#AEB5C1", 0, 0, 0); tp.rotation.z = Math.PI / 2; tp.position.set(.48, 1.38, -.56); g.add(tp, Cy(.05, .05, .2, 8, "#AEB5C1", .62, 1.3, -.6), Cy(.05, .05, .2, 8, "#AEB5C1", 1.06, 1.3, -.52), Cy(.05, .05, .14, 8, "#AEB5C1", .1, 1.33, -.56));
  for (let k = 0; k < 5; k++) g.add(Cy(.15 - k * .008, .16 - k * .008, .3, 10, k % 2 ? "#FFFFFF" : "#E5484D", -1.02, 1.4 + k * .3, -.58));
  const bc = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .1, 8), glowMat("#FFB000", "#FFB000", .9)); bc.position.set(1.18, 1.17, .62); g.add(bc, Cy(.035, .035, .05, 6, "#1E2530", 1.18, 1.1, .62));
  const sg = batSign(false); sg.position.set(-.42, 2.05, -.1); g.add(sg, B(.06, .45, .06, "#5A6272", -.82, 1.62, -.15), B(.06, .45, .06, "#5A6272", -.02, 1.62, -.15));
  const belt = facBelt(g, -.12, .7, 1.3, .2, "#1FA35C", "#C9CED8");
  g.userData = { sign: sg, puff: [-1.02, 2.95, -.58], puffs: geoPuffs(g, 5), tick: time => { belt(time); bc.material.emissiveIntensity = (time * 1.5 % 1) < .5 ? 1.2 : .15; } };
  return g;
}
/* Power Plant: a cooling tower, the hall is a giant battery on cradles, transformer yard with insulators, a lattice pylon with cables */
function facPlant() {
  const g = new THREE.Group();
  g.add(B(2.7, .14, 2, "#8E96A3", 0, .07, 0));
  const prof = [[.66, 0], [.56, .4], [.46, .9], [.45, 1.15], [.5, 1.5], [.54, 1.62]].map(([r, y]) => new THREE.Vector2(r, y)), tw = mesh(new THREE.LatheGeometry(prof, 18), "#E9EDF2", { side: THREE.DoubleSide });
  tw.position.set(-.78, .14, -.32); g.add(tw, Cy(.5, .48, .13, 18, "#E5484D", -.78, 1.44, -.32), Cy(.67, .69, .12, 18, "#8E96A3", -.78, .2, -.32), Cy(.44, .44, .02, 18, "#5A6272", -.78, 1.5, -.32));
  const bat = new THREE.Group(); bat.position.set(.42, .66, .22); g.add(bat);
  const body = Cy(.46, .46, 1.4, 18, "#1FA35C", 0, 0, 0); body.rotation.z = Math.PI / 2; const neg = Cy(.48, .48, .34, 18, "#151B24", 0, 0, 0); neg.rotation.z = Math.PI / 2; neg.position.x = -.56;
  const cap = Cy(.2, .2, .18, 14, "#C9CED8", 0, 0, 0); cap.rotation.z = Math.PI / 2; cap.position.x = .78; bat.add(body, neg, cap);
  const bolt = new THREE.Shape(); [[.05, .3], [-.18, -.02], [-.02, -.02], [-.08, -.3], [.18, .06], [.02, .06]].forEach(([x, y], i) => i ? bolt.lineTo(x, y) : bolt.moveTo(x, y));
  const bm = mesh(new THREE.ExtrudeGeometry(bolt, { depth: .06, bevelEnabled: false }), "#FFE27A", { emissive: "#FFC83D", emissiveIntensity: .7 }); bm.scale.setScalar(1.2); bm.position.set(.1, 0, .44); bat.add(bm);
  [-.3, .4].forEach(x => g.add(B(.16, .3, .7, "#8E96A3", .42 + x, .25, .22), B(.22, .06, .76, "#5A6272", .42 + x, .41, .22)));
  [.18, .62].forEach(x => { g.add(B(.34, .38, .28, "#5A6272", x, .33, -.62)); for (let k = -1; k <= 1; k++) g.add(B(.02, .3, .3, "#4B515E", x + k * .1, .33, -.62)); [-.09, .09].forEach(o => { for (let k = 0; k < 3; k++) g.add(Cy(.05, .05, .04, 8, "#B5523B", x + o, .56 + k * .06, -.62)); }); });
  const px = 1.08, pz = -.55, py = .14, H = 2.1; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { const leg = B(.035, H, .035, "#6A717E", px + a * .12, py + H / 2, pz + b * .12); leg.rotation.set(b * .045, 0, -a * .045); g.add(leg); });
  [.6, 1.2].forEach(y => g.add(B(.24, .03, .03, "#6A717E", px, py + y, pz + .1), B(.24, .03, .03, "#6A717E", px, py + y, pz - .1)));
  g.add(B(.9, .05, .05, "#6A717E", px, py + 1.75, pz), B(.6, .05, .05, "#6A717E", px, py + 2.0, pz));
  const lm = new THREE.LineBasicMaterial({ color: "#2A2F3A" }); [[-.42, 1.75], [.42, 1.75]].forEach(([o, y]) => { const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(new THREE.Vector3(px + o + (1.2 - px - o) * u, py + y - (py + y - .9) * u - Math.sin(u * Math.PI) * .12, pz + (.22 - pz) * u)); } g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm)); });
  const bc = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), glowMat("#FF3030", "#FF2020", .9)); bc.position.set(-.78, 1.68, .2); g.add(bc);
  g.userData = { sign: null, puff: [-.78, 1.7, -.32], puffs: geoPuffs(g, 7), tick: time => { bc.material.emissiveIntensity = (time * .8 % 1) < .3 ? 1.4 : .1; } };
  return g;
}
/* Forge (volcano): basalt hall with buttresses and a sawtooth roof glowing orange, a furnace mouth spilling lava into a crucible, ember-topped chimney, purple batteries on a conveyor */
function facForge() {
  const g = new THREE.Group();
  g.add(B(2.7, .18, 2, "#2E2622", 0, .09, 0), B(1.9, 1.2, 1.4, "#5E4C42", -.22, .78, -.18));
  [-1.1, -.62, .26, .66].forEach(x => g.add(B(.18, 1.05, .2, "#4A3C36", x, .7, .6), B(.24, .12, .26, "#3A302B", x, .14 + .12, .6)));
  sawRoof(g, 3, 1.9, .46, .4, -.22, 1.38, .52, "#3E434B", "#E8620F", { emissive: "#FF4500", emissiveIntensity: .6 });
  const fm = glowMat("#FF7A2A", "#FF4500", .9), ash = new THREE.Shape(); ash.moveTo(-.24, 0); ash.lineTo(.24, 0); ash.lineTo(.24, .26); ash.absarc(0, .26, .24, 0, Math.PI, false); ash.lineTo(-.24, 0);
  const mouth = new THREE.Mesh(new THREE.ExtrudeGeometry(ash, { depth: .04, bevelEnabled: false, curveSegments: 12 }), fm); mouth.position.set(-.18, .3, .53);
  g.add(B(.72, .92, .06, "#2A211E", -.18, .66, .53), mouth, B(.8, .1, .1, "#3A302B", -.18, 1.12, .56));
  g.add(B(.26, .08, .56, "#2A211E", -.18, .22, .86)); const ch = new THREE.Mesh(new THREE.BoxGeometry(.14, .02, .56), fm); ch.position.set(-.18, .27, .86); g.add(ch);
  g.add(Cy(.24, .18, .3, 10, "#2A211E", -.18, .33, 1.24)); const cr = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .02, 10), fm); cr.position.set(-.18, .48, 1.24); g.add(cr);
  g.add(Cy(.17, .24, 2.8, 8, "#4A3C36", .5, 1.6, -.66), Cy(.2, .2, .1, 8, "#2A211E", .5, 3.02, -.66)); const em = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .04, 8), glowMat("#FFB15A", "#FF5A1F", 1)); em.position.set(.5, 3.08, -.66); g.add(em);
  [-.95, -.75].forEach((x, k) => { g.add(Cy(.06, .06, 1.05, 8, "#6B4A36", x, .75, -.95)); for (let y = .35; y < 1.3; y += .3) g.add(Cy(.085, .085, .05, 8, "#3A302B", x, y, -.95)); });
  const ob = obsidianMesh(.75); ob.position.set(-1.15, .2, .78); g.add(ob);
  const hp = Cy(.11, .11, 1, 8, "#D9480F", 0, 0, 0, GEO_PIPE); hp.rotation.z = Math.PI / 2; hp.position.set(1.5, .5, .4); g.add(hp); geoPipe(g, 1.98, .4, .56, 14);
  const belt = facBelt(g, .62, .66, 1.3, .24, "#6A35D0", "#3B2466");
  const sg = batSign(true); sg.position.set(-.3, 2.35, -.2); g.add(sg, B(.06, .5, .06, "#3A302B", -.75, 1.95, -.3), B(.06, .5, .06, "#3A302B", .15, 1.95, -.3));
  g.userData = { sign: sg, puff: [.5, 3.15, -.66], puffs: geoPuffs(g, 6, "#5A4E4A"), tick: time => { belt(time); fm.emissiveIntensity = .75 + Math.sin(time * 7) * .12 + Math.sin(time * 13) * .08; em.material.emissiveIntensity = .8 + Math.sin(time * 5) * .2; } };
  return g;
}
/* Obsidian Reactor (volcano): hex basalt base, steel dome with glowing purple bands and cooling fins, a floating obsidian crystal in a spinning ring, airlock, pipes into the lava */
function facReactor() {
  const g = new THREE.Group(), pm = glowMat("#B78CFF", "#7A3CFF", .9);
  g.add(Cy(1.22, 1.32, .34, 6, "#2E2622", 0, .17, -.05), Cy(1.0, 1.08, .08, 6, "#3A302B", 0, .38, -.05));
  const dome = mesh(new THREE.SphereGeometry(.85, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), "#3E434B"); dome.position.set(0, .42, -.05); g.add(dome);
  [[.62, .832], [.92, .69]].forEach(([y, r]) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .045, 6, 28), pm); t.rotation.x = Math.PI / 2; t.position.set(0, y, -.05); g.add(t); });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .3, f = B(.07, .72, .46, "#5E4C42", Math.cos(a) * .82, .74, -.05 + Math.sin(a) * .82); f.rotation.y = -a; if (Math.sin(a) < .6) g.add(f); }
  g.add(Cy(.24, .32, .3, 8, "#2A211E", 0, 1.38, -.05));
  const cg = new THREE.Group(), cry = obsidianMesh(.8); cg.add(cry); cg.position.set(0, 1.62, -.05); g.add(cg);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.42, .03, 6, 28), pm); ring.position.set(0, 1.85, -.05); g.add(ring);
  g.add(B(.5, .55, .5, "#5E4C42", 0, .66, .82), B(.56, .08, .56, "#3A302B", 0, .96, .82), B(.2, .36, .03, "#151B24", 0, .6, 1.08)); const sl = new THREE.Mesh(new THREE.BoxGeometry(.04, .3, .02), pm); sl.position.set(0, .6, 1.1); g.add(sl);
  g.add(Cy(.12, .15, .9, 8, "#4A3C36", -.85, 1.05, -.7), Cy(.15, .15, .08, 8, "#2A211E", -.85, 1.52, -.7));
  const hp = Cy(.11, .11, 1.1, 8, "#D9480F", 0, 0, 0, GEO_PIPE); hp.rotation.z = Math.PI / 2; hp.position.set(1.45, .52, .4); g.add(hp); geoPipe(g, 1.98, .4, .58, 14);
  const hp2 = Cy(.09, .09, 1, 8, "#D9480F", 0, 0, 0, GEO_PIPE); hp2.rotation.x = Math.PI / 2; hp2.position.set(-.5, .5, -1.3); g.add(hp2); geoPipe(g, -.5, -1.78, .55, 14);
  const sg = batSign(true); sg.scale.setScalar(.7); sg.position.set(1.0, 1.75, -.45); g.add(sg, B(.06, 1.3, .06, "#3A302B", 1.0, .82, -.5));
  g.userData = { sign: sg, puff: [-.85, 1.6, -.7], puffs: geoPuffs(g, 5), tick: time => { cg.rotation.y = time * .8; cg.position.y = 1.62 + Math.sin(time * 1.6) * .08; ring.rotation.x = Math.PI / 2 + Math.sin(time * .9) * .4; ring.rotation.z = time * 1.2; pm.emissiveIntensity = .7 + Math.sin(time * 2.4) * .3; } };
  return g;
}
let SCORCH_TEX = null;
function scorchTex() {
  return SCORCH_TEX || (SCORCH_TEX = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = "#2A1D19"; x.fillRect(0, 0, w, h); const R = mulberry(11); x.strokeStyle = "#FF6A1F"; x.lineWidth = 3; x.lineCap = "round";
    for (let k = 0; k < 9; k++) { let px = R() * w, py = R() * h; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 4; s++) { px += (R() - .5) * 40; py += (R() - .5) * 40; x.lineTo(px, py); } x.stroke(); }
    x.fillStyle = "rgba(42,29,25,.75)"; x.beginPath(); x.arc(64, 64, 34, 0, 7); x.fill(); x.fillStyle = "#FFB15A"; x.font = "900 46px Rubik, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("−5", 64, 67);
  }));
}
/* the volcano's outer slope: from just under the rim road (r 30.2, y 7.9) down to the plain far below */
const CONE = { r0: 30.2, r1: 74, y0: 7.9, y1: -24 };
const coneY = r => CONE.y0 + (CONE.y1 - CONE.y0) * Math.max(0, Math.min(1, (r - CONE.r0) / (CONE.r1 - CONE.r0)));
/* molten-plate lava pattern (Voronoi cells with glowing seams), tileable N×N RGBA; shared by the crater lake and the flows on the outer slope */
let LAVA_PX = null;
function lavaPixels() {
  if (LAVA_PX) return LAVA_PX;
  const N = 256, d = new Uint8ClampedArray(N * N * 4), R = mulberry(5), P = [], mix = (a, b, t) => a + (b - a) * t;
  for (let k = 0; k < 22; k++) P.push([R() * N, R() * N, R()]);
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    let d1 = 1e9, d2 = 1e9, cell = 0;
    for (const [sx, sy, sh] of P) { let dx = Math.abs(px - sx), dy = Math.abs(py - sy); dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy); const q = dx * dx + dy * dy; if (q < d1) { d2 = d1; d1 = q; cell = sh; } else if (q < d2) d2 = q; }
    const edge = Math.sqrt(d2) - Math.sqrt(d1), seam = Math.max(0, 1 - edge / 5), glow = Math.max(0, 1 - edge / 16), core = Math.min(1, Math.sqrt(d1) / 30);
    let r = mix(236, 196, core) - cell * 18, g = mix(92, 54, core) - cell * 14, b = 22;
    r = mix(r, 255, glow * .6); g = mix(g, 150, glow * .55); r = mix(r, 255, seam); g = mix(g, 226, seam); b = mix(b, 110, seam);
    const i = (py * N + px) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
  return LAVA_PX = { N, d };
}
function lavaTex(rep) {
  const { N, d } = lavaPixels(), c = document.createElement("canvas"); c.width = c.height = N; const x = c.getContext("2d"), im = x.createImageData(N, N); im.data.set(d); x.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t;
}
/* outer-slope texture (u = round the cone, repeated twice; v = rim → foot): ash rock with smooth winding lava flows that spill from the rim,
   filled with the crater's molten plates, edged with dark cooled crust, warming the rock beside them; a few thin glowing cracks. Second canvas = glow only */
function coneTex() {
  const W_ = 2048, H_ = 896, R = mulberry(77), flows = [], cracks = [];
  for (let k = 0; k < 5; k++) {
    const x0 = (k + .25 + R() * .5) / 5 * W_, end = H_ * (.55 + R() * .4), w0 = 22 + R() * 16, f1 = .008 + R() * .006, f2 = .021 + R() * .01, a1 = 18 + R() * 26, a2 = 6 + R() * 8, ph = R() * 6, drift = (R() - .5) * 60, pts = [];
    for (let y = -6; y <= end; y += 6) { const t = Math.max(0, y) / end; pts.push([x0 + Math.sin(y * f1 + ph) * a1 + Math.sin(y * f2 + ph * 2) * a2 + drift * t, y, w0 * (.75 + .45 * Math.sin(t * Math.PI * .85)) * (t > .9 ? 1 + (t - .9) * 4 : 1)]); }
    flows.push(pts);
    /* one or two side tongues branching off and thinning out */
    for (let b = 0; b < 1 + (R() < .5); b++) { const i0 = Math.floor(pts.length * (.25 + R() * .4)), [bx, by, bw] = pts[i0], dir = R() < .5 ? -1 : 1, len = (end - by) * (.35 + R() * .4), br = [];
      for (let s = 0; s <= len; s += 6) { const t = s / len; br.push([bx + dir * (Math.pow(t, .7) * (40 + R() * 3) + Math.sin(s * .03 + ph) * 6), by + s, bw * .6 * (1 - t * .65)]); }
      flows.push(br); } }
  for (let k = 0; k < 34; k++) { let x = R() * W_, y = 20 + R() * H_ * .85, a = (R() - .5) * 1.4; const c = [[x, y, 2.2]]; for (let j = 0; j < 4 + R() * 5; j++) { a += (R() - .5) * .9; x += Math.sin(a) * 9; y += Math.cos(a) * 9; c.push([x, y, Math.max(.9, 2.2 - j * .25)]); } cracks.push(c); }
  /* masks: flow body, molten core, heat glow (shadow-only trick so it blurs on every browser) */
  const layer = (wk, blur, withCracks) => { const c = document.createElement("canvas"); c.width = W_; c.height = H_; const x = c.getContext("2d"); x.lineCap = x.lineJoin = "round"; x.strokeStyle = "#fff";
    if (blur) { x.shadowColor = "#fff"; x.shadowBlur = blur; x.shadowOffsetX = -W_ * 4; x.translate(W_ * 4, 0); }
    const run = list => list.forEach(p => { for (let i = 1; i < p.length; i++) { x.lineWidth = Math.max(.8, p[i][2] * wk); x.beginPath(); x.moveTo(p[i - 1][0], p[i - 1][1]); x.lineTo(p[i][0], p[i][1]); x.stroke(); [-W_, W_].forEach(o => { if (p[i][0] + o > -60 && p[i][0] + o < W_ + 60) { x.beginPath(); x.moveTo(p[i - 1][0] + o, p[i - 1][1]); x.lineTo(p[i][0] + o, p[i][1]); x.stroke(); } }); } });
    run(flows); if (withCracks) run(cracks); return x.getImageData(0, 0, W_, H_).data; };
  const body = layer(1, 0, true), core = layer(.75, 0, true), glow = layer(1.5, 18, true);
  const { N, d: L } = lavaPixels(), mk = (draw) => { const c = document.createElement("canvas"); c.width = W_; c.height = H_; const x = c.getContext("2d"); draw(x); return [c, x, x.getImageData(0, 0, W_, H_)]; };
  const [mc, mx, mi] = mk(x => { const g = x.createLinearGradient(0, 0, 0, H_); g.addColorStop(0, "#5A4A42"); g.addColorStop(1, "#43362F"); x.fillStyle = g; x.fillRect(0, 0, W_, H_);
    for (let k = 0; k < 2600; k++) { x.fillStyle = R() < .5 ? "rgba(30,22,18,.18)" : "rgba(120,100,88,.12)"; x.fillRect(R() * W_, R() * H_, 3 + R() * 14, 1.5 + R() * 4); } });
  const [ec, ex, ei] = mk(x => { x.fillStyle = "#000"; x.fillRect(0, 0, W_, H_); });
  const M = mi.data, E = ei.data, mix = (a, b, t) => a + (b - a) * t;
  for (let py = 0; py < H_; py++) for (let px = 0; px < W_; px++) {
    const i = (py * W_ + px) * 4, b = body[i + 3] / 255, c = core[i + 3] / 255, g = glow[i + 3] / 255; if (!b && !g) continue;
    const li = ((Math.floor(py * 1.4) % N) * N + (Math.floor(px * 1.4) % N)) * 4, s = c * c * (3 - 2 * c);
    /* warm rock → cooled crust edge → molten plates */
    let r = mix(M[i], 120, g * .45), gg = mix(M[i + 1], 52, g * .45), bb = mix(M[i + 2], 30, g * .45);
    r = mix(r, 52, b); gg = mix(gg, 22, b); bb = mix(bb, 14, b);
    r = mix(r, L[li], s); gg = mix(gg, L[li + 1], s); bb = mix(bb, L[li + 2], s);
    M[i] = r; M[i + 1] = gg; M[i + 2] = bb;
    E[i] = Math.max(g * 70, L[li] * s * .9); E[i + 1] = Math.max(g * 18, L[li + 1] * s * .8); E[i + 2] = L[li + 2] * s * .6; }
  mx.putImageData(mi, 0, 0); ex.putImageData(ei, 0, 0);
  return [mc, ec].map(c => { const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); t.anisotropy = GFX.r ? GFX.r.capabilities.getMaxAnisotropy() : 8; return t; });
}
/* far scenery: the plain below the volcano and dark peaks on the horizon */
function volcanoBackdrop(s) {
  const R = mulberry(23), low = new THREE.Group(); low.position.y = CONE.y1; s.add(low);
  ground(low, 300, 300, 80, 80, "#4A3C35");
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2 + R() * .2, d = 125 + R() * 25, h = 22 + R() * 26, r = 14 + R() * 10;
    const m = Cy(r * .14, r, h, 7, i % 2 ? "#5A4A42" : "#4E403A", Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d); m.castShadow = false; low.add(m);
    if (i % 5 === 2) { const c = new THREE.Mesh(new THREE.CircleGeometry(r * .12, 7), new THREE.MeshBasicMaterial({ color: "#FF7A2A" })); c.rotation.x = -Math.PI / 2; c.position.set(Math.cos(a) * d, h - 1.05, Math.sin(a) * d); low.add(c); } }
}
/* prism under a ledge segment, in the segment's frame (x along, z across): top follows the road heights t0 → t1, bottom flat */
function prismGeo(L, w, n, top, bot, rr) {
  if (rr > .01) return sweptPrism(L, w, n, top, bot, Math.min(rr, w / 2 - .01));
  const g = new THREE.BoxGeometry(L, 1, w, n, 1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) > 0 ? top(p.getX(i)) : bot);
  g.computeVertexNormals(); return g;
}
/* same prism with rounded top edges: a closed cross-section (z across, dy below the top or on the flat bottom) swept along x, capped at both ends */
function sweptPrism(L, w, n, top, bot, rr) {
  const P = [[-w / 2, 0, 1]], K = 5; for (let k = 0; k <= K; k++) { const a = Math.PI - k / K * Math.PI / 2; P.push([-w / 2 + rr + Math.cos(a) * rr, -rr + Math.sin(a) * rr]); }
  for (let k = 0; k <= K; k++) { const a = Math.PI / 2 - k / K * Math.PI / 2; P.push([w / 2 - rr + Math.cos(a) * rr, -rr + Math.sin(a) * rr]); } P.push([w / 2, 0, 1]);
  const v = [], pt = (i, j) => { const x = -L / 2 + L * i / n, q = P[j]; return [x, q[2] ? bot : top(x) + q[1], q[0]]; }, tri = (a, b, c) => v.push(...a, ...b, ...c);
  for (let i = 0; i < n; i++) for (let j = 0; j < P.length; j++) { const j2 = (j + 1) % P.length, A = pt(i, j), Bq = pt(i + 1, j), C = pt(i + 1, j2), D = pt(i, j2); tri(A, C, Bq); tri(A, D, C); }
  [0, n].forEach(i => { const ring = P.map((_, j) => pt(i, j)), c = [0, 1, 2].map(k => ring.reduce((t, p) => t + p[k], 0) / ring.length);
    for (let j = 0; j < ring.length; j++) { const j2 = (j + 1) % ring.length; if (i) tri(c, ring[j], ring[j2]); else tri(c, ring[j2], ring[j]); } });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
}
/* ramp profile: level for the first and last ~1.7 m (so it meets the space flat), smooth S-curve between. f = 0..1 along the segment */
function rampF(f, L, da, db) { const d0 = da === undefined ? Math.min(1.7, L * .22) : da, d1 = db === undefined ? d0 : db; let u = (f * L - d0) / Math.max(.01, L - d0 - d1); u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
function rampClear(nd, n, self, ux, uz, ws) {
  let d = 1.9; n.next.concat(n.prev).forEach(k => { if (k === self) return; const m = nd[k]; if (m.br || n.br) return; let vx = m.x - n.x, vz = m.z - n.z; const vl = Math.hypot(vx, vz) || 1; vx /= vl; vz /= vl;
    const c = ux * vx + uz * vz, sn = Math.abs(ux * vz - uz * vx), wo = n.rim && m.rim ? ep("rimW") : ep("ledgeW"); if (c < -.2) return; d = Math.max(d, (wo + ws * Math.abs(c)) / Math.max(sn, .25) + .2); });
  return d;
}
/* a box of length L split into n pieces along x, each lifted to the height hf(x) */
function bentBox(L, h, w, n, hf, z, y) {
  const g = new THREE.BoxGeometry(L, h, w, n, 1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i), p.getY(i) + y + hf(p.getX(i)), p.getZ(i) + z);
  g.computeVertexNormals(); return g;
}
let CONE_TEX = null;
function volcanoScenery(s, map) {
  const R = mulberry(31), dummy = new THREE.Object3D();
  /* outer cone, roughened (top row stays round so it tucks under the rim road) */
  { const g = new THREE.CylinderGeometry(CONE.r0, CONE.r1, CONE.y0 - CONE.y1, 72, 8, true), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), r = Math.hypot(x, z), f = (CONE.y0 - CONE.y1) / 2 - y; if (f < .5) continue; const k = 1 + (noise(x * .6, z * .6) * .025); p.setX(i, x * k); p.setZ(i, z * k); p.setY(i, y + noise(z * .3, x * .3) * .8); }
    g.computeVertexNormals(); const [map_, emi] = CONE_TEX || (CONE_TEX = coneTex()), m = new THREE.Mesh(varyColors(g), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .95, map: map_, emissive: "#FFFFFF", emissiveIntensity: 1, emissiveMap: emi, side: THREE.DoubleSide }));
    m.receiveShadow = true; m.position.y = (CONE.y0 + CONE.y1) / 2; s.add(edReg(m, "cone")); }
  /* the lava lake fills the crater; it rises and falls with the lava cycle */
  const tex = lavaTex(8), lava = new THREE.Mesh(new THREE.CircleGeometry(29.5, 72), new THREE.MeshBasicMaterial({ map: tex })); lava.rotation.x = -Math.PI / 2; lava.position.y = LAVA_Y[0]; lava.userData.edStop = 1; s.add(lava);
  const glow = new THREE.PointLight("#FF6A2A", 1.4, 34, 1.4); glow.position.set(0, 2.4, 0); s.add(glow);
  /* basalt island with an obsidian crystal in the middle */
  const isl = new THREE.Group(); s.add(isl); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, r = k ? 1.6 : 0, h = (k ? 3 + R() * 1.4 : 4.6) + 1.5; isl.add(Cy(1, 1.1, h, 6, k % 2 ? "#3A2C27" : "#2F2420", Math.cos(a) * r, h / 2 - 1.5, Math.sin(a) * r)); }
  const cr = obsidianMesh(2.6); cr.position.y = 5.4; isl.add(edReg(cr, "crystal")); edReg(isl, "island");
  /* warm haze hanging just above the lava (two slowly turning layers) */
  const hazeT = canvasTex(256, 256, (x, w, h) => { const HR = mulberry(41); for (let k = 0; k < 70; k++) { const px = HR() * w, py = HR() * h, r = 12 + HR() * 34, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, "rgba(255,214,180,.32)"); g.addColorStop(1, "rgba(255,214,180,0)"); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); } });
  const haze = [.35, .9].map((dy, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(29.6, 48), new THREE.MeshBasicMaterial({ map: hazeT, transparent: true, opacity: (i ? .55 : .8) * ep("haze"), depthWrite: false, color: i ? "#FFC9A8" : "#FFB48A" })); m.rotation.x = -Math.PI / 2; m.userData.dy = dy; m.renderOrder = 2; s.add(m); return m; });
  /* smoke drifting up from the lake */
  const smoke = []; for (let k = 0; k < 10; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 0), new THREE.MeshStandardMaterial({ color: "#6A625E", transparent: true, opacity: .5, flatShading: true, depthWrite: false })); m.userData.t = k / 10; m.userData.a = R() * 6.28; m.userData.r = 4 + R() * 18; s.add(m); smoke.push(m); }
  /* wooden guard rail round the outer edge of the rim */
  { const r = 30.5, n = Math.ceil(Math.PI * 2 * r / 2.4), pm = new THREE.InstancedMesh(new THREE.BoxGeometry(.18, .9, .18), new THREE.MeshStandardMaterial({ color: "#7A5234", flatShading: true }), n), rm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .12, .1), new THREE.MeshStandardMaterial({ color: "#B07B45", flatShading: true }), n * 2), rc = r * Math.cos(Math.PI / n), len = 2 * r * Math.sin(Math.PI / n);
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, am = (k + .5) / n * Math.PI * 2; dummy.position.set(Math.cos(a) * r, 8.45, Math.sin(a) * r); dummy.rotation.set(0, -a, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); pm.setMatrixAt(k, dummy.matrix);
      [8.62, 8.25].forEach((y, j) => { dummy.position.set(Math.cos(am) * rc, y, Math.sin(am) * rc); dummy.rotation.set(0, -am + Math.PI / 2, 0); dummy.scale.set(len, 1, 1); dummy.updateMatrix(); rm.setMatrixAt(k * 2 + j, dummy.matrix); }); }
    pm.castShadow = true; s.add(pm, rm); }
  /* lamps, ore carts, crates and a mine headframe just outside the rim */
  const onCone = (d, r) => { const a = d * Math.PI / 180; return [Math.cos(a) * r, coneY(r), Math.sin(a) * r, a]; };
  [100, 160, 215, 262, 318, 20, 62].forEach((d, i) => { const [x, y, z] = onCone(d, 31.3), g = new THREE.Group(); g.position.set(x, y, z); g.add(Cy(.08, .1, 6.4, 6, "#2A2F3A", 0, 0, 0), Cy(.24, .18, .3, 8, "#FFE7A8", 0, 3.2, 0, { emissive: "#FFC860", emissiveIntensity: 1 })); s.add(edReg(g, "lamp" + i)); });
  [[232, 0], [48, 1], [292, 2]].forEach(([d, i]) => { const [x, y, z, a] = onCone(d, 32), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -a; s.add(g); edReg(g, "cart" + i); g.add(Cy(1.4, 1.9, 3.4, 7, "#4E403A", 0, -1.55, 0));
    if (i === 1) { g.add(B(1.1, 1.4, 1.1, "#9C6B44", 0, .5, -.7), B(.9, 1.2, .9, "#8E5F3A", .1, .4, .6), B(.7, .6, .7, "#A47249", 0, 1.4, -.6)); return; }
    g.add(B(1.3, .6, 1.8, "#6A717E", 0, .75, 0), B(1.6, .4, 2.2, "#4E403A", 0, .1, 0)); for (let k = 0; k < 4; k++) { const r_ = mesh(new THREE.DodecahedronGeometry(.3, 0), "#7A6A60"); r_.position.set((R() - .5) * .7, 1.2, (R() - .5) * 1.1); g.add(r_); } });
  { const [x, y, z, a] = onCone(243, 33), hf = new THREE.Group(); hf.position.set(x, y, z); hf.rotation.y = -a + Math.PI / 2; s.add(hf);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([px, pz]) => { const l = B(.2, 10, .2, "#8A5A30", px * .9, 1.7, pz * .7); l.rotation.set(-pz * .06, 0, px * .08); hf.add(l); });
    [2, 3.5, 5].forEach(yy => hf.add(B(2, .14, .14, "#8A5A30", 0, yy, .7), B(2, .14, .14, "#8A5A30", 0, yy, -.7)));
    hf.add(B(2.4, .25, 1.8, "#6B4426", 0, 6.4, 0)); const wh = mesh(new THREE.TorusGeometry(.7, .1, 6, 14), "#3A404C"); wh.position.set(0, 7, 0); hf.add(wh); edReg(hf, "headframe"); }
  { const [x, y, z] = onCone(262, 33.5), sg = signBoard("VOLCANO QUARRY", { style: "wood", w: 13, h: 2.6, col: "#FFB15A" }), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = .1; s.add(g); sg.position.set(0, 6.6, 0); sg.rotation.x = -.14; g.add(sg);
    [-4.6, 4.6].forEach(px => g.add(B(.36, 10.5, .36, "#5E3A20", px, 1.4, -.3))); edReg(g, "sign"); }
  return { lava, tex, glow, cr, smoke, haze };
}
/* per-frame volcano board: lava level follows the round, flooded tiles show a floating crust, geyser steam, smoke, eruption fireworks */
function stepGyArcs(bd, time) { bd.gyArcs.forEach(g => { g.dots.forEach((m, k) => { const u = (k / g.dots.length + time * .16) % 1; g.curve.getPoint(u, m.position); m.material.opacity = .75 * Math.sin(u * Math.PI); }); g.ring.scale.setScalar(1 + Math.sin(time * 3.2) * .05); }); }
function stepVolcano(bd, dt, time) {
  stepGyArcs(bd, time);
  const vx = bd.vx, ty = LAVA_Y[G.phase === "lobby" ? 0 : lavaLv(G.round)], s = bd.scene;
  if (!bd.lavaSet) { bd.lavaSet = true; vx.lava.position.y = ty; }
  const ly = vx.lava.position.y += (ty - vx.lava.position.y) * Math.min(1, dt * .9);
  vx.tex.offset.set((time * .012) % 1, (time * .009) % 1);
  vx.haze.forEach((m, i) => { m.position.y = ly + m.userData.dy; m.rotation.z = time * (i ? -.012 : .008); });
  vx.glow.position.y = ly + 2.5; vx.glow.intensity = (1.3 + Math.sin(time * 2.3) * .15) * (typeof bd.edp.glow === "number" ? bd.edp.glow : 1); vx.cr.rotation.y = time * .3;
  Object.keys(bd.scorch).forEach(i => { const n = MAP.nodes[i], m = bd.scorch[i]; m.visible = !!(flooded(+i, G.round) && ly > n.y + .05); if (m.visible) m.position.y = Math.max(.6, ly - n.y + .07) / m.parent.scale.y; if (bd.obCr[i]) bd.obCr[i].visible = !m.visible; if (bd.obs[i]) bd.obs[i].visible = !m.visible; });
  bd.vents.forEach((v, j) => v.ps.forEach(p => { const u = p.userData.t = (p.userData.t + dt * .55) % 1; p.position.set(v.x + Math.sin(u * 6 + j) * (.12 + u * .5), .7 + u * 3.2, v.z + Math.cos(u * 4 + j) * (.12 + u * .5)); p.scale.setScalar(.3 + u * 1.7); p.material.opacity = .42 * Math.sin(Math.min(1, u * 1.4) * Math.PI); }));
  vx.smoke.forEach(m => { const d = m.userData, u = d.t = (d.t + dt * .04) % 1; m.position.set(Math.cos(d.a) * d.r + u * 4, ly + .5 + u * 16, Math.sin(d.a) * d.r - u * 3); m.scale.setScalar(.6 + u * 2.4); m.material.opacity = .45 * Math.sin(u * Math.PI); });
  const er = G.erupt;
  if (bd.eruptN === undefined) bd.eruptN = er ? er.n : null;
  else if (er && er.n !== bd.eruptN) { bd.eruptN = er.n; bd.eruptT = time; bd.bombs = (er.hits || []).map((h, j) => { const m = mesh(new THREE.IcosahedronGeometry(.45, 0), "#FF7A2A", { emissive: "#FF4A10", emissiveIntensity: 1 }); m.visible = false; s.add(m); return { m, n: MAP.nodes[h], t0: .5 + j * .35, hit: false }; }); sfx("thunder"); }
  if (bd.eruptT !== undefined) { const k = time - bd.eruptT;
    if (k < 2.6 && Math.floor(k / .12) !== bd.eruptF) { bd.eruptF = Math.floor(k / .12); burst(s, (Math.random() - .5) * 3, ly + .5, (Math.random() - .5) * 3, { n: 9, shape: "ico", cols: ["#FF7A2A", "#FFD24A", "#E8420F", "#3A2C27"], spd: 5, up: 16, grav: 12, life: 1.7, size: 1.8 }); }
    (bd.bombs || []).forEach(b => { const f = (k - b.t0) / 1.2; if (f < 0 || b.hit) return; b.m.visible = true; const e = Math.min(1, f), n = b.n;
      b.m.position.set(n.x * e, ly + Math.sin(e * Math.PI) * 16 + (n.y + .6 - ly) * e, n.z * e); b.m.rotation.x += dt * 8;
      if (f >= 1) { b.hit = true; s.remove(b.m); burst(s, n.x, n.y + .7, n.z, { n: 22, shape: "ico", cols: ["#FF7A2A", "#FFD24A", "#3A2C27", "#7A3CFF"], spd: 4, up: 6, grav: 10, life: 1.1 }); sfx("crush"); } });
    if (k > 6) { (bd.bombs || []).forEach(b => s.remove(b.m)); bd.bombs = null; bd.eruptT = undefined; } }
}
/* a space's tile turns with the road under it: yaw = average of the incoming and outgoing direction (flipped so icons stay readable from the camera), bridge tiles also pitch with the deck */
/* rock pillar under a space, top flush with the causeway tops (y +0.035), straight sides, turned with the road (flat faces parallel to it) and its corners just inside the causeway width so none poke out; top edge rounded like the ledges when edgeRound > 0 */
function pillarMesh(r, h, sides, rr, col, x, z, yaw) {
  rr = Math.min(rr, r * .9, h * .5); let m; if (rr < .01) m = Cy(r, r, h, sides, col, x, -h / 2 + .035, z); else {
  const P = [new THREE.Vector2(0, -h), new THREE.Vector2(r, -h)]; for (let k = 0; k <= 5; k++) { const a = k / 5 * Math.PI / 2; P.push(new THREE.Vector2(r - rr + Math.cos(a) * rr, -rr + Math.sin(a) * rr)); } P.push(new THREE.Vector2(0, 0));
  m = mesh(new THREE.LatheGeometry(P, sides), col); m.position.set(x, .035, z); }
  m.rotation.y = (yaw || 0) + Math.PI / sides; return m;
}
function tileGroup(nd, n) {
  const g = new THREE.Group(), a = nd[n.prev[0]], b = nd[n.next[0]], Y = m => m.y || 0; g.position.set(n.x, 0, n.z);
  let dx = 0, dz = 0, dy = 0, L = 0; [[a, n], [n, b]].forEach(([p, q]) => { if (!p || !q || p === q) return; const vx = q.x - p.x, vz = q.z - p.z, l = Math.hypot(vx, vz); if (l < .01 || l > 9) return; dx += vx / l; dz += vz / l; dy += Y(q) - Y(p); L += l; });
  if (Math.hypot(dx, dz) < .2) return g;
  let ang = Math.atan2(dz, dx); if (Math.cos(ang) < 0) { ang += Math.PI; dy = -dy; }
  g.rotation.y = -ang; if (n.br && L) g.rotation.z = Math.atan2(dy, L);
  return g;
}
/* yaw inside a tile group that points "up" (local -z) toward the space m, snapped to the road axis so it lines up with the tile and turns with it */
function tileAim(tl, n, m) { if (!m) return 0; const q = Math.PI / 2, rel = Math.atan2(-(m.x - n.x), -(m.z - n.z)) - tl.userData.auto; return Math.round(rel / q) * q; }
function buildBoardFor(map) {
  applyMapEdits(map);
  const vol = map.id === "volcano", s = new THREE.Scene(); s.background = new THREE.Color("#9FD4F5"); s.fog = vol ? new THREE.Fog("#9FD4F5", 95, 240) : new THREE.Fog("#9FD4F5", 48, 115);
  { const sun = lights(s, true), hemi = s.children.find(o => o.isHemisphereLight); sun.intensity = .86; if (hemi) hemi.intensity = .68; if (vol) { sun.color.set("#FFE2C2"); const c = sun.shadow.camera; c.left = c.bottom = -35; c.right = c.top = 35; c.far = 110; c.updateProjectionMatrix(); } }
  if (vol) volcanoBackdrop(s); else { ground(s, 150, 150, 19, 21, map.ground); mountains(s); }
  const road = map.id === "junk" ? "#4A4E57" : vol ? "#7D6B5C" : "#434956", H = .12, nd = map.nodes, Y = n => n.y || 0, pebbles = [], V = new THREE.Vector3(), rw = ep("roadW"), pebK = ep("pebbles");
  let segK = 0; map.rampD = {};
  nd.forEach(na => na.next.forEach(j => {
    const nb = nd[j], a = [na.x, na.z], b = [nb.x, nb.z], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
    /* each road piece lives in a group along the segment, pitched for ramps (local x runs from a to b) */
    const dy = Y(nb) - Y(na), L3 = Math.hypot(L, dy), k3 = L3 / L, g = new THREE.Group(), gi = new THREE.Group(), bridge = na.br || nb.br;
    g.position.set((a[0] + b[0]) / 2, (Y(na) + Y(nb)) / 2, (a[1] + b[1]) / 2); g.rotation.y = -ang; gi.rotation.z = Math.atan2(dy, L); g.add(gi); s.add(g);
    /* volcano: each ledge is a rock causeway standing in the lava lake; gravel track with tyre ruts and loose stones instead of tarmac */
    if (vol && !bridge) {
      const rim = na.rim && nb.rim, ws = rim ? ep("rimW") : ep("ledgeW"), ux = dx / L, uz = dz / L;
      const da = Math.abs(dy) > .05 ? Math.min(L * .42, rampClear(nd, na, j, ux, uz, ws)) : 0, db = Math.abs(dy) > .05 ? Math.min(L * .42, rampClear(nd, nb, nd.indexOf(na), -ux, -uz, ws)) : 0; map.rampD[nd.indexOf(na) + "-" + j] = [da, db, L];
      /* overlapping causeways at a junction get different heights (2.5 cm apart) so their surfaces never fight; kept small so every causeway meets its pillar top flush */
      const lift = (segK++ % 3) * .025, gy = g.position.y, y0 = Y(na) - gy, y1 = Y(nb) - gy, hf = x => y0 + lift + (y1 - y0) * rampF((x + L / 2) / L, L, da, db), n = Math.abs(dy) > .05 ? Math.ceil(L / .7) : 1;
      const rd = mesh(bentBox(L, H, rw, n, hf, 0, H / 2), road); rd.castShadow = false; g.add(rd);
      [-.24 * rw, .24 * rw].forEach(o => { const r = mesh(bentBox(L - .4, .06, .26, n, hf, o, H + .0), "#5C4C40"); r.castShadow = false; g.add(r); });
      const m = mesh(prismGeo(L, ws * 2, n, x => hf(x) - .03, -1.6 - gy, ep("edgeRound")), rim ? "#5E4C42" : "#4A3C36", { roughness: .95 }); m.castShadow = false; g.add(m);
      /* loose stones between the road and the ledge edge (never past where the rounded edge starts): sparse in most places, packed clumps of bigger stones where a low-frequency noise peaks */
      g.updateMatrixWorld(true); const PR = mulberry(Math.round(L * 1000) + segK), rr = ep("edgeRound"), zin = rw / 2 - .15, zout = Math.max(zin + .2, ws - rr * .8 - .1), cnt = Math.round(L * (zout - zin) * 2 * 4 * pebK);
      for (let q = 0; q < cnt; q++) { const lx = (PR() - .5) * (L - 1.2), lz0 = (PR() < .5 ? -1 : 1) * (zin + PR() * (zout - zin)); V.set(lx, 0, lz0).applyMatrix4(g.matrixWorld);
        const cl = Math.max(0, Math.min(1, (noise(V.x * 2.3 + 40, V.z * 2.3) + .25 * noise(V.z * 6, V.x * 6) - .45) / 1.1)); if (PR() > .12 + cl * cl * 1.3) continue;
        const k = .55 + cl * 1.2 + PR() * .45, lz = Math.sign(lz0) * Math.min(Math.abs(lz0), zout - .1 * k); V.set(lx, hf(lx) - .03 + .03 * k, lz).applyMatrix4(g.matrixWorld); pebbles.push([V.x, V.y, V.z, k, PR()]); }
      return; }
    const seg = B(L3, H, rw, vol && bridge ? "#7A5234" : road, 0, H / 2, 0); seg.castShadow = false; gi.add(seg);
    if (vol) {
      if (bridge) [-1.15, 1.15].forEach(o => { gi.add(B(L3, .14, .12, "#C9762E", 0, .75, o)); for (let d = .6; d < L3; d += 1.3) gi.add(B(.12, .7, .12, "#8A5A30", d - L3 / 2, .4, o)); gi.add(B(L3, .3, .2, "#5A3A22", 0, -.12, o)); });
      return; }
    // edge lines stop at the tile, and short of any road that joins on that side, so they never cross another road
    const ux = dx / L, uz = dz / L, px = -Math.sin(ang), pz = Math.cos(ang);
    const trim = (n, self, fx, fz, o) => { const others = n.next.concat(n.prev || []).filter(k => k !== self); let t = .62; others.forEach(k => { const m = nd[k], vx = m.x - n.x, vz = m.z - n.z, vl = Math.hypot(vx, vz) || 1; const side = (vx * px + vz * pz) / vl, fwd = (vx * fx + vz * fz) / vl; if (side * o > .05) t = Math.max(t, (rw / 2 + .04 + (rw / 2 + .02) * fwd) / Math.abs(side) + .05); }); return Math.min(t, L); };
    [-(rw / 2 + .02), rw / 2 + .02].forEach(o => { const t0 = trim(na, j, ux, uz, o), t1 = trim(nb, nd.indexOf(na), -ux, -uz, o), len = L - t0 - t1; if (len <= .05) return; const mid = t0 + len / 2;
      const e = B(len * k3, H + .06, .08, "#E9EDF2", (mid - L / 2) * k3, H / 2 + .01, o); e.castShadow = false; gi.add(e); });
    for (let d = 1.5; d < L - 1.4; d += .9) { const y = B(.45, H + .1, .1, "#FFC83D", (d - L / 2) * k3, H / 2 + .01, 0); y.castShadow = false; gi.add(y); }
  }));
  const belts = [], crushers = [], vents = [], scorch = {}, obCr = {}, nodeG = [], gyArcs = [];
  nd.forEach((n, i) => {
    const ng = new THREE.Group(); ng.position.y = Y(n); s.add(ng);
    const cf = Cy(rw / 2 + .05, rw / 2 + .05, H + .005, 16, vol && n.br ? "#7A5234" : road, n.x, H / 2, n.z); cf.castShadow = false; ng.add(cf);
    if (vol && !n.br) { const h = Y(n) + 1.58, pr = (n.rim ? ep("rimW") : ep("ledgeW")) * .98 * ep("pillarR"), pc = pillarMesh(pr, h, ep("pillarSides"), ep("edgeRound"), n.rim ? "#5E4C42" : "#4A3C36", n.x, n.z, tileGroup(nd, n).rotation.y); pc.castShadow = false; ng.add(pc); }
    const t = n.t, x = n.x, z = n.z, tl = tileGroup(nd, n), ne = EDC.n[i] || {}, sides = ep("tileSides"); ng.add(tl); ng.userData = { node: i, tl }; nodeG[i] = ng;
    tl.userData.auto = tl.rotation.y; tl.rotation.y += ne.r || 0; tl.scale.setScalar(ep("tileR") * (ne.s || 1));
    const base = Cy(1.22, 1.3, .22, sides, "#1E2530", 0, .2, 0); base.rotation.y = Math.PI / sides; tl.add(base);
    const top = Cy(1.08, 1.14, .2, sides, SPACE_COL[t], 0, .38, 0); top.rotation.y = Math.PI / sides; tl.add(top);
    if (t === "B") tl.add(B(.9, .08, .22, "#FFFFFF", 0, .52, 0), B(.22, .08, .9, "#FFFFFF", 0, .52, 0));
    if (t === "R") tl.add(B(.9, .08, .22, "#FFFFFF", 0, .52, 0));
    { const sy = tileSymbol(t); if (sy) tl.add(sy); }
    if (t === "CR") { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.55), new THREE.MeshBasicMaterial({ map: tileIcon(t), transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); p.rotation.x = -Math.PI / 2; p.position.set(0, .525, 0);  tl.add(p); }
    if (t === "CV" && n.conv) { const tgt = nd[n.conv.dir > 0 ? n.next[0] : n.prev[0]], ddx = tgt.x - x, ddz = tgt.z - z, tex = beltTex();
      const g = new THREE.Group(); g.position.set(0, .49, 0); g.rotation.y = tileAim(tl, n, tgt); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.6), new THREE.MeshBasicMaterial({ map: tex })); p.rotation.x = -Math.PI / 2; g.add(p);
      g.add(B(.12, .18, 1.7, "#FFC83D", -.68, .05, 0), B(.12, .18, 1.7, "#FFC83D", .68, .05, 0)); tl.add(g); belts.push(tex); }
    if (t === "CR") { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(B(.22, 3.6, .22, "#6A717E", -1.1, 1.8, 0), B(.22, 3.6, .22, "#6A717E", 1.1, 1.8, 0), B(2.6, .3, .4, "#FFC83D", 0, 3.6, 0));
      const blk = B(1.5, .6, 1.5, "#3A4150", 0, 3, 0); g.add(blk); const st = B(1.52, .14, 1.52, "#FFC83D", 0, 2.72, 0); g.add(st); ng.add(g); crushers.push({ blk, st, ph: i * .7 }); }
    if (t === "SH") { const sp = textSprite("SHOP", "#1FB5A8", "#fff", 1.7); sp.position.set(x, 2.3, z); ng.add(sp); }
    if (t === "OB") { const c = obsidianMesh(.7); c.position.set(x + .85, .45, z - .55); ng.add(c); obCr[i] = c; }
    if (t === "GY" && n.gy !== undefined) { const tg = nd[n.gy], rel = Math.atan2(-(tg.x - x), -(tg.z - z)) - tl.userData.auto, d = .98;
      /* chevron on the tile edge pointing at the landing space (turns with the tile), a dotted steam arc to it and a pulsing ring round the landing space */
      const ch = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), new THREE.MeshBasicMaterial({ map: chevTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 })); ch.rotation.set(-Math.PI / 2, 0, rel); ch.position.set(-Math.sin(rel) * d, .54, -Math.cos(rel) * d); tl.add(ch);
      const a0 = new THREE.Vector3(x, Y(n) + .9, z), a1 = new THREE.Vector3(tg.x, Y(tg) + .9, tg.z), mid = a0.clone().lerp(a1, .5); mid.y = Math.max(a0.y, a1.y) + a0.distanceTo(a1) * .35 + 1.5;
      const curve = new THREE.QuadraticBezierCurve3(a0, mid, a1), dots = []; for (let k = 0; k < 18; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.17, 0), new THREE.MeshBasicMaterial({ color: "#E3E7EC", transparent: true, opacity: .6, depthWrite: false })); s.add(m); dots.push(m); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45 * ep("tileR"), .08, 6, 28), new THREE.MeshStandardMaterial({ color: "#C9D1DA", emissive: "#E3E7EC", emissiveIntensity: .35 })); ring.rotation.x = Math.PI / 2; ring.position.set(tg.x, Y(tg) + .56, tg.z); s.add(ring);
      gyArcs.push({ curve, dots, ring }); }
    /* geyser tile: a pale sinter mound with a sulphur-stained vent in the middle, light mist rising out of it */
    if (t === "GY") { const prof = [[.17, .5], [.22, .6], [.3, .65], [.42, .63], [.56, .58], [.7, .52], [.8, .485]].map(([r, y]) => new THREE.Vector2(r, y));
      const sul = new THREE.Mesh(new THREE.TorusGeometry(.215, .045, 6, 16), M("#D9C36A")); sul.rotation.x = Math.PI / 2; sul.position.y = .6;
      tl.add(mesh(new THREE.LatheGeometry(prof, 14), "#7E7A75", { side: THREE.DoubleSide }), Cy(.19, .19, .02, 12, "#151B24", 0, .52, 0), sul);
      [[.5, .15], [-.38, .42], [-.28, -.48], [.52, -.3]].forEach(([a, b], q) => { const m = mesh(new THREE.DodecahedronGeometry(.07 + q * .012, 0), "#B5AFA6"); m.position.set(a, .58 - Math.hypot(a, b) * .06, b); tl.add(m); });
      const ps = []; for (let k = 0; k < 8; k++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 0), new THREE.MeshStandardMaterial({ color: "#F4F6F9", transparent: true, opacity: .45, flatShading: true, depthWrite: false })); p.userData.t = k / 8; ng.add(p); ps.push(p); } vents.push({ x, z, ps }); }
    if (n.br && !nd.some(m => !m.br && Math.hypot(m.x - x, m.z - z) < 2.6)) { const pl = B(.6, Y(n) + 1.4, .6, "#5A3A22", x, -(Y(n) + 1.4) / 2, z); ng.add(pl); }
    if (vol && n.lv) { const m = new THREE.Mesh(new THREE.CircleGeometry(1.36, sides), new THREE.MeshBasicMaterial({ map: scorchTex(), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })); m.rotation.set(-Math.PI / 2, 0, Math.PI / sides - Math.PI / 2); m.position.set(0, .6, 0); m.visible = false; tl.add(m); scorch[i] = m; }
  });
  if (pebbles.length) { const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.13, 0), new THREE.MeshStandardMaterial({ color: "#FFFFFF", flatShading: true, roughness: .9 }), pebbles.length), dm = new THREE.Object3D(), c = new THREE.Color();
    pebbles.forEach(([x, y, z, k, r], i) => { dm.position.set(x, y, z); dm.rotation.set(r * 3, r * 7, 0); dm.scale.set(k, k * .7, k); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); c.set(r < .5 ? "#6A5A4E" : "#8C7A6A"); im.setColorAt(i, c); }); s.add(im); }
  const vx = vol ? volcanoScenery(s, map) : null;
  if (map.id === "junk") junkScenery(s); else if (!vol) classicScenery(s);
  const fac = new THREE.Group(), ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, .09, 6, 24), new THREE.MeshStandardMaterial({ color: "#FFC83D", emissive: "#FFB000", emissiveIntensity: .9 })); ring.rotation.x = Math.PI / 2; ring.position.y = .56;
  const bld = FAC_MODELS[vol ? FAC_LOOK.volc : FAC_LOOK.def](), puffs = bld.userData.puffs;
  fac.add(ring, bld); s.add(fac);
  /* Volcano Quarry refineries: a gate across the road at each RF space, turned with the road, pipe on the side nearer the crater centre (movable in the map editor as "ref<space>") */
  const refs = []; if (vol) nd.forEach((n, i) => { if (!n.ref) return; const a = nd[n.next[0]], b = nd[n.prev[0]] || n, yaw = -Math.atan2(a.z - b.z, a.x - b.x), px = Math.sin(yaw), pz = Math.cos(yaw);
    const sd = Math.hypot(n.x + px * 2, n.z + pz * 2) < Math.hypot(n.x - px * 2, n.z - pz * 2) ? 1 : -1, g = geoRefinery(rw / 2, sd); g.position.set(n.x, Y(n), n.z); g.rotation.y = yaw; s.add(edReg(g, "ref" + i)); refs.push(g); });
  const clouds = []; for (let i = 0; i < 8; i++) { const c = cloud(); c.scale.setScalar(.5 + Math.random() * .2); c.position.set(-60 + i * 16, (vol ? 26 : 7) + Math.random() * 3, (i % 2 ? 28 + Math.random() * 10 : -29 - Math.random() * 14) * (vol ? 1.7 : 1)); s.add(c); clouds.push(c); }
  const hl = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.55, 24), new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: .8 })); hl.rotation.x = -Math.PI / 2; hl.position.y = .53; s.add(hl);
  const arrows = [0, 1, 2].map(k => { const g = new THREE.Group(); const c = mesh(new THREE.ConeGeometry(.45, .9, 8), "#FFC83D", { emissive: "#FFB000", emissiveIntensity: .8 }); c.rotation.x = Math.PI; c.position.y = .45; g.add(c); const sp = textSprite(String(k + 1), "#151B24", "#FFC83D", 1.1); sp.position.y = 1.5; g.add(sp); g.visible = false; s.add(g); return g; });
  let rival = null; if (map.rival) { rival = buildRival(); const h = nd[map.rivalHome]; rival.position.set(h.x + 1.3, 0, h.z + 1.3); s.add(rival); }
  applySky(s, map.id === "junk" ? "junk" : vol ? "volc" : "def");
  return { scene: s, map, fac, ring, bld, puffs, clouds, hl, belts, crushers, arrows, rival, refs, traps: {}, obs: {}, facIdx: -1, facTarget: null, vents, scorch, obCr, vx, nodeG, gyArcs, reg: EDC.reg, edp: EDC.p };
}
function setBoardMap(id) {
  const map = MAPS[id] || CLASSIC; if (GFX.board && GFX.board.map === map) return;
  if (GFX.board) Object.values(GFX.tok).forEach(t => GFX.board.scene.remove(t.g));
  GFX.tok = {}; GFX.boards = GFX.boards || {};
  const bd = GFX.boards[map.id] || (GFX.boards[map.id] = buildBoardFor(map));
  GFX.board = bd; bd.scene.add(GFX.cam);
  if (!GFX.camLight) { GFX.camLight = new THREE.PointLight("#ffffff", .6, 20); GFX.cam.add(GFX.camLight); }
  GFX.camPos = null; initCamInput();
}
/* where the factory building stands next to its tile: beside the road at the first offset where its whole footprint stays clear of every road (bridges and other ledges included)
   and of refinery gates; among clear spots, outside the loop on the outer edge, behind the road (seen from the camera) elsewhere. ok = false when nothing fits (pickFactory skips it) */
const FAC_FOOT = [[-1.35, -1.05], [1.35, -1.05], [-1.35, 1.45], [1.35, 1.45], [0, -1.05], [0, 1.45], [-1.35, .2], [1.35, .2], [0, .2]];
function segDist(px, pz, a, b) { const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / l2)); return Math.hypot(px - a.x - dx * t, pz - a.z - dz * t); }
function facSpot(idx) {
  const map = MAP, cache = map._fs || (map._fs = {}); if (cache[idx]) return cache[idx];
  const nd = map.nodes, n = nd[idx], a = nd[n.next[0]], b = nd[n.prev[0]] || n, half = ep("roadW") / 2 + .15;
  let dx = a.x - b.x, dz = a.z - b.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const segs = []; nd.forEach(m => m.next.forEach(j => segs.push([m, nd[j]])));
  const clear = (cx, cz) => Math.min(...FAC_FOOT.map(([ox, oz]) => { const px = cx + ox, pz = cz + oz; let c = Math.min(...segs.map(([p, q]) => segDist(px, pz, p, q))) - half;
    nd.forEach(m => { if (m.ref) c = Math.min(c, Math.hypot(px - m.x, pz - m.z) - 2.5); }); return c; }));
  const cands = []; [2.9, 3.3, 3.8].forEach(d => [[-dz, dx], [dz, -dx]].forEach(([ox, oz]) => { const cx = n.x + ox * d, cz = n.z + oz * d; cands.push({ cx, cz, d, clr: clear(cx, cz) }); }));
  const xs = nd.map(t => t.x), zs = nd.map(t => t.z), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, E = 2.5;
  const ok = cands.filter(c => c.clr >= 0), dMin = ok.length ? Math.min(...ok.map(c => c.d)) : 0, pool = ok.filter(c => c.d === dMin);
  const outer = n.x - x0 < E || x1 - n.x < E || n.z - z0 < E || z1 - n.z < E;
  const best = !pool.length ? cands.slice().sort((p, q) => q.clr - p.clr)[0] : outer ? pool.slice().sort((p, q) => Math.hypot(q.cx - mx, q.cz - mz) - Math.hypot(p.cx - mx, p.cz - mz))[0] : pool.slice().sort((p, q) => p.cz - q.cz)[0];
  return (cache[idx] = { x: n.x, y: n.y || 0, z: n.z, bx: best.cx - n.x, bz: best.cz - n.z, rot: 0, ok: pool.length > 0 });
}
/* the battery factory moves once the purchase animation is done (waits briefly in case it hasn't started yet). Volcano: a rock pillar first rises out of the lava
   at the new spot, then the factory hops over onto it and the old pillar sinks */
function facPillar(bd, f) { const p = Cy(1.8, 2.1, 16, 7, "#4A3C36", f.x + f.bx, f.y - 8.02, f.z + f.bz); bd.scene.add(p); return p; }
const FAC_RISE = 2.4, FAC_HOP = .85;
function stepFactory(bd, dt) {
  bd.sink = (bd.sink || []).filter(p => { p.position.y -= dt * 5; if (p.position.y > -40) return true; bd.scene.remove(p); return false; });
  const f = bd.facTarget; if (!f || performance.now() < (bd.facWait || 0) || (GFX.bseq && performance.now() - GFX.bseq.t0 < 4400)) return;
  const rT = bd.vx ? FAC_RISE : 0;
  if (!f.from) { f.from = { x: bd.fac.position.x, y: bd.facY || 0, z: bd.fac.position.z, bx: bd.bld.position.x, bz: bd.bld.position.z };
    if (bd.vx) { f.pil = facPillar(bd, f); const ly = bd.vx.lava.position.y; burst(bd.scene, f.x + f.bx, ly + .3, f.z + f.bz, { n: 22, shape: "ico", cols: ["#FF7A2A", "#FFD24A", "#3A2C27"], spd: 4, up: 6, grav: 10, life: 1 }); sfx("crush"); } }
  const tr = bd.facMove = (bd.facMove || 0) + dt, rise = rT ? Math.min(1, tr / rT) : 1, hop = Math.max(0, Math.min(1, (tr - rT) / FAC_HOP)), a = f.from;
  /* the pillar grinds up out of the lava, shaking (strongest while it is moving fastest) and shedding a few rocks */
  if (f.pil) { const e = 1 - Math.pow(1 - rise, 2), sh = rise < 1 ? .12 * (1 - rise) + .03 : 0, px = f.x + f.bx, pz = f.z + f.bz, tt = tr * 38; f.pil.position.set(px + Math.sin(tt) * sh, f.y - 8.02 - (1 - e) * (f.y + 9), pz + Math.cos(tt * 1.3) * sh);
    if (rise < 1 && Math.floor(tr / .35) !== f.dustN) { f.dustN = Math.floor(tr / .35); burst(bd.scene, px, bd.vx.lava.position.y + .4, pz, { n: 8, shape: "ico", cols: ["#FF7A2A", "#3A2C27", "#6A5A4E"], spd: 2.5, up: 3, grav: 9, life: .8 }); } }
  if (hop > 0 && bd.pil !== f.pil) { if (bd.pil) bd.sink.push(bd.pil); bd.pil = f.pil; }
  const e = hop * hop * (3 - 2 * hop);
  bd.fac.position.set(a.x + (f.x - a.x) * e, a.y + (f.y - a.y) * e + Math.sin(hop * Math.PI) * 2.5, a.z + (f.z - a.z) * e);
  bd.bld.position.set(a.bx + (f.bx - a.bx) * e, 0, a.bz + (f.bz - a.bz) * e); bd.bld.rotation.y = f.rot;
  if (hop >= 1) { bd.facY = f.y; bd.facTarget = null; }
}
function tilePos(i, off) { const n = MAP.nodes[i] || MAP.nodes[0]; let y = n.y || 0; if (MAP.lava && G && flooded(i, G.round)) y = Math.max(y, LAVA_Y[lavaLv(G.round)] - .4); return new THREE.Vector3(n.x + off[0], y + .5, n.z + off[1]); }
const OFF = [[0, 0], [-.8, -.6], [.8, -.6], [-.8, .6], [.8, .6], [0, -.9], [0, .9], [-.95, 0]];
function syncBoard() {
  if (!GFX.ok || !G) return;
  syncMap(); setBoardMap(MAP.id);
  const bd = GFX.board, ps = G.players;
  if (bd.facIdx !== G.factory && MAP.nodes[G.factory]) { const f = facSpot(G.factory), old = bd.facTarget; if (old && old.pil && old.pil !== bd.pil) (bd.sink = bd.sink || []).push(old.pil); bd.facIdx = G.factory; bd.facTarget = f; bd.facMove = 0; bd.facWait = performance.now() + 250;
    if (!bd.placed) { bd.fac.position.set(f.x, f.y, f.z); bd.facY = f.y; bd.bld.position.set(f.bx, 0, f.bz); bd.placed = true; if (bd.vx) { bd.pil = facPillar(bd, f); f.pil = bd.pil; } bd.facTarget = null; } }
  const traps = G.traps || {};
  Object.keys(bd.traps).forEach(k => { if (!traps[k]) { bd.scene.remove(bd.traps[k]); delete bd.traps[k]; } });
  Object.keys(traps).forEach(k => { if (bd.traps[k] || !MAP.nodes[k]) return; const g = new THREE.Group(), n = MAP.nodes[k]; g.add(B(1.4, .06, .5, "#3A4150", 0, .03, 0)); for (let i = -3; i <= 3; i++) { const c = mesh(new THREE.ConeGeometry(.08, .28, 5), "#D8DDE5"); c.position.set(i * .19, .18, 0); g.add(c); } g.position.set(n.x, (n.y || 0) + .5, n.z); g.rotation.y = .6; bd.scene.add(g); bd.traps[k] = g; });
  const obs = G.obs || {};
  Object.keys(bd.obs).forEach(k => { if (!obs[k]) { bd.scene.remove(bd.obs[k]); delete bd.obs[k]; } });
  Object.keys(obs).forEach(k => { const n = MAP.nodes[k]; if (bd.obs[k] || !n) return; const c = obsidianMesh(.75); c.position.set(n.x - .8, (n.y || 0) + .5, n.z + .6); bd.scene.add(c); bd.obs[k] = c; });
  ps.forEach(p => {
    let t = GFX.tok[p.key];
    if (!t || t.truck !== p.truck) {
      if (t) bd.scene.remove(t.g);
      const g = new THREE.Group(), tr = buildTruck(p.truck); tr.scale.setScalar(.62); g.add(tr);
      const disc = Cy(.72, .72, .06, 20, pcol(p), 0, .03, 0, { transparent: true, opacity: .4, depthWrite: false }); disc.castShadow = false; g.add(disc);
      const tag = nameTag(p.name, G.teams ? TEAMS[p.team || 0].col : pcol(p)); tag.scale.multiplyScalar(1.5); tag.position.y = 2.3; g.add(tag);
      g.position.copy(tilePos(p.pos, [0, 0])); bd.scene.add(g);
      t = GFX.tok[p.key] = { g, tr, truck: p.truck, target: p.pos, shown: p.pos, shownT: p.pos, q: [], anim: null, yaw: 0 };
    }
    const carried = !!(G.rival && G.rival.carry === p.key); if (carried) t.carried = true;
    if (t.target !== p.pos) {
      if (t.carried) { t.q = []; t.anim = null; t.target = t.shown = t.shownT = p.pos; }
      else { const a = MAP.nodes[t.target], adj = a && (a.next.includes(p.pos) || a.prev.includes(p.pos)); t.q.push({ to: p.pos, jump: !adj }); t.target = p.pos; }
    }
    if (!carried && t.carried && t.target === p.pos) t.carried = false;
  });
  Object.keys(GFX.tok).forEach(k => { if (!ps.some(p => p.key === k)) { bd.scene.remove(GFX.tok[k].g); delete GFX.tok[k]; } });
}
function offsetsFor(key) {
  const ps = G.players, me_ = ps.find(p => p.key === key); if (!me_) return [0, 0];
  const at = p => GFX.tok[p.key] ? GFX.tok[p.key].shownT : p.pos, same = ps.filter(p => at(p) === at(me_));
  if (same.length < 2) return [0, 0]; return OFF[same.indexOf(me_) % OFF.length];
}
const lerpA = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
const V3 = new THREE.Vector3();
function stepBoard(dt, time) {
  const bd = GFX.board, ps = G.players, nd = MAP.nodes;
  const rv = bd.rival, rs = G.rival;
  if (rv && rs && nd[rs.at]) { const u = rv.userData, n = nd[rs.at], tx = n.x + 1.3, tz = n.z + 1.3, dx = tx - rv.position.x, dz = tz - rv.position.z, d = Math.hypot(dx, dz), moving = d > .05;
    if (moving) { const sp = Math.min(d, dt * Math.max(6, d * 1.6)); rv.position.x += dx / d * sp; rv.position.z += dz / d * sp; if (d > .4) rv.rotation.y = lerpA(rv.rotation.y, Math.atan2(-dz, dx), Math.min(1, dt * 6)); rv.position.y = Math.min(1.2, d * .15); } else rv.position.y *= .8;
    if (rs.carry !== u.lastCarry) { const was = u.lastCarry; u.lastCarry = rs.carry; u.mag.getWorldPosition(V3);
      if (rs.carry) { u.grabT = time; burst(bd.scene, V3.x, V3.y - .4, V3.z, { n: 16, shape: "cube", cols: ["#7FD3FF", "#FFFFFF", "#8E5BE0"], spd: 3.5, up: 3, grav: 6, life: .7 }); }
      else if (was) burst(bd.scene, V3.x, .6, V3.z, { n: 12, shape: "ico", cols: DUST, spd: 2.8, up: 2, grav: 6, life: .8 }); }
    const gk = u.grabT !== undefined ? time - u.grabT : 9, dip = gk < 1.2 ? Math.sin(gk / 1.2 * Math.PI) * 1.4 : 0;
    const swing = rs.carry ? Math.sin(time * 1.5) * .22 : moving ? 0 : Math.sin(time * .55) * 1.2;
    u.crane.rotation.y = lerpA(u.crane.rotation.y, swing, Math.min(1, dt * 2.5));
    const my = 2.15 - dip + Math.sin(time * 3) * .06; u.mag.position.y = my; u.mag.rotation.y += dt * (rs.carry ? .6 : 1.6);
    const L = Math.max(.1, 3.12 - (my + .12)); u.cable.scale.y = L; u.cable.position.y = my + .12 + L / 2;
    animTruck(rv.children[0], dt, moving ? 6 : 0); }
  ps.forEach(p => {
    const t = GFX.tok[p.key]; if (!t) return;
    if (t.carried && rv && G.rival && G.rival.carry === p.key) { rv.userData.mag.getWorldPosition(V3); t.g.position.lerp(V3.clone().add(new THREE.Vector3(0, -1.05, 0)), Math.min(1, dt * 10)); t.yaw += dt * 2; t.tr.rotation.y = t.yaw; return; }
    if (!t.anim && t.q.length) { const s = t.q.shift(); t.anim = { from: t.g.position.clone(), fromIdx: t.shown, toIdx: s.to, jump: s.jump, t: 0, dur: s.jump ? .8 : .34 }; t.shownT = s.to; const a = nd[t.shown], b = nd[s.to]; if (!s.jump && a && b) t.yawT = Math.atan2(-(b.z - a.z), b.x - a.x); }
    const off = offsetsFor(p.key);
    if (t.anim) { const a = t.anim; a.t += dt / a.dur; const k = Math.min(1, a.t), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      t.g.position.lerpVectors(a.from, tilePos(a.toIdx, off), e);
      if (MAP.lava && !a.jump) { const to = tilePos(a.toIdx, off), rd = (MAP.rampD || {})[a.fromIdx + "-" + a.toIdx] || (r => r && [r[1], r[0], r[2]])((MAP.rampD || {})[a.toIdx + "-" + a.fromIdx]), Lh = rd ? rd[2] : Math.hypot(to.x - a.from.x, to.z - a.from.z); t.g.position.y = a.from.y + (to.y - a.from.y) * (rd ? rampF(e, Lh, rd[0], rd[1]) : rampF(e, Lh)); }
      t.g.position.y += Math.sin(k * Math.PI) * (a.jump ? 2.4 + Math.abs(a.from.y - t.g.position.y) * .5 : .7); if (k >= 1) { t.anim = null; t.shown = a.toIdx; } }
    else { t.g.position.lerp(tilePos(t.shown, off), Math.min(1, dt * 8)); const c = nd[t.shown], nx = c && nd[c.next[0]]; if (t.yawT === undefined && c && nx) t.yawT = Math.atan2(-(nx.z - c.z), nx.x - c.x); }
    t.yaw = lerpA(t.yaw, t.yawT || 0, Math.min(1, dt * 10)); t.tr.rotation.y = t.yaw;
    { const pp = t.g.position, sp = t.lp && dt > 0 ? Math.hypot(pp.x - t.lp.x, pp.z - t.lp.z) / dt : 0; t.lp = pp.clone(); animTruck(t.tr, dt, Math.min(sp, 14)); }
  });
  const cur = ps[G.turn], ct = cur && GFX.tok[cur.key], inMg = G.phase === "minigame" || G.phase === "mgres";
  bd.hl.visible = !!ct && !inMg; if (ct) { bd.hl.position.x = ct.g.position.x; bd.hl.position.z = ct.g.position.z; bd.hl.position.y = (MAP.nodes[ct.shownT] ? MAP.nodes[ct.shownT].y || 0 : 0) + .53; bd.hl.scale.setScalar(1 + Math.sin(time * 4) * .08); }
  const fo = G.phase === "fork" && G.fork ? G.fork.opts : [];
  bd.arrows.forEach((a, k) => { const n = nd[fo[k]]; a.visible = !!n; if (n) a.position.set(n.x, (n.y || 0) + 1.4 + Math.abs(Math.sin(time * 4 + k)) * .5, n.z); });
  if (bd.vx) stepVolcano(bd, dt, time);
  bd.belts.forEach(tx => { tx.offset.y = (tx.offset.y - dt * 1.2) % 1; });
  bd.crushers.forEach(c => { const u = (time * .45 + c.ph) % 1, y = u < .08 ? 3 - (u / .08) * 2.1 : u < .25 ? .9 : .9 + Math.min(1, (u - .25) / .3) * 2.1; c.blk.position.y = y; c.st.position.y = y - .28; });
  stepFactory(bd, dt);
  bd.ring.rotation.z += dt * .8; bd.ring.position.y = .56 + Math.sin(time * 3) * .05;
  { const u = bd.bld.userData; if (u.sign) u.sign.rotation.y = Math.sin(time * 1.5) * .25; if (u.tick) u.tick(time); }
  const steam = (ps, o) => ps.forEach(p => { p.userData.t = (p.userData.t + dt * .35) % 1; const u = p.userData.t; p.position.set(o[0] + u * .6, o[1] + u * 2.2, o[2]); p.scale.setScalar(.6 + u * 1.4); p.material.opacity = .85 * (1 - u); });
  steam(bd.puffs, bd.bld.userData.puff); bd.refs.forEach((r, k) => { steam(r.userData.puffs, r.userData.puff); r.userData.tick(time); });
  swayStep(bd.scene); boardFx(bd, dt);
  bd.clouds.forEach((c, i) => { c.position.x += dt * (.4 + i * .05); if (c.position.x > 64) c.position.x = -64; });
  const cam = GFX.cam, aspect = GFX.w / GFX.h;
  let tgt, pos;
  const ir = GFX.introEnd ? (GFX.introEnd - performance.now()) / 1000 : 0, bcam = ir > 0 ? null : stepBattery(bd, dt);
  if (bcam) [tgt, pos] = bcam;
  else if (ir > 0) { const a = -.9 + (1 - ir / 5) * 1.8, d = (aspect < 1 ? 60 : 44) * (MAP.size || 1); tgt = new THREE.Vector3(0, MAP.camY || 0, 0); pos = new THREE.Vector3(Math.sin(a) * d, d * .72, Math.cos(a) * d); }
  else if (!GFX.follow) { const o = GFX.ov || resetOv(); tgt = new THREE.Vector3(o.tx, o.ty !== undefined ? o.ty : MAP.camY || 0, o.tz); const cp = Math.cos(o.pitch); pos = tgt.clone().add(new THREE.Vector3(Math.sin(o.yaw) * cp * o.dist, Math.sin(o.pitch) * o.dist, Math.cos(o.yaw) * cp * o.dist)); }
  else if (G.phase === "erupt") { tgt = new THREE.Vector3(0, 2, 0); pos = new THREE.Vector3(0, aspect < 1 ? 52 : 34, aspect < 1 ? 40 : 30); }
  else if ((ct && !inMg && G.phase !== "rival") || (G.phase === "rival" && rv)) { const rvl = G.phase === "rival"; tgt = (rvl ? rv : ct.g).position.clone(); tgt.y = Math.max(0, tgt.y - .5); pos = followCamPos(tgt, aspect, rvl ? 1.08 : 1); }
  else { const sz = MAP.size || 1; tgt = new THREE.Vector3(0, MAP.camY || 0, 1.5); pos = (aspect < 1 ? new THREE.Vector3(0, 52, 32) : new THREE.Vector3(0, 38, 25)).multiplyScalar(sz); }
  GFX.camPos = GFX.camPos || pos.clone(); GFX.camTgt = GFX.camTgt || tgt.clone();
  if (view === "game" && !mgOpen && GFX.toFree) {
    const ax = kbAxis(), rot = (KEYS.has("e") ? 1 : 0) - (KEYS.has("q") ? 1 : 0), zm = (KEYS.has("f") || KEYS.has("-") ? 1 : 0) - (KEYS.has("r") || KEYS.has("+") || KEYS.has("=") ? 1 : 0);
    GFX.kbCam = !!(ax.x || ax.y || rot || zm);
    if (GFX.kbCam) { GFX.toFree(); const o = GFX.ov || resetOv(), sp = dt * 520; GFX.camPan(-ax.x * sp, -ax.y * sp); o.yaw += rot * dt * 1.6; o.dist *= Math.exp(zm * dt * 1.3); GFX.clampOv(o);
      const cp = Math.cos(o.pitch); tgt = new THREE.Vector3(o.tx, o.ty !== undefined ? o.ty : MAP.camY || 0, o.tz); pos = tgt.clone().add(new THREE.Vector3(Math.sin(o.yaw) * cp * o.dist, Math.sin(o.pitch) * o.dist, Math.cos(o.yaw) * cp * o.dist)); }
  }
  const k = 1 - Math.exp(-dt * (bcam ? 3.4 : GFX.follow ? 2.6 : GFX.dragging || GFX.kbCam ? 18 : 8)); GFX.camPos.lerp(pos, k); GFX.camTgt.lerp(tgt, k);
  cam.position.copy(GFX.camPos); cam.lookAt(GFX.camTgt);
}

/* follow camera: pulled back a little, and swung gently toward the middle of the board depending on which side the truck is on */
function followCamPos(tgt, aspect, k) {
  const d = (aspect < 1 ? 1.45 : 1.12) * k * (MAP.follow || 1), yaw = Math.max(-1, Math.min(1, tgt.x / (22 * (MAP.size || 1)))) * .3, h = 15 * d;
  return tgt.clone().add(new THREE.Vector3(Math.sin(yaw) * h, 17.5 * d, Math.cos(yaw) * h));
}
/* ---------- free camera: drag to pan, pinch to zoom, twist to rotate ---------- */
function resetOv() { const a = GFX.w / GFX.h, sz = MAP.size || 1; GFX.ov = a < 1 ? { tx: 0, tz: 1.5, dist: 82 * sz, yaw: 0, pitch: 1.1 } : { tx: 0, tz: 1.5, dist: 45.5 * sz, yaw: 0, pitch: .99 }; return GFX.ov; }
let camHinted = false;
function camHint() { if (camHinted) return; camHinted = true; fxShow(`<div class="dlabel">${FINE ? "WASD to move, Q/E to rotate, R/F to zoom" : "Drag to look around, pinch to zoom, twist to rotate"}</div>`, 3200); }
function initCamInput() {
  if (GFX.camInput) return; GFX.camInput = true;
  const cv = $("#gl"), pts = new Map(); let moved = 0, pair = null;
  const active = () => GFX.mode === "board" && G && view === "game" && !mgOpen;
  const clampOv = o => { const L = 26 + ((MAP.size || 1) - 1) * 20; o.tx = Math.max(-L, Math.min(L, o.tx)); o.tz = Math.max(-L, Math.min(L + 2, o.tz)); o.dist = Math.max(9, Math.min(140, o.dist)); o.pitch = Math.max(.42, Math.min(1.5, o.pitch)); };
  const toFree = () => { GFX.introEnd = 0; if (!GFX.follow) return; GFX.follow = false; const t = GFX.camTgt || new THREE.Vector3(), p = GFX.camPos || new THREE.Vector3(0, 40, 25), off = p.clone().sub(t), d = off.length() || 40;
    /* keep the height the follow camera was looking at, so switching to the free camera doesn't dip */
    GFX.ov = { tx: t.x, ty: t.y, tz: t.z, dist: d, yaw: Math.atan2(off.x, off.z), pitch: Math.asin(Math.min(1, Math.max(-1, off.y / d))) }; clampOv(GFX.ov); updateGame(); camHint(); };
  const pan = (dx, dy) => { const o = GFX.ov, k = o.dist * .0021, cy = Math.cos(o.yaw), sy = Math.sin(o.yaw); o.tx += -cy * dx * k - sy * dy * k; o.tz += sy * dx * k - cy * dy * k; clampOv(o); };
  const pairInfo = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
  cv.addEventListener("pointerdown", e => { if (!active()) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} pts.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, ctrl: e.ctrlKey || e.shiftKey }); moved = 0; pair = pts.size === 2 ? pairInfo() : null; });
  cv.addEventListener("pointermove", e => {
    const p = pts.get(e.pointerId); if (!p || !active()) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 8) toFree();
    if (GFX.follow) return; GFX.dragging = true;
    if (pts.size === 1) {
      if (p.b === 2 || p.ctrl) { GFX.ov.yaw -= dx * .008; GFX.ov.pitch += dy * .006; clampOv(GFX.ov); } else pan(dx, dy);
      p.x = e.clientX; p.y = e.clientY;
    } else if (pts.size === 2) {
      p.x = e.clientX; p.y = e.clientY; const n = pairInfo();
      if (pair) { const o = GFX.ov; o.dist *= pair.d / Math.max(20, n.d); let da = n.ang - pair.ang; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2; o.yaw += da; pan(n.mx - pair.mx, n.my - pair.my); clampOv(o); }
      pair = n;
    }
  });
  const end = e => { pts.delete(e.pointerId); pair = pts.size === 2 ? pairInfo() : null; if (!pts.size) GFX.dragging = false; };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  cv.addEventListener("contextmenu", e => { if (active()) e.preventDefault(); });
  GFX.toFree = toFree; GFX.camPan = pan; GFX.clampOv = clampOv;
  cv.addEventListener("wheel", e => { if (!active()) return; e.preventDefault(); toFree(); if (!GFX.ov) resetOv(); GFX.ov.dist *= Math.exp(e.deltaY * .0012); clampOv(GFX.ov); }, { passive: false });
}

/* ---------- keyboard (PC): WASD / arrows ---------- */
const KEYS = new Set(), FINE = typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches;
function kbAxis() { const x = (KEYS.has("d") || KEYS.has("arrowright") ? 1 : 0) - (KEYS.has("a") || KEYS.has("arrowleft") ? 1 : 0), y = (KEYS.has("s") || KEYS.has("arrowdown") ? 1 : 0) - (KEYS.has("w") || KEYS.has("arrowup") ? 1 : 0); return { x, y }; }
addEventListener("keydown", e => {
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase(), inMgNow = GFX.mode === "mg" && W;
  if (inMgNow && [" ", "enter", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
  if (!inMgNow && GFX.mode === "board" && k.startsWith("arrow")) e.preventDefault();
  KEYS.add(k); if (e.repeat || !inMgNow) return;
  const rb = $("#m3rb"), rd = $("#m3r");
  if ((k === " " || k === "enter") && rb && !rb.disabled && rd && !rd.hidden) { rb.click(); return; }
  if (W.def.onKey) { if (W.t >= 0 && !W.me.d && !W.paused) W.def.onKey(W, k, true); return; }
  if (W.def.ctrl === "stick") { if (k === " " || k === "shift") { if (!e.repeat) W.inp.boost = true; W.inp.hold = true; } }
  else if ((k === " " || k === "enter" || k === "w" || k === "arrowup") && W.t >= 0 && !W.me.d && W.def.tap) W.def.tap(W, W.me);
});
addEventListener("keyup", e => { const k = e.key.toLowerCase(); KEYS.delete(k); if (W && (k === " " || k === "shift")) W.inp.hold = false; if (W && GFX.mode === "mg" && W.def.onKey && W.t >= 0 && !W.me.d) W.def.onKey(W, k, false); });
addEventListener("blur", () => KEYS.clear());
