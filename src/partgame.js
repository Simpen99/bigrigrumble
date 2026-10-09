/* ---------- items, upgrades, teams ---------- */
const ITEMS = {
	nitro: { name: "Nitro", cost: 5, icon: "🔥", desc: "+3 spaces on this roll" },
	turbo: { name: "Turbo Die", cost: 8, icon: "🎲", desc: "Roll two standard dice and add them up" },
	golden: { name: "Golden Die", cost: 14, icon: "⭐", desc: "Choose any roll from 1 to 10", pick: "value" },
	tow: { name: "Tow Hook", cost: 10, icon: "🪝", desc: "Swap places with any truck", pick: "target" },
	magnet: { name: "Coin Magnet", cost: 8, icon: "🧲", desc: "Steal up to 8 coins from a rival", pick: "target" },
	spikes: {
		name: "Spike Strip",
		cost: 6,
		icon: "📌",
		desc: "Trap your space. The next rival to land there pays you 10",
	},
	grinder: {
		name: "Portable Grinder",
		cost: 20,
		icon: "⚙️",
		desc: "Grind all your shards into obsidian dust on the spot",
		shards: true,
	},
};
const UPGRADES = {
	tires: { name: "Big Tires", cost: 16, icon: "🛞", desc: "+1 space on every roll" },
	scoop: { name: "Coin Scoop", cost: 12, icon: "🪣", desc: "+2 coins on blue spaces, +3 on scrap piles" },
	armor: {
		name: "Armor Plating",
		cost: 14,
		icon: "🛡️",
		desc: "Red spaces and crushers cost nothing, and Magnet Mike can't grab you",
	},
};
/* Volcano Quarry cargo: obsidian shards (crater-floor blues +1, obsidian +2) → ground into obsidian dust at a refinery (1 shard = 1 dust) → the factory melts 5 dust into a battery (+ 10 coins), or sells one for 50 coins */
/* no carry limits on shards or dust (the map is meant to get wild) */
const SHARD_MAX = 999,
	DUST_MAX = 999,
	DUST_BAT = 5,
	DUST_COINS = 10,
	RAW_PRICE = 50,
	BOT_RICH = 25,
	BIG_SHARD = 15;
const shardMap = () => !!((typeof G !== "undefined" && G && MAPS[G.map]) || MAP || {}).shards;
const canDust = (p) => shardMap() && (p.dust | 0) >= DUST_BAT && p.coins >= DUST_COINS;
const rawPrice = () => (shardMap() ? RAW_PRICE : PRICE);
const canBuy = (p) => canDust(p) || p.coins >= rawPrice();
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
/* adds shards up to the truck bed limit; returns { got, lost } */
function addShards(p, k) {
	const got = Math.max(0, Math.min(k, SHARD_MAX - (p.shards | 0)));
	p.shards = (p.shards | 0) + got;
	return { got, lost: k - got };
}
/* lava costs a shard (armor keeps the cargo safe too); returns a text fragment */
function loseShard(p) {
	if (!shardMap() || !(p.shards | 0) || has(p, "armor")) return "";
	p.shards--;
	return "1 shard";
}
/* refinery: grinds every shard into a scoop of dust while the dust bag has room; returns how many */
function refine(p) {
	const k = Math.max(0, Math.min(p.shards | 0, DUST_MAX - (p.dust | 0)));
	p.shards = (p.shards | 0) - k;
	p.dust = (p.dust | 0) + k;
	return k;
}
/* ---------- routes: at any crossing you may take any road, also against the usual direction, except straight back the way you came ----------
   p.from = the space a truck arrived from; unknown (start, teleports) means heading the usual way */
const nbrs = (i) => [...new Set(MAP.nodes[i].next.concat(MAP.nodes[i].prev))];
function travelOpts(i, from) {
	const n = MAP.nodes[i],
		nb = nbrs(i);
	if (from === undefined || from === null || !nb.includes(from)) from = n.prev[0];
	const o = nb.filter((j) => j !== from);
	return o.length ? o : nb;
}
/* fewest spaces from `to` (just reached from `from`) to `target`, picking the best road at every crossing */
const RDC = {};
function routeDist(from, to, target) {
	if (to === target) return 0;
	const key = MAP.id + ":" + from + ":" + to + ":" + target;
	if (key in RDC) return RDC[key];
	const seen = new Set([to + ">" + from]);
	let q = [[to, from]],
		d = 0,
		res = 99;
	while (q.length && res === 99 && d < 99) {
		d++;
		const nq = [];
		for (const [c, f] of q)
			for (const nx of travelOpts(c, f)) {
				if (nx === target) {
					res = d;
					break;
				}
				const k = nx + ">" + c;
				if (!seen.has(k)) {
					seen.add(k);
					nq.push([nx, c]);
				}
			}
		q = nq;
	}
	return (RDC[key] = res);
}
const playerDist = (p, target) => routeDist(p.from, p.pos, target);
const itemHere = (k) => !ITEMS[k].shards || shardMap();
/* rail-cart ride: a random run along the roads (8–14 spaces, never straight back), then the quickest way home; every loose shard on the way is picked up */
function railPath(start) {
	const path = [];
	let cur = start,
		from = null;
	const n = 8 + rnd(7);
	for (let k = 0; k < n; k++) {
		const o = travelOpts(cur, from);
		const nx = o[rnd(o.length)];
		path.push(nx);
		from = cur;
		cur = nx;
	}
	const key = (st) => st[0] + ">" + st[1],
		s0 = [cur, from],
		par = new Map([[key(s0), null]]);
	let q = [s0],
		end = null;
	while (q.length && !end) {
		const nq = [];
		for (const st of q) {
			for (const nx of travelOpts(st[0], st[1])) {
				const ns = [nx, st[0]];
				if (par.has(key(ns))) continue;
				par.set(key(ns), st);
				if (nx === start) {
					end = ns;
					break;
				}
				nq.push(ns);
			}
			if (end) break;
		}
		q = nq;
	}
	if (!end) return path.concat(path.slice(0, -1).reverse(), [start]);
	const back = [];
	for (let st = end; st && key(st) !== key(s0); st = par.get(key(st))) back.push(st[0]);
	return path.concat(back.reverse());
}
function railRide(p, done) {
	const start = p.pos,
		path = railPath(start);
	if (path[path.length - 1] !== start) path.push(start);
	let got = 0;
	HG.ride = { pid: p.key, n: rid(), at: start, path: path.slice(), dt: 0.24 };
	HG.ev = { title: "Rail cart!", text: `${p.name} plops into a rail cart for a wild ride…`, n: rid() };
	HG.msg = HG.ev.text;
	HG.phase = "moving";
	push();
	const st = (k) => {
		if (!HG) return;
		if (k >= path.length) {
			p.pos = start;
			p.from = null;
			HG.ride = null;
			HG.ev = {
				title: "Rail cart!",
				text: got
					? `${p.name} rolls back in with ${plural(got, "loose shard")}!`
					: `${p.name} rolls back in empty-handed.`,
				n: rid(),
			};
			HG.msg = HG.ev.text;
			push();
			later(done, 1700);
			return;
		}
		p.from = p.pos;
		p.pos = path[k];
		if (HG.loose && HG.loose[p.pos]) {
			delete HG.loose[p.pos];
			addShards(p, 1);
			got++;
		}
		push();
		later(() => st(k + 1), 240);
	};
	later(() => st(0), 1100);
}
const TEAMS = [
	{ name: "Team Rust", col: "#FF8A1F" },
	{ name: "Team Chrome", col: "#2F7DE1" },
];
const DUEL_POOL = [
	"bumper",
	"light",
	"drag",
	"park",
	"coins",
	"cones",
	"hill",
	"tiles",
	"rocks",
	"hop",
	"scoop",
	"sort",
	"taco",
	"tow",
	"drift",
	"race",
];
const has = (p, u) => !!(p && p.up && p.up.includes(u));
const mate = (a, b) => !!(G && G.teams && a && b && a !== b && (a.team || 0) === (b.team || 0));
const inMg = (k) => !HG.mg || !HG.mg.part || HG.mg.part.includes(k);
const clampScore = (s) => Math.max(0, Math.min(99999, Math.round(s)));
let forkCont = null,
	shopCont = null,
	duelCont = null,
	duelDone = null,
	uiPick = null;
function teamTotals() {
	const t = [
		{ bat: 0, coins: 0 },
		{ bat: 0, coins: 0 },
	];
	G.players.forEach((p) => {
		const k = p.team || 0;
		t[k].bat += p.bat;
		t[k].coins += p.coins;
	});
	return t;
}
function standings(ps) {
	if (!G || !G.teams) return ps.slice().sort((a, b) => b.bat - a.bat || b.coins - a.coins);
	const T = teamTotals();
	return ps.slice().sort((a, b) => {
		const A = T[a.team || 0],
			Bt = T[b.team || 0];
		return Bt.bat - A.bat || Bt.coins - A.coins || b.bat - a.bat || b.coins - a.coins;
	});
}

