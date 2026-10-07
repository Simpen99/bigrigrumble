/* ---------- live 3D minigame engine ---------- */
let mgRes = false;
let W = null,
	RT = null,
	RTnamed = false,
	mgOpen = false,
	mgBusy = false;
const mgSent = new Set(),
	mgFirst = new Set();
function mulberry(a) {
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
function mgPending() {
	if (!G || G.phase !== "minigame" || !G.mg) return [];
	return G.players.filter(
		(p) =>
			!p.bot &&
			ctrl(p) &&
			(!G.mg.part || G.mg.part.includes(p.key)) &&
			!(p.key in G.mg.res) &&
			!mgSent.has(G.mg.nonce + p.key),
	);
}
async function rtJoin(nonce) {
	RT = null;
	RTnamed = false;
	if (!room) return;
	const name = ("mg-" + String(nonce).toLowerCase()).replace(/[^a-z0-9_.-]/g, "").slice(0, 44);
	try {
		RT = await room.join(name);
		RTnamed = true;
	} catch (e) {
		RT = room;
	}
}
function rtLeave() {
	if (!RT) return;
	if (RTnamed) {
		try {
			RT.leave();
		} catch (e) {}
	} else setPresence({ rt: null, rtb: null });
	RT = null;
	RTnamed = false;
}
function mgEnv(s, water, lane, bare, night, storm, dusk) {
	s.background = new THREE.Color("#9FD4F5");
	s.fog = new THREE.Fog("#9FD4F5", 50, 150);
	const sun = lights(s, true);
	sun.shadow.mapSize.set(2048, 2048);
	s.add(sun.target);
	if (bare) {
	} // the minigame builds its own ground
	else if (water) {
		const w = new THREE.Mesh(
			new THREE.PlaneGeometry(400, 400, 40, 40),
			new THREE.MeshStandardMaterial({ color: "#3FA7E0", roughness: 0.3, metalness: 0.1, flatShading: true }),
		);
		const p = w.geometry.attributes.position;
		for (let i = 0; i < p.count; i++) p.setZ(i, Math.random() * 0.35);
		w.geometry.computeVertexNormals();
		w.rotation.x = -Math.PI / 2;
		w.position.y = -4;
		w.receiveShadow = true;
		s.add(w);
	} else {
		const g = new THREE.Mesh(
			new THREE.PlaneGeometry(420, 1000),
			groundMat(grassTex(), 420, 1000, 10, { roughness: 1 }),
		);
		g.rotation.x = -Math.PI / 2;
		g.position.set(0, lane ? 0 : -0.4, -380);
		g.receiveShadow = true;
		s.add(g);
	}
	if (!lane && !bare) mountains(s);
	if (!night)
		for (let i = 0; i < (storm ? 14 : 6); i++) {
			const c = cloud();
			c.position.set(-50 + i * (storm ? 8 : 20), 17 + Math.random() * 5, -45 - Math.random() * 25);
			if (storm) {
				c.scale.setScalar(2.2);
				c.traverse((o) => {
					if (o.material) o.material = M("#6F7784", { roughness: 1 });
				});
			}
			s.add(c);
		}
	applySky(s, night ? "night" : storm ? "storm" : dusk ? "dusk" : "def");
	if (dusk) {
		sun.intensity = 1.05;
		sun.color.set("#FFB27A");
		const h = s.children.find((o) => o.isHemisphereLight);
		if (h) {
			h.intensity = 0.62;
			h.color.set("#FFD9C4");
		}
	}
	if (storm) {
		sun.intensity = 0.6;
		sun.color.set("#DDE4EE");
		const h = s.children.find((o) => o.isHemisphereLight);
		if (h) h.intensity = 0.62;
	}
	if (night) {
		sun.intensity = 0.75;
		sun.color.set("#FFD6A8");
		const h = s.children.find((o) => o.isHemisphereLight);
		if (h) {
			h.intensity = 0.55;
			h.color.set("#C4C0E8");
		}
	}
	return sun;
}
/* new look (trial): def.look = {exp, amb, sun, warm, env, haze, glow, bloom, vig, sat, fill: [sky, ground], sky: [top, mid, horizon]}.
   Sets the scene's colour mood; the renderer switches to sRGB + ACES for scenes with userData.lk (gfxLook). Light colours go in as linear. */
const LOOK0 = { exp: 1, amb: 0.3, sun: 1.8, warm: 0.6, env: 0.1, paint: 0.45, haze: 55, glow: 1.01, bloom: 0.4 };
const lkWarm = (c, w) => c.set("#E4EEFF").lerp(new THREE.Color("#FFC27A"), w).convertSRGBToLinear();
function applyLook(W) {
	const s = W.sc,
		L = (s.userData.lk = Object.assign({}, LOOK0, W.def.look)),
		h = s.children.find((o) => o.isHemisphereLight);
	if (L.sky) {
		SKY.lk = L.sky;
		applySky(s, "lk");
	}
	if (h) {
		h.intensity = L.amb;
		if (L.fill) {
			h.color.set(L.fill[0]).convertSRGBToLinear();
			h.groundColor.set(L.fill[1]).convertSRGBToLinear();
		} else {
			h.color.convertSRGBToLinear();
			h.groundColor.convertSRGBToLinear();
		}
	}
	W.sun.intensity = L.sun;
	lkWarm(W.sun.color, L.warm);
	W.lpWarm = L.warm;
	if (GFX.touch) W.sun.shadow.mapSize.set(1024, 1024);
	if (s.fog) {
		s.fog.near = L.haze;
		s.fog.far = L.haze * 3.8;
	}
	const F = GFX.fx;
	F.bloom.on = L.bloom > 0;
	F.bloom.v = L.bloom;
	F.bloom.th = L.glow;
	F.aa.on = true;
	/* optional grade: vig = vignette, sat = colour boost (the Effects tab's Vignette / Colour) */
	F.vig.on = L.vig > 0;
	if (L.vig) F.vig.v = L.vig;
	F.col.on = L.sat > 0;
	if (L.sat) {
		F.col.sat = L.sat * 0.6;
		F.col.con = L.sat * 0.2;
	}
	loadPost().catch(() => {});
	lookEnv(s);
	lookEnvTex().then(
		(t) => {
			s.environment = t;
		},
		() => {},
	);
}
function mkEnt(p, isMe, named, mode) {
	const g = new THREE.Group(),
		tr = buildTruck(p.truck, mode);
	tr.scale.setScalar(0.8);
	g.add(tr);
	const disc = Cy(0.95, 0.95, 0.05, 20, pcol(p), 0, 0.03, 0, { transparent: true, opacity: 0.4, depthWrite: false });
	disc.castShadow = false;
	g.add(disc);
	const tag = nameTag(isMe && !named ? "You" : p.name, pcol(p));
	tag.position.y = 2.5;
	g.add(tag);
	return {
		k: p.key,
		p,
		g,
		tr,
		x: 0,
		z: 0,
		y: 0,
		vx: 0,
		vz: 0,
		vy: 0,
		yaw: 0,
		al: true,
		d: false,
		sc: 0,
		c: [],
		f: {},
		bcd: 0,
		boostT: 0,
		isMe,
		bot: p.bot,
		local: false,
	};
}
const steer = (e, tx, tz, m = 1) => {
	const dx = tx - e.x,
		dz = tz - e.z,
		l = Math.hypot(dx, dz) || 1;
	return { x: (dx / l) * m, y: (dz / l) * m, boost: false };
};
function eliminate(W, e) {
	if (e.d) return;
	e.al = false;
	e.d = true;
}
function arenaPhys(W, e, inp, dt) {
	const def = W.def;
	if ((e.falling || e.fly) && def.fallPhys && def.fallPhys(W, e, dt)) return;
	if (e.falling || e.fly) {
		e.vy -= 30 * dt;
		e.y += e.vy * dt;
		e.x += e.vx * dt;
		e.z += e.vz * dt;
		e.spin = (e.spin || 0) + dt * (e.fly ? 9 : 4);
		if (e.falling && e.al && def.deathY !== undefined && e.y < def.deathY) eliminate(W, e);
		return;
	}
	if (e.al && !e.d && inp) {
		e.vx += inp.x * 32 * dt;
		e.vz += inp.y * 32 * dt;
		if (inp.boost && e.bcd <= 0 && !def.aim) {
			let dx = inp.x,
				dz = inp.y,
				l = Math.hypot(dx, dz);
			if (l < 0.2) {
				dx = Math.cos(e.yaw);
				dz = -Math.sin(e.yaw);
				l = 1;
			}
			if (e.isMe) {
				const at = ramAssist(W, e, dx / l, dz / l);
				if (at) {
					dx = at[0];
					dz = at[1];
					l = 1;
				}
			}
			e.vx += (dx / l) * 16;
			e.vz += (dz / l) * 16;
			e.bcd = 2;
			e.boostT = 0.45;
		}
	}
	if (inp) inp.boost = false;
	e.bcd = Math.max(0, e.bcd - dt);
	e.boostT = Math.max(0, e.boostT - dt);
	e.slideT = Math.max(0, (e.slideT || 0) - dt);
	const damp = Math.exp(-(e.boostT > 0 ? 1.1 : e.slideT > 0 ? 0.9 : 2.6) * dt);
	e.vx *= damp;
	e.vz *= damp;
	const sp = Math.hypot(e.vx, e.vz),
		max = e.boostT > 0 || e.slideT > 0 ? 23 : 11.5;
	if (sp > max) {
		e.vx *= max / sp;
		e.vz *= max / sp;
	}
	e.x += e.vx * dt;
	e.z += e.vz * dt;
	if (sp > 0.6) e.yaw = lerpA(e.yaw, Math.atan2(-e.vz, e.vx), Math.min(1, dt * 10));
	const b = def.bound;
	if (b.t === "sq") {
		if (Math.abs(e.x) > b.h) {
			e.x = Math.sign(e.x) * b.h;
			e.vx *= -0.6;
		}
		if (Math.abs(e.z) > b.h) {
			e.z = Math.sign(e.z) * b.h;
			e.vz *= -0.6;
		}
	} else if (b.t === "circ") {
		const d = Math.hypot(e.x, e.z);
		if (d > b.r) {
			const nx = e.x / d,
				nz = e.z / d;
			e.x = nx * b.r;
			e.z = nz * b.r;
			const vn = e.vx * nx + e.vz * nz;
			if (vn > 0) {
				e.vx -= 1.6 * vn * nx;
				e.vz -= 1.6 * vn * nz;
			}
		}
	} else if (b.t === "fall" && e.al && !def.inside(W, e.x, e.z, e)) {
		e.falling = true;
		e.vy = def.deathY !== undefined ? 0 : 1;
		if (def.deathY === undefined) eliminate(W, e);
	}
}
const RAMK = 17;
function collide(W, a) {
	if (!a.al || a.falling || a.fly) return;
	const now = performance.now();
	a.hitT = a.hitT || {};
	for (const b of W.list) {
		if (
			b === a ||
			b.gone ||
			!b.al ||
			b.falling ||
			b.fly ||
			(!b.local && !b.seen) ||
			Math.abs((a.y || 0) - (b.y || 0)) > 1.6
		)
			continue;
		const dx = a.x - b.x,
			dz = a.z - b.z,
			d = Math.hypot(dx, dz);
		if (d > 1.9 || d < 0.001) continue;
		const nx = dx / d,
			nz = dz / d,
			share = b.local ? 0.5 : 1,
			ov = 1.9 - d;
		a.x += nx * ov * share;
		a.z += nz * ov * share;
		const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz,
			cr = W.def.canRam,
			bRam = b.boostT > 0 && (!cr || cr(b)),
			aRam = a.boostT > 0 && (!cr || cr(a));
		if (rv > 0 && !(bRam && !b.local)) {
			const k = b.local ? 0.9 : 0.6;
			a.vx += nx * rv * k;
			a.vz += nz * rv * k;
		}
		if (b.local && bRam) {
			b.hitT = b.hitT || {};
			if (now - (b.hitT[a.k] || 0) > 400) {
				b.hitT[a.k] = now;
				a.hitAng = [nx, nz];
				const D = W.def,
					K = RAMK * (D.ramK || 1);
				a.vx += nx * K;
				a.vz += nz * K;
				a.slideT = D.ramSlide || 0.9;
				b.vx *= D.ramSelf || 0.35;
				b.vz *= D.ramSelf || 0.35;
				if (!D.ramKeep) b.boostT = 0;
				if (a.isMe || b.isMe) W.shake = 0.4;
				hitFx(a, b);
				dropLoot(W, a, b);
			}
		}
		if (!b.local && aRam && now - (a.hitT[b.k] || 0) > 400) {
			a.hitT[b.k] = now;
			const K = RAMK * (W.def.ramK || 1);
			W.hitsOut.push({
				k: b.k,
				by: a.k,
				x: Math.round(-nx * K * 100) / 100,
				z: Math.round(-nz * K * 100) / 100,
				id: rid(),
				t: now,
			});
			a.vx *= W.def.ramSelf || 0.35;
			a.vz *= W.def.ramSelf || 0.35;
			if (!W.def.ramKeep) a.boostT = 0;
			if (a.isMe) W.shake = 0.3;
			hitFx(a, b);
		}
	}
}
function netState(e) {
	const r = (v) => Math.round(v * 100) / 100;
	return {
		n: W.mg.nonce,
		k: e.k,
		x: r(e.x),
		z: r(e.z),
		y: r(e.y),
		a: r(e.yaw),
		vx: r(e.vx),
		vz: r(e.vz),
		al: e.al ? 1 : 0,
		d: e.d ? 1 : 0,
		sc: Math.round(e.sc),
		bt: e.boostT > 0 ? 1 : 0,
		fl: e.falling || e.fly ? 1 : 0,
		c: e.c.slice(-120),
		f: e.f,
		dr: e.dr || [],
	};
}
function applyNet(e, s) {
	if (!e || e.local || e.gone || e.lastS === s) return;
	e.lastS = s;
	e.net = Object.assign({}, s, { at: performance.now() });
	e.al = !!s.al;
	e.d = !!s.d;
	e.sc = s.sc || 0;
	e.f = s.f || {};
	if (Array.isArray(s.dr))
		s.dr.forEach((d) => {
			if (Array.isArray(d)) addDrop(W, +d[0], +d[1], +d[2], e.x, e.z, +d[3] || 1);
		});
	if (Array.isArray(s.c)) s.c.forEach((id) => W.claim(id));
	if (!e.seen) {
		e.seen = true;
		e.x = s.x;
		e.z = s.z;
		e.y = s.y || 0;
	}
}
function netRecv() {
	if (W.split) {
		if (TVS) netApply(TVS.worlds.filter((s) => s.W !== W && s.W.out).map((s) => ({ presence: s.W.out })));
		return;
	}
	if (!RT || W.localOnly) return;
	if (W.tv) {
		tvRecv();
		return;
	}
	let ps;
	try {
		ps = RT.peers();
	} catch (e) {
		return;
	}
	netApply(ps);
}
function netApply(ps) {
	for (const p of ps) {
		if (p.sameTab) continue;
		const pr = p.presence || {};
		if (pr.rt && pr.rt.n === W.mg.nonce) applyNet(W.ents[pr.rt.k], pr.rt);
		if (!W.sim && pr.rtb && pr.rtb.n === W.mg.nonce && Array.isArray(pr.rtb.l))
			pr.rtb.l.forEach((s) => applyNet(W.ents[s.k], s));
		const h = pr.rth;
		if (h && h.n === W.mg.nonce && Array.isArray(h.l))
			h.l.forEach((x) => {
				if (!x || W.seenHits.has(x.id)) return;
				W.seenHits.add(x.id);
				const e = W.ents[x.k];
				if (e && e.local && e.al && !e.falling && !e.fly && W.t >= 0) {
					const hl = Math.hypot(+x.x || 0, +x.z || 0) || 1;
					e.hitAng = [(+x.x || 0) / hl, (+x.z || 0) / hl];
					e.vx += +x.x || 0;
					e.vz += +x.z || 0;
					e.slideT = W.def.ramSlide || 0.9;
					if (e.isMe) W.shake = 0.45;
					hitFx(e, e);
					dropLoot(W, e, W.ents[x.by]);
				}
			});
	}
}
function netSend(force) {
	if (!W.split && (!RT || W.localOnly)) return;
	if (W.tv) {
		tvSend(force);
		return;
	}
	const now = performance.now();
	if (!force && now - (W.lastSend || 0) < 60) return;
	W.lastSend = now;
	const patch = { rt: netState(W.me) };
	if (W.sim) patch.rtb = { n: W.mg.nonce, l: W.list.filter((e) => e.bot).map(netState) };
	W.hitsOut = W.hitsOut.filter((h) => now - h.t < 1500);
	patch.rth = { n: W.mg.nonce, l: W.hitsOut.map((h) => ({ k: h.k, by: h.by, x: h.x, z: h.z, id: h.id })) };
	if (W.split) W.out = patch;
	else RT.presence(patch).catch(() => {});
}
function camFov(f) {
	const c = GFX.cam;
	if (c && c.fov !== f) {
		c.fov = f;
		c.updateProjectionMatrix();
	}
}
function start3D(mg, p, localOnly, startAt, split) {
	const def = MG[mg.g],
		s = new THREE.Scene();
	GFX.fx.bloom.th = 0.9;
	["ao", "bloom", "tilt", "vig", "col", "aa"].forEach((k) => {
		const v = def.fx && def.fx[k];
		GFX.fx[k].on = !!v;
		if (v) {
			if (k === "col") {
				GFX.fx.col.sat = v * 0.6;
				GFX.fx.col.con = v * 0.2;
			} else GFX.fx[k].v = v;
		}
	});
	if (def.fx) loadPost().catch(() => {});
	const plist = mg.part ? G.players.filter((q) => mg.part.includes(q.key)) : G.players;
	const tv = !p;
	W = {
		plist,
		def,
		mg,
		p,
		tv,
		split: !!split,
		sc: s,
		cam: GFX.cam,
		ents: {},
		list: [],
		rng: mulberry(mg.seed || 1),
		t: -9,
		localOnly,
		sim: split
			? split.simK === p.key
			: tv || (!localOnly && ((mg.simDev || "host") === "host" ? role === "host" : mg.simDev === p.key)),
		startAt,
		claimed: new Set(),
		hitsOut: [],
		seenHits: new Set(),
		inp: { x: 0, y: 0, boost: false },
		over: false,
		shake: 0,
		made: Date.now(),
	};
	W.claim = (id) => {
		if (W.claimed.has(id)) return false;
		W.claimed.add(id);
		{
			const it0 = W.items && W.items[id - 1],
				it = it0 && it0.id === id ? it0 : W.itemMap && W.itemMap[id];
			if (it && it.id === id) {
				const cn = def === MG.coins;
				burst(W.sc, it.x, 1, it.z, {
					n: 9,
					shape: cn ? "coin" : "cube",
					cols: cn ? ["#FFC83D", "#FFE27A"] : ["#FF7A1A", "#FFFFFF", "#FFC83D"],
					spd: 2.6,
					up: 5,
					life: 0.7,
				});
				if (W.tv || Math.hypot(it.x - W.me.x, it.z - W.me.z) < 3) sfx("coin");
			}
		}
		if (def.onClaim) def.onClaim(W, id);
		return true;
	};
	W.sun = mgEnv(
		s,
		def.kind === "arena" && def.water !== false,
		def.kind === "lane",
		def.bare,
		def.night,
		def.storm,
		def.dusk,
	);
	camFov(40);
	def.build(W);
	/* baked light panel values: def.lt = {amb, sun, warm, haze} (the panel's "Copy" line), applied over the scene's own */
	if (def.lt) {
		const L = def.lt,
			h = s.children.find((o) => o.isHemisphereLight);
		if (h && L.amb !== undefined) h.intensity = L.amb;
		if (L.sun !== undefined) W.sun.intensity = L.sun;
		if (L.warm !== undefined) {
			W.sun.color.set("#E4EEFF").lerp(new THREE.Color("#FFC27A"), L.warm);
			W.lpWarm = L.warm;
		}
		if (L.haze && s.fog) {
			s.fog.near = L.haze;
			s.fog.far = L.haze * 3.8;
		}
	}
	if (def.look) applyLook(W);
	const n = plist.length;
	plist.forEach((q, i) => {
		const e = mkEnt(q, !tv && q.key === p.key, !!split, def.truckMode);
		e.i = i;
		if (tv && !q.bot) {
			e.isMe = true;
			e.rem = true;
			e.inp = { x: 0, y: 0, boost: false, hold: false };
		}
		W.ents[q.key] = e;
		W.list.push(e);
		const sp = def.spawn(W, i, n);
		e.x = sp.x;
		e.z = sp.z;
		e.yaw = sp.yaw;
		e.sx = sp.x;
		e.sz = sp.z;
		e.local = e.isMe || (q.bot && (W.sim || localOnly));
		if (!e.local && (localOnly || ctrl(q))) {
			e.gone = true;
			e.d = true;
			e.al = false;
			e.g.visible = false;
		}
		if (def.initEnt) def.initEnt(W, e);
		s.add(e.g);
	});
	W.me = tv ? W.list.find((e) => e.rem) || W.list[0] : W.ents[p.key];
	setMode("mg");
	GFX.mgCam = null;
}
function stop3D() {
	if (TVS) {
		tvsStop();
		return;
	}
	if (!W) return;
	["ao", "bloom", "tilt", "vig", "col"].forEach((k) => {
		GFX.fx[k].on = false;
	});
	if (W.def.stop)
		try {
			W.def.stop(W);
		} catch (e) {}
	camFov(40);
	try {
		W.sc.traverse((o) => {
			if (o.geometry) o.geometry.dispose();
		});
	} catch (e) {}
	W = null;
	rtLeave();
	setMode(view === "game" ? "board" : view === "over" ? "podium" : "show");
}
function finishMe() {
	const e = W.me;
	if (W.submitted) return;
	W.submitted = true;
	const score = Math.max(0, Math.round(W.def.final ? W.def.final(W, e) : e.sc));
	W.myFinal = score;
	mgSent.add(W.mg.nonce + W.p.key);
	if (!W.localOnly || true) act({ t: "mg", nonce: W.mg.nonce, score }, W.p.key);
	netSend(true);
}
function stepMG(dt) {
	const def = W.def;
	W.t = W.startAt ? ((W.paused || Date.now()) - W.startAt) / 1000 : -99;
	if (def.ctrl === "stick" && !W.split) {
		if (def.aim) {
			const am = kbAxis("arrows");
			if (am.x || am.y) {
				const l = Math.hypot(am.x, am.y);
				W.inp.ax = am.x / l;
				W.inp.ay = am.y / l;
				W.kbA = true;
			} else if (W.kbA) {
				W.inp.ax = W.inp.ay = 0;
				W.kbA = false;
			}
		}
		const ax = kbAxis(def.aim ? "wasd" : "");
		if (ax.x || ax.y) {
			const l = Math.hypot(ax.x, ax.y);
			W.inp.x = ax.x / l;
			W.inp.y = ax.y / l;
			W.kb = true;
		} else if (W.kb) {
			W.inp.x = 0;
			W.inp.y = 0;
			W.kb = false;
		}
	}
	netRecv();
	const live = W.t >= 0 && !W.over && !W.paused;
	if (live && def.tick) def.tick(W, dt);
	if (W.items)
		W.items.forEach((it) => {
			if (!it.drop) return;
			if (W.claimed.has(it.id)) {
				if (!it.fly) it.m.visible = false;
				return;
			}
			const k = Math.min(1, (W.t - it.born) / 0.5),
				gy = def.dropY !== undefined ? def.dropY : 0.8;
			it.m.visible = true;
			it.m.position.set(
				it.fx + (it.x - it.fx) * k,
				gy + Math.sin(k * Math.PI) * 2.2 + (def.dropY !== undefined ? 0 : Math.sin(W.t * 3 + it.id) * 0.12),
				it.fz + (it.z - it.fz) * k,
			);
			if (def.dropY === undefined || k < 1) it.m.rotation.y += dt * 4;
		});
	for (const e of W.list) {
		if (e.gone) continue;
		if (e.local) {
			if (live) {
				let inp = null;
				if (e.rem) inp = e.inp;
				else if (e.isMe) inp = W.inp;
				else if (!e.d && def.bot) inp = def.bot(W, e, dt);
				if (def.kind === "arena") {
					const ip = e.d && !e.falling && !e.fly ? null : inp;
					if (def.phys) def.phys(W, e, ip, dt);
					else arenaPhys(W, e, ip, dt);
				}
				if (def.rules && !e.won) def.rules(W, e, dt);
				if (!e.d && W.t >= def.dur) {
					if (def.timeUp) def.timeUp(W, e);
					e.d = true;
				}
			}
		} else if (e.net) {
			const n = e.net,
				age = Math.min(0.25, (performance.now() - n.at) / 1000),
				k = 1 - Math.exp(-dt * 14);
			const tx = n.x + (n.fl ? 0 : (n.vx || 0) * age),
				tz = n.z + (n.fl ? 0 : (n.vz || 0) * age);
			e.x += (tx - e.x) * k;
			e.z += (tz - e.z) * k;
			e.y += ((n.y || 0) - e.y) * k;
			e.yaw = lerpA(e.yaw, n.a || 0, k);
			e.vx = n.vx || 0;
			e.vz = n.vz || 0;
			e.falling = !!n.fl;
			e.boostT = n.bt ? 0.1 : 0;
		}
	}
	if (live && def.kind === "arena")
		W.list.forEach((e) => {
			if (e.local && !e.gone) collide(W, e);
		});
	if (live && def.lastStanding) {
		const act_ = W.list.filter((e) => !e.gone),
			alive = act_.filter((e) => e.al && !e.d);
		if (act_.length > 1 && W.t > 1.5 && alive.length <= 1 && W.lsT === undefined) {
			W.lsT = W.t;
			W.lsWin = alive[0] ? alive[0].k : null;
			alive.forEach((e) => {
				if (e.local) {
					e.sc += 100;
					e.won = true;
				}
			});
		}
		if (W.lsT !== undefined && W.t - W.lsT > 3)
			alive.forEach((e) => {
				if (e.local) e.d = true;
			});
	}
	if (!W.tv && W.me.d && !W.submitted && W.t >= 0) finishMe();
	if (!W.over && W.t >= 0 && (W.list.every((e) => e.gone || e.d) || W.t >= def.dur + 2)) {
		W.over = true;
		if (W.tv) tvSubmit();
		else if (!W.submitted) {
			W.me.d = true;
			finishMe();
		}
		setTimeout(() => {
			if (W && W.over && mgPending().length) {
				stop3D();
				mgBusy = false;
				if (view === "game") handleFx();
			}
		}, 2500);
		if (W.sim && !W.tv) {
			const bots = {};
			W.list
				.filter((e) => e.bot)
				.forEach((e) => {
					bots[e.k] = Math.max(0, Math.round(def.final ? def.final(W, e) : e.sc));
				});
			act({ t: "mg", nonce: W.mg.nonce, score: W.myFinal, bots }, W.p.key);
		}
	}
	for (const e of W.list) {
		if (e.gone) continue;
		if (def.kind === "arena" && def.water !== false && e.y < -1.2 && !e.splashed) {
			e.splashed = true;
			burst(W.sc, e.x, -3.7, e.z, {
				n: 22,
				shape: "ico",
				cols: ["#BFE6FF", "#FFFFFF", "#6CC3F0"],
				spd: 3.5,
				up: 9,
				grav: 16,
				life: 1.1,
			});
			if (Math.hypot(e.x - W.me.x, e.z - W.me.z) < 25) sfx("splash");
		}
		if (e.y < (def.fallY || -8)) {
			if (e.g.visible) {
				e.g.visible = false;
				e.fallHid = true;
			}
			continue;
		}
		if (e.fallHid) {
			e.fallHid = false;
			e.g.visible = true;
		}
		{
			const dy = lerpA(0, e.yaw - (e.pyaw === undefined ? e.yaw : e.pyaw), 1);
			e.pyaw = e.yaw;
			e.lean =
				(e.lean || 0) +
				(Math.max(-0.28, Math.min(0.28, (-dy / Math.max(dt, 0.001)) * 0.045)) - (e.lean || 0)) * Math.min(1, dt * 8);
		}
		e.g.position.set(e.x, e.y + (def.baseY || 0), e.z);
		e.tr.rotation.order = "YXZ";
		e.tr.rotation.set(e.spin ? e.spin * 0.7 : e.lean, e.yaw, e.spin || e.pitch || 0);
		animTruck(e.tr, dt, e.falling || e.fly ? 0 : Math.hypot(e.vx, e.vz));
		if (def.render) def.render(W, e, dt);
	}
	if (W.autoTrk) autoTrkStep(W, dt);
	if (W.t > -8) netSend();
	// camera
	const cam = W.cam,
		asp = GFX.w / GFX.h,
		far = asp < 1 ? 1.35 : 1;
	let tgt, pos;
	const me = W.me;
	if (W.tv && def.kind === "arena" && !def.cam) [tgt, pos] = tvCam(W);
	else if (def.kind === "arena") {
		const a = me.al || me.y > -3 ? me : { x: 0, z: 0 };
		tgt = new THREE.Vector3(a.x * 0.85, 0, a.z * 0.85);
		const zm = def.camZoom || 1;
		pos = tgt.clone().add(new THREE.Vector3(0, 23 * far * zm, 17 * far * zm));
		if (def.cam) [tgt, pos] = def.cam(W, tgt, pos, far);
	} else {
		const lx = me.x * 0.6;
		tgt = new THREE.Vector3(lx, -2.2, me.z - 7);
		pos = new THREE.Vector3(lx, 8.5 * far, me.z + 12.5 * far);
		if (def.cam) [tgt, pos] = def.cam(W, tgt, pos, far);
	}
	if (W.camOv && GFX.mgCam) {
		[tgt, pos] = lpCamPose(W.camOv);
		GFX.mgCam.p.lerp(pos, 0.5);
		GFX.mgCam.t.lerp(tgt, 0.5);
	}
	if (!GFX.mgCam) {
		GFX.mgCam = { p: pos.clone(), t: tgt.clone() };
		if (GFX.trDrop) {
			GFX.trDrop = false;
			GFX.mgCam.p.y += 38;
			GFX.mgCam.t.y += 22;
		}
	}
	const k = 1 - Math.exp(-dt * 4);
	GFX.mgCam.p.lerp(pos, k);
	GFX.mgCam.t.lerp(tgt, k);
	cam.position.copy(GFX.mgCam.p);
	if (W.shake > 0) {
		W.shake -= dt;
		cam.position.x += (Math.random() - 0.5) * 0.5;
		cam.position.y += (Math.random() - 0.5) * 0.5;
	}
	if (W.jit) {
		cam.position.x += (Math.random() - 0.5) * W.jit;
		cam.position.y += (Math.random() - 0.5) * W.jit;
	}
	cam.lookAt(GFX.mgCam.t);
	cam.updateMatrixWorld();
	const so = W.def.sun || [14, 26, 12];
	W.sun.position.set(GFX.mgCam.t.x + so[0], so[1], GFX.mgCam.t.z + so[2]);
	W.sun.target.position.copy(GFX.mgCam.t);
	swayStep(W.sc);
	stepParts(W.sc, dt);
	hud3(dt);
	if (!W.tv) ctlUpdate();
}

/* ---------- board → minigame transition: the board HUD slides away, the camera climbs into the clouds, then the minigame starts with its camera dropping down through them and its HUD sliding in ---------- */
let trNonce = null;
function enterMg(mg, p) {
	if (!GFX.ok || mg.tv || GFX.mode !== "board" || trNonce === mg.nonce || document.body.classList.contains("tvphone")) {
		openMg(mg, p);
		return;
	}
	trNonce = mg.nonce;
	mgBusy = true;
	const c = trClouds();
	document.body.classList.add("trout");
	GFX.rise = performance.now();
	c.classList.add("on");
	setTimeout(() => {
		mgBusy = false;
		GFX.rise = 0;
		GFX.trDrop = true;
		openMg(mg, p);
		document.body.classList.remove("trout");
		document.body.classList.add("trin");
		setTimeout(() => {
			c.classList.remove("on");
		}, 150);
		setTimeout(() => document.body.classList.remove("trin"), 1300);
	}, 1300);
}
function trClouds() {
	let c = document.getElementById("trc");
	if (!c) {
		c = document.createElement("div");
		c.id = "trc";
		c.innerHTML = "<i></i><i></i><i></i><i></i><i></i>";
		document.body.appendChild(c);
	}
	return c;
}
/* ---------- minigame HUD ---------- */
function openMg(mg, p) {
	if (mg.tv) {
		openTvCtl(mg, p);
		return;
	}
	const def = MG[mg.g];
	mgBusy = true;
	mgOpen = true;
	const first = !mgFirst.has(mg.nonce);
	mgFirst.add(mg.nonce);
	const box = $("#mg");
	box.classList.add("on", "live");
	document.body.classList.add("mglive");
	if (!GFX.ok) {
		box.classList.remove("live");
		box.innerHTML = `<div class="mgwrap"><div class="mghead"><h2>${esc(def.name)}</h2></div><div class="mgstage"><p>This phone can't show 3D graphics, so it sits this minigame out.</p></div></div>`;
		setTimeout(() => {
			mgSent.add(mg.nonce + p.key);
			act({ t: "mg", nonce: mg.nonce, score: def.hi ? 0 : 99999 }, p.key);
			mgBusy = false;
		}, 2500);
		return;
	}
	const go = (startAt) => {
		if (first) rtJoin(mg.nonce);
		start3D(mg, p, !first, startAt);
		box.innerHTML = `<div class="m3top"><span class="chip name">${esc(def.name)}</span><span class="chip" id="m3t"></span><span class="chip grow" id="m3s"></span>${G && G.practice ? '<button class="chip" id="m3light" aria-label="Lighting">💡</button>' : ""}</div>
      <div class="m3lb${def.lbTop ? " top" : ""}" id="m3lb"></div><div class="m3intro" id="m3in"><h3>${esc(def.name)}</h3><p>${esc(def.how)}</p><p class="m3ctl">${def.ctrl === "stick" ? (def.stickHint ? def.stickHint(FINE) : FINE ? "WASD or arrow keys to drive, Space to ram." : "Drag anywhere to drive. Tap RAM to charge.") : esc(def.tapHint || "Tap the big button.") + (FINE ? " On a keyboard, press Space." : "")}</p>${!first ? `<p class="m3ctl">Practice run against CPU trucks. Your score still counts.</p>` : ""}</div>
      <div class="m3center${def.msgTop ? " hi" : ""}"><div class="m3big" id="m3c"></div><div class="m3msg" id="m3m" hidden></div></div>
      ${first ? `<div class="m3ready" id="m3r"><h3>Get ready</h3><div id="m3rl"></div><button class="btn go" id="m3rb">I'm ready${FINE ? " (Enter)" : ""}</button><button class="btn ghost" id="m3rs" hidden style="margin-top:8px">Start without the others</button></div>` : ""}
      ${def.ctrl === "custom" ? def.ctlHTML() : def.ctrl === "stick" ? stickHTML(def, def.aim ? "Drive" : "") : `${tapCtlHTML(mg.g, def)}`}`;
		wireControls(def);
		const rb = $("#m3rb");
		if (rb)
			rb.addEventListener("click", () => {
				rb.disabled = true;
				rb.textContent = "Waiting for the others…";
				act({ t: "ready", nonce: mg.nonce }, p.key);
			});
		const rs = $("#m3rs");
		if (rs)
			rs.addEventListener("click", () => {
				if (role === "host") mgStartCountdown();
			});
	};
	if (first) {
		go(null);
		syncStart();
	} else {
		box.classList.remove("live");
		box.innerHTML = `<div class="mgwrap"><div class="mghead"><h2>${esc(def.name)}</h2></div><div class="mgstage"><div class="pass"><img alt="" src="${thumb(p.truck)}"><h2 style="font-size:28px;margin:10px 0">Pass to ${esc(p.name)}</h2><p>${esc(def.how)}</p><button class="btn go" id="mgstart" style="margin-top:16px">I'm ${esc(p.name)}, start</button></div></div></div>`;
		$("#mgstart").addEventListener("click", () => {
			box.classList.add("live");
			go(Date.now() + 3500);
		});
	}
}
function syncStart() {
	if (!W || W.startAt || W.localOnly || !G || !G.mg || G.mg.nonce !== W.mg.nonce || !G.mg.t0) return;
	let s = G.mg.t0;
	const now = Date.now();
	if (s < now - W.def.dur * 500 || s > now + 15000) s = now + 4000;
	W.startAt = s;
}
/* practice-only lighting playground: sliders for ambient, sun, sun height/angle, warmth and haze, applied live */
/* free camera while the lighting panel is open: drag orbits, pinch / wheel zooms, two fingers pan */
function lpCamStart() {
	if (!W || !GFX.mgCam) return;
	const p = GFX.mgCam.p,
		t = GFX.mgCam.t,
		d = p.distanceTo(t) || 10;
	W.camOv = {
		t: t.clone(),
		dist: d,
		yaw: Math.atan2(p.x - t.x, p.z - t.z),
		pitch: Math.asin(Math.max(-1, Math.min(1, (p.y - t.y) / d))),
	};
	W.camOv0 = Object.assign({}, W.camOv, { t: t.clone() });
}
function lpCamPose(o) {
	const cp = Math.cos(o.pitch);
	return [
		o.t.clone(),
		o.t
			.clone()
			.add(new THREE.Vector3(Math.sin(o.yaw) * cp * o.dist, Math.sin(o.pitch) * o.dist, Math.cos(o.yaw) * cp * o.dist)),
	];
}
function lpCamWire() {
	const mg = document.getElementById("mg");
	if (!mg || mg.dataset.lpcam) return;
	mg.dataset.lpcam = "1";
	const pts = new Map();
	let last = null;
	const on = (e) =>
		W && W.camOv && mg.classList.contains("lpmode") && !(e.target.closest && e.target.closest("#lpanel"));
	const pair = () => {
		const v = [...pts.values()];
		if (v.length < 2) return null;
		return { d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y), cx: (v[0].x + v[1].x) / 2, cy: (v[0].y + v[1].y) / 2 };
	};
	mg.addEventListener("pointerdown", (e) => {
		if (!on(e)) return;
		e.preventDefault();
		pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
		last = pair();
		try {
			mg.setPointerCapture(e.pointerId);
		} catch (err) {}
	});
	mg.addEventListener("pointermove", (e) => {
		if (!pts.has(e.pointerId) || !on(e)) return;
		const prev = pts.get(e.pointerId),
			o = W.camOv;
		pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pts.size === 1) {
			o.yaw -= (e.clientX - prev.x) * 0.008;
			o.pitch = Math.max(0.03, Math.min(1.5, o.pitch + (e.clientY - prev.y) * 0.006));
			return;
		}
		const n = pair();
		if (n && last) {
			o.dist = Math.max(2, Math.min(120, (o.dist * last.d) / Math.max(20, n.d)));
			const k = o.dist * 0.0022,
				cy = Math.cos(o.yaw),
				sy = Math.sin(o.yaw),
				dx = n.cx - last.cx,
				dy = n.cy - last.cy;
			o.t.x += -cy * dx * k - sy * dy * k * Math.sin(o.pitch);
			o.t.z += sy * dx * k - cy * dy * k * Math.sin(o.pitch);
			o.t.y += dy * k * Math.cos(o.pitch);
		}
		last = n;
	});
	const up = (e) => {
		pts.delete(e.pointerId);
		last = pair();
	};
	["pointerup", "pointercancel", "pointerleave"].forEach((ev) => mg.addEventListener(ev, up));
	mg.addEventListener(
		"wheel",
		(e) => {
			if (!on(e)) return;
			e.preventDefault();
			W.camOv.dist = Math.max(2, Math.min(120, W.camOv.dist * Math.exp(e.deltaY * 0.0012)));
		},
		{ passive: false },
	);
}
function closeLP() {
	const p = document.getElementById("lpanel");
	if (p) p.remove();
	if (W) W.camOv = null;
	const mg = document.getElementById("mg");
	if (mg) mg.classList.remove("lpmode");
	if (W && W.paused) {
		const pd = Date.now() - W.paused;
		if (W.startAt) W.startAt += pd;
		if (typeof mgDeadline === "number") mgDeadline += pd;
		W.paused = 0;
	}
}
/* optional post-processing for minigames (practice lighting panel): ambient occlusion, bloom, tilt-shift, vignette, colour, FXAA. Scripts load from the CDN the first time an effect is switched on. */
const POSTJS = [
	"shaders/CopyShader.js",
	"postprocessing/EffectComposer.js",
	"postprocessing/RenderPass.js",
	"postprocessing/ShaderPass.js",
	"postprocessing/MaskPass.js",
	"shaders/LuminosityHighPassShader.js",
	"postprocessing/UnrealBloomPass.js",
	"math/SimplexNoise.js",
	"shaders/SSAOShader.js",
	"postprocessing/SSAOPass.js",
	"shaders/HorizontalTiltShiftShader.js",
	"shaders/VerticalTiltShiftShader.js",
	"shaders/VignetteShader.js",
	"shaders/HueSaturationShader.js",
	"shaders/BrightnessContrastShader.js",
	"shaders/FXAAShader.js",
];
GFX.fx = {
	ao: { on: false, v: 0.5 },
	bloom: { on: false, v: 0.35, th: 0.9 },
	tilt: { on: false, v: 0.5 },
	vig: { on: false, v: 0.45 },
	col: { on: false, sat: 0.12, con: 0.06 },
	aa: { on: true },
};
setTimeout(() => {
	if (GFX.ok) loadPost().catch(() => {});
}, 1200);
function fxAny() {
	const F = GFX.fx;
	return F.ao.on || F.bloom.on || F.tilt.on || F.vig.on || F.col.on || F.aa.on;
}
function loadPost() {
	if (GFX.postLoad) return GFX.postLoad;
	const base = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/";
	GFX.postLoad = POSTJS.reduce(
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
	).then(
		() => {
			GFX.postReady = true;
		},
		(e) => {
			GFX.postLoad = null;
			throw e;
		},
	);
	return GFX.postLoad;
}
function buildPost(scene, cam) {
	const r = GFX.r,
		sz = r.getSize(new THREE.Vector2()),
		w = Math.max(1, sz.x),
		h = Math.max(1, sz.y),
		pr = r.getPixelRatio(),
		comp = new THREE.EffectComposer(
			r,
			new THREE.WebGLRenderTarget(w * pr, h * pr, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
				stencilBuffer: true,
			}),
		); /* stencil needed by the tyre marks */
	comp.addPass(new THREE.RenderPass(scene, cam));
	const ao = new THREE.SSAOPass(scene, cam, w, h);
	ao.kernelRadius = 6;
	ao.minDistance = 0.001;
	ao.maxDistance = 0.025;
	comp.addPass(ao);
	{
		const bm = ao.blurMaterial,
			from = "gl_FragColor = vec4( vec3( result / ( 5.0 * 5.0 ) ), 1.0 );";
		if (bm && bm.fragmentShader.includes(from)) {
			bm.uniforms.aoAmt = { value: 0.5 };
			bm.fragmentShader =
				"uniform float aoAmt;\n" +
				bm.fragmentShader.replace(
					from,
					"gl_FragColor = vec4( vec3( mix( 1.0, result / ( 5.0 * 5.0 ), aoAmt ) ), 1.0 );",
				);
			bm.needsUpdate = true;
			ao.aoAmt = bm.uniforms.aoAmt;
		}
	}
	{
		const orig = ao.renderOverride.bind(ao);
		ao.renderOverride = (...a) => {
			const hid = [];
			scene.traverse((q) => {
				if (
					q.visible &&
					(q.isSprite ||
						q.isPoints ||
						q.isLine ||
						(q.material && q.material.transparent && q.material.depthWrite === false))
				) {
					q.visible = false;
					hid.push(q);
				}
			});
			orig(...a);
			hid.forEach((q) => {
				q.visible = true;
			});
		};
	}
	const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.35, 0.45, 0.82);
	comp.addPass(bloom);
	if (scene.userData.lk) {
		/* new look: buffers hold sRGB colour (tone mapped), and the bloom also picks up the emissive glow the shaders write into alpha */
		[comp.renderTarget1, comp.renderTarget2, ao.beautyRenderTarget].forEach((t) => {
			if (t) t.texture.encoding = THREE.sRGBEncoding;
		});
		const hp = bloom.materialHighPassFilter,
			a = "float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );",
			b = "gl_FragColor = mix( outputColor, texel, alpha );";
		if (hp && hp.fragmentShader.includes(a) && hp.fragmentShader.includes(b)) {
			hp.fragmentShader = hp.fragmentShader
				.replace(a, a + " alpha = max( alpha, 1.0 - texel.a );")
				.replace(b, "gl_FragColor = mix( outputColor, vec4( texel.rgb, 1.0 ), alpha );");
			hp.needsUpdate = true;
		}
	}
	const col = new THREE.ShaderPass(THREE.HueSaturationShader),
		bc = new THREE.ShaderPass(THREE.BrightnessContrastShader);
	comp.addPass(col);
	comp.addPass(bc);
	const th = new THREE.ShaderPass(THREE.HorizontalTiltShiftShader),
		tv = new THREE.ShaderPass(THREE.VerticalTiltShiftShader);
	comp.addPass(th);
	comp.addPass(tv);
	const vig = new THREE.ShaderPass(THREE.VignetteShader);
	comp.addPass(vig);
	const aa = new THREE.ShaderPass(THREE.FXAAShader);
	aa.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
	comp.addPass(aa);
	return { comp, scene, cam, w, h, ao, bloom, col, bc, th, tv, vig, aa };
}
function renderMG(scene, cam) {
	const F = GFX.fx;
	if (scene.userData.lk) {
		const t = performance.now();
		if (!(t - (scene.userData.lkT || 0) < 1000)) {
			scene.userData.lkT = t;
			lookEnv(scene);
		}
	}
	if (!GFX.postReady || !fxAny()) {
		GFX.r.render(scene, cam);
		return;
	}
	const sz = GFX.r.getSize(new THREE.Vector2());
	let P = GFX.pp;
	if (!P || P.scene !== scene || P.cam !== cam || P.w !== sz.x || P.h !== sz.y) {
		if (P) P.comp.passes.forEach((p) => p.dispose && p.dispose());
		try {
			P = GFX.pp = buildPost(scene, cam);
		} catch (e) {
			console.error(e);
			GFX.postReady = false;
			GFX.r.render(scene, cam);
			return;
		}
	}
	P.ao.enabled = F.ao.on;
	if (P.ao.aoAmt) P.ao.aoAmt.value = F.ao.v * 0.85;
	else P.ao.maxDistance = 0.005 + F.ao.v * 0.04;
	P.bloom.enabled = F.bloom.on;
	P.bloom.strength = F.bloom.v * 0.7;
	P.bloom.threshold = F.bloom.th;
	P.col.enabled = P.bc.enabled = F.col.on;
	P.col.uniforms.saturation.value = F.col.sat;
	P.bc.uniforms.contrast.value = F.col.con;
	P.bc.uniforms.brightness.value = 0;
	P.th.enabled = P.tv.enabled = F.tilt.on;
	P.th.uniforms.h.value = (F.tilt.v * 3) / P.w;
	P.tv.uniforms.v.value = (F.tilt.v * 3) / P.h;
	P.th.uniforms.r.value = P.tv.uniforms.r.value = 0.5;
	P.vig.enabled = F.vig.on;
	P.vig.uniforms.offset.value = 1;
	P.vig.uniforms.darkness.value = F.vig.v * 1.8;
	P.aa.enabled = F.aa.on;
	P.comp.render();
}
function wireLightPanel() {
	{
		const mg = document.getElementById("mg");
		if (mg) mg.classList.remove("lpmode");
	}
	const btn = document.getElementById("m3light");
	if (!btn || !W) return;
	btn.addEventListener("click", () => {
		let p = document.getElementById("lpanel");
		if (p) {
			closeLP();
			return;
		}
		const hemi = W.sc.children.find((o) => o.isHemisphereLight),
			sun = W.sun,
			so = (W.def.sun || [14, 26, 12]).slice(),
			fog = W.sc.fog,
			F = GFX.fx,
			LK = W.sc.userData.lk;
		const st = {
			amb: hemi ? hemi.intensity : 0,
			sun: sun.intensity,
			h: so[1],
			ang: Math.round(((Math.atan2(so[2], so[0]) * 180) / Math.PI + 360) % 360),
			dist: Math.hypot(so[0], so[2]) || 18,
			warm: W.lpWarm ?? 0.5,
			haze: fog ? fog.near : 60,
		};
		if (LK) Object.assign(st, { exp: LK.exp, env: LK.env, paint: LK.paint, glow: LK.glow });
		const LIGHT = [
			["amb", "Ambient", 0, 2.5, 0.02],
			["sun", "Sun", 0, LK ? 4 : 2.5, 0.02],
			["h", "Height", 2, 45, 1],
			["ang", "Angle", 0, 359, 1],
			["warm", "Warmth", 0, 1, 0.02],
		]
			.concat(fog ? [["haze", "Haze", 5, 200, 1]] : [])
			.concat(
				LK
					? [
							["exp", "Exposure", 0.4, 3, 0.02],
							["env", "Reflect", 0, 1.5, 0.02],
							["paint", "Paint rough", 0.1, 0.8, 0.01],
							["glow", "Glow cut", 0.8, 1.05, 0.005],
						]
					: [],
			);
		const FX = [
			["ao", "Shading AO"],
			["bloom", "Bloom"],
			["tilt", "Tilt-shift"],
			["vig", "Vignette"],
			["col", "Colour"],
			["aa", "Smooth edges"],
		];
		const fxv = (k) => (k === "col" ? F.col.sat / 0.6 : k === "aa" ? 1 : F[k].v),
			fxset = (k, v) => {
				if (k === "col") {
					F.col.sat = v * 0.6;
					F.col.con = v * 0.2;
				} else if (k !== "aa") F[k].v = v;
			};
		let grp = W.lpGrp || "light",
			cur = W.lpTab || "amb";
		p = document.createElement("div");
		p.id = "lpanel";
		p.className = "lpanel";
		W.paused = Date.now();
		document.getElementById("mg").classList.add("lpmode");
		lpCamStart();
		lpCamWire();
		p.innerHTML = `<div class="lpgroups"><button data-g="light">Light</button><button data-g="fx">Effects</button></div><div class="lptabs" id="lptabs"></div>
      <div class="lpsrow"><button id="lptog" class="lptog">OFF</button><input type="range" id="lpslider" class="lpslider"></div><div class="lpout" id="lpout"></div>
      <div class="lpbtns"><button id="lpcopy">Copy</button><button id="lpreset">Reset view</button><button id="lpclose">Close</button></div>`;
		document.getElementById("mg").appendChild(p);
		const sl = document.getElementById("lpslider"),
			tog = document.getElementById("lptog"),
			cool = new THREE.Color("#E4EEFF"),
			hot = new THREE.Color("#FFC27A");
		const fmt = (k, v) =>
				k === "ang"
					? Math.round(v) + "°"
					: k === "h" || k === "haze"
						? String(Math.round(v))
						: (+v).toFixed(k === "glow" ? 3 : 2),
			fxs = (k) => (F[k].on ? (k === "aa" ? "on" : fxv(k).toFixed(2)) : "off");
		const apply = () => {
			if (!W) return;
			if (hemi) hemi.intensity = st.amb;
			sun.intensity = st.sun;
			sun.color.copy(cool).lerp(hot, st.warm);
			if (LK) {
				sun.color.convertSRGBToLinear();
				const envCh = LK.env !== st.env || LK.paint !== st.paint;
				Object.assign(LK, {
					amb: st.amb,
					sun: st.sun,
					warm: st.warm,
					haze: st.haze,
					exp: st.exp,
					env: st.env,
					paint: st.paint,
					glow: st.glow,
				});
				F.bloom.th = st.glow;
				if (envCh) lookEnv(W.sc);
			}
			W.lpWarm = st.warm;
			const a = (st.ang * Math.PI) / 180;
			W.def.sun = [Math.round(Math.cos(a) * st.dist * 10) / 10, st.h, Math.round(Math.sin(a) * st.dist * 10) / 10];
			if (fog) {
				fog.near = st.haze;
				fog.far = st.haze * 3.8;
			}
			p.querySelectorAll(".lptab").forEach((b) => {
				const k = b.dataset.k;
				b.querySelector("b").textContent = grp === "light" ? fmt(k, st[k]) : fxs(k);
			});
			const on = FX.filter(([k]) => F[k].on)
				.map(([k, l]) => `${l.toLowerCase()} ${k === "aa" ? "on" : fxv(k).toFixed(2)}`)
				.join(", ");
			document.getElementById("lpout").textContent =
				`${W.mg.g}: ambient ${fmt("amb", st.amb)} · sun ${fmt("sun", st.sun)} · height ${fmt("h", st.h)} · angle ${fmt("ang", st.ang)} · warmth ${fmt("warm", st.warm)}` +
				(fog ? ` · haze ${fmt("haze", st.haze)}` : "") +
				(LK
					? ` · exposure ${fmt("exp", st.exp)} · reflect ${fmt("env", st.env)} · paint rough ${fmt("paint", st.paint)} · glow cut ${fmt("glow", st.glow)}`
					: "") +
				` · effects: ${on || "none"}`;
		};
		const showTog = () => {
			const isFx = grp === "fx";
			tog.hidden = !isFx;
			if (isFx) {
				tog.textContent = F[cur].on ? "ON" : "OFF";
				tog.classList.toggle("on", F[cur].on);
			}
			sl.hidden = isFx && cur === "aa";
		};
		const pick = (k) => {
			cur = k;
			W.lpTab = k;
			if (grp === "light") {
				const r = LIGHT.find((x) => x[0] === k);
				sl.min = r[2];
				sl.max = r[3];
				sl.step = r[4];
				sl.value = st[k];
			} else {
				sl.min = 0;
				sl.max = 1;
				sl.step = 0.02;
				sl.value = fxv(k);
			}
			p.querySelectorAll(".lptab").forEach((b) => b.classList.toggle("on", b.dataset.k === k));
			showTog();
		};
		const setGrp = (g) => {
			grp = g;
			W.lpGrp = g;
			p.querySelectorAll(".lpgroups button").forEach((b) => b.classList.toggle("on", b.dataset.g === g));
			const list = g === "light" ? LIGHT : FX;
			document.getElementById("lptabs").innerHTML = list
				.map(([k, l]) => `<button class="lptab" data-k="${k}">${l} <b></b></button>`)
				.join("");
			p.querySelectorAll(".lptab").forEach((b) => b.addEventListener("click", () => pick(b.dataset.k)));
			pick(list.some((r) => r[0] === cur) ? cur : list[0][0]);
			apply();
		};
		p.querySelectorAll(".lpgroups button").forEach((b) => b.addEventListener("click", () => setGrp(b.dataset.g)));
		sl.addEventListener("input", () => {
			if (grp === "light") st[cur] = +sl.value;
			else {
				fxset(cur, +sl.value);
				if (!F[cur].on) {
					F[cur].on = true;
					ensurePost();
				}
				showTog();
			}
			apply();
		});
		const ensurePost = () => {
			if (GFX.postReady) return;
			tog.textContent = "…";
			loadPost().then(
				() => {
					showTog();
					apply();
				},
				() => {
					tog.textContent = "ERR";
				},
			);
		};
		tog.addEventListener("click", () => {
			if (grp !== "fx") return;
			F[cur].on = !F[cur].on;
			if (F[cur].on) ensurePost();
			showTog();
			apply();
		});
		setGrp(grp);
		document.getElementById("lpclose").addEventListener("click", closeLP);
		document.getElementById("lpreset").addEventListener("click", () => {
			if (W && W.camOv0) W.camOv = Object.assign({}, W.camOv0, { t: W.camOv0.t.clone() });
		});
		document.getElementById("lpcopy").addEventListener("click", (e) => {
			const t = document.getElementById("lpout").textContent,
				b = e.currentTarget;
			const done = (ok) => {
				b.textContent = ok ? "Copied!" : "Select text";
				setTimeout(() => {
					if (b.isConnected) b.textContent = "Copy";
				}, 1600);
			};
			try {
				navigator.clipboard.writeText(t).then(
					() => done(true),
					() => done(false),
				);
			} catch (err) {
				done(false);
			}
		});
	});
}
/* stick controls: drive pad plus the RAM button, or (def.aim) a drive pad on the left and an aim pad on the right */
function stickHTML(def, hint) {
	const h = hint ? `<span class="tvchint">${hint}</span>` : "";
	return def.aim
		? `<div class="m3pad twin" id="m3pad">${h}<div class="knob" id="knob" hidden><i></i></div></div><div class="m3pad aim" id="m3aim">${hint ? `<span class="tvchint">${esc(def.aimHint || "Aim")}</span>` : ""}<div class="knob aim" id="knob2" hidden><i></i></div></div>`
		: `<div class="m3pad" id="m3pad">${h}<div class="knob" id="knob" hidden><i></i></div></div><button class="ram" id="ram"><i class="ramcd"></i><span>${esc(def.ramLabel || "RAM")}</span></button>`;
}
function wireControls(def) {
	wireLightPanel();
	if (def.ctrl === "custom") {
		def.wire();
		return;
	}
	if (def.ctrl === "stick") {
		wireStick(() => W && W.inp);
		if (def.aim) wireStick(() => W && W.inp, "#m3aim", "#knob2", "ax", "ay");
		else {
			const rb = $("#ram"),
				up = () => {
					if (W) W.inp.hold = false;
				};
			rb.addEventListener("pointerdown", (e) => {
				e.preventDefault();
				if (W) {
					W.inp.boost = true;
					W.inp.hold = true;
				}
			});
			["pointerup", "pointercancel", "pointerleave"].forEach((ev) => rb.addEventListener(ev, up));
		}
	} else wireTap(def);
}
function wireTap(def) {
	const b = $("#tapall");
	b.addEventListener("pointerdown", (e) => {
		e.preventDefault();
		b.classList.add("kick");
		setTimeout(() => b.classList.remove("kick"), 110);
		if (W && W.t >= 0 && !W.me.d && def.tap) def.tap(W, W.me);
	});
}
function wireStick(get, padSel = "#m3pad", knobSel = "#knob", kx = "x", ky = "y", onChange) {
	const pad = $(padSel),
		knob = $(knobSel);
	let o = null,
		pid = null;
	const upd = (e) => {
		const dx = e.clientX - o[0],
			dy = e.clientY - o[1],
			l = Math.hypot(dx, dy),
			m = Math.min(1, l / 55),
			s = l > 4 ? m / l : 0,
			i = get();
		if (i) {
			i[kx] = dx * s;
			i[ky] = dy * s;
		}
		if (onChange) onChange();
		knob.firstChild.style.transform = `translate(${(dx / Math.max(1, l)) * Math.min(l, 50)}px,${(dy / Math.max(1, l)) * Math.min(l, 50)}px)`;
	};
	pad.addEventListener("pointerdown", (e) => {
		e.preventDefault();
		pid = e.pointerId;
		o = [e.clientX, e.clientY];
		pad.setPointerCapture(pid);
		knob.hidden = false;
		const pr = pad.getBoundingClientRect();
		knob.style.left = e.clientX - pr.left + "px";
		knob.style.top = e.clientY - pr.top + "px";
		upd(e);
	});
	pad.addEventListener("pointermove", (e) => {
		if (e.pointerId === pid && o) upd(e);
	});
	const end = (e) => {
		if (e.pointerId !== pid) return;
		o = null;
		pid = null;
		knob.hidden = true;
		const i = get();
		if (i) {
			i[kx] = 0;
			i[ky] = 0;
		}
		if (onChange) onChange();
	};
	pad.addEventListener("pointerup", end);
	pad.addEventListener("pointercancel", end);
}
function lsMsg(W, me) {
	if (W.lsT === undefined) return "";
	const w = W.lsWin && W.ents[W.lsWin];
	if (!w) return "Nobody's left standing!";
	return me && w === me ? "🏆 You win!" : `🏆 ${w.p.name} wins!`;
}
function hud3(dt) {
	W.hudT = (W.hudT || 0) - dt;
	if (W.hudT > 0) return;
	W.hudT = 0.12;
	const def = W.def,
		t = W.t,
		c = $("#m3c"),
		m = $("#m3m"),
		intro = $("#m3in");
	if (!c) return;
	syncStart();
	if (intro) intro.hidden = !!W.startAt;
	const rd = $("#m3r");
	if (rd) {
		rd.hidden = !!W.startAt;
		if (!W.startAt && G && G.mg) {
			const rdy = G.mg.ready || {};
			$("#m3rl").innerHTML = G.players
				.filter((q) => !q.bot && (G.mg.part ? G.mg.part.includes(q.key) : !q.local))
				.map(
					(q) =>
						`<div><i style="background:${pcol(q)}"></i><span>${esc(q.name)}${q.key === me.key ? " (you)" : ""}</span><b class="${rdy[q.key] ? "ok" : ""}">${rdy[q.key] ? "Ready" : "Not ready"}</b></div>`,
				)
				.join("");
			const sb = $("#m3rs");
			if (sb) sb.hidden = !(role === "host" && Date.now() - W.made > 8000);
		}
	}
	{
		const tx = !W.startAt ? "" : t < 0 ? String(Math.ceil(-t)) : t < 0.8 ? "GO!" : "";
		if (tx !== W.lastC) {
			W.lastC = tx;
			if (tx === "GO!") sfx("go");
			else if (tx && +tx <= 3) sfx("beep");
		}
		c.textContent = tx;
	}
	$("#m3t").textContent = !W.startAt ? "Waiting" : t < 0 ? "Get ready" : `${Math.max(0, Math.ceil(def.dur - t))} s`;
	if (!W.tv)
		$("#m3s").textContent =
			W.me.d && W.myFinal !== undefined
				? `Final: ${fmtScore(def, W.myFinal)}`
				: def.fmt
					? def.fmt(W, W.me)
					: fmtScore(def, Math.round(W.me.sc));
	const ld = W.me.lastDrop,
		dropMsg =
			ld && W.t - ld.t < 1.5
				? `${ld.flank === "rear" ? "Hit from behind! " : ld.flank === "side" ? "T-boned! " : "Rammed! "}You dropped ${ld.n} ${ld.what || "coin"}${ld.n === 1 ? "" : "s"}`
				: "";
	const winMsg = W.lsT !== undefined ? lsMsg(W, W.tv ? null : W.me) : "";
	const msg = winMsg
		? winMsg
		: W.tv
			? W.over
				? "Results coming up…"
				: ""
			: dropMsg && !W.me.d
				? dropMsg
				: W.over
					? "Waiting for results…"
					: W.me.d && def.donePrompt && def.donePrompt(W, W.me)
						? def.donePrompt(W, W.me)
						: W.me.d
							? W.me.al || !def.lastStanding
								? "Done! Watch the others…"
								: "Knocked out! Watch the others…"
							: def.prompt
								? def.prompt(W, W.me)
								: "";
	m.hidden = !msg;
	m.textContent = msg || "";
	const hi = def.liveHi !== undefined ? def.liveHi : def.hi;
	const rows = W.list
		.filter((e) => !e.gone)
		.sort((a, b) => (hi ? b.sc - a.sc : a.sc - b.sc))
		.slice(0, 8);
	$("#m3lb").innerHTML = rows
		.map(
			(e) =>
				`<div style="--c:${pcol(e.p)}" class="${e.isMe && !W.tv ? "me" : ""} ${!e.al && def.lastStanding ? "out" : ""}"><i style="background:${pcol(e.p)}"></i><span>${esc(e.isMe && !W.tv && !W.split ? "You" : def.lbTop ? e.p.name.replace(/^CPU /, "") : e.p.name)}</span><b>${def.fmtV ? def.fmtV(Math.round(e.sc)) : def.unit === "ms" && !def.liveHi ? (e.sc / 1000).toFixed(2) : Math.round(e.sc)}</b></div>`,
		)
		.join("");
	const rb = $("#ram");
	if (rb) {
		const cd = W.def.ramCd ? W.def.ramCd(W) : Math.min(1, W.me.bcd / 2);
		rb.classList.toggle("cd", W.def.ramReady ? !W.def.ramReady(W) : W.me.bcd > 0);
		rb.style.setProperty("--cd", cd.toFixed(3));
		rb.classList.toggle("held", !!W.inp.hold);
	}
}
// times are stored in ms but shown as seconds with 2 decimals
const fmtScore = (def, v) =>
	def.fmtV ? def.fmtV(v) : def.unit === "ms" ? `${(v / 1000).toFixed(2)} s` : `${v} ${def.unit}`;
