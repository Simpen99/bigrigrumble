/* ---------- world helpers ---------- */
function stripeTex() {
	return canvasTex(256, 32, (x, w, h) => {
		for (let i = 0; i < 16; i++) {
			x.fillStyle = i % 2 ? "#151B24" : "#FFC83D";
			x.beginPath();
			x.moveTo(i * 16, h);
			x.lineTo(i * 16 + 16, 0);
			x.lineTo(i * 16 + 32, 0);
			x.lineTo(i * 16 + 16, h);
			x.fill();
		}
	});
}
function barrierRing(s, h) {
	for (let i = -h; i < h; i += 2)
		[
			[i + 1, -h - 0.5, 0],
			[i + 1, h + 0.5, 0],
			[-h - 0.5, i + 1, 1],
			[h + 0.5, i + 1, 1],
		].forEach(([x, z, r], k) => {
			const b = B(r ? 0.5 : 1.9, 0.7, r ? 1.9 : 0.5, ((i + h) / 2 + k) % 2 ? "#E5484D" : "#F4F6F9", x, 0.35, z);
			s.add(b);
		});
}
function lot(s, h, col) {
	const f = B(h * 2 + 2, 1, h * 2 + 2, col, 0, -0.5, 0);
	f.castShadow = false;
	s.add(f);
	for (let i = -h + 3; i < h; i += 4) {
		const l = B(0.12, 0.04, 3, "#E9EDF2", i, 0.03, -h + 2.5);
		l.castShadow = false;
		s.add(l);
		const l2 = l.clone();
		l2.position.z = h - 2.5;
		s.add(l2);
	}
}
function ringSpawn(r) {
	return (W, i, n) => {
		const a = (i / n) * Math.PI * 2 + Math.PI / 2;
		const x = Math.cos(a) * r,
			z = Math.sin(a) * r;
		return { x, z, yaw: Math.atan2(z, -x) };
	};
}
function nearestItem(W, e, items, ok) {
	let best = null,
		bd = 1e9;
	items.forEach((it) => {
		if (!ok(it)) return;
		const d = Math.hypot(it.x - e.x, it.z - e.z);
		if (d < bd) {
			bd = d;
			best = it;
		}
	});
	return best;
}
function wander(W, e, dt, r) {
	e.wt = (e.wt || 0) - dt;
	if (e.wt <= 0 || !e.wp) {
		e.wp = [(Math.random() - 0.5) * 2 * r, (Math.random() - 0.5) * 2 * r];
		e.wt = 1.5 + Math.random() * 2;
	}
	return steer(e, e.wp[0], e.wp[1], 0.85);
}
function botRam(W, e, inp, r = 3.2) {
	const t = W.list.find((o) => o !== e && !o.gone && o.al && !o.d && Math.hypot(o.x - e.x, o.z - e.z) < r);
	if (t && e.bcd <= 0 && W.t > 2.5 && Math.random() < 0.012) {
		const s = steer(e, t.x + (Math.random() - 0.5) * 2.2, t.z + (Math.random() - 0.5) * 2.2, 1);
		s.boost = true;
		return s;
	}
	return inp;
}
function laneWorld(W, len, extra) {
	const s = W.sc,
		n = W.plist.length,
		LW = (extra && extra.lw) || 3.6;
	W.laneX = (i) => (i - (n - 1) / 2) * LW;
	W.len = len;
	const wid = n * LW;
	s.add(texBox(wid + 0.6, 0.1, len + 30, asphaltTex(), 8, 0, 0.05, -len / 2 + 5));
	roadWear(s, -wid / 2 - 0.3, wid / 2 + 0.3, 20, -len - 10, 0.101);
	autoTracks(W, "#9DA0A6", 0.112);
	if (!W.def.bare) {
		kerbs(s, -wid / 2 - 0.3, wid / 2 + 0.3, 20, -len - 10, "race");
		vergeScatter(
			s,
			[
				[-wid / 2 - 14, -wid / 2 - 1.1],
				[wid / 2 + 1.1, wid / 2 + 14],
			],
			24,
			-len - 20,
			Math.round(len * 6),
		);
	}
	roadLines(
		s,
		Array.from({ length: n + 1 }, (_, i) => (i - n / 2) * LW),
		20,
		-len - 10,
		0.104,
		{ w: 0.12 },
	);
	const chk = new THREE.Mesh(
		new THREE.PlaneGeometry(wid, 1.2),
		new THREE.MeshBasicMaterial({
			map: canvasTex(256, 32, (x, w, h) => {
				for (let i = 0; i < 32; i++)
					for (let j = 0; j < 4; j++) {
						x.fillStyle = (i + j) % 2 ? "#151B24" : "#fff";
						x.fillRect(i * 8, j * 8, 8, 8);
					}
			}),
		}),
	);
	chk.rotation.x = -Math.PI / 2;
	chk.material.polygonOffset = true;
	chk.material.polygonOffsetFactor = -2;
	chk.position.set(0, 0.106, -1.2);
	s.add(chk);
	for (let z = 30; z > -len - 120; z -= 38)
		[-1, 1].forEach((sd) => {
			const h = 12 + Math.random() * 12,
				r = 8 + Math.random() * 6,
				x = sd * (wid / 2 + 34 + Math.random() * 22);
			const m = Cy(0, r, h, 6, Math.random() < 0.5 ? "#6F8C6B" : "#7F9A77", x, h / 2 - 0.5, z);
			m.castShadow = false;
			s.add(m);
			if (h > 17) {
				const c = Cy(0, r * 0.32, h * 0.32, 6, "#F4F7FA", x, h - h * 0.16 - 0.5, z);
				c.castShadow = false;
				s.add(c);
			}
		});
	if (!(extra && extra.noTrees))
		for (let z = 10; z > -len - 20; z -= 11) {
			s.add(tree(-wid / 2 - 3 - Math.random() * 6, z + Math.random() * 4, 0.9 + Math.random() * 0.6));
			s.add(tree(wid / 2 + 3 + Math.random() * 6, z + Math.random() * 4, 0.9 + Math.random() * 0.6));
		}
	return wid;
}
const laneSpawn = (W, i) => ({ x: W.laneX(i), z: 0, yaw: Math.PI / 2 });
/* grandstands along both sides of a lane track, packed with instanced spectators */
function grandstands(W, wid, z0, z1) {
	const s = W.sc,
		L = z0 - z1,
		zc = (z0 + z1) / 2,
		ROWS = 4,
		ppl = [];
	const ban = canvasTex(256, 32, (x, w, h) => {
		x.fillStyle = "#151B24";
		x.fillRect(0, 0, w, h);
		x.fillStyle = "#FFC83D";
		x.fillRect(0, 0, 8, h);
		x.fillRect(128, 0, 8, h);
		x.font = "20px Bungee, 'Arial Black', Impact, sans-serif";
		x.textBaseline = "middle";
		x.fillStyle = "#FFFFFF";
		x.fillText("BIG RIG", 16, h / 2 + 1);
		x.fillStyle = "#FF6FAE";
		x.fillText("RUMBLE", 144, h / 2 + 1);
	});
	ban.wrapS = THREE.RepeatWrapping;
	ban.repeat.set(L / 9, 1);
	[-1, 1].forEach((sd) => {
		const wx = sd * (wid / 2 + 1.1);
		s.add(B(0.3, 1.2, L, "#D9DEE7", wx, 0.6, zc));
		const bm = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.9), new THREE.MeshBasicMaterial({ map: ban }));
		bm.rotation.y = (-sd * Math.PI) / 2;
		bm.position.set(wx - sd * 0.18, 0.62, zc);
		s.add(bm);
		for (let r = 0; r < ROWS; r++) {
			const h = 0.7 + r * 0.65,
				x = sd * (wid / 2 + 2.3 + r * 1.3);
			const st = B(1.3, h, L, r % 2 ? "#8C95A5" : "#A3ACBB", x, h / 2, zc);
			st.castShadow = false;
			s.add(st);
			for (let z = z0 - 0.5; z > z1; z -= 0.85 + W.rng() * 0.3)
				if (W.rng() > 0.12)
					ppl.push({ x: x + (W.rng() - 0.5) * 0.25, y: h, z, sd, ph: W.rng() * 6.28, sp: 7 + W.rng() * 5 });
		}
		const back = B(0.4, 4.6, L, "#6F7888", sd * (wid / 2 + 2.3 + ROWS * 1.3 - 0.45), 2.3, zc);
		back.castShadow = false;
		s.add(back);
		const roof = B(
			ROWS * 1.3 + 1.4,
			0.25,
			L,
			sd < 0 ? "#E5484D" : "#2F7DE1",
			sd * (wid / 2 + 2.3 + (ROWS - 1) * 0.65),
			5.5,
			zc,
		);
		roof.castShadow = false;
		s.add(roof);
		for (let z = z0; z > z1; z -= 20) s.add(B(0.25, 5.4, 0.25, "#D9DEE7", sd * (wid / 2 + 1.75), 2.7, z));
	});
	crowdMeshes(W, ppl);
}
function crowdMeshes(W, ppl) {
	// instanced spectators; each q has x, y, z, ph, sp and either sd (side of a straight stand) or face (yaw)
	const s = W.sc,
		N = ppl.length,
		SHIRT = ["#E5484D", "#2F7DE1", "#FFC83D", "#1FA35C", "#FF6FAE", "#8E5CF0", "#FF8A1F", "#F4F6F9", "#26C6DA"],
		SKIN = ["#F2C9A0", "#D9A273", "#A8714A", "#6E4A2E", "#FFE0C2"];
	const inst = (geo, n, cols) => {
		const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8 }), n);
		const c = new THREE.Color();
		for (let i = 0; i < n; i++) m.setColorAt(i, c.set(cols(i)));
		m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		m.frustumCulled = false;
		s.add(m);
		return m;
	};
	const arm = new THREE.BoxGeometry(0.12, 0.5, 0.12);
	arm.translate(0, -0.22, 0);
	const body = inst(new THREE.BoxGeometry(0.34, 0.55, 0.46), N, (i) => SHIRT[(i * 7 + (i >> 3)) % SHIRT.length]);
	const head = inst(new THREE.IcosahedronGeometry(0.18, 1), N, (i) => SKIN[(i * 5 + (i >> 2)) % SKIN.length]);
	const arms = inst(arm, N * 2, (i) => SHIRT[((i >> 1) * 7 + (i >> 4)) % SHIRT.length]);
	W.crowd = { ppl, body, head, arms, o: new THREE.Object3D() };
}
function crowdStep(W, focusZ, hype) {
	// focusZ null: everyone equally excited
	const C = W.crowd;
	if (!C) return;
	const o = C.o,
		t = W.t;
	C.ppl.forEach((q, i) => {
		const near = focusZ === null ? 0.7 : Math.max(0, 1 - Math.abs(q.z - focusZ) / 45),
			ex = Math.min(1, 0.15 + near * (0.35 + hype * 0.65)),
			j = Math.abs(Math.sin(t * q.sp + q.ph)) * 0.32 * ex,
			y = q.y + j,
			face = q.face !== undefined ? q.face : (-q.sd * Math.PI) / 2;
		o.rotation.set(0, face, 0, "YXZ");
		o.position.set(q.x, y + 0.28, q.z);
		o.updateMatrix();
		C.body.setMatrixAt(i, o.matrix);
		o.position.y = y + 0.72;
		o.updateMatrix();
		C.head.setMatrixAt(i, o.matrix);
		const up = ex > 0.45 ? 2.6 + Math.sin(t * q.sp * 0.8 + q.ph) * 0.45 : 0.25 + j;
		[-1, 1].forEach((a, k) => {
			o.rotation.set(0, face, a * up, "YXZ");
			o.position.set(q.x + Math.cos(face) * a * 0.24, y + 0.5, q.z - Math.sin(face) * a * 0.24);
			o.updateMatrix();
			C.arms.setMatrixAt(i * 2 + k, o.matrix);
		});
	});
	C.body.instanceMatrix.needsUpdate = C.head.instanceMatrix.needsUpdate = C.arms.instanceMatrix.needsUpdate = true;
}
/* looping synth engine + crowd noise, pitched by speed */
function engineSnd() {
	if (!SFX.on || !SFX.ctx || SFX.ctx.state !== "running") return null;
	const c = SFX.ctx,
		o = c.createOscillator(),
		o2 = c.createOscillator(),
		lp = c.createBiquadFilter(),
		g = c.createGain();
	o.type = "sawtooth";
	o2.type = "square";
	o.frequency.value = 50;
	o2.frequency.value = 25;
	lp.type = "lowpass";
	lp.frequency.value = 400;
	g.gain.value = 0;
	o.connect(lp);
	o2.connect(lp);
	lp.connect(g);
	g.connect(SFX.out);
	o.start();
	o2.start();
	const len = c.sampleRate * 2,
		buf = c.createBuffer(1, len, c.sampleRate),
		ch = buf.getChannelData(0);
	for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
	const n = c.createBufferSource(),
		bp = c.createBiquadFilter(),
		ng = c.createGain();
	n.buffer = buf;
	n.loop = true;
	bp.type = "bandpass";
	bp.frequency.value = 900;
	bp.Q.value = 0.6;
	ng.gain.value = 0;
	n.connect(bp);
	bp.connect(ng);
	ng.connect(SFX.out);
	n.start();
	return {
		set(spd, crowd, on) {
			const t = c.currentTime;
			o.frequency.setTargetAtTime(48 + spd * 150, t, 0.06);
			o2.frequency.setTargetAtTime(24 + spd * 75, t, 0.06);
			lp.frequency.setTargetAtTime(350 + spd * 1600, t, 0.08);
			g.gain.setTargetAtTime(on ? 0.05 + spd * 0.09 : 0, t, 0.15);
			ng.gain.setTargetAtTime(crowd, t, 0.25);
		},
		stop() {
			try {
				o.stop();
				o2.stop();
				n.stop();
			} catch (e) {}
		},
	};
}
/* tyre marks: an instanced pool of little stripes behind moving trucks that fade into the ground colour */
/* mul: the marks multiply the ground below (col = darkening factor, ground = "#FFFFFF"), so they match it under any lighting or shadow and fade out cleanly */
function tyreTracks(W, col, ground, N = 260, fade = 10, op = 1, mul = false) {
	const m = new THREE.InstancedMesh(
			new THREE.PlaneGeometry(0.26, 0.5),
			new THREE.MeshBasicMaterial({
				transparent: mul || op < 1,
				opacity: op,
				blending: mul ? THREE.MultiplyBlending : THREE.NormalBlending,
				premultipliedAlpha: mul,
				stencilWrite: mul,
				stencilRef: 1,
				stencilFunc: THREE.NotEqualStencilFunc,
				stencilZPass: THREE.ReplaceStencilOp,
				/* stencil: each pixel is darkened once, so overlapping marks do not stack */ depthWrite: false,
				polygonOffset: true,
				polygonOffsetFactor: -2,
				polygonOffsetUnits: -4,
			}),
			N,
		),
		o = new THREE.Object3D(),
		c = new THREE.Color(col);
	o.scale.setScalar(0);
	o.updateMatrix();
	for (let i = 0; i < N; i++) {
		m.setMatrixAt(i, o.matrix);
		m.setColorAt(i, c);
	}
	m.frustumCulled = false;
	m.renderOrder = 1;
	W.sc.add(m);
	return {
		m,
		N,
		n: 0,
		fade,
		age: new Float32Array(N).fill(99),
		col: c,
		ground: new THREE.Color(ground),
		o,
		t: new THREE.Color(),
	};
}
function tyreMark(T, x, z, yaw, y = 0.02, len = 0.5) {
	const i = T.n++ % T.N;
	T.o.position.set(x, y + (i % 50) * 0.0002, z);
	T.o.rotation.set(-Math.PI / 2, yaw - Math.PI / 2, 0, "YXZ");
	T.o.scale.set(1, len / 0.5, 1);
	T.o.updateMatrix();
	T.m.setMatrixAt(i, T.o.matrix);
	T.age[i] = 0;
	T.m.instanceMatrix.needsUpdate = true;
}
/* joined-up tyre lines: each rear wheel lays a segment from where its last mark ended, so marks stay connected through tight turns; on = false, no call for 0.15 s, or a jump of 3+ breaks the line */
function wheelTrack(T, e, on, t, y = 0.02, step = 0.32) {
	const P = T.pv || (T.pv = {}),
		fx = Math.cos(e.yaw),
		fz = -Math.sin(e.yaw),
		wp = [-0.5, 0.5].map((sd) => [e.x - fx * 0.75 - fz * sd, e.z - fz * 0.75 + fx * sd]),
		q = P[e.k];
	if (!on || !q || t - q.t > 0.15) {
		P[e.k] = on ? { w: wp, t } : null;
		return;
	}
	q.t = t;
	wp.forEach((p, k) => {
		const o = q.w[k],
			dx = p[0] - o[0],
			dz = p[1] - o[1],
			l = Math.hypot(dx, dz);
		if (l > 3) {
			q.w[k] = p;
			return;
		}
		if (l < step) return;
		tyreMark(T, (p[0] + o[0]) / 2, (p[1] + o[1]) / 2, Math.atan2(-dz, dx), y, l + 0.03);
		q.w[k] = p;
	});
}
function tyreStep(W, T, dt, y = 0.02, only) {
	W.list.forEach((e) => {
		const sp = Math.hypot(e.vx || 0, e.vz || 0);
		wheelTrack(T, e, !((only && !only(e)) || e.gone || e.falling || e.fly || !e.al || e.y > 0.2) && sp >= 1.5, W.t, y);
	});
	tyreFade(T, dt);
}
function tyreFade(T, dt) {
	/* smooth fade along the whole trail: by age, and by place in the buffer so the oldest ~2/3 always grades out before marks get reused */
	let ch = false;
	const nw = T.n - 1;
	for (let i = 0; i < T.N; i++) {
		if (T.age[i] > T.fade) continue;
		T.age[i] += dt;
		const r = ((((nw - i) % T.N) + T.N) % T.N) / T.N,
			k = Math.min(1, Math.max(T.age[i] / T.fade, (r - 0.35) / 0.65));
		T.m.setColorAt(i, T.t.copy(T.col).lerp(T.ground, k));
		if (k >= 1) {
			T.age[i] = 99;
			T.o.scale.setScalar(0);
			T.o.updateMatrix();
			T.m.setMatrixAt(i, T.o.matrix);
			T.m.instanceMatrix.needsUpdate = true;
		}
		ch = true;
	}
	if (ch) T.m.instanceColor.needsUpdate = true;
}
/* ripple rings on a liquid surface: returns spawn(x, y, z, r0, r1, life); call rippleStep once per frame */
function ripples(W, col) {
	const L = (W.ripL = []);
	return (x, y, z, r0, r1, life) => {
		let q = L.find((q) => q.t >= q.life);
		if (!q) {
			if (L.length > 36) return;
			q = {
				mesh: new THREE.Mesh(
					new THREE.RingGeometry(0.86, 1, 28),
					new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
				),
			};
			q.mesh.rotation.x = -Math.PI / 2;
			W.sc.add(q.mesh);
			L.push(q);
		}
		Object.assign(q, { t: 0, life, r0, r1 });
		q.mesh.position.set(x, y, z);
		q.mesh.visible = true;
		q.mesh.scale.setScalar(r0);
	};
}
function rippleStep(W, dt) {
	(W.ripL || []).forEach((q) => {
		if (q.t >= q.life) {
			q.mesh.visible = false;
			return;
		}
		q.t += dt;
		const k = Math.min(1, q.t / q.life);
		q.mesh.scale.setScalar(q.r0 + (q.r1 - q.r0) * k);
		q.mesh.material.opacity = 0.65 * (1 - k);
	});
}
/* soft billowing puffs (dust, smoke): returns spawn(x, y, z, size, rise, life); call puffStep once per frame */
function puffs(W, col) {
	const L = (W.puffL = W.puffL || []),
		tex = canvasTex(64, 64, (x, w, h) => {
			const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
			g.addColorStop(0, "rgba(255,255,255,.95)");
			g.addColorStop(0.55, "rgba(255,255,255,.4)");
			g.addColorStop(1, "rgba(255,255,255,0)");
			x.fillStyle = g;
			x.fillRect(0, 0, w, h);
		});
	return (x, y, z, size, rise, life) => {
		let q = L.find((q) => q.t >= q.life);
		if (!q) {
			if (L.length > 80) return;
			q = {
				sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, depthWrite: false })),
			};
			W.sc.add(q.sp);
			L.push(q);
		}
		Object.assign(q, { t: 0, life, size, rise, vx: (Math.random() - 0.5) * 0.8, vz: (Math.random() - 0.5) * 0.8 });
		q.sp.material.color.set(col);
		q.sp.position.set(x, y, z);
		q.sp.visible = true;
	};
}
function puffStep(W, dt) {
	(W.puffL || []).forEach((q) => {
		if (q.t >= q.life) {
			q.sp.visible = false;
			return;
		}
		q.t += dt;
		const k = q.t / q.life;
		q.sp.position.x += q.vx * dt;
		q.sp.position.z += q.vz * dt;
		q.sp.position.y += q.rise * (1 - k * 0.6) * dt;
		q.sp.scale.setScalar(q.size * (0.5 + k * 1.1));
		q.sp.material.opacity = Math.min(1, k * 5) * (1 - k) * 0.75;
	});
}
function gantry(s, wid, z, h, col) {
	s.add(
		B(0.4, h, 0.4, "#555C69", -wid / 2 - 0.6, h / 2, z),
		B(0.4, h, 0.4, "#555C69", wid / 2 + 0.6, h / 2, z),
		B(wid + 1.6, 0.6, 0.5, col, 0, h, z),
	);
}