/* ---------- host: actions ---------- */
function handleAct(pl, act) {
	if (!HG || !pl || !act || typeof act.id !== "string" || processed[pl.key] === act.id) return;
	if (act.t === "mg") {
		if (HG.phase !== "minigame" || !HG.mg || act.nonce !== HG.mg.nonce) return;
		processed[pl.key] = act.id;
		const s = Number(act.score);
		if (isFinite(s) && inMg(pl.key)) HG.mg.res[pl.key] = clampScore(s);
		const dev = HG.mg.simDev || "host";
		if (
			act.bots &&
			typeof act.bots === "object" &&
			((dev === "host" && (pl.key === me.key || pl.local)) || dev === pl.key)
		)
			for (const k in act.bots) {
				const b = pByKey(k),
					v = Number(act.bots[k]);
				if (b && b.bot && inMg(k) && !(k in HG.mg.res) && isFinite(v)) HG.mg.res[k] = clampScore(v);
			}
		push();
		checkMgDone();
		return;
	}
	if (act.t === "ready") {
		if (HG.phase === "minigame" && HG.mg && act.nonce === HG.mg.nonce && !HG.mg.t0) {
			processed[pl.key] = act.id;
			HG.mg.ready[pl.key] = 1;
			push();
			checkReady();
		}
		return;
	}
	if ((act.t === "start" || act.t === "addcpu" || act.t === "prac") && HG.tv && HG.phase === "lobby") {
		const lead = HG.players.find((p) => !p.bot);
		if (lead === pl) {
			processed[pl.key] = act.id;
			if (act.t === "start") hostStart();
			else if (act.t === "prac") tvPractice(String(act.g));
			else addCpu();
		}
		return;
	}
	if (act.seq !== HG.seq) return;
	if ((HG.intro || HG.hold) && (act.t === "roll" || act.t === "item")) return;
	processed[pl.key] = act.id;
	const c = cur();
	if (act.t === "roll" && HG.phase === "turn" && c.key === pl.key) doRoll(pl, act.die === "char" ? "char" : "std");
	else if (act.t === "item" && HG.phase === "turn" && c.key === pl.key) useItem(pl, act);
	else if (HG.test && act.t === "troll" && HG.phase === "turn" && c.key === pl.key) {
		HG.mod.fixed = Math.max(1, Math.min(20, act.n | 0));
		doRoll(pl, "std");
	} else if (HG.test && act.t === "tjump" && HG.phase === "turn" && c.key === pl.key && MAP.nodes[act.to | 0]) {
		pl.pos = act.to | 0;
		pl.from = null;
		HG.phase = "moving";
		HG.seq++;
		HG.left = 0;
		HG.msg = `${pl.name} jumps to a space (test mode).`;
		push();
		later(() => land(pl, true), 900);
	} else if (HG.test && act.t === "tgive" && HG.phase === "turn" && c.key === pl.key) {
		const w = String(act.w);
		if (w === "coins") pl.coins += 20;
		if (w === "shards") pl.shards = (pl.shards | 0) + 5;
		if (w === "dust") pl.dust = (pl.dust | 0) + 3;
		if (w === "lava") {
			HG.round++;
			lavaRound();
		}
		HG.seq++;
		push();
	} else if (act.t === "buy" && HG.phase === "buy" && HG.buy && HG.buy.pid === pl.key)
		resolveBuy(!!act.yes, undefined, act.how === "coins" ? "coins" : "cell");
	else if (act.t === "fork" && HG.phase === "fork" && HG.fork && HG.fork.pid === pl.key) resolveFork(Number(act.to));
	else if (act.t === "shop" && HG.phase === "shop" && HG.shop && HG.shop.pid === pl.key)
		resolveShop(pl, typeof act.what === "string" ? act.what : null);
	else if (act.t === "duel" && HG.phase === "duelpick" && HG.duelPick && HG.duelPick.pid === pl.key)
		resolveDuelPick(pl, act.target);
}
/* TV lobby: play one minigame with everyone here, no coins, then back to the lobby */
function tvPractice(g) {
	if (!HG || !HG.tv || HG.phase !== "lobby" || !MG[g] || HG.players.length < 1) return;
	MAP = MAPS[HG.map] || JUNK;
	startMinigame(null, g);
	HG.mg.prac = true;
	HG.msg = `Practice: ${MG[g].name}`;
	push();
}
function addCpu() {
	if (!HG || HG.players.length >= 8) return;
	const used = HG.players.map((p) => p.truck),
		free = TRUCKS.map((t, i) => i).filter((i) => !used.includes(i)),
		tr = free.length ? free[rnd(free.length)] : rnd(TRUCKS.length);
	HG.players.push(newPlayer(rid(), "CPU " + TRUCKS[tr].name.split(" ")[0], tr, true, false));
	push();
}
function pickFactory(old) {
	let c = MAP.nodes
		.map((n, i) => i)
		.filter(
			(i) => MAP.nodes[i].t === "B" && !MAP.nodes[i].ref && i !== 0 && (old < 0 || MAP.D[i][old] >= 5) && facSpot(i).ok,
		);
	/* Volcano Quarry: never on lava (now or next round); while the lava is low it often hides down in the crater */
	if (MAP.lava && HG) {
		const r = HG.round || 1,
			safe = c.filter((i) => !flooded(i, r) && !flooded(i, r + 1));
		if (safe.length) c = safe;
		const low = c.filter((i) => MAP.nodes[i].lv);
		if (low.length && lavaLv(r) === 0 && Math.random() < 0.5) c = low;
	}
	return c[rnd(c.length)];
}
/* map dice multiplier (Volcano Quarry 1.5x): every face scaled and rounded, coin bonuses unchanged */
const diceMul = () => (MAP && MAP.dice) || 1;
function mulFaces(faces) {
	const k = diceMul();
	return k === 1 ? faces : faces.map((f) => ({ m: Math.round(f.m * k), c: f.c }));
}
function hostStart() {
	if (HG.players.length < 2) return;
	MAP = MAPS[HG.map] || JUNK;
	HG.map = MAP.id;
	const a = HG.players;
	for (let i = a.length - 1; i > 0; i--) {
		const j = rnd(i + 1);
		[a[i], a[j]] = [a[j], a[i]];
	}
	a.forEach((p, i) => {
		p.pos = 0;
		p.from = null;
		p.coins = START_COINS;
		p.bat = 0;
		p.shards = 0;
		p.dust = 0;
		p.items = [];
		p.up = [];
		if (p.team === undefined) p.team = i % 2;
	});
	HG.round = 1;
	HG.turn = 0;
	HG.factory = pickFactory(-1);
	HG.kick = [];
	HG.lastMg = null;
	HG.roll = HG.fx = HG.ev = HG.mg = HG.buy = HG.fork = HG.shop = HG.duelPick = null;
	HG.used = [];
	HG.traps = {};
	HG.obs = {};
	HG.erupt = null;
	HG.loose = {};
	HG.cart = HG.grind = HG.ride = null;
	HG.bigShard = true;
	if (MAP.lava) rollGeysers();
	HG.rival = MAP.rival ? { at: MAP.rivalHome, carry: null } : null;
	HG.intro = true;
	later(() => {
		if (!HG || !HG.intro) return;
		HG.intro = false;
		rivalNote();
		lavaRound();
		push();
	}, 5000);
	startTurn();
}
function startTurn() {
	const p = cur();
	HG.phase = "turn";
	HG.seq++;
	HG.roll = null;
	HG.buy = null;
	HG.mod = { used: false, plus: 0 };
	HG.msg = `${p.name}'s turn`;
	push();
	if (p.bot) {
		const s = HG.seq;
		let waited = false;
		const go = () => {
			if (!HG || HG.phase !== "turn" || HG.seq !== s) return;
			if (HG.intro || HG.hold) {
				waited = true;
				later(go, 300);
				return;
			}
			if (waited) {
				waited = false;
				later(go, 900);
				return;
			}
			botItem(p);
			const s2 = HG.seq;
			later(
				() => {
					if (HG && HG.phase === "turn" && HG.seq === s2) doRoll(cur(), Math.random() < 0.65 ? "char" : "std");
				},
				HG.mod.used ? 1800 : 300,
			);
		};
		later(go, 1300);
	}
}
function botItem(p) {
	if (!p.items || !p.items.length || Math.random() < 0.3) return;
	const opp = HG.players.filter((o) => o !== p && !mate(p, o)),
		idx = rnd(p.items.length),
		it = p.items[idx],
		a = { idx };
	if (it === "tow") {
		const all = HG.players.filter((o) => o !== p);
		if (!all.length) return;
		a.target = all.slice().sort((x, y) => playerDist(x, HG.factory) - playerDist(y, HG.factory))[0].key;
		if (playerDist(p, HG.factory) <= playerDist(pByKey(a.target), HG.factory)) return;
	}
	if (it === "magnet") {
		if (!opp.length) return;
		a.target = opp.slice().sort((x, y) => y.coins - x.coins)[0].key;
	}
	if (it === "grinder" && (p.shards | 0) < 3) return;
	if (it === "golden") {
		const d = playerDist(p, HG.factory);
		if (!(d >= 1 && d <= 10) || !canBuy(p)) return;
		a.val = d;
	}
	useItem(p, a);
}
function useItem(p, a) {
	if (!HG.mod || HG.mod.used) return;
	const idx = a.idx | 0,
		it = (p.items || [])[idx];
	if (!it) return;
	const def = ITEMS[it];
	const o = a.target ? pByKey(a.target) : null;
	if (def.pick === "target" && (!o || o === p || (it === "magnet" && mate(p, o)))) return;
	p.items.splice(idx, 1);
	HG.mod.used = true;
	let text = "";
	if (it === "nitro") {
		HG.mod.plus += 3;
		text = `${p.name} fires up Nitro: +3 spaces this turn.`;
	}
	if (it === "turbo") {
		HG.mod.turbo = true;
		text = `${p.name} will roll two dice this turn.`;
	}
	if (it === "golden") {
		HG.mod.fixed = Math.max(1, Math.min(10, a.val | 0 || 6));
		text = `${p.name} uses the Golden Die and picks ${HG.mod.fixed}.`;
	}
	if (it === "tow") {
		[p.pos, o.pos] = [o.pos, p.pos];
		p.from = o.from = null;
		text = `${p.name} hooks ${o.name} and swaps places!`;
	}
	if (it === "magnet") {
		const s = Math.min(8, o.coins);
		o.coins -= s;
		p.coins += s;
		text = `${p.name} pulls ${s} coins from ${o.name}.`;
	}
	if (it === "spikes") {
		HG.traps[p.pos] = p.key;
		text = `${p.name} drops a spike strip on this space.`;
	}
	if (it === "grinder") {
		const k = refine(p);
		HG.grind = { pid: p.key, at: -1, k, n: rid() };
		text = k
			? `${p.name} fires up a portable grinder: ${plural(k, "shard")} into dust.`
			: `${p.name} fires up a portable grinder, but has no shards to grind.`;
	}
	HG.ev = { title: `${def.icon} ${def.name}`, text, n: rid() };
	HG.msg = text;
	HG.seq++;
	push();
}
function doRoll(p, die) {
	delete offSince[p.key];
	const faces = mulFaces(die === "char" ? TRUCKS[p.truck].faces : STD),
		m = HG.mod || {},
		sf = mulFaces(STD);
	let idx = rnd(6),
		f = faces[idx],
		lbl = null,
		dk = die;
	if (m.fixed) {
		f = { m: m.fixed, c: 0 };
		dk = "gold";
		lbl = `Golden Die: ${m.fixed}`;
	} else if (m.turbo) {
		const i2 = rnd(6);
		dk = "std";
		f = { m: sf[idx].m + sf[i2].m, c: 0 };
		lbl = `Turbo: ${sf[idx].m} + ${sf[i2].m}`;
	}
	const extra = (m.plus || 0) + (has(p, "tires") ? 1 : 0),
		total = f.m + extra;
	if (extra)
		lbl = `${lbl || `Rolled ${f.m}`}${m.plus ? " + 3 Nitro" : ""}${has(p, "tires") ? " + 1 Big Tires" : ""} = ${total}`;
	HG.phase = "rolling";
	HG.seq++;
	HG.roll = { pid: p.key, die: dk, idx, val: m.fixed || 0, lbl, n: rid() };
	HG.msg = `${p.name} rolls…`;
	push();
	later(() => {
		let ct = "";
		if (f.c) {
			const b = p.coins;
			p.coins = Math.max(0, p.coins + f.c);
			ct = f.c > 0 ? ` and earns ${f.c} coins` : ` and pays ${b - p.coins} coins`;
		}
		HG.msg = total ? `${p.name} drives ${total} space${total > 1 ? "s" : ""}${ct}.` : `${p.name} stays parked${ct}.`;
		move(p, total, () => land(p, total > 0));
	}, 2600);
}
function move(p, steps, done) {
	HG.phase = "moving";
	HG.left = steps;
	push();
	const step = () => {
		if (HG.left <= 0) {
			done();
			return;
		}
		const nx = travelOpts(p.pos, p.from);
		const go = (to) =>
			later(
				() => {
					p.from = p.pos;
					p.pos = to;
					HG.left--;
					push();
					afterStep(p, step);
				},
				MAP.dice ? 380 : 470,
			);
		if (nx.length === 1) go(nx[0]);
		else askFork(p, nx, go);
	};
	step();
}
function afterStep(p, cont) {
	const n = MAP.nodes[p.pos],
		go = () => {
			if (p.pos === HG.factory) offerBuy(p, cont);
			else if (n.t === "SH" && HG.left > 0) offerShop(p, cont);
			else cont();
		};
	/* loose shards thrown out by rising lava: driving over one picks it up (if the truck bed has room) */
	if (HG.loose && HG.loose[p.pos] && shardMap() && (p.shards | 0) < SHARD_MAX) {
		delete HG.loose[p.pos];
		addShards(p, 1);
		HG.msg = `${p.name} scoops up a loose shard (${p.shards} shards).`;
		push();
		later(() => afterRef(p, n, go), 450);
		return;
	}
	afterRef(p, n, go);
}
function afterRef(p, n, go) {
	/* Volcano Quarry refinery: anyone carrying shards stops under the gate (either direction): the shards are sucked up, ground, and spat back down as dust (HG.grind drives the animation) */
	if (n.ref && shardMap() && (p.shards | 0) > 0) {
		if ((p.dust | 0) >= DUST_MAX) {
			HG.msg = `${p.name} passes the refinery, but their dust bag is full (${DUST_MAX}/${DUST_MAX}).`;
			push();
			later(go, 700);
			return;
		}
		const k = Math.min(p.shards | 0, DUST_MAX - (p.dust | 0));
		HG.grind = { pid: p.key, at: p.pos, k, n: rid() };
		HG.msg = `${p.name} pulls under the refinery…`;
		push();
		later(() => {
			if (!HG) return;
			refine(p);
			HG.ev = {
				title: "Refinery!",
				text: `${p.name}'s ${plural(k, "shard")} ${k === 1 ? "is" : "are"} ground into obsidian dust. Dust: ${p.dust}.`,
				n: rid(),
			};
			HG.msg = HG.ev.text;
			push();
			later(go, 1300);
		}, 3000);
		return;
	}
	go();
}
/* would this road run into lava this round or next? (bots steer clear) */
function lavaRisk(from, o) {
	if (!MAP.lava) return 0;
	let n = o,
		f = from;
	for (let k = 0; k < 7 && MAP.nodes[n]; k++) {
		if (flooded(n, HG.round) || flooded(n, HG.round + 1)) return 8;
		const nx = travelOpts(n, f)[0];
		f = n;
		n = nx;
	}
	return 0;
}
/* how far a road takes a bot from its goal. Volcano Quarry: dig in the crater until 3 shards, then the nearest refinery; the factory once they hold a cell (or are rich) */
function botDist(p, o) {
	const F = (t) => routeDist(p.pos, o, t),
		near = (l) => (l.length ? Math.min(...l.map(F)) : 99);
	if (!shardMap() || canDust(p) || p.coins >= RAW_PRICE + BOT_RICH) return F(HG.factory);
	const ids = MAP.nodes.map((n, i) => i);
	if (p.shards | 0 && (p.shards | 0) + (p.dust | 0) >= DUST_BAT && (p.dust | 0) < DUST_MAX)
		return near(ids.filter((i) => MAP.nodes[i].ref));
	const dig = ids.filter((i) => {
		const n = MAP.nodes[i];
		return (
			(["SD", "OB"].includes(n.t) ||
				(n.t === "MC" && HG.bigShard !== false) ||
				(n.t === "MR" && HG.loose && Object.keys(HG.loose).length > 2) ||
				(HG.obs && HG.obs[i]) ||
				(HG.loose && HG.loose[i])) &&
			!flooded(i, HG.round) &&
			!flooded(i, HG.round + 1)
		);
	});
	return dig.length ? near(dig) : F(HG.factory);
}
function askFork(p, opts, go) {
	if (p.bot) {
		const s = opts.slice().sort((a, b) => botDist(p, a) + lavaRisk(p.pos, a) - botDist(p, b) - lavaRisk(p.pos, b));
		const ch = Math.random() < 0.75 ? s[0] : opts[rnd(opts.length)];
		HG.msg = `${p.name} picks a road…`;
		push();
		later(() => go(ch), 700);
		return;
	}
	HG.phase = "fork";
	HG.seq++;
	HG.fork = { pid: p.key, opts: opts.slice(), at: p.pos };
	forkCont = go;
	HG.msg = `${p.name} reached a fork. Which way?`;
	push();
}
function resolveFork(to) {
	if (!HG.fork || !HG.fork.opts.includes(to)) return;
	HG.fork = null;
	HG.phase = "moving";
	HG.seq++;
	const g = forkCont;
	forkCont = null;
	push();
	if (g) g(to);
	else later(nextTurn, 500);
}
function offerBuy(p, cont) {
	if (!canBuy(p)) {
		HG.msg = shardMap()
			? `${p.name} passes the battery factory but needs ${DUST_BAT} obsidian dust + ${DUST_COINS} coins, or ${RAW_PRICE} coins.`
			: `${p.name} passes the battery factory but needs ${PRICE} coins.`;
		push();
		later(cont, 1100);
		return;
	}
	/* CPUs always use a cell; without one they only pay full price when rich (or in the last round) */
	if (p.bot && shardMap() && !canDust(p) && p.coins < RAW_PRICE + BOT_RICH && HG.round < HG.rounds) {
		HG.msg = `${p.name} drives past the battery factory, still collecting dust.`;
		push();
		later(cont, 1100);
		return;
	}
	HG.phase = "buy";
	HG.seq++;
	HG.buy = { pid: p.key };
	HG.msg = `${p.name} pulls into the battery factory.`;
	pendingCont = cont;
	push();
	if (p.bot) {
		const s = HG.seq;
		later(() => resolveBuy(true, s), 1300);
	}
}
function resolveBuy(yes, seqCheck, how) {
	if (!HG || HG.phase !== "buy") return;
	if (seqCheck !== undefined && seqCheck !== HG.seq) return;
	const p = pByKey(HG.buy.pid);
	delete offSince[p.key];
	HG.buy = null;
	HG.seq++;
	HG.phase = "moving";
	const cont = pendingCont || (() => land(p, true));
	pendingCont = null;
	/* Volcano Quarry: the factory melts 5 dust + 10 coins into a battery (the default when possible), or sells one for 50 coins */
	const cell = canDust(p) && how !== "coins",
		price = cell ? DUST_COINS : rawPrice();
	if (yes && p.coins >= price) {
		p.coins -= price;
		if (cell) p.dust -= DUST_BAT;
		p.bat++;
		HG.factory = pickFactory(HG.factory);
		HG.fx = { t: "bat", pid: p.key, n: rid() };
		HG.msg = `${p.name} bought a battery${shardMap() ? (cell ? ` melted from ${DUST_BAT} obsidian dust and ${DUST_COINS} coins` : ` for ${price} coins`) : ""}! The factory is moving.`;
		push();
		later(cont, 6500);
	} else {
		HG.msg = `${p.name} keeps driving.`;
		push();
		later(cont, 500);
	}
}
function buyThing(p, what) {
	if (ITEMS[what]) {
		const it = ITEMS[what];
		if (p.coins < it.cost || p.items.length >= 3) return "";
		p.coins -= it.cost;
		p.items.push(what);
		return `${p.name} buys a ${it.name}.`;
	}
	if (UPGRADES[what]) {
		const u = UPGRADES[what];
		if (p.coins < u.cost || has(p, what)) return "";
		p.coins -= u.cost;
		p.up.push(what);
		return `${p.name} installs ${u.name}!`;
	}
	return "";
}
function offerShop(p, cont) {
	if (p.bot) {
		const o = [];
		Object.keys(UPGRADES).forEach((u) => {
			if (!has(p, u) && p.coins >= UPGRADES[u].cost + 8) o.push(u);
		});
		Object.keys(ITEMS).forEach((i) => {
			if (itemHere(i) && p.items.length < 3 && p.coins >= ITEMS[i].cost + 14) o.push(i);
		});
		const t = o.length && Math.random() < 0.65 ? buyThing(p, o[rnd(o.length)]) : "";
		HG.msg = t || `${p.name} browses the shop and keeps driving.`;
		push();
		later(cont, 1100);
		return;
	}
	HG.phase = "shop";
	HG.seq++;
	HG.shop = { pid: p.key };
	shopCont = cont;
	HG.msg = `${p.name} pulls into the Scrap Shop.`;
	push();
}
function resolveShop(p, what) {
	const t = what ? buyThing(p, what) : "";
	if (what && !t) return;
	HG.shop = null;
	HG.phase = "moving";
	HG.seq++;
	HG.msg = t || `${p.name} leaves the shop.`;
	if (t) HG.ev = { title: "Scrap Shop", text: t, n: rid() };
	push();
	const c = shopCont;
	shopCont = null;
	later(c || nextTurn, t ? 1400 : 400);
}
function land(p, moved) {
	if (!moved) {
		push();
		later(nextTurn, 1900);
		return;
	}
	const tr = HG.traps[p.pos];
	if (tr && tr !== p.key) {
		const o = pByKey(tr);
		delete HG.traps[p.pos];
		if (o && !mate(p, o)) {
			const s = Math.min(10, p.coins);
			p.coins -= s;
			o.coins += s;
			HG.ev = {
				title: "📌 Spike strip!",
				text: `${p.name} runs over ${o.name}'s spikes and pays ${s} coins.`,
				n: rid(),
			};
		}
	}
	spaceEffect(p, true, () => later(nextTurn, 1800));
}
function spaceEffect(p, allowEvent, done) {
	const n = MAP.nodes[p.pos],
		t = n.t,
		sc = has(p, "scoop"),
		ar = has(p, "armor");
	if (p.pos === HG.factory) {
		HG.msg = `${p.name} parks at the factory.`;
		push();
		done();
		return;
	}
	if (t === "GY" && gyTarget(p.pos) !== undefined) {
		HG.ev = { title: "Geyser!", text: `A steam geyser blasts ${p.name} up the slope!`, n: rid() };
		HG.msg = HG.ev.text;
		push();
		later(() => {
			p.pos = gyTarget(p.pos);
			p.from = null;
			push();
			later(() => spaceEffect(p, false, done), 1300);
		}, 1200);
		return;
	}
	if (flooded(p.pos, HG.round)) {
		const b = p.coins;
		if (!ar) p.coins = Math.max(0, p.coins - 5);
		const ls = loseShard(p);
		HG.ev = {
			title: "Scorched!",
			text: ar
				? `${p.name} parks on the lava crust. The armor takes the heat.`
				: `${p.name} parks on the lava crust and pays ${b - p.coins} coins in burnt tyres${ls ? `. ${ls} melts away` : ""}.`,
			n: rid(),
		};
		HG.msg = HG.ev.text;
		push();
		done();
		return;
	}
	if (t === "OB" || (HG.obs && HG.obs[p.pos])) {
		if (shardMap()) {
			const r = addShards(p, 2);
			HG.ev = r.lost
				? {
						title: "Truck bed full!",
						text: `${p.name} chips off obsidian${r.got ? ` and keeps ${plural(r.got, "shard")}` : ""}, but ${plural(r.lost, "shard")} ${r.lost === 1 ? "falls" : "fall"} off the back (max ${SHARD_MAX}).`,
						n: rid(),
					}
				: { title: "Obsidian!", text: `${p.name} chips off a chunk of obsidian: +2 shards.`, n: rid() };
		} else {
			p.coins += 8;
			HG.ev = { title: "Obsidian!", text: `${p.name} chips off a chunk of obsidian: +8 coins.`, n: rid() };
		}
		HG.msg = HG.ev.text;
		push();
		done();
		return;
	}
	if (t === "SD") {
		const r = addShards(p, 1);
		if (r.lost) {
			HG.ev = {
				title: "Truck bed full!",
				text: `${p.name} digs up a shard, but the truck bed is full (max ${SHARD_MAX}). It falls off the back.`,
				n: rid(),
			};
			HG.msg = HG.ev.text;
		} else HG.msg = `${p.name} digs out an obsidian shard (${p.shards} shards).`;
		push();
		done();
		return;
	}
	/* minecart: a ride round the rails on the crater's central pillar and back to the same space, picking up 1–3 shards on the way (HG.cart drives the animation) */
	if (t === "MC") {
		const boom = HG.bigShard !== false;
		if (boom) HG.bigShard = false;
		HG.cart = { pid: p.key, at: p.pos, boom, n: rid() };
		HG.ev = { title: "Minecart!", text: `${p.name} plops into the minecart and heads up the pillar…`, n: rid() };
		HG.msg = HG.ev.text;
		push();
		later(() => {
			if (!HG) return;
			if (boom) addShards(p, BIG_SHARD);
			HG.ev = {
				title: "Minecart!",
				text: boom
					? `${p.name} smashes straight through the giant crystal: +${BIG_SHARD} shards!`
					: `${p.name} rides the pillar, but the giant crystal hasn't grown back yet.`,
				n: rid(),
			};
			HG.msg = HG.ev.text;
			push();
			later(done, 900);
		}, 7200);
		return;
	}
	/* rail cart: a random ride along the roads and back to this space, scooping up every loose shard it passes (HG.ride puts a cart under the truck) */
	if (t === "MR") {
		railRide(p, done);
		return;
	}
	if (t === "B" || t === "S") {
		const dbl = false,
			g = 3 + (sc ? 2 : 0);
		p.coins += g;
		HG.msg = `${p.name} lands on blue${dbl ? " in the crater (double)" : ""}: +${g} coins.`;
	} else if (t === "R") {
		if (ar) HG.msg = `${p.name}'s armor shrugs off the red space.`;
		else {
			const b = p.coins;
			p.coins = Math.max(0, p.coins - 3);
			HG.msg = `${p.name} lands on red: −${b - p.coins} coins.`;
		}
	} else if (t === "SC") {
		const r = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15][rnd(11)] + (sc ? 3 : 0);
		p.coins += r;
		HG.ev = {
			title: MAP.lava ? "Ore cart!" : "Scrap pile!",
			text: r ? `${p.name} digs up ${r} coins.` : `${p.name} finds nothing but rust.`,
			n: rid(),
		};
		HG.msg = HG.ev.text;
	} else if (t === "CR") {
		const b = p.coins;
		if (!ar) p.coins = Math.max(0, p.coins - 5);
		const it = Object.keys(ITEMS)[rnd(6)];
		let got;
		if (p.items.length < 3) {
			p.items.push(it);
			got = ` and pulls a ${ITEMS[it].name} ${ITEMS[it].icon} out of the scrap`;
		} else got = ", but has no room for the item it found";
		HG.ev = {
			title: "Crusher!",
			text: `${p.name} gets crushed${ar ? " (the armor held)" : ` for ${b - p.coins} coins`}${got}.`,
			n: rid(),
		};
		HG.msg = HG.ev.text;
	} else if (t === "CV" && n.conv) {
		push();
		later(() => conveyor(p, n, done), 700);
		return;
	} else if (t === "D") {
		push();
		later(() => duelStart(p, done), 700);
		return;
	} else if (t === "SH") {
		push();
		offerShop(p, done);
		return;
	} else if (t === "E" && allowEvent) {
		doEvent(p, done);
		return;
	} else HG.msg = `${p.name} rolls to a stop.`;
	push();
	done();
}
function conveyor(p, n, done) {
	HG.ev = {
		title: "Conveyor belt!",
		text: `The belt drags ${p.name} ${n.conv.dir > 0 ? "forward" : "backward"} ${n.conv.n} spaces.`,
		n: rid(),
	};
	HG.msg = HG.ev.text;
	HG.phase = "moving";
	push();
	const st = (k) => {
		if (k <= 0) {
			push();
			done();
			return;
		}
		later(() => {
			const c = MAP.nodes[p.pos],
				nx = n.conv.dir > 0 ? c.next[0] : c.prev[0];
			if (nx !== undefined) {
				p.pos = nx;
				p.from = null;
			}
			push();
			st(k - 1);
		}, 420);
	};
	later(() => st(n.conv.n), 900);
}
function doEvent(p, done) {
	const others = HG.players.filter((x) => x !== p);
	let title = "",
		text = "",
		k = rnd(7);
	const n = rid();
	if (k === 0) {
		HG.ev = { title: "Tailwind!", text: `${p.name} gets blown 3 spaces ahead.`, n };
		HG.msg = HG.ev.text;
		push();
		later(() => move(p, 3, () => spaceEffect(p, false, done)), 1800);
		return;
	}
	if (k === 2 && !others.length) k = 3;
	if (k === 1) {
		const b = p.coins;
		p.coins = Math.max(0, p.coins - 5);
		title = "Pothole!";
		text = `${p.name} blows a tire and pays ${b - p.coins} coins for repairs.`;
	}
	if (k === 2) {
		const o = others[rnd(others.length)];
		[p.pos, o.pos] = [o.pos, p.pos];
		p.from = o.from = null;
		title = "Road swap!";
		text = `${p.name} and ${o.name} trade places.`;
	}
	if (k === 3) {
		p.coins += 8;
		title = "Lost cargo!";
		text = `${p.name} finds a crate of coins: +8.`;
	}
	if (k === 4) {
		HG.factory = pickFactory(HG.factory);
		title = "Factory relocates!";
		text = "The battery factory packs up and moves.";
	}
	if (k === 5) {
		title = "Lucky find!";
		if (shardMap()) {
			addShards(p, 1);
			text = `${p.name} spots a loose obsidian shard by the road: +1 shard.`;
		} else {
			p.coins += 5;
			text = `${p.name} finds 5 coins under the seat.`;
		}
	}
	if (k === 6) {
		const lead = others.filter((o) => !mate(p, o)).sort((a, b) => b.bat - a.bat || b.coins - a.coins)[0];
		if (lead && lead.coins > 0) {
			const t = Math.min(5, lead.coins);
			lead.coins -= t;
			p.coins += t;
			title = "Fuel tax!";
			text = `${lead.name} is leading, so they pay ${p.name} ${t} coins.`;
		} else {
			p.coins += 5;
			title = "Fuel tax!";
			text = `${p.name} gets a 5-coin refund.`;
		}
	}
	HG.ev = { title, text, n };
	HG.msg = text;
	push();
	later(done, 1000);
}
function duelStart(p, done) {
	const opps = HG.players.filter((o) => o !== p && !mate(p, o));
	if (!opps.length) {
		p.coins += 3;
		HG.msg = `Nobody to duel, so ${p.name} takes 3 coins.`;
		push();
		done();
		return;
	}
	if (p.bot) {
		startDuel(p, opps[rnd(opps.length)], done);
		return;
	}
	HG.phase = "duelpick";
	HG.seq++;
	HG.duelPick = { pid: p.key };
	duelCont = done;
	HG.msg = `${p.name} landed on a duel space. Pick an opponent!`;
	push();
}
function resolveDuelPick(p, target) {
	const o = pByKey(target);
	if (!o || o === p || mate(p, o)) return;
	HG.duelPick = null;
	HG.phase = "moving";
	HG.seq++;
	const d = duelCont;
	duelCont = null;
	startDuel(p, o, d || (() => later(nextTurn, 800)));
}
function startDuel(a, b, done) {
	if (a.bot && b.bot) {
		const w = Math.random() < 0.5 ? a : b,
			l = w === a ? b : a,
			s = Math.min(10, l.coins);
		l.coins -= s;
		w.coins += s;
		HG.ev = { title: "Duel!", text: `${w.name} beats ${l.name} and takes ${s} coins.`, n: rid() };
		HG.msg = HG.ev.text;
		push();
		later(done, 2600);
		return;
	}
	HG.ev = { title: "Duel!", text: `${a.name} challenges ${b.name}! Winner takes up to 10 coins.`, n: rid() };
	HG.msg = HG.ev.text;
	push();
	duelDone = done;
	later(() => startMinigame([a.key, b.key]), 2400);
}
function nextTurn() {
	if (!HG) return;
	HG.turn++;
	if (HG.turn >= HG.players.length) {
		HG.turn = 0;
		if (MAP.lava && lavaPh(HG.round) === 6) eruption(() => startMinigame());
		else if (MAP.rival && HG.rival && HG.round % RIVAL_EVERY === 0) rivalEvent(() => startMinigame());
		else startMinigame();
	} else startTurn();
}
/* Magnet Mike strikes at the end of every third round; each round opens with a countdown toast */
const RIVAL_EVERY = 3;
function rivalNote() {
	if (!MAP.rival || !HG.rival) return;
	const left = RIVAL_EVERY - ((HG.round - 1) % RIVAL_EVERY);
	if (HG.round + left - 1 > HG.rounds) return;
	HG.hold = true;
	later(() => {
		if (!HG || !HG.hold) return;
		HG.hold = false;
		push();
	}, 2800);
	HG.ev = {
		title: "🧲 Magnet Mike",
		text:
			left === 1
				? "He strikes at the end of this round! Someone's getting hauled away."
				: `He strikes in ${left} rounds.`,
		n: rid(),
		k: "mike",
		left,
	};
}
function rivalEvent(done) {
	const cands = HG.players.filter((p) => !has(p, "armor") && p.coins > 0);
	if (!cands.length) {
		HG.msg = "Magnet Mike finds nobody worth grabbing this round.";
		push();
		later(done, 1500);
		return;
	}
	const max = Math.max(...cands.map((p) => p.coins)),
		tops = cands.filter((p) => p.coins === max),
		v = tops[rnd(tops.length)];
	HG.phase = "rival";
	HG.seq++;
	HG.rival.at = v.pos;
	HG.rival.carry = null;
	HG.ev = {
		title: "🧲 Magnet Mike!",
		text: `${v.name} has the most coins, so Magnet Mike is coming for them!`,
		n: rid(),
	};
	HG.msg = HG.ev.text;
	push();
	later(() => {
		if (!HG) return;
		HG.rival.carry = v.key;
		HG.msg = `Magnet Mike grabbed ${v.name}!`;
		push();
		later(() => {
			if (!HG) return;
			const o = MAP.nodes.map((n, i) => i).filter((i) => i !== v.pos && i !== HG.factory && MAP.D[i][v.pos] >= 4);
			const to = o[rnd(o.length)];
			HG.rival.at = to;
			HG.msg = `Magnet Mike hauls ${v.name} across the yard…`;
			push();
			later(() => {
				if (!HG) return;
				v.pos = to;
				v.from = null;
				HG.rival.carry = null;
				HG.msg = `${v.name} got dropped somewhere new.`;
				push();
				later(done, 1500);
			}, 2000);
		}, 1300);
	}, 2400);
}
/* Volcano Quarry: start-of-round lava news (it rises, drains, or will soon), pushing trucks off newly flooded spaces */
/* every round each geyser turns to a new random landing space anywhere on the map (not on lava, a geyser, the minecart or a refinery) */
const gyTarget = (i) => (HG && HG.gyT && HG.gyT[i] !== undefined ? HG.gyT[i] : MAP.nodes[i].gy);
function rollGeysers() {
	HG.gyT = {};
	const r = HG.round || 1,
		pool = MAP.nodes
			.map((n, i) => i)
			.filter((i) => {
				const n = MAP.nodes[i];
				return !["GY", "MC"].includes(n.t) && !n.ref && !n.br && !flooded(i, r);
			});
	MAP.nodes.forEach((n, i) => {
		if (n.t !== "GY") return;
		const far = pool.filter((j) => MAP.D[i][j] >= 4);
		const c = far.length ? far : pool;
		HG.gyT[i] = c[rnd(c.length)];
	});
}
/* rising lava throws loose shards out of the volcano onto dry spaces, more each level (6, then 10); they last until the lava drains */
function scatterShards(r) {
	HG.loose = HG.loose || {};
	const want = lavaLv(r) >= 2 ? 10 : 6;
	const pool = MAP.nodes
		.map((n, i) => i)
		.filter((i) => {
			const n = MAP.nodes[i];
			return (
				!flooded(i, r) && !flooded(i, r + 1) && !n.ref && !n.br && !["GY", "MC", "S"].includes(n.t) && i !== HG.factory
			);
		});
	pool.splice(0, pool.length, ...pool.filter((i) => !HG.loose[i]));
	for (let k = 0; k < want && pool.length; k++) HG.loose[pool.splice(rnd(pool.length), 1)[0]] = 1;
}
function lavaRound() {
	if (!MAP.lava || !HG) return;
	rollGeysers();
	if (shardMap()) HG.bigShard = true;
	const r = HG.round,
		lv = lavaLv(r),
		was = r > 1 ? lavaLv(r - 1) : 0,
		ph = lavaPh(r),
		parts = [];
	let title = "🌋 Lava";
	if (lv > was && shardMap()) {
		scatterShards(r);
		parts.push("Lava bursts throw loose shards onto the ledges: drive over them to grab one.");
	}
	if (lv < was) HG.loose = {};
	if (lv > was) {
		title = "🌋 Lava rises!";
		const moved = [];
		HG.players.forEach((p) => {
			if (!flooded(p.pos, r)) return;
			const safe = MAP.nodes
				.map((n, i) => i)
				.filter((i) => !flooded(i, r))
				.sort((a, b) => MAP.D[p.pos][a] - MAP.D[p.pos][b] || (MAP.nodes[b].y || 0) - (MAP.nodes[a].y || 0));
			p.pos = safe[0];
			p.from = null;
			const c = p.coins;
			if (!has(p, "armor")) p.coins = Math.max(0, p.coins - 3);
			const ls = loseShard(p),
				lost = [c - p.coins ? `−${c - p.coins}` : "", ls ? `−${ls}` : ""].filter(Boolean).join(", ");
			moved.push(`${p.name}${lost ? ` (${lost})` : ""}`);
		});
		parts.push(lv === 1 ? "The crater floor floods." : "The lower ledges flood.");
		if (moved.length) parts.push(`Pushed uphill: ${moved.join(", ")}.`);
		if (flooded(HG.factory, r)) {
			HG.factory = pickFactory(HG.factory);
			parts.push("The battery factory escapes uphill.");
		}
	} else if (lv < was) {
		title = "🌋 Lava drains";
		parts.push("The crater is open again!");
	}
	if (r < HG.rounds && lavaLv(r + 1) > lv)
		parts.push(`Lava rises next round: the ${lv === 0 ? "crater floor" : "lower ledges"} will flood!`);
	else if (ph === 6) parts.push("The volcano erupts at the end of this round!");
	else if (ph === 5 && r < HG.rounds) parts.push("Eruption at the end of next round.");
	else if (r === 1) parts.push("Lava stays low for 3 rounds. Dig in!");
	if (!parts.length) return;
	HG.ev = { title, text: parts.join(" "), n: rid() };
	HG.msg = HG.ev.text;
	HG.hold = true;
	later(() => {
		if (!HG || !HG.hold) return;
		HG.hold = false;
		push();
	}, 2800);
}
/* end of every 7th round: lava bombs turn 4 ledge spaces into obsidian, trucks in the crater get launched to the rim */
function eruption(done) {
	const pool = MAP.nodes
			.map((n, i) => i)
			.filter((i) => {
				const n = MAP.nodes[i];
				return !n.lv && !n.br && ["B", "R", "E", "SC", "D", "SD"].includes(n.t) && !n.ref && i !== HG.factory;
			}),
		hits = [];
	while (hits.length < 14 && pool.length) hits.push(pool.splice(rnd(pool.length), 1)[0]);
	HG.phase = "erupt";
	HG.seq++;
	HG.erupt = { n: rid(), hits };
	HG.ev = { title: "🌋 Eruption!", text: "The volcano blows! Lava bombs rain down all over the quarry.", n: rid() };
	HG.msg = HG.ev.text;
	push();
	later(() => {
		if (!HG) return;
		const out = [],
			rim = MAP.nodes.map((n, i) => i).filter((i) => MAP.nodes[i].rim && i !== HG.factory);
		HG.players.forEach((p) => {
			const n = MAP.nodes[p.pos];
			if (n.lv === 1) {
				p.pos = rim[rnd(rim.length)];
				p.from = null;
				out.push(`${p.name} is launched to the rim`);
			} else if (hits.includes(p.pos)) {
				const b = p.coins;
				if (!has(p, "armor")) p.coins = Math.max(0, p.coins - 5);
				out.push(`${p.name} gets hit${b - p.coins ? ` (−${b - p.coins})` : " (armor held)"}`);
			}
		});
		HG.loose = HG.loose || {};
		hits.forEach((h) => {
			HG.loose[h] = 1;
		});
		HG.ev = {
			title: "Eruption!",
			text: `${out.length ? out.join(", ") + ". " : ""}The bombs crack open into loose shards: drive over them to grab them.`,
			n: rid(),
		};
		HG.msg = HG.ev.text;
		push();
		later(done, 3200);
	}, 3800);
}
/* team minigames (Mario Party style): each truck's side is the colour of the space it stands on (blue or red, any other
   space is a coin flip). 4+ trucks split 1 vs 3 (1 vs N) or 2 vs 2 (any even-ish split) pick a game from that pool;
   everyone on one colour (or board team mode, or fewer than 4 trucks) plays free-for-all.
   Returns {mode, tm: {key: side}, tc: [side colours]}, side 0 = the solo truck in a 1 vs N game. */
