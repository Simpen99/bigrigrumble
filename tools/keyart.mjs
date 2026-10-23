/* Designer art on a magenta background (JPG) -> transparent PNG for art/ui/: keys out the magenta (soft edges, the magenta
   taken back out of the edge pixels), brightens by --bright (1 = as is), crops to the art.
   node tools/keyart.mjs <in.jpg> <out.png> [--bright 1.12] */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { args } from "./lib.mjs";

const { pos, opt } = args();
if (pos.length < 2) {
	console.log("usage: node tools/keyart.mjs <in> <out.png> [--bright 1.12]");
	process.exit(1);
}
const b64 = fs.readFileSync(pos[0]).toString("base64"),
	mime = /\.png$/i.test(pos[0]) ? "image/png" : "image/jpeg",
	br = await chromium.launch(),
	pg = await br.newPage();
const res = await pg.evaluate(
	async ({ b64, mime, k }) => {
		const im = new Image();
		im.src = `data:${mime};base64,${b64}`;
		await im.decode();
		const c = document.createElement("canvas");
		c.width = im.width;
		c.height = im.height;
		const x = c.getContext("2d");
		x.drawImage(im, 0, 0);
		const d = x.getImageData(0, 0, c.width, c.height),
			p = d.data;
		let x0 = c.width,
			y0 = c.height,
			x1 = 0,
			y1 = 0;
		for (let i = 0; i < p.length; i += 4) {
			const r = p[i],
				g = p[i + 1],
				b = p[i + 2],
				/* how magenta: red and blue high, green low */
				m = Math.min(r, b) - g,
				a = Math.max(0, Math.min(1, (250 - m) / 235));
			if (a <= 0.06) {
				p[i + 3] = 0;
				continue;
			}
			/* un-mix the magenta from the edge pixels, then brighten */
			const un = (v, bg) => Math.max(0, Math.min(255, ((v - (1 - a) * bg) / a) * k));
			p[i] = un(r, 255);
			p[i + 1] = un(g, 0);
			p[i + 2] = un(b, 255);
			p[i + 3] = Math.round(a * 255);
			const px = (i / 4) % c.width,
				py = Math.floor(i / 4 / c.width);
			if (a > 0.5) {
				x0 = Math.min(x0, px);
				y0 = Math.min(y0, py);
				x1 = Math.max(x1, px);
				y1 = Math.max(y1, py);
			}
		}
		x.putImageData(d, 0, 0);
		const o = document.createElement("canvas");
		o.width = x1 - x0 + 3;
		o.height = y1 - y0 + 3;
		o.getContext("2d").drawImage(c, x0 - 1, y0 - 1, o.width, o.height, 0, 0, o.width, o.height);
		return { url: o.toDataURL("image/png"), w: o.width, h: o.height, crop: [x0 - 1, y0 - 1] };
	},
	{ b64, mime, k: +opt.bright || 1 },
);
await br.close();
fs.mkdirSync(path.dirname(pos[1]), { recursive: true });
fs.writeFileSync(pos[1], Buffer.from(res.url.split(",")[1], "base64"));
console.log(`${pos[1]}: ${res.w} x ${res.h} (cropped at ${res.crop})`);
