/* main menu screenshots: the start page at iPhone landscape, iPhone portrait and PC size, on one contact sheet
   node tools/menu.mjs [--truck N] [--layout b] [--view lobby]
   prints each screen's draw calls and triangles (one frame)
   --truck picks the truck shown, --layout b = landscape layout B, --view opens another menu view (e.g. "lobby") */
import { launch, openGame, args, OUT } from "./lib.mjs";
import fs from "fs";
import path from "path";

const { opt } = args();
const SIZES = [
	["phone_land", 844, 390, true],
	["phone_port", 390, 844, true],
	["pc", 1280, 720, false],
];
const b = await launch(),
	shots = [];
for (const [name, width, height, mobile] of SIZES) {
	const { p, ctx, errs } = await openGame(b, {
		width,
		height,
		mobile,
		before: (pg) =>
			pg.addInitScript((lay) => {
				try {
					if (lay) localStorage.setItem("trp_mmlay", JSON.stringify(lay));
				} catch (e) {}
			}, opt.layout || ""),
	});
	await p.evaluate(
		({ truck, v }) => {
			if (truck !== undefined && typeof me !== "undefined") {
				me.truck = +truck;
				if (typeof render === "function") render();
			}
			if (v && typeof go === "function") go(v);
		},
		{ truck: opt.truck, v: opt.view },
	);
	await p.waitForTimeout(3500);
	const info = await p.evaluate(
		() =>
			new Promise((res) => {
				const I = GFX.r.info;
				I.autoReset = false;
				requestAnimationFrame(() => {
					I.reset();
					requestAnimationFrame(() => {
						res([I.render.calls, I.render.triangles]);
						I.autoReset = true;
					});
				});
			}),
	);
	console.log(`${name}: ${info[0]} draw calls, ${info[1]} triangles (one frame, shadows and post included)`);
	const f = path.join(OUT, `menu_${name}${opt.layout ? "_" + opt.layout : ""}.png`);
	fs.writeFileSync(f, await p.screenshot());
	shots.push([name, f, width, height]);
	if (errs.length) console.log(`${name}: page errors:\n  ${errs.join("\n  ")}`);
	await ctx.close();
}
/* one sheet: landscape shots on top, the portrait one beside them */
const html = path.join(OUT, "_menusheet.html");
fs.writeFileSync(
	html,
	`<body style="margin:0;background:#222;display:flex;gap:8px;padding:8px;align-items:flex-start">${shots
		.map(
			([n, f, w, h]) =>
				`<figure style="margin:0;color:#ccc;font:12px sans-serif"><img src="file://${f.replace(/\\/g, "/")}" style="width:${w > h ? 640 : 300}px;display:block"><figcaption>${n}</figcaption></figure>`,
		)
		.join("")}</body>`,
);
const ctx = await b.newContext({ viewport: { width: 1640, height: 700 } }),
	sp = await ctx.newPage();
await sp.goto("file://" + html);
await sp.waitForTimeout(300);
const out = path.join(OUT, `menu${opt.layout ? "_" + opt.layout : ""}.png`);
fs.writeFileSync(out, await sp.screenshot({ fullPage: true }));
console.log(`contact sheet: ${out}`);
await b.close();
