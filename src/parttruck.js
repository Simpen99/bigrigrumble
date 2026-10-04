
/* ---------- trucks: models with animated parts ---------- */
const uniq = m => { m.material = m.material.clone(); return m; };
const CBG = {};
function chamferBoxSq(w, h, d, r, flat) {
  const key = [w, h, d, r].map(v => v.toFixed(3)).join(",") + "|" + flat.join(""); if (CBG[key]) return CBG[key];
  if (!THREE.ConvexGeometry) return chamferBox(w, h, d, r);
  const X = w / 2, Y = h / 2, Z = d / 2, R = f => !flat.includes(f), pts = [], e = 1e-6;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const fx = R(sx > 0 ? "px" : "nx"), fy = R(sy > 0 ? "py" : "ny"), fz = R(sz > 0 ? "pz" : "nz");
    for (const ix of [0, 1]) for (const iy of [0, 1]) for (const iz of [0, 1]) {
      const u = X - ix * r, v = Y - iy * r, t = Z - iz * r;
      if (fx && fy && u + v > X + Y - r + e) continue; if (fy && fz && v + t > Y + Z - r + e) continue; if (fx && fz && u + t > X + Z - r + e) continue; if (fx && fy && fz && u + v + t > X + Y + Z - 2 * r + e) continue;
      pts.push(new THREE.Vector3(sx * u, sy * v, sz * t)); } }
  return (CBG[key] = new THREE.ConvexGeometry(pts));
}
function chamferBox(w, h, d, r) {
  const key = [w, h, d, r].map(v => v.toFixed(3)).join(","); if (CBG[key]) return CBG[key];
  const hw = w / 2 - r, hh = h / 2 - r, c = r * .9, s = new THREE.Shape();
  s.moveTo(-hw + c, -hh); s.lineTo(hw - c, -hh); s.lineTo(hw, -hh + c); s.lineTo(hw, hh - c); s.lineTo(hw - c, hh); s.lineTo(-hw + c, hh); s.lineTo(-hw, hh - c); s.lineTo(-hw, -hh + c); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 1, steps: 1 });
  g.translate(0, 0, -(d - 2 * r) / 2); g.computeVertexNormals(); return (CBG[key] = g);
}
// side-profile prism (convex CCW polygon in x/y, depth d along z) with bevelled side edges like chamferBox; cs[i] rounds off profile corner i
function chamferPrism(P, d, r, cs) {
  if (!THREE.ConvexGeometry) return null;
  const Q = []; P.forEach((p, i) => { const c = cs[i] || 0; if (!c) { Q.push(p); return; } [P[(i + P.length - 1) % P.length], P[(i + 1) % P.length]].forEach(q => { const dx = q[0] - p[0], dy = q[1] - p[1], t = Math.min(c, Math.hypot(dx, dy) * .3) / Math.hypot(dx, dy); Q.push([p[0] + dx * t, p[1] + dy * t]); }); });
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [-dy / l, dx / l]; }, pts = [];
  Q.forEach((p, i) => { const n1 = nrm(Q[(i + Q.length - 1) % Q.length], p), n2 = nrm(p, Q[(i + 1) % Q.length]), k = r / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    [-1, 1].forEach(sz => pts.push(new THREE.Vector3(p[0], p[1], sz * (d / 2 - r)), new THREE.Vector3(p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k, sz * d / 2))); });
  return new THREE.ConvexGeometry(pts);
}
function buildTruck(i) {
  const B = (w, h, d, c, x, y, z, o) => { let sq = null; if (o && o.sq) { sq = o.sq; o = Object.assign({}, o); delete o.sq; if (!Object.keys(o).length) o = undefined; } const mn = Math.min(w, h, d), r = Math.min(.075, mn * .2), m = mesh(mn >= .18 ? (sq ? chamferBoxSq(w, h, d, r, sq) : chamferBox(w, h, d, r)) : new THREE.BoxGeometry(w, h, d), c, o); m.position.set(x, y, z); return m; };
  const NY = { sq: ["ny"] }, HOOD = { sq: ["nx", "ny"] };
  const t = TRUCKS[i] || TRUCKS[0], g = new THREE.Group(), c = t.color, a = t.accent, D = "#353A46", GL = "#2F3B52", CH = "#D8DDE5", W = 1.1;
  const glass = { roughness: .2, metalness: .2 }, lamp = { emissive: "#FFF1C2", emissiveIntensity: 1.2 };
  const anims = [], wheelsL = [], roof = [], ph = Math.random() * 10; let tailX = null, tailY = .5;
  const add = (...m) => m.forEach(x => g.add(x));
  const grp = (x = 0, y = 0, z = 0, ...kids) => { const q = new THREE.Group(); q.position.set(x, y, z); kids.forEach(k => q.add(k)); g.add(q); return q; };
  const wheels = (xs, r = .3, z = W / 2) => xs.forEach(x => [-1, 1].forEach(s => {
    const w = Cy(r, r, .3, 16, "#2A2E36", 0, 0, 0); w.rotation.x = Math.PI / 2;
    const h = Cy(r * .6, r * .6, .32, 12, "#E3E6EB", 0, 0, 0); h.rotation.x = Math.PI / 2;
    const cp = Cy(r * .22, r * .22, .36, 8, "#9AA3AE", 0, 0, 0); cp.rotation.x = Math.PI / 2;
    const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 1.05, .05, .34), M("#C3CAD4"));
    wheelsL.push({ g: grp(x, r, s * z, w, h, cp, sp), r }); }));
  const chassis = (l = 2.1, x = 0) => { tailX = x - l / 2; add(B(l, .2, W * .78, D, x, .42, 0)); };
  const cab = (x = .72, l = .62, h = .82, col = c, y0 = .5) => {
    add(B(l, h, W, col, x, y0 + h / 2, 0, NY), B(.04, h * .4, W * .84, GL, x + l / 2 + .005, y0 + h * .68, 0, glass),
      B(l * .55, h * .36, W + .02, GL, x + l * .12, y0 + h * .68, 0, glass), B(.08, .16, W * .96, CH, x + l / 2 + .04, y0 + .1, 0),
      B(.03, h * .22, W * .5, "#1D2230", x + l / 2 + .01, y0 + h * .3, 0),
      B(.04, .1, .18, "#FFF6C2", x + l / 2 + .03, y0 + .28, W * .34, lamp), B(.04, .1, .18, "#FFF6C2", x + l / 2 + .03, y0 + .28, -W * .34, lamp),
      B(.06, .16, .08, D, x + l / 2 - .13, y0 + h * .66, W / 2 + .035), B(.06, .16, .08, D, x + l / 2 - .13, y0 + h * .66, -W / 2 - .035)); };
  const beacon = (x, y, col, rate = 7) => { const base = Cy(.09, .11, .08, 8, D, x, y, 0), cap = uniq(Cy(.08, .09, .12, 8, col, x, y + .1, 0, { emissive: col, emissiveIntensity: .4 }));
    const refl = B(.02, .08, .15, "#FFFFFF", 0, 0, 0), rg = grp(x, y + .1, 0, refl); add(base, cap);
    anims.push(tm => { rg.rotation.y = tm * rate; cap.material.emissiveIntensity = .5 + Math.max(0, Math.sin(tm * rate)) * 1.3; }); };
  switch (t.kind) {
    case "box": chassis(); add(B(1.3, 1.1, W, c, -.34, 1.07, 0, NY), B(1.24, .16, W + .06, a, -.34, .85, 0), B(1.14, .04, W - .16, a, -.34, 1.64, 0), B(.03, .9, W * .8, "#C9CED8", -1.0, 1.05, 0));
      cab(.68); beacon(.68, 1.34, "#FFB000"); wheels([-.72, .7]); break;
    case "monster": { wheels([-.72, .72], .52, .64); const dy = .6;
      [.3, -.3].forEach(z => add(B(.14, .5, .14, D, -.72, .74, z), B(.14, .5, .14, D, .72, .74, z)));
      const body = grp(0, 0, 0, B(2.0, .18, W * .78, D, 0, .42 + dy, 0), B(.72, .62, W, c, .05, .82 + dy, 0, NY), B(.695, .36, W, c, .6825, .7 + dy, 0, HOOD),
        B(.9, .1, W - .02, c, -.62, .56 + dy, 0), B(.9, .32, .06, c, -.62, .72 + dy, W / 2 - .03), B(.9, .32, .06, c, -.62, .72 + dy, -W / 2 + .03), B(.06, .32, W - .02, c, -1.05, .72 + dy, 0),
        B(.04, .22, W * .8, GL, .42, .95 + dy, 0, glass), B(.4, .2, W + .02, GL, .05, .95 + dy, 0, glass), B(1.9, .07, W + .06, a, 0, .64 + dy, 0),
        B(.1, .16, W * .98, CH, 1.06, .56 + dy, 0), B(.03, .15, W * .5, "#1D2230", 1.04, .72 + dy, 0),
        B(.04, .1, .18, "#FFF6C2", 1.04, .76 + dy, .36, lamp), B(.04, .1, .18, "#FFF6C2", 1.04, .76 + dy, -.36, lamp),
        B(.06, .5, .06, D, -.34, .9 + dy, .46), B(.06, .5, .06, D, -.34, .9 + dy, -.46), B(.07, .07, W * .9, D, -.34, 1.16 + dy, 0));
      const bar = uniq(B(.12, .09, .7, "#FFF6C2", .05, 1.18 + dy, 0, lamp)); body.add(bar);
      tailX = -1.08; tailY = .72 + dy; g.userData.tailG = body;
      anims.push(tm => { body.position.y = Math.abs(Math.sin(tm * 3.2)) * .09; body.rotation.z = Math.sin(tm * 1.6) * .03; bar.material.emissiveIntensity = .8 + Math.sin(tm * 6) * .5; }); break; }
    case "icecream": { chassis(); add(B(2.05, 1.15, W, c, 0, 1.1, 0, NY), B(.04, .45, W * .84, GL, 1.03, 1.3, 0, glass), B(.9, .42, W + .02, "#FFFFFF", -.35, 1.2, 0), B(.08, .16, W * .96, CH, 1.07, .6, 0),
        B(.04, .1, .18, "#FFF6C2", 1.06, .78, .36, lamp), B(.04, .1, .18, "#FFF6C2", 1.06, .78, -.36, lamp));
      const aw = [1, -1].map(s => { const m = B(1.0, .06, .32, a, 0, 0, 0); return grp(-.35, 1.46, s * (W / 2 + .12), m); });
      const cn = mesh(new THREE.ConeGeometry(.2, .5, 8), "#E0A45A"); cn.rotation.x = Math.PI; cn.position.y = 0;
      const sc = mesh(new THREE.IcosahedronGeometry(.27, 0), "#FFC2DC"); sc.position.y = .31; const ch = mesh(new THREE.IcosahedronGeometry(.1, 0), "#E5484D"); ch.position.y = .58;
      const top = grp(-.1, 1.95, 0, cn, sc, ch); roof.push(top);
      anims.push(tm => { top.rotation.y = tm * 1.4; top.position.y = 1.95 + Math.sin(tm * 2.4) * .06; aw.forEach((q, k) => q.rotation.x = Math.sin(tm * 3 + k) * .06); });
      wheels([-.68, .68]); break; }
    case "fire": { chassis(2.2, -.05); add(B(1.45, .85, W, c, -.38, .95, 0, NY), B(1.47, .12, W + .06, a, -.38, .8, 0));
      const lad = grp(-.8, 1.5, 0, B(1.6, .06, .06, "#CFD4DC", .72, 0, .26), B(1.6, .06, .06, "#CFD4DC", .72, 0, -.26)); for (let k = 0; k < 7; k++) lad.add(B(.05, .05, .52, "#CFD4DC", k * .24, 0, 0));
      add(Cy(.2, .23, .08, 10, "#8E96A3", -.8, 1.415, 0), B(.12, .12, .06, "#8E96A3", -.8, 1.46, .26), B(.12, .12, .06, "#8E96A3", -.8, 1.46, -.26), B(.07, .09, .6, "#5A6272", .3, 1.42, 0));
      cab(.72, .62, .85);
      const L1 = uniq(B(.14, .1, .3, "#3D7BFF", .72, 1.42, .18, { emissive: "#3D7BFF", emissiveIntensity: .8 })), L2 = uniq(B(.14, .1, .3, "#FF3B3B", .72, 1.42, -.18, { emissive: "#FF3B3B", emissiveIntensity: .8 })); add(L1, L2);
      anims.push(tm => { const on = Math.sin(tm * 9) > 0; L1.material.emissiveIntensity = on ? 2 : .1; L2.material.emissiveIntensity = on ? .1 : 2; lad.rotation.z = (Math.sin(tm * .7) * .5 + .5) * .12; });
      wheels([-.85, -.3, .72]); break; }
    case "mixer": { chassis(); const dg = new THREE.Group(); const dr = mesh(new THREE.CylinderGeometry(.4, .6, 1.3, 8), a); dg.add(dr);
      [-.3, .25].forEach(y => { const b = mesh(new THREE.TorusGeometry(.53 - y * .15, .05, 4, 8), c); b.rotation.x = Math.PI / 2; b.position.y = y; dg.add(b); });
      dg.add(B(.08, 1.1, .12, c, .5, 0, 0));
      dg.rotation.z = Math.PI / 2 - .2; dg.position.set(-.38, 1.12, 0); g.add(dg);
      const chute = grp(-1.05, .8, 0, B(.4, .08, .2, "#8E96A3", -.15, 0, 0)); chute.rotation.z = .5;
      add(B(.2, .4, .5, D, -.9, .7, 0), B(.2, .4, .5, D, .1, .7, 0)); cab(.72);
      anims.push((tm, dt) => { dg.rotateY(dt * 3); chute.rotation.y = Math.sin(tm * .9) * .5; });
      wheels([-.8, -.3, .72]); break; }
    case "dump": { chassis(); const bed = new THREE.Group(); bed.position.set(-1.0, .6, 0);
      const bb = B(1.35, .75, W, c, .66, .38, 0); bb.rotation.z = -.06; bed.add(bb); [-.8, -.34, .12].forEach(x => bed.add(B(.06, .78, W + .04, a, x + 1.0, .38, 0)));
      bed.add(B(.3, .25, .9, "#8C5A3C", .5, .85, 0), B(.25, .2, .5, "#6F7682", .95, .82, .15)); g.add(bed);
      const ram = B(.1, .5, .1, "#8E96A3", -.1, .6, 0); add(ram); cab(.72);
      anims.push(tm => { const u = Math.max(0, Math.sin(tm * .7)); const e = u * u; bed.rotation.z = e * .6; ram.scale.y = 1 + e * 1.6; ram.position.y = .6 + e * .4; ram.rotation.z = e * .5; });
      wheels([-.7, .72]); break; }
    case "pickup": { add(B(2.0, .18, W * .78, D, 0, .42, 0), B(.72, .62, W, c, .05, .82, 0, NY), B(.695, .36, W, c, .6825, .7, 0, HOOD), B(.9, .1, W - .02, c, -.62, .56, 0),
        B(.9, .32, .06, c, -.62, .72, W / 2 - .03), B(.9, .32, .06, c, -.62, .72, -W / 2 + .03), B(.06, .32, W - .02, c, -1.05, .72, 0),
        B(.04, .22, W * .8, GL, .42, .95, 0, glass), B(.4, .2, W + .02, GL, .05, .95, 0, glass), B(1.9, .06, W + .06, a, 0, .62, 0),
        B(.08, .14, W * .96, CH, 1.05, .56, 0), B(.03, .14, W * .5, "#1D2230", 1.04, .7, 0), B(.04, .1, .18, "#FFF6C2", 1.04, .74, .36, lamp), B(.04, .1, .18, "#FFF6C2", 1.04, .74, -.36, lamp),
        B(.1, .06, W * .9, D, -1.02, 1.05, 0), B(.06, .22, .06, D, -1.0, .92, .4), B(.06, .22, .06, D, -1.0, .92, -.4));
      const pipe = Cy(.05, .05, .3, 6, "#8E96A3", -1.1, .45, -.35); pipe.rotation.z = Math.PI / 2; add(pipe);
      const puffs = [0, 1, 2, 3].map(k => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 0), new THREE.MeshStandardMaterial({ color: "#C9CED8", transparent: true, opacity: .7, flatShading: true })); g.add(m); return m; });
      anims.push(tm => puffs.forEach((m, k) => { const u = (tm * 1.3 + k / 4) % 1; m.position.set(-1.25 - u * .8, .45 + u * .5, -.35); m.scale.setScalar(.6 + u * 2); m.material.opacity = .7 * (1 - u); }));
      wheels([-.62, .62], .32); break; }
    case "tow": { chassis(); add(B(1.3, .12, W, c, -.36, .6, 0)); add(Cy(.26, .3, .1, 10, "#5A6272", -.05, .72, 0), B(.36, .22, .48, D, -.05, .9, 0), B(.07, .54, .07, "#8E96A3", -.6, .95, .09), B(.07, .54, .07, "#8E96A3", -.6, .95, -.09)); { const pin = Cy(.065, .065, .58, 8, "#8E96A3", -.05, 1.02, 0); pin.rotation.x = Math.PI / 2; add(pin); }
      const bm = B(1.2, .14, .14, a, -.56, 1.21, 0); bm.rotation.z = -.55; add(bm);
      const hook = grp(-1.07, 1.52, 0, B(.03, .4, .03, D, 0, -.2, 0), B(.14, .08, .08, "#888E99", 0, -.4, 0), B(.05, .12, .05, "#888E99", .06, -.47, 0)); cab(.72); beacon(.72, 1.34, "#FFB000", 9);
      anims.push(tm => { hook.rotation.z = Math.sin(tm * 2.2) * .35; hook.rotation.x = Math.sin(tm * 1.7) * .15; });
      wheels([-.7, .72]); break; }
    case "garbage": { chassis(2.3, -.1); add(B(1.25, 1.05, W, c, -.3, 1.04, 0, NY), B(.8, .4, W + .06, a, -.3, 1.05, 0)); cab(.72);
      add(B(.62, .9, .07, c, -1.23, 1.0, W / 2 - .035), B(.62, .9, .07, c, -1.23, 1.0, -W / 2 + .035), B(.62, .08, W - .08, D, -1.23, .6, 0),
        B(.02, .82, W - .16, "#151B24", -.935, 1.0, 0), B(.3, .08, W, c, -1.07, 1.48, 0), B(.64, .06, .09, a, -1.23, 1.46, W / 2 - .035), B(.64, .06, .09, a, -1.23, 1.46, -W / 2 + .035),
        B(.08, .08, W - .22, "#FFC83D", -1.53, 1.3, 0), B(.1, .12, W + .04, D, -1.52, .56, 0));
      const vx = -.36, vy = -.56, hx = vx + .17, hy = vy + .1, al = Math.hypot(hx, hy), ang = Math.atan2(hy, hx), lift = new THREE.Group(); lift.position.set(-1.53, 1.3, 0); g.add(lift);
      [.2, -.2].forEach(z => { const ar = B(al + .04, .06, .06, D, hx / 2, hy / 2, z); ar.rotation.z = ang; lift.add(ar); });
      const bin = new THREE.Group(); bin.position.set(vx, vy, 0); lift.add(bin);
      bin.add(new THREE.Mesh(new THREE.BoxGeometry(.3, .38, .34), M("#1FA35C")), (() => { const l = new THREE.Mesh(new THREE.BoxGeometry(.31, .04, .35), M("#157A44")); l.position.y = .21; return l; })(), B(.07, .07, .44, D, .17, .1, 0), B(.12, .14, .04, D, .12, .08, .2), B(.12, .14, .04, D, .12, .08, -.2));
      const junk = [0, 1, 2].map(k => { const m = B(.09, .09, .09, ["#8C5A3C", "#6F7682", "#C28A4A"][k], 0, 0, 0); m.visible = false; g.add(m); return m; });
      anims.push(tm => { const u = (tm * .3) % 1, e = u < .55 ? Math.sin(u / .55 * Math.PI) : 0, th = -e * 2.35; lift.rotation.z = th;
        const dump = u > .2 && u < .38, k = (u - .2) / .18; junk.forEach((m, n) => { m.visible = dump; if (dump) m.position.set(-1.45 + n * .08, 1.75 - k * 1.1 - n * .05, (n - 1) * .12); m.rotation.set(k * 5 + n, k * 4, 0); }); });
      wheels([-.7, .72]); break; }
    case "tanker": { chassis(); const tk = Cy(.5, .5, 1.45, 12, c, -.35, 1.02, 0, { roughness: .35, metalness: .4 }); tk.rotation.z = Math.PI / 2; add(tk);
      [-.9, .2].forEach(x => { const b = Cy(.53, .53, .08, 12, a, x, 1.02, 0); b.rotation.z = Math.PI / 2; add(b); });
      add(Cy(.12, .12, .14, 8, "#AAB3C0", -.35, 1.55, 0), B(1.3, .04, .04, "#8E96A3", -.35, 1.56, .3));
      [-.94, -.55, -.15, .24].forEach(x => add(B(.03, .17, .03, "#8E96A3", x, 1.475, .3)));
      const lid = grp(-.47, 1.63, 0, Cy(.14, .14, .04, 8, "#8E96A3", .12, 0, 0));
      const drop = uniq(mesh(new THREE.IcosahedronGeometry(.07, 0), "#4FB3E8", { transparent: true, opacity: .9 })); add(drop);
      cab(.72, .62, .82, a);
      anims.push(tm => { const u = Math.max(0, Math.sin(tm * 1.1)); lid.rotation.z = u * 1.1; const d = (tm * .8) % 1; drop.position.set(-1.1, .95 - d * .8, 0); drop.material.opacity = d < .9 ? .9 : 0; });
      wheels([-.85, -.3, .72]); break; }
    case "mail": { chassis(); const vg = chamferPrism([[-1.025, .495], [.93, .495], [.943, 1.04], [.5, 1.545], [-1.025, 1.545]], W, .075, [.07, 0, 0, .09, .07]);
      if (vg) add(mesh(vg, c)); else { add(B(1.55, 1.05, W, c, -.25, 1.02, 0, NY)); const wsh = new THREE.Shape(); wsh.moveTo(.5, 1.055); wsh.lineTo(.93, 1.055); wsh.lineTo(.5, 1.545); wsh.closePath(); const wg = new THREE.ExtrudeGeometry(wsh, { depth: W, bevelEnabled: false }); wg.translate(0, 0, -W / 2); add(mesh(wg, c)); }
      add(B(.57, .55, W - .03, c, .735, .78, 0, HOOD));
      const ws = new THREE.Mesh(new THREE.BoxGeometry(.56, .03, W * .8), M(GL, glass)); ws.position.set(.736, 1.288, 0); ws.rotation.z = Math.atan2(-.49, .43);
      add(ws, B(1.57, .1, W + .06, a, -.25, .8, 0), B(.3, .3, W + .02, GL, .3, 1.25, 0, glass), B(.5, .32, W + .02, "#FFFFFF", -.55, 1.15, 0), B(.08, .14, W * .96, CH, 1.04, .6, 0),
        B(.04, .1, .18, "#FFF6C2", 1.03, .74, .36, lamp), B(.04, .1, .18, "#FFF6C2", 1.03, .74, -.36, lamp));
      const flag = grp(-.95, 1.1, W / 2 + .01, B(.03, .42, .02, D, 0, .21, 0), B(.24, .13, .02, "#E5484D", .12, .37, 0));
      const env = mesh(new THREE.PlaneGeometry(.28, .18), "#FFF8E6", { side: THREE.DoubleSide }); g.add(env);
      anims.push(tm => { const u = (tm * .4) % 1; flag.rotation.z = u < .5 ? -Math.min(1, u * 6) * 1.35 : -1.35 + Math.min(1, (u - .5) * 6) * 1.35; const v = (tm * .5) % 1; env.position.set(-.4 - v * .3, 1.6 + v * 1.2, 0); env.rotation.set(v * 3, v * 5, v * 2); env.visible = v < .85; });
      wheels([-.7, .62]); break; }
    case "food": { chassis(); add(B(2.05, 1.1, W, c, 0, 1.08, 0, NY), B(.9, .42, W + .02, "#2C313D", -.35, 1.15, 0), B(.04, .45, W * .84, GL, 1.03, 1.3, 0, glass), B(.08, .16, W * .96, CH, 1.07, .6, 0),
        B(.04, .1, .18, "#FFF6C2", 1.06, .78, .36, lamp), B(.04, .1, .18, "#FFF6C2", 1.06, .78, -.36, lamp));
      const aw = [1, -1].map(s => { const q = grp(-.35, 1.44, s * (W / 2 + .01), B(1.0, .06, .36, a, 0, 0, s * .18)); q.rotation.x = s * .3; q.userData.s = s; return q; });
      const tc = mesh(new THREE.CylinderGeometry(.36, .36, .26, 12, 1, false, 0, Math.PI), "#F2C14E", { side: THREE.DoubleSide }); tc.rotation.set(Math.PI / 2, 0, -Math.PI / 2, "ZYX"); tc.position.y = .34;
      const tg = grp(-.1, 1.66, 0, tc, B(.6, .1, .16, "#4CAF50", 0, .37, 0), B(.42, .08, .12, "#E5484D", -.05, .42, 0), B(.3, .07, .1, "#8B4A2B", .08, .45, 0)); roof.push(tg);
      anims.push(tm => { tg.rotation.y = tm * 1.2; tg.position.y = 1.66 + Math.abs(Math.sin(tm * 2.4)) * .12; aw.forEach(q => q.rotation.x = q.userData.s * (.3 + Math.sin(tm * 3.5 + q.userData.s) * .08)); });
      wheels([-.68, .68]); break; }
  }
  if (t.kind === "pickup") { tailX = -1.08; tailY = .72; }
  if (tailX !== null) { const tail = { emissive: "#FF4A4F", emissiveIntensity: .9 }, host = g.userData.tailG || g;
    const bp = new THREE.Mesh(new THREE.BoxGeometry(.08, .14, W * .9), M(D)); bp.position.set(tailX - .02, tailY, 0);
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(.04, .1, .16), M("#E5484D", tail)), l2 = l1.clone(); l1.position.set(tailX - .075, tailY + .01, W * .33); l2.position.set(tailX - .075, tailY + .01, -W * .33); host.add(bp, l1, l2); }
  g.userData.anims = anims; g.userData.wheels = wheelsL; g.userData.ph = ph; g.userData.roof = roof; // roof ornaments a minigame can take off
  return g;
}
function animTruck(tr, dt, speed = 0) {
  const u = tr && tr.userData; if (!u || !u.anims) return;
  const tm = performance.now() / 1000 + u.ph;
  u.anims.forEach(f => f(tm, dt));
  if (speed) u.wheels.forEach(w => { w.g.rotation.z -= speed * dt / w.r; });
}
function swayStep(scene) {
  if (!scene.userData.swayList) { const l = []; scene.traverse(o => { if (o.userData && o.userData.sway !== undefined) l.push(o); }); scene.userData.swayList = l; }
  const tm = performance.now() / 1000;
  scene.userData.swayList.forEach(o => { o.rotation.z = Math.sin(tm * 1.3 + o.userData.sway) * .035; o.rotation.x = Math.cos(tm * 1.1 + o.userData.sway) * .025; });
}
