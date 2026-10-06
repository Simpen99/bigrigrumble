/* Look at models from four angles (front, back, side, 3/4 above), one row per model.
   node tools/rig.mjs cars                      presets: cars, taxi, houses, trucks
   node tools/rig.mjs 'carModel("van","#E5484D")' houses --out vans.png */
import { args, launch, openGame, renderViews, pngOf, save, expand } from "./lib.mjs";

const { pos, opt } = args();
if (!pos.length) {
	console.log("usage: node tools/rig.mjs <preset|JS expression returning a THREE.Object3D>... [--out file.png]");
	process.exit(1);
}
const b = await launch(),
	{ p, errs } = await openGame(b, { width: 400, height: 300 });
const exprs = expand(pos),
	f = save(opt.out || "rig.png", pngOf(await renderViews(p, exprs)));
console.log(`${exprs.length} model(s) -> ${f}`);
if (errs.length) console.log("page errors:", errs);
await b.close();
