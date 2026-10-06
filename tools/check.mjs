/* Automatic model checks. For each model (preset or JS expression) it reports:
   - zfight:   two parts with coplanar, same-facing, overlapping faces (will flicker)
   - overhang: a thin panel (window, stripe, sign, trim) lying flush on a bigger surface but partly hanging past its edge
   - floating: a part above the ground that touches no other part
   - buried:   a part completely inside another part (bounding boxes), so it can never be seen
   and renders the models that have problems with the offending parts in magenta (tools/out/check.png).
   node tools/check.mjs cars houses        node tools/check.mjs 'houseModel(2)' trucks
   Decal-style materials (polygonOffset / depthWrite:false / transparent) are skipped for z-fighting. */
import { args, launch, openGame, renderViews, pngOf, save, expand } from "./lib.mjs";

const { pos, opt } = args();
if (!pos.length) {
	console.log("usage: node tools/check.mjs <preset|JS expression>... [--out file.png]   presets: cars taxi houses trucks");
	process.exit(1);
}
const b = await launch(),
	{ p, errs } = await openGame(b, { width: 400, height: 300 }),
	exprs = expand(pos),
	rows = [],
	hl = {};
let total = 0;
for (const ex of exprs) {
	const res = await p.evaluate((ex) => {
		const root = eval(ex),
			V = THREE.Vector3,
			meshes = [];
		root.updateMatrixWorld(true);
		root.traverse((o) => {
			let v = true;
			for (let q = o; q; q = q.parent) if (q.visible === false) v = false;
			if (o.isMesh && v) meshes.push(o);
		});
		const desc = (mi) => {
			const m = meshes[mi],
				bb = new THREE.Box3().setFromObject(m),
				c = bb.getCenter(new V()),
				z = bb.getSize(new V()),
				f = (v) => v.toFixed(2);
			return `${m.geometry.type.replace("Geometry", "")} ${f(z.x)}x${f(z.y)}x${f(z.z)} #${m.material.color ? m.material.color.getHexString() : "?"} at (${f(c.x)}, ${f(c.y)}, ${f(c.z)})`;
		};
		const issues = [],
			seen = new Set();
		/* z-fighting */
		const tris = [],
			buckets = new Map();
		meshes.forEach((m, mi) => {
			const mt = m.material;
			if (mt.polygonOffset || mt.depthWrite === false || mt.transparent) return;
			const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry,
				pa = g.attributes.position;
			for (let i = 0; i + 2 < pa.count; i += 3) {
				const a = new V().fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld),
					b = new V().fromBufferAttribute(pa, i + 1).applyMatrix4(m.matrixWorld),
					c = new V().fromBufferAttribute(pa, i + 2).applyMatrix4(m.matrixWorld),
					n = new V().subVectors(b, a).cross(new V().subVectors(c, a));
				if (n.length() < 2e-5) continue;
				n.normalize();
				const t = { mi, a, b, c, n, d: n.dot(a) },
					k = [Math.round(n.x * 20), Math.round(n.y * 20), Math.round(n.z * 20), Math.round(t.d * 50)];
				t.k = k;
				tris.push(t);
				const key = k.join(",");
				if (!buckets.has(key)) buckets.set(key, []);
				buckets.get(key).push(t);
			}
		});
		const boxes = meshes.map((m) => new THREE.Box3().setFromObject(m)),
			/* a face is invisible if the point just in front of it is inside another part, or it rests face-down on the ground */
			covered = (c, n, ...skip) => {
				if (n.y < -0.9 && c.y < 0.02) return true;
				const pt = c.clone().addScaledVector(n, 0.015);
				return boxes.some((bx, j) => !skip.includes(j) && bx.clone().expandByScalar(-0.002).containsPoint(pt));
			};
		const overlap2d = (t1, t2) => {
			const u = Math.abs(t1.n.x) < 0.9 ? new V(1, 0, 0) : new V(0, 1, 0);
			u.cross(t1.n).normalize();
			const v = new V().crossVectors(t1.n, u),
				P = (t) => [t.a, t.b, t.c].map((q) => [q.dot(u), q.dot(v)]),
				A = P(t1),
				Bq = P(t2);
			for (const T of [A, Bq])
				for (let i = 0; i < 3; i++) {
					const p0 = T[i],
						p1 = T[(i + 1) % 3],
						ax = [p0[1] - p1[1], p1[0] - p0[0]],
						l = Math.hypot(ax[0], ax[1]);
					if (l < 1e-9) continue;
					const pr = (S) => S.map((q) => (q[0] * ax[0] + q[1] * ax[1]) / l),
						a1 = pr(A),
						a2 = pr(Bq);
					if (Math.min(Math.max(...a1), Math.max(...a2)) - Math.max(Math.min(...a1), Math.min(...a2)) < 0.004) return false;
				}
			return true;
		};
		tris.forEach((t) => {
			for (const dd of [0, 1]) {
				const L = buckets.get([t.k[0], t.k[1], t.k[2], t.k[3] + dd].join(","));
				if (!L) continue;
				for (const q of L) {
					if (q === t || q.mi === t.mi || (dd === 0 && q.mi < t.mi)) continue;
					const pk = "z" + Math.min(q.mi, t.mi) + "," + Math.max(q.mi, t.mi);
					if (seen.has(pk) || Math.abs(q.d - t.d) > 0.004 || q.n.dot(t.n) < 0.995 || !overlap2d(t, q)) continue;
					const cc = new V().add(t.a).add(t.b).add(t.c).divideScalar(3);
					if (covered(cc, t.n, t.mi, q.mi)) continue;
					seen.add(pk);
					const c = new V().add(t.a).add(t.b).add(t.c).divideScalar(3);
					issues.push({ kind: "zfight", parts: [t.mi, q.mi], msg: `${desc(t.mi)}  vs  ${desc(q.mi)}  (near ${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})` });
				}
			}
		});
		/* overhang: thin panels partly unsupported */
		const rc = new THREE.Raycaster();
		meshes.forEach((m, mi) => {
			const g = m.geometry;
			g.computeBoundingBox();
			const bb = g.boundingBox,
				sc = new V().setFromMatrixScale(m.matrixWorld),
				sz = bb.getSize(new V()).multiply(sc),
				dims = [sz.x, sz.y, sz.z],
				ti = dims.indexOf(Math.min(...dims)),
				others = dims.filter((_, i) => i !== ti);
			if (dims[ti] > 0.045 || Math.min(...others) < 0.1) return;
			const axis = new V().setComponent(ti, 1).transformDirection(m.matrixWorld),
				rest = meshes.filter((q) => q !== m);
			const ctr = boxes[mi].getCenter(new V()),
				pIn = others.slice().sort((x, y) => x - y);
			if (boxes.some((bx, j) => j !== mi && bx.clone().expandByScalar(-0.005).containsPoint(ctr))) return;
			const pa = g.attributes.position,
				lo = bb.min.getComponent(ti),
				hi = bb.max.getComponent(ti),
				ax2 = [0, 1, 2].filter((a) => a !== ti),
				mid = bb.getCenter(new V());
			let best = -1,
				tot = 4;
			for (const s of [-1, 1]) {
				const want = s > 0 ? hi : lo,
					pts = [],
					keys = new Set();
				for (let i = 0; i < pa.count; i++) {
					const v = new V().fromBufferAttribute(pa, i);
					if (Math.abs(v.getComponent(ti) - want) > 1e-4) continue;
					const key = ax2.map((a) => v.getComponent(a).toFixed(3)).join(",");
					if (keys.has(key)) continue;
					keys.add(key);
					ax2.forEach((a) => v.setComponent(a, THREE.MathUtils.lerp(v.getComponent(a), mid.getComponent(a), 0.04)));
					pts.push(v.applyMatrix4(m.matrixWorld));
				}
				let hit = 0;
				pts.forEach((cw) => {
					rc.set(cw, axis.clone().multiplyScalar(-s));
					rc.far = dims[ti] + 0.025;
					/* only a flush surface at least as big as the panel counts as its mount (a window on a body, not a flag on a pole) */
					if (
						rc.intersectObjects(rest, false).some((h) => {
							const bs = boxes[meshes.indexOf(h.object)].getSize(new V()).toArray().sort((x, y) => y - x);
							return bs[0] >= pIn[1] * 0.9 && bs[1] >= pIn[0] * 0.9;
						})
					)
						hit++;
				});
				if (hit > best) {
					best = hit;
					tot = pts.length;
				}
			}
			if (best > 0 && best < tot) issues.push({ kind: "overhang", parts: [mi], msg: `${desc(mi)}: ${tot - best} of ${tot} corners hang past the part behind it` });
		});
		/* buried parts: completely inside another part, so they can never be seen */
		/* bounding boxes find candidates, then every corner of the part must really be inside the other part's shape
		   (odd number of surface crossings along a ray), so parts on tilted surfaces are not mistaken for buried ones */
		const inside = (pt, m) => {
			const tmp = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
			tmp.matrixWorld.copy(m.matrixWorld);
			tmp.matrixAutoUpdate = false;
			rc.set(pt, new V(0.31, 0.89, 0.33).normalize());
			rc.far = 1e4;
			return rc.intersectObject(tmp, false).length % 2 === 1;
		};
		boxes.forEach((bx, mi) => {
			const j = boxes.findIndex((o, k) => {
				if (k === mi || bx.equals(o) || !o.clone().expandByScalar(0.002).containsBox(bx)) return false;
				const sh = bx.clone().expandByScalar(-0.001);
				for (const x of [sh.min.x, sh.max.x]) for (const y of [sh.min.y, sh.max.y]) for (const z of [sh.min.z, sh.max.z]) if (!inside(new V(x, y, z), meshes[k])) return false;
				return true;
			});
			if (j >= 0) issues.push({ kind: "buried", parts: [mi], msg: `${desc(mi)} is hidden inside ${desc(j)}` });
		});
		/* floating parts */
		boxes.forEach((bx, mi) => {
			if (bx.min.y < 0.03) return;
			const grown = bx.clone().expandByScalar(0.02);
			if (!boxes.some((o, j) => j !== mi && grown.intersectsBox(o))) issues.push({ kind: "floating", parts: [mi], msg: `${desc(mi)} touches nothing` });
		});
		return { n: meshes.length, issues };
	}, ex);
	total += res.issues.length;
	console.log(`\n${ex}: ${res.n} parts, ${res.issues.length ? res.issues.length + " issue(s)" : "OK"}`);
	res.issues.forEach((q) => console.log(`  ${q.kind.padEnd(8)} ${q.msg}`));
	if (res.issues.length) {
		hl[rows.length] = [...new Set(res.issues.flatMap((q) => q.parts))];
		rows.push(ex);
	}
}
if (rows.length) console.log(`\nproblem parts in magenta -> ${save(opt.out || "check.png", pngOf(await renderViews(p, rows, { highlight: hl })))}`);
if (errs.length) console.log("page errors:", errs);
await b.close();
process.exit(total ? 1 : 0);
