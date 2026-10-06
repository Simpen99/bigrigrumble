/* ---------- maps (graph of spaces) ---------- */
function mkGraph(nodes) {
	nodes.forEach((n, i) => {
		n.id = i;
		n.prev = [];
	});
	nodes.forEach((n, i) => n.next.forEach((j) => nodes[j].prev.push(i)));
	const L = nodes.length,
		D = [],
		F = [];
	for (let s = 0; s < L; s++) {
		const d = new Array(L).fill(99),
			f = new Array(L).fill(99);
		d[s] = 0;
		f[s] = 0;
		let q = [s];
		while (q.length) {
			const u = q.shift();
			for (const v of nodes[u].next.concat(nodes[u].prev))
				if (d[v] > d[u] + 1) {
					d[v] = d[u] + 1;
					q.push(v);
				}
		}
		q = [s];
		while (q.length) {
			const u = q.shift();
			for (const v of nodes[u].next)
				if (f[v] > f[u] + 1) {
					f[v] = f[u] + 1;
					q.push(v);
				}
		}
		D.push(d);
		F.push(f);
	}
	return { nodes, D, F };
}
const CLASSIC = Object.assign(
	mkGraph(TILE.map(([x, z], i) => ({ x, z, t: i === 10 ? "SH" : i === 20 ? "D" : TYPES[i], next: [(i + 1) % N] }))),
	{ id: "classic", name: "Classic Loop", blurb: "One big loop. Good for learning.", ground: "#7CC66A" },
);
const JUNK = (() => {
	const nodes = [],
		add = (x, z, t) => {
			nodes.push({ x, z, t, next: [] });
			return nodes.length - 1;
		};
	const line = (a, b, types) =>
		types.map((t, k) => {
			const f = (k + 1) / (types.length + 1);
			return add(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, t);
		});
	const chain = (ids) => {
		for (let k = 0; k < ids.length - 1; k++) nodes[ids[k]].next.push(ids[k + 1]);
	};
	const S = add(-11, 13, "S"),
		L1 = line([-11, 13], [-11, 0], ["B", "R", "B"]),
		JL = add(-11, 0, "B");
	const T1 = line([-11, 0], [-11, -13], ["SH", "B", "E"]),
		C1 = add(-11, -13, "B"),
		T2 = line([-11, -13], [11, -13], ["R", "B", "CV", "B", "SC", "B"]),
		C2 = add(11, -13, "B"),
		T3 = line([11, -13], [11, 0], ["R", "E", "B"]);
	const JR = add(11, 0, "B"),
		M = line([-11, 0], [11, 0], ["CV", "SC", "CR", "CV", "D"]);
	const R1 = line([11, 0], [11, 13], ["R", "SH", "E"]),
		JB = add(11, 13, "B"),
		BT = line([11, 13], [-11, 13], ["B", "R", "SC", "B", "D"]);
	const H1 = line([11, 13], [0, 4.5], ["SC", "E"]),
		HM = add(0, 4.5, "CR"),
		H2 = line([0, 4.5], [-11, 13], ["SC", "R"]);
	chain([S, ...L1, JL]);
	chain([JL, ...T1, C1, ...T2, C2, ...T3, JR]);
	chain([JL, ...M, JR]);
	chain([JR, ...R1, JB]);
	chain([JB, ...BT, S]);
	chain([JB, ...H1, HM, ...H2, S]);
	nodes[JL].labels = { [T1[0]]: "Long way round (shop)", [M[0]]: "Conveyor shortcut" };
	nodes[JB].labels = { [BT[0]]: "Main road", [H1[0]]: "Through the Heap (scrap piles)" };
	nodes[M[0]].conv = { dir: -1, n: 2 };
	nodes[M[3]].conv = { dir: -1, n: 2 };
	nodes[T2[2]].conv = { dir: 1, n: 3 };
	return Object.assign(mkGraph(nodes), {
		id: "junk",
		name: "Junkyard Jumble",
		blurb: "Forks, conveyor belts, crushers and Magnet Mike.",
		ground: "#A39276",
		rival: true,
		rivalHome: HM,
	});
})();
/* Volcano Quarry: the board is the crater of a volcano. The rim road runs round the crater lip (y 8, always safe); inside, separate rock ledges stand in the lava lake and wind smoothly down:
   upper ledges (y 7 → 5, `sl`, safe), lower ledges (y 4 → 3, `lv:2`, flood at high lava), crater floor (y ~1, `lv:1`, floods while lava rises). Rock conveyor bridge `br` spans the crater */
const VOLCANO = (() => {
	const nodes = [],
		D2R = Math.PI / 180,
		add = (r, deg, y, t, o) => {
			nodes.push(Object.assign({ x: r * Math.cos(deg * D2R), z: r * Math.sin(deg * D2R), y, t, next: [] }, o || {}));
			return nodes.length - 1;
		};
	const chain = (ids) => {
		for (let k = 0; k < ids.length - 1; k++) nodes[ids[k]].next.push(ids[k + 1]);
	};
	/* a winding ledge: radius and height change smoothly from the first space to the last */
	const arc = (r0, r1, y0, y1, degs, types, o) =>
		degs.map((d, k) => {
			const f = degs.length > 1 ? k / (degs.length - 1) : 0;
			return add(r0 + (r1 - r0) * f, d, y0 + (y1 - y0) * f, types[k], o);
		});
	const JIT = [
		0, 1.5, -1, 2, 0, -2, 1, 0, -1.5, 2, 0, -1, 1.5, 0, -2, 0, 1, -1, 0, 1.5, 0, -1.5, 1, 0, 0, 2, -1, 1, 0, -1, 0, 1.5,
		-1, 0, 1, -1,
	];
	const RIM = [
		"S",
		"B",
		"E",
		"B",
		"B",
		"R",
		"B",
		"SH",
		"MR",
		"E",
		"B",
		"R",
		"B",
		"B",
		"D",
		"B",
		"E",
		"R",
		"B",
		"B",
		"E",
		"SH",
		"MR",
		"R",
		"B",
		"B",
		"B",
		"E",
		"R",
		"B",
		"B",
		"D",
		"B",
		"R",
		"E",
		"B",
	];
	const rim = RIM.map((t, k) =>
		add(29 + (k % 3 === 1 ? 0.25 : k % 3 === 2 ? -0.2 : 0), 90 + 10 * k + JIT[k], 8, t, { rim: 1 }),
	);
	const U1 = arc(23.5, 22.5, 7, 5.2, [143, 158, 173, 188, 203], ["B", "E", "B", "SC", "B"], { sl: 1 });
	const L1 = arc(16, 16, 4.1, 2.9, [218, 236, 254, 271], ["B", "GY", "B", "R"], { lv: 2 });
	const C = Array.from({ length: 10 }, (_, i) =>
		add(
			9.5,
			286 + i * 28.9,
			1 + (0.35 * Math.abs(i - 4.5)) / 4.5,
			["GY", "OB", "SD", "SD", "SD", "MC", "SD", "OB", "SD", "GY"][i],
			{ lv: 1 },
		),
	);
	const L2 = arc(16, 16, 2.9, 3.8, [166, 146, 126, 106], ["SC", "B", "E", "B"], { lv: 2 });
	/* refineries: a gate over a normal space (like the factory, it has no tile of its own) */
	[rim[25], U1[2], L2[3]].forEach((i) => {
		nodes[i].ref = 1;
	});
	const U2 = arc(22.5, 23.2, 5, 7.2, [94, 76, 58, 40], ["B", "B", "SC", "E"], { sl: 1 });
	const U3 = arc(23, 22.5, 7, 5.2, [282, 296, 310, 324], ["B", "R", "E", "MR"], { sl: 1 });
	const L3 = arc(16, 16, 4, 3.2, [337, 352], ["B", "SC"], { lv: 2 });
	const a = nodes[U1[3]],
		b = nodes[U2[2]],
		BT = ["CV", "B", "CV", "R", "B", "CV", "B", "E"];
	const BR = BT.map((t, k) => {
		const f = (k + 1) / (BT.length + 1);
		nodes.push({
			x: a.x + (b.x - a.x) * f,
			z: a.z + (b.z - a.z) * f,
			y: a.y + (b.y - a.y) * f + 0.7 * Math.sin(f * Math.PI),
			t,
			next: [],
			br: 1,
		});
		return nodes.length - 1;
	});
	chain([...rim, rim[0]]);
	chain([rim[4], ...U1]);
	chain([U1[3], ...BR, U2[2]]);
	chain([U1[4], rim[12]]);
	chain([U1[4], ...L1, ...C, ...L2, ...U2, rim[30]]);
	chain([rim[18], ...U3, ...L3, C[3]]);
	nodes[rim[4]].labels = { [rim[5]]: "Rim road (safe)", [U1[0]]: "Down into the crater" };
	nodes[rim[18]].labels = { [rim[19]]: "Rim road (safe)", [U3[0]]: "Mine track to the crater floor" };
	nodes[U1[3]].labels = { [U1[4]]: "Keep to the ledge", [BR[0]]: "Rock conveyor bridge" };
	nodes[U1[4]].labels = { [rim[12]]: "Back up to the rim", [L1[0]]: "Deeper: the crater floor (shards)" };
	nodes[L1[1]].gy = rim[15];
	nodes[C[0]].gy = U2[0];
	nodes[C[9]].gy = rim[20];
	BT.forEach((t, k) => {
		if (t === "CV") nodes[BR[k]].conv = { dir: 1, n: 2 };
	});
	return Object.assign(mkGraph(nodes), {
		id: "volcano",
		name: "Volcano Quarry",
		blurb: "Mine obsidian shards in the crater, grind them into dust at a refinery, but watch the lava.",
		ground: "#3E322D",
		dice: 1.5,
		lava: true,
		shards: true,
		rules: [
			"Shard spaces give +1 obsidian shard, obsidian +2. The pillar minecart smashes the giant crystal for +15 (it regrows each round). Rail carts take you on a random ride.",
			"Rising lava and eruptions scatter loose shards: drive over them to grab them.",
			"Drive through a refinery to grind your shards into obsidian dust (1 shard = 1 dust). No limit on how much you carry.",
			"Battery factory: melts 5 dust + 10 coins into a battery, or sells one for 50 coins.",
			"Landing on lava, or getting pushed uphill by rising lava, costs a shard.",
		],
		size: 2,
		camY: 3,
		follow: 1.2,
	});
})();
/* layout and shape tuned in the map editor (2026-10-04) */
VOLCANO.bake = {
	p: {
		glow: 2.05,
		lava2: 4.55,
		lava1: 2.6,
		haze: 1,
		pebbles: 3,
		pillarR: 1.04,
		pillarSides: 14,
		edgeRound: 0.3,
		ledgeW: 1.95,
		rimW: 1.95,
		roadW: 2.75,
		tileSides: 10,
		tileR: 1.02,
	},
	n: {
		12: { x: -24.727, y: 7.941, z: -15.152, r: 0, s: 1 },
		32: { x: 18.227, y: 8, z: 22.529, r: 0, s: 1 },
		36: { x: -18.106, y: 7.519, z: 14.752, r: 0, s: 1 },
		37: { x: -21.336, y: 6.55, z: 9.199, r: 0, s: 1 },
		39: { x: -22.529, y: 5.65, z: -3.166, r: -1.983, s: 1 },
		40: { x: -20.711, y: 5.509, z: -8.791, r: 0, s: 1 },
		41: { x: -13.489, y: 4.1, z: -10.439, r: 0, s: 1 },
		42: { x: -9.532, y: 3.7, z: -14.32, r: 0, s: 1 },
		44: { x: 0.569, y: 2.9, z: -14.988, r: 0, s: 1 },
		45: { x: 4.975, y: 2.157, z: -11.423, r: 0, s: 1 },
		46: { x: 5.43, y: 1.875, z: -6.457, r: 0, s: 1 },
		47: { x: 7.671, y: 2.092, z: -2.962, r: 0, s: 1 },
		48: { x: 8.339, y: 2.115, z: 0.604, r: 0, s: 1 },
		49: { x: 6.976, y: 1.853, z: 4.374, r: 0, s: 1 },
		50: { x: 3.791, y: 1.795, z: 6.791, r: 0, s: 1 },
		51: { x: 0.191, y: 1.774, z: 6.497, r: 0, s: 1 },
		52: { x: -3.754, y: 1.885, z: 4.897, r: 0, s: 1 },
		53: { x: -6.465, y: 1.973, z: 1.713, r: 0, s: 1 },
		54: { x: -8.21, y: 2.119, z: -2.27, r: 0, s: 1 },
		55: { x: -13.638, y: 2.9, z: -2.708, r: 0, s: 1 },
		56: { x: -17.826, y: 3.2, z: 3.318, r: 0, s: 1 },
		57: { x: -13.714, y: 3.5, z: 9.836, r: 0, s: 1 },
		58: { x: -7.344, y: 3.8, z: 14.593, r: 0, s: 1 },
		59: { x: -3.121, y: 5, z: 20.874, r: 0, s: 1 },
		60: { x: 4.201, y: 5.733, z: 21.844, r: 0, s: 1 },
		61: { x: 12.17, y: 6.467, z: 19.477, r: -1.046, s: 1 },
		66: { x: 17.273, y: 5.2, z: -12.191, r: 0, s: 1 },
		67: { x: 17.105, y: 4, z: -6.791, r: 0, s: 1 },
		68: { x: 13.946, y: 3.2, z: -2.182, r: 0, s: 1 },
		70: { x: -14.096, y: 6.281, z: 2.482, r: 0, s: 1 },
		71: { x: -9.968, y: 6.528, z: 5.207, r: 0, s: 1 },
		72: { x: -6.429, y: 6.691, z: 7.569, r: 0, s: 1 },
		73: { x: -2.449, y: 6.669, z: 10.015, r: 0, s: 1 },
		74: { x: 0.923, y: 6.801, z: 12.228, r: 0, s: 1 },
	},
	o: { island: { p: [0.87, 0, -0.906], r: [0, 0, 0], s: [1.257, 1.257, 1.257] } },
};
const MAPS = { junk: JUNK, classic: CLASSIC, volcano: VOLCANO };
/* lava cycle (7 rounds): low 3, rising 2 (crater floods), high 1 (lower ledges too), eruption round (still high), then it drains */
const LAVA_CYCLE = 7,
	LAVA_Y = [0.2, 2.05, 4.45];
const lavaPh = (r) => (Math.max(1, r) - 1) % LAVA_CYCLE;
function lavaLv(r) {
	const ph = lavaPh(r);
	return ph < 3 ? 0 : ph < 5 ? 1 : 2;
}
function flooded(i, r) {
	const n = MAP.nodes[i];
	return !!(MAP.lava && n && n.lv && n.lv <= lavaLv(r));
}
function lavaChip(r) {
	return ["🟢", "🟡", "🔴"][lavaLv(r)] + (lavaPh(r) === 6 ? "🌋" : "");
}
function lavaText(r) {
	const ph = lavaPh(r),
		lv = lavaLv(r),
		name = ["Lava low", "Lava rising", "Lava high"][lv];
	if (ph === 6) return `${name}: the volcano erupts at the end of this round!`;
	if (ph === 5) return `${name}: crater and lower ledges are flooded. Eruption next round.`;
	const left = (lv === 0 ? 3 : 5) - ph;
	return lv === 0
		? `${name}: the crater is open. Lava rises in ${left} round${left > 1 ? "s" : ""}.`
		: `${name}: the crater floor is flooded. Lower ledges flood in ${left} round${left > 1 ? "s" : ""}.`;
}
let MAP = JUNK;
function syncMap() {
	const m = G && MAPS[G.map || "classic"];
	if (m && m !== MAP) MAP = m;
}
/* map editor hooks: edits = { p: shape params, n: { space: {x, y, z, r (extra yaw), s (scale)} }, o: { prop id: {p, r, s} } }; baked ones live in map.bake, the editor's own in localStorage (trp_mapedit) */
const ED_PARAMS = [
	["tileSides", "Tile sides", 3, 12, 1, 6],
	["tileR", "Tile size", 0.6, 1.6, 0.02, 1],
	["roadW", "Road width", 1.2, 3.4, 0.05, 2],
	["ledgeW", "Ledge half-width", 1, 3.5, 0.05, 1.75, 1],
	["rimW", "Rim half-width", 1, 3.5, 0.05, 2.1, 1],
	["edgeRound", "Rounded ledge edges", 0, 1.2, 0.05, 0, 1],
	["pillarSides", "Pillar sides", 3, 16, 1, 8, 1],
	["pillarR", "Pillar size", 0.6, 1.6, 0.02, 1, 1],
	["pebbles", "Pebbles", 0, 3, 0.1, 1, 1],
	["lava0", "Lava low", -1, 3, 0.05, 0.2, 1],
	["lava1", "Lava rising", 0, 5, 0.05, 2.05, 1],
	["lava2", "Lava high", 1, 7, 0.05, 4.45, 1],
	["haze", "Haze", 0, 2, 0.05, 1, 1],
	["glow", "Lava glow", 0, 3, 0.05, 1, 1],
];
const ED_DEF = {};
ED_PARAMS.forEach((q) => {
	ED_DEF[q[0]] = q[5];
});
let EDC = { p: {}, n: {}, o: {}, reg: {} };
const ep = (k) => {
	const v = EDC.p[k];
	return typeof v === "number" ? v : ED_DEF[k];
};
function mapEdits(map) {
	const ls = (LS.get("trp_mapedit", {}) || {})[map.id] || {},
		b = map.bake || {};
	return { p: Object.assign({}, b.p, ls.p), n: Object.assign({}, b.n, ls.n), o: Object.assign({}, b.o, ls.o) };
}
function applyMapEdits(map) {
	EDC = Object.assign(mapEdits(map), { reg: {} });
	map._fs = null;
	map.nodes.forEach((n, i) => {
		if (!n._o) n._o = { x: n.x, y: n.y, z: n.z };
		const e = EDC.n[i] || {};
		["x", "y", "z"].forEach((k) => {
			n[k] = typeof e[k] === "number" ? e[k] : n._o[k];
		});
	});
	if (map.lava)
		[0, 1, 2].forEach((i) => {
			LAVA_Y[i] = ep("lava" + i);
		});
}
function edReg(o, id) {
	o.userData.edId = id;
	EDC.reg[id] = o;
	const e = EDC.o[id];
	if (e) {
		if (e.p) o.position.fromArray(e.p);
		if (e.r) o.rotation.set(e.r[0], e.r[1], e.r[2]);
		if (e.s) o.scale.fromArray(e.s);
	}
	return o;
}
const SPACE_COL = {
	B: "#2F7DE1",
	R: "#E5484D",
	E: "#8E5BE0",
	S: "#BFC5CE",
	SC: "#B0703C",
	CR: "#4B515E",
	CV: "#2A2F3A",
	D: "#FF8A1F",
	SH: "#1FB5A8",
	OB: "#3B2466",
	GY: "#4A525C",
	SD: "#4A3F5C",
	MC: "#7A5234",
	MR: "#2E7D6B",
};
const SPACE_INFO = {
	B: "+3 coins",
	R: "−3 coins",
	E: "Surprise",
	SC: "Scrap pile: 0–15 coins",
	CR: "Crusher: −5 coins, free item",
	CV: "Conveyor belt",
	D: "Duel",
	SH: "Shop",
	OB: "Obsidian: +2 shards",
	GY: "Geyser: blasts you to a new spot every round",
	SD: "Shard space: +1 obsidian shard",
	MC: "Minecart: smash through the giant crystal for 15 shards (regrows each round)",
	MR: "Rail cart: a random ride round the quarry, grabbing loose shards",
};
function tileIcon(type) {
	return canvasTex(128, 128, (x, w, h) => {
		x.textAlign = "center";
		x.textBaseline = "middle";
		if (type === "S") {
			for (let i = 0; i < 6; i++)
				for (let j = 0; j < 6; j++) {
					x.fillStyle = (i + j) % 2 ? "#151B24" : "#FFFFFF";
					x.fillRect(16 + i * 16, 16 + j * 16, 16, 16);
				}
			return;
		}
		if (type === "CR") {
			/* hazard-stripe ring around the pressed-in −5 */ x.save();
			x.beginPath();
			x.arc(64, 64, 50, 0, Math.PI * 2);
			x.arc(64, 64, 34, 0, Math.PI * 2, true);
			x.clip("evenodd");
			for (let i = -8; i < 12; i++) {
				x.fillStyle = i % 2 ? "#151B24" : "#FFC83D";
				x.beginPath();
				x.moveTo(i * 16, 0);
				x.lineTo(i * 16 + 16, 0);
				x.lineTo(i * 16 + 144, 128);
				x.lineTo(i * 16 + 128, 128);
				x.fill();
			}
			x.restore();
			return;
		}
		if (type === "GY") {
			/* geyser: rock vent with a steam column and a cloud on top */
			x.fillStyle = "#1E2530";
			x.beginPath();
			x.moveTo(30, 108);
			x.lineTo(46, 88);
			x.lineTo(82, 88);
			x.lineTo(98, 108);
			x.closePath();
			x.fill();
			x.fillStyle = "#fff";
			x.beginPath();
			x.moveTo(54, 90);
			x.quadraticCurveTo(58, 62, 52, 44);
			x.lineTo(76, 44);
			x.quadraticCurveTo(70, 62, 74, 90);
			x.closePath();
			x.fill();
			[
				[64, 34, 17],
				[45, 40, 12],
				[83, 40, 12],
				[54, 24, 11],
				[75, 24, 11],
			].forEach(([a, b, r]) => {
				x.beginPath();
				x.arc(a, b, r, 0, 7);
				x.fill();
			});
			[
				[36, 62, 4],
				[92, 58, 4],
				[30, 78, 3],
				[98, 74, 3],
			].forEach(([a, b, r]) => {
				x.beginPath();
				x.arc(a, b, r, 0, 7);
				x.fill();
			});
			return;
		}
		if (type === "OB") {
			x.fillStyle = "#B78CFF";
			x.beginPath();
			[
				[64, 10],
				[96, 46],
				[64, 118],
				[32, 46],
			].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
			x.fill();
			x.fillStyle = "#fff";
			x.font = "900 40px Rubik, Arial";
			x.fillText("+2", 64, 62);
			return;
		}
		if (type === "SCO") {
			x.fillStyle = "#FF8A3D";
			x.font = "900 54px Rubik, Arial";
			x.fillText("−5", 64, 68);
			return;
		}
		x.fillStyle = "#fff";
		const T = { E: ["?", 92], SC: ["$?", 58], D: ["VS", 58], SH: ["$", 88] }[type];
		if (!T) return;
		x.font = `900 ${T[1]}px Rubik, Arial`;
		x.fillText(T[0], 64, 70);
	});
}
/* ---------- raised tile symbols (like the + / − bars): strokes and shapes extruded up from the tile top (y .48), glyph "up" = away from the camera (−z) ----------
   layers that cross get different heights (≥ .02 apart) so their tops never z-fight */
const arcPts = (cx, cy, r, a0, a1, n = 12) =>
	Array.from({ length: n + 1 }, (_, k) => {
		const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180;
		return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
	});
/* one outline shape for a stroke along a polyline: mitred joints, flat ends */
function strokeShape(pts, w) {
	const L = [],
		R = [],
		n = pts.length,
		h = w / 2,
		nrm = (a, b) => {
			const dx = b[0] - a[0],
				dy = b[1] - a[1],
				l = Math.hypot(dx, dy) || 1;
			return [-dy / l, dx / l];
		};
	for (let k = 0; k < n; k++) {
		const n0 = k > 0 ? nrm(pts[k - 1], pts[k]) : null,
			n1 = k < n - 1 ? nrm(pts[k], pts[k + 1]) : null;
		let nx,
			ny,
			m = 1;
		if (n0 && n1) {
			nx = n0[0] + n1[0];
			ny = n0[1] + n1[1];
			const l = Math.hypot(nx, ny) || 1;
			nx /= l;
			ny /= l;
			m = 1 / Math.max(0.35, nx * n1[0] + ny * n1[1]);
		} else [nx, ny] = n0 || n1;
		L.push([pts[k][0] + nx * h * m, pts[k][1] + ny * h * m]);
		R.push([pts[k][0] - nx * h * m, pts[k][1] - ny * h * m]);
	}
	return polyShape(L.concat(R.reverse()));
}
function polyShape(pts) {
	const sh = new THREE.Shape();
	pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
	sh.closePath();
	return sh;
}
function discShape(x, y, r) {
	const sh = new THREE.Shape();
	sh.absarc(x, y, r, 0, Math.PI * 2, false);
	return sh;
}
const rotPts = (pts, deg, ox, oy) => {
	const a = (deg * Math.PI) / 180,
		c = Math.cos(a),
		s_ = Math.sin(a);
	return pts.map(([x, y]) => [ox + x * c - y * s_, oy + x * s_ + y * c]);
};
const SYM_W = "#FFFFFF";
/* tile faces are pressed in: the top plate (y .42–.50) has the symbol cut through it, showing a darker floor (y .44) below. Holes must not touch each other
   (no polygon union), so every symbol is drawn as separate pieces or one outline. symHoles(t) → { holes: [Shape], raised: [[shapes, h, colour]] (sits on the floor) } */
