/* ---------- map editor (PC): move / rotate / scale spaces and props, tune the map's shape. Edits are stored per map in localStorage (trp_mapedit) and applied by
   buildBoardFor (applyMapEdits / edReg in partmap); "Copy edits" gives JSON the user pastes to Claude, who bakes it into the map as `bake` ---------- */
let ED = null,
	ED_LOAD = null;
function edLoad() {
	if (ED_LOAD) return ED_LOAD;
	const base = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/";
	ED_LOAD = ["OrbitControls.js", "TransformControls.js"]
		.reduce(
			(p, f) =>
				p.then(
					() =>
						new Promise((res, rej) => {
							const s = document.createElement("script");
							s.src = base + f;
							s.onload = res;
							s.onerror = () => rej(new Error("load " + f));
							document.head.appendChild(s);
						}),
				),
			Promise.resolve(),
		)
		.catch((e) => {
			ED_LOAD = null;
			throw e;
		});
	return ED_LOAD;
}
const edLS = () => LS.get("trp_mapedit", {}) || {};
function edMine(id) {
	const e = edLS()[id] || {};
	return { p: e.p || {}, n: e.n || {}, o: e.o || {} };
}
function edPut(id, e) {
	const a = edLS();
	a[id] = e;
	LS.set("trp_mapedit", a);
	ED.dirty = true;
}
const r3 = (v) => Math.round(v * 1000) / 1000,
	wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ED_CSS = `#ed{position:fixed;inset:0;z-index:50;pointer-events:none;font:13px/1.35 Rubik,system-ui,sans-serif;color:#EEF2F7}
#ed .edtop,#ed .edside,#ed .edmsg{pointer-events:auto;background:rgba(21,27,36,.92);border:1px solid #2C3646;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.35)}
#ed .edtop{position:absolute;left:10px;top:10px;right:300px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px}
#ed .edside{position:absolute;right:10px;top:10px;bottom:10px;width:270px;overflow:auto;padding:10px 12px}
#ed .edmsg{position:absolute;left:10px;bottom:10px;padding:8px 12px;max-width:calc(100% - 320px)}
#ed .edmsg:empty{display:none}
#ed button{font:inherit;color:#EEF2F7;background:#2C3646;border:1px solid #3B475A;border-radius:8px;padding:5px 9px;cursor:pointer}
#ed button:hover{background:#38455A}#ed button.on{background:#FFC83D;color:#151B24;border-color:#FFC83D}
#ed select,#ed input[type=number]{font:inherit;background:#0F141B;color:#EEF2F7;border:1px solid #3B475A;border-radius:6px;padding:4px 6px}
#ed input[type=number]{width:100%;box-sizing:border-box}
#ed h3{margin:12px 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#FFC83D}
#ed .edrow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px}#ed .edrow label{font-size:11px;color:#AEB8C6}
#ed .edsl{display:block;margin:4px 0 8px;font-size:12px}#ed .edsl span{float:right;color:#FFC83D}#ed .edsl input{width:100%}
#ed .ednote{font-size:11px;color:#9AA6B6;margin:8px 0}#ed b{font-weight:700}`;
const edTypeName = (t) =>
	({
		B: "blue",
		R: "red",
		E: "surprise",
		S: "start",
		SC: "scrap",
		CR: "crusher",
		CV: "conveyor",
		D: "duel",
		SH: "shop",
		OB: "obsidian",
		GY: "geyser",
		SD: "shard",
		MC: "minecart",
	})[t] || t;