function showMgResults(mg) {
	const def = MG[mg.g];
	stop3D();
	tvcStop();
	mgBusy = false;
	sfx("fanfare");
	document.body.classList.remove("mglive");
	document.body.classList.add("mgres");
	mgOpen = true;
	mgRes = true;
	const box = $("#mg");
	box.classList.add("on", "res");
	box.classList.remove("live");
	const rows = (mg.order || [])
		.map((k, i) => {
			const p = G.players.find((x) => x.key === k);
			if (!p) return "";
			const place = i === 0 ? "p1" : i === 1 ? "p2" : i === 2 ? "p3" : "";
			const s = k in mg.res ? fmtScore(def, mg.res[k]) : "No score";
			return `<li class="${place}${k === me.key ? " you" : ""}" style="--d:${i * 110 + 250}ms;--c:${pcol(p)}"><span class="rk">${i + 1}</span><img alt="" src="${thumb(p.truck)}"><span class="rn">${esc(p.name)}${k === me.key ? " (you)" : ""}<small>${s}</small></span><span class="raw ${(mg.aw[k] || 0) < 0 ? "neg" : ""}">${(mg.aw[k] || 0) < 0 ? "−" + -mg.aw[k] : "+" + (mg.aw[k] || 0)}${coinIco}</span></li>`;
		})
		.join("");
	box.innerHTML = `<div class="resx"><div class="rescard"><div class="reshz"></div><div class="reshead"><span class="resk">${mg.duel ? "Duel results" : "Minigame results"}</span><h2>${esc(def.name)}</h2></div><ol class="reslist">${rows}</ol><p class="resnext">Round ${Math.min(G.round + 1, G.rounds)} coming up…</p></div></div>`;
	if (mg.prac) {
		box.querySelector(".resnext").textContent = "Practice round, back to the lobby…";
		box.querySelectorAll(".raw").forEach((n) => n.remove());
		box.querySelector(".resk").textContent = "Practice results";
	} else if (mg.duel) box.querySelector(".resnext").textContent = "Back to the board…";
	else if (G.round >= G.rounds) box.querySelector(".resnext").textContent = "Final results coming up…";
}
function closeMg() {
	tvcStop();
	document.body.classList.remove("mglive", "mgres");
	mgRes = false;
	$("#mg").classList.remove("res");
	mgOpen = false;
	mgBusy = false;
	stop3D();
	const m = $("#mg");
	m.classList.remove("on", "live");
	m.innerHTML = "";
}

