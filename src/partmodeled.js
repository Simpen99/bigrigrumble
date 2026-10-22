/* ---------- model editor (PC, dist/index.html?models): tune the code-built models registered in MDL (partmodels) and
   add new parts to them by eye. Edits are kept per model in localStorage (trp_modeledit) as overrides of the code's
   values: p = params, c = colours, x = part moves, add / out = the whole list of new parts / outfit pieces. "Copy edits"
   gives JSON the user pastes to Claude, who bakes it into the model's code (CLAUDE.md, "Model editor"). Not reachable
   from the game's menus. ---------- */
let ME = null;
const MODELS_URL = new URLSearchParams(location.search).has("models");
const ME_V = () => new THREE.Vector3(),
	MX = new THREE.Matrix4().makeScale(-1, 1, 1),
	meR = (v, k = 1000) => Math.round(v * k) / k,
	meJ = (o) => JSON.stringify(o);
const ME_KIND = {
	cm: { k: 100, st: 0.1, d: 1, u: "cm" },
	deg: { k: 1 / D2R, st: 0.5, d: 1, u: "°" },
	n: { k: 1, st: 1, d: 0, u: "" },
	x: { k: 1, st: 0.01, d: 2, u: "×" },
	"%": { k: 100, st: 1, d: 0, u: "%" },
};
const ME_CSS = `#me{position:fixed;inset:0;z-index:50;pointer-events:none;font:14px/1.4 Rubik,system-ui,sans-serif;color:#EEF2F7}
#me .mep{pointer-events:auto;background:rgba(19,25,34,.94);border:1px solid #2C3646;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.35)}
#me .meleft{position:absolute;left:10px;top:10px;bottom:10px;width:230px;overflow:auto;padding:12px}
#me .meright{position:absolute;right:10px;top:10px;bottom:10px;width:300px;overflow:auto;padding:12px}
#me .metop{position:absolute;left:260px;right:330px;top:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px}
#me .mebot{position:absolute;left:260px;right:330px;bottom:10px;padding:7px 12px;font-size:12px;color:#AEB8C6;text-align:center}
#me .memsg{position:absolute;left:50%;transform:translateX(-50%);bottom:56px;padding:9px 14px;max-width:min(560px,calc(100% - 640px));text-align:center}
#me .memsg:empty{display:none}
#me button{font:inherit;color:#EEF2F7;background:#2C3646;border:1px solid #3B475A;border-radius:9px;padding:5px 10px;cursor:pointer}
#me button:hover{background:#38455A}#me button.on{background:#FFC83D;color:#151B24;border-color:#FFC83D}
#me button.big{width:100%;padding:8px;margin:3px 0;font-weight:600}#me button.warn:hover{background:#7A2E2E}
#me button.wide{width:100%;margin-top:4px}
#me select,#me input[type=number],#me input[type=text]{font:inherit;font-size:13px;background:#0F141B;color:#EEF2F7;border:1px solid #3B475A;border-radius:7px;padding:4px 6px;box-sizing:border-box}
#me input[type=number]{width:100%}#me select{width:100%}#me input[type=text]{width:100%}
#me input[type=color]{width:30px;height:26px;padding:0;border:1px solid #3B475A;border-radius:6px;background:none;cursor:pointer}
#me h2{margin:0 0 8px;font-size:17px}#me h3{margin:14px 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#FFC83D}
#me .sep{width:1px;height:24px;background:#3B475A;margin:0 3px}
#me .lbl{font-size:12px;color:#AEB8C6}
#me .mel{display:block;width:100%;text-align:left;margin:2px 0;padding:6px 9px;border-radius:8px}
#me .mel.off{opacity:.45}#me .mel.cur{background:#FFC83D;color:#151B24;border-color:#FFC83D}
#me .mel small{float:right;opacity:.75}
#me details{border-top:1px solid #2C3646;padding:4px 0}#me summary{cursor:pointer;padding:6px 0;font-weight:600;list-style-position:inside}
#me .row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:3px 0 8px}#me .row3 label{font-size:11px;color:#AEB8C6}
#me .sl{display:grid;grid-template-columns:1fr 64px 18px;gap:2px 6px;align-items:center;margin:2px 0 7px;font-size:13px}
#me .sl .nm{grid-column:1/4}#me .sl input[type=range]{width:100%}#me .sl .rs{cursor:pointer;color:#FFC83D;visibility:hidden}#me .sl.ch .rs{visibility:visible}
#me .sl.ch .nm{color:#FFC83D}
#me .tip{display:inline-block;width:15px;height:15px;line-height:15px;text-align:center;border-radius:50%;background:#3B475A;font-size:10px;cursor:help;margin-left:4px}
#me .sw{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:3px 0 9px}#me .sw span{position:relative}
#me .sw .x{position:absolute;right:-6px;top:-7px;width:15px;height:15px;line-height:13px;font-size:11px;padding:0;border-radius:50%;display:none}
#me .sw span:hover .x{display:block}#me .pick{outline:3px solid #FFC83D;outline-offset:1px}
#me .dr{display:grid;grid-template-columns:110px 1fr;gap:6px;align-items:center;margin:4px 0}
#me .chips{display:flex;flex-wrap:wrap;gap:4px}
#me .note{font-size:12px;color:#9AA6B6;margin:6px 0}
#me .saved{font-size:12px;color:#7FD49B;text-align:center;margin-top:6px;transition:opacity .4s}
#me .menu{position:absolute;left:250px;top:120px;width:260px;padding:8px;z-index:3}#me .menu button{display:block;width:100%;text-align:left;margin:3px 0}
#me .menu small{display:block;opacity:.7;font-size:11px}
#me .help{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100% - 40px));padding:20px 24px;z-index:5}
#me .help ol{padding-left:20px;margin:8px 0}#me .help li{margin:6px 0}#me kbd{background:#2C3646;border:1px solid #3B475A;border-radius:5px;padding:0 5px;font:12px monospace}
#me .lathe{background:#0F141B;border:1px solid #3B475A;border-radius:8px;width:100%;height:220px;touch-action:none;cursor:crosshair}
#me textarea{width:100%;height:110px;margin-top:6px;background:#0F141B;color:#EEF2F7;border:1px solid #3B475A;border-radius:6px;font:12px monospace}`;