function openEditor() {
	if (!GFX.ok || ED) return;
	if (!$("#edcss")) {
		const st = document.createElement("style");
		st.id = "edcss";
		st.textContent = ED_CSS;
		document.head.appendChild(st);
	}
	const box = document.createElement("div");
	box.id = "ed";
	box.innerHTML = `<div class="edtop">Loading the editor…</div>`;
	document.body.appendChild(box);
	$("#app").style.display = "none";
	ED = {
		id: LS.get("trp_edmap", "volcano"),
		prevMode: GFX.mode,
		mode: "translate",
		space: "world",
		snap: false,
		undo: [],
		sel: null,
		lv: 0,
		box,
	};
	if (!MAPS[ED.id]) ED.id = "volcano";
	edLoad().then(
		() => {
			if (ED) edInit();
		},
		() => {
			if (ED)
				box.innerHTML = `<div class="edtop">Couldn't load the editor scripts (no internet?). <button data-ed="close">Close</button></div>`;
		},
	);
	box.addEventListener("click", edClick);
	box.addEventListener("input", edInput);
	box.addEventListener("change", edChange);
}
function edInit() {
	const cv = $("#gl"),
		cam = (ED.cam = new THREE.PerspectiveCamera(42, GFX.w / GFX.h, 0.5, 900));
	cam.add(new THREE.PointLight("#ffffff", 0.6, 20));
	const orb = (ED.orbit = new THREE.OrbitControls(cam, cv));
	orb.enableDamping = true;
	orb.dampingFactor = 0.15;
	orb.screenSpacePanning = true;
	const tc = (ED.tc = new THREE.TransformControls(cam, cv));
	tc.setSize(0.9);
	tc.addEventListener("dragging-changed", (e) => {
		orb.enabled = !e.value;
		if (e.value) ED.s0 = ED.proxy.scale.x;
		else edCommit();
	});
	tc.addEventListener("objectChange", edLive);
	ED.proxy = new THREE.Object3D();
	ED.pd = (e) => {
		ED.down = { x: e.clientX, y: e.clientY, giz: !!(tc.axis && tc.object) };
	};
	ED.pu = (e) => {
		const d = ED.down;
		ED.down = null;
		if (d && !d.giz && e.button === 0 && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) edPick(e);
	};
	cv.addEventListener("pointerdown", ED.pd);
	cv.addEventListener("pointerup", ED.pu);
	addEventListener("keydown", edKey, true);
	setMode("edit");
	edBuild(true);
	edPanel();
}
function closeEditor() {
	if (!ED) return;
	const cv = $("#gl");
	try {
		ED.tc.detach();
		ED.tc.dispose();
		ED.orbit.dispose();
	} catch (e) {}
	cv.removeEventListener("pointerdown", ED.pd);
	cv.removeEventListener("pointerup", ED.pu);
	removeEventListener("keydown", edKey, true);
	if (ED.bd) edDispose(ED.bd.scene);
	/* boards built before the edits are dropped so the game rebuilds them with the new layout */
	if (ED.dirty) {
		Object.values(GFX.boards || {}).forEach((b) => {
			if (b !== GFX.board) edDispose(b.scene);
		});
		GFX.boards = {};
		if (GFX.board) {
			Object.values(GFX.tok || {}).forEach((t) => GFX.board.scene.remove(t.g));
			GFX.tok = {};
			GFX.board = null;
		}
	}
	ED.box.remove();
	$("#app").style.display = "";
	const pm = ED.prevMode;
	ED = null;
	GFX.mode = null;
	setMode(pm || "show");
	render.last = null;
	render();
}
function edDispose(s) {
	s.traverse((o) => {
		if (o.geometry && !o.isSprite && !Object.values(PGEO).includes(o.geometry)) o.geometry.dispose();
	});
}
function edBuild(first) {
	const old = ED.bd;
	if (old) {
		old.scene.remove(ED.cam, ED.tc, ED.proxy);
		edDispose(old.scene);
	}
	ED.map = MAPS[ED.id];
	const bd = (ED.bd = buildBoardFor(ED.map));
	bd.scene.add(ED.cam, ED.tc, ED.proxy);
	if (bd.rival) bd.rival.visible = false;
	if (bd.vx) bd.vx.lava.position.y = LAVA_Y[ED.lv];
	if (first) {
		const sz = ED.map.size || 1;
		ED.cam.position.set(0, 40 * sz, 36 * sz);
		ED.orbit.target.set(0, ED.map.camY || 0, 0);
		ED.orbit.update();
	}
	const k = ED.sel;
	ED.sel = null;
	ED.tc.detach();
	edSelect(k);
}
function edFrame(dt, time) {
	const bd = ED && ED.bd;
	if (!bd) return;
	const cam = ED.cam,
		a = GFX.w / GFX.h;
	if (cam.aspect !== a) {
		cam.aspect = a;
		cam.updateProjectionMatrix();
	}
	ED.orbit.update();
	const vx = bd.vx;
	if (vx) {
		const ly = (vx.lava.position.y += (LAVA_Y[ED.lv] - vx.lava.position.y) * Math.min(1, dt * 3));
		vx.tex.offset.set((time * 0.012) % 1, (time * 0.009) % 1);
		vx.haze.forEach((m) => {
			m.position.y = ly + m.userData.dy;
		});
		vx.glow.position.y = ly + 2.5;
		vx.glow.intensity = 1.3 * ep("glow");
		vx.smoke.forEach((m) => {
			m.visible = false;
		});
		stepGyArcs(bd, time);
		Object.keys(bd.scorch).forEach((i) => {
			const n = ED.map.nodes[i],
				m = bd.scorch[i];
			m.visible = !!(n.lv && n.lv <= ED.lv && ly > n.y + 0.05);
			if (m.visible) m.position.y = Math.max(0.6, ly - n.y + 0.07) / m.parent.scale.y;
		});
	}
	GFX.r.render(bd.scene, cam);
}
/* selection: "n:<space index>" (the transform gizmo drives a proxy at the space; the tile group follows) or "o:<prop id>" (gizmo on the prop itself) */
function edTarget(key) {
	if (!key || !ED.bd) return null;
	const id = key.slice(2);
	return key[0] === "n" ? ED.bd.nodeG[+id] || null : ED.bd.reg[id] || null;
}
function edSelect(key) {
	const tc = ED.tc;
	tc.detach();
	ED.sel = null;
	const o = edTarget(key);
	if (o) {
		ED.sel = key;
		if (key[0] === "n") {
			const n = ED.map.nodes[+key.slice(2)],
				tl = o.userData.tl,
				p = ED.proxy;
			p.position.set(n.x, n.y || 0, n.z);
			p.rotation.set(0, tl.rotation.y, 0);
			p.scale.setScalar(tl.scale.x / ep("tileR"));
			tc.attach(p);
		} else tc.attach(o);
	}
	edGizmo();
	edSelInfo();
}
function edGizmo() {
	const tc = ED.tc,
		node = ED.sel && ED.sel[0] === "n",
		rot = ED.mode === "rotate";
	tc.setMode(ED.mode);
	tc.setSpace(node && rot ? "world" : ED.space);
	tc.showX = tc.showZ = !(node && rot);
	tc.showY = true;
	tc.setTranslationSnap(ED.snap ? 0.25 : null);
	tc.setRotationSnap(ED.snap ? Math.PI / 12 : null);
	tc.setScaleSnap(ED.snap ? 0.05 : null);
}
function edPick(e) {
	const cv = $("#gl"),
		r = cv.getBoundingClientRect(),
		v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1),
		rc = new THREE.Raycaster();
	rc.setFromCamera(v, ED.cam);
	rc.camera = ED.cam;
	const hits = rc.intersectObjects(
		ED.bd.scene.children.filter((o) => o !== ED.tc && o !== ED.proxy && o !== ED.cam),
		true,
	);
	for (const h of hits) {
		let vis = true,
			key = null,
			stop = false;
		for (let q = h.object; q; q = q.parent) {
			if (q.visible === false) vis = false;
			if (q.userData.edStop) stop = true;
			if (!key && q.userData.edId) key = "o:" + q.userData.edId;
			if (!key && q.userData.node !== undefined) key = "n:" + q.userData.node;
		}
		if (!vis) continue;
		if (key) {
			edSelect(key);
			return;
		}
		if (stop) break;
	}
	edSelect(null);
}
/* live preview while dragging the gizmo */
function edLive() {
	const k = ED.sel;
	if (!k) return;
	if (k[0] === "n") {
		const i = +k.slice(2),
			n = ED.map.nodes[i],
			ng = ED.bd.nodeG[i],
			tl = ng.userData.tl,
			p = ED.proxy;
		if (ED.mode === "scale") {
			const s0 = ED.s0 || 1,
				s = [p.scale.x, p.scale.y, p.scale.z].reduce((a, b) => (Math.abs(b - s0) > Math.abs(a - s0) ? b : a));
			p.scale.setScalar(Math.max(0.2, s));
		}
		ng.position.set(p.position.x - n.x, p.position.y, p.position.z - n.z);
		tl.rotation.y = p.rotation.y;
		tl.scale.setScalar(p.scale.x * ep("tileR"));
	}
	edSelVals();
}
function edCommit() {
	const k = ED.sel;
	if (!k) return;
	const e = edMine(ED.id);
	ED.undo.push(JSON.stringify(e));
	if (ED.undo.length > 80) ED.undo.shift();
	if (k[0] === "n") {
		const i = +k.slice(2),
			p = ED.proxy,
			tl = ED.bd.nodeG[i].userData.tl;
		e.n[i] = {
			x: r3(p.position.x),
			y: r3(p.position.y),
			z: r3(p.position.z),
			r: r3(wrapA(p.rotation.y - tl.userData.auto)),
			s: r3(p.scale.x),
		};
		edPut(ED.id, e);
		edBuild();
	} else {
		const id = k.slice(2),
			o = ED.bd.reg[id];
		e.o[id] = {
			p: o.position.toArray().map(r3),
			r: [o.rotation.x, o.rotation.y, o.rotation.z].map(r3),
			s: o.scale.toArray().map(r3),
		};
		edPut(ED.id, e);
		edSelInfo();
	}
}
function edUndo() {
	const u = ED.undo.pop();
	if (!u) {
		edMsg("Nothing to undo");
		return;
	}
	edPut(ED.id, JSON.parse(u));
	edBuild();
	edPanel();
}
function edResetSel() {
	const k = ED.sel;
	if (!k) return;
	const e = edMine(ED.id),
		id = k.slice(2),
		tbl = k[0] === "n" ? e.n : e.o;
	if (!tbl[id]) {
		edMsg("You haven't edited this one");
		return;
	}
	ED.undo.push(JSON.stringify(e));
	delete tbl[id];
	edPut(ED.id, e);
	edBuild();
}
function edFocus() {
	const o = ED.sel && (ED.sel[0] === "n" ? ED.proxy : edTarget(ED.sel));
	if (!o) return;
	const p = o.getWorldPosition(new THREE.Vector3()),
		d = ED.cam.position.clone().sub(ED.orbit.target);
	ED.orbit.target.copy(p);
	ED.cam.position.copy(p).add(d.setLength(Math.min(d.length(), 22)));
}
function edMsg(t) {
	const m = $("#edmsg");
	if (m) m.innerHTML = t;
	clearTimeout(ED.msgT);
	if (t)
		ED.msgT = setTimeout(() => {
			const q = $("#edmsg");
			if (q && q.innerHTML === t) q.innerHTML = "";
		}, 6000);
}
function edKey(e) {
	if (!ED) return;
	if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) {
		if (e.key === "Escape" || e.key === "Enter") e.target.blur();
		return;
	}
	const k = e.key.toLowerCase();
	e.stopPropagation();
	if (!ED.tc) return;
	if ((e.ctrlKey || e.metaKey) && k === "z") {
		e.preventDefault();
		edUndo();
		return;
	}
	if (e.ctrlKey || e.metaKey || e.altKey) return;
	if (k === "w" || k === "e" || k === "r") {
		ED.mode = { w: "translate", e: "rotate", r: "scale" }[k];
		edGizmo();
		edPanel();
	} else if (k === "q") {
		ED.space = ED.space === "world" ? "local" : "world";
		edGizmo();
		edPanel();
	} else if (k === "x") {
		ED.snap = !ED.snap;
		edGizmo();
		edPanel();
	} else if (k === "f") edFocus();
	else if (k === "escape") edSelect(null);
	else if (k === "delete" || k === "backspace") edResetSel();
}
function edCopy() {
	const m = mapEdits(ED.map),
		out = { map: ED.id, p: m.p, n: m.n, o: m.o },
		txt = JSON.stringify(out);
	const show = () =>
		edMsg(
			`Copy this and paste it to Claude:<br><textarea readonly style="width:100%;height:90px;margin-top:6px;background:#0F141B;color:#EEF2F7;border:1px solid #3B475A;border-radius:6px" onclick="this.select()">${esc(txt)}</textarea>`,
		);
	try {
		navigator.clipboard
			.writeText(txt)
			.then(
				() =>
					edMsg(
						`Copied ${Object.keys(m.n).length} spaces, ${Object.keys(m.o).length} props and ${Object.keys(m.p).length} shape values. Paste them to Claude to make them permanent.`,
					),
				show,
			);
	} catch (x) {
		show();
	}
}
/* ---------- panel ---------- */
function edPanel() {
	if (!ED || !ED.tc) return;
	const m = ED.map,
		b = (on, a, t) => `<button data-ed="${a}" class="${on ? "on" : ""}">${t}</button>`;
	ED.box.innerHTML = `<div class="edtop"><b>🛠 Map editor</b><select data-edk="map">${Object.values(MAPS)
		.map((q) => `<option value="${q.id}" ${q.id === ED.id ? "selected" : ""}>${esc(q.name)}</option>`)
		.join("")}</select>
    ${b(ED.mode === "translate", "m:translate", "Move (W)")}${b(ED.mode === "rotate", "m:rotate", "Rotate (E)")}${b(ED.mode === "scale", "m:scale", "Scale (R)")}
    ${b(ED.space === "local", "space", ED.space === "local" ? "Local (Q)" : "World (Q)")}${b(ED.snap, "snap", "Snap (X)")}
    <button data-ed="undo">↶ Undo</button><button data-ed="copy">📋 Copy edits</button><button data-ed="close">✕ Close</button></div>
  <div class="edside"><div id="edsel"></div>
    <h3>Shape</h3>${ED_PARAMS.filter((q) => !q[6] || m.lava)
			.map(
				([k, nm, lo, hi, st]) =>
					`<label class="edsl">${nm} <span id="edv-${k}">${+ep(k).toFixed(3)}</span><input type="range" data-edp="${k}" min="${lo}" max="${hi}" step="${st}" value="${ep(k)}"></label>`,
			)
			.join("")}
    ${m.lava ? `<h3>Lava preview</h3><div class="edrow">${["Low", "Rising", "High"].map((t, i) => b(ED.lv === i, "lv:" + i, t)).join("")}</div>` : ""}
    <p class="ednote">Click a space or a prop to select it. Left drag orbits, right drag pans, wheel zooms. W/E/R move, rotate, scale · Q world/local · X snap · F focus · Del resets the selection · Ctrl+Z undo. Shape changes rebuild the board.</p>
    <button data-ed="resetall" style="width:100%">Reset all my edits on this map</button></div>
  <div class="edmsg" id="edmsg"></div>`;
	edSelInfo();
}
function edSelInfo() {
	const el = $("#edsel");
	if (!el) return;
	const k = ED.sel;
	if (!k) {
		el.innerHTML = `<h3>Selection</h3><p class="ednote">Nothing selected.</p>`;
		return;
	}
	const node = k[0] === "n",
		id = k.slice(2),
		mine = node ? edMine(ED.id).n[id] : edMine(ED.id).o[id];
	const nm = node ? `Space ${id} · ${edTypeName(ED.map.nodes[+id].t)}` : `Prop · ${esc(id)}`,
		f = (q, l) =>
			`<label>${l}<input type="number" step="${q === "r" ? 5 : q === "s" ? 0.05 : 0.1}" data-edf="${q}" id="edf-${q}"></label>`;
	el.innerHTML = `<h3>Selection</h3><div style="margin-bottom:6px"><b>${nm}</b>${mine ? ` <span style="color:#FFC83D">· edited</span>` : ""}</div>
    <div class="edrow">${f("x", "X")}${f("y", "Y")}${f("z", "Z")}</div><div class="edrow">${f("r", "Turn °")}${f("s", "Scale")}<label>&nbsp;<button data-ed="resetsel" style="width:100%">Reset</button></label></div>`;
	edSelVals();
}
function edSelVals() {
	const k = ED.sel;
	if (!k) return;
	const o = k[0] === "n" ? ED.proxy : edTarget(k);
	if (!o) return;
	const v = { x: o.position.x, y: o.position.y, z: o.position.z, r: (o.rotation.y * 180) / Math.PI, s: o.scale.x };
	Object.keys(v).forEach((q) => {
		const i = $("#edf-" + q);
		if (i && document.activeElement !== i) i.value = +v[q].toFixed(q === "r" ? 1 : 3);
	});
}
function edClick(e) {
	const b = e.target.closest("button[data-ed]");
	if (!b || !ED) return;
	const a = b.dataset.ed;
	if (a === "close") closeEditor();
	else if (!ED.tc) return;
	else if (a.startsWith("m:")) {
		ED.mode = a.slice(2);
		edGizmo();
		edPanel();
	} else if (a === "space") {
		ED.space = ED.space === "world" ? "local" : "world";
		edGizmo();
		edPanel();
	} else if (a === "snap") {
		ED.snap = !ED.snap;
		edGizmo();
		edPanel();
	} else if (a === "undo") edUndo();
	else if (a === "copy") edCopy();
	else if (a.startsWith("lv:")) {
		ED.lv = +a.slice(3);
		edPanel();
	} else if (a === "resetsel") edResetSel();
	else if (a === "resetall") {
		if (!b.dataset.sure) {
			b.dataset.sure = 1;
			b.textContent = "Click again to reset everything";
			b.classList.add("on");
			return;
		}
		ED.undo.push(JSON.stringify(edMine(ED.id)));
		edPut(ED.id, { p: {}, n: {}, o: {} });
		edBuild();
		edPanel();
	}
}
function edInput(e) {
	const k = e.target.dataset.edp;
	if (!k || !ED) return;
	const v = +e.target.value,
		sp = $("#edv-" + k);
	if (sp) sp.textContent = +v.toFixed(3);
	clearTimeout(ED.slT);
	ED.slT = setTimeout(() => {
		if (!ED) return;
		const ed = edMine(ED.id);
		ED.undo.push(JSON.stringify(ed));
		ed.p[k] = v;
		edPut(ED.id, ed);
		edBuild();
	}, 250);
}
function edChange(e) {
	const t = e.target;
	if (!ED || !ED.tc) return;
	if (t.dataset.edk === "map") {
		ED.id = t.value;
		LS.set("trp_edmap", ED.id);
		ED.undo = [];
		ED.sel = null;
		edBuild(true);
		edPanel();
		return;
	}
	const q = t.dataset.edf;
	if (!q || !ED.sel) return;
	const o = ED.sel[0] === "n" ? ED.proxy : edTarget(ED.sel),
		v = +t.value;
	if (!o || !isFinite(v)) return;
	if (q === "r") o.rotation.y = (v * Math.PI) / 180;
	else if (q === "s") o.scale.setScalar(Math.max(0.05, v));
	else o.position[q] = v;
	edLive();
	edCommit();
}
