/* ---------- shared minigame scenery: ground textures, road wear, kerbs, verges, automatic tyre tracks ---------- */
/* Textures are drawn once per kind and cached (cosmetic, so Math.random is fine); texRep() gives a mesh its own repeat. */
const SCN_TEX = {};
function scnTex(kind, size, draw) {
	if (!SCN_TEX[kind]) {
		const t = canvasTex(size, size, draw);
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		SCN_TEX[kind] = t;
	}
	return SCN_TEX[kind];
}
function texRep(t, rx, ry) {
	const c = t.clone();
	c.needsUpdate = true;
	c.repeat.set(rx, ry);
	return c;
}
const scnR = Math.random;
/* soft blob that wraps across tile edges, so tiled textures show no seams */
function wrapBlob(x, w, h, px, py, rad, col0, col1) {
	const q = x.createRadialGradient(px, py, 0, px, py, rad);
	q.addColorStop(0, col0);
	q.addColorStop(1, col1);
	for (const ox of [-w, 0, w])
		for (const oy of [-h, 0, h]) {
			x.save();
			x.translate(ox, oy);
			x.fillStyle = q;
			x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
			x.restore();
		}
}
function specks(x, w, h, n, cols, s0, s1) {
	for (let i = 0; i < n; i++) {
		x.fillStyle = cols[i % cols.length];
		const z = s0 + scnR() * (s1 - s0);
		x.fillRect(scnR() * w, scnR() * h, z, z);
	}
}
/* 8 x 8 m of worn asphalt: aggregate grit, soft wear patches, a few sealed cracks */
const asphaltTex = () =>
	scnTex("asphalt", 256, (x, w, h) => {
		x.fillStyle = "#4A4F59";
		x.fillRect(0, 0, w, h);
		for (let i = 0; i < 18; i++)
			wrapBlob(
				x,
				w,
				h,
				scnR() * w,
				scnR() * h,
				20 + scnR() * 50,
				scnR() < 0.5 ? "rgba(30,33,40,.28)" : "rgba(120,124,132,.16)",
				"rgba(0,0,0,0)",
			);
		specks(x, w, h, 5200, ["rgba(20,22,28,.45)", "rgba(150,152,158,.35)", "rgba(95,98,106,.5)"], 0.6, 1.6);
		x.lineCap = "round";
		for (let i = 0; i < 4; i++) {
			let px = scnR() * w,
				py = scnR() * h;
			x.strokeStyle = i % 2 ? "rgba(28,30,36,.75)" : "rgba(22,24,28,.5)";
			x.lineWidth = i % 2 ? 1 : 2.4;
			x.beginPath();
			x.moveTo(px, py);
			for (let k = 0; k < 7; k++) {
				px += (scnR() - 0.5) * 30;
				py += scnR() * 14;
				x.lineTo(px, py);
			}
			x.stroke();
		}
	});
/* 10 x 10 m of lawn: mowing stripes, blade specks, a few tiny flowers */
const grassTex = () =>
	scnTex("grass", 256, (x, w, h) => {
		for (let i = 0; i < 5; i++) {
			x.fillStyle = i % 2 ? "#78C266" : "#83CC70";
			x.fillRect((i * w) / 5, 0, w / 5, h);
		}
		for (let i = 0; i < 10; i++)
			wrapBlob(x, w, h, scnR() * w, scnR() * h, 18 + scnR() * 30, "rgba(70,130,60,.22)", "rgba(70,130,60,0)");
		specks(x, w, h, 4200, ["rgba(60,120,50,.45)", "rgba(170,220,140,.4)", "rgba(90,150,70,.5)"], 0.8, 1.8);
		for (let i = 0; i < 70; i++) {
			x.fillStyle = ["#FFFFFF", "#FFE066", "#F7B8D2"][i % 3];
			x.beginPath();
			x.arc(scnR() * w, scnR() * h, 0.9 + scnR() * 0.6, 0, 6.283);
			x.fill();
		}
	});
