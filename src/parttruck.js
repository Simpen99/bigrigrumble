/* ---------- trucks: models with animated parts ---------- */
const uniq = (m) => {
	m.material = m.material.clone();
	return m;
};
const CBG = {};
function chamferBoxSq(w, h, d, r, flat) {
	const key = [w, h, d, r].map((v) => v.toFixed(3)).join(",") + "|" + flat.join("");
	if (CBG[key]) return CBG[key];
	if (!THREE.ConvexGeometry) return chamferBox(w, h, d, r);
	const X = w / 2,
		Y = h / 2,
		Z = d / 2,
		R = (f) => !flat.includes(f),
		pts = [],
		e = 1e-6;
	for (const sx of [-1, 1])
		for (const sy of [-1, 1])
			for (const sz of [-1, 1]) {
				const fx = R(sx > 0 ? "px" : "nx"),
					fy = R(sy > 0 ? "py" : "ny"),
					fz = R(sz > 0 ? "pz" : "nz");
				for (const ix of [0, 1])
					for (const iy of [0, 1])
						for (const iz of [0, 1]) {
							const u = X - ix * r,
								v = Y - iy * r,
								t = Z - iz * r;
							if (fx && fy && u + v > X + Y - r + e) continue;
							if (fy && fz && v + t > Y + Z - r + e) continue;
							if (fx && fz && u + t > X + Z - r + e) continue;
							if (fx && fy && fz && u + v + t > X + Y + Z - 2 * r + e) continue;
							pts.push(new THREE.Vector3(sx * u, sy * v, sz * t));
						}
			}
	return (CBG[key] = new THREE.ConvexGeometry(pts));
}
function chamferBox(w, h, d, r) {
	const key = [w, h, d, r].map((v) => v.toFixed(3)).join(",");
	if (CBG[key]) return CBG[key];
	const hw = w / 2 - r,
		hh = h / 2 - r,
		c = r * 0.9,
		s = new THREE.Shape();
	s.moveTo(-hw + c, -hh);
	s.lineTo(hw - c, -hh);
	s.lineTo(hw, -hh + c);
	s.lineTo(hw, hh - c);
	s.lineTo(hw - c, hh);
	s.lineTo(-hw + c, hh);
	s.lineTo(-hw, hh - c);
	s.lineTo(-hw, -hh + c);
	s.closePath();
	const g = new THREE.ExtrudeGeometry(s, {
		depth: Math.max(0.001, d - 2 * r),
		bevelEnabled: true,
		bevelThickness: r,
		bevelSize: r,
		bevelSegments: 1,
		steps: 1,
	});
	g.translate(0, 0, -(d - 2 * r) / 2);
	g.computeVertexNormals();
	return (CBG[key] = g);
}
// side-profile prism (convex CCW polygon in x/y, depth d along z) with bevelled side edges like chamferBox; cs[i] rounds off profile corner i
function chamferPrism(P, d, r, cs) {
	if (!THREE.ConvexGeometry) return null;
	const Q = [];
	P.forEach((p, i) => {
		const c = cs[i] || 0;
		if (!c) {
			Q.push(p);
			return;
		}
		[P[(i + P.length - 1) % P.length], P[(i + 1) % P.length]].forEach((q) => {
			const dx = q[0] - p[0],
				dy = q[1] - p[1],
				t = Math.min(c, Math.hypot(dx, dy) * 0.3) / Math.hypot(dx, dy);
			Q.push([p[0] + dx * t, p[1] + dy * t]);
		});
	});
	const nrm = (a, b) => {
			const dx = b[0] - a[0],
				dy = b[1] - a[1],
				l = Math.hypot(dx, dy);
			return [-dy / l, dx / l];
		},
		pts = [];
	Q.forEach((p, i) => {
		const n1 = nrm(Q[(i + Q.length - 1) % Q.length], p),
			n2 = nrm(p, Q[(i + 1) % Q.length]),
			k = r / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
		[-1, 1].forEach((sz) =>
			pts.push(
				new THREE.Vector3(p[0], p[1], sz * (d / 2 - r)),
				new THREE.Vector3(p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k, (sz * d) / 2),
			),
		);
	});
	return new THREE.ConvexGeometry(pts);
}
/* mode "hose" (Fire Brigade): leaves off the extras that would clash with the roof hose rig (ladder, drum, crane,
   catwalk, loads, roll bars, roof ornaments), stops parts that swing over the roof, and sets userData.mount =
   {x, y, s, host}: where the rig sits (truck coords, front at +x), its scale, and the group to add it to */
