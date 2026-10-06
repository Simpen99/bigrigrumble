/* Play minigames to the end (practice, CPUs) and report how long they took and any page errors.
   node tools/run.mjs hop drag        node tools/run.mjs all */
import { args, launch, openGame, startMinigame } from "./lib.mjs";

const { pos } = args();
if (!pos.length) {
	console.log("usage: node tools/run.mjs <game id>... | all");
	process.exit(1);
}
const b = await launch();
let ids = pos,
	bad = 0;
if (pos[0] === "all") {
	const { p, ctx } = await openGame(b);
	ids = await p.evaluate(() => Object.keys(MG));
	await ctx.close();
}
for (const g of ids) {
	const { p, ctx, errs } = await openGame(b, { width: 480, height: 360 }),
		t0 = Date.now();
	let res = "ok";
	try {
		await startMinigame(p, g);
		await p.waitForFunction(() => !W || W.over, null, { timeout: 240000, polling: 500 });
	} catch (e) {
		res = "did not finish: " + e.message.split("\n")[0];
	}
	if (errs.length || res !== "ok") bad++;
	console.log(`${g.padEnd(9)} ${res.padEnd(4)} ${Math.round((Date.now() - t0) / 1000)}s ${errs.length ? "ERRORS: " + errs.join(" | ") : ""}`);
	await ctx.close();
}
await b.close();
process.exit(bad ? 1 : 0);