function symHoles(t) {
	const st = (pts, w) => strokeShape(pts, w);
	if (t === "B")
		return {
			holes: [
				polyShape([
					[-0.13, 0.48],
					[0.13, 0.48],
					[0.13, 0.13],
					[0.48, 0.13],
					[0.48, -0.13],
					[0.13, -0.13],
					[0.13, -0.48],
					[-0.13, -0.48],
					[-0.13, -0.13],
					[-0.48, -0.13],
					[-0.48, 0.13],
					[-0.13, 0.13],
				]),
			],
		};
	if (t === "R")
		return {
			holes: [
				polyShape([
					[-0.48, 0.13],
					[0.48, 0.13],
					[0.48, -0.13],
					[-0.48, -0.13],
				]),
			],
		};
	if (t === "E")
		return {
			holes: [
				st(
					arcPts(0, 0.2, 0.22, 160, -35, 16).concat([
						[0.1, 0.03],
						[0.03, -0.03],
						[0, -0.08],
						[0, -0.17],
					]),
					0.2,
				),
				discShape(0, -0.39, 0.12),
			],
		};
	if (t === "SH") {
		const S = arcPts(0, 0.15, 0.19, 25, 270).concat(arcPts(0, -0.23, 0.19, 90, -155).slice(1));
		return {
			holes: [
				st(S, 0.16),
				st(
					[
						[0, 0.45],
						[0, 0.6],
					],
					0.11,
				),
				st(
					[
						[0, -0.53],
						[0, -0.66],
					],
					0.11,
				),
			],
		};
	}
	if (t === "D") {
		const S = arcPts(0.27, 0.12, 0.12, 30, 270, 10).concat(arcPts(0.27, -0.12, 0.12, 90, -150, 10).slice(1));
		return {
			holes: [
				st(
					[
						[-0.47, 0.25],
						[-0.29, -0.25],
						[-0.11, 0.25],
					],
					0.14,
				),
				st(S, 0.12),
			],
		};
	}
	if (t === "SC") {
		const sh = [
			[-0.15, 0.52],
			[0.15, 0.52],
			[0.15, 0.41],
			[0.05, 0.41],
			[0.05, -0.04],
			[0.19, -0.04],
			[0.19, -0.3],
			[0, -0.52],
			[-0.19, -0.3],
			[-0.19, -0.04],
			[-0.05, -0.04],
			[-0.05, 0.41],
			[-0.15, 0.41],
		];
		return {
			holes: [
				polyShape(
					rotPts(
						sh.map(([x, y]) => [x * 1.15, y * 1.15]),
						45,
						0,
						0,
					),
				),
			],
		};
	}
	if (t === "CR") {
		const five = [
			[0.36, 0.26],
			[0.08, 0.26],
			[0.06, 0.04],
		].concat(arcPts(0.18, -0.1, 0.16, 130, -150, 12).slice(1));
		return {
			holes: [
				st(
					[
						[-0.44, 0],
						[-0.18, 0],
					],
					0.13,
				),
				st(five, 0.13),
			],
		};
	}
	if (t === "OB") {
		const xtal = [
				[0, 0.5],
				[0.19, 0.28],
				[0.19, -0.28],
				[0, -0.5],
				[-0.19, -0.28],
				[-0.19, 0.28],
			],
			put = (k, deg, x, y) =>
				polyShape(
					rotPts(
						xtal.map(([a, b]) => [a * k, b * k]),
						deg,
						x,
						y,
					),
				);
		return { holes: [put(1.08, -14, -0.17, 0.03), put(0.68, 22, 0.34, -0.12)] };
	}
	if (t === "S") {
		const top = Array.from({ length: 9 }, (_, q) => {
				const x = -0.275 + (q / 8) * 0.7;
				return [x, 0.5 + Math.sin((q / 8) * Math.PI * 2) * 0.05];
			}),
			bot = top.map(([x, y]) => [x, y - 0.42]).reverse();
		return {
			holes: [
				polyShape(
					[
						[-0.37, -0.52],
						[-0.37, 0.52],
					].concat(top, [[0.425, 0.08 + Math.sin(Math.PI * 2) * 0.05]], bot.slice(1), [[-0.275, -0.52]]),
				),
			],
		};
	}
	if (t === "GY") return { holes: [discShape(0, 0, 0.74)] };
	if (t === "SD")
		return {
			holes: [
				polyShape(
					rotPts(
						[
							[0, 0.5],
							[0.19, 0.28],
							[0.19, -0.28],
							[0, -0.5],
							[-0.19, -0.28],
							[-0.19, 0.28],
						].map(([a, b]) => [a * 1.15, b * 1.15]),
						-12,
						0,
						0,
					),
				),
			],
		};
	if (t === "MC")
		return {
			holes: [
				polyShape([
					[-0.46, 0.12],
					[0.46, 0.12],
					[0.34, -0.28],
					[-0.34, -0.28],
				]),
				discShape(-0.22, -0.44, 0.1),
				discShape(0.22, -0.44, 0.1),
				polyShape([
					[0, 0.67],
					[0.11, 0.55],
					[0.11, 0.29],
					[0, 0.17],
					[-0.11, 0.29],
					[-0.11, 0.55],
				]),
			],
		};
	if (t === "MR")
		return {
			holes: [
				polyShape([
					[-0.34, 0.22],
					[0.56, 0.22],
					[0.44, -0.18],
					[-0.22, -0.18],
				]),
				discShape(-0.1, -0.34, 0.1),
				discShape(0.32, -0.34, 0.1),
				st(
					[
						[-0.68, 0.1],
						[-0.46, 0.1],
					],
					0.07,
				),
				st(
					[
						[-0.74, -0.03],
						[-0.44, -0.03],
					],
					0.07,
				),
				st(
					[
						[-0.66, -0.16],
						[-0.42, -0.16],
					],
					0.07,
				),
			],
		};
	return null;
}
const SYM_FLOOR = { OB: "#B78CFF", SD: "#B78CFF", S: "#E5484D", GY: "#10151C" },
	FACE_GEO = {};
function tileFace(t, sides) {
	const col = SPACE_COL[t],
		key = t + sides;
	const c =
		FACE_GEO[key] ||
		(FACE_GEO[key] = (() => {
			const sym = symHoles(t) || { holes: [] },
				R = 1.08;
			const out = polyShape(
				Array.from({ length: sides }, (_, q) => {
					const a = (q / sides) * Math.PI * 2 + Math.PI / sides;
					return [Math.sin(a) * R, -Math.cos(a) * R];
				}),
			);
			out.holes = sym.holes.map((h) => {
				const p = new THREE.Path();
				h.getPoints(16).forEach((v, i) => (i ? p.lineTo(v.x, v.y) : p.moveTo(v.x, v.y)));
				return p;
			});
			const g = new THREE.ExtrudeGeometry(out, { depth: 0.08, bevelEnabled: false, curveSegments: 16 });
			g.rotateX(-Math.PI / 2);
			return {
				plate: varyColors(g),
				holes: sym.holes.length,
				raised: (sym.raised || []).map(([shs, h, cl]) => {
					const rg = new THREE.ExtrudeGeometry(shs, { depth: h, bevelEnabled: false, curveSegments: 14 });
					rg.rotateX(-Math.PI / 2);
					return [varyColors(rg), cl];
				}),
			};
		})());
	const g = new THREE.Group(),
		pm = new THREE.Mesh(c.plate, M(col, { vertexColors: true }));
	pm.position.y = 0.42;
	pm.castShadow = pm.receiveShadow = true;
	g.add(pm);
	const lo = Cy(1.08, 1.14, 0.14, sides, col, 0, 0.35, 0);
	lo.rotation.y = Math.PI / sides;
	g.add(lo);
	if (c.holes)
		g.add(Cy(1.02, 1.02, 0.02, 24, SYM_FLOOR[t] || new THREE.Color(col).multiplyScalar(0.55).getStyle(), 0, 0.43, 0));
	c.raised.forEach(([geo, cl]) => {
		const m = new THREE.Mesh(geo, M(cl, { vertexColors: true }));
		m.position.y = 0.44;
		g.add(m);
	});
	return g;
}
let CHEV_TEX = null;
function chevTex() {
	return (
		CHEV_TEX ||
		(CHEV_TEX = canvasTex(64, 64, (x) => {
			x.lineCap = x.lineJoin = "round";
			x.beginPath();
			x.moveTo(14, 46);
			x.lineTo(32, 20);
			x.lineTo(50, 46);
			x.strokeStyle = "#151B24";
			x.lineWidth = 16;
			x.stroke();
			x.strokeStyle = "#FFFFFF";
			x.lineWidth = 8;
			x.stroke();
		}))
	);
}
function beltTex() {
	const t = canvasTex(64, 64, (x, w, h) => {
		x.fillStyle = "#2A2F3A";
		x.fillRect(0, 0, w, h);
		x.strokeStyle = "#FFC83D";
		x.lineWidth = 9;
		x.lineCap = "round";
		x.beginPath();
		x.moveTo(14, 44);
		x.lineTo(32, 24);
		x.lineTo(50, 44);
		x.stroke();
	});
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(1, 2);
	return t;
}
function textSprite(txt, bg, fg, w = 2.2) {
	const tex = canvasTex(256, 96, (x, W_, H) => {
		x.fillStyle = bg;
		rr(x, 6, 6, W_ - 12, H - 12, 26);
		x.fill();
		x.fillStyle = fg;
		x.font = "900 52px Rubik, Arial";
		x.textAlign = "center";
		x.textBaseline = "middle";
		x.fillText(txt, W_ / 2, H / 2 + 3);
	});
	const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
	sp.scale.set(w, (w * 96) / 256, 1);
	return sp;
}
/* 3D title signs: a framed board facing +z, text on both faces. style: wood | barn | neon | race */
function signTex(txt, style, col, pw, ph) {
	return canvasTex(pw, ph, (x, w, h) => {
		const R = mulberry(txt.length * 97 + pw);
		if (style === "neon") {
			x.fillStyle = "#11141C";
			x.fillRect(0, 0, w, h);
			x.strokeStyle = "#262C3A";
			x.lineWidth = 4;
			for (let i = 1; i < 6; i++) {
				x.beginPath();
				x.moveTo(0, (h * i) / 6);
				x.lineTo(w, (h * i) / 6);
				x.stroke();
			}
		} else if (style === "race") {
			x.fillStyle = "#151B24";
			x.fillRect(0, 0, w, h);
			const q = h / 4;
			[0, w - q * 3].forEach((x0) => {
				for (let i = 0; i < 3; i++)
					for (let j = 0; j < 4; j++) {
						x.fillStyle = (i + j) % 2 ? "#151B24" : "#F4F6F9";
						x.fillRect(x0 + i * q, j * q, q, q);
					}
			});
		} else {
			const n = 3,
				pl = h / n,
				base = style === "barn" ? ["#9C6B44", "#8E5F3A", "#A47249"] : ["#A0703F", "#8F6036", "#B07B45"];
			for (let i = 0; i < n; i++) {
				x.fillStyle = base[i % 3];
				x.fillRect(0, i * pl, w, pl);
				for (let k = 0; k < 9; k++) {
					const y0 = i * pl + 3 + R() * (pl - 6);
					x.strokeStyle = `rgba(55,30,12,${0.12 + R() * 0.14})`;
					x.lineWidth = 0.8 + R() * 1.4;
					x.beginPath();
					x.moveTo(0, y0);
					x.bezierCurveTo(w * 0.3, y0 + (R() - 0.5) * 6, w * 0.7, y0 + (R() - 0.5) * 6, w, y0 + (R() - 0.5) * 4);
					x.stroke();
				}
				if (R() < 0.8) {
					x.fillStyle = "rgba(60,32,14,.45)";
					x.beginPath();
					x.ellipse(w * (0.1 + R() * 0.8), i * pl + pl * (0.3 + R() * 0.4), 4 + R() * 5, 2 + R() * 2, 0, 0, 7);
					x.fill();
				}
				x.fillStyle = "rgba(38,20,8,.75)";
				x.fillRect(0, i * pl - 1.5, w, 3);
				x.fillStyle = "#3A3F4A";
				[9, w - 9].forEach((nx) =>
					[pl * 0.3, pl * 0.7].forEach((ny) => {
						x.beginPath();
						x.arc(nx, i * pl + ny, 2.2, 0, 7);
						x.fill();
					}),
				);
			}
			if (style === "barn") {
				x.fillStyle = "rgba(168,40,34,.84)";
				x.fillRect(0, 0, w, h);
				x.strokeStyle = "#F3EEE4";
				x.lineWidth = h * 0.07;
				x.strokeRect(h * 0.12, h * 0.12, w - h * 0.24, h - h * 0.24);
				for (let k = 0; k < 40; k++) {
					x.fillStyle = "rgba(150,100,60,.35)";
					x.fillRect(R() * w, R() * h, 2 + R() * 10, 1 + R() * 2);
				}
			}
		}
		let fs = h * (style === "race" ? 0.62 : 0.56);
		const fnt = () => `${Math.round(fs)}px Bungee, 'Arial Black', Impact, sans-serif`;
		x.font = fnt();
		const mw = w * (style === "race" ? 0.66 : style === "barn" ? 0.74 : 0.86),
			tw = x.measureText(txt).width;
		if (tw > mw) {
			fs *= mw / tw;
			x.font = fnt();
		}
		x.textAlign = "center";
		x.textBaseline = "middle";
		const cy = h / 2 + fs * 0.06;
		if (style === "neon") {
			x.shadowColor = col;
			x.shadowBlur = fs * 0.5;
			x.fillStyle = col;
			x.fillText(txt, w / 2, cy);
			x.fillText(txt, w / 2, cy);
			x.shadowBlur = fs * 0.15;
			x.lineWidth = Math.max(1.5, fs * 0.045);
			x.strokeStyle = "#FFF0F7";
			x.strokeText(txt, w / 2, cy);
			x.shadowBlur = 0;
		} else if (style === "race") {
			x.fillStyle = col;
			x.fillText(txt, w / 2, cy);
		} else {
			x.save();
			x.translate(w / 2, cy);
			x.rotate(style === "wood" ? -0.02 : 0);
			x.lineJoin = "round";
			x.lineWidth = fs * 0.16;
			x.strokeStyle = style === "barn" ? "#5A1612" : "#3B2414";
			x.strokeText(txt, 0, 0);
			x.fillStyle = col;
			x.fillText(txt, 0, 0);
			x.globalCompositeOperation = "destination-out";
			for (let k = 0; k < 26; k++) {
				x.fillStyle = `rgba(0,0,0,${0.15 + R() * 0.3})`;
				x.fillRect((R() - 0.5) * w * 0.8, (R() - 0.5) * fs, 2 + R() * 7, 1 + R() * 3);
			}
			x.restore();
		}
	});
}
function signBoard(txt, o = {}) {
	const style = o.style || "wood",
		w = o.w || 6,
		h = o.h || 1.8,
		col = o.col || (style === "neon" ? "#FF6FAE" : style === "race" ? "#FFC83D" : "#FFE9B8"),
		g = new THREE.Group();
	const pw = Math.min(1024, Math.round(w * 96)),
		ph = Math.max(48, Math.round((pw * h) / w)),
		tex = signTex(txt, style, col, pw, ph);
	const mat =
		style === "neon"
			? new THREE.MeshBasicMaterial({ map: tex })
			: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0 });
	const dep = style === "neon" ? 0.3 : 0.22,
		fc = { wood: "#5E3A20", barn: "#4A2A16", neon: "#0B0E14", race: "#151B24" }[style];
	g.add(B(w + 0.2, h + 0.2, dep, fc, 0, 0, 0));
	[1, -1].forEach((sd) => {
		const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
		p.position.z = sd * (dep / 2 + 0.012);
		if (sd < 0) p.rotation.y = Math.PI;
		g.add(p);
	});
	if (style === "wood" || style === "barn") g.add(B(w + 0.5, 0.16, dep + 0.18, "#4A2E18", 0, h / 2 + 0.18, 0));
	if (style === "neon") {
		const nm = new THREE.MeshBasicMaterial({ color: col });
		[
			[w + 0.1, 0.06, 0, h / 2 + 0.04],
			[w + 0.1, 0.06, 0, -h / 2 - 0.04],
			[0.06, h + 0.1, w / 2 + 0.04, 0],
			[0.06, h + 0.1, -w / 2 - 0.04, 0],
		].forEach(([bw, bh, bx, by]) =>
			[1, -1].forEach((sd) => {
				const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.05), nm);
				b.position.set(bx, by, sd * (dep / 2 + 0.05));
				g.add(b);
			}),
		);
	}
	return g;
}
function junkPile(s, x, z, k = 1, rng = Math.random) {
	const cols = ["#8C5A3C", "#6F7682", "#A0673A", "#5B6B4E", "#7A4E3A", "#9AA3AE", "#C28A4A"];
	for (let i = 0; i < 9; i++) {
		const r = (1 - i / 10) * 1.6 * k,
			a = rng() * 6.28,
			sz = (0.5 + rng() * 0.7) * k;
		const m =
			rng() < 0.35
				? Cy(
						sz * 0.45,
						sz * 0.45,
						sz * 0.9,
						7,
						cols[i % 7],
						x + Math.cos(a) * r,
						sz * 0.45 + i * 0.18 * k,
						z + Math.sin(a) * r,
					)
				: B(
						sz,
						sz * 0.7,
						sz * 1.2,
						cols[(i + 3) % 7],
						x + Math.cos(a) * r,
						sz * 0.35 + i * 0.16 * k,
						z + Math.sin(a) * r,
					);
		m.rotation.set(rng() * 0.8, rng() * 6, rng() * 0.8);
		s.add(m);
	}
}
function tireStack(s, x, z, n = 3) {
	for (let i = 0; i < n; i++) {
		const t = mesh(new THREE.TorusGeometry(0.42, 0.2, 6, 10), "#23272F");
		t.rotation.x = Math.PI / 2;
		t.position.set(x + (Math.random() - 0.5) * 0.1, 0.2 + i * 0.36, z);
		s.add(t);
	}
}
function wreck(s, x, z, col, rot) {
	const g = new THREE.Group();
	g.add(
		B(2.2, 0.5, 1.1, col, 0, 0.25, 0),
		B(1.1, 0.35, 1, col, -0.2, 0.6, 0),
		B(0.6, 0.25, 1.02, "#5A6070", 0.25, 0.6, 0),
	);
	g.position.set(x, 0, z);
	g.rotation.set(0, rot, 0.12);
	s.add(g);
}
function fence(s, x1, z1, x2, z2) {
	const L = Math.hypot(x2 - x1, z2 - z1),
		n = Math.ceil(L / 3);
	for (let i = 0; i <= n; i++)
		s.add(B(0.14, 1.8, 0.14, "#7A818E", x1 + ((x2 - x1) * i) / n, 0.9, z1 + ((z2 - z1) * i) / n));
	const p = new THREE.Mesh(
		new THREE.PlaneGeometry(L, 1.5),
		new THREE.MeshStandardMaterial({ color: "#B8C0CC", transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
	);
	p.position.set((x1 + x2) / 2, 0.95, (z1 + z2) / 2);
	p.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
	s.add(p);
}
function classicScenery(s) {
	[
		[95, 100, 1.3],
		[150, 118, 0.9],
		[262, 98, 1.2],
		[215, 128, 0.8],
		[120, 78, 0.8],
		[88, 215, 1],
		[90, 330, 1.1],
		[265, 318, 1],
		[104, 398, 0.9],
		[265, 400, 1.1],
		[160, 300, 0.8],
		[20, 250, 1.2],
		[20, 140, 1],
		[345, 120, 1.1],
		[345, 380, 1],
		[180, 475, 1.3],
		[100, 12, 1],
		[250, 10, 1.2],
		[345, 230, 0.9],
		[18, 380, 1.1],
		[-10, 60, 1.4],
		[372, 40, 1.3],
		[375, 470, 1.2],
		[-15, 470, 1.3],
		[200, 500, 1.1],
	].forEach(([x, y, k], i) => {
		const [wx, wz] = W3(x, y);
		s.add(edReg(tree(wx, wz, k), "tree" + i));
	});
	const [px, pz] = W3(195, 360),
		pg = new THREE.Group();
	pg.position.set(px, 0, pz);
	s.add(edReg(pg, "pond"));
	const pond = new THREE.Mesh(
		new THREE.CircleGeometry(1, 18),
		new THREE.MeshStandardMaterial({ color: "#4FB3E8", roughness: 0.15, metalness: 0.2, flatShading: true }),
	);
	pond.rotation.x = -Math.PI / 2;
	pond.scale.set(3.6, 1.9, 1);
	pond.position.set(0, 0.05, 0);
	pg.add(pond);
	const rim = Cy(1, 1.05, 0.08, 18, "#D9C79A", 0, 0.02, 0);
	rim.scale.set(3.9, 1, 2.15);
	rim.castShadow = false;
	pg.add(rim);
}
function junkScenery(s) {
	const rng = mulberry(7);
	[
		[0, -6.5, 1.3],
		[-5.5, -6, 0.9],
		[5.5, -7, 1],
		[4.5, 9.5, 0.7],
		[-4.5, 9.8, 0.6],
		[-17, -6, 1.2],
		[17, 6, 1.1],
		[-17, 8, 1],
		[17, -9, 1.3],
		[0, -18, 1.2],
		[-8, 18.5, 0.9],
		[8, 18.5, 1],
	].forEach(([x, z, k]) => junkPile(s, x, z, k, rng));
	[
		[-6, 7.5],
		[6.5, 3],
		[-15, 0],
		[15, -3],
		[-2, -9.5],
	].forEach(([x, z], i) => tireStack(s, x, z, 2 + (i % 3)));
	[
		[3, -4, "#E5484D", 0.4],
		[-3.5, -3.5, "#2F7DE1", -0.6],
		[-14.5, -12, "#6CCB2E", 1.2],
		[15, 11, "#FFC83D", 0.3],
		[-14, 15, "#8E5BE0", -0.3],
	].forEach(([x, z, c, r]) => wreck(s, x, z, c, r));
	[
		[8, -9.5],
		[-8, -9],
		[14.5, 14.5],
		[-15, 3],
	].forEach(([x, z]) => {
		for (let i = 0; i < 3; i++)
			s.add(Cy(0.35, 0.35, 0.9, 10, ["#2F7DE1", "#E5484D", "#1FA35C"][i], x + i * 0.75, 0.45, z));
	});
	fence(s, -19, -19, 19, -19);
	fence(s, 19, -19, 19, 19);
	fence(s, 19, 19, -19, 19);
	fence(s, -19, 19, -19, -19);
	const cr = new THREE.Group();
	cr.position.set(-16.5, 0, -16);
	for (let i = 0; i < 6; i++)
		cr.add(B(0.9, 0.12, 0.12, "#E0A800", 0, 1 + i * 1.6, 0.45), B(0.9, 0.12, 0.12, "#E0A800", 0, 1 + i * 1.6, -0.45));
	cr.add(
		B(0.12, 10, 0.12, "#E0A800", 0.45, 5, 0.45),
		B(0.12, 10, 0.12, "#E0A800", -0.45, 5, 0.45),
		B(0.12, 10, 0.12, "#E0A800", 0.45, 5, -0.45),
		B(0.12, 10, 0.12, "#E0A800", -0.45, 5, -0.45),
		B(9, 0.5, 0.5, "#E0A800", 3.2, 10, 0),
		B(1.4, 1, 1, "#3A4150", -0.9, 10, 0),
	);
	s.add(edReg(cr, "crane"));
	const bb = new THREE.Group();
	bb.position.set(3, 0, -21.4);
	bb.rotation.y = 0.04;
	s.add(edReg(bb, "sign"));
	const sg = signBoard("JUNKYARD", { style: "wood", w: 10, h: 2.6, col: "#FFC83D" });
	sg.position.set(0, 4.3, 0);
	sg.rotation.set(-0.16, 0, 0.025);
	bb.add(sg);
	[-3.4, 3.4].forEach((x) => {
		bb.add(B(0.32, 5.4, 0.32, "#5E3A20", x, 2.7, -0.35));
		const br = B(0.16, 3.1, 0.16, "#6B4426", x * 0.72, 1.5, -0.35);
		br.rotation.z = x > 0 ? 0.55 : -0.55;
		bb.add(br);
	});
	tireStack(s, 7.2, -21.2, 2);
	s.add(Cy(0.35, 0.35, 0.9, 10, "#E5484D", -0.8, 0.45, -21));
}
function buildRival() {
	const g = new THREE.Group(),
		tr = buildTruck(7);
	tr.scale.setScalar(0.8);
	g.add(tr);
	const crane = new THREE.Group();
	crane.position.set(-0.45, 0, 0);
	g.add(crane);
	crane.add(
		Cy(0.3, 0.34, 0.22, 10, "#3A4150", 0, 0.8, 0),
		B(0.16, 2.5, 0.16, "#3A4150", 0, 1.95, 0),
		B(1.95, 0.16, 0.16, "#FFC83D", -0.85, 3.2, 0),
		B(0.36, 0.32, 0.32, "#5A6272", 0.28, 3.15, 0),
	);
	for (let k = 0; k < 4; k++) crane.add(B(0.05, 0.17, 0.17, "#151B24", -0.35 - k * 0.42, 3.2, 0));
	const cable = B(0.04, 1, 0.04, "#1D2230", -1.78, 2.7, 0);
	crane.add(cable);
	const mag = new THREE.Group();
	mag.add(
		Cy(0.42, 0.42, 0.24, 14, "#E5484D", 0, 0, 0),
		Cy(0.43, 0.43, 0.06, 14, "#D8DDE5", 0, -0.15, 0),
		B(0.5, 0.05, 0.05, "#FFFFFF", 0, 0.13, 0),
	);
	mag.position.set(-1.78, 2.15, 0);
	crane.add(mag);
	const tag = nameTag("Magnet Mike", "#8E5BE0");
	tag.scale.multiplyScalar(1.5);
	tag.position.y = 4.2;
	g.add(tag);
	g.userData = { mag, cable, crane };
	return g;
}
/* ---------- Volcano Quarry scenery ---------- */
/* soft purple glow sprite (additive) for shard spaces and loose shards */
let GLOW_TEX = null;
function shardGlow(sz, op) {
	GLOW_TEX =
		GLOW_TEX ||
		canvasTex(64, 64, (x, w, h) => {
			const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
			g.addColorStop(0, "rgba(190,140,255,.9)");
			g.addColorStop(0.45, "rgba(150,90,255,.35)");
			g.addColorStop(1, "rgba(120,60,255,0)");
			x.fillStyle = g;
			x.fillRect(0, 0, w, h);
		});
	const sp = new THREE.Sprite(
		new THREE.SpriteMaterial({
			map: GLOW_TEX,
			transparent: true,
			opacity: op,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		}),
	);
	sp.scale.set(sz, sz, 1);
	return sp;
}
/* obsidian: hexagonal crystals with pointed ends, like the pressed-in tile icons: a big one leaning left and a smaller one leaning right; base at y 0 */
let XTAL_GEO = null;
const xtalGeo = () =>
	XTAL_GEO ||
	(XTAL_GEO = new THREE.LatheGeometry(
		[
			[0, -0.5],
			[0.2, -0.29],
			[0.2, 0.29],
			[0, 0.5],
		].map(([r, y]) => new THREE.Vector2(r, y)),
		6,
	));
function obsidianMesh(k = 1) {
	const g = new THREE.Group(),
		o = { emissive: "#7A3CFF", emissiveIntensity: 0.45, roughness: 0.25 };
	const big = mesh(xtalGeo(), "#5B2BB5", o);
	big.scale.setScalar(k);
	big.position.set(-0.06 * k, 0.46 * k, 0);
	big.rotation.z = 0.24;
	const sm = mesh(xtalGeo(), "#6A35D0", o);
	sm.scale.setScalar(0.62 * k);
	sm.position.set(0.24 * k, 0.28 * k, 0.06 * k);
	sm.rotation.set(0.15, 0, -0.38);
	g.add(big, sm);
	return g;
}
/* Volcano Quarry buildings (same 2.2 × 1.6 footprint as the battery factory). A glowing pipe runs from the building down the outside of its rock pillar into the lava (r 2.05 clears the pillar);
   each returns a group with userData { sign (swings), puff: steam origin, puffs } */
const GEO_PIPE = { emissive: "#FF3A00", emissiveIntensity: 0.55 };
function geoPipe(g, x, z, top, len) {
	g.add(Cy(0.11, 0.11, len, 8, "#D9480F", x, top - len / 2, z, GEO_PIPE));
	for (let y = top - 1.2; y > top - len + 0.5; y -= 2.4) g.add(Cy(0.16, 0.16, 0.14, 8, "#3A302B", x, y, z));
}
function geoPuffs(g, n, col = "#F1F3F6") {
	const ps = [];
	for (let k = 0; k < n; k++) {
		const p = new THREE.Mesh(
			new THREE.IcosahedronGeometry(0.25, 0),
			new THREE.MeshStandardMaterial({
				color: col,
				transparent: true,
				opacity: 0.85,
				flatShading: true,
				depthWrite: false,
			}),
		);
		p.userData.t = k / n;
		g.add(p);
		ps.push(p);
	}
	return ps;
}
/* refinery gate over the road (trucks drive through it): a heat-exchanger tank on the lava side, a stone tower with a steam stack on the other, a girder and a glowing pipe across,
   a double-sided shard → cell sign on top and the hot pipe running from the tank down over the ledge edge into the lava. Local x runs along the road; sd = which side (±z) faces the lava */
function geoRefinery(w, sd) {
	const g = new THREE.Group(),
		zc = w + 0.45,
		zt = sd * zc,
		zs = -sd * zc;
	[zt, zs].forEach((z) => g.add(B(1.05, 1.7, 0.95, "#4A3C36", 0, -0.83, z)));
	g.add(
		Cy(0.42, 0.46, 3, 10, "#8C7A6A", 0, 1.5, zt),
		Cy(0.44, 0.44, 0.14, 10, "#D9480F", 0, 1.1, zt, GEO_PIPE),
		Cy(0.44, 0.44, 0.14, 10, "#D9480F", 0, 2.3, zt, GEO_PIPE),
		Cy(0.18, 0.42, 0.3, 10, "#6B5A50", 0, 3.15, zt),
	);
	g.add(
		B(0.9, 3.1, 0.8, "#6B5A50", 0, 1.55, zs),
		B(1, 0.14, 0.9, "#3A302B", 0, 3.15, zs),
		B(0.05, 0.4, 0.3, "#E8620F", 0.46, 1.9, zs, { emissive: "#FF4500", emissiveIntensity: 0.5 }),
		B(0.05, 0.4, 0.3, "#E8620F", -0.46, 1.9, zs, { emissive: "#FF4500", emissiveIntensity: 0.5 }),
	);
	g.add(Cy(0.14, 0.18, 0.9, 8, "#4A3C36", 0.18, 3.65, zs), Cy(0.2, 0.2, 0.1, 8, "#2A211E", 0.18, 4.1, zs));
	g.add(B(0.32, 0.32, 2 * zc + 0.5, "#3A302B", 0, 3.3, 0));
	const xp = Cy(0.12, 0.12, 2 * zc, 8, "#D9480F", 0, 0, 0, GEO_PIPE);
	xp.rotation.x = Math.PI / 2;
	xp.position.set(0.3, 3.02, 0);
	g.add(xp);
	const op = Cy(0.11, 0.11, 0.75, 8, "#D9480F", 0, 0, 0, GEO_PIPE);
	op.rotation.x = Math.PI / 2;
	op.position.set(0, 0.6, sd * (zc + 0.45));
	g.add(op);
	geoPipe(g, 0, sd * (zc + 0.8), 0.71, 13);
	/* sign: a dark plate with shard → cell on both faces, each face read left to right from its own side (crystals sit in front of the plate, not through it) */
	const sg = new THREE.Group();
	sg.add(
		B(1.5, 0.75, 0.1, "#151B24", 0, 0, 0),
		B(0.1, 0.3, 0.1, "#3A302B", -0.5, -0.5, 0),
		B(0.1, 0.3, 0.1, "#3A302B", 0.5, -0.5, 0),
	);
	const arrow = new THREE.ExtrudeGeometry(
		polyShape([
			[-0.13, 0.035],
			[0.03, 0.035],
			[0.03, 0.085],
			[0.14, 0],
			[0.03, -0.085],
			[0.03, -0.035],
			[-0.13, -0.035],
		]),
		{ depth: 0.04, bevelEnabled: false },
	);
	[1, -1].forEach((f) => {
		const face = new THREE.Group();
		face.rotation.y = f > 0 ? 0 : Math.PI;
		sg.add(face);
		const sh = obsidianMesh(0.45);
		sh.position.set(-0.42, -0.18, 0.17);
		face.add(sh);
		const ar = mesh(arrow, "#FFFFFF");
		ar.position.set(0.02, 0, 0.05);
		face.add(ar);
		const pile = mesh(new THREE.ConeGeometry(0.22, 0.2, 9), "#8C7AB0");
		pile.position.set(0.44, -0.15, 0.12);
		face.add(pile);
		[
			[0.38, -0.02, 0.2],
			[0.5, -0.08, 0.19],
			[0.45, 0.06, 0.14],
		].forEach(([x, y, z]) => {
			const d = mesh(new THREE.IcosahedronGeometry(0.035, 0), "#D9C8FF", {
				emissive: "#B78CFF",
				emissiveIntensity: 0.5,
			});
			d.position.set(x, y, z);
			face.add(d);
		});
	});
	sg.rotation.y = Math.PI / 2;
	sg.position.set(0, 3.98, 0);
	g.add(sg);
	/* intake: a funnel under the girder, a faint purple cone of suction down to the tile, and spiral arms of half-transparent shards that bend as they climb */
	g.add(
		Cy(0.16, 0.55, 0.45, 10, "#3A302B", 0, 2.95, 0),
		Cy(0.57, 0.57, 0.06, 10, "#B78CFF", 0, 2.72, 0, { emissive: "#7A3CFF", emissiveIntensity: 0.8 }),
	);
	const coneM = new THREE.MeshBasicMaterial({
			color: "#B78CFF",
			transparent: true,
			opacity: 0.1,
			depthWrite: false,
			side: THREE.DoubleSide,
		}),
		cone = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 1.15, 2.1, 28, 1, true), coneM);
	cone.position.y = 1.66;
	g.add(cone);
	/* faint air streaks spiralling up the cone: thin strands laid along the spiral, fading in and out */
	const sgeo = new THREE.BoxGeometry(0.025, 0.025, 0.42),
		bits = [],
		ARMS = 4,
		PER = 5,
		sp = (arm, u, time) => {
			const a = (arm / ARMS) * Math.PI * 2 + time * 1.1 + u * u * Math.PI * 2.4,
				r = 1.1 * Math.pow(1 - u, 1.25) + 0.16;
			return new THREE.Vector3(Math.cos(a) * r, 0.58 + u * 2.1, Math.sin(a) * r);
		};
	for (let k = 0; k < ARMS * PER; k++) {
		const m = new THREE.Mesh(
			sgeo,
			new THREE.MeshBasicMaterial({ color: "#EDE4FF", transparent: true, opacity: 0, depthWrite: false }),
		);
		g.add(m);
		bits.push(m);
	}
	const ZV = new THREE.Vector3(0, 0, 1),
		DV = new THREE.Vector3();
	const tick = (time) => {
		coneM.opacity = 0.08 + Math.sin(time * 2.2) * 0.025;
		bits.forEach((m, k) => {
			const arm = k % ARMS,
				u = (time * 0.4 + ((k / ARMS) | 0) / PER + arm * 0.13) % 1,
				a = sp(arm, u, time),
				b = sp(arm, Math.min(1, u + 0.05), time);
			m.position.copy(a).lerp(b, 0.5);
			DV.subVectors(b, a);
			const l = DV.length() || 0.01;
			m.quaternion.setFromUnitVectors(ZV, DV.multiplyScalar(1 / l));
			m.scale.z = Math.min(1.6, (l / 0.42) * 1.4);
			m.material.opacity = 0.28 * Math.sin(u * Math.PI);
		});
	};
	g.userData = { puff: [0.18, 4.2, zs], puffs: geoPuffs(g, 5), tick };
	return g;
}
/* ---------- battery factory models: two looks per style, FAC_LOOK picks the one in use ----------
   all face +z (the camera side), ~2.7 × 2 footprint; each returns a group with userData { sign (swings, optional), puff: steam origin, puffs, tick(time) } */