function buildTruck(i, mode) {
	const hose = mode === "hose",
		mon = mode === "monster";
	const B = (w, h, d, c, x, y, z, o) => {
		let sq = null;
		if (o && o.sq) {
			sq = o.sq;
			o = Object.assign({}, o);
			delete o.sq;
			if (!Object.keys(o).length) o = undefined;
		}
		/* monster mode: every headlight becomes a red glowing eye */
		if (mon && o === lamp) {
			c = "#D81E1E";
			o = MON.EYE;
		}
		const mn = Math.min(w, h, d),
			r = Math.min(0.075, mn * 0.2),
			m = mesh(
				mn >= 0.18 ? (sq ? chamferBoxSq(w, h, d, r, sq) : chamferBox(w, h, d, r)) : new THREE.BoxGeometry(w, h, d),
				c,
				o,
			);
		m.position.set(x, y, z);
		return m;
	};
	const NY = { sq: ["ny"] },
		HOOD = { sq: ["nx", "ny"] };
	const t = TRUCKS[i] || TRUCKS[0],
		g = new THREE.Group(),
		c = mon ? "#" + new THREE.Color(t.color).lerp(new THREE.Color("#1B1E26"), 0.22).getHexString() : t.color,
		a = t.accent,
		D = "#353A46",
		GL = "#2F3B52",
		CH = "#D8DDE5",
		W = 1.1;
	const glass = {
			roughness: 0.2,
			metalness: 0.2,
			userData: { refl: 0 },
		} /* no reflections on truck windows (new look): they turned grey */,
		lamp = { emissive: "#FFF1C2", emissiveIntensity: 1.2 };
	const anims = [],
		wheelsL = [],
		roof = [],
		ph = Math.random() * 10;
	let tailX = null,
		tailY = 0.5,
		mount = null;
	const add = (...m) => m.forEach((x) => g.add(x));
	const grp = (x = 0, y = 0, z = 0, ...kids) => {
		const q = new THREE.Group();
		q.position.set(x, y, z);
		kids.forEach((k) => q.add(k));
		g.add(q);
		return q;
	};
	const monAx = [];
	const wheels = (xs, r = 0.3, z = W / 2) =>
		mon
			? monAx.push(...xs)
			: xs.forEach((x) =>
					[-1, 1].forEach((s) => {
						const w = Cy(r, r, 0.3, 16, "#2A2E36", 0, 0, 0);
						w.rotation.x = Math.PI / 2;
						const h = Cy(r * 0.6, r * 0.6, 0.32, 12, "#E3E6EB", 0, 0, 0);
						h.rotation.x = Math.PI / 2;
						const cp = Cy(r * 0.22, r * 0.22, 0.36, 8, "#9AA3AE", 0, 0, 0);
						cp.rotation.x = Math.PI / 2;
						const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 1.05, 0.05, 0.34), M("#C3CAD4"));
						wheelsL.push({ g: grp(x, r, s * z, w, h, cp, sp), r });
					}),
				);
	const chassis = (l = 2.1, x = 0) => {
		tailX = x - l / 2;
		add(B(l, 0.2, W * 0.78, D, x, 0.42, 0));
	};
	const cab = (x = 0.72, l = 0.62, h = 0.82, col = c, y0 = 0.5) => {
		add(
			B(l, h, W, col, x, y0 + h / 2, 0, NY),
			B(0.04, h * 0.4, W * 0.84, GL, x + l / 2 + 0.005, y0 + h * 0.68, 0, glass),
			B(l * 0.55, h * 0.36, W + 0.02, GL, x + l * 0.12, y0 + h * 0.68, 0, glass),
			B(0.08, 0.16, W * 0.96, CH, x + l / 2 + 0.04, y0 + 0.1, 0),
			B(0.03, h * 0.22, W * 0.5, "#1D2230", x + l / 2 + 0.01, y0 + h * 0.3, 0),
			B(0.04, 0.1, 0.18, "#FFF6C2", x + l / 2 + 0.03, y0 + 0.28, W * 0.34, lamp),
			B(0.04, 0.1, 0.18, "#FFF6C2", x + l / 2 + 0.03, y0 + 0.28, -W * 0.34, lamp),
			B(0.06, 0.16, 0.08, D, x + l / 2 - 0.13, y0 + h * 0.66, W / 2 + 0.035),
			B(0.06, 0.16, 0.08, D, x + l / 2 - 0.13, y0 + h * 0.66, -W / 2 - 0.035),
		);
	};
	const beacon = (x, y, col, rate = 7) => {
		const base = Cy(0.09, 0.11, 0.08, 8, D, x, y, 0),
			cap = uniq(Cy(0.08, 0.09, 0.12, 8, col, x, y + 0.1, 0, { emissive: col, emissiveIntensity: 0.4 }));
		const refl = B(0.02, 0.08, 0.21, "#FFFFFF", 0, 0, 0),
			rg = grp(x, y + 0.1, 0, refl);
		add(base, cap);
		anims.push((tm) => {
			rg.rotation.y = tm * rate;
			cap.material.emissiveIntensity = 0.5 + Math.max(0, Math.sin(tm * rate)) * 1.3;
		});
	};
	switch (t.kind) {
		case "box":
			chassis();
			add(
				B(1.3, 1.1, W, c, -0.34, 1.07, 0, NY),
				B(1.24, 0.16, W + 0.06, a, -0.34, 0.85, 0),
				B(1.14, 0.04, W - 0.16, a, -0.34, 1.64, 0),
				B(0.03, 0.9, W * 0.8, "#C9CED8", -1.0, 1.05, 0),
			);
			cab(0.68);
			beacon(0.68, 1.34, "#FFB000");
			wheels([-0.72, 0.7]);
			mount = { x: -0.34, y: 1.66, s: 0.95 };
			break;
		case "monster": {
			wheels([-0.72, 0.72], 0.52, 0.64);
			const dy = 0.6;
			[0.3, -0.3].forEach((z) => add(B(0.14, 0.5, 0.14, D, -0.72, 0.74, z), B(0.14, 0.5, 0.14, D, 0.72, 0.74, z)));
			const body = grp(
				0,
				0,
				0,
				B(2.0, 0.18, W * 0.78, D, 0, 0.42 + dy, 0),
				B(0.72, 0.62, W, c, 0.05, 0.82 + dy, 0, NY),
				B(0.695, 0.36, W, c, 0.6825, 0.7 + dy, 0, HOOD),
				B(0.71, 0.1, W - 0.16, c, -0.665, 0.56 + dy, 0),
				B(0.76, 0.32, 0.06, c, -0.69, 0.72 + dy, W / 2 - 0.03),
				B(0.76, 0.32, 0.06, c, -0.69, 0.72 + dy, -W / 2 + 0.03),
				B(0.06, 0.3, W - 0.14, c, -1.05, 0.71 + dy, 0),
				B(0.04, 0.22, W * 0.8, GL, 0.42, 0.95 + dy, 0, glass),
				B(0.4, 0.2, W + 0.02, GL, 0.05, 0.95 + dy, 0, glass),
				B(1.9, 0.07, W + 0.06, a, 0, 0.64 + dy, 0),
				B(0.1, 0.16, W * 0.98, CH, 1.06, 0.56 + dy, 0),
				B(0.03, 0.15, W * 0.5, "#1D2230", 1.04, 0.72 + dy, 0),
				B(0.04, 0.1, 0.18, "#FFF6C2", 1.04, 0.76 + dy, 0.36, lamp),
				B(0.04, 0.1, 0.18, "#FFF6C2", 1.04, 0.76 + dy, -0.36, lamp),
			);
			if (!hose)
				body.add(
					B(0.06, 0.5, 0.06, D, -0.34, 0.9 + dy, 0.46),
					B(0.06, 0.5, 0.06, D, -0.34, 0.9 + dy, -0.46),
					B(0.07, 0.07, W * 0.9, D, -0.34, 1.16 + dy, 0),
				);
			mount = { x: -0.72, y: 0.61 + dy, s: 0.7, host: body };
			const bar = uniq(B(0.12, 0.09, 0.7, "#FFF6C2", 0.05, 1.18 + dy, 0, lamp));
			body.add(bar);
			tailX = -1.08;
			tailY = 0.72 + dy;
			g.userData.tailG = body;
			anims.push((tm) => {
				body.position.y = Math.abs(Math.sin(tm * 3.2)) * 0.09;
				body.rotation.z = Math.sin(tm * 1.6) * 0.03;
				bar.material.emissiveIntensity = 0.8 + Math.sin(tm * 6) * 0.5;
			});
			break;
		}
		case "icecream": {
			chassis();
			add(
				B(2.05, 1.15, W, c, 0, 1.1, 0, NY),
				B(0.04, 0.45, W * 0.84, GL, 1.03, 1.3, 0, glass),
				B(0.9, 0.42, W + 0.02, "#FFFFFF", -0.35, 1.2, 0),
				B(0.08, 0.16, W * 0.96, CH, 1.07, 0.6, 0),
				B(0.04, 0.1, 0.18, "#FFF6C2", 1.06, 0.78, 0.36, lamp),
				B(0.04, 0.1, 0.18, "#FFF6C2", 1.06, 0.78, -0.36, lamp),
			);
			const aw = [1, -1].map((s) => {
				const m = B(1.0, 0.06, 0.32, a, 0, 0, 0);
				return grp(-0.35, 1.46, s * (W / 2 + 0.12), m);
			});
			const cn = mesh(new THREE.ConeGeometry(0.2, 0.5, 8), "#E0A45A");
			cn.rotation.x = Math.PI;
			cn.position.y = 0;
			const sc = mesh(new THREE.IcosahedronGeometry(0.27, 0), "#FFC2DC");
			sc.position.y = 0.31;
			const ch = mesh(new THREE.IcosahedronGeometry(0.1, 0), "#E5484D");
			ch.position.y = 0.58;
			const top = grp(-0.1, 1.95, 0, cn, sc, ch);
			roof.push(top);
			mount = { x: -0.25, y: 1.675, s: 0.95 };
			anims.push((tm) => {
				top.rotation.y = tm * 1.4;
				top.position.y = 1.95 + Math.sin(tm * 2.4) * 0.06;
				aw.forEach((q, k) => (q.rotation.x = Math.sin(tm * 3 + k) * 0.06));
			});
			wheels([-0.68, 0.68]);
			break;
		}
		case "fire": {
			chassis(2.2, -0.05);
			add(B(1.45, 0.85, W, c, -0.38, 0.95, 0, NY), B(1.47, 0.12, W + 0.06, a, -0.38, 0.8, 0));
			const lad = new THREE.Group();
			if (!hose) {
				lad.position.set(-0.8, 1.5, 0);
				lad.add(B(1.6, 0.06, 0.06, "#CFD4DC", 0.72, 0, 0.26), B(1.6, 0.06, 0.06, "#CFD4DC", 0.72, 0, -0.26));
				for (let k = 0; k < 7; k++) lad.add(B(0.05, 0.05, 0.52, "#CFD4DC", k * 0.24, 0, 0));
				g.add(lad);
				add(
					Cy(0.2, 0.23, 0.08, 10, "#8E96A3", -0.8, 1.415, 0),
					B(0.12, 0.12, 0.08, "#8E96A3", -0.8, 1.46, 0.26),
					B(0.12, 0.12, 0.08, "#8E96A3", -0.8, 1.46, -0.26),
					B(0.07, 0.09, 0.6, "#5A6272", 0.3, 1.42, 0),
				);
			}
			mount = { x: -0.42, y: 1.375, s: 0.95 };
			cab(0.72, 0.62, 0.85);
			const L1 = uniq(B(0.14, 0.1, 0.3, "#3D7BFF", 0.72, 1.42, 0.18, { emissive: "#3D7BFF", emissiveIntensity: 0.8 })),
				L2 = uniq(B(0.14, 0.1, 0.3, "#FF3B3B", 0.72, 1.42, -0.18, { emissive: "#FF3B3B", emissiveIntensity: 0.8 }));
			add(L1, L2);
			anims.push((tm) => {
				const on = Math.sin(tm * 9) > 0;
				L1.material.emissiveIntensity = on ? 2 : 0.1;
				L2.material.emissiveIntensity = on ? 0.1 : 2;
				lad.rotation.z = (Math.sin(tm * 0.7) * 0.5 + 0.5) * 0.12;
			});
			wheels([-0.88, -0.24, 0.72]);
			break;
		}
		case "mixer": {
			chassis();
			const dg = new THREE.Group();
			const dr = mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.3, 8), a);
			dg.add(dr);
			[-0.3, 0.25].forEach((y) => {
				const b = mesh(new THREE.TorusGeometry(0.53 - y * 0.15, 0.05, 4, 8), c);
				b.rotation.x = Math.PI / 2;
				b.position.y = y;
				dg.add(b);
			});
			dg.add(B(0.08, 1.1, 0.12, c, 0.5, 0, 0));
			dg.rotation.z = Math.PI / 2 - 0.2;
			dg.position.set(-0.38, 1.12, 0);
			if (!hose) g.add(dg);
			mount = { x: -0.4, y: 0.9, s: 1.0 };
			const chute = grp(-1.05, 0.8, 0, B(0.4, 0.08, 0.2, "#8E96A3", -0.15, 0, 0));
			chute.rotation.z = 0.5;
			add(B(0.2, 0.4, 0.5, D, -0.9, 0.7, 0), B(0.2, 0.4, 0.5, D, 0.1, 0.7, 0));
			cab(0.72);
			anims.push((tm, dt) => {
				dg.rotateY(dt * 3);
				chute.rotation.y = Math.sin(tm * 0.9) * 0.5;
			});
			wheels([-0.86, -0.22, 0.72]);
			break;
		}
		case "dump": {
			chassis();
			const bed = new THREE.Group();
			bed.position.set(-1.0, 0.6, 0);
			const bb = B(1.35, 0.75, W, c, 0.66, 0.38, 0);
			bb.rotation.z = hose ? 0 : -0.06;
			bed.add(bb);
			[-0.8, -0.34, 0.12].forEach((x) => bed.add(B(0.06, 0.78, W + 0.04, a, x + 1.0, 0.38, 0)));
			if (!hose) bed.add(B(0.3, 0.25, 0.9, "#8C5A3C", 0.5, 0.85, 0), B(0.25, 0.2, 0.5, "#6F7682", 0.95, 0.82, 0.15));
			mount = { x: -0.34, y: 1.37, s: 0.95 };
			g.add(bed);
			const ram = B(0.1, 0.5, 0.1, "#8E96A3", -0.1, 0.6, 0);
			ram.userData.dyn = true;
			add(ram);
			cab(0.72);
			anims.push((tm) => {
				if (hose) return;
				const u = Math.max(0, Math.sin(tm * 0.7));
				const e = u * u;
				bed.rotation.z = e * 0.6;
				ram.scale.y = 1 + e * 1.6;
				ram.position.y = 0.6 + e * 0.4;
				ram.rotation.z = e * 0.5;
			});
			wheels([-0.7, 0.72]);
			break;
		}
		case "pickup": {
			add(
				B(2.0, 0.18, W * 0.78, D, 0, 0.42, 0),
				B(0.72, 0.62, W, c, 0.05, 0.82, 0, NY),
				B(0.695, 0.36, W, c, 0.6825, 0.7, 0, HOOD),
				B(0.71, 0.1, W - 0.16, c, -0.665, 0.56, 0),
				B(0.76, 0.32, 0.06, c, -0.69, 0.72, W / 2 - 0.03),
				B(0.76, 0.32, 0.06, c, -0.69, 0.72, -W / 2 + 0.03),
				B(0.06, 0.3, W - 0.14, c, -1.05, 0.71, 0),
				B(0.04, 0.22, W * 0.8, GL, 0.42, 0.95, 0, glass),
				B(0.4, 0.2, W + 0.02, GL, 0.05, 0.95, 0, glass),
				B(1.9, 0.06, W + 0.06, a, 0, 0.62, 0),
				B(0.08, 0.14, W * 0.96, CH, 1.05, 0.56, 0),
				B(0.03, 0.14, W * 0.5, "#1D2230", 1.04, 0.7, 0),
				B(0.04, 0.1, 0.18, "#FFF6C2", 1.04, 0.74, 0.36, lamp),
				B(0.04, 0.1, 0.18, "#FFF6C2", 1.04, 0.74, -0.36, lamp),
				B(0.1, 0.06, W * 0.9, D, -1.02, 1.05, 0),
				B(0.06, 0.22, 0.06, D, -1.02, 0.92, 0.4),
				B(0.06, 0.22, 0.06, D, -1.02, 0.92, -0.4),
			);
			const pipe = Cy(0.05, 0.05, 0.3, 6, "#8E96A3", -1.1, 0.45, -0.35);
			pipe.rotation.z = Math.PI / 2;
			add(pipe);
			const puffs = [0, 1, 2, 3].map((k) => {
				const m = new THREE.Mesh(
					new THREE.IcosahedronGeometry(0.1, 0),
					new THREE.MeshStandardMaterial({ color: "#C9CED8", transparent: true, opacity: 0.7, flatShading: true }),
				);
				m.userData.dyn = true;
				g.add(m);
				return m;
			});
			anims.push((tm) =>
				puffs.forEach((m, k) => {
					const u = (tm * 1.3 + k / 4) % 1;
					m.position.set(-1.25 - u * 0.8, 0.45 + u * 0.5, -0.35);
					m.scale.setScalar(0.6 + u * 2);
					m.material.opacity = 0.7 * (1 - u);
				}),
			);
			wheels([-0.62, 0.62], 0.32);
			mount = { x: -0.72, y: 0.61, s: 0.7 };
			break;
		}
		case "tow": {
			chassis();
			add(B(1.3, 0.12, W, c, -0.36, 0.6, 0));
			const hook = new THREE.Group();
			if (!hose) {
				add(
					Cy(0.26, 0.3, 0.1, 10, "#5A6272", -0.05, 0.72, 0),
					B(0.36, 0.22, 0.48, D, -0.05, 0.9, 0),
					B(0.07, 0.54, 0.07, "#8E96A3", -0.6, 0.95, 0.09),
					B(0.07, 0.54, 0.07, "#8E96A3", -0.6, 0.95, -0.09),
				);
				const pin = Cy(0.065, 0.065, 0.58, 8, "#8E96A3", -0.05, 1.02, 0);
				pin.rotation.x = Math.PI / 2;
				add(pin);
				const bm = B(1.2, 0.14, 0.14, a, -0.56, 1.21, 0);
				bm.rotation.z = -0.55;
				add(bm);
				hook.position.set(-1.07, 1.52, 0);
				hook.add(
					B(0.03, 0.4, 0.03, D, 0, -0.2, 0),
					B(0.14, 0.08, 0.08, "#888E99", 0, -0.4, 0),
					B(0.05, 0.12, 0.05, "#888E99", 0.06, -0.47, 0),
				);
				g.add(hook);
			}
			mount = { x: -0.4, y: 0.66, s: 0.95 };
			cab(0.72);
			beacon(0.72, 1.34, "#FFB000", 9);
			anims.push((tm) => {
				hook.rotation.z = Math.sin(tm * 2.2) * 0.35;
				hook.rotation.x = Math.sin(tm * 1.7) * 0.15;
			});
			wheels([-0.7, 0.72]);
			break;
		}
		case "garbage": {
			mount = { x: -0.32, y: 1.565, s: 0.95 };
			chassis(2.3, -0.1);
			add(B(1.25, 1.05, W, c, -0.3, 1.04, 0, NY), B(0.8, 0.4, W + 0.06, a, -0.3, 1.05, 0));
			cab(0.72);
			add(
				B(0.62, 0.9, 0.07, c, -1.23, 1.0, W / 2 - 0.035),
				B(0.62, 0.9, 0.07, c, -1.23, 1.0, -W / 2 + 0.035),
				B(0.58, 0.08, W - 0.08, D, -1.23, 0.6, 0),
				B(0.02, 0.82, W - 0.16, "#151B24", -0.935, 1.0, 0),
				B(0.3, 0.08, W - 0.02, c, -1.07, 1.48, 0),
				B(0.64, 0.06, 0.09, a, -1.23, 1.46, W / 2 - 0.035),
				B(0.64, 0.06, 0.09, a, -1.23, 1.46, -W / 2 + 0.035),
				B(0.08, 0.08, W - 0.22, "#FFC83D", -1.53, 1.3, 0),
				B(0.1, 0.12, W + 0.04, D, -1.52, 0.56, 0),
			);
			const vx = -0.36,
				vy = -0.56,
				hx = vx + 0.17,
				hy = vy + 0.1,
				al = Math.hypot(hx, hy),
				ang = Math.atan2(hy, hx),
				lift = new THREE.Group();
			lift.position.set(-1.53, 1.3, 0);
			g.add(lift);
			[0.2, -0.2].forEach((z) => {
				const ar = B(al + 0.04, 0.06, 0.06, D, hx / 2, hy / 2, z);
				ar.rotation.z = ang;
				lift.add(ar);
			});
			const bin = new THREE.Group();
			bin.position.set(vx, vy, 0);
			lift.add(bin);
			bin.add(
				new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.34), M("#1FA35C")),
				(() => {
					const l = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.04, 0.35), M("#157A44"));
					l.position.y = 0.21;
					return l;
				})(),
				B(0.07, 0.07, 0.5, D, 0.17, 0.1, 0),
				B(0.1, 0.14, 0.03, D, 0.1, 0.08, 0.19),
				B(0.1, 0.14, 0.03, D, 0.1, 0.08, -0.19),
			);
			const junk = [0, 1, 2].map((k) => {
				const m = B(0.09, 0.09, 0.09, ["#8C5A3C", "#6F7682", "#C28A4A"][k], 0, 0, 0);
				m.visible = false;
				m.userData.dyn = true;
				g.add(m);
				return m;
			});
			anims.push((tm) => {
				const u = (tm * 0.3) % 1,
					e = u < 0.55 ? Math.sin((u / 0.55) * Math.PI) : 0,
					th = -e * 2.35;
				lift.rotation.z = th;
				const dump = u > 0.2 && u < 0.38,
					k = (u - 0.2) / 0.18;
				junk.forEach((m, n) => {
					m.visible = dump;
					if (dump) m.position.set(-1.45 + n * 0.08, 1.75 - k * 1.1 - n * 0.05, (n - 1) * 0.12);
					m.rotation.set(k * 5 + n, k * 4, 0);
				});
			});
			wheels([-0.7, 0.72]);
			break;
		}
		case "tanker": {
			chassis();
			const tk = Cy(0.5, 0.5, 1.45, 12, c, -0.35, 1.02, 0, { roughness: 0.35, metalness: 0.4 });
			tk.rotation.z = Math.PI / 2;
			add(tk);
			[-0.9, 0.2].forEach((x) => {
				const b = Cy(0.53, 0.53, 0.08, 12, a, x, 1.02, 0);
				b.rotation.z = Math.PI / 2;
				add(b);
			});
			const lid = new THREE.Group(),
				drop = uniq(mesh(new THREE.IcosahedronGeometry(0.07, 0), "#4FB3E8", { transparent: true, opacity: 0.9 }));
			drop.userData.dyn = true;
			if (hose) {
				add(B(1.1, 0.26, 0.7, D, -0.35, 1.43, 0));
				mount = { x: -0.35, y: 1.56, s: 0.95 };
			} else {
				add(Cy(0.12, 0.12, 0.14, 8, "#AAB3C0", -0.35, 1.55, 0), B(1.3, 0.04, 0.04, "#8E96A3", -0.35, 1.56, 0.3));
				[-0.94, -0.55, -0.15, 0.24].forEach((x) => add(B(0.03, 0.17, 0.03, "#8E96A3", x, 1.475, 0.3)));
				lid.position.set(-0.47, 1.63, 0);
				lid.add(Cy(0.14, 0.14, 0.04, 8, "#8E96A3", 0.12, 0, 0));
				g.add(lid);
				add(drop);
			}
			cab(0.72, 0.62, 0.82, a);
			anims.push((tm) => {
				const u = Math.max(0, Math.sin(tm * 1.1));
				lid.rotation.z = u * 1.1;
				const d = (tm * 0.8) % 1;
				drop.position.set(-1.1, 0.95 - d * 0.8, 0);
				drop.material.opacity = d < 0.9 ? 0.9 : 0;
			});
			wheels([-0.88, -0.24, 0.72]);
			break;
		}
		case "mail": {
			chassis();
			const vg = chamferPrism(
				[
					[-1.025, 0.495],
					[0.93, 0.495],
					[0.943, 1.04],
					[0.5, 1.545],
					[-1.025, 1.545],
				],
				W,
				0.075,
				[0.07, 0, 0, 0.09, 0.07],
			);
			if (vg) add(mesh(vg, c));
			else {
				add(B(1.55, 1.05, W, c, -0.25, 1.02, 0, NY));
				const wsh = new THREE.Shape();
				wsh.moveTo(0.5, 1.055);
				wsh.lineTo(0.93, 1.055);
				wsh.lineTo(0.5, 1.545);
				wsh.closePath();
				const wg = new THREE.ExtrudeGeometry(wsh, { depth: W, bevelEnabled: false });
				wg.translate(0, 0, -W / 2);
				add(mesh(wg, c));
			}
			add(B(0.57, 0.55, W - 0.03, c, 0.735, 0.78, 0, HOOD));
			const ws = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.03, W * 0.8), M(GL, glass));
			ws.position.set(0.736, 1.288, 0);
			ws.rotation.z = Math.atan2(-0.49, 0.43);
			add(
				ws,
				B(1.57, 0.1, W + 0.06, a, -0.25, 0.8, 0),
				B(0.3, 0.3, W + 0.02, GL, 0.3, 1.25, 0, glass),
				B(0.5, 0.32, W + 0.02, "#FFFFFF", -0.55, 1.15, 0),
				B(0.08, 0.14, W * 0.96, CH, 1.04, 0.6, 0),
				B(0.04, 0.1, 0.18, "#FFF6C2", 1.03, 0.74, 0.36, lamp),
				B(0.04, 0.1, 0.18, "#FFF6C2", 1.03, 0.74, -0.36, lamp),
			);
			const flag = grp(
				-0.95,
				1.1,
				W / 2 + 0.01,
				B(0.03, 0.42, 0.02, D, 0, 0.21, 0),
				B(0.24, 0.13, 0.02, "#E5484D", 0.12, 0.3, 0.012),
			);
			const env = mesh(new THREE.PlaneGeometry(0.28, 0.18), "#FFF8E6", { side: THREE.DoubleSide });
			env.userData.dyn = true;
			g.add(env);
			anims.push((tm) => {
				const u = (tm * 0.4) % 1;
				flag.rotation.z = u < 0.5 ? -Math.min(1, u * 6) * 1.35 : -1.35 + Math.min(1, (u - 0.5) * 6) * 1.35;
				const v = (tm * 0.5) % 1;
				env.position.set(-0.4 - v * 0.3, 1.6 + v * 1.2, 0);
				env.rotation.set(v * 3, v * 5, v * 2);
				env.visible = v < 0.85 && !hose;
			});
			wheels([-0.7, 0.62]);
			mount = { x: -0.32, y: 1.545, s: 0.95 };
			break;
		}
		case "food": {
			chassis();
			add(
				B(2.05, 1.1, W, c, 0, 1.08, 0, NY),
				B(0.9, 0.42, W + 0.02, "#2C313D", -0.35, 1.15, 0),
				B(0.04, 0.45, W * 0.84, GL, 1.03, 1.3, 0, glass),
				B(0.08, 0.16, W * 0.96, CH, 1.07, 0.6, 0),
				B(0.04, 0.1, 0.18, "#FFF6C2", 1.06, 0.78, 0.36, lamp),
				B(0.04, 0.1, 0.18, "#FFF6C2", 1.06, 0.78, -0.36, lamp),
			);
			const aw = [1, -1].map((s) => {
				const q = grp(-0.35, 1.44, s * (W / 2 + 0.01), B(1.0, 0.06, 0.36, a, 0, 0, s * 0.18));
				q.rotation.x = s * 0.3;
				q.userData.s = s;
				return q;
			});
			const tc = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12, 1, false, 0, Math.PI), "#F2C14E", {
				side: THREE.DoubleSide,
			});
			tc.rotation.set(Math.PI / 2, 0, -Math.PI / 2, "ZYX");
			tc.position.y = 0.34;
			mount = { x: -0.25, y: 1.63, s: 0.95 };
			const tg = grp(
				-0.1,
				1.66,
				0,
				tc,
				B(0.6, 0.1, 0.16, "#4CAF50", 0, 0.37, 0),
				B(0.42, 0.08, 0.12, "#E5484D", -0.05, 0.42, 0),
				B(0.3, 0.07, 0.1, "#8B4A2B", 0.08, 0.45, 0),
			);
			roof.push(tg);
			anims.push((tm) => {
				tg.rotation.y = tm * 1.2;
				tg.position.y = 1.66 + Math.abs(Math.sin(tm * 2.4)) * 0.12;
				aw.forEach((q) => (q.rotation.x = q.userData.s * (0.3 + Math.sin(tm * 3.5 + q.userData.s) * 0.08)));
			});
			wheels([-0.68, 0.68]);
			break;
		}
	}
	if (t.kind === "pickup") {
		tailX = -1.08;
		tailY = 0.72;
	}
	if (tailX !== null) {
		const tail = { emissive: "#FF4A4F", emissiveIntensity: 0.9 },
			host = g.userData.tailG || g;
		const bp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, W * 0.9), M(D));
		bp.position.set(tailX - 0.02, tailY, 0);
		const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.16), M("#E5484D", tail)),
			l2 = l1.clone();
		l1.position.set(tailX - 0.075, tailY + 0.01, W * 0.33);
		l2.position.set(tailX - 0.075, tailY + 0.01, -W * 0.33);
		host.add(bp, l1, l2);
	}
	if (mon) monsterize(g, monAx, anims, wheelsL, t.kind === "monster");
	{
		/* paint (body and accent colour) gets its own materials per truck, tagged for the new look's slight shine (lookEnv) */
		const pc = [c, a].map((x) => new THREE.Color(x).getHex()),
			cl = new Map();
		g.traverse((o) => {
			const m = o.material;
			if (!m || Array.isArray(m) || !m.isMeshStandardMaterial || m.transparent || !pc.includes(m.color.getHex()))
				return;
			if (!cl.has(m)) {
				const q = m.clone();
				q.userData = { paint: m.roughness, refl: 1 };
				cl.set(m, q);
			}
			o.material = cl.get(m);
		});
	}
	g.userData.anims = anims;
	g.userData.wheels = wheelsL;
	g.userData.ph = ph;
	g.userData.roof = roof; // roof ornaments a minigame can take off
	if (hose) {
		roof.forEach((o) => o.parent && o.parent.remove(o));
		g.userData.mount = mount;
	}
	mergeTruck(g);
	return g;
}
/* monster mode (Monster Mash's boss): the truck's own body, paint a shade darker, lifted on long shocks over huge
   treaded tyres with spiked hubs, a toothed bull bar, red glowing eyes under angry brows, and exhaust stacks with flames */
