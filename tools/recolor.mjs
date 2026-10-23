/* Recolour a piece of UI art by its shading: every pixel's brightness (ranked among the art's opaque pixels) is mapped onto a colour ramp,
   so the bevels, scratches and texture stay and only the colour changes. Alpha is kept (the half-transparent edge gets the darkest stop, an outline). The typical pixel (the median) gets the middle stop.
   node tools/recolor.mjs in.png out.png [--ramp "#3E2C1A,#E6D7B4,#FFF8E6"]
   (ramp = darkest, typical, lightest; used for the beige HUD: art/ui/panel-beige.png and plate-beige.png from the navy art in art/ui-navy/) */
import { chromium } from "playwright";
import fs from "fs";
const [inp, out] = process.argv.slice(2);
const ri = process.argv.indexOf("--ramp");
const ramp = (ri > 0 ? process.argv[ri + 1] : "#3E2C1A,#E6D7B4,#FFF8E6")
	.split(",")
	.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
if (!inp || !out) throw new Error("usage: node tools/recolor.mjs in.png out.png [--ramp a,b,c]");
const br = await chromium.launch();
const pg = await br.newPage();
const png = await pg.evaluate(
	async ({ b64, ramp }) => {
		const im = new Image();
		im.src = "data:image/png;base64," + b64;
		await im.decode();
		const c = document.createElement("canvas");
		c.width = im.width;
		c.height = im.height;
		const x = c.getContext("2d");
		x.drawImage(im, 0, 0);
		const d = x.getImageData(0, 0, c.width, c.height),
			px = d.data,
			lum = (i) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
		const ls = [];
		for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 200) ls.push(lum(i));
		ls.sort((a, b) => a - b);
		const q = (f) => ls[Math.floor(f * (ls.length - 1))],
			lo = q(0.01),
			mid = q(0.5),
			hi = q(0.995),
			mix = (a, b, t) => a.map((v, j) => v + (b[j] - v) * t);
		for (let i = 0; i < px.length; i += 4) {
			/* the soft edge (keyed off magenta, so its colour is a pale halo) takes the darkest stop, an outline; faint haze goes */
			if (px[i + 3] < 24) px[i + 3] = 0;
			const l = lum(i),
				col =
					px[i + 3] < 250
						? ramp[0]
						: l <= mid
							? mix(ramp[0], ramp[1], Math.max(0, (l - lo) / (mid - lo)))
							: mix(ramp[1], ramp[2], Math.min(1, (l - mid) / (hi - mid)));
			px[i] = col[0];
			px[i + 1] = col[1];
			px[i + 2] = col[2];
		}
		/* specks left over from the keying: every island of pixels under 500 px, apart from the art itself, goes */
		const W = c.width,
			N = W * c.height,
			seen = new Uint8Array(N);
		for (let s = 0; s < N; s++) {
			if (seen[s] || !px[s * 4 + 3]) continue;
			const isl = [s],
				st = [s];
			seen[s] = 1;
			while (st.length) {
				const p = st.pop(),
					x0 = p % W;
				for (const q of [x0 > 0 ? p - 1 : -1, x0 < W - 1 ? p + 1 : -1, p - W, p + W])
					if (q >= 0 && q < N && !seen[q] && px[q * 4 + 3]) {
						seen[q] = 1;
						st.push(q);
						isl.push(q);
					}
			}
			if (isl.length < 500) isl.forEach((p) => (px[p * 4 + 3] = 0));
		}
		x.putImageData(d, 0, 0);
		return c.toDataURL("image/png").split(",")[1];
	},
	{ b64: fs.readFileSync(inp).toString("base64"), ramp },
);
await br.close();
fs.writeFileSync(out, Buffer.from(png, "base64"));
console.log("wrote", out);