const FAC_LOOK = { def: "works", volc: "forge" };
const FAC_MODELS = {
	works: () => facWorks(),
	plant: () => facPlant(),
	forge: () => facForge(),
	reactor: () => facReactor(),
};
const glowMat = (c, e, k) =>
	new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: k, flatShading: true });
/* one sawtooth roof tooth running along x: glazed vertical face toward +z, slope falling back to −z */
function sawTooth(len, d, h, col, gcol, gopt) {
	const geo = new THREE.ExtrudeGeometry(
		polyShape([
			[0, 0],
			[-d, 0],
			[0, h],
		]),
		{ depth: len, bevelEnabled: false },
	);
	geo.rotateY(-Math.PI / 2);
	geo.translate(len / 2, 0, 0);
	const g = new THREE.Group();
	g.add(mesh(geo, col), B(len * 0.9, h * 0.72, 0.03, gcol, 0, h * 0.42, 0.025, gopt));
	return g;
}
function sawRoof(g, n, len, d, h, x, y, zFront, col, gcol, gopt) {
	for (let k = 0; k < n; k++) {
		const t = sawTooth(len, d, h, col, gcol, gopt);
		t.position.set(x, y, zFront - k * d);
		g.add(t);
	}
}
/* a little battery riding a conveyor */
function miniBat(col, cap) {
	const b = new THREE.Group();
	b.add(B(0.2, 0.13, 0.13, col, 0, 0, 0), B(0.05, 0.07, 0.07, cap, 0.125, 0, 0));
	return b;
}
/* conveyor belt along z from z0 to z1 with rails, carrying n batteries; returns a tick */
function facBelt(g, x, z0, z1, y, col, cap, n = 3) {
	const L = z1 - z0,
		zc = (z0 + z1) / 2;
	g.add(
		B(0.38, 0.08, L, "#2A2F3A", x, y, zc),
		B(0.04, 0.12, L, "#FFC83D", x - 0.21, y + 0.03, zc),
		B(0.04, 0.12, L, "#FFC83D", x + 0.21, y + 0.03, zc),
	);
	[z0 + 0.08, z1 - 0.08].forEach((z) => g.add(B(0.3, y, 0.08, "#5A6272", x, y / 2, z)));
	const bats = Array.from({ length: n }, () => {
		const b = miniBat(col, cap);
		b.rotation.y = Math.PI / 2;
		g.add(b);
		return b;
	});
	return (time) =>
		bats.forEach((b, k) => {
			const u = (time * 0.18 + k / n) % 1;
			b.position.set(x, y + 0.11, z0 + 0.1 + u * (L - 0.2));
			b.scale.setScalar(u < 0.08 ? u / 0.08 : u > 0.92 ? (1 - u) / 0.08 : 1);
		});
}
function batSign(purple) {
	const sg = new THREE.Group();
	if (purple) {
		const bat = batteryMesh(true);
		bat.scale.setScalar(0.62);
		sg.add(B(1.25, 0.78, 0.1, "#151B24", 0, 0, -0.12), bat);
		return sg;
	}
	sg.add(
		B(1.2, 0.72, 0.16, "#1FA35C", 0, 0, 0),
		B(0.14, 0.32, 0.18, "#1FA35C", 0.66, 0, 0),
		B(1.3, 0.82, 0.08, "#151B24", 0, 0, -0.1),
	);
	const bolt = new THREE.Shape();
	[
		[0.05, 0.3],
		[-0.18, -0.02],
		[-0.02, -0.02],
		[-0.08, -0.3],
		[0.18, 0.06],
		[0.02, 0.06],
	].forEach(([x, y], i) => (i ? bolt.lineTo(x, y) : bolt.moveTo(x, y)));
	const bm = mesh(new THREE.ExtrudeGeometry(bolt, { depth: 0.06, bevelEnabled: false }), "#FFE27A", {
		emissive: "#FFC83D",
		emissiveIntensity: 0.6,
	});
	bm.position.z = 0.08;
	sg.add(bm);
	return sg;
}
/* Battery Works: brick-based hall with ribbed walls and a glazed sawtooth roof, blue office annex, acid tanks, banded chimney, roll-up door and a battery conveyor */
function facWorks() {
	const g = new THREE.Group(),
		glass = { roughness: 0.15, metalness: 0.1 };
	g.add(B(2.7, 0.14, 2, "#8E96A3", 0, 0.07, 0));
	g.add(
		B(1.66, 1.1, 1.4, "#D8DDE5", -0.42, 0.69, -0.1),
		B(1.72, 0.32, 1.46, "#B5523B", -0.42, 0.3, -0.1),
		B(1.74, 0.06, 1.48, "#8E3E2C", -0.42, 0.48, -0.1),
	);
	for (let x = -1.18; x < 0.38; x += 0.13)
		if (x < -0.5 || x > 0.27) g.add(B(0.035, 0.72, 0.04, "#BCC3CE", x, 0.88, 0.625));
	sawRoof(g, 3, 1.66, 0.46, 0.38, -0.42, 1.245, 0.6, "#8E96A3", "#9FD6F7", glass);
	g.add(B(0.66, 0.66, 0.04, "#3E4450", -0.12, 0.47, 0.64), B(0.6, 0.6, 0.04, "#6A717E", -0.12, 0.45, 0.66));
	for (let k = 0; k < 4; k++) g.add(B(0.58, 0.025, 0.02, "#4B515E", -0.12, 0.25 + k * 0.13, 0.69));
	[-0.5, 0.26].forEach((x) => {
		g.add(Cy(0.05, 0.05, 0.7, 8, "#FFC83D", x, 0.49, 0.74));
		[0.3, 0.56].forEach((y) => g.add(Cy(0.065, 0.065, 0.09, 8, "#151B24", x, y, 0.74)));
	});
	g.add(
		B(0.8, 0.9, 1, "#2F7DE1", 0.85, 0.59, 0.25),
		B(0.86, 0.08, 1.06, "#1E2530", 0.85, 1.08, 0.25),
		B(0.24, 0.4, 0.03, "#1E2530", 0.98, 0.34, 0.76),
	);
	[
		[0.68, 0.52],
		[0.68, 0.82],
		[0.98, 0.82],
	].forEach(([x, y]) => g.add(B(0.22, 0.17, 0.03, "#9FD6F7", x, y, 0.765, glass)));
	g.add(B(0.3, 0.16, 0.3, "#AEB5C1", 0.78, 1.2, 0.12), Cy(0.1, 0.1, 0.02, 10, "#5A6272", 0.78, 1.29, 0.12));
	[
		[0.62, -0.6],
		[1.06, -0.52],
	].forEach(([x, z]) => {
		g.add(
			Cy(0.22, 0.22, 1, 12, "#1FA35C", x, 0.64, z),
			Cy(0.14, 0.22, 0.14, 12, "#157A44", x, 1.21, z),
			Cy(0.24, 0.24, 0.05, 12, "#C9CED8", x, 0.42, z),
			Cy(0.24, 0.24, 0.05, 12, "#C9CED8", x, 0.9, z),
		);
		g.add(
			B(0.03, 0.9, 0.03, "#5A6272", x - 0.07, 0.6, z + 0.23),
			B(0.03, 0.9, 0.03, "#5A6272", x + 0.07, 0.6, z + 0.23),
		);
		for (let y = 0.25; y < 1.05; y += 0.14) g.add(B(0.14, 0.02, 0.02, "#5A6272", x, y, z + 0.23));
	});
	const tp = Cy(0.05, 0.05, 0.78, 8, "#AEB5C1", 0, 0, 0);
	tp.rotation.z = Math.PI / 2;
	tp.position.set(0.48, 1.38, -0.56);
	g.add(
		tp,
		Cy(0.05, 0.05, 0.2, 8, "#AEB5C1", 0.62, 1.3, -0.6),
		Cy(0.05, 0.05, 0.2, 8, "#AEB5C1", 1.06, 1.3, -0.52),
		Cy(0.05, 0.05, 0.14, 8, "#AEB5C1", 0.1, 1.33, -0.56),
	);
	for (let k = 0; k < 5; k++)
		g.add(Cy(0.15 - k * 0.008, 0.16 - k * 0.008, 0.3, 10, k % 2 ? "#FFFFFF" : "#E5484D", -1.02, 1.4 + k * 0.3, -0.58));
	const bc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), glowMat("#FFB000", "#FFB000", 0.9));
	bc.position.set(1.18, 1.17, 0.62);
	g.add(bc, Cy(0.035, 0.035, 0.05, 6, "#1E2530", 1.18, 1.1, 0.62));
	const sg = batSign(false);
	sg.position.set(-0.42, 2.05, -0.1);
	g.add(sg, B(0.06, 0.45, 0.06, "#5A6272", -0.82, 1.62, -0.15), B(0.06, 0.45, 0.06, "#5A6272", -0.02, 1.62, -0.15));
	const belt = facBelt(g, -0.12, 0.7, 1.3, 0.2, "#1FA35C", "#C9CED8");
	g.userData = {
		sign: sg,
		puff: [-1.02, 2.95, -0.58],
		puffs: geoPuffs(g, 5),
		tick: (time) => {
			belt(time);
			bc.material.emissiveIntensity = (time * 1.5) % 1 < 0.5 ? 1.2 : 0.15;
		},
	};
	return g;
}
/* Power Plant: a cooling tower, the hall is a giant battery on cradles, transformer yard with insulators, a lattice pylon with cables */
function facPlant() {
	const g = new THREE.Group();
	g.add(B(2.7, 0.14, 2, "#8E96A3", 0, 0.07, 0));
	const prof = [
			[0.66, 0],
			[0.56, 0.4],
			[0.46, 0.9],
			[0.45, 1.15],
			[0.5, 1.5],
			[0.54, 1.62],
		].map(([r, y]) => new THREE.Vector2(r, y)),
		tw = mesh(new THREE.LatheGeometry(prof, 18), "#E9EDF2", { side: THREE.DoubleSide });
	tw.position.set(-0.78, 0.14, -0.32);
	g.add(
		tw,
		Cy(0.5, 0.48, 0.13, 18, "#E5484D", -0.78, 1.44, -0.32),
		Cy(0.67, 0.69, 0.12, 18, "#8E96A3", -0.78, 0.2, -0.32),
		Cy(0.44, 0.44, 0.02, 18, "#5A6272", -0.78, 1.5, -0.32),
	);
	const bat = new THREE.Group();
	bat.position.set(0.42, 0.66, 0.22);
	g.add(bat);
	const body = Cy(0.46, 0.46, 1.4, 18, "#1FA35C", 0, 0, 0);
	body.rotation.z = Math.PI / 2;
	const neg = Cy(0.48, 0.48, 0.34, 18, "#151B24", 0, 0, 0);
	neg.rotation.z = Math.PI / 2;
	neg.position.x = -0.56;
	const cap = Cy(0.2, 0.2, 0.18, 14, "#C9CED8", 0, 0, 0);
	cap.rotation.z = Math.PI / 2;
	cap.position.x = 0.78;
	bat.add(body, neg, cap);
	const bolt = new THREE.Shape();
	[
		[0.05, 0.3],
		[-0.18, -0.02],
		[-0.02, -0.02],
		[-0.08, -0.3],
		[0.18, 0.06],
		[0.02, 0.06],
	].forEach(([x, y], i) => (i ? bolt.lineTo(x, y) : bolt.moveTo(x, y)));
	const bm = mesh(new THREE.ExtrudeGeometry(bolt, { depth: 0.06, bevelEnabled: false }), "#FFE27A", {
		emissive: "#FFC83D",
		emissiveIntensity: 0.7,
	});
	bm.scale.setScalar(1.2);
	bm.position.set(0.1, 0, 0.44);
	bat.add(bm);
	[-0.3, 0.4].forEach((x) =>
		g.add(B(0.16, 0.3, 0.7, "#8E96A3", 0.42 + x, 0.25, 0.22), B(0.22, 0.06, 0.76, "#5A6272", 0.42 + x, 0.41, 0.22)),
	);
	[0.18, 0.62].forEach((x) => {
		g.add(B(0.34, 0.38, 0.28, "#5A6272", x, 0.33, -0.62));
		for (let k = -1; k <= 1; k++) g.add(B(0.02, 0.3, 0.3, "#4B515E", x + k * 0.1, 0.33, -0.62));
		[-0.09, 0.09].forEach((o) => {
			for (let k = 0; k < 3; k++) g.add(Cy(0.05, 0.05, 0.04, 8, "#B5523B", x + o, 0.56 + k * 0.06, -0.62));
		});
	});
	const px = 1.08,
		pz = -0.55,
		py = 0.14,
		H = 2.1;
	[
		[-1, -1],
		[1, -1],
		[1, 1],
		[-1, 1],
	].forEach(([a, b]) => {
		const leg = B(0.035, H, 0.035, "#6A717E", px + a * 0.12, py + H / 2, pz + b * 0.12);
		leg.rotation.set(b * 0.045, 0, -a * 0.045);
		g.add(leg);
	});
	[0.6, 1.2].forEach((y) =>
		g.add(B(0.24, 0.03, 0.03, "#6A717E", px, py + y, pz + 0.1), B(0.24, 0.03, 0.03, "#6A717E", px, py + y, pz - 0.1)),
	);
	g.add(B(0.9, 0.05, 0.05, "#6A717E", px, py + 1.75, pz), B(0.6, 0.05, 0.05, "#6A717E", px, py + 2.0, pz));
	const lm = new THREE.LineBasicMaterial({ color: "#2A2F3A" });
	[
		[-0.42, 1.75],
		[0.42, 1.75],
	].forEach(([o, y]) => {
		const pts = [];
		for (let k = 0; k <= 8; k++) {
			const u = k / 8;
			pts.push(
				new THREE.Vector3(
					px + o + (1.2 - px - o) * u,
					py + y - (py + y - 0.9) * u - Math.sin(u * Math.PI) * 0.12,
					pz + (0.22 - pz) * u,
				),
			);
		}
		g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm));
	});
	const bc = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glowMat("#FF3030", "#FF2020", 0.9));
	bc.position.set(-0.78, 1.68, 0.2);
	g.add(bc);
	g.userData = {
		sign: null,
		puff: [-0.78, 1.7, -0.32],
		puffs: geoPuffs(g, 7),
		tick: (time) => {
			bc.material.emissiveIntensity = (time * 0.8) % 1 < 0.3 ? 1.4 : 0.1;
		},
	};
	return g;
}
/* Forge (volcano): basalt hall with buttresses and a sawtooth roof glowing orange, a furnace mouth spilling lava into a crucible, ember-topped chimney, purple batteries on a conveyor */
function facForge() {
	const g = new THREE.Group();
	g.add(B(2.7, 0.18, 2, "#2E2622", 0, 0.09, 0), B(1.9, 1.2, 1.4, "#5E4C42", -0.22, 0.78, -0.18));
	[-1.1, -0.62, 0.26, 0.66].forEach((x) =>
		g.add(B(0.18, 1.05, 0.2, "#4A3C36", x, 0.7, 0.6), B(0.24, 0.12, 0.26, "#3A302B", x, 0.14 + 0.12, 0.6)),
	);
	sawRoof(g, 3, 1.9, 0.46, 0.4, -0.22, 1.38, 0.52, "#3E434B", "#E8620F", {
		emissive: "#FF4500",
		emissiveIntensity: 0.6,
	});
	const fm = glowMat("#FF7A2A", "#FF4500", 0.9),
		ash = new THREE.Shape();
	ash.moveTo(-0.24, 0);
	ash.lineTo(0.24, 0);
	ash.lineTo(0.24, 0.26);
	ash.absarc(0, 0.26, 0.24, 0, Math.PI, false);
	ash.lineTo(-0.24, 0);
	const mouth = new THREE.Mesh(
		new THREE.ExtrudeGeometry(ash, { depth: 0.04, bevelEnabled: false, curveSegments: 12 }),
		fm,
	);
	mouth.position.set(-0.18, 0.3, 0.53);
	g.add(B(0.72, 0.92, 0.06, "#2A211E", -0.18, 0.66, 0.53), mouth, B(0.8, 0.1, 0.1, "#3A302B", -0.18, 1.12, 0.56));
	g.add(B(0.26, 0.08, 0.56, "#2A211E", -0.18, 0.22, 0.86));
	const ch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.56), fm);
	ch.position.set(-0.18, 0.27, 0.86);
	g.add(ch);
	g.add(Cy(0.24, 0.18, 0.3, 10, "#2A211E", -0.18, 0.33, 1.24));
	const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10), fm);
	cr.position.set(-0.18, 0.48, 1.24);
	g.add(cr);
	g.add(Cy(0.17, 0.24, 2.8, 8, "#4A3C36", 0.5, 1.6, -0.66), Cy(0.2, 0.2, 0.1, 8, "#2A211E", 0.5, 3.02, -0.66));
	const em = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 8), glowMat("#FFB15A", "#FF5A1F", 1));
	em.position.set(0.5, 3.08, -0.66);
	g.add(em);
	[-0.95, -0.75].forEach((x, k) => {
		g.add(Cy(0.06, 0.06, 1.05, 8, "#6B4A36", x, 0.75, -0.95));
		for (let y = 0.35; y < 1.3; y += 0.3) g.add(Cy(0.085, 0.085, 0.05, 8, "#3A302B", x, y, -0.95));
	});
	const ob = obsidianMesh(0.75);
	ob.position.set(-1.15, 0.2, 0.78);
	g.add(ob);
	const hp = Cy(0.11, 0.11, 1, 8, "#D9480F", 0, 0, 0, GEO_PIPE);
	hp.rotation.z = Math.PI / 2;
	hp.position.set(1.5, 0.5, 0.4);
	g.add(hp);
	geoPipe(g, 1.98, 0.4, 0.56, 14);
	const belt = facBelt(g, 0.62, 0.66, 1.3, 0.24, "#6A35D0", "#3B2466");
	const sg = batSign(true);
	sg.position.set(-0.3, 2.35, -0.2);
	g.add(sg, B(0.06, 0.5, 0.06, "#3A302B", -0.75, 1.95, -0.3), B(0.06, 0.5, 0.06, "#3A302B", 0.15, 1.95, -0.3));
	g.userData = {
		sign: sg,
		puff: [0.5, 3.15, -0.66],
		puffs: geoPuffs(g, 6, "#5A4E4A"),
		tick: (time) => {
			belt(time);
			fm.emissiveIntensity = 0.75 + Math.sin(time * 7) * 0.12 + Math.sin(time * 13) * 0.08;
			em.material.emissiveIntensity = 0.8 + Math.sin(time * 5) * 0.2;
		},
	};
	return g;
}
/* Obsidian Reactor (volcano): hex basalt base, steel dome with glowing purple bands and cooling fins, a floating obsidian crystal in a spinning ring, airlock, pipes into the lava */
function facReactor() {
	const g = new THREE.Group(),
		pm = glowMat("#B78CFF", "#7A3CFF", 0.9);
	g.add(Cy(1.22, 1.32, 0.34, 6, "#2E2622", 0, 0.17, -0.05), Cy(1.0, 1.08, 0.08, 6, "#3A302B", 0, 0.38, -0.05));
	const dome = mesh(new THREE.SphereGeometry(0.85, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), "#3E434B");
	dome.position.set(0, 0.42, -0.05);
	g.add(dome);
	[
		[0.62, 0.832],
		[0.92, 0.69],
	].forEach(([y, r]) => {
		const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 6, 28), pm);
		t.rotation.x = Math.PI / 2;
		t.position.set(0, y, -0.05);
		g.add(t);
	});
	for (let k = 0; k < 6; k++) {
		const a = (k / 6) * Math.PI * 2 + 0.3,
			f = B(0.07, 0.72, 0.46, "#5E4C42", Math.cos(a) * 0.82, 0.74, -0.05 + Math.sin(a) * 0.82);
		f.rotation.y = -a;
		if (Math.sin(a) < 0.6) g.add(f);
	}
	g.add(Cy(0.24, 0.32, 0.3, 8, "#2A211E", 0, 1.38, -0.05));
	const cg = new THREE.Group(),
		cry = obsidianMesh(0.8);
	cg.add(cry);
	cg.position.set(0, 1.62, -0.05);
	g.add(cg);
	const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 28), pm);
	ring.position.set(0, 1.85, -0.05);
	g.add(ring);
	g.add(
		B(0.5, 0.55, 0.5, "#5E4C42", 0, 0.66, 0.82),
		B(0.56, 0.08, 0.56, "#3A302B", 0, 0.96, 0.82),
		B(0.2, 0.36, 0.03, "#151B24", 0, 0.6, 1.08),
	);
	const sl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.02), pm);
	sl.position.set(0, 0.6, 1.1);
	g.add(sl);
	g.add(Cy(0.12, 0.15, 0.9, 8, "#4A3C36", -0.85, 1.05, -0.7), Cy(0.15, 0.15, 0.08, 8, "#2A211E", -0.85, 1.52, -0.7));
	const hp = Cy(0.11, 0.11, 1.1, 8, "#D9480F", 0, 0, 0, GEO_PIPE);
	hp.rotation.z = Math.PI / 2;
	hp.position.set(1.45, 0.52, 0.4);
	g.add(hp);
	geoPipe(g, 1.98, 0.4, 0.58, 14);
	const hp2 = Cy(0.09, 0.09, 1, 8, "#D9480F", 0, 0, 0, GEO_PIPE);
	hp2.rotation.x = Math.PI / 2;
	hp2.position.set(-0.5, 0.5, -1.3);
	g.add(hp2);
	geoPipe(g, -0.5, -1.78, 0.55, 14);
	const sg = batSign(true);
	sg.scale.setScalar(0.7);
	sg.position.set(1.0, 1.75, -0.45);
	g.add(sg, B(0.06, 1.3, 0.06, "#3A302B", 1.0, 0.82, -0.5));
	g.userData = {
		sign: sg,
		puff: [-0.85, 1.6, -0.7],
		puffs: geoPuffs(g, 5),
		tick: (time) => {
			cg.rotation.y = time * 0.8;
			cg.position.y = 1.62 + Math.sin(time * 1.6) * 0.08;
			ring.rotation.x = Math.PI / 2 + Math.sin(time * 0.9) * 0.4;
			ring.rotation.z = time * 1.2;
			pm.emissiveIntensity = 0.7 + Math.sin(time * 2.4) * 0.3;
		},
	};
	return g;
}
let SCORCH_TEX = null;
function scorchTex() {
	return (
		SCORCH_TEX ||
		(SCORCH_TEX = canvasTex(128, 128, (x, w, h) => {
			x.fillStyle = "#2A1D19";
			x.fillRect(0, 0, w, h);
			const R = mulberry(11);
			x.strokeStyle = "#FF6A1F";
			x.lineWidth = 3;
			x.lineCap = "round";
			for (let k = 0; k < 9; k++) {
				let px = R() * w,
					py = R() * h;
				x.beginPath();
				x.moveTo(px, py);
				for (let s = 0; s < 4; s++) {
					px += (R() - 0.5) * 40;
					py += (R() - 0.5) * 40;
					x.lineTo(px, py);
				}
				x.stroke();
			}
			x.fillStyle = "rgba(42,29,25,.75)";
			x.beginPath();
			x.arc(64, 64, 34, 0, 7);
			x.fill();
			x.fillStyle = "#FFB15A";
			x.font = "900 46px Rubik, Arial";
			x.textAlign = "center";
			x.textBaseline = "middle";
			x.fillText("−5", 64, 67);
		}))
	);
}
/* the volcano's outer slope: from just under the rim road (r 30.2, y 7.9) down to the plain far below */
const CONE = { r0: 30.2, r1: 74, y0: 7.9, y1: -24 };
const coneY = (r) => CONE.y0 + (CONE.y1 - CONE.y0) * Math.max(0, Math.min(1, (r - CONE.r0) / (CONE.r1 - CONE.r0)));
/* molten-plate lava pattern (Voronoi cells with glowing seams), tileable N×N RGBA; shared by the crater lake and the flows on the outer slope */
let LAVA_PX = null;
function lavaPixels() {
	if (LAVA_PX) return LAVA_PX;
	const N = 256,
		d = new Uint8ClampedArray(N * N * 4),
		R = mulberry(5),
		P = [],
		mix = (a, b, t) => a + (b - a) * t;
	for (let k = 0; k < 22; k++) P.push([R() * N, R() * N, R()]);
	for (let py = 0; py < N; py++)
		for (let px = 0; px < N; px++) {
			let d1 = 1e9,
				d2 = 1e9,
				cell = 0;
			for (const [sx, sy, sh] of P) {
				let dx = Math.abs(px - sx),
					dy = Math.abs(py - sy);
				dx = Math.min(dx, N - dx);
				dy = Math.min(dy, N - dy);
				const q = dx * dx + dy * dy;
				if (q < d1) {
					d2 = d1;
					d1 = q;
					cell = sh;
				} else if (q < d2) d2 = q;
			}
			const edge = Math.sqrt(d2) - Math.sqrt(d1),
				seam = Math.max(0, 1 - edge / 5),
				glow = Math.max(0, 1 - edge / 16),
				core = Math.min(1, Math.sqrt(d1) / 30);
			let r = mix(236, 196, core) - cell * 18,
				g = mix(92, 54, core) - cell * 14,
				b = 22;
			r = mix(r, 255, glow * 0.6);
			g = mix(g, 150, glow * 0.55);
			r = mix(r, 255, seam);
			g = mix(g, 226, seam);
			b = mix(b, 110, seam);
			const i = (py * N + px) * 4;
			d[i] = r;
			d[i + 1] = g;
			d[i + 2] = b;
			d[i + 3] = 255;
		}
	return (LAVA_PX = { N, d });
}
function lavaTex(rep) {
	const { N, d } = lavaPixels(),
		c = document.createElement("canvas");
	c.width = c.height = N;
	const x = c.getContext("2d"),
		im = x.createImageData(N, N);
	im.data.set(d);
	x.putImageData(im, 0, 0);
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(rep, rep);
	return t;
}
/* outer-slope texture (u = round the cone, repeated twice; v = rim → foot): ash rock with smooth winding lava flows that spill from the rim,
   filled with the crater's molten plates, edged with dark cooled crust, warming the rock beside them; a few thin glowing cracks. Second canvas = glow only */
