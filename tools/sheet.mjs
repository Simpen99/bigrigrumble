/* Screenshot minigames at phone size and put them on one contact sheet.
   node tools/sheet.mjs hop cones          node tools/sheet.mjs all --landscape --t 6
   --landscape  844x390 instead of 390x844 portrait;  --t seconds into the game (default 5) */
import { args, launch, openGame, startMinigame, contactSheet, OUT } from "./lib.mjs";
import path from "path";

const { pos, opt } = args(),
	land = !!opt.landscape,
	vp = land ? { width: 844, height: 390 } : { width: 390, height: 844 },
	t = +(opt.t || 5);
if (!pos.length) {
	console.log("usage: node tools/sheet.mjs <game id>... | all  [--landscape] [--t seconds] [--out file.png]");
	process.exit(1);
}
const b = await launch(),
	files = [],
	labels = [];
let ids = pos;
if (pos[0] === "all") {
	const { p, ctx } = await openGame(b);
	ids = await p.evaluate(() => Object.keys(MG));
	await ctx.close();
}
for (const g of ids) {
	const { p, ctx, errs } = await openGame(b, { ...vp, mobile: true });
	try {
		await startMinigame(p, g, true);
		await p.waitForFunction((t) => W && W.t > t, t, { timeout: 60000 });
		const f = path.join(OUT, `shot-${g}${land ? "-l" : ""}.png`);
		await p.screenshot({ path: f });
		files.push(f);
		labels.push(g + (errs.length ? " (errors!)" : ""));
		if (errs.length) console.log(g, "page errors:", errs);
	} catch (e) {
		console.log(g, "failed:", e.message.split("\n")[0]);
	}
	await ctx.close();
}
const cw = land ? 422 : 210,
	ch = land ? 195 : 455,
	out = await contactSheet(b, files, labels, land ? 2 : 6, cw, ch, opt.out || (land ? "sheet-l.png" : "sheet.png"));
console.log(`${files.length} game(s) -> ${out}`);
await b.close();