const MON = { R: 0.62, DY: 0.7, EYE: { emissive: "#FF2A1A", emissiveIntensity: 0.9 } };
function monsterize(g, xs, anims, wheelsL, own) {
	const DY = own ? 0.2 : MON.DY,
		R = MON.R,
		D = "#353A46",
		ST = "#4A525C",
		CH = "#C9CED8",
		BONE = "#E8E2D0",
		W2 = 0.55,
		ZW = W2 + 0.27,
		lift = new THREE.Group();
	lift.position.y = DY;
	[...g.children].forEach((o) => lift.add(o));
	g.add(lift);
	g.userData.lift = lift;
	g.updateMatrixWorld(true);
	const bb = new THREE.Box3().setFromObject(lift),
		fx = bb.max.x,
		top = bb.max.y - DY,
		add = (p, ...m) => m.forEach((x) => p.add(x)),
		cyl = (rt, rb, h, n, col, x, y, z, o) => Cy(rt, rb, h, n, col, x, y, z, o);
	/* axles: close tandem axles share one big tyre, and the two ends stay a tyre apart */
	const ax = [];
	xs.slice()
		.sort((a, b) => a - b)
		.forEach((x) => {
			const l = ax[ax.length - 1];
			if (l && x - l[l.length - 1] < 1.2) l.push(x);
			else ax.push([x]);
		});
	let axles = ax.map((l) => l.reduce((a, b) => a + b, 0) / l.length);
	if (axles.length === 1) axles = [axles[0] - 0.7, axles[0] + 0.7];
	if (axles.length === 2 && axles[1] - axles[0] < 1.34) {
		const m = (axles[0] + axles[1]) / 2;
		axles = [m - 0.67, m + 0.67];
	}
	axles.forEach((x) => {
		/* axle beam, and per side a coil-over shock from the axle up to the frame */
		const beam = cyl(0.09, 0.09, ZW * 2, 8, D, x, R, 0);
		beam.rotation.x = Math.PI / 2;
		g.add(beam);
		const bot = 0.3 + DY;
		[-1, 1].forEach((sd) => {
			const zz = sd * 0.4,
				h = bot - R,
				rod = cyl(0.035, 0.035, h + 0.1, 6, CH, x, R + h / 2, zz),
				spr = cyl(0.085, 0.085, h * 0.55, 8, "#FFC83D", x, R + h * 0.55, zz),
				capT = cyl(0.07, 0.07, 0.08, 8, D, x, bot - 0.02, zz),
				capB = cyl(0.07, 0.07, 0.08, 8, D, x, R + 0.1, zz);
			add(g, rod, spr, capT, capB);
			/* the tyre: tread, dark rim and cap stay still (merged), the tread blocks, spike and bolts turn */
			const z = sd * ZW,
				wg = new THREE.Group();
			wg.position.set(x, R, z);
			const tyre = Cy(R, R, 0.48, 14, "#2A2E36", 0, 0, 0),
				rim = Cy(R * 0.56, R * 0.56, 0.5, 10, "#3D424C", 0, 0, 0),
				cap = Cy(R * 0.3, R * 0.3, 0.54, 8, CH, 0, 0, 0);
			[tyre, rim, cap].forEach((m) => (m.rotation.x = Math.PI / 2));
			wg.add(tyre, rim, cap);
			for (let i = 0; i < 14; i++) {
				const a = (i / 14) * Math.PI * 2,
					b = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.46), M("#30343C"));
				b.position.set(Math.cos(a) * (R + 0.03), Math.sin(a) * (R + 0.03), 0);
				b.rotation.z = a + Math.PI / 2;
				b.castShadow = true;
				wg.add(b);
			}
			const sp = Cy(0, 0.1, 0.3, 6, CH, 0, 0, sd * 0.42);
			sp.rotation.x = (sd * Math.PI) / 2;
			wg.add(sp);
			for (let i = 0; i < 5; i++) {
				const a = (i / 5) * Math.PI * 2,
					bt = Cy(0.04, 0.04, 0.06, 6, "#E3E6EB", Math.cos(a) * 0.24, Math.sin(a) * 0.24, sd * 0.28);
				bt.rotation.x = Math.PI / 2;
				wg.add(bt);
			}
			g.add(wg);
			wheelsL.push({ g: wg, r: R });
		});
	});
	/* toothed bull bar = the mouth: the upper bar with fangs is fixed, the lower bar with teeth is a jaw hinged at the
	   back (userData.jaw, rotation.z < 0 opens it), a dark throat between them. userData.mouth = where things come out */
	const bx = fx + 0.12,
		jaw = new THREE.Group();
	add(
		lift,
		B_(0.1, 0.1, 1.2, ST, bx, 0.58, 0),
		B_(0.08, 0.32, 0.08, ST, bx, 0.46, 0.44),
		B_(0.08, 0.32, 0.08, ST, bx, 0.46, -0.44),
		B_(0.14, 0.08, 0.08, D, fx + 0.02, 0.46, 0.3),
		B_(0.14, 0.08, 0.08, D, fx + 0.02, 0.46, -0.3),
		B_(0.12, 0.08, 0.08, D, fx + 0.02, 0.27, 0.56),
		B_(0.12, 0.08, 0.08, D, fx + 0.02, 0.27, -0.56),
		B_(0.04, 0.28, 0.86, "#4A1418", fx + 0.06, 0.41, 0),
	);
	jaw.position.set(fx + 0.04, 0.27, 0);
	jaw.add(
		B_(0.1, 0.1, 1.2, ST, bx - fx - 0.04, -0.07, 0),
		B_(0.14, 0.06, 0.06, ST, 0.02, -0.04, 0.53),
		B_(0.14, 0.06, 0.06, ST, 0.02, -0.04, -0.53),
	);
	[-0.36, -0.18, 0, 0.18, 0.36].forEach((z) => jaw.add(cyl(0, 0.05, 0.18, 4, BONE, bx - fx - 0.04, 0.07, z)));
	lift.add(jaw);
	g.userData.jaw = jaw;
	g.userData.mouth = new THREE.Vector3(bx, 0.41 + DY, 0);
	[-0.27, -0.09, 0.09, 0.27].forEach((z) => {
		const f = cyl(0, 0.05, 0.18, 4, BONE, bx, 0.44, z);
		f.rotation.x = Math.PI;
		lift.add(f);
	});
	[-0.5, 0.5].forEach((z) => {
		const k = cyl(0, 0.06, 0.26, 5, CH, bx + 0.17, 0.58, z);
		k.rotation.z = -Math.PI / 2;
		lift.add(k);
	});
	/* angry brows over the eyes that look forward */
	const eyes = [];
	lift.traverse((o) => {
		if (o.isMesh && o.material && o.material.emissive && o.material.emissive.getHex() === 0xff2a1a) eyes.push(o);
	});
	eyes.forEach((o) => {
		const p = lift.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
		if (p.x < fx - 0.4 || Math.abs(p.z) < 0.15) return;
		o.scale.set(1, 1.6, 1.35);
		const br = B_(0.07, 0.05, 0.3, "#1D2230", p.x + 0.03, p.y + 0.13, p.z);
		br.rotation.x = -Math.sign(p.z) * 0.45;
		lift.add(br);
	});
	/* exhaust stacks behind the cab, sooty tips, flickering flames */
	const ex = fx - 0.9,
		ht = Math.min(Math.max(top + 0.05, 1.2), 1.75);
	[-1, 1].forEach((sd) => {
		const z = sd * (W2 + 0.1);
		add(
			lift,
			cyl(0.08, 0.08, ht - 0.45, 8, CH, ex, 0.45 + (ht - 0.45) / 2, z),
			cyl(0.1, 0.09, 0.1, 8, "#2E323A", ex, ht + 0.03, z),
			B_(0.06, 0.06, 0.12, D, ex, 0.75, sd * (W2 + 0.03)),
		);
		const fl = cyl(0, 0.09, 0.24, 6, "#FF6A1F", ex, ht + 0.2, z, { emissive: "#FF4A10", emissiveIntensity: 1.6 });
		fl.userData.dyn = true;
		lift.add(fl);
		anims.push((tm) => {
			const k = 0.75 + Math.abs(Math.sin(tm * 17 + sd)) * 0.5;
			fl.scale.set(1, k, 1);
			fl.position.y = ht + 0.08 + 0.12 * k;
		});
	});
}
/* plain box for the monster kit (no chamfer: small parts stay crisp) */
function B_(w, h, d, c, x, y, z) {
	const m = mesh(new THREE.BoxGeometry(w, h, d), c);
	m.position.set(x, y, z);
	return m;
}
/* fewer draw calls: inside every group, the static meshes that share a material become one mesh (a truck drops from
   50-70 meshes to about 15, and the shadow pass with it). Meshes with userData (dyn: moved or toggled on their own)
   stay as they are, and so do moving groups (they merge inside). Wheels keep only the spoke turning: tyre, hub and cap
   look the same at any angle, so they join the static body. */