function openModelEditor() {
	if (ME) return;
	const st = document.createElement("style");
	st.textContent = ME_CSS;
	document.head.appendChild(st);
	const box = document.createElement("div");
	box.id = "me";
	box.innerHTML = GFX.ok
		? `<div class="mep metop">Loading the model editor…</div>`
		: `<div class="mep metop">This page needs WebGL (a PC browser).</div>`;
	document.body.appendChild(box);
	$("#app").style.display = "none";
	document.title = "Model editor · Big Rig Rumble";
	if (!GFX.ok) return;
	const saved = LS.get("trp_modeledit", {}) || {},
		ids = Object.keys(MDL).sort((a, b) => (b === "crowd") - (a === "crowd"));
	ME = {
		box,
		id: ids.includes(LS.get("trp_memodel", "")) ? LS.get("trp_memodel", "") : ids[0],
		E: {},
		undo: {},
		redo: {},
		dress: {},
		sel: null,
		hover: null,
		mode: "translate",
		space: "local",
		snap: false,
		lock: true,
		vars: false,
		seed: 3,
		stands: false,
		spin: false,
		open: {},
		help: !LS.get("trp_mehelp", false),
	};
	ids.forEach((id) => {
		const e = saved[id] || {};
		ME.E[id] = { p: e.p || {}, c: e.c || {}, x: e.x || {} };
		if (e.add) ME.E[id].add = e.add;
		if (e.out) ME.E[id].out = e.out;
		mePrune(id);
		ME.dress[id] = Object.assign({}, MDL[id].dress0);
	});
	edLoad().then(meInit, () => {
		box.innerHTML = `<div class="mep metop">Couldn't load the editor scripts (no internet?). Reload to try again.</div>`;
	});
	box.addEventListener("click", meClick);
	box.addEventListener("input", meInput);
	box.addEventListener("change", meChange);
	box.addEventListener("pointerdown", meLathePD);
	box.addEventListener("dblclick", meLatheDbl);
	box.addEventListener("contextmenu", meLatheCtx);
}
function meInit() {
	const cv = $("#gl"),
		s = (ME.scene = new THREE.Scene());
	s.background = new THREE.Color("#C9DCEB");
	s.fog = new THREE.Fog("#C9DCEB", 30, 70);
	s.add(new THREE.HemisphereLight("#EEF6FF", "#8A7A64", 0.72));
	const sun = new THREE.DirectionalLight("#FFF3DE", 0.95);
	sun.position.set(-4, 9, -6);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
	sun.shadow.bias = -0.0004;
	s.add(sun);
	const fill = new THREE.DirectionalLight("#DDE8FF", 0.28);
	fill.position.set(5, 4, 6);
	s.add(fill);
	const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), M("#D5D9DF"));
	ground.rotation.x = -Math.PI / 2;
	ground.receiveShadow = true;
	s.add(ground);
	const grid = new THREE.GridHelper(4, 20, "#9AA3B0", "#B7BEC8");
	grid.position.y = 0.002;
	s.add(grid);
	const cam = (ME.cam = new THREE.PerspectiveCamera(35, GFX.w / GFX.h, 0.05, 200));
	const orb = (ME.orbit = new THREE.OrbitControls(cam, cv));
	orb.enableDamping = true;
	orb.dampingFactor = 0.15;
	orb.screenSpacePanning = true;
	orb.addEventListener("start", () => (ME.tween = null));
	const tc = (ME.tc = new THREE.TransformControls(cam, cv));
	tc.setSize(0.85);
	tc.addEventListener("dragging-changed", (e) => {
		orb.enabled = !e.value;
		if (e.value) meDragStart();
		else meDragEnd();
	});
	tc.addEventListener("objectChange", meDragLive);
	s.add(tc);
	ME.proxy = new THREE.Object3D();
	ME.selBox = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color("#FFB000"));
	ME.selBox.visible = false;
	s.add(ME.selBox);
	ME.pd = (e) => (ME.down = { x: e.clientX, y: e.clientY, giz: !!(tc.axis && tc.object) });
	ME.pu = (e) => {
		const d = ME.down;
		ME.down = null;
		if (d && !d.giz && e.button === 0 && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) {
			const h = mePick(e);
			meSelect(h ? { part: h.part, side: h.side } : null);
		}
	};
	ME.pm = (e) => (ME.mouse = e);
	cv.addEventListener("pointerdown", ME.pd);
	cv.addEventListener("pointerup", ME.pu);
	cv.addEventListener("pointermove", ME.pm);
	cv.addEventListener("pointerleave", () => (ME.mouse = null));
	addEventListener("keydown", meKey, true);
	setMode("medit");
	meBuild();
	meView("q", true);
	mePanel();
}
/* ---------- edits ---------- */
const meE = () => ME.E[ME.id];
function meNormX(x) {
	const o = {};
	if (!x) return o;
	if (x.p && x.p.some((v) => v)) o.p = x.p;
	if (x.r && x.r.some((v) => v)) o.r = x.r;
	if (x.s && x.s.some((v) => v !== 1)) o.s = x.s;
	if (x.hide) o.hide = true;
	return o;
}
/* drop overrides that match the code (after a bake the editor shows no edits) */
function mePrune(id) {
	const d = MDL[id],
		e = ME.E[id],
		bx = d.bake.x || {};
	Object.keys(e.p).forEach((k) => (!(k in d.P) || e.p[k] === d.P[k]) && delete e.p[k]);
	Object.keys(e.c).forEach((k) => (!d.C || meJ(e.c[k]) === meJ(d.C[k])) && delete e.c[k]);
	Object.keys(e.x).forEach((k) => {
		e.x[k] = meNormX(e.x[k]);
		if (meJ(e.x[k]) === meJ(meNormX(bx[k]))) delete e.x[k];
	});
	if (e.add && meJ(e.add) === meJ(d.bake.add || [])) delete e.add;
	if (e.out && meJ(e.out) === meJ(d.bake.out || {})) delete e.out;
}
/* the model as the editor shows it: the code's values with the edits on top */
function meLive(id) {
	const d = MDL[id],
		e = ME.E[id];
	return {
		P: Object.assign({}, d.P, e.p),
		C: d.C && Object.assign({}, d.C, e.c),
		x: Object.assign({}, d.bake.x || {}, e.x),
		add: e.add || d.bake.add || [],
		out: e.out || d.bake.out || {},
	};
}
const meCopyOf = (o) => JSON.parse(meJ(o));
/* change the edits: fn(e) edits them; an undo step is kept (one per slider drag), the model rebuilds and saves */
function meEdit(fn, keepStep) {
	const e = meE(),
		u = ME.undo[ME.id] || (ME.undo[ME.id] = []);
	if (!keepStep || !ME.stepOpen) {
		u.push(meJ(e));
		if (u.length > 120) u.shift();
		ME.redo[ME.id] = [];
	}
	ME.stepOpen = !!keepStep;
	fn(e);
	mePrune(ME.id);
	meSave();
	meSoon();
}
function meSave() {
	LS.set("trp_modeledit", ME.E);
	const n = $("#mesaved");
	if (n) {
		n.textContent = "✓ Saved";
		n.style.opacity = 1;
		clearTimeout(ME.svT);
		ME.svT = setTimeout(() => {
			const q = $("#mesaved");
			if (q) q.style.opacity = 0.55;
			if (q) q.textContent = "Saved on this PC";
		}, 1400);
	}
}
function meUndo(redo) {
	const a = (redo ? ME.redo : ME.undo)[ME.id] || [],
		b = (redo ? ME.undo : ME.redo)[ME.id] || ((redo ? ME.undo : ME.redo)[ME.id] = []);
	if (!a.length) return meMsg(redo ? "Nothing to redo" : "Nothing to undo");
	b.push(meJ(meE()));
	ME.E[ME.id] = JSON.parse(a.pop());
	ME.stepOpen = false;
	meSave();
	meBuild();
	mePanel();
	meMsg(redo ? "Redone" : "Undone");
}
/* the edits as the code would hold them: changed params / colours, and the whole part-move table and new-part lists */
function meCopyJSON() {
	const id = ME.id,
		e = meE(),
		L = meLive(id),
		out = { model: id };
	if (Object.keys(e.p).length) out.p = e.p;
	if (Object.keys(e.c).length) out.c = e.c;
	if (Object.keys(e.x).length) {
		out.x = {};
		Object.keys(L.x).forEach((k) => {
			const v = meNormX(L.x[k]);
			if (Object.keys(v).length) out.x[k] = v;
		});
	}
	if (e.add) out.add = L.add;
	if (e.out) out.out = L.out;
	return out;
}
function meCount() {
	const e = meE();
	return (
		Object.keys(e.p).length + Object.keys(e.c).length + Object.keys(e.x).length + (e.add ? 1 : 0) + (e.out ? 1 : 0)
	);
}
/* ---------- scene ---------- */
function meDispose(g, mats) {
	if (!g) return;
	g.parent && g.parent.remove(g);
	g.traverse((o) => {
		if (o.geometry) o.geometry.dispose();
		if (mats && o.material && o.material.userData.meOwn) o.material.dispose();
	});
}
let meSoonF = 0;
function meSoon() {
	if (meSoonF) return;
	meSoonF = requestAnimationFrame(() => {
		meSoonF = 0;
		if (ME) {
			meBuild();
			mePanelSoft();
		}
	});
}
function meBuild() {
	const id = ME.id,
		def = MDL[id];
	MDL[id].live = meLive(id);
	def.reset();
	meDispose(ME.model && ME.model.g, true);
	meDispose(ME.varG);
	if (ME.stand) meDispose(ME.stand.g);
	ME.varG = ME.stand = null;
	ME.tc.detach();
	const look = def.look(ME.dress[id]),
		m = (ME.model = def.build(look));
	ME.cs = m.g.mdlCs || def.cs || {};
	ME.look = look;
	m.g.traverse((o) => {
		if (!o.isMesh) return;
		o.castShadow = o.receiveShadow = true;
		if (o.material && o.material.isMeshStandardMaterial) {
			o.material = o.material.clone();
			o.material.userData.meOwn = true;
		}
	});
	ME.scene.add(m.g);
	if (ME.vars && !ME.stands) {
		ME.varG = def.variants(ME.seed);
		ME.varG.position.z = def.view.vz || 1.6;
		ME.varG.traverse((o) => o.isMesh && (o.castShadow = true));
		ME.scene.add(ME.varG);
	}
	if (ME.stands && def.stand) {
		ME.stand = def.stand(ME.scene);
		ME.stand.g.position.z = 3;
		m.g.visible = false;
	}
	ME.hover = null;
	meAttach();
}
const meParts = () => Object.keys(MDL[ME.id].parts).concat(mdl(ME.id).add.map((q) => q.id));
/* what we know about a part: q = the new part's entry (or null), x = its move, fr = frame name, c = its centre */
function meInfo(part) {
	const def = MDL[ME.id],
		D = mdl(ME.id),
		q = D.add.find((a) => a.id === part) || null,
		c = (ME.cs && ME.cs[part]) || ME_V();
	if (q) return { q, x: q, fr: q.fr || "body", c, name: q.name || "New part" };
	return {
		q: null,
		x: D.x[part] || {},
		fr: (def.armParts || []).includes(part) ? "arm" : "body",
		c,
		name: def.parts[part] || part,
	};
}
const meShown = (part) => {
	let f = false;
	if (ME.model) ME.model.g.traverse((o) => o.isMesh && o.mdl === part && (f = true));
	return f;
};
function meFrameObj(fr, side) {
	const F = ME.model.frames;
	return (side < 0 && F[fr + "L"]) || F[fr] || F.body;
}
function mePick(e) {
	if (!ME.model || !ME.model.g.visible) return null;
	const cv = $("#gl"),
		r = cv.getBoundingClientRect(),
		v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1),
		rc = new THREE.Raycaster();
	rc.setFromCamera(v, ME.cam);
	for (const h of rc.intersectObject(ME.model.g, true)) {
		if (!h.object.mdl || !h.object.visible) continue;
		return { part: h.object.mdl, side: h.object.mdlSide || 1 };
	}
	return null;
}
function meMeshes(part) {
	const l = [];
	if (ME.model) ME.model.g.traverse((o) => o.isMesh && o.mdl === part && l.push(o));
	return l;
}
function meSelect(sel) {
	if (sel && !sel.side) sel.side = 1;
	ME.sel = sel;
	if (sel && !meShown(sel.part)) {
		/* dress the preview so the part shows */
		const def = MDL[ME.id],
			q = mdl(ME.id).add.find((a) => a.id === sel.part),
			need = def.need(q ? (q.shape === "copy" && (!q.on || q.on === "all") ? q.a.of : q.on || "all") : sel.part),
			d = ME.dress[ME.id];
		Object.keys(need).forEach((k) => (k === "ex" ? Object.assign((d.ex = d.ex || {}), need.ex) : (d[k] = need[k])));
		meBuild();
	}
	if (ME.stands && sel) {
		ME.stands = false;
		meBuild();
		meView("q");
	}
	meAttach();
	mePanel();
}
/* puts the gizmo's proxy where the part is now (its centre + move), in its frame on the side that was clicked */
function meAttach() {
	const tc = ME.tc,
		sel = ME.sel;
	tc.detach();
	ME.proxy.parent && ME.proxy.parent.remove(ME.proxy);
	if (!sel || !ME.model || !meMeshes(sel.part).length) return;
	const I = meInfo(sel.part),
		x = I.x,
		s = sel.side,
		p = I.c.clone().add(new THREE.Vector3(...(x.p || [0, 0, 0]))),
		r = x.r || [0, 0, 0],
		pr = ME.proxy;
	if (s < 0 && !meMeshes(sel.part).some((m) => m.mdlSide === -1)) sel.side = 1;
	const sd = sel.side;
	meFrameObj(I.fr, sd).add(pr);
	pr.position.set(sd < 0 ? -p.x : p.x, p.y, p.z);
	pr.rotation.set(r[0] * D2R, (sd < 0 ? -r[1] : r[1]) * D2R, (sd < 0 ? -r[2] : r[2]) * D2R);
	pr.scale.set(...(x.s || [1, 1, 1]));
	pr.updateMatrixWorld(true);
	tc.attach(pr);
	meGizmo();
}
function meGizmo() {
	const tc = ME.tc;
	tc.setMode(ME.mode);
	tc.setSpace(ME.mode === "scale" ? "local" : ME.space);
	tc.setTranslationSnap(ME.snap ? 0.01 : null);
	tc.setRotationSnap(ME.snap ? 15 * D2R : null);
	tc.setScaleSnap(ME.snap ? 0.05 : null);
}
/* the move matrix of the proxy (its frame) and of the committed move, for the live preview while dragging */
function meDragStart() {
	const sel = ME.sel;
	if (!sel) return;
	const I = meInfo(sel.part),
		c = I.c.clone();
	if (sel.side < 0) c.x = -c.x;
	ME.drag = { c, E0inv: meProxyMat(c).invert(), ms: meMeshes(sel.part), sc0: ME.proxy.scale.clone() };
	ME.drag.ms.forEach((m) => {
		m.updateMatrix();
		m.userData.m0 = m.matrix.clone();
		m.matrixAutoUpdate = false;
	});
}
function meProxyMat(c) {
	const p = ME.proxy;
	return new THREE.Matrix4()
		.compose(p.position, p.quaternion, p.scale)
		.multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
}
function meDragLive() {
	const d = ME.drag;
	if (!d) return;
	if (ME.lock && ME.mode === "scale") {
		/* keep proportions: the axis being dragged sets all three */
		const s = ME.proxy.scale,
			a = d.sc0,
			f = [s.x / a.x, s.y / a.y, s.z / a.z].reduce((b, v) => (Math.abs(v - 1) > Math.abs(b - 1) ? v : b), 1);
		s.set(a.x * f, a.y * f, a.z * f);
	}
	const D = meProxyMat(d.c).multiply(d.E0inv),
		Dc = ME.sel.side < 0 ? MX.clone().multiply(D).multiply(MX) : D,
		Dm = MX.clone().multiply(Dc).multiply(MX);
	d.ms.forEach((m) => m.matrix.multiplyMatrices(m.mdlSide === -1 ? Dm : Dc, m.userData.m0));
	meFields();
}
function meDragEnd() {
	if (!ME.drag) return;
	ME.drag = null;
	meCommitProxy();
}
/* writes the proxy's place back into the part's move (mirrored back when the left copy was dragged) */
function meCommitProxy() {
	const sel = ME.sel;
	if (!sel) return;
	const pr = ME.proxy,
		I = meInfo(sel.part),
		sd = sel.side,
		pos = pr.position.clone(),
		eu = pr.rotation;
	if (sd < 0) pos.x = -pos.x;
	const p = pos
			.sub(I.c)
			.toArray()
			.map((v) => meR(v)),
		r = [eu.x, sd < 0 ? -eu.y : eu.y, sd < 0 ? -eu.z : eu.z].map((v) => meR(v / D2R, 10)),
		s = pr.scale.toArray().map((v) => meR(Math.max(0.02, v)));
	meSetMove(sel.part, { p, r, s });
}
function meSetMove(part, mv) {
	const I = meInfo(part);
	meEdit((e) => {
		if (I.q) {
			const L = meCopyOf(meLive(ME.id).add),
				q = L.find((a) => a.id === part);
			Object.assign(q, mv);
			e.add = L;
		} else e.x[part] = Object.assign({}, meNormX(meLive(ME.id).x[part]), mv);
	});
}
/* ---------- frame loop ---------- */
function meFrame(dt, t) {
	if (!ME || !ME.cam) return;
	const cam = ME.cam,
		w = GFX.w,
		h = GFX.h;
	if (cam.aspect !== w / h || ME.vw !== w || ME.vh !== h) {
		ME.vw = w;
		ME.vh = h;
		cam.aspect = w / h;
		cam.setViewOffset(w, h, w > 900 ? 35 : 0, -30, w, h);
		cam.updateProjectionMatrix();
	}
	if (ME.tween) {
		const k = Math.min(1, dt * 5),
			tw = ME.tween;
		cam.position.lerp(tw.pos, k);
		ME.orbit.target.lerp(tw.tgt, k);
		if (cam.position.distanceTo(tw.pos) < 0.005) ME.tween = null;
	}
	if (ME.spin && !ME.drag) {
		const o = ME.orbit.target,
			v = cam.position.clone().sub(o);
		v.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.4);
		cam.position.copy(o).add(v);
	}
	ME.orbit.update();
	if (ME.stand) ME.stand.step(t);
	/* hover and selection glow */
	let hv = null;
	if (ME.mouse && !ME.drag && !ME.tc.axis) {
		const h = mePick(ME.mouse);
		hv = h && h.part;
	}
	const sel = ME.sel && ME.sel.part,
		pulse = 0.28 + 0.16 * Math.sin(t * 5);
	if (ME.model)
		ME.model.g.traverse((o) => {
			if (!o.isMesh || !o.material.userData.meOwn) return;
			const on = o.mdl && o.mdl === sel,
				hov = o.mdl && o.mdl === hv && !on;
			o.material.emissive.set(on ? "#FFB000" : hov ? "#4C8DFF" : "#000000");
			o.material.emissiveIntensity = on ? pulse : hov ? 0.35 : 1;
		});
	$("#gl").style.cursor = hv ? "pointer" : "";
	const sb = ME.selBox;
	sb.visible = false;
	if (sel && ME.model && ME.model.g.visible) {
		const ms = meMeshes(sel);
		if (ms.length) {
			ME.model.g.updateMatrixWorld(true);
			sb.box.makeEmpty();
			ms.forEach((m) => sb.box.expandByObject(m));
			sb.visible = true;
		}
	}
	GFX.r.render(ME.scene, cam);
}
/* camera views: front (the models face -z), side, back, top, 3/4; "stands" = the crowd as the games draw it */
function meView(v, now) {
	const def = MDL[ME.id],
		V = def.view,
		y = V.y,
		d = V.d * (ME.vars && v !== "stands" ? 2.8 : 1),
		tz = ME.vars && v !== "stands" ? 0.8 : 0;
	if (v === "stands") {
		ME.stands = true;
		meSelect(null);
		meBuild();
		ME.tween = { pos: new THREE.Vector3(3.5, 4.2, -8), tgt: new THREE.Vector3(0, 1.3, 5) };
	} else {
		if (ME.stands) {
			ME.stands = false;
			meBuild();
		}
		const P = {
			f: [0, y + 0.1, -d],
			b: [0, y + 0.1, d],
			s: [d, y + 0.1, 0],
			t: [0, y + d, -0.01],
			q: [d * 0.62, y + d * 0.38, -d * 0.72],
		}[v];
		ME.tween = { pos: new THREE.Vector3(P[0], P[1], P[2] + tz), tgt: new THREE.Vector3(0, y, tz) };
	}
	if (now) {
		ME.cam.position.copy(ME.tween.pos);
		ME.orbit.target.copy(ME.tween.tgt);
		ME.tween = null;
	}
	ME.viewNow = v;
	meTop();
}
function meFocus() {
	const ms = ME.sel && meMeshes(ME.sel.part);
	if (!ms || !ms.length) return meMsg("Select a part first");
	const bb = new THREE.Box3();
	ms.forEach((m) => bb.expandByObject(m));
	const c = bb.getCenter(ME_V()),
		r = Math.max(0.12, bb.getSize(ME_V()).length()),
		dir = ME.cam.position.clone().sub(ME.orbit.target).normalize();
	ME.tween = { pos: c.clone().addScaledVector(dir, r * 3.2), tgt: c };
}
/* ---------- parts: add, duplicate, delete ---------- */
function meNewId() {
	const L = mdl(ME.id).add;
	let n = 1;
	L.forEach((q) => (n = Math.max(n, +q.id.slice(1) + 1 || n)));
	return "+" + n;
}
function meAddShape(shape) {
	const def = MDL[ME.id],
		S = MDL_SHAPES[shape],
		id = meNewId(),
		count = mdl(ME.id).add.filter((q) => q.shape === shape).length,
		q = {
			id,
			name: S.name + (count ? " " + (count + 1) : ""),
			shape,
			a: meCopyOf(S.a),
			p: (def.spawn.body || [0, 0.5, -0.5]).slice(),
			r: [0, 0, 0],
			s: [1, 1, 1],
			col: def.slotDefault,
			fr: "body",
			on: typeof def.onDefault === "function" ? def.onDefault(ME.dress[ME.id]) : def.onDefault,
			mir: false,
		};
	meEdit((e) => (e.add = meCopyOf(meLive(ME.id).add).concat([q])));
	ME.menu = false;
	ME.mode = "translate";
	meBuild();
	meSelect({ part: id, side: 1 });
	meMsg(`Added a ${S.name.toLowerCase()} in front of the model. Drag the arrows to put it in place.`);
}
function meDuplicate() {
	const sel = ME.sel;
	if (!sel) return meMsg("Select a part to duplicate");
	const def = MDL[ME.id],
		I = meInfo(sel.part),
		id = meNewId();
	let q;
	if (I.q) {
		q = meCopyOf(I.q);
		q.id = id;
		q.name = (I.q.name || "Part") + " copy";
		q.p = [meR(q.p[0] + 0.06), q.p[1], q.p[2]];
	} else {
		const x = meNormX(I.x);
		q = {
			id,
			name: "Copy of " + I.name.toLowerCase(),
			shape: "copy",
			a: { of: sel.part },
			p: [meR((x.p || [0, 0, 0])[0] + 0.06), (x.p || [0, 0, 0])[1], (x.p || [0, 0, 0])[2]],
			r: (x.r || [0, 0, 0]).slice(),
			s: (x.s || [1, 1, 1]).slice(),
			col: (def.partSlot && def.partSlot[sel.part]) || null,
			fr: I.fr,
			on: (def.partOn && def.partOn[sel.part]) || "all",
			mir: false,
		};
	}
	meEdit((e) => (e.add = meCopyOf(meLive(ME.id).add).concat([q])));
	meBuild();
	meSelect({ part: id, side: 1 });
	meMsg("Duplicated: the copy sits a little to the side.");
}
function meDelete() {
	const sel = ME.sel;
	if (!sel) return meMsg("Select a part to delete");
	const I = meInfo(sel.part);
	if (I.q) {
		meEdit((e) => (e.add = meLive(ME.id).add.filter((a) => a.id !== sel.part && !(a.a && a.a.of === sel.part))));
		meMsg(`Deleted “${esc(I.name)}”. Ctrl+Z brings it back.`);
	} else {
		meEdit((e) => (e.x[sel.part] = Object.assign({}, meNormX(I.x), { hide: true })));
		meMsg(`Hid “${esc(I.name)}”. Find it greyed out in the parts list to bring it back.`);
	}
	ME.sel = null;
	meBuild();
	mePanel();
}
function meResetPart() {
	const sel = ME.sel;
	if (!sel) return;
	const I = meInfo(sel.part);
	if (I.q) meSetMove(sel.part, { r: [0, 0, 0], s: [1, 1, 1] });
	else meEdit((e) => delete e.x[sel.part]);
	meBuild();
	mePanel();
	meMsg(I.q ? "Turn and size reset" : "Back where the code puts it");
}
function meFlip() {
	const I = ME.sel && meInfo(ME.sel.part);
	if (!I || !I.q) return;
	const x = I.q;
	meSetMove(ME.sel.part, { p: [meR(-x.p[0]), x.p[1], x.p[2]], r: [x.r[0], meR(-x.r[1], 10), meR(-x.r[2], 10)] });
	meBuild();
	mePanel();
}
function meSetQ(part, fn) {
	meEdit((e) => {
		const L = meCopyOf(meLive(ME.id).add);
		fn(L.find((a) => a.id === part));
		e.add = L;
	});
}
/* ---------- panels ---------- */
function meMsg(t) {
	const m = $("#memsg");
	if (m) m.innerHTML = t;
	clearTimeout(ME.msgT);
	if (t)
		ME.msgT = setTimeout(() => {
			const q = $("#memsg");
			if (q && q.innerHTML === t) q.innerHTML = "";
		}, 6000);
}
const meTip = (t) => (t ? `<span class="tip" title="${esc(t)}">?</span>` : "");
const meBtn = (on, a, t, title) =>
	`<button data-me="${a}" class="${on ? "on" : ""}"${title ? ` title="${esc(title)}"` : ""}>${t}</button>`;