const SIDE_COL = ["#2F7DE1", "#E5484D"];
function spaceSplit() {
	const ps = HG.players;
	if (HG.teams || ps.length < 4) return null;
	const tm = {};
	ps.forEach((p) => {
		const n = MAP.nodes[p.pos],
			t = n && n.t;
		tm[p.key] = t === "B" ? 0 : t === "R" ? 1 : rnd(2);
	});
	const n1 = ps.filter((p) => tm[p.key] === 1).length,
		n0 = ps.length - n1;
	if (!n0 || !n1) return null;
	const mode = Math.min(n0, n1) === 1 ? "1v3" : "2v2";
	const tc = SIDE_COL.slice();
	if (mode === "1v3" && n1 === 1) {
		ps.forEach((p) => (tm[p.key] = 1 - tm[p.key]));
		tc.reverse();
	}
	return { mode, tm, tc };
}
/* a forced team game (practice, TV practice): the solo truck is random (the host's own truck half the time), the rest split evenly */
var TEST_SIDE = null;
function forcedSplit(g) {
	const mode = MG[g].team,
		ps = HG.players;
	if (!mode || ps.length < 2) return null;
	const tm = {},
		hum = ps.find((p) => p.key === me.key) || ps.find((p) => !p.bot),
		order = ps.slice().sort(() => Math.random() - 0.5);
	if (mode === "1v3") {
		/* TEST_SIDE (tools/watch.mjs --side, nettest.mjs --solo) puts the host's truck on side 0 or 1, or names the solo player's key */
		const others = order.filter((p) => p !== hum),
			solo =
				typeof TEST_SIDE === "string" && ps.some((p) => p.key === TEST_SIDE)
					? ps.find((p) => p.key === TEST_SIDE)
					: TEST_SIDE === 0 && hum
						? hum
						: TEST_SIDE === 1
							? others[0]
							: hum && Math.random() < 0.5
								? hum
								: order[0];
		ps.forEach((p) => (tm[p.key] = p === solo ? 0 : 1));
	} else order.forEach((p, i) => (tm[p.key] = i % 2));
	return { mode, tm, tc: SIDE_COL.slice() };
}
const vsLabel = (tm) => {
	const n0 = Object.values(tm).filter((s) => s === 0).length;
	return `${n0} vs ${Object.keys(tm).length - n0}!`;
};
function startMinigame(duel, forceG, split) {
	let g;
	if (forceG) g = forceG;
	else if (duel) g = DUEL_POOL[rnd(DUEL_POOL.length)];
	else {
		HG.used = HG.used || [];
		/* never the same game twice in a row: with a small team pool that falls back to free-for-all */
		const pick = (mode) => Object.keys(MG).filter((k) => (MG[k].team || null) === mode && k !== HG.lastMg);
		split = spaceSplit();
		if (split && !pick(split.mode).length) split = null;
		const all = pick(split ? split.mode : null);
		let pool = all.filter((k) => !HG.used.includes(k));
		if (!pool.length) {
			HG.used = HG.used.filter((k) => !all.includes(k));
			pool = all;
		}
		g = pool[rnd(pool.length)];
		HG.used.push(g);
		HG.lastMg = g;
		if (split) {
			/* the reveal: a "1 vs 3!" sticker over the board, then the minigame */
			HG.phase = "teams";
			HG.seq++;
			HG.ev = { title: vsLabel(split.tm), text: "", vs: split.tm, tc: split.tc, n: rid() };
			HG.msg = `Team minigame: ${vsLabel(split.tm)}`;
			push();
			later(() => startMinigame(null, g, split), 3000);
			return;
		}
	}
	if (forceG && !split && MG[g].team) split = forcedSplit(g);
	let simDev = "host";
	const tvg = !HG.tv ? 0 : tvPlayable(g) ? 1 : "split";
	if (tvg === 1) {
	} else if (duel) {
		const ps = duel.map(pByKey);
		if (!ps.some((q) => q.key === me.key || q.local)) {
			const h = ps.find((q) => !q.bot);
			if (h) simDev = h.key;
		}
	} else if (HG.tv) {
		const h = HG.players.find((q) => !q.bot && online(q.key));
		if (h) simDev = h.key;
	}
	HG.phase = "minigame";
	HG.seq++;
	mgClosing = false;
	HG.mg = {
		g,
		nonce: rid(),
		res: {},
		aw: null,
		order: null,
		seed: rnd(1e9),
		t0: null,
		ready: {},
		part: duel || null,
		duel: !!duel,
		simDev,
		tv: tvg,
		team: split ? split.mode : null,
		tm: split ? split.tm : null,
		tc: split ? split.tc : null,
	};
	if (!GFX.ok)
		HG.players.forEach((p) => {
			if (p.bot && inMg(p.key)) HG.mg.res[p.key] = MG[g].botScore(split ? split.tm[p.key] : undefined);
		});
	HG.msg = duel ? `Duel: ${MG[g].name}!` : `Minigame: ${MG[g].name}!`;
	mgDeadline = Infinity;
	mgWait = Date.now();
	push();
	checkMgDone();
}
function mgStartCountdown() {
	if (!HG || HG.phase !== "minigame" || !HG.mg || HG.mg.t0) return;
	const d = MG[HG.mg.g];
	HG.mg.t0 = Date.now() + 4500;
	mgDeadline =
		Date.now() + (d.dur + 35 + HG.players.filter((p) => p.local && inMg(p.key)).length * (d.dur + 20)) * 1000;
	push();
}
function checkReady() {
	if (!HG || HG.phase !== "minigame" || !HG.mg || HG.mg.t0) return;
	const need = HG.players.filter((p) => inMg(p.key) && !p.bot && online(p.key) && !(p.local && !HG.mg.part));
	if (need.length && need.every((p) => HG.mg.ready[p.key])) mgStartCountdown();
}
function checkMgDone() {
	if (!HG || HG.phase !== "minigame" || mgClosing) return;
	if (HG.players.filter((p) => inMg(p.key)).every((p) => p.key in HG.mg.res || (!p.bot && !online(p.key)))) {
		mgClosing = true;
		later(finishMg, 900);
	}
}
function finishMg() {
	if (!HG || HG.phase !== "minigame") return;
	const def = MG[HG.mg.g],
		res = HG.mg.res,
		part = HG.players.filter((p) => inMg(p.key));
	part.forEach((p) => {
		if (p.bot && !(p.key in res)) res[p.key] = def.botScore(HG.mg.tm ? HG.mg.tm[p.key] : undefined);
	});
	if (HG.mg.duel) {
		const [a, b] = part,
			sa = res[a.key],
			sb = res[b.key];
		let w = null;
		if (sa !== undefined && sb === undefined) w = a;
		else if (sb !== undefined && sa === undefined) w = b;
		else if (sa !== undefined && sa !== sb) w = (def.hi ? sa > sb : sa < sb) ? a : b;
		const aw = {};
		let order = [a.key, b.key];
		if (w) {
			const l = w === a ? b : a,
				s = Math.min(10, l.coins);
			l.coins -= s;
			w.coins += s;
			aw[w.key] = s;
			aw[l.key] = -s;
			order = [w.key, l.key];
			HG.msg = `${w.name} wins the duel and takes ${s} coins!`;
		} else {
			aw[a.key] = 0;
			aw[b.key] = 0;
			HG.msg = "The duel ends in a draw!";
		}
		HG.mg.aw = aw;
		HG.mg.order = order;
		HG.phase = "mgres";
		HG.seq++;
		push();
		later(afterMg, 6500);
		return;
	}
	if (HG.mg.team) {
		finishTeamMg(def, res, part);
		return;
	}
	const rows = part.map((p) => ({ k: p.key, s: p.key in res ? res[p.key] : null }));
	const hasS = rows.filter((r) => r.s !== null).sort((a, b) => (def.hi ? b.s - a.s : a.s - b.s));
	const AW = [10, 6, 4, 2, 2, 2, 2, 2],
		aw = {};
	hasS.forEach((r, i) => {
		let pl = i;
		while (pl > 0 && hasS[pl - 1].s === r.s) pl--;
		aw[r.k] = AW[pl];
	});
	rows.filter((r) => r.s === null).forEach((r) => (aw[r.k] = 0));
	if (!HG.mg.prac) HG.players.forEach((p) => (p.coins += aw[p.key] || 0));
	HG.mg.aw = aw;
	HG.mg.order = hasS.map((r) => r.k).concat(rows.filter((r) => r.s === null).map((r) => r.k));
	HG.phase = "mgres";
	HG.seq++;
	HG.msg = "Minigame results are in.";
	push();
	later(afterMg, 9000);
}
/* team payout: every truck on the winning side gets TEAM_WIN coins, a draw pays everyone TEAM_DRAW. The game picks the
   winner with def.teamWin(res, tm) → 0 | 1 | -1 (draw); by default the side with the best single score wins */