function mergeTruck(g) {
	g.updateMatrixWorld(true);
	(g.userData.wheels || []).forEach(({ g: wg }) =>
		wg.children.slice(0, 3).forEach((m) => {
			m.applyMatrix4(wg.matrix);
			g.add(m);
		}),
	);
	mergeMeshes(g);
}
/* the merge itself, for anything bolted onto a truck later too (Dump Run's tipper bed). Plain parts (no paint, glow,
   transparency or texture) move their colour into the vertex colours and share one white material per finish, so all
   the trim, chrome, tyres and lamps of a group become one mesh; the shader multiplies colour and vertex colour either
   way, so they look the same. */
var NEUTRAL_MAT = {};
function neutralMat(m) {
	if (
		!m.isMeshStandardMaterial ||
		m.transparent ||
		m.map ||
		m.userData.ao ||
		m.userData.paint !== undefined ||
		m.emissive.getHex()
	)
		return null;
	const rf = m.userData.refl,
		k = [m.roughness, m.metalness, m.side, m.flatShading, rf].join();
	if (!NEUTRAL_MAT[k]) {
		const q = new THREE.MeshStandardMaterial({
			color: "#FFFFFF",
			vertexColors: true,
			flatShading: m.flatShading,
			roughness: m.roughness,
			metalness: m.metalness,
			side: m.side,
		});
		if (rf !== undefined) q.userData.refl = rf;
		NEUTRAL_MAT[k] = q;
	}
	return NEUTRAL_MAT[k];
}
function mergeMeshes(g) {
	const hosts = [];
	g.traverse((o) => {
		if (!o.isMesh) hosts.push(o);
	});
	hosts.forEach((h) => {
		const sets = new Map();
		h.children.forEach((m) => {
			if (!m.isMesh || m.isInstancedMesh || m.visible === false || Array.isArray(m.material)) return;
			if (Object.keys(m.userData).length || m.children.length) return;
			const mat = neutralMat(m.material) || m.material,
				k = mat.uuid + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0) + "|" + m.renderOrder;
			if (!sets.has(k)) sets.set(k, { mat, L: [] });
			sets.get(k).L.push(m);
		});
		sets.forEach(({ mat, L }) => {
			if (L.length < 2) return;
			const mm = new THREE.Mesh(
				mergeGeo(
					L.map((m) => {
						m.updateMatrix();
						return { m, mx: m.matrix };
					}),
					mat,
				),
				mat,
			);
			L.forEach((m) => h.remove(m));
			mm.castShadow = L[0].castShadow;
			mm.receiveShadow = L[0].receiveShadow;
			mm.renderOrder = L[0].renderOrder;
			h.add(mm);
		});
	});
}
/* one geometry from many meshes [{m, mx}] (mx = each mesh's matrix into the merged space), for material mat. A part that
   moves onto a white neutral material carries its own colour into the vertex colours; uv comes along for textured
   materials; mirrored parts (negative scale) get their triangles turned back round so they don't vanish. */