function coneTex() {
	const W_ = 2048,
		H_ = 896,
		R = mulberry(77),
		flows = [],
		cracks = [];
	for (let k = 0; k < 5; k++) {
		const x0 = ((k + 0.25 + R() * 0.5) / 5) * W_,
			end = H_ * (0.55 + R() * 0.4),
			w0 = 22 + R() * 16,
			f1 = 0.008 + R() * 0.006,
			f2 = 0.021 + R() * 0.01,
			a1 = 18 + R() * 26,
			a2 = 6 + R() * 8,
			ph = R() * 6,
			drift = (R() - 0.5) * 60,
			pts = [];
		for (let y = -6; y <= end; y += 6) {
			const t = Math.max(0, y) / end;
			pts.push([
				x0 + Math.sin(y * f1 + ph) * a1 + Math.sin(y * f2 + ph * 2) * a2 + drift * t,
				y,
				w0 * (0.75 + 0.45 * Math.sin(t * Math.PI * 0.85)) * (t > 0.9 ? 1 + (t - 0.9) * 4 : 1),
			]);
		}
		flows.push(pts);
		/* one or two side tongues branching off and thinning out */
		for (let b = 0; b < 1 + (R() < 0.5); b++) {
			const i0 = Math.floor(pts.length * (0.25 + R() * 0.4)),
				[bx, by, bw] = pts[i0],
				dir = R() < 0.5 ? -1 : 1,
				len = (end - by) * (0.35 + R() * 0.4),
				br = [];
			for (let s = 0; s <= len; s += 6) {
				const t = s / len;
				br.push([
					bx + dir * (Math.pow(t, 0.7) * (40 + R() * 3) + Math.sin(s * 0.03 + ph) * 6),
					by + s,
					bw * 0.6 * (1 - t * 0.65),
				]);
			}
			flows.push(br);
		}
	}
	for (let k = 0; k < 34; k++) {
		let x = R() * W_,
			y = 20 + R() * H_ * 0.85,
			a = (R() - 0.5) * 1.4;
		const c = [[x, y, 2.2]];
		for (let j = 0; j < 4 + R() * 5; j++) {
			a += (R() - 0.5) * 0.9;
			x += Math.sin(a) * 9;
			y += Math.cos(a) * 9;
			c.push([x, y, Math.max(0.9, 2.2 - j * 0.25)]);
		}
		cracks.push(c);
	}
	/* masks: flow body, molten core, heat glow (shadow-only trick so it blurs on every browser) */
	const layer = (wk, blur, withCracks) => {
		const c = document.createElement("canvas");
		c.width = W_;
		c.height = H_;
		const x = c.getContext("2d");
		x.lineCap = x.lineJoin = "round";
		x.strokeStyle = "#fff";
		if (blur) {
			x.shadowColor = "#fff";
			x.shadowBlur = blur;
			x.shadowOffsetX = -W_ * 4;
			x.translate(W_ * 4, 0);
		}
		const run = (list) =>
			list.forEach((p) => {
				for (let i = 1; i < p.length; i++) {
					x.lineWidth = Math.max(0.8, p[i][2] * wk);
					x.beginPath();
					x.moveTo(p[i - 1][0], p[i - 1][1]);
					x.lineTo(p[i][0], p[i][1]);
					x.stroke();
					[-W_, W_].forEach((o) => {
						if (p[i][0] + o > -60 && p[i][0] + o < W_ + 60) {
							x.beginPath();
							x.moveTo(p[i - 1][0] + o, p[i - 1][1]);
							x.lineTo(p[i][0] + o, p[i][1]);
							x.stroke();
						}
					});
				}
			});
		run(flows);
		if (withCracks) run(cracks);
		return x.getImageData(0, 0, W_, H_).data;
	};
	const body = layer(1, 0, true),
		core = layer(0.75, 0, true),
		glow = layer(1.5, 18, true);
	const { N, d: L } = lavaPixels(),
		mk = (draw) => {
			const c = document.createElement("canvas");
			c.width = W_;
			c.height = H_;
			const x = c.getContext("2d");
			draw(x);
			return [c, x, x.getImageData(0, 0, W_, H_)];
		};
	const [mc, mx, mi] = mk((x) => {
		const g = x.createLinearGradient(0, 0, 0, H_);
		g.addColorStop(0, "#5A4A42");
		g.addColorStop(1, "#43362F");
		x.fillStyle = g;
		x.fillRect(0, 0, W_, H_);
		for (let k = 0; k < 2600; k++) {
			x.fillStyle = R() < 0.5 ? "rgba(30,22,18,.18)" : "rgba(120,100,88,.12)";
			x.fillRect(R() * W_, R() * H_, 3 + R() * 14, 1.5 + R() * 4);
		}
	});
	const [ec, ex, ei] = mk((x) => {
		x.fillStyle = "#000";
		x.fillRect(0, 0, W_, H_);
	});
	const M = mi.data,
		E = ei.data,
		mix = (a, b, t) => a + (b - a) * t;
	for (let py = 0; py < H_; py++)
		for (let px = 0; px < W_; px++) {
			const i = (py * W_ + px) * 4,
				b = body[i + 3] / 255,
				c = core[i + 3] / 255,
				g = glow[i + 3] / 255;
			if (!b && !g) continue;
			const li = ((Math.floor(py * 1.4) % N) * N + (Math.floor(px * 1.4) % N)) * 4,
				s = c * c * (3 - 2 * c);
			/* warm rock → cooled crust edge → molten plates */
			let r = mix(M[i], 120, g * 0.45),
				gg = mix(M[i + 1], 52, g * 0.45),
				bb = mix(M[i + 2], 30, g * 0.45);
			r = mix(r, 52, b);
			gg = mix(gg, 22, b);
			bb = mix(bb, 14, b);
			r = mix(r, L[li], s);
			gg = mix(gg, L[li + 1], s);
			bb = mix(bb, L[li + 2], s);
			M[i] = r;
			M[i + 1] = gg;
			M[i + 2] = bb;
			E[i] = Math.max(g * 70, L[li] * s * 0.9);
			E[i + 1] = Math.max(g * 18, L[li + 1] * s * 0.8);
			E[i + 2] = L[li + 2] * s * 0.6;
		}
	mx.putImageData(mi, 0, 0);
	ex.putImageData(ei, 0, 0);
	return [mc, ec].map((c) => {
		const t = new THREE.CanvasTexture(c);
		t.wrapS = THREE.RepeatWrapping;
		t.repeat.set(2, 1);
		t.anisotropy = GFX.r ? GFX.r.capabilities.getMaxAnisotropy() : 8;
		return t;
	});
}
/* far scenery: the plain below the volcano and dark peaks on the horizon */
function volcanoBackdrop(s) {
	const R = mulberry(23),
		low = new THREE.Group();
	low.position.y = CONE.y1;
	s.add(low);
	ground(low, 300, 300, 80, 80, "#4A3C35");
	for (let i = 0; i < 20; i++) {
		const a = (i / 20) * Math.PI * 2 + R() * 0.2,
			d = 125 + R() * 25,
			h = 22 + R() * 26,
			r = 14 + R() * 10;
		const m = Cy(r * 0.14, r, h, 7, i % 2 ? "#5A4A42" : "#4E403A", Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d);
		m.castShadow = false;
		low.add(m);
		if (i % 5 === 2) {
			const c = new THREE.Mesh(
				new THREE.CircleGeometry(r * 0.12, 7),
				new THREE.MeshBasicMaterial({ color: "#FF7A2A" }),
			);
			c.rotation.x = -Math.PI / 2;
			c.position.set(Math.cos(a) * d, h - 1.05, Math.sin(a) * d);
			low.add(c);
		}
	}
}
/* prism under a ledge segment, in the segment's frame (x along, z across): top follows the road heights t0 → t1, bottom flat */
function prismGeo(L, w, n, top, bot, rr) {
	if (rr > 0.01) return sweptPrism(L, w, n, top, bot, Math.min(rr, w / 2 - 0.01));
	const g = new THREE.BoxGeometry(L, 1, w, n, 1, 1),
		p = g.attributes.position;
	for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) > 0 ? top(p.getX(i)) : bot);
	g.computeVertexNormals();
	return g;
}
/* same prism with rounded top edges: a closed cross-section (z across, dy below the top or on the flat bottom) swept along x, capped at both ends */
function sweptPrism(L, w, n, top, bot, rr) {
	const P = [[-w / 2, 0, 1]],
		K = 5;
	for (let k = 0; k <= K; k++) {
		const a = Math.PI - ((k / K) * Math.PI) / 2;
		P.push([-w / 2 + rr + Math.cos(a) * rr, -rr + Math.sin(a) * rr]);
	}
	for (let k = 0; k <= K; k++) {
		const a = Math.PI / 2 - ((k / K) * Math.PI) / 2;
		P.push([w / 2 - rr + Math.cos(a) * rr, -rr + Math.sin(a) * rr]);
	}
	P.push([w / 2, 0, 1]);
	const v = [],
		pt = (i, j) => {
			const x = -L / 2 + (L * i) / n,
				q = P[j];
			return [x, q[2] ? bot : top(x) + q[1], q[0]];
		},
		tri = (a, b, c) => v.push(...a, ...b, ...c);
	for (let i = 0; i < n; i++)
		for (let j = 0; j < P.length; j++) {
			const j2 = (j + 1) % P.length,
				A = pt(i, j),
				Bq = pt(i + 1, j),
				C = pt(i + 1, j2),
				D = pt(i, j2);
			tri(A, C, Bq);
			tri(A, D, C);
		}
	[0, n].forEach((i) => {
		const ring = P.map((_, j) => pt(i, j)),
			c = [0, 1, 2].map((k) => ring.reduce((t, p) => t + p[k], 0) / ring.length);
		for (let j = 0; j < ring.length; j++) {
			const j2 = (j + 1) % ring.length;
			if (i) tri(c, ring[j], ring[j2]);
			else tri(c, ring[j2], ring[j]);
		}
	});
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
	g.computeVertexNormals();
	return g;
}
/* ramp profile: level for the first and last ~1.7 m (so it meets the space flat), smooth S-curve between. f = 0..1 along the segment */
function rampF(f, L, da, db) {
	const d0 = da === undefined ? Math.min(1.7, L * 0.22) : da,
		d1 = db === undefined ? d0 : db;
	let u = (f * L - d0) / Math.max(0.01, L - d0 - d1);
	u = Math.max(0, Math.min(1, u));
	return u * u * (3 - 2 * u);
}
function rampClear(nd, n, self, ux, uz, ws) {
	let d = 1.9;
	n.next.concat(n.prev).forEach((k) => {
		if (k === self) return;
		const m = nd[k];
		if (m.br || n.br) return;
		let vx = m.x - n.x,
			vz = m.z - n.z;
		const vl = Math.hypot(vx, vz) || 1;
		vx /= vl;
		vz /= vl;
		const c = ux * vx + uz * vz,
			sn = Math.abs(ux * vz - uz * vx),
			wo = n.rim && m.rim ? ep("rimW") : ep("ledgeW");
		if (c < -0.2) return;
		d = Math.max(d, (wo + ws * Math.abs(c)) / Math.max(sn, 0.25) + 0.2);
	});
	return d;
}
/* a box of length L split into n pieces along x, each lifted to the height hf(x) */
function bentBox(L, h, w, n, hf, z, y) {
	const g = new THREE.BoxGeometry(L, h, w, n, 1, 1),
		p = g.attributes.position;
	for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i), p.getY(i) + y + hf(p.getX(i)), p.getZ(i) + z);
	g.computeVertexNormals();
	return g;
}
let CONE_TEX = null;
function volcanoScenery(s, map) {
	const R = mulberry(31),
		dummy = new THREE.Object3D();
	/* outer cone, roughened (top row stays round so it tucks under the rim road) */
	{
		const g = new THREE.CylinderGeometry(CONE.r0, CONE.r1, CONE.y0 - CONE.y1, 72, 8, true),
			p = g.attributes.position;
		for (let i = 0; i < p.count; i++) {
			const x = p.getX(i),
				z = p.getZ(i),
				y = p.getY(i),
				r = Math.hypot(x, z),
				f = (CONE.y0 - CONE.y1) / 2 - y;
			if (f < 0.5) continue;
			const k = 1 + noise(x * 0.6, z * 0.6) * 0.025;
			p.setX(i, x * k);
			p.setZ(i, z * k);
			p.setY(i, y + noise(z * 0.3, x * 0.3) * 0.8);
		}
		g.computeVertexNormals();
		const [map_, emi] = CONE_TEX || (CONE_TEX = coneTex()),
			m = new THREE.Mesh(
				varyColors(g),
				new THREE.MeshStandardMaterial({
					vertexColors: true,
					flatShading: true,
					roughness: 0.95,
					map: map_,
					emissive: "#FFFFFF",
					emissiveIntensity: 1,
					emissiveMap: emi,
					side: THREE.DoubleSide,
				}),
			);
		m.receiveShadow = true;
		m.position.y = (CONE.y0 + CONE.y1) / 2;
		s.add(edReg(m, "cone"));
	}
	/* the lava lake fills the crater; it rises and falls with the lava cycle */
	const tex = lavaTex(8),
		lava = new THREE.Mesh(new THREE.CircleGeometry(29.5, 72), new THREE.MeshBasicMaterial({ map: tex }));
	lava.rotation.x = -Math.PI / 2;
	lava.position.y = LAVA_Y[0];
	lava.userData.edStop = 1;
	s.add(lava);
	const glow = new THREE.PointLight("#FF6A2A", 1.4, 34, 1.4);
	glow.position.set(0, 2.4, 0);
	s.add(glow);
	/* basalt island with an obsidian crystal in the middle */
	const isl = new THREE.Group();
	s.add(isl);
	for (let k = 0; k < 7; k++) {
		const a = (k / 7) * Math.PI * 2,
			r = k ? 1.6 : 0,
			h = (k ? 3 + R() * 1.4 : 4.6) + 1.5;
		isl.add(Cy(1, 1.1, h, 6, k % 2 ? "#3A2C27" : "#2F2420", Math.cos(a) * r, h / 2 - 1.5, Math.sin(a) * r));
	}
	const cr = obsidianMesh(2.6);
	cr.position.y = 5.4;
	isl.add(edReg(cr, "crystal"));
	edReg(isl, "island");
	/* warm haze hanging just above the lava (two slowly turning layers). The puffs are an opaque black/white mask used as alphaMap with the tint in the material colour:
     a see-through canvas got its faint pixels un-premultiplied into wrong colours on phones (dark green specks crawling over the lava) */
	const hazeT = canvasTex(256, 256, (x, w, h) => {
		const HR = mulberry(41);
		x.fillStyle = "#000";
		x.fillRect(0, 0, w, h);
		for (let k = 0; k < 70; k++) {
			const px = HR() * w,
				py = HR() * h,
				r = 12 + HR() * 34,
				g = x.createRadialGradient(px, py, 0, px, py, r);
			g.addColorStop(0, "rgba(255,255,255,.32)");
			g.addColorStop(1, "rgba(255,255,255,0)");
			x.fillStyle = g;
			x.beginPath();
			x.arc(px, py, r, 0, 7);
			x.fill();
		}
	});
	const haze = [0.35, 0.9].map((dy, i) => {
		const m = new THREE.Mesh(
			new THREE.CircleGeometry(29.6, 48),
			new THREE.MeshBasicMaterial({
				alphaMap: hazeT,
				transparent: true,
				opacity: (i ? 0.55 : 0.8) * ep("haze"),
				depthWrite: false,
				color: i ? "#FFA977" : "#FF9762",
			}),
		);
		m.rotation.x = -Math.PI / 2;
		m.userData.dy = dy;
		m.renderOrder = 2;
		s.add(m);
		return m;
	});
	/* smoke drifting up from the lake */
	const smoke = [];
	for (let k = 0; k < 10; k++) {
		const m = new THREE.Mesh(
			new THREE.IcosahedronGeometry(1.6, 0),
			new THREE.MeshStandardMaterial({
				color: "#6A625E",
				transparent: true,
				opacity: 0.5,
				flatShading: true,
				depthWrite: false,
			}),
		);
		m.userData.t = k / 10;
		m.userData.a = R() * 6.28;
		m.userData.r = 4 + R() * 18;
		s.add(m);
		smoke.push(m);
	}
	/* wooden guard rail round the outer edge of the rim */
	{
		const r = 30.5,
			n = Math.ceil((Math.PI * 2 * r) / 2.4),
			pm = new THREE.InstancedMesh(
				new THREE.BoxGeometry(0.18, 0.9, 0.18),
				new THREE.MeshStandardMaterial({ color: "#7A5234", flatShading: true }),
				n,
			),
			rm = new THREE.InstancedMesh(
				new THREE.BoxGeometry(1, 0.12, 0.1),
				new THREE.MeshStandardMaterial({ color: "#B07B45", flatShading: true }),
				n * 2,
			),
			rc = r * Math.cos(Math.PI / n),
			len = 2 * r * Math.sin(Math.PI / n);
		for (let k = 0; k < n; k++) {
			const a = (k / n) * Math.PI * 2,
				am = ((k + 0.5) / n) * Math.PI * 2;
			dummy.position.set(Math.cos(a) * r, 8.45, Math.sin(a) * r);
			dummy.rotation.set(0, -a, 0);
			dummy.scale.set(1, 1, 1);
			dummy.updateMatrix();
			pm.setMatrixAt(k, dummy.matrix);
			[8.62, 8.25].forEach((y, j) => {
				dummy.position.set(Math.cos(am) * rc, y, Math.sin(am) * rc);
				dummy.rotation.set(0, -am + Math.PI / 2, 0);
				dummy.scale.set(len, 1, 1);
				dummy.updateMatrix();
				rm.setMatrixAt(k * 2 + j, dummy.matrix);
			});
		}
		pm.castShadow = true;
		s.add(pm, rm);
	}
	/* lamps, ore carts, crates and a mine headframe just outside the rim */
	const onCone = (d, r) => {
		const a = (d * Math.PI) / 180;
		return [Math.cos(a) * r, coneY(r), Math.sin(a) * r, a];
	};
	[100, 160, 215, 262, 318, 20, 62].forEach((d, i) => {
		const [x, y, z] = onCone(d, 31.3),
			g = new THREE.Group();
		g.position.set(x, y, z);
		g.add(
			Cy(0.08, 0.1, 6.4, 6, "#2A2F3A", 0, 0, 0),
			Cy(0.24, 0.18, 0.3, 8, "#FFE7A8", 0, 3.2, 0, { emissive: "#FFC860", emissiveIntensity: 1 }),
		);
		s.add(edReg(g, "lamp" + i));
	});
	[
		[232, 0],
		[48, 1],
		[292, 2],
	].forEach(([d, i]) => {
		const [x, y, z, a] = onCone(d, 32),
			g = new THREE.Group();
		g.position.set(x, y, z);
		g.rotation.y = -a;
		s.add(g);
		edReg(g, "cart" + i);
		g.add(Cy(1.4, 1.9, 3.4, 7, "#4E403A", 0, -1.55, 0));
		if (i === 1) {
			g.add(
				B(1.1, 1.4, 1.1, "#9C6B44", 0, 0.5, -0.7),
				B(0.9, 1.2, 0.9, "#8E5F3A", 0.1, 0.4, 0.6),
				B(0.7, 0.6, 0.7, "#A47249", 0, 1.4, -0.6),
			);
			return;
		}
		g.add(B(1.3, 0.6, 1.8, "#6A717E", 0, 0.75, 0), B(1.6, 0.4, 2.2, "#4E403A", 0, 0.1, 0));
		for (let k = 0; k < 4; k++) {
			const r_ = mesh(new THREE.DodecahedronGeometry(0.3, 0), "#7A6A60");
			r_.position.set((R() - 0.5) * 0.7, 1.2, (R() - 0.5) * 1.1);
			g.add(r_);
		}
	});
	{
		const [x, y, z, a] = onCone(243, 33),
			hf = new THREE.Group();
		hf.position.set(x, y, z);
		hf.rotation.y = -a + Math.PI / 2;
		s.add(hf);
		[
			[-1, -1],
			[1, -1],
			[-1, 1],
			[1, 1],
		].forEach(([px, pz]) => {
			const l = B(0.2, 10, 0.2, "#8A5A30", px * 0.9, 1.7, pz * 0.7);
			l.rotation.set(-pz * 0.06, 0, px * 0.08);
			hf.add(l);
		});
		[2, 3.5, 5].forEach((yy) =>
			hf.add(B(2, 0.14, 0.14, "#8A5A30", 0, yy, 0.7), B(2, 0.14, 0.14, "#8A5A30", 0, yy, -0.7)),
		);
		hf.add(B(2.4, 0.25, 1.8, "#6B4426", 0, 6.4, 0));
		const wh = mesh(new THREE.TorusGeometry(0.7, 0.1, 6, 14), "#3A404C");
		wh.position.set(0, 7, 0);
		hf.add(wh);
		edReg(hf, "headframe");
	}
	{
		const [x, y, z] = onCone(262, 33.5),
			sg = signBoard("VOLCANO QUARRY", { style: "wood", w: 13, h: 2.6, col: "#FFB15A" }),
			g = new THREE.Group();
		g.position.set(x, y, z);
		g.rotation.y = 0.1;
		s.add(g);
		sg.position.set(0, 6.6, 0);
		sg.rotation.x = -0.14;
		g.add(sg);
		[-4.6, 4.6].forEach((px) => g.add(B(0.36, 10.5, 0.36, "#5E3A20", px, 1.4, -0.3)));
		edReg(g, "sign");
	}
	return { lava, tex, glow, cr, smoke, haze };
}
/* per-frame volcano board: lava level follows the round, flooded tiles show a floating crust, geyser steam, smoke, eruption fireworks */
function aimGy(nd, a, ti) {
	const n = nd[a.node],
		tg = nd[ti],
		Y = (m) => m.y || 0;
	if (!tg) return;
	a.tg = ti;
	const rel = Math.atan2(-(tg.x - n.x), -(tg.z - n.z)) - a.tl.userData.auto,
		d = 0.98;
	a.ch.rotation.set(-Math.PI / 2, 0, rel);
	a.ch.position.set(-Math.sin(rel) * d, 0.54, -Math.cos(rel) * d);
	a.curve.v0.set(n.x, Y(n) + 0.9, n.z);
	a.curve.v2.set(tg.x, Y(tg) + 0.9, tg.z);
	a.curve.v1.copy(a.curve.v0).lerp(a.curve.v2, 0.5);
	a.curve.v1.y = Math.max(a.curve.v0.y, a.curve.v2.y) + a.curve.v0.distanceTo(a.curve.v2) * 0.35 + 1.5;
	a.ring.position.set(tg.x, Y(tg) + 0.56, tg.z);
}
function stepGyArcs(bd, time) {
	bd.gyArcs.forEach((g) => {
		const ti = G.gyT && G.gyT[g.node] !== undefined ? G.gyT[g.node] : MAP.nodes[g.node].gy;
		if (ti !== g.tg) aimGy(MAP.nodes, g, ti);
		g.dots.forEach((m, k) => {
			const u = (k / g.dots.length + time * 0.16) % 1;
			g.curve.getPoint(u, m.position);
			m.material.opacity = 0.37 * Math.sin(u * Math.PI);
		});
		g.ring.scale.setScalar(1 + Math.sin(time * 3.2) * 0.05);
	});
}
function stepVolcano(bd, dt, time) {
	stepGyArcs(bd, time);
	const vx = bd.vx,
		ty = LAVA_Y[G.phase === "lobby" ? 0 : lavaLv(G.round)],
		s = bd.scene;
	if (!bd.lavaSet) {
		bd.lavaSet = true;
		vx.lava.position.y = ty;
	}
	const ly = (vx.lava.position.y += (ty - vx.lava.position.y) * Math.min(1, dt * 0.9));
	vx.tex.offset.set((time * 0.012) % 1, (time * 0.009) % 1);
	vx.haze.forEach((m, i) => {
		m.position.y = ly + m.userData.dy;
		m.rotation.z = time * (i ? -0.012 : 0.008);
	});
	vx.glow.position.y = ly + 2.5;
	vx.glow.intensity = (1.3 + Math.sin(time * 2.3) * 0.15) * (typeof bd.edp.glow === "number" ? bd.edp.glow : 1);
	vx.cr.rotation.y = time * 0.3;
	Object.keys(bd.scorch).forEach((i) => {
		const n = MAP.nodes[i],
			m = bd.scorch[i];
		m.visible = !!(flooded(+i, G.round) && ly > n.y + 0.05);
		if (m.visible) m.position.y = Math.max(0.6, ly - n.y + 0.07) / m.parent.scale.y;
		if (bd.obCr[i]) bd.obCr[i].visible = !m.visible;
		if (bd.obs[i]) bd.obs[i].visible = !m.visible;
	});
	bd.vents.forEach((v, j) =>
		v.ps.forEach((p) => {
			const u = (p.userData.t = (p.userData.t + dt * 0.55) % 1);
			p.position.set(
				v.x + Math.sin(u * 6 + j) * (0.12 + u * 0.5),
				0.45 + u * 3.4,
				v.z + Math.cos(u * 4 + j) * (0.12 + u * 0.5),
			);
			p.scale.setScalar(0.3 + u * 1.7);
			p.material.opacity = 0.42 * Math.sin(Math.min(1, u * 1.4) * Math.PI);
		}),
	);
	vx.smoke.forEach((m) => {
		const d = m.userData,
			u = (d.t = (d.t + dt * 0.04) % 1);
		m.position.set(Math.cos(d.a) * d.r + u * 4, ly + 0.5 + u * 16, Math.sin(d.a) * d.r - u * 3);
		m.scale.setScalar(0.6 + u * 2.4);
		m.material.opacity = 0.45 * Math.sin(u * Math.PI);
	});
	const er = G.erupt;
	if (bd.eruptN === undefined) bd.eruptN = er ? er.n : null;
	else if (er && er.n !== bd.eruptN) {
		bd.eruptN = er.n;
		bd.eruptT = time;
		bd.bombs = (er.hits || []).map((h, j) => {
			const m = mesh(new THREE.IcosahedronGeometry(0.45, 0), "#FF7A2A", { emissive: "#FF4A10", emissiveIntensity: 1 });
			m.visible = false;
			s.add(m);
			return { m, n: MAP.nodes[h], t0: 0.5 + j * 0.35, hit: false };
		});
		sfx("thunder");
	}
	if (bd.eruptT !== undefined) {
		const k = time - bd.eruptT;
		if (k < 2.6 && Math.floor(k / 0.12) !== bd.eruptF) {
			bd.eruptF = Math.floor(k / 0.12);
			burst(s, (Math.random() - 0.5) * 3, ly + 0.5, (Math.random() - 0.5) * 3, {
				n: 9,
				shape: "ico",
				cols: ["#FF7A2A", "#FFD24A", "#E8420F", "#3A2C27"],
				spd: 5,
				up: 16,
				grav: 12,
				life: 1.7,
				size: 1.8,
			});
		}
		(bd.bombs || []).forEach((b) => {
			const f = (k - b.t0) / 1.2;
			if (f < 0 || b.hit) return;
			b.m.visible = true;
			const e = Math.min(1, f),
				n = b.n;
			b.m.position.set(n.x * e, ly + Math.sin(e * Math.PI) * 16 + (n.y + 0.6 - ly) * e, n.z * e);
			b.m.rotation.x += dt * 8;
			if (f >= 1) {
				b.hit = true;
				s.remove(b.m);
				burst(s, n.x, n.y + 0.7, n.z, {
					n: 22,
					shape: "ico",
					cols: ["#FF7A2A", "#FFD24A", "#3A2C27", "#7A3CFF"],
					spd: 4,
					up: 6,
					grav: 10,
					life: 1.1,
				});
				sfx("crush");
			}
		});
		if (k > 6) {
			(bd.bombs || []).forEach((b) => s.remove(b.m));
			bd.bombs = null;
			bd.eruptT = undefined;
		}
	}
}
/* a space's tile turns with the road under it: yaw = average of the incoming and outgoing direction (flipped so icons stay readable from the camera), bridge tiles also pitch with the deck */
/* rock pillar under a space, top flush with the causeway tops (y +0.035), straight sides, turned with the road (flat faces parallel to it) and its corners just inside the causeway width so none poke out; top edge rounded like the ledges when edgeRound > 0 */
function pillarMesh(r, h, sides, rr, col, x, z, yaw) {
	rr = Math.min(rr, r * 0.9, h * 0.5);
	let m;
	if (rr < 0.01) m = Cy(r, r, h, sides, col, x, -h / 2 + 0.035, z);
	else {
		const P = [new THREE.Vector2(0, -h), new THREE.Vector2(r, -h)];
		for (let k = 0; k <= 5; k++) {
			const a = ((k / 5) * Math.PI) / 2;
			P.push(new THREE.Vector2(r - rr + Math.cos(a) * rr, -rr + Math.sin(a) * rr));
		}
		P.push(new THREE.Vector2(0, 0));
		m = mesh(new THREE.LatheGeometry(P, sides), col);
		m.position.set(x, 0.035, z);
	}
	m.rotation.y = (yaw || 0) + Math.PI / sides;
	return m;
}
function tileGroup(nd, n) {
	const g = new THREE.Group(),
		a = nd[n.prev[0]],
		b = nd[n.next[0]],
		Y = (m) => m.y || 0;
	g.position.set(n.x, 0, n.z);
	let dx = 0,
		dz = 0,
		dy = 0,
		L = 0;
	[
		[a, n],
		[n, b],
	].forEach(([p, q]) => {
		if (!p || !q || p === q) return;
		const vx = q.x - p.x,
			vz = q.z - p.z,
			l = Math.hypot(vx, vz);
		if (l < 0.01 || l > 9) return;
		dx += vx / l;
		dz += vz / l;
		dy += Y(q) - Y(p);
		L += l;
	});
	if (Math.hypot(dx, dz) < 0.2) return g;
	let ang = Math.atan2(dz, dx);
	if (Math.cos(ang) < 0) {
		ang += Math.PI;
		dy = -dy;
	}
	g.rotation.y = -ang;
	if (n.br && L) g.rotation.z = Math.atan2(dy, L);
	return g;
}
/* yaw inside a tile group that points "up" (local -z) toward the space m, snapped to the road axis so it lines up with the tile and turns with it */
function tileAim(tl, n, m) {
	if (!m) return 0;
	const q = Math.PI / 2,
		rel = Math.atan2(-(m.x - n.x), -(m.z - n.z)) - tl.userData.auto;
	return Math.round(rel / q) * q;
}
function buildBoardFor(map) {
	applyMapEdits(map);
	const vol = map.id === "volcano",
		s = new THREE.Scene();
	s.background = new THREE.Color("#9FD4F5");
	s.fog = vol ? new THREE.Fog("#9FD4F5", 95, 240) : new THREE.Fog("#9FD4F5", 48, 115);
	{
		const sun = lights(s, true),
			hemi = s.children.find((o) => o.isHemisphereLight);
		sun.intensity = 0.86;
		if (hemi) hemi.intensity = 0.68;
		if (vol) {
			sun.color.set("#FFE2C2");
			const c = sun.shadow.camera;
			c.left = c.bottom = -35;
			c.right = c.top = 35;
			c.far = 110;
			c.updateProjectionMatrix();
		}
	}
	if (vol) volcanoBackdrop(s);
	else {
		ground(s, 150, 150, 19, 21, map.ground);
		mountains(s);
	}
	const road = map.id === "junk" ? "#4A4E57" : vol ? "#7D6B5C" : "#434956",
		H = 0.12,
		nd = map.nodes,
		Y = (n) => n.y || 0,
		pebbles = [],
		V = new THREE.Vector3(),
		rw = ep("roadW"),
		pebK = ep("pebbles");
	let segK = 0;
	map.rampD = {};
	nd.forEach((na) =>
		na.next.forEach((j) => {
			const nb = nd[j],
				a = [na.x, na.z],
				b = [nb.x, nb.z],
				dx = b[0] - a[0],
				dz = b[1] - a[1],
				L = Math.hypot(dx, dz),
				ang = Math.atan2(dz, dx);
			/* each road piece lives in a group along the segment, pitched for ramps (local x runs from a to b) */
			const dy = Y(nb) - Y(na),
				L3 = Math.hypot(L, dy),
				k3 = L3 / L,
				g = new THREE.Group(),
				gi = new THREE.Group(),
				bridge = na.br || nb.br;
			g.position.set((a[0] + b[0]) / 2, (Y(na) + Y(nb)) / 2, (a[1] + b[1]) / 2);
			g.rotation.y = -ang;
			gi.rotation.z = Math.atan2(dy, L);
			g.add(gi);
			s.add(g);
			g.userData.st = 1;
			/* volcano: each ledge is a rock causeway standing in the lava lake; gravel track with tyre ruts and loose stones instead of tarmac */
			if (vol && !bridge) {
				const rim = na.rim && nb.rim,
					ws = rim ? ep("rimW") : ep("ledgeW"),
					ux = dx / L,
					uz = dz / L;
				const da = Math.abs(dy) > 0.05 ? Math.min(L * 0.42, rampClear(nd, na, j, ux, uz, ws)) : 0,
					db = Math.abs(dy) > 0.05 ? Math.min(L * 0.42, rampClear(nd, nb, nd.indexOf(na), -ux, -uz, ws)) : 0;
				map.rampD[nd.indexOf(na) + "-" + j] = [da, db, L];
				/* overlapping causeways at a junction get different heights (2.5 cm apart) so their surfaces never fight; kept small so every causeway meets its pillar top flush */
				const lift = (segK++ % 3) * 0.025,
					gy = g.position.y,
					y0 = Y(na) - gy,
					y1 = Y(nb) - gy,
					hf = (x) => y0 + lift + (y1 - y0) * rampF((x + L / 2) / L, L, da, db),
					n = Math.abs(dy) > 0.05 ? Math.ceil(L / 0.7) : 1;
				const rd = mesh(bentBox(L, H, rw, n, hf, 0, H / 2), road);
				rd.castShadow = false;
				g.add(rd);
				[-0.24 * rw, 0.24 * rw].forEach((o) => {
					const r = mesh(bentBox(L - 0.4, 0.06, 0.26, n, hf, o, H + 0.0), "#5C4C40");
					r.castShadow = false;
					g.add(r);
				});
				const m = mesh(
					prismGeo(L, ws * 2, n, (x) => hf(x) - 0.03, -1.6 - gy, ep("edgeRound")),
					rim ? "#5E4C42" : "#4A3C36",
					{ roughness: 0.95 },
				);
				m.castShadow = false;
				g.add(m);
				/* loose stones between the road and the ledge edge (never past where the rounded edge starts): sparse in most places, packed clumps of bigger stones where a low-frequency noise peaks */
				g.updateMatrixWorld(true);
				const PR = mulberry(Math.round(L * 1000) + segK),
					rr = ep("edgeRound"),
					zin = rw / 2 - 0.15,
					zout = Math.max(zin + 0.2, ws - rr * 0.8 - 0.1),
					cnt = Math.round(L * (zout - zin) * 2 * 4 * pebK);
				for (let q = 0; q < cnt; q++) {
					const lx = (PR() - 0.5) * (L - 1.2),
						lz0 = (PR() < 0.5 ? -1 : 1) * (zin + PR() * (zout - zin));
					V.set(lx, 0, lz0).applyMatrix4(g.matrixWorld);
					const cl = Math.max(
						0,
						Math.min(1, (noise(V.x * 2.3 + 40, V.z * 2.3) + 0.25 * noise(V.z * 6, V.x * 6) - 0.45) / 1.1),
					);
					if (PR() > 0.12 + cl * cl * 1.3) continue;
					const k = 0.55 + cl * 1.2 + PR() * 0.45,
						lz = Math.sign(lz0) * Math.min(Math.abs(lz0), zout - 0.1 * k);
					V.set(lx, hf(lx) - 0.03 + 0.03 * k, lz).applyMatrix4(g.matrixWorld);
					pebbles.push([V.x, V.y, V.z, k, PR()]);
				}
				return;
			}
			const seg = B(L3, H, rw, vol && bridge ? "#7A5234" : road, 0, H / 2, 0);
			seg.castShadow = false;
			gi.add(seg);
			if (vol) {
				if (bridge)
					[-1.15, 1.15].forEach((o) => {
						gi.add(B(L3, 0.14, 0.12, "#C9762E", 0, 0.75, o));
						for (let d = 0.6; d < L3; d += 1.3) gi.add(B(0.12, 0.7, 0.12, "#8A5A30", d - L3 / 2, 0.4, o));
						gi.add(B(L3, 0.3, 0.2, "#5A3A22", 0, -0.12, o));
					});
				return;
			}
			// edge lines stop at the tile, and short of any road that joins on that side, so they never cross another road
			const ux = dx / L,
				uz = dz / L,
				px = -Math.sin(ang),
				pz = Math.cos(ang);
			const trim = (n, self, fx, fz, o) => {
				const others = n.next.concat(n.prev || []).filter((k) => k !== self);
				let t = 0.62;
				others.forEach((k) => {
					const m = nd[k],
						vx = m.x - n.x,
						vz = m.z - n.z,
						vl = Math.hypot(vx, vz) || 1;
					const side = (vx * px + vz * pz) / vl,
						fwd = (vx * fx + vz * fz) / vl;
					if (side * o > 0.05) t = Math.max(t, (rw / 2 + 0.04 + (rw / 2 + 0.02) * fwd) / Math.abs(side) + 0.05);
				});
				return Math.min(t, L);
			};
			[-(rw / 2 + 0.02), rw / 2 + 0.02].forEach((o) => {
				const t0 = trim(na, j, ux, uz, o),
					t1 = trim(nb, nd.indexOf(na), -ux, -uz, o),
					len = L - t0 - t1;
				if (len <= 0.05) return;
				const mid = t0 + len / 2;
				const e = B(len * k3, H + 0.06, 0.08, "#E9EDF2", (mid - L / 2) * k3, H / 2 + 0.01, o);
				e.castShadow = false;
				gi.add(e);
			});
			for (let d = 1.5; d < L - 1.4; d += 0.9) {
				const y = B(0.45, H + 0.1, 0.1, "#FFC83D", (d - L / 2) * k3, H / 2 + 0.01, 0);
				y.castShadow = false;
				gi.add(y);
			}
		}),
	);
	const belts = [],
		crushers = [],
		vents = [],
		scorch = {},
		obCr = {},
		nodeG = [],
		gyArcs = [];
	nd.forEach((n, i) => {
		const ng = new THREE.Group();
		ng.position.y = Y(n);
		s.add(ng);
		const cf = Cy(rw / 2 + 0.05, rw / 2 + 0.05, H + 0.005, 16, vol && n.br ? "#7A5234" : road, n.x, H / 2, n.z);
		cf.castShadow = false;
		ng.add(cf);
		if (vol && !n.br) {
			const h = Y(n) + 1.58,
				pr = (n.rim ? ep("rimW") : ep("ledgeW")) * 0.98 * ep("pillarR"),
				pc = pillarMesh(
					pr,
					h,
					ep("pillarSides"),
					ep("edgeRound"),
					n.rim ? "#5E4C42" : "#4A3C36",
					n.x,
					n.z,
					tileGroup(nd, n).rotation.y,
				);
			pc.castShadow = false;
			ng.add(pc);
		}
		const t = n.t,
			x = n.x,
			z = n.z,
			tl = tileGroup(nd, n),
			ne = EDC.n[i] || {},
			sides = ep("tileSides");
		ng.add(tl);
		ng.userData = { st: 1, node: i, tl };
		nodeG[i] = ng;
		tl.userData.auto = tl.rotation.y;
		tl.rotation.y += ne.r || 0;
		tl.scale.setScalar(ep("tileR") * (ne.s || 1));
		const base = Cy(1.22, 1.3, 0.22, sides, "#1E2530", 0, 0.2, 0);
		base.rotation.y = Math.PI / sides;
		tl.add(base);
		tl.add(tileFace(t, sides));
		if (t === "CV" && n.conv) {
			const tgt = nd[n.conv.dir > 0 ? n.next[0] : n.prev[0]],
				ddx = tgt.x - x,
				ddz = tgt.z - z,
				tex = beltTex();
			const g = new THREE.Group();
			g.position.set(0, 0.515, 0);
			g.rotation.y = tileAim(tl, n, tgt);
			const p = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.6), new THREE.MeshBasicMaterial({ map: tex }));
			p.rotation.x = -Math.PI / 2;
			g.add(p);
			g.add(B(0.12, 0.18, 1.7, "#FFC83D", -0.68, 0.05, 0), B(0.12, 0.18, 1.7, "#FFC83D", 0.68, 0.05, 0));
			tl.add(g);
			belts.push(tex);
		}
		if (t === "CR") {
			const g = new THREE.Group();
			g.position.set(x, 0, z);
			g.add(
				B(0.22, 3.6, 0.22, "#6A717E", -1.1, 1.8, 0),
				B(0.22, 3.6, 0.22, "#6A717E", 1.1, 1.8, 0),
				B(2.6, 0.3, 0.4, "#FFC83D", 0, 3.6, 0),
			);
			const blk = B(1.5, 0.6, 1.5, "#3A4150", 0, 3, 0);
			g.add(blk);
			const st = B(1.52, 0.14, 1.52, "#FFC83D", 0, 2.72, 0);
			g.add(st);
			blk.userData.dyn = st.userData.dyn = 1;
			ng.add(g);
			crushers.push({ blk, st, ph: i * 0.7 });
		}
		if (t === "SH") {
			const sp = textSprite("SHOP", "#1FB5A8", "#fff", 1.7);
			sp.position.set(x, 2.3, z);
			ng.add(sp);
		}
		if (t === "SD") {
			const gl = shardGlow(2.4, 0.28);
			gl.position.set(x, 0.9, z);
			ng.add(gl);
		}
		if (t === "OB") {
			const c = obsidianMesh(0.7);
			c.position.set(x + 0.85, 0.45, z - 0.55);
			ng.add(c);
			obCr[i] = c;
			c.userData.dyn = 1;
			const gl = shardGlow(2.6, 0.3);
			gl.position.set(x, 0.9, z);
			ng.add(gl);
		}
		/* geyser: chevron on the tile edge pointing at the landing space (turns with the tile), a dotted steam arc to it and a pulsing ring round it; re-aimed when the target changes each round */
		if (t === "GY" && n.gy !== undefined) {
			const ch = new THREE.Mesh(
				new THREE.PlaneGeometry(0.62, 0.62),
				new THREE.MeshBasicMaterial({
					map: chevTex(),
					transparent: true,
					opacity: 0.5,
					depthWrite: false,
					polygonOffset: true,
					polygonOffsetFactor: -4,
					polygonOffsetUnits: -8,
				}),
			);
			tl.add(ch);
			const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()),
				dots = [];
			for (let k = 0; k < 18; k++) {
				const m = new THREE.Mesh(
					new THREE.IcosahedronGeometry(0.17, 0),
					new THREE.MeshBasicMaterial({ color: "#E3E7EC", transparent: true, opacity: 0.6, depthWrite: false }),
				);
				s.add(m);
				dots.push(m);
			}
			const ring = new THREE.Mesh(
				new THREE.TorusGeometry(1.45 * ep("tileR"), 0.08, 6, 28),
				new THREE.MeshStandardMaterial({
					color: "#C9D1DA",
					emissive: "#E3E7EC",
					emissiveIntensity: 0.35,
					transparent: true,
					opacity: 0.45,
					depthWrite: false,
				}),
			);
			ring.rotation.x = Math.PI / 2;
			s.add(ring);
			const arc = { node: i, tl, ch, curve, dots, ring, tg: -1 };
			aimGy(nd, arc, n.gy);
			gyArcs.push(arc);
		}
		/* geyser tile: a pale sinter mound with a sulphur-stained vent in the middle, light mist rising out of it */
		/* geyser tile: the face is the crater rim around a wide dark vent (see tileFace), sulphur-stained lip, light mist rising out of it */
		if (t === "GY") {
			const ps = [];
			for (let k = 0; k < 8; k++) {
				const p = new THREE.Mesh(
					new THREE.IcosahedronGeometry(0.3, 0),
					new THREE.MeshStandardMaterial({
						color: "#F4F6F9",
						transparent: true,
						opacity: 0.45,
						flatShading: true,
						depthWrite: false,
					}),
				);
				p.userData.t = k / 8;
				ng.add(p);
				ps.push(p);
			}
			vents.push({ x, z, ps });
		}
		if (n.br && !nd.some((m) => !m.br && Math.hypot(m.x - x, m.z - z) < 2.6)) {
			const pl = B(0.6, Y(n) + 1.4, 0.6, "#5A3A22", x, -(Y(n) + 1.4) / 2, z);
			ng.add(pl);
		}
		if (vol && n.lv) {
			const m = new THREE.Mesh(
				new THREE.CircleGeometry(1.36, sides),
				new THREE.MeshBasicMaterial({
					map: scorchTex(),
					polygonOffset: true,
					polygonOffsetFactor: -3,
					polygonOffsetUnits: -6,
				}),
			);
			m.rotation.set(-Math.PI / 2, 0, Math.PI / sides - Math.PI / 2);
			m.position.set(0, 0.6, 0);
			m.visible = false;
			tl.add(m);
			scorch[i] = m;
		}
	});
	if (pebbles.length) {
		const im = new THREE.InstancedMesh(
				new THREE.DodecahedronGeometry(0.13, 0),
				new THREE.MeshStandardMaterial({ color: "#FFFFFF", flatShading: true, roughness: 0.9 }),
				pebbles.length,
			),
			dm = new THREE.Object3D(),
			c = new THREE.Color();
		pebbles.forEach(([x, y, z, k, r], i) => {
			dm.position.set(x, y, z);
			dm.rotation.set(r * 3, r * 7, 0);
			dm.scale.set(k, k * 0.7, k);
			dm.updateMatrix();
			im.setMatrixAt(i, dm.matrix);
			c.set(r < 0.5 ? "#6A5A4E" : "#8C7A6A");
			im.setColorAt(i, c);
		});
		s.add(im);
	}
	const vx = vol ? volcanoScenery(s, map) : null;
	const cart = vol ? buildCartRails(s, map) : null,
		badge = stepBadge(),
		rideCart = vol ? cartMesh() : null;
	s.add(badge.g);
	if (rideCart) {
		rideCart.visible = false;
		s.add(rideCart);
	}
	if (map.id === "junk") junkScenery(s);
	else if (!vol) classicScenery(s);
	const fac = new THREE.Group(),
		ring = new THREE.Mesh(
			new THREE.TorusGeometry(1.35, 0.09, 6, 24),
			new THREE.MeshStandardMaterial({ color: "#FFC83D", emissive: "#FFB000", emissiveIntensity: 0.9 }),
		);
	ring.rotation.x = Math.PI / 2;
	ring.position.y = 0.56;
	const bld = FAC_MODELS[vol ? FAC_LOOK.volc : FAC_LOOK.def](),
		puffs = bld.userData.puffs;
	fac.add(ring, bld);
	s.add(fac);
	/* Volcano Quarry refineries: a gate across the road at each RF space, turned with the road, pipe on the side nearer the crater centre (movable in the map editor as "ref<space>") */
	const refs = [];
	if (vol)
		nd.forEach((n, i) => {
			if (!n.ref) return;
			const a = nd[n.next[0]],
				b = nd[n.prev[0]] || n,
				yaw = -Math.atan2(a.z - b.z, a.x - b.x),
				px = Math.sin(yaw),
				pz = Math.cos(yaw);
			const sd = Math.hypot(n.x + px * 2, n.z + pz * 2) < Math.hypot(n.x - px * 2, n.z - pz * 2) ? 1 : -1,
				g = geoRefinery(rw / 2, sd);
			g.position.set(n.x, Y(n), n.z);
			g.rotation.y = yaw;
			g.userData.node = i;
			s.add(edReg(g, "ref" + i));
			g.userData.base = g.position.clone();
			refs.push(g);
		});
	const clouds = [];
	for (let i = 0; i < 8; i++) {
		const c = cloud();
		c.scale.setScalar(0.5 + Math.random() * 0.2);
		c.position.set(
			-60 + i * 16,
			(vol ? 26 : 7) + Math.random() * 3,
			(i % 2 ? 28 + Math.random() * 10 : -29 - Math.random() * 14) * (vol ? 1.7 : 1),
		);
		s.add(c);
		clouds.push(c);
	}
	const hl = new THREE.Mesh(
		new THREE.RingGeometry(1.25, 1.55, 24),
		new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.8 }),
	);
	hl.rotation.x = -Math.PI / 2;
	hl.position.y = 0.53;
	s.add(hl);
	/* fork choices: a big floating number over each road's first space (matches the numbered buttons) */
	const arrows = [0, 1, 2].map((k) => {
		const g = new THREE.Group(),
			tex = canvasTex(128, 128, (x) => {
				x.fillStyle = "#151B24";
				x.beginPath();
				x.arc(64, 64, 58, 0, Math.PI * 2);
				x.fill();
				x.fillStyle = "#FFC83D";
				x.beginPath();
				x.arc(64, 64, 50, 0, Math.PI * 2);
				x.fill();
				x.fillStyle = "#151B24";
				x.font = "900 76px Bungee, Rubik, Arial";
				x.textAlign = "center";
				x.textBaseline = "middle";
				x.fillText(String(k + 1), 64, 70);
			}),
			sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
		sp.renderOrder = 5;
		sp.scale.set(1.7, 1.7, 1);
		g.add(sp);
		g.visible = false;
		s.add(g);
		return g;
	});
	let rival = null;
	if (map.rival) {
		rival = buildRival();
		const h = nd[map.rivalHome];
		rival.position.set(h.x + 1.3, 0, h.z + 1.3);
		s.add(rival);
	}
	applySky(s, map.id === "junk" ? "junk" : vol ? "volc" : "def");
	return {
		scene: s,
		map,
		fac,
		ring,
		bld,
		puffs,
		clouds,
		hl,
		belts,
		crushers,
		arrows,
		rival,
		refs,
		cart,
		badge,
		rideCart,
		crys: vol ? EDC.reg.crystal : null,
		crysK: 1,
		loose: {},
		traps: {},
		obs: {},
		facIdx: -1,
		facTarget: null,
		vents,
		scorch,
		obCr,
		vx,
		nodeG,
		gyArcs,
		reg: EDC.reg,
		edp: EDC.p,
	};
}
function setBoardMap(id) {
	const map = MAPS[id] || CLASSIC;
	if (GFX.board && GFX.board.map === map) return;
	if (GFX.board) Object.values(GFX.tok).forEach((t) => GFX.board.scene.remove(t.g));
	GFX.tok = {};
	GFX.boards = GFX.boards || {};
	const bd = GFX.boards[map.id] || (GFX.boards[map.id] = mergeStatic(buildBoardFor(map)));
	GFX.board = bd;
	bd.scene.add(GFX.cam);
	if (!GFX.camLight) {
		GFX.camLight = new THREE.PointLight("#ffffff", 0.6, 20);
		GFX.cam.add(GFX.camLight);
	}
	GFX.camPos = null;
	initCamInput();
}
/* where the factory building stands next to its tile: beside the road at the first offset where its whole footprint stays clear of every road (bridges and other ledges included)
   and of refinery gates; among clear spots, outside the loop on the outer edge, behind the road (seen from the camera) elsewhere. ok = false when nothing fits (pickFactory skips it) */