const TEAM_WIN = 10,
	TEAM_DRAW = 3;
const sideName = (mg, s) =>
	mg.team === "1v3" && Object.values(mg.tm).filter((x) => x === s).length === 1
		? (P_(Object.keys(mg.tm).find((k) => mg.tm[k] === s)) || {}).name || "The solo truck"
		: `${mg.tc[s] === SIDE_COL[0] ? "Blue" : "Red"} team`;
function finishTeamMg(def, res, part) {
	const mg = HG.mg,
		tm = mg.tm,
		better = (a, b) => (def.hi ? a > b : a < b);
	let w = -1;
	if (def.teamWin) w = def.teamWin(res, tm);
	else {
		const best = [null, null];
		part.forEach((p) => {
			const s = tm[p.key],
				v = res[p.key];
			if (v !== undefined && (best[s] === null || better(v, best[s]))) best[s] = v;
		});
		if (best[0] !== null && (best[1] === null || better(best[0], best[1]))) w = 0;
		else if (best[1] !== null && (best[0] === null || better(best[1], best[0]))) w = 1;
	}
	const aw = {};
	part.forEach((p) => (aw[p.key] = w < 0 ? TEAM_DRAW : tm[p.key] === w ? TEAM_WIN : 0));
	if (!mg.prac) HG.players.forEach((p) => (p.coins += aw[p.key] || 0));
	const first = w < 0 ? 0 : w,
		rank = (p) => (tm[p.key] === first ? 0 : 1);
	mg.aw = aw;
	mg.win = w;
	mg.order = part
		.slice()
		.sort(
			(a, b) =>
				rank(a) - rank(b) ||
				(b.key in res) - (a.key in res) ||
				(def.hi ? res[b.key] - res[a.key] : res[a.key] - res[b.key]) ||
				0,
		)
		.map((p) => p.key);
	HG.phase = "mgres";
	HG.seq++;
	HG.msg = w < 0 ? "The team minigame ends in a draw!" : `${sideName(mg, w)} wins!`;
	push();
	later(afterMg, 9000);
}
function afterMg() {
	if (!HG) return;
	if (HG.practice) {
		homeSub = "practice";
		hostQuit();
		return;
	}
	if (HG.mg && HG.mg.prac) {
		HG.phase = "lobby";
		HG.mg = null;
		HG.seq++;
		HG.msg = "";
		push();
		return;
	}
	if (HG.mg && HG.mg.duel) {
		const d = duelDone;
		duelDone = null;
		HG.phase = "moving";
		HG.seq++;
		push();
		if (d) d();
		else later(nextTurn, 600);
		return;
	}
	HG.round++;
	if (HG.round > HG.rounds) {
		HG.round = HG.rounds;
		HG.phase = "over";
		HG.seq++;
		HG.msg = "Race over!";
		push();
	} else {
		HG.turn = 0;
		rivalNote();
		lavaRound();
		startTurn();
	}
}
function hostPlayAgain() {
	clearTimers();
	HG.phase = "lobby";
	HG.seq++;
	HG.players.forEach((p) => {
		p.pos = 0;
		p.from = null;
		p.coins = START_COINS;
		p.bat = 0;
		p.shards = 0;
		p.dust = 0;
		p.items = [];
		p.up = [];
	});
	HG.traps = {};
	HG.obs = {};
	HG.erupt = null;
	HG.loose = {};
	HG.cart = HG.grind = HG.ride = null;
	HG.bigShard = true;
	HG.roll = HG.fx = HG.ev = HG.mg = HG.buy = HG.fork = HG.shop = HG.duelPick = null;
	push();
}
function hostTick() {
	if (!HG) return;
	const now = Date.now();
	const idle = (p, fn) => {
		if (!p) return;
		if (p.bot || online(p.key)) {
			delete offSince[p.key];
			return;
		}
		offSince[p.key] = offSince[p.key] || now;
		if (now - offSince[p.key] > 8000) {
			delete offSince[p.key];
			fn();
		}
	};
	if (HG.phase === "turn") idle(cur(), () => doRoll(cur(), "char"));
	if (HG.phase === "buy" && HG.buy) idle(pByKey(HG.buy.pid), () => resolveBuy(true));
	if (HG.phase === "fork" && HG.fork)
		idle(pByKey(HG.fork.pid), () => resolveFork(HG.fork.opts[rnd(HG.fork.opts.length)]));
	if (HG.phase === "shop" && HG.shop) idle(pByKey(HG.shop.pid), () => resolveShop(pByKey(HG.shop.pid), null));
	if (HG.phase === "duelpick" && HG.duelPick)
		idle(pByKey(HG.duelPick.pid), () => {
			const p = pByKey(HG.duelPick.pid),
				o = HG.players.filter((x) => x !== p && !mate(p, x));
			resolveDuelPick(p, o[rnd(o.length)].key);
		});
	if (HG.phase === "minigame" && HG.mg) {
		if (!HG.mg.t0) {
			checkReady();
			if (now - mgWait > 90000) mgStartCountdown();
		} else if (now > mgDeadline && !(W && W.paused)) finishMg();
		else checkMgDone();
	}
	if (HG.phase === "lobby") setPresence({ game: HG });
}