function mePanel() {
	if (!ME || !ME.tc) return;
	const keep = $("#me .meright"),
		sc = keep ? keep.scrollTop : 0;
	ME.box.innerHTML = `<div class="mep metop"></div><div class="mep meleft"></div><div class="mep meright"></div>
	<div class="mep mebot"><b>Mouse:</b> left drag = turn the view · right drag = slide · wheel = zoom · click a part to pick it &nbsp;·&nbsp; <kbd>W</kbd> move <kbd>E</kbd> turn <kbd>R</kbd> size <kbd>Del</kbd> delete <kbd>Ctrl+D</kbd> duplicate <kbd>F</kbd> focus <kbd>X</kbd> snap <kbd>Ctrl+Z</kbd> undo <kbd>Ctrl+Y</kbd> redo <kbd>Esc</kbd> deselect</div>
	<div class="mep memsg" id="memsg"></div>${ME.menu ? meMenuHTML() : ""}${ME.help ? meHelpHTML() : ""}`;
	meTop();
	meLeft();
	meRight();
	$("#me .meright").scrollTop = sc;
}
/* light refresh after a rebuild (keeps the slider being dragged) */
function mePanelSoft() {
	meLeft();
	meFields();
	const a = document.activeElement;
	if (!(a && a.closest && a.closest("#me .meright"))) meRight();
}
function meTop() {
	const el = $("#me .metop");
	if (!el) return;
	const def = MDL[ME.id],
		v = ME.viewNow;
	el.innerHTML = `${meBtn(ME.mode === "translate", "m:translate", "✥ Move <kbd>W</kbd>", "Drag the arrows to move the part")}${meBtn(ME.mode === "rotate", "m:rotate", "⟳ Turn <kbd>E</kbd>", "Drag the rings to turn the part")}${meBtn(ME.mode === "scale", "m:scale", "⤢ Size <kbd>R</kbd>", "Drag the cubes to stretch the part")}
	${meBtn(ME.snap, "snap", "▦ Snap <kbd>X</kbd>", "Moves in 1 cm steps, turns in 15° steps, sizes in 0.05 steps")}${meBtn(ME.mode === "scale" && ME.lock, "lock", "🔒 Keep shape", "When sizing: stretch all three directions together")}
	<span class="sep"></span>${meBtn(0, "undo", "↶ Undo")}${meBtn(0, "redo", "↷ Redo")}
	<span class="sep"></span><span class="lbl">View</span>${[
		["f", "Front"],
		["s", "Side"],
		["b", "Back"],
		["t", "Top"],
		["q", "3/4"],
	]
		.map(([k, t]) => meBtn(v === k, "v:" + k, t))
		.join(
			"",
		)}${def.stand ? meBtn(v === "stands", "v:stands", "🏟 In the stands", "The crowd as the games draw it, from a player's distance") : ""}
	<span class="sep"></span>${meBtn(ME.vars, "vars", "👥 Variants", def.stand ? "A row of random people with your changes" : "All the versions side by side")}${ME.vars && def.stand ? meBtn(0, "reroll", "🎲", "New random people") : ""}${meBtn(ME.spin, "spin", "↻ Spin", "Turn the view slowly round the model")}
	<span class="sep"></span>${meBtn(0, "help", "?", "How to use the editor")}`;
}
function meLeft() {
	const el = $("#me .meleft");
	if (!el) return;
	const def = MDL[ME.id],
		D = mdl(ME.id),
		sel = ME.sel && ME.sel.part,
		row = (part, name, extra) => {
			const shown = meShown(part),
				hid = !extra && D.x[part] && D.x[part].hide,
				moved = !extra && mdlMoved(D.x[part]);
			return `<button class="mel ${sel === part ? "cur" : ""} ${shown ? "" : "off"}" data-me="sel:${part}" title="${shown ? "Select" : hid ? "Hidden: select it to bring it back" : "Not showing right now: click to dress the preview so it shows"}">${esc(name)}${hid ? "<small>hidden</small>" : moved ? "<small>moved</small>" : !shown ? "<small>" + (def.offLabel || "not shown") + "</small>" : ""}</button>`;
		};
	el.innerHTML = `<h2>🧍 Model editor</h2>
	<h3>Model</h3>${Object.keys(MDL)
		.sort((a, b) => (b === "crowd") - (a === "crowd"))
		.map((id) => `<button class="mel ${id === ME.id ? "cur" : ""}" data-me="model:${id}">${esc(MDL[id].name)}</button>`)
		.join("")}
	<h3>Add</h3><button class="big on" data-me="menu">＋ Add shape</button>
	<h3>Parts</h3>${Object.keys(def.parts)
		.map((k) => row(k, def.parts[k]))
		.join("")}
	${D.add.length ? `<h3>Your new parts</h3>${D.add.map((q) => row(q.id, q.name || q.id, true)).join("")}` : ""}
	<h3>Save</h3><button class="big" data-me="copy" title="Copies your changes as text: paste it to Claude to make them part of the game">📋 Copy edits for Claude</button>
	<div class="note">${meCount() ? `${meCount()} change${meCount() > 1 ? "s" : ""} on this model.` : "No changes on this model yet."}</div>
	<button class="wide warn" data-me="resetall" title="Throws away all your changes on this model">Reset model</button>
	<div class="saved" id="mesaved" style="opacity:.55">Saved on this PC</div>`;
}
function meMenuHTML() {
	return `<div class="mep menu"><b>Add a shape</b><div class="note">It appears in front of the model, ready to move.</div>${Object.keys(
		MDL_SHAPES,
	)
		.map((k) => {
			const S = MDL_SHAPES[k],
				d = {
					box: "Sharp corners",
					bevel: "A box with cut-off edges, like the body parts",
					sphere: "Heads, bobbles, knobs",
					cyl: "Tubes, posts, cones (set the top to 0)",
					torus: "Rings, scarves, handles (part rings too)",
					lathe: "A shape turned round its middle: drag its outline",
					wedge: "A sloped block: visors, ramps, noses",
				}[k];
			return `<button data-me="add:${k}">${S.name}<small>${d}</small></button>`;
		})
		.join("")}<button data-me="menu">Cancel</button></div>`;
}
function meHelpHTML() {
	return `<div class="mep help"><h2>How the model editor works</h2><ol>
	<li><b>Look around:</b> left-drag turns the view, right-drag slides it, the wheel zooms. The View buttons jump to front, side, top…</li>
	<li><b>Pick a part:</b> click it on the model (it glows) or in the Parts list on the left. Its controls show on the right.</li>
	<li><b>Move it:</b> drag the coloured arrows. <kbd>E</kbd> turns, <kbd>R</kbd> stretches, <kbd>W</kbd> moves again. Or type exact numbers on the right.</li>
	<li><b>Change sizes:</b> with nothing picked, the right side has sliders for the whole model (sizes, colours, outfit mix).</li>
	<li><b>Add something new:</b> “＋ Add shape”, then choose its colour, what it's attached to (body or arm) and when it shows (an outfit).</li>
	<li><b>Mistake?</b> <kbd>Ctrl+Z</kbd> undoes. Everything saves by itself on this PC.</li>
	<li><b>Done?</b> “📋 Copy edits for Claude” and paste it to Claude, who makes it part of the game.</li></ol>
	<button class="big on" data-me="helpok">Got it</button></div>`;
}
function meSlider([k, nm, kind, lo, hi, tip], v, v0, attr) {
	const K = ME_KIND[kind],
		f = (x) => +(x * K.k).toFixed(K.d);
	return `<div class="sl ${v0 !== undefined && v !== v0 ? "ch" : ""}"><span class="nm">${esc(nm)}${meTip(tip)}</span>
	<input type="range" ${attr}="${k}" min="${f(lo)}" max="${f(hi)}" step="${K.st}" value="${f(v)}">
	<input type="number" ${attr}="${k}" step="${K.st}" value="${f(v)}" title="${K.u ? "In " + K.u : ""}">
	<span class="rs" data-me="${attr === "data-mp" ? "rp:" + k : ""}" title="Back to the code's value${v0 !== undefined ? " (" + f(v0) + K.u + ")" : ""}">↺</span></div>`;
}
function meSections(D, only) {
	const def = MDL[ME.id],
		d = ME.dress[ME.id],
		ch = (sec) => sec[2].some(([k]) => D.P[k] !== def.P[k]);
	return def.ui
		.filter((sec) => (only ? sec[1].some((p) => only.includes(p)) : true))
		.filter((sec) => !sec[3] || Object.keys(sec[3]).every((k) => d[k] === sec[3][k]))
		.map(
			(sec) =>
				`<details data-sec="${esc(sec[0])}" ${only || ME.open[sec[0]] ? "open" : ""}><summary>${esc(sec[0])}${ch(sec) ? ` <span style="color:#FFC83D">•</span>` : ""}</summary>${sec[2]
					.map((r) => meSlider(r, D.P[r[0]], def.P[r[0]], "data-mp"))
					.join("")}</details>`,
		)
		.join("");
}
function meColours(D) {
	const def = MDL[ME.id];
	if (!D.C) return "";
	const names = def.cols || def.slots;
	return `<details data-sec="#cols" ${ME.open["#cols"] ? "open" : ""}><summary>Colours</summary>${Object.keys(names)
		.map((k) => {
			const v = D.C[k],
				ch = meJ(v) !== meJ(def.C[k]);
			if (Array.isArray(v))
				return `<div class="lbl">${esc(names[k])}${ch ? ` <span class="rs" style="cursor:pointer;color:#FFC83D" data-me="rc:${k}" title="Back to the code's colours">↺</span>` : ""}</div><div class="sw">${v
					.map(
						(c, i) =>
							`<span><input type="color" value="${c}" data-mc="${k}:${i}" title="Click to change"><button class="x" data-me="cdel:${k}:${i}" title="Remove this colour">×</button></span>`,
					)
					.join(
						"",
					)}<button data-me="cadd:${k}" title="Add a colour (a random person picks any of these)">＋</button></div>`;
			return `<div class="dr"><span class="lbl">${esc(names[k])}</span><span><input type="color" value="${v}" data-mc="${k}"> ${ch ? `<span style="cursor:pointer;color:#FFC83D" data-me="rc:${k}" title="Back to the code's colour">↺</span>` : ""}</span></div>`;
		})
		.join("")}</details>`;
}
function meDressHTML(D) {
	const def = MDL[ME.id],
		d = ME.dress[ME.id];
	return def
		.dressUI(D)
		.map(([k, nm, opt]) => {
			const cur = k.startsWith("ex.") ? !!(d.ex || {})[k.slice(3)] : d[k];
			if (opt === "bool")
				return `<div class="dr"><span class="lbl">${esc(nm)}</span><span class="chips">${meBtn(cur, "dr:" + k + ":1", "Yes")}${meBtn(!cur, "dr:" + k + ":0", "No")}</span></div>`;
			if (typeof opt === "string") {
				const pal = D.C[opt.slice(4)];
				return `<div class="dr"><span class="lbl">${esc(nm)}</span><span class="sw" style="margin:0">${pal
					.map(
						(c, i) =>
							`<button data-me="dr:${k}:${i}" class="${i === cur % pal.length ? "pick" : ""}" style="background:${c};width:22px;height:22px;padding:0;border-radius:50%" title="${c}"></button>`,
					)
					.join("")}</span></div>`;
			}
			return `<div class="dr"><span class="lbl">${esc(nm)}</span><span class="chips">${opt.map(([v, t]) => meBtn(cur === v, "dr:" + k + ":" + v, esc(t))).join("")}</span></div>`;
		})
		.join("");
}
function meOutfits(D) {
	const def = MDL[ME.id];
	if (!def.bake.out) return "";
	const ks = Object.keys(D.out);
	return `<details data-sec="#out" ${ME.open["#out"] ? "open" : ""}><summary>New outfit pieces</summary>
	<div class="note">Make a new piece (say a scarf), then add shapes and set their “Shows with” to it.</div>${ks
		.map((k) => {
			const o = D.out[k];
			return `<div style="border:1px solid #2C3646;border-radius:9px;padding:8px;margin:6px 0">
			<input type="text" value="${esc(o.name)}" data-mo="${k}:name" title="Its name">
			<div class="chips" style="margin:6px 0">${meBtn(!o.hat, "oh:" + k + ":0", "Extra piece", "Worn on top of any outfit, rolled on its own")}${meBtn(o.hat, "oh:" + k + ":1", "A new hat", "Takes the hat's place: a person wears a cap, a beanie or this")}</div>
			${meSlider(["p", "How often", "%", 0, 1, o.hat ? "Out of everyone; caps + beanies + new hats can't go over 100%" : "Out of everyone"], o.p, undefined, `data-mo="${k}" data-mof`)}
			<button class="wide warn" data-me="odel:${k}">Delete this piece</button></div>`;
		})
		.join("")}<button class="wide" data-me="oadd">＋ New outfit piece</button></details>`;
}
function meRight() {
	const el = $("#me .meright");
	if (!el) return;
	const def = MDL[ME.id],
		D = mdl(ME.id);
	if (!ME.sel) {
		el.innerHTML = `<h2>${esc(def.name)}</h2><div class="note">Click a part to move it, or change the whole model here.</div>
		<h3>${def.stand ? "Dress the preview" : "Show"}</h3>${meDressHTML(D)}
		<h3>Sizes</h3>${meSections(D)}${meColours(D)}${meOutfits(D)}`;
		return;
	}
	const I = meInfo(ME.sel.part),
		q = I.q,
		x = I.x,
		hid = !q && x.hide,
		armPart = I.fr === "arm",
		f3 = (k, lbl, vals, kind) =>
			`<div class="row3">${["X", "Y", "Z"]
				.map(
					(a, i) =>
						`<label>${a} ${["(sideways)", "(up)", "(front −)"][i]}<input type="number" data-mf="${k}:${i}" id="mef-${k}${i}" step="${ME_KIND[kind].st}" value="${+(vals[i] * ME_KIND[kind].k).toFixed(ME_KIND[kind].d)}"></label>`,
				)
				.join("")}</div>`;
	let h = `<h2>${esc(I.name)}</h2><div class="note">${q ? (q.shape === "copy" ? `A copy of ${esc(def.parts[q.a.of] || q.a.of)}` : `A new ${esc(MDL_SHAPES[q.shape].name.toLowerCase())}`) : "Part of the model's code"}${ME.sel.side < 0 ? " · the mirrored side" : ""}</div>`;
	if (hid)
		return (el.innerHTML =
			h +
			`<p>This part is hidden.</p><button class="big on" data-me="unhide">Bring it back</button><button class="wide" data-me="desel">Done</button>`);
	h += `<div class="chips">${meBtn(0, "dup", "⧉ Duplicate", "Ctrl+D")}${meBtn(0, "del", q ? "🗑 Delete" : "🙈 Hide", "Delete key")}${meBtn(0, "focus", "🔍 Focus", "F")}${q ? meBtn(0, "flip", "⇆ Other side", "Mirror it to the other side") : ""}</div>`;
	h += `<h3>${q ? "Position" : "Moved by"} <span class="lbl" style="text-transform:none;letter-spacing:0">cm</span>${meTip(q ? "Where its middle is" : "How far it's moved from where the code puts it")}</h3>${f3("p", "", x.p || [0, 0, 0], "cm")}
	<h3>Turn <span class="lbl" style="text-transform:none;letter-spacing:0">degrees</span></h3>${f3(
		"r",
		"",
		(x.r || [0, 0, 0]).map((v) => v * D2R),
		"deg",
	)}
	<h3>Size <span class="lbl" style="text-transform:none;letter-spacing:0">× times</span></h3>${f3("s", "", x.s || [1, 1, 1], "x")}
	<button class="wide" data-me="resetpart">↺ ${q ? "Reset turn and size" : "Reset this part"}</button>`;
	if (q) {
		h += `<h3>Name</h3><input type="text" data-mq="name" value="${esc(q.name || "")}">`;
		if (q.shape !== "copy") {
			const S = MDL_SHAPES[q.shape],
				a = Object.assign({}, S.a, q.a);
			h += `<h3>Shape</h3>${S.ui.map((r) => meSlider(r, a[r[0]], S.a[r[0]], "data-ma")).join("")}`;
			if (q.shape === "lathe")
				h += `<div class="note">Its outline: drag the dots. Double-click to add a dot, right-click a dot to remove it. The left edge is the middle it turns round.</div>${meLatheSVG(a.pts)}`;
		}
		const slots = def.slots,
			fixed = q.col && !slots[q.col];
		h += `<h3>Colour</h3><select data-mq="col">${q.shape === "copy" ? `<option value="" ${!q.col ? "selected" : ""}>Same as the original</option>` : ""}${Object.keys(
			slots,
		)
			.map((k) => `<option value="${k}" ${q.col === k ? "selected" : ""}>${esc(slots[k])}</option>`)
			.join(
				"",
			)}<option value="#fixed" ${fixed ? "selected" : ""}>A fixed colour…</option></select>${fixed ? `<div style="margin-top:6px"><input type="color" data-mq="hex" value="${q.col}"> <span class="lbl">every one gets this colour</span></div>` : `<div class="note">${def.stand ? "Follows each person's outfit colour." : ""}</div>`}`;
		if (Object.keys(def.frames).length > 1 && q.shape !== "copy")
			h += `<h3>Attached to${meTip("What it moves with: on an arm it swings with that arm")}</h3><select data-mq="fr">${Object.keys(
				def.frames,
			)
				.map((k) => `<option value="${k}" ${(q.fr || "body") === k ? "selected" : ""}>${esc(def.frames[k])}</option>`)
				.join("")}</select>`;
		const outs = Object.assign({}, def.outfits);
		Object.keys(D.out).forEach((k) => (outs[k] = "New piece: " + D.out[k].name));
		h += `<h3>Shows with${meTip("When it's worn: always, or only with an outfit piece")}</h3><select data-mq="on">${Object.keys(
			outs,
		)
			.map((k) => `<option value="${k}" ${(q.on || "all") === k ? "selected" : ""}>${esc(outs[k])}</option>`)
			.join("")}</select>`;
		if (!armPart)
			h += `<label style="display:block;margin-top:10px"><input type="checkbox" data-mq="mir" ${q.mir ? "checked" : ""}> Both sides (a mirrored copy on the other side)</label>`;
		else h += `<div class="note">On an arm, both arms get one (mirrored).</div>`;
	}
	const secs = q ? "" : meSections(D, [ME.sel.part]);
	if (secs) h += `<h3>Its sizes</h3>${secs}`;
	h += `<button class="wide" data-me="desel" style="margin-top:12px">Done (Esc)</button>`;
	el.innerHTML = h;
}
/* keeps the number fields in step with the gizmo while dragging */
function meFields() {
	if (!ME.sel || !ME.drag) return;
	const pr = ME.proxy,
		I = meInfo(ME.sel.part),
		sd = ME.sel.side,
		pos = pr.position.clone();
	if (sd < 0) pos.x = -pos.x;
	const v = {
		p: pos.sub(I.c).toArray(),
		r: [pr.rotation.x, sd < 0 ? -pr.rotation.y : pr.rotation.y, sd < 0 ? -pr.rotation.z : pr.rotation.z],
		s: pr.scale.toArray(),
	};
	Object.keys(v).forEach((k) =>
		v[k].forEach((n, i) => {
			const el = $("#mef-" + k + i),
				K = ME_KIND[k === "p" ? "cm" : k === "r" ? "deg" : "x"];
			if (el) el.value = +(n * K.k).toFixed(K.d);
		}),
	);
}
/* ---------- lathe outline editor ---------- */
const ME_LS = { w: 276, h: 220, k: 900, ox: 20, oy: 110 };
function meLatheSVG(pts) {
	const L = ME_LS,
		X = (r) => L.ox + r * L.k,
		Y = (y) => L.oy - y * L.k;
	return `<svg class="lathe" viewBox="0 0 ${L.w} ${L.h}" data-lathe="1"><line x1="${L.ox}" y1="0" x2="${L.ox}" y2="${L.h}" stroke="#FFC83D" stroke-dasharray="4 4"/>
	<line x1="0" y1="${L.oy}" x2="${L.w}" y2="${L.oy}" stroke="#2C3646"/>
	<polyline fill="none" stroke="#7FB2FF" stroke-width="2" points="${pts.map(([r, y]) => X(r) + "," + Y(y)).join(" ")}"/>
	${pts.map(([r, y], i) => `<circle cx="${X(r)}" cy="${Y(y)}" r="7" fill="#EEF2F7" stroke="#151B24" data-lp="${i}" style="cursor:grab"/>`).join("")}</svg>`;
}
function meLatheXY(e, svg) {
	const b = svg.getBoundingClientRect(),
		L = ME_LS,
		sx = ((e.clientX - b.left) / b.width) * L.w,
		sy = ((e.clientY - b.top) / b.height) * L.h;
	return [meR(Math.max(0.001, (sx - L.ox) / L.k)), meR((L.oy - sy) / L.k)];
}
function meLathePts() {
	const q = ME.sel && meInfo(ME.sel.part).q;
	return q && meCopyOf(Object.assign({}, MDL_SHAPES.lathe.a, q.a).pts);
}
function meLathePD(e) {
	const c = e.target.closest("[data-lp]");
	if (!c || e.button !== 0) return;
	const i = +c.dataset.lp,
		part = ME.sel.part;
	e.preventDefault();
	ME.stepOpen = false;
	const mv = (ev) => {
		const pts = meLathePts(),
			svg = $("#me svg[data-lathe]");
		if (!pts || !svg) return;
		pts[i] = meLatheXY(ev, svg);
		meSetQKeep(part, (q) => (q.a = Object.assign({}, q.a, { pts })));
		svg.outerHTML = meLatheSVG(pts);
	};
	const up = () => {
		removeEventListener("pointermove", mv);
		removeEventListener("pointerup", up);
		ME.stepOpen = false;
		meRight();
	};
	addEventListener("pointermove", mv);
	addEventListener("pointerup", up);
}
function meLatheDbl(e) {
	const svg = e.target.closest("svg[data-lathe]");
	if (!svg || e.target.closest("[data-lp]")) return;
	const p = meLatheXY(e, svg),
		pts = meLathePts();
	/* insert between the two dots it's closest to (by height) */
	let at = pts.findIndex(([, y]) => y > p[1]);
	if (at < 0) at = pts.length;
	pts.splice(at, 0, p);
	meSetQ(ME.sel.part, (q) => (q.a = Object.assign({}, q.a, { pts })));
	meRight();
}
function meLatheCtx(e) {
	const c = e.target.closest("[data-lp]");
	if (!c) return;
	e.preventDefault();
	const pts = meLathePts();
	if (pts.length <= 2) return meMsg("A lathe needs at least two dots");
	pts.splice(+c.dataset.lp, 1);
	meSetQ(ME.sel.part, (q) => (q.a = Object.assign({}, q.a, { pts })));
	meRight();
}
/* ---------- input ---------- */
function meKind(attr, k) {
	const def = MDL[ME.id];
	if (attr === "mp") {
		for (const sec of def.ui) for (const r of sec[2]) if (r[0] === k) return r;
	} else if (attr === "ma") {
		const q = meInfo(ME.sel.part).q;
		return MDL_SHAPES[q.shape].ui.find((r) => r[0] === k);
	}
	return ["p", "How often", "%", 0, 1];
}
function meNum(row, disp) {
	const K = ME_KIND[row[2]];
	let v = +disp / K.k;
	if (!isFinite(v)) return null;
	v = Math.min(Math.max(v, Math.min(row[3], row[4]) - 9), Math.max(row[3], row[4]) + 9);
	return row[2] === "n" ? Math.round(v) : meR(v, 10000);
}
function meInput(e) {
	const t = e.target,
		ds = t.dataset;
	if (ds.mp !== undefined || ds.ma !== undefined || ds.mof !== undefined) {
		const attr = ds.mp !== undefined ? "mp" : ds.ma !== undefined ? "ma" : "mo",
			k = attr === "mo" ? "p" : ds[attr],
			row = meKind(attr, k),
			v = meNum(row, t.value);
		if (v === null) return;
		/* mirror the other control of the pair */
		t.parentNode.querySelectorAll("input").forEach((o) => o !== t && (o.value = t.value));
		const sl = t.closest(".sl");
		if (sl && attr === "mp") sl.classList.toggle("ch", v !== MDL[ME.id].P[k]);
		if (attr === "mp") meEdit((ed) => (ed.p[k] = v), true);
		else if (attr === "ma") meSetQKeep(ME.sel.part, (q) => (q.a = Object.assign({}, q.a, { [k]: v })));
		else
			meEditKeep((ed) => {
				const o = meCopyOf(meLive(ME.id).out);
				o[ds.mo].p = v;
				ed.out = o;
			});
		if (t.type === "number") ME.stepOpen = false;
	} else if (ds.mc) {
		const [k, i] = ds.mc.split(":");
		meEdit((ed) => {
			const L = meLive(ME.id).C[k];
			if (i === undefined) ed.c[k] = t.value.toUpperCase();
			else {
				const a = L.slice();
				a[+i] = t.value.toUpperCase();
				ed.c[k] = a;
			}
		}, true);
	}
}
const meEditKeep = (fn) => meEdit(fn, true);
const meSetQKeep = (part, fn) =>
	meEditKeep((e) => {
		const L = meCopyOf(meLive(ME.id).add);
		fn(L.find((a) => a.id === part));
		e.add = L;
	});
