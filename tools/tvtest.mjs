/* TV mode test: a TV (host in TV mode, no player) and phones in headless browsers, joined by game code through the fake
   PeerJS relay (fakenet.mjs). Plays a minigame with the phones sending random input through the real TV controller
   (stick + buttons, taps, swipes) and reports what each screen shows:
   - a contact sheet: the TV and every phone at the ready screen, early, mid-game and at the results
   - phone controller: layout that changes during the game (e.g. something redrawing the controls), buttons partly off
     screen, smaller than 44 px or covering each other
   - TV camera: trucks off screen, and how big a truck is on the TV (share of the view's height)
   - screens that never reach the results, page errors on any device
   node tools/tvtest.mjs sort                 2 phones + 1 CPU
   node tools/tvtest.mjs mash --phones 3 --cpu 1 --lag 80
   --no-shots skips the contact sheet. */
import fs from "fs";
import path from "path";
import { args, launch, openGame, save, OUT } from "./lib.mjs";
import { FAKE, fakeNet } from "./fakenet.mjs";

const { pos, opt } = args();
const g = pos[0];
if (!g) {
	console.log("usage: node tools/tvtest.mjs <game> [--phones N] [--cpu N] [--lag ms] [--no-shots]");
	process.exit(1);
}
const nPh = Math.max(1, +opt.phones || 2),
	nCpu = opt.cpu === undefined ? 1 : +opt.cpu,
	shots = !opt["no-shots"],
	{ relay } = fakeNet(+opt.lag || 0),
	b = await launch(),
	wait = (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 200 }),
	mk = (name, truck, size, mobile) =>
		openGame(b, {
			...size,
			mobile,
			peerjs: FAKE,
			before: async (p) => {
				await p.exposeFunction("__net", relay(p));
				await p.addInitScript(
					([n, t]) => localStorage.setItem("trp_me", JSON.stringify({ key: "k" + n, name: n, truck: t })),
					[name, truck],
				);
			},
		});
const TV = await mk("TV", 0, { width: 960, height: 540 }, false),
	PH = [];
for (let i = 0; i < nPh; i++) PH.push(await mk("Phone" + (i + 1), (i * 3 + 2) % 12, { width: 844, height: 390 }, true));
const devs = [["TV", TV], ...PH.map((d, i) => ["Phone" + (i + 1), d])];

/* TV mode game, phones join by code, CPUs, straight into the minigame */
const code = await TV.p.evaluate(() => {
	hostCreate(true);
	return HG.code;
});
await wait(TV.p, () => NET.status === "hosting");
for (const d of PH) {
	await d.p.evaluate((c) => NET.join(c), code);
	await wait(d.p, () => gamesAvailable().length > 0);
	await d.p.evaluate(() => clientJoin(gamesAvailable()[0].id));
}
await wait(TV.p, (n) => HG.players.length === n, nPh);
await TV.p.evaluate(
	({ n, g }) => {
		for (let i = 0; i < n; i++) addCpu();
		hostStart();
		clearTimers();
		HG.intro = false;
		startMinigame(null, g);
	},
	{ n: nCpu, g },
);
const head = await TV.p.evaluate(() => {
	const mg = HG.mg;
	return `${MG[mg.g].name}: ${mg.tv === 1 ? "one shared TV view" : "TV split (" + (TVS ? TVS.mode : "?") + ")"}`;
});
console.log(`=== ${head}; ${nPh} phone${nPh > 1 ? "s" : ""} + ${nCpu} CPU, TV mode`);

const shotList = [],
	shoot = async (moment) => {
		if (!shots) return;
		for (const [n, d] of devs) {
			const f = path.join(OUT, `tv_${g}_${moment}_${n}.png`);
			fs.mkdirSync(OUT, { recursive: true });
			await d.p.screenshot({ path: f }).catch(() => {});
			shotList.push({ f, moment, n });
		}
	};