function mergeGeo(items, mat) {
	const v = new THREE.Vector3(),
		nm = new THREE.Matrix3(),
		geos = items.map(({ m }) => (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry)),
		n = geos.reduce((s, ge) => s + ge.attributes.position.count, 0),
		P = new Float32Array(n * 3),
		N = new Float32Array(n * 3),
		C = mat.vertexColors ? new Float32Array(n * 3).fill(1) : null,
		UV = mat.map ? new Float32Array(n * 2) : null,
		AU = mat.userData.ao ? new Float32Array(n * 2) : null;
	let off = 0;
	items.forEach(({ m, mx }, mi) => {
		const a = geos[mi].attributes,
			tint = mat !== m.material ? m.material.color : null,
			vc = m.material.vertexColors && a.color,
			flip = mx.determinant() < 0;
		nm.getNormalMatrix(mx);
		for (let i = 0; i < a.position.count; i++) {
			/* mirrored: write each triangle's 2nd and 3rd corner swapped */
			const k = flip && i % 3 ? i + (i % 3 === 1 ? 1 : -1) : i,
				j = (off + k) * 3;
			v.fromBufferAttribute(a.position, i).applyMatrix4(mx);
			P[j] = v.x;
			P[j + 1] = v.y;
			P[j + 2] = v.z;
			if (a.normal) v.fromBufferAttribute(a.normal, i).applyMatrix3(nm).normalize();
			else v.set(0, 1, 0);
			N[j] = v.x;
			N[j + 1] = v.y;
			N[j + 2] = v.z;
			if (C) {
				const r = vc ? a.color.getX(i) : 1,
					gg = vc ? a.color.getY(i) : 1,
					bb = vc ? a.color.getZ(i) : 1;
				C[j] = tint ? r * tint.r : r;
				C[j + 1] = tint ? gg * tint.g : gg;
				C[j + 2] = tint ? bb * tint.b : bb;
			}
			if (UV && a.uv) {
				UV[(off + k) * 2] = a.uv.getX(i);
				UV[(off + k) * 2 + 1] = a.uv.getY(i);
			}
			if (AU && a.aoUv) {
				AU[(off + k) * 2] = a.aoUv.getX(i);
				AU[(off + k) * 2 + 1] = a.aoUv.getY(i);
			}
		}
		off += a.position.count;
	});
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
	geo.setAttribute("normal", new THREE.BufferAttribute(N, 3));
	if (C) geo.setAttribute("color", new THREE.BufferAttribute(C, 3));
	if (UV) geo.setAttribute("uv", new THREE.BufferAttribute(UV, 2));
	if (AU) geo.setAttribute("aoUv", new THREE.BufferAttribute(AU, 2));
	return geo;
}
function animTruck(tr, dt, speed = 0) {
	const u = tr && tr.userData;
	if (!u || !u.anims) return;
	const tm = performance.now() / 1000 + u.ph;
	u.anims.forEach((f) => f(tm, dt));
	if (speed)
		u.wheels.forEach((w) => {
			w.g.rotation.z -= (speed * dt) / w.r;
		});
}
function swayStep(scene) {
	if (!scene.userData.swayList) {
		const l = [];
		scene.traverse((o) => {
			if (o.userData && o.userData.sway !== undefined) l.push(o);
		});
		scene.userData.swayList = l;
	}
	const tm = performance.now() / 1000;
	scene.userData.swayList.forEach((o) => {
		o.rotation.z = Math.sin(tm * 1.3 + o.userData.sway) * 0.035;
		o.rotation.x = Math.cos(tm * 1.1 + o.userData.sway) * 0.025;
	});
}
