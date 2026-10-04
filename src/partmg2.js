
/* ---------- truck special minigames ---------- */
function stationFloor(s, col, w = 18, d = 14) { const f = B(w, .4, d, col, 0, -.2, 0); f.castShadow = false; s.add(f); }
const hideOthers = (W, e) => { if (!e.isMe) e.g.visible = false; };
function decal(s, geo, col, x, y, z, op = 1) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; s.add(m); return m; }
function cxWireBtn(el, down, up) {
  el.addEventListener("pointerdown", e => { e.preventDefault(); el.classList.add("kick"); down && down(); });
  const end = e => { el.classList.remove("kick"); up && up(); };
  el.addEventListener("pointerup", end); el.addEventListener("pointerleave", e => { if (el.classList.contains("kick")) end(e); }); el.addEventListener("pointercancel", end);
}
const setTxt = (id, v) => { const n = document.getElementById(id); if (n && n.textContent !== v) n.textContent = v; };

Object.assign(MG, {
  /* ---- Sprinkles: Scoop Stack (push your luck: scoops melt in the sun, SERVE to bank the cone with toppings) ---- */
  scoop: { name: "Scoop Stack", special: true, msgTop: true, lbTop: true, bare: true, sun: [-8.9, 23, 20], fx: { col: .2 }, kind: "station", ctrl: "custom", hi: true, unit: "pts", dur: 45,
    how: "Flip scoops onto the cone and tap SERVE to sell it. Bigger cones pay more and get more toppings, but scoops melt in the sun and the tower slides off.",
    tapHint: "SCOOP (Space) drops a scoop, SERVE (Enter) sells the cone.",
    R: .55, STEP: .74, CT: 2.9, FLAV: ["#FFC2DC", "#B8F2D0", "#7A4E3A", "#FFF3D6", "#B9B4F5", "#FFB38A"], SPRK: ["#FF4D8D", "#FFC83D", "#4FC3FF", "#7CF0A8", "#FFFFFF", "#B03BFF"],
    build(W) { const s = W.sc; this.park(W); W.lpWarm = .26;
      s.add(B(3.4, 1.3, 2.4, "#FF9FCB", 0, .65, 0), B(3.5, .12, 2.5, "#FFFFFF", 0, 1.36, 0), B(3.5, .1, .5, "#FFFFFF", 0, .95, 1.25));
      for (let i = 0; i < 6; i++) s.add(B(.52, .06, 2.52, i % 2 ? "#FFFFFF" : "#FF9FCB", -1.45 + i * .58, 1.3, 0));
      s.add(Cy(.35, .45, .5, 10, "#C9CED8", 0, 1.67, 0));
      W.pud = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshStandardMaterial({ color: "#FFC2DC", roughness: .15, metalness: .05, transparent: true, opacity: .92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); W.pud.rotation.x = -Math.PI / 2; W.pud.position.set(.15, 1.425, .2); W.pud.scale.setScalar(.01); s.add(W.pud); W.pudR = 0;
      const waffle = canvasTex(128, 128, (x, w, h) => { x.fillStyle = "#E3A75C"; x.fillRect(0, 0, w, h); x.strokeStyle = "#B97A35"; x.lineWidth = 6; for (let i = -w; i < w * 2; i += 26) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + h, h); x.stroke(); x.beginPath(); x.moveTo(i, h); x.lineTo(i + h, 0); x.stroke(); } });
      waffle.wrapS = waffle.wrapT = THREE.RepeatWrapping; waffle.repeat.set(3, 2);
      W.coneG = new THREE.Group(); s.add(W.coneG);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.72, 1.5, 14), new THREE.MeshStandardMaterial({ map: waffle, roughness: .85, flatShading: true })); cone.rotation.x = Math.PI; cone.position.set(0, this.CT - .75, 0); cone.castShadow = true; W.coneG.add(cone);
      W.coneG.add(Cy(.76, .74, .14, 14, "#C98A4B", 0, this.CT - .02, 0));
      this.stand(s);
      const sun = new THREE.Group(); sun.position.set(-4.5, 13, -16); sun.scale.setScalar(.8); s.add(sun); sun.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), new THREE.MeshBasicMaterial({ color: "#FFD54A" })));
      for (let i = 0; i < 10; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(.22, .9, .1), new THREE.MeshBasicMaterial({ color: "#FFB000" })); const a = i / 10 * Math.PI * 2; r.position.set(Math.cos(a) * 1.95, Math.sin(a) * 1.95, 0); r.rotation.z = a - Math.PI / 2; sun.add(r); } W.sunG = sun;
      W.cust = new THREE.Group(); W.cust.position.set(3.7, 0, .6); W.cust.rotation.y = -.9; s.add(W.cust);
      W.custShirt = M("#2F7DE1"); const body = Cy(.42, .5, 1.5, 10, "#2F7DE1", 0, 1.55, 0); body.material = W.custShirt; W.cust.add(body, Cy(.18, .2, .9, 8, "#3A4150", -.18, .45, 0), Cy(.18, .2, .9, 8, "#3A4150", .18, .45, 0));
      const head = mesh(new THREE.IcosahedronGeometry(.36, 1), "#F2C9A0"); head.position.y = 2.65; W.cust.add(head); const hair = mesh(new THREE.SphereGeometry(.38, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2), "#6E4A2E"); hair.position.y = 2.7; W.cust.add(hair);
      const arm = B(.18, .9, .18, "#F2C9A0", -.45, 2.05, .2); arm.rotation.z = .9; W.cust.add(arm);
      W.stackG = new THREE.Group(); W.stackG.position.set(0, this.CT, 0); W.coneG.add(W.stackG); W.scoopM = []; W.fallM = []; W.tops = [];
      // ice cream scoop: bowl opens upward around the ball, handle runs along +x (the flip axis)
      const sc = new THREE.Group(), flip = new THREE.Group(); sc.add(flip); const br = this.R * 1.12, steel = { metalness: .2, roughness: .4 };
      flip.add(mesh(new THREE.SphereGeometry(br, 14, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), "#D5DAE3", Object.assign({ side: THREE.DoubleSide }, steel)));
      const rim = mesh(new THREE.TorusGeometry(br, .045, 6, 18), "#F4F6FA", steel); rim.rotation.x = Math.PI / 2; flip.add(rim);
      const neck = Cy(.07, .07, .7, 8, "#D5DAE3", br + .3, 0, 0, steel); neck.rotation.z = Math.PI / 2; flip.add(neck);
      const grip = Cy(.16, .14, 1.5, 10, "#FF6FAE", br + 1.35, 0, 0); grip.rotation.z = Math.PI / 2; flip.add(grip);
      const cap = mesh(new THREE.SphereGeometry(.16, 10, 6), "#FF6FAE"); cap.position.x = br + 2.1; flip.add(cap);
      const ball = mesh(new THREE.IcosahedronGeometry(this.R, 1), this.FLAV[0]); flip.add(ball);
      s.add(sc); sc.traverse(o => { o.castShadow = false; }); W.scooper = sc; W.scFlip = flip; W.scBall = ball; W.flip = 0; },
    park(W) { // amusement park around the ice cream stand: plaza, Ferris wheel, roller coaster, carousel, stalls, bunting, balloons, visitors
      const s = W.sc, r = mulberry((W.mg.seed || 1) + 57), CC = ["#E5484D", "#2F7DE1", "#FFC83D", "#1FA35C", "#FF6FAE", "#8E5BE0", "#16B3C9", "#FF8A1F"];
      applySky(s, "def"); s.fog = new THREE.Fog("#D3EAF6", 104, 395);
      s.children.forEach(o => { if (o.isHemisphereLight) { o.intensity = .76; o.groundColor.set("#B98A5A"); } if (o.isDirectionalLight) { o.intensity = .44; o.color.set("#EBE3DC"); const c = o.shadow.camera; c.left = -20; c.right = 20; c.top = 20; c.bottom = -20; c.far = 90; c.updateProjectionMatrix(); o.shadow.mapSize.set(2048, 2048); if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; } o.shadow.normalBias = .03; } });
      const plank = canvasTex(256, 256, (x, w, h) => { const N = 8, ph = h / N, C = ["#B98A5A", "#A97B4E", "#C49565", "#B08251", "#BE8F5E"];
        for (let i = 0; i < N; i++) { const off = (i * 97) % w; x.fillStyle = C[i % 5]; x.fillRect(0, i * ph, w, ph);
          for (let k = 0; k < 7; k++) { const y0 = i * ph + 3 + ((k * 37 + i * 11) % (ph - 6)); x.strokeStyle = "rgba(90,55,25,.18)"; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, y0); x.bezierCurveTo(w * .3, y0 + 2, w * .7, y0 - 2, w, y0 + 1); x.stroke(); }
          x.fillStyle = "rgba(60,35,15,.75)"; x.fillRect(0, i * ph, w, 2.5); x.fillRect(off, i * ph, 2.5, ph); x.fillStyle = "#6B5A48"; [off + 7, off - 7].forEach(nx => [ph * .3, ph * .7].forEach(ny => { x.beginPath(); x.arc((nx + w) % w, i * ph + ny, 1.6, 0, 7); x.fill(); })); } });
      plank.wrapS = plank.wrapT = THREE.RepeatWrapping; plank.repeat.set(21, 22);
      const PW = 84, PZ0 = 26, PZ1 = -64, deck = new THREE.Mesh(new THREE.PlaneGeometry(PW, PZ0 - PZ1), new THREE.MeshStandardMaterial({ map: plank, roughness: .9, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }));
      deck.rotation.x = -Math.PI / 2; deck.position.set(0, -.03, (PZ0 + PZ1) / 2); deck.receiveShadow = true; s.add(deck);
      s.add(B(PW, .5, .5, "#8C6A45", 0, -.3, PZ1), B(.5, .5, PZ0 - PZ1, "#8C6A45", -PW / 2, -.3, (PZ0 + PZ1) / 2), B(.5, .5, PZ0 - PZ1, "#8C6A45", PW / 2, -.3, (PZ0 + PZ1) / 2));
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 500, 44, 32), new THREE.MeshStandardMaterial({ color: "#3A9AD9", roughness: .3, metalness: .1, flatShading: true })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -2.2, -60); s.add(sea);
      W.psea = sea; W.pseaB = Float32Array.from(sea.geometry.attributes.position.array);
      const rail = (x1, z1, x2, z2) => { const L = Math.hypot(x2 - x1, z2 - z1), n = Math.round(L / 2.4); for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, z = z1 + (z2 - z1) * i / n; s.add(B(.22, 1.2, .22, "#F4F6F9", x, .6, z), Cy(.28, .32, 3, 8, "#6E5236", x, -1.6, z)); }
        const ang = Math.atan2(z2 - z1, x2 - x1); [.55, 1.15].forEach(y => { const b = B(L, .12, .14, "#F4F6F9", (x1 + x2) / 2, y, (z1 + z2) / 2); b.rotation.y = -ang; s.add(b); }); };
      rail(-PW / 2 + .3, PZ1 + .3, PW / 2 - .3, PZ1 + .3); rail(-PW / 2 + .3, PZ1 + .3, -PW / 2 + .3, PZ0 - .3); rail(PW / 2 - .3, PZ1 + .3, PW / 2 - .3, PZ0 - .3);
      // Ferris wheel
      const fw = new THREE.Group(); fw.position.set(-15, 0, -27); s.add(fw); const HY = 12.5, RR = 9;
      [-1, 1].forEach(sd => [-1, 1].forEach(sz => { const leg = B(.5, 13.6, .5, "#F4F6F9", sd * 3.2, 6.6, sz * 1.4); leg.rotation.z = sd * .25; leg.rotation.x = -sz * .1; fw.add(leg); }));
      fw.add(Cy(.7, .7, 3.6, 12, "#C9CED8", 0, HY, 0)); fw.children[fw.children.length - 1].rotation.x = Math.PI / 2;
      const wheel = new THREE.Group(); wheel.position.y = HY; fw.add(wheel); W.fwheel = wheel; W.gond = [];
      [-1, 1].forEach(sz => { const rim = new THREE.Mesh(new THREE.TorusGeometry(RR, .22, 6, 48), M("#F4F6F9")); rim.position.z = sz * .9; wheel.add(rim); const rin = new THREE.Mesh(new THREE.TorusGeometry(RR * .55, .14, 6, 36), M("#FF6FAE")); rin.position.z = sz * .9; wheel.add(rin); });
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; [-1, 1].forEach(sz => { const sp = B(.12, RR, .12, "#F4F6F9", Math.cos(a) * RR / 2, Math.sin(a) * RR / 2, sz * .9); sp.rotation.z = a - Math.PI / 2; wheel.add(sp); }); }
      const bulbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.16, 0), new THREE.MeshBasicMaterial({ color: "#FFF1B8" }), 48), bo = new THREE.Object3D(); for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; bo.position.set(Math.cos(a) * (RR + .3), Math.sin(a) * (RR + .3), 1.15); bo.updateMatrix(); bulbs.setMatrixAt(i, bo.matrix); } wheel.add(bulbs);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, g = new THREE.Group(), c = CC[i % 8]; g.position.set(Math.cos(a) * RR, Math.sin(a) * RR, 0); g.add(B(.1, .9, .1, "#C9CED8", 0, -.45, 0), B(1.5, 1.1, 1.3, c, 0, -1.35, 0), B(1.7, .2, 1.5, "#F4F6F9", 0, -.72, 0), B(1.3, .45, 1.32, "#2F3B52", 0, -1.2, 0)); wheel.add(g); W.gond.push(g); }
      // roller coaster on the right, behind the stand
      const cp = [[10, 4, -26], [18, 13, -30], [26, 5, -34], [34, 10, -40], [32, 15, -50], [22, 6, -54], [12, 11, -50], [6, 6, -42], [8, 4, -33]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
      const curve = new THREE.CatmullRomCurve3(cp, true, "catmullrom", .3); W.coaster = curve;
      const track = new THREE.Mesh(new THREE.TubeGeometry(curve, 260, .32, 6, true), M("#E5484D")); s.add(track);
      for (let i = 0; i < 46; i++) { const p = curve.getPointAt(i / 46); s.add(B(.3, p.y, .3, "#F4F6F9", p.x, p.y / 2, p.z)); if (i % 2 === 0) s.add(B(1.4, .14, .14, "#F4F6F9", p.x, p.y * .55, p.z)); }
      W.cars = [0, 1, 2].map(k => { const g = new THREE.Group(); g.add(B(1.6, .7, 1.1, ["#FFC83D", "#2F7DE1", "#1FA35C"][k], 0, .5, 0), B(.4, .5, 1.1, "#151B24", .5, .9, 0)); s.add(g); return g; });
      // carousel on the right, closer
      const car = new THREE.Group(); car.position.set(14, 0, -15); s.add(car); car.add(Cy(5.2, 5.4, .6, 24, "#F4F6F9", 0, .3, 0), Cy(.35, .35, 5, 10, "#FFC83D", 0, 3, 0));
      const top = new THREE.Group(); top.position.y = 5.2; car.add(top); W.carTop = top;
      const can = canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? "#FFFFFF" : "#E5484D"; x.fillRect(i * w / 16, 0, w / 16, h); } });
      const roof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.4, 16), new THREE.MeshStandardMaterial({ map: can, flatShading: true, roughness: .8 })); roof.position.y = 1.2; top.add(roof); top.add(Cy(5.85, 5.85, .7, 16, "#FFC83D", 0, -.1, 0));
      const spin = new THREE.Group(); car.add(spin); W.carSpin = spin; W.horses = [];
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, h = new THREE.Group(), c = ["#F4F6F9", "#FFC2DC", "#B8F2D0", "#FFF3D6"][i % 4]; h.position.set(Math.cos(a) * 3.6, 1.6, Math.sin(a) * 3.6); h.rotation.y = -a;
        h.add(B(.12, 3.6, .12, "#FFC83D", 0, 1.4, 0), B(1.4, .6, .5, c, 0, 0, 0), B(.4, .7, .35, c, .7, .35, 0), B(.5, .25, .3, c, .95, .55, 0), B(.12, .55, .12, c, -.5, -.5, .15), B(.12, .55, .12, c, .5, -.5, -.15), B(.3, .12, .52, "#E5484D", 0, .32, 0)); spin.add(h); W.horses.push(h); }
      // food stalls flanking the ice cream stand
      const pop = new THREE.Group(); pop.position.set(-9.5, 0, -1.5); pop.rotation.y = .35; s.add(pop);
      pop.add(B(2.2, 1.6, 1.4, "#E5484D", 0, 1, 0), B(2.3, .15, 1.5, "#FFFFFF", 0, 1.85, 0), B(2, 1.4, 1.2, "#FFF6C2", 0, 2.6, 0, { transparent: true, opacity: .35 }), B(2.4, .25, 1.6, "#E5484D", 0, 3.4, 0));
      for (let i = 0; i < 8; i++) pop.add(B(.27, 1.55, .04, "#FFFFFF", -.95 + i * .27, 1, .72));
      for (let i = 0; i < 26; i++) { const p = mesh(new THREE.IcosahedronGeometry(.13, 0), "#FFF3C4"); p.position.set((r() - .5) * 1.6, 2 + r() * .5, (r() - .5) * .8); pop.add(p); }
      [-.85, .85].forEach(x => { const w = Cy(.32, .32, .12, 12, "#2A2F3A", x, .32, .75); w.rotation.x = Math.PI / 2; pop.add(w); });
      const cc = new THREE.Group(); cc.position.set(9.5, 0, -1.5); cc.rotation.y = -.35; s.add(cc);
      cc.add(B(2.2, 1.6, 1.4, "#8E5BE0", 0, .8, 0), B(2.3, .15, 1.5, "#FFFFFF", 0, 1.65, 0), Cy(.08, .08, 2.4, 6, "#F4F6F9", -.95, 2.8, -.6), Cy(.08, .08, 2.4, 6, "#F4F6F9", .95, 2.8, -.6), B(2.4, .9, .1, "#FF6FAE", 0, 3.8, -.6));
      [["#FF9FCB", -.6], ["#9FD8FF", 0], ["#FF9FCB", .6]].forEach(([c, x]) => { cc.add(Cy(.03, .03, .8, 5, "#F4F6F9", x, 2.05, .2)); const fl = mesh(new THREE.IcosahedronGeometry(.32, 1), c); fl.position.set(x, 2.55, .2); fl.scale.y = 1.2; cc.add(fl); });
      // bunting over the plaza
      const flagG = new THREE.ConeGeometry(.28, .55, 3); flagG.rotateX(Math.PI); [[-11, -3.2, 11, -3.2, 8.4], [-11, -9.5, 11, -9.5, 9.6]].forEach(([x1, z1, x2, z2, y0]) => { const n = 26; for (let i = 0; i <= n; i++) { const u = i / n, x = x1 + (x2 - x1) * u, z = z1 + (z2 - z1) * u, y = y0 - Math.sin(u * Math.PI) * 1.4; const f = new THREE.Mesh(flagG, M(CC[i % 8])); f.position.set(x, y - .3, z); s.add(f); } [x1, x2].forEach(x => s.add(Cy(.12, .14, y0 + .2, 8, "#3A4150", x, (y0 + .2) / 2, z1))); });
      // lamp posts, planters and trees
      [[-11, 2.5], [11, 2.5], [-6, -11], [6, -11], [-18, -6], [18, -6]].forEach(([x, z]) => { s.add(Cy(.12, .16, 4.6, 8, "#2A2F3A", x, 2.3, z), B(.5, .5, .5, "#2A2F3A", x, 4.7, z)); const lb = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 1), new THREE.MeshBasicMaterial({ color: "#FFF1B8" })); lb.position.set(x, 4.45, z); s.add(lb); });
      [[-13, -.5], [13, -.5], [-20, -12], [20, -12], [-8, -18], [8, -19]].forEach(([x, z]) => { s.add(Cy(1, 1.1, .8, 12, "#C98A4B", x, .4, z)); const t = tree(x, z, 1.1, 1); t.position.y = .5; s.add(t); });
      // visitors milling around the plaza (reuse the cheering crowd)
      const ppl = []; for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = 9 + r() * 14, x = Math.cos(a) * d * 1.2, z = -6 + Math.sin(a) * d * .5; if (Math.abs(x) < 8 && z > -9) continue; ppl.push({ x, y: 0, z, face: r() * 6.28, ph: r() * 6.28, sp: 3 + r() * 3 }); } crowdMeshes(W, ppl); [W.crowd.body, W.crowd.head, W.crowd.arms].forEach(m => m.castShadow = true);
      // drop tower and big-top tent on the horizon
      { const dt = new THREE.Group(); dt.position.set(5, 0, -48); s.add(dt); dt.add(Cy(1, 1.3, 30, 10, "#F4F6F9", 0, 15, 0), Cy(1.6, 1.6, 1, 12, "#2F7DE1", 0, 30.5, 0), Cy(.25, .25, 3, 6, "#E5484D", 0, 32.5, 0)); const ring = new THREE.Group(); ring.add(Cy(2.6, 2.6, 1.2, 16, "#FFC83D", 0, 0, 0)); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ring.add(B(.6, .9, .6, CC[i % 8], Math.cos(a) * 2.7, -.8, Math.sin(a) * 2.7)); } dt.add(ring); W.dropRing = ring; }
      { const tent = new THREE.Group(); tent.position.set(-7, 0, -53); s.add(tent); const st = canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? "#FFFFFF" : "#E5484D"; x.fillRect(i * w / 12, 0, w / 12, h); } }); const tm = new THREE.MeshStandardMaterial({ map: st, flatShading: true, roughness: .85 }); const wall = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 5, 12, 1, true), tm); wall.position.y = 2.5; const top = new THREE.Mesh(new THREE.ConeGeometry(9, 7, 12), tm); top.position.y = 8.5; tent.add(wall, top, Cy(.15, .15, 3, 6, "#FFC83D", 0, 13, 0)); const fl = B(1.4, .8, .05, "#FFC83D", .7, 14, 0); tent.add(fl); }
      // balloons drifting up into the sky
      W.balloons = []; for (let i = 0; i < 7; i++) { const g = new THREE.Group(), b = new THREE.Mesh(new THREE.SphereGeometry(.42, 12, 10), new THREE.MeshStandardMaterial({ color: CC[i % 8], roughness: .25, metalness: .05 })); b.scale.y = 1.2; g.add(b, Cy(.008, .008, 1.4, 3, "#F4F6F9", 0, -1.2, 0)); s.add(g); W.balloons.push({ g, x: (r() - .5) * 30, z: -10 - r() * 20, y: r() * 30, sp: 1 + r() * .8, ph: r() * 6 }); } },
    parkStep(W, dt) { const t = Math.max(0, W.t) + 20;
      W.fwheel.rotation.z = t * .12; W.gond.forEach(g => g.rotation.z = -W.fwheel.rotation.z);
      const u = (t * .045) % 1; W.cars.forEach((c, k) => { const v = (u - k * .012 + 1) % 1, p = W.coaster.getPointAt(v), q = W.coaster.getPointAt((v + .002) % 1); c.position.copy(p); c.lookAt(q); c.rotateY(-Math.PI / 2); });
      W.carSpin.rotation.y = t * .35; W.carTop.rotation.y = t * .35; W.horses.forEach((h, i) => { h.position.y = 1.6 + Math.sin(t * 2.2 + i * 1.4) * .35; });
      W.balloons.forEach(b => { b.y += b.sp * dt; if (b.y > 34) b.y = -2; b.g.position.set(b.x + Math.sin(t * .5 + b.ph) * 1.2, b.y, b.z); b.g.rotation.z = Math.sin(t + b.ph) * .15; b.g.visible = b.y > .5; });
      if (W.psea) { const pa = W.psea.geometry.attributes.position, B0 = W.pseaB; for (let i = 0; i < pa.count; i++) { const x = B0[i * 3], y = B0[i * 3 + 1]; pa.setZ(i, Math.sin(x * .07 + t * 1.1) * .45 + Math.cos(y * .09 + t * .8) * .35); } pa.needsUpdate = true; W.psea.geometry.computeVertexNormals(); }
      if (W.dropRing) { const c = (t * .16) % 1; W.dropRing.position.y = c < .6 ? 4 + c / .6 * 24 : c < .7 ? 28 : 28 - Math.min(1, (c - .7) / .08) ** 2 * 24; }
      crowdStep(W, null, .35); },
    stand(s) { // ice cream stand backdrop behind the cone
      const Z = -6.6, WH = 6.4, dpink = "#FF6FAE", mint = "#9FE8C4";
      s.add(B(14, WH, .4, "#FFF6E8", 0, WH / 2, Z));
      for (let i = 0; i < 7; i++) s.add(B(1, WH - .2, .06, "#FFE3EF", -6 + i * 2, WH / 2, Z + .22));
      s.add(B(7.6, 2.7, .1, "#5A3040", 0, 3.55, Z + .28));
      s.add(B(8, .25, .25, "#FFFFFF", 0, 4.98, Z + .34), B(.25, 2.7, .25, "#FFFFFF", -3.9, 3.55, Z + .34), B(.25, 2.7, .25, "#FFFFFF", 3.9, 3.55, Z + .34));
      for (let i = 0; i < 5; i++) { const x = -3 + i * 1.5; s.add(Cy(.42, .42, .06, 10, "#C9A27A", x, 3.12, Z + .55)); for (let j = 0; j < 2; j++) { const b = mesh(new THREE.IcosahedronGeometry(.34, 1), this.FLAV[(i * 2 + j) % 6]); b.position.set(x + (j - .5) * .36, 3.4 + j * .12, Z + .55 - j * .08); s.add(b); } }
      s.add(B(14.4, 2.2, 1.4, "#FF9FCB", 0, 1.1, Z + 1.05), B(14.6, .14, 1.6, "#FFFFFF", 0, 2.27, Z + 1.05));
      for (let i = 0; i < 12; i++) s.add(B(.55, 1.95, .06, i % 2 ? "#FFFFFF" : dpink, -6.05 + i * 1.1, 1.05, Z + 1.78));
      for (let i = 0; i < 6; i++) { const x = -5 + i * 2; s.add(Cy(.4, .34, .4, 10, "#E8ECF2", x, 2.54, Z + 1.1)); const d = mesh(new THREE.SphereGeometry(.36, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), this.FLAV[i]); d.position.set(x, 2.72, Z + 1.1); s.add(d); }
      const aw = new THREE.Group(); aw.position.set(0, 5.55, Z + .2); aw.rotation.x = .5; s.add(aw); const N = 10, sw = 8.6 / N;
      for (let i = 0; i < N; i++) aw.add(B(sw, .1, 1.9, i % 2 ? "#FFFFFF" : dpink, -4.3 + sw * (i + .5), 0, .95));
      for (let i = 0; i < N; i++) { const h = new THREE.Mesh(new THREE.CircleGeometry(sw / 2, 10, Math.PI, Math.PI), M(i % 2 ? "#FFFFFF" : dpink, { side: THREE.DoubleSide })); h.position.set(-4.3 + sw * (i + .5), -.05, 1.92); h.rotation.x = -.5; aw.add(h); }
      s.add(B(14.8, .35, 1.4, dpink, 0, WH + .17, Z + .1), B(.6, WH, .6, mint, -7.2, WH / 2, Z + .3), B(.6, WH, .6, mint, 7.2, WH / 2, Z + .3));
      s.add(B(6.2, 1.5, .2, "#FFFFFF", 0, WH + 1.15, Z + .1));
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 1.25), new THREE.MeshBasicMaterial({ map: canvasTex(472, 100, (x, w, h) => { x.fillStyle = dpink; x.fillRect(0, 0, w, h); x.font = "64px Bungee, 'Arial Black', Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#7A2E52"; x.fillText("ICE CREAM", w / 2 + 3, h / 2 + 5); x.fillStyle = "#FFFFFF"; x.fillText("ICE CREAM", w / 2, h / 2 + 2); }) }));
      sign.position.set(0, WH + 1.15, Z + .23); s.add(sign);
      const big = new THREE.Group(); big.position.set(5.2, WH + .35, Z + .1); s.add(big);
      const cone = mesh(new THREE.ConeGeometry(.75, 2.2, 10), "#E0A45A"); cone.rotation.x = Math.PI; cone.position.y = 1.1; big.add(cone);
      [["#FFC2DC", 2.45, .95], ["#B8F2D0", 3.35, .8], ["#7A4E3A", 4.1, .62]].forEach(([c, y, r]) => { const b = mesh(new THREE.IcosahedronGeometry(r, 1), c); b.position.y = y; big.add(b); });
      const ch = mesh(new THREE.SphereGeometry(.2, 8, 6), "#E0304A"); ch.position.y = 4.8; big.add(ch); },
    spawn: (W, i) => ({ x: -2.35, z: -3.4, yaw: -1.15 }),
    initEnt(W, e) { hideOthers(W, e); if (e.isMe) e.g.scale.setScalar(1.25); e.st = []; e.fall = null; e.tol = undefined; e.tot = 0; e.sv = null; e.cones = 0; e.goal = 3 + Math.floor(Math.random() * 4); },
    topY(n) { return this.CT + .35 + Math.max(0, n - 1) * this.STEP; },
    xs(st) { let a = 0; return st.map(s => (a += s.dx)); },
    scX(W, e) { return Math.sin(e.ph ?? e.i) * 1.3; },
    heat(W) { return .85 + .65 * Math.max(0, Math.min(1, W.t / this.dur)); },
    value(st) { if (!st.length) return 0; let v = 0, m = 0; st.forEach((s, i) => { v += (i + 1) * 10 + (s.p ? 5 : 0); m += s.m; }); return Math.round(v * (1 - .5 * m / st.length)); },
    weak(st) { const X = this.xs(st); for (let k = -1; k < st.length - 1; k++) { const ab = X.slice(k + 1), com = ab.reduce((a, b) => a + b, 0) / ab.length, base = k < 0 ? 0 : X[k]; if (Math.abs(com - base) > (k < 0 ? .7 : this.R * .95)) return k + 1; } return -1; },
    tap(W, e) { if (e.fall || e.d || e.sv || e.st.length >= 14) return; e.fall = { x: this.scX(W, e), y: e.isMe && W.scY !== undefined ? Math.max(W.scY, this.topY(e.st.length + 1) + .6) : this.topY(e.st.length + 1) + 2.2, vy: 0, f: this.FLAV[(e.st.length + e.cones) % 6] }; if (e.isMe) sfx("click"); },
    serve(W, e) { if (e.d || e.sv || e.fall || !e.st.length) return; e.sv = { t: W.t, n: e.st.length, v: this.value(e.st) }; if (e.isMe) { sfx("battery"); this.toppings(W, e.st.length); } },
    lose(W, e, k, why) { const lost = e.st.length - k; if (lost <= 0) return; if (e.isMe) { this.topple(W, e, k); e.msg = why || `Timber! ${lost} scoop${lost > 1 ? "s" : ""} fell`; e.msgT = W.t; sfx("crush"); W.shake = .35; } e.st.splice(k); },
    rules(W, e, dt) { if (e.d) return; e.ph = (e.ph ?? e.i) + (1.8 + e.st.length * .09) * dt;
      if (e.sv) { if (W.t - e.sv.t >= 1.7) { e.tot += e.sv.v; e.cones++; if (e.isMe) { e.msg = `Served! +${e.sv.v}`; e.msgT = W.t; } e.st = []; e.sv = null; e.goal = 3 + Math.floor(Math.random() * 4); } e.sc = e.tot; return; }
      const h = this.heat(W), n = e.st.length;
      e.st.forEach((s, i) => { s.m = Math.min(1, s.m + h * (.026 + .009 * (n - 1 - i)) * dt); if (i > 0) { const below = e.st[i - 1].m; if (below > .45) s.dx += s.sd * (below - .45) * .32 * dt; } });
      if (n && e.st[0].m >= 1) this.lose(W, e, 0, "Meltdown! The cone collapsed");
      else { const k = this.weak(e.st); if (k >= 0) this.lose(W, e, k); }
      if (e.fall) { e.fall.vy -= 20 * dt; e.fall.y += e.fall.vy * dt; const X = this.xs(e.st), topX = X.length ? X[X.length - 1] : 0, land = this.topY(e.st.length + 1);
        if (e.fall.y <= land) { const dx = e.fall.x - topX, lim = e.st.length ? this.R * 1.8 : .9;
          if (Math.abs(dx) > lim) { if (e.isMe) { this.dropMesh(W, e.fall.x, land, e.fall.f, dx > 0 ? 1 : -1); e.msg = "Missed!"; e.msgT = W.t; sfx("loss"); } }
          else { const p = Math.abs(dx) < .12; e.st.push({ dx, f: e.fall.f, m: 0, p, sd: Math.sign(dx) || (e.st.length % 2 ? 1 : -1) }); const k = this.weak(e.st);
            if (e.isMe) { this.syncMeshes(W, e); sfx("coin"); e.msg = p ? "Perfect! +5" : ""; e.msgT = W.t; W.wob = (W.wob || 0) + dx * .5; }
            if (k >= 0) this.lose(W, e, k); }
          e.fall = null; } }
      e.sc = e.tot; },
    scoopMesh(f) { const g = new THREE.Group(), R = this.R, mat = new THREE.MeshStandardMaterial({ color: f, flatShading: true, roughness: .75 });
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 1), mat); ball.castShadow = true; g.add(ball);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(R * .86, .1, 5, 14), mat); lip.rotation.x = Math.PI / 2; lip.position.y = -R * .42; g.add(lip);
      const drips = []; for (let j = 0; j < 0; j++) { const a = j / 6 * Math.PI * 2 + Math.random() * .6, d = new THREE.Group(); d.position.set(Math.cos(a) * R * .82, -R * .42, Math.sin(a) * R * .82);
        const w = .09 + Math.random() * .05, col = new THREE.Mesh(new THREE.CylinderGeometry(w * 1.25, w * .6, 1, 7), mat); col.position.y = -.5; const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(w * 1.05, 1), mat); tip.position.y = -1; tip.scale.y = 1.3; d.add(col, tip); d.scale.set(1, .001, 1); d.visible = false; g.add(d);
        drips.push({ d, tip, a, th: .1 + Math.random() * .3, len: .16 + Math.random() * .26 }); }
      return { g, ball, lip, mat, drips, f }; },
    syncMeshes(W, e) { const X = this.xs(e.st); while (W.scoopM.length < e.st.length) { const i = W.scoopM.length, q = this.scoopMesh(e.st[i].f); q.g.position.set(X[i], .35 + i * this.STEP, 0); W.stackG.add(q.g); W.scoopM.push(q); burst(W.sc, X[i], this.topY(i + 1), 0, { n: 6, shape: "ico", cols: [e.st[i].f, "#FFFFFF"], spd: 1.5, up: 2, life: .5 }); } },
    topple(W, e, k) { const fallen = W.scoopM.splice(k), dir = Math.sign(this.xs(e.st)[e.st.length - 1] || 1); fallen.forEach((q, j) => { const p = new THREE.Vector3(); q.g.getWorldPosition(p); W.stackG.remove(q.g); q.g.position.copy(p); W.sc.add(q.g); W.fallM.push({ m: q.g, vx: dir * (1.5 + j * .4), vy: 2 + j * .3, t: 0 }); }); },
    dropMesh(W, x, y, f, dir) { const q = this.scoopMesh(f); q.g.position.set(x, y, 0); W.sc.add(q.g); W.fallM.push({ m: q.g, vx: dir * 2, vy: 1, t: 0 }); },
    toppings(W, n) { const top = W.scoopM[W.scoopM.length - 1]; if (!top) return; const R = this.R, add = (o, delay) => { o.scale.setScalar(.001); top.g.add(o); W.tops.push({ o, t: -delay }); };
      const sp = new THREE.Group(); for (let i = 0; i < 34; i++) { const u = Math.random(), v = Math.random() * .85, th = u * Math.PI * 2, ph = v * Math.PI / 2, b = new THREE.Mesh(new THREE.BoxGeometry(.13, .035, .035), M(this.SPRK[i % 6]));
        b.position.set(Math.cos(th) * Math.sin(ph) * R * 1.02, Math.cos(ph) * R * 1.02, Math.sin(th) * Math.sin(ph) * R * 1.02); b.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); sp.add(b); } add(sp, 0);
      if (n >= 3) { const pts = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 6, h = .55 - i / 60 * .75, r = Math.sqrt(Math.max(.02, 1 - (h / R) ** 2)) * R * 1.05; pts.push(new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r + Math.sin(i * .9) * .03)); }
        add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, .055, 6), new THREE.MeshStandardMaterial({ color: "#4A2A18", roughness: .2, metalness: .1 })), .2); }
      if (n >= 4) { const c = new THREE.Group(), wm = M("#FFFDF7", { roughness: .6 }); [[.36, .13, .5], [.27, .12, .66], [.18, .1, .8]].forEach(([r, t, y]) => { const tr = new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, 14), wm); tr.rotation.x = Math.PI / 2; tr.position.y = y; c.add(tr); }); const tip = new THREE.Mesh(new THREE.ConeGeometry(.13, .3, 8), wm); tip.position.y = .98; c.add(tip); add(c, .4); }
      if (n >= 5) { const w = new THREE.Group(); w.add(B(.5, .9, .1, "#E3B16A", 0, 0, 0), B(.52, .06, .12, "#B97A35", 0, .2, 0), B(.52, .06, .12, "#B97A35", 0, -.15, 0)); w.position.set(.32, .85, .05); w.rotation.z = -.35; add(w, .6); }
      if (n >= 6) { const c = new THREE.Group(), ch = new THREE.Mesh(new THREE.IcosahedronGeometry(.19, 1), new THREE.MeshStandardMaterial({ color: "#E0304A", roughness: .2, flatShading: true })); c.add(ch); const st = Cy(.025, .025, .45, 5, "#3E7A2A", .1, .25, 0); st.rotation.z = -.4; c.add(st); c.position.y = n >= 4 ? 1.25 : .7; add(c, .8); } },
    render(W, e, dt) { if (!e.isMe) return; const n = e.st.length, R = this.R; this.parkStep(W, dt);
      W.sunG.rotation.z += dt * .3; W.sunG.scale.setScalar(.8 * (1 + Math.sin(W.t * 2) * .04 + (this.heat(W) - .85) * .3));
      const X = this.xs(e.st); let hy = 0;
      W.scoopM.forEach((q, i) => { const s = e.st[i]; if (!s) return; const m = s.m; q.g.position.set(X[i], .35 + i * this.STEP - hy - m * .12, 0); hy += m * .14;
        q.ball.scale.set(1 + .3 * m, 1 - .42 * m, 1 + .3 * m); q.ball.position.y = -.08 * m; q.lip.scale.set(1 + .38 * m, 1 + .38 * m, 1 - .3 * m); q.mat.roughness = .75 - .55 * m; q.mat.metalness = .12 * m;
        q.drips.forEach(dr => { const k = Math.max(0, (m - dr.th) / (1 - dr.th)), rad = i === 0 ? .78 : R * (.96 + .3 * m); dr.d.visible = k > 0; dr.d.position.set(Math.cos(dr.a) * rad, -R * (.22 + .12 * m), Math.sin(dr.a) * rad); const ln = Math.max(.001, k * dr.len * (i === 0 ? 2.4 : 1)); dr.d.scale.set(1 + k * .35, ln, 1 + k * .35); dr.tip.scale.set(1, Math.min(40, 1.3 / ln), 1); });
        if (q.drips.length && m > .45 && Math.random() < dt * m * 2.2) { const dr = q.drips[Math.floor(Math.random() * 6)], p = new THREE.Vector3(); dr.tip.getWorldPosition(p); burst(W.sc, p.x, p.y, p.z, { n: 1, shape: "ico", cols: [s.f], spd: .15, up: 0, grav: 14, life: .55, size: .13 }); W.pudR = Math.min(1.25, W.pudR + .012); W.pud.material.color.set(s.f); } });
      W.pud.scale.setScalar(Math.max(.01, W.pudR)); W.pudR = Math.max(0, W.pudR - dt * .004);
      const sv = e.sv, k = sv ? W.t - sv.t : 0;
      if (sv) W.coneG.position.x = k < .95 ? 0 : Math.min(4.2, (k - .95) / .7 * 4.2) ** 1.2;
      else { if (W.svWas) { W.coneIn = W.t; W.scoopM.forEach(q => W.stackG.remove(q.g)); W.scoopM = []; W.tops = []; W.custShirt.color.set(["#2F7DE1", "#1FA35C", "#FF8A1F", "#8E5BE0", "#E5484D", "#16B3C9"][e.cones % 6]); }
        const ci = W.coneIn === undefined ? 1 : Math.min(1, (W.t - W.coneIn) / .45); W.coneG.position.x = -4 * (1 - ci) * (1 - ci); }
      W.svWas = !!sv;
      W.tops.forEach(tp => { tp.t += dt; const u = Math.max(0, Math.min(1, tp.t / .22)); tp.o.scale.setScalar(Math.max(.001, u < 1 ? u * 1.2 : 1 + Math.max(0, .2 - (tp.t - .22)))); if (tp.t > 0 && !tp.pop) { tp.pop = 1; sfx("click"); } });
      W.cust.position.y = sv && k > 1.3 ? Math.abs(Math.sin((k - 1.3) * 12)) * .15 : 0;
      const top = this.topY(n + 1) + 2.2, x = this.scX(W, e); W.scooper.visible = !sv; W.scY = W.scY === undefined ? top : W.scY + (top - W.scY) * (1 - Math.exp(-dt * 7)); W.scooper.position.set(x, W.scY, 0); W.scBall.material = M(this.FLAV[(n + e.cones) % 6], { vertexColors: true });
      W.flip += ((e.fall ? Math.PI : 0) - W.flip) * (1 - Math.exp(-dt * (e.fall ? 22 : 9))); W.scFlip.rotation.x = -W.flip;
      W.scBall.scale.setScalar(e.fall ? .01 : Math.min(1, W.scBall.scale.x + dt * 5));
      W.wob = (W.wob || 0) * Math.exp(-dt * 2); W.stackG.rotation.z = Math.sin(W.t * 7) * W.wob * .08 - (X.slice(-1)[0] || 0) * .03 - (n ? e.st[0].m * Math.sign(X[n - 1] || 1) * .06 : 0);
      if (e.fall) { if (!W.fm) { W.fm = mesh(new THREE.IcosahedronGeometry(R, 1), e.fall.f); W.fm.castShadow = false; W.sc.add(W.fm); } W.fm.visible = true; W.fm.material = M(e.fall.f, { vertexColors: true }); W.fm.position.set(e.fall.x, e.fall.y, 0); } else if (W.fm) W.fm.visible = false;
      W.fallM = W.fallM.filter(f => { f.t += dt; f.vy -= 18 * dt; f.m.position.x += f.vx * dt; f.m.position.y = Math.max(R * .5, f.m.position.y + f.vy * dt); f.m.rotation.z -= f.vx * dt * (f.m.position.y > R * .55 ? 1 : 0); if (f.m.position.y <= R * .55) { f.vx *= .85; f.m.scale.set(Math.min(1.5, f.m.scale.x + dt * .8), Math.max(.3, f.m.scale.y - dt * 2.5), Math.min(1.5, f.m.scale.z + dt * .8)); } if (f.t > 3.5) { W.sc.remove(f.m); return false; } return true; });
      const val = sv ? sv.v : this.value(e.st); setTxt("cxcount", String(n)); setTxt("svval", String(val)); setTxt("cxstat", sv ? "SERVING" : e.fall ? "DROPPING" : "READY");
      const b = document.getElementById("cxwrap"); if (b) b.dataset.state = sv || e.fall ? "loading" : "ready"; const sb = document.getElementById("svbtn"); if (sb) sb.classList.toggle("off", !!sv || !n); },
    cam(W, t, p, far) { const n = W.me.sv ? W.me.sv.n + 1 : W.me.st.length, top = this.topY(Math.max(1, n)) + 2.2, lo = this.CT - 1.6, mid = lo + (top - lo) * .5, d = (6.5 + (top - lo) * .95) * far; return [new THREE.Vector3(0, mid, 0), new THREE.Vector3(0, mid + d * .22, d)]; },
    prompt: (W, e) => e.msg && W.t - e.msgT < 1.4 ? e.msg : "",
    bot(W, e) { if (e.fall || e.sv) return; const n = e.st.length;
      if (n && (n >= e.goal || e.st[0].m > .55 || (n >= 2 && e.st[0].m > .4 && Math.random() < .02))) { this.serve(W, e); return; }
      e.tol = e.tol ?? (.04 + Math.random() * .45); const X = this.xs(e.st), topX = X.length ? X[X.length - 1] : 0; if (Math.abs(this.scX(W, e) - topX) < e.tol) { this.tap(W, e); e.tol = undefined; } },
    ctlHTML() { return `<div class="tapall tp-drop cx-pink" id="cxwrap" data-state="ready"><span class="tp-panel"><button class="svb off" id="svbtn" aria-label="Serve the cone"><small>SERVE</small><em id="svval">0</em></button><button class="tp-mush" id="cxbtn" aria-label="Drop a scoop"><b>SCOOP</b></button><span class="tp-count"><em id="cxcount">0</em><small> <span id="cxstat">READY</span></small></span></span></div>`; },
    wire() { cxWireBtn(document.getElementById("cxbtn"), () => { if (W && W.t >= 0 && !W.me.d) this.tap(W, W.me); }); cxWireBtn(document.getElementById("svbtn"), () => { if (W && W.t >= 0 && !W.me.d) this.serve(W, W.me); }); },
    onKey(W, k, down) { if (!down) return; if (k === " " || k === "arrowdown" || k === "s") this.tap(W, W.me); else if (k === "enter" || k === "arrowup" || k === "w") this.serve(W, W.me); },
    final: (W, e) => e.tot,
    botScore: () => 250 + rnd(400) },

  /* ---- Garbo: Sort It Out ---- */
  sort: { name: "Sort It Out", special: true, msgTop: true, kind: "station", ctrl: "custom", hi: true, unit: "pts", dur: 35, bare: true,
    how: "Send each piece of trash to the right bin. Wrong bin costs points.",
    tapHint: "Tap a bin, or use the arrow keys / WASD.",
    CATS: [{ k: "plastic", n: "Plastic", c: "#2F7DE1", pos: [-2.25, .2], keys: ["arrowleft", "a"], i: "◀" }, { k: "metal", n: "Metal", c: "#8E96A3", pos: [0, -3.2], keys: ["arrowup", "w"], i: "▲" }, { k: "wood", n: "Wood", c: "#A0673A", pos: [2.25, .2], keys: ["arrowright", "d"], i: "▶" }, { k: "compost", n: "Compost", c: "#1FA35C", pos: [0, 3.9], keys: ["arrowdown", "s"], i: "▼" }],
    build(W) { const s = W.sc; this.plant(s);
      decal(s, new THREE.CircleGeometry(1.1, 16), "#FFC83D", 0, .02, 0, .5); s.add(Cy(.75, .85, .5, 10, "#3A4150", 0, .25, 0));
      const belt = B(1.6, .3, 6, "#23272F", 0, .45, -6.4); s.add(belt, B(1.8, .5, 6, "#5A6272", 0, .1, -6.4));
      this.CATS.forEach(c => { const g = new THREE.Group(); g.position.set(c.pos[0], 0, c.pos[1]);
        g.add(B(1.7, 1.3, 1.5, c.c, 0, .65, 0), B(1.8, .12, 1.6, "#151B24", 0, 1.32, 0), B(1.3, .02, 1.1, "#0B0E14", 0, 1.39, 0));
        const lab = textSprite(c.n.toUpperCase(), "#151B24", "#FFFFFF", 1.6); lab.position.y = 2.1; g.add(lab); s.add(g); c.g = g; });
      const r = mulberry((W.mg.seed || 1) + 5); W.seq = []; for (let i = 0; i < 220; i++) W.seq.push({ cat: this.CATS[Math.floor(r() * 4)].k, v: Math.floor(r() * 3) });
      W.flyM = []; },
    plant(s) { // Garbo's recycling plant; the camera looks almost straight down, so the details sit around the bins
      const Z = -10.5, G = "#2E9E5B"; const fl = B(46, .4, 38, "#6E757F", 0, -.2, -2); fl.castShadow = false; s.add(fl);
      for (let x = -21; x <= 21; x += 3) decal(s, new THREE.PlaneGeometry(.05, 34), "#5B616B", x + 1.5, .005, -2);
      for (let z = -19; z <= 15; z += 3) decal(s, new THREE.PlaneGeometry(44, .05), "#5B616B", 0, .005, z + .5);
      [-4.2, 4.2].forEach(x => decal(s, new THREE.PlaneGeometry(.2, 26), "#FFC83D", x, .012, 0));
      [[-2.6, 2.6, .55], [3.1, -6.2, .45], [-3.6, -2.2, .4]].forEach(([x, z, r]) => decal(s, new THREE.CircleGeometry(r, 12), "#4A4F57", x, .014, z, .6));
      s.add(B(46, 10, .5, "#7A948A", 0, 5, Z), B(.5, 10, 38, "#7A948A", -23, 5, -2), B(.5, 10, 38, "#7A948A", 23, 5, -2));
      for (let x = -22; x <= 22; x += 1.4) s.add(B(.24, 10, .12, "#688378", x, 5, Z + .3));
      s.add(B(46, .5, .7, "#FFC83D", 0, .25, Z + .45));
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.1), new THREE.MeshBasicMaterial({ map: canvasTex(360, 62, (x, w, h) => { x.fillStyle = G; x.fillRect(0, 0, w, h); x.font = "30px Bungee, 'Arial Black', Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#FFFFFF"; x.fillText("GARBO RECYCLING", w / 2, h / 2 + 2); }) }));
      sign.position.set(-6.2, 2.6, Z + .45); s.add(sign);
      const inc = B(1.6, .25, 3.4, "#23272F", 0, 1.35, -10.1); inc.rotation.x = -.5; s.add(inc); [-.9, .9].forEach(x => s.add(B(.16, 2.3, .16, "#5A6272", x, 1.15, -9.9)));
      const bale = (x, y, z, c, str) => { s.add(B(1.6, 1.15, 1.2, c, x, y + .575, z)); [-.45, .45].forEach(o => s.add(B(.06, 1.2, 1.26, str, x + o, y + .575, z))); };
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2 - (i === 2); j++) bale(-4.9 + i * 1.75, j * 1.18, -8.9, "#B98A55", "#6B4A2B");
      for (let i = 0; i < 2; i++) bale(-6.65 - i * 1.75, 0, -8.9, i ? "#8FCBEF" : "#6FB7E8", "#2F5DE1");
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2 - (i === 0); j++) s.add(B(1.25, 1.25, 1.25, j ? "#AEB6C1" : "#8E96A3", 1.9 + i * 1.4, .63 + j * 1.27, -8.9));
      const cp = new THREE.Group(); cp.position.set(-8.4, 0, -3.2); cp.add(B(2.8, 2.4, 2.4, G, 0, 1.2, 0), B(2.4, .6, 2, "#23272F", 0, 2.7, 0), B(2.82, .4, 2.42, "#FFC83D", 0, .4, 0), B(.3, 1, .3, "#C9CED8", 0, 3.5, 0)); s.add(cp);
      for (let i = 0; i < 4; i++) { const x = 7.8, z = -.8 + i * 1.05; s.add(B(.8, 1.1, .8, i === 2 ? "#2F7DE1" : G, x, .55, z), B(.86, .1, .86, "#23272F", x, 1.15, z)); }
      const pal = (x, z) => { s.add(B(1.3, .16, 1.1, "#B8793F", x, .08, z)); [[-.25, -.2], [.28, .1], [0, .3], [-.1, -.3]].forEach(([a, b], k) => { const m = mesh(new THREE.IcosahedronGeometry(.36, 0), "#2A2F3A"); m.position.set(x + a, .45 + (k > 2) * .35, z + b); m.scale.y = .8; s.add(m); }); };
      pal(-6.6, 2.6); pal(-7.9, 4);
      const n = 140, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([(Math.random() - .5) * 18, .5 + Math.random() * 6, -10 + Math.random() * 14], i * 3);
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); this.motes = new THREE.Points(g, new THREE.PointsMaterial({ color: "#FFF3D0", size: .07, transparent: true, opacity: .7, depthWrite: false })); s.add(this.motes); },
    spawn: (W, i) => ({ x: 4.8, z: -3.5, yaw: Math.PI * .8 }),
    initEnt(W, e) { hideOthers(W, e); e.n = 0; e.combo = 0; e.cur = null; e.gap = .8; },
    item(cat, v) { const g = new THREE.Group(), glass = { transparent: true, opacity: .8, roughness: .15 };
      if (cat === "plastic") {
        if (v === 0) g.add(Cy(.22, .22, .78, 12, "#9FD8FF", 0, .45, 0, glass), Cy(.22, .12, .16, 12, "#9FD8FF", 0, .92, 0, glass), Cy(.08, .08, .14, 10, "#2F7DE1", 0, 1.07, 0), Cy(.225, .225, .26, 12, "#FFFFFF", 0, .45, 0));
        else if (v === 1) { g.add(B(.62, .72, .46, "#F4F7FA", 0, .42, 0, glass), Cy(.1, .1, .14, 10, "#2F7DE1", -.14, .86, 0)); const h = mesh(new THREE.TorusGeometry(.14, .045, 6, 10, Math.PI), "#F4F7FA"); h.position.set(.14, .78, 0); g.add(h); g.add(B(.64, .16, .48, "#2F7DE1", 0, .38, 0)); }
        else g.add(Cy(.2, .22, .66, 10, "#35C0A0", 0, .36, 0), B(.14, .26, .14, "#FFFFFF", 0, .82, 0), B(.24, .08, .08, "#FFFFFF", .12, .92, 0), B(.08, .18, .08, "#FFFFFF", -.02, .72, .1)); }
      else if (cat === "metal") {
        if (v === 0) { g.add(Cy(.22, .22, .6, 14, "#E5484D", 0, .32, 0, { metalness: .15, roughness: .45 }), Cy(.2, .22, .05, 14, "#EEF1F5", 0, .64, 0, { metalness: .15, roughness: .45 }), Cy(.22, .2, .05, 14, "#EEF1F5", 0, .01, 0, { metalness: .15, roughness: .45 }), B(.14, .02, .05, "#9AA3AE", .06, .675, 0), B(.46, .12, .01, "#FFFFFF", 0, .34, .225)); }
        else if (v === 1) { g.add(Cy(.26, .26, .5, 14, "#DCE1E8", 0, .27, 0, { metalness: .15, roughness: .45 }), Cy(.265, .265, .26, 14, "#FFC83D", 0, .27, 0)); [.06, .48].forEach(y => g.add(Cy(.27, .27, .03, 14, "#B8C0CB", 0, y, 0, { metalness: .15, roughness: .45 }))); }
        else { const w = new THREE.Group(); w.add(B(.95, .1, .16, "#C3CAD4", 0, 0, 0, { metalness: .15, roughness: .45 }), Cy(.2, .2, .1, 6, "#C3CAD4", .52, 0, 0, { metalness: .15, roughness: .45 }), B(.18, .12, .1, "#5A6272", .62, 0, 0), Cy(.16, .16, .1, 6, "#C3CAD4", -.52, 0, 0, { metalness: .15, roughness: .45 })); w.children[1].rotation.x = Math.PI / 2; w.children[3].rotation.x = Math.PI / 2; w.position.y = .12; w.rotation.y = .5; g.add(w); } }
      else if (cat === "wood") {
        if (v === 0) { g.add(B(1.3, .16, .38, "#B8793F", 0, .12, 0)); [-.45, .45].forEach(x => g.add(Cy(.04, .04, .05, 6, "#5A6272", x, .21, 0))); [-.1, .08].forEach(z => g.add(B(1.3, .01, .02, "#8C5A2C", 0, .205, z))); }
        else if (v === 1) { for (let k = 0; k < 3; k++) g.add(B(.8, .14, .06, "#C98A4B", 0, .15 + k * .22, .34), B(.8, .14, .06, "#C98A4B", 0, .15 + k * .22, -.34), B(.06, .14, .68, "#C98A4B", .37, .15 + k * .22, 0), B(.06, .14, .68, "#C98A4B", -.37, .15 + k * .22, 0)); g.add(B(.8, .05, .74, "#A06A34", 0, .03, 0)); }
        else { const l = Cy(.24, .26, 1.1, 9, "#8C5A3C", 0, .26, 0); l.rotation.z = Math.PI / 2; const e1 = Cy(.2, .2, .02, 9, "#E8C48E", .56, .26, 0), e2 = Cy(.2, .2, .02, 9, "#E8C48E", -.56, .26, 0); e1.rotation.z = e2.rotation.z = Math.PI / 2; g.add(l, e1, e2, Cy(.08, .08, .021, 8, "#B8793F", .565, .26, 0)); g.children[3].rotation.z = Math.PI / 2; } }
      else {
        if (v === 0) { for (let k = 0; k < 7; k++) { const a = -.9 + k * .3, b = B(.2, .2, .22, k === 0 || k === 6 ? "#6B4A2B" : "#FFD93D", Math.sin(a) * .55, .2 + (1 - Math.cos(a)) * .55, 0); b.rotation.z = a; g.add(b); } }
        else if (v === 1) { const a = mesh(new THREE.IcosahedronGeometry(.34, 1), "#E5484D"); a.position.y = .36; a.scale.y = .9; g.add(a, B(.05, .2, .05, "#6B4A2B", 0, .74, 0)); const lf = B(.22, .03, .12, "#4CAF50", .12, .76, 0); lf.rotation.z = -.4; g.add(lf); }
        else { const c = mesh(new THREE.ConeGeometry(.18, .95, 8), "#FF8A1F"); c.rotation.z = Math.PI / 2; c.position.set(-.1, .2, 0); g.add(c); [-.2, 0, .2].forEach(a => { const t = B(.32, .05, .08, "#4CAF50", .5, .26 + a * .3, a * .3); t.rotation.z = a; g.add(t); }); } }
      g.scale.setScalar(1.35); return g; },
    next(W, e) { const c = W.seq[e.n % W.seq.length]; e.cur = { cat: c.cat, v: c.v, t0: W.t }; e.n++;
      if (e.isMe) { if (W.curM) W.sc.remove(W.curM); W.curM = this.item(c.cat, c.v); W.curM.position.set(0, .5, -4); W.sc.add(W.curM); W.curIn = 0; } },
    sortTo(W, e, idx) { if (!e.cur || e.d || W.t < 0) return; const c = this.CATS[idx], ok = c.k === e.cur.cat;
      if (ok) e.sc += 10; else e.sc = Math.max(0, e.sc - 5);
      if (e.isMe) { const m = W.curM; W.curM = null; if (m) W.flyM.push({ m, from: m.position.clone(), to: new THREE.Vector3(c.pos[0], 1.5, c.pos[1]), t: 0, ok }); sfx(ok ? "coin" : "loss"); e.msg = ok ? "+10" : `Not ${c.n.toLowerCase()}! −5`; e.msgT = W.t;
        const b = document.querySelector(`[data-bin="${idx}"]`); if (b) { b.classList.add(ok ? "good" : "bad"); setTimeout(() => b.classList.remove("good", "bad"), 250); } }
      e.cur = null; e.gap = .22; },
    rules(W, e, dt) { if (e.d) return; if (!e.cur) { e.gap -= dt; if (e.gap <= 0 && W.t >= 0) this.next(W, e); } },
    render(W, e, dt) { if (!e.isMe) return;
      { const p = this.motes.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * (.15 + (i % 5) * .05); if (y > 6.5) y = .5; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(W.t * .6 + i) * dt * .12); } p.needsUpdate = true; }
      if (W.curM) { W.curIn = Math.min(1, (W.curIn || 0) + dt * 5); const k = W.curIn; W.curM.position.set(0, .5 + Math.sin(k * Math.PI) * 1.2, -4 + k * 4); W.curM.rotation.y += dt * 1.5; }
      W.flyM = W.flyM.filter(f => { f.t += dt * 3; const k = Math.min(1, f.t); f.m.position.lerpVectors(f.from, f.to, k); f.m.position.y += Math.sin(k * Math.PI) * 2; f.m.rotation.x += dt * 8; if (k >= 1) { W.sc.remove(f.m); if (f.ok) burst(W.sc, f.to.x, 1.5, f.to.z, { n: 6, cols: ["#FFFFFF", "#FFC83D"], spd: 2, up: 3, life: .5 }); return false; } return true; });
    },
    cam: (W, t, p, far) => [new THREE.Vector3(0, .2, .6), new THREE.Vector3(0, 10.5 * far, 8.3 * far)],
    prompt: (W, e) => e.msg && W.t - e.msgT < .8 ? e.msg : "",
    bot(W, e, dt) { if (!e.cur) return; e.bt = (e.bt ?? .55 + Math.random() * .7) - dt; if (e.bt > 0) return; e.bt = undefined; const right = this.CATS.findIndex(c => c.k === e.cur.cat); this.sortTo(W, e, Math.random() < .87 ? right : rnd(4)); },
    ctlHTML() { const b = i => { const c = this.CATS[i]; return `<button class="cxbin" data-bin="${i}" style="--bc:${c.c}"><i>${c.i}</i><b>${c.n}</b></button>`; };
      return `<div class="cx cx-sort"><div class="cxpad">${b(1)}${b(0)}${b(3)}${b(2)}</div></div>`; },
    wire() { document.querySelectorAll(".cxbin").forEach(el => cxWireBtn(el, () => { if (W && W.t >= 0) this.sortTo(W, W.me, +el.dataset.bin); })); },
    onKey(W, k, down) { if (!down) return; const i = this.CATS.findIndex(c => c.keys.includes(k)); if (i >= 0) this.sortTo(W, W.me, i); },
    botScore: () => 150 + rnd(250) },

  /* ---- Taco Tina: Taco Tower ---- */
  taco: { name: "Taco Tower", special: true, msgTop: true, kind: "station", ctrl: "custom", hi: true, unit: "pts", dur: 45, bare: true, night: true,
    how: "Build each taco to match the order. Faster tacos score more.",
    tapHint: "Tap ingredients in order. Hold salsa and cheese, let go in the green.",
    ORDER: ["tortilla", "meat", "beans", "lettuce", "salsa", "cheese"],
    ING: { tortilla: { n: "Tortilla", i: "🫓", c: "#F3DBA2" }, meat: { n: "Meat", i: "🥩", c: "#8C4A2F" }, beans: { n: "Beans", i: "🫘", c: "#7A2E2E" }, lettuce: { n: "Lettuce", i: "🥬", c: "#4CAF50" }, salsa: { n: "Salsa", i: "🍅", c: "#E5484D", hold: true }, cheese: { n: "Cheese", i: "🧀", c: "#FFC83D", hold: true } },
    market(W) { // inside Tina's truck, looking out of the serving hatch at a night market
      const s = W.sc, T = "#1FB5A8", glow = c => M(c, { emissive: c, emissiveIntensity: .9 });
      const st = B(60, .4, 50, "#2B2F3A", 0, -.2, -18); st.castShadow = false; s.add(st); s.add(B(7.4, .3, 4, "#4A5060", 0, -.12, .4));
      s.add(B(.5, 6, .8, T, -3.55, 3, -1.9), B(.5, 6, .8, T, 3.55, 3, -1.9), B(7.6, .5, .8, T, 0, 5.75, -1.9), B(7.6, .16, .86, "#FFC83D", 0, 5.42, -1.9));
      const flap = B(7.6, .14, 2.6, "#FFC83D", 0, 6.2, -3); flap.rotation.x = .5; s.add(flap);
      // queue of customers and other stalls
      const SH = ["#E5484D", "#2F7DE1", "#FFC83D", "#8E5BE0", "#1FA35C", "#FF8A1F"], SK = ["#F2C9A0", "#D9A273", "#A8714A", "#6E4A2E"];
      W.crowdT = []; [[.4, -4.6], [1.3, -5.6], [.9, -6.7], [1.8, -7.8], [-3.2, -6.4], [-4.6, -8.4], [4.4, -9.6]].forEach(([x, z], i) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(B(.55, .9, .4, SH[i % SH.length], 0, 1.05, 0), B(.22, .6, .22, "#2A2F3A", -.13, .3, 0), B(.22, .6, .22, "#2A2F3A", .13, .3, 0)); const h = mesh(new THREE.IcosahedronGeometry(.26, 1), SK[i % SK.length]); h.position.y = 1.78; g.add(h); g.rotation.y = (Math.random() - .5) * .6; s.add(g); W.crowdT.push({ g, ph: i * 1.3, ry: g.rotation.y }); });
      const stall = (x, z, c, name) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.add(B(3.2, 1.1, 1.4, "#8C5A3C", 0, .55, 0), B(3.4, .12, 1.6, "#E9EDF2", 0, 1.16, 0), B(.14, 2.6, .14, "#E9EDF2", -1.55, 1.3, -.6), B(.14, 2.6, .14, "#E9EDF2", 1.55, 1.3, -.6));
        for (let i = 0; i < 6; i++) { const a = B(.58, .1, 1.8, i % 2 ? "#FFFFFF" : c, -1.45 + i * .58, 2.7, .1); a.rotation.x = .25; g.add(a); }
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .6), new THREE.MeshBasicMaterial({ map: canvasTex(208, 48, (x, w, h) => { x.fillStyle = "#151B24"; x.fillRect(0, 0, w, h); x.font = "26px Bungee, 'Arial Black', Impact, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = c; x.fillText(name, w / 2, h / 2 + 2); }) })); sg.position.set(0, 3.25, .75); g.add(sg); s.add(g); };
      stall(-5.2, -10, "#FF6FAE", "CHURROS"); stall(5.6, -11.5, "#FFC83D", "ELOTES"); stall(-9.5, -14, "#8E5BE0", "AGUAS"); stall(1.2, -15.5, "#2F7DE1", "TORTAS");
      // buildings with lit windows across the street
      for (let i = 0; i < 7; i++) { const x = -24 + i * 8, h = 8 + (i * 37 % 5) * 1.6, c = ["#4A3A5A", "#3E4A66", "#5A3F4A"][i % 3]; s.add(B(7.6, h, 4, c, x, h / 2, -21));
        for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) if ((i + r + q) % 3) { const wn = new THREE.Mesh(new THREE.BoxGeometry(1, 1.1, .1), glow((i + q) % 2 ? "#FFD58A" : "#FFB86B")); wn.position.set(x - 2.3 + q * 2.3, 2.5 + r * 2.4, -18.94); s.add(wn); } }
      // string lights and paper banners zig-zagging over the street
      const BUL = ["#FFC83D", "#FF8A1F", "#FF6FAE", "#7CF0A8"], PAP = ["#E5484D", "#FFC83D", "#2F7DE1", "#1FA35C", "#FF6FAE", "#8E5BE0"];
      for (let k = 0; k < 4; k++) { const z = -6 - k * 3, y0 = 4.4 + (k % 2) * .4; for (let i = 0; i <= 16; i++) { const x = -14 + i * 1.75, sag = Math.sin(i / 16 * Math.PI) * .9, y = y0 - sag;
          const b = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), glow(BUL[(i + k) % 4])); b.position.set(x, y, z); s.add(b);
          if (k % 2 && i < 16) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(.8, .7), M(PAP[(i + k) % 6], { side: THREE.DoubleSide })); fl.position.set(x + .87, y - .45, z + .05); s.add(fl); } } }
      [-9, 9].forEach(x => { s.add(Cy(.12, .14, 6, 8, "#2A2F3A", x, 3, -5)); const l = new THREE.Mesh(new THREE.SphereGeometry(.35, 10, 8), glow("#FFE7B0")); l.position.set(x, 6.2, -5); s.add(l); }); W.bulbM = BUL.map(c => glow(c)); },
    recipe(W, k) { const r = mulberry((W.mg.seed || 1) + k * 97), p = ["meat", "beans", "lettuce", "salsa", "cheese"], n = Math.min(5, 2 + Math.ceil((k + 1) / 2)), out = ["tortilla"]; while (out.length < n + 1 && p.length) out.push(p.splice(Math.floor(r() * p.length), 1)[0]); return out; },
    build(W) { const s = W.sc; this.market(W);
      s.add(B(6, 1.1, 3, "#1FB5A8", 0, .55, 0), B(6.2, .14, 3.2, "#E9EDF2", 0, 1.17, 0), B(6.2, .5, .2, "#FFC83D", 0, .9, 1.55));
      for (let i = 0; i < 8; i++) { const l = Cy(.12, .12, .2, 8, ["#FF8A1F", "#FFC83D", "#E5484D", "#8E5BE0"][i % 4], -3.5 + i, 3.6, -2.2, { emissive: "#FFC83D", emissiveIntensity: .6 }); s.add(l); }
      s.add(B(8, .05, .05, "#151B24", 0, 3.75, -2.2), Cy(1.35, 1.25, .1, 24, "#FFFFFF", 0, 1.29, 0), (() => { const r = mesh(new THREE.TorusGeometry(1.29, .045, 6, 28), "#1FB5A8"); r.rotation.x = Math.PI / 2; r.position.y = 1.345; return r; })());
      const tg = new THREE.Group(); tg.position.set(0, 1.36, 0); s.add(tg); W.tacoG = tg; W.oldTacos = []; W.parts = []; W.spawnQ = [];
      const bt = new THREE.Group(); bt.add(Cy(.22, .22, .7, 10, "#E5484D", 0, 0, 0), Cy(.1, .04, .25, 8, "#FFFFFF", 0, -.47, 0)); bt.visible = false; bt.position.set(0, 3.2, 0); s.add(bt); W.bottle = bt;
      const gr = new THREE.Group(); gr.add(B(.5, .7, .3, "#C9CED8", 0, 0, 0), B(.12, .4, .12, "#1D2230", 0, .5, 0)); gr.visible = false; gr.position.set(0, 3.2, 0); s.add(gr); W.grater = gr; },
    spawn: (W, i) => ({ x: -5, z: -3, yaw: Math.PI * .2 }),
    initEnt(W, e) { hideOthers(W, e); e.tk = 0; e.step = 0; e.rec = this.recipe(W, 0); e.hold = null; e.t0 = 0; },
    piece(W, ing) { const d = this.ING[ing]; let m, sz = .12;
      if (ing === "meat") { m = mesh(new THREE.DodecahedronGeometry(.13, 0), d.c); sz = .13; }
      else if (ing === "beans") { m = mesh(new THREE.IcosahedronGeometry(.08, 0), d.c); m.scale.set(1.3, .8, .8); sz = .07; }
      else if (ing === "lettuce") { m = B(.3, .03, .18, d.c, 0, 0, 0); sz = .03; }
      else if (ing === "salsa") { m = mesh(new THREE.IcosahedronGeometry(.08, 0), d.c); m.scale.set(1.4, .6, 1.4); sz = .05; }
      else { m = B(.26, .035, .035, d.c, 0, 0, 0); sz = .035; }
      m.rotation.y = Math.random() * 6; return { m, sz }; },
    drop(W, ing, x, z, y = 2.4) { const p = this.piece(W, ing); p.m.position.set(x, y, z); W.tacoG.add(p.m); W.parts.push({ m: p.m, sz: p.sz, vx: (Math.random() - .5) * .6, vz: (Math.random() - .5) * .6, vy: 0, rest: false }); },
    addLayer(W, ing) { const g = W.tacoG;
      if (ing === "tortilla") { const tor = new THREE.Group(), col = this.ING.tortilla.c; const hA = mesh(new THREE.CylinderGeometry(1.15, 1.15, .06, 16, 1, false, 0, Math.PI), col), hB = mesh(new THREE.CylinderGeometry(1.15, 1.15, .06, 16, 1, false, Math.PI, Math.PI), col);
        const fold = new THREE.Group(); fold.add(hB); tor.add(hA, fold); for (let k = 0; k < 7; k++) { const sp = Cy(.08 + Math.random() * .06, .08, .01, 6, "#C9975A", (Math.random() - .5) * 1.6, .035, (Math.random() - .5) * 1.6); (sp.position.x < 0 ? hB : hA).add(sp); }
        tor.position.y = 2.2; g.add(tor); W.tor = { g: tor, fold, vy: 0, landed: false }; return; }
      for (let k = 0; k < 8; k++) { const x = .34 + Math.random() * .5, zr = Math.sqrt(Math.max(0, 1 - x * x)) * .85; W.spawnQ.push({ ing, at: k * .045, x, z: (Math.random() - .5) * 2 * zr }); } },
    apply(W, e, ing, fill) { if (e.d || W.t < 0) return; const need = e.rec[e.step];
      if (ing !== need) { e.sc = Math.max(0, e.sc - 5); if (e.isMe) { e.msg = "Wrong ingredient! −5"; e.msgT = W.t; sfx("loss"); W.shake = .15; } return; }
      let pts = 5, q = ""; if (fill !== null) { if (fill >= .62 && fill <= .9) { pts = 12; q = "Perfect pour!"; } else if (fill >= .4 && fill <= 1.05) { pts = 6; q = "Good"; } else { pts = 1; q = fill > 1.05 ? "Way too much!" : "Too little!"; } }
      e.sc += pts; e.step++; if (e.isMe) { if (fill === null) this.addLayer(W, ing); sfx("coin"); e.msg = q; e.msgT = W.t; }
      if (e.step >= e.rec.length) { const bonus = 20 + Math.max(0, Math.round(20 - (W.t - e.t0) * 2)); e.sc += bonus;
        if (e.isMe) { e.msg = `Taco done! +${bonus}`; e.msgT = W.t; sfx("event"); let fa = 2.7; W.parts.forEach(p => { if (!p.rest) { if (p.m.parent) p.m.parent.remove(p.m); return; } if (!W.tor) return; if (p.m.position.x < .12 && p.m.parent === W.tacoG) W.tor.fold.attach(p.m); else fa = Math.min(fa, Math.PI - Math.atan2(p.m.position.y + p.sz + .06, Math.max(.06, p.m.position.x))); });
          W.oldTacos.push({ g: W.tacoG, tor: W.tor, t: 0, fa: Math.max(1.75, fa) }); const ng = new THREE.Group(); ng.position.set(0, 1.36, 0); W.sc.add(ng); W.tacoG = ng; W.tor = null; W.parts = []; W.spawnQ = []; }
        e.tk++; e.step = 0; e.rec = this.recipe(W, e.tk); e.t0 = W.t; } },
    press(W, e, ing, down) { if (!e || e.d || W.t < 0) return; const d = this.ING[ing];
      if (down) { if (d.hold) { if (e.rec[e.step] !== ing) { this.apply(W, e, ing, null); return; } e.hold = { ing, t0: W.t, last: 0 }; } else this.apply(W, e, ing, null); }
      else if (e.hold && e.hold.ing === ing) { const f = (W.t - e.hold.t0) / 1.2; e.hold = null; this.apply(W, e, ing, f); } },
    rules(W, e) { if (e.hold && (W.t - e.hold.t0) / 1.2 > 1.3) { const ing = e.hold.ing; e.hold = null; this.apply(W, e, ing, 1.3); } if (e.t0 === 0 && W.t > 0 && e.tk === 0 && e.step === 0) e.t0 = W.t; },
    render(W, e, dt) { if (!e.isMe) return;
      W.crowdT.forEach(c => { c.g.position.y = Math.abs(Math.sin(W.t * 1.4 + c.ph)) * .05; c.g.rotation.y = c.ry + Math.sin(W.t * .5 + c.ph) * .25; }); W.bulbM.forEach((m, k) => m.emissiveIntensity = .75 + Math.sin(W.t * 3 + k * 1.7) * .15 - (Math.random() < .015 ? .5 : 0));
      if (W.tor && !W.tor.landed) { const T = W.tor; T.vy -= 16 * dt; T.g.position.y += T.vy * dt; if (T.g.position.y <= .02) { T.g.position.y = .02; if (T.vy < -2) T.vy *= -.25; else { T.vy = 0; T.landed = true; } } }
      W.spawnQ = W.spawnQ.filter(q => { q.at -= dt; if (q.at <= 0) { this.drop(W, q.ing, q.x, q.z); return false; } return true; });
      const bottle = e.hold && e.hold.ing === "salsa", grate = e.hold && e.hold.ing === "cheese", sx = .55 + Math.sin(W.t * 2.6) * .25;
      W.bottle.visible = !!bottle; W.grater.visible = !!grate; const tool = bottle ? W.bottle : grate ? W.grater : null;
      if (tool) { tool.position.set(sx, 3.25, Math.cos(W.t * 1.7) * .45); tool.rotation.z = bottle ? Math.PI * .85 : Math.sin(W.t * 20) * .08; e.hold.last -= dt; if (e.hold.last <= 0) { e.hold.last = .07; this.drop(W, e.hold.ing, tool.position.x + (Math.random() - .5) * .15, tool.position.z, 1.6); } }
      const P = W.parts, base = W.tor && W.tor.landed ? .08 : .0;
      P.forEach(p => { if (p.rest) return; p.vy -= 18 * dt; p.m.position.x += p.vx * dt; p.m.position.z += p.vz * dt; p.m.position.y += p.vy * dt;
        const x = p.m.position.x, z = p.m.position.z, onT = Math.hypot(x, z) < (base > 0 ? 1.1 : 1.3); let gnd = onT ? base : -5;
        if (onT) for (const q of P) if (q.rest && Math.hypot(q.m.position.x - x, q.m.position.z - z) < .17) gnd = Math.max(gnd, q.m.position.y + q.sz);
        if (p.m.position.y - p.sz <= gnd) { p.m.position.y = gnd + p.sz; if (onT && gnd - base > .22 && (p.slid || 0) < 4) { p.slid = (p.slid || 0) + 1; const a = Math.random() * 6.28; p.vx = Math.cos(a) * 1.4; p.vz = Math.sin(a) * 1.4; p.vy = .6; p.m.position.y += .02; } else if (p.vy < -2.5) { p.vy *= -.3; p.vx *= .5; p.vz *= .5; } else { p.rest = true; p.m.rotation.x = (Math.random() - .5) * .5; } }
        if (p.m.position.y < -3) { W.tacoG.remove(p.m); p.rest = true; } });
      W.oldTacos = W.oldTacos.filter(o => { o.t += dt; if (o.tor) o.tor.fold.rotation.z = -Math.min(1, o.t / .45) * (o.fa || 2.62); if (o.t > .55) o.g.position.x = (o.t - .55) * 11; if (o.t > 1.6) { W.sc.remove(o.g); return false; } return true; });
      const key = e.tk + ":" + e.step; if (W.recKey !== key) { W.recKey = key; const r = document.getElementById("cxrec"); if (r) r.innerHTML = e.rec.map((k, i) => `<span class="${i < e.step ? "ok" : i === e.step ? "now" : ""}">${this.ING[k].i}</span>`).join(""); }
      const pb = document.getElementById("cxpour"); if (pb) { pb.hidden = !e.hold; if (e.hold) { const f = Math.min(1.3, (W.t - e.hold.t0) / 1.2); pb.style.setProperty("--f", f.toFixed(3)); setTxt("cxpourn", `${this.ING[e.hold.ing].i} ${this.ING[e.hold.ing].n}: release in the green!`); pb.classList.toggle("over", f > 1.05); } }
      document.querySelectorAll(".cxing").forEach(b => b.classList.toggle("pour", !!(e.hold && e.hold.ing === b.dataset.ing))); },
    cam: (W, t, p, far) => [new THREE.Vector3(0, 1.7, -.3), new THREE.Vector3(0, 1.7 + 4.3 * far, 6.4 * far)], // flatter angle so the market shows behind the counter
    prompt: (W, e) => e.msg && W.t - e.msgT < 1.2 ? e.msg : "",
    bot(W, e, dt) { e.bt = (e.bt ?? .6 + Math.random() * .7) - dt; if (e.bt > 0) return; e.bt = undefined; const need = e.rec[e.step], ing = Math.random() < .88 ? need : this.ORDER[rnd(6)];
      this.apply(W, e, ing, this.ING[ing].hold ? .45 + Math.random() * .55 : null); },
    ctlHTML() { return `<div class="cxpour" id="cxpour" hidden><b id="cxpourn"></b><span class="pm"><u></u><s></s><i></i></span></div><div class="cx cx-taco"><div class="cxrec" id="cxrec"></div><div class="cxgrid">${this.ORDER.map((k, i) => { const d = this.ING[k]; return `<button class="cxing ${d.hold ? "hold" : ""}" data-ing="${k}"><i>${d.i}</i><b>${d.n}</b>${d.hold ? `<small>hold</small>` : ""}<em>${i + 1}</em></button>`; }).join("")}</div></div>`; },
    wire() { document.querySelectorAll(".cxing").forEach(el => cxWireBtn(el, () => { if (W) this.press(W, W.me, el.dataset.ing, true); }, () => { if (W) this.press(W, W.me, el.dataset.ing, false); })); },
    onKey(W, k, down) { const i = "123456".indexOf(k); if (i >= 0 && k.length === 1) this.press(W, W.me, this.ORDER[i], down); },
    botScore: () => 150 + rnd(200) },

  /* ---- Rusty: Tow Rescue ---- */
  tow: { name: "Tow Rescue", special: true, msgTop: true, kind: "arena", ctrl: "stick", hi: true, unit: "rescued", dur: 45, bound: { t: "sq", h: 17 }, water: false, bare: true, storm: true, sun: [15.8, 14, 9.5],
    how: "Hook stuck cars and tow each one to the garage of its colour. Ram towing trucks to steal their car.",
    GAR: [[0, -15.4, "#E5484D", "RED"], [15.4, 0, "#2F7DE1", "BLUE"], [0, 15.4, "#FFC83D", "YELLOW"], [-15.4, 0, "#1FA35C", "GREEN"]],
    garage(W, x, z, col, name) { const s = W.sc, g = new THREE.Group(), ns = Math.abs(z) > Math.abs(x); g.position.set(x, 0, z); if (!ns) g.rotation.y = Math.PI / 2; s.add(g);
      const out = ns ? Math.sign(z) : Math.sign(x);
      decal(s, new THREE.CircleGeometry(2.1, 24), col, x, .06, z, .42);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, .1, 6, 28), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .7 })); ring.rotation.x = Math.PI / 2; ring.position.set(x, .12, z); s.add(ring);
      const bz = out * 2.6; [[-2.6, bz], [2.6, bz], [-2.6, -bz * .9], [2.6, -bz * .9]].forEach(([px, pz]) => g.add(B(.3, 3.2, .46, "#5A6272", px, 1.6, pz)));
      g.add(B(5.1, 2.7, .25, col, 0, 1.35, bz), B(5.14, .3, .36, "#F4F6F9", 0, 2.6, bz), B(5.14, .3, .36, "#2A3140", 0, .16, bz));
      const rm = new THREE.MeshStandardMaterial({ color: col, roughness: .6, transparent: true, opacity: 1 }), roof = new THREE.Group(); roof.position.y = 3.3; g.add(roof);
      [-1, 1].forEach(sd => { const p = new THREE.Mesh(new THREE.BoxGeometry(2.95, .2, sd < 0 ? 5.9 : 5.82), rm); p.position.set(sd * 1.38, .38, 0); p.rotation.z = -sd * .27; p.castShadow = true; roof.add(p);
        const n = 18, rib = new THREE.InstancedMesh(new THREE.BoxGeometry(2.95, .05, .07), rm, n), o = new THREE.Object3D(); for (let i = 0; i < n; i++) { o.position.set(0, .12, -2.72 + i * 5.44 / (n - 1)); o.updateMatrix(); rib.setMatrixAt(i, o.matrix); } p.add(rib); }); /* sheet-metal ribs running down the slope; same material so they fade with the roof */
      const rd = new THREE.Mesh(new THREE.BoxGeometry(.3, .26, 5.96), new THREE.MeshStandardMaterial({ color: "#F4F6F9", transparent: true, opacity: 1 })); rd.position.y = .78; roof.add(rd);
      ring.userData.roof = [rm, rd.material]; ring.userData.fade = 1; ring.userData.at = [x, z];
      return ring; },
    build(W) { const s = W.sc; this.night(W); const mud = B(36, 1, 36, "#5E4E3A", 0, -.6, 0); mud.castShadow = false; s.add(mud); this.mudF(W); this.farm(W);
      W.garRings = this.GAR.map(([x, z, col, name]) => this.garage(W, x, z, col, name));
      const r = mulberry((W.mg.seed || 1) + 11), cols = ["#E5484D", "#2F7DE1", "#FFC83D", "#8E5BE0", "#1FA35C", "#FF8A1F", "#16B3C9", "#F5F7FA"]; W.cars = []; W.carPos = {}; W.seenCd = new Set();
      let tries = 0; while (W.cars.length < 22 && tries++ < 1500) { const x = (r() - .5) * 30, z = (r() - .5) * 30; if (Math.hypot(x, z) < 4.5 || this.GAR.some(G => Math.hypot(G[0] - x, G[1] - z) < 5) || W.cars.some(c => Math.hypot(c.x - x, c.z - z) < 3.6) || W.pudR.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + 1.6)) continue;
        const id = W.cars.length + 1, t = id <= 10 ? 0 : id <= 16 ? 14 : 28, g = new THREE.Group(), gi = id % 4, c = this.GAR[gi][2];
        this.car(W, g, c);
        const pud = new THREE.Group(), tilt = [(r() - .5) * .22, (r() < .5 ? -1 : 1) * (.1 + r() * .12)]; g.rotation.order = "YXZ"; g.position.set(x, -.2, z); g.rotation.set(tilt[0], r() * 6, tilt[1]); s.add(g);
        if (!W.carSh) W.carSh = [new THREE.PlaneGeometry(2.7, 1.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: .55, depthWrite: false, map: canvasTex(64, 64, (q, w, h) => { const gr = q.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.45, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); q.fillStyle = gr; q.fillRect(0, 0, w, h); }) })];
        { const sh = new THREE.Mesh(W.carSh[0], W.carSh[1]); sh.renderOrder = 1; pud.add(sh); pud.position.set(x, .015, z); pud.rotation.y = g.rotation.y; s.add(pud); }
        const line = B(.05, .05, 1, "#1D2230", 0, 0, 0); line.visible = false; s.add(line);
        g.visible = pud.visible = t === 0; W.cars.push({ id, x, z, t, g, pud, line, gi, tilt }); }
      this.ground(W); this.mist(W); },
    night(W) { /* tuned in the light panel: ambient .44, sun .14, height 14, angle 31, warmth .64, haze 102 */
      const h = W.sc.children.find(o => o.isHemisphereLight); if (h) h.intensity = .44; W.sun.intensity = .14; W.sun.color.set("#E4EEFF").lerp(new THREE.Color("#FFC27A"), .64); W.lpWarm = .64; if (W.sc.fog) { W.sc.fog.near = 102; W.sc.fog.far = 102 * 3.8; } },
    car(W, g, c) { /* stuck car in the player-truck style: wedge body and cabin with rounded edges, glass on the faces, bumpers, lamps, blinking hazard lights */
      const cb = (w, h, d, col, x, y, z, o) => { const m = mesh(chamferBox(w, h, d, Math.min(.075, Math.min(w, h, d) * .2)), col, o); m.position.set(x, y, z); return m; };
      if (!W.hazM) W.hazM = []; const hz = new THREE.MeshStandardMaterial({ color: "#B8741F", emissive: "#FF8A00", emissiveIntensity: 0 }); hz.userData.ph = Math.random(); hz.userData.rate = 1.17 * (.9 + Math.random() * .2); W.hazM.push(hz); const lamp = { emissive: "#FFF1C2", emissiveIntensity: 1.2 }, tail = { emissive: "#E5484D", emissiveIntensity: .8 };
      const pr = (P, d, r, cs, col, o) => mesh(chamferPrism(P, d, r, cs) || chamferBox(1.9, .42, d, .06), col, o), gls = { roughness: .2, metalness: .3 }, GC = "#3E5570";
      g.add(pr([[-.95, .2], [.95, .2], [.97, .45], [.8, .62], [-.82, .62], [-.97, .45]], .95, .06, [0, 0, .05, .08, .08, .05], c)); /* body: flat bottom, rounded wedge nose and tail */
      g.add(pr([[-.702, .5], [.463, .5], [.16, .98], [-.5, .98]], .82, .05, [0, 0, .06, .06], c), /* bottom sunk .12 into the body so its bevelled lower edge is hidden and the sides meet the body flat */ cb(.16, .16, 1, "#353A46", .93, .28, 0), cb(.16, .16, 1, "#353A46", -.93, .28, 0)); /* cabin with sloped windscreen and rear window */
      const pane = (len, w, x, y, a) => { const m = B(.03, len, w, GC, x, y, 0, gls); m.rotation.z = a; return m; }; /* glass centre .006 off the sloped faces (outer side ~.02 proud), like the player trucks */
      g.add(pane(.284, .66, .274 + .845 * .006, .8 + .534 * .006, .564), pane(.26, .6, -.576 - .922 * .006, .8 + .388 * .006, Math.atan2(.388, -.922)));
      [-1, 1].forEach(sd => [[[-.06, .7], [.22, .7], [.1, .9], [-.06, .9]], [[-.51, .7], [-.14, .7], [-.14, .9], [-.43, .9]]].forEach(P => { const m = pr(P, .03, .008, [], GC, gls); m.position.z = sd * (.41 - .005); /* outer side .01 proud, like the player trucks */ g.add(m); })); /* two side windows each side, body pillar between */
      [-1, 1].forEach(sd => { g.add(B(.05, .1, .2, "#FFF6C2", .975, .38, sd * .26, lamp), B(.05, .1, .2, "#E5484D", -.975, .38, sd * .26, tail)); [.975, -.975].forEach(x => { const m = new THREE.Mesh(new THREE.BoxGeometry(.05, .08, .1), hz); m.position.set(x, .38, sd * .4); g.add(m); }); });
      [[-.6, .45], [.6, .45], [-.6, -.45], [.6, -.45]].forEach(([wx, wz]) => { const w = Cy(.22, .22, .18, 14, "#2A2E36", wx, .22, wz), hb = Cy(.12, .12, .2, 10, "#D8DDE5", wx, .22, wz); w.rotation.x = hb.rotation.x = Math.PI / 2; g.add(w, hb); }); },
    mist(W) { /* ground mist: thin layers hugging the floor plus slow low puffs; none cast shadows */
      const s = W.sc, r = mulberry((W.mg.seed || 1) + 57);
      [[.15, .07], [.45, .05], [.9, .04], [1.5, .025], [2.4, .012]].forEach(([y, op]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(110, 40), new THREE.MeshBasicMaterial({ color: "#8E9AAB", transparent: true, opacity: op, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 4; s.add(m); });
      const puff = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, "rgba(160,172,188,.8)"); g.addColorStop(.5, "rgba(150,162,178,.35)"); g.addColorStop(1, "rgba(150,162,178,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
      W.mistP = []; const pg = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: puff, transparent: true, opacity: .12 + r() * .08, depthWrite: false })); m.scale.set(7 + r() * 5, 1, 4 + r() * 3); m.rotation.y = r() * 3.14; /* lying flat above the mud, so it never cuts into the ground with a hard line */ m.renderOrder = 4; s.add(m); W.mistP.push({ m, a: r() * 6.28, d: 4 + r() * 26, y: .3 + r() * .4, sp: (r() < .5 ? -1 : 1) * (.012 + r() * .02), ph: r() * 6.28 }); } },
    headl(W, e) { /* night driving: one 3D light cone per truck (no real light): a see-through beam plus the patch it lights on the ground, same start point and spread, and lens glows */
      if (e.gone) return; if (!W.hlTex) W.hlTex = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.3, "rgba(255,240,200,.55)"); g.addColorStop(1, "rgba(255,240,200,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
      const bb = new THREE.Box3().setFromObject(e.tr), fx = bb.max.x - .02, hy = .42, hl = new THREE.Group(); e.g.add(hl); e.hl = hl; /* turned by yaw only in render, so the truck body lean does not swing the beam */
      [-1, 1].forEach(sd => { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.hlTex, color: "#FFE9B0", transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(.75); gl.position.set(fx + .06, hy, sd * .3); hl.add(gl); });
      if (!W.beamG) { const L = 6, BR = L * Math.tan(.45), side = ez => { const q = Math.max(0, Math.min(1, (ez - .8) / .2)); return 1 - q * q * (3 - 2 * q); }; /* crisp sides, only the outer fifth smoothed */
        const G = new THREE.ConeGeometry(BR, L, 48, 1, true); G.translate(0, -L / 2, 0); G.rotateZ(Math.PI / 2); G.scale(1, hy / BR * .95, 1); /* round-ish cone whose underside just reaches the ground at its far end */
        let P = G.attributes.position, C = []; for (let i = 0; i < P.count; i++) { const x = P.getX(i), ez = x > .01 ? Math.min(1, Math.abs(P.getZ(i)) / (BR * x / L)) : 0, k = Math.max(0, 1 - x / L) * side(ez); C.push(k, k, k * .85); } G.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
        const F = new THREE.PlaneGeometry(L, 2 * BR, 16, 24).rotateX(-Math.PI / 2); P = F.attributes.position; C = []; for (let i = 0; i < P.count; i++) { const x = P.getX(i) + L / 2, z = P.getZ(i) * x / L, ez = x > .01 ? Math.abs(z) / (BR * x / L) : 0, k = Math.min(1, x / (.12 * L)) * Math.pow(Math.max(0, 1 - x / L), 1.3) * side(ez); P.setXYZ(i, x, 0, z); C.push(k, k, k * .85); } F.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
        const mat = op => new THREE.MeshBasicMaterial({ color: "#FFE7B5", vertexColors: true, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
        W.beamG = [G, mat(.09), F, mat(.32)]; }
      const bm = new THREE.Mesh(W.beamG[0], W.beamG[1]); bm.position.set(fx, hy, 0); bm.renderOrder = 5; const pool = new THREE.Mesh(W.beamG[2], W.beamG[3]); pool.position.set(fx, .07, 0); pool.renderOrder = 5; hl.add(bm, pool); },
    mudF(W) { const r = mulberry((W.mg.seed || 1) + 41), ph = Array.from({ length: 6 }, () => r() * 6.28);
      const nz = (x, z) => Math.sin(x * .29 + ph[0]) * Math.sin(z * .33 + ph[1]) + .6 * Math.sin(x * .71 + z * .43 + ph[2]) + .35 * Math.sin(x * 1.6 - z * 1.25 + ph[3]) + .2 * Math.sin(x * 2.9 + z * 2.3 + ph[4]);
      const h0 = (x, z) => -.025 * (nz(x, z) / 2.15 + 1), k = (x, z) => 1 + h0(x, z) * 4 + Math.sin(x * .17 + ph[5]) * Math.sin(z * .21 - ph[5]) * .06;
      const tex = canvasTex(128, 128, (x, w, h) => { x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const dk = r() < .6, v = dk ? 80 + Math.floor(r() * 60) : 205 + Math.floor(r() * 45), rad = .25 + Math.pow(r(), 3) * 3.2;
        x.fillStyle = "rgba(" + v + "," + (v - 8) + "," + (v - 20) + "," + (dk ? .04 + r() * .04 : .03 + r() * .03).toFixed(3) + ")"; x.beginPath(); x.ellipse(r() * w, r() * h, rad, rad * (.6 + r() * .4), r() * 3.14, 0, 6.3); x.fill(); } });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8, 8);
      W.mud = { r, h0, k, base: new THREE.Color("#6B5A44"), mat: new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: .92, metalness: 0 }) }; },
    ground(W) { const M = W.mud, r = M.r, S = 36, n = 96, G = new THREE.PlaneGeometry(S, S, n, n); G.rotateX(-Math.PI / 2);
      const P = G.attributes.position, C = [], base = M.base, flat = [];
      (W.pudR || []).forEach(([x, z, R, py]) => flat.push([x, z, R + .3, py])); this.GAR.forEach(([x, z]) => flat.push([x, z, 3.4, 0]));
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i);
        let h = M.h0(x, z) - r() * .006, f = Math.min(1, (S / 2 - Math.max(Math.abs(x), Math.abs(z))) / .8);
        let tgt = 0; flat.forEach(([fx, fz, fr, fy]) => { const q = Math.max(0, (Math.hypot(x - fx, z - fz) - fr) / 2); if (q < f) { f = q; tgt = fy; } }); f = Math.max(0, f); f = f * f * (3 - 2 * f);
        P.setY(i, tgt + (h - tgt) * f); const k = M.k(x, z) + (r() - .5) * .04; C.push(base.r * k, base.g * k, base.b * k); }
      G.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); G.computeVertexNormals();
      const m = new THREE.Mesh(G, M.mat); m.receiveShadow = true; W.sc.add(m); },
    farm(W) { // storm-soaked farm around the mud lot: fence, fields, barn, silo, farmhouse, hay, puddles, rain
      const s = W.sc, r = mulberry((W.mg.seed || 1) + 23), WD = "#8C6A45";
      [[0, -64, 220, 92], [0, 64, 220, 92], [-64, 0, 92, 36], [64, 0, 92, 36]].forEach(([x, z, w, d]) => { const g0 = B(w, .4, d, "#5B7442", x, -.25, z); g0.castShadow = false; s.add(g0); });
      for (let i = -18; i <= 18; i += 3) if (Math.abs(i) > 2.9) [[i, -18], [i, 18], [-18, i], [18, i]].forEach(([x, z]) => s.add(B(.28, 1.3, .28, WD, x, .65, z)));
      [[0, -18, 0], [0, 18, 0], [-18, 0, 1], [18, 0, 1]].forEach(([x, z, v]) => [.45, .95].forEach((y, j) => { for (let q = -18; q < 18; q += 3) { if (q === -3 || q === 0 || r() < .12) continue; const rl = B(v ? .12 : 3, .14, v ? 3 : .12, j ? "#A07C52" : WD, v ? x : q + 1.5, y, v ? q + 1.5 : z); if (r() < .15) rl.rotation[v ? "x" : "z"] = (r() - .5) * .6; s.add(rl); } }));
      W.pudP = []; W.berm = null; W.pudR = []; const pud = (x, z, rx, rz) => { const R = 1.9 * Math.max(rx, rz) + .3; if (W.pudR.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + R) || this.GAR.some(G => Math.hypot(G[0] - x, G[1] - z) < R + 3)) return false; const py = Math.abs(x) < 18 && Math.abs(z) < 18 ? W.mud.h0(x, z) : -.045; W.pudR.push([x, z, R, py]); this.puddle(W, x, z, rx, rz, py, 0); W.pudP.push([x, z, rx, rz, py]); return true; };
      for (let i = 0, t = 0; i < 9 && t < 300; t++) if (pud((r() - .5) * 30, (r() - .5) * 30, .6 + r() * 1.2, .4 + r() * .8)) i++; for (let i = 0, t = 0; i < 14 && t < 300; t++) { const a = r() * 6.28, d = 21 + r() * 14; if (pud(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 2, .7 + r() * 1.4)) i++; }
      W.berm = null;
      const fld = B(26, .14, 16, "#5B4632", 33, -.02, -6); fld.castShadow = false; s.add(fld); for (let z = -13.5; z <= 1.5; z += 1.1) s.add(B(25, .2, .35, "#4A3827", 33, .06, z));
      const barn = new THREE.Group(); barn.position.set(-28, 0, -24); barn.rotation.y = .35; s.add(barn);
      barn.add(B(9, 5.2, 11, "#B3322C", 0, 2.6, 0)); [-1, 1].forEach(sd => { const rf = B(5.6, .3, 11.6, "#4A4F5A", sd * 2.35, 6.3, 0); rf.rotation.z = -sd * .55; barn.add(rf); });
      barn.add(B(3.4, 3.8, .12, "#8E2520", 0, 1.9, 5.52), B(3.6, .22, .16, "#F4F6F9", 0, 3.85, 5.56)); [-1, 1].forEach(sd => { const x = B(.2, 4.6, .14, "#F4F6F9", 0, 1.9, 5.58); x.rotation.z = sd * .72; barn.add(x); });
      s.add(Cy(2, 2, 11, 14, "#A9B0B8", -19, 5.5, -29), (() => { const d = mesh(new THREE.SphereGeometry(2, 14, 7, 0, 6.29, 0, 1.57), "#8E96A3"); d.position.set(-19, 11, -29); return d; })());
      const fh = new THREE.Group(); fh.position.set(26, 0, -30); fh.rotation.y = -.3; s.add(fh); fh.add(B(8, 4.4, 6, "#F2EBDD", 0, 2.2, 0), B(1.2, 2, .1, "#6B4A2B", 0, 1, 3.03)); [-2.6, 2.6].forEach(x => fh.add(B(1.3, 1.2, .1, "#FFE7B0", x, 2.6, 3.03))); [-1, 1].forEach(sd => { const rf = B(4.8, .3, 6.6, "#4A4F5A", sd * 2, 5.3, 0); rf.rotation.z = -sd * .5; fh.add(rf); });
      for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = 22 + r() * 9, h = Cy(.9, .9, 1.6, 12, "#D9B55A", Math.cos(a) * d, .9, Math.sin(a) * d); h.rotation.set(Math.PI / 2, 0, a); s.add(h); }
      for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = 26 + r() * 16; s.add(tree(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * .7, 0)); }
      const n = 520, pos = new Float32Array(n * 6); W.rainD = []; for (let i = 0; i < n; i++) W.rainD.push([(r() - .5) * 60, r() * 26, (r() - .5) * 50]);
      const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); W.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: "#D6E2EE", transparent: true, opacity: .45 })); W.rain.frustumCulled = false; s.add(W.rain); W.boltT = 5 + r() * 6; W.trk = tyreTracks(W, "#96918B", "#FFFFFF", 800, 10, 1, true); W.rip = ripples(W, "#D6E2EE"); },
    render(W, e, dt) { if (e.hl) e.hl.rotation.y = e.yaw; if (W.rainT === W.t) return; W.rainT = W.t; // rain and lightning, once per frame
      const p = W.rain.geometry.attributes.position.array, cx = W.me.x * .85, cz = W.me.z * .85;
      W.rainD.forEach((d, i) => { d[1] -= 24 * dt; if (d[1] < 0) { d[1] += 26; if (Math.random() < .04) burst(W.sc, cx + d[0], .1, cz + d[2], { n: 1, shape: "ico", cols: ["#D6E2EE"], spd: .5, up: 1.2, grav: 8, life: .25, size: .25 }); }
        const x = cx + d[0], z = cz + d[2]; p.set([x, d[1], z, x + .12, d[1] + .9, z], i * 6); });
      W.rain.geometry.attributes.position.needsUpdate = true;
      tyreStep(W, W.trk, dt); rippleStep(W, dt); for (let k = 0; k < 2; k++) if (Math.random() < dt * 5) { const p = W.pudP[Math.floor(Math.random() * W.pudP.length)], a = Math.random() * 6.28; W.rip(p[0] + Math.cos(a) * p[2] * .6, p[4] + .065, p[1] + Math.sin(a) * p[3] * .6, .05, .45, .7); }
      W.list.forEach(q => { if (q.gone || !q.al) return; const sp = Math.hypot(q.vx || 0, q.vz || 0); if (sp > 5 && Math.random() < dt * sp * .6) burst(W.sc, q.x - Math.cos(q.yaw) * 1, .3, q.z + Math.sin(q.yaw) * 1, { n: 1, shape: "ico", cols: ["#4A3A28", "#6B5A44"], spd: 1.2, up: 2.5, grav: 14, life: .5, size: .5 }); });
      W.boltT -= dt; if (W.boltT <= 0) { W.boltT = 7 + Math.random() * 8; W.flash = 1; setTimeout(() => sfx("thunder"), 500 + Math.random() * 900); }
      W.flash = Math.max(0, (W.flash || 0) - dt * 4); if (W.pudMats) W.pudMats[0].emissive.setScalar(W.flash * .4); W.sun.intensity = .14 + W.flash * (W.flash > .5 ? 2.2 : 1.2);
      if (W.hazM) W.hazM.forEach(m => { const u = m.userData; m.emissiveIntensity = ((W.t * u.rate + u.ph) % 1 + 1) % 1 < .5 ? 2.2 : 0; });
      W.mistP.forEach(q => { const a = q.a + q.sp * W.t; q.m.position.set(Math.cos(a) * q.d, q.y + Math.sin(W.t * .4 + q.ph) * .12, Math.sin(a) * q.d); }); },
    spawn: ringSpawn(3.5), initEnt(W, e) { e.f = { tow: 0, cd: [] }; this.headl(W, e); },
    pudEnv(W) { if (W.pudEnv) return W.pudEnv; const r = mulberry(5);
      const face = k => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
        if (k === 1) { x.fillStyle = "#6A7684"; x.fillRect(0, 0, 64, 64); } else if (k === 2) { x.fillStyle = "#2E3828"; x.fillRect(0, 0, 64, 64); return c; }
        else { const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, "#6A7684"); g.addColorStop(.52, "#56636F"); g.addColorStop(.6, "#465440"); g.addColorStop(1, "#2E3828"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
        for (let i = 0; i < 16; i++) { x.fillStyle = r() < .5 ? "rgba(214,224,234,.55)" : "rgba(40,48,58,.5)"; x.beginPath(); x.ellipse(r() * 64, k === 1 ? r() * 64 : r() * 30, 6 + r() * 14, 3 + r() * 7, 0, 0, 6.3); x.fill(); }
        return c; };
      W.pudEnv = new THREE.CubeTexture([face(0), face(0), face(1), face(2), face(0), face(0)]); W.pudEnv.needsUpdate = true; return W.pudEnv; },
    puddle(W, x, z, rx, rz, y, mud) { const r = mulberry(Math.round(x * 97 + z * 131) + 7), N = 30, ph = [r() * 6.28, r() * 6.28, r() * 6.28], g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = r() * 6.28; W.sc.add(g);
      const Rf = a => 1 + .16 * Math.sin(2 * a + ph[0]) + .09 * Math.sin(3 * a + ph[1]) + .05 * Math.sin(5 * a + ph[2]);
      const ring = (k, add) => { const o = []; for (let i = 0; i < N; i++) { const a = i / N * 6.2832, q = Rf(a) * k; o.push([Math.cos(a) * (q * rx + add), Math.sin(a) * (q * rz + add)]); } return o; };
      const geo = (rings, cols, yy) => { const P = [], C = [], Nn = [], I = []; rings.forEach((rg, j) => { const c = new THREE.Color(cols[j][0]); rg.forEach(([px, pz]) => { P.push(px, yy, pz); Nn.push(0, 1, 0); C.push(c.r, c.g, c.b, cols[j][1]); }); });
        for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < N; i++) { const a = j * N + i, b = j * N + (i + 1) % N; I.push(a, a + N, b, b, a + N, b + N); }
        const G = new THREE.BufferGeometry(); G.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); G.setAttribute("normal", new THREE.Float32BufferAttribute(Nn, 3)); G.setAttribute("color", new THREE.Float32BufferAttribute(C, 4)); G.setIndex(I); return G; };
      if (!W.pudMats) { const env = this.pudEnv(W), po = k => ({ transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 - k, polygonOffsetUnits: -4 - k * 2 });
        W.pudMats = [new THREE.MeshPhongMaterial(Object.assign({ vertexColors: true, shininess: 90, specular: "#B8C8D6", envMap: env, combine: THREE.MixOperation, reflectivity: .34 }, po(1))),
          new THREE.MeshPhongMaterial(Object.assign({ vertexColors: true, shininess: 60, specular: "#8A8070", envMap: env, combine: THREE.MixOperation, reflectivity: .16 }, po(1))),
          new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, po(0)))]; }
      const pal = mud ? [["#3F3123", .9], ["#504030", .86], ["#64523C", .75]] : [["#2C3B48", .93], ["#435563", .9], ["#6A6A5C", .8]];
      const rim = new THREE.Mesh(geo([ring(.9, 0), ring(1, .38)], [["#4A3B2B", .32], ["#4A3B2B", 0]], .02), W.pudMats[2]), wat = new THREE.Mesh(geo([ring(0, 0), ring(.55, 0), ring(1, 0)], pal, .045), W.pudMats[mud ? 1 : 0]);
      rim.renderOrder = 2; wat.renderOrder = 3; g.add(rim, wat);
      if (W.berm) { const P = [], I = [], rs = [[.96, 0], [1.1, .032], [1.24, .036], [1.42, .012], [1.58, -.012]]; rs.forEach(([k, h], j) => { for (let i = 0; i < N; i++) { const a = i / N * 6.2832, q = Rf(a) * k; P.push(Math.cos(a) * (q * rx + (k - 1) * .5), h * Math.min(1.4, Math.max(.7, (rx + rz) / 2)), Math.sin(a) * (q * rz + (k - 1) * .5)); } });
        for (let j = 0; j < rs.length - 1; j++) for (let i = 0; i < N; i++) { const a = j * N + i, b = j * N + (i + 1) % N; I.push(a, b, a + N, b, b + N, a + N); }
        const G = new THREE.BufferGeometry(); G.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); G.setIndex(I); G.computeVertexNormals(); if (G.attributes.normal.getY(N) < 0) { G.index.array.reverse(); G.computeVertexNormals(); }
        let mat = W.berm[1]; if (Math.abs(x) < 18 && Math.abs(z) < 18 && W.mud) { const M = W.mud, cs = Math.cos(g.rotation.y), sn = Math.sin(g.rotation.y), UV = [], C = [];
          for (let i = 0; i < P.length; i += 3) { const wx = x + P[i] * cs + P[i + 2] * sn, wz = z - P[i] * sn + P[i + 2] * cs, k = M.k(wx, wz); UV.push((wx + 18) / 36, (18 - wz) / 36); C.push(M.base.r * k, M.base.g * k, M.base.b * k); }
          G.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2)); G.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); mat = M.mat; }
        const bm = new THREE.Mesh(G, mat); bm.receiveShadow = true; g.add(bm); }
      return g; },
    carAt(W, c) { return W.carPos[c.id] || [c.x, c.z]; },
    towedBy(W, id) { return W.list.find(e => !e.gone && e.f && e.f.tow === id); },
    rules(W, e, dt) { if (e.d) return; const f = e.f;
      if (!f.tow && !(e.hookCd > W.t)) { for (const c of W.cars) { if (W.t < c.t || W.claimed.has(c.id) || this.towedBy(W, c.id)) continue; const [x, z] = this.carAt(W, c); if (Math.hypot(x - e.x, z - e.z) < 1.9) { f.tow = c.id; if (e.isMe) { sfx("click"); e.msg = `Hooked! Tow it to the ${this.GAR[c.gi][3]} garage`; e.msgT = W.t; } break; } } }
      else { const k = Math.exp(-.9 * dt); e.vx *= k; e.vz *= k;
        const G = this.GAR[(W.cars[f.tow - 1] || {}).gi || 0]; if (Math.hypot(e.x - G[0], e.z - G[1]) < 2.3) { const id = f.tow; f.tow = 0; if (W.claim(id)) { e.c.push(id); e.sc++; burst(W.sc, e.x, 1, e.z, { n: 16, cols: ["#FFC83D", "#FFFFFF", "#1FA35C"], spd: 3, up: 5, life: .8 }); if (e.isMe) { sfx("battery"); e.msg = "Rescued! +1"; e.msgT = W.t; } } } } },
    onRammed(W, e) { const id = e.f.tow; if (!id) return; e.f.tow = 0; e.hookCd = W.t + 1.5; const bx = Math.max(-16, Math.min(16, e.x - Math.cos(e.yaw) * 2.3)), bz = Math.max(-16, Math.min(16, e.z + Math.sin(e.yaw) * 2.3)); e.dropN = (e.dropN || 0) + 1;
      e.f.cd = (e.f.cd || []).concat([[id, Math.round(bx * 100) / 100, Math.round(bz * 100) / 100, e.dropN]]).slice(-10); W.carPos[id] = [bx, bz]; W.seenCd.add(e.k + ":" + e.dropN);
      if (e.isMe) { e.msg = "Rammed! You lost the car"; e.msgT = W.t; sfx("loss"); } },
    tick(W, dt) { W.list.forEach(e => { if (e.local || !e.f || !Array.isArray(e.f.cd)) return; e.f.cd.forEach(d => { const k = e.k + ":" + d[3]; if (W.seenCd.has(k)) return; W.seenCd.add(k); W.carPos[d[0]] = [+d[1], +d[2]]; }); });
      const want = new Set(W.list.filter(q => !q.gone && q.isMe && q.f && q.f.tow).map(q => (W.cars[q.f.tow - 1] || {}).gi));
      W.garRings.forEach((rg, i) => { const hot = want.has(i), k = hot ? .12 : .04; rg.scale.setScalar(1 + Math.sin(W.t * (hot ? 7 : 4)) * k); rg.material.emissiveIntensity = hot ? 1.2 + Math.sin(W.t * 7) * .5 : .7;
        const [gx, gz] = rg.userData.at, under = W.list.some(q => !q.gone && Math.abs(q.x - gx) < 3.4 && Math.abs(q.z - gz) < 3.4), u = rg.userData; u.fade += ((under ? .22 : 1) - u.fade) * Math.min(1, dt * 8);
        u.roof.forEach(m => { m.opacity = u.fade; m.depthWrite = u.fade > .95; }); });
      W.cars.forEach(c => { const on = W.t >= c.t && !W.claimed.has(c.id); c.g.visible = on; c.pud.visible = false; c.line.visible = false; if (!on) return;
        const tw = this.towedBy(W, c.id);
        if (tw) { const bx = tw.x - Math.cos(tw.yaw) * 2.3, bz = tw.z + Math.sin(tw.yaw) * 2.3; c.g.position.x += (bx - c.g.position.x) * Math.min(1, dt * 12); c.g.position.z += (bz - c.g.position.z) * Math.min(1, dt * 12); c.g.position.y = .05; c.g.rotation.x *= Math.max(0, 1 - dt * 8); c.g.rotation.z *= Math.max(0, 1 - dt * 8); c.g.rotation.y = lerpA(c.g.rotation.y, tw.yaw, Math.min(1, dt * 8));
          const mx = (tw.x + c.g.position.x) / 2, mz = (tw.z + c.g.position.z) / 2, L = Math.hypot(tw.x - c.g.position.x, tw.z - c.g.position.z); c.line.visible = true; c.line.position.set(mx, .7, mz); c.line.scale.z = Math.max(.1, L - 1.6); c.line.rotation.y = Math.atan2(tw.x - c.g.position.x, tw.z - c.g.position.z); }
        else { const [x, z] = this.carAt(W, c); c.g.position.x += (x - c.g.position.x) * Math.min(1, dt * 6); c.g.position.z += (z - c.g.position.z) * Math.min(1, dt * 6); c.g.position.y += (-.2 - c.g.position.y) * Math.min(1, dt * 4); c.g.rotation.x += (c.tilt[0] - c.g.rotation.x) * Math.min(1, dt * 4); c.g.rotation.z += (c.tilt[1] - c.g.rotation.z) * Math.min(1, dt * 4); c.pud.visible = true; c.pud.position.set(c.g.position.x, .015, c.g.position.z); c.pud.rotation.y = c.g.rotation.y; } }); },
    prompt: (W, e) => e.msg && W.t - e.msgT < 1.4 ? e.msg : e.f && e.f.tow ? `Tow it to the ${MG.tow.GAR[(W.cars[e.f.tow - 1] || {}).gi || 0][3]} garage!` : "",
    bot(W, e, dt) { const f = e.f;
      const rival = W.list.find(o => o !== e && !o.gone && o.al && o.f && o.f.tow && Math.hypot(o.x - e.x, o.z - e.z) < 4.5);
      if (rival && !f.tow && e.bcd <= 0 && W.t > 2.5 && Math.random() < .03) { const s = steer(e, rival.x + (Math.random() - .5) * 1.5, rival.z + (Math.random() - .5) * 1.5, 1); s.boost = true; return s; }
      if (f.tow) { const G = this.GAR[(W.cars[f.tow - 1] || {}).gi || 0]; return steer(e, G[0], G[1], .85); }
      const c = W.cars.filter(c => W.t >= c.t && !W.claimed.has(c.id) && !this.towedBy(W, c.id)).map(c => { const [x, z] = this.carAt(W, c); return { x, z }; }).sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
      return c ? steer(e, c.x, c.z, .82) : wander(W, e, dt, 8); },
    botScore: () => 1 + rnd(5) }
});

