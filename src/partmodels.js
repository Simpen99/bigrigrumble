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
			C = new Float32Array(n * 3).fill(1),
			UV = mat.map ? new Float32Array(n * 2) : null;
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
				if (UV && a.uv) {
					UV[(off + i) * 2] = a.uv.getX(i);
					UV[(off + i) * 2 + 1] = a.uv.getY(i);
				}
			}
			off += a.position.count;
		});
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
		geo.setAttribute("normal", new THREE.BufferAttribute(N, 3));
		geo.setAttribute("color", new THREE.BufferAttribute(C, 3));
		if (UV) geo.setAttribute("uv", new THREE.BufferAttribute(UV, 2));
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
		const p = B(W + (sd > 0 ? 0.7 : 0.74), 0.16, sl, roof, 0, 0, 0);
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
		const gut = B(W + 0.62, 0.12, 0.14, "#5A6272", 0, y0 - 0.12, sd * (D / 2 + 0.42));
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
	q.add(B(0.06, h, 0.1, frame, 0, 0, 0.08), B(w, 0.06, 0.12, frame, 0, 0, 0.08));
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
		for (let k = 0; k < 4; k++) g.add(B(2.44, 0.05, 0.11, "#B9BEC6", gx, 0.3 + k * 0.48, 2.17));
		g.add(B(2.8, 0.04, 4.4, "#868A91", gx, 0.02, 4.5));
	}
	/* yard: stepping-stone path, picket fence with a gate gap, mailbox, hedge, flower bed */
	for (let k = 0; k < 5; k++) g.add(B(0.62, 0.05, 0.5, "#968F84", k % 2 ? 0.08 : -0.08, 0.025, D / 2 + 1.2 + k * 0.85));
	for (let x = -4.6; x <= 4.61; x += 0.5) {
		if (Math.abs(x) < 0.7) continue;
		g.add(B(0.1, 0.8, 0.06, "#F7F4EE", x, 0.4, D / 2 + 5.4));
	}
	[0.3, 0.62].forEach((y) => [-1, 1].forEach((sd) => g.add(B(3.96, 0.07, 0.04, "#F7F4EE", sd * 2.7, y, D / 2 + 5.36))));
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
		pg.add(B(0.03, 1.2, 0.04, dark, -L / 2 - 0.015, 1.27, 0));
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
			[-1, 1].forEach((sd) => pg.add(B(1.26, 0.42, 0.08, col, -1.48, 1.17, sd * (W / 2 - 0.04))));
			pg.add(B(0.08, 0.4, W - 0.02, col, -2.11, 1.16, 0), B(1.26, 0.04, W - 0.16, dark, -1.48, 0.98, 0));
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
	pg.add(
		B(0.04, 0.16, 0.7, dark, L / 2 + 0.01, fy, 0),
		B(0.04, 0.13, 0.46, "#F4F6F9", -L / 2 - 0.01, Math.max(fy - 0.2, 0.57), 0),
	);
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