function meChange(e) {
	const t = e.target,
		ds = t.dataset;
	ME.stepOpen = false;
	if (ds.mp !== undefined || ds.ma !== undefined || ds.mof !== undefined || ds.mc) {
		meLeft();
		if (ds.mc || t.type === "range") meRight();
		return;
	}
	if (ds.mf) {
		const [k, i] = ds.mf.split(":"),
			K = ME_KIND[k === "p" ? "cm" : k === "r" ? "deg" : "x"],
			v = +t.value / K.k;
		if (!isFinite(v) || !ME.sel) return;
		const x = meNormX(meInfo(ME.sel.part).x),
			mv = { p: (x.p || [0, 0, 0]).slice(), r: (x.r || [0, 0, 0]).slice(), s: (x.s || [1, 1, 1]).slice() };
		if (k === "r") mv.r[+i] = meR(v / D2R, 10);
		else if (k === "s") mv.s[+i] = Math.max(0.02, meR(v));
		else mv.p[+i] = meR(v);
		meSetMove(ME.sel.part, mv);
		meBuild();
		return;
	}
	if (ds.mq) {
		const part = ME.sel.part,
			k = ds.mq;
		if (k === "col" && t.value === "#fixed") meSetQ(part, (q) => (q.col = "#E5484D"));
		else if (k === "hex") meSetQ(part, (q) => (q.col = t.value.toUpperCase()));
		else if (k === "mir") meSetQ(part, (q) => (q.mir = t.checked));
		else if (k === "fr") {
			/* keep it where it is on screen: its place from the old frame into the new one */
			ME.model.g.updateMatrixWorld(true);
			const q0 = meInfo(part).q,
				from = meFrameObj(q0.fr || "body", 1),
				to = meFrameObj(t.value, 1),
				m = new THREE.Matrix4()
					.copy(to.matrixWorld)
					.invert()
					.multiply(from.matrixWorld)
					.multiply(mdlMat(q0, new THREE.Vector3())),
				pos = ME_V(),
				qt = new THREE.Quaternion(),
				sc = ME_V();
			m.decompose(pos, qt, sc);
			const eu = new THREE.Euler().setFromQuaternion(qt);
			meSetQ(part, (q) => {
				q.fr = t.value;
				q.p = pos.toArray().map((v) => meR(v));
				q.r = [eu.x, eu.y, eu.z].map((v) => meR(v / D2R, 10));
				if (t.value !== "body") q.mir = false;
			});
		} else if (k === "on") {
			meSetQ(part, (q) => (q.on = t.value));
			meBuild();
			meSelect({ part, side: 1 });
			return;
		} else meSetQ(part, (q) => (q[k] = k === "name" ? t.value.slice(0, 40) : t.value || null));
		meBuild();
		meLeft();
		meRight();
		return;
	}
	if (ds.mo) {
		const [k, f] = ds.mo.split(":");
		meEdit((ed) => {
			const o = meCopyOf(meLive(ME.id).out);
			o[k][f] = t.value.slice(0, 30);
			ed.out = o;
		});
		meRight();
	}
}
function meClick(e) {
	const det = e.target.closest("details[data-sec]");
	if (det && e.target.closest("summary")) setTimeout(() => (ME.open[det.dataset.sec] = det.open), 0);
	const b = e.target.closest("[data-me]");
	if (!b || !ME || !ME.tc) return;
	const a = b.dataset.me,
		[c, k, v] = a.split(":"),
		def = MDL[ME.id];
	if (!a) return;
	if (c === "m") {
		ME.mode = k;
		meGizmo();
		meTop();
	} else if (a === "snap") {
		ME.snap = !ME.snap;
		meGizmo();
		meTop();
	} else if (a === "lock") {
		ME.lock = !ME.lock;
		if (ME.lock) ME.mode = "scale";
		meGizmo();
		meTop();
	} else if (a === "undo" || a === "redo") meUndo(a === "redo");
	else if (c === "v") meView(k);
	else if (a === "vars") {
		ME.vars = !ME.vars;
		meBuild();
		meView(ME.viewNow === "stands" ? "q" : ME.viewNow || "q");
	} else if (a === "reroll") {
		ME.seed = (ME.seed * 7 + 13) % 997;
		meBuild();
	} else if (a === "spin") {
		ME.spin = !ME.spin;
		meTop();
	} else if (a === "help") {
		ME.help = true;
		mePanel();
	} else if (a === "helpok") {
		ME.help = false;
		LS.set("trp_mehelp", true);
		mePanel();
	} else if (a === "menu") {
		ME.menu = !ME.menu;
		mePanel();
	} else if (c === "add") meAddShape(k);
	else if (c === "model") {
		ME.id = k;
		LS.set("trp_memodel", k);
		ME.sel = null;
		meBuild();
		meView("q");
		mePanel();
	} else if (c === "sel") meSelect({ part: a.slice(4), side: 1 });
	else if (a === "desel") meSelect(null);
	else if (a === "dup") meDuplicate();
	else if (a === "del") meDelete();
	else if (a === "focus") meFocus();
	else if (a === "flip") meFlip();
	else if (a === "resetpart") meResetPart();
	else if (a === "unhide") {
		meEdit((ed) => {
			const x = meNormX(meLive(ME.id).x[ME.sel.part]);
			delete x.hide;
			ed.x[ME.sel.part] = x;
		});
		meBuild();
		meSelect(ME.sel);
	} else if (c === "rp") {
		meEdit((ed) => delete ed.p[k]);
		meRight();
		meLeft();
	} else if (c === "rc") {
		meEdit((ed) => delete ed.c[k]);
		meRight();
	} else if (c === "cadd" || c === "cdel") {
		meEdit((ed) => {
			const L = meLive(ME.id).C[k].slice();
			if (c === "cadd") L.push(L[L.length - 1]);
			else if (L.length > 1) L.splice(+v, 1);
			ed.c[k] = L;
		});
		meRight();
	} else if (c === "dr") {
		const d = ME.dress[ME.id],
			val = isNaN(+v) || k === "hat" || k === "top" ? v : +v;
		if (k.startsWith("ex.")) (d.ex = d.ex || {})[k.slice(3)] = v === "1";
		else d[k] = (def.dressUI(mdl(ME.id)).find((r) => r[0] === k) || [])[2] === "bool" ? v === "1" : val;
		ME.sel = null;
		meBuild();
		mePanel();
	} else if (c === "oh") {
		meEdit((ed) => {
			const o = meCopyOf(meLive(ME.id).out);
			o[k].hat = v === "1";
			ed.out = o;
		});
		meRight();
	} else if (c === "odel") {
		meEdit((ed) => {
			const o = meCopyOf(meLive(ME.id).out);
			delete o[k];
			ed.out = o;
			const L = meLive(ME.id).add;
			if (L.some((q) => q.on === k))
				ed.add = meCopyOf(L).map((q) => (q.on === k ? Object.assign(q, { on: "all" }) : q));
		});
		mePanel();
	} else if (a === "oadd") {
		const o = meCopyOf(mdl(ME.id).out);
		let n = 1;
		while (o["o" + n]) n++;
		o["o" + n] = { name: "New piece " + n, p: 0.2, hat: false };
		meEdit((ed) => (ed.out = o));
		ME.open["#out"] = true;
		mePanel();
	} else if (a === "copy") meCopy();
	else if (a === "resetall") {
		if (!b.dataset.sure) {
			b.dataset.sure = 1;
			b.textContent = "Click again to throw away all changes";
			b.classList.add("on");
			return;
		}
		meEdit((ed) => {
			ed.p = {};
			ed.c = {};
			ed.x = {};
			delete ed.add;
			delete ed.out;
		});
		ME.sel = null;
		meBuild();
		mePanel();
		meMsg("Model reset to the code. Ctrl+Z brings your changes back.");
	}
}
function meCopy() {
	if (!meCount()) return meMsg("No changes to copy on this model yet.");
	const txt = meJ(meCopyJSON()),
		show = () =>
			meMsg(`Copy this and paste it to Claude:<textarea readonly onclick="this.select()">${esc(txt)}</textarea>`);
	try {
		navigator.clipboard
			.writeText(txt)
			.then(
				() =>
					meMsg(
						`Copied ${meCount()} change${meCount() > 1 ? "s" : ""}. Paste it to Claude to make it part of the game.<textarea readonly onclick="this.select()">${esc(txt)}</textarea>`,
					),
				show,
			);
	} catch (x) {
		show();
	}
}
function meKey(e) {
	if (!ME || !ME.tc) return;
	if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) {
		if (e.key === "Escape" || e.key === "Enter") e.target.blur();
		return;
	}
	e.stopPropagation();
	const k = e.key.toLowerCase(),
		ctl = e.ctrlKey || e.metaKey;
	if (ctl && (k === "z" || k === "y")) {
		e.preventDefault();
		return meUndo(k === "y" || e.shiftKey);
	}
	if (ctl && k === "d") {
		e.preventDefault();
		return meDuplicate();
	}
	if (ctl || e.altKey) return;
	if (k === "w" || k === "e" || k === "r") {
		ME.mode = { w: "translate", e: "rotate", r: "scale" }[k];
		meGizmo();
		meTop();
	} else if (k === "q") {
		ME.space = ME.space === "world" ? "local" : "world";
		meGizmo();
		meMsg(ME.space === "world" ? "Arrows line up with the world" : "Arrows line up with the part");
	} else if (k === "x") {
		ME.snap = !ME.snap;
		meGizmo();
		meTop();
	} else if (k === "f") meFocus();
	else if (k === "escape") {
		if (ME.menu || ME.help) {
			ME.menu = ME.help = false;
			mePanel();
		} else meSelect(null);
	} else if (k === "delete" || k === "backspace") {
		e.preventDefault();
		meDelete();
	}
}
