/* ---------- detailed reusable props ----------
   Build a model once as a normal group (as much detail as it deserves), bakeKit() merges it into one geometry per
   material, placeKits() stamps out any number of copies with one InstancedMesh per material: detail costs almost nothing. */
function bakeKit(g) {
	g.updateMatrixWorld(true);
	const inv = g.matrixWorld.clone().invert(),
		groups = new Map(),
		m4 = new THREE.Matrix4(),
		nm = new THREE.Matrix3(),
		v = new THREE.Vector3();
	g.traverse((o) => {
		if (!o.isMesh || o.visible === false) return;
		if (!groups.has(o.material)) groups.set(o.material, []);
		groups.get(o.material).push(o);
	});
	const out = [];
	groups.forEach((parts, mat) => {
		const geos = parts.map((m) => (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry));
		let n = 0;
		geos.forEach((ge) => (n += ge.attributes.position.count));
		const P = new Float32Array(n * 3),
			N = new Float32Array(n * 3),
			C = new Float32Array(n * 3).fill(1);
		let off = 0;
		parts.forEach((m, pi) => {
			const a = geos[pi].attributes;
			m4.multiplyMatrices(inv, m.matrixWorld);
			nm.getNormalMatrix(m4);
			for (let i = 0; i < a.position.count; i++) {
				const j = (off + i) * 3;
				v.fromBufferAttribute(a.position, i).applyMatrix4(m4);
				P[j] = v.x;
				P[j + 1] = v.y;
				P[j + 2] = v.z;
				v.fromBufferAttribute(a.normal, i).applyMatrix3(nm).normalize();
				N[j] = v.x;
				N[j + 1] = v.y;
				N[j + 2] = v.z;
				if (a.color) {
					C[j] = a.color.getX(i);
					C[j + 1] = a.color.getY(i);
					C[j + 2] = a.color.getZ(i);
				}
			}
			off += a.position.count;
		});
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
		geo.setAttribute("normal", new THREE.BufferAttribute(N, 3));
		geo.setAttribute("color", new THREE.BufferAttribute(C, 3));
		out.push({ geo, mat });
	});
	return out;
}
/* list: [{k: kit index, x, y, z, ry, sc}] */
function placeKits(s, kits, list) {
	kits.forEach((kit, ki) => {
		const L = list.filter((q) => q.k === ki);
		if (!L.length) return;
		kit.forEach(({ geo, mat }) => {
			const im = new THREE.InstancedMesh(geo, mat, L.length),
				o = new THREE.Object3D();
			L.forEach((q, i) => {
				o.position.set(q.x, q.y || 0, q.z);
				o.rotation.set(0, q.ry || 0, 0);
				o.scale.setScalar(q.sc || 1);
				o.updateMatrix();
				im.setMatrixAt(i, o.matrix);
			});
			im.castShadow = im.receiveShadow = true;
			s.add(im);
		});
	});
}
/* a gable roof's end wall (triangle prism) and the roof itself, ridge along x */
function gableRoof(g, W, D, y0, RH, wall, roof, trim) {
	const tri = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, RH)]),
		attic = mesh(new THREE.ExtrudeGeometry(tri, { depth: W, bevelEnabled: false }), wall);
	attic.rotation.y = Math.PI / 2;
	attic.position.set(-W / 2, y0, 0);
	g.add(attic);
	const ang = Math.atan2(RH, D / 2),
		sl = Math.hypot(D / 2, RH) + 0.45;
	[-1, 1].forEach((sd) => {
		const p = B(W + 0.7, 0.16, sl, roof, 0, 0, 0);
		p.rotation.x = sd * ang;
		p.position.set(0, y0 + RH / 2 + 0.1 - 0.12, (sd * D) / 4 + sd * 0.16);
		g.add(p);
		/* shingle rows: thin strips that stick out of the slab, darker every other row */
		for (let r = 1; r < 5; r++) {
			const t = r / 5,
				st = B(W + 0.72, 0.05, 0.06, trim, 0, 0, 0);
			st.rotation.x = sd * ang;
			st.position.set(0, y0 + RH * (1 - t) + 0.13, sd * (D / 2) * t + sd * 0.07);
			g.add(st);
		}
		const gut = B(W + 0.7, 0.12, 0.14, "#5A6272", 0, y0 - 0.12, sd * (D / 2 + 0.42));
		g.add(gut);
	});
	g.add(B(W + 0.8, 0.16, 0.34, trim, 0, y0 + RH + 0.08, 0));
}
/* window on a wall: frame, glass with a faint glow, cross bars, sill; shutters optional */
function wallWindow(g, x, y, z, ry, w, h, frame, shut) {
	const q = new THREE.Group();
	q.position.set(x, y, z);
	q.rotation.y = ry;
	q.add(B(w + 0.2, h + 0.2, 0.08, frame, 0, 0, 0.04));
	q.add(
		B(w, h, 0.06, "#5F7C98", 0, 0, 0.06, {
			emissive: "#24384D",
			emissiveIntensity: 0.35,
			roughness: 0.25,
			metalness: 0.2,
		}),
	);
	q.add(B(0.06, h, 0.1, frame, 0, 0, 0.08), B(w, 0.06, 0.1, frame, 0, 0, 0.08));
	q.add(B(w + 0.36, 0.08, 0.22, frame, 0, -h / 2 - 0.12, 0.1));
	if (shut) [-1, 1].forEach((sd) => q.add(B(w * 0.42, h + 0.1, 0.06, shut, sd * (w / 2 + 0.1 + w * 0.21), 0, 0.05)));
	g.add(q);
}
const HOUSE_LOOK = [
	{
		wall: "#E9DCC4",
		roof: "#B5523B",
		trim: "#8E3B2A",
		acc: "#2F7DE1",
		frame: "#F7F4EE",
		shut: "#2F7DE1",
		garage: true,
	},
	{ wall: "#B8C9D9", roof: "#4A5262", trim: "#363C49", acc: "#C8402F", frame: "#F7F4EE", shut: null, garage: false },
	{
		wall: "#F0C7A8",
		roof: "#6B4A3A",
		trim: "#523629",
		acc: "#1FA35C",
		frame: "#FFFFFF",
		shut: "#1F7A4A",
		garage: false,
	},
	{ wall: "#D3E0C2", roof: "#7A3F35", trim: "#5C2E27", acc: "#FFC83D", frame: "#F7F4EE", shut: null, garage: true },
];
/* a single-storey family house with a yard, door side facing +z */
function houseModel(v) {
	const L = HOUSE_LOOK[v % HOUSE_LOOK.length],
		g = new THREE.Group(),
		W = 6,
		D = 5,
		H = 2.8,
		y0 = 0.4 + H;
	g.add(B(W + 0.24, 0.4, D + 0.24, "#8C8F96", 0, 0.2, 0));
	g.add(B(W, H, D, L.wall, 0, 0.4 + H / 2, 0));
	[-1, 1].forEach((a) =>
		[-1, 1].forEach((b) => g.add(B(0.2, H, 0.2, L.frame, a * (W / 2 - 0.07), 0.4 + H / 2, b * (D / 2 - 0.07)))),
	);
	gableRoof(g, W, D, y0, 1.7, L.wall, L.roof, L.trim);
	g.add(
		B(0.62, 1.7, 0.62, "#A0523D", W * 0.26, y0 + 1.25, -D * 0.18),
		B(0.78, 0.14, 0.78, "#5A6272", W * 0.26, y0 + 2.12, -D * 0.18),
	);
	/* front: door with canopy and step between two windows; side and back windows */
	g.add(B(1.14, 2.14, 0.08, L.frame, 0, 0.4 + 1.07, D / 2 + 0.04));
	g.add(B(0.92, 1.96, 0.1, L.acc, 0, 0.4 + 0.98, D / 2 + 0.07));
	g.add(B(0.6, 0.06, 0.12, "#FFFFFF", 0, 0.4 + 1.6, D / 2 + 0.11));
	g.add(Cy(0.05, 0.05, 0.06, 8, "#FFC83D", 0.32, 1.35, D / 2 + 0.14).rotateX(Math.PI / 2));
	g.add(B(1.5, 0.2, 0.7, "#9A9DA4", 0, 0.1, D / 2 + 0.35));
	g.add(
		B(1.8, 0.1, 1.0, L.roof, 0, 0.4 + 2.35, D / 2 + 0.5),
		B(0.08, 0.5, 0.08, L.frame, -0.8, 0.4 + 2.05, D / 2 + 0.95),
	);
	g.add(B(0.08, 0.5, 0.08, L.frame, 0.8, 0.4 + 2.05, D / 2 + 0.95));
	[-1.9, 1.9].forEach((x) => wallWindow(g, x, 0.4 + 1.5, D / 2, 0, 1.0, 1.0, L.frame, L.shut));
	[-1.6, 1.6].forEach((x) => wallWindow(g, x, 0.4 + 1.5, -D / 2, Math.PI, 1.0, 1.0, L.frame, null));
	[-1, 1].forEach((sd) => wallWindow(g, (sd * W) / 2, 0.4 + 1.5, 0, (sd * Math.PI) / 2, 1.0, 1.0, L.frame, L.shut));
	g.add(Cy(0.06, 0.06, H + 0.3, 6, "#5A6272", W / 2 + 0.2, 0.4 + H / 2, D / 2 + 0.38));
	if (L.garage) {
		/* garage on the side: flat roof, panelled roll-up door, driveway */
		const gx = -W / 2 - 1.7;
		g.add(B(3.2, 2.5, 4.6, L.wall, gx, 1.25, -0.2), B(3.5, 0.18, 4.9, L.trim, gx, 2.59, -0.2));
		g.add(B(2.5, 2.0, 0.08, "#E4E6EA", gx, 1.0, 2.14));
		for (let k = 0; k < 4; k++) g.add(B(2.5, 0.05, 0.11, "#B9BEC6", gx, 0.3 + k * 0.48, 2.17));
		g.add(B(2.8, 0.04, 4.4, "#868A91", gx, 0.02, 4.5));
	}
	/* yard: stepping-stone path, picket fence with a gate gap, mailbox, hedge, flower bed */
	for (let k = 0; k < 5; k++) g.add(B(0.62, 0.05, 0.5, "#968F84", k % 2 ? 0.08 : -0.08, 0.025, D / 2 + 1.2 + k * 0.85));
	for (let x = -4.6; x <= 4.61; x += 0.5) {
		if (Math.abs(x) < 0.7) continue;
		g.add(B(0.1, 0.8, 0.06, "#F7F4EE", x, 0.4, D / 2 + 5.4));
	}
	[0.3, 0.62].forEach((y) => [-1, 1].forEach((sd) => g.add(B(3.9, 0.07, 0.04, "#F7F4EE", sd * 2.7, y, D / 2 + 5.36))));
	g.add(B(0.1, 1.1, 0.1, "#5A3E2A", 1.1, 0.55, D / 2 + 5.6), B(0.36, 0.3, 0.55, L.acc, 1.1, 1.2, D / 2 + 5.6));
	for (let k = 0; k < 6; k++) {
		const b = mesh(new THREE.IcosahedronGeometry(0.42, 1), "#4F9A48");
		b.scale.y = 0.75;
		b.position.set(W / 2 + 0.9, 0.32, -D / 2 + 0.3 + k * 0.85);
		g.add(b);
	}
	g.add(B(2.2, 0.16, 0.6, "#6B4A33", -1.9, 0.08, D / 2 + 0.6));
	for (let k = 0; k < 7; k++) {
		const f = mesh(new THREE.IcosahedronGeometry(0.12, 0), ["#FF6FAE", "#FFE066", "#FFFFFF", "#B9A3FF"][k % 4]);
		f.position.set(-2.8 + k * 0.3, 0.26, D / 2 + 0.55 + (k % 2) * 0.12);
		g.add(f);
	}
	return g;
}
/* built per minigame (stop3D disposes geometry), a few ms */
const houseKits = () => HOUSE_LOOK.map((l, i) => bakeKit(houseModel(i)));
/* traffic car, front at -z. Built in "profile space" (x = length with the front at +x, y up, z = width) like a low-poly
   car: a side-profile body prism plus a glasshouse prism on top (chamferPrism, both convex), window panes laid along
   the slopes and sides with body-coloured frames, then turned so the front faces -z. Types: sedan, hatch, van, pickup. */