/* ---------- buildings ---------- */
/* canvas textures for shop signs and striped awnings (cached per text / colour pair) */
const BLD_TEX = {};
function signTexture(txt, bg, fg) {
	const k = "s" + txt + bg + fg;
	return (
		BLD_TEX[k] ||
		(BLD_TEX[k] = canvasTex(256, 48, (x, w, h) => {
			x.fillStyle = bg;
			x.fillRect(0, 0, w, h);
			x.strokeStyle = fg;
			x.globalAlpha = 0.5;
			x.lineWidth = 2;
			x.strokeRect(5, 5, w - 10, h - 10);
			x.globalAlpha = 1;
			x.font = "26px Bungee, 'Arial Black', Impact, sans-serif";
			x.textAlign = "center";
			x.textBaseline = "middle";
			x.fillStyle = fg;
			x.fillText(txt, w / 2, h / 2 + 2);
		}))
	);
}
function stripeTexture(a, b) {
	const k = "a" + a + b;
	return (
		BLD_TEX[k] ||
		(BLD_TEX[k] = canvasTex(64, 16, (x, w, h) => {
			for (let i = 0; i < 8; i++) {
				x.fillStyle = i % 2 ? b : a;
				x.fillRect(i * 8, 0, 8, h);
			}
		}))
	);
}
/* a textured box (sign boards, awnings): plain colour on the sides, the texture on the front/top */
function texturedBox(w, h, d, col, tex, face, rx, ry) {
	const mats = [0, 1, 2, 3, 4, 5].map(() => M(col));
	const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
	mats[face] = m;
	const geo = new THREE.BoxGeometry(w, h, d);
	if (rx || ry) {
		const uv = geo.attributes.uv;
		for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (rx || 1), uv.getY(i) * (ry || 1));
	}
	const g = new THREE.Group();
	/* split the multi-material box into one mesh per face so bakeKit can merge by material */
	geo.groups.forEach((gr) => {
		const part = new THREE.BufferGeometry(),
			idx = geo.index.array.slice(gr.start, gr.start + gr.count),
			pick = (att, n) => {
				const out = new Float32Array(idx.length * n);
				idx.forEach((v, i) => {
					for (let c = 0; c < n; c++) out[i * n + c] = att.array[v * n + c];
				});
				return new THREE.BufferAttribute(out, n);
			};
		part.setAttribute("position", pick(geo.attributes.position, 3));
		part.setAttribute("normal", pick(geo.attributes.normal, 3));
		part.setAttribute("uv", pick(geo.attributes.uv, 2));
		const mm = new THREE.Mesh(part, mats[gr.materialIndex]);
		mm.castShadow = mm.receiveShadow = true;
		g.add(mm);
	});
	return g;
}
const SHOPS = [
	{ name: "BAKERY", sign: "#7A4A2A", fg: "#FFE7B0", aw: ["#E5484D", "#FFF3E0"], door: "#7A4A2A" },
	{ name: "CAFE", sign: "#1F5D4A", fg: "#F4F1E8", aw: ["#1FA35C", "#F4F1E8"], door: "#1F5D4A" },
	{ name: "BOOKS", sign: "#2B3A67", fg: "#FFD27A", aw: ["#2F7DE1", "#F4F1E8"], door: "#2B3A67" },
	{ name: "PIZZA", sign: "#B5262B", fg: "#FFFFFF", aw: ["#B5262B", "#FFFFFF"], door: "#3A3F48" },
	{ name: "FLOWERS", sign: "#8E5BE0", fg: "#FFFFFF", aw: ["#FF6FAE", "#FFFFFF"], door: "#5E3A9E" },
	{ name: "HARDWARE", sign: "#FFC83D", fg: "#2A2F3A", aw: ["#FF8A1F", "#2A2F3A"], door: "#2A2F3A" },
	{ name: "GROCER", sign: "#3E7B2C", fg: "#FFFFFF", aw: ["#3E7B2C", "#F4F1E8"], door: "#3E7B2C" },
	{ name: "BARBER", sign: "#22252C", fg: "#FFFFFF", aw: ["#2F7DE1", "#E5484D"], door: "#22252C" },
];
/* a street building, front at +z: shop on the ground floor (or a plain entrance), upper floors in one of four styles,
   floor bands, cornice, parapet roof with AC units, a water tank or a stair hut.
   o: {w (along the street), d (depth), floors, wall, trim, style: "brick"|"apt"|"office"|"plain", shop: SHOPS[i] or null, roofBits} */
