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
/* faint grit: mostly tiny grains, now and then a bigger round stone; cols are "r,g,b" strings, a = base opacity */
function grit(x, w, h, n, cols, a) {
	for (let i = 0; i < n; i++) {
		const r = scnR(),
			z = 0.4 + 2.8 * r * r * r;
		x.fillStyle = `rgba(${cols[i % cols.length]},${(a + scnR() * a - r * a * 0.6).toFixed(3)})`;
		if (z < 1.2) x.fillRect(scnR() * w, scnR() * h, z, z);
		else {
			x.beginPath();
			x.ellipse(scnR() * w, scnR() * h, z / 2, (z / 2) * (0.6 + scnR() * 0.4), scnR() * 3, 0, 6.283);
			x.fill();
		}
	}
}
/* 8 x 8 m of worn asphalt: aggregate grit and soft wear patches (cracks are scattered decals, see roadWear, so they never repeat) */
const asphaltTex = () =>
	scnTex("asphalt", 256, (x, w, h) => {
		x.fillStyle = "#4A4F59";
		x.fillRect(0, 0, w, h);
		for (let i = 0; i < 7; i++)
			wrapBlob(
				x,
				w,
				h,
				scnR() * w,
				scnR() * h,
				45 + scnR() * 60,
				i % 2 ? "rgba(34,37,44,.09)" : "rgba(120,124,132,.07)",
				"rgba(0,0,0,0)",
			);
		grit(x, w, h, 5200, ["20,22,28", "150,152,158", "95,98,106"], 0.06);
	});
/* 10 x 10 m of lawn: soft mowing stripes, faint blade grit, a few tiny flowers */
const grassTex = () =>
	scnTex("grass", 256, (x, w, h) => {
		for (let i = 0; i < 5; i++) {
			x.fillStyle = i % 2 ? "#7BC468" : "#81C96E";
			x.fillRect((i * w) / 5, 0, w / 5, h);
		}
		for (let i = 0; i < 6; i++)
			wrapBlob(x, w, h, scnR() * w, scnR() * h, 30 + scnR() * 40, "rgba(70,130,60,.08)", "rgba(70,130,60,0)");
		grit(x, w, h, 4200, ["60,120,50", "170,220,140", "90,150,70"], 0.1);
		for (let i = 0; i < 40; i++) {
			x.fillStyle = ["rgba(255,255,255,.75)", "rgba(255,224,102,.75)", "rgba(247,184,210,.75)"][i % 3];
			x.beginPath();
			x.arc(scnR() * w, scnR() * h, 0.8 + scnR() * 0.5, 0, 6.283);
			x.fill();
		}
	});
/* 4 x 4 m of pavement: 0.5 m slabs, gentle tone differences, light joints */
const pavingTex = () =>
	scnTex("paving", 256, (x, w, h) => {
		const n = 8,
			c = w / n;
		for (let i = 0; i < n; i++)
			for (let j = 0; j < n; j++) {
				const v = 200 + Math.floor(scnR() * 8);
				x.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
				x.fillRect(i * c, j * c, c, c);
			}
		grit(x, w, h, 2400, ["90,96,108", "255,255,255"], 0.06);
		x.strokeStyle = "rgba(110,116,128,.4)";
		x.lineWidth = 1.2;
		for (let i = 0; i <= n; i++) {
			x.beginPath();
			x.moveTo(i * c, 0);
			x.lineTo(i * c, h);
			x.moveTo(0, i * c);
			x.lineTo(w, i * c);
			x.stroke();
		}
		for (let i = 0; i < 4; i++)
			wrapBlob(x, w, h, scnR() * w, scnR() * h, 14 + scnR() * 20, "rgba(80,70,60,.06)", "rgba(80,70,60,0)");
	});
