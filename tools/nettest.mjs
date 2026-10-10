/* Two-device multiplayer test: a host and a phone in two headless browsers, joined by game code through a fake PeerJS
   that relays messages in node (no internet, optional lag). Plays a minigame with both humans driven by the CPU brain and
   compares what the two screens show: positions of every truck, knocked-out state, and the game's own shared state
   (def.syncSnap). Reports drift, lasting mismatches, missing scores, stuck screens and page errors on either device.
   node tools/nettest.mjs mash                   default: 2 CPUs, no lag
   node tools/nettest.mjs paint --lag 120        120 ms each way (+-40 ms jitter), like a busy home wifi
   node tools/nettest.mjs mash --solo phone      team games: who is the solo truck (host | phone | cpu)
   --cpu N CPU trucks (default 2), --log prints both devices' play-by-play (H: host, P: phone). */
import { args, launch, openGame } from "./lib.mjs";
import { FAKE, fakeNet } from "./fakenet.mjs";

const { pos, opt } = args();
const g = pos[0];
if (!g) {
	console.log("usage: node tools/nettest.mjs <game> [--lag ms] [--cpu N] [--solo host|phone|cpu] [--log]");
	process.exit(1);
}
const lag = +opt.lag || 0,
	{ relay, stats } = fakeNet(lag),
	nCpu = opt.cpu === undefined ? 2 : +opt.cpu;

const b = await launch(),
	mk = (name) =>
		openGame(b, {
			width: 480,
			height: 360,
			peerjs: FAKE,
			before: async (p) => {
				await p.exposeFunction("__net", relay(p));
				await p.addInitScript(
					(n) => localStorage.setItem("trp_me", JSON.stringify({ key: "k" + n, name: n, truck: n === "Host" ? 0 : 3 })),
					name,
				);
			},
		}),
	H = await mk("Host"),
	P = await mk("Phone"),
	wait = (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 200 });

/* host a game, join it from the phone by code, add CPUs, then jump straight into the minigame */
const code = await H.p.evaluate(() => {
	hostCreate(false);
	return HG.code;
});
await wait(H.p, () => NET.status === "hosting");
await P.p.evaluate((c) => NET.join(c), code);
await wait(P.p, () => gamesAvailable().length > 0);
await P.p.evaluate(() => clientJoin(gamesAvailable()[0].id));
await wait(H.p, () => HG.players.length === 2);
await H.p.evaluate(
	({ n, g, solo }) => {
		for (let i = 0; i < n; i++) addCpu();
		hostStart();
		clearTimers();
		HG.intro = false;
		MG_LOG = true;
		TEST_SIDE =
			solo === "host"
				? "kHost"
				: solo === "phone"
					? "kPhone"
					: solo === "cpu"
						? HG.players.find((p) => p.bot).key
						: null;
		startMinigame(null, g);
	},
	{ n: nCpu, g, solo: opt.solo || null },
);
await P.p.evaluate(() => (MG_LOG = true));
const head = await H.p.evaluate(() => {
	const mg = HG.mg;
	return `${MG[mg.g].name}${mg.tm ? `, ${mg.team}: solo = ${HG.players.find((p) => mg.tm[p.key] === 0).name}` : ""}`;
});
console.log(`=== ${head}; host + phone + ${nCpu} CPU, lag ${lag} ms`);

/* both press ready, then both humans drive with the CPU brain */
for (const d of [H, P]) {
	await wait(d.p, () => document.querySelector("#m3rb"), null, 40000);
	await d.p.click("#m3rb");
	await d.p.evaluate(() => {
		window.__drv = setInterval(() => {
			if (W && W.t >= 0 && !W.me.d && W.def.bot) Object.assign(W.inp, W.def.bot.call(W.def, W, W.me, 0.05));
		}, 50);
	});
}

/* compare the two screens once a second */
const snap = () => {
	if (!W || W.t < 0 || !G || G.phase !== "minigame") return null;
	const ents = {};
	W.list.forEach((e) => {
		if (!e.gone) ents[e.p.name] = { x: e.x, z: e.z, al: !!e.al, local: !!e.local, seen: !!(e.local || e.seen) };
	});
	return {
		t: W.t,
		ents,
		extra: W.def.syncSnap ? JSON.stringify(W.def.syncSnap(W)) : "",
		log: W.log ? W.log.splice(0) : [],
		fps: parseInt((GFX.fps && GFX.fps.el && GFX.fps.el.textContent) || "0"),
	};
};
const drift = {},
	alBad = {},
	extraBad = [],
	t0 = Date.now();
const fpsH = [],
	fpsP = [];
const sent = {},
	got = {};
let samples = 0,
	keyed = 0,
	lastT = 0,
	unseen = new Set(),
	extraRun = 0;