function buildingModel(o) {
	const g = new THREE.Group(),
		w = o.w || 8.4,
		d = o.d || 7.8,
		gf = 3.4,
		fh = 2.8,
		H = gf + (o.floors - 1) * fh,
		wall = o.wall,
		trim = o.trim || "#E9E4DA",
		glass = "#3E4E63",
		gm = { roughness: 0.2, metalness: 0.3, emissive: "#22324A", emissiveIntensity: 0.35 },
		fz = d / 2;
	g.add(B(w, H, d, wall, 0, H / 2, 0));
	/* ground floor */
	[-1, 1].forEach((sd) => g.add(B(0.46, gf, 0.24, trim, sd * (w / 2 - 0.18), gf / 2, fz + 0.06)));
	if (o.shop) {
		const S = o.shop,
			dx = w / 2 - 1.6,
			lit = { roughness: 0.25, metalness: 0.2, emissive: "#FFD6A0", emissiveIntensity: 0.32 };
		/* display windows either side of the door, stall risers, door with glass, sign fascia, striped awning */
		[
			[-w / 2 + 0.42, dx - 0.65],
			[dx + 0.65, w / 2 - 0.42],
		].forEach(([a, b]) => {
			if (b - a < 0.4) return;
			const cx = (a + b) / 2,
				ww = b - a;
			g.add(B(ww, 0.55, 0.16, trim, cx, 0.28, fz + 0.05));
			g.add(B(ww - 0.1, 1.9, 0.06, "#4A5566", cx, 1.55, fz + 0.03, lit));
			for (let k = 1; k < Math.round(ww / 1.4); k++)
				g.add(B(0.07, 1.94, 0.1, trim, a + (k * ww) / Math.round(ww / 1.4), 1.55, fz + 0.05));
			g.add(B(ww, 0.08, 0.12, trim, cx, 2.54, fz + 0.06));
		});
		g.add(B(1.3, 2.5, 0.12, trim, dx, 1.25, fz + 0.06), B(1.04, 2.3, 0.14, S.door, dx, 1.17, fz + 0.07));
		g.add(
			B(0.7, 1.1, 0.06, "#4A5566", dx, 1.55, fz + 0.15, lit),
			B(0.06, 0.2, 0.06, "#C9A44A", dx + 0.42, 1.15, fz + 0.17),
		);
		const sg = texturedBox(w - 1.0, 0.62, 0.16, S.sign, signTexture(S.name, S.sign, S.fg), 4);
		sg.position.set(0, gf - 0.36, fz + 0.1);
		g.add(sg);
		const aw = texturedBox(
			w - 1.4,
			0.06,
			1.25,
			S.aw[0],
			stripeTexture(S.aw[0], S.aw[1]),
			2,
			Math.round((w - 1.4) / 0.6) / 8,
			1,
		);
		aw.rotation.x = 0.38;
		aw.position.set(0, gf - 1.02, fz + 0.62);
		g.add(aw);
		const lip = texturedBox(
			w - 1.36,
			0.26,
			0.04,
			S.aw[0],
			stripeTexture(S.aw[0], S.aw[1]),
			4,
			Math.round((w - 1.4) / 0.6) / 8,
			1,
		);
		lip.position.set(0, gf - 1.37, fz + 1.2);
		g.add(lip);
	} else {
		/* residential entrance: double door under a small canopy, two ground-floor windows */
		g.add(B(1.6, 2.6, 0.12, trim, 0, 1.3, fz + 0.06), B(1.3, 2.4, 0.14, "#5A3E2A", 0, 1.2, fz + 0.07));
		g.add(B(0.05, 2.3, 0.16, "#3A2A1C", 0, 1.17, fz + 0.08), B(2.0, 0.12, 0.9, trim, 0, 2.75, fz + 0.45));
		[-1, 1].forEach((sd) => window3(g, sd * (w / 4 + 0.4), 1.7, fz, 1.2, 1.4, trim, glass, gm));
	}
	/* upper floors */
	const n = Math.max(2, Math.floor(w / 2.1)),
		xs = Array.from({ length: n }, (_, i) => -w / 2 + (w / n) * (i + 0.5));
	for (let f = 1; f < o.floors; f++) {
		const y0 = gf + (f - 1) * fh;
		g.add(B(w + 0.06, 0.16, d + 0.06, trim, 0, y0, 0));
		if (o.style === "office") {
			g.add(B(w - 0.5, 1.7, 0.06, glass, 0, y0 + 1.35, fz + 0.03, gm));
			for (let k = 0; k <= n; k++)
				g.add(B(0.1, 1.74, 0.1, trim, -w / 2 + 0.25 + (k * (w - 0.5)) / n, y0 + 1.35, fz + 0.05));
			g.add(B(w - 0.36, 0.1, 0.14, trim, 0, y0 + 0.47, fz + 0.07));
		} else
			xs.forEach((x, k) => {
				window3(g, x, y0 + 1.4, fz, 1.05, 1.45, trim, glass, gm);
				if (o.style === "brick") g.add(B(1.3, 0.2, 0.14, "#8C4A35", x, y0 + 2.27, fz + 0.07));
				if (o.style === "apt" && (k + f) % 2 === 0) {
					/* balcony: slab, railing posts, top rail */
					g.add(B(1.7, 0.12, 0.85, trim, x, y0 + 0.4, fz + 0.425));
					for (let q = -3; q <= 3; q++) g.add(B(0.04, 0.6, 0.04, "#3A3F48", x + q * 0.27, y0 + 0.76, fz + 0.79));
					[-1, 1].forEach((sd) => g.add(B(0.04, 0.6, 0.04, "#3A3F48", x + sd * 0.83, y0 + 0.76, fz + 0.45)));
					g.add(B(1.74, 0.05, 0.06, "#3A3F48", x, y0 + 1.07, fz + 0.79));
					[-1, 1].forEach((sd) => g.add(B(0.06, 0.04, 0.8, "#3A3F48", x + sd * 0.83, y0 + 1.07, fz + 0.43)));
				}
			});
	}
	/* cornice, parapet, roof */
	g.add(B(w + 0.36, 0.32, d + 0.36, trim, 0, H + 0.16, 0));
	g.add(B(w + 0.2, 0.5, 0.22, wall, 0, H + 0.57, fz - 0.01), B(w + 0.2, 0.5, 0.22, wall, 0, H + 0.57, -fz + 0.01));
	[-1, 1].forEach((sd) => g.add(B(0.22, 0.5, d - 0.42, wall, sd * (w / 2 - 0.01), H + 0.57, 0)));
	g.add(B(w + 0.26, 0.08, 0.28, trim, 0, H + 0.86, fz - 0.01), B(w + 0.26, 0.08, 0.28, trim, 0, H + 0.86, -fz + 0.01));
	g.add(B(w - 0.2, 0.05, d - 0.4, "#6B7079", 0, H + 0.345, 0));
	const rb = o.roofBits || 0;
	g.add(B(1.0, 0.62, 0.8, "#C9CED8", -w / 4, H + 0.68, -d / 6));
	g.add(Cy(0.3, 0.3, 0.06, 12, "#3A3F48", -w / 4, H + 1.02, -d / 6));
	if (rb % 3 === 0) {
		g.add(
			Cy(0.75, 0.75, 1.3, 10, "#8C6A4A", w / 4, H + 1.6, d / 8),
			Cy(0.82, 0.05, 0.5, 10, "#5A3E2A", w / 4, H + 2.5, d / 8),
		);
		[-1, 1].forEach((a) =>
			[-1, 1].forEach((b) => g.add(B(0.1, 0.62, 0.1, "#3A3F48", w / 4 + a * 0.5, H + 0.66, d / 8 + b * 0.5))),
		);
	} else if (rb % 3 === 1) {
		g.add(B(1.6, 1.4, 1.4, wall, w / 4, H + 1.06, -d / 5), B(1.8, 0.1, 1.6, trim, w / 4, H + 1.8, -d / 5));
		g.add(B(0.8, 1.1, 0.06, "#5A6272", w / 4, H + 0.92, -d / 5 + 0.72));
	} else
		g.add(
			B(1.0, 0.62, 0.8, "#C9CED8", w / 4, H + 0.68, d / 8),
			Cy(0.3, 0.3, 0.06, 12, "#3A3F48", w / 4, H + 1.02, d / 8),
		);
	return g;
}
/* window: frame, glass with cross bar, sill */
function window3(g, x, y, fz, w, h, trim, glass, gm) {
	g.add(B(w + 0.18, h + 0.18, 0.1, trim, x, y, fz + 0.05));
	g.add(B(w, h, 0.06, glass, x, y, fz + 0.08, gm));
	g.add(B(0.06, h, 0.12, trim, x, y, fz + 0.1), B(w, 0.06, 0.14, trim, x, y + h * 0.15, fz + 0.1));
	g.add(B(w + 0.34, 0.09, 0.24, trim, x, y - h / 2 - 0.13, fz + 0.12));
}
/* street building variants: [shop index, floors, style, wall, trim] */
const BLD_LOOK = [
	[0, 3, "brick", "#B5654A", "#EDE6D8"],
	[1, 4, "apt", "#E6D8BE", "#FFFFFF"],
	[2, 5, "office", "#9FB3C8", "#E9EDF2"],
	[3, 2, "brick", "#A4523D", "#EDE6D8"],
	[4, 3, "apt", "#E8B4A0", "#FFF7EE"],
	[5, 4, "plain", "#C9D6B8", "#F4F6F0"],
	[6, 3, "apt", "#D9C3A5", "#FFFFFF"],
	[7, 4, "brick", "#9C5A48", "#EDE6D8"],
];
const buildingKits = (w, d) =>
	BLD_LOOK.map(([s, f, st, wall, trim], i) =>
		bakeKit(buildingModel({ w, d, floors: f, style: st, wall, trim, shop: SHOPS[s], roofBits: i })),
	);