/* 8 x 8 m of concrete: big slabs, light joints, a few very faint stains */
const concreteTex = () =>
	scnTex("concrete", 256, (x, w, h) => {
		x.fillStyle = "#A2A7AE";
		x.fillRect(0, 0, w, h);
		for (let i = 0; i < 6; i++)
			wrapBlob(
				x,
				w,
				h,
				scnR() * w,
				scnR() * h,
				40 + scnR() * 50,
				["rgba(120,90,60,.06)", "rgba(60,64,72,.07)", "rgba(220,224,230,.07)"][i % 3],
				"rgba(0,0,0,0)",
			);
		grit(x, w, h, 3600, ["70,74,82", "240,242,246"], 0.07);
		x.strokeStyle = "rgba(70,74,82,.35)";
		x.lineWidth = 1.2;
		for (let i = 0; i <= 2; i++) {
			x.beginPath();
			x.moveTo((i * w) / 2, 0);
			x.lineTo((i * w) / 2, h);
			x.moveTo(0, (i * h) / 2);
			x.lineTo(w, (i * h) / 2);
			x.stroke();
		}
	});
/* 3 x 3 m of cobbles: rounded setts in running bond, gentle tone changes, mortar only a little darker */
const cobbleTex = () =>
	scnTex("cobble", 256, (x, w, h) => {
		x.fillStyle = "#A4968A";
		x.fillRect(0, 0, w, h);
		const rows = 12,
			rh = h / rows,
			sw = rh * 1.25;
		for (let r = 0; r < rows; r++)
			for (let c = -1; c < w / sw + 1; c++) {
				const v = 176 + Math.floor(scnR() * 14),
					px = c * sw + (r % 2 ? sw / 2 : 0) + 1,
					py = r * rh + 1;
				x.fillStyle = `rgb(${v},${v - 12},${v - 24})`;
				rr(x, px, py, sw - 2.4, rh - 2.4, 4);
				x.fill();
				x.fillStyle = "rgba(255,255,255,.07)";
				rr(x, px + 1.5, py + 1.2, sw - 6, (rh - 2.4) * 0.45, 3);
				x.fill();
			}
		grit(x, w, h, 1800, ["90,76,64", "255,250,240"], 0.05);
		for (let i = 0; i < 5; i++)
			wrapBlob(x, w, h, scnR() * w, scnR() * h, 30 + scnR() * 40, "rgba(90,76,64,.05)", "rgba(90,76,64,0)");
	});