/* shared drift handling: the truck turns toward the stick, side grip drops while it is swinging at speed; kick(e) returns extra forward speed when the RAM/NITRO button fires */
function driftPhys(W, e, inp, dt, kick) { const m = inp ? Math.hypot(inp.x, inp.y) : 0, y0 = e.yaw; let thr = 0;
  if (m > .2) { const sp0 = Math.hypot(e.vx, e.vz); let d = Math.atan2(-inp.y, inp.x) - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); const rate = e.rateOv !== undefined ? e.rateOv : 1.8 + Math.min(1, sp0 / 7) * 2.6; e.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); thr = Math.min(1, m) * (Math.abs(d) > 2.5 ? .25 : 1); }
  const fx = Math.cos(e.yaw), fz = -Math.sin(e.yaw), lx = -fz, lz = fx; let vf = e.vx * fx + e.vz * fz, vl = e.vx * lx + e.vz * lz;
  if (inp && inp.boost) vf += kick(e) || 0; if (inp) inp.boost = false;
  e.bcd = Math.max(0, e.bcd - dt); e.boostT = Math.max(0, e.boostT - dt); e.slideT = Math.max(0, (e.slideT || 0) - dt);
  const yr = Math.abs(e.yaw - y0) / Math.max(dt, .001), grip = e.slideT > 0 ? .5 : e.gripOv !== undefined ? e.gripOv : 3.4 - 2.6 * Math.min(1, yr / 2.4) * Math.max(0, Math.min(1, (vf - 5) / 5));
  vl *= Math.exp(-grip * dt); vf += thr * 19 * dt; vf *= Math.exp(-(thr ? .35 : 1.1) * dt);
  const sp = Math.hypot(vf, vl), cap = e.boostT > 0 || e.slideT > 0 ? (e.capB || 21) : (e.capOv || 14); if (sp > cap) { vf *= cap / sp; vl *= cap / sp; }
  e.vx = fx * vf + lx * vl; e.vz = fz * vf + lz * vl; e.x += e.vx * dt; e.z += e.vz * dt;
  e.spd = Math.min(sp, cap); e.slip = vf > 1 ? Math.atan2(Math.abs(vl), vf) : 0;
}

