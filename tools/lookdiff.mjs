/* Compare how scenes look between two builds (e.g. before and after a three.js upgrade): renders every scene with no UI,
   frozen at a fixed moment, then measures the difference per scene in numbers (no need to look at the pictures).
   node tools/lookdiff.mjs shoot <tag> [scenes...|all] [--html file]   saves tools/out/look/<tag>/<scene>.png (--html = another build, e.g. an old dist/index.html from git; --js = code to run before the shot)
   node tools/lookdiff.mjs diff <tagA> <tagB> [--sheet]   brightness ratio, colour shift and changed pixels per scene;
                                                            --sheet = A | B | difference for the scenes that changed
   scenes: menu, board-classic, board-junk, board-volcano and every minigame id */
import { args, launch, openGame, OUT, contactSheet } from "./lib.mjs";
import fs from "fs";
import path from "path";

const { pos, opt } = args(),
	[cmd, ...rest] = pos,
	DIR = path.join(OUT, "look"),
	VP = { width: 844, height: 390, mobile: true },
	BOARDS = ["classic", "junk", "volcano"];

/* frozen rAF (the canvas keeps the last frame, preserveDrawingBuffer) and seeded Math.random (same cosmetics every run) */
const before = (p) =>
	p.addInitScript(() => {
		let s = 12345;
		window.__seed = (n) => (s = n);
		Math.random = () => {
			s = (s + 0x6d2b79f5) | 0;
			let t = Math.imul(s ^ (s >>> 15), 1 | s);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const raf = window.requestAnimationFrame.bind(window);
		window.__frz = 0;
		window.requestAnimationFrame = (cb) => (window.__frz > 1 ? 0 : (window.__frz && window.__frz++, raf(cb)));
	});

/* let one more frame render, then stop the loop; the canvas is read right after each render to it (no preserveDrawingBuffer).
   Done once a frame has reached the screen and nothing has rendered for 400 ms (slow scenes take seconds a frame in SwiftShader) */
const grab = (p) =>
	p.evaluate(
		() =>
			new Promise((res) => {
				const r = GFX.r,
					rr = r.render,
					t0 = Date.now();
				let last = null,
					at = 0;
				r.render = function (s, c) {
					rr.call(this, s, c);
					at = Date.now();
					if (r.getRenderTarget() === null) last = r.domElement.toDataURL("image/png");
				};
				window.__frz = 1;
				const iv = setInterval(() => {
					if ((last && Date.now() - at > 400) || Date.now() - t0 > 30000) {
						clearInterval(iv);
						r.render = rr;
						res(last);
					}
				}, 100);
			}),
	);

async function shootOne(b, scene, out) {
	const { p, ctx, errs } = await openGame(b, { ...VP, before, file: opt.html && path.resolve(opt.html) });
	try {
		/* same random picks in both builds from here on (loading may use up a different number of them) */
		await p.evaluate(() => __seed(12345));
		if (scene === "menu") await p.waitForTimeout(3500);
		else if (scene.startsWith("board-")) {
			await p.evaluate((m) => {
				hostCreate(false);
				for (let i = 0; i < 3; i++) addCpu();
				HG.map = m;
				hostStart();
			}, scene.slice(6));
			await p.waitForFunction(() => GFX.board && !HG.intro, null, { timeout: 60000 });
			await p.waitForTimeout(1500);
		} else {
			await p.evaluate((g) => startPractice(g), scene);
			await p.waitForSelector("#m3rb", { timeout: 30000 });
			await p.tap("#m3rb");
			await p.waitForFunction(() => W && !W.prac && W.startAt && W.t > -1.2 && (!W.def.look || GFX.envTex), null, {
				timeout: 60000,
			});
		}
		if (opt.js) await p.evaluate(opt.js);
		const url = await grab(p);
		fs.writeFileSync(path.join(out, scene + ".png"), Buffer.from(url.split(",")[1], "base64"));
		console.log(scene + (errs.length ? "  page errors: " + errs.slice(0, 3).join(" | ") : ""));
	} catch (e) {
		console.log(scene, "failed:", e.message.split("\n")[0]);
	}
	await ctx.close();
}

async function shoot(tag, list) {
	const out = path.join(DIR, tag),
		b = await launch();
	fs.mkdirSync(out, { recursive: true });
	if (!list.length || list[0] === "all") {
		const { p, ctx } = await openGame(b);
		list = ["menu", ...BOARDS.map((m) => "board-" + m), ...(await p.evaluate(() => Object.keys(MG)))];
		await ctx.close();
	}
	/* two at a time (more pins the CPU) */
	const q = [...list];
	await Promise.all(
		[0, 1].map(async () => {
			for (let s; (s = q.shift());) await shootOne(b, s, out);
		}),
	);
	await b.close();
}

/* per scene: luminance ratio B / A, mean R G B shift (0..255), share of pixels that changed by more than 24 in any channel */
async function diff(ta, tb) {
	const da = path.join(DIR, ta),
		db = path.join(DIR, tb),
		scenes = fs.readdirSync(da).filter((f) => f.endsWith(".png") && fs.existsSync(path.join(db, f))),
		b = await launch(),
		p = await b.newPage(),
		dd = path.join(DIR, `diff-${ta}-${tb}`);
	fs.mkdirSync(dd, { recursive: true });
	const rows = [],
		sheet = [];
	for (const f of scenes) {
		const img = (d) => "data:image/png;base64," + fs.readFileSync(path.join(d, f)).toString("base64");
		const r = await p.evaluate(
			async ([a, b]) => {
				const load = (src) =>
					new Promise((res) => {
						const i = new Image();
						i.onload = () => res(i);
						i.src = src;
					});
				const [A, B] = await Promise.all([load(a), load(b)]),
					w = A.width,
					h = A.height,
					px = (I) => {
						const c = document.createElement("canvas");
						c.width = w;
						c.height = h;
						const x = c.getContext("2d");
						x.drawImage(I, 0, 0);
						return x.getImageData(0, 0, w, h).data;
					},
					pa = px(A),
					pb = px(B),
					dc = document.createElement("canvas");
				dc.width = w;
				dc.height = h;
				const dx = dc.getContext("2d"),
					out = dx.createImageData(w, h),
					s = [0, 0, 0, 0, 0, 0];
				let la = 0,
					lb = 0,
					ch = 0;
				for (let i = 0; i < pa.length; i += 4) {
					let m = 0;
					for (let c = 0; c < 3; c++) {
						s[c] += pa[i + c];
						s[c + 3] += pb[i + c];
						m = Math.max(m, Math.abs(pa[i + c] - pb[i + c]));
					}
					la += 0.2126 * pa[i] + 0.7152 * pa[i + 1] + 0.0722 * pa[i + 2];
					lb += 0.2126 * pb[i] + 0.7152 * pb[i + 1] + 0.0722 * pb[i + 2];
					if (m > 24) ch++;
					const g = (pa[i] + pa[i + 1] + pa[i + 2]) / 12;
					out.data[i] = m > 24 ? 255 : g;
					out.data[i + 1] = m > 24 ? 40 : g;
					out.data[i + 2] = m > 24 ? 160 : g;
					out.data[i + 3] = 255;
				}
				dx.putImageData(out, 0, 0);
				const n = pa.length / 4;
				return {
					lum: lb / Math.max(1, la),
					la: la / n,
					lb: lb / n,
					rgb: [0, 1, 2].map((c) => (s[c + 3] - s[c]) / n),
					chg: ch / n,
					png: dc.toDataURL("image/png"),
				};
			},
			[img(da), img(db)],
		);
		const name = f.replace(".png", "");
		fs.writeFileSync(path.join(dd, f), Buffer.from(r.png.split(",")[1], "base64"));
		rows.push([name, r.lum, r.rgb, r.chg, r.la, r.lb]);
		if (r.chg > 0.02) sheet.push(name);
	}
	console.log("scene".padEnd(16), "lum B/A", "  dR    dG    dB ", " changed", "  lum A  lum B");
	for (const [n, l, c, ch, la, lb] of rows)
		console.log(
			n.padEnd(16),
			l.toFixed(3).padStart(7),
			c.map((v) => v.toFixed(1).padStart(5)).join(" "),
			(ch * 100).toFixed(1).padStart(6) + "%",
			la.toFixed(1).padStart(7),
			lb.toFixed(1).padStart(6) + (ch > 0.02 ? "  <--" : ""),
		);
	if (opt.sheet && sheet.length) {
		const files = [],
			labels = [];
		for (const n of sheet) {
			for (const [d, l] of [
				[da, ta],
				[db, tb],
				[dd, "diff"],
			]) {
				const t = path.join(OUT, `_ld-${l}-${n}.png`);
				fs.copyFileSync(path.join(d, n + ".png"), t);
				files.push(t);
				labels.push(`${n} ${l}`);
			}
		}
		console.log("sheet ->", await contactSheet(b, files, labels, 3, 422, 195, `lookdiff-${ta}-${tb}.png`));
	}
	await b.close();
}

if (cmd === "shoot" && rest[0]) await shoot(rest[0], rest.slice(1));
else if (cmd === "diff" && rest[1]) await diff(rest[0], rest[1]);
else console.log("usage: node tools/lookdiff.mjs shoot <tag> [scenes|all]  |  diff <tagA> <tagB> [--sheet]");