const FAC_FOOT = [
	[-1.35, -1.05],
	[1.35, -1.05],
	[-1.35, 1.45],
	[1.35, 1.45],
	[0, -1.05],
	[0, 1.45],
	[-1.35, 0.2],
	[1.35, 0.2],
	[0, 0.2],
];
function segDist(px, pz, a, b) {
	const dx = b.x - a.x,
		dz = b.z - a.z,
		l2 = dx * dx + dz * dz || 1,
		t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / l2));
	return Math.hypot(px - a.x - dx * t, pz - a.z - dz * t);
}
function facSpot(idx) {
	const map = MAP,
		cache = map._fs || (map._fs = {});
	if (cache[idx]) return cache[idx];
	const nd = map.nodes,
		n = nd[idx],
		a = nd[n.next[0]],
		b = nd[n.prev[0]] || n,
		half = ep("roadW") / 2 + 0.15;
	let dx = a.x - b.x,
		dz = a.z - b.z;
	const l = Math.hypot(dx, dz) || 1;
	dx /= l;
	dz /= l;
	const segs = [];
	nd.forEach((m) => m.next.forEach((j) => segs.push([m, nd[j]])));
	const clear = (cx, cz) =>
		Math.min(
			...FAC_FOOT.map(([ox, oz]) => {
				const px = cx + ox,
					pz = cz + oz;
				let c = Math.min(...segs.map(([p, q]) => segDist(px, pz, p, q))) - half;
				nd.forEach((m) => {
					if (m.ref) c = Math.min(c, Math.hypot(px - m.x, pz - m.z) - 2.5);
				});
				return c;
			}),
		);
	const cands = [];
	[2.9, 3.3, 3.8].forEach((d) =>
		[
			[-dz, dx],
			[dz, -dx],
		].forEach(([ox, oz]) => {
			const cx = n.x + ox * d,
				cz = n.z + oz * d;
			cands.push({ cx, cz, d, clr: clear(cx, cz) });
		}),
	);
	const xs = nd.map((t) => t.x),
		zs = nd.map((t) => t.z),
		x0 = Math.min(...xs),
		x1 = Math.max(...xs),
		z0 = Math.min(...zs),
		z1 = Math.max(...zs),
		mx = (x0 + x1) / 2,
		mz = (z0 + z1) / 2,
		E = 2.5;
	const ok = cands.filter((c) => c.clr >= 0),
		dMin = ok.length ? Math.min(...ok.map((c) => c.d)) : 0,
		pool = ok.filter((c) => c.d === dMin);
	const outer = n.x - x0 < E || x1 - n.x < E || n.z - z0 < E || z1 - n.z < E;
	const best = !pool.length
		? cands.slice().sort((p, q) => q.clr - p.clr)[0]
		: outer
			? pool.slice().sort((p, q) => Math.hypot(q.cx - mx, q.cz - mz) - Math.hypot(p.cx - mx, p.cz - mz))[0]
			: pool.slice().sort((p, q) => p.cz - q.cz)[0];
	return (cache[idx] = {
		x: n.x,
		y: n.y || 0,
		z: n.z,
		bx: best.cx - n.x,
		bz: best.cz - n.z,
		rot: 0,
		ok: pool.length > 0,
	});
}
/* the battery factory moves once the purchase animation is done (waits briefly in case it hasn't started yet). Volcano: a rock pillar first rises out of the lava
   at the new spot, then the factory hops over onto it and the old pillar sinks */