/* ---- Zoomer: Drift King (sunset drift lot at the docks) ---- */
Object.assign(MG, {
  drift: { name: "Drift King", special: true, msgTop: true, kind: "arena", ctrl: "stick", hi: true, unit: "pts", dur: 45, bound: { t: "sq", h: 22 }, water: false, bare: true, dusk: true, sun: [-22, 16, -16], camZoom: 1.12,
    H: 22, STK: [[-10, -5], [10, -5], [0, 9]], ZR: [2.6, 6.2],
    how: "Swing the stick to slide sideways. Chain drifts for a multiplier, rings score double. Crashing loses your combo; ram a drifting rival to steal theirs.",
    build(W) { const s = W.sc, r = mulberry((W.mg.seed || 1) + 31), H = this.H;
      const g0 = B(240, .4, 240, "#2C3038", 0, -.25, 0); g0.castShadow = false; s.add(g0);
      const pad = B(2 * H + 2, .4, 2 * H + 2, "#5A6170", 0, -.2, 0); pad.castShadow = false; s.add(pad);
      this.STK.forEach(([x, z], k) => {
        decal(s, new THREE.RingGeometry(this.ZR[0], this.ZR[1], 48), "#FF8A1F", x, .016, z, .16);
        [this.ZR[0], this.ZR[1]].forEach(rr => { for (let q = 0; q < 24; q += 2) decal(s, new THREE.RingGeometry(rr - .12, rr, 6, 1, q / 24 * 6.283, 6.283 / 24), "#FFC83D", x, .02, z, .95); });
        for (let q = 0; q < 6; q++) { const r0 = 2.8 + r() * 3.2, a0 = r() * 6.28; decal(s, new THREE.RingGeometry(r0, r0 + .26, 40, 1, a0, 1.5 + r() * 3), "#1A1C22", x, .01 + q * .0006, z, .35); decal(s, new THREE.RingGeometry(r0 + .8, r0 + 1.06, 40, 1, a0, 1.5 + r() * 3), "#1A1C22", x, .0105 + q * .0006, z, .35); }
        for (let t = 0; t < 4; t++) { s.add(Cy(1, 1, .42, 16, t % 2 ? "#F4F6F9" : "#E5484D", x, .22 + t * .44, z)); s.add(Cy(.62, .62, .44, 12, "#151820", x, .22 + t * .44, z)); }
        s.add(Cy(.05, .05, 2.4, 6, "#C9CED8", x, 2.9, z)); const fl = textSprite("ABC"[k], "#151B24", "#FFC83D", .9); fl.position.set(x, 4.3, z); s.add(fl); });
      for (let q = -H; q < H; q += 2.4) [[q + 1.2, -H - 1], [q + 1.2, H + 1], [-H - 1, q + 1.2], [H + 1, q + 1.2]].forEach(([x, z], j) => { const v = j > 1; s.add(B(v ? .6 : 2.3, .9, v ? 2.3 : .6, Math.round((q + H) / 2.4) % 2 ? "#F4F6F9" : "#E5484D", x, .45, z)); });
      const ppl = [], SZ = -H - 3;
      for (let t = 0; t < 4; t++) { const h = .7 + t * .65, z = SZ - t * 1.3, st = B(2 * H + 4, h, 1.3, t % 2 ? "#8C95A5" : "#A3ACBB", 0, h / 2, z); st.castShadow = false; s.add(st);
        for (let x = -H - 1.5; x < H + 1.5; x += .85 + r() * .3) if (r() > .12) ppl.push({ x, y: h, z: z + (r() - .5) * .25, face: Math.PI / 2, ph: r() * 6.28, sp: 7 + r() * 5 }); }
      s.add(B(2 * H + 4, 4.6, .4, "#5A6272", 0, 2.3, SZ - 5.4), B(2 * H + 6, .25, 6.6, "#FF6FAE", 0, 5.6, SZ - 2.2)); [-H - 2.5, H + 2.5].forEach(x => s.add(B(.25, 5.5, .25, "#D9DEE7", x, 2.75, SZ + .8)));
      const sg = signBoard("DRIFT KING", { style: "neon", w: 12, h: 2.4, col: "#FF6FAE" }); sg.position.set(0, 7.15, SZ - 2.6); sg.rotation.x = -.2; s.add(sg); [-4.5, 4.5].forEach(x => s.add(B(.18, 1.3, .18, "#2A2F3A", x, 6.3, SZ - 2.75))); crowdMeshes(W, ppl);
      const CC = ["#E5484D", "#2F7DE1", "#1FA35C", "#FF8A1F", "#8E5CF0", "#16B3C9", "#FFC83D"];
      [-1, 1].forEach(sd => { for (let z = -H - 2; z < H + 8; z += 3) { const n = 1 + Math.floor(r() * 3); for (let y = 0; y < n; y++) { const x = sd * (H + 5.5 + r() * .4); s.add(B(2.4, 2.5, 2.9, CC[Math.floor(r() * CC.length)], x, 1.25 + y * 2.55, z)); s.add(B(2.46, 2.1, .06, "#151820", x, 1.25 + y * 2.55, z + 1.46)); } } });
      [[-H - 2.6, -H - 1.4], [H + 2.6, -H - 1.4], [-H - 2.6, H + 2.6], [H + 2.6, H + 2.6]].forEach(([x, z]) => s.add(Cy(.18, .26, 11, 8, "#6F7888", x, 5.5, z), B(1.8, .5, .8, "#353A46", x, 11.1, z), B(1.6, .12, .6, "#FFF1C2", x, 10.8, z, { emissive: "#FFE7A8", emissiveIntensity: 1.3 })));
      [[-30, -48], [14, -55]].forEach(([x, z], k) => { const cr = new THREE.Group(), col = k ? "#2F7DE1" : "#E5484D"; cr.position.set(x, 0, z); s.add(cr);
        [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(([a, b]) => cr.add(B(.7, 16, .7, col, a, 8, b))); cr.add(B(7.6, 1.2, 7.6, col, 0, 16, 0), B(1.2, 1.2, 30, col, 0, 17.4, 6), B(3, 2.4, 3, "#D9DEE7", 0, 18.6, -1)); });
      for (let i = 0; i < 10; i++) { const a = r() * 6.28, d = 46 + r() * 20; s.add(tree(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * .6, 0)); }
      W.skid = tyreTracks(W, "#939496", "#FFFFFF", 700, 5, 1, true); W.smoke = puffs(W, "#FFFFFF"); },
    spawn: (W, i, n) => ({ x: (i - (n - 1) / 2) * 3.2, z: 18, yaw: 0 }),
    initEnt(W, e) { e.dk = { pts: 0, mult: 1, run: 0, gap: 0 }; e.f = { cb: 0, m: 1, st: [] }; e.slip = 0; e.spd = 0; e.stN = 0; },
    phys(W, e, inp, dt) { const H = this.H; driftPhys(W, e, inp, dt, e => { if (e.bcd > 0) return 0; e.bcd = 2; e.boostT = .45; return 9; });
      if (Math.abs(e.x) > H) { if (Math.abs(e.vx) > 4) e.bonk = 1; e.x = Math.sign(e.x) * H; e.vx *= -.45; }
      if (Math.abs(e.z) > H) { if (Math.abs(e.vz) > 4) e.bonk = 1; e.z = Math.sign(e.z) * H; e.vz *= -.45; }
      this.STK.forEach(([x, z]) => { const dx = e.x - x, dz = e.z - z, dd = Math.hypot(dx, dz); if (dd > 1.9 || dd < .001) return; const nx = dx / dd, nz = dz / dd, vn = e.vx * nx + e.vz * nz; e.x = x + nx * 1.9; e.z = z + nz * 1.9; if (vn < 0) { if (vn < -4) e.bonk = 1; e.vx -= 1.5 * vn * nx; e.vz -= 1.5 * vn * nz; } }); },
    comboTag(W, e) { if (e.isMe && !W.tv && !W.split) return; const cb = (e.f && e.f.cb) || 0, mu = (e.f && e.f.m) || 1, show = cb >= 20 && !e.gone && !e.d && !e.falling;
      if (!e.cbS) { if (!show) return; const cv = document.createElement("canvas"); cv.width = 320; cv.height = 112; const tx = new THREE.CanvasTexture(cv); e.cbS = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); e.cbS.renderOrder = 9; e.cbC = cv; W.sc.add(e.cbS); }
      e.cbS.visible = show; if (!show) { e.cbK = ""; return; }
      const col = cb >= 800 ? "#FF4D8D" : cb >= 400 ? "#FF8A1F" : cb >= 150 ? "#FFC83D" : "#FFFFFF", key = Math.floor(cb / 5) + "|" + mu + col;
      if (key !== e.cbK) { e.cbK = key; const x = e.cbC.getContext("2d"), w = 320, h = 112; x.clearRect(0, 0, w, h); x.font = "64px Bungee, 'Arial Black', Impact, sans-serif"; const t1 = String(cb), t2 = " ×" + mu; x.font = "64px Bungee, 'Arial Black', Impact, sans-serif"; const w1 = x.measureText(t1).width; x.font = "38px Bungee, 'Arial Black', Impact, sans-serif"; const w2 = x.measureText(t2).width, tw = Math.min(w - 16, w1 + w2 + 40), x0 = (w - tw) / 2;
        x.fillStyle = "rgba(16,22,31,.82)"; rr(x, x0, 14, tw, 84, 42); x.fill(); x.strokeStyle = col; x.lineWidth = 5; rr(x, x0 + 2.5, 16.5, tw - 5, 79, 40); x.stroke();
        x.textBaseline = "middle"; x.textAlign = "left"; let cx = (w - w1 - w2) / 2; x.font = "64px Bungee, 'Arial Black', Impact, sans-serif"; x.fillStyle = col; x.fillText(t1, cx, 60); x.font = "38px Bungee, 'Arial Black', Impact, sans-serif"; x.fillStyle = "#FFFFFF"; x.fillText(t2, cx + w1, 64); e.cbS.material.map.needsUpdate = true; }
      const k = Math.min(1, cb / 800), pul = 1 + (cb >= 400 ? Math.sin(W.t * 10) * .06 : 0), sc = (2.8 + k * 1.4) * pul; e.cbS.scale.set(sc, sc * 112 / 320, 1); e.cbS.position.set(e.x, 3.7 + k * .4, e.z - .2); },
    zone(x, z) { return this.STK.some(([a, b]) => { const d = Math.hypot(x - a, z - b); return d > this.ZR[0] && d < this.ZR[1]; }); },
    bank(W, e) { const q = e.dk, v = Math.round(q.pts * q.mult); if (v > 0) { e.sc += v; if (e.isMe) { e.msg = `+${v}` + (q.mult > 1 ? `  (×${q.mult})` : ""); e.msgT = W.t; sfx(v > 300 ? "battery" : "coin"); } } q.pts = 0; q.mult = 1; q.run = 0; q.gap = 0; },
    lose(W, e, why) { const q = e.dk; if (q.pts < 3) return; q.pts = 0; q.mult = 1; q.run = 0; q.gap = 0; if (e.isMe) { e.msg = why; e.msgT = W.t; sfx("loss"); W.shake = .25; } },
    rules(W, e, dt) { if (e.d) return; const q = e.dk;
      if (e.bonk) { e.bonk = 0; this.lose(W, e, "Crashed! Combo lost"); }
      const on = e.slip > .3 && e.spd > 6, zn = on && this.zone(e.x, e.z);
      if (on) { if (e.isMe && !q.pts) sfx("skid"); q.gap = 0; q.run += dt; q.pts += e.spd * Math.min(1, e.slip / .9) * dt * 2.2 * (zn ? 2 : 1); q.mult = Math.min(5, 1 + Math.floor(q.run / 1.6)); }
      else if (q.pts > 0) { q.gap += dt; if (q.gap > .8) this.bank(W, e); }
      e.f.cb = Math.round(q.pts * q.mult); e.f.m = q.mult; e.zn = zn; },
    timeUp(W, e) { this.bank(W, e); },
    onRammed(W, e, by) { const q = e.dk, v = Math.round(q.pts * q.mult), thief = by && by !== e && v >= 3 ? by : null;
      this.lose(W, e, thief ? `Rammed! ${thief.isMe && !W.tv ? "You" : thief.p.name} stole ${v}` : "Rammed! Combo lost"); if (!thief) return;
      if (thief.local) this.steal(W, thief, v, e); else { e.stN++; e.f.st = (e.f.st || []).concat([[thief.k, v, e.stN]]).slice(-8); } },
    steal(W, by, v, from) { by.sc += v; burst(W.sc, by.x, 1.6, by.z, { n: 18, cols: ["#FFC83D", "#FF4D8D", "#FFFFFF"], spd: 4, up: 5, life: .7 });
      if (by.isMe) { by.msg = `Stole ${v} from ${from ? from.p.name : "a rival"}!`; by.msgT = W.t; sfx("battery"); W.shake = .2; } },
    tick(W, dt) { W.seenSt = W.seenSt || new Set(); W.list.forEach(o => { if (o.local || !o.f || !Array.isArray(o.f.st)) return;
      o.f.st.forEach(x => { if (!Array.isArray(x)) return; const key = o.k + ":" + x[2]; if (W.seenSt.has(key)) return; W.seenSt.add(key); const by = W.ents[x[0]]; if (by && by.local && !by.d) this.steal(W, by, Math.max(0, Math.round(+x[1] || 0)), o); }); }); },
    render(W, e, dt) {
      if (W.fxT !== W.t) { W.fxT = W.t; tyreStep(W, W.skid, dt, .02, () => false); puffStep(W, dt); const me = W.me, hype = Math.min(1, ((me.f && me.f.cb) || 0) / 400); crowdStep(W, null, .2 + hype * .8);
        if (!W.eng && W.t > -2) W.eng = engineSnd(); if (W.eng) W.eng.set(Math.min(1, Math.hypot(me.vx, me.vz) / 14), .02 + hype * .05, !me.d); }
      this.comboTag(W, e);
      if (e.gone || e.falling) return; const sp = Math.hypot(e.vx, e.vz); if (sp < 6) return;
      const fx = Math.cos(e.yaw), fz = -Math.sin(e.yaw), vf = e.vx * fx + e.vz * fz, vl = Math.abs(-e.vx * fz + e.vz * fx); if (vf < 1 || Math.atan2(vl, vf) < .3) return;
      wheelTrack(W.skid, e, true, W.t, .022);
      if (Math.random() < dt * 9) { const sd = Math.random() < .5 ? -.5 : .5; W.smoke(e.x - fx * .9 - fz * sd, .45, e.z - fz * .9 + fx * sd, .9 + Math.random() * .6, 1.4, .8 + Math.random() * .4); } },
    stop(W) { if (W.eng) W.eng.stop(); },
    prompt: (W, e) => e.msg && W.t - e.msgT < 1.3 ? e.msg : e.dk && e.dk.pts > 0 ? `DRIFT ${Math.round(e.dk.pts)} ×${e.dk.mult}${e.zn ? "  ZONE ×2" : ""}` : W.t < 5 ? "Swing the stick to drift!" : "",
    bot(W, e, dt) { if (!e.bs) e.bs = { sk: .7 + Math.random() * .3, k: Math.floor(Math.random() * 3), dir: Math.random() < .5 ? 1 : -1, sw: 4 + Math.random() * 5 };
      const b = e.bs; b.sw -= dt; if (b.sw <= 0) { const busy = j => W.list.filter(o => o !== e && !o.gone && Math.hypot(o.x - this.STK[j][0], o.z - this.STK[j][1]) < 7).length; b.k = [0, 1, 2].filter(j => j !== b.k).sort((x, y) => busy(x) - busy(y) + Math.random() - .5)[0]; b.dir = -b.dir; b.sw = 5 + Math.random() * 5; }
      const [sx, sz] = this.STK[b.k], a = Math.atan2(e.z - sz, e.x - sx), dd = Math.hypot(e.x - sx, e.z - sz);
      if (dd > 8) return steer(e, sx + Math.cos(a + b.dir * 1.2) * 4.5, sz + Math.sin(a + b.dir * 1.2) * 4.5, 1);
      const ah = a + b.dir * (1.25 + (1 - b.sk) * .6), R = 3.4 + (1 - b.sk) * 2 + Math.sin(W.t * 1.3 + e.x) * .4;
      const s = steer(e, sx + Math.cos(ah) * R, sz + Math.sin(ah) * R, 1); if (e.bcd <= 0 && W.t > 3) { const fx = Math.cos(e.yaw), fz = -Math.sin(e.yaw), tg = W.list.find(q => q !== e && !q.gone && q.f && q.f.cb > 150 && Math.hypot(q.x - e.x, q.z - e.z) < 5 && ((q.x - e.x) * fx + (q.z - e.z) * fz) / Math.hypot(q.x - e.x, q.z - e.z) > .8); if (tg && Math.random() < .03) s.boost = true; } return s; },
    botScore: () => 500 + rnd(1200) }
});