/* 4 x 4 m of pavement: 0.5 m slabs with joints and slightly different tones */
const pavingTex = () =>
	scnTex("paving", 256, (x, w, h) => {
		const n = 8,
			c = w / n;
		for (let i = 0; i < n; i++)
			for (let j = 0; j < n; j++) {
				const v = 196 + Math.floor(scnR() * 18);
				x.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
				x.fillRect(i * c, j * c, c, c);
			}
		specks(x, w, h, 2400, ["rgba(90,96,108,.25)", "rgba(255,255,255,.3)"], 0.6, 1.4);
		x.strokeStyle = "rgba(110,116,128,.75)";
		x.lineWidth = 1.4;
		for (let i = 0; i <= n; i++) {
			x.beginPath();
			x.moveTo(i * c, 0);
			x.lineTo(i * c, h);
			x.moveTo(0, i * c);
			x.lineTo(w, i * c);
			x.stroke();
		}
		for (let i = 0; i < 6; i++)
			wrapBlob(x, w, h, scnR() * w, scnR() * h, 10 + scnR() * 16, "rgba(80,70,60,.18)", "rgba(80,70,60,0)");
	});
/* 8 x 8 m of quay concrete: big slabs, joints, rust and oil stains */
const concreteTex = () =>
	scnTex("concrete", 256, (x, w, h) => {
		x.fillStyle = "#A2A7AE";
		x.fillRect(0, 0, w, h);
		for (let i = 0; i < 14; i++)
			wrapBlob(
				x,
				w,
				h,
				scnR() * w,
				scnR() * h,
				14 + scnR() * 40,
				["rgba(120,90,60,.2)", "rgba(60,64,72,.22)", "rgba(220,224,230,.2)"][i % 3],
				"rgba(0,0,0,0)",
			);
		specks(x, w, h, 3600, ["rgba(70,74,82,.3)", "rgba(240,242,246,.3)"], 0.6, 1.5);
		x.strokeStyle = "rgba(70,74,82,.7)";
		x.lineWidth = 1.5;
		for (let i = 0; i <= 2; i++) {
			x.beginPath();
			x.moveTo((i * w) / 2, 0);
			x.lineTo((i * w) / 2, h);
			x.moveTo(0, (i * h) / 2);
			x.lineTo(w, (i * h) / 2);
			x.stroke();
		}
	});