function facPillar(bd, f) {
	const p = Cy(1.8, 2.1, 16, 7, "#4A3C36", f.x + f.bx, f.y - 8.02, f.z + f.bz);
	bd.scene.add(p);
	return p;
}
const FAC_RISE = 2.4,
	FAC_HOP = 0.85;
function stepFactory(bd, dt) {
	bd.sink = (bd.sink || []).filter((p) => {
		p.position.y -= dt * 5;
		if (p.position.y > -40) return true;
		bd.scene.remove(p);
		return false;
	});
	const f = bd.facTarget;
	if (!f || performance.now() < (bd.facWait || 0) || (GFX.bseq && performance.now() - GFX.bseq.t0 < 4400)) return;
	const rT = bd.vx ? FAC_RISE : 0;
	if (!f.from) {
		f.from = {
			x: bd.fac.position.x,
			y: bd.facY || 0,
			z: bd.fac.position.z,
			bx: bd.bld.position.x,
			bz: bd.bld.position.z,
		};
		if (bd.vx) {
			f.pil = facPillar(bd, f);
			const ly = bd.vx.lava.position.y;
			burst(bd.scene, f.x + f.bx, ly + 0.3, f.z + f.bz, {
				n: 22,
				shape: "ico",
				cols: ["#FF7A2A", "#FFD24A", "#3A2C27"],
				spd: 4,
				up: 6,
				grav: 10,
				life: 1,
			});
			sfx("crush");
		}
	}
	const tr = (bd.facMove = (bd.facMove || 0) + dt),
		rise = rT ? Math.min(1, tr / rT) : 1,
		hop = Math.max(0, Math.min(1, (tr - rT) / FAC_HOP)),
		a = f.from;
	/* the pillar grinds up out of the lava, shaking (strongest while it is moving fastest) and shedding a few rocks */
	if (f.pil) {
		const e = 1 - Math.pow(1 - rise, 2),
			sh = rise < 1 ? 0.12 * (1 - rise) + 0.03 : 0,
			px = f.x + f.bx,
			pz = f.z + f.bz,
			tt = tr * 38;
		f.pil.position.set(px + Math.sin(tt) * sh, f.y - 8.02 - (1 - e) * (f.y + 9), pz + Math.cos(tt * 1.3) * sh);
		if (rise < 1 && Math.floor(tr / 0.35) !== f.dustN) {
			f.dustN = Math.floor(tr / 0.35);
			burst(bd.scene, px, bd.vx.lava.position.y + 0.4, pz, {
				n: 8,
				shape: "ico",
				cols: ["#FF7A2A", "#3A2C27", "#6A5A4E"],
				spd: 2.5,
				up: 3,
				grav: 9,
				life: 0.8,
			});
		}
	}
	if (hop > 0 && bd.pil !== f.pil) {
		if (bd.pil) bd.sink.push(bd.pil);
		bd.pil = f.pil;
	}
	const e = hop * hop * (3 - 2 * hop);
	bd.fac.position.set(
		a.x + (f.x - a.x) * e,
		a.y + (f.y - a.y) * e + Math.sin(hop * Math.PI) * 2.5,
		a.z + (f.z - a.z) * e,
	);
	bd.bld.position.set(a.bx + (f.bx - a.bx) * e, 0, a.bz + (f.bz - a.bz) * e);
	bd.bld.rotation.y = f.rot;
	if (hop >= 1) {
		bd.facY = f.y;
		bd.facTarget = null;
	}
}
function tilePos(i, off) {
	const n = MAP.nodes[i] || MAP.nodes[0];
	let y = n.y || 0;
	if (MAP.lava && G && flooded(i, G.round)) y = Math.max(y, LAVA_Y[lavaLv(G.round)] - 0.4);
	return new THREE.Vector3(n.x + off[0], y + 0.5, n.z + off[1]);
}
const OFF = [
	[0, 0],
	[-0.8, -0.6],
	[0.8, -0.6],
	[-0.8, 0.6],
	[0.8, 0.6],
	[0, -0.9],
	[0, 0.9],
	[-0.95, 0],
];
function syncBoard() {
	if (!GFX.ok || !G) return;
	syncMap();
	setBoardMap(MAP.id);
	const bd = GFX.board,
		ps = G.players;
	if (bd.facIdx !== G.factory && MAP.nodes[G.factory]) {
		const f = facSpot(G.factory),
			old = bd.facTarget;
		if (old && old.pil && old.pil !== bd.pil) (bd.sink = bd.sink || []).push(old.pil);
		bd.facIdx = G.factory;
		bd.facTarget = f;
		bd.facMove = 0;
		bd.facWait = performance.now() + 250;
		if (!bd.placed) {
			bd.fac.position.set(f.x, f.y, f.z);
			bd.facY = f.y;
			bd.bld.position.set(f.bx, 0, f.bz);
			bd.placed = true;
			if (bd.vx) {
				bd.pil = facPillar(bd, f);
				f.pil = bd.pil;
			}
			bd.facTarget = null;
		}
	}
	const traps = G.traps || {};
	Object.keys(bd.traps).forEach((k) => {
		if (!traps[k]) {
			bd.scene.remove(bd.traps[k]);
			delete bd.traps[k];
		}
	});
	Object.keys(traps).forEach((k) => {
		if (bd.traps[k] || !MAP.nodes[k]) return;
		const g = new THREE.Group(),
			n = MAP.nodes[k];
		g.add(B(1.4, 0.06, 0.5, "#3A4150", 0, 0.03, 0));
		for (let i = -3; i <= 3; i++) {
			const c = mesh(new THREE.ConeGeometry(0.08, 0.28, 5), "#D8DDE5");
			c.position.set(i * 0.19, 0.18, 0);
			g.add(c);
		}
		g.position.set(n.x, (n.y || 0) + 0.5, n.z);
		g.rotation.y = 0.6;
		bd.scene.add(g);
		bd.traps[k] = g;
	});
	const obs = G.obs || {};
	Object.keys(bd.obs).forEach((k) => {
		if (!obs[k]) {
			bd.scene.remove(bd.obs[k]);
			delete bd.obs[k];
		}
	});
	Object.keys(obs).forEach((k) => {
		const n = MAP.nodes[k];
		if (bd.obs[k] || !n) return;
		const c = obsidianMesh(0.75),
			gl = shardGlow(2, 0.3);
		gl.position.y = 0.45;
		c.add(gl);
		c.position.set(n.x - 0.8, (n.y || 0) + 0.5, n.z + 0.6);
		bd.scene.add(c);
		bd.obs[k] = c;
	});
	/* loose shards from rising lava: a glowing crystal hovering over the space, popping in and out */
	const loose = G.loose || {},
		LC = ["#7A3CFF", "#B78CFF", "#FFFFFF"];
	Object.keys(bd.loose).forEach((k) => {
		if (loose[k]) return;
		const m = bd.loose[k];
		burst(bd.scene, m.position.x, m.position.y, m.position.z, {
			n: 10,
			shape: "ico",
			cols: LC,
			spd: 2.5,
			up: 3,
			grav: 8,
			life: 0.7,
		});
		bd.scene.remove(m);
		delete bd.loose[k];
	});
	Object.keys(loose).forEach((k) => {
		const n = MAP.nodes[k];
		if (bd.loose[k] || !n) return;
		const c = new THREE.Group(),
			x1 = mesh(xtalGeo(), "#5B2BB5", { emissive: "#7A3CFF", emissiveIntensity: 0.5, roughness: 0.25 });
		x1.scale.set(1.1, 1.25, 1.1);
		x1.position.y = 0.62;
		c.add(x1);
		const gl = shardGlow(2.6, 0.35);
		gl.position.y = 0.7;
		c.add(gl);
		c.position.set(n.x, (n.y || 0) + 0.5, n.z);
		c.userData.ph = +k;
		/* launched from the lava lake (unless an eruption bomb already carried it there): flies in an arc and lands with a puff */
		if (G.phase !== "erupt" && bd.vx) {
			const d = Object.keys(bd.loose).filter((q) => bd.loose[q].userData.fly).length;
			c.userData.fly = {
				t0: performance.now() / 1000 + 0.35 * d,
				from: new THREE.Vector3((Math.random() - 0.5) * 4, bd.vx.lava.position.y, (Math.random() - 0.5) * 4),
				to: c.position.clone(),
			};
			c.position.copy(c.userData.fly.from);
			c.visible = false;
		}
		bd.scene.add(c);
		bd.loose[k] = c;
		if (!c.userData.fly)
			burst(bd.scene, n.x, (n.y || 0) + 1, n.z, {
				n: 9,
				shape: "ico",
				cols: ["#FF7A2A", "#FFD24A", "#7A3CFF"],
				spd: 2.4,
				up: 4,
				grav: 9,
				life: 0.8,
				size: 0.6,
				vary: 1,
				op: 0.55,
			});
	});
	ps.forEach((p) => {
		let t = GFX.tok[p.key];
		if (!t || t.truck !== p.truck) {
			if (t) bd.scene.remove(t.g);
			const g = new THREE.Group(),
				tr = buildTruck(p.truck);
			tr.scale.setScalar(0.62);
			g.add(tr);
			const disc = Cy(0.72, 0.72, 0.06, 20, pcol(p), 0, 0.03, 0, {
				transparent: true,
				opacity: 0.4,
				depthWrite: false,
			});
			disc.castShadow = false;
			g.add(disc);
			const tag = nameTag(p.name, G.teams ? TEAMS[p.team || 0].col : pcol(p));
			tag.scale.multiplyScalar(1.5);
			tag.position.y = 2.3;
			g.add(tag);
			g.position.copy(tilePos(p.pos, [0, 0]));
			bd.scene.add(g);
			t = GFX.tok[p.key] = {
				g,
				tr,
				truck: p.truck,
				target: p.pos,
				shown: p.pos,
				shownT: p.pos,
				q: [],
				anim: null,
				yaw: 0,
			};
		}
		const carried = !!(G.rival && G.rival.carry === p.key);
		if (carried) t.carried = true;
		if (t.target !== p.pos) {
			if (t.carried) {
				t.q = [];
				t.anim = null;
				t.target = t.shown = t.shownT = p.pos;
			} else {
				const a = MAP.nodes[t.target],
					adj = a && (a.next.includes(p.pos) || a.prev.includes(p.pos));
				t.q.push({ to: p.pos, jump: !adj });
				t.target = p.pos;
			}
		}
		if (!carried && t.carried && t.target === p.pos) t.carried = false;
	});
	Object.keys(GFX.tok).forEach((k) => {
		if (!ps.some((p) => p.key === k)) {
			bd.scene.remove(GFX.tok[k].g);
			delete GFX.tok[k];
		}
	});
}
function offsetsFor(key) {
	const ps = G.players,
		me_ = ps.find((p) => p.key === key);
	if (!me_) return [0, 0];
	const at = (p) => (GFX.tok[p.key] ? GFX.tok[p.key].shownT : p.pos),
		same = ps.filter((p) => at(p) === at(me_));
	if (same.length < 2) return [0, 0];
	return OFF[same.indexOf(me_) % OFF.length];
}
const lerpA = (a, b, t) => {
	let d = b - a;
	while (d > Math.PI) d -= Math.PI * 2;
	while (d < -Math.PI) d += Math.PI * 2;
	return a + d * t;
};
const V3 = new THREE.Vector3();
function stepBoard(dt, time) {
	const bd = GFX.board,
		ps = G.players,
		nd = MAP.nodes;
	const rv = bd.rival,
		rs = G.rival;
	if (rv && rs && nd[rs.at]) {
		const u = rv.userData,
			n = nd[rs.at],
			tx = n.x + 1.3,
			tz = n.z + 1.3,
			dx = tx - rv.position.x,
			dz = tz - rv.position.z,
			d = Math.hypot(dx, dz),
			moving = d > 0.05;
		if (moving) {
			const sp = Math.min(d, dt * Math.max(6, d * 1.6));
			rv.position.x += (dx / d) * sp;
			rv.position.z += (dz / d) * sp;
			if (d > 0.4) rv.rotation.y = lerpA(rv.rotation.y, Math.atan2(-dz, dx), Math.min(1, dt * 6));
			rv.position.y = Math.min(1.2, d * 0.15);
		} else rv.position.y *= 0.8;
		if (rs.carry !== u.lastCarry) {
			const was = u.lastCarry;
			u.lastCarry = rs.carry;
			u.mag.getWorldPosition(V3);
			if (rs.carry) {
				u.grabT = time;
				burst(bd.scene, V3.x, V3.y - 0.4, V3.z, {
					n: 16,
					shape: "cube",
					cols: ["#7FD3FF", "#FFFFFF", "#8E5BE0"],
					spd: 3.5,
					up: 3,
					grav: 6,
					life: 0.7,
				});
			} else if (was)
				burst(bd.scene, V3.x, 0.6, V3.z, { n: 12, shape: "ico", cols: DUST, spd: 2.8, up: 2, grav: 6, life: 0.8 });
		}
		const gk = u.grabT !== undefined ? time - u.grabT : 9,
			dip = gk < 1.2 ? Math.sin((gk / 1.2) * Math.PI) * 1.4 : 0;
		const swing = rs.carry ? Math.sin(time * 1.5) * 0.22 : moving ? 0 : Math.sin(time * 0.55) * 1.2;
		u.crane.rotation.y = lerpA(u.crane.rotation.y, swing, Math.min(1, dt * 2.5));
		const my = 2.15 - dip + Math.sin(time * 3) * 0.06;
		u.mag.position.y = my;
		u.mag.rotation.y += dt * (rs.carry ? 0.6 : 1.6);
		const L = Math.max(0.1, 3.12 - (my + 0.12));
		u.cable.scale.y = L;
		u.cable.position.y = my + 0.12 + L / 2;
		animTruck(rv.children[0], dt, moving ? 6 : 0);
	}
	ps.forEach((p) => {
		const t = GFX.tok[p.key];
		if (!t) return;
		if (t.carried && rv && G.rival && G.rival.carry === p.key) {
			rv.userData.mag.getWorldPosition(V3);
			t.g.position.lerp(V3.clone().add(new THREE.Vector3(0, -1.05, 0)), Math.min(1, dt * 10));
			t.yaw += dt * 2;
			t.tr.rotation.y = t.yaw;
			return;
		}
		/* cart rides zip along at a constant speed: no ease or hop, each step carries on from the last one's overshoot, and it speeds up when steps are queued so it never lags the host's 0.24 s pace */
		const zip = !!((G.ride && G.ride.pid === p.key) || t.rideQ);
		if (!t.anim && t.q.length) {
			const s = t.q.shift(),
				cv = zip && !s.jump ? t.carry || 0 : 0;
			t.carry = 0;
			t.anim = {
				from: t.g.position.clone(),
				fromIdx: t.shown,
				toIdx: s.to,
				jump: s.jump,
				t: 0,
				zip: zip && !s.jump,
				dur: s.jump ? 0.8 : zip ? (t.q.length ? 0.18 : 0.24) : 0.34,
			};
			t.anim.t = cv / t.anim.dur;
			t.shownT = s.to;
			const a = nd[t.shown],
				b = nd[s.to];
			if (!s.jump && a && b) t.yawT = Math.atan2(-(b.z - a.z), b.x - a.x);
		}
		const off = offsetsFor(p.key);
		if (t.anim) {
			const a = t.anim;
			a.t += dt / a.dur;
			const k = Math.min(1, a.t),
				e = a.zip ? k : k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
			t.g.position.lerpVectors(a.from, tilePos(a.toIdx, off), e);
			if (MAP.lava && !a.jump) {
				const to = tilePos(a.toIdx, off),
					rd =
						(MAP.rampD || {})[a.fromIdx + "-" + a.toIdx] ||
						((r) => r && [r[1], r[0], r[2]])((MAP.rampD || {})[a.toIdx + "-" + a.fromIdx]),
					Lh = rd ? rd[2] : Math.hypot(to.x - a.from.x, to.z - a.from.z);
				t.g.position.y = a.from.y + (to.y - a.from.y) * (rd ? rampF(e, Lh, rd[0], rd[1]) : rampF(e, Lh));
			}
			t.g.position.y +=
				Math.sin(k * Math.PI) * (a.jump ? 2.4 + Math.abs(a.from.y - t.g.position.y) * 0.5 : a.zip ? 0 : 0.7);
			if (k >= 1) {
				t.anim = null;
				t.shown = a.toIdx;
				t.carry = a.zip ? (a.t - 1) * a.dur : 0;
			}
		} else {
			t.g.position.lerp(tilePos(t.shown, off), Math.min(1, dt * 8));
			const c = nd[t.shown],
				nx = c && nd[c.next[0]];
			if (t.yawT === undefined && c && nx) t.yawT = Math.atan2(-(nx.z - c.z), nx.x - c.x);
		}
		t.yaw = lerpA(t.yaw, t.yawT || 0, Math.min(1, dt * 10));
		t.tr.rotation.y = t.yaw;
		{
			const pp = t.g.position,
				sp = t.lp && dt > 0 ? Math.hypot(pp.x - t.lp.x, pp.z - t.lp.z) / dt : 0;
			t.lp = pp.clone();
			animTruck(t.tr, dt, Math.min(sp, 14));
		}
	});
	stepCart(bd, dt, time);
	Object.values(bd.loose).forEach((c) => {
		const f = c.userData.fly;
		if (f) {
			const u = (performance.now() / 1000 - f.t0) / 1.3;
			if (u < 0) return;
			c.visible = true;
			if (u < 1) {
				c.position.lerpVectors(f.from, f.to, u);
				c.position.y += Math.sin(u * Math.PI) * (10 + f.from.distanceTo(f.to) * 0.25);
				c.rotation.set(u * 9, u * 6, 0);
				if (!f.p0) {
					f.p0 = 1;
					burst(bd.scene, f.from.x, f.from.y + 0.3, f.from.z, {
						n: 6,
						shape: "ico",
						cols: ["#FF7A2A", "#FFD24A"],
						spd: 2,
						up: 5,
						grav: 9,
						life: 0.7,
						size: 0.6,
						vary: 1,
						op: 0.55,
					});
				}
				return;
			}
			c.userData.fly = null;
			c.position.copy(f.to);
			c.rotation.set(0, 0, 0);
			burst(bd.scene, f.to.x, f.to.y + 0.5, f.to.z, {
				n: 9,
				shape: "ico",
				cols: ["#FF7A2A", "#FFD24A", "#7A3CFF"],
				spd: 2.4,
				up: 4,
				grav: 9,
				life: 0.8,
				size: 0.6,
				vary: 1,
				op: 0.55,
			});
			sfx("coin");
		}
		c.rotation.y = time * 0.8 + c.userData.ph;
		c.children[0].position.y = 0.62 + Math.sin(time * 2.5 + c.userData.ph) * 0.06;
	});
	const cur = ps[G.turn],
		ct = cur && GFX.tok[cur.key],
		inMg = G.phase === "minigame" || G.phase === "mgres";
	stepBadgeFor(bd, ct, time);
	bd.hl.visible = !!ct && !inMg;
	if (ct) {
		bd.hl.position.x = ct.g.position.x;
		bd.hl.position.z = ct.g.position.z;
		bd.hl.position.y = (MAP.nodes[ct.shownT] ? MAP.nodes[ct.shownT].y || 0 : 0) + 0.53;
		bd.hl.scale.setScalar(1 + Math.sin(time * 4) * 0.08);
	}
	const fo = G.phase === "fork" && G.fork ? G.fork.opts : [];
	bd.arrows.forEach((a, k) => {
		const n = nd[fo[k]];
		a.visible = !!n;
		if (n) a.position.set(n.x, (n.y || 0) + 2 + Math.abs(Math.sin(time * 3 + k)) * 0.35, n.z);
	});
	if (bd.vx) stepVolcano(bd, dt, time);
	bd.belts.forEach((tx) => {
		tx.offset.y = (tx.offset.y - dt * 1.2) % 1;
	});
	bd.crushers.forEach((c) => {
		const u = (time * 0.45 + c.ph) % 1,
			y = u < 0.08 ? 3 - (u / 0.08) * 2.1 : u < 0.25 ? 0.9 : 0.9 + Math.min(1, (u - 0.25) / 0.3) * 2.1;
		c.blk.position.y = y;
		c.st.position.y = y - 0.28;
	});
	stepFactory(bd, dt);
	bd.ring.rotation.z += dt * 0.8;
	bd.ring.position.y = 0.56 + Math.sin(time * 3) * 0.05;
	{
		const u = bd.bld.userData;
		if (u.sign) u.sign.rotation.y = Math.sin(time * 1.5) * 0.25;
		if (u.tick) u.tick(time);
	}
	const steam = (ps, o) =>
		ps.forEach((p) => {
			p.userData.t = (p.userData.t + dt * 0.35) % 1;
			const u = p.userData.t;
			p.position.set(o[0] + u * 0.6, o[1] + u * 2.2, o[2]);
			p.scale.setScalar(0.6 + u * 1.4);
			p.material.opacity = 0.85 * (1 - u);
		});
	stepGrind(bd, dt, time);
	steam(bd.puffs, bd.bld.userData.puff);
	bd.refs.forEach((r, k) => {
		steam(r.userData.puffs, r.userData.puff);
		r.userData.tick(time);
	});
	swayStep(bd.scene);
	boardFx(bd, dt);
	shadowCheck(bd);
	bd.clouds.forEach((c, i) => {
		c.position.x += dt * (0.4 + i * 0.05);
		if (c.position.x > 64) c.position.x = -64;
	});
	const cam = GFX.cam,
		aspect = GFX.w / GFX.h;
	let tgt, pos;
	const ir = GFX.introEnd ? (GFX.introEnd - performance.now()) / 1000 : 0,
		bcam = ir > 0 ? null : stepBattery(bd, dt);
	if (bcam) [tgt, pos] = bcam;
	else if (ir > 0) {
		const a = -0.9 + (1 - ir / 5) * 1.8,
			d = (aspect < 1 ? 60 : 44) * (MAP.size || 1);
		tgt = new THREE.Vector3(0, MAP.camY || 0, 0);
		pos = new THREE.Vector3(Math.sin(a) * d, d * 0.72, Math.cos(a) * d);
	} else if (!GFX.follow) {
		const o = GFX.ov || resetOv();
		tgt = new THREE.Vector3(o.tx, o.ty !== undefined ? o.ty : MAP.camY || 0, o.tz);
		const cp = Math.cos(o.pitch);
		pos = tgt
			.clone()
			.add(new THREE.Vector3(Math.sin(o.yaw) * cp * o.dist, Math.sin(o.pitch) * o.dist, Math.cos(o.yaw) * cp * o.dist));
	} else if (G.phase === "erupt") {
		tgt = new THREE.Vector3(0, 2, 0);
		pos = new THREE.Vector3(0, aspect < 1 ? 52 : 34, aspect < 1 ? 40 : 30);
	} else if ((ct && !inMg && G.phase !== "rival") || (G.phase === "rival" && rv)) {
		const rvl = G.phase === "rival";
		tgt = (rvl ? rv : ct.g).position.clone();
		tgt.y = Math.max(0, tgt.y - 0.5);
		pos = followCamPos(tgt, aspect, rvl ? 1.08 : 1);
	} else {
		const sz = MAP.size || 1;
		tgt = new THREE.Vector3(0, MAP.camY || 0, 1.5);
		pos = (aspect < 1 ? new THREE.Vector3(0, 52, 32) : new THREE.Vector3(0, 38, 25)).multiplyScalar(sz);
	}
	GFX.camPos = GFX.camPos || pos.clone();
	GFX.camTgt = GFX.camTgt || tgt.clone();
	if (view === "game" && !mgOpen && GFX.toFree) {
		const ax = kbAxis(),
			rot = (KEYS.has("e") ? 1 : 0) - (KEYS.has("q") ? 1 : 0),
			zm = (KEYS.has("f") || KEYS.has("-") ? 1 : 0) - (KEYS.has("r") || KEYS.has("+") || KEYS.has("=") ? 1 : 0);
		GFX.kbCam = !!(ax.x || ax.y || rot || zm);
		if (GFX.kbCam) {
			GFX.toFree();
			const o = GFX.ov || resetOv(),
				sp = dt * 520;
			GFX.camPan(-ax.x * sp, -ax.y * sp);
			o.yaw += rot * dt * 1.6;
			o.dist *= Math.exp(zm * dt * 1.3);
			GFX.clampOv(o);
			const cp = Math.cos(o.pitch);
			tgt = new THREE.Vector3(o.tx, o.ty !== undefined ? o.ty : MAP.camY || 0, o.tz);
			pos = tgt
				.clone()
				.add(
					new THREE.Vector3(Math.sin(o.yaw) * cp * o.dist, Math.sin(o.pitch) * o.dist, Math.cos(o.yaw) * cp * o.dist),
				);
		}
	}
	if (GFX.rise) {
		const u = Math.min(1, (performance.now() - GFX.rise) / 1300),
			e = u * u;
		tgt = tgt.clone();
		pos = pos.clone();
		tgt.y += e * 30;
		pos.y += e * 46;
	}
	const k = 1 - Math.exp(-dt * (GFX.rise ? 4 : bcam ? 3.4 : GFX.follow ? 2.6 : GFX.dragging || GFX.kbCam ? 18 : 8));
	GFX.camPos.lerp(pos, k);
	GFX.camTgt.lerp(tgt, k);
	cam.position.copy(GFX.camPos);
	cam.lookAt(GFX.camTgt);
}

