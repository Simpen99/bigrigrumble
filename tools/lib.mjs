/* shared helpers for the tools: headless Chromium with the CDN scripts served from tools/node_modules */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = path.join(ROOT, "tools/out");
const THREE_DIR = path.join(ROOT, "tools/node_modules/three/");

export function args(argv = process.argv.slice(2)) {
	const pos = [],
		opt = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a.startsWith("--")) {
			const [k, v] = a.slice(2).split("=");
			opt[k] = v === undefined ? (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true) : v;
		} else pos.push(a);
	}
	return { pos, opt };
}

export async function launch() {
	const exe = ["/opt/pw-browsers/chromium", process.env.CHROMIUM].find((p) => p && fs.existsSync(p));
	return chromium.launch({
		executablePath: exe,
		args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
	});
}

/* open dist/index.html with three.js r128 + ConvexHull/ConvexGeometry from node_modules; resolves once GFX is ready */
export async function openGame(browser, { width = 390, height = 844, mobile = false } = {}) {
	const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile }),
		p = await ctx.newPage(),
		errs = [];
	p.on("pageerror", (e) => errs.push(e.message));
	const serve = (re, file) =>
		p.route(re, (r) => r.fulfill({ body: fs.readFileSync(THREE_DIR + file), contentType: "text/javascript" }));
	await serve(/three\.min\.js/, "build/three.min.js");
	await serve(/ConvexHull\.js/, "examples/js/math/ConvexHull.js");
	await serve(/ConvexGeometry\.js/, "examples/js/geometries/ConvexGeometry.js");
	await p.route(/peerjs|qrcode/, (r) => r.fulfill({ body: "", contentType: "text/javascript" }));
	await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
	await p.goto("file://" + path.join(ROOT, "dist/index.html"));
	await p.waitForFunction(() => typeof GFX !== "undefined" && GFX.ok, null, { timeout: 30000 });
	await p.evaluate(() => {
		window.turn = (m, a = Math.PI) => {
			const g = new THREE.Group();
			m.rotation.y = a;
			g.add(m);
			return g;
		};
		window.faceZ = (m) => {
			const g = new THREE.Group();
			m.rotation.y = Math.PI / 2;
			g.add(m);
			return g;
		};
	});
	return { p, ctx, errs };
}

/* start a practice minigame and press "I'm ready" */
export async function startMinigame(p, g, mobile) {
	await p.evaluate((g) => startPractice(g), g);
	await p.waitForSelector("#m3rb", { timeout: 30000 });
	if (mobile) await p.tap("#m3rb");
	else await p.click("#m3rb");
}

export function save(name, buf) {
	fs.mkdirSync(OUT, { recursive: true });
	const f = path.join(OUT, name);
	fs.writeFileSync(f, buf);
	return path.relative(process.cwd(), f);
}

/* lay out PNG files as a labelled grid and screenshot it */
export async function contactSheet(browser, files, labels, cols, cellW, cellH, outName) {
	const html = path.join(OUT, "_sheet.html");
	fs.mkdirSync(OUT, { recursive: true });
	fs.writeFileSync(
		html,
		`<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},${cellW}px)">${files
			.map(
				(f, i) =>
					`<div style="position:relative"><img src="${path.basename(f)}" style="width:${cellW}px;height:${cellH}px;display:block"><b style="position:absolute;left:4px;bottom:4px;background:#000c;color:#fff;font:bold 14px sans-serif;padding:2px 6px">${labels[i]}</b></div>`,
			)
			.join("")}</body>`,
	);
	const p = await browser.newPage({ viewport: { width: cellW * Math.min(cols, files.length), height: 100 } });
	await p.goto("file://" + html);
	await p.waitForTimeout(300);
	const f = path.join(OUT, outName);
	await p.screenshot({ path: f, fullPage: true });
	await p.close();
	return path.relative(process.cwd(), f);
}