/* the phone side: random input through the real controller, layout signature, button checks */
const PHONE = () => {
	window.__sig = () => {
		const root = document.querySelector(".tvc");
		if (!root) return [];
		return [
			...new Set(
				[...root.querySelectorAll("*")]
					.filter((el) => !el.closest(".m3ready") && el.getClientRects().length)
					.map(
						(el) =>
							el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.classList[0] ? "." + el.classList[0] : ""),
					),
			),
		];
	};
	window.__btns = () => {
		const out = [],
			vw = innerWidth,
			vh = innerHeight,
			bs = [...document.querySelectorAll(".tvc button")].filter(
				(b) => b.getClientRects().length && getComputedStyle(b).visibility !== "hidden" && !b.closest(".m3ready"),
			),
			name = (b) => (b.id ? "#" + b.id : "") + (b.textContent.trim().slice(0, 14) || b.className.split(" ")[0]);
		bs.forEach((b) => {
			const r = b.getBoundingClientRect();
			if (r.left < -4 || r.top < -4 || r.right > vw + 4 || r.bottom > vh + 4)
				out.push(
					`${name(b)} is partly off screen (${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)})`,
				);
			if (Math.min(r.width, r.height) < 44)
				out.push(`${name(b)} is small: ${Math.round(r.width)}x${Math.round(r.height)} px`);
		});
		/* overlaps (buttons cut to a shape with clip-path, like the diagonal split, are meant to share a box) */
		for (let i = 0; i < bs.length; i++)
			for (let j = i + 1; j < bs.length; j++) {
				const [x, y] = [bs[i], bs[j]];
				if (getComputedStyle(x).clipPath !== "none" || getComputedStyle(y).clipPath !== "none") continue;
				const a = x.getBoundingClientRect(),
					c = y.getBoundingClientRect(),
					ov =
						Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) *
						Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top));
				if (ov > 0.1 * Math.min(a.width * a.height, c.width * c.height)) out.push(`${name(x)} and ${name(y)} overlap`);
			}
		return out;
	};
	/* the layout the phone draws itself, before the TV has sent anything: what the controller should keep looking like */
	const open = openTvCtl;
	window.openTvCtl = function (...a) {
		const r = open.apply(this, a);
		window.__sig0 = __sig();
		return r;
	};
	/* random input, a bit like a player mashing */
	const seed = Math.random() * 9;
	window.__drv = setInterval(() => {
		if (!TVC || !G || !G.mg) return;
		const d = TVC.def,
			t = performance.now() / 1000;
		if (d.ctrl === "stick") {
			TVC.inp.x = Math.sin(t * 0.9 + seed);
			TVC.inp.y = Math.cos(t * 0.7 + seed);
			if (d.aim) {
				TVC.inp.ax = Math.sin(t * 1.3);
				TVC.inp.ay = -0.8;
			}
			if (Math.random() < 0.08) TVC.b++;
			if (Math.random() < 0.04) TVC.b2 = (TVC.b2 || 0) + 1;
		} else if (Math.random() < 0.35) {
			const pad = document.querySelector("#swpad");
			if (pad) {
				const r = pad.getBoundingClientRect(),
					x = r.left + r.width / 2,
					y = r.top + r.height / 2,
					[dx, dy] = [
						[-60, 0],
						[60, 0],
						[0, -60],
						[0, 60],
					][Math.floor(Math.random() * 4)],
					ev = (type, px, py) => new PointerEvent(type, { bubbles: true, pointerId: 7, clientX: px, clientY: py });
				pad.dispatchEvent(ev("pointerdown", x, y));
				pad.dispatchEvent(ev("pointermove", x + dx, y + dy));
				pad.dispatchEvent(ev("pointerup", x + dx, y + dy));
			} else {
				const bs = [...document.querySelectorAll("#tvcctl button")],
					bt = bs[Math.floor(Math.random() * bs.length)];
				if (bt) {
					bt.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId: 8 }));
					setTimeout(() => dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 8 })), 90);
				}
			}
		}
		tvcTick();
	}, 100);
};
for (const d of PH) await d.p.evaluate(PHONE);

/* ready screen, then everyone presses ready */
for (const d of PH) await wait(d.p, () => document.querySelector("#m3rb"), null, 40000);
await TV.p.waitForTimeout(800);
await shoot("1ready");
for (const d of PH) await d.p.click("#m3rb");

/* the TV side: every truck's spot on the TV and its size (truck length as a share of the view height) */
const TVSAMPLE = () => {
	if (!W || W.t < 0.5 || !G || G.phase !== "minigame") return null;
	const views = [];
	if (typeof TVS !== "undefined" && TVS) {
		if (TVS.mode === "shared" && TVS.scam) views.push({ cam: TVS.scam, list: TVS.worlds.map((s) => s.W.me) });
		else TVS.worlds.forEach((s) => s.cam && views.push({ cam: s.cam, list: [s.W.me] }));
	} else views.push({ cam: W.cam, list: W.list.filter((e) => !e.gone && e.al && e.y > -3) });
	const out = [];
	views.forEach((v) =>
		v.list.forEach((e) => {
			if (!e || e.gone) return;
			const y = (e.y || 0) + 0.8,
				c = new THREE.Vector3(e.x, y, e.z).project(v.cam),
				a = new THREE.Vector3(e.x - 1.5, y, e.z).project(v.cam),
				b = new THREE.Vector3(e.x + 1.5, y, e.z).project(v.cam);
			out.push({
				n: e.p.name,
				off: Math.abs(c.x) > 1 || Math.abs(c.y) > 1 || c.z > 1,
				sz: Math.hypot((b.x - a.x) * v.cam.aspect, b.y - a.y) / 2,
			});
		}),
	);
	return { t: W.t, dur: W.def.dur, out };
};

const sigs = PH.map(() => ({ first: null, extra: new Set(), gone: new Set() })),
	btnIssues = new Set(),
	frame = {},
	t0 = Date.now();
let shotStart = false,
	shotMid = false,
	lastT = 0;
