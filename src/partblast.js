/* ---------- Blast Yard (free-for-all grid bomber on a demolition site) ----------
   A 13 x 11 grid (BY.C x BY.R cells of BY.T m): concrete pillars on every second cell (G 1), breakable cover on most open
   cells (G 2: crates, drums on a pallet, tyre stacks, brick blocks), from the seed. DROP leaves a dynamite bundle on your
   cell; it blows after BY.FUSE s in a cross reaching the bomber's range, stopped by pillars and by the first crate it
   breaks. A truck in a burning cell is out. Crates hide power-ups (more bombs, range, speed) that show once the flames die.
   From BY.SD s concrete blocks drop onto the grid in a spiral from the outside in (G 3), crushing whatever is there.
   Sync: each device moves its own trucks (the host also the CPUs) and shares its bombs as e.f.bm = [[id, cell, t, range]];
   every device runs the same explosions from those (chains resolved in time order), so crates and flames agree.
   Power-ups are claimed through W.claim (shared by the engine in e.c). An out truck shares e.f.ko = the bomber's key. */
const BY = {
	C: 13,
	R: 11,
	T: 2.3,
	FUSE: 2.6,
	FLT: 0.55 /* how long a blast burns (deadly) */,
	FLV: 0.8 /* how long it shows */,
	SPD: 5.2,
	SPDUP: 0.85,
	NB0: 1,
	NBMAX: 6,
	RG0: 1,
	RGMAX: 7,
	SPMAX: 4,
	FILL: 0.64 /* share of open cells with cover */,
	PU: 0.36 /* share of cover hiding a power-up */,
	SD: 78 /* sudden death: blocks start dropping */,
	SDGAP: 0.42,
	SDWARN: 1.6,
	SCALE: 0.66 /* trucks are shrunk to fit the lanes */,
	TAP: 0.22 /* DROP held shorter than this drops at your feet, longer aims a throw */,
	LOB0: 2 /* throw distance in tiles: LOB0 at once, LOB1 after LOBT s more */,
	LOB1: 4,
	LOBT: 2 /* s of holding from LOB0 to LOB1 (2 s for 2 tiles = a tile a second) */,
	FLY0: 0.3 /* a throw's flight time: FLY0 + FLYK per tile (the fuse keeps running) */,
	FLYK: 0.07,
	SPX: 64 /* scorch canvas px per tile */,
	SOOTF: 0.09 /* share of the scorch that fades every 2 s */,
	EMBER: 2.6 /* s a scorch's glowing rim takes to fade */,
	STORM: 3 /* sudden death brings a sandstorm, fading in over this many s */,
	WIND: 1.6 /* m/s the storm pushes trucks along the wind */,
};
/* spawn cells, corners first */
const BY_SP = [
	[0, 0],
	[12, 10],
	[12, 0],
	[0, 10],
	[6, 0],
	[6, 10],
	[0, 5],
	[12, 5],
];
const BY_PU = ["bomb", "fire", "speed"];
const byX = (c) => (c - (BY.C - 1) / 2) * BY.T,
	byZ = (r) => (r - (BY.R - 1) / 2) * BY.T,
	byCell = (x, z) => {
		const c = Math.round(x / BY.T + (BY.C - 1) / 2),
			r = Math.round(z / BY.T + (BY.R - 1) / 2);
		return c < 0 || r < 0 || c >= BY.C || r >= BY.R ? -1 : r * BY.C + c;
	};

/* ---------- models ---------- */
function byHazardTex() {
	return (
		BLD_TEX.byHaz ||
		(BLD_TEX.byHaz = canvasTex(128, 32, (x, w, h) => {
			x.fillStyle = "#F2C230";
			x.fillRect(0, 0, w, h);
			x.fillStyle = "#2A2D34";
			for (let i = -2; i < 9; i++) {
				x.beginPath();
				x.moveTo(i * 16, h);
				x.lineTo(i * 16 + 8, h);
				x.lineTo(i * 16 + 8 + h, 0);
				x.lineTo(i * 16 + h, 0);
				x.fill();
			}
		}))
	);
}
/* concrete pillar with a hazard band, a cap and a foot */
function byPillarModel(col = "#A3A9B2") {
	const g = new THREE.Group(),
		w = 1.9,
		h = 1.5;
	g.add(B(w + 0.1, 0.14, w + 0.1, "#8E949C", 0, 0.07, 0));
	g.add(B(w, h - 0.2, w, col, 0, 0.14 + (h - 0.2) / 2, 0));
	g.add(B(w + 0.06, 0.12, w + 0.06, "#BCC1C8", 0, h, 0));
	const band = new THREE.Mesh(
		new THREE.BoxGeometry(w + 0.05, 0.34, w + 0.05),
		new THREE.MeshStandardMaterial({ map: byHazardTex(), roughness: 0.75 }),
	);
	band.position.y = h - 0.42;
	g.add(band);
	/* lifting eyes on the cap */
	[-1, 1].forEach((s) => g.add(Cy(0.09, 0.09, 0.1, 6, "#5A6272", s * 0.55, h + 0.11, 0)));
	return g;
}
/* wooden crate filling a cell: planked box, a darker frame on every edge, a diagonal brace on each side */
function byCrateModel() {
	const g = new THREE.Group(),
		s = 1.66,
		h = 1.5,
		W0 = "#B97A3E",
		F = "#8A5428";
	g.add(B(s, h, s, W0, 0, h / 2, 0));
	for (const a of [-1, 1])
		for (const b of [-1, 1]) {
			/* corner posts stand proud of the rails between them; rails sit in from the face so no faces line up */
			g.add(B(0.24, h + 0.05, 0.24, F, (a * (s - 0.2)) / 2, (h + 0.05) / 2, (b * (s - 0.2)) / 2));
			g.add(B(s - 0.44, 0.18, 0.16, F, 0, b > 0 ? h - 0.08 : 0.11, (a * (s - 0.16)) / 2));
			g.add(B(0.16, 0.18, s - 0.44, F, (a * (s - 0.16)) / 2, b > 0 ? h - 0.08 : 0.11, 0));
		}
	const L = Math.hypot(s - 0.36, h - 0.34),
		ang = Math.atan2(h - 0.34, s - 0.36);
	for (let k = 0; k < 4; k++) {
		const q = new THREE.Group();
		q.rotation.y = (k * Math.PI) / 2;
		const br = B(L, 0.16, 0.06, F, 0, h / 2, s / 2 + 0.03);
		br.rotation.z = k % 2 ? ang : -ang;
		q.add(br);
		/* plank seams: slim raised slats either side of the brace */
		[-0.42, 0.42].forEach((y) => q.add(B(s - 0.5, 0.05, 0.03, "#A86C34", 0, h / 2 + y, s / 2 + 0.015)));
		g.add(q);
	}
	/* top boards */
	[-0.4, 0, 0.4].forEach((z) => g.add(B(s - 0.42, 0.04, 0.3, "#C68848", 0, h + 0.02, z)));
	return g;
}
/* four oil drums on a pallet */
function byDrumsModel() {
	const g = new THREE.Group(),
		P = "#A4733F";
	[-0.62, 0, 0.62].forEach((x) => g.add(B(0.16, 0.12, 1.8, "#7E5630", x, 0.06, 0)));
	[-0.72, -0.36, 0, 0.36, 0.72].forEach((z) => g.add(B(1.8, 0.05, 0.26, P, 0, 0.145, z)));
	const cols = ["#D4692E", "#D4692E", "#B5422C", "#D4692E"];
	[
		[-0.44, -0.44],
		[0.44, -0.44],
		[-0.44, 0.44],
		[0.44, 0.44],
	].forEach(([x, z], i) => {
		const c = cols[i],
			y0 = 0.17,
			dh = 1.3;
		g.add(Cy(0.4, 0.4, dh, 12, c, x, y0 + dh / 2, z));
		[0.04, dh / 3, (2 * dh) / 3, dh - 0.04].forEach((y) => g.add(Cy(0.425, 0.425, 0.06, 12, "#7A3A22", x, y0 + y, z)));
		g.add(Cy(0.34, 0.34, 0.03, 12, "#8E4428", x, y0 + dh + 0.015, z));
		g.add(Cy(0.06, 0.06, 0.06, 6, "#3A3F48", x + 0.17, y0 + dh + 0.04, z - 0.1));
	});
	return g;
}
/* a stack of three tyres */
function byTyresModel() {
	const g = new THREE.Group();
	for (let k = 0; k < 3; k++) {
		const t = garTyre(0.8, k === 2);
		t.position.set([0, 0.05, -0.04][k], 0.248 + k * 0.5, [0, -0.04, 0.05][k]);
		t.rotation.y = k * 0.7;
		g.add(t);
	}
	return g;
}
/* a block of brick wall: courses of bricks standing proud of a mortar core, loose bricks on top */
function byBricksModel() {
	const g = new THREE.Group(),
		s = 1.72,
		rows = 5,
		bh = 0.26,
		cols = ["#A64B35", "#B95A3E", "#9A4330"];
	g.add(B(s - 0.06, rows * bh, s - 0.06, "#C9B9A6", 0, (rows * bh) / 2, 0));
	let n = 0;
	for (let r = 0; r < rows; r++)
		for (let k = 0; k < 4; k++) {
			const q = new THREE.Group();
			q.rotation.y = (k * Math.PI) / 2;
			/* each corner belongs to one face per course (alternating), so bricks from two faces never overlap */
			const off = (r % 2) * 0.215,
				lim = (r + k) % 2 ? 0.79 : 0.88;
			for (let i = -3; i <= 3; i++) {
				const x0 = Math.max(-lim, i * 0.43 + off - 0.2),
					x1 = Math.min(lim, i * 0.43 + off + 0.2);
				if (x1 - x0 < 0.12) continue;
				q.add(B(x1 - x0, bh - 0.04, 0.08, cols[n++ % 3], (x0 + x1) / 2, r * bh + bh / 2, s / 2 - 0.02));
			}
			g.add(q);
		}
	[
		[-0.3, 0.2, 0.3],
		[0.25, -0.3, -0.6],
		[0.35, 0.35, 1.2],
	].forEach(([x, z, ry]) => {
		const b = B(0.4, 0.2, 0.2, cols[n++ % 3], x, rows * bh + 0.1, z);
		b.rotation.y = ry;
		g.add(b);
	});
	return g;
}
/* dynamite bundle: four sticks upright, two tape bands, a wick */
function byBombModel() {
	const g = new THREE.Group(),
		red = new THREE.MeshStandardMaterial({
			color: "#D7372B",
			emissive: "#FF2A10",
			emissiveIntensity: 0,
			roughness: 0.6,
			fog: false /* shows through the sandstorm */,
		}),
		tape = M("#22252C");
	[
		[-0.17, -0.17],
		[0.17, -0.17],
		[-0.17, 0.17],
		[0.17, 0.17],
	].forEach(([x, z]) => {
		const c = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.9, 10), red);
		c.position.set(x, 0.45, z);
		c.castShadow = true;
		g.add(c);
		g.add(Cy(0.13, 0.13, 0.03, 10, "#E8DCC0", x, 0.91, z));
	});
	[0.25, 0.68].forEach((y) => {
		const t = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.12, 14), tape);
		t.position.y = y;
		g.add(t);
	});
	const wick = new THREE.Group();
	wick.position.set(0, 0.92, 0);
	const wm = Cy(0.04, 0.04, 0.45, 5, "#E8DCC0", 0, 0.225, 0);
	wm.rotation.z = 0.25;
	wick.add(wm);
	g.add(wick);
	return { g, red, wick };
}
/* ruined brick building behind the yard: a broken back wall with window holes, a side wall, a floor slab with rebar */
function byRuinModel() {
	const g = new THREE.Group(),
		BR = "#A9573F",
		BR2 = "#94493A",
		CON = "#A7ABB2";
	g.add(B(11.6, 0.3, 4.4, "#8E949C", 0, 0.15, 0));
	const tops = [5.2, 6.1, 5.8, 4.6, 4.9, 3.6, 2.8, 3.3, 2.2, 1.6, 1.2];
	tops.forEach((h, i) => {
		const x = -5 + i,
			win = i % 3 === 1 && h > 3.4;
		if (win) {
			g.add(B(1, 1.9, 0.5, i % 2 ? BR : BR2, x, 1.25, -1.9));
			g.add(B(1, h - 3.3, 0.5, i % 2 ? BR : BR2, x, 3.3 + (h - 3.3) / 2, -1.9));
			g.add(B(1.04, 0.14, 0.62, CON, x, 2.25, -1.85));
		} else g.add(B(1, h, 0.5, i % 2 ? BR : BR2, x, 0.3 + h / 2 - 0.15, -1.9));
		/* brick courses standing proud on the front */
		for (let y = 0.6; y < h - 0.2; y += 0.6)
			if (!win || y < 2.1 || y > 3.4) g.add(B(0.96, 0.06, 0.04, "#C07058", x, y, -1.63));
	});
	/* side wall, stepped down */
	[3.8, 3.2, 2.4, 1.5].forEach((h, i) => g.add(B(0.5, h, 1, i % 2 ? BR : BR2, -5.32, 0.15 + h / 2, -1.4 + i * 1)));
	/* first floor slab, broken off, rebar sticking out */
	g.add(B(4.5, 0.3, 2.4, CON, -2.85, 3.25, -0.65));
	g.add(B(1.6, 0.3, 1.4, CON, -0.1, 3.0, -1.1).rotateZ(-0.2));
	for (let i = 0; i < 6; i++) {
		const r = B(0.05, 0.05, 0.9, "#6B4A3A", -4.6 + i * 0.7, 3.25, 0.95);
		r.rotation.x = 0.3 - (i % 3) * 0.2;
		g.add(r);
	}
	/* columns under the slab */
	[-4.7, -1].forEach((x) => g.add(B(0.4, 2.9, 0.4, CON, x, 1.75, 0.3)));
	/* rubble heaps */
	const rub = (x, z, n, sc) => {
		for (let i = 0; i < n; i++) {
			const a = i * 2.4,
				rr = (i % 4) * 0.25 * sc,
				m = mesh(new THREE.IcosahedronGeometry(0.28 * sc * (0.7 + (i % 3) * 0.25), 0), i % 3 ? BR : CON);
			m.position.set(x + Math.cos(a) * rr, 0.3 + 0.12 * sc - (rr / sc) * 0.3, z + Math.sin(a) * rr);
			m.rotation.set(a, a * 0.7, 0);
			g.add(m);
		}
	};
	rub(2.2, -0.6, 12, 1.4);
	rub(4.3, 0.8, 8, 1);
	rub(-3.2, 1.4, 7, 0.9);
	return g;
}
/* chain-link fence panel texture: a diamond mesh, cut out with alphaTest (no soft edges, so no speckle) */
function byFenceTex() {
	return (
		BLD_TEX.byFence ||
		(BLD_TEX.byFence = (() => {
			const t = canvasTex(64, 64, (x, w, h) => {
				x.strokeStyle = "#fff";
				x.lineWidth = 3;
				for (let i = -1; i <= 1; i++) {
					x.beginPath();
					x.moveTo(i * w, 0);
					x.lineTo(i * w + w, h);
					x.moveTo(i * w + w, 0);
					x.lineTo(i * w, h);
					x.stroke();
				}
			});
			t.wrapS = t.wrapT = THREE.RepeatWrapping;
			return t;
		})())
	);
}
/* power-up badge icons */
function byIconTex(kind) {
	const k = "byIc" + kind;
	return (
		BLD_TEX[k] ||
		(BLD_TEX[k] = canvasTex(128, 128, (x, w, h) => {
			const c = w / 2;
			x.fillStyle = "#FFC83D";
			x.fillRect(0, 0, w, h);
			x.fillStyle = "#FFE27A";
			x.beginPath();
			x.arc(c, c, 52, 0, 6.283);
			x.fill();
			x.lineWidth = 6;
			x.strokeStyle = "#E0A21C";
			x.stroke();
			if (kind === "fire") {
				x.fillStyle = "#E5484D";
				x.beginPath();
				x.moveTo(c, 18);
				x.bezierCurveTo(c + 40, 52, c + 38, 100, c, 106);
				x.bezierCurveTo(c - 38, 100, c - 40, 62, c - 14, 40);
				x.bezierCurveTo(c - 12, 58, c - 4, 62, c, 60);
				x.bezierCurveTo(c - 4, 46, c - 6, 32, c, 18);
				x.fill();
				x.fillStyle = "#FF9A2E";
				x.beginPath();
				x.ellipse(c, 86, 15, 18, 0, 0, 6.283);
				x.fill();
			} else if (kind === "bomb") {
				x.fillStyle = "#D7372B";
				[-21, -7, 7, 21].forEach((o) => x.fillRect(c + o - 6, 44, 12, 56));
				x.fillStyle = "#22252C";
				x.fillRect(c - 30, 56, 60, 8);
				x.fillRect(c - 30, 82, 60, 8);
				x.strokeStyle = "#3A3F48";
				x.lineWidth = 4;
				x.beginPath();
				x.moveTo(c, 44);
				x.quadraticCurveTo(c + 6, 30, c + 16, 24);
				x.stroke();
				x.fillStyle = "#FF8A1F";
				x.beginPath();
				x.arc(c + 18, 22, 7, 0, 6.283);
				x.fill();
			} else {
				x.fillStyle = "#2A2F3A";
				x.beginPath();
				x.arc(c, c, 36, 0, 6.283);
				x.fill();
				x.fillStyle = "#C9CED8";
				x.beginPath();
				x.arc(c, c, 18, 0, 6.283);
				x.fill();
				x.fillStyle = "#2A2F3A";
				x.beginPath();
				x.arc(c, c, 6, 0, 6.283);
				x.fill();
				x.strokeStyle = "#2F7DE1";
				x.lineWidth = 6;
				x.lineCap = "round";
				[0, 1, 2].forEach((i) => {
					x.beginPath();
					x.moveTo(c - 58, c - 16 + i * 16);
					x.lineTo(c - 42 + (i % 2) * 4, c - 16 + i * 16);
					x.stroke();
				});
			}
		}))
	);
}
/* copies of a baked kit as one InstancedMesh per material, each copy hideable (hide(i) scales it to nothing) */
function byInst(s, kit, list, shadow = 0.3) {
	const parts = kit.map(({ geo, mat }) => ({ geo, mat }));
	if (shadow && kit.foot)
		parts.push({ geo: kit.shGeo || (kit.shGeo = kitShadowGeo(kit)), mat: shadowMat(shadow), sh: 1 });
	const o = new THREE.Object3D(),
		ims = parts.map(({ geo, mat, sh }) => {
			const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
			im.count = list.length;
			im.castShadow = im.receiveShadow = !sh;
			if (sh) im.renderOrder = 1;
			im.frustumCulled = false;
			s.add(im);
			return im;
		});
	const put = (i, x, y, z, ry, sc) => {
		o.position.set(x, y, z);
		o.rotation.set(0, ry || 0, 0);
		o.scale.setScalar(sc);
		o.updateMatrix();
		ims.forEach((im) => {
			im.setMatrixAt(i, o.matrix);
			im.instanceMatrix.needsUpdate = true;
		});
	};
	list.forEach((q, i) => put(i, q.x, q.y || 0, q.z, q.ry, q.sc === undefined ? 1 : q.sc));
	return { ims, put, hide: (i) => put(i, 0, -50, 0, 0, 0.0001) };
}

