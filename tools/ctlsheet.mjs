/* TV mode phone controllers on one sheet: for each game, what the phone shows a few seconds into play (the TV's
   controller layout, iPhone landscape 844 x 390). Runs `tvtest.mjs <game> --early` one game at a time (1 phone +
   1 CPU; team games 2 phones + 2 CPU so both sides show) and lays the phone screens out in a grid.
   node tools/ctlsheet.mjs            every game
   node tools/ctlsheet.mjs drag mash  just these */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { args, launch, openGame, contactSheet, OUT } from "./lib.mjs";

const { pos } = args();
const b0 = await launch(),
	{ p: p0 } = await openGame(b0);
const all = await p0.evaluate(() => Object.keys(MG).map((k) => [k, MG[k].name, !!MG[k].team]));
await b0.close();
const games = pos.length ? all.filter(([k]) => pos.includes(k)) : all;
const files = [],
	labels = [];
for (const [g, name, team] of games) {
	const ph = team ? 2 : 1,
		t0 = Date.now();
	try {
		execFileSync(
			process.execPath,
			[path.join(OUT, "..", "tvtest.mjs"), g, "--early", "--phones", String(ph), "--cpu", String(team ? 2 : 1)],
			{ stdio: "ignore", timeout: 180000 },
		);
	} catch (e) {}
	let n = 0;
	for (let i = 1; i <= ph; i++) {
		const f = path.join(OUT, `tv_${g}_2start_Phone${i}.png`);
		if (fs.existsSync(f) && fs.statSync(f).mtimeMs > t0) {
			files.push(f);
			labels.push(team ? `${name} · Phone${i}` : name);
			n++;
		}
	}
	console.log(`${g.padEnd(9)} ${n ? "ok" : "no screenshot"} ${Math.round((Date.now() - t0) / 1000)}s`);
}
const b = await launch();
console.log("sheet: " + (await contactSheet(b, files, labels, 4, 422, 195, "ctl_sheet.png")));
await b.close();