function hitFx(a, b) {
	if (!W) return;
	if (W.def.onHit) W.def.onHit(W, a, b);
	burst(W.sc, (a.x + b.x) / 2, 0.9, (a.z + b.z) / 2, {
		n: 14,
		shape: "cube",
		cols: ["#FFE27A", "#FFC83D", "#FFFFFF", "#FF8A1F"],
		spd: 5.5,
		up: 4,
		grav: 10,
		life: 0.5,
	});
	sfx("ram");
}

/* ---------- ram loot: rammed trucks spill coins anyone can grab ---------- */
function addDrop(W, id, x, z, fx, fz, v = 1) {
	if (!W || !W.items || !isFinite(id) || !isFinite(x) || !isFinite(z)) return;
	W.itemMap = W.itemMap || {};
	if (W.itemMap[id]) return;
	let m;
	if (W.def.dropMesh) m = W.def.dropMesh(v);
	else {
		m = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 14), "#FFC83D", {
			metalness: 0.5,
			roughness: 0.3,
			emissive: "#6A4E00",
			emissiveIntensity: 0.4,
		});
		m.rotation.z = Math.PI / 2;
	}
	m.position.set(fx, 1, fz);
	W.sc.add(m);
	const it = {
		id,
		x,
		z,
		fx: isFinite(fx) ? fx : x,
		fz: isFinite(fz) ? fz : z,
		born: W.t,
		t: W.t + 0.5,
		m,
		v,
		drop: true,
	};
	W.items.push(it);
	W.itemMap[id] = it;
}
function dropLoot(W, e, by) {
	const d = W.def;
	if (d.onRammed) {
		if (e.local && !e.d) d.onRammed(W, e, by);
		return;
	}
	if (!d.loot || e.d || !e.local || (e.lootCD || 0) > W.t) return;
	let share = 0.3,
		flank = "";
	if (e.hitAng) {
		const fx = Math.cos(e.yaw),
			fz = -Math.sin(e.yaw),
			dot = e.hitAng[0] * fx + e.hitAng[1] * fz;
		if (dot > 0.5) {
			share = 0.5;
			flank = "rear";
		} else if (dot > -0.5) {
			share = 0.4;
			flank = "side";
		}
	}
	const per = d.lootPer || 1;
	let k;
	if (per > 1) {
		const stack = Math.floor(e.sc / per);
		if (!stack) return;
		k = Math.min(stack, Math.max(1, Math.ceil(stack * (share + 0.2))));
	} else k = Math.min(flank === "rear" ? 8 : 6, e.sc, Math.max(2, Math.ceil(e.sc * share)));
	if (k <= 0) return;
	e.lootCD = W.t + 1;
	e.sc -= k * per;
	e.lootN = e.lootN || 0;
	e.dr = e.dr || [];
	const h = (d.bound && d.bound.h ? d.bound.h : 11) - 0.8;
	for (let i = 0; i < k; i++) {
		const a = Math.random() * 6.28,
			r = 2.1 + Math.random() * 1.5,
			x = Math.max(-h, Math.min(h, e.x + Math.cos(a) * r)),
			z = Math.max(-h, Math.min(h, e.z + Math.sin(a) * r));
		const id = 100000 + e.i * 1000 + (e.lootN++ % 1000);
		addDrop(W, id, x, z, e.x, e.z, per);
		e.dr.push([id, Math.round(x * 100) / 100, Math.round(z * 100) / 100, per]);
	}
	if (e.dr.length > 30) e.dr = e.dr.slice(-30);
	if (e.isMe) {
		e.lastDrop = { t: W.t, n: k, flank, what: per > 1 ? "cone" : "coin" };
		sfx("loss");
	}
}

