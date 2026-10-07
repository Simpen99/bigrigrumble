/* Truck merge check: builds every truck (and the "hose" variants) with and without mergeTruck and matches every vertex
   (position, final colour, finish). Run after changing buildTruck or mergeTruck: node tools/mergecheck.mjs */
import { launch, openGame } from "./lib.mjs";
const b = await launch();
const { p, errs } = await openGame(b);
console.log(
	await p.evaluate(() => {
		/* every visible vertex: world position, final colour (material x vertex colour) and finish */
		const verts = (g) => {
			g.updateMatrixWorld(true);
			const L = [],
				v = new THREE.Vector3();
			let meshes = 0;
			g.traverse((o) => {
				if (!o.isMesh || o.visible === false) return;
				meshes++;
				const m = o.material,
					a = o.geometry.attributes,
					idx = o.geometry.index,
					cnt = idx ? idx.count : a.position.count,
					fin = [
						m.roughness,
						m.metalness,
						m.emissive.getHexString(),
						m.transparent,
						m.side,
						m.userData.paint !== undefined,
						o.castShadow,
					].join("/");
				for (let i = 0; i < cnt; i++) {
					const j = idx ? idx.getX(i) : i;
					v.fromBufferAttribute(a.position, j).applyMatrix4(o.matrixWorld);
					const vc = m.vertexColors && a.color ? [a.color.getX(j), a.color.getY(j), a.color.getZ(j)] : [1, 1, 1];
					L.push({ p: v.toArray(), c: [m.color.r * vc[0], m.color.g * vc[1], m.color.b * vc[2]], fin });
				}
			});
			return { L, meshes };
		};
		/* unmatched vertices of A in B (tolerance 0.1 mm, colour 0.002), each B vertex used once */
		const unmatched = (A, B) => {
			const H = new Map(),
				key = (p) => p.map((x) => Math.floor(x * 100)).join();
			B.forEach((q, i) => {
				const k = key(q.p);
				if (!H.has(k)) H.set(k, []);
				H.get(k).push(i);
			});
			const used = new Uint8Array(B.length);
			let bad = 0,
				ex = "";
			A.forEach((q) => {
				const c = q.p.map((x) => Math.floor(x * 100));
				let hit = false;
				for (let dx = -1; dx <= 1 && !hit; dx++)
					for (let dy = -1; dy <= 1 && !hit; dy++)
						for (let dz = -1; dz <= 1 && !hit; dz++) {
							const L = H.get([c[0] + dx, c[1] + dy, c[2] + dz].join());
							if (!L) continue;
							for (const i of L) {
								const r = B[i];
								if (used[i] || r.fin !== q.fin) continue;
								if (r.p.some((x, k) => Math.abs(x - q.p[k]) > 1e-4)) continue;
								if (r.c.some((x, k) => Math.abs(x - q.c[k]) > 2e-3)) continue;
								used[i] = 1;
								hit = true;
								break;
							}
						}
				if (!hit) {
					bad++;
					if (!ex)
						ex = q.p.map((x) => x.toFixed(3)).join() + " " + q.fin + " col " + q.c.map((x) => x.toFixed(3)).join();
				}
			});
			return bad + (ex ? " e.g. " + ex : "");
		};
		const rnd = Math.random,
			real = mergeTruck,
			out = [];
		for (const mode of [undefined, "hose"])
			TRUCKS.forEach((t, i) => {
				/* varyColors tints are random: fix them so both builds get the same */
				buildTruck(i, mode);
				let sd = 7;
				const lcg = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
				Math.random = lcg;
				mergeTruck = () => {};
				const a = verts(buildTruck(i, mode));
				mergeTruck = real;
				sd = 7;
				const bb = verts(buildTruck(i, mode));
				Math.random = rnd;
				out.push(
					`${(mode || "").padEnd(4)} ${t.kind.padEnd(9)} ${a.meshes} -> ${bb.meshes} meshes, vertices ${a.L.length}/${bb.L.length}, unmatched ${unmatched(a.L, bb.L)}`,
				);
			});
		return out.join("\n");
	}),
	errs.join(" | "),
);
await b.close();
