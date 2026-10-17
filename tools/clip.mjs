/* Prop clipping check: finds props that push into each other (a crate through a shelf, a tyre into a rack post).
   The expression returns an Object3D or an array of them; every top-level child of each is one prop (a group or a
   loose mesh), and every prop is checked against every other one. Points on a prop's surface (corners, edge middles,
   face centres) that lie deeper than --tol (default 0.02) inside a part of another prop count as clipping; each part's
   box is its geometry's own bounding box, so round parts (cylinders, tyres) are checked a little generously.
   Also reports props poking below the ground (y < -tol).
   --solid 0,2: roots whose own props are not checked against each other (a building shell: posts let into walls,
   braces into beams), only against the other roots
   node tools/clip.mjs garage            (preset: the main menu garage, every corner before it is baked; shell solid)
   node tools/clip.mjs '<JS expression>' [--tol 0.03] [--solid 0] */
import { launch, openGame, args } from "./lib.mjs";

const PRESETS = {},
	SOLID = { garage: "0" };
Object.assign(PRESETS, {
	/* garageRoom bakes its corners as it goes: catch each group bakeKit is given */
	garage: `(() => {
		const G = [], ob = window.bakeKit;
		window.bakeKit = (g, o) => (G.push(g), ob(g, o));
		try { garageRoom(new THREE.Scene()); } finally { window.bakeKit = ob; }
		return G;
	})()`,
});
const { pos, opt } = args();
if (!pos.length) {
	console.log("usage: node tools/clip.mjs <garage|JS expression> [--tol 0.02]");
	process.exit(1);
}
const b = await launch(),
	{ p, errs } = await openGame(b, { width: 400, height: 300 });
for (const ex of pos) {
	const out = await p.evaluate(
		({ src, tol, solid }) => {
			const V = THREE.Vector3,
				f = (v) => v.toFixed(2);
			let roots = (0, eval)(src);
			if (!Array.isArray(roots)) roots = [roots];
			const props = [];
			roots.forEach((r, ri) => {
				r.updateMatrixWorld(true);
				r.children.forEach((c) => {
					const meshes = [];
					c.traverse((o) => o.isMesh && meshes.push(o));
					if (!meshes.length) return;
					const bb = new THREE.Box3().setFromObject(c),
						ctr = bb.getCenter(new V()),
						sz = bb.getSize(new V()),
						col = meshes[0].material.color ? meshes[0].material.color.getHexString() : "?";
					props.push({
						ri,
						meshes,
						bb,
						name: `[${ri}] ${meshes.length > 1 ? "group" : meshes[0].geometry.type.replace("Geometry", "")} ${f(sz.x)}x${f(sz.y)}x${f(sz.z)} #${col} at (${f(ctr.x)}, ${f(ctr.y)}, ${f(ctr.z)})`,
					});
				});
			});
			/* sample points per prop, and each part's inverse matrix and shrunken local box */
			props.forEach((P) => {
				const pts = [];
				P.meshes.forEach((m) => {
					const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry,
						a = g.attributes.position;
					for (let i = 0; i + 2 < a.count; i += 3) {
						const A = new V().fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld),
							Bv = new V().fromBufferAttribute(a, i + 1).applyMatrix4(m.matrixWorld),
							C = new V().fromBufferAttribute(a, i + 2).applyMatrix4(m.matrixWorld),
							/* a grid over the triangle about every 0.12 (big faces too: a plank through a crate) */
							n = Math.min(
								24,
								Math.max(2, Math.ceil(Math.max(A.distanceTo(Bv), Bv.distanceTo(C), C.distanceTo(A)) / 0.12)),
							);
						for (let u = 0; u <= n; u++)
							for (let v = 0; v <= n - u; v++)
								pts.push(
									new V()
										.addScaledVector(A, (n - u - v) / n)
										.addScaledVector(Bv, u / n)
										.addScaledVector(C, v / n),
								);
					}
				});
				P.pts = pts;
				P.parts = P.meshes.map((m) => {
					m.geometry.computeBoundingBox();
					return { inv: m.matrixWorld.clone().invert(), box: m.geometry.boundingBox, m };
				});
			});
			const res = [];
			for (let i = 0; i < props.length; i++) {
				const A = props[i];
				const under = A.pts.filter((q) => q.y < -tol);
				if (under.length) res.push(`below ground  ${A.name}  (lowest y ${f(Math.min(...under.map((q) => q.y)))})`);
				for (let j = 0; j < props.length; j++) {
					if (i === j || (A.ri === props[j].ri && solid.includes(A.ri))) continue;
					const Bp = props[j];
					if (!A.bb.clone().expandByScalar(0.01).intersectsBox(Bp.bb)) continue;
					let n = 0,
						deep = 0,
						at = null,
						part = null;
					const L = new V();
					for (const q of A.pts) {
						if (!Bp.bb.containsPoint(q)) continue;
						for (const pt of Bp.parts) {
							L.copy(q).applyMatrix4(pt.inv);
							const bx = pt.box,
								d = Math.min(
									L.x - bx.min.x,
									bx.max.x - L.x,
									L.y - bx.min.y,
									bx.max.y - L.y,
									L.z - bx.min.z,
									bx.max.z - L.z,
								);
							/* depth in world units (parts may be scaled) */
							const sc = pt.m.matrixWorld.getMaxScaleOnAxis(),
								dw = d * sc;
							if (dw > tol) {
								n++;
								if (dw > deep) {
									deep = dw;
									at = q.clone();
									part = pt.m;
								}
								break;
							}
						}
					}
					if (n) {
						const bb = new THREE.Box3().setFromObject(part),
							z = bb.getSize(new V());
						res.push(
							`clip  ${A.name}\n        into ${Bp.name}\n        ${n} points, up to ${f(deep)} deep at (${f(at.x)}, ${f(at.y)}, ${f(at.z)}), in its part ${part.geometry.type.replace("Geometry", "")} ${f(z.x)}x${f(z.y)}x${f(z.z)}`,
						);
					}
				}
			}
			return { n: props.length, res };
		},
		{
			src: PRESETS[ex] || ex,
			tol: +(opt.tol || 0.02),
			solid: String(opt.solid ?? SOLID[ex] ?? "")
				.split(",")
				.filter((x) => x !== "")
				.map(Number),
		},
	);
	console.log(`\n${ex}: ${out.n} props, ${out.res.length ? out.res.length + " issue(s)" : "OK"}`);
	out.res.forEach((r) => console.log("  " + r));
}
if (errs.length) console.log("page errors:\n  " + errs.join("\n  "));
await b.close();
