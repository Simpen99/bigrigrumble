/* Watch minigames play out with CPUs: a timestamped play-by-play (knockouts with their cause, plus whatever the game logs
   with mgLog), the results, and a summary over all runs. Optional filmstrip of the game view.
   node tools/watch.mjs mash                      one game, your truck driven like a CPU
   node tools/watch.mjs mash --runs 6 --quiet     6 games, only results + summary (balance checks)
   node tools/watch.mjs mash --as human --side 0  your truck plays like a person (def.humanBot, else the CPU brain with
                                                  a 0.25 s reaction lag), on side 0 (team games: 0 = the solo truck)
   node tools/watch.mjs hotload --as idle --film  your truck does nothing; frames every 2 s (--film 1 for every 1 s)
   --cpu N sets the CPU count (default 3). Driving your truck works for stick games; others play best with --as idle. */
import { args, launch, openGame, startMinigame, save, contactSheet } from "./lib.mjs";

const { pos, opt } = args();
const g = pos[0];
if (!g) {
	console.log(
		"usage: node tools/watch.mjs <game> [--runs N] [--as cpu|human|idle] [--side 0|1] [--cpu N] [--quiet] [--film [s]]",
	);
	process.exit(1);
}
const runs = +opt.runs || 1,
	as = opt.as || "cpu",
	film = opt.film ? (opt.film === true ? 2 : +opt.film) : 0,
	b = await launch(),
	tally = { wins: {}, causes: {}, errs: 0 };
for (let r = 1; r <= runs; r++) {
	const { p, ctx, errs } = await openGame(b, { width: 480, height: 360 });
	await p.evaluate(
		({ side, cpu }) => {
			MG_LOG = true;
			TEST_SIDE = side;
			practiceCpu = cpu;
		},
		{ side: opt.side === undefined ? null : +opt.side, cpu: opt.cpu === undefined ? 3 : +opt.cpu },
	);
	await startMinigame(p, g);
	await p.evaluate((as) => {
		/* drive the player's truck: the CPU brain, a human stand-in (reaction lag), or nothing */
		const q = [];
		window.__drv = setInterval(() => {
			if (!W || W.t < 0 || W.me.d || as === "idle" || !W.def.bot) return;
			const fn = as === "human" && W.def.humanBot ? W.def.humanBot : W.def.bot,
				o = fn.call(W.def, W, W.me, 0.05);
			if (as === "human" && !W.def.humanBot) {
				q.push(o);
				if (q.length < 5) return;
				Object.assign(W.inp, q.shift());
			} else Object.assign(W.inp, o);
		}, 50);
	}, as);
	const head = await p.evaluate(() => {
		const mg = HG.mg,
			s = mg.tm ? mg.tm[me.key] : null;
		return s === null || s === undefined ? "free-for-all" : `${mg.team}, you are side ${s}${s === 0 ? " (solo)" : ""}`;
	});
	console.log(`\n=== ${g} run ${r}/${runs}: ${head}, you play as ${as}`);
	const frames = [],
		t0 = Date.now(),
		dur = await p.evaluate(() => MG[HG.mg.g].dur);
	let nextShot = 0,
		lastSum = "";
	while (true) {
		const st = await p.evaluate(() => ({
			ph: HG ? HG.phase : null,
			log: W && W.log ? W.log.splice(0) : [],
			t: W ? W.t : null,
			sum: W && W.def.watchSum && W.t >= 0 ? W.def.watchSum(W) : "",
		}));
		if (!opt.quiet) st.log.forEach((l) => console.log("  " + l));
		st.log.forEach((l) => {
			const m = l.match(/OUT .*\((.*)\)$/);
			if (m) tally.causes[m[1]] = (tally.causes[m[1]] || 0) + 1;
		});
		if (st.sum) lastSum = st.sum;
		if (film && st.t !== null && st.t >= nextShot && st.ph === "minigame") {
			const f = save(`watch_${r}_${frames.length}.png`, await p.screenshot());
			frames.push([f, `${Math.round(st.t)} s`]);
			nextShot = st.t + film;
		}
		if (st.ph === "mgres" || Date.now() - t0 > (dur * 3 + 90) * 1000) break;
		await p.waitForTimeout(250);
	}
	const res = await p.evaluate(() => {
		const mg = HG.mg;
		return {
			win: mg.win,
			mySide: mg.tm ? mg.tm[me.key] : null,
			myRank: (mg.order || []).indexOf(me.key) + 1,
			n: (mg.order || []).length,
			rows: [...document.querySelectorAll(".reslist li")].map((l) =>
				[...l.querySelectorAll(".rk,.rn,.raw")].map((x) => x.innerText.replace(/\n/g, ": ")).join(" "),
			),
			head: (document.querySelector(".reswin") || {}).textContent || "",
		};
	});
	if (res.head) console.log("  " + res.head);
	res.rows.forEach((l) => console.log("  " + l));
	if (lastSum) console.log("  " + lastSum);
	if (errs.length) console.log("  PAGE ERRORS: " + errs.join(" | "));
	tally.errs += errs.length;
	const k =
		res.win === undefined || res.win === null
			? `you placed ${res.myRank}/${res.n}`
			: res.win < 0
				? "draw"
				: `side ${res.win} won${res.win === res.mySide ? " (yours)" : ""}`;
	tally.wins[k] = (tally.wins[k] || 0) + 1;
	if (frames.length)
		console.log(
			"  filmstrip: " +
				(await contactSheet(
					b,
					frames.map((f) => f[0]),
					frames.map((f) => f[1]),
					6,
					240,
					180,
					`watch_${r}.png`,
				)),
		);
	await ctx.close();
}
await b.close();
console.log(`\n=== summary over ${runs} run${runs > 1 ? "s" : ""}`);
console.log(
	"  results: " +
		Object.entries(tally.wins)
			.map(([k, v]) => `${k} ×${v}`)
			.join(", "),
);
if (Object.keys(tally.causes).length)
	console.log(
		"  knockouts: " +
			Object.entries(tally.causes)
				.map(([k, v]) => `${k} ×${v}`)
				.join(", "),
	);
console.log(`  page errors: ${tally.errs}`);
process.exit(tally.errs ? 1 : 0);