/* ---------- 12 live 3D minigames ---------- */
const MG = {
	bumper: {
		name: "Mud Brawl",
		kind: "arena",
		ctrl: "stick",
		hi: true,
		unit: "pts",
		dur: 60,
		lastStanding: true,
		bound: { t: "fall" },
		water: false,
		bare: true,
		fallY: -5,
		MUD: -2.2,
		how: "Ram everyone off the stage into the mud. The stage shrinks! Last truck standing wins.",
		R: (t) => (t < 20 ? 11 : Math.max(5, 11 - (t - 20) * 0.15)),
		build(W) {
			const g = new THREE.Group();
			g.add(Cy(11, 11.4, 1.4, 40, "#8A6A48", 0, -0.7, 0), Cy(10.4, 11.4, 2.2, 40, "#6B4F35", 0, -1.3, 0));
			const rim = new THREE.Mesh(
				new THREE.CylinderGeometry(11.05, 11.05, 0.5, 40, 1, true),
				new THREE.MeshStandardMaterial({
					map: canvasTex(256, 32, (x, w, h) => {
						for (let i = 0; i < 16; i++) {
							x.fillStyle = i % 2 ? "#E5484D" : "#FFC83D";
							x.fillRect(i * 16, 0, 16, h);
						}
					}),
					side: THREE.DoubleSide,
				}),
			);
			rim.position.y = -0.2;
			g.add(rim);
			g.add(Cy(3, 3, 0.06, 24, "#E5484D", 0, 0.03, 0));
			g.add(Cy(2.6, 2.6, 0.06, 24, "#FFC83D", 0, 0.06, 0));
			W.sc.add(g);
			W.plat = g;
			this.bowl(W);
		},
		bowl(W) {
			// Crusher's monster-truck arena: mud pit, ring of stands with a crowd, flags, crushed cars, fire jets, floodlights
			const s = W.sc,
				r = mulberry((W.mg.seed || 1) + 41),
				R0 = 17;
			const mud = new THREE.Mesh(
				new THREE.CircleGeometry(R0 + 1, 44),
				new THREE.MeshStandardMaterial({ color: "#4A3524", roughness: 0.28, metalness: 0.05, flatShading: true }),
			);
			const mp = mud.geometry.attributes.position;
			{
				const hz = {};
				for (let i = 0; i < mp.count; i++) {
					const key = Math.round(mp.getX(i) * 100) + "," + Math.round(mp.getY(i) * 100);
					if (hz[key] === undefined) hz[key] = r() * 0.35;
					mp.setZ(i, hz[key]);
				}
			}
			mud.geometry.computeVertexNormals();
			mud.rotation.x = -Math.PI / 2;
			mud.position.y = this.MUD;
			s.add(mud);
			mud.material.transparent = true;
			mud.material.opacity = 0.62;
			mud.material.depthWrite = false;
			mud.renderOrder = 2;
			mud.receiveShadow = true;
			[
				[-0.45, "#3A2A1C", 0.7],
				[-0.95, "#22180F", 1],
			].forEach(([dy, col, op]) => {
				const l = new THREE.Mesh(
					new THREE.CircleGeometry(R0 + 1, 44),
					new THREE.MeshStandardMaterial({
						color: col,
						roughness: 0.6,
						transparent: op < 1,
						opacity: op,
						depthWrite: op >= 1,
					}),
				);
				l.rotation.x = -Math.PI / 2;
				l.position.y = this.MUD + dy;
				l.renderOrder = op < 1 ? 1 : 0;
				l.receiveShadow = true;
				s.add(l);
			});
			const ban = canvasTex(256, 32, (x, w, h) => {
				x.fillStyle = "#151B24";
				x.fillRect(0, 0, w, h);
				x.font = "20px Bungee, 'Arial Black', Impact, sans-serif";
				x.textBaseline = "middle";
				x.fillStyle = "#E5484D";
				x.fillText("CRUSHER", 12, h / 2 + 1);
				x.fillStyle = "#FFC83D";
				x.fillText("MUD BOWL", 134, h / 2 + 1);
			});
			ban.wrapS = THREE.RepeatWrapping;
			ban.repeat.set(-9, 1);
			const wall = new THREE.Mesh(
				new THREE.CylinderGeometry(R0, R0, 3.4, 48, 1, true),
				new THREE.MeshStandardMaterial({ color: "#C9CED8", side: THREE.BackSide }),
			);
			wall.position.y = -0.5;
			s.add(wall);
			{
				const cap = new THREE.Mesh(
					new THREE.RingGeometry(R0 - 0.08, R0 + 0.5, 48),
					M("#A3ACBB", { side: THREE.DoubleSide }),
				);
				cap.rotation.x = -Math.PI / 2;
				cap.position.y = 1.2;
				s.add(cap);
			}
			const bw = new THREE.Mesh(
				new THREE.CylinderGeometry(R0 - 0.05, R0 - 0.05, 1, 48, 1, true),
				new THREE.MeshBasicMaterial({ map: ban, side: THREE.BackSide }),
			);
			bw.position.y = 0.4;
			s.add(bw);
			const ppl = [];
			for (let k = 0; k < 4; k++) {
				const rr = R0 + 1 + k * 1.3,
					h = 1.2 + k * 0.65,
					st = new THREE.Mesh(
						new THREE.CylinderGeometry(rr - 0.65, rr - 0.65, h, 48, 1, true),
						M(k % 2 ? "#8C95A5" : "#A3ACBB", { side: THREE.DoubleSide }),
					);
				st.position.y = h / 2 - 0.1;
				s.add(st);
				if (k === 3) {
					const bk = new THREE.Mesh(
						new THREE.CylinderGeometry(rr + 0.65, rr + 0.65, h, 48, 1, true),
						M("#8C95A5", { side: THREE.DoubleSide }),
					);
					bk.position.y = h / 2 - 0.1;
					s.add(bk);
				}
				const top = new THREE.Mesh(
					new THREE.RingGeometry(rr - 0.65, rr + 0.65, 48),
					M(k % 2 ? "#8C95A5" : "#A3ACBB", { side: THREE.DoubleSide }),
				);
				top.rotation.x = -Math.PI / 2;
				top.position.y = h - 0.1;
				s.add(top);
				const n = Math.floor((rr * 6.28) / 0.9);
				for (let i = 0; i < n; i++) {
					if (r() < 0.12) continue;
					const a = (i / n) * 6.283 + r() * 0.05;
					ppl.push({
						x: Math.cos(a) * rr,
						y: h - 0.1,
						z: Math.sin(a) * rr,
						face: Math.atan2(-Math.cos(a), -Math.sin(a)),
						ph: r() * 6.28,
						sp: 7 + r() * 5,
					});
				}
			}
			crowdMeshes(W, ppl);
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * 6.283 + 0.39,
					x = Math.cos(a) * (R0 + 6.6),
					z = Math.sin(a) * (R0 + 6.6);
				s.add(B(0.5, 12, 0.5, "#5A6272", x, 6, z), B(2.6, 1.2, 0.6, "#F4F6F9", x, 12.3, z));
				const fl = new THREE.Mesh(
					new THREE.PlaneGeometry(2.4, 1.4),
					M(i % 2 ? "#E5484D" : "#FFC83D", { side: THREE.DoubleSide }),
				);
				fl.position.set(x + Math.cos(a) * 1.3, 9.6, z + Math.sin(a) * 1.3);
				fl.rotation.y = -a;
				s.add(fl);
			}
			W.jets = [];
			for (let i = 0; i < 4; i++) {
				const a = (i / 4) * 6.283 + 0.79,
					x = Math.cos(a) * (R0 - 1.3),
					z = Math.sin(a) * (R0 - 1.3);
				s.add(Cy(0.7, 0.9, 1.4, 10, "#2A2F3A", x, this.MUD + 0.9, z));
				const pile = new THREE.Group();
				pile.position.set(Math.cos(a + 0.35) * (R0 - 2), this.MUD, Math.sin(a + 0.35) * (R0 - 2));
				for (let k = 0; k < 3; k++) {
					const c = B(
						2.6,
						0.7,
						1.4,
						["#2F7DE1", "#8E96A3", "#1FA35C", "#FF8A1F"][(i + k) % 4],
						(r() - 0.5) * 0.4,
						0.35 + k * 0.72,
						(r() - 0.5) * 0.4,
					);
					c.rotation.y = r() * 0.8;
					pile.add(c);
				}
				s.add(pile);
				W.jets.push({ x, z, t: 1 + i * 1.7 });
			}
			W.wob = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0 };
			W.bub = [];
			for (let i = 0; i < 9; i++) {
				const m = mesh(new THREE.SphereGeometry(0.5, 10, 5, 0, 6.29, 0, 1.57), "#8A6A4C", {
					transparent: true,
					opacity: 0.4,
					depthWrite: false,
					roughness: 0.12,
					metalness: 0.15,
				});
				m.visible = false;
				m.castShadow = false;
				s.add(m);
				W.bub.push({ m, t: 9, life: 1 });
			}
		},
		onHit(W, a, b) {
			const x = (a.x + b.x) / 2,
				z = (a.z + b.z) / 2,
				w = W.wob;
			w.vx += (z / 11) * 0.3;
			w.vz -= (x / 11) * 0.3;
			w.vy -= 0.6;
		},
		mudFx(W, dt) {
			const w = W.wob;
			for (const k of ["x", "z", "y"]) {
				const v = "v" + k;
				w[v] += (-90 * w[k] - 6 * w[v]) * Math.min(dt, 0.05);
				w[k] += w[v] * Math.min(dt, 0.05);
			}
			W.plat.rotation.set(w.x, 0, w.z);
			W.plat.position.y = w.y;
			W.bub.forEach((b) => {
				if (b.t >= b.life) {
					if (Math.random() < dt * 0.6) {
						const a = Math.random() * 6.28,
							r = 12 + Math.random() * 4.3;
						b.m.position.set(Math.cos(a) * r, this.MUD + 0.1, Math.sin(a) * r);
						b.t = 0;
						b.life = 1 + Math.random() * 1.5;
						b.m.visible = true;
					}
					return;
				}
				b.t += dt;
				const k = b.t / b.life;
				b.m.scale.setScalar(0.2 + k * 0.9);
				if (b.t >= b.life) {
					b.m.visible = false;
					burst(W.sc, b.m.position.x, this.MUD + 0.3, b.m.position.z, {
						n: 5,
						shape: "ico",
						cols: ["#8A6A4C", "#A88563"],
						spd: 1,
						up: 2.5,
						grav: 12,
						life: 0.5,
						size: 0.6,
						op: 0.4,
					});
				}
			});
			if (W.t > 20 && Math.random() < dt * 2.5) {
				const a = Math.random() * 6.28,
					R = this.R(W.t);
				burst(W.sc, Math.cos(a) * R, -0.2, Math.sin(a) * R, {
					n: 3,
					shape: "cube",
					cols: ["#8A6A48", "#6B4F35"],
					spd: 1.5,
					up: 2,
					grav: 14,
					life: 1.1,
					size: 1.2,
					floor: this.MUD,
				});
			}
		},
		render(W, e, dt) {
			if (W.jetT !== W.t) {
				W.jetT = W.t;
				this.mudFx(W, dt);
				W.jets.forEach((j) => {
					j.t -= dt;
					if (j.t < 0) {
						j.t = 3 + Math.random() * 4;
						j.on = 0.7;
					}
					if (j.on > 0) {
						j.on -= dt;
						burst(W.sc, j.x, this.MUD + 1.8, j.z, {
							n: 3,
							shape: "ico",
							cols: ["#FFC83D", "#FF8A1F", "#E5484D"],
							spd: 0.6,
							up: 9,
							grav: -2,
							life: 0.5,
							size: 1.4,
						});
					}
				});
				crowdStep(W, null, 0.5);
			}
			if (e.mud) e.tr.rotation.set(e.mrx, e.yaw, e.mrz);
			if (e.al && !e.falling && !e.fly) e.g.position.y += W.wob.y - e.z * Math.sin(W.wob.x) + e.x * Math.sin(W.wob.z);
			if (e.falling && e.y < this.MUD + 0.3) {
				if (!e.splorch) {
					e.splorch = true;
					burst(W.sc, e.x, this.MUD + 0.3, e.z, {
						n: 20,
						shape: "ico",
						cols: ["#4A3524", "#6B4F35", "#3A2A1C"],
						spd: 3.5,
						up: 6,
						grav: 14,
						life: 1,
						size: 1.3,
					});
					if (Math.hypot(e.x - W.me.x, e.z - W.me.z) < 25) sfx("splash");
				}
			}
		},
		spawn: ringSpawn(7),
		inside(W, x, z) {
			return Math.hypot(x, z) < this.R(Math.max(0, W.t)) + 0.15;
		},
		fallPhys(W, e, dt) {
			// knocked-off trucks land in the mud with their momentum and spin, float half-sunk, roll upright, and bounce off the wall and stage
			const top = this.MUD - 0.3;
			if (!e.mud && e.y > top) {
				// still in the air: normal fall, but the arena wall is solid
				e.vy -= 30 * dt;
				e.y += e.vy * dt;
				e.x += e.vx * dt;
				e.z += e.vz * dt;
				e.spin = (e.spin || 0) + dt * (e.fly ? 9 : 4);
				const d = Math.hypot(e.x, e.z) || 0.001,
					hi = 15.3;
				if (d > hi) {
					const nx = e.x / d,
						nz = e.z / d,
						vn = e.vx * nx + e.vz * nz;
					e.x = nx * hi;
					e.z = nz * hi;
					if (vn > 0) {
						e.vx -= 1.55 * vn * nx;
						e.vz -= 1.55 * vn * nz;
					}
				}
				return true;
			}
			const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
			if (!e.mud) {
				e.mud = true;
				e.vx *= 0.75;
				e.vz *= 0.75;
				e.mrx = wrap((e.spin || 0) * 0.7);
				e.mrz = wrap(e.spin || 0);
				e.myr = (e.vx * Math.sin(e.yaw) + e.vz * Math.cos(e.yaw)) * 0.15;
				e.spin = 0;
			}
			e.vy = 0;
			e.y += (top + Math.sin(W.t * 2.2 + (e.i || 0) * 1.7) * 0.07 - e.y) * Math.min(1, dt * 6);
			const k = Math.exp(-1.1 * dt);
			e.vx *= k;
			e.vz *= k;
			e.myr *= Math.exp(-1.5 * dt);
			e.yaw += e.myr * dt;
			const ek = Math.min(1, dt * 2.5);
			e.mrx += (Math.sin(W.t * 1.7 + (e.i || 0)) * 0.06 - e.mrx) * ek;
			e.mrz += (0.1 + Math.sin(W.t * 2.1 + (e.i || 0)) * 0.05 - e.mrz) * ek;
			e.x += e.vx * dt;
			e.z += e.vz * dt;
			const d = Math.hypot(e.x, e.z) || 0.001,
				nx = e.x / d,
				nz = e.z / d,
				lo = this.R(Math.max(0, W.t)) * 1.04 + 1.3,
				hi = 15.3;
			if (d > hi || d < lo) {
				const out = d > hi,
					r = out ? hi : lo,
					sg = out ? 1 : -1,
					vn = (e.vx * nx + e.vz * nz) * sg;
				e.x = nx * r;
				e.z = nz * r;
				if (vn > 0) {
					e.vx -= 1.55 * vn * nx * sg;
					e.vz -= 1.55 * vn * nz * sg;
					e.myr += vn * 0.25 * (Math.random() < 0.5 ? -1 : 1);
					if (vn > 2)
						burst(W.sc, e.x, this.MUD + 0.3, e.z, {
							n: 8,
							shape: "ico",
							cols: ["#4A3524", "#6B4F35"],
							spd: 2,
							up: 3,
							grav: 12,
							life: 0.6,
							size: 0.9,
						});
				}
			}
			return true;
		},
		tick(W) {
			const r = this.R(Math.max(0, W.t)) / 11;
			W.plat.scale.set(r, 1, r);
		},
		rules(W, e) {
			if (e.al && !e.d) e.sc = Math.floor(W.t * 10);
		},
		timeUp(W, e) {
			if (e.al) e.sc = this.dur * 10 + 100;
		},
		bot(W, e, dt) {
			const R = this.R(W.t),
				d = Math.hypot(e.x, e.z);
			if (d > R * 0.7) return steer(e, 0, 0, 1);
			const t = W.list
				.filter((o) => o !== e && !o.gone && o.al && !o.d)
				.sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
			if (!t) return steer(e, 0, 0, 0.5);
			const s = steer(e, t.x, t.z, 0.85);
			if (Math.hypot(t.x - e.x, t.z - e.z) < 3.5 && e.bcd <= 0 && Math.random() < 0.05) s.boost = true;
			return s;
		},
		botScore: () => 100 + rnd(300),
	},
	coins: {
		name: "Coin Rush",
		kind: "arena",
		ctrl: "stick",
		hi: true,
		unit: "coins",
		dur: 45,
		bound: { t: "sq", h: 11 },
		water: false,
		how: "Grab the falling coins. Ram rivals to knock theirs loose.",
		loot: true,
		build(W) {
			lot(W.sc, 11, "#4A5160");
			barrierRing(W.sc, 11);
			W.items = [];
			for (let i = 0; i < 115; i++) {
				const m = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.14, 14), "#FFC83D", {
					metalness: 0.5,
					roughness: 0.3,
					emissive: "#6A4E00",
					emissiveIntensity: 0.4,
				});
				m.rotation.z = Math.PI / 2;
				m.visible = false;
				W.sc.add(m);
				W.items.push({ id: i + 1, x: (W.rng() - 0.5) * 20, z: (W.rng() - 0.5) * 20, t: i < 8 ? 0 : (i - 8) * 0.37, m });
			}
		},
		spawn: ringSpawn(6),
		tick(W, dt) {
			W.items.forEach((it) => {
				const on = W.t >= it.t && !W.claimed.has(it.id);
				it.m.visible = on;
				if (on) {
					it.m.position.set(it.x, 0.8 + Math.sin(W.t * 3 + it.id) * 0.15 + Math.max(0, (it.t + 0.5 - W.t) * 12), it.z);
					it.m.rotation.y += dt * 3;
				}
			});
		},
		rules(W, e) {
			if (e.d) return;
			W.items.forEach((it) => {
				if (W.t >= it.t && !W.claimed.has(it.id) && Math.hypot(it.x - e.x, it.z - e.z) < 1.4) {
					W.claim(it.id);
					e.c.push(it.id);
					e.sc++;
				}
			});
		},
		bot(W, e) {
			const it = nearestItem(W, e, W.items, (i) => W.t >= i.t && !W.claimed.has(i.id));
			const rich = W.list.find((o) => o !== e && !o.gone && o.al && o.sc >= 4 && Math.hypot(o.x - e.x, o.z - e.z) < 4);
			if (rich && e.bcd <= 0 && W.t > 2.5 && Math.random() < 0.02) {
				const s2 = steer(e, rich.x + (Math.random() - 0.5) * 2, rich.z + (Math.random() - 0.5) * 2, 1);
				s2.boost = true;
				return s2;
			}
			return botRam(W, e, it ? steer(e, it.x, it.z, 0.8) : wander(W, e, 0.016, 8));
		},
		botScore: () => 4 + rnd(12),
	},
	hill: {
		name: "Fire Brigade",
		kind: "arena",
		ctrl: "stick",
		hi: true,
		unit: "fires",
		dur: 50,
		bound: { t: "circ", r: 14.4 },
		water: false,
		bare: true,
		/* twin sticks: drive on the left, aim the roof water cannon on the right (no ramming) */
		aim: true,
		truckMode: "hose",
		aimHint: "Aim the hose",
		stickHint: (fine) =>
			fine
				? "WASD to drive, arrow keys to aim and spray the hose."
				: "Left side drives. Drag on the right side to aim and spray the hose.",
		NEED: 2,
		HOSE: 6,
		how: "Aim your roof hose at the fires to put them out (it reaches about 6 m). Refill the tank at the hydrants. Most fires wins.",
		HYD: [
			[0, -12.7],
			[11, 6.35],
			[-11, 6.35],
		],
		build(W) {
			const s = W.sc;
			this.square(W);
			// fire schedule from the shared seed: position, start time, and what is burning
			W.fires = [];
			let t = 1;
			while (t < this.dur - 3) {
				let x,
					z,
					n = 0;
				do {
					const a = W.rng() * 6.28,
						r = 2.4 + W.rng() * 9;
					x = Math.cos(a) * r;
					z = Math.sin(a) * r;
				} while (
					n++ < 20 &&
					(this.HYD.some((h) => Math.hypot(h[0] - x, h[1] - z) < 3.5) ||
						W.fires.some((f) => f.t > t - 27 && Math.hypot(f.x - x, f.z - z) < 4))
				);
				W.fires.push({ id: W.fires.length + 1, t, x, z, kind: Math.floor(W.rng() * 3) });
				t += 1.4 + W.rng() * 1.6;
			}
			const kits = {};
			W.fires.forEach((f) => {
				const g = new THREE.Group();
				g.position.set(f.x, 0.05, f.z);
				g.visible = false;
				s.add(g);
				f.g = g;
				/* what is burning: garden shed, news kiosk or a parked car (detailed baked models with a contact shadow) */
				const ck = f.kind === 2 ? 2 + (f.id % 3) : f.kind,
					kit = kits[ck] || (kits[ck] = bakeKit(firePropModel(f.kind, ["#8E96A3", "#6FA8D6", "#C9A27A"][f.id % 3])));
				g.add(kitGroup(kit));
				g.rotation.y = (f.id * 2.4) % 6.28;
				/* where flames come out of this prop (roof, window, hatch, bonnet), in world space */
				g.updateMatrixWorld(true);
				f.em = this.FLAME_AT[f.kind].map((p) => new THREE.Vector3(...p).applyMatrix4(g.matrixWorld));
			});
			/* one instanced pool of flame tongues for every fire (colour per instance, fading yellow to red) */
			const fp = [
					[0, 0],
					[0.16, 0.08],
					[0.22, 0.25],
					[0.17, 0.48],
					[0.09, 0.7],
					[0, 0.9],
				].map(([x, y]) => new THREE.Vector2(x, y)),
				fm = new THREE.InstancedMesh(
					new THREE.LatheGeometry(fp, 6),
					new THREE.MeshBasicMaterial({ color: "#FFFFFF" }),
					400,
				);
			fm.count = 0;
			fm.frustumCulled = false;
			fm.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(400 * 3), 3);
			s.add(fm);
			W.flame = { im: fm, L: [], o: new THREE.Object3D(), c: new THREE.Color() };
			W.smoke = puffs(W, "#5A6272");
			W.steam = puffs(W, "#F4F6F9");
			/* one instanced pool for every water droplet (hose streams and hydrant refills) */
			const dm = new THREE.InstancedMesh(
				new THREE.IcosahedronGeometry(0.075, 0),
				new THREE.MeshStandardMaterial({
					color: "#A8DCFF",
					emissive: "#3A8FD0",
					emissiveIntensity: 0.4,
					roughness: 0.2,
				}),
				700,
			);
			dm.count = 0;
			dm.frustumCulled = false;
			s.add(dm);
			W.drop = { im: dm, L: [], o: new THREE.Object3D() };
		},
		/* flame emitters per burning prop (local coords before its turn): shed roof + side window, kiosk roof + hatch,
		   car cabin + bonnet */
		FLAME_AT: [
			[
				[-0.5, 1.3, 0],
				[0, 1.48, 0],
				[0.5, 1.3, 0],
				[0.84, 0.66, 0],
			],
			[
				[-0.32, 1.5, -0.28],
				[0.3, 1.5, 0.22],
				[0, 1.55, -0.05],
				[0, 1.0, 0.64],
			],
			[
				[0, 0.88, -0.15],
				[0, 0.86, 0.42],
				[0, 0.66, -0.9],
			],
		],
		FLAME_COL: ["#FFF2A8", "#FFC83D", "#FF8A1F", "#E5484D", "#7A2A22"].map((c) => new THREE.Color(c)),
		/* spawn flame tongues for every burning fire (fewer and smaller as it is hosed: f.k), then move, swell, shrink
		   and recolour all of them; about one in eight is a spark */
		stepFlames(W, dt) {
			const F = W.flame,
				C = this.FLAME_COL;
			W.fires.forEach((f) => {
				if (!f.on) return;
				f.fa = (f.fa || 0) + dt * 30 * f.k;
				while (f.fa >= 1 && F.L.length < 400) {
					f.fa--;
					const p = f.em[Math.floor(Math.random() * f.em.length)],
						sp = Math.random() < 0.12;
					F.L.push({
						x: p.x + (Math.random() - 0.5) * 0.45,
						y: p.y,
						z: p.z + (Math.random() - 0.5) * 0.45,
						vx: (Math.random() - 0.5) * (sp ? 1.2 : 0.4),
						vy: sp ? 2.6 + Math.random() : 1.2 + Math.random() * 0.8,
						vz: (Math.random() - 0.5) * (sp ? 1.2 : 0.4),
						life: sp ? 0.9 : 0.5 + Math.random() * 0.35,
						s: sp ? 0.16 : (0.7 + Math.random() * 0.55) * (0.5 + f.k * 0.5),
						ry: Math.random() * 6.28,
						sp,
						t: 0,
						ph: Math.random() * 6.28,
					});
				}
			});
			const o = F.o,
				c = F.c;
			let n = 0;
			for (let i = F.L.length - 1; i >= 0; i--) {
				const p = F.L[i];
				p.t += dt;
				if (p.t > p.life) {
					F.L.splice(i, 1);
					continue;
				}
				p.x += (p.vx + Math.sin(p.t * 9 + p.ph) * 0.3) * dt;
				p.y += p.vy * dt;
				p.z += p.vz * dt;
			}
			F.L.forEach((p) => {
				const k = p.t / p.life,
					sc = p.s * (k < 0.25 ? 0.5 + k * 2 : (1 - k) * 1.33);
				o.position.set(p.x, p.y, p.z);
				o.rotation.set(0, p.ry + p.t * 2, 0);
				o.scale.set(sc * 0.9, sc * (1 + k * 0.7), sc * 0.9);
				o.updateMatrix();
				F.im.setMatrixAt(n, o.matrix);
				const q = Math.min(3.999, k * (p.sp ? 1.5 : 4)),
					j = Math.floor(q);
				c.copy(C[j]).lerp(C[j + 1], q - j);
				F.im.setColorAt(n++, c);
			});
			F.im.count = n;
			F.im.instanceMatrix.needsUpdate = true;
			if (F.im.instanceColor) F.im.instanceColor.needsUpdate = true;
		},
		/* droplet: position, velocity, life (s) */
		addDrop(W, x, y, z, vx, vy, vz, life) {
			const L = W.drop.L;
			if (L.length < 700) L.push({ x, y, z, vx, vy, vz, life, t: 0 });
		},
		stepDrops(W, dt) {
			const D = W.drop,
				o = D.o;
			let n = 0;
			for (let i = D.L.length - 1; i >= 0; i--) {
				const p = D.L[i];
				p.t += dt;
				p.vy -= 9.8 * dt;
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.z += p.vz * dt;
				if (p.t > p.life || p.y < 0.06) {
					D.L.splice(i, 1);
					continue;
				}
			}
			D.L.forEach((p) => {
				o.position.set(p.x, p.y, p.z);
				o.scale.setScalar(0.8 + Math.min(1, p.t / p.life) * 1.4);
				o.updateMatrix();
				D.im.setMatrixAt(n++, o.matrix);
			});
			D.im.count = n;
			D.im.instanceMatrix.needsUpdate = true;
		},
		/* the burning fire a hose at (x, z) aimed at angle a (x/z plane) is hitting: nearest one inside its reach and cone */
		target(W, x, z, a) {
			let best = null,
				bd = 1e9;
			W.fires.forEach((f) => {
				if (!this.live(W, f)) return;
				const dx = f.x - x,
					dz = f.z - z,
					d = Math.hypot(dx, dz);
				if (d > this.HOSE + 0.9 || d < 0.4) return;
				let da = Math.atan2(dz, dx) - a;
				while (da > Math.PI) da -= Math.PI * 2;
				while (da < -Math.PI) da += Math.PI * 2;
				if (Math.abs(da) < Math.atan2(1.1, d) + 0.08 && d < bd) {
					best = f;
					bd = d;
				}
			});
			return best;
		},
		inlay(W) {
			// mosaic compass in the middle of the plaza, a soft lighter band in the paving
			const t = canvasTex(256, 256, (x, w, h) => {
				const c = w / 2;
				x.fillStyle = "rgba(214,204,190,.85)";
				x.beginPath();
				x.arc(c, c, 120, 0, 6.283);
				x.fill();
				x.strokeStyle = "rgba(140,120,100,.5)";
				x.lineWidth = 5;
				x.beginPath();
				x.arc(c, c, 112, 0, 6.283);
				x.stroke();
				for (let k = 0; k < 8; k++) {
					const a = (k / 8) * 6.283,
						l = k % 2 ? 62 : 100;
					x.fillStyle = k % 2 ? "rgba(160,120,90,.55)" : "rgba(196,72,60,.6)";
					x.beginPath();
					x.moveTo(c + Math.cos(a) * l, c + Math.sin(a) * l);
					x.lineTo(c + Math.cos(a + 0.35) * 16, c + Math.sin(a + 0.35) * 16);
					x.lineTo(c + Math.cos(a - 0.35) * 16, c + Math.sin(a - 0.35) * 16);
					x.fill();
				}
				x.fillStyle = "rgba(240,232,220,.9)";
				x.beginPath();
				x.arc(c, c, 14, 0, 6.283);
				x.fill();
			});
			const m = new THREE.Mesh(
				new THREE.PlaneGeometry(4.3, 4.3),
				new THREE.MeshStandardMaterial({
					map: t,
					transparent: true,
					depthWrite: false,
					polygonOffset: true,
					polygonOffsetFactor: -2,
				}),
			);
			m.rotation.x = -Math.PI / 2;
			m.position.y = 0.055;
			m.receiveShadow = true;
			W.sc.add(m);
		},
		lamp(s, a) {
			// old-fashioned street lamp in a gap between the planters
			const x = Math.cos(a) * 16,
				z = Math.sin(a) * 16;
			s.add(
				Cy(0.2, 0.26, 0.3, 10, "#2A2F3A", x, 0.15, z),
				Cy(0.07, 0.09, 3.4, 8, "#2A2F3A", x, 1.9, z),
				Cy(0.22, 0.14, 0.12, 8, "#2A2F3A", x, 3.62, z),
				Cy(0.18, 0.2, 0.42, 8, "#FFF1C4", x, 3.89, z, { emissive: "#FFE08A", emissiveIntensity: 0.6 }),
				Cy(0.02, 0.26, 0.2, 8, "#2A2F3A", x, 4.2, z),
				contactShadow(0.5, 0.5, 0.25, x, z),
			);
		},
		square(W) {
			// town square: cobbled plaza, planters on the edge, hydrants, shops and Blaze's fire station
			const s = W.sc,
				rim = M("#8F8174");
			s.add(texBox(220, 0.4, 220, grassTex(), 10, 0, -0.25, 0));
			{
				const pl = new THREE.Mesh(new THREE.CylinderGeometry(15.6, 15.6, 0.5, 56), [
					rim,
					groundMat(cobbleTex(), 31.2, 31.2, 3),
					rim,
				]);
				pl.position.y = -0.2;
				pl.receiveShadow = true;
				s.add(pl);
			}
			this.inlay(W);
			autoTracks(W, "#BDB4A8", 0.065);
			for (let r = 3; r < 15.6; r += 3) {
				const c = new THREE.Mesh(
					new THREE.RingGeometry(r - 0.12, r + 0.12, 64),
					new THREE.MeshBasicMaterial({
						color: "#CFC3B5",
						transparent: true,
						opacity: 0.55,
						depthWrite: false,
						polygonOffset: true,
						polygonOffsetFactor: -2,
						polygonOffsetUnits: -4,
					}),
				);
				c.rotation.x = -Math.PI / 2;
				c.position.y = 0.06;
				s.add(c);
			}
			for (let i = 0; i < 24; i++) {
				const a = (i / 24) * 6.283;
				if (i % 2) this.lamp(s, a + Math.PI / 24);
				for (let k = 0; k < 5; k++) {
					const fa = a + (k - 2) * 0.035,
						fr = 16 + (((k * 37) % 5) - 2) * 0.12,
						f = mesh(
							new THREE.IcosahedronGeometry(0.13, 0),
							["#FF6FAE", "#FFE066", "#FFFFFF", "#B9A3FF", "#FF8A5C"][(i + k) % 5],
						);
					f.position.set(Math.cos(fa) * fr, 1.42 + (k % 2) * 0.08, Math.sin(fa) * fr);
					f.castShadow = false;
					s.add(f);
				}
				s.add(
					B(0.9, 0.7, 2.4, "#8C95A5", Math.cos(a) * 16, 0.35, Math.sin(a) * 16).rotateY(-a),
					contactShadow(0.9, 2.4, 0.3, 0, 0, 0.03)
						.translateX(Math.cos(a) * 16)
						.translateZ(Math.sin(a) * 16)
						.rotateY(-a),
					(() => {
						const b = mesh(new THREE.IcosahedronGeometry(0.75, 1), "#3FA34D");
						b.position.set(Math.cos(a) * 16, 1.05, Math.sin(a) * 16);
						b.scale.y = 0.7;
						return b;
					})(),
				);
			}
			this.HYD.forEach(([x, z]) => {
				s.add(
					Cy(0.32, 0.38, 1.1, 10, "#E5484D", x, 0.55, z),
					Cy(0.4, 0.4, 0.16, 10, "#B5313A", x, 1.15, z),
					Cy(0.14, 0.14, 0.9, 8, "#B5313A", x, 0.7, z),
				);
				s.children[s.children.length - 1].rotation.z = Math.PI / 2;
				decal(s, new THREE.CircleGeometry(1.8, 24), "#2F7DE1", x, 0.04, z, 0.35);
				s.add(contactShadow(0.8, 0.8, 0.3, x, z, 0.08));
			});
			/* shops around the plaza (detailed buildings, partmodels) and Blaze's fire station with a truck in the open bay */
			[
				[6.1, "#E6D8BE", 0],
				[5.5, "#B8C4D6", 1],
				[3.9, "#E8B4A0", 3],
				[3.3, "#C9D6B8", 4],
				[0.15, "#D9C3A5", 6],
				[2.99, "#E6D8BE", 7],
			].forEach(([a, c, si], k) =>
				placeKits(
					s,
					[
						bakeKit(
							buildingModel({
								w: 8,
								d: 6,
								floors: 2 + (k % 2),
								style: ["brick", "plain", "apt"][k % 3],
								wall: c,
								shop: SHOPS[si],
								roofBits: k,
							}),
						),
					],
					[{ k: 0, x: Math.cos(a) * 26.6, z: Math.sin(a) * 26.6, ry: -a - Math.PI / 2 }],
				),
			);
			placeKits(s, [bakeKit(fireStationModel())], [{ k: 0, x: 0, z: -23.6 }]);
			{
				const ft = buildTruck(2);
				ft.rotation.y = -Math.PI / 2;
				ft.scale.setScalar(1.25);
				ft.position.set(0, 0, -20.5);
				s.add(ft);
			}
			for (let i = 0; i < 10; i++) {
				const a = (i / 10) * 6.283 + 0.31,
					x = Math.cos(a) * 19.5,
					z = Math.sin(a) * 19.5;
				if (Math.abs(x) > 7 || z > 0) s.add(tree(x, z, 1.1, 0));
			}
		},
		spawn: ringSpawn(10.8),
		initEnt(W, e) {
			e.water = 100;
			e.pr = {};
			e.aa = 0;
		},
		live(W, f) {
			return W.t >= f.t && !W.claimed.has(f.id) && W.t < f.t + 22;
		},
		fmt: (W, e) => `${e.sc} fire${e.sc === 1 ? "" : "s"} · water ${Math.round(e.water)}%`,
		/* keep the aim stick (input ax/ay) on the truck for the rules, then drive as usual */
		phys(W, e, inp, dt) {
			if (inp) {
				e.ax = inp.ax || 0;
				e.ay = inp.ay || 0;
			}
			arenaPhys(W, e, inp, dt);
		},
		rules(W, e, dt) {
			if (e.d) return;
			const fill = e.water < 100 && this.HYD.some((h) => Math.hypot(h[0] - e.x, h[1] - e.z) < 2.2);
			if (fill) e.water = Math.min(100, e.water + 45 * dt);
			const am = Math.hypot(e.ax || 0, e.ay || 0);
			if (am > 0.3) e.aa = Math.atan2(e.ay, e.ax);
			const on = am > 0.3 && e.water > 0,
				f = on ? this.target(W, e.x, e.z, e.aa) : null;
			if (on) e.water = Math.max(0, e.water - 18 * dt);
			e.spray = f ? f.id : 0;
			for (const id in e.pr) if (+id !== e.spray) e.pr[id] = Math.max(0, e.pr[id] - dt * 0.6);
			if (e.spray) {
				e.pr[f.id] = (e.pr[f.id] || 0) + dt;
				if (e.pr[f.id] >= this.NEED && W.claim(f.id)) {
					e.c.push(f.id);
					e.sc++;
					if (e.isMe) {
						e.msg = "Fire out! +1";
						e.msgT = W.t;
						sfx("coin");
					}
				}
			}
			/* what other devices need to draw this truck's hose: aim angle, spraying, fire hit, refilling */
			e.f.sp = e.spray ? Math.round(Math.min(1, (e.pr[e.spray] || 0) / this.NEED) * 100) / 100 : 0;
			e.f.wt = Math.round(e.water);
			e.f.aa = Math.round(e.aa * 100) / 100;
			e.f.on = on ? 1 : 0;
			e.f.hf = e.spray;
			e.f.fl = fill ? 1 : 0;
		},
		prompt: (W, e) =>
			e.msg && W.t - e.msgT < 1.2
				? e.msg
				: e.water < 1
					? "Tank empty! Refill at a hydrant"
					: e.f.fl && e.water < 98
						? "Filling up…"
						: e.spray
							? "On target! Keep the water on it"
							: "",
		render(W, e, dt) {
			this.bar(W, e);
			this.hose(W, e, dt);
			if (W.fireT !== W.t) {
				W.fireT = W.t;
				puffStep(W, dt);
				this.stepDrops(W, dt);
				this.stepFlames(W, dt);
				W.fires.forEach((f) => {
					const on = this.live(W, f),
						was = f.on;
					f.on = on;
					f.g.visible = W.t >= f.t && W.t < f.t + 26;
					/* strength: full, dropping to a quarter as the best hose on it gets close to putting it out */
					let pr = 0;
					W.list.forEach((q) => {
						const v = q.local
							? q.spray === f.id
								? (q.pr[f.id] || 0) / this.NEED
								: 0
							: q.f.hf === f.id
								? q.f.sp || 0
								: 0;
						pr = Math.max(pr, v);
					});
					f.k = 1 - Math.min(1, pr) * 0.75;
					if (on && Math.random() < dt * 7 * f.k)
						W.smoke(f.x + (Math.random() - 0.5), 2.4, f.z + (Math.random() - 0.5), 2.2 + Math.random(), 2.6, 2.4);
					if (was && !on) {
						decal(W.sc, new THREE.CircleGeometry(1.7, 16), "#2A2F3A", f.x, 0.037, f.z, 0.55);
						if (W.claimed.has(f.id))
							decal(W.sc, new THREE.CircleGeometry(2.4, 18), "#6FA8D6", f.x + 0.5, 0.036, f.z + 0.4, 0.35).scale.set(
								1,
								0.7,
								1,
							);
						burst(W.sc, f.x, 1.6, f.z, {
							n: 14,
							shape: "ico",
							cols: ["#E8ECF2", "#BFE6FF", "#FFFFFF"],
							spd: 2,
							up: 4,
							grav: 2,
							life: 1.1,
							size: 1.2,
						});
						f.g.children[0].children.forEach((m) => {
							if (!m.userData.shadow) m.material = M("#45403B");
						});
					}
				});
			}
		},
		/* the roof rig: built on the first frame on top of whatever the truck has above its middle, then the cannon turns
		   to the aim, the tank shows the water level (sloshing a little), and droplets stream from the nozzle (or from
		   the hydrant into the filler neck) */
		hose(W, e, dt) {
			const V = THREE.Vector3;
			if (!e.rig) {
				e.rig = mountHoseRig(e.tr);
				e.rig.tp = new V();
				e.rig.fp = new V();
				e.rig.em = 0;
				e.rig.fe = 0;
			}
			const u = e.rig,
				f = e.f,
				aa = e.local ? e.aa : (f.aa ?? 0),
				k = 1 - Math.exp(-dt * 14);
			u.head.rotation.y = lerpA(u.head.rotation.y, -aa - e.yaw, k);
			/* tank level eases to the water left, sloshing while the truck moves */
			const wt = e.d ? 100 : e.local ? e.water : (f.wt ?? 100);
			u.lv += (wt / 100 - u.lv) * (1 - Math.exp(-dt * 5));
			const sp = Math.min(1, Math.hypot(e.vx || 0, e.vz || 0) / 10),
				h = Math.max(0.02, u.lv) * u.H;
			u.water.scale.y = h;
			u.water.position.y = u.y0 + h / 2;
			u.water.rotation.z = Math.sin(W.t * 9 + e.i) * 0.05 * sp;
			u.water.rotation.x = Math.cos(W.t * 7 + e.i) * 0.04 * sp;
			if (W.t < 0 || e.d) return;
			/* hose stream: ballistic droplets from the nozzle to the fire it hits, or to full reach */
			if (f.on) {
				u.em += dt * 45;
				u.tip.getWorldPosition(u.tp);
				const fr = f.hf && W.fires[f.hf - 1],
					d = fr ? Math.max(1, Math.hypot(fr.x - e.x, fr.z - e.z) - 0.3) : this.HOSE,
					ty = fr ? 1.3 : 0.06,
					tx = e.x + Math.cos(aa) * d,
					tz = e.z + Math.sin(aa) * d,
					vy0 = 2.6,
					T = (vy0 + Math.sqrt(vy0 * vy0 + 2 * 9.8 * Math.max(0.05, u.tp.y - ty))) / 9.8;
				while (u.em >= 1) {
					u.em--;
					const j = 0.95 + Math.random() * 0.1;
					this.addDrop(
						W,
						u.tp.x,
						u.tp.y,
						u.tp.z,
						((tx - u.tp.x) / T) * j + (Math.random() - 0.5) * 0.3,
						vy0 * (0.96 + Math.random() * 0.08),
						((tz - u.tp.z) / T) * j + (Math.random() - 0.5) * 0.3,
						T * 1.05,
					);
				}
				if (fr && Math.random() < dt * 6) W.steam(fr.x, 2, fr.z, 1.4 + Math.random() * 0.8, 2.4, 1.4);
			} else u.em = 0;
			/* refilling: water arcs from the hydrant's outlet into the filler neck */
			if (f.fl) {
				const hy = this.HYD.reduce((a, b) =>
					Math.hypot(a[0] - e.x, a[1] - e.z) < Math.hypot(b[0] - e.x, b[1] - e.z) ? a : b,
				);
				u.fill.getWorldPosition(u.fp);
				u.fe += dt * 30;
				const dx = u.fp.x - hy[0],
					dz = u.fp.z - hy[1],
					l = Math.hypot(dx, dz) || 1,
					sx = hy[0] + (dx / l) * 0.42,
					sz = hy[1] + (dz / l) * 0.42,
					T = 0.45;
				while (u.fe >= 1) {
					u.fe--;
					this.addDrop(
						W,
						sx,
						0.72,
						sz,
						(u.fp.x - sx) / T + (Math.random() - 0.5) * 0.2,
						(u.fp.y - 0.72) / T + 4.9 * T,
						(u.fp.z - sz) / T + (Math.random() - 0.5) * 0.2,
						T,
					);
				}
				if (e.isMe && !u.wasFl) sfx("splash");
			} else u.fe = 0;
			u.wasFl = !!f.fl;
			/* aim guide for you: reach ring around the truck and a splash marker where the water lands */
			if (e.isMe && !W.tv) {
				if (!W.aimR) {
					W.aimR = decal(
						W.sc,
						new THREE.RingGeometry(this.HOSE - 0.07, this.HOSE + 0.05, 56),
						"#8FD3FF",
						0,
						0.045,
						0,
						0.35,
					);
					W.aimD = decal(W.sc, new THREE.CircleGeometry(0.55, 18), "#8FD3FF", 0, 0.046, 0, 0.45);
				}
				const show = !!f.on || Math.hypot(e.ax || 0, e.ay || 0) > 0.3,
					fr = f.hf && W.fires[f.hf - 1],
					d = fr ? Math.hypot(fr.x - e.x, fr.z - e.z) : this.HOSE;
				W.aimR.visible = W.aimD.visible = show;
				W.aimR.position.set(e.x, 0.045, e.z);
				W.aimD.position.set(e.x + Math.cos(aa) * d, 0.046, e.z + Math.sin(aa) * d);
				W.aimD.material.color.set(fr ? "#3FD07A" : "#8FD3FF");
			}
		},
		bar(W, e) {
			if (!e.bar) {
				const cv = document.createElement("canvas");
				cv.width = 192;
				cv.height = 60;
				const tx = new THREE.CanvasTexture(cv),
					sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true }));
				sp.scale.set(3.4, 1.06, 1);
				sp.position.y = 3.7;
				sp.renderOrder = 10;
				sp.visible = false;
				e.g.add(sp);
				e.bar = { cv, tx, sp, key: "", sc: e.sc, okT: -9 };
			}
			const b = e.bar;
			if (e.sc > b.sc) b.okT = W.t;
			b.sc = e.sc;
			const ok = W.t - b.okT < 0.7,
				p = ok ? 1 : e.d ? 0 : e.f.sp || 0,
				key = [Math.round(p * 40), ok ? 1 : 0].join();
			if (key === b.key) return;
			b.key = key;
			const x = b.cv.getContext("2d"),
				rr = (X, Y, w, h, r) => {
					x.beginPath();
					x.moveTo(X + r, Y);
					x.arcTo(X + w, Y, X + w, Y + h, r);
					x.arcTo(X + w, Y + h, X, Y + h, r);
					x.arcTo(X, Y + h, X, Y, r);
					x.arcTo(X, Y, X + w, Y, r);
					x.closePath();
				};
			x.clearRect(0, 0, 192, 60);
			let any = false;
			if (p > 0) {
				any = true;
				rr(6, 4, 180, 30, 15);
				x.fillStyle = "#151B24";
				x.fill();
				const w = Math.max(22, 172 * p);
				rr(10, 8, w, 22, 11);
				const g = x.createLinearGradient(10, 0, 182, 0);
				if (ok) {
					g.addColorStop(0, "#3FD07A");
					g.addColorStop(1, "#7CE38B");
				} else {
					g.addColorStop(0, "#E5484D");
					g.addColorStop(0.5, "#FF8A1F");
					g.addColorStop(1, "#FFC83D");
				}
				x.fillStyle = g;
				x.fill();
				x.fillStyle = "rgba(255,255,255,.35)";
				rr(14, 10, Math.max(8, w - 8), 6, 3);
				x.fill();
			}
			b.tx.needsUpdate = true;
			b.sp.visible = any;
		},
		bot(W, e) {
			const hy = this.HYD.slice().sort(
				(a, b) => Math.hypot(a[0] - e.x, a[1] - e.z) - Math.hypot(b[0] - e.x, b[1] - e.z),
			)[0];
			if (e.water < 14 || (e.refill && e.water < 95)) {
				e.refill = true;
				return Math.hypot(hy[0] - e.x, hy[1] - e.z) < 1.2 ? { x: 0, y: 0 } : steer(e, hy[0], hy[1], 0.9);
			}
			e.refill = false;
			const f = W.fires
				.filter((f) => this.live(W, f))
				.sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
			if (!f) return wander(W, e, 0.016, 6);
			/* drive within hose reach, then aim at it with a wandering error (sometimes off target) */
			const d = Math.hypot(f.x - e.x, f.z - e.z),
				inp = d < 3.8 ? { x: 0, y: 0 } : steer(e, f.x, f.z, 0.85);
			if (d < this.HOSE + 0.4) {
				const a = Math.atan2(f.z - e.z, f.x - e.x) + Math.sin(W.t * 1.3 + e.i * 2.1) * 0.3;
				inp.ax = Math.cos(a);
				inp.ay = Math.sin(a);
			}
			return inp;
		},
		botScore: () => 2 + rnd(6),
	},
	tiles: {
		name: "Concrete Crumble",
		kind: "arena",
		ctrl: "stick",
		hi: true,
		unit: "pts",
		dur: 75,
		lastStanding: true,
		bound: { t: "fall" },
		water: false,
		bare: true,
		fallY: -4,
		CEM: -1.2,
		HOLD: 1.6,
		camZoom: 1.35,
		deathY: -0.95,
		sun: [13.9, 26, 12.1],
		fx: { col: 0.14 },
		how: "Slabs crack and sink after you drive on them. Keep moving and RAM to hop gaps. Last one up wins.",
		build(W) {
			const S = 1.35,
				cols = ["#E2DDD2", "#D5D0C4", "#EAE6DC", "#CCC7BA"];
			W.tl = [];
			this.site(W);
			W.crackG = new THREE.PlaneGeometry(2.2, 2.2);
			// each crack set is generated once as polylines, then drawn into three layers that fade in one after another
			W.crackTex = [0, 1, 2, 3].map(() => {
				const walk = (px, py, ang, len, n, wob) => {
					const pts = [[px, py]];
					for (let i = 0; i < n; i++) {
						ang += (Math.random() - 0.5) * wob;
						px += (Math.cos(ang) * len) / n;
						py += (Math.sin(ang) * len) / n;
						pts.push([px, py]);
					}
					return pts;
				};
				const main = [0, 1, 2].map((i) => walk(64, 64, Math.PI / 2 - i * 2.094, 58 + Math.random() * 6, 6, 0.35)),
					side = [],
					hair = [];
				main.forEach((m) => {
					for (let q = 0; q < 2; q++) {
						const p = m[1 + Math.floor(Math.random() * 4)],
							d = Math.atan2(m[m.length - 1][1] - 64, m[m.length - 1][0] - 64);
						side.push(
							walk(p[0], p[1], d + (q ? 0.8 : -0.8) + (Math.random() - 0.5) * 0.4, 14 + Math.random() * 12, 4, 0.6),
						);
					}
				});
				side.forEach((b) => {
					const p = b[b.length - 1];
					hair.push(walk(p[0], p[1], Math.random() * 6.28, 6 + Math.random() * 6, 3, 0.8));
				});
				for (let q = 0; q < 5; q++) {
					const g = Math.random() * 6.28,
						r = 40 + Math.random() * 14;
					hair.push(
						walk(
							64 + Math.cos(g) * r,
							64 + Math.sin(g) * r,
							g + 1.57 + (Math.random() - 0.5),
							8 + Math.random() * 8,
							3,
							0.7,
						),
					);
				}
				const layer = (paths, wd) =>
					canvasTex(128, 128, (x) => {
						x.strokeStyle = "rgba(46,50,58,.9)";
						x.lineCap = "round";
						x.lineJoin = "round";
						x.lineWidth = wd;
						paths.forEach((p) => {
							x.beginPath();
							x.moveTo(p[0][0], p[0][1]);
							p.slice(1).forEach((q) => x.lineTo(q[0], q[1]));
							x.stroke();
						});
					});
				return [layer(main, 3.2), layer(side, 1.8), layer(hair, 1)];
			});
			for (let q = -7; q <= 7; q++)
				for (let r = -7; r <= 7; r++) {
					if (Math.abs(q + r) > 7) continue;
					const x = S * Math.sqrt(3) * (q + r / 2),
						z = S * 1.5 * r;
					const v = 0.74 + W.rng() * 0.38,
						base = new THREE.Color(cols[(q - r + 40) % 4]);
					if (v <= 1) base.multiplyScalar(v);
					else base.lerp(new THREE.Color("#FFFFFF"), (v - 1) * 2.5);
					const m = mesh(new THREE.CylinderGeometry(S * 0.93, S * 0.93, 0.5, 6), "#" + base.getHexString());
					m.material = m.material.clone();
					m.position.set(x, -0.25, z);
					W.sc.add(m);
					W.tl.push({ id: W.tl.length + 1, x, z, m, base });
				}
		},
		spawn: ringSpawn(5.5),
		site(W) {
			// wet-cement pit on a building site: formwork, rebar, pallets, a tower crane and Mixie trucks pouring
			const s = W.sc,
				C = this.CEM,
				R = 19.5; /* tuned in the light panel: ambient .68, sun .64, height 26, angle 41, warmth .26, haze 50, colour .14 */
			{
				const h = s.children.find((o) => o.isHemisphereLight);
				if (h) h.intensity = 0.68;
				W.sun.intensity = 0.64;
				W.sun.color.set("#E4EEFF").lerp(new THREE.Color("#FFC27A"), 0.26);
				W.lpWarm = 0.26;
				if (s.fog) {
					s.fog.near = 50;
					s.fog.far = 50 * 3.8;
				}
			}
			const cm = new THREE.Mesh(
				new THREE.CircleGeometry(R + 0.5, 40, 0, 6.29),
				new THREE.MeshStandardMaterial({ color: "#62676F", roughness: 0.18, metalness: 0.1, flatShading: true }),
			);
			const cp = cm.geometry.attributes.position;
			for (let i = 0; i < cp.count; i++) cp.setZ(i, (Math.random() - 0.5) * 0.12);
			cm.geometry.computeVertexNormals();
			cm.rotation.x = -Math.PI / 2;
			cm.position.y = C;
			s.add(cm);
			cm.material.transparent = true;
			cm.material.opacity = 0.7;
			cm.material.depthWrite = false;
			cm.renderOrder = 2;
			cm.receiveShadow = true; /* layered like Mud Brawl: see-through top, a murkier layer, then solid */
			[
				[-0.45, "#464A51", 0.76],
				[-0.95, "#2B2E33", 1],
			].forEach(([dy, col, op]) => {
				const l = new THREE.Mesh(
					new THREE.CircleGeometry(R + 0.8, 40),
					new THREE.MeshStandardMaterial({
						color: col,
						roughness: 0.6,
						transparent: op < 1,
						opacity: op,
						depthWrite: op >= 1,
					}),
				);
				l.rotation.x = -Math.PI / 2;
				l.position.y = C + dy;
				l.renderOrder = op < 1 ? 1 : 0;
				l.receiveShadow = true;
				s.add(l);
			});
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(R + 0.8, 160, 40, 1),
				M("#A58F72", { side: THREE.DoubleSide }),
			);
			ring.rotation.x = -Math.PI / 2;
			ring.position.y = 0.5;
			ring.receiveShadow = true;
			s.add(ring);
			const nb = Math.ceil((6.283 * (R + 0.6)) / 3.85);
			for (let i = 0; i < nb; i++) {
				const a = (i / nb) * 6.283,
					od = i % 2,
					w = B(
						4.15,
						od ? 3.2 : 3.12,
						od ? 0.24 : 0.3,
						od ? "#B8793F" : "#A86B35",
						Math.cos(a) * (R + 0.6),
						od ? -1 : -1.04,
						Math.sin(a) * (R + 0.6),
					);
				/* reach down to -2.6, below the bottom cement layer */ /* boards overlap at the joins (no gaps); alternate boards differ in height and thickness so the overlaps never flicker */ w.rotation.y =
					-a + Math.PI / 2;
				s.add(w);
			}
			for (let i = 0; i < 14; i++) {
				const a = (i / 14) * 6.283 + 0.2,
					x = Math.cos(a) * (R + 1.6),
					z = Math.sin(a) * (R + 1.6);
				for (let k = 0; k < 4; k++) s.add(B(0.07, 1.6, 0.07, "#8C4A2F", x + (k - 1.5) * 0.3, 1.3, z));
			}
			[
				[-19, 16],
				[22, -14],
				[-23, -11],
			].forEach(([x, z]) => {
				s.add(B(1.4, 0.18, 1.2, "#B8793F", x, 0.6, z));
				for (let k = 0; k < 5; k++)
					s.add(B(0.6, 0.25, 0.9, "#E8E4DA", x - 0.32 + (k % 2) * 0.64, 0.82 + Math.floor(k / 2) * 0.26, z));
			});
			const tc = new THREE.Group();
			tc.position.set(-25, 0.5, -25);
			s.add(tc);
			tc.add(
				B(1.2, 30, 1.2, "#FFC83D", 0, 15, 0),
				B(1.4, 1.4, 34, "#FFC83D", 0, 30.4, 10),
				B(2.6, 2.2, 2.6, "#FFC83D", 0, 29, 0),
				B(2, 2, 4, "#8E96A3", 0, 30.4, -8),
			);
			W.pours = [];
			[
				[0.6, R + 3.1],
				[2.5, R + 3.1],
				[4.4, R + 3.1],
			].forEach(([a, d], k) => {
				const tr = buildTruck(4);
				tr.scale.setScalar(1.25);
				const x = Math.cos(a) * d,
					z = Math.sin(a) * d;
				tr.position.set(x, 0.5, z);
				tr.rotation.y = Math.atan2(z, -x) + Math.PI;
				s.add(tr);
				const lx = Math.cos(a) * (R - 0.6),
					lz = Math.sin(a) * (R - 0.6),
					ch = B(0.5, 0.12, 3.2, "#8E96A3", (x + lx) / 2, 1.3, (z + lz) / 2);
				ch.rotation.y = Math.atan2(lx - x, lz - z);
				ch.rotation.x = 0.35;
				s.add(ch);
				const st = Cy(0.22, 0.3, 2.4, 8, "#8E9299", lx, C + 1.2, lz);
				s.add(st);
				W.pours.push({ st, tr, x: lx, z: lz, ph: k * 1.7 });
			});
			W.cem = cm;
			W.cemB = Float32Array.from(cp.array);
			W.rip = ripples(W, "#A3A7AE");
		},
		render(W, e, dt) {
			const vy = (e.y - (e.py === undefined ? e.y : e.py)) / Math.max(dt, 0.001);
			e.py = e.y;
			if (!e.falling && (e.hop !== undefined || (!e.local && e.y > 0.05)) && Math.abs(vy) > 0.5)
				e.tr.rotation.z += Math.max(-0.3, Math.min(0.3, vy * 0.045));
			if (W.cemT !== W.t) {
				W.cemT = W.t;
				rippleStep(W, dt);
				const pa = W.cem.geometry.attributes.position;
				for (let i = 0; i < pa.count; i++) {
					const x = W.cemB[i * 3],
						y = W.cemB[i * 3 + 1];
					pa.setZ(i, W.cemB[i * 3 + 2] + Math.sin(x * 0.45 + W.t * 1.1) * 0.07 + Math.cos(y * 0.38 - W.t * 0.8) * 0.06);
				}
				pa.needsUpdate = true;
				W.cem.geometry.computeVertexNormals();
				W.pours.forEach((p) => {
					if (Math.random() < dt * 1.2) W.rip(p.x, this.CEM + 0.03, p.z, 0.4, 2.6, 1.3);
				});
				W.pours.forEach((p) => {
					p.st.scale.x = p.st.scale.z = 1 + Math.sin(W.t * 9 + p.ph) * 0.12;
					animTruck(p.tr, dt, 0);
					if (Math.random() < dt * 3)
						burst(W.sc, p.x, this.CEM + 0.05, p.z, {
							n: 2,
							shape: "ico",
							cols: ["#8E9299", "#A3A7AE"],
							spd: 1,
							up: 1.4,
							grav: 8,
							life: 0.45,
						});
				});
			}
			if (e.falling && e.y < this.CEM + 0.2) {
				if (!e.splorch) {
					e.splorch = true;
					W.rip(e.x, this.CEM + 0.04, e.z, 0.8, 4.5, 1.6);
					burst(W.sc, e.x, this.CEM + 0.2, e.z, {
						n: 18,
						shape: "ico",
						cols: ["#8E9299", "#A3A7AE", "#6F757E"],
						spd: 3,
						up: 5,
						grav: 14,
						life: 0.9,
						size: 1.2,
					});
					if (Math.hypot(e.x - W.me.x, e.z - W.me.z) < 20) sfx("splash");
				}
				if (e.local) e.vy = Math.max(e.vy, -1.2);
			}
		}, // stuck in the cement: sink slowly
		onClaim(W, id) {
			const t = W.tl[id - 1];
			if (t && t.at === undefined) t.at = W.t;
		},
		under(W, x, z) {
			let b = null,
				bd = 1.45;
			W.tl.forEach((t) => {
				const d = Math.hypot(t.x - x, t.z - z);
				if (d < bd) {
					bd = d;
					b = t;
				}
			});
			return b;
		},
		ground(W, x, z) {
			const t = this.under(W, x, z);
			if (!t) return null;
			if (t.at === undefined || W.t - t.at < this.HOLD) return 0;
			const top = t.m.position.y + 0.25;
			return top > this.CEM + 0.05 ? Math.min(0, top) : null;
		}, // height of the slab underfoot, null over a gap or a sunk slab
		inside(W, x, z, e) {
			if (e && e.hop !== undefined) return e.y > this.CEM + 0.3;
			return this.ground(W, x, z) !== null;
		},
		tick(W, dt) {
			const red = new THREE.Color("#5E646D");
			W.tl.forEach((t) => {
				if (t.at === undefined || t.sunk) return;
				const a = W.t - t.at;
				if (a < this.HOLD) {
					const k = a / this.HOLD;
					t.m.material.color.copy(t.base).lerp(red, k * 0.55);
					t.m.position.x = t.x + (Math.random() - 0.5) * a * 0.12;
					if (!t.crack) t.crack = this.crackOn(W, t);
					t.crack.forEach((c, i) => {
						c.material.opacity = Math.max(0, Math.min(1, (k - i * 0.3) / 0.35)) * 0.6;
					});
					if (Math.random() < dt * k * 7) {
						const g = Math.random() * 6.28;
						burst(W.sc, t.x + Math.cos(g) * 1.1, 0.15, t.z + Math.sin(g) * 1.1, {
							n: 1,
							shape: "cube",
							cols: ["#B8BCC3", "#8E9299"],
							spd: 0.8,
							up: 1.6,
							grav: 12,
							life: 0.45,
							size: 0.45,
						});
					}
					return;
				}
				// past the hold time: the slab splits into three wedges that drift apart, tip outward and sink (t.m stays as the invisible height reference)
				if (!t.parts) this.split(W, t);
				const s = a - this.HOLD;
				t.m.position.y -= dt * (0.7 + s * 1.4);
				t.parts.forEach((p) => {
					p.g.position.set(t.x + p.dx * s * 0.45, t.m.position.y - p.drop * s, t.z + p.dz * s * 0.45);
					p.g.quaternion.setFromAxisAngle(p.ax, s * p.tilt);
				});
				if (t.m.position.y < this.CEM - 0.45) {
					t.sunk = true;
					t.parts.forEach((p) => {
						p.g.visible = false;
					});
					W.rip(t.x, this.CEM + 0.03, t.z, 0.6, 3, 1.2);
					burst(W.sc, t.x, this.CEM + 0.1, t.z, {
						n: 5,
						shape: "ico",
						cols: ["#8E9299", "#A3A7AE"],
						spd: 1.2,
						up: 1.5,
						grav: 8,
						life: 0.5,
					});
				}
			});
		},
		crackOn(W, t) {
			t.rot = ((t.id % 2) * Math.PI) / 3;
			return W.crackTex[t.id % W.crackTex.length].map((tex, i) => {
				const c = new THREE.Mesh(
					W.crackG,
					new THREE.MeshBasicMaterial({
						map: tex,
						transparent: true,
						opacity: 0,
						depthWrite: false,
						polygonOffset: true,
						polygonOffsetFactor: -2,
						polygonOffsetUnits: -4,
					}),
				);
				c.rotation.set(-Math.PI / 2, 0, t.rot);
				c.position.y = 0.26;
				c.renderOrder = 2 + i;
				t.m.add(c);
				return c;
			});
		},
		split(W, t) {
			t.m.visible = false;
			const col = "#" + t.m.material.color.getHexString();
			t.parts = [0, 1, 2].map((k) => {
				const th = k * 2.094 + (t.rot || 0),
					g = new THREE.Group();
				g.add(
					mesh(new THREE.CylinderGeometry(1.255, 1.255, 0.5, 2, 1, false, th, 2.094), col, { side: THREE.DoubleSide }),
				);
				g.position.set(t.x, t.m.position.y, t.z);
				W.sc.add(g);
				const mid = th + 1.047,
					dx = Math.sin(mid),
					dz = Math.cos(mid);
				return { g, dx, dz, ax: new THREE.Vector3(dz, 0, -dx), tilt: 0.35 + k * 0.13, drop: k * 0.08 };
			});
			burst(W.sc, t.x, 0.2, t.z, {
				n: 8,
				shape: "cube",
				cols: ["#B8BCC3", "#8E9299", "#6F757E"],
				spd: 2,
				up: 2.5,
				grav: 12,
				life: 0.6,
				size: 0.5,
			});
			if (Math.hypot(t.x - W.me.x, t.z - W.me.z) < 8 && W.t - (W.crT || -9) > 0.12) {
				W.crT = W.t;
				sfx("crack");
			}
		},
		rules(W, e, dt) {
			if (!e.al || e.d || e.falling) return;
			e.sc = Math.floor(W.t * 10);
			// RAM = hop: a short jump that carries over gaps; nothing cracks and nobody falls while airborne
			if (e.boostT > 0.4 && e.hop === undefined) {
				e.hop = 7.2;
				e.vx *= 0.7;
				e.vz *= 0.7;
				if (e.isMe) sfx("land");
			}
			if (e.hop !== undefined) {
				e.y += e.hop * dt;
				e.hop -= 22 * dt;
				const g = this.ground(W, e.x, e.z);
				if (e.hop < 0 && g !== null && e.y <= g) {
					e.y = g;
					e.hop = undefined;
					burst(W.sc, e.x, 0.1, e.z, {
						n: 6,
						shape: "ico",
						cols: ["#C9CCD2", "#A3A7AE"],
						spd: 2,
						up: 1.5,
						grav: 8,
						life: 0.4,
					});
				}
				return;
			}
			const g = this.ground(W, e.x, e.z);
			if (g !== null) e.y = g;
			if (W.t < 1.5) return;
			const t = this.under(W, e.x, e.z);
			if (t && W.claim(t.id)) e.c.push(t.id);
		},
		timeUp(W, e) {
			if (e.al) e.sc = this.dur * 10 + 100;
		},
		bot(W, e, dt) {
			e.wt = (e.wt || 0) - dt;
			const tgt = e.wp && W.tl[e.wp - 1];
			if (!tgt || tgt.at !== undefined || e.wt <= 0 || Math.hypot(tgt.x - e.x, tgt.z - e.z) < 0.8) {
				const ok = W.tl.filter(
					(t) => t.at === undefined && Math.hypot(t.x - e.x, t.z - e.z) < 3.2 && Math.hypot(t.x - e.x, t.z - e.z) > 1.5,
				);
				const far = ok.length
					? null
					: W.tl
							.filter((t) => t.at === undefined)
							.sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
				const pick = ok[Math.floor(Math.random() * ok.length)] || far;
				e.wp = pick ? pick.id : null;
				e.wt = 1.2;
			}
			const t2 = e.wp && W.tl[e.wp - 1],
				sp = Math.hypot(e.vx, e.vz) || 1,
				ah = this.under(W, e.x + (e.vx / sp) * 1.1, e.z + (e.vz / sp) * 1.1),
				cur = this.under(W, e.x, e.z);
			if (cur && (!ah || (ah.at !== undefined && W.t - ah.at > this.HOLD * 0.65))) {
				if (t2 && e.bcd <= 0 && e.y <= 0.05 && Math.random() < 0.08) {
					const j = steer(e, t2.x, t2.z, 1);
					j.boost = true;
					return j;
				}
				return steer(e, cur.x, cur.z, 0.75);
			}
			return t2 ? steer(e, t2.x, t2.z, 0.75) : { x: 0, y: 0 };
		},
		botScore: () => 80 + rnd(300),
	},
	rocks: {
		name: "Rock Fall",
		kind: "arena",
		ctrl: "stick",
		hi: true,
		unit: "pts",
		dur: 55,
		lastStanding: true,
		bound: { t: "fall" },
		water: false,
		bare: true,
		FLOOR: -38,
		fallY: -40,
		how: "Dodge the falling boulders. Watch their shadows! Last truck standing wins.",
		sun: [3, 60, 2.5],
		build(W) {
			const s = W.sc,
				pg = new THREE.Group();
			s.add(pg);
			W.pg = pg;
			pg.rotation.order = "YXZ";
			W.wob = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0 };
			W.sun.intensity = 0.82;
			this.slab(pg);
			this.quarry(W);
			for (let i = 0; i < 12; i++)
				pg.add(rock((W.rng() - 0.5) * 19, (W.rng() > 0.5 ? 1 : -1) * (9.6 + W.rng() * 0.4), 0.3 + W.rng() * 0.3));
			W.pp = [0, 1, 2, 3, 4].map(() => W.rng() * 6.28);
			W.pl = this.plat(W, -9);
			// rocks aim at a spot on the platform where it will be at impact time; the warning circle stays put in the world
			W.rk = [];
			let t = 2,
				acc = 0;
			while (t < this.dur) {
				const P = this.plat(W, t),
					lx = (W.rng() - 0.5) * 18,
					lz = (W.rng() - 0.5) * 18,
					w = this.toWorld(P, lx, lz),
					r = { t, x: w[0], z: w[1], lx, lz };
				// some survive the landing and roll across the platform, roughly toward the middle
				acc += 0.15 + (0.5 * t) / this.dur;
				const nR = W.rk.filter((q) => q.spd).length,
					want = acc; // share of rollers ramps from ~15% to ~65% by the end, random but kept within one of that
				if (nR < want - 1 || (nR < want + 1 && W.rng() < 0.25)) {
					const a = Math.atan2((W.rng() - 0.5) * 8 - lz, (W.rng() - 0.5) * 8 - lx);
					r.dx = Math.cos(a);
					r.dz = Math.sin(a);
					r.spd = 4 + W.rng() * 2.5;
					r.off = Math.min(
						...[
							[r.dx, lx],
							[r.dz, lz],
						].map(([d, p]) => (Math.abs(d) < 1e-3 ? 1e9 : (Math.sign(d) * 10.2 - p) / (d * r.spd))),
					);
				}
				W.rk.push(r);
				t += Math.max(0.4, 1.4 - t * 0.02);
			}
		},
		rollPos(r, t) {
			const u = t - r.t,
				d = r.spd * u,
				fall = Math.max(0, u - r.off);
			return { lx: r.lx + r.dx * d, lz: r.lz + r.dz * d, y: 1.4 - 10 * fall * fall, d };
		},
		slab(pg) {
			// steel deck with hazard-striped sides, weld seams and lifting lugs on crane cables
			pg.add(B(20.4, 1.2, 20.4, "#4A5261", 0, -0.6, 0));
			pg.add(texBox(20, 0.12, 20, treadTex(), 5, 0, 0.04, 0, { roughness: 0.7, metalness: 0.15 }));
			const st = stripeTex();
			st.wrapS = THREE.RepeatWrapping;
			st.repeat.set(8, 1);
			const sm = new THREE.MeshBasicMaterial({ map: st });
			[
				[0, 10.23, 0],
				[0, -10.23, Math.PI],
				[10.23, 0, Math.PI / 2],
				[-10.23, 0, -Math.PI / 2],
			].forEach(([x, z, r]) => {
				const p = new THREE.Mesh(new THREE.PlaneGeometry(20.4, 0.5), sm);
				p.position.set(x, -0.4, z);
				p.rotation.y = r;
				pg.add(p);
			});
			const hook = new THREE.Vector3(0, 42, 0);
			const hb = B(1.4, 1.6, 1.4, "#FFC83D", 0, 42.8, 0);
			hb.castShadow = false;
			pg.add(hb); // only boulders may cast shadows on the deck
			[
				[-1, -1],
				[-1, 1],
				[1, -1],
				[1, 1],
			].forEach(([a, b]) => {
				const p = new THREE.Vector3(a * 9.5, 0.3, b * 9.5),
					d = hook.clone().sub(p),
					c = Cy(0.06, 0.06, d.length(), 5, "#2A2F3A");
				c.position.copy(p).addScaledVector(d, 0.5);
				c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
				c.castShadow = false;
				pg.add(c, B(0.5, 0.35, 0.5, "#FFC83D", p.x, 0.27, p.z));
			});
		},
		quarry(W) {
			// terraced open-pit quarry below the slab, haul trucks on the benches, crane on the rim
			const s = W.sc,
				F = this.FLOOR,
				H = 6.5,
				N = 7,
				R = (k) => 27 + k * 7.5,
				jit = (a, y) =>
					1 + 0.045 * Math.sin(3 * a + y * 0.21) + 0.03 * Math.sin(7 * a + 1.7 + y * 0.5) + 0.02 * Math.sin(13 * a + y);
			const COL = ["#A8845F", "#B89572", "#9A7654", "#C2A07B", "#A07C58", "#B38F6B", "#A8845F"];
			for (let k = 0; k < N; k++) {
				const y = F + k * H,
					pts = [];
				pts.push(
					new THREE.Vector2(R(k), y),
					new THREE.Vector2(R(k) + 1.6, y + H),
					new THREE.Vector2(k === N - 1 ? 420 : R(k + 1), y + H),
				);
				const g = new THREE.LatheGeometry(pts, 40),
					p = g.attributes.position;
				for (let i = 0; i < p.count; i++) {
					const x = p.getX(i),
						z = p.getZ(i),
						f = jit(Math.atan2(z, x), p.getY(i));
					p.setX(i, x * f);
					p.setZ(i, z * f);
				}
				g.computeVertexNormals();
				const m = mesh(g, COL[k], { side: THREE.DoubleSide });
				m.castShadow = false;
				s.add(m);
			}
			const fl = new THREE.PlaneGeometry(64, 64, 12, 12),
				fp = fl.attributes.position;
			for (let i = 0; i < fp.count; i++) {
				fp.setZ(i, W.rng() * 0.9);
				if (Math.abs(fp.getX(i)) < 31) fp.setX(i, fp.getX(i) + (W.rng() - 0.5) * 3.5);
				if (Math.abs(fp.getY(i)) < 31) fp.setY(i, fp.getY(i) + (W.rng() - 0.5) * 3.5);
			}
			fl.computeVertexNormals();
			const fm = mesh(fl, "#A99374");
			fm.rotation.x = -Math.PI / 2;
			fm.position.y = F - 0.2;
			fm.castShadow = false;
			s.add(fm);
			W.haul = [0, 1, 2].map((i) => {
				const tr = buildTruck([4, 9, 2][i] % TRUCKS.length);
				tr.scale.setScalar(1.3);
				s.add(tr);
				return { tr, k: 1 + i * 2, a: i * 2.1, sp: (i % 2 ? -1 : 1) * (0.05 + i * 0.01) };
			});
			// drifting dust puffs and two thin haze layers; none cast shadows (shadows are the rock warnings)
			const RUB = ["#8C8F96", "#7E858F", "#A08A6C", "#6F6A62", "#9A8466"],
				rub = (x, y, z, sz) => {
					const m = mesh(new THREE.DodecahedronGeometry(sz, 0), RUB[Math.floor(W.rng() * RUB.length)]);
					m.position.set(x, y, z);
					m.rotation.set(W.rng() * 3, W.rng() * 3, 0);
					m.scale.y = 0.75;
					m.castShadow = false;
					s.add(m);
				};
			for (let i = 0; i < 10; i++) {
				const a = W.rng() * 6.28,
					d = 5 + W.rng() * 17,
					cx = Math.cos(a) * d,
					cz = Math.sin(a) * d,
					big = 2 + W.rng() * 2.2;
				rub(cx, F + big * 0.5, cz, big);
				for (let j = 0; j < 5 + W.rng() * 4; j++) {
					const sz = 0.7 + W.rng() * 1.6,
						o = W.rng() * 6.28,
						rr = big * (0.5 + W.rng() * 0.9);
					rub(cx + Math.cos(o) * rr, F + sz * 0.4 + W.rng() * big * 0.6, cz + Math.sin(o) * rr, sz);
				}
			}
			for (let k = 1; k <= 3; k++)
				for (let j = 0; j < 7; j++) {
					const a = W.rng() * 6.28,
						y = F + k * H,
						f = jit(a, y),
						rr = (R(k - 1) + 2.6 + W.rng() * 3.5) * f;
					rub(Math.cos(a) * rr, y + 0.3, Math.sin(a) * rr, 0.6 + W.rng() * 1.2);
				}
			const puff = canvasTex(64, 64, (x, w, h) => {
				const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
				g.addColorStop(0, "rgba(170,146,114,.9)");
				g.addColorStop(0.5, "rgba(158,134,104,.45)");
				g.addColorStop(1, "rgba(158,134,104,0)");
				x.fillStyle = g;
				x.fillRect(0, 0, w, h);
			});
			W.dust = [];
			for (let i = 0; i < 22; i++) {
				const g = new THREE.Group(),
					n = 4 + Math.floor(W.rng() * 3),
					dy = Math.pow(W.rng(), 1.8) * 28,
					op = 0.75 - dy / 50; // mostly low down, densest near the floor
				for (let j = 0; j < n; j++) {
					const m = new THREE.Sprite(
						new THREE.SpriteMaterial({
							map: puff,
							transparent: true,
							opacity: op * (0.8 + W.rng() * 0.3),
							depthWrite: false,
						}),
					);
					m.scale.setScalar(6 + W.rng() * 6);
					m.position.set((W.rng() - 0.5) * 7, (W.rng() - 0.5) * 2, (W.rng() - 0.5) * 7);
					g.add(m);
				}
				s.add(g);
				W.dust.push({
					g,
					a: W.rng() * 6.28,
					r: 26 + W.rng() * 22,
					y: F + 2 + dy,
					sp: (W.rng() < 0.5 ? -1 : 1) * (0.02 + W.rng() * 0.03),
					ph: W.rng() * 6.28,
				});
			}
			[
				[1.5, 0.34],
				[4, 0.26],
				[7.5, 0.19],
				[12, 0.12],
				[18, 0.07],
			].forEach(([y, op]) => {
				const h = new THREE.Mesh(
					new THREE.CircleGeometry(95, 40),
					new THREE.MeshBasicMaterial({ color: "#9E8668", transparent: true, opacity: op, depthWrite: false }),
				);
				h.rotation.x = -Math.PI / 2;
				h.position.y = F + y;
				s.add(h);
			});
			const cy = F + N * H;
			s.add(
				B(2, 70, 2, "#FFC83D", 0, cy + 35, -90),
				B(1.6, 1.6, 92, "#FFC83D", 0, cy + 69, -44),
				B(3, 3, 6, "#E5A800", 0, cy + 69, -93),
			);
		},
		// platform drift: deterministic from the seed so every device agrees; still for 3s, then ramps up
		plat(W, t) {
			const p = W.pp,
				a = Math.min(1.4, Math.max(0, (t - 3) / 14));
			return {
				x: a * (3 * Math.sin(0.42 * t + p[0]) + 1.4 * Math.sin(1.07 * t + p[1])),
				z: a * (3 * Math.sin(0.37 * t + p[2]) + 1.4 * Math.sin(0.93 * t + p[3])),
				r: a * 0.6 * Math.sin(0.23 * t + p[4]),
			};
		},
		toWorld(P, lx, lz) {
			const c = Math.cos(P.r),
				n = Math.sin(P.r);
			return [P.x + lx * c + lz * n, P.z - lx * n + lz * c];
		},
		toLocal(P, x, z) {
			const dx = x - P.x,
				dz = z - P.z,
				c = Math.cos(P.r),
				n = Math.sin(P.r);
			return [dx * c - dz * n, dx * n + dz * c];
		},
		spawn: ringSpawn(6),
		inside(W, x, z) {
			const l = this.toLocal(W.pl, x, z);
			return Math.abs(l[0]) < 10.2 && Math.abs(l[1]) < 10.2;
		},
		render(W, e, dt) {
			const b = W.wob;
			if (W.wobT !== W.t) {
				W.wobT = W.t;
				const h = Math.min(dt, 0.05); // damped springs, stepped once per frame
				for (const k of ["x", "z", "y"]) {
					const v = "v" + k;
					b[v] += (-90 * b[k] - 6 * b[v]) * h;
					b[k] += b[v] * h;
				}
				const P = this.plat(W, W.t);
				W.pg.position.set(P.x, b.y, P.z);
				W.pg.rotation.set(b.x, P.r, b.z);
				if (W.over) this.step(W, dt, false);
				W.dust.forEach((d) => {
					const a = d.a + d.sp * W.t;
					d.g.position.set(Math.cos(a) * d.r, d.y + Math.sin(W.t * 0.3 + d.ph) * 0.8, Math.sin(a) * d.r);
					d.g.rotation.y = W.t * 0.05 + d.ph;
					d.g.scale.setScalar(1 + Math.sin(W.t * 0.4 + d.ph) * 0.12);
				});
				W.haul.forEach((h) => {
					const a = h.a + h.sp * (W.t + 20),
						r = 27 + (h.k - 1) * 7.5 + 4.6,
						f = 1 + 0.045 * Math.sin(3 * a + (this.FLOOR + h.k * 6.5) * 0.21);
					h.tr.position.set(Math.cos(a) * r * f, this.FLOOR + h.k * 6.5, Math.sin(a) * r * f);
					const g = Math.sign(h.sp);
					h.tr.rotation.y = Math.atan2(-g * Math.cos(a), -g * Math.sin(a));
					animTruck(h.tr, dt, 3);
				});
			}
			if ((e.falling || e.fly) && e.y < this.FLOOR + 1.5 && !e.dust) {
				e.dust = true;
				burst(W.sc, e.x, this.FLOOR + 0.6, e.z, {
					n: 24,
					shape: "ico",
					cols: DUST,
					spd: 4.5,
					up: 3,
					grav: 2,
					life: 1.8,
					size: 2,
				});
				if (e.isMe) sfx("land");
			}
			if (e.al && !e.falling && !e.fly) {
				const l = this.toLocal(W.pl, e.x, e.z);
				e.g.position.y += b.y - l[1] * Math.sin(b.x) + l[0] * Math.sin(b.z);
			}
		}, // keep trucks on the tilted deck
		kick(W, lx, lz, f) {
			const b = W.wob;
			b.vx += (lz / 10) * 0.32 * f;
			b.vz -= (lx / 10) * 0.32 * f;
			b.vy -= 1.1 * f;
		},
		tick(W, dt) {
			this.step(W, dt, true);
		},
		step(W, dt, live) {
			// live: during play. After the game ends it keeps running for looks only (no knockouts), so nothing freezes
			const P0 = W.pl,
				P = this.plat(W, W.t);
			W.pl = P;
			W.list.forEach((e) => {
				if (e.gone) return;
				if (!live && (e.falling || e.fly)) {
					arenaPhys(W, e, null, dt);
					return;
				}
				if ((!live || e.local) && e.al && !e.falling && !e.fly) {
					const l = this.toLocal(P0, e.x, e.z),
						w = this.toWorld(P, l[0], l[1]);
					e.x = w[0];
					e.z = w[1];
					e.yaw += P.r - P0.r;
					if (!live && e.net) {
						const n = e.net,
							m = this.toWorld(P, ...this.toLocal(P0, n.x, n.z));
						n.x = m[0];
						n.z = m[1];
						n.vx = n.vz = 0;
						n.a = (n.a || 0) + P.r - P0.r;
					}
				}
			});
			W.rk.forEach((r) => {
				if (W.t > r.t - 1.5 && !r.m && !r.done && W.t < r.t) {
					r.m = mesh(new THREE.DodecahedronGeometry(1.6, 0), "#7E858F");
					W.sc.add(r.m);
				}
				if (r.m) {
					const h = Math.max(0, r.t - W.t) * 26,
						S = this.sun;
					r.m.position.set(r.x + (h * S[0]) / S[1], 1.4 + h, r.z + (h * S[2]) / S[1]);
					r.m.rotation.x += dt * 3; // falls along the sun ray so its shadow marks the landing spot
					if (W.t >= r.t && !r.hit) {
						r.hit = true;
						this.kick(W, r.lx, r.lz, 1);
						if (live) this.smash(W, r.x, r.z, 2, 0, 0);
						if (Math.hypot(W.me.x - r.x, W.me.z - r.z) < 7) W.shake = 0.25;
						if (r.spd) {
							r.rolling = true;
							W.sc.remove(r.m);
							W.pg.add(r.m);
							r.m.rotation.set(0, 0, 0);
							r.m.material = r.m.material.clone();
							r.m.material.shadowSide = THREE.FrontSide;
							r.ax = new THREE.Vector3(r.dz, 0, -r.dx);
						} else {
							W.sc.remove(r.m);
							r.m = null;
							r.done = true;
							burst(W.sc, r.x, 1.2, r.z, {
								n: 16,
								shape: "ico",
								cols: ["#7E858F", "#A3ACBB", "#5A6272", "#C9BC9F"],
								spd: 5,
								up: 6,
								grav: 14,
								life: 0.9,
								size: 1.3,
							});
							if (Math.hypot(W.me.x - r.x, W.me.z - r.z) < 18) sfx("crush");
						}
					}
				}
				if (r.rolling) {
					const q = this.rollPos(r, W.t);
					r.m.quaternion.setFromAxisAngle(r.ax, q.d / 1.6);
					const gp = r.m.geometry.attributes.position,
						v = new THREE.Vector3();
					let lo = 0;
					for (let i = 0; i < gp.count; i++)
						lo = Math.min(lo, v.fromBufferAttribute(gp, i).applyQuaternion(r.m.quaternion).y);
					r.m.position.set(
						q.lx,
						q.y - 1.4 + 0.06 - lo,
						q.lz,
					); /* lowest corner always rests just inside the deck (top at .1), so no lit gap opens under it */ // lives in the platform group, so it rides the drift
					if (q.y > 0 && live) {
						const w = this.toWorld(P, q.lx, q.lz);
						this.smash(W, w[0], w[1], 2.4, r.dx, r.dz, P.r);
					}
					if (q.y < this.FLOOR + 1.6) {
						const w = this.toWorld(P, q.lx, q.lz);
						burst(W.sc, w[0], this.FLOOR + 0.8, w[1], {
							n: 20,
							shape: "ico",
							cols: DUST.concat("#7E858F"),
							spd: 4,
							up: 3,
							grav: 2,
							life: 1.6,
							size: 2,
						});
						W.pg.remove(r.m);
						r.m = null;
						r.rolling = false;
						r.done = true;
					}
				}
			});
		},
		smash(W, x, z, rad, dx, dz, pr) {
			// knock out local trucks within rad; a rolling rock also shoves them along its path
			const c = Math.cos(pr || 0),
				n = Math.sin(pr || 0),
				wx = dx * c + dz * n,
				wz = -dx * n + dz * c;
			W.list.forEach((e) => {
				if (!e.local || !e.al || e.d || e.fly) return;
				const d = Math.hypot(e.x - x, e.z - z);
				if (d >= rad) return;
				const k = d || 1;
				e.fly = true;
				e.vy = 11;
				e.vx = ((e.x - x) / k) * 13 + wx * 8;
				e.vz = ((e.z - z) / k) * 13 + wz * 8;
				eliminate(W, e);
				if (e.isMe) {
					W.shake = 0.5;
					sfx("ram");
				}
			});
		},
		rules(W, e) {
			if (e.al && !e.d) e.sc = Math.floor(W.t * 10);
		},
		timeUp(W, e) {
			if (e.al) e.sc = this.dur * 10 + 100;
		},
		bot(W, e, dt) {
			const th = W.rk.find((r) => W.t > r.t - 1.3 && W.t < r.t && Math.hypot(r.x - e.x, r.z - e.z) < 2.8);
			if (th) {
				const s = steer(e, e.x + (e.x - th.x), e.z + (e.z - th.z), 1);
				return s;
			}
			for (const r of W.rk)
				if (r.rolling) {
					const q = this.rollPos(r, W.t),
						w = this.toWorld(W.pl, q.lx, q.lz);
					if (q.y > 0 && Math.hypot(w[0] - e.x, w[1] - e.z) < 5)
						return steer(e, e.x + (e.x - w[0]), e.z + (e.z - w[1]), 1);
				}
			const P = W.pl,
				l = this.toLocal(P, e.x, e.z);
			if (Math.abs(l[0]) > 6.5 || Math.abs(l[1]) > 6.5) return steer(e, P.x, P.z, 0.8);
			wander(W, e, dt, 5);
			const w = this.toWorld(P, e.wp[0], e.wp[1]);
			return steer(e, w[0], w[1], 0.85);
		},
		botScore: () => 80 + rnd(300),
	},
	cones: {
		name: "Cone Smash",
		kind: "arena",
		ctrl: "stick",
		hi: true,
		unit: "%",
		dur: 75,
		bound: { t: "sq", h: 16 },
		water: false,
		bare: true,
		sun: [13.9, 26, 12.1],
		how: "Grab cones (gold = 3) and park on your pad to drop them into your giant cone. First to fill it wins! Ram rivals to knock loose the cones on their roof.",
		dropY: 0,
		S: 16,
		yard(W) {
			/* traffic-cone depot: concrete yard inside a yellow guardrail, the CONE CO. warehouse with a cone machine and conveyor behind, containers on the west, pallets of cones and forklifts on the east, gatehouse and fence in front */
			const s = W.sc,
				S = this.S,
				OR = "#FF7A1A",
				YE = "#FFC83D";
			const out = B(2 * S + 120, 1, 2 * S + 120, "#767C85", 0, -0.5, 0);
			out.castShadow = false;
			s.add(out);
			s.add(texBox(2 * S + 2, 0.2, 2 * S + 2, concreteTex(), 8, 0, -0.08, 0, { color: "#F4F5F7" }));
			roadWear(s, -S, S, S, -S, 0.024, 2.5, 0.4);
			autoTracks(W, "#B4B8BE", 0.03);
			[-1, 1].forEach((sd) => {
				decal(s, new THREE.PlaneGeometry(0.16, 2 * S - 1), YE, sd * (S - 0.6), 0.045, 0, 0.9);
				decal(s, new THREE.PlaneGeometry(2 * S - 1, 0.16), YE, 0, 0.045, sd * (S - 0.6), 0.9);
			}); /* forklift lane lines */
			W.beac = [0, 1].map(
				() => new THREE.MeshStandardMaterial({ color: "#FFB000", emissive: "#FF9500", emissiveIntensity: 1.5 }),
			);
			{
				const R = S + 0.5;
				[-1, 1].forEach((sd) =>
					[0.35, 0.65].forEach((y) => {
						s.add(B(2 * R - 0.1, 0.2, 0.1, YE, 0, y, sd * R), B(0.1, 0.2, 2 * R + 0.1, YE, sd * R, y, 0));
					}),
				); /* yellow guardrail; the long rails stop short of the corners so they never overlap */
				for (let k = 0; k <= 16; k++) {
					const i = -R + (k * 2 * R) / 16;
					[
						[i, -R],
						[i, R],
						[-R, i],
						[R, i],
					].forEach(([x, z], q) => {
						s.add(B(0.16, 0.8, 0.16, "#2A2F3A", x, 0.4, z));
						if (k % 4 === 0) {
							const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), W.beac[(k / 4 + q) % 2]);
							b.position.set(x, 0.92, z);
							s.add(b);
						}
					});
				}
			}
			const ribs = (rep, light, dark, horiz) => {
				const t = canvasTex(32, 32, (x, w, h) => {
					x.fillStyle = light;
					x.fillRect(0, 0, w, h);
					x.fillStyle = dark;
					if (horiz) x.fillRect(0, h * 0.7, w, h * 0.3);
					else x.fillRect(w * 0.7, 0, w * 0.3, h);
				});
				t.wrapS = t.wrapT = THREE.RepeatWrapping;
				t.repeat.set(horiz ? 1 : rep, horiz ? rep : 1);
				return t;
			};
			/* warehouse */
			const WZ = -(S + 14),
				WD = 14,
				WF = WZ + WD / 2;
			{
				const wm = M("#E4E7EB"),
					wh = new THREE.Mesh(new THREE.BoxGeometry(60, 9, WD), wm);
				wh.position.set(0, 4.5, WZ);
				wh.castShadow = wh.receiveShadow = true;
				s.add(wh);
				const P = [];
				for (let x = -29.4; x <= 29.5; x += 1.2)
					if ([-17, 0, 17].every((d) => Math.abs(x - d) > 3.5)) P.push([x, WF + 0.09, 0]);
				for (let z = WZ - WD / 2 + 0.6; z < WF; z += 1.2) [-1, 1].forEach((sd) => P.push([sd * 30.09, z, 1]));
				const rb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 7.6, 0.18), wm, P.length),
					o = new THREE.Object3D();
				P.forEach(([a, b, side], i) => {
					o.position.set(a, 3.8, b);
					o.rotation.y = side ? Math.PI / 2 : 0;
					o.updateMatrix();
					rb.setMatrixAt(i, o.matrix);
				});
				rb.castShadow = true;
				rb.receiveShadow = true;
				s.add(rb);
			} /* raised wall ribs, one every 1.2 m, standing 9 cm proud */
			s.add(B(60.3, 1.1, WD + 0.3, OR, 0, 8.2, WZ), B(60.6, 0.4, WD + 0.6, "#5A6272", 0, 9.2, WZ));
			for (let i = 0; i < 7; i++) {
				const sk = B(7.4, 0.3, WD + 0.2, "#9FB4C8", -24 + i * 8, 9.9, WZ);
				sk.rotation.z = 0.32;
				s.add(sk);
			} /* sawtooth skylights */
			[-17, 0, 17].forEach((x, j) => {
				s.add(B(6.6, 6.6, 0.3, "#2A2F3A", x, 3.3, WF + 0.05));
				const dh = j === 1 ? 2.2 : 6,
					dy = j === 1 ? 5 : 3,
					dm = M("#A9B0B9"),
					d = new THREE.Mesh(new THREE.BoxGeometry(5.8, dh, 0.2), dm);
				d.position.set(x, dy, WF + 0.18);
				s.add(d);
				{
					const n = Math.floor(dh / 0.4),
						rb = new THREE.InstancedMesh(new THREE.BoxGeometry(5.8, 0.14, 0.14), dm, n),
						o = new THREE.Object3D();
					rb.castShadow = rb.receiveShadow = true;
					for (let i = 0; i < n; i++) {
						o.position.set(x, dy - dh / 2 + 0.2 + i * 0.4, WF + 0.31);
						o.updateMatrix();
						rb.setMatrixAt(i, o.matrix);
					}
					s.add(rb);
				}
				/* raised slats, like the Tow Rescue garage roofs */ if (j === 1)
					s.add(B(5.8, 3.8, 0.1, "#1B1F27", x, 1.9, WF + 0.26));
				[-1, 1].forEach((sd) => s.add(B(0.5, 6.4, 0.06, YE, x + sd * 3.05, 3.2, WF + 0.24)));
			});
			{
				const sg = signBoard("CONE CO.", { style: "race", w: 14, h: 2.8, col: OR });
				sg.position.set(0, 12.2, WF - 1);
				s.add(sg);
			}
			{
				const c = new THREE.Group();
				c.position.set(23, 9.4, WZ + 2);
				s.add(c);
				c.add(B(3.4, 0.4, 3.4, "#2A2F3A", 0, 0.2, 0));
				const k = mesh(new THREE.ConeGeometry(1.4, 4.6, 16), OR);
				k.position.y = 2.7;
				c.add(k, Cy(0.86, 1.02, 0.6, 16, "#FFFFFF", 0, 2.5, 0));
			} /* rooftop mascot cone */
			/* cone machine and conveyor along the warehouse front */
			const CZ = WF + 1.4;
			s.add(
				B(2.6, 2.8, 2.2, OR, 10, 1.4, CZ),
				B(1.8, 0.9, 1.6, "#2A2F3A", 10, 3.2, CZ),
				Cy(0.25, 0.25, 2, 8, "#5A6272", 9.4, 4.4, CZ - 0.4),
				B(0.9, 0.6, 0.06, "#9FD8FF", 10.4, 1.8, CZ + 1.12),
			);
			{
				const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), W.beac[0]);
				b.position.set(10.8, 3.85, CZ + 0.4);
				s.add(b);
			}
			s.add(B(13, 0.2, 1.2, "#2A2F3A", 17.8, 1.1, CZ));
			[-1, 1].forEach((sd) => s.add(B(13, 0.3, 0.1, YE, 17.8, 1.3, CZ + sd * 0.62)));
			for (let x = 12; x <= 24; x += 2)
				s.add(B(0.15, 1, 0.15, "#5A6272", x, 0.5, CZ - 0.45), B(0.15, 1, 0.15, "#5A6272", x, 0.5, CZ + 0.45));
			s.add(B(3, 1.4, 3, "#8C5A3C", 25.9, 0.7, CZ), B(3.1, 0.14, 3.1, "#6B4428", 25.9, 1.33, CZ));
			const cone = (n) => {
				const c = new THREE.InstancedMesh(new THREE.ConeGeometry(0.38, 1, 8), M(OR), n),
					w = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.24, 0.29, 0.14, 8), M("#FFFFFF"), n);
				c.castShadow = true;
				s.add(c, w);
				return {
					c,
					w,
					o: new THREE.Object3D(),
					set(i, x, y, z, sc = 1) {
						this.o.position.set(x, y + 0.5 * sc, z);
						this.o.scale.setScalar(sc);
						this.o.updateMatrix();
						this.c.setMatrixAt(i, this.o.matrix);
						this.o.position.y = y + 0.45 * sc;
						this.o.updateMatrix();
						this.w.setMatrixAt(i, this.o.matrix);
					},
					done() {
						this.c.instanceMatrix.needsUpdate = this.w.instanceMatrix.needsUpdate = true;
					},
				};
			};
			W.belt = { cn: cone(9), z: CZ };
			/* west: stacked shipping containers */
			const box = (x, y, z, col, ry) => {
				const m = new THREE.Mesh(
					new THREE.BoxGeometry(6, 2.6, 2.44),
					new THREE.MeshStandardMaterial({ color: col, map: ribs(16, "#FFFFFF", "#C2C6CC"), roughness: 0.7 }),
				);
				m.position.set(x, y + 1.3, z);
				m.rotation.y = ry;
				m.castShadow = m.receiveShadow = true;
				s.add(m);
			};
			[
				[-26, 0, -10, "#2F7DE1"],
				[-26, 2.6, -10, "#E5484D"],
				[-26, 0, -4, "#1FA35C"],
				[-29, 0, 5, "#FFC83D"],
				[-29, 2.6, 5, "#2F7DE1"],
				[-26, 0, 11, "#8E5BE0"],
				[-33, 0, -6, "#E5484D"],
			].forEach(([x, y, z, c]) => box(x, y, z, c, Math.PI / 2));
			/* east: pallets of nested cone towers */
			const pal = [];
			for (let i = 0; i < 6; i++) {
				const x = 28 + (i % 2) * 4,
					z = -10 + Math.floor(i / 2) * 7;
				s.add(B(3, 0.22, 3, "#B07A45", x, 0.11, z));
				[
					[-0.7, -0.7],
					[0.7, -0.7],
					[-0.7, 0.7],
					[0.7, 0.7],
				].forEach(([a, b]) => {
					const n = 4 + Math.floor(W.rng() * 6);
					for (let k = 0; k < n; k++) pal.push([x + a, 0.22 + k * 0.17, z + b]);
				});
			}
			{
				const t = cone(pal.length);
				pal.forEach((p, i) => t.set(i, ...p));
				t.done();
			}
			/* forklifts on the east lane */
			W.fork = [0, 1].map((j) => {
				const g = new THREE.Group();
				s.add(g);
				g.add(
					B(1.7, 0.9, 1.2, YE, 0, 0.75, 0),
					B(0.9, 0.5, 1.1, "#2A2F3A", -0.55, 1.3, 0),
					B(0.08, 1.3, 0.08, "#2A2F3A", 0.2, 1.85, 0.5),
					B(0.08, 1.3, 0.08, "#2A2F3A", 0.2, 1.85, -0.5),
					B(0.08, 1.3, 0.08, "#2A2F3A", -0.7, 1.85, 0.5),
					B(0.08, 1.3, 0.08, "#2A2F3A", -0.7, 1.85, -0.5),
					B(1.1, 0.08, 1.2, "#2A2F3A", -0.25, 2.52, 0),
					B(0.14, 2.6, 1, "#3A404C", 1, 1.3, 0),
				);
				[-1, 1].forEach((sd) => {
					g.add(B(1.2, 0.08, 0.14, "#3A404C", 1.65, 0.2, sd * 0.3));
					[0.5, -0.5].forEach((x) => {
						const w = Cy(0.3, 0.3, 0.2, 12, "#2A2E36", x, 0.3, sd * 0.6);
						w.rotation.x = Math.PI / 2;
						g.add(w);
					});
				});
				g.add(B(1.4, 0.14, 1.4, "#B07A45", 1.65, 0.33, 0));
				const t = cone(4);
				[
					[-0.35, -0.35],
					[0.35, -0.35],
					[-0.35, 0.35],
					[0.35, 0.35],
				].forEach(([a, b], i) => t.set(i, a, 0.4, b, 0.9));
				t.done();
				s.remove(t.c, t.w);
				const ld = new THREE.Group();
				ld.position.x = 1.65;
				ld.add(t.c, t.w);
				g.add(ld);
				const bc = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), W.beac[j]);
				bc.position.set(-0.25, 2.66, 0);
				g.add(bc);
				return { g, ph: j * 3.1, yaw: 0 };
			});
			/* south: gatehouse, barrier arm and fence */
			for (let x = -S - 10; x <= S + 10; x += 3)
				if (Math.abs(x + 12) > 3) s.add(B(0.12, 2.2, 0.12, "#8E96A3", x, 1.1, S + 7));
			{
				const fm = new THREE.MeshBasicMaterial({
					color: "#C9CED8",
					transparent: true,
					opacity: 0.28,
					depthWrite: false,
					side: THREE.DoubleSide,
				});
				[
					[-S - 10, -15],
					[-9, S + 10],
				].forEach(([a, b]) => {
					const f = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 2), fm);
					f.position.set((a + b) / 2, 1.1, S + 7);
					s.add(f);
				});
			}
			s.add(
				B(3, 2.8, 2.6, "#F4F6F9", -18, 1.4, S + 9),
				B(3.3, 0.25, 2.9, OR, -18, 2.9, S + 9),
				B(1.6, 0.8, 0.06, "#9FD8FF", -18, 1.8, S + 7.67),
				B(0.3, 1.1, 0.3, "#2A2F3A", -14.6, 0.55, S + 7),
				B(6, 0.14, 0.14, "#F4F6F9", -11.6, 1.05, S + 7),
			);
			/* yard lights in the corners */
			[
				[-1, -1],
				[1, -1],
				[1, 1],
				[-1, 1],
			].forEach(([a, b]) => {
				const x = a * (S + 6),
					z = b * (S + 6);
				s.add(
					Cy(0.18, 0.26, 11, 8, "#5A6272", x, 5.5, z),
					B(1.6, 0.5, 0.8, "#2A2F3A", x, 11.1, z),
					B(1.4, 0.06, 0.6, "#FFF4D6", x, 10.83, z, { emissive: "#FFF1C2", emissiveIntensity: 0.8 }),
				);
			});
			for (let i = 0; i < 10; i++) {
				const a = W.rng() * 6.28,
					d = 44 + W.rng() * 12;
				s.add(tree(Math.cos(a) * d, Math.sin(a) * d, 1.2 + W.rng() * 0.8, 0));
			}
		},
		GOAL: 30,
		CARRY: Infinity,
		H: 6.4,
		R0: 2.1,
		R1: 0.38,
		/* each player gets a pad inside the barrier and a giant see-through cone just outside it; slots spread round the four sides */
		bases(W) {
			const n = W.plist.length,
				sides = [
					[0, -1],
					[0, 1],
					[1, 0],
					[-1, 0],
				],
				slots = n <= 4 ? sides.map((d) => [d, 0]) : [].concat(...[-6, 6].map((o) => sides.map((d) => [d, o]))),
				P = this.S - 1.8,
				C = this.S + 3.4;
			return W.plist.map((q, i) => {
				const [[dx, dz], o] = slots[i % slots.length],
					tx = -dz,
					tz = dx;
				return {
					k: q.key,
					col: pcol(q),
					px: dx * P + tx * o,
					pz: dz * P + tz * o,
					x: dx * C + tx * o,
					z: dz * C + tz * o,
					lvl: 0,
					seen: 0,
					hops: [],
				};
			});
		},
		giant(W, b) {
			const s = W.sc,
				g = new THREE.Group(),
				{ H, R0, R1 } = this,
				y0 = 0.3,
				r = (f) => R0 + (R1 - R0) * f;
			g.position.set(b.x, 0, b.z);
			s.add(g);
			b.g = g;
			b.y0 = y0;
			g.add(B(4.8, 0.3, 4.8, b.col, 0, 0.15, 0));
			const shell = new THREE.Mesh(
				new THREE.CylinderGeometry(R1, R0, H, 32, 1, true),
				new THREE.MeshStandardMaterial({
					color: b.col,
					transparent: true,
					opacity: 0.22,
					depthWrite: false,
					side: THREE.DoubleSide,
					roughness: 0.2,
					metalness: 0.1,
				}),
			);
			shell.position.y = y0 + H / 2;
			shell.renderOrder = 3;
			g.add(shell);
			const rim = new THREE.Mesh(new THREE.TorusGeometry(R1, 0.07, 6, 20), M(b.col));
			rim.rotation.x = Math.PI / 2;
			rim.position.y = y0 + H;
			g.add(rim);
			b.bands = [0.3, 0.58].map((a) => {
				const m = new THREE.Mesh(
					new THREE.CylinderGeometry(r(a + 0.1) + 0.035, r(a) + 0.035, H * 0.1, 32, 1, true),
					new THREE.MeshStandardMaterial({
						color: "#FFFFFF",
						transparent: true,
						opacity: 0.3,
						depthWrite: false,
						side: THREE.DoubleSide,
					}),
				);
				m.position.y = y0 + H * (a + 0.05);
				m.userData.a = a + 0.05;
				m.renderOrder = 4;
				g.add(m);
				return m;
			});
			b.fill = new THREE.Mesh(new THREE.BufferGeometry(), M(b.col));
			b.fill.visible = false;
			g.add(b.fill);
			decal(s, new THREE.CircleGeometry(2.3, 28), b.col, b.px, 0.06, b.pz, 0.35);
			const ring = new THREE.Mesh(
				new THREE.TorusGeometry(2.3, 0.09, 6, 28),
				new THREE.MeshStandardMaterial({ color: b.col, emissive: b.col, emissiveIntensity: 0.7 }),
			);
			ring.rotation.x = Math.PI / 2;
			ring.position.set(b.px, 0.1, b.pz);
			s.add(ring);
			b.ring = ring;
			this.setFill(b);
		},
		setFill(b) {
			const { H, R0, R1 } = this,
				f = Math.min(1, b.lvl / this.GOAL),
				pct = Math.floor(
					f * 100,
				); /* the solid cone grows from the bottom; the white bands go solid once the fill passes them */
			if (f > 0) {
				const h = H * f,
					rt = R0 + (R1 - R0) * f - 0.04;
				b.fill.geometry.dispose();
				b.fill.geometry = new THREE.CylinderGeometry(Math.max(0.05, rt), R0 - 0.04, h, 32);
				b.fill.position.y = b.y0 + h / 2;
				b.fill.visible = true;
			}
			b.bands.forEach((m) => {
				const on = f >= m.userData.a;
				m.material.opacity = on ? 1 : 0.3;
				m.material.depthWrite = on;
			});
			if (b.pct !== pct) {
				b.pct = pct;
				if (b.lab) {
					b.g.remove(b.lab);
					b.lab.material.map.dispose();
				}
				b.lab = textSprite(pct >= 100 ? "FULL!" : pct + "%", b.col, "#FFFFFF", 2);
				b.lab.position.y = b.y0 + this.H + 1.1;
				b.g.add(b.lab);
			}
		},
		build(W) {
			this.yard(W);
			W.items = []; /* tuned in the light panel: ambient .40, sun .86, height 26, angle 41, warmth .44, haze 50 */
			{
				const h = W.sc.children.find((o) => o.isHemisphereLight);
				if (h) h.intensity = 0.4;
				W.sun.intensity = 0.86;
				W.sun.color.set("#E4EEFF").lerp(new THREE.Color("#FFC27A"), 0.44);
				W.lpWarm = 0.44;
				if (W.sc.fog) {
					W.sc.fog.near = 50;
					W.sc.fog.far = 50 * 3.8;
				}
			}
			const n = W.plist.length,
				A = 2 * (this.S - 1.5);
			W.base = this.bases(W);
			W.base.forEach((b) => this.giant(W, b));
			const spot = () => {
				for (let t = 0; t < 60; t++) {
					const x = (W.rng() - 0.5) * A,
						z = (W.rng() - 0.5) * A;
					if (Math.hypot(x, z) > 3.5 && W.base.every((b) => Math.hypot(b.px - x, b.pz - z) > 3.2)) return [x, z];
				}
				return [(W.rng() - 0.5) * 6, 8];
			};
			const add = (at) => {
				const [x, z] = spot(),
					gold = W.items.length % 9 === 0;
				W.items.push({ id: W.items.length + 1, x, z, v: gold ? 3 : 1, at, m: null });
			};
			for (let i = 0; i < 20 + 8 * n; i++) add(0);
			for (let t = 3; t < this.dur; t += 2.6 / n) add(t); /* more cones keep raining down all game */
		},
		dropMesh(v) {
			const g = new THREE.Group(),
				gold = v === 3;
			g.add(
				mesh(
					new THREE.ConeGeometry(0.38, 1, 8),
					gold ? "#FFC83D" : "#FF7A1A",
					gold ? { emissive: "#B8860B", emissiveIntensity: 0.5, metalness: 0.4 } : undefined,
				),
			);
			g.children[0].position.y = 0.5;
			g.add(Cy(0.24, 0.29, 0.14, 8, "#FFFFFF", 0, 0.45, 0));
			return g;
		},
		avail(W, it) {
			return !W.claimed.has(it.id) && (it.drop ? W.t >= it.t : W.t >= it.at);
		},
		spawn(W, i, n) {
			const b = W.base[i],
				a = Math.atan2(-b.pz, b.px);
			return { x: b.px * 0.72, z: b.pz * 0.72, yaw: a + Math.PI };
		},
		initEnt(W, e) {
			e.f = { cl: [], bk: 0, bl: [] };
			e.bq = 5 + Math.floor(Math.random() * 5);
		},
		onClaim(W, id) {
			const it = (W.itemMap && W.itemMap[id]) || W.items[id - 1];
			if (it && it.m) it.fly = { t: 0, vx: (Math.random() - 0.5) * 8, vz: (Math.random() - 0.5) * 8 };
		},
		tick(W, dt) {
			W.items.forEach((it) => {
				if (!it.fly || !it.m) return;
				it.fly.t += dt;
				const m = it.m;
				m.position.x += it.fly.vx * dt;
				m.position.z += it.fly.vz * dt;
				m.position.y = Math.max(-1, 5 * it.fly.t - 9 * it.fly.t * it.fly.t);
				m.rotation.x += dt * 9;
				if (it.fly.t > 1.2) m.visible = false;
			});
		},
		rules(W, e, dt) {
			if (e.d) return;
			const f = e.f,
				b = W.base[e.i];
			if (f.cl.length < this.CARRY)
				W.items.forEach((it) => {
					if (f.cl.length < this.CARRY && this.avail(W, it) && Math.hypot(it.x - e.x, it.z - e.z) < 1.25) {
						W.claim(it.id);
						e.c.push(it.id);
						f.cl.push(it.v);
					}
				});
			if (f.cl.length && Math.hypot(b.px - e.x, b.pz - e.z) < 2.4) {
				e.bkT = (e.bkT || 0) + dt;
				if (e.bkT >= 0.3) {
					e.bkT = 0;
					const v = f.cl.pop();
					f.bk += v;
					f.bl.push(v);
				}
			} else e.bkT = 0; /* one cone hops off every 0.3 s while you stay on your pad */
			e.sc = Math.min(100, Math.floor((f.bk / this.GOAL) * 100));
			if (f.bk >= this.GOAL) {
				e.sc = 100 + Math.max(0, Math.round(this.dur - W.t));
				e.d = true;
				if (e.isMe) sfx("fanfare");
			}
		},
		cam(W, tgt, pos, far) {
			if (W.tv) return tvCam(W);
			if (!W.me || !W.me.d) return [tgt, pos]; /* once you are finished, pull back to show every truck */
			const L = W.list.filter((o) => !o.gone);
			let cx = 0,
				cz = 0,
				r = 0;
			L.forEach((o) => {
				cx += o.x / L.length;
				cz += o.z / L.length;
			});
			L.forEach((o) => {
				r = Math.max(r, Math.hypot(o.x - cx, o.z - cz));
			});
			const k = Math.max(1.3, (r + 6) / 9) * far * 0.85;
			return [new THREE.Vector3(cx, 0, cz), new THREE.Vector3(cx, 23 * k, cz + 17 * k)];
		},
		fmtV: (v) => (v > 100 ? `FULL +${v - 100}s` : v >= 100 ? "FULL" : `${v}%`),
		onRammed(W, e) {
			const cl = e.f.cl;
			if (!cl.length || (e.lootCD || 0) > W.t)
				return; /* only the cones on your roof come loose; banked ones are safe */
			const k = Math.min(cl.length, Math.max(1, Math.ceil(cl.length * 0.5))),
				h = this.S - 0.8;
			e.lootCD = W.t + 1;
			e.lootN = e.lootN || 0;
			e.dr = e.dr || [];
			for (let i = 0; i < k; i++) {
				const v = cl.pop(),
					a = Math.random() * 6.28,
					r = 2.1 + Math.random() * 1.5,
					x = Math.max(-h, Math.min(h, e.x + Math.cos(a) * r)),
					z = Math.max(-h, Math.min(h, e.z + Math.sin(a) * r)),
					id = 100000 + e.i * 1000 + (e.lootN++ % 1000);
				addDrop(W, id, x, z, e.x, e.z, v);
				e.dr.push([id, Math.round(x * 100) / 100, Math.round(z * 100) / 100, v]);
			}
			if (e.dr.length > 30) e.dr = e.dr.slice(-30);
			if (e.isMe) {
				e.lastDrop = { t: W.t, n: k, flank: "", what: "cone" };
				sfx("loss");
			}
		},
		render(W, e, dt) {
			if (W.bcT !== W.t) {
				W.bcT = W.t;
				const on = Math.floor(W.t * 2.5) % 2;
				W.beac[0].emissiveIntensity = on ? 2.2 : 0.05;
				W.beac[1].emissiveIntensity = on ? 0.05 : 2.2;
				{
					const B_ = W.belt;
					for (let i = 0; i < 9; i++)
						B_.cn.set(i, 11.4 + ((((W.t * 1.1 + (i * 14) / 9) % 14) + 14) % 14) * 0.9, 1.2, B_.z);
					B_.cn.done();
				} /* cones riding the conveyor into the crate */
				W.fork.forEach((f, j) => {
					const a = W.t * 0.35 + f.ph,
						z = (j ? 7 : -7) + Math.sin(a) * 6;
					f.yaw = lerpA(f.yaw, Math.cos(a) > 0 ? -Math.PI / 2 : Math.PI / 2, Math.min(1, dt * 3));
					f.g.position.set(23.6, 0, z);
					f.g.rotation.y = f.yaw;
				});
				W.items.forEach((it) => {
					if (it.drop || (it.fly || W.claimed.has(it.id) ? !it.m : W.t < it.at - 1.1)) return;
					if (!it.m) {
						it.m = this.dropMesh(it.v);
						W.sc.add(it.m);
					} /* falls in from the sky over 1.1 s */
					if (it.fly) return;
					if (W.claimed.has(it.id)) {
						it.m.visible = false;
						return;
					}
					const u = Math.min(1, (W.t - it.at + 1.1) / 1.1);
					it.m.position.set(it.x, 9 * (1 - u * u), it.z);
					it.m.rotation.y = it.id;
					if (u >= 1 && !it.landed) {
						it.landed = true;
						if (it.at > 0)
							burst(W.sc, it.x, 0.2, it.z, {
								n: 5,
								shape: "ico",
								cols: ["#C9BC9F", "#A58F72"],
								spd: 2,
								up: 2,
								grav: 10,
								life: 0.4,
								size: 0.5,
							});
					}
				});
				W.base.forEach((b) => {
					const hot = W.me && W.base[W.me.i] === b && W.me.f.cl && W.me.f.cl.length;
					b.ring.scale.setScalar(1 + Math.sin(W.t * (hot ? 7 : 3)) * (hot ? 0.1 : 0.03));
					b.ring.material.emissiveIntensity = hot ? 1.3 + Math.sin(W.t * 7) * 0.5 : 0.7;
					b.pop = Math.max(0, (b.pop || 0) - dt * 4);
					{
						const p = b.pop * b.pop;
						b.g.scale.set(1 + 0.14 * p, 1 + 0.06 * p, 1 + 0.14 * p);
					} /* pops out a little with every cone that lands */
					b.hops = b.hops.filter((q) => {
						q.t += dt;
						if (q.t < 0) return true;
						const u = Math.min(1, q.t / 0.6),
							top = b.y0 + this.H + 0.4,
							lv = b.y0 + this.H * Math.min(1, b.lvl / this.GOAL);
						let x, y, z;
						if (u < 0.75) {
							const k = u / 0.75;
							x = q.x0 + (b.x - q.x0) * k;
							z = q.z0 + (b.z - q.z0) * k;
							y = q.y0 + (top - q.y0) * k + Math.sin(k * Math.PI) * 2.2;
						} else {
							const k = (u - 0.75) / 0.25;
							x = b.x;
							z = b.z;
							y = top + (lv - top) * k;
						}
						q.m.visible = true;
						q.m.position.set(x, y, z);
						q.m.rotation.x += dt * 8;
						if (u >= 1) {
							W.sc.remove(q.m);
							b.lvl += q.v;
							b.pop = 1;
							this.setFill(b);
							burst(W.sc, b.x, b.y0 + this.H, b.z, {
								n: 5,
								shape: "ico",
								cols: q.v === 3 ? ["#FFC83D", "#FFFFFF"] : ["#FF7A1A", "#FFFFFF"],
								spd: 2,
								up: 3,
								grav: 10,
								life: 0.4,
								size: 0.4,
							});
							if (W.me && W.base[W.me.i] === b) sfx("coin");
							return false;
						}
						return true;
					});
				});
			}
			const b = W.base[e.i],
				f = e.f || {},
				bl = f.bl || [],
				cl = f.cl || [];
			if (e.stkTop === undefined) {
				const bb = new THREE.Box3().setFromObject(e.tr);
				e.stkTop = bb.max.y - e.g.position.y - 0.05;
			}
			while (b && b.seen < bl.length) {
				const v = bl[b.seen++],
					m = this.dropMesh(v);
				m.scale.setScalar(0.7);
				m.visible = false;
				W.sc.add(m);
				b.hops.push({
					m,
					v,
					t: -0.08 * b.hops.length,
					x0: e.x,
					z0: e.z,
					y0: e.g.position.y + e.stkTop + cl.length * 0.2,
				});
			} /* new banked cones hop from the roof stack into the giant cone */
			const n = cl.length,
				sig = cl.join("");
			e.stk = e.stk || [];
			if (e.stkSig !== sig) {
				e.stkSig = sig;
				e.stk.forEach((c) => e.g.remove(c));
				e.stk = cl.map((v) => {
					const c = this.dropMesh(v);
					c.scale.setScalar(0.7);
					e.g.add(c);
					return c;
				});
			}
			/* the stack is a springy column: it leans against the truck's acceleration (back when speeding up, outward in turns), overshoots and settles, bending more towards the top */
			const st = Math.max(0.001, Math.min(0.05, dt || 0.016)),
				vx = e.vx || 0,
				vz = e.vz || 0,
				ax = Math.max(-60, Math.min(60, (vx - (e.svx ?? vx)) / st)),
				az = Math.max(-60, Math.min(60, (vz - (e.svz ?? vz)) / st));
			e.svx = vx;
			e.svz = vz;
			const sp = Math.min(1, Math.hypot(vx, vz) / 11),
				tall = Math.min(1.8, 0.4 + (0.6 * n) / 10),
				wob = 0.035 * sp * tall;
			for (const [L, V, A, ph] of [
				["swX", "swVX", ax, 0],
				["swZ", "swVZ", az, 1.7],
			]) {
				const tgt =
					Math.max(-0.4363, Math.min(0.4363, -A * 0.032 * tall)) + Math.sin(W.t * 3.1 + ph + (e.i || 0)) * wob;
				e[V] = (e[V] || 0) + (-(80 / tall) * ((e[L] || 0) - tgt) - 7 * (e[V] || 0)) * st;
				e[L] = Math.max(-0.4363, Math.min(0.4363, (e[L] || 0) + e[V] * st));
			}
			let x = -0.05,
				y = e.stkTop,
				z = 0;
			e.stk.forEach((c, k) => {
				const f = n > 1 ? 0.35 + (0.65 * k) / (n - 1) : 1,
					tx = (e.swX || 0) * f,
					tz = (e.swZ || 0) * f;
				c.position.set(x, y, z);
				c.rotation.set(tz, 0, -tx);
				x += Math.sin(tx) * 0.2;
				z += Math.sin(tz) * 0.2;
				y += Math.cos(Math.hypot(tx, tz)) * 0.2;
			});
		},
		bot(W, e) {
			const f = e.f,
				n = f.cl.length,
				b = W.base[e.i],
				carried = f.cl.reduce(
					(a, v) => a + v,
					0,
				); /* bank when the roof is full, when it would finish the cone, or near the end */
			if (n && (n >= Math.min(this.CARRY, e.bq) || carried >= this.GOAL - f.bk || W.t > this.dur - 10)) {
				const d = Math.hypot(b.px - e.x, b.pz - e.z);
				return d < 1 ? { x: 0, y: 0 } : steer(e, b.px, b.pz, d < 3 ? 0.45 : 0.9);
			}
			const it = nearestItem(W, e, W.items, (i) => this.avail(W, i));
			return botRam(W, e, it ? steer(e, it.x, it.z, 0.8) : wander(W, e, 0.016, 9));
		},
		botScore: () => 30 + rnd(70),
	},
	drag: {
		name: "Drag Race",
		kind: "lane",
		ctrl: "tap",
		hi: false,
		liveHi: true,
		unit: "ms",
		dur: 35,
		tapLabel: "TAP TO REV",
		tapHint: "Tap as fast as you can to build speed.",
		how: "Tap as fast as you can. Fastest to 200 m wins.",
		build(W) {
			const s = W.sc,
				wid = laneWorld(W, 220, { noTrees: true });
			gantry(s, wid, -200, 5, "#151B24");
			{
				// laid-down rubber in the launch zone of every lane, darkest at the line
				const rub = canvasTex(32, 256, (x, w, h) => {
						const q = x.createLinearGradient(0, h, 0, 0);
						q.addColorStop(0, "rgba(16,16,18,.75)");
						q.addColorStop(0.35, "rgba(16,16,18,.35)");
						q.addColorStop(1, "rgba(16,16,18,0)");
						x.fillStyle = q;
						x.fillRect(4, 0, w - 8, h);
						for (let i = 0; i < 6; i++) {
							x.fillStyle = "rgba(10,10,12,.25)";
							x.fillRect(6 + Math.random() * (w - 14), h * (0.4 + Math.random() * 0.6), 2, -h * Math.random() * 0.5);
						}
					}),
					rm = new THREE.MeshBasicMaterial({
						map: rub,
						transparent: true,
						depthWrite: false,
						polygonOffset: true,
						polygonOffsetFactor: -3,
					});
				W.plist.forEach((p, i) =>
					[-0.5, 0.5].forEach((o) => {
						const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 70), rm);
						m.rotation.x = -Math.PI / 2;
						m.position.set(W.laneX(i) + o, 0.108, -33);
						m.renderOrder = 1;
						s.add(m);
					}),
				);
			}
			const f = new THREE.Mesh(
				new THREE.PlaneGeometry(wid, 1.2),
				new THREE.MeshBasicMaterial({
					map: canvasTex(256, 32, (x) => {
						for (let i = 0; i < 32; i++)
							for (let j = 0; j < 4; j++) {
								x.fillStyle = (i + j) % 2 ? "#151B24" : "#fff";
								x.fillRect(i * 8, j * 8, 8, 8);
							}
					}),
				}),
			);
			f.rotation.x = -Math.PI / 2;
			f.material.polygonOffset = true;
			f.material.polygonOffsetFactor = -2;
			f.position.set(0, 0.106, -200);
			s.add(f);
			grandstands(W, wid, 14, -232);
			// run-off past the finish: a crash cushion per lane in front of a concrete wall
			const wall = B(wid + 2.4, 3.2, 1, "#C9CED8", 0, 1.6, this.PADZ - 3.65);
			s.add(wall);
			const chev = new THREE.Mesh(
				new THREE.PlaneGeometry(wid + 2.4, 0.8),
				new THREE.MeshBasicMaterial({ map: stripeTex() }),
			);
			chev.position.set(0, 2.7, this.PADZ - 3.12);
			s.add(chev);
			W.pads = W.plist.map((p, i) => {
				const g = new THREE.Group();
				g.position.set(W.laneX(i), 0, this.PADZ - 3.07);
				s.add(g);
				[
					[0.55, "#E5484D"],
					[1.55, "#FFC83D"],
					[2.45, "#E5484D"],
				].forEach(([y, c], k) => {
					const r = k === 2 ? 0.42 : 0.52;
					[0, 1].forEach((j) => {
						const cy = Cy(r, r, 3.1, 12, j ? "#F4F6F9" : c, 0, y, 0.55 + j * 1.1 - (k === 2 ? 0.3 : 0));
						cy.rotation.z = Math.PI / 2;
						if (!(k === 2 && j)) g.add(cy);
					});
				});
				return { g, sq: 0, w: 0 };
			});
			// lane dashes and distance boards: things whizzing past are what sell the speed
			roadLines(
				s,
				W.plist.map((p, i) => W.laneX(i)),
				-3.9,
				-198,
				0.106,
				{ w: 0.16, dash: 2.2, gap: 3.8 },
			);
			for (let d = 25; d < 200; d += 25) {
				const tex = canvasTex(96, 48, (x, w, h) => {
					x.fillStyle = "#FFC83D";
					x.fillRect(0, 0, w, h);
					x.fillStyle = "#151B24";
					x.fillRect(3, 3, w - 6, h - 6);
					x.font = "28px Bungee, 'Arial Black', Impact, sans-serif";
					x.textAlign = "center";
					x.textBaseline = "middle";
					x.fillStyle = "#FFFFFF";
					x.fillText(String(200 - d), w / 2, h / 2 + 2);
				});
				[-1, 1].forEach((sd) => {
					const x = sd * (wid / 2 + 1.1);
					s.add(B(0.2, 2.6, 0.2, "#555C69", x, 2.4, -d));
					const b = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: tex }));
					b.position.set(x, 3.6, -d + 0.12);
					s.add(b);
				});
			}
			const lines = new THREE.Group(),
				lm = new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0, depthWrite: false }),
				lg = new THREE.BoxGeometry(0.06, 0.06, 1);
			s.add(lines);
			W.lines = [];
			for (let i = 0; i < 44; i++) {
				const m = new THREE.Mesh(lg, lm);
				m.userData.o = [(W.rng() < 0.5 ? -1 : 1) * (1.5 + W.rng() * 5), 0.4 + W.rng() * 4.5];
				m.position.z = -W.rng() * 70;
				lines.add(m);
				W.lines.push(m);
			}
			W.lineMat = lm;
			const v = document.createElement("div");
			v.id = "spdfx";
			v.style.cssText =
				"position:absolute;inset:0;pointer-events:none;z-index:1;opacity:0;background:radial-gradient(ellipse at 50% 45%,transparent 45%,rgba(255,255,255,.18) 75%,rgba(255,236,190,.45) 100%)";
			($("#mg") || document.body).appendChild(v);
			W.vig = v;
			W.spd = 0;
		},
		spawn: laneSpawn,
		fmt: (W, e) => `${Math.round(-e.z)} m`,
		tap(W, e) {
			e.v = Math.min(34, (e.v || 0) + 1.35);
			if (e.isMe && W.t >= 0 && !e.d)
				burst(W.sc, e.x, 0.6, e.z + 1.7, {
					n: 2,
					shape: "ico",
					cols: ["#6F7888", "#A3ACBB"],
					spd: 0.6,
					up: 1.4,
					grav: -1,
					life: 0.5,
					size: 0.8,
				});
		},
		TIERS: [
			[45, "Rolling!"],
			[75, "Fast!"],
			[100, "Blazing!"],
			[118, "MAX SPEED!"],
		],
		coast(W, e, dt) {
			// after the line: brake to a stop, or bounce off the cushion
			const v0 = e.v || 0;
			if (Math.abs(v0) < 0.05) {
				e.v = 0;
				e.vz = 0;
				return;
			}
			e.v = Math.sign(v0) * Math.max(0, Math.abs(v0) - this.BRAKE * (v0 < 0 ? 1.6 : 1) * dt);
			e.z -= e.v * dt;
			e.vz = -e.v;
			if (e.v > 0 && e.z <= this.PADZ) {
				e.z = this.PADZ;
				e.crash = Math.round(e.v * 3.6);
				e.v = -e.v * 0.3;
			}
		},
		padHit(W, e, kmh) {
			const p = W.pads && W.pads[e.i];
			if (!p) return;
			p.sq = Math.min(1, 0.35 + kmh / 80);
			p.w = 1;
			burst(W.sc, e.x, 1.6, this.PADZ - 1, {
				n: 10 + Math.round(kmh / 6),
				shape: "cube",
				cols: ["#E5484D", "#FFC83D", "#F4F6F9"],
				spd: 4,
				up: 6,
				grav: 12,
				life: 1.1,
				floor: 0.2,
			});
			if (e.isMe) {
				W.shake = 0.5;
				W.roar = 1;
				sfx("ram");
				sfx("crush");
			} else if (Math.abs(e.z - W.me.z) < 30) sfx("ram");
		},
		render(W, e, dt) {
			const v = e.v || 0,
				sp = v / 34;
			if (e.local && e.crossed) this.coast(W, e, dt);
			if (e.z <= this.PADZ + 0.2 && !e.padT) {
				e.padT = true;
				this.padHit(W, e, e.crash || Math.round(v * 3.6));
			} // remote trucks: detect by position
			if (e.isMe && W.pads)
				W.pads.forEach((p) => {
					p.sq = Math.max(0, p.sq - dt * 1.6);
					p.w *= Math.exp(-dt * 4);
					p.g.scale.z = 1 - p.sq * 0.5 + Math.sin(W.t * 26) * p.w * 0.08;
					p.g.scale.y = 1 + p.sq * 0.12;
				});
			// nose lifts under hard acceleration, body buzzes at speed
			const acc = (v - (e.pv === undefined ? v : e.pv)) / Math.max(dt, 0.001);
			e.pv = v;
			e.pitch = (e.pitch || 0) + (Math.max(0, Math.min(0.12, acc * 0.012)) - (e.pitch || 0)) * Math.min(1, dt * 10);
			e.tr.rotation.z += e.pitch + (Math.random() - 0.5) * 0.025 * sp;
			if (!e.d && v > 12 && Math.random() < (sp - 0.3) * (e.isMe ? 1.4 : 0.6))
				burst(W.sc, e.x + (Math.random() - 0.5) * 0.8, 0.55, e.z + 1.7, {
					n: 1 + (sp > 0.85),
					shape: "ico",
					cols: sp > 0.85 ? ["#8FD3FF", "#FFFFFF", "#FFC83D"] : ["#FFC83D", "#FF8A1F", "#E5484D"],
					spd: 0.5,
					up: 0.8,
					grav: 0,
					life: 0.22,
					size: 0.5 + sp * 0.5,
				});
			if (!e.isMe) return;
			const tgt = e.d ? 0 : sp;
			W.spd += (tgt - W.spd) * Math.min(1, dt * 3);
			const S = W.spd;
			W.jit = S * S * 0.14 + (W.kick || 0);
			W.kick = Math.max(0, (W.kick || 0) - dt * 0.8);
			W.lineMat.opacity = Math.max(0, Math.min(0.6, (S - 0.35) * 1.3));
			W.lines.forEach((m) => {
				m.position.z += v * 0.9 * dt;
				if (m.position.z > e.z + 12) m.position.z = e.z - 45 - Math.random() * 30;
				m.position.x = e.x + m.userData.o[0];
				m.position.y = m.userData.o[1];
				m.scale.z = 0.5 + S * 7;
			});
			if (W.vig) W.vig.style.opacity = (Math.max(0, S - 0.3) * 1.4).toFixed(3);
			const kmh = v * 3.6;
			e.tier = e.tier || 0;
			if (!e.d && e.tier < this.TIERS.length && kmh >= this.TIERS[e.tier][0]) {
				e.msg = this.TIERS[e.tier][1];
				e.msgT = W.t;
				e.tier++;
				W.kick = 0.12 + e.tier * 0.04;
				sfx("beep");
			}
			if (e.d && !W.cheered) {
				W.cheered = true;
				burst(W.sc, e.x, 3, -200, {
					n: 36,
					shape: "cube",
					cols: ["#FFC83D", "#FF6FAE", "#2F7DE1", "#1FA35C", "#FFFFFF"],
					spd: 5,
					up: 9,
					grav: 9,
					life: 1.6,
				});
				sfx("fanfare");
				W.roar = 1;
			}
			W.roar = Math.max(0, (W.roar || 0) - dt * 0.4);
			crowdStep(W, e.z, Math.max(S, W.roar));
			if (!W.eng && W.t >= -4) W.eng = engineSnd() || { set() {}, stop() {} };
			if (W.eng) W.eng.set(S, 0.012 + S * 0.03 + W.roar * 0.05, !e.d || W.roar > 0.2);
		},
		cam(W, tgt, pos, far) {
			const S = W.spd || 0;
			pos.y -= S * 2.6;
			pos.z -= S * 3;
			tgt.y += S * 1.6;
			camFov(40 + 26 * Math.pow(S, 1.4));
			return [tgt, pos];
		},
		prompt: (W, e) => (e.msg && W.t - e.msgT < 1.1 ? e.msg : ""),
		donePrompt: (W, e) => (e.crash ? `CRASH! Hit the cushion at ${e.crash} km/h` : ""),
		stop(W) {
			if (W.eng) W.eng.stop();
			if (W.vig) W.vig.remove();
		},
		PADZ: -224.3,
		BRAKE: 15.8, // ~100 km/h at the line is exactly enough to reach the cushion
		rules(W, e, dt) {
			if (e.d) return;
			e.v = (e.v || 0) * Math.exp(-0.75 * dt);
			e.z -= e.v * dt;
			e.vz = -e.v;
			e.sc = Math.round(-e.z);
			if (-e.z >= 200) {
				e.z = -200;
				e.d = true;
				e.crossed = true;
				e.fin = Math.round(W.t * 1000);
			}
		},
		timeUp(W, e) {
			e.fin = 35000 + Math.round((200 + e.z) * 100);
		},
		final: (W, e) => e.fin || 35000 + Math.round((200 + e.z) * 100),
		bot(W, e, dt) {
			e.bt = (e.bt || 0) - dt;
			if (e.bt <= 0) {
				this.tap(W, e);
				e.bt = 1 / (5 + Math.random() * 3.5);
			}
		},
		botScore: () => 9000 + rnd(6000),
	},
	light: {
		name: "Green Light",
		kind: "lane",
		ctrl: "custom",
		hi: true,
		unit: "pts",
		dur: 45,
		bare: true,
		LEN: 110,
		how: "Hold to drive on green, let go before red or the lorry gets you. First to the finish wins.",
		tapHint: "Hold the pedal (or Space) to drive.",
		build(W) {
			const s = W.sc,
				wid = laneWorld(W, this.LEN + 20, { noTrees: true });
			gantry(s, wid, -this.LEN, 5, "#151B24");
			const f = new THREE.Mesh(
				new THREE.PlaneGeometry(wid, 1.2),
				new THREE.MeshBasicMaterial({
					map: canvasTex(256, 32, (x) => {
						for (let i = 0; i < 32; i++)
							for (let j = 0; j < 4; j++) {
								x.fillStyle = (i + j) % 2 ? "#151B24" : "#fff";
								x.fillRect(i * 8, j * 8, 8, 8);
							}
					}),
				}),
			);
			f.rotation.x = -Math.PI / 2;
			f.material.polygonOffset = true;
			f.material.polygonOffsetFactor = -2;
			f.position.set(0, 0.106, -this.LEN);
			s.add(f);
			this.city(W, wid);
			// the light schedule comes from the shared seed so every device sees the same lights
			W.cyc = [];
			let t = 0;
			while (t < this.dur + 5) {
				const g = 1.6 + W.rng() * 2.6,
					y = 0.9,
					r = 1.4 + W.rng() * 1.6;
				W.cyc.push({ g: t + g, y: t + g + y, r: t + g + y + r });
				t += g + y + r;
			}
			W.lamps = [];
			for (let z = -8; z > -this.LEN; z -= 24) {
				const g = new THREE.Group();
				g.position.set(0, 0, z);
				s.add(g);
				g.add(
					B(0.3, 6.4, 0.3, "#2A2F3A", wid / 2 + 0.9, 3.2, 0),
					B(wid / 2 + 1.2, 0.3, 0.3, "#2A2F3A", wid / 4 + 0.3, 6.2, 0),
					B(1, 2.6, 0.8, "#151B24", 0, 5.2, 0),
				);
				W.lamps.push(
					["#E5484D", "#FFC83D", "#27C15C"].map((c, k) => {
						const m = new THREE.Mesh(
							new THREE.SphereGeometry(0.34, 12, 8),
							new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0 }),
						);
						m.position.set(0, 6.05 - k * 0.82, 0.42);
						g.add(m);
						return m;
					}),
				);
			}
			const cam = new THREE.Group();
			cam.position.set(-wid / 2 - 1.2, 0, -30);
			s.add(cam);
			const lens = Cy(0.18, 0.18, 0.2, 10, "#151B24", 0.78, 4.5, 0);
			lens.rotation.z = Math.PI / 2;
			cam.add(B(0.25, 4.4, 0.25, "#5A6272", 0, 2.2, 0), B(0.9, 0.6, 0.6, "#F4F6F9", 0.3, 4.5, 0), lens);
			W.lorries = {};
			W.peds = [];
			const SH = ["#E5484D", "#2F7DE1", "#FFC83D", "#8E5BE0", "#1FA35C", "#FF8A1F"];
			W.lamps.forEach((l, k) => {
				const z = -8 - k * 24 + 3.2;
				for (let x = -wid / 2 + 0.5; x < wid / 2; x += 1.1)
					decal(s, new THREE.PlaneGeometry(0.6, 2.4), "#F4F6F9", x, 0.115, z, 0.9);
				for (let q = 0; q < 2; q++) {
					const g = new THREE.Group(),
						sd = q ? 1 : -1;
					g.add(B(0.5, 0.8, 0.35, SH[(k * 2 + q) % SH.length], 0, 1.15, 0));
					const h = mesh(new THREE.IcosahedronGeometry(0.24, 1), ["#F2C9A0", "#A8714A", "#D9A273"][(k + q) % 3]);
					h.position.y = 1.8;
					g.add(h);
					const legs = [-0.13, 0.13].map((o) => {
						const lg = new THREE.Group();
						lg.position.set(o, 0.75, 0);
						lg.add(B(0.18, 0.75, 0.18, "#2A2F3A", 0, -0.37, 0));
						g.add(lg);
						return lg;
					});
					g.position.set(sd * (wid / 2 + 1.4), 0.25, z + (q ? 0.5 : -0.5));
					s.add(g);
					W.peds.push({ g, legs, side: sd, x: sd * (wid / 2 + 1.4), edge: wid / 2 + 1.4, sp: 1.6 + q * 0.4 });
				}
			});
		},
		walkPeds(W, dt, red) {
			W.peds.forEach((p) => {
				const tx = -p.side * p.edge,
					moving = red && Math.abs(p.x - tx) > 0.05;
				if (moving) {
					p.x += Math.sign(tx - p.x) * Math.min(Math.abs(tx - p.x), p.sp * dt);
					if (Math.abs(p.x - tx) <= 0.05) p.side = -p.side;
				}
				const sw = moving ? Math.sin(W.t * 9 + p.sp) * 0.5 : 0;
				p.legs[0].rotation.x = sw;
				p.legs[1].rotation.x = -sw;
				p.g.position.x = p.x;
				p.g.position.y = 0.25 + (moving ? Math.abs(Math.sin(W.t * 9 + p.sp)) * 0.06 : 0);
				p.g.rotation.y = moving ? (tx > p.x ? Math.PI / 2 : -Math.PI / 2) : p.side > 0 ? -Math.PI / 2 : Math.PI / 2;
			});
		},
		furniture(W, wid) {
			// kerbside clutter: hydrants, bins, benches, planters, bollards, newspaper boxes; kept clear of lamp posts, traffic lights and crossings
			const s = W.sc,
				near = (z, step, off, r) => Math.abs(((((z - off) % step) + step + step / 2) % step) - step / 2) < r;
			let k = 0;
			[-1, 1].forEach((sd) => {
				for (let z = 6; z > -this.LEN - 15; z -= 4.5, k++) {
					if (
						near(z, 15, 0, 1.6) ||
						near(z, 24, -8, 1.6) ||
						near(z, 24, -4.8, 2.4) ||
						(sd < 0 && Math.abs(z + 30) < 1.6)
					)
						continue;
					const x = sd * (wid / 2 + 1.15),
						g = new THREE.Group();
					g.position.set(x, 0.25, z);
					const ty = (k * 5 + (sd > 0 ? 2 : 0)) % 6,
						fp = [
							[0.5, 0.5],
							[0.6, 0.6],
							[0.6, 1.7],
							[0.9, 0.9],
							[0.25, 1.25],
							[0.45, 0.4],
						][ty];
					g.add(contactShadow(fp[0], fp[1], 0.3));
					switch (ty) {
						case 0:
							g.add(Cy(0.16, 0.2, 0.55, 10, "#D93A35", 0, 0.28, 0), Cy(0.12, 0.17, 0.14, 10, "#B52A26", 0, 0.62, 0));
							g.add(Cy(0.07, 0.07, 0.5, 6, "#B52A26", 0, 0.35, 0).rotateZ(Math.PI / 2));
							break;
						case 1:
							g.add(Cy(0.28, 0.24, 0.85, 12, "#2E7D4F", 0, 0.43, 0), Cy(0.3, 0.3, 0.08, 12, "#245F3D", 0, 0.88, 0));
							break;
						case 2:
							g.add(
								B(0.45, 0.07, 1.6, "#B07A46", 0, 0.45, 0),
								B(0.08, 0.45, 1.6, "#B07A46", sd * 0.22, 0.72, 0),
								B(0.4, 0.45, 0.07, "#2A2F3A", 0, 0.22, -0.7),
								B(0.4, 0.45, 0.07, "#2A2F3A", 0, 0.22, 0.7),
							);
							break;
						case 3: {
							g.add(B(0.9, 0.5, 0.9, "#8C939E", 0, 0.25, 0), B(0.8, 0.06, 0.8, "#5A3E2A", 0, 0.5, 0));
							const t = tree(0, 0, 0.45, k % 3);
							t.position.y = 0.5;
							t.children[1].visible = false;
							g.add(t);
							break;
						}
						case 4:
							[-0.5, 0.5].forEach((o) =>
								g.add(Cy(0.08, 0.1, 0.7, 8, "#2A2F3A", 0, 0.35, o), Cy(0.09, 0.09, 0.06, 8, "#FFC83D", 0, 0.62, o)),
							);
							break;
						default:
							g.add(
								B(0.45, 0.9, 0.4, ["#2F7DE1", "#E5484D", "#FFC83D"][k % 3], 0, 0.45, 0),
								B(0.35, 0.2, 0.02, "#F4F6F9", -sd * 0.22, 0.65, 0).rotateY(Math.PI / 2),
							);
					}
					s.add(g);
				}
			});
		},
		city(W, wid) {
			// downtown street: sidewalks, kerbside furniture, street lamps and a row of detailed shop/apartment/office buildings (partmodels)
			const s = W.sc,
				blocks = [];
			s.add(texBox(160, 0.4, 300, asphaltTex(), 8, 0, -0.2, -80, { color: "#C8CCD4" }));
			kerbs(s, -wid / 2 - 0.3, wid / 2 + 0.3, 70, -230, "city");
			this.furniture(W, wid);
			[-1, 1].forEach((sd) => {
				s.add(texBox(4, 0.25, 300, pavingTex(), 4, sd * (wid / 2 + 2.3), 0.12, -80));
				for (let z = 12, k = 0; z > -this.LEN - 40; z -= 9, k++)
					blocks.push({ k: (k * 3 + (sd > 0 ? 5 : 0)) % 8, x: sd * (wid / 2 + 8.3), z, ry: (-sd * Math.PI) / 2 });
				for (let z = 0; z > -this.LEN - 20; z -= 15)
					s.add(
						Cy(0.1, 0.12, 5, 6, "#2A2F3A", sd * (wid / 2 + 0.9), 2.5, z),
						contactShadow(0.3, 0.3, 0.25, sd * (wid / 2 + 0.9), z, 0.28),
						B(1.4, 0.14, 0.3, "#2A2F3A", sd * (wid / 2 + 0.3), 5, z),
					);
			});
			/* shops below, flats and offices above: 8 detailed variants, one InstancedMesh per material */
			placeKits(s, buildingKits(8.6, 8), blocks);
		},
		light(W, t) {
			const c = W.cyc.find((c) => t < c.r) || W.cyc[W.cyc.length - 1];
			return t < c.g ? "g" : t < c.y ? "y" : "r";
		},
		redFor(W, t) {
			const c = W.cyc.find((c) => t < c.r);
			return c && t >= c.y ? t - c.y : 0;
		},
		spawn: laneSpawn,
		initEnt(W, e) {
			e.hold = false;
			e.v = 0;
			e.f = {};
		},
		fmt: (W, e) => (e.fin ? `Finished in ${e.fin.toFixed(2)} s` : `${Math.round(-e.z)} / ${MG.light.LEN} m`),
		rules(W, e, dt) {
			if (e.d) return;
			e.v = Math.max(0, Math.min(15, e.v + (e.hold ? 9 : -24) * dt));
			e.z -= e.v * dt;
			e.vz = -e.v;
			e.sc = Math.round(-e.z);
			if (this.light(W, W.t) === "r" && this.redFor(W, W.t) > 0.35 && e.v > 0.6) {
				e.d = true;
				e.v = 0;
				e.vz = 0;
				e.f = { run: Math.round(W.t * 100) / 100 };
				if (e.isMe) {
					e.msg = "FLASH! Caught on red!";
					e.msgT = W.t;
					sfx("loss");
				}
				return;
			}
			if (-e.z >= this.LEN) {
				e.z = -this.LEN;
				e.d = true;
				e.fin = W.t;
				e.v = 0;
				e.sc = 1000 + Math.round((this.dur - W.t) * 10);
				if (e.isMe) {
					e.msg = "Finished!";
					e.msgT = W.t;
					sfx("fanfare");
				}
			}
		},
		timeUp(W, e) {
			e.sc = Math.round(-e.z);
		},
		final: (W, e) => e.sc,
		prompt: (W, e) => (e.msg && W.t - e.msgT < 1.4 ? e.msg : ""),
		donePrompt: (W, e) => (e.f && e.f.run ? "Caught on red!" : e.fin ? `Finished in ${e.fin.toFixed(2)} s` : ""),
		render(W, e, dt) {
			if (W.lampT !== W.t) {
				W.lampT = W.t;
				this.walkPeds(W, dt, W.t > 0 && this.light(W, W.t) === "r");
				const st = W.t < 0 ? "r" : this.light(W, W.t);
				W.lamps.forEach((l) => {
					l[0].material.emissiveIntensity = st === "r" ? 1.6 : 0;
					l[1].material.emissiveIntensity = st === "y" ? 1.6 : 0;
					l[2].material.emissiveIntensity = st === "g" ? 1.6 : 0;
				});
				const b = document.getElementById("rlgl");
				if (b) {
					const me = W.me,
						ds = me.d ? "done" : st === "g" ? "go" : st === "y" ? "yel" : "red";
					if (b.dataset.state !== ds) b.dataset.state = ds;
					setTxt(
						"rlglh",
						me.fin
							? "Finished!"
							: me.d
								? "Caught!"
								: st === "g"
									? me.hold
										? "Driving…"
										: "GREEN: hold to drive!"
									: st === "y"
										? "YELLOW: let go!"
										: "RED: stop!",
					);
				}
			}
			// caught trucks: the speed camera flashes, then a lorry thunders down their lane
			const run = e.f && e.f.run;
			if (!run) return;
			const age = W.t - run;
			if (e.hz === undefined) e.hz = e.z;
			if (!W.lorries[e.k]) {
				const lo = this.lorry(W);
				lo.position.x = e.x;
				W.lorries[e.k] = lo;
				burst(W.sc, e.x, 4, e.hz + 2, {
					n: 12,
					shape: "cube",
					cols: ["#FFFFFF", "#FFF3C0"],
					spd: 4,
					up: 2,
					grav: 0,
					life: 0.35,
				});
				if (Math.abs(e.hz - W.me.z) < 40) sfx("honk");
			}
			const lo = W.lorries[e.k],
				lz = e.hz + 46 - age * 34;
			lo.position.z = lz;
			lo.visible = lz > e.hz - 90;
			if (lz - 4.7 <= e.hz + 1 && !e.fly) {
				e.fly = { vy: 11, vz: -16, s: 0 };
				burst(W.sc, e.x, 1, e.hz, {
					n: 18,
					shape: "cube",
					cols: ["#8E96A3", "#FFC83D", "#2A2F3A"],
					spd: 5,
					up: 6,
					life: 0.9,
				});
				if (Math.abs(e.hz - W.me.z) < 40) sfx("crush");
				if (e.isMe) W.shake = 0.5;
			}
			if (e.fly) {
				const f = e.fly;
				f.vy -= 30 * dt;
				e.y = Math.max(0, (e.y || 0) + f.vy * dt);
				e.z += f.vz * dt;
				f.vz *= Math.exp(-1.5 * dt);
				f.s += dt * 9;
				e.spin = e.y > 0 ? f.s : 0;
				if (e.y <= 0 && f.vy < 0) e.tr.scale.y = Math.max(0.35, e.tr.scale.y - dt * 4);
			}
		},
		lorry(W) {
			const g = new THREE.Group();
			g.add(
				B(2.6, 3.2, 3, "#E5484D", 0, 2, -3.2),
				B(2.5, 1.2, 0.1, "#9FD8FF", 0, 2.8, -4.72),
				B(2.8, 3.8, 11, "#F4F6F9", 0, 2.6, 4.2),
				B(2.9, 0.6, 11.1, "#2F7DE1", 0, 1.1, 4.2),
			);
			[-3.6, -1, 2.2, 6.4, 8.4].forEach((z) =>
				[-1.25, 1.25].forEach((x) => {
					const w = Cy(0.6, 0.6, 0.5, 12, "#1D2230", x, 0.6, z);
					w.rotation.z = Math.PI / 2;
					g.add(w);
				}),
			);
			W.sc.add(g);
			return g;
		},
		bot(W, e) {
			const L = this.light(W, W.t),
				c = W.cyc.findIndex((c) => W.t < c.r);
			e.plan = e.plan || {};
			if (e.plan[c] === undefined) e.plan[c] = Math.random() < 0.12 ? 1.1 : 0.1 + Math.random() * 0.45;
			e.hold =
				L === "g" ||
				(L === "y" && W.t - W.cyc[c].g < e.plan[c]) ||
				(L === "r" && e.plan[c] > 1 && this.redFor(W, W.t) < 0.5);
		},
		ctlHTML() {
			return `<button class="tapall tp-launch" id="rlgl" data-state="wait" aria-label="Hold to drive"><span class="tp-lights"><i class="r"></i><i class="y"></i><i class="g"></i></span><span class="tp-go">GAS</span><b class="tp-hint" id="rlglh">Wait for green…</b></button>`;
		},
		wire() {
			cxWireBtn(
				document.getElementById("rlgl"),
				() => {
					if (W && W.t >= 0 && !W.me.d) W.me.hold = true;
				},
				() => {
					if (W) W.me.hold = false;
				},
			);
		},
		onKey(W, k, down) {
			if ([" ", "enter", "w", "arrowup"].includes(k)) W.me.hold = down;
		},
		botScore: () => 40 + rnd(1000),
	},
	park: {
		name: "Dump Run",
		kind: "lane",
		ctrl: "custom",
		hi: true,
		unit: "pts",
		dur: 50,
		bare: true,
		EDGE: -24,
		HOME: 4,
		ZONE: 2.5,
		MAXL: 6,
		how: "Wait for a big load, reverse to the edge and brake as close as you dare. Don't fall in!",
		tapHint: "Tap GO when loaded, BRAKE near the edge.",
		build(W) {
			const s = W.sc,
				n = W.plist.length,
				LW = 3.6;
			W.laneX = (i) => (i - (n - 1) / 2) * LW;
			const wid = n * LW,
				E = this.EDGE,
				H = this.HOME,
				r = mulberry((W.mg.seed || 1) + 57);
			// worked dirt: base, tyre ruts in every lane, pebbles
			const g = B(220, 1, 50, "#A58F72", 0, -0.5, E + 25);
			g.castShadow = false;
			s.add(g);
			s.add(B(220, 30, 1, "#8C7458", 0, -15.5, E - 0.5));
			W.plist.forEach((p, i) =>
				[-0.72, 0.72].forEach((o) =>
					decal(s, new THREE.PlaneGeometry(0.34, H + 2 - E), "#8C7458", W.laneX(i) + o, 0.012, (H + 2 + E) / 2, 0.28),
				),
			);
			for (let i = 0; i < 90; i++) {
				const sz = 0.08 + r() * 0.16,
					m = mesh(new THREE.DodecahedronGeometry(sz, 0), r() < 0.5 ? "#9BA3AE" : "#7E858F");
				m.position.set((r() - 0.5) * (wid + 34), sz * 0.4, E + 0.8 + r() * 34);
				m.castShadow = false;
				s.add(m);
			}
			const st = stripeTex();
			st.wrapS = THREE.RepeatWrapping;
			st.repeat.set(40, 1);
			const edge = new THREE.Mesh(
				new THREE.PlaneGeometry(wid + 60, 0.5),
				new THREE.MeshBasicMaterial({
					map: st,
					depthWrite: false,
					polygonOffset: true,
					polygonOffsetFactor: -2,
					polygonOffsetUnits: -4,
				}),
			);
			edge.rotation.x = -Math.PI / 2;
			edge.position.set(0, 0.03, E + 0.25);
			s.add(edge);
			[-1, 1].forEach((sd) => {
				const x = sd * (wid / 2 + 1.2);
				s.add(B(0.15, 1.6, 0.15, "#5A6272", x, 0.8, E + 0.6));
				const sg = new THREE.Mesh(
					new THREE.PlaneGeometry(1.6, 0.9),
					new THREE.MeshBasicMaterial({
						map: canvasTex(128, 72, (x, w, h) => {
							x.fillStyle = "#FFC83D";
							x.fillRect(0, 0, w, h);
							x.fillStyle = "#151B24";
							x.font = "24px Bungee, Arial Black, Impact, sans-serif";
							x.textAlign = "center";
							x.textBaseline = "middle";
							x.fillText("DROP!", w / 2, h / 2 + 2);
						}),
					}),
				);
				sg.position.set(x, 1.8, E + 0.7);
				s.add(sg);
			});
			for (let l = 0; l <= n; l++) {
				const m = B(0.12, 0.04, 28, "#E9EDF2", (l - n / 2) * LW, 0.02, E + 14);
				m.castShadow = false;
				s.add(m);
			}
			// off to the sides: rock piles, dirt mounds, a site cabin and a light tower
			[-1, 1].forEach((sd) => {
				for (let k = 0; k < 5; k++) {
					const m = mesh(new THREE.DodecahedronGeometry(1.2 + (k % 3) * 0.5, 0), "#9BA3AE");
					m.position.set(sd * (wid / 2 + 3 + k * 2.5), 0.6, E + 4 + k * 7);
					s.add(m);
				}
				for (let k = 0; k < 3; k++) {
					const m = mesh(new THREE.ConeGeometry(2.2 + r() * 1.5, 1.6 + r(), 9), "#9A8466");
					m.position.set(sd * (wid / 2 + 10 + r() * 6), 0.8, E + 6 + k * 9);
					m.castShadow = false;
					s.add(m);
				}
			});
			s.add(
				B(3.2, 2.6, 2.4, "#F4F6F9", -wid / 2 - 8, 1.3, H + 3),
				B(3.3, 0.2, 2.5, "#FF8A1F", -wid / 2 - 8, 2.7, H + 3),
				B(0.25, 6, 0.25, "#5A6272", wid / 2 + 7, 3, H + 2),
				B(1.6, 0.9, 0.4, "#FFFFFF", wid / 2 + 7, 6.2, H + 2),
			);
			// the green scoring strip, then an excavator and a dirt pile behind every lane
			W.exc = W.plist.map((p, i) => {
				const x = W.laneX(i);
				decal(s, new THREE.PlaneGeometry(LW - 0.3, this.ZONE), "#1FA35C", x, 0.03, E + this.ZONE / 2, 0.45);
				const pile = mesh(new THREE.ConeGeometry(1.6, 1.4, 9), "#8C6A45");
				pile.position.set(x, 0.7, H + 8.2);
				s.add(pile);
				[
					[0.8, 0.2],
					[-0.7, -0.3],
					[0.1, 0.9],
				].forEach(([dx, dz]) => {
					const l = mesh(new THREE.DodecahedronGeometry(0.3, 0), "#6B4F35");
					l.position.set(x + dx, 0.2, H + 8.2 + dz);
					s.add(l);
				});
				return this.excavator(s, x, H + 4.2);
			});
			// the pit: Rock Fall style terraced walls in an arc, rubble, haze and drifting dust
			const PF = -30,
				PH = 5.2,
				PN = 7,
				PR = (k) => 30 + k * 7,
				cz = E - 40,
				jit = (a, y) => 1 + 0.05 * Math.sin(3 * a + y * 0.21) + 0.03 * Math.sin(7 * a + 1.7 + y * 0.5),
				COL = ["#A8845F", "#B89572", "#9A7654", "#C2A07B", "#A07C58", "#B38F6B", "#A8845F"];
			const fl = B(220, 1, 120, "#9A8466", 0, PF - 0.5, E - 60);
			fl.castShadow = false;
			s.add(fl);
			for (let k = 0; k < PN; k++) {
				const y = PF + k * PH,
					pts = [
						new THREE.Vector2(PR(k), y),
						new THREE.Vector2(PR(k) + 1.6, y + PH),
						new THREE.Vector2(k === PN - 1 ? 300 : PR(k + 1), y + PH),
					];
				const lg = new THREE.LatheGeometry(pts, 30, Math.PI / 2 + 0.35, Math.PI - 0.7),
					lp = lg.attributes.position;
				for (let i = 0; i < lp.count; i++) {
					const x = lp.getX(i),
						z = lp.getZ(i),
						f = jit(Math.atan2(z, x), lp.getY(i));
					lp.setX(i, x * f);
					lp.setZ(i, z * f);
				}
				lg.computeVertexNormals();
				const m = mesh(lg, COL[k], { side: THREE.DoubleSide });
				m.position.z = cz;
				m.castShadow = false;
				s.add(m);
			}
			for (let i = 0; i < 9; i++) {
				const cx = (r() - 0.5) * 50,
					czz = E - 12 - r() * 45,
					big = 1.8 + r() * 2;
				for (let j = 0; j < 6; j++) {
					const sz = j ? 0.6 + r() * 1.3 : big,
						m = mesh(
							new THREE.DodecahedronGeometry(sz, 0),
							["#8C8F96", "#7E858F", "#A08A6C", "#6F6A62"][Math.floor(r() * 4)],
						);
					m.position.set(
						cx + (j ? (r() - 0.5) * big * 2 : 0),
						PF + sz * 0.4 + (j ? r() * big * 0.5 : 0),
						czz + (j ? (r() - 0.5) * big * 2 : 0),
					);
					m.scale.y = 0.75;
					m.castShadow = false;
					s.add(m);
				}
			}
			[
				[-26, 0.22],
				[-21, 0.16],
				[-15, 0.1],
			].forEach(([y, op]) => {
				const h = new THREE.Mesh(
					new THREE.PlaneGeometry(220, 120),
					new THREE.MeshBasicMaterial({ color: "#9E8668", transparent: true, opacity: op, depthWrite: false }),
				);
				h.rotation.x = -Math.PI / 2;
				h.position.set(0, y, E - 60);
				s.add(h);
			});
			const puff = canvasTex(64, 64, (x, w, h) => {
				const gr = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
				gr.addColorStop(0, "rgba(170,146,114,.9)");
				gr.addColorStop(0.5, "rgba(158,134,104,.45)");
				gr.addColorStop(1, "rgba(158,134,104,0)");
				x.fillStyle = gr;
				x.fillRect(0, 0, w, h);
			});
			W.pitDust = [];
			for (let i = 0; i < 14; i++) {
				const gd = new THREE.Group(),
					dy = Math.pow(r(), 1.6) * 22;
				for (let j = 0; j < 5; j++) {
					const sp = new THREE.Sprite(
						new THREE.SpriteMaterial({
							map: puff,
							transparent: true,
							opacity: (0.7 - dy / 40) * (0.8 + r() * 0.3),
							depthWrite: false,
						}),
					);
					sp.scale.setScalar(6 + r() * 6);
					sp.position.set((r() - 0.5) * 7, (r() - 0.5) * 2, (r() - 0.5) * 7);
					gd.add(sp);
				}
				gd.position.set((r() - 0.5) * 60, PF + 2 + dy, E - 8 - r() * 50);
				s.add(gd);
				W.pitDust.push({ g: gd, x0: gd.position.x, ph: r() * 6.28, sp: 0.2 + r() * 0.25 });
			}
			W.dust = puffs(W, "#9C8264");
			W.smoke = puffs(W, "#D6DAE0");
			W.skid = tyreTracks(W, "#B2ABA4", "#FFFFFF", 700, 3, 1, true);
		},
		excavator(s, x, z) {
			// tracks, rotating house with cab and counterweight, boom, stick, toothed bucket
			const Y = "#FFC83D",
				D = "#2A2F3A",
				g = new THREE.Group();
			g.position.set(x, 0, z);
			s.add(g);
			[-0.75, 0.75].forEach((o) => {
				g.add(B(0.5, 0.45, 2.5, D, o, 0.23, 0));
				[-0.9, 0, 0.9].forEach((q) => {
					const w = Cy(0.2, 0.2, 0.56, 8, "#5A6272", o, 0.23, q);
					w.rotation.z = Math.PI / 2;
					g.add(w);
				});
			});
			const house = new THREE.Group();
			house.position.y = 0.45;
			g.add(house);
			house.rotation.y = Math.PI;
			house.add(
				B(1.8, 0.8, 1.9, Y, 0, 0.45, -0.1),
				B(1.7, 0.6, 0.55, "#3B3F4A", 0, 0.58, -1.05),
				B(0.7, 0.85, 0.85, Y, -0.55, 1.25, 0.45),
				B(0.76, 0.45, 0.9, "#9FD8FF", -0.55, 1.35, 0.5),
				Cy(0.07, 0.07, 0.5, 6, D, 0.55, 1.05, -0.6),
			);
			const boom = new THREE.Group();
			boom.position.set(0, 0.95, 0.5);
			house.add(boom);
			boom.add(B(0.3, 0.32, 2.4, Y, 0, 0, 1.2), Cy(0.06, 0.06, 1.4, 6, "#C9CED8", 0, -0.25, 0.8));
			boom.children[1].rotation.x = Math.PI / 2;
			const stick = new THREE.Group();
			stick.position.z = 2.4;
			boom.add(stick);
			stick.add(B(0.24, 0.24, 2, Y, 0, 0, 1));
			const bucket = new THREE.Group();
			bucket.position.z = 2;
			stick.add(bucket);
			bucket.add(
				B(0.82, 0.5, 0.08, D, 0, -0.1, 0.3),
				B(0.82, 0.08, 0.5, D, 0, -0.36, 0.05),
				B(0.08, 0.54, 0.5, D, -0.42, -0.1, 0.05),
				B(0.08, 0.54, 0.5, D, 0.42, -0.1, 0.05),
			);
			[-0.3, -0.1, 0.1, 0.3].forEach((o) => bucket.add(B(0.08, 0.06, 0.14, "#8E96A3", o, -0.38, -0.25)));
			const dirt = mesh(new THREE.DodecahedronGeometry(0.4, 0), "#8C6A45");
			dirt.position.set(0, -0.05, 0.05);
			bucket.add(dirt);
			return { house, boom, stick, bucket, dirt };
		},
		// poses: [house yaw, boom pitch, stick pitch (relative), bucket curl]; over the bed, at the pile, and the dump tip
		POSE: {
			bed: [Math.PI, -1.02, 1.44, 0.9],
			pile: [0, -0.25, 1.45, -0.3],
			dug: [0, -0.4, 1.45, 0.9],
			tip: [Math.PI, -1.02, 1.44, -0.7],
		},
		pose(x, a, b, k) {
			k = Math.max(0, Math.min(1, k));
			const m = (i, w) => a[i] + (b[i] - a[i]) * w,
				w = k * k * (3 - 2 * k);
			x.house.rotation.y = m(0, w);
			x.boom.rotation.x = m(1, w);
			x.stick.rotation.x = m(2, w);
			x.bucket.rotation.x = m(3, w);
		},
		digStep(W, dt) {
			// one big scoop from the pile, then hover over the bed and pour while the load counts up
			const P = this.POSE;
			W.exc.forEach((x, i) => {
				const e = W.list.find((q) => q.i === i);
				if (!(e && e.local && e.ph === "load") || W.t < 0) {
					this.pose(x, x.bedP || P.bed, x.bedP || P.bed, 1);
					x.dirt.visible = false;
					return;
				}
				// taller trucks sit higher: lift the boom so the bucket clears a full heap (about 0.8 above the bed floor)
				if (e.bed && x.forK !== e.k) {
					x.forK = e.k;
					const fy = e.bed.getWorldPosition(new THREE.Vector3()).y + 1.2,
						mk = (b, d) => [b[0], b[1] - 0.35 * d, b[2] - 0.35 * d, b[3]];
					let lo = 0,
						hi = 1.6;
					for (let it = 0; it < 12; it++) {
						const mid = (lo + hi) / 2;
						this.pose(x, mk(P.bed, mid), mk(P.bed, mid), 1);
						x.house.updateMatrixWorld(true);
						if (new THREE.Box3().setFromObject(x.bucket).min.y < fy) lo = mid;
						else hi = mid;
					}
					x.bedP = mk(P.bed, hi);
					x.tipP = mk(P.tip, hi);
				}
				const BP = x.bedP || P.bed,
					TP = x.tipP || P.tip;
				const tt = W.t - e.phT,
					T0 = this.POUR0;
				if (tt < 0.5) {
					this.pose(x, BP, P.pile, tt / 0.5);
					x.dirt.visible = false;
				} else if (tt < 0.85) {
					this.pose(x, P.pile, P.dug, (tt - 0.5) / 0.35);
					x.dirt.visible = tt > 0.7;
					x.dirt.scale.setScalar(1);
				} else if (tt < T0) {
					this.pose(x, P.dug, BP, (tt - 0.85) / (T0 - 0.85));
					x.dirt.visible = true;
				} else {
					const p = Math.min(1, (tt - T0) / (this.LOADT * this.MAXL));
					this.pose(x, BP, TP, Math.min(1, p * 3));
					x.dirt.visible = p < 0.97;
					x.dirt.scale.setScalar(Math.max(0.05, 1 - p));
					if (e.load < this.MAXL && Math.random() < dt * 30) {
						const b = x.bucket.getWorldPosition(new THREE.Vector3());
						burst(W.sc, b.x + (Math.random() - 0.5) * 0.4, b.y - 0.35, b.z + (Math.random() - 0.5) * 0.3, {
							n: 1,
							shape: "cube",
							cols: ["#8C6A45", "#6B4F35", "#A07C58"],
							spd: 0.3,
							up: 0.1,
							grav: 16,
							life: 0.42,
							size: 0.7,
						});
					}
				}
			});
		},
		spawn: (W, i) => ({ x: W.laneX(i), z: MG.park.HOME, yaw: Math.PI / 2 }),
		SPIN: 0.6,
		PIV: 0.7,
		LOADT: 0.5,
		POUR0: 1.45,
		initEnt(W, e) {
			e.ph = "load";
			e.phT = 0;
			e.load = 0;
			e.v = 0;
			e.yaw = Math.PI / 2;
		},
		go(W, e) {
			if (e.d || W.t < 0) return;
			if (e.ph === "load" && e.load > 0) {
				e.ph = "drive";
				e.phT = W.t;
				e.v = 2;
			} else if (e.ph === "drive") this.spin(W, e, -1, "dump");
		},
		rules(W, e, dt) {
			if (e.d) return;
			const E = this.EDGE;
			if (e.ph === "drive") {
				e.yaw = Math.PI / 2;
				e.v = Math.min(13, e.v + 4.5 * dt);
				e.z -= e.v * dt;
				e.vz = -e.v;
				if (e.z - 1 - E < -1) this.over(W, e);
			} else if (e.ph === "spin") {
				const brake = e.snext === "dump"; // braking slide both ways: the turn finishes exactly as the truck stops
				e.v = Math.max(0, e.v - 14 * dt);
				const k = Math.max(Math.min(1, (W.t - e.phT) / this.SPIN), 1 - e.v / e.sv0),
					ease = k * k * (3 - 2 * k);
				e.yaw = e.sy0 + Math.PI * ease * e.sdir;
				e.pz += e.sgo * e.v * dt;
				e.vz = e.sgo * e.v;
				e.x = e.px - Math.cos(e.yaw) * this.PIV;
				e.z = e.pz + Math.sin(e.yaw) * this.PIV;
				if (brake && e.z - 1 - E < -1) this.over(W, e);
				else if (k >= 1 && e.v === 0) {
					e.x = W.laneX(e.i);
					e.yaw = e.sy0 + Math.PI * e.sdir;
					e.ph = e.snext;
					e.phT = W.t;
					if (e.ph === "load") {
						e.z = this.HOME;
						e.v = 0;
						e.vz = 0;
					} else this.land(W, e, e.z - 1 - E);
				}
			} else if (e.ph === "load") {
				e.vz = 0;
				if (W.t - e.phT > this.POUR0 + this.LOADT * (e.load + 1) && e.load < this.MAXL) {
					e.load++;
					if (e.isMe) sfx("step");
				}
			} else if (e.ph === "dump") {
				e.vz = 0;
				if (W.t - e.phT > 1.3) {
					e.load = 0;
					e.v = 0;
					e.ph = "back";
					e.phT = W.t;
				}
			} else if (e.ph === "back") {
				e.yaw = -Math.PI / 2;
				e.v = Math.min(12, (e.v || 0) + 8 * dt);
				e.z += e.v * dt;
				e.vz = e.v;
				if (this.HOME - e.z <= (e.v * e.v) / 28 + 2 * this.PIV) this.spin(W, e, 1, "load");
			} else if (e.ph === "fall") {
				e.vy -= 30 * dt;
				e.y = Math.max(-29.4, e.y + e.vy * dt);
				if (e.y > -29.4) {
					e.z -= 3 * dt;
					e.spin = (W.t - e.phT) * 3;
				}
				if (W.t - e.phT > 2.6) {
					e.y = 0;
					e.vy = 0;
					e.spin = 0;
					e.z = this.HOME;
					e.yaw = Math.PI / 2;
					e.v = 0;
					e.g.visible = true;
					e.load = 0;
					e.ph = "load";
					e.phT = W.t;
				}
			}
		},
		over(W, e) {
			e.ph = "fall";
			e.phT = W.t;
			e.vy = 0;
			e.sc = Math.max(0, e.sc - 20);
			if (e.isMe) {
				e.msg = "Over the edge! −20";
				e.msgT = W.t;
				sfx("loss");
			}
		},
		land(W, e, gap) {
			e.ph = "dump";
			e.phT = W.t;
			const pts =
				gap <= this.ZONE ? e.load * (5 + Math.round((5 * (this.ZONE - Math.max(0, gap))) / this.ZONE)) : -e.load * 3;
			e.sc = Math.max(0, e.sc + pts);
			e.dumped = { pts, gap };
			if (e.isMe) {
				e.msg = pts > 0 ? `In the pit! +${pts}` : `Missed the pit! ${pts}`;
				e.msgT = W.t;
				sfx(pts > 0 ? "coin" : "loss");
			}
		},
		spin(W, e, go, next) {
			// handbrake 180: keeps sliding the way it was going while the truck whips round
			e.ph = "spin";
			e.phT = W.t;
			e.sy0 = e.yaw;
			e.sv0 = Math.max(0.1, e.v);
			e.px = e.x + Math.cos(e.yaw) * this.PIV;
			e.pz = e.z - Math.sin(e.yaw) * this.PIV;
			e.sgo = go;
			e.snext = next;
			const inward = W.laneX(e.i) > 0 ? -1 : 1;
			e.sdir = next === "dump" ? inward : -inward;
			if (e.isMe) sfx("skid");
		},
		prompt: (W, e) =>
			e.msg && W.t - e.msgT < 1.4
				? e.msg
				: e.ph === "load"
					? e.load
						? `Load ${e.load}/${MG.park.MAXL}: tap GO!`
						: "Loading…"
					: e.ph === "drive"
						? "Brake near the edge!"
						: "",
		cam(W, t, p, far) {
			const z = Math.max(this.EDGE + 3, Math.min(this.HOME, W.me.z + (W.me.vz || 0) * 0.25)),
				tall = far > 1,
				x = W.me.x * (tall ? 0.75 : 0.5);
			camFov(tall ? 60 : 40);
			return [new THREE.Vector3(x * 0.9, -1, z - 6), new THREE.Vector3(x, tall ? 12.5 : 10, z + (tall ? 12 : 11))];
		},
		render(W, e, dt) {
			if (!e.bed) this.rig(e);
			const tip = e.ph === "dump" ? Math.min(1, (W.t - e.phT) * 2) : 0,
				pour = e.ph === "dump" ? 1 - Math.max(0, Math.min(1, (W.t - e.phT - 0.35) / 0.7)) : 1,
				f = (e.load / this.MAXL) * pour;
			e.bed.rotation.z = tip * 0.9;
			e.dirt.visible = f > 0.02;
			e.dirt.scale.set(1, 0.25 + f * 0.75, 1);
			e.dirt.position.y = 0.1 + f * 0.32;
			const ram = 0.06 + tip * 1.25;
			e.ram.scale.y = ram;
			e.ram.position.y = e.ramY + ram / 2;
			if (e.isMe && W.puffT !== W.t) {
				W.puffT = W.t;
				puffStep(W, dt);
			}
			if ((e.ph === "dump" && W.t - e.phT > 1) || (e.ph === "fall" && W.t - e.phT > 1.4)) {
				if (e.dustAt !== e.phT) {
					e.dustAt = e.phT;
					for (let k = 0; k < 9; k++)
						W.dust(
							e.x + (Math.random() - 0.5) * 3,
							-6 + Math.random() * 3,
							this.EDGE - 2 - Math.random() * 4,
							5 + Math.random() * 3,
							4 + Math.random() * 3,
							2.4 + Math.random(),
						);
				}
			}
			if (e.ph === "spin" && e.v > 0.6) {
				e.tm = (e.tm || 0) + dt;
				if (e.tm > 0.03) {
					e.tm = 0;
					const fx = Math.cos(e.yaw),
						fz = -Math.sin(e.yaw),
						wp = [
							[-0.75, -0.5],
							[-0.75, 0.5],
							[0.7, -0.5],
							[0.7, 0.5],
						].map(([a, b]) => [e.x + fx * a - fz * b, e.z + fz * a + fx * b]);
					if (e.wPrev && e.wPhT === e.phT)
						wp.forEach((p, k) => {
							const q = e.wPrev[k],
								dx = p[0] - q[0],
								dz = p[1] - q[1],
								l = Math.hypot(dx, dz);
							if (l > 0.04)
								tyreMark(W.skid, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, Math.atan2(-dz, dx), 0.025, l + 0.08);
						});
					e.wPrev = wp;
					e.wPhT = e.phT;
				}
			}
			if (e.ph === "spin" && Math.random() < dt * 30) {
				const sd = Math.random() < 0.5 ? -0.55 : 0.55;
				W.smoke(e.x + sd, 0.35, e.z + (Math.random() - 0.5) * 1.4, 1.3 + Math.random() * 0.6, 1, 0.9);
			}
			if (e.ph === "dump" && W.t - e.phT < 0.9 && Math.random() < dt * 20)
				burst(W.sc, e.x, 1.2, e.z - 1.4, {
					n: 1,
					shape: "ico",
					cols: ["#8C6A45", "#6B4F35"],
					spd: 0.8,
					up: 1,
					grav: 18,
					life: 1.4,
					size: 1.1,
				});
			if (e.isMe) {
				if (W.armT !== W.t) {
					W.armT = W.t;
					this.digStep(W, dt);
					tyreStep(W, W.skid, dt, 0.025, () => false);
					W.pitDust.forEach((d) => {
						d.g.position.x = d.x0 + Math.sin(W.t * d.sp + d.ph) * 4;
						d.g.position.y += Math.sin(W.t * 0.3 + d.ph) * dt * 0.2;
					});
				}
				const b = document.getElementById("dumpbtn");
				if (b) {
					const st = e.d ? "done" : e.ph;
					if (b.dataset.st !== st) {
						b.dataset.st = st;
						b.classList.toggle("brake", st === "drive");
					}
					setTxt(
						"dumplab",
						st === "load"
							? e.load
								? "GO!"
								: "LOADING…"
							: st === "drive"
								? "BRAKE!"
								: st === "spin"
									? "DRIFT!"
									: st === "dump"
										? "DUMPING"
										: st === "fall"
											? "OOPS!"
											: st === "back"
												? "RETURNING"
												: "DONE",
					);
					setTxt("dumpread", `load ${e.load}/${this.MAXL}`);
					b.style.setProperty("--p", st === "spin" ? "1" : "0");
				}
			}
		},
		rig(e) {
			// tipper body bolted on top of whatever truck you drive: rails stay put, the bed tips on its rear hinge
			// freeze the truck's own roof animations (ladder, lifter, signs) in their lowest pose so nothing pokes through the bed
			const u = e.tr.userData;
			(u.roof || []).forEach((o) => o.parent && o.parent.remove(o)); // e.g. Sprinkles' cone, Taco Tina's sign
			if (u.anims && u.anims.length) {
				let best = 0,
					low = 1e9;
				for (let t = 0; t < 12; t += 0.15) {
					u.anims.forEach((f) => f(t, 0));
					const h = new THREE.Box3().setFromObject(e.tr).max.y;
					if (h < low) {
						low = h;
						best = t;
					}
				}
				u.anims.forEach((f) => f(best, 0));
				u.anims = [];
			}
			const bb = new THREE.Box3().setFromObject(e.tr),
				top = (bb.max.y - e.g.position.y + 0.1) / 0.8,
				hx = -0.9 / 0.8,
				Y = TRUCKS[e.p.truck].color,
				D = "#3B3F4A",
				tr = e.tr,
				rib = "#" + new THREE.Color(Y).multiplyScalar(0.75).getHexString();
			e.g.children.forEach((c) => {
				if (c !== tr && c.isMesh && Math.abs(c.position.y - 0.03) < 0.01) c.visible = false;
			});
			[-0.45, 0.45].forEach((z) => tr.add(B(1.75, 0.12, 0.12, D, hx + 0.85, top - 0.06, z)));
			const pv = new THREE.Group();
			pv.position.set(hx, top, 0);
			tr.add(pv);
			pv.add(
				B(1.75, 0.08, 1.32, D, 0.87, 0.04, 0),
				B(1.75, 0.46, 0.08, Y, 0.87, 0.3, 0.64),
				B(1.75, 0.46, 0.08, Y, 0.87, 0.3, -0.64),
				B(0.1, 0.62, 1.4, Y, 1.72, 0.35, 0),
				B(0.08, 0.42, 1.3, Y, 0.02, 0.27, 0),
				B(0.12, 0.06, 1.42, D, 1.72, 0.69, 0),
			);
			[0.35, 0.87, 1.39].forEach((x) => [-0.69, 0.69].forEach((z) => pv.add(B(0.07, 0.46, 0.06, rib, x, 0.3, z))));
			const dirt = new THREE.Group(),
				mound = mesh(new THREE.DodecahedronGeometry(0.62, 1), "#8C6A45");
			mound.scale.set(1.25, 0.55, 0.95);
			dirt.add(mound);
			[
				[0.45, 0.12, 0.25, 0.22],
				[-0.4, 0.1, -0.2, 0.2],
				[0.1, 0.2, -0.3, 0.17],
			].forEach(([x, y, z, r]) => {
				const l = mesh(new THREE.DodecahedronGeometry(r, 0), "#6B4F35");
				l.position.set(x, y, z);
				dirt.add(l);
			});
			dirt.position.x = 0.87;
			pv.add(dirt);
			const ram = Cy(0.07, 0.07, 1, 8, "#C9CED8", hx + 1.3, 0, 0, { metalness: 0.4, roughness: 0.35 });
			tr.add(ram);
			e.bed = pv;
			e.dirt = dirt;
			e.ram = ram;
			e.ramY = top - 0.1;
		},
		bot(W, e) {
			if (e.ph === "load") {
				e.want = e.want ?? 3 + Math.floor(Math.random() * 4);
				if (e.load >= e.want) {
					e.want = undefined;
					this.go(W, e);
				}
			} else if (e.ph === "drive") {
				e.err = e.err ?? Math.random() * 2.2 - 0.6;
				if (e.z - 1 - this.EDGE <= (e.v * e.v) / 28 + 2 * this.PIV + e.err) {
					e.err = undefined;
					this.go(W, e);
				}
			}
		},
		ctlHTML() {
			return `<button class="tapall tp-pedal" id="dumpbtn" aria-label="Go or brake"><span class="tp-gauge"><i></i></span><span class="tp-read" id="dumpread">load 0/6</span><b class="tp-lab" id="dumplab">LOADING…</b><span class="tp-pedwrap"><span class="tp-ped"><i></i><i></i><i></i><i></i><i></i></span></span></button>`;
		},
		wire() {
			cxWireBtn(
				document.getElementById("dumpbtn"),
				() => {
					if (W) this.go(W, W.me);
				},
				() => {},
			);
		},
		onKey(W, k, down) {
			if (down && [" ", "enter", "w", "s", "arrowup", "arrowdown"].includes(k)) this.go(W, W.me);
		},
		botScore: () => 60 + rnd(200),
	},
	hop: {
		name: "Rush Hour",
		kind: "lane",
		ctrl: "custom",
		hi: true,
		unit: "parcels",
		dur: 40,
		bare: true,
		LANES: 4,
		LW: 3.6,
		CARV: 6,
		how: "Dodge traffic, jump potholes, grab parcels. Most parcels wins.",
		tapHint: "◀ ▶ to change lanes, Jump for potholes.",
		lx(l) {
			return (l - (this.LANES - 1) / 2) * this.LW;
		},
		speed: (t) => 12 + Math.max(0, t) * 0.2,
		build(W) {
			const s = W.sc,
				wid = this.LANES * this.LW;
			this.road(W, wid);
			// everything on the road comes from the shared seed, so all players face the same traffic
			W.cars = [];
			W.holes = [];
			W.parcels = [];
			const CC = ["#E5484D", "#2F7DE1", "#1FA35C", "#8E5BE0", "#F4F6F9", "#FFC83D", "#16B3C9"];
			for (let z = -34; z > -1000; z -= 9 + W.rng() * 7) {
				const lanes = [0, 1, 2, 3].sort(() => W.rng() - 0.5),
					nc = W.rng() < 0.35 ? 2 : 1;
				for (let k = 0; k < nc; k++)
					W.cars.push({ id: W.cars.length, l: lanes[k], z0: z - W.rng() * 3, c: CC[Math.floor(W.rng() * CC.length)] });
				const free = lanes.slice(nc);
				if (W.rng() < 0.45) W.holes.push({ id: W.holes.length, l: free[0], z: z - 4 - W.rng() * 3 });
				if (W.rng() < 0.8) {
					const l = free[free.length - 1];
					for (let q = 0; q < 3; q++) W.parcels.push({ id: W.parcels.length, l, z: z + 3 - q * 2.2 });
				}
			}
			const kits = {};
			W.cars.forEach((c) => {
				const ty = CAR_TYPES[c.id % 4],
					kit = kits[ty + c.c] || (kits[ty + c.c] = bakeKit(carModel(ty, c.c))),
					g = kitGroup(kit);
				g.position.set(this.lx(c.l), 0, c.z0);
				s.add(g);
				c.g = g;
			});
			W.holes.forEach((h) => {
				const m = decal(s, new THREE.CircleGeometry(1.25, 10), "#1D2230", this.lx(h.l), 0.12, h.z, 0.95);
				m.scale.set(1.1, 0.7, 1);
				decal(s, new THREE.RingGeometry(1.25, 1.5, 10), "#6B6352", this.lx(h.l), 0.115, h.z, 0.8).scale.set(
					1.1,
					0.7,
					1,
				);
			});
			W.parcels.forEach((p) => {
				const g = new THREE.Group();
				g.add(
					B(0.9, 0.7, 0.9, "#C98A4B", 0, 0, 0),
					B(0.92, 0.72, 0.16, "#E8D5A8", 0, 0, 0),
					B(0.16, 0.72, 0.92, "#E8D5A8", 0, 0, 0),
				);
				g.position.set(this.lx(p.l), 1.1, p.z);
				s.add(g);
				p.g = g;
			});
		},
		road(W, wid) {
			// four-lane highway: dashed lane lines, guardrails, sign gantries, fields and houses
			const s = W.sc,
				L = 1100,
				zc = -L / 2 + 30;
			s.add(texBox(220, 0.4, L, grassTex(), 10, 0, -0.25, zc));
			s.add(texBox(wid + 1.4, 0.1, L, asphaltTex(), 8, 0, 0.05, zc));
			roadWear(s, -wid / 2 - 0.7, wid / 2 + 0.7, 30, -L + 30, 0.101, 0.8);
			autoTracks(W, "#9DA0A6", 0.112);
			vergeScatter(
				s,
				[
					[-wid / 2 - 13, -wid / 2 - 1.5],
					[wid / 2 + 1.5, wid / 2 + 13],
				],
				30,
				-L + 30,
				2600,
			);
			[-1, 1].forEach((sd) => {
				s.add(B(0.2, 0.5, L, "#C9CED8", sd * (wid / 2 + 1.1), 0.75, zc));
				for (let z = 20; z > -L + 30; z -= 4) s.add(B(0.16, 0.7, 0.16, "#8E96A3", sd * (wid / 2 + 1.1), 0.35, z));
			});
			roadLines(s, [-(wid / 2 + 0.35), wid / 2 + 0.35], 30, -L + 30, 0.104);
			roadLines(
				s,
				[1, 2, 3].map((l) => (l - this.LANES / 2) * this.LW),
				21.3,
				-L + 30,
				0.104,
				{ dash: 2.6, gap: 3.4 },
			);
			for (let z = -60; z > -L + 30; z -= 140) {
				s.add(B(0.4, 7, 0.4, "#5A6272", -wid / 2 - 2, 3.5, z), B(0.4, 7, 0.4, "#5A6272", wid / 2 + 2, 3.5, z));
				const sg = new THREE.Mesh(
					new THREE.PlaneGeometry(wid + 2, 1.8),
					new THREE.MeshBasicMaterial({
						map: canvasTex(320, 56, (x, w, h) => {
							x.fillStyle = "#157A44";
							x.fillRect(0, 0, w, h);
							x.strokeStyle = "#fff";
							x.lineWidth = 3;
							x.strokeRect(4, 4, w - 8, h - 8);
							x.font = "26px Bungee, 'Arial Black', Impact, sans-serif";
							x.textAlign = "center";
							x.textBaseline = "middle";
							x.fillStyle = "#fff";
							x.fillText("POST OFFICE ▲", w / 2, h / 2 + 2);
						}),
					}),
				);
				sg.position.set(0, 6.6, z + 0.25);
				s.add(sg, B(wid + 4, 0.4, 0.3, "#5A6272", 0, 6.6, z - 0.1));
			}
			const homes = [];
			[-1, 1].forEach((sd) => {
				for (let z = 10, k = 0; z > -L + 30; z -= 22, k++) {
					homes.push({
						k: (k + (sd > 0 ? 1 : 0) * 2) % 4,
						x: sd * (wid / 2 + 16 + (k % 3) * 3),
						y: -0.05,
						z,
						ry: (-sd * Math.PI) / 2,
					});
					s.add(tree(sd * (wid / 2 + 6 + (k % 2) * 2.5), z - 9, 1, k % 3));
				}
			});
			placeKits(s, houseKits(), homes);
		},
		spawn: (W, i) => ({ x: MG.hop.lx(i % 4), z: 0, yaw: Math.PI / 2 }),
		initEnt(W, e) {
			e.lane = e.i % 4;
			e.vy = 0;
			e.got = new Set();
			e.hit = new Set();
			e.stun = 0;
		},
		carZ(W, c) {
			return c.z0 - this.CARV * Math.max(0, W.t);
		},
		move(W, e, d) {
			if (e.d || W.t < 0) return;
			e.lane = Math.max(0, Math.min(this.LANES - 1, e.lane + d));
		},
		jump(W, e) {
			if (e.d || W.t < 0) return;
			if (e.y <= 0) e.vy = 9.5;
		},
		rules(W, e, dt) {
			if (e.d) return;
			e.stun = Math.max(0, e.stun - dt);
			const v = this.speed(W.t) * (e.stun > 0 ? 0.45 : 1);
			e.z -= v * dt;
			e.vz = -v;
			const tx = this.lx(e.lane);
			e.x += (tx - e.x) * Math.min(1, dt * 12);
			e.vx = (tx - e.x) * 12;
			e.vy -= 30 * dt;
			e.y = Math.max(0, e.y + e.vy * dt);
			if (e.y === 0) e.vy = Math.max(0, e.vy);
			const lane = Math.round(e.x / this.LW + (this.LANES - 1) / 2);
			for (const c of W.cars) {
				if (c.l !== lane || e.hit.has("c" + c.id)) continue;
				const cz = this.carZ(W, c);
				if (cz > e.z + 4) continue;
				if (cz < e.z - 30) break;
				if (Math.abs(cz - e.z) < 3 && Math.abs(this.lx(c.l) - e.x) < 2) {
					e.hit.add("c" + c.id);
					const lost = Math.min(3, e.sc);
					e.sc -= lost;
					e.stun = 1;
					e.vy = 5;
					if (e.isMe) {
						W.shake = 0.4;
						sfx("ram");
						e.msg = lost ? `Crash! Dropped ${lost} parcel${lost > 1 ? "s" : ""}` : "Crash!";
						e.msgT = W.t;
						burst(W.sc, e.x, 1.2, e.z - 1, {
							n: 6 + lost * 3,
							shape: "cube",
							cols: ["#C98A4B", "#E8D5A8"],
							spd: 4,
							up: 6,
							life: 0.9,
						});
					}
				}
			}
			for (const h of W.holes) {
				if (h.l !== lane || e.hit.has("h" + h.id) || Math.abs(h.z - e.z) > 1) continue;
				if (e.y < 0.4) {
					e.hit.add("h" + h.id);
					const lost = Math.min(1, e.sc);
					e.sc -= lost;
					e.stun = 0.5;
					e.vy = 6;
					if (e.isMe) {
						W.shake = 0.25;
						sfx("land");
						e.msg = "Pothole!";
						e.msgT = W.t;
					}
				}
			}
			for (const p of W.parcels) {
				if (p.l !== lane || e.got.has(p.id) || Math.abs(p.z - e.z) > 1.2) continue;
				if (e.y < 2.2) {
					e.got.add(p.id);
					e.sc++;
					if (e.isMe) {
						sfx("coin");
						burst(W.sc, p.g.position.x, 1.1, p.z, { n: 5, cols: ["#FFC83D", "#FFFFFF"], spd: 2, up: 3, life: 0.45 });
					}
				}
			}
		},
		prompt: (W, e) => (e.msg && W.t - e.msgT < 1.2 ? e.msg : ""),
		fmt: (W, e) => `${e.sc} parcel${e.sc === 1 ? "" : "s"}`,
		render(W, e, dt) {
			if (!e.isMe) return;
			const t = Math.max(0, W.t);
			W.cars.forEach((c) => {
				const cz = this.carZ(W, c);
				if (Math.abs(cz - e.z) < 160) c.g.position.z = cz;
			});
			W.parcels.forEach((p) => {
				p.g.visible = !e.got.has(p.id);
				if (p.g.visible && Math.abs(p.z - e.z) < 80) {
					p.g.rotation.y = t * 2 + p.id;
					p.g.position.y = 1.1 + Math.sin(t * 4 + p.id) * 0.15;
				}
			});
		},
		bot(W, e) {
			if (e.d || W.t < 0) return;
			e.think = (e.think || 0) - 0.016;
			const lane = e.lane,
				near = (l) => W.cars.some((c) => c.l === l && this.carZ(W, c) < e.z + 3 && this.carZ(W, c) > e.z - 16);
			if (e.think <= 0 && near(lane)) {
				e.think = 0.25 + Math.random() * 0.3;
				if (Math.random() < 0.88) {
					const opts = [lane - 1, lane + 1].filter((l) => l >= 0 && l < this.LANES && !near(l));
					if (opts.length) e.lane = opts[Math.floor(Math.random() * opts.length)];
				}
			} else if (e.think <= 0) {
				e.think = 0.4;
				const p = W.parcels.find(
					(p) => !e.got.has(p.id) && p.z < e.z && p.z > e.z - 14 && Math.abs(p.l - lane) === 1 && !near(p.l),
				);
				if (p && Math.random() < 0.5) e.lane = p.l;
			}
			const h = W.holes.find((h) => h.l === lane && h.z < e.z && h.z > e.z - 4);
			if (h && e.y <= 0 && Math.random() < 0.9) this.jump(W, e);
		},
		ctlHTML() {
			return `<div class="cx"><div class="rhpad"><button class="cxbin" data-rh="-1" style="--bc:#2F5DE1"><i>◀</i><b>Left</b></button><button class="cxbin" data-rh="0" style="--bc:#E5A800"><i>▲</i><b>Jump</b></button><button class="cxbin" data-rh="1" style="--bc:#2F5DE1"><i>▶</i><b>Right</b></button></div></div>`;
		},
		wire() {
			document.querySelectorAll("[data-rh]").forEach((el) =>
				cxWireBtn(el, () => {
					if (!W) return;
					const d = +el.dataset.rh;
					d ? this.move(W, W.me, d) : this.jump(W, W.me);
				}),
			);
		},
		onKey(W, k, down) {
			if (!down) return;
			if (k === "a" || k === "arrowleft") this.move(W, W.me, -1);
			else if (k === "d" || k === "arrowright") this.move(W, W.me, 1);
			else if ([" ", "w", "arrowup", "enter"].includes(k)) this.jump(W, W.me);
		},
		botScore: () => 8 + rnd(30),
	},
	ramp: {
		name: "Ramp Jump",
		kind: "lane",
		ctrl: "tap",
		hi: true,
		unit: "dm",
		dur: 26,
		tapLabel: "TAP!",
		LAND: 0.75,
		tapHint: "Tap fast, tap on the ramp, tap as you land.",
		how: "Tap to build speed and launch off the ramp. Tap as you land to bounce further.",
		build(W) {
			const wid = laneWorld(W, 230, { noTrees: true });
			W.plist.forEach((p, i) => {
				const r = B(3.2, 0.3, 5, "#FFC83D", W.laneX(i), 1, -58);
				r.rotation.x = 0.38;
				W.sc.add(r);
				W.sc.add(B(3.2, 2, 0.3, "#E0A800", W.laneX(i), 1, -60.4));
			});
			for (let d = 10; d <= 150; d += 10) {
				const sp = new THREE.Sprite(
					new THREE.SpriteMaterial({
						map: canvasTex(128, 64, (x, w, h) => {
							x.fillStyle = "#0E7A55";
							rr(x, 4, 4, w - 8, h - 8, 10);
							x.fill();
							x.fillStyle = "#fff";
							x.font = "800 34px Rubik, Arial";
							x.textAlign = "center";
							x.textBaseline = "middle";
							x.fillText(d + " m", w / 2, h / 2 + 2);
						}),
					}),
				);
				sp.scale.set(2.4, 1.2, 1);
				sp.position.set(wid / 2 + 1.8, 2.6, -60 - d);
				W.sc.add(sp);
			}
			grandstands(W, wid, -30, -232);
			this.pads(W);
		},
		pads(W) {
			// bounce surface: alternating runs of crushed cars and tyre stacks in every lane
			const s = W.sc,
				CAR = ["#E5484D", "#2F7DE1", "#1FA35C", "#FF8A1F", "#8E5BE0", "#16B3C9"];
			W.plist.forEach((p, i) => {
				const x = W.laneX(i);
				for (let z = -62.5, k = 0; z > -228; k++) {
					if (k % 3 !== 2) {
						const c = CAR[(k + i * 2) % CAR.length];
						W.sc.add(
							B(2.8, 0.5, 3, c, x + (((k * 37) % 5) - 2) * 0.05, 0.25, z - 1.5),
							B(2.2, 0.22, 1.6, "#2A2F3A", x, 0.6, z - 1.5),
						);
						z -= 3.1;
					} else {
						for (let q = 0; q < 2; q++)
							for (let h = 0; h < 2; h++) {
								const t = Cy(0.62, 0.62, 0.36, 10, "#1D2230", x + (q ? 0.7 : -0.7), 0.18 + h * 0.38, z - 1.5);
								s.add(t);
							}
						z -= 3.1;
					}
				}
			});
		},
		spawn: laneSpawn,
		fmt: (W, e) =>
			e.st === "land"
				? `${(e.sc / 10).toFixed(1)} m`
				: e.st === "air"
					? `${Math.max(0, -(e.z + 60.4)).toFixed(0)} m`
					: `${Math.round(e.v || 0)} km/h`,
		tap(W, e) {
			if (!e.st) {
				e.v = Math.min(36, (e.v || 0) + 1.4);
				if (e.z < -53.5) e.jt = true;
			} else if (e.st === "air" && e.btap === undefined && e.vy < 0) e.btap = W.t;
		},
		rules(W, e, dt) {
			if (e.d && e.st === "land") return;
			if (!e.st) {
				e.v = Math.max(6, (e.v || 0) * Math.exp(-0.45 * dt));
				e.z -= e.v * dt;
				e.vz = -e.v;
				e.y = e.z < -55.5 ? Math.min(1.9, (-55.5 - e.z) * 0.4) : 0;
				if (e.z <= -60.4) {
					e.st = "air";
					e.vy = e.v * 0.42 * (e.jt ? 1.22 : 1);
					e.y = 1.9;
					e.hops = 0;
				}
			} else if (e.st === "air") {
				e.z -= e.v * dt;
				e.vz = -e.v;
				e.vy -= 20 * dt;
				e.y += e.vy * dt;
				if (e.y <= this.LAND && e.vy < 0) {
					e.y = this.LAND;
					const early = e.btap === undefined ? 9 : W.t - e.btap,
						k = e.hops >= 4 ? 0 : early <= 0.14 ? 0.62 : early <= 0.3 ? 0.42 : 0;
					e.btap = undefined;
					if (k) {
						e.hops++;
						e.vy = -e.vy * k;
						e.v *= 0.86;
						e.bounce = { t: W.t, k };
						if (e.isMe) {
							e.msg = k > 0.5 ? "PERFECT BOUNCE!" : "Bounce!";
							e.msgT = W.t;
							sfx(k > 0.5 ? "coin" : "land");
						}
					} else {
						e.st = "land";
						e.v = 0;
						e.vz = 0;
						e.sc = Math.round(-(e.z + 60.4) * 10);
						e.d = true;
						if (e.isMe) {
							e.msg = e.hops ? `Landed after ${e.hops} bounce${e.hops > 1 ? "s" : ""}` : "Crash landing!";
							e.msgT = W.t;
							sfx("crush");
						}
					}
				}
			}
			if (!e.st) e.sc = 0;
		},
		timeUp(W, e) {
			if (e.st !== "land") e.sc = Math.max(0, Math.round(-(e.z + 60.4) * 10));
		},
		prompt: (W, e) =>
			e.msg && W.t - e.msgT < 1.1
				? e.msg
				: !e.st && e.z < -48
					? e.jt
						? "Boost ready!"
						: "Tap now for a boost!"
					: e.st === "air" && e.vy < 0 && e.y < 4
						? "Tap as you land!"
						: "",
		donePrompt: (W, e) => (e.msg && W.t - e.msgT < 2 ? e.msg : ""),
		render(W, e, dt) {
			if (e.bounce && W.t - e.bounce.t < 0.05 && !e.bounce.fx) {
				e.bounce.fx = true;
				burst(W.sc, e.x, this.LAND, e.z, {
					n: e.bounce.k > 0.5 ? 14 : 8,
					shape: "cube",
					cols: ["#2A2F3A", "#8E96A3", "#FFC83D"],
					spd: 3,
					up: 4,
					life: 0.6,
				});
				if (e.isMe) W.shake = 0.2;
			}
			if (e.isMe) crowdStep(W, e.z, e.st === "air" ? 1 : 0.4);
		},
		bot(W, e, dt) {
			if (e.st === "air") {
				if (e.vy < 0 && e.btap === undefined) {
					const g = 20,
						h = e.y - this.LAND,
						tl = (e.vy + Math.sqrt(e.vy * e.vy + 2 * g * h)) / g;
					e.bplan = e.bplan ?? (Math.random() < 0.2 ? 0.5 : 0.02 + Math.random() * 0.22);
					if (tl <= e.bplan) {
						this.tap(W, e);
						e.bplan = undefined;
					}
				}
				return;
			}
			e.bt = (e.bt || 0) - dt;
			if (e.bt <= 0) {
				this.tap(W, e);
				e.bt = 1 / (4.5 + Math.random() * 3.5);
			}
			if (e.z < -54 && !e.jt && Math.random() < 0.03) e.jt = true;
		},
		botScore: () => 400 + rnd(700),
	},
	crane: {
		name: "Crate Drop",
		kind: "lane",
		ctrl: "tap",
		hi: true,
		unit: "pts",
		dur: 80,
		bare: true,
		tapLabel: "DROP",
		tapHint: "Tap to drop the crate onto your stack.",
		how: "Drop 10 crates onto your truck. Centre each one on the crate below: overhang too far and it tips off, lean the stack and it topples.",
		build(W) {
			/* wide lanes: a swinging crate reaches 1.85 m from the lane centre, so neighbours can't overlap */
			const wid = laneWorld(W, 30, { noTrees: true, lw: 4.6 }),
				span = wid + 2;
			this.port(W, wid);
			/* one gantry crane over all lanes, legs outside the road; a trolley per lane carries the hoist */
			const rtg = kitGroup(bakeKit(rtgModel(span)), 0);
			rtg.position.z = -11;
			W.sc.add(rtg);
			placeShadows(W.sc, 1.3, 6.8, 0.3, [
				{ x: -span / 2, z: -11 },
				{ x: span / 2, z: -11 },
			]);
			const tk = bakeKit(trolleyModel());
			W.hooks = {};
			W.plist.forEach((p, i) => {
				const h = new THREE.Group(),
					sp = new THREE.Group(),
					ropes = [];
				h.add(kitGroup(tk, 0), sp);
				sp.add(B(1.1, 0.14, 1.1, "#E0A800", 0, 0.07, 0), B(0.5, 0.25, 0.5, "#B58A00", 0, 0.265, 0));
				[-1, 1].forEach((a) =>
					[-1, 1].forEach((b) => sp.add(B(0.12, 0.08, 0.12, "#23272F", a * 0.48, 0.18, b * 0.48))),
				);
				[-0.2, 0.2].forEach((x) =>
					[-0.2, 0.2].forEach((z) => {
						const r = Cy(0.025, 0.025, 1, 5, "#3A3F48", x, 0, z);
						ropes.push(r);
						h.add(r);
					}),
				);
				const crates = crateKits().map((k) => {
					const c = kitGroup(k, 0);
					h.add(c);
					return c;
				});
				Object.assign(h.userData, { sp, ropes, crates });
				h.position.set(W.laneX(i), 0, -11);
				W.sc.add(h);
				W.hooks[p.key] = h;
			});
		},
		/* crate model for stack layer n: the four kinds take turns, offset per player */
		crate(e, n) {
			return kitGroup(crateKits()[(n + e.i) % 4], 0);
		},
		port(W, wid) {
			// container terminal: quay, container stacks, a docked cargo ship, quay cranes and the sea
			const s = W.sc,
				CC = ["#E5484D", "#2F7DE1", "#FF8A1F", "#1FA35C", "#FFC83D", "#8E96A3", "#1FB5A8", "#B5622F"],
				rc = () => Math.floor(W.rng() * CC.length);
			s.add(texBox(260, 0.4, 70, concreteTex(), 8, 0, -0.2, -2));
			roadWear(s, -60, 60, 30, -34, 0.002, 0.5);
			// painted bay lines and crane rails on the quay
			[-1, 1].forEach((sd) => {
				for (let r = 0; r < 3; r++)
					for (let k = 0; k < 5; k++)
						decal(
							s,
							new THREE.PlaneGeometry(0.14, 6.6),
							"#F2C230",
							sd * (wid / 2 + 4.65 + k * 2.7),
							0.01,
							-4 - r * 7.4,
							0.85,
						);
			});
			[-32, -35.9].forEach((z) => s.add(B(260, 0.06, 0.12, "#5E636D", 0, 0.03, z)));
			s.add(B(260, 0.5, 0.6, "#FFC83D", 0, 0.05, -36.7));
			const sea = new THREE.Mesh(
				new THREE.PlaneGeometry(600, 400, 30, 20),
				new THREE.MeshStandardMaterial({ color: "#2E86C9", roughness: 0.35, metalness: 0.1, flatShading: true }),
			);
			const sp = sea.geometry.attributes.position;
			for (let i = 0; i < sp.count; i++) sp.setZ(i, W.rng() * 0.5);
			sea.geometry.computeVertexNormals();
			sea.rotation.x = -Math.PI / 2;
			sea.position.set(0, -1.6, -237);
			s.add(sea);
			s.add(B(260, 1.8, 0.6, "#6F7680", 0, -0.9, -37.2));
			/* container stacks on the quay (detailed kits, one instanced mesh per colour and material) */
			const quay = [],
				foot = [];
			[-1, 1].forEach((sd) => {
				for (let r = 0; r < 3; r++)
					for (let c = 0; c < 4; c++) {
						const h = 1 + Math.floor(W.rng() * (1.4 + c * 0.6)),
							x = sd * (wid / 2 + 6 + c * 2.7),
							z = -4 - r * 7.4;
						foot.push({ x, z });
						for (let k = 0; k < h; k++) quay.push({ k: rc(), x, y: k * 2.5, z });
					}
			});
			placeKits(s, containerKits(CC, 0), quay, 0);
			placeShadows(s, 2.4, 6, 0.3, foot);
			/* cargo ship alongside the quay, loaded with containers (simpler kits: it's far away). Containers boxed in
			   on every side the camera could see (above, the quay side, both neighbouring bays) are left out. The ship
			   lies outside the shadow camera, so it casts no shadows. */
			const sm = shipModel(),
				ship = kitGroup(bakeKit(sm), 0),
				bays = sm.userData.bays,
				dy = sm.userData.deckY,
				deck = [],
				dfoot = [],
				H = {};
			ship.position.set(0, -1.6, -46);
			s.add(ship);
			bays.forEach((b, bi) => {
				for (let r = 0; r < b.rows; r++) {
					const z = (r - (b.rows - 1) / 2) * 2.55;
					H[bi + "," + z] = 1 + Math.floor(W.rng() * (Math.abs(z) < 3 ? 4.6 : 3.6));
				}
			});
			bays.forEach((b, bi) => {
				for (let r = 0; r < b.rows; r++) {
					const z = (r - (b.rows - 1) / 2) * 2.55,
						h = H[bi + "," + z],
						hh = (i, zz) => H[i + "," + zz] || 0;
					dfoot.push({ x: b.x, y: dy, z, ry: Math.PI / 2 });
					for (let k = 0; k < h; k++) {
						const c = rc();
						if (k < h - 1 && hh(bi, z + 2.55) > k && hh(bi - 1, z) > k && hh(bi + 1, z) > k) continue;
						deck.push({ k: c, x: b.x, y: dy + k * 2.5, z, ry: Math.PI / 2 });
					}
				}
			});
			placeKits(ship, containerKits(CC, 1), deck, 0);
			placeShadows(ship, 2.4, 6, 0.22, dfoot);
			ship.traverse((o) => (o.castShadow = false));
			/* mooring lines from the bow and stern to the quay bollards */
			[
				[-47, 6.9, -52],
				[-46, 6.9, -44],
				[55, 5.1, 52],
				[56, 5.1, 60],
			].forEach(([sx, sy, bx]) => {
				const a = new THREE.Vector3(sx, sy, -39.5),
					b = new THREE.Vector3(bx, 0.5, -36),
					d = b.clone().sub(a),
					ln = Cy(0.05, 0.05, d.length(), 5, "#E8DCC0", 0, 0, 0);
				ln.position.copy(a).addScaledVector(d, 0.5);
				ln.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
				s.add(ln);
			});
			// ship-to-shore cranes on the quay edge
			const legs = [];
			[-30, 26].forEach((x) => {
				const g = new THREE.Group();
				g.position.set(x, 0, -34);
				s.add(g);
				[
					[-3, -2],
					[3, -2],
					[-3, 2],
					[3, 2],
				].forEach(([a, b]) => {
					g.add(B(0.8, 26, 0.8, "#2F7DE1", a, 13, b));
					legs.push({ x: x + a, z: -34 + b });
				});
				g.add(
					B(7, 1.4, 1.2, "#2F7DE1", 0, 24, -2),
					B(7, 1.4, 1.2, "#2F7DE1", 0, 24, 2),
					B(2.2, 1.6, 50, "#2F7DE1", 0, 27, -8),
					B(4, 3, 4, "#F4F6F9", 0, 29.8, 4),
					B(2.4, 1.8, 2.4, "#FFC83D", 0, 25.4, -20),
				);
			});
			placeShadows(s, 1.1, 1.1, 0.3, legs);
			const bol = [];
			for (let x = -60; x <= 60; x += 8) {
				s.add(Cy(0.35, 0.45, 0.6, 8, "#2A2F3A", x, 0.3, -36));
				bol.push({ x, z: -36 });
			}
			placeShadows(s, 0.8, 0.8, 0.25, bol);
			W.sea = sea;
			W.seaB = Float32Array.from(sp.array);
			W.gulls = [];
			for (let i = 0; i < 3; i++) {
				const g = new THREE.Group(),
					body = Cy(0.13, 0.17, 0.72, 8, "#F4F6F9", 0, 0, 0);
				body.rotation.x = Math.PI / 2;
				g.add(body);
				const head = mesh(new THREE.SphereGeometry(0.15, 8, 6), "#F4F6F9");
				head.position.set(0, 0.07, -0.42);
				const beak = mesh(new THREE.ConeGeometry(0.045, 0.2, 6), "#FFB000");
				beak.rotation.x = -Math.PI / 2;
				beak.position.set(0, 0.05, -0.62);
				g.add(head, beak, B(0.24, 0.04, 0.22, "#C9CED8", 0, 0.02, 0.45));
				[-1, 1].forEach((sd) => {
					const ey = mesh(new THREE.SphereGeometry(0.028, 6, 4), "#151B24");
					ey.position.set(sd * 0.1, 0.12, -0.5);
					g.add(ey);
				});
				const wing = (sd) => {
					const root = new THREE.Group(),
						tip = new THREE.Group();
					root.add(B(0.55, 0.04, 0.32, "#DDE1E8", sd * 0.28, 0, -0.02));
					tip.position.x = sd * 0.55;
					tip.add(
						B(0.42, 0.03, 0.24, "#C9CED8", sd * 0.2, 0, 0.02),
						B(0.14, 0.032, 0.22, "#2A2F3A", sd * 0.42, 0, 0.03),
					);
					root.add(tip);
					g.add(root);
					return [root, tip];
				};
				const [pl, tl] = wing(-1),
					[pr, tr] = wing(1);
				g.scale.setScalar(0.75);
				s.add(g);
				W.gulls.push({
					g,
					pl,
					pr,
					tl,
					tr,
					cx: -12 + W.rng() * 24,
					cz: -16 - W.rng() * 14,
					r: 6 + W.rng() * 8,
					y: 7 + W.rng() * 3,
					sp: (0.25 + W.rng() * 0.2) * (W.rng() < 0.5 ? -1 : 1),
					ph: W.rng() * 6.28,
				});
			}
		},
		spawn: (W, i) => ({ x: W.laneX(i), z: -11, yaw: Math.PI / 2 }),
		initEnt(W, e) {
			e.tot = 0;
			e.cr = 0;
			e.used = 0;
			e.last = 0;
			e.stack = [];
			e.st = [];
			e.pt = [];
			e.f = { cr: 0, st: [], u: 0 };
		},
		top: (cr) => 1.4 + cr * 0.8,
		dropY(cr) {
			return this.top(cr) + 2.6;
		},
		cam(W, t, p, far) {
			const top = this.top(Math.min(W.me.cr, 9)),
				fy = top + 0.6;
			return [
				new THREE.Vector3(W.me.x * 0.85, fy, -11),
				new THREE.Vector3(W.me.x * 0.85, fy + 3.2 * far, -11 + 13 * far),
			];
		},
		/* a wobble whose speed grows with the stack: the phase is integrated over time (not W.t * speed), so a new
		   speed never makes the hook or truck jump */
		osc(W, e, key, rate) {
			const o = (e.osc = e.osc || {}),
				q = o[key] || (o[key] = { ph: 0, t: W.t, a: 0, dt: 0 });
			q.dt = Math.max(0, W.t - q.t);
			q.ph += q.dt * rate;
			q.t = W.t;
			return q;
		},
		hookX(W, e, cr) {
			return Math.sin(this.osc(W, e, "h", 1.3 + cr * 0.2).ph + e.i * 0.9) * 1.35;
		},
		/* the truck starts swaying from 3 crates up, easing in (and out after a topple) instead of switching on */
		truckX(W, e, cr) {
			const q = this.osc(W, e, "t", 0.8 + cr * 0.05),
				dA = (cr >= 3 ? 0.8 : 0) - q.a;
			q.a += Math.max(-q.dt * 0.4, Math.min(q.dt * 0.4, dA));
			return W.laneX(e.i) + Math.sin(q.ph + e.i) * q.a;
		},
		fmt: (W, e) => `${e.tot} pts, crate ${Math.min(10, e.used + 1)}/10`,
		tap(W, e) {
			if (e.fall || e.used >= 10) return;
			/* start from where the hook is now (it eases up after each crate, like Scoop Stack's scoop) */
			const h = W.hooks && W.hooks[e.k],
				y = h && h.userData.cy != null ? h.userData.cy - 0.4 : this.dropY(e.cr);
			e.fall = { x: W.laneX(e.i) + this.hookX(W, e, e.cr), y: Math.max(y, this.top(e.cr) + 0.5), vy: 0 };
			e.last = W.t;
		},
		rules(W, e, dt) {
			if (e.d) return;
			if (!e.fall && W.t - e.last > 6.5 && e.used < 10) this.tap(W, e);
			if (e.fall) {
				e.fall.vy -= 22 * dt;
				e.fall.y += e.fall.vy * dt;
				const bed = this.top(e.cr);
				if (e.fall.y <= bed) {
					const off = e.fall.x - this.truckX(W, e, e.cr),
						n = e.st.length,
						below = n ? e.st[n - 1] : 0,
						half = n ? 0.5 : 0.8,
						dx = off - below;
					e.used++;
					e.last = W.t;
					if (Math.abs(dx) >= half) {
						e.tip = { x: e.fall.x, y: bed + 0.4, dir: Math.sign(dx) || 1, n: e.used };
						e.pmsg = "Tipped off!";
						if (e.isMe) sfx("loss");
					} else {
						const pts = Math.max(0, Math.round(100 - Math.abs(dx) * (n ? 170 : 110)));
						e.st.push(Math.round(off * 100) / 100);
						e.pt.push(pts);
						e.tot += pts;
						e.pmsg = `+${pts}`;
						if (e.isMe) sfx(pts > 70 ? "coin" : "land");
						for (let k = -1; k < e.st.length - 1; k++) {
							const above = e.st.slice(k + 1),
								com = above.reduce((a, b) => a + b, 0) / above.length,
								sx = k < 0 ? 0 : e.st[k],
								lim = k < 0 ? 0.8 : 0.5;
							if (Math.abs(com - sx) > lim) {
								const lost = e.pt.slice(k + 1).reduce((a, b) => a + b, 0);
								e.st = e.st.slice(0, k + 1);
								e.pt = e.pt.slice(0, k + 1);
								e.tot -= lost;
								e.pmsg = `Toppled! −${lost}`;
								e.tip = { x: e.fall.x, y: bed + 0.4, dir: Math.sign(com - sx) || 1, n: e.used };
								if (e.isMe) {
									sfx("crush");
									W.shake = 0.35;
								}
								break;
							}
						}
					}
					e.cr = e.st.length;
					e.f = {
						cr: e.cr,
						st: e.st.slice(),
						u: e.used,
						tip: e.tip
							? [Math.round(e.tip.x * 100) / 100, e.tip.dir, e.tip.n, Math.round(e.tip.y * 100) / 100]
							: e.f.tip,
					};
					e.fall = null;
					if (e.used >= 10) e.d = true;
				}
			}
			e.sc = e.tot;
		},
		render(W, e, dt) {
			if (W.gullT !== W.t) {
				W.gullT = W.t;
				const t = Math.max(0, W.t) + 10;
				W.gulls.forEach((q) => {
					const a = q.ph + t * q.sp;
					q.g.position.set(q.cx + Math.cos(a) * q.r, q.y + Math.sin(t * 0.7 + q.ph) * 0.8, q.cz + Math.sin(a) * q.r);
					q.g.rotation.y = -a + (q.sp > 0 ? Math.PI : 0);
					q.g.rotation.z = Math.sign(q.sp) * 0.25;
					const flap = Math.sin(t * 0.45 + q.ph) > -0.2,
						f = flap ? Math.sin(t * 8 + q.ph) * 0.55 : 0.08;
					q.pl.rotation.z = f;
					q.pr.rotation.z = -f;
					q.tl.rotation.z = f * 0.6;
					q.tr.rotation.z = -f * 0.6;
				});
				const pa = W.sea.geometry.attributes.position;
				for (let i = 0; i < pa.count; i++) {
					const x = W.seaB[i * 3],
						y = W.seaB[i * 3 + 1];
					pa.setZ(i, W.seaB[i * 3 + 2] + Math.sin(x * 0.09 + t * 1.3) * 0.35 + Math.cos(y * 0.11 + t) * 0.3);
				}
				pa.needsUpdate = true;
				W.sea.geometry.computeVertexNormals();
			}
			if (W.tumT !== W.t) {
				const dt = Math.min(0.05, Math.max(0, W.t - (W.tumT ?? W.t)));
				W.tumT = W.t;
				(W.tumb || []).forEach((b) => {
					b.t += dt;
					if (b.t > 7) {
						b.m.visible = false;
						return;
					}
					if (!b.rest) {
						b.vy -= 22 * dt;
						b.m.position.x += b.vx * dt;
						b.m.position.y += b.vy * dt;
						b.m.position.z += b.vz * dt;
						b.m.rotation.z += b.wz * dt;
						b.m.rotation.x += b.wx * dt;
						if (b.m.position.y < 0.4) {
							b.m.position.y = 0.4;
							if (Math.abs(b.vy) > 3) {
								b.vy *= -0.3;
								b.vx *= 0.6;
								b.wz *= 0.5;
							} else {
								b.rest = true;
								b.m.rotation.z = (Math.round(b.m.rotation.z / (Math.PI / 2)) * Math.PI) / 2;
								b.m.rotation.x = 0;
							}
						}
					}
				});
			}
			const L = e.local ? e.st : e.f.st || [],
				cr = L.length,
				h = W.hooks[e.k];
			e.g.position.x = this.truckX(W, e, cr);
			const tumble = (m, wx, wy, dir) => {
				W.tumb = W.tumb || [];
				if (m.parent) m.parent.remove(m);
				m.position.set(wx, wy, -11);
				W.sc.add(m);
				W.tumb.push({
					m,
					t: 0,
					vx: dir * (1.6 + Math.random()),
					vy: 1.5 + Math.random(),
					vz: (Math.random() - 0.5) * 1.2,
					wz: -dir * (3 + Math.random() * 3),
					wx: (Math.random() - 0.5) * 2,
				});
			};
			while (e.stack.length > cr) {
				const m = e.stack.pop(),
					i = e.stack.length,
					lean = (L.length ? m.position.x - L[L.length - 1] : m.position.x) || Math.random() - 0.5;
				tumble(m, e.g.position.x + m.position.x, m.position.y, Math.sign(lean) || 1);
			}
			while (e.stack.length < cr) {
				const i = e.stack.length,
					b = this.crate(e, i);
				b.position.set(L[i], this.top(i) + 0.4, 0);
				b.rotation.z = Math.max(-0.12, Math.min(0.12, -(L[i] - (i ? L[i - 1] : 0)) * 0.25));
				e.g.add(b);
				e.stack.push(b);
			}
			e.stack.forEach((b, i) => {
				b.position.x = L[i];
			});
			{
				const tp = e.local ? (e.tip ? [e.tip.x, e.tip.dir, e.tip.n, e.tip.y] : null) : e.f.tip;
				if (tp && tp[2] !== e.tipSeen) {
					e.tipSeen = tp[2];
					const m = this.crate(e, cr);
					tumble(m, tp[0], tp[3] ?? this.top(cr) + 0.4, tp[1]);
				}
			}
			if (h) {
				/* trolley follows the hook along the gantry, the spreader holds the next crate, ropes reach up to the sheaves */
				const u = h.userData,
					tcy = this.dropY(Math.min(cr, 9)) + 0.4,
					cy = (u.cy = u.cy == null ? tcy : u.cy + (tcy - u.cy) * (1 - Math.exp(-(dt || 0.016) * 7))),
					rb = cy + 0.4 + 0.39,
					RL = Math.max(0.1, 15.83 - rb),
					show = (e.local ? e.used : e.f.u || 0) < 10 && !(e.local && e.fall),
					v = (cr + e.i) % 4;
				h.position.x = W.laneX(e.i) + this.hookX(W, e, cr);
				u.sp.position.y = cy + 0.4;
				u.ropes.forEach((r) => {
					r.scale.y = RL;
					r.position.y = rb + RL / 2;
				});
				u.crates.forEach((c, k) => {
					c.visible = show && k === v;
					c.position.y = cy;
				});
			}
			while (e.stack.length < cr) {
				const b = this.crate(e, e.stack.length);
				b.position.set(e.f.lo || 0, this.top(e.stack.length) + 0.4, 0);
				e.g.add(b);
				e.stack.push(b);
			}
			if (e.fall) {
				if (!e.fm) {
					e.fm = new THREE.Group();
					crateKits().forEach((k) => e.fm.add(kitGroup(k, 0)));
					W.sc.add(e.fm);
				}
				e.fm.visible = true;
				e.fm.children.forEach((c, k) => (c.visible = k === (e.cr + e.i) % 4));
				e.fm.position.set(e.fall.x, e.fall.y + 0.4, -11);
			} else if (e.fm) e.fm.visible = false;
		},
		final: (W, e) => e.tot,
		prompt: (W, e) => e.pmsg || "",
		bot(W, e) {
			if (e.fall || e.used >= 10) return;
			e.tol = e.tol ?? 0.06 + Math.random() * 0.34;
			const topX = this.truckX(W, e, e.cr) + (e.st.length ? e.st[e.st.length - 1] : 0);
			if (Math.abs(W.laneX(e.i) + this.hookX(W, e, e.cr) - topX) < e.tol && W.t - e.last > 1) {
				this.tap(W, e);
				e.tol = undefined;
			}
		},
		botScore: () => 350 + rnd(500),
	},
};
Object.values(MG).forEach((d) => {
	d.bot = d.bot;
	d.botScore = d.botScore || (() => 0);
});