/* ---------- board UI ---------- */
function showDice(r) {
	const p = G.players.find((x) => x.key === r.pid);
	if (!p) return;
	const faces =
			r.die === "char"
				? mulFaces(TRUCKS[p.truck].faces)
				: r.die === "gold"
					? Array(6).fill({ m: r.val || 1, c: 0 })
					: mulFaces(STD),
		f = faces[r.idx] || faces[0];
	const label =
		r.lbl ||
		(f.m
			? `Move ${f.m}${f.c ? `, ${f.c > 0 ? "+" : ""}${f.c} coins` : ""}`
			: `No move${f.c ? `, ${f.c > 0 ? "+" : ""}${f.c} coins` : ""}`);
	showDie3D(faces, r.idx, pcol(p), p.key);
	sfx("dice");
	musJingle("dice", MUS.song ? MUS.song.key : 0);
	fxShow(`<div class="dlabel" id="dl">${esc(p.name)} is rolling…</div>`, 2400);
	setTimeout(() => {
		const d = $("#dl");
		if (d) d.textContent = label;
		sfx("diceland");
	}, 1150);
}
const P_ = (k) => G.players.find((p) => p.key === k);
const refDist = (from, o) => {
	const r = MAP.nodes.map((n, i) => i).filter((i) => MAP.nodes[i].ref);
	return r.length ? Math.min(...r.map((i) => routeDist(from, o, i))) : 99;
};
function factoryHint(p) {
	const d = MAP.nodes[p.pos] ? playerDist(p, G.factory) : 99,
		r = shardMap() ? refDist(p.from, p.pos) : 99;
	return (
		(d < 99
			? `<p class="panhint">Battery factory: ${d} space${d === 1 ? "" : "s"} ahead on the quickest road.${r < 99 && r > 0 ? ` Nearest refinery: ${r}.` : ""}</p>`
			: "") + lavaHint()
	);
}
const lavaHint = () => (MAP.lava ? `<p class="panhint">${lavaChip(G.round)} ${esc(lavaText(G.round))}</p>` : "");
function panelHTML() {
	const c = G.players[G.turn],
		mine = G.players.filter(ctrl);
	if (role === "host" && G.tv) return tvPanelHTML();
	if (!mine.length) return `<div class="pan"><p>You're watching this game.</p></div>`;
	if (G.phase === "turn" && c && G.hold && !G.intro)
		return `<div class="pan"><p>${MAP.rival ? "🧲 Magnet Mike is watching…" : "🌋 Lava news…"} ${esc(c.name)} is up next.</p></div>`;
	if (G.phase === "turn" && c && G.intro)
		return `<div class="pan"><p>Welcome to ${esc((MAPS[G.map] || JUNK).name)}! ${esc(c.name)} goes first.</p></div>`;
	if (G.phase === "turn" && c && ctrl(c)) {
		const t = TRUCKS[c.truck],
			hasLocal = role === "host" && G.players.some((p) => p.local),
			used = G.mod && G.mod.used;
		const head = c.local ? `Pass the phone to ${esc(c.name)}` : hasLocal ? `${esc(c.name)}, your turn` : "Your turn!";
		if (uiPick && uiPick.key === c.key && ITEMS[(c.items || [])[uiPick.idx]]) {
			const it = ITEMS[c.items[uiPick.idx]],
				cancel = `<button class="btn ghost small" data-a="pickcancel" style="width:100%;margin-top:8px">Cancel</button>`;
			if (uiPick.kind === "target") {
				const k = c.items[uiPick.idx],
					opts = G.players.filter((o) => o !== c && !(k === "magnet" && mate(c, o)));
				return `<div class="pan"><h3>${it.icon} ${esc(it.name)}: pick a truck</h3><div class="optgrid">${opts.map((o) => `<button class="optb" data-itarget="${esc(o.key)}"><img alt="" src="${thumb(o.truck)}"><span>${esc(o.name)}<small>${o.coins} coins, ${o.bat} batter${o.bat === 1 ? "y" : "ies"}${MAP.nodes[o.pos] ? `, ${playerDist(o, G.factory)} from the factory` : ""}</small></span></button>`).join("")}</div>${cancel}</div>`;
			}
			return `<div class="pan"><h3>${it.icon} Golden Die: pick your roll</h3>${factoryHint(c)}<div class="numgrid">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => `<button class="numb" data-ival="${v}">${v}</button>`).join("")}</div>${cancel}</div>`;
		}
		const items = (c.items || []).length
			? `<div class="itemrow">${c.items.map((k, i) => `<button class="itm" data-item="${i}" ${used ? "disabled" : ""}><b>${ITEMS[k].icon}</b><span>${esc(ITEMS[k].name)}<small>${esc(ITEMS[k].desc)}</small></span></button>`).join("")}</div>`
			: "";
		return `<div class="pan">${c.local || hasLocal ? `<h3>${head}</h3>` : ""}${items}${used ? `<p class="panhint">Item used. Now roll!</p>` : factoryHint(c)}<div class="dice2">
      <button class="diebtn" data-roll="std" data-for="${esc(c.key)}"><b>Standard${diceMul() !== 1 ? ` ×${diceMul()}` : ""}</b>${facesHTML(mulFaces(STD))}</button>
      <button class="diebtn char" data-roll="char" data-for="${esc(c.key)}"><b>${esc(t.name)}</b>${facesHTML(mulFaces(t.faces))}</button></div>${G.test ? testHTML(c) : ""}</div>`;
	}
	if (G.phase === "fork" && G.fork && ctrl(P_(G.fork.pid))) {
		const p = P_(G.fork.pid),
			n = MAP.nodes[G.fork.at !== undefined ? G.fork.at : p.pos];
		return `<div class="pan"><h3>${p.key === me.key ? "" : esc(p.name) + ": "}Which way?</h3>${lavaHint()}<div class="optgrid">${G.fork.opts
			.map((o, k) => {
				const at = G.fork.at !== undefined ? G.fork.at : p.pos,
					d = routeDist(at, o, G.factory);
				return `<button class="optb" data-fork="${o}"><b class="optn">${k + 1}</b><span>${esc(roadLabel(n, at, o, k))}<small>${d >= 99 ? "The factory isn't down this road" : `Battery factory in ${d + 1} space${d ? "s" : ""}`}${shardMap() && refDist(at, o) < 99 ? `, refinery in ${refDist(at, o) + 1}` : ""}</small></span></button>`;
			})
			.join("")}</div></div>`;
	}
	if (G.phase === "shop" && G.shop && ctrl(P_(G.shop.pid))) {
		const p = P_(G.shop.pid),
			full = (p.items || []).length >= 3;
		const it = Object.keys(ITEMS)
			.filter(itemHere)
			.map((k) => {
				const d = ITEMS[k],
					dis = p.coins < d.cost || full;
				return `<button class="shopb" data-shop="${k}" ${dis ? "disabled" : ""}><b>${d.icon}</b><span>${esc(d.name)}<small>${esc(d.desc)}</small></span><em>${d.cost}${coinIco}</em></button>`;
			})
			.join("");
		const up = Object.keys(UPGRADES)
			.map((k) => {
				const d = UPGRADES[k],
					own = has(p, k),
					dis = own || p.coins < d.cost;
				return `<button class="shopb" data-shop="${k}" ${dis ? "disabled" : ""}><b>${d.icon}</b><span>${esc(d.name)}<small>${esc(d.desc)}</small></span><em>${own ? "Owned" : d.cost + coinIco}</em></button>`;
			})
			.join("");
		return `<div class="pan"><h3>${p.key === me.key ? "" : esc(p.name) + ": "}Scrap Shop</h3><p class="panhint">${p.coins} coins${full ? ". Item bag full (3 max)" : ""}. One purchase per visit.</p><div class="shoplist"><h4>Items</h4>${it}<h4>Upgrades, kept all game</h4>${up}</div><button class="btn ghost small" data-shop="" style="width:100%;margin-top:8px">Leave shop</button></div>`;
	}
	if (G.phase === "duelpick" && G.duelPick && ctrl(P_(G.duelPick.pid))) {
		const p = P_(G.duelPick.pid),
			opts = G.players.filter((o) => o !== p && !mate(p, o));
		return `<div class="pan"><h3>Duel! Pick an opponent</h3><p class="panhint">Winner takes up to 10 coins from the loser.</p><div class="optgrid">${opts.map((o) => `<button class="optb" data-duel="${esc(o.key)}"><img alt="" src="${thumb(o.truck)}"><span>${esc(o.name)}<small>${o.coins} coins</small></span></button>`).join("")}</div></div>`;
	}
	if (G.phase === "buy" && G.buy) {
		const b = P_(G.buy.pid);
		if (ctrl(b) && shardMap())
			return `<div class="pan"><h3>${b.key === me.key ? "" : esc(b.name) + ": "}Battery factory!</h3><p>${b.key === me.key ? "You have" : "They have"} ${b.coins} coins and ${b.dust | 0} obsidian dust.</p>
      <div class="optgrid" style="margin-top:10px"><button class="optb" data-buy="1" data-how="cell" data-for="${esc(b.key)}" ${canDust(b) ? "" : "disabled"}><b class="optn">${dustIco}</b><span>Melt obsidian dust<small>${DUST_BAT} dust + ${DUST_COINS} coins</small></span></button><button class="optb" data-buy="1" data-how="coins" data-for="${esc(b.key)}" ${b.coins >= RAW_PRICE ? "" : "disabled"}><b class="optn">${coinIco}</b><span>Pay full price<small>${RAW_PRICE} coins, no dust</small></span></button></div>
      <button class="btn ghost small" data-buy="0" data-for="${esc(b.key)}" style="width:100%;margin-top:8px">Keep driving</button></div>`;
		if (ctrl(b))
			return `<div class="pan"><h3>${b.key === me.key ? "" : esc(b.name) + ": "}Battery factory!</h3><p>Buy a battery for ${PRICE} coins? ${b.key === me.key ? "You have" : "They have"} ${b.coins}.</p>
      <div class="row" style="margin-top:10px"><button class="btn go" data-buy="1" data-for="${esc(b.key)}">Buy battery</button><button class="btn ghost" data-buy="0" data-for="${esc(b.key)}">Keep driving</button></div></div>`;
	}
	if (G.phase === "minigame" && G.mg) {
		if (G.mg.part && !G.mg.part.some((k) => ctrl(P_(k))))
			return `<div class="pan"><p>Duel in progress: ${G.mg.part.map((k) => esc((P_(k) || {}).name || "")).join(" vs ")}. Hang tight!</p></div>`;
		return `<div class="pan"><p>${mgPending().length ? "Minigame starting…" : "Waiting for the other drivers to finish…"}</p></div>`;
	}
	if (G.phase === "teams") return `<div class="pan"><p>🤝 Team minigame coming up…</p></div>`;
	if (G.phase === "rival") return `<div class="pan"><p>🧲 Magnet Mike is on the move…</p></div>`;
	if (G.phase === "erupt") return `<div class="pan"><p>🌋 The volcano is erupting…</p></div>`;
	if (G.phase === "turn" && c)
		return `<div class="pan"><p>Waiting for ${esc(c.name)} to roll${c.bot ? " (CPU)" : ""}.</p></div>`;
	const m = mine[0];
	return "";
}
/* status line on the TV: says who the game is waiting for */
function tvPanelHTML() {
	const c = G.players[G.turn],
		who = (k) => {
			const p = P_(k);
			return p ? `<b style="color:${pcol(p)}">${esc(p.name)}</b>` : "Someone";
		},
		ph = (k, what) => `<div class="pan tvst"><p>${who(k)} ${what}${P_(k) && P_(k).bot ? "" : " 📱"}</p></div>`;
	if (G.phase === "turn" && c && G.hold && !G.intro)
		return `<div class="pan tvst"><p>${MAP.rival ? "🧲 Magnet Mike is watching…" : "🌋 Lava news…"} ${esc(c.name)} is up next.</p></div>`;
	if (G.phase === "turn" && c && G.intro)
		return `<div class="pan tvst"><p>Welcome to ${esc((MAPS[G.map] || JUNK).name)}! ${esc(c.name)} goes first.</p></div>`;
	if (G.phase === "turn" && c) return ph(c.key, c.bot ? "is thinking…" : "is rolling on their phone");
	if (G.phase === "fork" && G.fork) return ph(G.fork.pid, "is choosing a road");
	if (G.phase === "shop" && G.shop) return ph(G.shop.pid, "is browsing the Scrap Shop");
	if (G.phase === "buy" && G.buy) return ph(G.buy.pid, "is at the battery factory");
	if (G.phase === "duelpick" && G.duelPick) return ph(G.duelPick.pid, "is picking a duel opponent");
	if (G.phase === "teams") return `<div class="pan tvst"><p>🤝 Team minigame coming up…</p></div>`;
	if (G.phase === "rival") return `<div class="pan tvst"><p>🧲 Magnet Mike is on the move…</p></div>`;
	if (G.phase === "erupt") return `<div class="pan tvst"><p>🌋 The volcano is erupting…</p></div>`;
	if (G.phase === "minigame" && G.mg) {
		const def = MG[G.mg.g],
			ps = G.players.filter((p) => !G.mg.part || G.mg.part.includes(p.key));
		const st = (p) =>
			p.key in G.mg.res
				? "done"
				: G.mg.t0
					? p.bot
						? "cpu"
						: "playing"
					: p.bot
						? "cpu"
						: G.mg.ready[p.key]
							? "ready"
							: "wait";
		const lbl = { done: "✓ Done", playing: "Playing", ready: "Ready", wait: "Loading…", cpu: "CPU" };
		return `<div class="pan tvst tvmg"><h3>${G.mg.duel ? "Duel" : "Minigame"}: ${esc(def.name)}</h3><p class="panhint">Grab your phones! ${esc(def.how || "")}</p><div class="tvmgl">${ps.map((p) => `<span class="${st(p)}" style="--c:${pcol(p)}"><img alt="" src="${thumb(p.truck)}">${esc(p.name)}<em>${lbl[st(p)]}</em></span>`).join("")}</div></div>`;
	}
	return "";
}
/* lobby: the selected map's own rules (Volcano Quarry) */
function mapRulesHTML() {
	const m = MAPS[G.map];
	return m && m.rules ? `<ul class="note maprules">${m.rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : "";
}
/* fork button names: the map's own labels for the usual roads; otherwise where the road leads, and "Turn back" when it runs against the usual direction */
const REGION = (n) =>
	n.br
		? "the rock bridge"
		: n.rim
			? "the rim road"
			: n.sl
				? "the upper ledge"
				: n.lv === 2
					? "the lower ledge"
					: n.lv === 1
						? "the crater floor"
						: "";
function roadLabel(n, at, o, k) {
	if (n.labels && n.labels[o]) return n.labels[o];
	const m = MAP.nodes[o],
		back = !n.next.includes(o),
		rg = REGION(m),
		same = rg && rg === REGION(n);
	return back
		? `Turn back${rg && !same ? ` to ${rg}` : rg ? ` along ${rg}` : ""}`
		: rg && !same
			? `Onto ${rg}`
			: n.next.length > 1
				? `Path ${k + 1}`
				: "Keep going";
}
/* test mode (lobby setting): pick the exact roll, tap any space to jump there and trigger it, top up coins/shards/dust, skip the lava ahead a round */
function testHTML(c) {
	return `<div class="testbox"><h4>🧪 Test mode</h4><div class="numgrid">${Array.from({ length: 12 }, (_, k) => `<button class="numb" data-troll="${k + 1}">${k + 1}</button>`).join("")}</div>
    <div class="row" style="margin-top:6px;flex-wrap:wrap;gap:6px"><button class="btn ghost small" data-a="tjump">${GFX.jumpPick ? "Tap a space on the board… (cancel)" : "📍 Jump to a space"}</button><button class="btn ghost small" data-tgive="coins">+20 coins</button>${shardMap() ? `<button class="btn ghost small" data-tgive="shards">+5 shards</button><button class="btn ghost small" data-tgive="dust">+3 dust</button>` : ""}${MAP.lava ? `<button class="btn ghost small" data-tgive="lava">Next lava round</button>` : ""}</div></div>`;
}
const LASTST = {};
const bIco = () => (shardMap() ? batIcoV : batIco);
/* Volcano Quarry cargo on a player card: shards and obsidian dust */
const cargoHTML = (p, bs, bc) =>
	shardMap()
		? `<span class="cargo${bs ? " bump" : ""}">${p.shards | 0}${shardIco}</span><span class="cargo${bc ? " bump" : ""}">${p.dust | 0}${dustIco}</span>`
		: "";
function stripHTML() {
	const st = standings(G.players),
		c = G.players[G.turn],
		inTurn = !["minigame", "mgres", "rival", "erupt", "teams"].includes(G.phase);
	let head = "";
	if (G.teams) {
		const T = teamTotals();
		head = [0, 1]
			.map(
				(k) =>
					`<div class="teamc" style="--tc:${TEAMS[k].col}"><b>${TEAMS[k].name}</b><div class="stats"><span>${T[k].bat}${bIco()}</span><span>${T[k].coins}${coinIco}</span></div></div>`,
			)
			.join("");
	}
	return (
		head +
		G.players
			.map((p) => {
				const sh = p.shards | 0,
					ce = p.dust | 0,
					ls = LASTST[p.key] || [p.bat, p.coins, 0, sh, ce],
					bumpB = ls[0] !== p.bat,
					bumpC = ls[1] !== p.coins,
					bumpS = ls[3] !== sh,
					bumpL = ls[4] !== ce;
				if (!LASTST[p.key] || bumpB || bumpC || bumpS || bumpL)
					LASTST[p.key] = [p.bat, p.coins, performance.now(), sh, ce];
				const rank = st.indexOf(p) + 1,
					off = role === "host" && !p.bot && !p.local && !online(p.key),
					gear =
						(p.up || []).map((u) => UPGRADES[u].icon).join("") + ((p.items || []).length ? `🎒${p.items.length}` : "");
				return `<div class="pc ${inTurn && c === p ? "now" : ""}" data-k="${esc(p.key)}" style="--c:${G.teams ? TEAMS[p.team || 0].col : pcol(p)}"><span class="cdot" style="background:${G.teams ? TEAMS[p.team || 0].col : pcol(p)}"></span><img alt="" src="${thumb(p.truck)}"><div class="who"><b>${G.teams ? "" : rank + ". "}${esc(p.name)}</b><div class="stats"><span class="${bumpB ? "bump" : ""}">${p.bat}${bIco()}</span><span class="${bumpC ? "bump" : ""}">${p.coins}${coinIco}</span>${cargoHTML(p, bumpS, bumpL)}${gear ? `<span class="gear">${gear}</span>` : ""}</div>${off ? `<span class="off">offline</span>` : ""}</div></div>`;
			})
			.join("")
	);
}
function overHTML() {
	const st = standings(G.players),
		w = st[0];
	let title = `${esc(w.name)} wins!`,
		sub = `${w.bat} batter${w.bat === 1 ? "y" : "ies"} and ${w.coins} coins with ${esc(TRUCKS[w.truck].name)}.`;
	if (G.teams) {
		const T = teamTotals(),
			k = w.team || 0;
		title = `${TEAMS[k].name} wins!`;
		sub = `${T[k].bat} batter${T[k].bat === 1 ? "y" : "ies"} between ${G.players
			.filter((p) => (p.team || 0) === k)
			.map((p) => esc(p.name))
			.join(" and ")}.`;
	}
	return `<div class="stage tall"><div class="brand"><i></i>Race over</div><div class="showname"><div><h2>${title}</h2><p>${sub}</p></div><button class="arr" data-a="replaypod" aria-label="Watch the podium again" style="width:auto;padding:0 14px;border-radius:999px;font-size:14px">Replay</button></div></div>
  <section class="sheet"><h2>Final standings</h2><table class="restable">${st.map((p, i) => `<tr><td>${i + 1}</td><td><span class="dot" style="display:inline-block;vertical-align:middle;background:${G.teams ? TEAMS[p.team || 0].col : pcol(p)}"></span> ${esc(p.name)}</td><td class="aw">${p.bat} ${bIco()}</td><td class="aw">${p.coins} ${coinIco}</td></tr>`).join("")}</table></section>
  <section class="sheet stack">${role === "host" ? `<button class="btn go" data-a="again">Play again</button><button class="btn ghost" data-a="quit">Close game</button>` : `<button class="btn ghost" data-a="leave">Leave</button>`}</section>`;
}
function refreshPanel() {
	render.lastPanel = null;
	if (view === "game" && G) updateGame();
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("button");
	if (!b || !G) return;
	const d = b.dataset;
	if (d.item !== undefined) {
		const c = G.players[G.turn];
		if (!c || !ctrl(c)) return;
		const idx = +d.item,
			it = ITEMS[(c.items || [])[idx]];
		if (!it) return;
		if (it.pick) {
			uiPick = { key: c.key, idx, kind: it.pick, seq: G.seq };
			refreshPanel();
		} else {
			b.disabled = true;
			act({ t: "item", idx, seq: G.seq }, c.key);
			unstick();
		}
		return;
	}
	if (d.itarget !== undefined && uiPick) {
		act({ t: "item", idx: uiPick.idx, target: d.itarget, seq: G.seq }, uiPick.key);
		uiPick = null;
		refreshPanel();
		unstick();
		return;
	}
	if (d.ival !== undefined && uiPick) {
		act({ t: "item", idx: uiPick.idx, val: +d.ival, seq: G.seq }, uiPick.key);
		uiPick = null;
		refreshPanel();
		unstick();
		return;
	}
	if (d.a === "pickcancel") {
		uiPick = null;
		refreshPanel();
		return;
	}
	if (d.troll !== undefined) {
		const c = G.players[G.turn];
		if (c && ctrl(c)) {
			act({ t: "troll", n: +d.troll, seq: G.seq }, c.key);
			unstick();
		}
		return;
	}
	if (d.tgive) {
		const c = G.players[G.turn];
		if (c && ctrl(c)) act({ t: "tgive", w: d.tgive, seq: G.seq }, c.key);
		return;
	}
	if (d.a === "tjump") {
		const c = G.players[G.turn];
		if (!c || !ctrl(c)) return;
		if (GFX.jumpPick) {
			GFX.jumpPick = null;
			refreshPanel();
			return;
		}
		GFX.jumpPick = (i) => {
			GFX.jumpPick = null;
			act({ t: "tjump", to: i, seq: G.seq }, c.key);
			refreshPanel();
		};
		refreshPanel();
		return;
	}
	if (d.fork !== undefined && G.fork) {
		b.disabled = true;
		act({ t: "fork", to: +d.fork, seq: G.seq }, G.fork.pid);
		unstick();
		return;
	}
	if (d.shop !== undefined && G.shop) {
		b.disabled = true;
		act({ t: "shop", what: d.shop || null, seq: G.seq }, G.shop.pid);
		unstick();
		return;
	}
	if (d.duel !== undefined && G.duelPick) {
		b.disabled = true;
		act({ t: "duel", target: d.duel, seq: G.seq }, G.duelPick.pid);
		unstick();
		return;
	}
	if (role === "host" && HG && HG.phase === "lobby") {
		if (d.map) {
			HG.map = MAPS[d.map] ? d.map : "junk";
			MAP = MAPS[HG.map];
			push();
			return;
		}
		if (d.test) {
			HG.test = d.test === "on";
			push();
			return;
		}
		if (d.mode) {
			HG.teams = d.mode === "teams";
			HG.players.forEach((p, i) => {
				if (p.team === undefined) p.team = i % 2;
			});
			push();
			return;
		}
		if (d.team) {
			const p = pByKey(d.team);
			if (p) {
				p.team = p.team || 0 ? 0 : 1;
				push();
			}
			return;
		}
	}
});

/* ---------- minigame practice menu ---------- */
let practiceCpu = LS.get("trp_pcpu", 3);
function practiceHTML() {
	const list = (kind) =>
		Object.keys(MG)
			.filter((k) => (kind === "special" ? MG[k].special : MG[k].kind === kind && !MG[k].special))
			.map((k) => {
				const d = MG[k];
				return `<button class="pgame" data-practice="${k}"><span><b>${esc(d.name)}</b><small>${esc(d.how)}</small></span><em>${d.dur}s<br>${d.team ? d.team.replace("v", " vs ") : d.hi ? "high score" : "low score"}</em></button>`;
			})
			.join("");
	return `<div class="stage short"><div class="brand"><i></i>Minigame practice</div></div>
  <section class="sheet"><h2>CPU opponents</h2><div class="seg">${[0, 1, 2, 3].map((n) => `<button data-pcpu="${n}" class="${practiceCpu === n ? "on" : ""}">${n}</button>`).join("")}</div>
  <p class="note">Practice runs only on this device. Nothing is shared with other players, and it doesn't touch a saved hosted game.</p></section>
  <section class="sheet"><h2>Truck specials</h2><div class="pgrid">${list("special")}</div></section>
  <section class="sheet"><h2>Arena battles</h2><div class="pgrid">${list("arena")}</div></section>
  <section class="sheet"><h2>Lane races</h2><div class="pgrid">${list("lane")}</div></section>
  <button class="btn ghost" data-a="home" style="margin-top:12px">Back</button>`;
}
function startPractice(g) {
	if (!MG[g]) return;
	clearTimers();
	role = "host";
	HG = {
		id: "practice",
		practice: true,
		map: "junk",
		teams: false,
		traps: {},
		rival: null,
		code: "",
		v: 0,
		phase: "lobby",
		rounds: 1,
		round: 1,
		turn: 0,
		seq: 1,
		factory: 5,
		players: [],
		msg: "",
		roll: null,
		fx: null,
		ev: null,
		buy: null,
		mg: null,
		lastMg: null,
		kick: [],
		hostName: me.name || "Driver",
		left: 0,
	};
	HG.players.push(newPlayer(me.key, me.name || "Driver", me.truck, false, false));
	const used = [me.truck],
		free = TRUCKS.map((t, i) => i).filter((i) => i !== me.truck);
	for (let i = 0; i < practiceCpu; i++) {
		const tr = free.splice(rnd(free.length), 1)[0];
		HG.players.push(newPlayer(rid(), "CPU " + TRUCKS[tr].name.split(" ")[0], tr, true, false));
	}
	MAP = JUNK;
	HG.used = [];
	startHostLoops();
	startMinigame(null, g);
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("button");
	if (!b) return;
	const d = b.dataset;
	if (d.a === "editor") {
		openEditor();
		return;
	}
	if (d.a === "practice") {
		notice = "";
		homeSub = "practice";
		render.last = null;
		render();
		return;
	}
	if (d.pcpu !== undefined) {
		practiceCpu = +d.pcpu;
		LS.set("trp_pcpu", practiceCpu);
		render.last = null;
		render();
		return;
	}
	if (d.practice && role === "none") startPractice(d.practice);
});
