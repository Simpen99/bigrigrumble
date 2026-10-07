/* Scenery merge check: renders one frozen frame of each game with the merged scenery, then again with the original
   meshes instead, and compares the pixels. node tools/scenecheck.mjs park cones ... | all */
import { launch, openGame, startMinigame } from "./lib.mjs";
const b = await launch();
let ids = process.argv.slice(2);
if (ids[0] === "all") {
	const { p, ctx } = await openGame(b);
	ids = await p.evaluate(() => Object.keys(MG));
	await ctx.close();
}
for (const g of ids) {
	const { p, ctx, errs } = await openGame(b, { mobile: true });
	await p.evaluate(() => (MERGE_TEST = {}));
	await startMinigame(p, g, true);
	await p.waitForFunction(() => W && W.t > 2, null, { timeout: 60000 });
	const r = await p.evaluate(() => {
		const cv = GFX.r.domElement,
			grab = () => {
				const c = document.createElement("canvas");
				c.width = cv.width;
				c.height = cv.height;
				const x = c.getContext("2d");
				x.drawImage(cv, 0, 0);
				return x.getImageData(0, 0, c.width, c.height).data;
			},
			T = MERGE_TEST,
			show = (merged) => {
				T.merged.forEach((m) => (m.visible = merged));
				T.orig.forEach((q) => (q.o.visible = !merged));
			};
		GFX.r.shadowMap.needsUpdate = true;
		renderMG(W.sc, GFX.cam);
		const A = grab();
		show(false);
		GFX.r.shadowMap.needsUpdate = true;
		renderMG(W.sc, GFX.cam);
		const B = grab();
		show(true);
		const cells = new Set();
		let sum = 0,
			max = 0,
			big = 0;
		for (let i = 0; i < A.length; i += 4)
			for (let c = 0; c < 3; c++) {
				const d = Math.abs(A[i + c] - B[i + c]);
				sum += d;
				max = Math.max(max, d);
				if (d > 12) {
					big++;
					const px = (i / 4) % cv.width,
						py = Math.floor(i / 4 / cv.width);
					cells.add(Math.floor(px / 40) + "," + Math.floor(py / 40));
				}
			}
		return `${T.orig.length} meshes -> ${T.merged.length}; mean diff ${(sum / (A.length * 0.75)).toFixed(3)}, max ${max}, ${big} px over 12${big ? " in 40px cells " + [...cells].slice(0, 12).join(" ") : ""}`;
	});
	console.log(g.padEnd(8), r, errs.join(" | "));
	await ctx.close();
}
await b.close();