/* refinery stop (G.grind): the truck's shards are sucked up into the funnel (0–1.3 s), the gate grinds and shakes (1.2–2.6 s), then spits obsidian dust down onto the truck (2.6–3.4 s) */
function stepGrind(bd, dt, time) {
	const gr = G.grind;
	if (bd.grindN === undefined) bd.grindN = gr ? gr.n : null;
	else if (gr && gr.n !== bd.grindN) {
		bd.grindN = gr.n;
		const gate = bd.refs.find((r) => r.userData.node === gr.at),
			tok = GFX.tok[gr.pid];
		if (gate && tok) {
			bd.gr && bd.gr.bits.forEach((m) => bd.scene.remove(m));
			bd.gr = {
				t0: time,
				gate,
				tok,
				bits: Array.from({ length: Math.min(12, gr.k * 2 + 1) }, (_, j) => {
					const m = obsidianMesh(0.28);
					m.visible = false;
					bd.scene.add(m);
					return m;
				}),
				spat: 0,
				gn: 0,
			};
			sfx("coin");
		}
	}
	const a = bd.gr;
	if (!a) return;
	const k = time - a.t0,
		gp = a.gate.userData.base,
		tp = a.tok.g.position,
		fy = gp.y + 2.85;
	a.bits.forEach((m, j) => {
		const u = (k - j * 0.07) / 1.1;
		m.visible = u > 0 && u < 1;
		if (!m.visible) return;
		const e = u * u * (3 - 2 * u),
			sw = (1 - e) * 0.9,
			an = u * 9 + j;
		m.position.set(
			tp.x + (gp.x - tp.x) * e + Math.cos(an) * sw,
			tp.y + 1 + (fy - tp.y - 1) * e,
			tp.z + (gp.z - tp.z) * e + Math.sin(an) * sw,
		);
		m.rotation.y = an;
		m.scale.setScalar(1 - e * 0.6);
	});
	if (k > 1.2 && k < 2.6) {
		const j = Math.sin(k * 60) * 0.045,
			q = Math.cos(k * 47) * 0.03;
		a.gate.position.set(gp.x + j, gp.y + Math.abs(Math.sin(k * 33)) * 0.03, gp.z + q);
		a.gate.rotation.z = Math.sin(k * 41) * 0.012;
		if (Math.floor(k / 0.3) !== a.gn) {
			a.gn = Math.floor(k / 0.3);
			sfx("crush");
			burst(bd.scene, gp.x, fy + 0.5, gp.z, {
				n: 5,
				shape: "ico",
				cols: ["#6A5A8A", "#3A302B", "#FFB15A"],
				spd: 2.2,
				up: 2,
				grav: 8,
				life: 0.5,
			});
		}
	} else {
		a.gate.position.copy(gp);
		a.gate.rotation.z = 0;
	}
	if (k > 2.6 && k < 3.4 && Math.floor((k - 2.6) / 0.12) !== a.spat - 1) {
		a.spat = Math.floor((k - 2.6) / 0.12) + 1;
		burst(bd.scene, gp.x + (tp.x - gp.x) * 0.3, fy - 0.1, gp.z + (tp.z - gp.z) * 0.3, {
			n: 14,
			shape: "cube",
			cols: ["#6A5A8A", "#8C7AB0", "#D9C8FF", "#3B2466"],
			spd: 1.4,
			up: -1.5,
			grav: 9,
			life: 0.9,
			size: 0.55,
		});
		if (a.spat === 3) {
			a.tok.sq = 0.3;
			sfx("battery");
		}
	}
	if (k > 3.6) {
		a.bits.forEach((m) => bd.scene.remove(m));
		a.gate.position.copy(gp);
		a.gate.rotation.z = 0;
		bd.gr = null;
	}
}
/* ---------- minecart: a closed rail loop from the MC space up round the crater's central pillar and back down; HG.cart {pid, at, laps, n} sends a truck round it laps times ---------- */
/* the track: a short straight spur from the MC space to the pillar, one climbing turn hugging the pillar, then straight into the giant crystal on top.
   The cart rides up and back down the same track, so nothing ever crosses another tile or rail */
function cartCurve(map) {
	const mc = map.nodes.findIndex((n) => n.t === "MC");
	if (mc < 0) return null;
	const T = map.nodes[mc],
		isl = EDC.reg.island,
		C = isl ? isl.position : new THREE.Vector3(0.87, 0, -0.9),
		sc = isl ? isl.scale.x : 1;
	const R = 3.5 * sc + 0.3,
		y0 = (T.y || 0) + 0.55,
		top = C.y + 4.9 * (isl ? isl.scale.y : 1),
		a0 = Math.atan2(T.z - C.z, T.x - C.x),
		at = (a, r, y) => new THREE.Vector3(C.x + Math.cos(a) * r, y, C.z + Math.sin(a) * r);
	const P = [new THREE.Vector3(T.x, y0, T.z), at(a0, R + 1.2, y0 + 0.15)];
	for (let k = 0; k <= 12; k++) {
		const f = k / 12;
		P.push(at(a0 + 0.35 + f * Math.PI * 2.1, R, y0 + 0.4 + f * (top - 0.3 - y0 - 0.4)));
	}
	P.push(at(a0 + 0.35 + Math.PI * 2.1 + 0.5, R * 0.5, top + 0.1), new THREE.Vector3(C.x, top + 0.25, C.z));
	/* home = where the empty cart waits, on the spur just off the space */
	const curve = new THREE.CatmullRomCurve3(P, false, "centripetal");
	return { mc, curve, home: Math.min(0.3, 2.3 / curve.getLength()) };
}
function buildCartRails(s, map) {
	const cc = cartCurve(map);
	if (!cc) return null;
	const { curve } = cc,
		N = 160,
		up = new THREE.Vector3(0, 1, 0),
		L = [],
		Rr = [],
		g = new THREE.Group();
	s.add(g);
	for (let k = 0; k <= N; k++) {
		const u = k / N,
			p = curve.getPointAt(u),
			t = curve.getTangentAt(u),
			side = new THREE.Vector3().crossVectors(t, up).normalize().multiplyScalar(0.5);
		L.push(p.clone().add(side));
		Rr.push(p.clone().sub(side));
		if (k % 4 === 0) {
			const tie = B(0.16, 0.06, 1.25, "#6B4A36", 0, 0, 0);
			tie.position.copy(p).y -= 0.05;
			tie.lookAt(p.clone().add(side));
			g.add(tie);
		}
		if (k % 22 === 11 && u > 0.12 && u < 0.85) {
			const h = p.y + 1.5,
				post = B(0.16, h, 0.16, "#4A3C36", p.x, p.y - 0.1 - h / 2, p.z);
			g.add(post);
		}
	}
	[L, Rr].forEach((pts) =>
		g.add(
			mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false), N, 0.075, 6, false), "#3A3A40", {
				metalness: 0.4,
				roughness: 0.5,
			}),
		),
	);
	const cart = cartMesh();
	g.add(cart);
	const r = { ...cc, cart, g };
	cartAt(r, cc.home, false);
	return r;
}
/* puts the pillar cart on the rails at u (wheels on the rail tops, pitched with the track); returns the floor point and heading */
function cartAt(c, u, back) {
	const p = c.curve.getPointAt(u),
		t = c.curve.getTangentAt(u);
	if (back) t.negate();
	const yaw = Math.atan2(-t.z, t.x),
		pitch = Math.asin(Math.max(-1, Math.min(1, t.y)));
	c.cart.position.set(p.x, p.y + 0.075, p.z);
	c.cart.rotation.set(0, yaw, pitch);
	return { p: new THREE.Vector3(p.x, p.y + 0.075 + CART_FLOOR, p.z), yaw, pitch };
}
function stepCart(bd, dt, time) {
	const c = bd.cart,
		cr = G.cart;
	if (!c) return;
	if (bd.cartN === undefined) bd.cartN = cr ? cr.n : null;
	else if (cr && cr.n !== bd.cartN) {
		bd.cartN = cr.n;
		bd.ca = { t0: time, pid: cr.pid, boom: !!cr.boom };
		sfx("step");
	}
	/* the giant crystal: gone from the moment a cart smashes it until G.bigShard comes back, then it grows back with sparkles */
	const cy = bd.crys;
	if (cy) {
		const smashing = bd.ca && bd.ca.boom && !bd.ca.boomed,
			want = G.bigShard === false && !smashing ? 0 : 1;
		if (want) {
			if (bd.crysK < 1) {
				bd.crysK = Math.min(1, bd.crysK + dt / 2.6);
				if (Math.random() < dt * 8) {
					const w = cy.getWorldPosition(new THREE.Vector3());
					burst(bd.scene, w.x + (Math.random() - 0.5) * 2, w.y + Math.random() * 2, w.z + (Math.random() - 0.5) * 2, {
						n: 3,
						shape: "ico",
						cols: ["#B78CFF", "#FFFFFF"],
						spd: 1,
						up: 1.5,
						grav: 1,
						life: 0.6,
					});
				}
			}
		} else bd.crysK = 0;
		const e = bd.crysK,
			eb = e <= 0 ? 0 : 1 + 2.7 * Math.pow(e - 1, 3) + 1.7 * Math.pow(e - 1, 2);
		cy.visible = e > 0.01;
		cy.scale.setScalar(Math.max(0.001, eb));
		/* "+15" tag floating over the grown crystal so everyone can see it's up for grabs */
		if (!bd.crysTag) {
			bd.crysTag = crysTagSprite();
			bd.scene.add(bd.crysTag);
		}
		const tg = bd.crysTag,
			w = cy.getWorldPosition(new THREE.Vector3()),
			show = e >= 1;
		tg.material.opacity += ((show ? 1 : 0) - tg.material.opacity) * Math.min(1, dt * 6);
		tg.visible = tg.material.opacity > 0.02;
		tg.position.set(w.x, w.y + 4.3 + Math.sin(time * 2) * 0.15, w.z);
	}
	/* pillar minecart (MC): the truck hops from its space into the waiting cart, rides up round the pillar (smashing the crystal) and back, then hops out onto the space */
	const a = bd.ca,
		tok = a && GFX.tok[a.pid];
	if (a && tok) {
		const k = time - a.t0,
			HOP = 0.6,
			D = 5.6,
			ride = k - HOP,
			h0 = c.home;
		let u = h0,
			back = false;
		if (!a.from) a.from = tok.g.position.clone();
		if (ride > 0 && ride < D) {
			const f = ride / D,
				h = f < 0.5 ? f * 2 : (1 - f) * 2;
			u = h0 + (1 - h0) * h * h * (3 - 2 * h);
			back = f > 0.5;
		}
		const o = cartAt(c, u, back),
			hop = (A, Bv, f, ht) => (tok.g.position.lerpVectors(A, Bv, f).y += Math.sin(f * Math.PI) * ht);
		if (k < HOP) {
			hop(a.from, o.p, k / HOP, 1.2);
			tok.tr.rotation.y = o.yaw;
		} else if (k < HOP + D) {
			tok.g.position.copy(o.p);
			tok.tr.rotation.y = o.yaw;
			tok.tr.rotation.z = o.pitch;
			if (!a.inT) {
				a.inT = 1;
				tok.sq = 0.3;
				sfx("step");
			}
		} else {
			tok.tr.rotation.z = 0;
			const f = Math.min(1, (k - HOP - D) / 0.5);
			hop(o.p, a.from, f, 1.1);
			if (f >= 1 && !a.outT) {
				a.outT = 1;
				tok.sq = 0.3;
			}
		}
		const p = o.p;
		if (a.boom && !a.boomed && cy && p.distanceTo(cy.getWorldPosition(new THREE.Vector3())) < 1.6) {
			a.boomed = true;
			sfx("crush");
			sfx("battery");
			bd.crysK = 0;
			for (let q = 0; q < 3; q++)
				burst(bd.scene, p.x, p.y + 0.5 + q * 0.6, p.z, {
					n: 30,
					shape: "ico",
					cols: ["#5B2BB5", "#7A3CFF", "#B78CFF", "#FFFFFF"],
					spd: 6 + q * 2,
					up: 6,
					grav: 9,
					life: 1.6,
					size: 1.6,
				});
		}
		if (k > HOP + D + 0.55) {
			bd.ca = null;
			tok.tr.rotation.z = 0;
			cartAt(c, h0, false);
		}
	}
	stepRideCart(bd, time);
}
/* rail cart (MR spaces): the cart pops in beside the truck (on the camera side), the truck hops in, the cart rolls onto the road and rides under it
   for the whole trip; at the end the truck hops out and the cart rolls off and poofs. The truck sits on the cart floor via tr.position (g follows the board path) */