while (Date.now() - t0 < 240000) {
	const [h, p] = await Promise.all([H.p.evaluate(snap), P.p.evaluate(snap)]);
	/* shared events: mgLog "sends KEY" on one device and "got KEY" on the other give the delivery time */
	for (const [d, s] of [
		["H", h],
		["P", p],
	])
		for (const l of s ? s.log : []) {
			if (opt.log) console.log(`  ${d}: ${l}`);
			const m = l.match(/^([\d.]+) (sends|got) (.+?)(?: \(|$)/);
			if (m) (m[2] === "sends" ? sent : got)[m[3]] = +m[1];
		}
	if (h && p && h.t > 1) {
		samples++;
		fpsH.push(h.fps);
		fpsP.push(p.fps);
		lastT = h.t;
		for (const n of Object.keys(h.ents)) {
			const a = h.ents[n],
				c = p.ents[n];
			if (!c) continue;
			const auth = a.local ? a : c.local ? c : null,
				view = a.local ? c : a;
			if (!auth) continue;
			if (!view.seen) unseen.add(n);
			if (auth.al && view.al) {
				const d = Math.hypot(auth.x - view.x, auth.z - view.z),
					s = drift[n] || (drift[n] = { sum: 0, n: 0, max: 0, at: 0 });
				s.sum += d;
				s.n++;
				if (d > s.max) {
					s.max = d;
					s.at = h.t;
				}
			}
			alBad[n] = auth.al !== view.al ? (alBad[n] || 0) + 1 : 0;
			if (alBad[n] === 3)
				extraBad.push(
					`${h.t.toFixed(1)} s: ${n} is ${auth.al ? "in" : "out"} on its own device but not on the other for 3+ s`,
				);
		}
		/* syncSnap {key, state}: the state must match whenever the keys (the inputs, e.g. the loops received so far) do.
		   A plain snapshot must match too, but only a mismatch lasting 3 samples counts (things are always in flight) */
		const he = h.extra ? JSON.parse(h.extra) : null,
			pe = p.extra ? JSON.parse(p.extra) : null;
		if (he && pe && he.key !== undefined) {
			if (he.key === pe.key) {
				keyed++;
				if (JSON.stringify(he.state) !== JSON.stringify(pe.state))
					extraBad.push(
						`${h.t.toFixed(1)} s: same inputs, different result\n      host:  ${JSON.stringify(he.state)}\n      phone: ${JSON.stringify(pe.state)}`,
					);
			}
		} else if (h.extra !== p.extra) {
			extraRun++;
			if (extraRun === 3)
				extraBad.push(
					`${h.t.toFixed(1)} s: shared state differs for 3+ s\n      host:  ${h.extra}\n      phone: ${p.extra}`,
				);
		} else extraRun = 0;
	}
	const ph = await H.p.evaluate(() => HG.phase);
	if (ph === "mgres") break;
	await H.p.waitForTimeout(1000);
}

/* results: same on both screens, nobody without a score */
await wait(P.p, () => G && G.phase === "mgres" && document.querySelector(".reslist li"), null, 20000).catch(() => {});
const rows = (p) =>
	p.evaluate(() => [...document.querySelectorAll(".reslist li")].map((l) => l.innerText.replace(/\s+/g, " ").trim()));
const [rh, rp] = await Promise.all([rows(H.p), rows(P.p)]);
console.log("\nresults on the host:");
rh.forEach((r) => console.log("  " + r));
const issues = [];
if (!rh.length) issues.push("the host never showed results (stuck?)");
if (!rp.length) issues.push("the phone never showed results (stuck?)");
if (rh.length && rp.length && rh.join("|").replace(/ \(you\)/g, "") !== rp.join("|").replace(/ \(you\)/g, ""))
	issues.push("results differ between host and phone:\n    " + rp.join("\n    "));
if (rh.some((r) => /No score/.test(r))) issues.push("a player has No score (their result never reached the host)");
unseen.forEach((n) => issues.push(`${n} was never seen on the other device`));
issues.push(...extraBad);
const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)),
	slowFps = Math.min(avg(fpsH), avg(fpsP)) < 20;
console.log(`\nsync over ${samples} samples (${stats.msgs} messages, ${Math.round(stats.bytes / 1024)} KB):`);
console.log(
	`  test relay: worst extra delay ${stats.worst} ms${stats.late ? `, ${stats.late} messages over 150 ms late (slow test machine: a short mismatch may be the test, not the game)` : ""}`,
);
console.log(
	`  frame rate: host ${avg(fpsH)} fps, phone ${avg(fpsP)} fps${slowFps ? " (low: devices send an update per frame, so drift is inflated here; a phone runs far faster)" : ""}`,
);
for (const [n, s] of Object.entries(drift))
	console.log(
		`  ${n.padEnd(14)} off by ${(s.sum / s.n).toFixed(2)} m on average, worst ${s.max.toFixed(2)} m at ${s.at.toFixed(1)} s`,
	);
const keys = Object.keys(sent);
if (keys.length) {
	const lat = keys.filter((k) => k in got).map((k) => got[k] - sent[k]),
		lost = keys.filter((k) => !(k in got) && sent[k] < lastT - 2),
		slow = keys.filter((k) => got[k] - sent[k] > 1.5);
	console.log(
		`  shared events: ${lat.length}/${keys.length} delivered, ${(lat.reduce((a, b) => a + b, 0) / Math.max(1, lat.length)).toFixed(2)} s on average, slowest ${Math.max(0, ...lat).toFixed(2)} s`,
	);
	if (lost.length) issues.push(`events that never reached the other device: ${lost.slice(0, 6).join(", ")}`);
	if (slow.length)
		issues.push(
			`slow events (over 1.5 s): ${slow
				.slice(0, 6)
				.map((k) => `${k} ${(got[k] - sent[k]).toFixed(1)} s`)
				.join(", ")}`,
		);
}
if (keyed) console.log(`  both devices held the same inputs ${keyed}×, and the result was compared each time`);
const big = Object.entries(drift).filter(([, s]) => s.sum / s.n > 3 || s.max > 8);
big.forEach(([n]) =>
	issues.push(
		`${n} drifts far from where its own device has it${slowFps ? " (but the test ran at a low frame rate, see above)" : ""}`,
	),
);
if (H.errs.length) issues.push("host page errors: " + H.errs.join(" | "));
if (P.errs.length) issues.push("phone page errors: " + P.errs.join(" | "));
console.log(issues.length ? "\nISSUES:\n- " + issues.join("\n- ") : "\nno sync issues found");
await b.close();
process.exit(issues.length ? 1 : 0);