/* a material for a flat box/plane of w x d metres using one of the textures above (tile = metres per texture repeat) */
function groundMat(tex, w, d, tile, o) {
	return new THREE.MeshStandardMaterial(
		Object.assign({ map: texRep(tex, w / tile, d / tile), roughness: 0.95 }, o || {}),
	);
}
function texBox(w, h, d, tex, tile, x, y, z, o) {
	const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), groundMat(tex, w, d, tile, o));
	m.position.set(x, y, z);
	m.receiveShadow = true;
	return m;
}
/* decal sprites drawn on one canvas sheet: manhole, patch, oil, drain grate, tar snake */
const wearSheet = () =>
	SCN_TEX.wear ||
	(SCN_TEX.wear = canvasTex(256, 256, (x) => {
		{
			// manhole (0,0)
			const c = 64;
			x.fillStyle = "#3A3E46";
			x.beginPath();
			x.arc(c, c, 60, 0, 6.283);
			x.fill();
			x.fillStyle = "#575C66";
			x.beginPath();
			x.arc(c, c, 52, 0, 6.283);
			x.fill();
			x.strokeStyle = "#3E434C";
			x.lineWidth = 4;
			for (let k = -40; k <= 40; k += 13) {
				const hw = Math.sqrt(52 * 52 - k * k);
				x.beginPath();
				x.moveTo(c - hw, c + k);
				x.lineTo(c + hw, c + k);
				x.stroke();
			}
			x.fillStyle = "#6A707A";
			x.fillRect(c - 16, c - 6, 32, 12);
		}
		{
			// repair patch (1,0): darker, smoother asphalt with a sealed edge
			x.beginPath();
			[
				[134, 12],
				[190, 9],
				[246, 14],
				[243, 70],
				[247, 118],
				[180, 115],
				[136, 119],
				[131, 60],
			].forEach(([a, b], i) => x[i ? "lineTo" : "moveTo"](a + (scnR() - 0.5) * 4, b + (scnR() - 0.5) * 4));
			x.closePath();
			x.fillStyle = "rgba(34,37,44,.3)";
			x.fill();
			x.strokeStyle = "rgba(20,22,26,.45)";
			x.lineWidth = 2.5;
			x.stroke();
			for (let i = 0; i < 500; i++) {
				x.fillStyle = "rgba(90,94,102,.3)";
				x.fillRect(134 + scnR() * 110, 10 + scnR() * 106, 1.2, 1.2);
			}
		}
		{
			// oil stain (0,1)
			for (let i = 0; i < 5; i++) {
				const px = 64 + (scnR() - 0.5) * 40,
					py = 192 + (scnR() - 0.5) * 40,
					r = 16 + scnR() * 22,
					q = x.createRadialGradient(px, py, 0, px, py, r);
				q.addColorStop(0, "rgba(14,12,12,.55)");
				q.addColorStop(1, "rgba(14,12,12,0)");
				x.fillStyle = q;
				x.fillRect(0, 128, 128, 128);
			}
		}
		{
			// drain grate (1,1)
			x.fillStyle = "#2A2D33";
			x.fillRect(150, 160, 84, 60);
			x.fillStyle = "#5E636D";
			for (let k = 0; k < 7; k++) x.fillRect(156 + k * 11, 166, 6, 48);
		}
	}));