function ramAssist(W, e, dx, dz) {
	let best = null,
		bs = 1e9;
	for (const o of W.list) {
		if (o === e || o.gone || !o.al || o.d || o.falling || o.fly || (!o.local && !o.seen)) continue;
		const ox = o.x - e.x,
			oz = o.z - e.z,
			d = Math.hypot(ox, oz);
		if (d > 6.5 || d < 0.3) continue;
		const cos = (ox * dx + oz * dz) / d;
		if (cos < 0.5) continue;
		const sc = d * (2 - cos);
		if (sc < bs) {
			bs = sc;
			best = [ox / d, oz / d];
		}
	}
	return best;
}

/* ---------- themed tap controls ---------- */
const UI_OF = { drag: "pedal", ramp: "pedal", crane: "drop" };
function tapCtlHTML(g, def) {
	const ui = UI_OF[g] || "btn",
		lab = esc(def.tapLabel || "TAP");
	if (ui === "pedal" || ui === "brake")
		return `<button class="tapall tp-pedal ${ui === "brake" ? "brake" : ""} ${g === "drag" || g === "ramp" ? "tp-wide" : ""}" id="tapall" aria-label="${lab}"><span class="tp-gauge"><i></i></span><span class="tp-read" id="tpread">0 km/h</span><b class="tp-lab" id="tplab">${lab}</b><span class="tp-pedwrap"><span class="tp-ped"><i></i><i></i><i></i><i></i><i></i></span></span></button>`;
	if (ui === "launch")
		return `<button class="tapall tp-launch" id="tapall" data-state="wait" aria-label="Go"><span class="tp-lights"><i class="r"></i><i class="y"></i><i class="g"></i></span><span class="tp-go">GO!</span><b class="tp-hint" id="tplab">Wait for green…</b></button>`;
	if (ui === "jump")
		return `<button class="tapall tp-jump" id="tapall" aria-label="Jump"><span class="tp-arcade"><span class="tp-chev"></span><span class="tp-chev"></span><b>JUMP</b></span></button>`;
	if (ui === "drop")
		return `<button class="tapall tp-drop" id="tapall" data-state="ready" aria-label="Drop"><span class="tp-panel"><span class="tp-led"><i></i><em id="tpstat">READY</em></span><span class="tp-mush"><b>DROP</b></span><span class="tp-count"><em id="tpcount">1</em><small>/10</small></span></span></button>`;
	return `<button class="tapall" id="tapall">${lab}</button>`;
}
function ctlUpdate() {
	if (!W) return;
	const el = document.getElementById("tapall");
	if (!el) return;
	const ui = UI_OF[W.mg.g],
		e = W.me,
		t = W.t,
		set = (id, v) => {
			const n = document.getElementById(id);
			if (n && n.textContent !== v) n.textContent = v;
		};
	if (ui === "pedal") {
		const av = Math.abs(e.v || 0),
			p = Math.min(1, av / 34);
		el.style.setProperty("--p", p.toFixed(3));
		set("tpread", `${Math.round(av * 3.6)} km/h`);
		const hot = W.mg.g === "ramp" && !e.st && e.z < -48 && e.z > -60.4;
		el.classList.toggle("hot", hot);
		set("tplab", hot ? "JUMP NOW!" : W.mg.g === "ramp" && e.st === "air" ? "TAP TO BOUNCE!" : W.def.tapLabel);
	} else if (ui === "brake") {
		const on = e.brk || e.st === "stop" || e.st === "crash";
		el.style.setProperty("--p", on ? "1" : "0");
		set("tpread", `${Math.round((e.v || 0) * 3.6)} km/h`);
		set("tplab", e.st === "crash" ? "CRASH!" : e.st === "stop" ? "STOPPED" : "BRAKE!");
	} else if (ui === "launch") {
		const r = Math.min(2, Math.max(0, Math.floor(t / 7))),
			g = W.greens ? W.greens[r] : 0;
		const st = t < 0 ? "wait" : e.tr_ === r ? "done" : t >= g ? "go" : "red";
		if (el.dataset.state !== st) el.dataset.state = st;
		set(
			"tplab",
			st === "go"
				? "GO GO GO!"
				: st === "done"
					? e.f && e.f.x && t < g + 2
						? "Too early!"
						: "Launched!"
					: "Wait for green…",
		);
	} else if (ui === "jump") el.classList.toggle("air", e.y > 0.05 || !e.al);
	else if (ui === "drop") {
		const u = e.used ?? e.cr,
			st = u >= 10 ? "done" : e.fall ? "loading" : "ready";
		if (el.dataset.state !== st) el.dataset.state = st;
		set("tpstat", st === "ready" ? "READY" : st === "loading" ? "DROPPING" : "DONE");
		set("tpcount", String(Math.min(10, u + (st === "done" ? 0 : 1))));
	}
}