/* 0..1 ride progress → distance along the route: speeds up over the first 6%, cruises, slows down over the last 6% */
function rideEase(f, a = 0.06) {
	const v = 1 / (1 - a);
	return f < a ? (v * f * f) / (2 * a) : f > 1 - a ? 1 - (v * (1 - f) * (1 - f)) / (2 * a) : v * (f - a / 2);
}
function stepRideCart(bd, time) {
	const rc = bd.rideCart,
		rd = G.ride;
	if (!rc) return;
	if (bd.rideN === undefined) {
		bd.rideN = rd ? rd.n : null;
		if (rd) bd.rIn = { t0: time - 9, pid: rd.pid };
	} else if (rd && rd.n !== bd.rideN) {
		bd.rideN = rd.n;
		bd.rIn = { t0: time, pid: rd.pid };
		bd.rOut = null;
	}
	/* the ride is over on the host: keep rolling (fast steps via rideQ) until the truck is really back on its space, then hop out */
	if (!rd && bd.rIn && bd.rIn.ids && GFX.tok[bd.rIn.pid]) {
		const t_ = GFX.tok[bd.rIn.pid],
			L_ = bd.rIn.ids[bd.rIn.ids.length - 1];
		t_.q.length = 0;
		t_.anim = null;
		t_.shown = t_.shownT = L_;
	}
	if (!rd && bd.rIn) {
		const t_ = GFX.tok[bd.rIn.pid];
		if (t_ && (t_.anim || t_.q.length)) t_.rideQ = 1;
		else {
			if (t_) t_.rideQ = 0;
			bd.rOut = { t0: time, pid: bd.rIn.pid };
			bd.rIn = null;
			bd.rideN = null;
		}
	}
	const st = bd.rIn || bd.rOut,
		tk = st && GFX.tok[st.pid];
	if (!tk) {
		rc.visible = false;
		if (st) {
			bd.rIn = bd.rOut = null;
		}
		return;
	}
	/* the host sends the whole route: drive the truck along one smooth curve through every space at a steady speed (gentle start and stop),
     timed to the host's steps (first one 1.1 s after the ride starts, then rd.dt each); the per-step board moves are dropped meanwhile */
	if (bd.rIn && rd && rd.path && rd.path.length) {
		const R_ = bd.rIn;
		if (!R_.cv) {
			const ids = [rd.at].concat(rd.path).filter((v, i, A) => !i || v !== A[i - 1]);
			R_.ids = ids;
			R_.D = rd.path.length * (rd.dt || 0.24);
			R_.cv =
				ids.length > 1
					? new THREE.CatmullRomCurve3(
							ids.map((i) => tilePos(i, [0, 0])),
							false,
							"centripetal",
						)
					: null;
		}
		const f = (time - R_.t0 - 1.1) / R_.D;
		if (R_.cv && f > 0) {
			const u = rideEase(Math.min(1, f)),
				p = R_.cv.getPointAt(u),
				tg = R_.cv.getTangentAt(u),
				id = R_.ids[Math.round(u * (R_.ids.length - 1))];
			tk.g.position.copy(p);
			tk.q.length = 0;
			tk.anim = null;
			tk.shown = tk.shownT = id;
			tk.yaw = tk.yawT = Math.atan2(-tg.z, tg.x);
			tk.tr.rotation.y = tk.yaw;
			tk.tr.rotation.z = Math.asin(Math.max(-1, Math.min(1, tg.y)));
		}
	}
	if (bd.rOut && !st.flat) {
		st.flat = 1;
		tk.tr.rotation.z = 0;
	}
	const g = tk.g.position,
		tr = tk.tr,
		k = time - st.t0,
		cl = (v) => Math.max(0, Math.min(1, v)),
		ez = (f) => f * f * (3 - 2 * f);
	if (!st.side) {
		const y = tr.rotation.y,
			s = new THREE.Vector3(Math.sin(y), 0, Math.cos(y));
		if (GFX.camPos && s.dot(GFX.camPos.clone().sub(g)) < 0) s.negate();
		st.side = s.multiplyScalar(1.7);
	}
	rc.visible = true;
	rc.rotation.set(0, tr.rotation.y, tr.rotation.z);
	const S = st.side;
	if (bd.rIn) {
		const pop = cl(k / 0.35),
			hf = cl((k - 0.35) / 0.5),
			gl = ez(cl((k - 0.85) / 0.3)),
			off = S.clone().multiplyScalar(1 - gl);
		if (!st.puff && k < 1) {
			st.puff = 1;
			burst(bd.scene, g.x + S.x, g.y + 0.3, g.z + S.z, {
				n: 12,
				shape: "ico",
				cols: DUST,
				spd: 2,
				up: 2,
				grav: 6,
				life: 0.6,
			});
			sfx("step");
		}
		const sc = pop >= 1 ? 1 : Math.max(0.001, 1 + 2.7 * Math.pow(pop - 1, 3) + 1.7 * Math.pow(pop - 1, 2));
		rc.scale.setScalar(sc);
		rc.position.set(g.x + off.x, g.y, g.z + off.z);
		if (hf <= 0) tr.position.set(0, 0, 0);
		else if (hf < 1) {
			const e = ez(hf);
			tr.position.set(S.x * e, CART_FLOOR * hf + Math.sin(hf * Math.PI) * 1.1, S.z * e);
		} else {
			if (!st.land) {
				st.land = 1;
				tk.sq = 0.28;
			}
			tr.position.set(off.x, CART_FLOOR, off.z);
		}
	} else {
		const f = cl(k / 0.5),
			e = ez(f),
			sh = cl((k - 0.5) / 0.3);
		tr.position.set(0, CART_FLOOR * (1 - f) + Math.sin(f * Math.PI) * 1, 0);
		rc.position.set(g.x + S.x * e, g.y, g.z + S.z * e);
		rc.scale.setScalar(Math.max(0.001, 1 - sh));
		if (f >= 1 && !st.land) {
			st.land = 1;
			tk.sq = 0.28;
		}
		if (sh >= 1) {
			burst(bd.scene, rc.position.x, g.y + 0.3, rc.position.z, {
				n: 12,
				shape: "ico",
				cols: DUST,
				spd: 2,
				up: 2,
				grav: 6,
				life: 0.6,
			});
			tr.position.set(0, 0, 0);
			rc.visible = false;
			bd.rOut = null;
		}
	}
}
function crysTagSprite() {
	const tex = canvasTex(200, 84, (x, W_, H) => {
		x.fillStyle = "rgba(21,27,36,.88)";
		rr(x, 4, 4, W_ - 8, H - 8, 38);
		x.fill();
		x.strokeStyle = "#B78CFF";
		x.lineWidth = 4;
		rr(x, 4, 4, W_ - 8, H - 8, 38);
		x.stroke();
		x.fillStyle = "#B78CFF";
		x.beginPath();
		[
			[46, 16],
			[60, 30],
			[60, 54],
			[46, 68],
			[32, 54],
			[32, 30],
		].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
		x.fill();
		x.fillStyle = "#FFFFFF";
		x.font = "900 44px Bungee, Rubik, Arial";
		x.textAlign = "center";
		x.textBaseline = "middle";
		x.fillText("+" + BIG_SHARD, 124, 45);
	});
	const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
	sp.scale.set(3.2, (3.2 * 84) / 200, 1);
	return sp;
}
/* mine cart big enough for a board truck (scale .62, up to ~1.5 long) to sit inside: plank walls with metal bands and rims, four wheels on a .5 gauge.
   Origin = wheel bottoms; the truck stands on the floor at CART_FLOOR */
const CART_FLOOR = 0.34;
function cartMesh() {
	const cart = new THREE.Group(),
		WD = "#7A5236",
		MT = "#3A3A40",
		RM = "#4A4A52";
	cart.add(
		B(1.92, 0.08, 1.12, "#5E4030", 0, 0.3, 0),
		B(1.92, 0.6, 0.08, WD, 0, 0.56, 0.6),
		B(1.92, 0.6, 0.08, WD, 0, 0.56, -0.6),
		B(0.08, 0.6, 1.12, WD, 0.96, 0.56, 0),
		B(0.08, 0.6, 1.12, WD, -0.96, 0.56, 0),
	);
	[0.6, -0.6].forEach((z) => {
		cart.add(B(2.04, 0.08, 0.12, RM, 0, 0.86, z), B(1.96, 0.04, 0.13, "#5E4030", 0, 0.56, z));
		[-0.55, 0.55].forEach((x) => cart.add(B(0.07, 0.6, 0.13, MT, x, 0.56, z)));
	});
	[0.96, -0.96].forEach((x) => cart.add(B(0.13, 0.08, 1.3, RM, x, 0.86, 0)));
	[
		[-1, -1],
		[1, -1],
		[-1, 1],
		[1, 1],
	].forEach(([x, z]) => cart.add(B(0.17, 0.62, 0.17, MT, x * 0.96, 0.56, z * 0.6)));
	[-0.6, 0.6].forEach((x) => {
		const ax = Cy(0.04, 0.04, 1.1, 6, MT, x, 0.2, 0);
		ax.rotation.x = Math.PI / 2;
		cart.add(ax);
		[-0.5, 0.5].forEach((z) => {
			const w = Cy(0.2, 0.2, 0.1, 12, "#2A2A30", x, 0.2, z),
				h = Cy(0.09, 0.09, 0.12, 8, "#9AA3AE", x, 0.2, z);
			w.rotation.x = h.rotation.x = Math.PI / 2;
			cart.add(w, h);
		});
	});
	return cart;
}
/* ---------- steps-left badge: a chunky gold coin with the number, floating over the moving truck and facing the camera ---------- */
function stepBadge() {
	const cv = document.createElement("canvas");
	cv.width = cv.height = 128;
	const tex = new THREE.CanvasTexture(cv),
		geo = new THREE.CylinderGeometry(0.6, 0.6, 0.18, 28);
	geo.rotateX(Math.PI / 2);
	const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }),
		rim = new THREE.MeshStandardMaterial({
			color: "#FFC83D",
			emissive: "#B07800",
			emissiveIntensity: 0.3,
			roughness: 0.35,
			metalness: 0.3,
			flatShading: true,
		});
	const disc = new THREE.Mesh(geo, [rim, face, face]),
		g = new THREE.Group();
	g.add(disc);
	g.visible = false;
	return { g, disc, cv, tex, val: null, popT: -9 };
}
function badgeDraw(b, v) {
	const x = b.cv.getContext("2d");
	x.clearRect(0, 0, 128, 128);
	x.fillStyle = "#FFC83D";
	x.fillRect(0, 0, 128, 128);
	x.fillStyle = "#151B24";
	x.beginPath();
	x.arc(64, 64, 52, 0, Math.PI * 2);
	x.fill();
	x.fillStyle = "#FFFFFF";
	x.font = `900 ${v > 9 ? 58 : 70}px Bungee, Rubik, Arial`;
	x.textAlign = "center";
	x.textBaseline = "middle";
	/* cylinder cap UVs run sideways: turn the text so it reads upright on the +z face */ x.save();
	x.translate(64, 64);
	x.rotate(-Math.PI / 2);
	x.fillText(String(v), 0, 4);
	x.restore();
	b.tex.needsUpdate = true;
}
function stepBadgeFor(bd, ct, time) {
	const b = bd.badge;
	if (!b) return;
	const v = (G.left | 0) + (ct ? ct.q.length + (ct.anim ? 1 : 0) : 0),
		mv = !!ct && (G.phase === "moving" || G.phase === "fork");
	if (!mv) b.go = false;
	else if (ct.anim) b.go = true;
	const on = mv && b.go && v > 0 && !(bd.ca && bd.ca.pid === (G.players[G.turn] || {}).key) && !G.ride;
	b.g.visible = on;
	if (!on) {
		b.val = null;
		return;
	}
	if (v !== b.val) {
		b.val = v;
		badgeDraw(b, v);
		b.popT = time;
	}
	const pk = time - b.popT,
		pop = pk < 0.25 ? 1 + Math.sin((pk / 0.25) * Math.PI) * 0.35 : 1;
	b.g.position.set(ct.g.position.x, ct.g.position.y + 3.35 + Math.sin(time * 3) * 0.08, ct.g.position.z);
	b.g.lookAt(GFX.cam.position);
	b.g.scale.setScalar(pop);
	b.disc.rotation.y = Math.sin(time * 2.2) * 0.35;
}
/* ---------- performance: the game board's static road segments and spaces (userData.st subtrees, minus userData.dyn parts) are baked into one mesh per material.
   Only plain vertex-coloured meshes (position + normal + color, shared M() material, no texture) are merged, at their exact world transform, so the board looks identical.
   The editor builds its own unmerged board. ---------- */
function mergeStatic(bd) {
	const s = bd.scene,
		groups = new Map(),
		drop = [];
	s.updateMatrixWorld(true);
	const ok = (m) =>
		m.isMesh &&
		!m.isInstancedMesh &&
		m.geometry &&
		!m.geometry.index &&
		!Array.isArray(m.material) &&
		m.material.vertexColors &&
		!m.material.map &&
		!m.material.transparent &&
		m.matrixWorld.determinant() > 0 &&
		["position", "normal", "color"].every((k) => m.geometry.attributes[k]);
	const walk = (o, inDyn) => {
		if (o.userData && o.userData.dyn) return;
		if (o.visible === false) return;
		if (ok(o)) {
			const k = o.material.uuid,
				L = groups.get(k) || (groups.set(k, { mat: o.material, parts: [] }), groups.get(k));
			L.parts.push(o);
			drop.push(o);
		}
		o.children.forEach((c) => walk(c));
	};
	s.children.filter((o) => o.userData && o.userData.st).forEach((o) => walk(o));
	groups.forEach(({ mat, parts }) => {
		let n = 0;
		parts.forEach((m) => {
			n += m.geometry.attributes.position.count;
		});
		const P = new Float32Array(n * 3),
			N = new Float32Array(n * 3),
			C = new Float32Array(n * 3),
			v = new THREE.Vector3(),
			nm = new THREE.Matrix3();
		let o = 0;
		parts.forEach((m) => {
			const g = m.geometry.attributes,
				mw = m.matrixWorld;
			nm.getNormalMatrix(mw);
			for (let i = 0; i < g.position.count; i++, o++) {
				v.fromBufferAttribute(g.position, i).applyMatrix4(mw);
				P.set([v.x, v.y, v.z], o * 3);
				v.fromBufferAttribute(g.normal, i).applyMatrix3(nm).normalize();
				N.set([v.x, v.y, v.z], o * 3);
				C.set([g.color.getX(i), g.color.getY(i), g.color.getZ(i)], o * 3);
			}
		});
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
		geo.setAttribute("normal", new THREE.BufferAttribute(N, 3));
		geo.setAttribute("color", new THREE.BufferAttribute(C, 3));
		geo.computeBoundingSphere();
		const mm = new THREE.Mesh(geo, mat);
		mm.castShadow = parts.some((m) => m.castShadow);
		mm.receiveShadow = true;
		s.add(mm);
	});
	drop.forEach((m) => m.parent && m.parent.remove(m));
	bd.merged = drop.length;
	return bd;
}
/* shadows only need re-rendering when something that casts one moved: trucks, the factory, carts, the giant crystal, the rival, refinery shakes, crushers */
function shadowCheck(bd) {
	let h = 0;
	const add = (o) => {
		if (o && o.visible !== false) {
			const p = o.position;
			h += p.x * 1.3 + p.y * 7.1 + p.z * 3.7 + o.rotation.y * 11 + o.scale.x * 5;
		}
	};
	Object.values(GFX.tok).forEach((t) => {
		add(t.g);
		add(t.tr);
	});
	add(bd.fac);
	add(bd.bld);
	if (bd.cart) add(bd.cart.cart);
	add(bd.rideCart);
	add(bd.crys);
	add(bd.rival);
	(bd.refs || []).forEach(add);
	(bd.sink || []).forEach(add);
	if (bd.pil) add(bd.pil);
	Object.values(bd.loose || {}).forEach(add);
	if (GFX.bseq && GFX.bseq.m) add(GFX.bseq.m);
	const moving = bd.crushers.length > 0 || Math.abs(h - (bd.shH || 0)) > 1e-4 || (bd.shN = (bd.shN || 0) + 1) < 3;
	bd.shH = h;
	bd.shadowDirty = moving;
}
/* test mode: which board space is under this screen point (-1 if none): the space whose centre lands closest on screen, within ~40 px */
function pickNodeAt(cx, cy) {
	const cv = $("#gl");
	if (!cv || !GFX.board) return -1;
	const r = cv.getBoundingClientRect(),
		v = new THREE.Vector3();
	let best = -1,
		bd2 = 1600;
	MAP.nodes.forEach((n, i) => {
		v.set(n.x, (n.y || 0) + 0.5, n.z).project(GFX.cam);
		if (v.z > 1) return;
		const sx = ((v.x + 1) / 2) * r.width + r.left,
			sy = ((1 - v.y) / 2) * r.height + r.top,
			d = (sx - cx) ** 2 + (sy - cy) ** 2;
		if (d < bd2) {
			bd2 = d;
			best = i;
		}
	});
	return best;
}
function pickNodeAtOld(cx, cy) {
	const bd = GFX.board,
		cv = $("#gl");
	if (!bd || !cv) return -1;
	const r = cv.getBoundingClientRect(),
		rc = new THREE.Raycaster();
	rc.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), GFX.cam);
	const hit = rc.intersectObjects(bd.nodeG.filter(Boolean), true)[0];
	let o = hit && hit.object;
	while (o && !(o.userData && o.userData.node !== undefined)) o = o.parent;
	return o ? o.userData.node : -1;
}
/* follow camera: pulled back a little, and swung gently toward the middle of the board depending on which side the truck is on */
function followCamPos(tgt, aspect, k) {
	const d = (aspect < 1 ? 1.45 : 1.12) * k * (MAP.follow || 1),
		yaw = Math.max(-1, Math.min(1, tgt.x / (22 * (MAP.size || 1)))) * 0.3,
		h = 15 * d;
	return tgt.clone().add(new THREE.Vector3(Math.sin(yaw) * h, 17.5 * d, Math.cos(yaw) * h));
}
/* ---------- free camera: drag to pan, pinch to zoom, twist to rotate ---------- */
function resetOv() {
	const a = GFX.w / GFX.h,
		sz = MAP.size || 1;
	GFX.ov =
		a < 1
			? { tx: 0, tz: 1.5, dist: 82 * sz, yaw: 0, pitch: 1.1 }
			: { tx: 0, tz: 1.5, dist: 45.5 * sz, yaw: 0, pitch: 0.99 };
	return GFX.ov;
}
let camHinted = false;
function camHint() {
	if (camHinted) return;
	camHinted = true;
	fxShow(
		`<div class="dlabel">${FINE ? "WASD to move, Q/E to rotate, R/F to zoom" : "Drag to look around, pinch to zoom, twist to rotate"}</div>`,
		3200,
	);
}
function initCamInput() {
	if (GFX.camInput) return;
	GFX.camInput = true;
	const cv = $("#gl"),
		pts = new Map();
	let moved = 0,
		pair = null;
	const active = () => GFX.mode === "board" && G && view === "game" && !mgOpen;
	const clampOv = (o) => {
		const L = 26 + ((MAP.size || 1) - 1) * 20;
		o.tx = Math.max(-L, Math.min(L, o.tx));
		o.tz = Math.max(-L, Math.min(L + 2, o.tz));
		o.dist = Math.max(9, Math.min(140, o.dist));
		o.pitch = Math.max(0.42, Math.min(1.5, o.pitch));
	};
	const toFree = () => {
		GFX.introEnd = 0;
		if (!GFX.follow) return;
		GFX.follow = false;
		const t = GFX.camTgt || new THREE.Vector3(),
			p = GFX.camPos || new THREE.Vector3(0, 40, 25),
			off = p.clone().sub(t),
			d = off.length() || 40;
		/* keep the height the follow camera was looking at, so switching to the free camera doesn't dip */
		GFX.ov = {
			tx: t.x,
			ty: t.y,
			tz: t.z,
			dist: d,
			yaw: Math.atan2(off.x, off.z),
			pitch: Math.asin(Math.min(1, Math.max(-1, off.y / d))),
		};
		clampOv(GFX.ov);
		updateGame();
		camHint();
	};
	const pan = (dx, dy) => {
		const o = GFX.ov,
			k = o.dist * 0.0021,
			cy = Math.cos(o.yaw),
			sy = Math.sin(o.yaw);
		o.tx += -cy * dx * k - sy * dy * k;
		o.tz += sy * dx * k - cy * dy * k;
		clampOv(o);
	};
	const pairInfo = () => {
		const [a, b] = [...pts.values()];
		return {
			d: Math.hypot(b.x - a.x, b.y - a.y),
			ang: Math.atan2(b.y - a.y, b.x - a.x),
			mx: (a.x + b.x) / 2,
			my: (a.y + b.y) / 2,
		};
	};
	cv.addEventListener("pointerdown", (e) => {
		if (!active()) return;
		e.preventDefault();
		try {
			cv.setPointerCapture(e.pointerId);
		} catch (x) {}
		pts.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, ctrl: e.ctrlKey || e.shiftKey });
		moved = 0;
		pair = pts.size === 2 ? pairInfo() : null;
	});
	cv.addEventListener("pointermove", (e) => {
		const p = pts.get(e.pointerId);
		if (!p || !active()) return;
		const dx = e.clientX - p.x,
			dy = e.clientY - p.y;
		moved += Math.abs(dx) + Math.abs(dy);
		if (moved > 8) toFree();
		if (GFX.follow) return;
		GFX.dragging = true;
		if (pts.size === 1) {
			if (p.b === 2 || p.ctrl) {
				GFX.ov.yaw -= dx * 0.008;
				GFX.ov.pitch += dy * 0.006;
				clampOv(GFX.ov);
			} else pan(dx, dy);
			p.x = e.clientX;
			p.y = e.clientY;
		} else if (pts.size === 2) {
			p.x = e.clientX;
			p.y = e.clientY;
			const n = pairInfo();
			if (pair) {
				const o = GFX.ov;
				o.dist *= pair.d / Math.max(20, n.d);
				let da = n.ang - pair.ang;
				if (da > Math.PI) da -= Math.PI * 2;
				if (da < -Math.PI) da += Math.PI * 2;
				o.yaw += da;
				pan(n.mx - pair.mx, n.my - pair.my);
				clampOv(o);
			}
			pair = n;
		}
	});
	const end = (e) => {
		if (GFX.jumpPick && moved < 8 && pts.has(e.pointerId)) {
			const i = pickNodeAt(e.clientX, e.clientY);
			if (i >= 0) GFX.jumpPick(i);
		}
		pts.delete(e.pointerId);
		pair = pts.size === 2 ? pairInfo() : null;
		if (!pts.size) GFX.dragging = false;
	};
	cv.addEventListener("pointerup", end);
	cv.addEventListener("pointercancel", end);
	cv.addEventListener("contextmenu", (e) => {
		if (active()) e.preventDefault();
	});
	GFX.toFree = toFree;
	GFX.camPan = pan;
	GFX.clampOv = clampOv;
	cv.addEventListener(
		"wheel",
		(e) => {
			if (!active()) return;
			e.preventDefault();
			toFree();
			if (!GFX.ov) resetOv();
			GFX.ov.dist *= Math.exp(e.deltaY * 0.0012);
			clampOv(GFX.ov);
		},
		{ passive: false },
	);
}

/* ---------- keyboard (PC): WASD / arrows ---------- */
const KEYS = new Set(),
	FINE = typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches;
function kbAxis(only) {
	const k = (c, ar) => (only !== "arrows" && KEYS.has(c)) || (only !== "wasd" && KEYS.has(ar)),
		x = (k("d", "arrowright") ? 1 : 0) - (k("a", "arrowleft") ? 1 : 0),
		y = (k("s", "arrowdown") ? 1 : 0) - (k("w", "arrowup") ? 1 : 0);
	return { x, y };
}
addEventListener("keydown", (e) => {
	if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
	const k = e.key.toLowerCase(),
		inMgNow = GFX.mode === "mg" && W;
	if (inMgNow && [" ", "enter", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
		e.preventDefault();
	if (!inMgNow && GFX.mode === "board" && k.startsWith("arrow")) e.preventDefault();
	KEYS.add(k);
	if (e.repeat || !inMgNow) return;
	const rb = $("#m3rb"),
		rd = $("#m3r");
	if ((k === " " || k === "enter") && rb && !rb.disabled && rd && !rd.hidden) {
		rb.click();
		return;
	}
	if (W.def.onKey) {
		if (W.t >= 0 && !W.me.d && !W.paused) W.def.onKey(W, k, true);
		return;
	}
	if (W.def.ctrl === "stick") {
		if (k === " " || k === "shift") {
			if (!e.repeat) W.inp.boost = true;
			W.inp.hold = true;
		}
	} else if ((k === " " || k === "enter" || k === "w" || k === "arrowup") && W.t >= 0 && !W.me.d && W.def.tap)
		W.def.tap(W, W.me);
});
addEventListener("keyup", (e) => {
	const k = e.key.toLowerCase();
	KEYS.delete(k);
	if (W && (k === " " || k === "shift")) W.inp.hold = false;
	if (W && GFX.mode === "mg" && W.def.onKey && W.t >= 0 && !W.me.d) W.def.onKey(W, k, false);
});
addEventListener("blur", () => KEYS.clear());