const CAR_SPEC = {
	sedan: {
		L: 4.1,
		body: [
			[-2.05, 0.3],
			[2.05, 0.3],
			[2.05, 0.74],
			[1.72, 0.94],
			[-1.82, 0.98],
			[-2.05, 0.8],
		],
		gh: [
			[-1.45, 0.96],
			[0.98, 0.94],
			[0.28, 1.52],
			[-0.92, 1.52],
		],
	},
	hatch: {
		L: 3.7,
		body: [
			[-1.85, 0.3],
			[1.85, 0.3],
			[1.85, 0.74],
			[1.5, 0.94],
			[-1.85, 0.98],
		],
		gh: [
			[-1.78, 0.96],
			[0.8, 0.94],
			[0.12, 1.54],
			[-1.62, 1.52],
		],
	},
	pickup: {
		L: 4.3,
		body: [
			[-2.15, 0.3],
			[2.15, 0.3],
			[2.15, 0.76],
			[1.8, 0.96],
			[-2.15, 0.96],
		],
		gh: [
			[-0.78, 0.94],
			[0.95, 0.94],
			[0.42, 1.56],
			[-0.72, 1.56],
		],
	},
	van: {
		L: 4.4,
		body: [
			[-2.2, 0.3],
			[2.2, 0.3],
			[2.2, 0.92],
			[1.92, 1.1],
			[1.32, 1.98],
			[-2.2, 1.98],
		],
	},
};
function carModel(type, col) {
	const S = CAR_SPEC[type],
		L = S.L,
		W = 1.9,
		g = new THREE.Group(),
		pg = new THREE.Group(),
		glass = "#2E3F55",
		dark = "#23272F",
		prism = (P, d, r, c) => {
			const m = mesh(
				chamferPrism(
					P,
					d,
					r,
					P.map(() => 0.05),
				).clone(),
				c,
			);
			pg.add(m);
			return m;
		},
		gm = { roughness: 0.25, metalness: 0.3, emissive: "#1A2636", emissiveIntensity: 0.4 },
		/* pane along a slope from (x1,y1) to (x2,y2) in profile space, sitting just outside it */
		slopePane = (x1, y1, x2, y2, w, inset) => {
			const dx = x2 - x1,
				dy = y2 - y1,
				l = Math.hypot(dx, dy),
				nx = dy / l,
				ny = -dx / l,
				p = B(l - 2 * inset, 0.03, w, glass, (x1 + x2) / 2 + nx * 0.03, (y1 + y2) / 2 + ny * 0.03, 0, gm);
			p.rotation.z = Math.atan2(dy, dx);
			pg.add(p);
		};
	pg.rotation.y = Math.PI / 2;
	g.add(pg);
	prism(S.body, W, 0.07, col);
	if (type === "van") {
		const [, , , a, b] = S.body;
		slopePane(a[0], a[1], b[0], b[1], W - 0.3, 0.1);
		/* cab door windows follow the windscreen slope, so their front edge stays inside the body */
		const fx = (y) => a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) - 0.12,
			lo = 1.24,
			hi = 1.76,
			win = new THREE.ExtrudeGeometry(
				new THREE.Shape([
					new THREE.Vector2(0.72, lo),
					new THREE.Vector2(fx(lo), lo),
					new THREE.Vector2(fx(hi), hi),
					new THREE.Vector2(0.72, hi),
				]),
				{ depth: 0.03, bevelEnabled: false },
			);
		[-1, 1].forEach((sd) => {
			const wm = mesh(win, glass, gm);
			wm.position.z = sd > 0 ? W / 2 + 0.002 : -W / 2 - 0.032;
			pg.add(wm);
			pg.add(B(0.05, 0.6, 0.03, dark, 0.65, 1.5, sd * (W / 2 + 0.02)));
		});
		const stripe = col === "#F4F6F9" || col === "#FFC83D" ? "#2F7DE1" : "#F4F6F9";
		pg.add(B(L - 0.5, 0.16, W + 0.06, stripe, -0.15, 1.08, 0));
		[-1, 1].forEach((sd) => {
			pg.add(B(0.03, 0.42, 0.62, glass, -L / 2 - 0.015, 1.52, sd * 0.42, gm));
			pg.add(
				B(0.05, 1.3, 0.03, dark, -0.2, 1.3, sd * (W / 2 + 0.02)),
				B(0.05, 1.3, 0.03, dark, 0.55, 1.3, sd * (W / 2 + 0.02)),
			);
			pg.add(B(0.16, 0.05, 0.03, dark, 0.35, 1.2, sd * (W / 2 + 0.02)));
		});
		pg.add(B(0.03, 1.4, 0.04, dark, -L / 2 - 0.015, 1.15, 0));
	} else {
		const G = S.gh,
			gw = W - 0.24;
		prism(G, gw, 0.06, col);
		/* windscreen and rear window on the slopes, side windows split by a B-pillar */
		slopePane(G[1][0], G[1][1], G[2][0], G[2][1], gw - 0.22, 0.08);
		slopePane(G[3][0], G[3][1], G[0][0], G[0][1], gw - 0.22, 0.08);
		const mid = (G[2][0] + G[3][0]) / 2,
			top = G[2][1] - 0.1,
			bot = G[0][1] + 0.06,
			fr = (y) => G[1][0] + ((G[2][0] - G[1][0]) * (y - G[1][1])) / (G[2][1] - G[1][1]),
			rr = (y) => G[0][0] + ((G[3][0] - G[0][0]) * (y - G[0][1])) / (G[3][1] - G[0][1]),
			yc = (top + bot) / 2,
			h = top - bot;
		[-1, 1].forEach((sd) => {
			const z = sd * (gw / 2 + 0.016),
				f = Math.min(fr(top), fr(bot)) - 0.1,
				b = Math.max(rr(top), rr(bot)) + 0.1;
			pg.add(B(f - mid - 0.08, h, 0.03, glass, (f + mid + 0.08) / 2, yc, z, gm));
			pg.add(B(mid - 0.08 - b, h, 0.03, glass, (mid - 0.08 + b) / 2, yc, z, gm));
		});
		if (type === "pickup") {
			[-1, 1].forEach((sd) => pg.add(B(1.3, 0.42, 0.08, col, -1.5, 1.17, sd * (W / 2 - 0.04))));
			pg.add(B(0.08, 0.42, W, col, -2.11, 1.17, 0), B(1.3, 0.04, W - 0.16, dark, -1.5, 0.98, 0));
		}
		if (type === "sedan" && col === "#FFC83D")
			pg.add(
				B(0.3, 0.24, 0.78, "#151B24", mid, G[2][1] + 0.12, 0),
				B(0.32, 0.18, 0.74, "#FFE066", mid, G[2][1] + 0.13, 0),
			);
		[-1, 1].forEach((sd) => pg.add(B(0.16, 0.12, 0.14, col, G[1][0] - 0.05, G[1][1] + 0.08, sd * (gw / 2 + 0.1))));
	}
	/* lights, grille, bumpers, plate, door seams, wheels with hubcaps */
	const fy = S.body[2][1] - 0.18;
	[-1, 1].forEach((sd) => {
		pg.add(B(0.04, 0.15, 0.4, "#FFF6D8", L / 2 + 0.01, fy, sd * 0.6, { emissive: "#FFE9B0", emissiveIntensity: 0.6 }));
		pg.add(
			B(0.04, 0.15, 0.34, "#E5484D", -L / 2 - 0.01, fy + (type === "van" ? 0.05 : 0.04), sd * 0.66, {
				emissive: "#B5121B",
				emissiveIntensity: 0.6,
			}),
		);
	});
	pg.add(B(0.04, 0.16, 0.7, dark, L / 2 + 0.01, fy, 0), B(0.04, 0.13, 0.46, "#F4F6F9", -L / 2 - 0.01, fy - 0.2, 0));
	[-1, 1].forEach((sx) => pg.add(B(0.2, 0.2, W + 0.06, "#3A3F48", sx * (L / 2 + 0.02), 0.38, 0)));
	if (type !== "van") pg.add(B(0.03, 0.5, W + 0.05, dark, type === "pickup" ? 0.95 : 0.25, 0.64, 0));
	[-1, 1].forEach((sx) =>
		[-1, 1].forEach((sd) => {
			const x = sx * (L / 2 - 0.82),
				z = sd * (W / 2 - 0.06),
				w = Cy(0.38, 0.38, 0.28, 14, "#1D2230", x, 0.38, z),
				hc = Cy(0.2, 0.2, 0.3, 10, "#C9CED8", x, 0.38, z);
			w.rotation.x = hc.rotation.x = Math.PI / 2;
			pg.add(w, hc);
		}),
	);
	return g;
}
const CAR_TYPES = ["sedan", "hatch", "van", "pickup"];
