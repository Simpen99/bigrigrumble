/* Designer art on a magenta background (JPG) -> transparent PNG for art/ui/: keys out the magenta (soft edges: each edge pixel
   gets the colour of the solid art beside it and an alpha from how much magenta is blended in), brightens by --bright (1 = as is), crops to the art.
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
		const W = c.width,
			H = c.height,
			n = W * H,
			/* how magenta each pixel is: red and blue high, green low (the background ~255, the art far lower) */
			m = new Float32Array(n),
			solid = new Uint8Array(n);
		for (let j = 0; j < n; j++) m[j] = Math.min(p[j * 4], p[j * 4 + 2]) - p[j * 4 + 1];
		/* solid art: clearly not magenta, with no background pixel within 2 px (edge pixels are blends) */
		const art = (j) => m[j] < 120;
		for (let y = 2; y < H - 2; y++)
			for (let xx = 2; xx < W - 2; xx++) {
				const j = y * W + xx;
				if (!art(j)) continue;
				let ok = 1;
				for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (!art(j + dy * W + dx)) ok = 0;
				solid[j] = ok;
			}
		const out = new Uint8ClampedArray(p.length);
		let x0 = W,
			y0 = H,
			x1 = 0,
			y1 = 0;
		for (let y = 0; y < H; y++)
			for (let xx = 0; xx < W; xx++) {
				const j = y * W + xx,
					i = j * 4;
				let q = j;
				if (!solid[j]) {
					if (m[j] > 235) continue;
					/* an edge pixel: a blend of the art beside it and the magenta; take the nearest solid pixel's colour and work
					   out how much of it is in the blend from how magenta each is */
					q = -1;
					for (let r = 1; r <= 5 && q < 0; r++)
						for (let dy = -r; dy <= r && q < 0; dy++)
							for (let dx = -r; dx <= r; dx++) {
								const yy = y + dy,
									xq = xx + dx;
								if (yy < 0 || yy >= H || xq < 0 || xq >= W) continue;
								if (solid[yy * W + xq]) {
									q = yy * W + xq;
									break;
								}
							}
					if (q < 0) continue;
				}
				const a = q === j ? 1 : Math.max(0, Math.min(1, (255 - m[j]) / (255 - m[q])));
				if (a <= 0.04) continue;
				out[i] = p[q * 4] * k;
				out[i + 1] = p[q * 4 + 1] * k;
				out[i + 2] = p[q * 4 + 2] * k;
				out[i + 3] = a * 255;
				if (q === j || a > 0.5) {
					x0 = Math.min(x0, xx);
					y0 = Math.min(y0, y);
					x1 = Math.max(x1, xx);
					y1 = Math.max(y1, y);
				}
			}
		p.set(out);
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