/* ---------- TV minigames: the TV simulates every truck, phones are controllers ---------- */
const tvPlayable = (g) => {
	const d = MG[g];
	return !!d && d.kind === "arena" && d.ctrl === "stick" && g !== "race";
};
function openTvMg(mg) {
	const def = MG[mg.g];
	mgBusy = true;
	mgOpen = true;
	const box = $("#mg");
	box.classList.remove("res");
	box.classList.add("on", "live");
	document.body.classList.add("mglive");
	rtJoin(mg.nonce);
	start3D(mg, null, false, null);
	box.innerHTML = `<div class="m3top"><span class="chip name">${esc(def.name)}</span><span class="chip" id="m3t"></span><span class="chip grow">📱 Play on your phones</span></div>
    <div class="m3lb${def.lbTop ? " top" : ""}" id="m3lb"></div><div class="m3intro" id="m3in"><h3>${esc(def.name)}</h3><p>${esc(def.how)}</p><p class="m3ctl">${def.aim ? "Left side of your phone drives, right side aims." : `Drag on your phone to drive. Tap ${esc(def.ramLabel || "RAM")} to ${def.ramLabel ? "use it" : "charge into someone"}.`}</p></div>
    <div class="m3center${def.msgTop ? " hi" : ""}"><div class="m3big" id="m3c"></div><div class="m3msg" id="m3m" hidden></div></div>
    <div class="m3ready" id="m3r"><h3>Get ready</h3><div id="m3rl"></div><button class="btn ghost" id="m3rs" hidden style="margin-top:8px">Start without the others</button></div>`;
	$("#m3rs").addEventListener("click", () => mgStartCountdown());
	syncStart();
}
function tvCam(W) {
	const live = W.list.filter((e) => !e.gone && e.al && e.y > -3),
		L = live.length ? live : W.list;
	let cx = 0,
		cz = 0;
	L.forEach((e) => {
		cx += e.x;
		cz += e.z;
	});
	cx /= L.length || 1;
	cz /= L.length || 1;
	let r = 0;
	L.forEach((e) => {
		r = Math.max(r, Math.abs(e.x - cx) * 0.62, Math.abs(e.z - cz));
	});
	const b = W.def.bound || {},
		size = b.t === "sq" ? b.h : b.t === "circ" ? b.r : 0;
	let zm = Math.max(0.88, Math.min(2.3, (r + 5) / 12)),
		tx = cx * 0.75,
		tz = cz * 0.75;
	if (size && size <= 14) {
		zm = Math.max(zm, (size + 1.5) / 10.5);
		tx *= 0.25;
		tz = tz * 0.25 + 2;
	}
	zm *= W.def.camZoom || 1;
	const tgt = new THREE.Vector3(tx, 0, tz);
	return [tgt, tgt.clone().add(new THREE.Vector3(0, 23 * zm, 17 * zm))];
}
function tvRecv() {
	let ps;
	try {
		ps = RT.peers();
	} catch (e) {
		return;
	}
	for (const p of ps) {
		const r = p.presence && p.presence.rin;
		if (!r || r.n !== W.mg.nonce) continue;
		const e = W.ents[r.k];
		if (!e || !e.rem) continue;
		const i = e.inp;
		let x = +r.x || 0,
			y = +r.y || 0;
		const l = Math.hypot(x, y);
		if (l > 1) {
			x /= l;
			y /= l;
		}
		i.x = x;
		i.y = y;
		i.ax = +r.ax || 0;
		i.ay = +r.ay || 0;
		i.hold = !!r.h;
		if (e.lastB === undefined) e.lastB = r.b;
		else if (r.b !== e.lastB) {
			e.lastB = r.b;
			i.boost = true;
		}
	}
}
function tvSend(force) {
	const now = performance.now();
	if (!force && now - (W.lastSend || 0) < 120) return;
	W.lastSend = now;
	const D = W.def,
		m0 = W.me,
		l = {},
		hi = D.liveHi !== undefined ? D.liveHi : D.hi,
		order = W.list.filter((e) => !e.gone).sort((a, b) => (hi ? b.sc - a.sc : a.sc - b.sc));
	for (const e of W.list) {
		if (!e.rem) continue;
		W.me = e;
		l[e.k] = tvStatus(W, e, order);
	}
	W.me = m0;
	RT.presence({ tvs: { n: W.mg.nonce, l } }).catch(() => {});
}
function tvStatus(W, e, order) {
	const D = W.def;
	try {
		const cd = D.ramCd ? D.ramCd(W) : Math.min(1, e.bcd / 2),
			rdy = D.ramReady ? D.ramReady(W) : e.bcd <= 0,
			ld = e.lastDrop;
		const dm =
			ld && W.t - ld.t < 1.5
				? `${ld.flank === "rear" ? "Hit from behind! " : ld.flank === "side" ? "T-boned! " : "Rammed! "}You dropped ${ld.n} ${ld.what || "coin"}${ld.n === 1 ? "" : "s"}`
				: "";
		const msg =
			W.t < 0
				? ""
				: W.lsT !== undefined
					? lsMsg(W, e)
					: dm && !e.d
						? dm
						: e.d && D.donePrompt && D.donePrompt(W, e)
							? D.donePrompt(W, e)
							: e.d
								? e.al || !D.lastStanding
									? "Done! Watch the TV"
									: "Knocked out! Watch the TV"
								: D.prompt
									? D.prompt(W, e) || ""
									: "";
		return [
			D.fmt ? D.fmt(W, e) : fmtScore(D, Math.round(e.sc)),
			Math.round(cd * 100) / 100,
			rdy ? 1 : 0,
			e.d ? 1 : 0,
			String(msg).slice(0, 90),
			order.indexOf(e) + 1,
			ld ? Math.round(ld.t * 10) : 0,
		];
	} catch (err) {
		return ["", 0, 0, 0, "", 0, 0];
	}
}
function tvSubmit() {
	if (W.submitted || !HG || !HG.mg || HG.mg.nonce !== W.mg.nonce) return;
	W.submitted = true;
	W.list.forEach((e) => {
		if (!(e.k in HG.mg.res)) HG.mg.res[e.k] = clampScore(W.def.final ? W.def.final(W, e) : e.sc);
	});
	push();
	checkMgDone();
}
/* phone side: stick + RAM, sends input to the TV and shows its own score */
let TVC = null;
function openTvCtl(mg, p) {
	const def = MG[mg.g];
	mgBusy = true;
	mgOpen = true;
	const box = $("#mg");
	box.classList.add("on", "live");
	document.body.classList.add("mglive");
	rtJoin(mg.nonce);
	TVC = {
		mg,
		p,
		def,
		inp: { x: 0, y: 0, boost: false, hold: false },
		b: 0,
		last: "",
		lastT: 0,
		iv: 0,
		go: false,
		drop: 0,
		ev: [],
		seq: 0,
		mir: "",
	};
	box.innerHTML = `<div class="tvc${def.ctrl === "stick" ? " bare" : ""}" style="--c:${pcol(p)}"><div class="tvrot">🔄 Turn your phone sideways</div><div class="m3top"><span class="chip name">${esc(def.name)}</span><span class="chip" id="tvct">Waiting</span></div>
    <div class="tvcme"><img alt="" src="${thumb(p.truck)}"><div><b id="tvcs">0</b><small id="tvcr">${esc(p.name)}</small></div></div>
    <div class="tvcmsg" id="tvcm">📺 Watch the TV</div>
    ${def.ctrl === "stick" ? stickHTML(def, def.aim ? "Drive" : "Drag anywhere here to drive") : `<div class="tvcctl" id="tvcctl">${def.ctrl === "custom" ? def.ctlHTML() : tapCtlHTML(mg.g, def)}</div>`}
    <div class="m3ready" id="m3r"><h3>${esc(def.name)}</h3><p style="font-size:14px;line-height:1.45;margin-bottom:10px">${esc(def.how)}</p><div id="m3rl"></div><button class="btn go" id="m3rb">I'm ready</button></div></div>`;
	if (def.ctrl === "stick") {
		wireStick(() => TVC && TVC.inp);
		if (def.aim) wireStick(() => TVC && TVC.inp, "#m3aim", "#knob2", "ax", "ay", tvcTick);
		const rb = $("#ram"),
			up = () => {
				if (TVC) {
					TVC.inp.hold = false;
					tvcTick();
				}
			};
		if (rb)
			rb.addEventListener("pointerdown", (e) => {
				e.preventDefault();
				if (TVC) {
					TVC.b++;
					TVC.inp.hold = true;
					tvcTick();
				}
			});
		if (rb) ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => rb.addEventListener(ev, up));
	} else {
		const wrap = $("#tvcctl"),
			downs = new Map(),
			send = (idx, d) => {
				if (!TVC) return;
				TVC.ev.push([++TVC.seq, idx, d]);
				if (TVC.ev.length > 16) TVC.ev.shift();
				tvcTick();
			};
		wrap.addEventListener("pointerdown", (e) => {
			const b = e.target.closest("button");
			if (!b || !wrap.contains(b)) return;
			e.preventDefault();
			const idx = [...wrap.querySelectorAll("button")].indexOf(b);
			downs.set(e.pointerId, idx);
			b.classList.add("kick");
			send(idx, 1);
		});
		TVC.up = (e) => {
			if (!downs.has(e.pointerId)) return;
			const idx = downs.get(e.pointerId);
			downs.delete(e.pointerId);
			send(idx, 0);
		};
		addEventListener("pointerup", TVC.up);
		addEventListener("pointercancel", TVC.up);
	}
	$("#m3rb").addEventListener("click", (e) => {
		const b = e.currentTarget;
		b.disabled = true;
		b.textContent = "Waiting for the others…";
		act({ t: "ready", nonce: mg.nonce }, p.key);
	});
	box.addEventListener("pointerdown", tvcLand, { once: true });
	$("#m3rb").addEventListener("click", tvcLand);
	TVC.iv = setInterval(tvcTick, 50);
	tvcTick();
}
function tvcLand() {
	try {
		const de = document.documentElement,
			lock = () => {
				try {
					const p = screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape");
					if (p && p.catch) p.catch(() => {});
				} catch (e) {}
			};
		if (document.fullscreenElement) lock();
		else if (de.requestFullscreen) {
			const p = de.requestFullscreen({ navigationUI: "hide" });
			if (p && p.then) p.then(lock, () => {});
		}
	} catch (e) {}
}
function tvcStop() {
	try {
		screen.orientation && screen.orientation.unlock && screen.orientation.unlock();
	} catch (e) {}
	if (!TVC) return;
	clearInterval(TVC.iv);
	if (TVC.up) {
		removeEventListener("pointerup", TVC.up);
		removeEventListener("pointercancel", TVC.up);
	}
	TVC = null;
	rtLeave();
}
function tvcTick() {
	if (!TVC || !G || !G.mg || G.mg.nonce !== TVC.mg.nonce) return;
	const i = TVC.inp,
		r = (v) => Math.round(v * 100) / 100,
		key = [r(i.x), r(i.y), r(i.ax || 0), r(i.ay || 0), TVC.b, i.hold ? 1 : 0, TVC.seq].join(),
		now = performance.now();
	if (RT && (key !== TVC.last || now - TVC.lastT > 600)) {
		TVC.last = key;
		TVC.lastT = now;
		RT.presence({
			rin: {
				n: TVC.mg.nonce,
				k: TVC.p.key,
				x: r(i.x),
				y: r(i.y),
				ax: r(i.ax || 0),
				ay: r(i.ay || 0),
				b: TVC.b,
				h: i.hold ? 1 : 0,
				ev: TVC.ev.slice(),
			},
		}).catch(() => {});
	}
	let st = null;
	if (RT) {
		try {
			for (const q of RT.peers()) {
				const v = q.presence && q.presence.tvs;
				if (v && v.n === TVC.mg.nonce && v.l && v.l[TVC.p.key]) st = v.l[TVC.p.key];
			}
		} catch (e) {}
	}
	const t0 = G.mg.t0,
		t = t0 ? (Date.now() - t0) / 1000 : null,
		def = TVC.def,
		set = (id, v) => {
			const n = document.getElementById(id);
			if (n && n.textContent !== v) n.textContent = v;
		};
	set("tvct", !t0 ? "Waiting" : t < 0 ? "Get ready" : `${Math.max(0, Math.ceil(def.dur - t))} s`);
	const rd = $("#m3r");
	if (rd) {
		rd.hidden = !!t0;
		if (!t0) {
			const rdy = G.mg.ready || {},
				h = G.players
					.filter((q) => !q.bot && (!G.mg.part || G.mg.part.includes(q.key)))
					.map(
						(q) =>
							`<div><i style="background:${pcol(q)}"></i><span>${esc(q.name)}${q.key === me.key ? " (you)" : ""}</span><b class="${rdy[q.key] ? "ok" : ""}">${rdy[q.key] ? "Ready" : "Not ready"}</b></div>`,
					)
					.join("");
			const rl = $("#m3rl");
			if (rl.innerHTML !== h) rl.innerHTML = h;
		}
	}
	if (t !== null && t >= 0 && !TVC.go) {
		TVC.go = true;
		try {
			navigator.vibrate && navigator.vibrate(60);
		} catch (e) {}
	}
	const big = t === null ? "" : t < 0 ? String(Math.ceil(-t)) : t < 0.8 ? "GO!" : "";
	if (st && st[7]) {
		const j = JSON.stringify(st[7]);
		if (j !== TVC.mir) {
			TVC.mir = j;
			const w = $("#tvcctl");
			if (w) mirKids(w, st[7]);
		}
	}
	if (st) {
		set("tvcs", String(st[0]));
		set("tvcr", t !== null && t >= 0 ? ordinal(st[5]) + " place" : TVC.p.name);
		if (st[6] && st[6] !== TVC.drop) {
			TVC.drop = st[6];
			try {
				navigator.vibrate && navigator.vibrate([40, 30, 40]);
			} catch (e) {}
		}
	}
	set("tvcm", big || (st && st[4]) || (t === null ? "📺 Watch the TV" : t > def.dur ? "Results on the TV…" : ""));
	const m = $("#tvcm");
	if (m) m.classList.toggle("big", !!big);
	const rb = $("#ram");
	if (rb) {
		rb.classList.toggle("cd", st ? !st[2] : false);
		rb.style.setProperty("--cd", st ? String(st[1]) : "0");
		rb.classList.toggle("held", !!i.hold);
	}
}