while (Date.now() - t0 < 240000) {
	const s = await TV.p.evaluate(TVSAMPLE);
	if (s) {
		lastT = s.t;
		s.out.forEach((o) => {
			const f = frame[o.n] || (frame[o.n] = { n: 0, off: 0, offAt: [], sz: [] });
			f.n++;
			if (o.off) {
				f.off++;
				if (f.offAt.length < 4) f.offAt.push(s.t.toFixed(1));
			} else f.sz.push(o.sz);
		});
		for (let i = 0; i < PH.length; i++) {
			const [sg, s0] = await PH[i].p.evaluate(() => [__sig(), window.__sig0 || null]);
			const S = sigs[i];
			if (!S.first) S.first = new Set(s0 || sg);
			sg.forEach((x) => !S.first.has(x) && S.extra.add(x));
			S.first.forEach((x) => !sg.includes(x) && S.gone.add(x));
		}
		if (!shotStart && s.t > 2) {
			shotStart = true;
			for (let i = 0; i < PH.length; i++)
				(await PH[i].p.evaluate(() => __btns())).forEach((x) => btnIssues.add(`Phone${i + 1}: ${x}`));
			await shoot("2start");
		}
		if (!shotMid && s.t > s.dur / 2) {
			shotMid = true;
			for (let i = 0; i < PH.length; i++)
				(await PH[i].p.evaluate(() => __btns())).forEach((x) => btnIssues.add(`Phone${i + 1}: ${x}`));
			await shoot("3mid");
		}
	}
	if (lastT > 0 && (await TV.p.evaluate(() => HG.phase)) !== "minigame") break;
	await TV.p.waitForTimeout(500);
}
/* the minigame is over once the TV leaves it (results, then back to the board) */
const tvDone = lastT > 0 && (await TV.p.evaluate(() => HG.phase)) !== "minigame";
await TV.p.waitForTimeout(600);
await shoot("4results");

/* report */
const issues = [],
	pct = (v) => (v * 100).toFixed(1) + "%",
	med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
if (!tvDone) issues.push(`the TV never finished the minigame (game time ${lastT.toFixed(1)} s)`);
for (let i = 0; i < PH.length; i++) {
	const st = await PH[i].p.evaluate(() => (G ? G.phase : "no game"));
	if (tvDone && st === "minigame") issues.push(`Phone${i + 1} is still in the minigame after the TV finished it`);
	const S = sigs[i];
	if (S.extra.size || S.gone.size)
		issues.push(
			`Phone${i + 1}: the controller layout changed during the game${S.gone.size ? `; gone: ${[...S.gone].slice(0, 6).join(" ")}` : ""}${S.extra.size ? `; new: ${[...S.extra].slice(0, 6).join(" ")}` : ""}`,
		);
}
issues.push(...btnIssues);
console.log("\nTV camera (truck length as a share of the view height; ~3% is about 32 px on a 1080p TV):");
for (const [n, f] of Object.entries(frame)) {
	console.log(
		`  ${n.padEnd(10)} median ${pct(med(f.sz))}, smallest ${pct(Math.min(...(f.sz.length ? f.sz : [0])))}${f.off ? `, OFF SCREEN ${f.off}/${f.n} samples (at ${f.offAt.join(", ")} s)` : ""}`,
	);
	if (f.off / f.n > 0.05) issues.push(`${n} is off the TV screen ${pct(f.off / f.n)} of the time`);
}
for (const [n, d] of devs) if (d.errs.length) issues.push(`${n} page errors: ${d.errs.slice(0, 4).join(" | ")}`);

if (shots && shotList.length) {
	/* one row per moment: the TV, then the phones */
	const rows = {};
	shotList.forEach((s) => (rows[s.moment] = rows[s.moment] || []).push(s));
	const html = path.join(OUT, "_tvsheet.html");
	fs.writeFileSync(
		html,
		`<body style="margin:0;background:#111;font:bold 14px sans-serif;color:#fff">${Object.entries(rows)
			.map(
				([m, list]) =>
					`<div style="display:flex;gap:6px;padding:6px;align-items:flex-start">${list
						.map(
							(s) =>
								`<div style="position:relative"><img src="${path.basename(s.f)}" style="width:${s.n === "TV" ? 560 : 420}px;display:block"><b style="position:absolute;left:4px;bottom:4px;background:#000c;padding:2px 6px">${s.n} · ${m.slice(1)}</b></div>`,
						)
						.join("")}</div>`,
			)
			.join("")}</body>`,
	);
	const sp = await b.newPage({ viewport: { width: 560 + (420 + 6) * PH.length + 12, height: 100 } });
	await sp.goto("file://" + html);
	await sp.waitForTimeout(300);
	const out = save(`tv_${g}.png`, await sp.screenshot({ fullPage: true }));
	await sp.close();
	console.log(`\ncontact sheet: ${out}`);
}
console.log(issues.length ? "\nISSUES:\n- " + issues.join("\n- ") : "\nno TV mode issues found");
await b.close();
process.exit(issues.length ? 1 : 0);