/* ---- Drift Race: one big lap; flyover roundabout onto a long straight, esses, a hill tunnel, a hairpin roundabout and a crest. Hold DRIFT through corners, let go for a mini-turbo (blue / orange / purple) ---- */
Object.assign(MG, {
  race: { name: "Drift Race", msgTop: true, kind: "arena", ctrl: "stick", hi: true, unit: "pts", dur: 105, bound: { t: "none" }, water: false, bare: true, LAPS: 1, HW: 5.5, WALL: 8.2, ramLabel: "DRIFT", ramK: .6, ramSelf: .85, ramSlide: .55, ramKeep: true, canRam: e => !e.f || (e.f.bl || 0) < 4,
    how: "One big lap, first home wins. Hold DRIFT through corners and let go for a boost. Tuck in behind a truck to slipstream, and boost into rivals to bump them.",
    LOOP: [73, 10], PIN: [34, 62], TUN: [46, -12, 14],
    PTS: [[-40, -60, 0], [0, -60, 0], [25, -60, 0], [45, -52, 0], [55, -35, 0], [55, -15, 0], [55, 0, 0], [55, 10, .2], [57.4, 19, .6], [64, 25.6, 1.2], [73, 28, 1.8], [82, 25.6, 2.4], [88.6, 19, 3], [91, 10, 3.6], [88.6, 1, 4.2], [82, -5.6, 4.8], [73, -8, 5.1],
      [62, -8, 5.3], [48, -8, 5.3], [36, -8, 4.4], [20, -8, 2.2], [4, -8, .5], [-14, -8, 0], [-34, -8, 0], [-46, 0, 0], [-50, 16, 0], [-46, 32, 0], [-34, 43, 0], [-15, 46, 0], [5, 46, 0], [22, 46, 0], [36, 49, 0], [46, 58, 0], [44, 70, 0], [32, 77, 0],
      [10, 78, 0], [-12, 78, 1.8], [-28, 78, 3], [-44, 78, 1.8], [-62, 78, 0], [-82, 75, 0], [-93, 64, 0], [-96, 44, 0], [-96, 10, 0], [-96, -25, 0], [-92, -48, 0], [-80, -58, 0], [-62, -61, 0]],
    trk() { if (this._T) return this._T; const c = new THREE.CatmullRomCurve3(this.PTS.map(([x, z, y]) => new THREE.Vector3(x, y, z)), true, "centripetal"), L = c.getLength(), N = Math.round(L / .5), S = [];
      c.getSpacedPoints(N).slice(0, N).forEach((p, i, A) => { const q = A[(i + 1) % N], o = A[(i + N - 1) % N], tx = q.x - o.x, tz = q.z - o.z, l = Math.hypot(tx, tz); S.push({ x: p.x, z: p.z, y: Math.max(0, p.y), gy: (Math.max(0, q.y) - Math.max(0, o.y)) / l, tx: tx / l, tz: tz / l, nx: tz / l, nz: -tx / l }); });
      const far = (i, j) => { const d = Math.abs(i - j); return Math.min(d, N - d) > 160; };
      S.forEach((p, i) => { if (p.y < 2) return; for (let j = 0; j < N; j++) if (S[j].y < 1 && far(i, j) && Math.hypot(S[j].x - p.x, S[j].z - p.z) < this.WALL + 1.5) { p.over = true; S[j].under = true; } });
      const [tz0, tx0, tx1] = this.TUN; S.forEach(p => { p.tun = Math.abs(p.z - tz0) < 4 && p.x > tx0 && p.x < tx1; });
      return (this._T = { S, N, L, ds: L / N }); },
    near(e) { const { S, N } = this.trk(); let best = 1e9, bi = e.si || 0; const span = e.si === undefined ? N : 30;
      for (let k = -span; k <= span; k++) { const i = ((e.si || 0) + k + N * 2) % N, d = (S[i].x - e.x) ** 2 + (S[i].z - e.z) ** 2 + (e.si === undefined ? (S[i].y - (e.y || 0)) ** 2 * 4 : 0); if (d < best) { best = d; bi = i; } } return bi; },
    build(W) { const s = W.sc, T = this.trk(), { S, N } = T, HW = this.HW, WL = this.WALL, r = mulberry((W.mg.seed || 1) + 41);
      s.children.slice().forEach(o => { if (o.isGroup && o.position.y > 12) s.remove(o); });
      const g0 = B(520, .4, 520, "#6DBE5A", 0, -.25, 0); g0.castShadow = false; s.add(g0); W.fadeOver = []; W.fadeTun = [];
      const mk = (pos, col, fade) => { const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: THREE.DoubleSide, transparent: !!fade }), m = new THREE.Mesh(geo, mat); m.receiveShadow = true; s.add(m); if (fade) fade.push(mat); return m; };
      const rib = (a, b, yo, cols, keep, fade) => { const pos = [], col = [], cc = new THREE.Color(); for (let i = 0; i < N; i++) { const p = S[i], q = S[(i + 1) % N]; if (keep && !keep(i)) continue; const ci = cols(i); if (!ci) continue; cc.set(ci);
          const v = [[p.x + p.nx * a, p.y + yo, p.z + p.nz * a], [p.x + p.nx * b, p.y + yo, p.z + p.nz * b], [q.x + q.nx * a, q.y + yo, q.z + q.nz * a], [q.x + q.nx * b, q.y + yo, q.z + q.nz * b]];
          [0, 2, 1, 1, 2, 3].forEach(j => { pos.push(...v[j]); col.push(cc.r, cc.g, cc.b); }); } if (pos.length) mk(pos, col, fade); };
      const both = (a, b, yo, cols) => { rib(a, b, yo, cols, i => !S[i].over); rib(a, b, yo, cols, i => S[i].over, W.fadeOver); };
      both(-HW, HW, .02, i => (i >> 3) % 2 ? "#4C525E" : "#4F5562");
      [[HW, HW + .7], [-HW - .7, -HW]].forEach(([a, b]) => both(a, b, .035, i => (i >> 2) % 2 ? "#F4F6F9" : "#E5484D"));
      both(HW + .7, WL + .9, .01, i => S[i].y > .3 ? "#9AA0AB" : "#C9B98F"); both(-WL - .9, -HW - .7, .01, i => S[i].y > .3 ? "#9AA0AB" : "#C9B98F");
      both(-.12, .12, .045, i => i % 12 < 6 && i > 4 && i < N - 4 ? "#F4F6F9" : null);
      both(-WL - .9, WL + .9, -.7, i => S[i].y > .3 ? "#6F7682" : null);
      { const pos = [], col = [], cc = new THREE.Color("#8C929E"); [-1, 1].forEach(sd => { for (let i = 0; i < N; i++) { const p = S[i], q = S[(i + 1) % N]; if (p.y < .3) continue; const a = sd * (WL + .9), pb = p.over ? p.y - .75 : -.05, qb = q.over ? q.y - .75 : -.05;
          const v = [[p.x + p.nx * a, p.y + .02, p.z + p.nz * a], [p.x + p.nx * a, pb, p.z + p.nz * a], [q.x + q.nx * a, q.y + .02, q.z + q.nz * a], [q.x + q.nx * a, qb, q.z + q.nz * a]];
          [0, 2, 1, 1, 2, 3].forEach(j => { pos.push(...v[j]); col.push(cc.r, cc.g, cc.b); }); } }); mk(pos, col); }
      const under = S.filter(p => p.under);
      for (let i = 0; i < N; i += 7) { const p = S[i]; if (!p.over || p.y < 2) continue; [-1, 1].forEach(sd => { const x = p.x + p.nx * sd * (WL + .4), z = p.z + p.nz * sd * (WL + .4); if (under.some(u => Math.hypot(u.x - x, u.z - z) < WL + 1.2)) return; s.add(B(.9, p.y - .7, .9, "#8C929E", x, (p.y - .7) / 2, z)); }); }
      const tyre = new THREE.CylinderGeometry(.42, .42, .42, 10), TW = [[], []], TC = ["#1D2026", "#1D2026", "#F4F6F9", "#E5484D"];
      [-1, 1].forEach(sd => { let acc = 9; for (let i = 0; i < N; i++) { acc += T.ds; if (acc < .85) continue; acc = 0; const p = S[i], x = p.x + p.nx * sd * (WL + .45), z = p.z + p.nz * sd * (WL + .45);
        if (S.some((q, j) => Math.abs(q.y - p.y) < 1.5 && (q.x - x) ** 2 + (q.z - z) ** 2 < (WL + .3) ** 2)) continue; if (p.tun) continue; TW[p.over ? 1 : 0].push([x, p.y, z, TC[Math.floor(i / 6) % 4]]); } });
      TW.forEach((L, f) => { if (!L.length) return; const mat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: .8, transparent: !!f }), im = new THREE.InstancedMesh(tyre, mat, L.length * 2), o = new THREE.Object3D(), cc = new THREE.Color();
        L.forEach(([x, y, z, c], k) => [0, 1].forEach(h => { o.position.set(x, y + .21 + h * .42, z); o.updateMatrix(); im.setMatrixAt(k * 2 + h, o.matrix); im.setColorAt(k * 2 + h, cc.set(c)); })); im.castShadow = true; s.add(im); if (f) W.fadeOver.push(mat); });
      const tun = S.map((p, i) => i).filter(i => S[i].tun), stone = [], ARC = 12, TR = WL + 1.3;
      { const pos = [], col = [], cc = new THREE.Color("#8A8F99"); for (let k = 0; k < tun.length - 1; k++) { const p = S[tun[k]], q = S[tun[k + 1]]; for (let a = 0; a < ARC; a++) { const pt = (P, t) => { const an = t / ARC * Math.PI; return [P.x + P.nx * Math.cos(an) * TR, P.y + Math.sin(an) * TR * .62, P.z + P.nz * Math.cos(an) * TR]; };
          const v = [pt(p, a), pt(p, a + 1), pt(q, a), pt(q, a + 1)]; [0, 2, 1, 1, 2, 3].forEach(j => { pos.push(...v[j]); col.push(cc.r, cc.g, cc.b); }); } } if (pos.length) mk(pos, col, W.fadeTun); }
      if (tun.length) { const m0 = S[tun[Math.floor(tun.length / 2)]], hill = new THREE.Group(); s.add(hill);
        [[0, 0, 7.5, 12.5], [-5, 9, 5.5, 9], [5, -9, 6, 9], [0, 15, 5, 8], [-3, -15, 4.5, 7], [6, 13, 4, 6]].forEach(([dx, dz, h, rr]) => { const m = mesh(new THREE.DodecahedronGeometry(rr, 1), r() < .5 ? "#5DAE4C" : "#68B957", { transparent: true }); m.scale.y = h / rr; m.position.set(m0.x + dx, -.5, m0.z + dz); hill.add(m); W.fadeTun.push(m.material); });
        [tun[0], tun[tun.length - 1]].forEach(i => { const p = S[i], yaw = Math.atan2(-p.tz, p.tx), pg = new THREE.Group(); pg.position.set(p.x, 0, p.z); pg.rotation.y = yaw; s.add(pg); pg.add(B(.9, 6.6, 1.2, "#6F7682", 0, 3.3, TR + .2), B(.9, 6.6, 1.2, "#6F7682", 0, 3.3, -TR - .2), B(.9, 1.4, 2 * TR + 1.6, "#6F7682", 0, 6.4, 0), B(.95, .5, 2 * TR - 1, "#FFC83D", 0, 5.5, 0)); }); }
      { const [lx, lz] = this.LOOP, isl = new THREE.Group(); isl.position.set(lx, 0, lz); s.add(isl); isl.add(Cy(7.2, 7.4, .3, 28, "#7CCB66", 0, .15, 0), Cy(7.6, 7.6, .2, 28, "#F4F6F9", 0, .1, 0));
        isl.add(Cy(2.2, 2.6, 1.2, 8, "#D9DEE7", 0, .9, 0), Cy(1.1, 1.4, 1.4, 8, "#FFC83D", 0, 2.2, 0, { metalness: .6, roughness: .3 }), Cy(.35, .35, 1.6, 8, "#FFC83D", 0, 3.6, 0, { metalness: .6, roughness: .3 }), Cy(1.7, .8, 2.2, 12, "#FFC83D", 0, 5.4, 0, { metalness: .6, roughness: .3 }));
        [-1, 1].forEach(sd => { const h = new THREE.Mesh(new THREE.TorusGeometry(.7, .16, 6, 12, Math.PI), M("#FFC83D", { metalness: .6, roughness: .3 })); h.position.set(sd * 1.7, 5.6, 0); h.rotation.z = -sd * Math.PI / 2; isl.add(h); });
        for (let k = 0; k < 18; k++) { const a = k / 18 * 6.283, fl = mesh(new THREE.IcosahedronGeometry(.35, 0), ["#E5484D", "#FF6FAE", "#FFC83D", "#F4F6F9"][k % 4]); fl.position.set(Math.cos(a) * 5.4, .5, Math.sin(a) * 5.4); isl.add(fl); } }
      { const [px, pz] = this.PIN; s.add(Cy(3.2, 3.4, .3, 20, "#7CCB66", px, .15, pz)); s.add(tree(px, pz, 1.1, 0)); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, b = mesh(new THREE.IcosahedronGeometry(.55, 0), "#4E9A3E"); b.position.set(px + Math.cos(a) * 2.4, .5, pz + Math.sin(a) * 2.4); s.add(b); } }
      const st = S[0], yaw = Math.atan2(-st.tz, st.tx), chk = canvasTex(64, 16, (x, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? "#151B24" : "#FFFFFF"; x.fillRect(i * 4, j * 4, 4, 4); } });
      const line = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW, 1.2), new THREE.MeshBasicMaterial({ map: chk, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); line.rotation.x = -Math.PI / 2; const lg = new THREE.Group(); lg.position.set(st.x, .06, st.z); lg.rotation.y = yaw + Math.PI / 2; lg.add(line); s.add(lg);
      const gn = new THREE.Group(); gn.position.set(st.x, 0, st.z); gn.rotation.y = yaw; s.add(gn); [-1, 1].forEach(sd => gn.add(B(.4, 5, .4, "#555C69", 0, 2.5, sd * (HW + 1.6)))); gn.add(B(.6, .9, 2 * HW + 3.6, "#151B24", 0, 5.2, 0));
      const lab = signBoard("DRIFT RACE", { style: "race", w: 12, h: 1.5 }); lab.position.set(0, 6.45, 0); lab.rotation.y = Math.PI / 2; gn.add(lab);
      const ppl = [], sg = new THREE.Group(); sg.position.set(-25, 0, -60 - WL - 2.5); s.add(sg);
      for (let t = 0; t < 4; t++) { const h = .7 + t * .65, z = -t * 1.3, b = B(40, h, 1.3, t % 2 ? "#8C95A5" : "#A3ACBB", 0, h / 2, z); b.castShadow = false; sg.add(b); for (let x = -19.5; x < 19.5; x += .85 + r() * .3) if (r() > .12) ppl.push({ x: x - 25, y: h, z: sg.position.z + z + (r() - .5) * .25, face: Math.PI / 2, ph: r() * 6.28, sp: 7 + r() * 5 }); }
      sg.add(B(40, 4.6, .4, "#5A6272", 0, 2.3, -5.4), B(42, .25, 6.6, "#2F7DE1", 0, 5.6, -2.2)); crowdMeshes(W, ppl);
      [[-160, 10, 12, 30], [150, -40, 12, 30], [140, 110, 10, 28], [-150, 120, 14, 34], [-40, -130, 11, 30], [40, 140, 9, 26]].forEach(([x, z, h, rr]) => { const m = mesh(new THREE.DodecahedronGeometry(rr, 1), "#62B350"); m.scale.y = h / rr; m.position.set(x, -1, z); s.add(m); });
      for (let i = 0; i < 190; i++) { const x = (r() - .5) * 280, z = (r() - .5) * 240; if (S.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < (WL + 3) ** 2) || (Math.abs(x + 25) < 23 && z < -66 && z > -80) || Math.hypot(x - this.LOOP[0], z - this.LOOP[1]) < 9 || Math.hypot(x - this.PIN[0], z - this.PIN[1]) < 5) continue; s.add(tree(x, z, .9 + r() * .7, 0)); }
      W.skid = tyreTracks(W, "#ACADAF", "#FFFFFF", 700, 5, 1, true); W.smoke = puffs(W, "#FFFFFF"); W.dust = puffs(W, "#C9B98F"); W.fireL = ["#4FC3FF", "#FF9A1F", "#C77DFF", "#E6F2FF"].map(c => puffs(W, c));
      W.glowTex = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.18, "rgba(255,255,255,1)"); g.addColorStop(.5, "rgba(255,255,255,.75)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); }); },
    spawn(W, i, n) { const { S, N } = this.trk(), k = (N - 6 - Math.floor(i / 2) * 8) % N, p = S[k], sd = i % 2 ? -2.2 : 2.2; return { x: p.x + p.nx * sd, z: p.z + p.nz * sd, yaw: Math.atan2(-p.tz, p.tx) }; },
    initEnt(W, e) { e.si = undefined; e.si = this.near(e); e.lap = 0; e.dr = 0; e.dch = 0; e.slip = 0; e.spd = 0; e.f = { lap: 0, dl: 0 }; },
    lvl(t) { return t > 2.6 ? 3 : t > 1.6 ? 2 : t > .7 ? 1 : 0; },
    BOOST: [[0, 0], [.35, 2], [.9, 4.5], [2.2, 7]],
    phys(W, e, inp, dt) { const T = this.trk(), { S } = T, hold = !!(inp && inp.hold), sp = Math.hypot(e.vx, e.vz); let d = 0, pin = inp;
      const m = inp ? Math.hypot(inp.x, inp.y) : 0; if (m > .2) { d = Math.atan2(-inp.y, inp.x) - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); }
      if (e.slideT > 0 && e.dr) { e.dr = 0; e.dch = 0; }
      if (hold && !e.hold0 && !e.dr && W.t - (e.hopT ?? -9) > .3) e.hopT = W.t; e.hold0 = hold;
      if (!e.dr && hold && sp > 4) { const side = Math.abs(d) > .05 ? Math.sign(d) : Math.abs(e.yr || 0) > .3 ? Math.sign(e.yr) : 0; if (side) { e.dr = side; e.dch = 0; if (e.isMe) sfx("skid"); } }
      if (e.dr) {
        if (!hold || sp < 5) { const lv = this.lvl(e.dch); if (sp > 1) { let dv = Math.atan2(-e.vz, e.vx) - e.yaw; dv = Math.atan2(Math.sin(dv), Math.cos(dv)); e.yaw += dv * .7; } e.exitT = W.t; if (!hold && lv > 0) { const [bt, kv] = this.BOOST[lv]; e.boostT = bt; e.f.bl = lv; e.vx += Math.cos(e.yaw) * kv; e.vz -= Math.sin(e.yaw) * kv; if (e.isMe) { sfx("go"); W.shake = .1 + lv * .06; } } e.dr = 0; e.dch = 0; }
        else { let dv = 0; if (m > .2) { dv = Math.atan2(-inp.y, inp.x) - (sp > 1 ? Math.atan2(-e.vz, e.vx) : e.yaw); dv = Math.atan2(Math.sin(dv), Math.cos(dv)); } const k = Math.max(0, Math.min(1, .5 + e.dr * dv / 1.1)), ease = .4 + .6 * Math.min(1, e.dch / .35); e.yaw += e.dr * (.3 + 2.3 * k) * ease * dt; const l0 = this.lvl(e.dch); e.dch += dt; if (e.isMe && this.lvl(e.dch) > l0) sfx("beep"); pin = { x: Math.cos(e.yaw), y: -Math.sin(e.yaw) }; }
      }
      e.gripOv = e.dr ? 2.2 : 4.2; e.capOv = 14; e.capB = e.f && e.f.bl === 3 ? 22 : 20; { const u = W.t - (e.exitT ?? -9), base = 1.1 + 1.4 * Math.min(1, sp / 7); e.rateOv = !e.dr && u < 1 ? Math.min(base, .8 + u * 1.7) : base; } const y0 = e.yaw, sp0 = Math.hypot(e.vx, e.vz);
      driftPhys(W, e, pin, dt, () => 0);
      if (e.dr) { const sp1 = Math.hypot(e.vx, e.vz), want = Math.min(e.boostT > 0 ? e.capB : 14, Math.max(sp1, sp0 * Math.exp(-.12 * dt))); if (sp1 > .1) { e.vx *= want / sp1; e.vz *= want / sp1; } } e.yr = (e.yaw - y0) / Math.max(dt, .001);
      e.si = this.near(e); const p = S[e.si];
      { const u = (W.t - (e.hopT ?? -9)) / .28; e.gy = p.y; e.y = p.y + (u >= 0 && u < 1 ? Math.sin(u * Math.PI) * .32 : 0); e.pitch = Math.atan(p.gy) * (Math.cos(e.yaw) * p.tx - Math.sin(e.yaw) * p.tz); }
      const lat = (e.x - p.x) * p.nx + (e.z - p.z) * p.nz, al = Math.abs(lat), sg = Math.sign(lat);
      if (al > this.HW + .7) { const k = Math.exp(-1.8 * dt); e.vx *= k; e.vz *= k; e.grass = true; } else e.grass = false;
      if (al > this.WALL) { e.x -= p.nx * sg * (al - this.WALL); e.z -= p.nz * sg * (al - this.WALL); const vn = (e.vx * p.nx + e.vz * p.nz) * sg; if (vn > 0) { e.vx -= 1.6 * vn * p.nx * sg; e.vz -= 1.6 * vn * p.nz * sg; if (vn > 3) { e.dr = 0; e.dch = 0; } if (vn > 5 && e.isMe) { sfx("ram"); W.shake = .25; } } } },
    rules(W, e, dt) { if (e.d) return; const { N, L, ds } = this.trk();
      if (e.pi !== undefined) { if (e.pi > N * .85 && e.si < N * .15) e.lap++; else if (e.pi < N * .15 && e.si > N * .85) e.lap--; } e.pi = e.si;
      e.f.dl = e.dr ? this.lvl(e.dch) + 1 : 0; if (e.boostT <= 0) e.f.bl = 0;
      { const fx = Math.cos(e.yaw), fz = -Math.sin(e.yaw); let behind = false;
        if (e.spd > 9 && e.boostT <= 0) for (const o of W.list) { if (o === e || o.gone || Math.abs((o.y || 0) - (e.y || 0)) > 1.6) continue; const dx = o.x - e.x, dz = o.z - e.z, dd = Math.hypot(dx, dz); if (dd < 2.2 || dd > 9) continue; if ((dx * fx + dz * fz) / dd > .95) { behind = true; break; } }
        e.drf = behind ? (e.drf || 0) + dt : Math.max(0, (e.drf || 0) - dt * 1.5);
        if (e.drf >= 1.2) { e.drf = 0; e.boostT = 1; e.f.bl = 4; e.vx += fx * 4; e.vz += fz * 4; if (e.isMe) { sfx("go"); W.shake = .12; } }
        e.f.sl = e.drf > .12 ? Math.round(e.drf / 1.2 * 10) / 10 : 0; }
      const prog = (e.lap - 1) * L + e.si * ds; e.sc = Math.max(0, Math.round(prog)); e.f.lap = e.lap;
      if (e.lap > this.LAPS) { e.sc = Math.round(this.LAPS * L) + Math.round((this.dur - W.t) * 20); e.fin = W.t; e.f.fin = W.t; e.d = true; if (e.isMe) { const pl = this.place(W, e); e.msg = pl === 1 ? "WINNER!" : `Finished P${pl}!`; e.msgT = W.t; sfx(pl === 1 ? "fanfare" : "coin"); } } },
    place(W, e) { return 1 + W.list.filter(o => o !== e && !o.gone && (o.f && o.f.fin !== undefined && e.f && e.f.fin !== undefined ? o.f.fin < e.f.fin : o.sc > e.sc)).length; },
    ramCd: () => 0, ramReady: () => true,
    cam(W, t, p, far) { const e = W.me, tg = new THREE.Vector3(e.x + (e.vx || 0) * .35, (e.gy || 0) * .8, e.z + (e.vz || 0) * .35); return [tg, tg.clone().add(new THREE.Vector3(0, 23 * far, 16 * far))]; },
    stickHint: fine => fine ? "WASD or arrow keys to drive. Hold Space while turning to drift, let go to boost." : "Drag anywhere to drive. Hold DRIFT while turning, let go to boost.",
    render(W, e, dt) {
      if (W.fxT !== W.t) { W.fxT = W.t; tyreStep(W, W.skid, dt, .05, () => false); puffStep(W, dt); crowdStep(W, null, .6);
        if (!W.eng && W.t > -2) W.eng = engineSnd(); if (W.eng) W.eng.set(Math.min(1, Math.hypot(W.me.vx, W.me.vz) / 16), .03, !W.me.d);
        const { S } = this.trk(), me = W.me, ms = S[me.si || 0] || S[0], fd = (L, on) => L.forEach(mt => { mt.opacity += ((on ? .22 : 1) - mt.opacity) * Math.min(1, dt * 6); mt.depthWrite = mt.opacity > .95; });
        fd(W.fadeOver, (me.gy || 0) < 1.5 && ms.under); fd(W.fadeTun, !!ms.tun || !!(S[((me.si || 0) + 12) % S.length].tun) || !!(S[((me.si || 0) + S.length - 12) % S.length].tun)); }
      if (e.gone) return; if (!e.local) { e.si = this.near(e); e.gy = this.trk().S[e.si].y; } const gy = e.gy || 0; const sp = Math.hypot(e.vx, e.vz), fx = Math.cos(e.yaw), fz = -Math.sin(e.yaw);
      const LC = ["#1E9BFF", "#FF7A00", "#B03BFF"], bl = (e.f && e.f.bl) || 1;
      if (e.boostT > 0 && Math.random() < dt * 40) W.fireL[bl - 1](e.x - fx * 1.2, .45 + gy, e.z - fz * 1.2, .6 + bl * .2 + Math.random() * .3, .4, .35);
      if (!e.wind) { e.wind = new THREE.InstancedMesh(new THREE.BoxGeometry(.6, .06, .06), new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: .3, depthWrite: false }), 8); e.wind.frustumCulled = false; W.sc.add(e.wind); }
      e.wind.visible = !!(e.f && e.f.sl) && !e.gone;
      if (e.wind.visible) { const o = W.wo || (W.wo = new THREE.Object3D()), lx = -fz, lz = fx, fr = Math.min(1, e.f.sl), nW = 2 + Math.round(fr * 6); e.wind.material.opacity = .2 + fr * .6; o.rotation.set(0, e.yaw, 0); for (let k = 0; k < 8; k++) { o.scale.setScalar(k < nW ? 1 : 0); const u = (W.t * 2.6 + k * .37) % 1, sd = (k % 2 ? 1 : -1) * (1.05 + (k % 4 > 1 ? .35 : 0)), h = .5 + (k % 3) * .45 + gy, f0 = 1.6 - u * 4.2 - .65;
          o.position.set(e.x + fx * f0 + lx * sd, h, e.z + fz * f0 + lz * sd); o.updateMatrix(); e.wind.setMatrixAt(k, o.matrix); } e.wind.instanceMatrix.needsUpdate = true; }
      const lv = ((e.f && e.f.dl) || 0) - 1;
      if (!e.glw) { e.glw = [0, 1].map(() => { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.glowTex, transparent: true, depthWrite: false })); g.visible = false; W.sc.add(g); return g; }); }
      e.glw.forEach((g, j) => { g.visible = lv >= 1 && !e.gone; if (!g.visible) return; const sd = j ? -.55 : .55; g.material.color.set(LC[lv - 1]); g.position.set(e.x - fx * .75 - fz * sd, .28 + e.y, e.z - fz * .75 + fx * sd); g.scale.setScalar((.8 + lv * .4) * (.85 + Math.random() * .3)); });
      if (lv >= 1 && lv > (e.plv ?? 0)) burst(W.sc, e.x - fx * .7, .5 + e.y, e.z - fz * .7, { n: 8 + lv * 5, shape: "ico", cols: [LC[lv - 1], LC[lv - 1], "#FFFFFF"], spd: 4 + lv, up: 3, grav: 9, life: .45, size: .16 + lv * .04 });
      e.plv = Math.max(0, lv);
      if (lv >= 1 && Math.random() < dt * (30 + lv * 15)) { const sd = Math.random() < .5 ? -.55 : .55, c = LC[lv - 1]; burst(W.sc, e.x - fx * .75 - fz * sd, .15 + gy, e.z - fz * .75 + fx * sd, { n: 1, shape: "ico", cols: [c, c, "#FFFFFF"], spd: 2.5 + lv, up: 2.5, grav: 12, life: .3, size: .12 + lv * .05 }); }
      if (sp < 6) return; const vf = e.vx * fx + e.vz * fz, vl = Math.abs(-e.vx * fz + e.vz * fx);
      if (e.grass && Math.random() < dt * 14) W.dust(e.x - fx * .9, .3 + gy, e.z - fz * .9, 1 + Math.random() * .6, 1, .9);
      if (vf < 1 || Math.atan2(vl, vf) < .3) return;
      wheelTrack(W.skid, e, true, W.t, .05 + gy);
      if (Math.random() < dt * 9) { const sd = Math.random() < .5 ? -.5 : .5; W.smoke(e.x - fx * .9 - fz * sd, .45 + gy, e.z - fz * .9 + fx * sd, .9 + Math.random() * .6, 1.4, .8 + Math.random() * .4); } },
    stop(W) { if (W.eng) W.eng.stop(); },
    prompt(W, e) { if (e.msg && W.t - e.msgT < 1.5) return e.msg; if (W.t < 0) return "Get ready…";
      return `P${this.place(W, e)}` + (this.LAPS > 1 ? `  ·  LAP ${Math.max(1, Math.min(this.LAPS, e.lap))}/${this.LAPS}` : `  ·  ${Math.max(0, Math.min(99, Math.round(e.sc / this.trk().L * 100)))}%`); },
    donePrompt(W, e) { return `Finished P${this.place(W, e)}!`; },
    bot(W, e, dt) { const { S, N } = this.trk(); if (!e.bs) e.bs = { sk: .75 + Math.random() * .25, off: (Math.random() - .5) * 3, ot: 0 };
      const b = e.bs; b.ot -= dt; if (b.ot <= 0) { b.ot = 1.5 + Math.random() * 2; b.off = (Math.random() - .5) * 4; }
      const i = e.si || 0, look = Math.round(12 + b.sk * 8 + e.spd * .6), q = S[(i + look) % N], far = S[(i + 34) % N], bend = Math.acos(Math.max(-1, Math.min(1, S[i].tx * far.tx + S[i].tz * far.tz)));
      let ix = far.tx - S[i].tx, iz = far.tz - S[i].tz; const il = Math.hypot(ix, iz) || 1; ix /= il; iz /= il; const io = e.dr ? 1.5 + (1 - b.sk) : 0;
      const s = steer(e, q.x + q.nx * b.off + ix * io, q.z + q.nz * b.off + iz * io, bend > 1.1 && e.spd > 10 + b.sk * 3 && !e.dr ? .6 : 1);
      const p = S[i], lat = Math.abs((e.x - p.x) * p.nx + (e.z - p.z) * p.nz), nb = S[(i + 18) % N], bnear = Math.acos(Math.max(-1, Math.min(1, p.tx * nb.tx + p.tz * nb.tz)));
      b.cd = Math.max(0, (b.cd || 0) - dt); if (!e.dr) { if (b.hold) b.cd = .7; b.hold = !b.cd && bend > .55 && e.spd > 8.5 && lat < this.HW - 1.8 && Math.random() < .2 + b.sk * .6; }
      else b.hold = lat < this.HW - .6 && (e.dch < .5 || ((bnear > .12 || bend > .3) && e.dch < 3 * b.sk + .4));
      if (b.hold && !e.dr) { let bs = Math.atan2(-far.tz, far.tx) - Math.atan2(-p.tz, p.tx); bs = Math.sign(Math.atan2(Math.sin(bs), Math.cos(bs))); s.x = Math.cos(e.yaw + bs * .6); s.y = -Math.sin(e.yaw + bs * .6); }
      s.hold = b.hold; return s; },
    botScore: () => 200 + rnd(300) }
});
