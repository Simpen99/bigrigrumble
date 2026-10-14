import { chromium } from "playwright";
import fs from "fs";
const [src, out, W] = process.argv.slice(2);
const b64 = fs.readFileSync(src).toString("base64");
const br = await chromium.launch();
const pg = await br.newPage();
const res = await pg.evaluate(
	async ({ b64, W, ext }) => {
		const im = new Image();
		im.src = "data:image/" + ext + ";base64," + b64;
		await im.decode();
		const w = im.width,
			h = im.height;
		const c = new OffscreenCanvas(w, h),
			x = c.getContext("2d");
		x.drawImage(im, 0, 0);
		const d = x.getImageData(0, 0, w, h),
			p = d.data;
		// opaque near-white = background (a source that is already transparent is only cropped and scaled)
		const light = (i) =>
			p[i + 3] > 250 &&
			Math.min(p[i], p[i + 1], p[i + 2]) > 200 &&
			Math.max(p[i], p[i + 1], p[i + 2]) - Math.min(p[i], p[i + 1], p[i + 2]) < 25;
		const bg = new Uint8Array(w * h),
			st = [];
		for (let i = 0; i < w; i++) st.push(i, (h - 1) * w + i);
		for (let j = 0; j < h; j++) st.push(j * w, j * w + w - 1);
		while (st.length) {
			const k = st.pop();
			if (bg[k] || !light(k * 4)) continue;
			bg[k] = 1;
			const a = k % w,
				b = (k / w) | 0;
			if (a > 0) st.push(k - 1);
			if (a < w - 1) st.push(k + 1);
			if (b > 0) st.push(k - w);
			if (b < h - 1) st.push(k + w);
		}
		// un-mix from white: background pixels and their 3 px rim get alpha from how far they are from white
		const near = new Uint8Array(w * h);
		for (let j = 0; j < h; j++)
			for (let i = 0; i < w; i++) {
				if (!bg[j * w + i]) continue;
				for (let dy = -3; dy <= 3; dy++)
					for (let dx = -3; dx <= 3; dx++) {
						const a = i + dx,
							b = j + dy;
						if (a >= 0 && b >= 0 && a < w && b < h) near[b * w + a] = 1;
					}
			}
		let x0 = w,
			y0 = h,
			x1 = 0,
			y1 = 0;
		for (let k = 0; k < w * h; k++) {
			const i = k * 4;
			if (near[k]) {
				const dev = 255 - Math.min(p[i], p[i + 1], p[i + 2]);
				const al = bg[k] ? Math.min(1, dev / 255) * (dev < 10 ? 0 : 1) : Math.min(1, dev / 200);
				if (al <= 0.01) {
					p[i + 3] = 0;
					continue;
				}
				for (let c2 = 0; c2 < 3; c2++) p[i + c2] = Math.max(0, Math.min(255, (p[i + c2] - 255 * (1 - al)) / al));
				p[i + 3] = Math.round(al * 255);
			}
			if (p[i + 3] > 8) {
				const a = k % w,
					b = (k / w) | 0;
				x0 = Math.min(x0, a);
				x1 = Math.max(x1, a);
				y0 = Math.min(y0, b);
				y1 = Math.max(y1, b);
			}
		}
		x.putImageData(d, 0, 0);
		const cw = x1 - x0 + 1,
			ch = y1 - y0 + 1,
			H = Math.round((ch * W) / cw);
		const o = new OffscreenCanvas(W, H),
			ox = o.getContext("2d");
		ox.imageSmoothingQuality = "high";
		ox.drawImage(c, x0, y0, cw, ch, 0, 0, W, H);
		const blob = await o.convertToBlob({ type: "image/webp", quality: 0.86 });
		const buf = new Uint8Array(await blob.arrayBuffer());
		let s = "";
		for (const v of buf) s += String.fromCharCode(v);
		return { b64: btoa(s), W, H, crop: [x0, y0, cw, ch] };
	},
	{ b64, W: +W, ext: src.split(".").pop() },
);
fs.writeFileSync(out, Buffer.from(res.b64, "base64"));
console.log(res.W, res.H, res.crop, fs.statSync(out).size);
await br.close();