/* fire station, front at +z: two red-brick storeys, the upper one overhanging three apparatus bays (two roll-up doors,
   the middle one open with a dark interior), FIRE STATION sign, windows, cornice and parapet, a hose-drying tower with
   louvres and a pyramid roof, a siren on the roof and a concrete apron. A truck can be parked in the open bay. */
function fireStationModel() {
	const g = new THREE.Group(),
		w = 12,
		d = 7,
		gh = 4,
		uh = 3,
		H = gh + uh,
		fz = d / 2,
		wall = "#B5392E",
		trim = "#F2EEE6",
		glass = "#3E4E63",
		gm = { roughness: 0.2, metalness: 0.3, emissive: "#22324A", emissiveIntensity: 0.35 };
	g.add(B(w, gh, d - 0.7, wall, 0, gh / 2, -0.35), B(w, uh, d, wall, 0, gh + uh / 2, 0));
	[-w / 2 + 0.27, -2, 2, w / 2 - 0.27].forEach((x) => g.add(B(0.6, gh, 0.74, trim, x, gh / 2, fz - 0.35)));
	g.add(B(w + 0.12, 0.3, 0.74, trim, 0, gh - 0.15, fz - 0.33));
	[-4, 0, 4].forEach((x, k) => {
		const z0 = fz - 0.7;
		if (k === 1) {
			g.add(B(3.38, gh - 0.3, 0.06, "#14171D", x, (gh - 0.3) / 2, z0 + 0.03));
			g.add(B(3.38, 0.06, 0.6, "#2A2E36", x, gh - 0.33, z0 + 0.32));
		} else {
			g.add(B(3.38, gh - 0.3, 0.08, "#F4F4F2", x, (gh - 0.3) / 2, z0 + 0.04));
			for (let r = 1; r < 8; r++) if (r !== 5) g.add(B(3.38, 0.05, 0.12, "#C9CED6", x, r * 0.45, z0 + 0.06));
			for (let q = -1.5; q <= 1.5; q++) g.add(B(0.6, 0.32, 0.12, glass, x + q * 0.78, 5 * 0.45, z0 + 0.06, gm));
		}
	});
	/* upper floor: sign board over the bays, windows, cornice and parapet */
	const sg = texturedBox(6.4, 0.8, 0.14, "#F2F2F2", signTexture("FIRE STATION", "#F2F2F2", "#C8262B"), 4);
	sg.position.set(0, gh + 0.55, fz + 0.07);
	g.add(sg);
	[-4.6, -2.3, 2.3, 4.6].forEach((x) => window3(g, x, gh + 1.75, fz, 1.1, 1.3, trim, glass, gm));
	window3(g, 0, gh + 1.9, fz, 1.6, 1.0, trim, glass, gm);
	g.add(B(w + 0.36, 0.32, d + 0.36, trim, 0, H + 0.16, 0));
	g.add(B(w + 0.2, 0.5, 0.22, wall, 0, H + 0.57, fz - 0.01), B(w + 0.2, 0.5, 0.22, wall, 0, H + 0.57, -fz + 0.01));
	[-1, 1].forEach((sd) => g.add(B(0.22, 0.5, d - 0.42, wall, sd * (w / 2 - 0.01), H + 0.57, 0)));
	g.add(B(w + 0.26, 0.08, 0.28, trim, 0, H + 0.86, fz - 0.01), B(w + 0.26, 0.08, 0.28, trim, 0, H + 0.86, -fz + 0.01));
	g.add(B(w - 0.2, 0.05, d - 0.4, "#6B7079", 0, H + 0.345, 0));
	/* siren on a short mast, AC unit */
	g.add(Cy(0.06, 0.06, 1.0, 6, "#5A6272", -3, H + 0.85, -1), Cy(0.22, 0.3, 0.36, 10, "#C8262B", -3, H + 1.5, -1));
	g.add(B(1.0, 0.62, 0.8, "#C9CED8", 2.5, H + 0.68, -1.5), Cy(0.3, 0.3, 0.06, 12, "#3A3F48", 2.5, H + 1.02, -1.5));
	/* hose tower on the right: tall brick shaft with windows, louvred top and pyramid roof */
	const tx = w / 2 + 1.15,
		tz = -d / 2 + 1.25,
		th = 10;
	g.add(B(2.3, th, 2.5, wall, tx, th / 2, tz));
	for (let k = 0; k < 3; k++) window3(g, tx, 2 + k * 2.4, tz + 1.25, 0.7, 1.1, trim, glass, gm);
	for (let k = 0; k < 4; k++) g.add(B(2.38, 0.07, 2.58, "#8E96A3", tx, th - 1.2 + k * 0.3, tz));
	g.add(B(2.5, 0.2, 2.7, trim, tx, th + 0.1, tz));
	const py = mesh(new THREE.ConeGeometry(1.85, 1.4, 4), "#3A3F48");
	py.rotation.y = Math.PI / 4;
	py.position.set(tx, th + 0.9, tz);
	g.add(py);
	/* apron in front of the bays with a painted keep-clear box */
	g.add(B(w + 0.4, 0.06, 4, "#A2A6AD", 0, 0.0, fz + 2));
	[-4, 0, 4].forEach((x) => g.add(B(3.0, 0.02, 0.12, "#F2C230", x, 0.035, fz + 3.6)));
	return g;
}