/* 5 x 5 m of steel tread plate: faint raised lozenges, a weld seam with beads along the edges, corner bolts, light scuffs */
const treadTex = () =>
	scnTex("tread", 256, (x, w, h) => {
		x.fillStyle = "#737C8A";
		x.fillRect(0, 0, w, h);
		for (let i = 0; i < 6; i++)
			wrapBlob(
				x,
				w,
				h,
				scnR() * w,
				scnR() * h,
				30 + scnR() * 40,
				i % 2 ? "rgba(150,110,80,.06)" : "rgba(200,206,216,.07)",
				"rgba(0,0,0,0)",
			);
		const g = 12;
		for (let r = 0; r * g < h; r++)
			for (let c = 0; c * g < w; c++) {
				const cx = c * g + (r % 2 ? g / 2 : 0) + 3,
					cy = r * g + 3,
					a = (r + c) % 2 ? 0.785 : -0.785;
				x.save();
				x.translate(cx, cy);
				x.rotate(a);
				x.fillStyle = "rgba(30,34,42,.12)";
				x.fillRect(-3.4, 0.4, 7, 2);
				x.fillStyle = "rgba(220,226,236,.14)";
				x.fillRect(-3.6, -1, 7, 2);
				x.restore();
			}
		grit(x, w, h, 1500, ["40,44,52", "230,234,240"], 0.05);
		x.strokeStyle = "rgba(40,44,52,.35)";
		x.lineWidth = 2;
		x.strokeRect(1, 1, w - 2, h - 2);
		x.fillStyle = "rgba(140,148,160,.35)";
		for (let k = 4; k < w; k += 5) {
			x.beginPath();
			x.ellipse(k, 3.2, 2.2, 1.4, 0, 0, 6.283);
			x.ellipse(3.2, k, 1.4, 2.2, 0, 0, 6.283);
			x.fill();
		}
		[
			[10, 10],
			[w - 10, 10],
			[10, h - 10],
			[w - 10, h - 10],
		].forEach(([bx, by]) => {
			x.fillStyle = "rgba(40,44,52,.35)";
			x.beginPath();
			x.arc(bx + 0.8, by + 0.8, 3.2, 0, 6.283);
			x.fill();
			x.fillStyle = "rgba(170,176,188,.6)";
			x.beginPath();
			x.arc(bx, by, 3, 0, 6.283);
			x.fill();
		});
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
/* decal sprites drawn on one canvas sheet: oil stain (bottom-left quadrant; the rest is unused) */
const wearSheet = () =>
	SCN_TEX.wear ||
	(SCN_TEX.wear = canvasTex(256, 256, (x) => {
		{
			// oil stain (0,1): a few soft irregular layers, a darker core, scattered drips and a faint rainbow sheen
			const cx = 64,
				cy = 192,
				blob = (bx, by, r, a) => {
					x.beginPath();
					for (let k = 0; k <= 14; k++) {
						const t = (k / 14) * 6.283,
							rr = r * (0.72 + scnR() * 0.45);
						x[k ? "lineTo" : "moveTo"](bx + Math.cos(t) * rr, by + Math.sin(t) * rr * 0.8);
					}
					x.closePath();
					x.fillStyle = `rgba(30,25,22,${a})`;
					x.fill();
				};
			x.save();
			x.beginPath();
			x.rect(0, 128, 128, 128);
			x.clip();
			x.filter = "blur(2px)";
			for (let i = 0; i < 4; i++) blob(cx + (scnR() - 0.5) * 28, cy + (scnR() - 0.5) * 22, 20 + scnR() * 14, 0.1);
			blob(cx, cy, 15, 0.12);
			blob(cx + 3, cy - 2, 7, 0.12);
			for (let i = 0; i < 8; i++) blob(cx + (scnR() - 0.5) * 92, cy + (scnR() - 0.5) * 72, 1.5 + scnR() * 3.5, 0.16);
			x.filter = "none";
			const q = x.createRadialGradient(cx, cy, 4, cx, cy, 28);
			q.addColorStop(0, "rgba(150,110,190,0)");
			q.addColorStop(0.55, "rgba(90,150,180,.06)");
			q.addColorStop(0.8, "rgba(170,130,200,.05)");
			q.addColorStop(1, "rgba(150,110,190,0)");
			x.fillStyle = q;
			x.fillRect(0, 128, 128, 128);
			x.restore();
		}
	}));
/* four different cracks (one per quadrant): a wandering main line with a couple of branches */
const crackSheet = () =>
	SCN_TEX.crack ||
	(SCN_TEX.crack = canvasTex(256, 256, (x) => {
		x.lineCap = x.lineJoin = "round";
		for (let q = 0; q < 4; q++) {
			const ox = (q % 2) * 128,
				oy = (q >> 1) * 128,
				line = (px, py, a, n, wd, al) => {
					x.strokeStyle = `rgba(22,24,28,${al})`;
					x.lineWidth = wd;
					x.beginPath();
					x.moveTo(ox + px, oy + py);
					const pts = [];
					for (let k = 0; k < n; k++) {
						a += (scnR() - 0.5) * 0.9;
						px = Math.max(4, Math.min(124, px + Math.cos(a) * (6 + scnR() * 8)));
						py = Math.max(4, Math.min(124, py + Math.sin(a) * (6 + scnR() * 8)));
						x.lineTo(ox + px, oy + py);
						pts.push([px, py, a]);
					}
					x.stroke();
					return pts;
				};
			const main = line(
				10 + scnR() * 20,
				30 + scnR() * 68,
				(scnR() - 0.5) * 0.8,
				9 + Math.floor(scnR() * 5),
				1.2 + scnR() * 0.8,
				0.32,
			);
			for (let b = 0; b < 1 + Math.floor(scnR() * 3); b++) {
				const [px, py, a] = main[Math.floor(scnR() * main.length)];
				line(px, py, a + (scnR() < 0.5 ? -1 : 1) * (0.6 + scnR() * 0.8), 2 + Math.floor(scnR() * 4), 0.8, 0.24);
			}
		}
	}));
/* painted road lines lying flush on the road (flat decals with worn paint, not raised boxes); no gap = solid line */
/* drawn tall and thin like the lines themselves (0.15 x 1.5 m per repeat) so the worn spots stay round; premultiplied alpha
   so the worn spots show clean asphalt instead of grey fringes */
const paintTex = () => {
	if (!SCN_TEX.paint) {
		const t = canvasTex(32, 256, (x, w, h) => {
			x.fillStyle = "#FFFFFF";
			x.fillRect(0, 0, w, h);
			x.globalCompositeOperation = "destination-out";
			for (let i = 0; i < 26; i++) {
				const cx = scnR() * w,
					cy = scnR() * h;
				for (let k = 0; k < 2 + Math.floor(scnR() * 4); k++) {
					x.fillStyle = `rgba(0,0,0,${0.55 + scnR() * 0.45})`;
					x.beginPath();
					x.arc(cx + (scnR() - 0.5) * 6, cy + (scnR() - 0.5) * 6, 0.6 + scnR() * 1.4, 0, 6.283);
					x.fill();
				}
			}
			x.globalCompositeOperation = "source-over";
		});
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.premultiplyAlpha = true;
		SCN_TEX.paint = t;
	}
	return SCN_TEX.paint;
};
function roadLines(s, xs, z0, z1, y, o = {}) {
	const w = o.w || 0.14,
		dash = o.dash || 0,
		gap = o.gap || 0,
		zt = Math.max(z0, z1),
		L = Math.abs(z1 - z0),
		mat = (len) =>
			new THREE.MeshStandardMaterial({
				color: o.col || "#F2F4F7",
				map: texRep(paintTex(), 1, len / 1.5),
				transparent: true,
				premultipliedAlpha: true,
				depthWrite: false,
				roughness: 0.75,
				polygonOffset: true,
				polygonOffsetFactor: -2,
				polygonOffsetUnits: -2,
			});
	if (!gap) {
		xs.forEach((x) => {
			const m = new THREE.Mesh(new THREE.PlaneGeometry(w, L), mat(L));
			m.rotation.x = -Math.PI / 2;
			m.position.set(x, y, zt - L / 2);
			m.receiveShadow = true;
			m.renderOrder = 1;
			s.add(m);
		});
		return;
	}
	const per = Math.floor(L / (dash + gap)),
		im = new THREE.InstancedMesh(new THREE.PlaneGeometry(w, dash), mat(dash), per * xs.length),
		O = new THREE.Object3D();
	let i = 0;
	O.rotation.x = -Math.PI / 2;
	xs.forEach((x) => {
		for (let k = 0; k < per; k++) {
			O.position.set(x, y, zt - dash / 2 - k * (dash + gap));
			O.updateMatrix();
			im.setMatrixAt(i++, O.matrix);
		}
	});
	im.receiveShadow = true;
	im.renderOrder = 1;
	s.add(im);
}
/* scatter road wear over a strip: oil stains and cracks (one instanced mesh per kind) */
function roadWear(s, x0, x1, z0, z1, y, density = 1, crackOp = 1) {
	const sheet = wearSheet(),
		L = Math.abs(z1 - z0),
		zs = Math.min(z0, z1),
		kinds = [
			{ u: 0, v: 0, n: L / 30, sz: [1.6, 1.6], edge: false, rnd: true },
			...[0, 1, 2, 3].map((q) => ({ u: q % 2, v: 1 - (q >> 1), n: L / 30, sz: [3, 3], crack: true })),
		];
	kinds.forEach((k, ki) => {
		const n = Math.max(1, Math.round(k.n * density)),
			geo = new THREE.PlaneGeometry(1, 1),
			uv = geo.attributes.uv;
		for (let i = 0; i < uv.count; i++) uv.setXY(i, (k.u + uv.getX(i)) / 2, (k.v + uv.getY(i)) / 2);
		const im = new THREE.InstancedMesh(
				geo,
				new THREE.MeshBasicMaterial({
					map: k.crack ? crackSheet() : sheet,
					transparent: true,
					opacity: k.crack ? crackOp : 1,
					depthWrite: false,
					polygonOffset: true,
					polygonOffsetFactor: k.crack ? -0.5 : -1 - ki * 0.5,
					polygonOffsetUnits: -2,
				}),
				n,
			),
			o = new THREE.Object3D();
		for (let i = 0; i < n; i++) {
			const z = zs + scnR() * L,
				x = x0 + 0.8 + scnR() * (x1 - x0 - 1.6),
				a = k.crack ? scnR() * 6.283 : k.rnd ? scnR() * 0.6 - 0.3 : 0,
				sc = k.crack ? 0.45 + scnR() * 1.1 : k.rnd ? 0.7 + scnR() * 0.6 : 1;
			o.position.set(x, y + (k.crack ? 0 : 0.002 * ki), z);
			o.rotation.set(-Math.PI / 2, 0, a);
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