/* ---------- TV split screen: one world per human on the TV, each drawn in its own viewport ---------- */
let TVS = null;
function tvsCells(n, w, h) {
	if (n <= 1) return [[0, 0, w, h]];
	if (n === 2) {
		const a = Math.round(w / 2);
		return [
			[0, 0, a, h],
			[a, 0, w - a, h],
		];
	}
	const cols = n <= 4 ? 2 : n <= 6 ? 3 : 4,
		cw = Math.round(w / cols),
		ch = Math.round(h / 2);
	return Array.from({ length: cols * 2 }, (_, i) => {
		const c = i % cols,
			r = Math.floor(i / cols);
		return [c * cw, r * ch, c === cols - 1 ? w - c * cw : cw, r ? h - ch : ch];
	});
}
const tvsIds = (el, on) => {
	if (el)
		el.querySelectorAll("[data-hid]").forEach((n) => {
			if (on) n.id = n.dataset.hid;
			else n.removeAttribute("id");
		});
};
function tvsAct(s, on) {
	tvsIds(s.hud, on);
	tvsIds(s.ctl, on);
}
function openTvSplit(mg) {
	const def = MG[mg.g];
	mgBusy = true;
	const humans = (mg.part ? G.players.filter((q) => mg.part.includes(q.key)) : G.players).filter((q) => !q.bot);
	if (!humans.length || !GFX.ok) return;
	const mode = def.kind === "lane" ? "shared" : mg.g === "race" && humans.length === 2 ? "dyn" : "grid";
	mgOpen = true;
	const box = $("#mg");
	box.classList.remove("res");
	document.body.classList.remove("mgres");
	box.classList.add("on", "live", "tvsplit", "tv" + mode);
	document.body.classList.add("mglive");
	rtJoin(mg.nonce);
	const n = humans.length,
		cells = mode === "grid" ? tvsCells(n, innerWidth, innerHeight) : [];
	const hud = (
		q,
		i,
	) => `<div class="tvv" data-w="${i}" style="--c:${pcol(q)}"><div class="m3top"><span class="chip name tvvn">${esc(q.name)}</span><span class="chip" data-hid="m3t"></span><span class="chip grow" data-hid="m3s"></span></div>
      <div class="m3lb${def.lbTop ? " top" : ""}" data-hid="m3lb"></div><div class="m3center${def.msgTop ? " hi" : ""}"><div class="m3big" data-hid="m3c"></div><div class="m3msg" data-hid="m3m" hidden></div></div></div>`;
	box.innerHTML =
		(mode === "shared"
			? `<div class="m3top tvstop"><span class="chip name">${esc(def.name)}</span><span class="chip" id="tvsT"></span><span class="chip grow">📱 Play on your phones</span></div><div class="m3lb tvslb" id="tvsLB"></div><div class="m3center"><div class="m3big" id="tvsC"></div></div><div class="tvscards">${humans.map(hud).join("")}</div>`
			: humans.map(hud).join("") +
				cells
					.slice(n)
					.map(
						() =>
							`<div class="tvv tvempty"><div><b>${esc(def.name)}</b><span>📱 Play on your phones</span></div></div>`,
					)
					.join("")) +
		`<div class="m3intro tvsin" id="m3in"><h3>${esc(def.name)}</h3><p>${esc(def.how)}</p><p class="m3ctl">📱 Your phone is the controller.</p></div>
    <div class="m3ready" id="m3r"><h3>Get ready</h3><div id="m3rl"></div><button class="btn ghost" id="m3rs" hidden style="margin-top:8px">Start without the others</button></div>`;
	$("#m3rs").addEventListener("click", () => mgStartCountdown());
	const hold = document.createElement("div");
	hold.className = "tvctlhold";
	hold.hidden = true;
	const simK = humans.some((h) => h.key === mg.simDev) ? mg.simDev : humans[0].key;
	TVS = { mg, def, mode, main: GFX.cam, worlds: [], hold, sz: "" };
	humans.forEach((q, i) => {
		const cam = new THREE.PerspectiveCamera(40, 1, 0.5, 240);
		GFX.cam = cam;
		GFX.mgCam = null;
		start3D(mg, q, false, null, { simK });
		const s = {
			W,
			cam,
			mgCam: null,
			k: q.key,
			hud: box.querySelector(`.tvv[data-w="${i}"]`),
			ctl: null,
			evSeq: 0,
			lastB: undefined,
		};
		if (def.ctrl !== "stick") {
			const c = document.createElement("div");
			c.className = "tvctl";
			document.body.appendChild(c);
			c.innerHTML = def.ctrl === "custom" ? def.ctlHTML() : tapCtlHTML(mg.g, def);
			try {
				if (def.ctrl === "custom") def.wire();
				else wireTap(def);
			} catch (e) {
				console.error(e);
			}
			c.querySelectorAll("[id]").forEach((el) => {
				el.dataset.hid = el.id;
				el.removeAttribute("id");
			});
			hold.appendChild(c);
			s.ctl = c;
		}
		TVS.worlds.push(s);
	});
	box.appendChild(hold);
	["ao", "bloom", "tilt", "vig", "col"].forEach((k) => {
		GFX.fx[k].on = false;
	});
	GFX.cam = TVS.main;
	W = TVS.worlds[0].W;
	setMode("mg");
}
function tvsInput() {
	if (!RT) return;
	let ps;
	try {
		ps = RT.peers();
	} catch (e) {
		return;
	}
	for (const p of ps) {
		const r = p.presence && p.presence.rin;
		if (!r || r.n !== TVS.mg.nonce) continue;
		const s = TVS.worlds.find((x) => x.k === r.k);
		if (!s) continue;
		const i = s.W.inp;
		let x = +r.x || 0,
			y = +r.y || 0;
		const l = Math.hypot(x, y);
		if (l > 1) {
			x /= l;
			y /= l;
		}
		i.x = x;
		i.y = y;
		i.hold = !!r.h;
		if (s.lastB === undefined) s.lastB = r.b;
		else if (r.b !== s.lastB) {
			s.lastB = r.b;
			i.boost = true;
		}
		if (Array.isArray(r.ev) && s.ctl)
			for (const ev of r.ev) {
				if (!Array.isArray(ev) || !(ev[0] > s.evSeq)) continue;
				s.evSeq = ev[0];
				const b = s.ctl.querySelectorAll("button")[ev[1]];
				if (!b) continue;
				const w0 = W;
				W = s.W;
				tvsAct(s, true);
				try {
					b.dispatchEvent(new PointerEvent(ev[2] ? "pointerdown" : "pointerup", { bubbles: true, cancelable: true }));
				} catch (e) {
					console.error(e);
				}
				tvsAct(s, false);
				W = w0;
			}
	}
}
function tvsFrame() {
	const r = GFX.r,
		fw = innerWidth,
		fh = innerHeight,
		T = TVS,
		now = performance.now(),
		real = Math.min(1, (now - (T.last || now)) / 1000);
	T.last = now;
	const steps = Math.max(1, Math.ceil(real / 0.034)),
		grid = T.mode === "grid",
		cells = grid ? tvsCells(T.worlds.length, fw, fh) : T.worlds.map((s, i) => [(i * fw) / 2, 0, fw / 2, fh]);
	tvsInput();
	if (T.sz !== fw + "x" + fh) {
		T.sz = fw + "x" + fh;
		if (T.mode !== "shared")
			[...$("#mg").querySelectorAll(".tvv")].forEach((el, i) => {
				const c = cells[i];
				if (c)
					Object.assign(el.style, { left: c[0] + "px", top: c[1] + "px", width: c[2] + "px", height: c[3] + "px" });
			});
	}
	if (grid) {
		r.setScissorTest(false);
		r.setViewport(0, 0, fw, fh);
		r.setClearColor("#151B24");
		r.clear();
		r.setScissorTest(true);
	}
	try {
		T.worlds.forEach((s, i) => {
			const [x, y, w, h] = cells[i],
				vw = grid ? w : fw,
				vh = grid ? h : fh;
			W = s.W;
			GFX.cam = s.cam;
			GFX.mgCam = s.mgCam;
			GFX.w = vw;
			GFX.h = vh;
			tvsAct(s, true);
			try {
				s.cam.aspect = vw / vh;
				s.cam.clearViewOffset();
				for (let j = 0; j < steps && W === s.W; j++) stepMG(real / steps);
			} catch (e) {
				console.error(e);
			}
			s.mgCam = GFX.mgCam;
			tvsAct(s, false);
			if (TVS !== T || !grid) return;
			r.setViewport(x, fh - y - h, w, h);
			r.setScissor(x, fh - y - h, w, h);
			r.render(s.W.sc, s.cam);
		});
	} finally {
		r.setScissorTest(false);
		r.setViewport(0, 0, fw, fh);
		GFX.w = fw;
		GFX.h = fh;
		if (TVS === T) {
			GFX.cam = T.main;
			W = T.worlds[0].W;
		}
	}
	if (TVS !== T) return;
	if (T.mode === "shared") tvsShared(fw, fh, real);
	else if (T.mode === "dyn") tvsDyn(fw, fh, real);
	tvsSend();
}
/* lane games: everyone is side by side, so the TV shows one wide view of world 0 */
function tvsShared(fw, fh, dt) {
	const T = TVS,
		s0 = T.worlds[0],
		W0 = s0.W,
		cam = T.scam || (T.scam = new THREE.PerspectiveCamera(40, 1, 0.5, 400));
	const ms = T.worlds.map((s) => s.W.me),
		zs = ms.map((e) => e.z),
		zc = zs.reduce((a, b) => a + b, 0) / zs.length,
		spread = Math.max(...zs) - Math.min(...zs);
	const halfW = W0.plist.length * 1.8 + 2.5,
		a = fw / fh,
		tn = Math.tan((20 * Math.PI) / 180),
		D = Math.max((halfW / (tn * a)) * 1.1, (spread / 2 + 5) / tn, 8);
	const cs = T.worlds.filter((s) => s.mgCam),
		aP = new THREE.Vector3(),
		aT = new THREE.Vector3();
	cs.forEach((s) => {
		aP.add(s.mgCam.p);
		aT.add(s.mgCam.t);
	});
	if (cs.length) {
		aP.multiplyScalar(1 / cs.length);
		aT.multiplyScalar(1 / cs.length);
	} else {
		aT.set(0, -1.5, zc - 5);
		aP.set(0, 9, zc + 15);
	}
	const dir = aP.clone().sub(aT);
	dir.x = 0;
	const base = dir.length() || 1;
	dir.normalize();
	const tgt = new THREE.Vector3(0, aT.y, aT.z),
		pos = tgt.clone().addScaledVector(dir, Math.max(base, D));
	if (!T.sp) {
		T.sp = pos.clone();
		T.st = tgt.clone();
	}
	const k = 1 - Math.exp(-dt * 4);
	T.sp.lerp(pos, k);
	T.st.lerp(tgt, k);
	cam.aspect = a;
	cam.updateProjectionMatrix();
	cam.position.copy(T.sp);
	cam.lookAt(T.st);
	cam.updateMatrixWorld();
	const so = W0.def.sun || [14, 26, 12];
	W0.sun.position.set(T.st.x + so[0], so[1], T.st.z + so[2]);
	W0.sun.target.position.copy(T.st);
	GFX.r.render(W0.sc, cam);
	const h0 = s0.hud,
		cp = (id, sel, html) => {
			const a = document.getElementById(id),
				b = h0 && h0.querySelector(sel);
			if (a && b) {
				const v = html ? b.innerHTML : b.textContent;
				if (html ? a.innerHTML !== v : a.textContent !== v) html ? (a.innerHTML = v) : (a.textContent = v);
			}
		};
	cp("tvsT", '[data-hid="m3t"]');
	cp("tvsC", '[data-hid="m3c"]');
	cp("tvsLB", '[data-hid="m3lb"]', true);
}
/* Drift Race with two drivers: each half follows its own driver; when they're close the cameras blend into one view and the divider fades away */
function tvsDyn(fw, fh, dt) {
	const T = TVS,
		r = GFX.r,
		[A, B] = T.worlds;
	if (!A.mgCam || !B.mgCam) return;
	const a = A.W.me,
		b = B.W.me,
		d = Math.hypot(a.x - b.x, a.z - b.z, (a.y || 0) - (b.y || 0));
	const mt = d < 12 ? 1 : d > 26 ? 0 : 1 - (d - 12) / 14;
	T.m = T.m === undefined ? mt : T.m + (mt - T.m) * Math.min(1, dt * 2.5);
	const m = T.m * T.m * (3 - 2 * T.m);
	const P = A.mgCam.p.clone().add(B.mgCam.p).multiplyScalar(0.5),
		Tg = A.mgCam.t.clone().add(B.mgCam.t).multiplyScalar(0.5);
	P.addScaledVector(P.clone().sub(Tg).normalize(), Math.min(d, 26) * 0.35);
	const sc = T.scam || (T.scam = new THREE.PerspectiveCamera(40, 1, 0.5, 240));
	sc.aspect = fw / fh;
	sc.clearViewOffset();
	sc.updateProjectionMatrix();
	sc.position.copy(P);
	sc.lookAt(Tg);
	sc.updateMatrixWorld();
	const va = new THREE.Vector3(a.x, a.y || 0, a.z).project(sc),
		vb = new THREE.Vector3(b.x, b.y || 0, b.z).project(sc);
	let nx = (vb.x - va.x) * fw,
		ny = (vb.y - va.y) * fh;
	const nl = Math.hypot(nx, ny);
	if (!(nl > 1) || va.z > 1 || vb.z > 1) {
		nx = T.nx || 1;
		ny = T.ny || 0;
	} else {
		nx /= nl;
		ny /= nl;
	}
	if (T.nx === undefined) {
		T.nx = nx;
		T.ny = ny;
	} else {
		const kk = Math.min(1, dt * 4);
		T.nx += (nx - T.nx) * kk;
		T.ny += (ny - T.ny) * kk;
		const l = Math.hypot(T.nx, T.ny) || 1;
		T.nx /= l;
		T.ny /= l;
	}
	const R = (Math.abs(T.nx) * fw + Math.abs(T.ny) * fh) * 0.25 * (1 - m);
	[
		[A, 1],
		[B, -1],
	].forEach(([s, sg]) => {
		const c = s.cam;
		c.aspect = fw / fh;
		c.position.copy(s.mgCam.p).lerp(P, m);
		c.lookAt(s.mgCam.t.clone().lerp(Tg, m));
		c.setViewOffset(fw, fh, sg * T.nx * R, -sg * T.ny * R, fw, fh);
		c.updateMatrixWorld();
		const so = s.W.def.sun || [14, 26, 12],
			t = s.mgCam.t;
		s.W.sun.position.set(t.x + so[0], so[1], t.z + so[2]);
		s.W.sun.target.position.copy(t);
	});
	r.render(A.W.sc, A.cam);
	$("#mg").classList.toggle("tvmerged", m > 0.985);
	if (m > 0.985) return;
	const pr = r.getPixelRatio(),
		rw = Math.round(fw * pr),
		rh = Math.round(fh * pr);
	if (!T.rt || T.rt.width !== rw || T.rt.height !== rh) {
		if (T.rt) T.rt.dispose();
		T.rt = new THREE.WebGLRenderTarget(rw, rh, { stencilBuffer: true });
	}
	if (!T.qs) {
		T.qm = new THREE.ShaderMaterial({
			uniforms: {
				tex: { value: null },
				n: { value: new THREE.Vector2() },
				res: { value: new THREE.Vector2() },
				lw: { value: 6 },
				al: { value: 1 },
			},
			depthTest: false,
			depthWrite: false,
			vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
			fragmentShader:
				"uniform sampler2D tex; uniform vec2 n, res; uniform float lw, al; varying vec2 vUv; void main() { float s = dot(gl_FragCoord.xy - res * 0.5, n); if (s < 0.0) discard; vec4 c = texture2D(tex, vUv); if (s < lw) c.rgb = mix(c.rgb, vec3(0.08, 0.1, 0.14), al); gl_FragColor = c; }",
		});
		T.qs = new THREE.Scene();
		T.qs.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), T.qm));
		T.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	}
	T.rt.texture.encoding = B.W.sc.userData.lk ? THREE.sRGBEncoding : THREE.LinearEncoding;
	r.setRenderTarget(T.rt);
	r.render(B.W.sc, B.cam);
	r.setRenderTarget(null);
	const u = T.qm.uniforms;
	u.tex.value = T.rt.texture;
	u.n.value.set(T.nx, T.ny);
	u.res.value.set(rw, rh);
	u.lw.value = 5 * pr;
	u.al.value = Math.min(1, (1 - m) * 3);
	r.autoClear = false;
	r.render(T.qs, T.qc);
	r.autoClear = true;
}
function tvsSend() {
	const now = performance.now();
	if (now - (TVS.lastSend || 0) < 120 || !RT) return;
	TVS.lastSend = now;
	const l = {},
		w0 = W;
	TVS.worlds.forEach((s) => {
		W = s.W;
		const D = W.def,
			hi = D.liveHi !== undefined ? D.liveHi : D.hi,
			order = W.list.filter((e) => !e.gone).sort((a, b) => (hi ? b.sc - a.sc : a.sc - b.sc));
		tvsAct(s, true);
		const st = tvStatus(W, W.me, order);
		if (s.ctl) st[7] = mirSnap(s.ctl)[2];
		tvsAct(s, false);
		l[s.k] = st;
	});
	W = w0;
	RT.presence({ tvs: { n: TVS.mg.nonce, l } }).catch(() => {});
}
function tvsStop() {
	const T = TVS;
	if (!T) return;
	TVS = null;
	T.worlds.forEach((s) => {
		W = s.W;
		GFX.cam = s.cam;
		try {
			if (W.def.stop) W.def.stop(W);
		} catch (e) {}
		try {
			W.sc.traverse((o) => {
				if (o.geometry) o.geometry.dispose();
			});
		} catch (e) {}
	});
	if (T.rt) T.rt.dispose();
	W = null;
	GFX.cam = T.main;
	GFX.mgCam = null;
	camFov(40);
	rtLeave();
	T.hold.remove();
	$("#mg").classList.remove("tvsplit", "tvgrid", "tvshared", "tvdyn", "tvmerged");
	setMode(view === "game" ? "board" : view === "over" ? "podium" : "show");
}
/* mirror the TV's copy of a player's controls onto their phone (keeps button elements so presses stay wired) */
function mirSnap(n) {
	if (n.nodeType === 3) return n.nodeValue;
	if (n.nodeType !== 1) return null;
	const a = {};
	for (const at of n.attributes) if (at.name !== "id" && at.name !== "data-hid") a[at.name] = at.value;
	return [n.tagName.toLowerCase(), a, [...n.childNodes].map(mirSnap).filter((x) => x !== null)];
}
function mirBuild(sn) {
	if (typeof sn === "string") return document.createTextNode(sn);
	const el = document.createElement(sn[0]);
	for (const k in sn[1]) {
		try {
			el.setAttribute(k, sn[1][k]);
		} catch (e) {}
	}
	sn[2].forEach((c) => el.appendChild(mirBuild(c)));
	return el;
}
function mirKids(par, kids) {
	if (!Array.isArray(kids)) return;
	kids.forEach((sn, i) => {
		const cur = par.childNodes[i];
		if (typeof sn === "string") {
			if (cur && cur.nodeType === 3) {
				if (cur.nodeValue !== sn) cur.nodeValue = sn;
			} else if (cur) par.replaceChild(mirBuild(sn), cur);
			else par.appendChild(mirBuild(sn));
			return;
		}
		if (!Array.isArray(sn)) return;
		if (cur && cur.nodeType === 1 && cur.tagName.toLowerCase() === sn[0]) {
			for (const at of [...cur.attributes]) if (at.name !== "id" && !(at.name in sn[1])) cur.removeAttribute(at.name);
			for (const k in sn[1])
				if (cur.getAttribute(k) !== sn[1][k]) {
					try {
						cur.setAttribute(k, sn[1][k]);
					} catch (e) {}
				}
			mirKids(cur, sn[2]);
		} else if (cur) par.replaceChild(mirBuild(sn), cur);
		else par.appendChild(mirBuild(sn));
	});
	while (par.childNodes.length > kids.length) par.removeChild(par.lastChild);
}
