/* Kit neutral-material check: bakes every kit with and without neutralMat and matches every vertex (position, final
   colour = material x vertex colour, finish). node tools/kitcheck.mjs */
import { launch, openGame } from "./lib.mjs";
const b = await launch();
const { p, errs } = await openGame(b);
console.log(
	await p.evaluate(() => {
		const kits = {
			houses: () => houseKits(),
			buildings: () => buildingKits(8, 7),
			cars: () => CAR_TYPES.map((t) => bakeKit(carModel(t, "#E5484D"))),
			crushed: () => CAR_TYPES.map((t) => bakeKit(crushedCarModel(t, "#2F7DE1"))),
			station: () => [bakeKit(fireStationModel())],
			fireProps: () => [0, 1, 2].map((k) => bakeKit(firePropModel(k, "#8E96A3"))),
			containers: () => containerKits(["#E5484D", "#2F7DE1"], 0).concat(containerKits(["#1FA35C"], 1)),
			crates: () => [0, 1, 2, 3].map((v) => bakeKit(crateModel(v))),
			rtg: () => [bakeKit(rtgModel(14))],
			trolley: () => [bakeKit(trolleyModel())],
			ship: () => [bakeKit(shipModel())],
			cabins: () => [bakeKit(siteCabinModel()), bakeKit(siteCabinModel("#FFC83D", "#5A6272", "MIXIE CO."))],
			tower: () => [bakeKit(lightTowerModel())],
			crane: () => [bakeKit(towerCraneModel(30, 26))],
			gate: () => [bakeKit(gatehouseModel("#FF7A1A"))],
		};
		const verts = (list) => {
			const L = [];
			list.forEach((kit) =>
				kit.forEach(({ geo, mat }) => {
					const a = geo.attributes,
						fin = [
							mat.roughness,
							mat.metalness,
							mat.emissive ? mat.emissive.getHexString() : "",
							mat.transparent,
							mat.side,
							!!mat.map,
						].join("/");
					for (let i = 0; i < a.position.count; i++) {
						const vc = mat.vertexColors ? [a.color.getX(i), a.color.getY(i), a.color.getZ(i)] : [1, 1, 1];
						L.push({
							p: [a.position.getX(i), a.position.getY(i), a.position.getZ(i)],
							c: [mat.color.r * vc[0], mat.color.g * vc[1], mat.color.b * vc[2]],
							fin,
						});
					}
				}),
			);
			return L;
		};
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
						for (let dz = -1; dz <= 1 && !hit; dz++)
							for (const i of H.get([c[0] + dx, c[1] + dy, c[2] + dz].join()) || []) {
								const r = B[i];
								if (
									used[i] ||
									r.fin !== q.fin ||
									r.p.some((x, k) => Math.abs(x - q.p[k]) > 1e-4) ||
									r.c.some((x, k) => Math.abs(x - q.c[k]) > 2e-3)
								)
									continue;
								used[i] = hit = 1;
								break;
							}
				if (!hit && bad++ === 0)
					ex = q.p.map((x) => x.toFixed(2)).join() + " " + q.fin + " col " + q.c.map((x) => x.toFixed(3)).join();
			});
			return bad + (ex ? " e.g. " + ex : "");
		};
		/* per-face tints are random: make them all 1 so both builds match */
		const vcReal = varyColors;
		varyColors = (geo) => {
			const g = vcReal(geo);
			g.attributes.color.array.fill(1);
			return g;
		};
		const rnd = Math.random,
			nmReal = neutralMat,
			out = [];
		for (const [name, f] of Object.entries(kits)) {
			f();
			let sd = 7;
			Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
			neutralMat = () => null;
			const a = f(),
				na = a.reduce((s, k) => s + k.length, 0);
			neutralMat = nmReal;
			sd = 7;
			const bb = f(),
				nb = bb.reduce((s, k) => s + k.length, 0);
			Math.random = rnd;
			out.push(`${name.padEnd(10)} materials ${na} -> ${nb}, unmatched ${unmatched(verts(a), verts(bb))}`);
		}
		return out.join("\n");
	}),
	errs.join(" | "),
);
await b.close();