/* model presets for rig/check: name -> list of JS expressions evaluated in the game page */
export const PRESETS = {
	cars: ["sedan", "hatch", "van", "pickup"].map((t) => `carModel("${t}", "#2F7DE1")`),
	taxi: [`carModel("sedan", "#FFC83D")`],
	houses: [0, 1, 2, 3].map((v) => `turn(houseModel(${v}))`),
	/* street buildings face +z like houses; turn() spins them so the rig's front view shows the facade */
	buildings: [0, 1, 2, 3, 4, 5, 6, 7].map(
		(i) =>
			`turn(buildingModel({ floors: BLD_LOOK[${i}][1], style: BLD_LOOK[${i}][2], wall: BLD_LOOK[${i}][3], trim: BLD_LOOK[${i}][4], shop: SHOPS[BLD_LOOK[${i}][0]], roofBits: ${i} }))`,
	),
	/* the playable trucks face +x; faceZ() turns them so the rig's "front" view (from -z) shows their front */
	trucks: Array.from({ length: 12 }, (_, i) => `faceZ(buildTruck(${i}))`),
};
export const expand = (list) => list.flatMap((x) => PRESETS[x] || [x]);

/* in-page renderer: exprs = JS expressions returning an Object3D; highlight = {row: [mesh indices in traverse order]} painted magenta; each row = one model from front / back / side / 3/4 above, camera framed
   from the model's bounding box. Front = the -z side (trucks and cars face -z). Returns a PNG data URL. */
export async function renderViews(p, exprs, { cw = 300, ch = 210, highlight = {} } = {}) {
	return p.evaluate(
		({ exprs, cw, ch, highlight }) => {
			GFX.ok = false;
			const r = GFX.r,
				VIEWS = [
					["front", [0, 0.32, -1]],
					["back", [0, 0.32, 1]],
					["side", [1, 0.22, 0]],
					["3/4 above", [0.62, 0.62, -0.62]],
				];
			r.setPixelRatio(1);
			r.setSize(cw, ch, false);
			const out = document.createElement("canvas");
			out.width = cw * VIEWS.length;
			out.height = ch * exprs.length;
			const o = out.getContext("2d");
			o.font = "bold 13px sans-serif";
			exprs.forEach((ex, row) => {
				const s = new THREE.Scene();
				s.background = new THREE.Color("#D7DEE6");
				const hl = new THREE.HemisphereLight("#FFFFFF", "#8A939E", 0.85),
					sun = new THREE.DirectionalLight("#FFF4E0", 0.8);
				sun.position.set(6, 10, -8);
				s.add(hl, sun);
				const root = eval(ex);
				if (highlight[row]) {
					const ms = [];
					root.traverse((q) => q.isMesh && ms.push(q));
					highlight[row].forEach((k) => ms[k] && (ms[k].material = new THREE.MeshBasicMaterial({ color: "#FF00D4" })));
				}
				s.add(root);
				const bb = new THREE.Box3().setFromObject(root),
					c = bb.getCenter(new THREE.Vector3()),
					sz = bb.getSize(new THREE.Vector3()),
					dist = Math.max(sz.x, sz.y, sz.z) * 2.1 + 1.5,
					gr = new THREE.Mesh(new THREE.CircleGeometry(dist, 32), new THREE.MeshLambertMaterial({ color: "#7F8893" }));
				gr.rotation.x = -Math.PI / 2;
				gr.position.y = bb.min.y - 0.002;
				s.add(gr);
				const cam = new THREE.PerspectiveCamera(30, cw / ch, 0.05, 500);
				VIEWS.forEach(([name, v], col) => {
					cam.position.set(c.x + v[0] * dist, c.y + v[1] * dist, c.z + v[2] * dist);
					cam.lookAt(c);
					r.render(s, cam);
					o.drawImage(r.domElement, col * cw, row * ch, cw, ch);
					o.fillStyle = "#1B2230";
					o.fillText(`${ex.length > 34 ? ex.slice(0, 33) + "…" : ex}  ${name}`, col * cw + 6, row * ch + 16);
				});
			});
			return out.toDataURL("image/png");
		},
		{ exprs, cw, ch, highlight },
	);
}
export const pngOf = (dataUrl) => Buffer.from(dataUrl.split(",")[1], "base64");