Object.assign(MG, {
	blast: {
		name: "Blast Yard",
		kind: "arena",
		ctrl: "stick",
		hi: true,
		dur: 120,
		lastStanding: true,
		bound: { t: "sq", h: 15 },
		water: false,
		bare: true,
		/* light panel: ambient 0.36, sun 0.74, height 38, angle 41°, warmth 0.50, haze 50, smooth edges */
		sun: [13.9, 38, 12.1],
		lt: { amb: 0.36, sun: 0.74, warm: 0.5, haze: 50 },
		fx: { aa: 1 },
		ramLabel: "DROP",
		controls: [
			["stick", "Drive"],
			["DROP", "Tap: drop dynamite", "Hold to aim, let go to throw it over walls"],
		],
		how: "Blast crates for power-ups and trap your rivals in the flames. Tap DROP to drop dynamite, hold it to throw!",
		noCollide: () => true,
		/* every CPU and remote truck gets the same model: shrink the truck to fit a lane */
		initEnt(W, e) {
			e.tr.scale.setScalar(BY.SCALE);
			e.g.children.forEach((o) => {
				if (o.userData.disc) o.scale.set(0.8, 1, 0.8);
			});
			e.nb = BY.NB0;
			e.rg = BY.RG0;
			e.spl = 0;
			e.pass = new Set();
			e.f.bm = [];
			e.bn = 0;
		},
		kits() {
			return [
				byPillarModel(),
				byPillarModel("#8E949C"),
				byCrateModel(),
				byDrumsModel(),
				byTyresModel(),
				byBricksModel(),
				byRuinModel(),
			].map((m) => bakeKit(m));
		},
		spawn(W, i, n) {
			const [c, r] = BY_SP[i % BY_SP.length],
				x = byX(c),
				z = byZ(r);
			return {
				x,
				z,
				yaw: Math.abs(x) > Math.abs(z) * 1.2 ? (x > 0 ? Math.PI : 0) : z > 0 ? Math.PI / 2 : -Math.PI / 2,
			};
		},
		build(W) {
			const s = W.sc,
				rng = mulberry((W.mg.seed || 1) + 4242),
				C = BY.C,
				R = BY.R,
				T = BY.T,
				N = C * R,
				n = W.plist.length;
			/* the grid: pillars, cover from the seed, spawn corners kept clear */
			const G = new Int8Array(N),
				clear = new Set();
			for (let i = 0; i < Math.min(n, BY_SP.length); i++) {
				const [c, r] = BY_SP[i];
				/* the spawn, two cells along each way and the cells beside those: room to dodge your first bomb */
				[
					[0, 0],
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1],
					[2, 0],
					[-2, 0],
					[0, 2],
					[0, -2],
					[2, 1],
					[2, -1],
					[-2, 1],
					[-2, -1],
					[1, 2],
					[-1, 2],
					[1, -2],
					[-1, -2],
				].forEach(([dc, dr]) => {
					const cc = c + dc,
						rr = r + dr;
					if (cc >= 0 && rr >= 0 && cc < C && rr < R) clear.add(rr * C + cc);
				});
			}
			const kind = new Int8Array(N),
				pu = {};
			for (let r = 0; r < R; r++)
				for (let c = 0; c < C; c++) {
					const ci = r * C + c;
					if (c % 2 === 1 && r % 2 === 1) G[ci] = 1;
					else {
						const a = rng(),
							b = rng(),
							k = rng(),
							tp = rng();
						if (!clear.has(ci) && a < BY.FILL) {
							G[ci] = 2;
							kind[ci] = Math.floor(k * 4);
							if (b < BY.PU) pu[ci] = BY_PU[tp < 0.4 ? 0 : tp < 0.8 ? 1 : 2];
						}
					}
				}
			W.G = G;
			W.pu = pu;
			W.bombs = {};
			W.bAt = {};
			W.bdone = new Set();
			W.flC = {};
			W.flames = [];
			W.picks = {};
			W.kills = {};
			/* sudden death order: rings from the outside in, each clockwise from the top left */
			W.sd = [];
			{
				let c0 = 0,
					r0 = 0,
					c1 = C - 1,
					r1 = R - 1,
					t = BY.SD;
				const add = (c, r) => {
					const ci = r * C + c;
					if (G[ci] !== 1) {
						W.sd.push({ ci, t });
						t += BY.SDGAP;
					}
				};
				while (c0 <= c1 && r0 <= r1) {
					for (let c = c0; c <= c1; c++) add(c, r0);
					for (let r = r0 + 1; r <= r1; r++) add(c1, r);
					if (r1 > r0) for (let c = c1 - 1; c >= c0; c--) add(c, r1);
					if (c1 > c0) for (let r = r1 - 1; r > r0; r--) add(c0, r);
					c0++;
					r0++;
					c1--;
					r1--;
				}
				W.sdI = 0;
			}
			this.ground(W, rng);
			this.yardProps(W, rng);
			/* pillars and cover */
			const pil = [];
			for (let ci = 0; ci < N; ci++) if (G[ci] === 1) pil.push({ x: byX(ci % C), z: byZ(Math.floor(ci / C)) });
			const pk = bakeKit(byPillarModel());
			byInst(s, pk, pil, 0.32);
			W.sdKit = byInst(
				s,
				bakeKit(byPillarModel("#8E949C")),
				W.sd.map(() => ({ x: 0, y: -50, z: 0, sc: 0.0001 })),
				0,
			);
			const kits = [byCrateModel(), byDrumsModel(), byTyresModel(), byBricksModel()].map((m) => bakeKit(m)),
				lists = [[], [], [], []];
			W.cov = {};
			for (let ci = 0; ci < N; ci++)
				if (G[ci] === 2) {
					const k = kind[ci],
						L = lists[k];
					W.cov[ci] = [k, L.length];
					L.push({ x: byX(ci % C), z: byZ(Math.floor(ci / C)), ry: Math.floor(rng() * 4) * (Math.PI / 2) });
				}
			W.covI = kits.map((kit, k) => byInst(s, kit, lists[k], 0.3));
			W.kind = kind;
			/* pools: bombs, flames (beams along the arms, rounded tips, glowing floor tiles), drop warnings, scorch marks */
			W.bPool = [];
			const inst = (geo, mat, n) => {
				const im = new THREE.InstancedMesh(geo, mat, n);
				/* the colour buffer is sized by count when first made, so make it before count drops to 0 */
				im.setColorAt(0, new THREE.Color("#fff"));
				im.count = 0;
				im.frustumCulled = false;
				s.add(im);
				return im;
			};
			W.beam = inst(
				new THREE.CylinderGeometry(1, 1, 1, 12, 1, true),
				new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false }),
				400,
			);
			W.ball = inst(
				new THREE.SphereGeometry(1, 14, 8),
				new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, fog: false }),
				400,
			);
			W.glow = inst(
				new THREE.PlaneGeometry(T * 0.94, T * 0.94).rotateX(-Math.PI / 2),
				new THREE.MeshBasicMaterial({
					color: "#ffffff",
					transparent: true,
					depthWrite: false,
					blending: THREE.AdditiveBlending,
					polygonOffset: true,
					polygonOffsetFactor: -4,
					toneMapped: false,
					fog: false,
				}),
				400,
			);
			W.glow.renderOrder = 2;
			/* blast preview: the tiles a ticking bomb will reach glow red */
			W.prev = inst(W.glow.geometry, W.glow.material.clone(), 400);
			W.prev.renderOrder = 2;
			W.aimM = {};
			/* sudden-death warnings: the block's shadow growing on its tile, a red outline blinking faster as it nears */
			W.warn = [];
			const shTex = canvasTex(64, 64, (x, w, h) => {
				x.fillStyle = "#000";
				x.fillRect(0, 0, w, h);
				const q = x.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w * 0.62);
				q.addColorStop(0, "#fff");
				q.addColorStop(0.55, "#fff");
				q.addColorStop(1, "#000");
				x.fillStyle = q;
				x.fillRect(0, 0, w, h);
			});
			for (let i = 0; i < 6; i++) {
				const sh = new THREE.Mesh(
						new THREE.PlaneGeometry(T * 0.95, T * 0.95).rotateX(-Math.PI / 2),
						new THREE.MeshBasicMaterial({
							color: "#23272F",
							alphaMap: shTex,
							transparent: true,
							opacity: 0.5,
							depthWrite: false,
							polygonOffset: true,
							polygonOffsetFactor: -3,
						}),
					),
					ol = new THREE.Mesh(
						new THREE.RingGeometry(T * 0.42, T * 0.5, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2),
						new THREE.MeshBasicMaterial({
							color: "#E5484D",
							transparent: true,
							depthWrite: false,
							polygonOffset: true,
							polygonOffsetFactor: -4,
						}),
					);
				sh.renderOrder = ol.renderOrder = 2;
				sh.visible = ol.visible = false;
				s.add(sh, ol);
				W.warn.push({ sh, ol });
			}
			const mask = (w, h, fn) =>
				canvasTex(w, h, (x) => {
					const im = x.createImageData(w, h);
					for (let j = 0; j < h; j++)
						for (let i = 0; i < w; i++) {
							const v = Math.max(0, Math.min(255, Math.round(fn(i / (w - 1), j / (h - 1)) * 255))),
								p = (j * w + i) * 4;
							im.data[p] = im.data[p + 1] = im.data[p + 2] = v;
							im.data[p + 3] = 255;
						}
					x.putImageData(im, 0, 0);
				});
			/* scorch: every blast is painted into one canvas laid exactly over the grid (BY.SPX px a tile): its cross outline
			   with jagged ends, soot streaks and specks inside; a second, coarser canvas holds the glowing rims that fade after
			   each blast (redrawn only while one is glowing). Both are opaque masks (no speckle on phones): the soot one is
			   the alpha of a dark plane, the glow one is added on top. */
			{
				const mk = (k) => {
						const c = document.createElement("canvas");
						c.width = BY.C * BY.SPX * k;
						c.height = BY.R * BY.SPX * k;
						const x = c.getContext("2d");
						x.fillStyle = "#000";
						x.fillRect(0, 0, c.width, c.height);
						const t = new THREE.CanvasTexture(c);
						t.minFilter = THREE.LinearFilter;
						t.generateMipmaps = false;
						return { c, x, t, k };
					},
					geo = new THREE.PlaneGeometry(BY.C * T, BY.R * T).rotateX(-Math.PI / 2);
				W.soot = mk(1);
				W.ember = mk(0.5);
				const a = new THREE.Mesh(
						geo,
						new THREE.MeshBasicMaterial({
							color: "#24180F",
							alphaMap: W.soot.t,
							transparent: true,
							depthWrite: false,
							polygonOffset: true,
							polygonOffsetFactor: -1,
						}),
					),
					b = new THREE.Mesh(
						geo,
						new THREE.MeshBasicMaterial({
							map: W.ember.t,
							transparent: true,
							depthWrite: false,
							blending: THREE.AdditiveBlending,
							polygonOffset: true,
							polygonOffsetFactor: -2,
							toneMapped: false,
							fog: false,
						}),
					);
				a.position.y = 0.012;
				b.position.y = 0.014;
				a.renderOrder = 1;
				b.renderOrder = 2;
				b.visible = false;
				s.add(a, b);
				W.emberM = b;
				W.glowL = [];
			}
			/* shockwave rings rolling out along the floor, flying debris */
			W.waves = [];
			W.deb = [];
			/* sandstorm (sudden death): the wind blows across the TV picture, which way from the seed; dust streaks fly with it */
			W.windDir = mulberry((W.mg.seed || 1) + 99)() < 0.5 ? 1 : -1;
			W.dust = new THREE.InstancedMesh(
				new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
				new THREE.MeshBasicMaterial({
					color: "#EAD5AA",
					alphaMap: mask(
						128,
						16,
						(u, v) => Math.sin(u * Math.PI) * Math.pow(Math.max(0, 1 - Math.abs(v - 0.5) * 2), 1.5),
					),
					transparent: true,
					depthWrite: false,
					fog: false,
				}),
				80,
			);
			W.dust.count = 0;
			W.dust.frustumCulled = false;
			W.dust.renderOrder = 4;
			s.add(W.dust);
			W.dustP = [];
			{
				const q = mulberry((W.mg.seed || 1) + 7);
				for (let i = 0; i < 80; i++)
					W.dustP.push({
						x0: q() * 48,
						z: (q() - 0.5) * 34,
						y: 0.4 + q() * 4.5,
						v: 9 + q() * 9,
						l: 2.5 + q() * 4.5,
						w: 0.12 + q() * 0.22,
					});
			}
			W.debG = {
				plank: new THREE.BoxGeometry(1.35, 0.12, 0.3),
				brick: new THREE.BoxGeometry(0.4, 0.22, 0.2),
				drum: new THREE.CylinderGeometry(0.4, 0.4, 1.3, 12).rotateZ(Math.PI / 2),
				band: new THREE.CylinderGeometry(0.425, 0.425, 0.07, 12).rotateZ(Math.PI / 2),
				tyre: new THREE.TorusGeometry(0.56, 0.24, 8, 16).rotateY(Math.PI / 2),
			};
			W.scorchTex = canvasTex(128, 128, (x, w, h) => {
				const q = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
				q.addColorStop(0, "rgba(20,14,10,.6)");
				q.addColorStop(0.5, "rgba(28,20,14,.35)");
				q.addColorStop(1, "rgba(28,20,14,0)");
				x.fillStyle = q;
				x.fillRect(0, 0, w, h);
			});
			W.flash = new THREE.PointLight("#FFB25A", 0, 26);
			s.add(W.flash);
		},
		ground(W, rng) {
			const s = W.sc,
				C = BY.C,
				R = BY.R,
				T = BY.T,
				gw = C * T,
				gd = R * T;
			/* yard dirt all round */
			const fl = new THREE.Mesh(new THREE.CircleGeometry(95, 40), groundMat(dirtTex(), 190, 190, 8));
			fl.rotation.x = -Math.PI / 2;
			fl.position.y = -0.04;
			fl.receiveShadow = true;
			s.add(fl);
			/* the slab: pale concrete tiles with soft joints and a faint tint per tile */
			const px = 64,
				tex = canvasTex(C * px, R * px, (x, w, h) => {
					for (let r = 0; r < R; r++)
						for (let c = 0; c < C; c++) {
							const v = Math.floor(rng() * 10) - 5;
							x.fillStyle = `rgb(${190 + v},${187 + v},${180 + v})`;
							x.fillRect(c * px, r * px, px, px);
						}
					x.strokeStyle = "rgba(120,118,112,.55)";
					x.lineWidth = 2;
					for (let c = 0; c <= C; c++) {
						x.beginPath();
						x.moveTo(c * px, 0);
						x.lineTo(c * px, h);
						x.stroke();
					}
					for (let r = 0; r <= R; r++) {
						x.beginPath();
						x.moveTo(0, r * px);
						x.lineTo(w, r * px);
						x.stroke();
					}
					for (let i = 0; i < 9; i++)
						wrapBlob(x, w, h, rng() * w, rng() * h, 30 + rng() * 50, "rgba(110,96,80,.07)", "rgba(110,96,80,0)");
				}),
				slab = new THREE.Mesh(
					new THREE.BoxGeometry(gw, 0.2, gd),
					new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }),
				);
			slab.position.y = -0.1;
			slab.receiveShadow = true;
			s.add(slab);
			/* kerb all round: concrete with a yellow top edge */
			const k = 0.6,
				kh = 0.55;
			[
				[0, -gd / 2 - k / 2, gw + 2 * k, k],
				[0, gd / 2 + k / 2, gw + 2 * k, k],
				[-gw / 2 - k / 2, 0, k, gd],
				[gw / 2 + k / 2, 0, k, gd],
			].forEach(([x, z, w, d]) => {
				s.add(B(w, kh, d, "#9EA3AB", x, kh / 2 - 0.05, z));
				s.add(B(w + 0.02, 0.08, d + 0.02, "#F2C230", x, kh - 0.01, z));
			});
			/* chain-link fence just outside the kerb: posts, a top rail, mesh panels */
			const fh = 1.5,
				fo = 1.4,
				fm = new THREE.MeshStandardMaterial({
					color: "#8E96A3",
					map: byFenceTex(),
					alphaTest: 0.5,
					side: THREE.DoubleSide,
					roughness: 0.6,
					metalness: 0.3,
				}),
				hx = gw / 2 + fo,
				hz = gd / 2 + fo;
			const side = (x0, z0, x1, z1) => {
				const L = Math.hypot(x1 - x0, z1 - z0),
					n = Math.ceil(L / 2.6),
					ry = Math.atan2(-(z1 - z0), x1 - x0);
				for (let i = 0; i <= n; i++) {
					const t = i / n;
					s.add(Cy(0.06, 0.06, fh + 0.1, 6, "#6E7680", x0 + (x1 - x0) * t, (fh + 0.1) / 2, z0 + (z1 - z0) * t));
				}
				const rail = B(L, 0.07, 0.07, "#6E7680", (x0 + x1) / 2, fh, (z0 + z1) / 2);
				rail.rotation.y = ry;
				s.add(rail);
				const geo = new THREE.PlaneGeometry(L, fh - 0.15),
					uv = geo.attributes.uv;
				for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * L) / 0.5, (uv.getY(i) * (fh - 0.15)) / 0.5);
				const p = new THREE.Mesh(geo, fm);
				p.position.set((x0 + x1) / 2, (fh - 0.15) / 2 + 0.05, (z0 + z1) / 2);
				p.rotation.y = ry;
				p.userData.fence = true;
				s.add(p);
			};
			side(-hx, -hz, hx, -hz);
			side(-hx, hz, -3, hz);
			side(3, hz, hx, hz);
			side(-hx, -hz, -hx, hz);
			side(hx, -hz, hx, hz);
		},
		yardProps(W, rng) {
			const s = W.sc,
				gw = (BY.C * BY.T) / 2,
				gd = (BY.R * BY.T) / 2;
			/* back: the ruin, the sign, light towers in the corners */
			const ruin = bakeKit(byRuinModel()),
				cabin = bakeKit(siteCabinModel("#F4F6F9", "#FF8A1F", "BLAST CREW")),
				tower = bakeKit(lightTowerModel()),
				exc = bakeKit(excavatorModel()),
				crates = [0, 1, 2, 3].map((v) => bakeKit(crateModel(v))),
				tyres = bakeKit(garTyres(0.55, 3)),
				drums = bakeKit(byDrumsModel());
			placeKits(s, [ruin], [{ k: 0, x: -3.5, z: -gd - 4.6 }], 0.35);
			placeKits(
				s,
				[tower],
				[
					{ k: 0, x: -gw - 3.2, z: -gd - 2.6, ry: 0.75 },
					{ k: 0, x: gw + 3.2, z: -gd - 2.6, ry: -0.75 },
				],
				0.3,
			);
			placeKits(s, [cabin], [{ k: 0, x: gw + 4.4, z: 2.5, ry: -Math.PI / 2 }], 0.35);
			placeKits(s, [exc], [{ k: 0, x: -gw - 5.2, z: -3.5, ry: 0.4, sc: 0.85 }], 0.35);
			placeKits(
				s,
				crates,
				[
					{ k: 0, x: 6.5, y: 0.4, z: -gd - 3, ry: 0.1 },
					{ k: 1, x: 7.6, y: 0.4, z: -gd - 3.1, ry: -0.2 },
					{ k: 2, x: 7, y: 1.2, z: -gd - 3, ry: 0.4 },
					{ k: 3, x: gw + 3.4, y: 0.4, z: -6.5, ry: 0.3 },
					{ k: 0, x: gw + 3.3, y: 0.4, z: -5.3, ry: -0.1 },
					{ k: 1, x: -gw - 3.2, y: 0.4, z: 7.5, ry: 0.2 },
					{ k: 2, x: gw + 3, y: 0.4, z: gd + 2.6, ry: 0.5 },
				],
				0.3,
			);
			placeKits(
				s,
				[tyres, drums],
				[
					{ k: 0, x: -gw - 3, z: 4.6 },
					{ k: 0, x: -gw - 3.6, z: 5.8 },
					{ k: 1, x: gw + 3.2, z: -9.5, ry: 0.3 },
					{ k: 1, x: 10.5, z: -gd - 3.2, ry: -0.2 },
					{ k: 0, x: -gw - 2.8, z: gd + 2.4 },
				],
				0.3,
			);
			/* cones along the front gap and by the corners */
			[
				[-3.2, gd + 1.6],
				[3.2, gd + 1.6],
				[-gw - 1.8, gd + 1.2],
				[gw + 1.9, -gd - 1.5],
				[gw + 2.2, 7.5],
				[-gw - 2.1, -9.5],
			].forEach(([x, z]) => {
				s.add(
					mesh(new THREE.ConeGeometry(0.28, 0.8, 10), "#FF7A1A")
						.translateX(x)
						.translateY(0.42)
						.translateZ(z),
				);
				s.add(B(0.62, 0.06, 0.62, "#2A2F3A", x, 0.03, z));
				s.add(B(0.4, 0.1, 0.4, "#F4F6F9", x, 0.55, z));
			});
			/* title sign on posts behind the ruin's right */
			{
				const sg = signBoard("BLAST YARD", { style: "race", w: 8, h: 1.7, col: "#FF6A3D" });
				sg.position.set(4.5, 5.2, -gd - 5.4);
				s.add(sg, B(0.3, 5, 0.3, "#5A6272", 1.3, 2.5, -gd - 5.55), B(0.3, 5, 0.3, "#5A6272", 7.7, 2.5, -gd - 5.55));
			}
		},
		/* ---------- rules ---------- */
		/* the cells a blast from cell ci with range rg reaches: stopped by pillars and blocks, includes the first crate or
		   bomb it meets */
		cross(W, ci, rg) {
			const C = BY.C,
				c0 = ci % C,
				r0 = Math.floor(ci / C),
				out = [ci];
			for (const [dc, dr] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			])
				for (let k = 1; k <= rg; k++) {
					const c = c0 + dc * k,
						r = r0 + dr * k;
					if (c < 0 || r < 0 || c >= C || r >= BY.R) break;
					const q = r * C + c,
						g = W.G[q];
					if (g === 1 || g === 3) break;
					out.push(q);
					if (g === 2 || W.bAt[q]) break;
				}
			return out;
		},
		/* from = the cell a thrown bomb left (-1 = dropped): it flies there first, landing at b.land */
		addBomb(W, own, id, ci, t, rg, from = -1) {
			if (W.bombs[id] || W.bdone.has(id) || ci < 0 || W.G[ci] !== 0) return;
			if (W.bAt[ci]) return;
			const b = {
				id,
				own,
				ci,
				t,
				rg,
				bt: t + BY.FUSE,
				x: byX(ci % BY.C),
				z: byZ(Math.floor(ci / BY.C)),
				from,
				land: t,
			};
			if (from >= 0) {
				const n = Math.abs((from % BY.C) - (ci % BY.C)) + Math.abs(Math.floor(from / BY.C) - Math.floor(ci / BY.C));
				b.land = t + BY.FLY0 + BY.FLYK * n;
				b.fx = byX(from % BY.C);
				b.fz = byZ(Math.floor(from / BY.C));
				b.n = n;
			}
			W.bombs[id] = b;
			W.bAt[ci] = b;
			/* trucks on that cell may drive off it */
			for (const e of W.list)
				if (e.local && e.pass && Math.abs(e.x - b.x) < BY.T * 0.92 && Math.abs(e.z - b.z) < BY.T * 0.92) e.pass.add(id);
			b.vis = this.bombVis(W, b);
		},
		bombVis(W, b) {
			let v = W.bPool.find((q) => !q.on);
			if (!v) {
				const m = byBombModel(),
					ring = new THREE.Mesh(
						new THREE.RingGeometry(0.62, 0.8, 24),
						new THREE.MeshBasicMaterial({
							color: "#fff",
							transparent: true,
							opacity: 0.75,
							depthWrite: false,
							polygonOffset: true,
							polygonOffsetFactor: -2,
						}),
					),
					spark = new THREE.Sprite(
						new THREE.SpriteMaterial({
							map: canvasTex(64, 64, (x, w, h) => {
								const q = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
								q.addColorStop(0, "rgba(255,255,230,1)");
								q.addColorStop(0.3, "rgba(255,200,60,.9)");
								q.addColorStop(1, "rgba(255,120,0,0)");
								x.fillStyle = q;
								x.fillRect(0, 0, w, h);
							}),
							transparent: true,
							depthWrite: false,
							blending: THREE.AdditiveBlending,
						}),
					);
				ring.rotation.x = -Math.PI / 2;
				m.g.add(spark);
				W.sc.add(m.g, ring);
				v = Object.assign(m, { ring, spark });
				W.bPool.push(v);
			}
			v.on = true;
			v.g.visible = v.ring.visible = true;
			/* pooled: a thrown bomb blown up mid-air left its tumble on the model */
			v.g.position.set(b.x, 0, b.z);
			v.g.rotation.set(0, 0, 0);
			v.g.scale.setScalar(1);
			v.ring.position.set(b.x, 0.03, b.z);
			const o = W.ents[b.own];
			v.ring.material.color.set(o ? pcol(o.p) : "#E5484D");
			return v;
		},
		canDrop(W, e) {
			return Object.values(W.bombs).filter((b) => b.own === e.k).length < e.nb;
		},
		/* tiles a throw goes for after holding DROP held s */
		lobN: (held) =>
			BY.LOB0 + Math.min(BY.LOB1 - BY.LOB0, Math.floor(((held - BY.TAP) / BY.LOBT) * (BY.LOB1 - BY.LOB0))),
		/* where a throw of n tiles lands: straight ahead (the way the truck faces, or dir = [dc, dr]) over anything; a blocked
		   tile bounces it on to the next open one, and with none before the edge it lands on the furthest open one short of it */
		lobTarget(W, e, n, dir) {
			const cur = byCell(e.x, e.z);
			if (cur < 0) return -1;
			let dc, dr;
			if (dir) [dc, dr] = dir;
			else {
				const fx = Math.cos(e.yaw),
					fz = -Math.sin(e.yaw);
				[dc, dr] = Math.abs(fx) >= Math.abs(fz) ? [Math.sign(fx), 0] : [0, Math.sign(fz)];
			}
			const c0 = cur % BY.C,
				r0 = Math.floor(cur / BY.C),
				at = (k) => {
					const c = c0 + dc * k,
						r = r0 + dr * k;
					return c < 0 || r < 0 || c >= BY.C || r >= BY.R ? -2 : r * BY.C + c;
				},
				free = (q) => q >= 0 && W.G[q] === 0 && !W.bAt[q];
			for (let k = n; ; k++) {
				const q = at(k);
				if (q === -2) break;
				if (free(q)) return q;
			}
			for (let k = n - 1; k >= 1; k--) if (free(at(k))) return at(k);
			return -1;
		},
		/* n = 0: drop on your own cell; n > 0: throw n tiles */
		dropBomb(W, e, n = 0, dir) {
			const cur = byCell(e.x, e.z);
			if (cur < 0 || !this.canDrop(W, e)) return;
			let ci = cur,
				from = -1;
			if (n > 0) {
				const q = this.lobTarget(W, e, n, dir);
				if (q >= 0) {
					ci = q;
					from = cur;
				}
			}
			if (W.G[ci] !== 0 || W.bAt[ci]) return;
			const id = e.i * 1000 + (e.bn++ % 1000) + 1;
			e.f.bm = e.f.bm
				.filter((q) => q[2] > W.t - BY.FUSE - 3)
				.concat([[id, ci, Math.round(W.t * 1000) / 1000, e.rg, from]]);
			this.addBomb(W, e.k, id, ci, W.t, e.rg, from);
			mgLog(W, `BOMB ${mgName(e)} at ${ci}${from >= 0 ? " thrown" : ""} range ${e.rg}`);
			if (W.tv || e.isMe) sfx(from >= 0 ? "whoosh" : "click");
		},
		explode(W, b, T) {
			b.done = true;
			delete W.bombs[b.id];
			delete W.bAt[b.ci];
			W.bdone.add(b.id);
			if (b.vis) {
				b.vis.on = false;
				b.vis.g.visible = b.vis.ring.visible = false;
			}
			const cells = this.cross(W, b.ci, b.rg);
			for (const q of cells) {
				const g = W.G[q];
				if (g === 2) this.breakCover(W, q, T);
				const ob = W.bAt[q];
				if (ob && ob.bt > T) ob.bt = T;
				const pk = W.picks[q];
				if (pk && pk.at <= T && !W.claimed.has(pk.id)) {
					W.claimed.add(pk.id);
					this.pickGone(W, pk, true);
				}
				const f = W.flC[q];
				if (!f || f.t1 < T + BY.FLT) W.flC[q] = { t1: T + BY.FLT, own: b.own };
			}
			W.flames.push({ t0: T, ci: b.ci, cells, rg: b.rg });
			/* visuals */
			const near = W.tv || Math.hypot(b.x - W.me.x, b.z - W.me.z) < 14;
			if (near) {
				sfx("thunder");
				W.shake = Math.max(W.shake, W.tv ? 0.25 : 0.35);
			}
			W.flash.position.set(b.x, 3, b.z);
			W.flash.intensity = 5;
			/* a smoke column rising off the centre */
			burst(W.sc, b.x, 1.2, b.z, {
				n: 12,
				shape: "ico",
				cols: ["#4A4E57", "#6B707A", "#2E3138"],
				spd: 2.4,
				up: 4,
				grav: -1.5,
				life: 1.5,
				size: 1.8,
				op: 0.55,
			});
			burst(W.sc, b.x, 1.6, b.z, {
				n: 8,
				shape: "ico",
				cols: ["#5A5F68", "#7B808A"],
				spd: 0.7,
				up: 4.5,
				grav: -2.2,
				life: 2.4,
				size: 2.5,
				op: 0.4,
			});
			this.wave(W, b.x, b.z, (b.rg + 0.6) * BY.T);
			this.scorch(W, b.ci, cells);
			/* trucks on or next to a burning tile get jolted (just for show) */
			for (const e of W.list) {
				if (e.gone || !e.al || e.fly) continue;
				const c = byCell(e.x, e.z);
				if (c < 0) continue;
				const ec = c % BY.C,
					er = Math.floor(c / BY.C);
				if (cells.some((q) => Math.abs((q % BY.C) - ec) + Math.abs(Math.floor(q / BY.C) - er) <= 1)) e.jolt = W.t;
			}
		},
		/* the outline of a blast's scorch in canvas px (scale k): a plus shape from the arm lengths, each arm reaching the far
		   edge of its last tile, sides a little ragged, the tips cut into spikes (longest in the middle); built from a seed so
		   the soot and the glow trace the same edge */
		scorchPath(cx, cy, arm, hw, seed, k) {
			const P = BY.SPX * k,
				q = mulberry(seed),
				pts = [],
				D = [
					[1, 0],
					[0, 1],
					[-1, 0],
					[0, -1],
				];
			D.forEach(([fx, fy], i) => {
				const nx = fy,
					ny = -fx,
					L = arm[i] ? (arm[i] + 0.2) * P : hw * P,
					h = hw * P,
					at = (along, side) => pts.push([cx + fx * along + nx * side, cy + fy * along + ny * side]);
				/* out along one side */
				for (let a = h; a < L - 2 * k; a += 7 * k) at(a, h + (q() - 0.5) * 3 * k);
				/* the tip: teeth across the arm */
				const n = 5 + Math.floor(q() * 3);
				for (let j = 0; j <= n; j++) {
					const sd = h - (2 * h * j) / n,
						mid = 1 - Math.abs(sd) / h,
						sp = arm[i] ? (j % 2 ? (3 + q() * 6 + mid * 6) * k : -q() * 4 * k) : j % 2 ? q() * 4 * k : 0;
					at(L + sp, sd);
				}
				/* back along the other side */
				for (let a = L - 2 * k; a > h; a -= 7 * k) at(a, -h + (q() - 0.5) * 3 * k);
			});
			const p = new Path2D();
			pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
			p.closePath();
			return p;
		},
		/* scorch for a blast at cell ci over cells, painted into the soot canvas; its glowing rim joins W.glowL */
		scorch(W, ci, cells) {
			const c0 = ci % BY.C,
				r0 = Math.floor(ci / BY.C),
				arm = [0, 0, 0, 0];
			for (const q of cells) {
				const dc = (q % BY.C) - c0,
					dr = Math.floor(q / BY.C) - r0;
				if (dc > 0) arm[0] = Math.max(arm[0], dc);
				else if (dr > 0) arm[1] = Math.max(arm[1], dr);
				else if (dc < 0) arm[2] = Math.max(arm[2], -dc);
				else if (dr < 0) arm[3] = Math.max(arm[3], -dr);
			}
			const S = W.soot,
				P = BY.SPX,
				cx = (c0 + 0.5) * P,
				cy = (r0 + 0.5) * P,
				hw = 0.36 + Math.min(0.08, 0.02 * Math.max(...arm)),
				seed = Math.floor(Math.random() * 1e9),
				path = this.scorchPath(cx, cy, arm, hw, seed, 1),
				q = mulberry(seed + 1),
				D4 = [
					[1, 0],
					[0, 1],
					[-1, 0],
					[0, -1],
				];
			/* the blast is drawn on its own scratch canvas first: there its parts take the darker of each other
			   ("lighten" on a white mask), so the arms don't double up into a square where they cross; then it is
			   screened onto the soot, so blasts build up on each other */
			const T =
					W.sootTmp ||
					(W.sootTmp = (() => {
						const c = document.createElement("canvas");
						c.width = S.c.width;
						c.height = S.c.height;
						return { c, x: c.getContext("2d") };
					})()),
				x = T.x,
				OFF = 4000;
			x.globalCompositeOperation = "source-over";
			x.fillStyle = "#000";
			x.fillRect(0, 0, T.c.width, T.c.height);
			x.save();
			x.globalCompositeOperation = "lighten";
			/* only the blurred shadows land on the canvas (the shapes are drawn OFF px to the left of it): every part is soft */
			x.translate(-OFF, 0);
			x.shadowOffsetX = OFF;
			x.shadowColor = "#fff";
			/* a faint jagged base the shape of the blast */
			x.shadowBlur = 8;
			x.fillStyle = "rgba(255,255,255,.12)";
			x.fill(path);
			/* each arm a smear, darkest at the centre and gone by the tip */
			D4.forEach(([fx, fy], i) => {
				if (!arm[i]) return;
				const L = (arm[i] + 0.15) * P,
					lg = x.createLinearGradient(cx, cy, cx + fx * L, cy + fy * L);
				lg.addColorStop(0, "rgba(255,255,255,.5)");
				lg.addColorStop(0.5, "rgba(255,255,255,.3)");
				lg.addColorStop(1, "rgba(255,255,255,0)");
				x.shadowBlur = hw * P * 0.35;
				x.strokeStyle = lg;
				x.lineWidth = hw * P * 1.25;
				x.beginPath();
				x.moveTo(cx, cy);
				x.lineTo(cx + fx * L, cy + fy * L);
				x.stroke();
			});
			/* a round blot in the middle */
			{
				const g = x.createRadialGradient(cx, cy, 0, cx, cy, P * 0.85);
				g.addColorStop(0, "rgba(255,255,255,.42)");
				g.addColorStop(0.6, "rgba(255,255,255,.2)");
				g.addColorStop(1, "rgba(255,255,255,0)");
				x.shadowBlur = 6;
				x.fillStyle = g;
				x.beginPath();
				x.arc(cx, cy, P * 0.85, 0, 6.283);
				x.fill();
			}
			x.restore();
			/* soot streaks thrown out along each arm and specks of burnt debris, inside the blast's outline */
			x.save();
			x.clip(path);
			x.lineCap = "round";
			D4.forEach(([fx, fy], i) => {
				if (!arm[i]) return;
				const L = (arm[i] + 0.15) * P;
				/* soft streaks: random thickness, start and length, fading in and out along their length, blurred (only
				   their shadow lands, like the smears) */
				for (let j = 0; j < 4 + Math.floor(q() * 4); j++) {
					const sd = (q() - 0.5) * hw * 1.4 * P,
						a0 = q() * 0.35 * L,
						a1 = Math.min(L, a0 + L * (0.15 + q() * 0.65)),
						al = 0.05 + q() * 0.12,
						g = x.createLinearGradient(cx + fx * a0, cy + fy * a0, cx + fx * a1, cy + fy * a1);
					g.addColorStop(0, "rgba(255,255,255,0)");
					g.addColorStop(0.2 + q() * 0.3, `rgba(255,255,255,${al})`);
					g.addColorStop(1, "rgba(255,255,255,0)");
					x.save();
					x.translate(-OFF, 0);
					x.shadowOffsetX = OFF;
					x.shadowColor = "#fff";
					x.shadowBlur = 1.5 + q() * 3;
					x.strokeStyle = g;
					x.lineWidth = 1 + Math.pow(q(), 2) * 6;
					x.beginPath();
					x.moveTo(cx + fx * a0 + fy * sd, cy + fy * a0 - fx * sd);
					x.lineTo(cx + fx * a1 + fy * sd, cy + fy * a1 - fx * sd);
					x.stroke();
					x.restore();
				}
			});
			for (let j = 0; j < 10 + arm.reduce((a, b) => a + b, 0) * 3; j++) {
				const i = Math.floor(q() * 4),
					D = D4[i],
					l = Math.pow(q(), 1.6) * (arm[i] + 0.1) * P,
					sd = (q() - 0.5) * hw * 1.5 * P,
					px = cx + D[0] * l + D[1] * sd,
					py = cy + D[1] * l - D[0] * sd,
					r = 1.2 + q() * 2.4;
				x.fillStyle = `rgba(255,255,255,${0.2 + q() * 0.25})`;
				x.beginPath();
				x.moveTo(px + r, py);
				for (let v = 1; v < 5; v++)
					x.lineTo(px + Math.cos(v * 1.3) * r * (0.6 + q() * 0.5), py + Math.sin(v * 1.3) * r * (0.6 + q() * 0.5));
				x.fill();
			}
			x.restore();
			S.x.save();
			S.x.globalCompositeOperation = "screen";
			S.x.drawImage(T.c, 0, 0);
			S.x.restore();
			S.t.needsUpdate = true;
			W.glowL.push({ t0: W.t, cx, cy, arm, hw, seed });
		},
		/* the glowing rims: an orange edge and embers fading over BY.EMBER s after each blast */
		emberStep(W) {
			/* old scorch fades: every 2 s the soot mask loses SOOTF of its strength (about half in 15 s) */
			if (W.t - (W.sootF || 0) > 2 || W.t < (W.sootF || 0)) {
				W.sootF = W.t;
				const S = W.soot;
				S.x.fillStyle = `rgba(0,0,0,${BY.SOOTF})`;
				S.x.fillRect(0, 0, S.c.width, S.c.height);
				S.t.needsUpdate = true;
			}
			const E = W.ember,
				L = (W.glowL = W.glowL.filter((g) => W.t - g.t0 < BY.EMBER));
			if (!L.length && !W.emberM.visible) return;
			/* at most 30 redraws a second (each re-uploads the canvas) */
			if (L.length && Math.abs(W.t - (W.emT || -9)) < 0.033) return;
			W.emT = W.t;
			const x = E.x,
				k = E.k;
			x.fillStyle = "#000";
			x.fillRect(0, 0, E.c.width, E.c.height);
			for (const g of L) {
				const u = (W.t - g.t0) / BY.EMBER,
					a = Math.pow(1 - u, 1.6),
					path = g.path || (g.path = this.scorchPath(g.cx * k, g.cy * k, g.arm, g.hw, g.seed, k)),
					q = mulberry(g.seed + 2);
				x.save();
				x.shadowColor = `rgba(255,70,10,${a})`;
				x.shadowBlur = 8;
				x.strokeStyle = `rgba(255,${120 + Math.round(60 * a)},40,${a})`;
				x.lineWidth = 2.5;
				x.stroke(path);
				x.shadowBlur = 0;
				x.clip(path);
				x.strokeStyle = `rgba(255,60,10,${a * 0.6})`;
				x.lineWidth = 5;
				x.stroke(path);
				/* embers glowing on inside, flickering */
				for (let j = 0; j < 14; j++) {
					const i = Math.floor(q() * 4),
						D = [
							[1, 0],
							[0, 1],
							[-1, 0],
							[0, -1],
						][i],
						l = q() * (g.arm[i] + 0.15) * BY.SPX * k,
						sd = (q() - 0.5) * g.hw * 1.6 * BY.SPX * k,
						fl = 0.6 + 0.4 * Math.sin(W.t * 9 + j * 2.1);
					x.fillStyle = `rgba(255,${90 + j * 6},20,${a * fl * (0.4 + q() * 0.6)})`;
					x.beginPath();
					x.arc(g.cx * k + D[0] * l + D[1] * sd, g.cy * k + D[1] * l - D[0] * sd, 0.8 + q() * 1.4, 0, 6.283);
					x.fill();
				}
				x.restore();
			}
			E.t.needsUpdate = true;
			W.emberM.visible = L.length > 0;
		},
		/* how far the sandstorm has blown in: 0 before sudden death, 1 once it is full */
		storm: (W) => Math.max(0, Math.min(1, (W.t - BY.SD) / BY.STORM)),
		/* the storm pushes a truck along the wind (lane by lane like driving: blocked tiles stop it, never between lanes) */
		windPush(W, e, dt) {
			const k = this.storm(W);
			if (!k) return;
			const ci = byCell(e.x, e.z);
			if (ci < 0) return;
			const c = ci % BY.C,
				r = Math.floor(ci / BY.C),
				d = W.windDir,
				step = BY.WIND * k * dt;
			if (Math.abs(e.z - byZ(r)) > 0.35) return;
			const ahead = c + d < 0 || c + d >= BY.C ? -1 : r * BY.C + c + d;
			if (this.open(W, e, ahead)) e.x += d * step;
			else {
				const toC = (byX(c) - e.x) * d;
				if (toC > 0) e.x += d * Math.min(toC, step);
			}
		},
		/* the storm's look: sandy haze closing in, the sun turning orange, dust streaks; and its sound */
		stormFx(W, dt) {
			const k = this.storm(W),
				sc = W.sc;
			if (!W.st0 && sc.fog)
				W.st0 = {
					fc: sc.fog.color.clone(),
					n: sc.fog.near,
					fa: sc.fog.far,
					bg: sc.background && sc.background.isColor ? sc.background.clone() : null,
					sun: W.sun.color.clone(),
				};
			if (W.st0) {
				const S = W.st0,
					sand = W.sandC || (W.sandC = new THREE.Color("#D8B98A"));
				sc.fog.color.copy(S.fc).lerp(sand, k);
				sc.fog.near = S.n + (12 - S.n) * k;
				sc.fog.far = S.fa + (72 - S.fa) * k;
				if (S.bg) sc.background.copy(S.bg).lerp(sand, k);
				W.sun.color.copy(S.sun).lerp(W.sunO || (W.sunO = new THREE.Color("#FFB070")), k * 0.6);
			}
			const D = W.dust;
			if (!k) {
				D.count = 0;
				return;
			}
			const o = W.dO || (W.dO = new THREE.Object3D());
			D.material.opacity = 0.55 * k;
			W.dustP.forEach((p, i) => {
				const x = ((((p.x0 + W.t * p.v) % 48) + 48) % 48) - 24;
				o.position.set(x * W.windDir, p.y, p.z);
				o.rotation.set(0, 0, 0);
				o.scale.set(p.l, 1, p.w);
				o.updateMatrix();
				D.setMatrixAt(i, o.matrix);
			});
			D.count = W.dustP.length;
			D.instanceMatrix.needsUpdate = true;
			if (!W.windS && !W.prac) W.windS = windSnd() || { set() {}, stop() {} };
			if (W.windS) W.windS.set(0.35 + 0.45 * k, !W.over);
		},
		stop(W) {
			if (W.windS) W.windS.stop();
		},
		/* a flat ring rolling out along the floor */
		wave(W, x, z, r, col = "#FFE2A8", dur = 0.4) {
			let m = W.waves.find((w) => !w.m.visible);
			if (!m) {
				m = {
					m: new THREE.Mesh(
						new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2),
						new THREE.MeshBasicMaterial({
							color: "#fff",
							transparent: true,
							depthWrite: false,
							blending: THREE.AdditiveBlending,
							polygonOffset: true,
							polygonOffsetFactor: -6,
						}),
					),
				};
				m.m.renderOrder = 3;
				W.sc.add(m.m);
				W.waves.push(m);
			}
			Object.assign(m, { x, z, r, t0: W.t, dur });
			m.m.material.color.set(col);
			m.m.visible = true;
		},
		/* debris that matches the cover: planks fly and slide, drums and tyres roll away, bricks tumble and stay a moment */
		debris(W, kind, x, z) {
			const G = W.debG,
				add = (obj, o) => {
					obj.position.set(x + (o.ox || 0), o.y, z + (o.oz || 0));
					obj.traverse((q) => {
						if (q.isMesh) q.castShadow = true;
					});
					W.sc.add(obj);
					W.deb.push(Object.assign({ m: obj, t0: W.t, sp: 0, ax: 0, az: 0 }, o));
				},
				R = Math.random;
			if (kind === 0)
				for (let i = 0; i < 7; i++) {
					const a = R() * 6.283,
						v = 2.5 + R() * 3;
					add(mesh(G.plank, i % 3 ? "#B97A3E" : "#8A5428"), {
						y: 0.4 + R() * 1,
						vx: Math.cos(a) * v,
						vz: Math.sin(a) * v,
						vy: 5 + R() * 5,
						sx: (R() - 0.5) * 16,
						sz: (R() - 0.5) * 16,
						ry: R() * 6,
						h: 0.06,
						bnc: 0.25,
						life: 2.2,
					});
				}
			else if (kind === 1)
				for (let i = 0; i < 4; i++) {
					const a = (i / 4) * 6.283 + R() * 0.8,
						v = 3 + R() * 2.5,
						g = new THREE.Group(),
						r = new THREE.Group(),
						c = i === 2 ? "#B5422C" : "#D4692E";
					r.add(mesh(G.drum, c));
					[-0.6, -0.2, 0.2, 0.6].forEach((bx) => r.add(mesh(G.band, "#7A3A22").translateX(bx)));
					g.add(r);
					add(g, {
						y: 0.4,
						vx: Math.cos(a) * v,
						vz: Math.sin(a) * v,
						vy: 4 + R() * 3,
						roll: r,
						rad: 0.4,
						h: 0.4,
						bnc: 0.35,
						life: 2.6,
					});
				}
			else if (kind === 2)
				for (let i = 0; i < 3; i++) {
					const a = (i / 3) * 6.283 + R(),
						v = 3.5 + R() * 2.5,
						g = new THREE.Group(),
						r = new THREE.Group();
					r.add(mesh(G.tyre, "#2E323A"));
					g.add(r);
					add(g, {
						y: 0.5 + i * 0.5,
						vx: Math.cos(a) * v,
						vz: Math.sin(a) * v,
						vy: 6 + R() * 3,
						roll: r,
						rad: 0.8,
						h: 0.8,
						bnc: 0.6,
						life: 2.6,
					});
				}
			else
				for (let i = 0; i < 9; i++) {
					const a = R() * 6.283,
						v = 1 + R() * 2.5;
					add(mesh(G.brick, ["#A64B35", "#B95A3E", "#9A4330"][i % 3]), {
						y: 0.3 + R() * 1,
						vx: Math.cos(a) * v,
						vz: Math.sin(a) * v,
						vy: 3 + R() * 3,
						sx: (R() - 0.5) * 14,
						sz: (R() - 0.5) * 14,
						ry: R() * 6,
						h: 0.11,
						bnc: 0.2,
						life: 3,
					});
				}
		},
		debStep(W, dt) {
			const lim = (BY.C * BY.T) / 2 + 0.3,
				limZ = (BY.R * BY.T) / 2 + 0.3;
			W.deb = W.deb.filter((d) => {
				const age = W.t - d.t0,
					m = d.m;
				if (age > d.life) {
					W.sc.remove(m);
					return false;
				}
				d.vy -= 24 * dt;
				m.position.x += d.vx * dt;
				m.position.y += d.vy * dt;
				m.position.z += d.vz * dt;
				/* the kerb keeps it in the yard */
				if (Math.abs(m.position.x) > lim) {
					m.position.x = Math.sign(m.position.x) * lim;
					d.vx *= -0.4;
				}
				if (Math.abs(m.position.z) > limZ) {
					m.position.z = Math.sign(m.position.z) * limZ;
					d.vz *= -0.4;
				}
				const ground = m.position.y <= d.h;
				if (ground) {
					m.position.y = d.h;
					if (d.vy < -2) d.vy = -d.vy * d.bnc;
					else d.vy = 0;
					const fr = Math.exp(-(d.roll ? 1.2 : 6) * dt);
					d.vx *= fr;
					d.vz *= fr;
				}
				const sp = Math.hypot(d.vx, d.vz);
				if (d.roll) {
					/* rolls along its travel, axle across it */
					if (sp > 0.05) m.rotation.y = Math.atan2(d.vx, d.vz);
					d.roll.rotation.x += (sp / d.rad) * dt;
				} else if (ground && d.vy === 0) {
					m.rotation.x *= Math.exp(-14 * dt);
					m.rotation.z *= Math.exp(-14 * dt);
				} else {
					m.rotation.x += d.sx * dt;
					m.rotation.z += d.sz * dt;
					m.rotation.y = d.ry;
				}
				/* shrinks away at the end */
				const k = Math.min(1, (d.life - age) / 0.4);
				m.scale.setScalar(k);
				return true;
			});
			for (const w of W.waves) {
				if (!w.m.visible) continue;
				const u = (W.t - w.t0) / w.dur;
				if (u >= 1 || u < 0) {
					w.m.visible = false;
					continue;
				}
				const r = 0.6 + (w.r - 0.6) * (1 - Math.pow(1 - u, 2.2));
				w.m.position.set(w.x, 0.06, w.z);
				w.m.scale.set(r, 1, r);
				w.m.material.opacity = 0.85 * (1 - u);
			}
		},
		breakCover(W, ci, T) {
			W.G[ci] = 0;
			const cv = W.cov[ci];
			if (cv) {
				W.covI[cv[0]].hide(cv[1]);
				const x = byX(ci % BY.C),
					z = byZ(Math.floor(ci / BY.C)),
					cols = [
						["#B97A3E", "#8A5428", "#C68848"],
						["#D4692E", "#7A3A22", "#A4733F"],
						["#2E323A", "#262A31", "#4A4E57"],
						["#A64B35", "#B95A3E", "#C9B9A6"],
					][cv[0]];
				burst(W.sc, x, 0.9, z, { n: 6, shape: "cube", cols, spd: 4, up: 6, grav: 22, life: 0.8, size: 0.9, vary: 1 });
				this.debris(W, cv[0], x, z);
				if (W.tv || Math.hypot(x - W.me.x, z - W.me.z) < 12) sfx("crack");
			}
			const k = W.pu[ci];
			if (k)
				W.picks[ci] = { id: ci + 1, ci, k, at: T + BY.FLT + 0.05, x: byX(ci % BY.C), z: byZ(Math.floor(ci / BY.C)) };
		},
		pickVis(W, pk) {
			const g = new THREE.Group(),
				face = new THREE.MeshBasicMaterial({ map: byIconTex(pk.k) }),
				rim = M("#E0A21C", { emissive: "#FFB020", emissiveIntensity: 0.35 }),
				coin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 24), [rim, face, face]);
			coin.rotation.x = Math.PI / 2;
			coin.castShadow = true;
			g.add(coin);
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(0.55, 0.72, 28),
				new THREE.MeshBasicMaterial({
					color: "#FFD45A",
					transparent: true,
					opacity: 0.7,
					depthWrite: false,
					polygonOffset: true,
					polygonOffsetFactor: -2,
				}),
			);
			ring.rotation.x = -Math.PI / 2;
			ring.position.set(pk.x, 0.03, pk.z);
			g.position.set(pk.x, 0.9, pk.z);
			W.sc.add(g, ring);
			pk.vis = { g, ring };
		},
		pickGone(W, pk, burnt) {
			if (!pk.vis) return;
			W.sc.remove(pk.vis.g, pk.vis.ring);
			burst(W.sc, pk.x, 1, pk.z, {
				n: 8,
				shape: burnt ? "ico" : "coin",
				cols: burnt ? ["#4A4E57", "#6B707A"] : ["#FFC83D", "#FFE27A"],
				spd: 2.6,
				up: 5,
				life: 0.7,
			});
			pk.vis = null;
		},
		onClaim(W, id) {
			const pk = W.picks[id - 1];
			if (pk) {
				this.pickGone(W, pk);
				if (W.tv || Math.hypot(pk.x - W.me.x, pk.z - W.me.z) < 4) sfx("coin");
			}
		},
		kill(W, e, own, why) {
			if (!e.al || e.d) return;
			e.f.ko = own || "";
			e.lastHit = { k: why, t: W.t };
			eliminate(W, e);
			/* blown out of the yard: an arc over the fence to the nearest side, landing on its roof */
			const gw = (BY.C * BY.T) / 2,
				gd = (BY.R * BY.T) / 2,
				ex = gw - Math.abs(e.x),
				ez = gd - Math.abs(e.z),
				ux = ex < ez ? Math.sign(e.x) || 1 : 0,
				uz = ex < ez ? 0 : Math.sign(e.z) || 1,
				need = (ex < ez ? ex : ez) + 3.5;
			e.fly = true;
			e.vy = 16;
			e.vx = (ux * need) / 1.07;
			e.vz = (uz * need) / 1.07;
			if (e.isMe) W.shake = 0.7;
		},
		fallPhys(W, e, dt) {
			if (e.f.wr) return true;
			e.vy -= 30 * dt;
			e.y += e.vy * dt;
			e.x += e.vx * dt;
			e.z += e.vz * dt;
			e.spin = (e.spin || 0) + dt * 7;
			if (e.vy < 0 && e.y <= 0) {
				e.y = 0;
				e.vx = e.vz = e.vy = 0;
				e.spin = 0;
				e.f.wr = 1;
				burst(W.sc, e.x, 0.3, e.z, {
					n: 10,
					shape: "ico",
					cols: ["#9A7A57", "#7E6649"],
					spd: 3,
					up: 3,
					grav: 10,
					life: 0.7,
				});
				sfx("land");
			}
			return true;
		},
		tick(W, dt) {
			/* bombs from every truck (late ones still blow at their own time) */
			for (const e of W.list) {
				const L = e.f && e.f.bm;
				if (Array.isArray(L))
					for (const q of L)
						if (Array.isArray(q) && !W.bombs[q[0]] && !W.bdone.has(q[0]))
							this.addBomb(W, e.k, +q[0], +q[1], +q[2], +q[3] || 2, q.length > 4 ? +q[4] : -1);
			}
			/* explosions in time order; a blast sets off any bomb it reaches at the same moment */
			for (let guard = 0; guard < 64; guard++) {
				let nx = null;
				for (const id in W.bombs) {
					const b = W.bombs[id];
					if (b.bt <= W.t && (!nx || b.bt < nx.bt || (b.bt === nx.bt && b.id < nx.id))) nx = b;
				}
				if (!nx) break;
				this.explode(W, nx, nx.bt);
			}
			/* sudden death: blocks land on their cells */
			while (W.sdI < W.sd.length && W.sd[W.sdI].t <= W.t) {
				const q = W.sd[W.sdI++],
					ci = q.ci;
				if (W.G[ci] === 2) {
					const cv = W.cov[ci];
					if (cv) W.covI[cv[0]].hide(cv[1]);
				}
				W.G[ci] = 3;
				const b = W.bAt[ci];
				if (b) {
					b.done = true;
					delete W.bombs[b.id];
					delete W.bAt[ci];
					W.bdone.add(b.id);
					if (b.vis) {
						b.vis.on = false;
						b.vis.g.visible = b.vis.ring.visible = false;
					}
				}
				const pk = W.picks[ci];
				if (pk && !W.claimed.has(pk.id)) {
					W.claimed.add(pk.id);
					this.pickGone(W, pk, true);
				}
				const x = byX(ci % BY.C),
					z = byZ(Math.floor(ci / BY.C));
				burst(W.sc, x, 0.3, z, {
					n: 10,
					shape: "ico",
					cols: ["#B9BEC6", "#9A7A57"],
					spd: 3,
					up: 3,
					grav: 10,
					life: 0.7,
				});
				burst(W.sc, x, 0.3, z, {
					n: 16,
					shape: "ico",
					cols: ["#C9B9A6", "#B9BEC6", "#9A8A74"],
					spd: 6,
					up: 1.5,
					grav: 4,
					life: 0.8,
					size: 1.3,
				});
				this.wave(W, x, z, BY.T * 1.3, "#D9CBB4", 0.35);
				if (W.tv || Math.hypot(x - W.me.x, z - W.me.z) < 10) {
					sfx("crush");
					W.shake = Math.max(W.shake, 0.15);
				}
			}
			/* local trucks: burning or crushed cells knock them out; pick-ups */
			for (const e of W.list) {
				if (!e.local || e.gone || !e.al || e.d || e.fly) continue;
				const ci = byCell(e.x, e.z);
				if (ci < 0) continue;
				const f = W.flC[ci];
				if (f && W.t < f.t1) {
					const o = W.ents[f.own];
					this.kill(W, e, f.own, o === e ? "own dynamite" : `blown up by ${mgName(o)}`);
					continue;
				}
				if (W.G[ci] === 3) {
					this.kill(W, e, "", "crushed");
					continue;
				}
				const pk = W.picks[ci];
				if (pk && W.t >= pk.at && !W.claimed.has(pk.id) && W.claim(pk.id)) {
					e.c.push(pk.id);
					if (pk.k === "bomb") e.nb = Math.min(BY.NBMAX, e.nb + 1);
					else if (pk.k === "fire") e.rg = Math.min(BY.RGMAX, e.rg + 1);
					else e.spl = Math.min(BY.SPMAX, e.spl + 1);
					fb(W, e, pk.k === "bomb" ? "+1 BOMB" : pk.k === "fire" ? "+1 FIRE" : "+SPEED", { tone: "good" });
					mgLog(W, `PICK ${mgName(e)} ${pk.k}`);
				}
				for (const id of e.pass) {
					const b = W.bombs[id];
					if (!b || Math.abs(e.x - b.x) > BY.T * 0.92 || Math.abs(e.z - b.z) > BY.T * 0.92) e.pass.delete(id);
				}
			}
			for (const ci in W.flC) if (W.flC[ci].t1 < W.t) delete W.flC[ci];
			W.dz = this.danger(W);
		},
		/* can e drive into cell q? */
		open(W, e, q) {
			if (q < 0 || W.G[q] !== 0) return false;
			const b = W.bAt[q];
			return !b || e.pass.has(b.id);
		},
		/* stick driving on the grid: along one axis at a time, lining up with the lane first and sliding round corners */
		phys(W, e, inp, dt) {
			if ((e.falling || e.fly) && this.fallPhys(W, e, dt)) return;
			const x0 = e.x,
				z0 = e.z;
			if (e.al && !e.d && inp) {
				/* DROP: a tap drops at your feet; holding aims a throw (e.f.am = the tile, shown to everyone), letting go throws.
				   CPUs throw straight away with inp.lob = tiles and inp.ld = [dc, dr] */
				if (inp.lob) this.dropBomb(W, e, inp.lob, inp.ld);
				else if (inp.boost && this.canDrop(W, e)) e.chg = W.t;
				if (e.chg !== undefined) {
					const held = W.t - e.chg;
					if (!inp.hold) {
						this.dropBomb(W, e, held < BY.TAP ? 0 : this.lobN(held));
						e.chg = undefined;
						e.f.am = -1;
						e.f.ch = -1;
					} else {
						e.f.am = held >= BY.TAP ? this.lobTarget(W, e, this.lobN(held)) : -1;
						e.f.ch = Math.round(e.chg * 1000) / 1000;
					}
				}
				const ix = inp.x || 0,
					iy = inp.y || 0,
					mag = Math.hypot(ix, iy);
				if (mag > 0.3) {
					const step = (BY.SPD + BY.SPDUP * e.spl) * dt,
						a = Math.abs(ix) >= Math.abs(iy) ? 0 : 1,
						sa = Math.sign(a ? iy : ix),
						sb = Math.sign(a ? ix : iy),
						other = Math.abs(a ? ix : iy) > mag * 0.38;
					if (!this.axisMove(W, e, a, sa, step) && other) this.axisMove(W, e, 1 - a, sb, step);
				}
			}
			if (inp) inp.boost = false;
			if (inp) inp.lob = 0;
			if (e.al && !e.d) this.windPush(W, e, dt);
			if (!e.al || e.d) {
				e.chg = undefined;
				e.f.am = -1;
				e.f.ch = -1;
			}
			const vx = (e.x - x0) / Math.max(dt, 1e-4),
				vz = (e.z - z0) / Math.max(dt, 1e-4);
			e.vx = vx;
			e.vz = vz;
			if (Math.hypot(vx, vz) > 0.5) e.yaw = lerpA(e.yaw, Math.atan2(-vz, vx), Math.min(1, dt * 16));
		},
		/* move e along axis a (0 = x, 1 = z) in direction s by up to step; returns how far it got */
		axisMove(W, e, a, s, step) {
			const ci = byCell(e.x, e.z);
			if (ci < 0) return 0;
			const C = BY.C,
				c = ci % C,
				r = Math.floor(ci / C),
				T = BY.T,
				along = a ? e.z : e.x,
				perp = a ? e.x : e.z,
				cA = a ? byZ(r) : byX(c),
				cP = a ? byX(c) : byZ(r),
				ahead = a ? (r + s < 0 || r + s >= BY.R ? -1 : (r + s) * C + c) : c + s < 0 || c + s >= C ? -1 : r * C + c + s,
				off = perp - cP;
			let nA = along,
				nP = perp,
				left = step;
			if (this.open(W, e, ahead)) {
				if (Math.abs(off) > 0.01) {
					const d = Math.min(Math.abs(off), left);
					nP -= Math.sign(off) * d;
					left -= d;
				}
				nA += s * left;
			} else {
				const toC = (cA - along) * s;
				if (toC > 0.005) {
					const d = Math.min(toC, left);
					nA += s * d;
					left -= d;
				}
				/* corner help: well off the lane toward a free one, slide over to it */
				const so = Math.sign(off);
				if (left > 0 && Math.abs(off) > T * 0.22) {
					const side = a ? r * C + c + so : (r + so) * C + c,
						sideOk = a ? c + so >= 0 && c + so < C : r + so >= 0 && r + so < BY.R,
						diag = a ? (r + s) * C + c + so : (r + so) * C + c + s,
						diagOk = a ? r + s >= 0 && r + s < BY.R : c + s >= 0 && c + s < C;
					if (sideOk && diagOk && this.open(W, e, side) && this.open(W, e, diag)) nP += so * left;
				}
			}
			if (a) {
				e.z = nA;
				e.x = nP;
			} else {
				e.x = nA;
				e.z = nP;
			}
			return Math.abs(nA - along) + Math.abs(nP - perp);
		},
		/* ranked by how long you lasted; kills only break ties (trucks out in the same blast, or alive at the end). The score
		   is tenths of a second x 10 with the kills (up to 9) in the last digit, shown as "62 s · 2 KO" */
		rules(W, e) {
			if (e.al && !e.d) e.sc = Math.floor(W.t * 10) * 10;
		},
		timeUp(W, e) {
			if (e.al) e.sc = this.dur * 100;
		},
		final(W, e) {
			let k = 0;
			for (const o of W.list) if (o !== e && o.f && o.f.ko === e.k) k++;
			/* the engine's +100 for the last truck standing would read as a second more: it ranks first anyway */
			return e.sc - (e.won ? 100 : 0) + Math.min(9, k);
		},
		fmtV: (v) => `${Math.floor(v / 100)} s${v % 10 ? ` · ${v % 10} KO` : ""}`,
		ramReady: (W) => Object.values(W.bombs || {}).filter((b) => b.own === W.me.k).length < (W.me.nb || 1),
		ramCd(W) {
			const L = Object.values(W.bombs || {}).filter((b) => b.own === W.me.k);
			if (L.length < (W.me.nb || 1)) return 0;
			return Math.max(0, Math.min(1, Math.min(...L.map((b) => b.bt - W.t)) / BY.FUSE));
		},
		cam(W, tgt, pos, far) {
			const asp = GFX.w / GFX.h,
				up = Math.sin(1.13),
				bk = Math.cos(1.13);
			if (W.tv || !W.me.al) {
				const gw = (BY.C * BY.T) / 2 + 1.6,
					gd = (BY.R * BY.T) / 2 + 2.2,
					t = Math.tan((20 * Math.PI) / 180),
					D = Math.max(gd / t, gw / (t * asp)) * 0.98,
					g = new THREE.Vector3(0, 0, 0.6);
				return [g, g.clone().add(new THREE.Vector3(0, up * D, bk * D))];
			}
			const me = W.me,
				D = asp < 1 ? 31 : 25,
				hx = (BY.C * BY.T) / 2 - (asp < 1 ? 6 : 9),
				hz = (BY.R * BY.T) / 2 - 7,
				g = new THREE.Vector3(Math.max(-hx, Math.min(hx, me.x)), 0, Math.max(-hz, Math.min(hz, me.z)) + 0.5);
			return [g, g.clone().add(new THREE.Vector3(0, up * D, bk * D))];
		},
		render(W, e, dt) {
			/* jolted by a blast next to it: a hop and a rock */
			const jk = e.jolt !== undefined ? (W.t - e.jolt) / 0.4 : 1;
			if (jk >= 0 && jk < 1 && !e.fly) {
				e.g.position.y += Math.sin(jk * Math.PI) * 0.35;
				e.tr.rotation.x += Math.sin(jk * Math.PI * 2) * 0.14 * (1 - jk);
			}
			if (e.f && e.f.wr) {
				e.tr.rotation.set(0, e.yaw, Math.PI);
				e.g.position.y += 1;
				if (Math.random() < dt * 2.5)
					burst(W.sc, e.x, e.y + 0.8, e.z, {
						n: 1,
						shape: "ico",
						cols: ["#4A4E57", "#6B707A"],
						spd: 0.4,
						up: 2,
						grav: -1,
						life: 1.6,
						size: 1.2,
						op: 0.45,
					});
			}
			if (W.fxT === W.t) return;
			W.fxT = W.t;
			this.drawFx(W, dt);
			this.debStep(W, dt);
			this.stormFx(W, dt);
			this.emberStep(W);
		},
		drawFx(W, dt) {
			const t = W.t;
			W.flash.intensity = Math.max(0, W.flash.intensity - dt * 14);
			/* bombs: pop in, swell and glow faster as the fuse runs down, the wick burns down */
			for (const id in W.bombs) {
				const b = W.bombs[id],
					v = b.vis;
				if (!v) continue;
				const age = t - b.t,
					fr = Math.max(0, Math.min(1, (b.bt - t) / BY.FUSE)),
					pop = b.from >= 0 ? 1 : age < 0.25 ? Math.sin((age / 0.25) * 2.2) * 1.15 : 1,
					hz = 2 + 10 * (1 - fr),
					pulse = 0.5 + 0.5 * Math.sin(age * hz * 6.283);
				v.g.scale.setScalar(Math.max(0.05, pop) * (1 + pulse * 0.08 * (1 - fr)));
				v.red.emissiveIntensity = (1 - fr) * 0.9 * pulse;
				v.wick.scale.y = Math.max(0.1, fr);
				v.spark.position.set(0.05, 0.92 + 0.45 * Math.max(0.1, fr), 0);
				v.spark.scale.setScalar(0.45 + Math.random() * 0.3);
				v.ring.material.opacity = 0.45 + pulse * 0.3;
				/* a thrown bomb arcs over to its tile, tumbling, and lands with a puff */
				if (b.from >= 0) {
					const u = Math.min(1, (t - b.t) / (b.land - b.t));
					v.g.position.set(
						b.fx + (b.x - b.fx) * u,
						Math.sin(u * Math.PI) * (1.8 + 0.45 * b.n) + (1 - u) * 1.2,
						b.fz + (b.z - b.fz) * u,
					);
					v.g.rotation.set(u < 1 ? u * 9 : 0, 0, u < 1 ? u * 5 : 0);
					if (u >= 1 && !b.landed) {
						b.landed = true;
						burst(W.sc, b.x, 0.2, b.z, {
							n: 8,
							shape: "ico",
							cols: ["#C9B9A6", "#A9A39A"],
							spd: 2.4,
							up: 2.5,
							grav: 8,
							life: 0.5,
						});
						if (W.tv || Math.hypot(b.x - W.me.x, b.z - W.me.z) < 12) sfx("land");
					}
				}
			}
			/* blast preview: every tile a ticking bomb will reach glows red, stronger and pulsing faster as its fuse runs down */
			{
				const o = W.fireO || (W.fireO = new THREE.Object3D()),
					col = W.fireC || (W.fireC = new THREE.Color());
				let np = 0;
				for (const id in W.bombs) {
					const b = W.bombs[id],
						fr = Math.max(0, Math.min(1, (b.bt - t) / BY.FUSE)),
						pulse = 0.5 + 0.5 * Math.sin((t - b.t) * (2 + 8 * (1 - fr)) * 6.283),
						k = (0.12 + 0.42 * Math.pow(1 - fr, 1.5)) * (0.75 + 0.25 * pulse) * (1 - this.storm(W));
					for (const q of this.cross(W, b.ci, b.rg)) {
						if (np >= 400) break;
						o.position.set(byX(q % BY.C), 0.028, byZ(Math.floor(q / BY.C)));
						o.rotation.set(0, 0, 0);
						o.scale.setScalar(1);
						o.updateMatrix();
						W.prev.setMatrixAt(np, o.matrix);
						W.prev.setColorAt(np++, col.set("#FF3B1F").multiplyScalar(k));
					}
				}
				W.prev.count = np;
				W.prev.instanceMatrix.needsUpdate = true;
				if (W.prev.instanceColor) W.prev.instanceColor.needsUpdate = true;
			}
			/* wind-up: while DROP is held the dynamite sits lit on the truck's roof, tipping back and shaking harder as the throw
			   charges (e.f.ch = when the hold started, so every screen shows it) */
			for (const e of W.list) {
				const ch = e.f && e.f.ch,
					held = typeof ch === "number" && ch >= 0 ? t - ch : -1,
					on = held >= BY.TAP && e.al && !e.d && !e.gone && !e.fly;
				let h = W.heldB && W.heldB[e.k];
				if (!on) {
					if (h) h.g.visible = false;
					continue;
				}
				if (!h) {
					W.heldB = W.heldB || {};
					h = W.heldB[e.k] = byBombModel();
					const sp = new THREE.Sprite(
						new THREE.SpriteMaterial({
							map: canvasTex(64, 64, (x, w, hh) => {
								const q = x.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2);
								q.addColorStop(0, "rgba(255,255,230,1)");
								q.addColorStop(0.3, "rgba(255,200,60,.9)");
								q.addColorStop(1, "rgba(255,120,0,0)");
								x.fillStyle = q;
								x.fillRect(0, 0, w, hh);
							}),
							transparent: true,
							depthWrite: false,
							blending: THREE.AdditiveBlending,
						}),
					);
					sp.position.set(0.05, 1.37, 0);
					h.g.add(sp);
					h.spark = sp;
					h.g.rotation.order = "YXZ";
					W.sc.add(h.g);
				}
				if (e.roofY === undefined) {
					/* the roof's height over the truck's base, measured once with the truck upright */
					e.g.updateMatrixWorld(true);
					e.roofY = new THREE.Box3().setFromObject(e.tr).max.y - e.g.position.y;
				}
				const k = Math.min(1, (held - BY.TAP) / BY.LOBT),
					pop = Math.min(1, (held - BY.TAP) / 0.12),
					wob = Math.sin(t * (10 + 22 * k)) * 0.06 * (0.4 + k),
					bx = -Math.cos(e.yaw) * 0.35,
					bz = Math.sin(e.yaw) * 0.35;
				h.g.visible = true;
				h.g.position.set(e.x + bx, e.y + e.roofY - 0.02, e.z + bz);
				h.g.rotation.set(wob, e.yaw, 0.2 + 0.55 * k);
				h.g.scale.setScalar(0.9 * pop);
				h.red.emissiveIntensity = (0.3 + 0.7 * k) * (0.5 + 0.5 * Math.sin(t * (8 + 16 * k)));
				h.spark.scale.setScalar(0.4 + Math.random() * 0.3);
			}
			/* throw aim: a square in the thrower's colour on the tile it will land on */
			for (const e of W.list) {
				const am = e.f && e.f.am,
					on = typeof am === "number" && am >= 0 && e.al && !e.d && !e.gone;
				let m = W.aimM[e.k];
				if (!on) {
					if (m) m.visible = false;
					continue;
				}
				if (!m) {
					m = W.aimM[e.k] = new THREE.Mesh(
						new THREE.RingGeometry(0.78, 1.02, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2),
						new THREE.MeshBasicMaterial({
							color: pcol(e.p),
							transparent: true,
							depthWrite: false,
							polygonOffset: true,
							polygonOffsetFactor: -5,
						}),
					);
					m.renderOrder = 3;
					W.sc.add(m);
				}
				m.visible = true;
				m.position.set(byX(am % BY.C), 0.05, byZ(Math.floor(am / BY.C)));
				m.scale.setScalar(1 + 0.08 * Math.sin(t * 12));
				m.material.opacity = 0.7 + 0.3 * Math.sin(t * 12);
			}
			/* flames, bomber style: each arm a solid beam reaching exactly the tiles it burns, ending in a rounded tip, in three
			   layers (orange outside, yellow core, white-hot middle line, each a little taller so the steep camera sees all three);
			   every burning tile glows on the floor. The beams snap out, flicker, then thin away. */
			const o = W.fireO || (W.fireO = new THREE.Object3D()),
				col = W.fireC || (W.fireC = new THREE.Color()),
				LAY = [
					["#FF6A1F", 0.95, 0.42],
					["#FFC83D", 0.58, 0.56],
					["#FFF6D0", 0.26, 0.64],
				];
			let nb = 0,
				ns = 0,
				ng = 0;
			W.flames = W.flames.filter((fl) => t - fl.t0 < BY.FLV);
			for (const fl of W.flames) {
				const u = (t - fl.t0) / BY.FLV,
					k =
						(u < 0.1 ? Math.sin((u / 0.1) * 2) / Math.sin(2) : u < 0.55 ? 1 : 1 - Math.pow((u - 0.55) / 0.45, 1.4)) *
						(1 + Math.sin(t * 40 + fl.ci) * 0.05),
					c0 = fl.ci % BY.C,
					r0 = Math.floor(fl.ci / BY.C),
					cx = byX(c0),
					cz = byZ(r0),
					arm = [0, 0, 0, 0];
				for (const q of fl.cells) {
					const dc = (q % BY.C) - c0,
						dr = Math.floor(q / BY.C) - r0;
					if (dc > 0) arm[0] = Math.max(arm[0], dc);
					else if (dc < 0) arm[1] = Math.max(arm[1], -dc);
					else if (dr > 0) arm[2] = Math.max(arm[2], dr);
					else if (dr < 0) arm[3] = Math.max(arm[3], -dr);
					if (ng < 400) {
						o.position.set(byX(q % BY.C), 0.03, byZ(Math.floor(q / BY.C)));
						o.rotation.set(0, 0, 0);
						o.scale.setScalar(1);
						o.updateMatrix();
						W.glow.setMatrixAt(ng, o.matrix);
						W.glow.setColorAt(ng++, col.set("#FF7A1A").multiplyScalar(Math.max(0, k) * 0.8));
					}
				}
				LAY.forEach(([c, hr, vr]) => {
					const h = hr * k,
						v = vr * Math.max(0, k);
					col.set(c);
					if (h <= 0.01) return;
					[
						[1, 0],
						[-1, 0],
						[0, 1],
						[0, -1],
					].forEach(([dx, dz], ai) => {
						const L = arm[ai] * BY.T;
						if (!L || nb >= 400 || ns >= 400) return;
						o.position.set(cx + (dx * L) / 2, v, cz + (dz * L) / 2);
						if (dx) {
							o.rotation.set(0, 0, Math.PI / 2);
							o.scale.set(v, L, h);
						} else {
							o.rotation.set(Math.PI / 2, 0, 0);
							o.scale.set(h, L, v);
						}
						o.updateMatrix();
						W.beam.setMatrixAt(nb, o.matrix);
						W.beam.setColorAt(nb++, col);
						o.position.set(cx + dx * L, v, cz + dz * L);
						o.rotation.set(0, 0, 0);
						o.scale.set(h, v, h);
						o.updateMatrix();
						W.ball.setMatrixAt(ns, o.matrix);
						W.ball.setColorAt(ns++, col);
					});
					if (ns < 400) {
						o.position.set(cx, v, cz);
						o.rotation.set(0, 0, 0);
						o.scale.set(h * 1.2, v * 1.15, h * 1.2);
						o.updateMatrix();
						W.ball.setMatrixAt(ns, o.matrix);
						W.ball.setColorAt(ns++, col);
					}
				});
			}
			[
				[W.beam, nb],
				[W.ball, ns],
				[W.glow, ng],
			].forEach(([im, n]) => {
				im.count = n;
				im.instanceMatrix.needsUpdate = true;
				if (im.instanceColor) im.instanceColor.needsUpdate = true;
			});
			/* pick-ups: pop up once the flames are gone, bob and spin */
			for (const ci in W.picks) {
				const pk = W.picks[ci];
				if (W.claimed.has(pk.id) || t < pk.at) continue;
				if (!pk.vis) this.pickVis(W, pk);
				const a = Math.min(1, (t - pk.at) / 0.3);
				pk.vis.g.scale.setScalar(0.2 + a * 0.8);
				pk.vis.g.position.y = 0.9 + Math.sin(t * 3 + pk.id) * 0.12;
				pk.vis.g.rotation.y = t * 2.2 + pk.id;
				pk.vis.ring.material.opacity = 0.45 + 0.25 * Math.sin(t * 5 + pk.id);
			}
			/* sudden death: a flashing warning, then the block drops in */
			let wi = 0;
			for (let i = Math.max(0, W.sdI - 3); i < W.sd.length; i++) {
				const q = W.sd[i];
				if (q.t - t > BY.SDWARN) break;
				const x = byX(q.ci % BY.C),
					z = byZ(Math.floor(q.ci / BY.C));
				if (t < q.t && wi < W.warn.length) {
					const m = W.warn[wi++],
						u = 1 - (q.t - t) / BY.SDWARN;
					m.sh.visible = m.ol.visible = true;
					m.sh.position.set(x, 0.025, z);
					m.sh.scale.setScalar(0.35 + 0.65 * u);
					m.sh.material.opacity = 0.15 + 0.6 * u;
					m.ol.position.set(x, 0.03, z);
					m.ol.material.opacity = Math.sin(t * (8 + 22 * u)) > 0 ? 0.9 : 0.25;
				}
				const fall = Math.max(0, q.t - t) / 0.45;
				if (fall < 1) W.sdKit.put(i, x, fall * fall * 14, z, 0, 1);
			}
			for (; wi < W.warn.length; wi++) W.warn[wi].sh.visible = W.warn[wi].ol.visible = false;
		},
		/* ---------- CPU ---------- */
		/* the earliest time each cell burns (Infinity = safe), from the live bombs (chains resolved) and burning cells;
		   extra = a bomb the CPU is thinking of dropping */
		danger(W, extra) {
			const N = BY.C * BY.R,
				dz = new Float32Array(N).fill(Infinity),
				L = Object.values(W.bombs).map((b) => ({ ci: b.ci, rg: b.rg, bt: b.bt }));
			if (extra) L.push(extra);
			const crosses = L.map((b) => this.cross(W, b.ci, b.rg));
			for (let it = 0; it < 4; it++)
				L.forEach((a, i) =>
					crosses[i].forEach((q) =>
						L.forEach((b) => {
							if (b.ci === q && b.bt > a.bt) b.bt = a.bt;
						}),
					),
				);
			L.forEach((b, i) => crosses[i].forEach((q) => (dz[q] = Math.min(dz[q], b.bt))));
			/* a cell burning now counts from when its blast went off, so it stays deadly until the flames die */
			for (const ci in W.flC) if (W.flC[ci].t1 > W.t) dz[ci] = Math.min(dz[ci], W.flC[ci].t1 - BY.FLT);
			return dz;
		},
		/* breadth-first search from e's cell over open cells that are not burning when e gets there */
		bfs(W, e, dz, from, avoid) {
			const N = BY.C * BY.R,
				C = BY.C,
				dist = new Int16Array(N).fill(-1),
				prev = new Int16Array(N).fill(-1),
				q = [from],
				sp = BY.SPD + BY.SPDUP * e.spl,
				cellT = BY.T / sp;
			dist[from] = 0;
			for (let h = 0; h < q.length; h++) {
				const p = q[h],
					c = p % C,
					r = Math.floor(p / C);
				for (const [dc, dr] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1],
				]) {
					const cc = c + dc,
						rr = r + dr;
					if (cc < 0 || rr < 0 || cc >= C || rr >= BY.R) continue;
					const n = rr * C + cc;
					if (dist[n] >= 0 || !this.open(W, e, n)) continue;
					/* a truck is on a tile from halfway across the one before until halfway out of it */
					const inT = W.t + (dist[p] + 0.5) * cellT - 0.1,
						outT = W.t + (dist[p] + 1.5) * cellT + 0.15;
					if (avoid && dz[n] < Infinity) continue;
					if (outT > dz[n] - 0.15 && inT < dz[n] + BY.FLT + 0.2) continue;
					dist[n] = dist[p] + 1;
					prev[n] = p;
					q.push(n);
				}
			}
			return { dist, prev, order: q, cellT };
		},
		pathTo(S, to) {
			const p = [];
			for (let q = to; q >= 0 && S.dist[q] > 0; q = S.prev[q]) p.unshift(q);
			return p;
		},
		/* crates and rivals a bomb on cell ci would hit */
		gain(W, e, ci, rg) {
			let g = 0;
			for (const q of this.cross(W, ci, rg)) {
				if (W.G[q] === 2) g += 1;
				for (const o of W.list)
					if (o !== e && !o.gone && o.al && !o.d && !o.fly && byCell(o.x, o.z) === q) g += skv(e, 1, 2.5, 4);
			}
			return g;
		},
		think(W, e) {
			const A = e.ai,
				cur = byCell(e.x, e.z),
				dz = W.dz || this.danger(W);
			A.path = [];
			A.drop = false;
			if (cur < 0) return;
			if (dz[cur] < Infinity) {
				/* in a blast's way: run to the nearest safe cell */
				const S = this.bfs(W, e, dz, cur, false);
				let best = -1;
				for (const q of S.order)
					if (dz[q] === Infinity) {
						best = q;
						break;
					}
				if (best < 0) for (const q of S.order) if (best < 0 || dz[q] > dz[best]) best = q;
				A.path = this.pathTo(S, best);
				return;
			}
			const live = Object.values(W.bombs).filter((b) => b.own === e.k).length;
			/* drop here if it hits something and there is a way out */
			if (live < e.nb && !W.bAt[cur] && W.t > 1) {
				const g = this.gain(W, e, cur, e.rg);
				if (g > 0) {
					const dz2 = this.danger(W, { ci: cur, rg: e.rg, bt: W.t + BY.FUSE });
					W.bAt[cur] = { id: -1, ci: cur };
					const S = this.bfs(W, e, dz2, cur, false);
					delete W.bAt[cur];
					let esc = -1;
					for (const q of S.order)
						if (dz2[q] === Infinity && S.dist[q] * S.cellT < BY.FUSE - skv(e, 0.2, 0.5, 0.7)) {
							esc = q;
							break;
						}
					if (esc >= 0 || Math.random() < skv(e, 0.04, 0.008, 0)) {
						A.drop = true;
						A.path = esc >= 0 ? this.pathTo(S, esc) : [];
						return;
					}
				}
			}
			/* throw at a rival: a tile 2-4 away in a straight line whose blast reaches them and not this CPU */
			if (live < e.nb && W.t > 2 && Math.random() < skv(e, 0.12, 0.35, 0.65)) {
				for (const d of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1],
				])
					for (let n = BY.LOB0; n <= BY.LOB1; n++) {
						const q = this.lobTarget(W, e, n, d);
						if (q < 0) continue;
						const cells = this.cross(W, q, e.rg);
						if (cells.includes(cur)) continue;
						const hit = W.list.some(
							(o) => o !== e && !o.gone && o.al && !o.d && !o.fly && cells.includes(byCell(o.x, o.z)),
						);
						if (!hit) continue;
						const dz2 = this.danger(W, { ci: q, rg: e.rg, bt: W.t + BY.FUSE });
						if (dz2[cur] < Infinity) continue;
						A.lob = n;
						A.ld = d;
						return;
					}
			}
			/* otherwise head for a pick-up, a spot that blasts crates or a rival, keeping out of blast zones */
			const S = this.bfs(W, e, dz, cur, true);
			let best = -1,
				bs = 0;
			for (const q of S.order) {
				const d = S.dist[q];
				let v = 0;
				const pk = W.picks[q];
				if (pk && !W.claimed.has(pk.id) && W.t >= pk.at - 0.2) v += 5;
				if (live < e.nb && !W.bAt[q]) v += this.gain(W, e, q, e.rg);
				if (v <= 0) continue;
				const sc = v / (d + 1.5);
				if (sc > bs) {
					bs = sc;
					best = q;
				}
			}
			/* nothing in reach: close in on the nearest rival */
			if (best < 0) {
				let bd = 1e9;
				for (const q of S.order)
					for (const o of W.list) {
						if (o === e || o.gone || !o.al || o.d) continue;
						const d = Math.abs(byX(q % BY.C) - o.x) + Math.abs(byZ(Math.floor(q / BY.C)) - o.z);
						if (d < bd) {
							bd = d;
							best = q;
						}
					}
			}
			if (best >= 0) A.path = this.pathTo(S, best);
		},
		bot(W, e, dt) {
			const A = e.ai || (e.ai = { path: [], nt: 0 });
			if (W.t >= A.nt) {
				A.nt = W.t + skv(e, 0.55, 0.3, 0.15) * (0.7 + Math.random() * 0.6);
				this.think(W, e);
			}
			const out = { x: 0, y: 0, boost: false };
			if (A.lob) {
				out.lob = A.lob;
				out.ld = A.ld;
				A.lob = 0;
				return out;
			}
			if (A.drop) {
				A.drop = false;
				out.boost = true;
			}
			while (A.path.length) {
				const q = A.path[0],
					x = byX(q % BY.C),
					z = byZ(Math.floor(q / BY.C));
				if (byCell(e.x, e.z) === q && Math.hypot(x - e.x, z - e.z) < 0.3) {
					A.path.shift();
					continue;
				}
				/* don't step into a cell that is burning or about to */
				const dz = W.dz,
					cur = byCell(e.x, e.z);
				if (dz && q !== cur && dz[q] < W.t + 0.3 && dz[q] + BY.FLT + 0.1 > W.t) break;
				const dx = x - e.x,
					dzz = z - e.z;
				if (Math.abs(dx) > Math.abs(dzz)) out.x = Math.sign(dx);
				else out.y = Math.sign(dzz);
				return out;
			}
			/* nothing to do: sit in the middle of the cell */
			const cur = byCell(e.x, e.z);
			if (cur >= 0) {
				const x = byX(cur % BY.C),
					z = byZ(Math.floor(cur / BY.C));
				if (Math.abs(x - e.x) > 0.15) out.x = Math.sign(x - e.x) * 0.6;
				else if (Math.abs(z - e.z) > 0.15) out.y = Math.sign(z - e.z) * 0.6;
			}
			return out;
		},
		watchSum(W) {
			const by = W.list.map((e) => `${mgName(e)} bombs ${e.bn || 0} pw ${e.nb}/${e.rg}/${e.spl}`);
			return by.join(" · ");
		},
		/* tools/nettest: the cover still standing must match on every device */
		syncSnap: (W) => (W.G ? W.G.reduce((a, v, i) => (v === 2 ? a + i : a), 0) : 0),
		botScore: () => (30 + rnd(70)) * 100,
	},
});
