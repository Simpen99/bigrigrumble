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
	/* footprint for the contact shadow: x/z extent of the main mass (above 30% of the height, so aprons, yards and fences don't count) */
	let y0 = 1e9,
		y1 = -1e9;
	out.forEach(({ geo }) => {
		const p = geo.attributes.position;
		for (let i = 0; i < p.count; i++) {
			y0 = Math.min(y0, p.getY(i));
			y1 = Math.max(y1, p.getY(i));
		}
	});
	y0 = Math.max(0, y0);
	const yc = y0 + Math.max(0.15, (y1 - y0) * 0.3);
	const bb = new THREE.Box3();
	out.forEach(({ geo }) => {
		const p = geo.attributes.position;
		for (let i = 0; i < p.count; i++) if (p.getY(i) > yc) bb.expandByPoint(v.fromBufferAttribute(p, i));
	});
	if (!bb.isEmpty()) out.foot = { x0: bb.min.x, x1: bb.max.x, z0: bb.min.z, z1: bb.max.z, y0 };
	return out;
}
/* ---------- contact shadows: a soft dark footprint under props so they sit on the ground instead of looking pasted in.
   9-slice quad: the dark core is the footprint, the fade runs m metres outward (same width whatever the prop's size). */
var SHADOW_MAT = {};
function shadowMat(op) {
	if (SHADOW_MAT[op]) return SHADOW_MAT[op];
	if (!SHADOW_MAT.tex) {
		const n = 64,
			c = document.createElement("canvas");
		c.width = c.height = n;
		const x = c.getContext("2d"),
			im = x.createImageData(n, n);
		for (let j = 0; j < n; j++)
			for (let i = 0; i < n; i++) {
				const u = Math.max(0, Math.abs((i + 0.5) / n - 0.5) * 4 - 1),
					v = Math.max(0, Math.abs((j + 0.5) / n - 0.5) * 4 - 1),
					t = Math.max(0, 1 - Math.hypot(u, v));
				im.data[(j * n + i) * 4 + 3] = Math.round(t * t * 255);
			}
		x.putImageData(im, 0, 0);
		SHADOW_MAT.tex = new THREE.CanvasTexture(c);
	}
	return (SHADOW_MAT[op] = new THREE.MeshBasicMaterial({
		color: "#000000",
		map: SHADOW_MAT.tex,
		transparent: true,
		opacity: op,
		depthWrite: false,
		polygonOffset: true,
		polygonOffsetFactor: -1,
		polygonOffsetUnits: -2,
	}));
}
/* flat 9-slice shadow geometry: footprint w x d centred on (cx, cz) at height y, fading out over m (and slightly inward) */
function shadowGeo(w, d, m, cx = 0, cz = 0, y = 0.03) {
	const hw = Math.max(0, w / 2 - m * 0.3),
		hd = Math.max(0, d / 2 - m * 0.3),
		mm = m * 1.3,
		xs = [-hw - mm, -hw, hw, hw + mm],
		zs = [-hd - mm, -hd, hd, hd + mm],
		uv = [0, 0.25, 0.75, 1],
		P = [],
		UV = [],
		I = [];
	for (let j = 0; j < 4; j++)
		for (let i = 0; i < 4; i++) {
			P.push(cx + xs[i], y, cz + zs[j]);
			UV.push(uv[i], uv[j]);
		}
	for (let j = 0; j < 3; j++)
		for (let i = 0; i < 3; i++) {
			const a = j * 4 + i;
			I.push(a, a + 4, a + 1, a + 1, a + 4, a + 5);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2));
	g.setAttribute(
		"normal",
		new THREE.Float32BufferAttribute(
			new Array(48).fill(0).map((_, k) => (k % 3 === 1 ? 1 : 0)),
			3,
		),
	);
	g.setIndex(I);
	return g;
}
/* a contact shadow mesh: w x d footprint (round props: w = d = diameter, the fade makes it soft and round) */
function contactShadow(w, d, op = 0.3, x = 0, z = 0, y = 0.03, m) {
	const sh = new THREE.Mesh(shadowGeo(w, d, m || Math.min(1.1, 0.2 + 0.12 * Math.min(w, d)), x, z, y), shadowMat(op));
	sh.renderOrder = 1;
	sh.userData.shadow = true;
	return sh;
}
function kitShadowGeo(kit) {
	const f = kit.foot,
		w = f.x1 - f.x0,
		d = f.z1 - f.z0;
	return shadowGeo(w, d, Math.min(1.1, 0.2 + 0.12 * Math.min(w, d)), (f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, f.y0 + 0.04);
}
/* a baked kit as a normal group (for things that move or toggle), with its contact shadow */
function kitGroup(kit, shadow = 0.3) {
	const g = new THREE.Group();
	kit.forEach(({ geo, mat }) => {
		const m = new THREE.Mesh(geo, mat);
		m.castShadow = m.receiveShadow = true;
		g.add(m);
	});
	if (shadow && kit.foot) {
		const sh = new THREE.Mesh(kit.shGeo || (kit.shGeo = kitShadowGeo(kit)), shadowMat(shadow));
		sh.renderOrder = 1;
		sh.userData.shadow = true;
		g.add(sh);
	}
	return g;
}
/* list: [{k: kit index, x, y, z, ry, sc}]; shadow = contact shadow opacity (0 = none) */
function placeKits(s, kits, list, shadow = 0.3) {
	kits.forEach((kit, ki) => {
		const L = list.filter((q) => q.k === ki);
		if (!L.length) return;
		const parts = kit.map(({ geo, mat }) => ({ geo, mat }));
		if (shadow && kit.foot)
			parts.push({ geo: kit.shGeo || (kit.shGeo = kitShadowGeo(kit)), mat: shadowMat(shadow), sh: 1 });
		parts.forEach(({ geo, mat, sh }) => {
			const im = new THREE.InstancedMesh(geo, mat, L.length),
				o = new THREE.Object3D();
			L.forEach((q, i) => {
				o.position.set(q.x, q.y || 0, q.z);
				o.rotation.set(0, q.ry || 0, 0);
				o.scale.setScalar(q.sc || 1);
				o.updateMatrix();
				im.setMatrixAt(i, o.matrix);
			});
			im.castShadow = im.receiveShadow = !sh;
			if (sh) im.renderOrder = 1;
			/* r128 culls an InstancedMesh by the base geometry at the origin, not by where the copies are */
			im.frustumCulled = false;
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
	g.add(B(w + 0.4, 0.06, 4.6, "#A2A6AD", 0, 0.0, fz + 2.3));
	[-4, 0, 4].forEach((x) => g.add(B(3.0, 0.02, 0.12, "#F2C230", x, 0.035, fz + 3.6)));
	return g;
}
/* ---------- Fire Brigade's burning props, front at +z (small, so only the details that read from above):
   0 garden shed (plank battens, door with a Z brace, side window, pitched roof with a ridge cap),
   1 news kiosk (counter, glass hatch, striped awning, overhanging roof, NEWS sign, posters),
   2 parked car (carModel, scaled down to the trucks' size) */
function firePropModel(kind, col) {
	const g = new THREE.Group();
	if (kind === 0) {
		const W = 1.6,
			D = 1.2,
			y0 = 1.08,
			RH = 0.45,
			wood = "#9A6A44",
			dark = "#6B4A2B";
		g.add(B(W + 0.1, 0.08, D + 0.1, "#5A4A3A", 0, 0.04, 0), B(W, 1.0, D, wood, 0, 0.58, 0));
		[-0.7, -0.42, 0.42, 0.7].forEach((x) => g.add(B(0.05, 0.96, 0.03, dark, x, 0.58, D / 2 + 0.015)));
		[-0.55, -0.18, 0.18, 0.55].forEach((x) => g.add(B(0.05, 0.96, 0.03, dark, x, 0.58, -D / 2 - 0.015)));
		[-0.45, 0, 0.45].forEach((z) => g.add(B(0.03, 0.96, 0.05, dark, -W / 2 - 0.015, 0.58, z)));
		g.add(B(0.52, 0.86, 0.04, "#7A4E30", 0, 0.51, D / 2 + 0.02));
		const br = B(0.06, 0.58, 0.03, dark, 0, 0.51, D / 2 + 0.055);
		br.rotation.z = 0.5;
		g.add(br, B(0.44, 0.06, 0.03, dark, 0, 0.82, D / 2 + 0.055), B(0.44, 0.06, 0.03, dark, 0, 0.2, D / 2 + 0.055));
		g.add(Cy(0.03, 0.03, 0.05, 6, "#C9A44A", 0.18, 0.52, D / 2 + 0.065).rotateX(Math.PI / 2));
		g.add(B(0.03, 0.36, 0.5, "#9FC6E0", W / 2 + 0.015, 0.68, 0, { emissive: "#FFD6A0", emissiveIntensity: 0.2 }));
		g.add(B(0.06, 0.42, 0.06, dark, W / 2 + 0.035, 0.68, 0), B(0.04, 0.06, 0.56, dark, W / 2 + 0.035, 0.68, 0));
		g.add(B(0.08, 0.05, 0.6, dark, W / 2 + 0.04, 0.47, 0));
		const tri = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, RH)]),
			at = mesh(new THREE.ExtrudeGeometry(tri, { depth: W, bevelEnabled: false }), wood);
		at.rotation.y = Math.PI / 2;
		at.position.set(-W / 2, y0, 0);
		g.add(at);
		const a = Math.atan2(RH, D / 2),
			sl = Math.hypot(D / 2, RH) + 0.2;
		[-1, 1].forEach((sd) => {
			const p = B(W + (sd > 0 ? 0.24 : 0.27), 0.07, sl, "#3A4150", 0, 0, 0);
			p.rotation.x = sd * a;
			p.position.set(
				0,
				y0 + RH / 2 + 0.04 * Math.cos(a) - 0.08 * Math.sin(a),
				sd * (D / 4 + 0.04 * Math.sin(a) + 0.08 * Math.cos(a)),
			);
			g.add(p);
		});
		g.add(B(W + 0.28, 0.07, 0.14, "#2A2F3A", 0, y0 + RH + 0.06, 0));
	} else if (kind === 1) {
		const W = 1.2,
			gr = "#2E9E5B",
			dg = "#1F7A45";
		g.add(B(1.32, 0.12, 1.32, "#5A6272", 0, 0.06, 0), B(W, 1.2, W, gr, 0, 0.72, 0));
		[-1, 1].forEach((sx) => [-1, 1].forEach((sz) => g.add(B(0.06, 1.24, 0.06, dg, sx * 0.6, 0.74, sz * 0.6))));
		g.add(B(0.96, 0.44, 0.03, "#4A5566", 0, 1.02, W / 2 + 0.015, { emissive: "#FFD6A0", emissiveIntensity: 0.35 }));
		g.add(B(0.04, 0.42, 0.05, dg, 0, 1.01, W / 2 + 0.025), B(1.04, 0.05, 0.05, dg, 0, 1.26, W / 2 + 0.025));
		g.add(B(1.04, 0.06, 0.28, "#C9D1DC", 0, 0.77, W / 2 + 0.14));
		[-0.4, 0.4].forEach((x) => g.add(B(0.04, 0.12, 0.22, "#8E96A3", x, 0.68, W / 2 + 0.11)));
		[-0.28, 0, 0.28].forEach((x, k) =>
			g.add(B(0.2, 0.05, 0.16, ["#F4F6F9", "#FFE7B0", "#DCE6F2"][k], x, 0.825, W / 2 + 0.14)),
		);
		const aw = texturedBox(1.16, 0.04, 0.42, "#E5484D", stripeTexture("#E5484D", "#FFFFFF"), 2, 0.75, 1);
		aw.rotation.x = 0.42;
		aw.position.set(0, 1.22, W / 2 + 0.19);
		g.add(aw);
		g.add(B(1.5, 0.1, 1.5, "#23272F", 0, 1.39, 0), B(1.36, 0.08, 1.36, dg, 0, 1.48, 0));
		const sg = texturedBox(0.9, 0.24, 0.06, "#FFC83D", signTexture("NEWS", "#FFC83D", "#2A2F3A"), 4);
		sg.position.set(0, 1.72, 0.25);
		g.add(sg, B(0.06, 0.14, 0.04, "#2A2F3A", -0.3, 1.59, 0.25), B(0.06, 0.14, 0.04, "#2A2F3A", 0.3, 1.59, 0.25));
		[-1, 1].forEach((sd) => {
			g.add(B(0.03, 0.5, 0.4, sd > 0 ? "#E5484D" : "#2F7DE1", sd * (W / 2 + 0.015), 0.72, 0.1));
			g.add(B(0.03, 0.3, 0.4, "#F4F6F9", sd * (W / 2 + 0.015), 0.72, -0.34));
		});
	} else {
		const c = carModel("sedan", col || "#8E96A3");
		c.scale.setScalar(0.6);
		g.add(c);
	}
	return g;
}

/* ---------- contact shadows for many copies of one footprint (stacks, crane legs, posts): one InstancedMesh.
   list: [{x, y, z, ry}], y = the surface they stand on */
function placeShadows(s, w, d, op, list) {
	if (!list.length) return;
	const im = new THREE.InstancedMesh(
			shadowGeo(w, d, Math.min(1.1, 0.2 + 0.12 * Math.min(w, d))),
			shadowMat(op),
			list.length,
		),
		o = new THREE.Object3D();
	list.forEach((q, i) => {
		o.position.set(q.x, q.y || 0, q.z);
		o.rotation.set(0, q.ry || 0, 0);
		o.updateMatrix();
		im.setMatrixAt(i, o.matrix);
	});
	im.renderOrder = 1;
	im.frustumCulled = false;
	s.add(im);
}

/* ---------- port ---------- */
/* 20 ft shipping container: 2.4 x 2.5 x 6, length along z, cargo doors at +z, base at y 0. Steel frame (corner posts,
   rails, castings) in a darker shade, corrugated walls and roof, two cargo doors with locking bars, handles, hinges
   and a data plate, forklift pockets. lod 1 (distant stacks) drops the small door hardware and paints the corrugation
   on as a soft stripe texture: thin geometric ribs far away are under a pixel wide and alias into dashed lines. */
var CONT_MAT = {};
function corrugatedMat(col) {
	if (!CONT_MAT.tex) {
		CONT_MAT.tex = canvasTex(64, 8, (x, w, h) => {
			const gr = x.createLinearGradient(0, 0, w, 0);
			gr.addColorStop(0, "#FFFFFF");
			gr.addColorStop(0.45, "#FFFFFF");
			gr.addColorStop(0.7, "#C8C8C8");
			gr.addColorStop(1, "#FFFFFF");
			x.fillStyle = gr;
			x.fillRect(0, 0, w, h);
		});
		CONT_MAT.tex.wrapS = CONT_MAT.tex.wrapT = THREE.RepeatWrapping;
	}
	return (
		CONT_MAT[col] ||
		(CONT_MAT[col] = new THREE.MeshStandardMaterial({
			color: col,
			map: CONT_MAT.tex,
			flatShading: true,
			roughness: 0.78,
			metalness: 0.04,
		}))
	);
}
/* box with UVs in rib periods: stripes run up the walls (one per 0.42 m) and across the roof (one per 0.6 m) */
function corrugatedBox(w, h, d, col, x, y, z) {
	const geo = new THREE.BoxGeometry(w, h, d),
		P = geo.attributes.position,
		N = geo.attributes.normal,
		uv = geo.attributes.uv;
	for (let i = 0; i < P.count; i++) {
		const nx = Math.abs(N.getX(i)),
			ny = Math.abs(N.getY(i));
		uv.setXY(i, (nx > 0.5 ? P.getZ(i) : ny > 0.5 ? P.getZ(i) * 0.7 : P.getX(i)) / 0.42, 0);
	}
	const m = new THREE.Mesh(geo, corrugatedMat(col));
	m.position.set(x, y, z);
	m.castShadow = m.receiveShadow = true;
	return m;
}
function containerModel(col, lod = 0) {
	const g = new THREE.Group(),
		fr = "#" + new THREE.Color(col).multiplyScalar(0.72).getHexString(),
		cast = "#3A3F48",
		dark = "#23272F";
	g.add(lod ? corrugatedBox(2.3, 2.28, 5.68, col, 0, 1.25, 0) : B(2.3, 2.28, 5.68, col, 0, 1.25, 0));
	[-1, 1].forEach((sx) => {
		[0.1, 2.4].forEach((y) => {
			[-1, 1].forEach((sz) => g.add(B(0.2, 0.2, 0.22, cast, sx * 1.1, y, sz * 2.89)));
			g.add(B(0.14, 0.2, 5.56, fr, sx * 1.13, y, 0), B(2.0, 0.2, 0.14, fr, 0, y, sx * 2.93));
		});
		[-1, 1].forEach((sz) => g.add(B(0.16, 2.1, 0.16, fr, sx * 1.12, 1.25, sz * 2.92)));
		/* corrugated side walls */
		if (!lod) for (let z = -2.52; z <= 2.53; z += 0.42) g.add(B(0.03, 2.04, 0.2, col, sx * 1.165, 1.25, z));
		/* the two cargo doors (and a vertical rib on each) over a dark seam */
		g.add(B(0.98, 2.06, 0.05, col, sx * 0.505, 1.25, 2.885));
		if (!lod) g.add(B(0.12, 1.9, 0.03, col, sx * 0.5, 1.25, 2.925));
	});
	g.add(B(2.0, 2.1, 0.02, dark, 0, 1.25, 2.85));
	if (!lod) {
		[-1, 1].forEach((sx) => {
			[-1, 1].forEach((sz) => g.add(B(0.02, 0.12, 0.34, dark, sx * 1.21, 0.1, sz * 1.0)));
			[0.5, 1.25, 2.0].forEach((y) => g.add(B(0.06, 0.14, 0.06, cast, sx * 1.01, y, 2.93)));
		});
		/* locking bars with keepers and handles */
		[-0.8, -0.2, 0.2, 0.8].forEach((x) => {
			g.add(Cy(0.025, 0.025, 2.0, 6, cast, x, 1.25, 2.955));
			[0.4, 2.1].forEach((y) => g.add(B(0.1, 0.08, 0.06, cast, x, y, 2.94)));
			g.add(B(0.3, 0.05, 0.04, cast, x + (Math.abs(x) > 0.5 ? -0.15 : 0.15) * Math.sign(x), 1.1, 2.99));
		});
		g.add(B(0.2, 0.16, 0.02, "#C9CED8", 0.65, 1.75, 2.92));
		/* horizontal ribs on the front wall, shallow ribs across the roof */
		[0.55, 0.95, 1.35, 1.75, 2.15].forEach((y) => g.add(B(2.0, 0.12, 0.04, col, 0, y, -2.86)));
		for (let z = -2.4; z <= 2.41; z += 0.6) g.add(B(2.1, 0.03, 0.18, col, 0, 2.405, z));
	}
	return g;
}
const containerKits = (cols, lod) => cols.map((c) => bakeKit(containerModel(c, lod)));
/* container ship, ~120 m, bow at -x, keel at y 0, main deck at y 6.12 (sits at the waterline when placed at y -1.6).
   Low-poly hull from convex slices (red bottom, white boot-top stripe, navy topsides, raised forecastle) with a flared,
   raked bow; deck with hatch covers, lashing bridges and railings; accommodation block aft with window rows, a bridge
   with wings and a radar mast, a slanted funnel, lifeboats on davits, anchors, mooring winches and the line's name.
   userData.bays = [{x, rows}]: container bays on the hatch covers (y = userData.deckY), rows across the beam 2.55 apart. */
function shipModel() {
	const g = new THREE.Group(),
		navy = "#1D3557",
		white = "#F4F6F9",
		deck = "#6E7A72",
		grey = "#C9CED8",
		dark = "#23272F",
		glass = "#2E3F55",
		gm = { roughness: 0.25, metalness: 0.3, emissive: "#1A2636", emissiveIntensity: 0.4 },
		V = (x, y, z) => new THREE.Vector3(x, y, z),
		/* hull plan at height y (o = grow outward): transom stern at +x, parallel midbody, bow tapering to -x */
		ring = (y, o = 0) => {
			const hb = (y < 1.8 ? 6.2 + y * 0.44 : 7) + o,
				sx = 55 + y * 0.8 + o,
				tip = -53 - y * 1.15 - o,
				mx = -50 - y * 0.5;
			return [
				[sx, -hb + 1.6],
				[sx, hb - 1.6],
				[sx - 1.6, hb],
				[-38, hb],
				[mx, hb * 0.7],
				[tip, 0.6 + o],
				[tip, -0.6 - o],
				[mx, -hb * 0.7],
				[-38, -hb],
				[sx - 1.6, -hb],
			];
		},
		/* keep the part of a convex plan polygon with x < xc (keep = -1) or x > xc (keep = 1) */
		clip = (P, xc, keep) => {
			const out = [],
				ins = (p) => (p[0] - xc) * keep >= 0;
			P.forEach((p, i) => {
				const q = P[(i + 1) % P.length];
				if (ins(p)) out.push(p);
				if (ins(p) !== ins(q)) {
					const t = (xc - p[0]) / (q[0] - p[0]);
					out.push([xc, p[1] + (q[1] - p[1]) * t]);
				}
			});
			return out;
		},
		slice = (y0, y1, o, col, xc, keep) => {
			const pts = [];
			[y0, y1].forEach((y) => {
				let P = ring(y, o);
				if (xc !== undefined) P = clip(P, xc, keep);
				P.forEach(([x, z]) => pts.push(V(x, y, z)));
			});
			const m = mesh(new THREE.ConvexGeometry(pts), col);
			g.add(m);
			return m;
		};
	/* hull */
	slice(0, 1.8, 0, "#B5313A");
	slice(1.8, 2.2, 0.04, white);
	slice(2.2, 6, 0, navy);
	slice(6, 8.4, 0, navy, -45, -1);
	slice(6, 6.12, -0.4, deck, -45, 1);
	slice(8.4, 8.52, -0.35, deck, -45.35, -1);
	const nameTex = canvasTex(512, 48, (x, w, h) => {
		x.fillStyle = navy;
		x.fillRect(0, 0, w, h);
		x.font = "34px Bungee, 'Arial Black', Impact, sans-serif";
		x.textAlign = "center";
		x.textBaseline = "middle";
		x.fillStyle = white;
		x.fillText("RUMBLE LINES", w / 2, h / 2 + 2);
	});
	[-1, 1].forEach((sd) => {
		const nb = texturedBox(20, 1.9, 0.06, navy, nameTex, sd > 0 ? 4 : 5);
		nb.position.set(-26, 4.1, sd * 7.03);
		g.add(nb);
	});
	/* hatch covers (two panels per bay) and lashing bridges between the bays */
	const bays = [],
		deckY = 6.6;
	for (let k = 0; k < 12; k++) {
		const x = -40 + k * 6.4,
			rows = k ? 5 : 3,
			hw = (rows * 2.55) / 2 + 0.2;
		bays.push({ x, rows });
		[-1, 1].forEach((sd) => g.add(B(6.2, 0.48, hw - 0.06, deck, x, 6.36, (sd * (hw + 0.06)) / 2)));
		[-1, 1].forEach((sd) => g.add(B(6.0, 0.06, 0.12, "#5A655E", x, 6.63, sd * (hw - 0.12))));
		if (k < 11) {
			const lx = x + 3.2;
			[-5.1, -2.55, 0, 2.55, 5.1].forEach((z) => g.add(B(0.2, 2.5, 0.2, grey, lx, 7.37, z)));
			g.add(B(0.36, 0.1, 10.6, grey, lx, 8.67, 0), B(0.06, 0.06, 10.6, "#FFC83D", lx, 9.6, 0));
			[-5.1, 0, 5.1].forEach((z) => g.add(B(0.04, 0.9, 0.04, "#FFC83D", lx, 9.17, z)));
		}
	}
	/* deck railings along the midbody */
	[-1, 1].forEach((sd) => {
		g.add(B(73, 0.07, 0.07, white, -1.5, 7.15, sd * 6.75));
		for (let x = -37.5; x <= 35; x += 2.5) g.add(B(0.05, 1.03, 0.05, white, x, 6.635, sd * 6.75));
	});
	/* forecastle: windlasses, bollards, foremast with a masthead light */
	g.add(Cy(0.16, 0.2, 7, 8, grey, -52, 12, 0), B(0.16, 0.16, 3, grey, -52, 14.4, 0));
	g.add(Cy(0.22, 0.22, 0.3, 8, "#FFF6D8", -52, 15.65, 0, { emissive: "#FFE9B0", emissiveIntensity: 0.8 }));
	[-1, 1].forEach((sd) => {
		const w = Cy(0.5, 0.5, 1.4, 10, "#5E636D", -48.5, 9.0, sd * 2.2);
		w.rotation.x = Math.PI / 2;
		g.add(w, B(1.2, 0.5, 0.5, "#3A3F48", -48.5, 8.77, sd * 3.0));
		[-0.5, 0.5].forEach((dx) => g.add(Cy(0.18, 0.2, 0.6, 8, dark, -50 + dx, 8.82, sd * 2.9)));
	});
	/* anchors in their pockets either side of the bow */
	{
		const R = ring(5),
			[mx, mz] = R[4],
			[tx, tz] = R[5],
			t = 0.24,
			px = mx + (tx - mx) * t,
			pz = mz + (tz - mz) * t,
			a = Math.atan2(mz - tz, mx - tx);
		[-1, 1].forEach((sd) => {
			const an = new THREE.Group();
			an.position.set(px, 0, sd * pz);
			an.rotation.y = -sd * a;
			an.add(B(1.6, 1.6, 0.3, "#151B24", 0, 5, sd * 0.02));
			an.add(B(0.26, 1.5, 0.22, dark, 0, 4.9, sd * 0.2), B(1.2, 0.26, 0.22, dark, 0, 4.2, sd * 0.2));
			g.add(an);
		});
	}
	/* accommodation block: deck bands, window rows on every side */
	const ax = 40.8;
	g.add(B(10, 13.9, 12, white, ax, 13.07, 0));
	for (let k = 1; k <= 4; k++) g.add(B(10.1, 0.12, 12.1, "#D9DEE6", ax, 6.12 + k * 2.8, 0));
	for (let k = 0; k < 5; k++) {
		const y = 6.12 + k * 2.8 + 1.5;
		[-3.5, -1.2, 1.2, 3.5].forEach((dx) =>
			[-1, 1].forEach((sd) => g.add(B(1.3, 0.8, 0.04, glass, ax + dx, y, sd * 6.02, gm))),
		);
		[-4.5, -2.25, 0, 2.25, 4.5].forEach((z) => g.add(B(0.04, 0.8, 1.3, glass, ax - 5.02, y, z, gm)));
		[-3, 3].forEach((z) => g.add(B(0.04, 0.8, 1.3, glass, ax + 5.02, y, z, gm)));
	}
	/* bridge with wings, window band and a visor roof */
	g.add(B(9, 3, 13, white, ax, 21.5, 0), B(3, 0.3, 16.6, white, ax - 3.1, 20.15, 0));
	[-1, 1].forEach((sd) => {
		g.add(B(3, 1.0, 0.08, white, ax - 3.1, 20.8, sd * 8.26), B(0.08, 1.0, 1.72, white, ax - 4.56, 20.8, sd * 7.36));
		g.add(B(0.9, 1.0, 0.7, grey, ax - 3, 20.8, sd * 7.6));
	});
	g.add(B(0.04, 1.3, 12.4, glass, ax - 4.52, 21.8, 0, gm));
	for (let z = -6; z <= 6.01; z += 1.2) g.add(B(0.06, 1.36, 0.12, white, ax - 4.55, 21.8, z));
	[-1, 1].forEach((sd) => g.add(B(7.4, 1.3, 0.04, glass, ax, 21.8, sd * 6.52, gm)));
	g.add(B(9.4, 0.3, 13.4, "#D9DEE6", ax, 23.15, 0));
	/* radar mast, scanners, navigation lights, satcom domes */
	g.add(B(0.5, 4, 0.5, grey, ax + 2, 25.3, 0), B(0.22, 0.22, 4.4, grey, ax + 2, 26.8, 0));
	g.add(B(2.0, 0.16, 3.2, grey, ax + 1.6, 24.6, 0));
	g.add(B(0.26, 0.24, 3.4, dark, ax + 1.4, 25.25, -0.2), B(0.3, 0.46, 0.3, dark, ax + 1.4, 24.91, -0.2));
	g.add(Cy(0.12, 0.12, 0.3, 6, "#E5484D", ax + 2, 27.06, -2, { emissive: "#B5121B", emissiveIntensity: 0.8 }));
	g.add(Cy(0.12, 0.12, 0.3, 6, "#3BD16F", ax + 2, 27.06, 2, { emissive: "#1A8A3C", emissiveIntensity: 0.8 }));
	[-1, 1].forEach((sd) => {
		const dm = mesh(new THREE.SphereGeometry(0.6, 10, 6), white);
		dm.position.set(ax + 3.4, 24.25, sd * 4.5);
		g.add(dm, Cy(0.2, 0.25, 0.6, 8, grey, ax + 3.4, 23.6, sd * 4.5));
	});
	/* funnel casing and a slanted funnel: red band, black top */
	g.add(B(5, 13, 5, white, 48.9, 12.62, 0));
	const fP = (y0, y1, o) => {
		const xl = (y) => -2.2 + (1.1 * y) / 8,
			xr = (y) => 2.2 + (0.7 * y) / 8;
		return [
			[xl(y0) - o, y0],
			[xr(y0) + o, y0],
			[xr(y1) + o, y1],
			[xl(y1) - o, y1],
		];
	};
	[
		[0, 8, 0, white, 4],
		[4.6, 6.2, 0.04, "#E5484D", 4.08],
		[7.2, 8.06, 0.04, "#151B24", 4.08],
	].forEach(([y0, y1, o, c, d]) => {
		const f = mesh(chamferPrism(fP(y0, y1, o), d, 0.08, []), c);
		f.position.set(48.9, 19.1, 0);
		g.add(f);
	});
	/* lifeboats on davits either side of the accommodation */
	[-1, 1].forEach((sd) => {
		const lb = new THREE.Group();
		lb.position.set(ax + 1, 12.4, sd * 7.05);
		lb.add(
			mesh(
				chamferPrism(
					[
						[-2.1, 0],
						[2.1, 0],
						[2.6, 0.8],
						[-2.6, 0.8],
					],
					1.7,
					0.08,
					[0.3, 0.3],
				),
				"#FF8A1F",
			),
			mesh(
				chamferPrism(
					[
						[-2.4, 0.78],
						[2.4, 0.78],
						[1.9, 1.5],
						[-2.0, 1.5],
					],
					1.5,
					0.1,
					[0, 0, 0.3, 0.3],
				),
				"#FF8A1F",
			),
		);
		[-1.2, 0, 1.2].forEach((x) => lb.add(B(0.6, 0.26, 0.04, glass, x, 1.12, sd * 0.74, gm)));
		g.add(lb);
		[-1.8, 1.8].forEach((dx) => g.add(B(0.25, 3.0, 0.9, grey, ax + 1 + dx, 13.4, sd * 6.4)));
	});
	/* stern mooring deck: winches, bollards, ensign staff */
	[-1, 1].forEach((sd) => {
		const w = Cy(0.5, 0.5, 1.4, 10, "#5E636D", 54.5, 6.6, sd * 2.5);
		w.rotation.x = Math.PI / 2;
		g.add(w, B(1.2, 0.5, 0.5, "#3A3F48", 54.5, 6.37, sd * 3.3));
		[-0.5, 0.5].forEach((dx) => g.add(Cy(0.18, 0.2, 0.6, 8, dark, 57 + dx, 6.42, sd * 4.8)));
	});
	g.add(Cy(0.08, 0.08, 4, 6, grey, 59.5, 8.1, 0));
	g.userData.bays = bays;
	g.userData.deckY = deckY;
	return g;
}

/* ---------- cargo crates (Crate Drop): 1 x 0.8 x 1, centred on the origin ----------
   faint plank texture (tinted by the material colour), UVs in metres so planks stay 0.2 m wide on every face */
var WOOD = {};
function plankMat(col) {
	if (!WOOD.tex) {
		WOOD.tex = canvasTex(64, 64, (x, w, h) => {
			for (let j = 0; j < 4; j++) {
				const v = 236 + ((j * 7) % 4) * 6;
				x.fillStyle = `rgb(${v},${v},${v})`;
				x.fillRect(0, j * 16, w, 16);
				x.globalAlpha = 0.07;
				x.fillStyle = "#000";
				for (let k = 0; k < 3; k++) x.fillRect(0, j * 16 + 3 + k * 4 + (j % 2), w, 1);
				x.globalAlpha = 0.4;
				x.fillRect(0, j * 16, w, 1);
				x.globalAlpha = 1;
			}
		});
		WOOD.tex.wrapS = WOOD.tex.wrapT = THREE.RepeatWrapping;
	}
	return (
		WOOD[col] ||
		(WOOD[col] = new THREE.MeshStandardMaterial({ color: col, map: WOOD.tex, flatShading: true, roughness: 0.85 }))
	);
}
function plankBox(w, h, d, col, x, y, z) {
	const geo = new THREE.BoxGeometry(w, h, d),
		P = geo.attributes.position,
		N = geo.attributes.normal,
		uv = geo.attributes.uv;
	for (let i = 0; i < P.count; i++) {
		const nx = Math.abs(N.getX(i)),
			ny = Math.abs(N.getY(i));
		uv.setXY(i, (nx > 0.5 ? P.getZ(i) : P.getX(i)) / 0.8, (ny > 0.5 ? P.getZ(i) : P.getY(i)) / 0.8 + 0.5);
	}
	const m = new THREE.Mesh(geo, plankMat(col));
	m.position.set(x, y, z);
	m.castShadow = m.receiveShadow = true;
	return m;
}
/* stencil decal: text on a transparent plane, facing +z (rotate it onto other faces) */
function stencil(txt, w, h, col, op) {
	const k = "st" + txt + col;
	if (!WOOD[k]) {
		const tex = canvasTex(256, Math.round((256 * h) / w), (x, cw, ch) => {
			x.font = `${Math.round(ch * 0.62)}px Bungee, 'Arial Black', Impact, sans-serif`;
			x.textAlign = "center";
			x.textBaseline = "middle";
			x.fillStyle = col;
			x.fillText(txt, cw / 2, ch / 2 + 1);
		});
		WOOD[k] = new THREE.MeshStandardMaterial({
			map: tex,
			transparent: true,
			opacity: op,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -2,
			polygonOffsetUnits: -4,
			roughness: 0.9,
		});
	}
	return new THREE.Mesh(new THREE.PlaneGeometry(w, h), WOOD[k]);
}
/* v 0 pine crate (edge battens, X braces, FRAGILE stamp), 1 dark crate (straps, steel corners, rope handles),
   2 painted steel case (ribs, rims, label), 3 carton on a pallet (taped, labelled) */
function crateModel(v) {
	const g = new THREE.Group(),
		put = (m, x, y, z, ry) => {
			m.position.set(x, y, z);
			m.rotation.y = ry || 0;
			g.add(m);
		};
	if (v === 0) {
		const fr = "#A8743F";
		g.add(plankBox(0.9, 0.7, 0.9, "#E2B07A", 0, 0, 0));
		[-1, 1].forEach((a) =>
			[-1, 1].forEach((b) => {
				g.add(B(1.0, 0.1, 0.1, fr, 0, a * 0.35, b * 0.45), B(0.1, 0.1, 0.8, fr, a * 0.45, b * 0.35, 0));
				g.add(B(0.1, 0.6, 0.1, fr, a * 0.45, 0, b * 0.45));
			}),
		);
		[-1, 1].forEach((sd) => {
			const br = B(0.96, 0.09, 0.04, fr, 0, 0, sd * 0.47);
			br.rotation.z = sd * Math.atan2(0.6, 0.8);
			g.add(br, B(0.04, 0.09, 0.8, fr, sd * 0.47, 0, 0));
			put(stencil("FRAGILE", 0.62, 0.17, "#B5262B", 0.8), sd * 0.452, 0.16, 0, (sd * Math.PI) / 2);
		});
	} else if (v === 1) {
		g.add(plankBox(0.94, 0.74, 0.94, "#B98352", 0, 0, 0));
		[-0.22, 0.22].forEach((y) => g.add(B(0.98, 0.07, 0.98, "#5A3A22", 0, y, 0)));
		[-1, 1].forEach((a) =>
			[-1, 1].forEach((b) =>
				[-1, 1].forEach((c) => g.add(B(0.14, 0.14, 0.14, "#8E96A3", a * 0.43, b * 0.33, c * 0.43))),
			),
		);
		[-1, 1].forEach((sd) => {
			g.add(B(0.04, 0.05, 0.34, "#3A3F48", sd * 0.51, 0.05, 0));
			[-0.13, 0.13].forEach((z) => g.add(B(0.04, 0.09, 0.04, "#3A3F48", sd * 0.49, 0.05, z)));
		});
		put(stencil("THIS SIDE UP", 0.7, 0.16, "#2A1A0E", 0.6), 0, 0, 0.472);
	} else if (v === 2) {
		const col = "#3E7CB1",
			rib = "#2B5C86",
			rim = "#2A4A6B";
		g.add(B(0.92, 0.72, 0.92, col, 0, 0, 0));
		[-0.38, 0.38].forEach((y) => g.add(B(1.0, 0.04, 1.0, rim, 0, y, 0)));
		[-1, 1].forEach((sd) =>
			[-0.22, 0.22].forEach((o) => {
				g.add(B(0.06, 0.66, 0.03, rib, o, 0, sd * 0.475), B(0.03, 0.66, 0.06, rib, sd * 0.475, 0, o));
			}),
		);
		g.add(B(0.3, 0.2, 0.02, "#F4F6F9", 0, 0.05, 0.47));
		put(stencil("BRR", 0.26, 0.14, "#2A2F3A", 0.85), 0, 0.05, 0.481);
		g.add(B(0.38, 0.06, 0.02, "#FFC83D", 0, -0.2, 0.47));
	} else {
		[-0.43, 0, 0.43].forEach((z) => g.add(plankBox(1.0, 0.1, 0.14, "#C49A68", 0, -0.35, z)));
		[-0.42, -0.21, 0, 0.21, 0.42].forEach((x) => g.add(plankBox(0.16, 0.03, 1.0, "#D2A874", x, -0.285, 0)));
		g.add(B(0.94, 0.67, 0.94, "#C9A26B", 0, 0.065, 0));
		g.add(B(0.18, 0.02, 0.96, "#E6CFA0", 0, 0.405, 0));
		[-1, 1].forEach((sd) => g.add(B(0.17, 0.24, 0.02, "#E6CFA0", 0, 0.28, sd * 0.48)));
		g.add(B(0.26, 0.18, 0.02, "#F4F6F9", 0.24, -0.06, 0.475));
		[0.17, 0.2, 0.22, 0.26, 0.29, 0.31].forEach((x) => g.add(B(0.012, 0.08, 0.01, "#23272F", x, -0.09, 0.489)));
	}
	return g;
}
var CRATE_KITS;
const crateKits = () => CRATE_KITS || (CRATE_KITS = [0, 1, 2, 3].map((v) => bakeKit(crateModel(v))));

/* ---------- rubber-tyred gantry crane spanning lanes along x (legs at x = +-span/2, z centred), girders at y ~15:
   tyre bogies on sill beams with hazard stripes, legs with a diagonal brace and a ladder, portal beams, two girders
   with trolley rails and a name board, a generator house and a beacon */
function rtgModel(span) {
	const g = new THREE.Group(),
		Y = "#E0A800",
		dark = "#23272F",
		hz = stripeTexture("#FFC83D", "#23272F");
	hz.wrapS = THREE.RepeatWrapping;
	[-1, 1].forEach((sd) => {
		const lx = (sd * span) / 2;
		g.add(B(0.9, 0.7, 6.4, Y, lx, 1.05, 0));
		const st = texturedBox(0.02, 0.36, 5.6, Y, hz, sd > 0 ? 0 : 1, 7, 1);
		st.position.set(lx + sd * 0.46, 1.05, 0);
		g.add(st);
		[-2.85, -2.0, 2.0, 2.85].forEach((z) => {
			const w = Cy(0.42, 0.42, 0.36, 12, "#1D2230", lx, 0.42, z),
				hb = Cy(0.2, 0.2, 0.38, 8, "#C9CED8", lx, 0.42, z);
			w.rotation.z = hb.rotation.z = Math.PI / 2;
			g.add(w, hb);
		});
		[-2.5, 2.5].forEach((z) => g.add(B(0.6, 13.2, 0.6, Y, lx, 8.0, z)));
		const br = B(0.25, Math.hypot(4.4, 10), 0.25, Y, lx, 7.5, 0);
		br.rotation.x = Math.atan2(4.4, 10);
		g.add(br, B(0.3, 0.3, 4.4, Y, lx, 8.5, 0));
		g.add(B(1.0, 1.2, 6.2, Y, lx, 15.0, 0));
	});
	[-1.1, 1.1].forEach((z) => {
		g.add(B(span + 0.6, 1.0, 0.55, Y, 0, 15.15, z));
		g.add(B(span - 1.0, 0.08, 0.12, dark, 0, 15.69, z));
	});
	const nb = texturedBox(5, 0.66, 0.04, Y, signTexture("RUMBLE PORT", "#E0A800", "#23272F"), 4);
	nb.position.set(0, 15.15, 1.395);
	g.add(nb);
	/* generator house on the left portal, beacon on the right */
	const gx = -span / 2;
	g.add(B(1.6, 1.5, 3.0, "#F4F6F9", gx, 16.35, 0), B(0.02, 0.5, 1.4, "#3A3F48", gx - 0.81, 16.35, 0));
	g.add(B(1.7, 0.1, 3.1, Y, gx, 17.15, 0), Cy(0.1, 0.1, 0.8, 8, "#3A3F48", gx + 0.4, 17.6, 0.8));
	g.add(Cy(0.13, 0.15, 0.24, 8, "#FF8A1F", span / 2, 15.72, 2.2, { emissive: "#FF6A00", emissiveIntensity: 0.7 }));
	/* ladder up the front right leg */
	const lx = span / 2 + 0.38;
	[-0.2, 0.2].forEach((dz) => g.add(B(0.04, 12.4, 0.04, dark, lx, 7.9, 2.5 + dz)));
	for (let y = 2.0; y < 14; y += 0.4) g.add(B(0.03, 0.03, 0.4, dark, lx, y, 2.5));
	[3, 8, 13].forEach((y) => g.add(B(0.1, 0.04, 0.04, dark, lx - 0.06, y, 2.5)));
	return g;
}
/* the trolley riding the gantry's rails (absolute heights, centred on its lane): wheels, platform, hoist house with
   roof, rope sheaves underneath and the operator cab hanging off the back */
function trolleyModel() {
	const g = new THREE.Group(),
		Y = "#E0A800",
		dark = "#23272F",
		glass = "#2E3F55",
		gm = { roughness: 0.25, metalness: 0.3, emissive: "#1A2636", emissiveIntensity: 0.4 };
	[-0.6, 0.6].forEach((x) =>
		[-1.1, 1.1].forEach((z) => {
			const w = Cy(0.13, 0.13, 0.08, 10, dark, x, 15.86, z);
			w.rotation.x = Math.PI / 2;
			g.add(w);
		}),
	);
	g.add(B(1.7, 0.26, 3.9, Y, 0, 16.1, -0.35));
	g.add(B(1.3, 0.8, 1.6, "#F4F6F9", 0, 16.63, 0), B(1.4, 0.08, 1.7, Y, 0, 17.07, 0));
	g.add(B(0.6, 0.3, 0.02, "#3A3F48", 0, 16.65, 0.81));
	[-0.2, 0.2].forEach((x) => [-0.2, 0.2].forEach((z) => g.add(B(0.16, 0.14, 0.16, dark, x, 15.9, z))));
	g.add(B(0.3, 0.55, 0.3, dark, 0, 15.7, -2.0), B(1.0, 1.1, 1.0, "#F4F6F9", 0, 14.87, -2.0));
	g.add(B(0.7, 0.5, 0.02, glass, 0, 14.95, -1.49, gm), B(0.7, 0.5, 0.02, glass, 0, 14.95, -2.51, gm));
	[-1, 1].forEach((sd) => g.add(B(0.02, 0.5, 0.7, glass, sd * 0.51, 14.95, -2.0, gm)));
	return g;
}

/* ---------- Fire Brigade's roof rig, front at +x, base at y 0: a glass water tank (steel caps, bands and guard rods,
   a filler neck the hydrant fills through) piped to a water cannon on a turntable. userData: head (turns with the
   aim), tip (nozzle end), fill (filler neck), water (unit-height column: scale.y = level * H, bottom at y0) */
function hoseRigModel() {
	const g = new THREE.Group(),
		dark = "#3A3F48",
		red = "#E5484D",
		steel = "#C9CED8",
		brass = "#C9A44A",
		tx = -0.27,
		R = 0.3,
		H = 0.7,
		y0 = 0.14;
	g.add(B(1.2, 0.08, 0.84, dark, 0, 0.04, 0));
	[-0.44, 0.44].forEach((x) => g.add(B(0.08, 0.06, 0.88, "#2A2F3A", x, 0.03, 0)));
	/* tank */
	g.add(
		Cy(R + 0.04, R + 0.04, 0.06, 16, steel, tx, 0.11, 0),
		Cy(R + 0.04, R + 0.04, 0.06, 16, steel, tx, y0 + H + 0.03, 0),
	);
	const gl = new THREE.Mesh(
		new THREE.CylinderGeometry(R, R, H, 18, 1, true),
		new THREE.MeshStandardMaterial({
			color: "#DDF1FF",
			transparent: true,
			opacity: 0.3,
			roughness: 0.08,
			metalness: 0.2,
			depthWrite: false,
			side: THREE.DoubleSide,
		}),
	);
	gl.position.set(tx, y0 + H / 2, 0);
	gl.renderOrder = 2;
	g.add(gl);
	const water = Cy(R - 0.03, R - 0.03, 1, 16, "#2F8FE0", tx, y0 + 0.5, 0, {
		emissive: "#1D5FA8",
		emissiveIntensity: 0.35,
		roughness: 0.2,
	});
	water.scale.y = H - 0.04;
	water.position.y = y0 + 0.02 + (H - 0.04) / 2;
	g.add(water);
	[0.3, 0.62].forEach((k) => g.add(Cy(R + 0.025, R + 0.025, 0.04, 16, steel, tx, y0 + H * k, 0)));
	for (let k = 0; k < 4; k++) {
		const a = (k / 4) * 6.283 + 0.785;
		g.add(Cy(0.016, 0.016, H, 5, steel, tx + Math.cos(a) * (R + 0.035), y0 + H / 2, Math.sin(a) * (R + 0.035)));
	}
	const fill = new THREE.Object3D();
	g.add(
		Cy(0.07, 0.08, 0.14, 10, steel, tx - 0.1, y0 + H + 0.13, 0.1),
		Cy(0.09, 0.09, 0.04, 10, red, tx - 0.1, y0 + H + 0.22, 0.1),
	);
	fill.position.set(tx - 0.1, y0 + H + 0.26, 0.1);
	g.add(fill);
	/* pipe to the cannon */
	const pipe = Cy(0.05, 0.05, 0.34, 8, red, 0.19, 0.2, 0);
	pipe.rotation.z = Math.PI / 2;
	g.add(pipe, Cy(0.08, 0.08, 0.06, 10, steel, 0.04, 0.2, 0).rotateZ(Math.PI / 2));
	/* cannon on a standpipe riser (its barrel clears the tank whichever way it points): turntable head, pitched barrel
	   with a brass nozzle */
	g.add(Cy(0.13, 0.17, 0.2, 10, red, 0.36, 0.18, 0), Cy(0.08, 0.08, 0.66, 10, red, 0.36, 0.6, 0));
	[0.32, 0.88].forEach((y) => g.add(Cy(0.11, 0.11, 0.04, 10, steel, 0.36, y, 0)));
	const head = new THREE.Group();
	head.position.set(0.36, 0.92, 0);
	g.add(head);
	head.add(Cy(0.16, 0.16, 0.08, 12, dark, 0, 0.04, 0), B(0.26, 0.2, 0.24, red, 0.02, 0.18, 0));
	head.add(
		B(0.04, 0.04, 0.3, dark, -0.04, 0.3, 0),
		B(0.03, 0.06, 0.03, dark, -0.04, 0.27, 0.12),
		B(0.03, 0.06, 0.03, dark, -0.04, 0.27, -0.12),
	);
	const pt = new THREE.Group();
	pt.position.set(0.12, 0.2, 0);
	pt.rotation.z = 0.32;
	head.add(pt);
	const bar = Cy(0.055, 0.075, 0.5, 10, red, 0.25, 0, 0),
		nz = Cy(0.045, 0.065, 0.14, 10, brass, 0.56, 0, 0);
	bar.rotation.z = nz.rotation.z = -Math.PI / 2;
	pt.add(bar, nz);
	const tip = new THREE.Object3D();
	tip.position.set(0.64, 0, 0);
	pt.add(tip);
	g.userData = { head, tip, fill, water, H: H - 0.04, y0: y0 + 0.02, lv: 1 };
	return g;
}

/* put the hose rig on a truck (a buildTruck group, front at +x): at its mount point (buildTruck(i, "hose")), otherwise
   on top of whatever the truck has over its middle */
function mountHoseRig(tr) {
	const r = hoseRigModel(),
		mt = tr.userData.mount;
	if (mt) {
		r.position.set(mt.x, mt.y, 0);
		r.scale.setScalar(mt.s);
		(mt.host || tr).add(r);
		return r.userData;
	}
	const v = new THREE.Vector3(),
		m4 = new THREE.Matrix4();
	tr.updateMatrixWorld(true);
	const inv = tr.matrixWorld.clone().invert();
	let top = 0.8;
	tr.traverse((o) => {
		if (!o.isMesh || !o.visible || !o.geometry.attributes.position) return;
		m4.multiplyMatrices(inv, o.matrixWorld);
		const p = o.geometry.attributes.position;
		for (let i = 0; i < p.count; i++) {
			v.fromBufferAttribute(p, i).applyMatrix4(m4);
			if (Math.abs(v.x + 0.1) < 0.8 && Math.abs(v.z) < 0.5 && v.y > top) top = v.y;
		}
	});
	r.position.set(-0.1, top - 0.01, 0);
	tr.add(r);
	return r.userData;
}

/* ---------- building site and yard ---------- */
/* a bar from a to b ([x, y, z]), t thick: lattice masts, jibs, braces, rails. round = a six-sided tube for lattice braces
   (round 2 = turned 30 degrees, so tubes meeting at a joint never line up a flat face and can't z-fight) */
function strut(g, a, b, t, col, round) {
	const A = new THREE.Vector3(...a),
		D = new THREE.Vector3(...b).sub(A),
		L = D.length(),
		m = round
			? Cy(t / 2, t / 2, L, 6, col, A.x + D.x / 2, A.y + D.y / 2, A.z + D.z / 2)
			: B(t, t, L, col, A.x + D.x / 2, A.y + D.y / 2, A.z + D.z / 2);
	m.quaternion.setFromUnitVectors(new THREE.Vector3(0, round ? 1 : 0, round ? 0 : 1), D.normalize());
	if (round === 2) m.rotateY(Math.PI / 6);
	g.add(m);
	return m;
}
/* portable site cabin, front at +z, 6 x 2.4 on sleeper blocks (floor at 0.3): corrugated walls in a coloured steel frame,
   two barred windows and a door with a step on the front, a name plate, roof cap with lifting lugs, AC unit on the side */
function siteCabinModel(col = "#F4F6F9", acc = "#FF8A1F", txt = "SITE OFFICE") {
	const g = new THREE.Group(),
		fz = 1.15,
		bar = "#5A6272";
	[-2.4, 0, 2.4].forEach((x) => g.add(B(0.34, 0.3, 2.2, "#8C8F96", x, 0.15, 0)));
	g.add(corrugatedBox(5.9, 2.5, 2.3, col, 0, 1.55, 0));
	g.add(B(6, 0.18, 2.4, acc, 0, 0.37, 0), B(6, 0.18, 2.4, acc, 0, 2.76, 0));
	g.add(B(6.12, 0.08, 2.52, "#5A6272", 0, 2.88, 0));
	[-1, 1].forEach((sx) =>
		[-1, 1].forEach((sz) => {
			g.add(B(0.16, 2.24, 0.16, acc, sx * 2.97, 1.57, sz * 1.17));
			g.add(B(0.22, 0.12, 0.22, "#3A3F48", sx * 2.75, 2.98, sz * 1.0));
		}),
	);
	/* front: two windows with security bars, a door with a frame and handle, a steel step with yellow handrails */
	[-1.9, -0.4].forEach((x) => {
		wallWindow(g, x, 1.85, fz, 0, 1.1, 0.85, "#FFFFFF", null);
		[-0.3, 0, 0.3].forEach((o) => g.add(B(0.035, 0.9, 0.035, bar, x + o, 1.85, fz + 0.2)));
		g.add(B(1.2, 0.05, 0.05, bar, x, 1.4, fz + 0.2), B(1.2, 0.05, 0.05, bar, x, 2.3, fz + 0.2));
	});
	g.add(B(1.06, 2.12, 0.06, "#FFFFFF", 1.75, 1.4, fz + 0.03), B(0.9, 2.0, 0.08, bar, 1.75, 1.34, fz + 0.05));
	g.add(B(0.06, 0.2, 0.06, "#C9CED8", 2.08, 1.3, fz + 0.12));
	g.add(B(1.3, 0.06, 0.8, "#8E96A3", 1.75, 0.27, fz + 0.45), B(1.3, 0.06, 0.4, "#8E96A3", 1.75, 0.12, fz + 0.95));
	[-1, 1].forEach((sd) => {
		const x = 1.75 + sd * 0.62;
		g.add(B(0.06, 0.24, 0.06, "#3A3F48", 1.75 + sd * 0.58, 0.12, fz + 0.85));
		strut(g, [x, 0.3, fz + 0.14], [x, 1.2, fz + 0.14], 0.05, "#FFC83D");
		strut(g, [x, 1.2, fz + 0.14], [x, 0.9, fz + 1.05], 0.04, "#FFC83D");
		strut(g, [x, 0.9, fz + 1.05], [x, 0.15, fz + 1.05], 0.05, "#FFC83D");
	});
	const sg = texturedBox(1.9, 0.36, 0.04, "#FFFFFF", signTexture(txt, "#FFFFFF", "#2A2F3A"), 4);
	sg.position.set(-1.15, 2.47, fz + 0.04);
	g.add(sg);
	/* back window, AC unit and a pipe on the right end */
	wallWindow(g, 0.8, 1.85, -fz, Math.PI, 1.1, 0.85, "#FFFFFF", null);
	g.add(B(0.42, 0.62, 0.82, "#C9CED8", 3.15, 1.95, -0.2));
	g.add(Cy(0.24, 0.24, 0.05, 12, "#3A3F48", 3.37, 1.95, -0.2).rotateZ(Math.PI / 2));
	g.add(Cy(0.05, 0.05, 1.5, 6, "#8E96A3", 3.0, 1.0, 0.6));
	return g;
}
/* mobile light tower: trailer with a generator housing, drawbar, wheels and four outrigger legs, a telescopic mast and a
   bar of four lamp heads aimed at +z */
function lightTowerModel() {
	const g = new THREE.Group(),
		Y = "#FFC83D",
		D = "#3A3F48";
	g.add(B(0.9, 0.12, 2.5, D, 0, 0.5, 0), B(1.2, 0.9, 1.9, Y, 0, 1.01, 0), B(1.26, 0.08, 1.96, "#E0A82A", 0, 1.5, 0));
	[-1, 1].forEach((sd) => {
		for (let k = 0; k < 5; k++) g.add(B(0.03, 0.05, 0.9, D, sd * 0.615, 0.8 + k * 0.1, -0.3));
		g.add(B(0.03, 0.5, 0.5, "#C9CED8", sd * 0.615, 1.05, 0.55));
		const w = Cy(0.3, 0.3, 0.2, 12, "#1D2230", sd * 0.72, 0.3, 0.1);
		w.rotation.z = Math.PI / 2;
		g.add(w, B(0.26, 0.05, 0.8, D, sd * 0.72, 0.66, 0.1));
		[-1, 1].forEach((sz) => {
			strut(g, [sd * 0.45, 0.6, sz * 1.1], [sd * 1.25, 0.12, sz * 1.25], 0.1, D);
			g.add(B(0.3, 0.06, 0.3, D, sd * 1.25, 0.03, sz * 1.25));
		});
	});
	strut(g, [0, 0.5, -1.2], [0, 0.42, -2.1], 0.12, D);
	g.add(Cy(0.07, 0.07, 0.05, 8, "#8E96A3", 0, 0.45, -2.15));
	g.add(Cy(0.11, 0.13, 3.4, 8, "#C9CED8", 0, 3.2, -0.6), Cy(0.08, 0.09, 3.4, 8, "#C9CED8", 0, 6.4, -0.6));
	g.add(Cy(0.15, 0.15, 0.14, 8, D, 0, 4.9, -0.6));
	g.add(B(1.9, 0.1, 0.1, D, 0, 8.15, -0.6), B(0.08, 0.9, 0.08, D, 0, 8.6, -0.6), B(1.9, 0.1, 0.1, D, 0, 9.05, -0.6));
	[
		[-0.5, 8.4],
		[0.5, 8.4],
		[-0.5, 8.85],
		[0.5, 8.85],
	].forEach(([x, y]) => {
		const h = new THREE.Group();
		h.position.set(x, y, -0.5);
		h.rotation.x = 0.3;
		h.add(B(0.62, 0.42, 0.2, D, 0, 0, 0));
		h.add(B(0.52, 0.32, 0.04, "#FFF4D6", 0, 0, 0.11, { emissive: "#FFF1C2", emissiveIntensity: 0.9 }));
		g.add(h);
	});
	return g;
}
/* tower crane: lattice mast on a ballasted footing, slewing ring and cab, an A-frame top with tie bars, the jib along +z
   (trolley and hook block) and the counter-jib with concrete counterweights along -z. h = mast height, jl = jib length */
function towerCraneModel(h = 30, jl = 26) {
	const g = new THREE.Group(),
		Y = "#FFC83D",
		gr = "#8E96A3",
		a = 0.8,
		t = 0.18,
		bt = 0.09;
	g.add(B(4.4, 0.6, 4.4, "#A2A6AD", 0, 0.3, 0));
	[-1, 1].forEach((sx) => [-1, 1].forEach((sz) => g.add(B(1.3, 0.7, 1.3, "#C4C8CE", sx * 1.4, 0.95, sz * 1.4))));
	/* mast: four chords, a zig-zag brace on each face and a ring of bars every section */
	const C = [
		[-a, -a],
		[a, -a],
		[a, a],
		[-a, a],
	];
	C.forEach(([x, z]) => g.add(B(t, h - 0.6, t, Y, x, 0.6 + (h - 0.6) / 2, z)));
	const sec = 2.4;
	for (let y = 0.6, k = 0; y + sec <= h + 0.01; y += sec, k++)
		for (let f = 0; f < 4; f++) {
			const [x0, z0] = C[f],
				[x1, z1] = C[(f + 1) % 4];
			strut(g, [x0, k % 2 ? y + sec : y, z0], [x1, k % 2 ? y : y + sec, z1], bt, Y, k % 2 ? 2 : 1);
			strut(g, [x0, y + sec, z0], [x1, y + sec, z1], bt * 0.8, Y, 1);
		}
	/* slewing ring, cab on the side, A-frame */
	g.add(Cy(1.25, 1.25, 0.5, 16, gr, 0, h + 0.25, 0), B(2.2, 0.4, 2.2, Y, 0, h + 0.7, 0));
	g.add(B(1.3, 1.5, 1.6, Y, 1.55, h + 1.45, 1.2));
	g.add(B(1.32, 0.8, 0.06, "#4A5566", 1.55, h + 1.65, 2.01, { roughness: 0.2, metalness: 0.3 }));
	g.add(B(0.06, 0.8, 1.2, "#4A5566", 2.21, h + 1.65, 1.2, { roughness: 0.2, metalness: 0.3 }));
	const top = [0, h + 6, 0];
	C.forEach(([x, z]) => strut(g, [x, h + 0.9, z], top, t, Y));
	/* jib: triangular lattice, two bottom chords and a top chord, braced every 2 m */
	const jy = h + 0.95,
		jw = 0.6,
		jt = jy + 1.5;
	[-1, 1].forEach((sd) => strut(g, [sd * jw, jy, 0], [sd * jw, jy, jl], t, Y));
	strut(g, [0, jt, 0], [0, jt, jl - 1], t, Y);
	strut(g, [0, jt, jl - 1], [0, jy, jl], t, Y);
	for (let z = 0; z < jl - 1; z += 2) {
		[-1, 1].forEach((sd) => {
			strut(g, [sd * jw, jy, z], [0, jt, z + 1], bt, Y, 1);
			strut(g, [0, jt, z + 1], [sd * jw, jy, z + 2], bt, Y, 2);
		});
		strut(g, [-jw, jy, z + 2], [jw, jy, z + 2], bt * 0.8, Y, 1);
	}
	/* counter-jib: flat frame with a walkway, a handrail, the hoist winch and the counterweight blocks at the end */
	const cl = 9;
	[-1, 1].forEach((sd) => strut(g, [sd * 0.75, jy, 0], [sd * 0.75, jy, -cl], t, Y));
	for (let z = 1.5; z <= cl; z += 1.5) strut(g, [-0.75, jy, -z], [0.75, jy, -z], bt, Y, 1);
	g.add(B(1.2, 0.05, cl - 3, gr, 0, jy + 0.12, -(cl - 3) / 2 - 0.5));
	[-1, 1].forEach((sd) => strut(g, [sd * 0.75, jy + 0.9, -0.5], [sd * 0.75, jy + 0.9, -(cl - 3)], 0.04, Y));
	[0, 1, 2].forEach((k) => g.add(B(2.1, 1.6, 0.66, "#B9BEC6", 0, jy - 0.4, -cl + 0.4 + k * 0.72)));
	g.add(B(1.3, 0.9, 1.2, gr, 0, jy + 0.6, -cl + 3.4));
	/* tie bars from the top to the jib and the counter-jib */
	strut(g, top, [0, jt + 0.05, jl * 0.62], 0.08, gr);
	[-1, 1].forEach((sd) => strut(g, top, [sd * 0.7, jy + 0.1, -cl + 0.1], 0.06, gr));
	/* trolley, hoist cables and hook block */
	const tz = jl * 0.72;
	g.add(B(1.4, 0.4, 1.2, gr, 0, jy - 0.3, tz));
	[-0.25, 0.25].forEach((x) => g.add(Cy(0.02, 0.02, 8, 4, "#2A2F3A", x, jy - 4.5, tz)));
	g.add(B(0.8, 0.7, 0.4, Y, 0, jy - 8.8, tz), B(0.84, 0.16, 0.44, "#2A2F3A", 0, jy - 8.62, tz));
	g.add(Cy(0.05, 0.05, 0.4, 6, "#3A3F48", 0, jy - 9.35, tz));
	return g;
}
/* gatehouse, front at +z: a security booth with ribbon windows all round, corner posts, flat roof with a deep overhang,
   SECURITY plate, a serving sill, door on the right, AC unit at the back and a lamp on the roof */
function gatehouseModel(acc = "#FF7A1A") {
	const g = new THREE.Group(),
		wall = "#F4F6F9",
		gm = { roughness: 0.2, metalness: 0.3, emissive: "#22324A", emissiveIntensity: 0.35 };
	g.add(B(3.5, 0.3, 2.9, "#A2A6AD", 0, 0.15, 0), B(3.2, 1.0, 2.6, wall, 0, 0.8, 0));
	g.add(B(3.04, 1.3, 2.44, "#3E4E63", 0, 1.95, 0, gm), B(3.2, 0.32, 2.6, wall, 0, 2.76, 0));
	[-1, 1].forEach((sx) => [-1, 1].forEach((sz) => g.add(B(0.16, 1.3, 0.16, wall, sx * 1.52, 1.95, sz * 1.22))));
	[-0.5, 0.5].forEach((x) => [-1, 1].forEach((sz) => g.add(B(0.06, 1.3, 0.06, wall, x, 1.95, sz * 1.24))));
	[-1, 1].forEach((sx) => g.add(B(0.06, 1.3, 0.06, wall, sx * 1.54, 1.95, -0.3)));
	g.add(B(3.3, 0.08, 0.14, wall, 0, 1.34, 1.29), B(1.4, 0.06, 0.36, "#C9CED8", 0, 1.41, 1.46));
	g.add(B(3.9, 0.22, 3.3, acc, 0, 3.03, 0), B(3.7, 0.06, 3.1, "#5A6272", 0, 3.16, 0));
	const sg = texturedBox(2.2, 0.26, 0.05, "#2A2F3A", signTexture("SECURITY", "#2A2F3A", "#FFC83D"), 4);
	sg.position.set(0, 2.76, 1.33);
	g.add(sg);
	g.add(B(0.06, 2.1, 0.86, "#5A6272", 1.63, 1.35, 0.5), B(0.04, 0.18, 0.06, "#C9CED8", 1.68, 1.3, 0.2));
	g.add(B(0.9, 0.3, 0.6, "#9A9DA4", 2.06, 0.15, 0.5));
	g.add(B(0.8, 0.5, 0.36, "#C9CED8", 0.6, 2.1, -1.48));
	g.add(Cy(0.18, 0.18, 0.04, 10, "#3A3F48", 0.6, 2.1, -1.68).rotateX(Math.PI / 2));
	g.add(Cy(0.04, 0.04, 0.5, 6, "#3A3F48", -1.4, 3.43, 1.2), B(0.3, 0.14, 0.4, "#2A2F3A", -1.4, 3.74, 1.3));
	g.add(B(0.24, 0.04, 0.3, "#FFF4D6", -1.4, 3.66, 1.32, { emissive: "#FFF1C2", emissiveIntensity: 0.8 }));
	return g;
}
/* crushed car for scrap piles: a carModel squashed flat and slightly shortened */
function crushedCarModel(type, col) {
	const g = new THREE.Group(),
		c = carModel(type, col);
	c.scale.set(0.66, 0.34, 0.72);
	g.add(c);
	return g;
}

/* ---------- Sort It Out: wheelie bins and the trash ---------- */
/* flat icon shapes for bin lids, drawn in a 0.6 x 0.6 box: bottle, can, log (side view with a branch stub and its end grain
   as an island), two leaves on their stems. Returns {holes, islands}: holes are cut into the lid, islands stand in a hole. */
function binIconShape(icon) {
	const V = (P) => new THREE.Shape(P.map(([x, y]) => new THREE.Vector2(x, y)));
	if (icon === "bottle")
		return {
			holes: [
				V([
					[-0.13, -0.28],
					[0.13, -0.28],
					[0.13, 0.08],
					[0.06, 0.17],
					[0.06, 0.28],
					[-0.06, 0.28],
					[-0.06, 0.17],
					[-0.13, 0.08],
				]),
			],
			islands: [],
		};
	if (icon === "can")
		return {
			holes: [
				V([
					[-0.16, -0.22],
					[-0.12, -0.27],
					[0.12, -0.27],
					[0.16, -0.22],
					[0.16, 0.22],
					[0.12, 0.27],
					[-0.12, 0.27],
					[-0.16, 0.22],
				]),
			],
			islands: [],
		};
	if (icon === "log") {
		const s = new THREE.Shape();
		s.moveTo(-0.24, -0.12);
		s.lineTo(0.2, -0.12);
		s.absellipse(0.2, 0, 0.08, 0.12, -Math.PI / 2, Math.PI / 2, false);
		s.lineTo(-0.02, 0.12);
		s.lineTo(-0.05, 0.25);
		s.lineTo(-0.13, 0.23);
		s.lineTo(-0.11, 0.12);
		s.lineTo(-0.24, 0.12);
		s.absellipse(-0.24, 0, 0.07, 0.12, Math.PI / 2, (Math.PI * 3) / 2, false);
		const e = new THREE.Shape();
		e.absellipse(0.2, 0, 0.035, 0.065, 0, Math.PI * 2, false);
		return { holes: [s], islands: [e] };
	}
	/* compost: a sprout, two pointed leaves joined on one forked stem (one outline), each with its midrib as an island */
	const P2 = (b, d, n, t, o, L) => [b[0] + d[0] * L * t + n[0] * o, b[1] + d[1] * L * t + n[1] * o],
		edges = (C, hw) => {
			const l = [],
				r = [];
			C.forEach((p, i) => {
				const a = C[Math.max(0, i - 1)],
					b = C[Math.min(C.length - 1, i + 1)],
					len = Math.hypot(b[0] - a[0], b[1] - a[1]),
					nx = -(b[1] - a[1]) / len,
					ny = (b[0] - a[0]) / len;
				l.push([p[0] + nx * hw, p[1] + ny * hw]);
				r.push([p[0] - nx * hw, p[1] - ny * hw]);
			});
			return [l, r];
		},
		ribs = [],
		leaf = (b, ang, L, W) => {
			const d = [Math.cos(ang), Math.sin(ang)],
				n = [-d[1], d[0]],
				l = [],
				r = [];
			for (let i = 0; i <= 14; i++) {
				const t = i / 14,
					hw = i === 14 ? 0 : Math.max(0.025 * (1 - t / 0.2), W * Math.sin(Math.PI * Math.pow(t, 0.8)));
				l.push(P2(b, d, n, t, hw, L));
				if (i < 14) r.unshift(P2(b, d, n, t, -hw, L));
			}
			ribs.push(V([P2(b, d, n, 0.2, 0.014, L), P2(b, d, n, 0.8, 0, L), P2(b, d, n, 0.2, -0.014, L)]));
			return l.concat(r);
		};
	const stem = [
			[0.005, -0.3],
			[0, -0.22],
			[-0.012, -0.14],
			[-0.03, -0.07],
			[-0.055, -0.01],
		],
		br = [
			[0.01, -0.205],
			[0.045, -0.165],
			[0.085, -0.115],
		],
		[sL, sR] = edges(stem, 0.026),
		[bL, bR] = edges(br, 0.024);
	const out = sL
		.slice(0, 4)
		.concat(leaf(stem[4], (Math.PI * 7) / 12, 0.32, 0.105), [sR[3], sR[2], bL[1]])
		.concat(leaf(br[2], (Math.PI * 5) / 18, 0.31, 0.1), [bR[1], sR[1], sR[0]]);
	return { holes: [V(out)], islands: ribs };
}
/* bin name plate texture, same proportions as the plate so the letters don't stretch */
function binPlateTex(txt) {
	const k = "bp" + txt;
	return (
		BLD_TEX[k] ||
		(BLD_TEX[k] = canvasTex(256, 70, (x, w, h) => {
			x.fillStyle = "#F4F6F9";
			x.fillRect(0, 0, w, h);
			x.font = "40px Bungee, 'Arial Black', Impact, sans-serif";
			x.textAlign = "center";
			x.textBaseline = "middle";
			x.fillStyle = "#23272F";
			const s = Math.min(1, (w - 16) / x.measureText(txt).width);
			x.save();
			x.translate(w / 2, h / 2 + 3);
			x.scale(s, 1);
			x.fillText(txt, 0, 0);
			x.restore();
		}))
	);
}
/* wheelie bin, front at +z: tapered body, overhanging lid on a hinge at the back (userData.lid pivots there, rotate
   x negative to open), the icon indented into the lid like the board tiles' symbols, back handle, wheels and front feet.
   yaw = the bin's world rotation.y: the name plate goes on the side facing the camera (world +z) and the icon is turned
   to read upright from there. */
function wheelieBinModel(col, name, icon, yaw = 0) {
	const g = new THREE.Group(),
		lidC = "#" + new THREE.Color(col).multiplyScalar(0.72).getHexString(),
		D = "#23272F";
	const bg = new THREE.CylinderGeometry(0.98, 0.86, 1.2, 4);
	bg.rotateY(Math.PI / 4);
	bg.scale(1.15, 1, 1);
	const body = mesh(bg, col);
	body.position.y = 0.7;
	g.add(body);
	[0.42, 0.98].forEach((y) => {
		const rg = new THREE.CylinderGeometry(0.9 + (y - 0.1) * 0.1, 0.9 + (y - 0.18) * 0.1, 0.08, 4);
		rg.rotateY(Math.PI / 4);
		rg.scale(1.15, 1, 1);
		const r = mesh(rg, lidC);
		r.position.y = y;
		g.add(r);
	}); /* two moulded ribs round the body */
	[-1, 1].forEach((sd) => {
		const w = Cy(0.17, 0.17, 0.12, 10, D, sd * 0.62, 0.17, -0.72);
		w.rotation.z = Math.PI / 2;
		g.add(w, Cy(0.08, 0.08, 0.13, 8, "#8E96A3", sd * 0.62, 0.17, -0.72).rotateZ(Math.PI / 2));
		g.add(B(0.2, 0.12, 0.16, D, sd * 0.5, 0.06, 0.48));
	});
	g.add(Cy(0.04, 0.04, 1.12, 6, "#5A6272", 0, 0.17, -0.72).rotateZ(Math.PI / 2), B(1.0, 0.16, 0.14, D, 0, 0.2, -0.64));
	/* back handle on two brackets, hinge bar */
	[-1, 1].forEach((sd) => g.add(B(0.1, 0.14, 0.2, lidC, sd * 0.5, 1.22, -0.76)));
	g.add(Cy(0.045, 0.045, 1.16, 6, D, 0, 1.22, -0.88).rotateZ(Math.PI / 2));
	/* lid: pivot at the hinge, so it can flap open. The slab has the icon cut through it, a white plate inside shows
	   through 0.045 below the top. */
	const lid = new THREE.Group();
	lid.position.set(0, 1.33, -0.72);
	g.add(lid);
	const ic = binIconShape(icon),
		ca = Math.cos(-yaw),
		sa = Math.sin(-yaw),
		turn = (sh) =>
			new THREE.Shape(
				sh.getPoints(6).map((p) => new THREE.Vector2((p.x * ca - p.y * sa) * 1.6, (p.x * sa + p.y * ca) * 1.6)),
			);
	const slab = new THREE.Shape([
		new THREE.Vector2(-0.86, -0.75),
		new THREE.Vector2(0.86, -0.75),
		new THREE.Vector2(0.86, 0.75),
		new THREE.Vector2(-0.86, 0.75),
	]);
	ic.holes.forEach((h) => slab.holes.push(turn(h)));
	const flat = (sh, d, y) => {
		const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
		geo.rotateX(-Math.PI / 2);
		const m = mesh(geo, lidC);
		m.position.set(0, y, 0.74);
		return m;
	};
	lid.add(flat(slab, 0.1, -0.03), B(1.3, 0.02, 1.3, "#F4F6F9", 0, 0.015, 0.74));
	ic.islands.forEach((s) => lid.add(flat(turn(s), 0.04, 0.03)));
	lid.add(B(1.66, 0.14, 0.07, lidC, 0, -0.04, 1.5));
	lid.add(Cy(0.05, 0.05, 1.6, 6, D, 0, 0, 0).rotateZ(Math.PI / 2));
	g.userData.lid = lid;
	/* name plate on the sloping side that faces the camera */
	const cx = -Math.sin(yaw),
		cz = Math.cos(yaw),
		n = Math.abs(cx) > Math.abs(cz) ? [Math.sign(cx), 0] : [0, Math.sign(cz)],
		back = n[1] < 0 /* the back has the handle overhead: plate lower, between the ribs */,
		y = back ? 0.62 : 0.72,
		r = 0.86 + ((y - 0.1) / 1.2) * 0.12,
		dist = (n[0] ? 1.15 : 1) * r * Math.SQRT1_2 + 0.012;
	const pl = texturedBox(1.2, back ? 0.3 : 0.33, 0.03, "#F4F6F9", binPlateTex(name.toUpperCase()), 4);
	pl.position.set(n[0] * dist, y, n[1] * dist);
	pl.rotation.order = "YXZ";
	pl.rotation.set(Math.atan(((n[0] ? 1.15 : 1) * 0.12 * Math.SQRT1_2) / 1.2), Math.atan2(n[0], n[1]), 0);
	g.add(pl);
	return g;
}
/* the trash for Sort It Out, about 1 m across, built to read from above while it spins: long things lie on their side.
   plastic: water bottle, takeaway cup with a straw, spray bottle; metal: soda can, opened food tin, spanner;
   wood: broken plank with nails, slatted crate, log; compost: banana, apple core, carrot */
function sortItemModel(cat, v) {
	const g = new THREE.Group(),
		glass = { transparent: true, opacity: 0.82, roughness: 0.15 },
		met = { metalness: 0.25, roughness: 0.4 },
		lathe = (P, col, o, seg = 8) =>
			mesh(
				new THREE.LatheGeometry(
					P.map(([r, y]) => new THREE.Vector2(r, y)),
					seg,
				),
				col,
				o,
			),
		flat = (P, depth, col, o) => {
			const s = new THREE.Shape(P.map(([x, y]) => new THREE.Vector2(x, y))),
				geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
			geo.rotateX(-Math.PI / 2);
			return mesh(geo, col, o);
		},
		side = (part, len, r) => {
			/* lay an upright part (base at y 0, height len) on its side, centred */
			const q = new THREE.Group();
			part.rotation.z = Math.PI / 2;
			part.position.set(len / 2, r, 0);
			q.add(part);
			return q;
		};
	if (cat === "plastic") {
		if (v === 0) {
			const b = new THREE.Group();
			b.add(
				lathe(
					[
						[0, 0],
						[0.2, 0],
						[0.24, 0.05],
						[0.24, 0.6],
						[0.2, 0.7],
						[0.1, 0.82],
						[0.09, 0.9],
						[0, 0.9],
					],
					"#8FD3FF",
					glass,
				),
			);
			b.add(Cy(0.265, 0.265, 0.3, 8, "#FFFFFF", 0, 0.34, 0), Cy(0.29, 0.29, 0.1, 8, "#2F7DE1", 0, 0.34, 0));
			b.add(Cy(0.12, 0.12, 0.14, 8, "#2F7DE1", 0, 0.95, 0));
			g.add(side(b, 1.02, 0.29));
		} else if (v === 1) {
			g.add(Cy(0.3, 0.22, 0.72, 8, "#F4F7FA", 0, 0.36, 0, glass), Cy(0.26, 0.2, 0.5, 8, "#E5484D", 0, 0.29, 0));
			g.add(Cy(0.34, 0.33, 0.08, 8, "#FFFFFF", 0, 0.74, 0), Cy(0.2, 0.31, 0.12, 8, "#FFFFFF", 0, 0.84, 0, glass));
			g.add(Cy(0.315, 0.29, 0.18, 8, "#FFC83D", 0, 0.48, 0));
			const st = new THREE.Group();
			st.position.set(0.04, 0.8, 0);
			st.rotation.z = -0.3;
			st.add(Cy(0.04, 0.04, 0.62, 6, "#FFFFFF", 0, 0.31, 0));
			[0.12, 0.3, 0.48].forEach((y) => st.add(Cy(0.052, 0.052, 0.09, 6, "#E5484D", 0, y, 0)));
			g.add(st);
		} else {
			g.add(Cy(0.21, 0.25, 0.66, 8, "#35C0A0", 0, 0.33, 0), Cy(0.13, 0.21, 0.14, 8, "#35C0A0", 0, 0.73, 0));
			g.add(Cy(0.275, 0.275, 0.24, 8, "#FFFFFF", 0, 0.32, 0));
			g.add(Cy(0.1, 0.1, 0.14, 8, "#FFFFFF", 0, 0.86, 0), B(0.5, 0.2, 0.2, "#FFFFFF", 0.12, 1.02, 0));
			g.add(B(0.1, 0.12, 0.12, "#E5484D", 0.4, 1.02, 0));
			const tr = B(0.1, 0.3, 0.14, "#FFFFFF", 0.24, 0.84, 0);
			tr.rotation.z = 0.35;
			g.add(tr);
		}
	} else if (cat === "metal") {
		if (v === 0) {
			const c = new THREE.Group();
			c.add(Cy(0.24, 0.24, 0.58, 12, "#E5484D", 0, 0.33, 0, met));
			c.add(Cy(0.2, 0.24, 0.06, 12, "#D9DEE5", 0, 0.65, 0, met), Cy(0.24, 0.2, 0.06, 12, "#D9DEE5", 0, 0.01, 0, met));
			c.add(Cy(0.265, 0.265, 0.16, 12, "#FFFFFF", 0, 0.36, 0), B(0.16, 0.03, 0.08, "#9AA3AE", 0.06, 0.69, 0));
			g.add(side(c, 0.68, 0.265));
		} else if (v === 1) {
			g.add(Cy(0.28, 0.28, 0.5, 12, "#C9CED8", 0, 0.25, 0, met), Cy(0.305, 0.305, 0.26, 12, "#FFC83D", 0, 0.25, 0));
			[0.06, 0.44].forEach((y) => g.add(Cy(0.305, 0.305, 0.04, 12, "#AEB5C0", 0, y, 0, met)));
			g.add(
				Cy(0.25, 0.25, 0.02, 12, "#5A6272", 0, 0.52, 0),
				Cy(0.1, 0.1, 0.27, 8, "#E5484D", 0, 0.25, 0.25).rotateX(Math.PI / 2),
			);
			const lid = new THREE.Group();
			lid.position.set(0, 0.52, -0.27);
			lid.rotation.x = -1.15;
			lid.add(Cy(0.27, 0.27, 0.03, 12, "#E3E7EC", 0, 0.015, 0.27, met));
			g.add(lid);
		} else {
			const jaw = new THREE.Shape();
			jaw.absarc(0, 0, 0.22, 0.75, Math.PI * 2 - 0.75, false);
			jaw.absarc(0, 0, 0.1, Math.PI * 2 - 1.0, 1.0, true);
			const ring = new THREE.Shape();
			ring.absarc(0, 0, 0.18, 0, Math.PI * 2, false);
			const h = new THREE.Path();
			h.absarc(0, 0, 0.085, 0, Math.PI * 2, true);
			ring.holes.push(h);
			[
				[jaw, 0.5],
				[ring, -0.52],
			].forEach(([sh, x]) => {
				const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.09, bevelEnabled: false, curveSegments: 5 });
				geo.rotateX(-Math.PI / 2);
				const m = mesh(geo, "#C3CAD4", met);
				m.position.x = x;
				g.add(m);
			});
			g.add(B(0.84, 0.04, 0.14, "#AEB5C0", 0, 0.045, 0, met));
			g.rotation.y = 0.5;
		}
	} else if (cat === "wood") {
		if (v === 0) {
			g.add(
				flat(
					[
						[-0.62, 0.16],
						[0.42, 0.16],
						[0.6, 0.07],
						[0.47, 0.02],
						[0.64, -0.06],
						[0.48, -0.16],
						[-0.62, -0.16],
					],
					0.12,
					"#C98A4B",
				),
			);
			[
				[-0.08, 0.9],
				[0.06, 0.7],
			].forEach(([z, l]) => g.add(B(l, 0.025, 0.03, "#9C6433", -0.6 + l / 2 + 0.06, 0.13, z)));
			[-0.4, 0.2].forEach((x, k) => {
				const n = new THREE.Group();
				n.position.set(x, 0.12, 0.02);
				n.rotation.z = k ? 0.5 : 0;
				n.add(Cy(0.02, 0.02, 0.22, 6, "#8E96A3", 0, 0.11, 0), Cy(0.05, 0.05, 0.02, 8, "#8E96A3", 0, 0.22, 0));
				g.add(n);
			});
		} else if (v === 1) {
			for (let k = 0; k < 3; k++) {
				const y = 0.15 + k * 0.22;
				g.add(B(0.8, 0.14, 0.06, "#C98A4B", 0, y, 0.34), B(0.8, 0.14, 0.06, "#C98A4B", 0, y, -0.34));
				g.add(B(0.06, 0.14, 0.62, "#C98A4B", 0.37, y, 0), B(0.06, 0.14, 0.62, "#C98A4B", -0.37, y, 0));
			}
			[-1, 1].forEach((sx) =>
				[-1, 1].forEach((sz) => g.add(B(0.16, 0.66, 0.16, "#8C5A2C", sx * 0.39, 0.37, sz * 0.36))),
			);
			g.add(B(0.62, 0.05, 0.62, "#A06A34", 0, 0.06, 0));
		} else {
			const lg = new THREE.Group();
			lg.add(Cy(0.25, 0.27, 1.1, 9, "#8C5A3C", 0, 0.55, 0));
			[0.3, 0.75].forEach((y) => lg.add(Cy(0.29, 0.29, 0.06, 9, "#6B4429", 0, y, 0)));
			lg.add(Cy(0.21, 0.21, 0.03, 9, "#E8C48E", 0, 1.115, 0), Cy(0.1, 0.1, 0.03, 8, "#C9A06B", 0, 1.14, 0));
			lg.add(Cy(0.21, 0.21, 0.03, 9, "#E8C48E", 0, -0.015, 0));
			const br = Cy(0.06, 0.08, 0.26, 6, "#8C5A3C", 0.27, 0.45, 0);
			br.rotation.z = -0.9;
			lg.add(br);
			g.add(side(lg, 1.1, 0.27));
		}
	} else {
		if (v === 0) {
			const cv = new THREE.QuadraticBezierCurve3(
					new THREE.Vector3(-0.55, 0.42, 0),
					new THREE.Vector3(0, -0.12, 0),
					new THREE.Vector3(0.55, 0.42, 0),
				),
				TS = 10,
				RS = 5,
				geo = new THREE.TubeGeometry(cv, TS, 0.15, RS, false),
				p = geo.attributes.position,
				c = new THREE.Vector3(),
				q = new THREE.Vector3();
			for (let i = 0; i <= TS; i++) {
				const t = i / TS,
					f = 0.35 + 0.65 * Math.sin(Math.PI * t);
				cv.getPointAt(t, c);
				for (let j = 0; j <= RS; j++) {
					const k = i * (RS + 1) + j;
					q.fromBufferAttribute(p, k).sub(c).multiplyScalar(f).add(c);
					p.setXYZ(k, q.x, q.y, q.z);
				}
			}
			geo.computeVertexNormals();
			g.add(mesh(geo, "#FFD93D"));
			g.add(Cy(0.035, 0.05, 0.14, 6, "#6B4A2B", -0.58, 0.47, 0).rotateZ(0.7));
			g.add(Cy(0.04, 0.04, 0.05, 6, "#3A2A1C", 0.56, 0.45, 0).rotateZ(-0.7));
			g.position.y = 0.02;
		} else if (v === 1) {
			const red = "#E5484D",
				cream = "#F6E7C1";
			g.add(Cy(0.3, 0.22, 0.22, 8, red, 0, 0.11, 0), Cy(0.13, 0.27, 0.12, 8, cream, 0, 0.28, 0));
			g.add(Cy(0.13, 0.13, 0.3, 8, cream, 0, 0.49, 0), Cy(0.27, 0.13, 0.12, 8, cream, 0, 0.7, 0));
			g.add(Cy(0.22, 0.3, 0.24, 8, red, 0, 0.88, 0));
			[-1, 1].forEach((sd) => g.add(B(0.05, 0.1, 0.04, "#3A2A1C", sd * 0.06, 0.5, 0.12)));
			g.add(Cy(0.03, 0.03, 0.22, 6, "#6B4A2B", 0, 1.1, 0));
			const lf = B(0.26, 0.03, 0.12, "#4CAF50", 0.12, 1.12, 0);
			lf.rotation.z = -0.4;
			g.add(lf);
		} else {
			const c = mesh(new THREE.ConeGeometry(0.22, 1.0, 8), "#FF8A1F");
			c.rotation.z = Math.PI / 2;
			c.position.set(-0.1, 0.22, 0);
			g.add(c);
			[-0.35, -0.05, 0.2].forEach((x, k) => {
				g.add(
					B(0.03, 0.03, 0.12, "#D96A12", x, 0.215 + 0.22 * (x + 0.6), (k - 1) * 0.04),
				); /* ridges on the top surface */
			});
			[-0.45, 0, 0.45].forEach((a) => {
				const l = mesh(new THREE.ConeGeometry(0.07, 0.5, 5), "#4CAF50");
				l.position.set(0.4 + Math.cos(a) * 0.27, 0.22 + Math.sin(a) * 0.27, 0);
				l.rotation.z = -Math.PI / 2 + a;
				g.add(l);
			});
		}
	}
	const out = new THREE.Group();
	out.add(g);
	return out;
}