/* scatter road wear over a strip: manholes, patches, oil stains, drains along the edges (one instanced mesh per kind) */
function roadWear(s, x0, x1, z0, z1, y, density = 1) {
	const sheet = wearSheet(),
		L = Math.abs(z1 - z0),
		zs = Math.min(z0, z1),
		kinds = [
			{ u: 0, v: 1, n: L / 28, sz: [0.95, 0.95], edge: false },
			{ u: 1, v: 1, n: L / 16, sz: [1.4, 3.2], edge: false, rnd: true },
			{ u: 0, v: 0, n: L / 9, sz: [1.2, 2.2], edge: false, rnd: true },
			{ u: 1, v: 0, n: L / 10, sz: [0.7, 0.5], edge: true },
		];
	kinds.forEach((k, ki) => {
		const n = Math.max(1, Math.round(k.n * density)),
			geo = new THREE.PlaneGeometry(1, 1),
			uv = geo.attributes.uv;
		for (let i = 0; i < uv.count; i++) uv.setXY(i, (k.u + uv.getX(i)) / 2, (k.v + uv.getY(i)) / 2);
		const im = new THREE.InstancedMesh(
				geo,
				new THREE.MeshBasicMaterial({
					map: sheet,
					transparent: true,
					depthWrite: false,
					polygonOffset: true,
					polygonOffsetFactor: -1 - ki * 0.5,
					polygonOffsetUnits: -2,
				}),
				n,
			),
			o = new THREE.Object3D();
		for (let i = 0; i < n; i++) {
			const z = zs + scnR() * L,
				sd = scnR() < 0.5 ? -1 : 1,
				x = k.edge ? (sd < 0 ? x0 + 0.45 : x1 - 0.45) : x0 + 0.8 + scnR() * (x1 - x0 - 1.6),
				a = k.rnd ? scnR() * 0.6 - 0.3 : 0,
				sc = k.rnd ? 0.7 + scnR() * 0.6 : 1;
			o.position.set(x, y + 0.002 * ki, z);
			o.rotation.set(-Math.PI / 2, 0, a + (k.edge ? Math.PI / 2 : 0));
			o.scale.set(k.sz[0] * sc, k.sz[1] * sc, 1);
			o.updateMatrix();
			im.setMatrixAt(i, o.matrix);
		}
		im.renderOrder = 1;
		s.add(im);
	});
}
/* kerbs along both road edges: "race" = red/white rumble blocks, "city" = concrete kerb with a dark gutter line */
function kerbs(s, xL, xR, z0, z1, style) {
	const L = Math.abs(z1 - z0),
		zc = (z0 + z1) / 2;
	[xL, xR].forEach((x, k) => {
		const sd = k ? 1 : -1;
		if (style === "race") {
			const n = Math.ceil(L / 1.2),
				g = new THREE.BoxGeometry(0.7, 0.14, 1.2),
				im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 0.6 }), n),
				o = new THREE.Object3D(),
				c = new THREE.Color();
			for (let i = 0; i < n; i++) {
				o.position.set(x + sd * 0.35, 0.07, Math.min(z0, z1) + 0.6 + i * 1.2);
				o.updateMatrix();
				im.setMatrixAt(i, o.matrix);
				im.setColorAt(i, c.set(i % 2 ? "#F4F6F9" : "#E5484D"));
			}
			im.receiveShadow = true;
			s.add(im);
		} else {
			const kb = B(0.32, 0.28, L, "#C4C9D2", x + sd * 0.16, 0.14, zc);
			kb.castShadow = false;
			s.add(kb);
		}
	});
}
/* tufts, flowers and pebbles on grass beside a road (instanced, cheap) */
function vergeScatter(s, xs, z0, z1, n = 400) {
	const L = Math.abs(z1 - z0),
		zs = Math.min(z0, z1),
		parts = [
			{ geo: new THREE.ConeGeometry(0.12, 0.42, 5), cols: ["#5FAE52", "#6DBB5C", "#4E9A45"], n, y: 0.18 },
			{
				geo: new THREE.IcosahedronGeometry(0.08, 0),
				cols: ["#FFFFFF", "#FFE066", "#F7B8D2", "#B9A3FF"],
				n: n * 0.35,
				y: 0.3,
			},
			{ geo: new THREE.IcosahedronGeometry(0.16, 0), cols: ["#9A9488", "#B5AE9F", "#7F7A70"], n: n * 0.2, y: 0.05 },
		];
	parts.forEach((P) => {
		const m = Math.round(P.n),
			im = new THREE.InstancedMesh(P.geo, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), m),
			o = new THREE.Object3D(),
			c = new THREE.Color();
		for (let i = 0; i < m; i++) {
			const [a, b] = xs[i % xs.length],
				sc = 0.7 + scnR() * 0.8;
			o.position.set(a + scnR() * (b - a), P.y * sc, zs + scnR() * L);
			o.rotation.set((scnR() - 0.5) * 0.4, scnR() * 6, (scnR() - 0.5) * 0.4);
			o.scale.set(sc, sc * (0.8 + scnR() * 0.6), sc);
			o.updateMatrix();
			im.setMatrixAt(i, o.matrix);
			im.setColorAt(i, c.set(P.cols[i % P.cols.length]));
		}
		s.add(im);
	});
}
/* automatic tyre tracks for games that move trucks themselves (lane games): speed from position change, call from stepMG */
function autoTracks(W, col, y, N = 1400, fade = 5) {
	W.autoTrk = tyreTracks(W, col, "#FFFFFF", N, fade, 1, true);
	W.autoTrk.y = y;
}
function autoTrkStep(W, dt) {
	const T = W.autoTrk;
	W.list.forEach((e) => {
		const px = e.atx === undefined ? e.x : e.atx,
			pz = e.atz === undefined ? e.z : e.atz,
			sp = Math.hypot(e.x - px, e.z - pz) / Math.max(dt, 0.001);
		e.atx = e.x;
		e.atz = e.z;
		wheelTrack(T, e, !(e.gone || e.falling || e.fly || !e.g.visible) && (e.y || 0) < 0.3 && sp > 1.5, W.t, T.y);
	});
	tyreFade(T, dt);
}
