/* ---------- sky gradients ---------- */
const SKY = {
	storm: ["#4A5260", "#7C8594", "#A4ACB8"],
	night: ["#0B1030", "#2A2352", "#5A3558"],
	dusk: ["#2E3470", "#D9668A", "#FFB36B"],
	def: ["#4E9BE0", "#9FD4F5", "#E3F3FA"],
	junk: ["#5B8FCF", "#E8C08F", "#F3DDBE"],
	warm: ["#4E9BE0", "#A9D9F2", "#F4E9D2"],
	volc: ["#4A78B8", "#D9A07E", "#E8B48C"],
};
function applySky(s, pal) {
	const p = SKY[pal] || SKY.def;
	s.background = canvasTex(4, 256, (x, w, h) => {
		const g = x.createLinearGradient(0, 0, 0, h);
		g.addColorStop(0, p[0]);
		g.addColorStop(0.62, p[1]);
		g.addColorStop(1, p[2]);
		x.fillStyle = g;
		x.fillRect(0, 0, w, h);
	});
	if (s.fog) s.fog.color.set(p[2]);
}

/* ---------- per-face colour variation (classic low-poly shading) ---------- */
function varyColors(geo) {
	const g = geo.index ? geo.toNonIndexed() : geo,
		n = g.attributes.position.count,
		col = new Float32Array(n * 3);
	let v = 1;
	for (let i = 0; i < n; i++) {
		if (i % 6 === 0) v = 1 + (Math.random() - 0.5) * 0.1;
		col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
	}
	g.setAttribute("color", new THREE.BufferAttribute(col, 3));
	return g;
}

/* the flat caps of an ExtrudeGeometry (group 0) in one even colour after varyColors: the per-face tint streaks on the long
   triangles round cut-out holes (tile symbols, bin lid icons); the side walls keep their tint */
function evenCaps(geo) {
	const c = geo.attributes.color,
		gr = geo.groups[0];
	if (c && gr) {
		for (let i = gr.start; i < gr.start + gr.count; i++) c.setXYZ(i, 1, 1, 1);
		c.needsUpdate = true;
	}
	return geo;
}

/* ---------- particles ---------- */
const PGEO = {},
	PMAT = {};
const pgeo = (k) =>
	PGEO[k] ||
	(PGEO[k] =
		k === "coin"
			? new THREE.CylinderGeometry(0.16, 0.16, 0.05, 8)
			: k === "ico"
				? new THREE.IcosahedronGeometry(0.14, 0)
				: new THREE.BoxGeometry(0.14, 0.14, 0.14));
const pmat = (c, op = 1) => {
	const k = c + op;
	return (
		PMAT[k] ||
		(PMAT[k] = new THREE.MeshStandardMaterial(
			Object.assign(
				{ color: c, flatShading: true, roughness: 0.6, emissive: c, emissiveIntensity: 0.25 },
				op < 1 ? { transparent: true, opacity: op, depthWrite: false, roughness: 0.15 } : {},
			),
		))
	);
};
function burst(scene, x, y, z, o = {}) {
	if (!scene || !GFX.ok) return;
	const L = scene.userData.parts || (scene.userData.parts = []);
	const cols = o.cols || ["#FFC83D"],
		n = Math.min(o.n || 10, 40);
	for (let i = 0; i < n; i++) {
		const m = new THREE.Mesh(pgeo(o.shape || "cube"), pmat(cols[i % cols.length], o.op));
		const a = Math.random() * 6.28,
			sp = (o.spd || 3) * (0.4 + Math.random() * 0.8);
		m.position.set(x, y, z);
		m.scale.setScalar((o.size || 1) * (o.vary ? 0.45 + Math.random() * o.vary : 1));
		scene.add(m);
		L.push({
			m,
			vx: Math.cos(a) * sp,
			vz: Math.sin(a) * sp,
			vy: (o.up || 4) * (0.6 + Math.random() * 0.7),
			g: o.grav === undefined ? 12 : o.grav,
			life: (o.life || 0.9) * (0.7 + Math.random() * 0.6),
			t: 0,
			s: o.size || 1,
			sx: (Math.random() - 0.5) * 12,
			sy: (Math.random() - 0.5) * 12,
			floor: o.floor,
		});
	}
}
function stepParts(scene, dt) {
	const L = scene && scene.userData.parts;
	if (!L || !L.length) return;
	for (let i = L.length - 1; i >= 0; i--) {
		const p = L[i];
		p.t += dt;
		p.vy -= p.g * dt;
		p.m.position.x += p.vx * dt;
		p.m.position.y += p.vy * dt;
		p.m.position.z += p.vz * dt;
		if (p.floor !== undefined && p.m.position.y < p.floor) {
			p.m.position.y = p.floor;
			p.vy *= -0.35;
			p.vx *= 0.7;
			p.vz *= 0.7;
		}
		p.m.rotation.x += p.sx * dt;
		p.m.rotation.y += p.sy * dt;
		const k = 1 - p.t / p.life;
		p.m.scale.setScalar(Math.max(0.001, p.s * Math.min(1, k * 2.5)));
		if (p.t >= p.life) {
			scene.remove(p.m);
			L.splice(i, 1);
		}
	}
}
const DUST = ["#D8CBB0", "#C9BC9F", "#EDE3CF"];

/* ---------- sound (synthesised, no files) ---------- */
const SFX = { ctx: null, on: LS.get("trp_snd", true) };
function sfxInit() {
	if (SFX.ctx) return;
	try {
		const C = window.AudioContext || window.webkitAudioContext;
		SFX.ctx = new C();
		SFX.out = SFX.ctx.createGain();
		SFX.out.gain.value = 0.32;
		SFX.out.connect(SFX.ctx.destination);
	} catch (e) {
		SFX.ctx = null;
	}
}
addEventListener(
	"pointerdown",
	() => {
		sfxInit();
		if (SFX.ctx && SFX.ctx.state === "suspended") SFX.ctx.resume();
	},
	{ capture: true },
);
addEventListener(
	"keydown",
	() => {
		sfxInit();
		if (SFX.ctx && SFX.ctx.state === "suspended") SFX.ctx.resume();
	},
	{ capture: true },
);
function tone(f, d, type = "sine", vol = 0.25, f2 = 0, at = 0) {
	const c = SFX.ctx,
		t = c.currentTime + at,
		o = c.createOscillator(),
		g = c.createGain();
	o.type = type;
	o.frequency.setValueAtTime(f, t);
	if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
	g.gain.exponentialRampToValueAtTime(0.0001, t + d);
	o.connect(g);
	g.connect(SFX.out);
	o.start(t);
	o.stop(t + d + 0.02);
}
function noiseHit(d, vol = 0.3, f1 = 800, f2 = 200, at = 0, q = 1) {
	const c = SFX.ctx,
		t = c.currentTime + at,
		len = Math.ceil(c.sampleRate * d),
		buf = c.createBuffer(1, len, c.sampleRate),
		ch = buf.getChannelData(0);
	for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
	const s = c.createBufferSource(),
		fl = c.createBiquadFilter(),
		g = c.createGain();
	s.buffer = buf;
	fl.type = "bandpass";
	fl.Q.value = q;
	fl.frequency.setValueAtTime(f1, t);
	fl.frequency.exponentialRampToValueAtTime(f2, t + d);
	g.gain.value = vol;
	s.connect(fl);
	fl.connect(g);
	g.connect(SFX.out);
	s.start(t);
}
/* ---------- music: a small step sequencer on the sfx synth (16th-note steps, scheduled 0.12 s ahead) ----------
   musPlay(song) starts a SONGS entry, musLevel(n) moves it to intensity n (the song's tempo and layers per level),
   musHit() lands a crash + boom on the next beat, musStop() ends it. Muted with the sound button like everything else. */
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const SONGS = {
	/* Monster Mash: E minor chug. Level 1 kick + bass + hats, 2 adds snare and power-chord stabs, 3 doubles the kick,
	   adds a lead arpeggio and speeds up */
	boss: {
		bpm: [0, 118, 132, 150],
		bass: [
			40, 0, 40, 0, 43, 0, 40, 0, 45, 0, 43, 0, 40, 38, 40, 0, 40, 0, 40, 0, 43, 0, 47, 0, 45, 0, 43, 0, 38, 0, 35, 0,
		],
		kick: [
			[0, 4, 8, 12],
			[0, 4, 8, 12],
			[0, 3, 4, 8, 11, 12, 14],
		],
		snare: [[], [4, 12], [4, 12]],
		hat: [2, 2, 1],
		stab: [[], [0, 6, 12], [0, 3, 6, 12, 14]],
		lead: [64, 67, 71, 76, 71, 67, 64, 67, 62, 66, 69, 74, 69, 66, 62, 59],
	},
};
const MUS = { song: null, lvl: 1, step: 0, next: 0, iv: 0, hit: false };
function musPlay(name) {
	musStop();
	if (!SFX.ctx || !SONGS[name]) return;
	MUS.song = SONGS[name];
	MUS.lvl = 1;
	MUS.step = 0;
	MUS.next = SFX.ctx.currentTime + 0.1;
	MUS.iv = setInterval(musTick, 25);
}
function musLevel(n) {
	MUS.lvl = Math.max(1, Math.min(3, n | 0));
}
function musHit() {
	MUS.hit = true;
}
function musStop() {
	clearInterval(MUS.iv);
	MUS.iv = 0;
	MUS.song = null;
}
function musTick() {
	const c = SFX.ctx,
		S = MUS.song;
	if (!c || !S) return;
	/* catch up after a stall without a burst of notes */
	if (MUS.next < c.currentTime - 0.2) MUS.next = c.currentTime + 0.05;
	while (MUS.next < c.currentTime + 0.12) {
		const l = MUS.lvl,
			st = MUS.step % 16,
			bar = MUS.step % 32,
			dur = 60 / S.bpm[l] / 4,
			at = Math.max(0, MUS.next - c.currentTime);
		if (SFX.on && c.state === "running") {
			if (MUS.hit && st % 4 === 0) {
				MUS.hit = false;
				noiseHit(1.1, 0.16, 6000, 2500, at, 0.6);
				tone(70, 0.5, "sine", 0.35, 35, at);
			}
			if (S.kick[l - 1].includes(st)) tone(150, 0.16, "sine", 0.32, 45, at);
			if (S.snare[l - 1].includes(st)) noiseHit(0.14, 0.14, 1900, 900, at, 0.9);
			if (st % S.hat[l - 1] === 0) noiseHit(0.035, 0.05, 8000, 6000, at, 1.2);
			const b = S.bass[bar];
			if (b) tone(NOTE(b), dur * 1.6, "sawtooth", 0.07, 0, at);
			if (S.stab[l - 1].includes(st)) {
				const r = S.bass[bar - (bar % 8)] + 12;
				[0, 7, 12].forEach((iv) => tone(NOTE(r + iv), dur * 1.2, "square", 0.025, 0, at));
			}
			if (l === 3) tone(NOTE(S.lead[st]), dur * 0.9, "triangle", 0.045, 0, at);
		}
		MUS.next += dur;
		MUS.step++;
	}
}
/* a short buzz on phones that support it (Android). iPhone Safari has no vibration API, not even as a home screen app */
function buzz(ms) {
	try {
		if (navigator.vibrate) navigator.vibrate(ms);
	} catch (e) {}
}
function sfx(n) {
	if (!SFX.on || !SFX.ctx || SFX.ctx.state !== "running") return;
	try {
		switch (n) {
			case "click":
				tone(1250, 0.05, "triangle", 0.08);
				break;
			case "coin":
				tone(988, 0.07, "square", 0.07);
				tone(1480, 0.16, "square", 0.07, 0, 0.06);
				break;
			case "loss":
				tone(420, 0.22, "triangle", 0.14, 210);
				break;
			case "dice":
				for (let i = 0; i < 6; i++) noiseHit(0.04, 0.22, 3000, 1500, i * 0.09 + Math.random() * 0.03, 3);
				break;
			case "diceland":
				noiseHit(0.08, 0.3, 1800, 600, 0, 2);
				tone(660, 0.12, "triangle", 0.1);
				break;
			case "step":
				tone(180 + Math.random() * 40, 0.06, "triangle", 0.06);
				break;
			case "land":
				noiseHit(0.12, 0.18, 600, 150, 0, 1);
				break;
			case "battery":
				[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "square", 0.08, 0, i * 0.08));
				tone(1568, 0.4, "triangle", 0.1, 0, 0.34);
				break;
			case "event":
				[880, 1175, 1568].forEach((f, i) => tone(f, 0.14, "triangle", 0.1, 0, i * 0.06));
				break;
			case "magnet":
				tone(520, 0.9, "sawtooth", 0.06, 780);
				tone(780, 0.9, "sawtooth", 0.05, 520, 0.45);
				break;
			case "beep":
				tone(660, 0.12, "square", 0.09);
				break;
			case "go":
				tone(990, 0.35, "square", 0.1);
				tone(1320, 0.35, "triangle", 0.08);
				break;
			case "ram":
				noiseHit(0.18, 0.45, 1200, 100, 0, 0.8);
				tone(110, 0.2, "sine", 0.3, 55);
				break;
			case "splash":
				noiseHit(0.5, 0.35, 2500, 300, 0, 0.7);
				break;
			case "fanfare":
				[523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.5 : 0.14, "square", 0.08, 0, i * 0.12));
				break;
			case "honk":
				tone(196, 0.5, "square", 0.12);
				tone(247, 0.5, "square", 0.1);
				tone(196, 0.6, "square", 0.12, 0, 0.6);
				tone(247, 0.6, "square", 0.1, 0, 0.6);
				break;
			case "skid":
				noiseHit(0.55, 0.2, 2400, 900, 0, 4);
				noiseHit(0.45, 0.12, 1300, 700, 0.08, 3);
				break;
			case "crack":
				noiseHit(0.07, 0.16, 3200, 1400, 0, 1.6);
				noiseHit(0.12, 0.1, 1500, 400, 0.04, 1);
				break;
			case "thunder":
				noiseHit(1.6, 0.5, 220, 40, 0, 0.5);
				noiseHit(0.9, 0.35, 400, 60, 0.15, 0.7);
				tone(48, 1.2, "sine", 0.22, 30);
				break;
			case "crush":
				tone(90, 0.3, "sine", 0.35, 40);
				noiseHit(0.25, 0.3, 500, 80);
				break;
			/* Monster Mash: tyre cannon (a deep thump with a hiss of air), pound wind-up (rising rumble), stun (dizzy chirps) */
			case "cannon":
				tone(140, 0.18, "sine", 0.32, 55);
				noiseHit(0.14, 0.28, 2600, 300, 0, 1.5);
				noiseHit(0.22, 0.1, 5000, 2000, 0.03, 1);
				break;
			case "windup":
				tone(70, 0.6, "sawtooth", 0.08, 190);
				noiseHit(0.55, 0.08, 300, 900, 0, 1);
				break;
			case "roar":
				tone(55, 0.9, "sawtooth", 0.16, 38);
				tone(82, 0.8, "square", 0.06, 50, 0.05);
				noiseHit(0.9, 0.22, 700, 120, 0, 1);
				break;
			case "stun":
				for (let i = 0; i < 3; i++) tone(1500 - i * 220, 0.08, "triangle", 0.06, 1900 - i * 220, i * 0.09);
				break;
		}
	} catch (e) {}
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("button");
	if (!b) return;
	if (b.dataset.a === "snd") {
		SFX.on = !SFX.on;
		LS.set("trp_snd", SFX.on);
		b.textContent = SFX.on ? "🔊" : "🔇";
		if (SFX.on) sfx("click");
		return;
	}
	sfx("click");
});

/* ---------- board: coin/battery bursts, landing dust, fork path preview ---------- */
/* battery purchase: zoom on the buyer, a glowing 3D battery pops out of the truck and flies into their card, then the camera follows the factory to its new spot */
/* Volcano Quarry batteries are purple obsidian */
const BAT_LOOK = {
	g: ["#1FA35C", "#0E6B3A", "#157A44", "#FFE27A", "#FFC83D"],
	v: ["#5B2BB5", "#7A3CFF", "#3B2466", "#F3E6FF", "#C9A2FF"],
};
const BAT_FX = { g: ["#7CF0A8", "#FFE27A", "#FFFFFF", "#1FA35C"], v: ["#B78CFF", "#F3E6FF", "#FFFFFF", "#7A3CFF"] };
const batKey = () => (MAP && MAP.shards ? "v" : "g");
function batteryMesh(purple) {
	const g = new THREE.Group(),
		L = BAT_LOOK[purple === undefined ? batKey() : purple ? "v" : "g"];
	g.add(mesh(chamferBox(1.5, 0.95, 0.85, 0.16), L[0], { emissive: L[1], emissiveIntensity: 0.55 }));
	const cap = mesh(chamferBox(0.24, 0.46, 0.52, 0.06), L[2]);
	cap.position.x = 0.86;
	g.add(cap);
	const bs = new THREE.Shape();
	[
		[0.08, 0.36],
		[-0.2, -0.03],
		[-0.01, -0.03],
		[-0.09, -0.36],
		[0.22, 0.07],
		[0.03, 0.07],
	].forEach(([x, y], i) => (i ? bs.lineTo(x, y) : bs.moveTo(x, y)));
	bs.closePath();
	const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.05, bevelEnabled: false }),
		bm = new THREE.MeshStandardMaterial({ color: L[3], emissive: L[4], emissiveIntensity: 0.9, flatShading: true });
	[1, -1].forEach((sd) => {
		const b = new THREE.Mesh(bg, bm);
		b.position.z = sd * 0.43;
		if (sd < 0) b.rotation.y = Math.PI;
		g.add(b);
	});
	return g;
}
function stepBattery(bd, dt) {
	const s = GFX.bseq;
	if (!s) return null;
	const t = (performance.now() - s.t0) / 1000,
		tok = GFX.tok[s.pid];
	const mv = 4.4 + (bd.vx ? FAC_RISE : 0) + FAC_HOP;
	if (t > mv + 0.75 || !tok) {
		if (s.m) bd.scene.remove(s.m);
		GFX.bseq = null;
		return null;
	}
	const tp = tok.g.position;
	if (s.m) {
		const m = s.m,
			rise = Math.min(1, t / 1.1),
			e = 1 - Math.pow(1 - rise, 3),
			pop = t < 0.3 ? (t / 0.3) * 1.3 : t < 0.5 ? 1.3 - ((t - 0.3) / 0.2) * 0.3 : 1;
		const dn = Math.max(0, Math.min(1, (t - 1.55) / 0.5)),
			de = dn * dn;
		m.position.set(tp.x, tp.y + 0.9 + e * 2.4 * (1 - de) - de * 0.5 + Math.sin(t * 4) * 0.08 * rise * (1 - dn), tp.z);
		m.rotation.y = t * (6 - rise * 3.5 + dn * 10) + 0.4;
		m.rotation.z = Math.sin(t * 3) * 0.12 * (1 - dn);
		m.scale.setScalar(0.8 * pop * (1 - de * 0.97));
		if (!s.sp && t > 1) {
			s.sp = 1;
			burst(bd.scene, m.position.x, m.position.y, m.position.z, {
				n: 26,
				shape: "ico",
				cols: BAT_FX[batKey()].slice(0, 3),
				spd: 6,
				up: 3,
				grav: 4,
				life: 0.9,
			});
		}
		if (dn >= 1) {
			bd.scene.remove(m);
			s.m = null;
			tok.sq = 0.28;
			burst(bd.scene, tp.x, tp.y + 0.9, tp.z, {
				n: 16,
				shape: "ico",
				cols: [BAT_FX[batKey()][3], BAT_FX[batKey()][0], "#FFFFFF"],
				spd: 3,
				up: 2,
				grav: 3,
				life: 0.6,
			});
			sfx("coin");
			const card = [...document.querySelectorAll(".pc[data-k]")].find((c) => c.dataset.k === s.pid);
			if (card) {
				card.classList.remove("batbump");
				void card.offsetWidth;
				card.classList.add("batbump");
			}
		}
	}
	if (t < 2.9) {
		const tgt = tp.clone();
		tgt.y = tp.y + 2.3 - Math.max(0, Math.min(1, (t - 1.55) / 0.6)) * 1.3;
		return [tgt, tgt.clone().add(new THREE.Vector3(0, 5.5, 9))];
	}
	if (t < mv + 0.55 && bd.fac) {
		const f = bd.fac.position,
			ft = bd.facTarget,
			tgt = new THREE.Vector3(f.x, 0, f.z);
		let k = 0.85;
		/* while the factory moves, frame both its old and new spot */
		if (ft && t > 4.3) {
			const d = Math.hypot(ft.x - f.x, ft.z - f.z);
			tgt.set((f.x + ft.x) / 2, 0, (f.z + ft.z) / 2);
			k = 0.85 * Math.max(1, d / 14);
		}
		return [tgt, followCamPos(tgt, GFX.w / GFX.h, k)];
	}
	return null;
}
/* Magnet Mike countdown: his anime villain portrait (MIKE_ART) on a navy sticker */
/* stickers (board events, Magnet Mike) play one at a time on their own layer, each for STICKER_MS */
const STICKER_MS = 2700,
	stQ = [];
let stOn = false;
function stickerShow(html) {
	if (document.body.classList.contains("tvphone")) return;
	stQ.push(html);
	if (stQ.length > 4) stQ.splice(0, stQ.length - 4);
	if (!stOn) stNext();
}
function stNext() {
	const el = document.getElementById("fxs"),
		h = stQ.shift();
	if (!el || h === undefined) {
		stOn = false;
		if (el) el.innerHTML = "";
		return;
	}
	stOn = true;
	el.innerHTML = h;
	setTimeout(stNext, STICKER_MS);
}
/* board event popups: navy sticker with a colour-coded icon badge (good / bad / belt / special) */
const EV_LOOK = [
	[/^conveyor/i, (t) => (/backward/.test(t) ? "⏪" : "⏩"), "belt"],
	[/^tailwind/i, "💨", "good"],
	[/^crusher/i, "🔨", "bad"],
	[/^scrap pile/i, (t) => (/nothing/.test(t) ? "🔩" : "🪙"), (t) => (/nothing/.test(t) ? "meh" : "good")],
	[/spike strip/i, "📌", "bad"],
	[/^scrap shop/i, "🛒", "meh"],
	[/^road swap/i, "🔀", "spec"],
	[/^lost cargo/i, "📦", "good"],
	[/^factory relocates/i, "🏭", "spec"],
	[/^lucky find/i, "🍀", "good"],
	[/^minecart/i, "🛒", "good"],
	[/^rail cart/i, "🛤️", "good"],
	[/^eruption!$/i, "🌋", "bad"],
	[/^refinery/i, "⚙️", "good"],
	[/^truck bed full/i, "📦", "meh"],
	[/^battery factory/i, "🔋", "spec"],
	[/^fuel tax/i, "⛽", "spec"],
	[/^duel/i, "⚔️", "spec"],
	[/^lava/i, "🌋", "bad"],
	[/^eruption/i, "🌋", "bad"],
	[/^geyser/i, "💨", "good"],
	[/^obsidian/i, "💎", "good"],
	[/^scorched/i, "🔥", "bad"],
	[/^rock conveyor/i, "🪨", "belt"],
	[/^ore cart/i, (t) => (/nothing/.test(t) ? "🪨" : "🪙"), (t) => (/nothing/.test(t) ? "meh" : "good")],
];
function showSticker(ev) {
	let title = String(ev.title || ""),
		text = String(ev.text || ""),
		icon = "❗",
		tone = "spec";
	const lead = title.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*/u);
	if (lead) {
		icon = lead[1];
		title = title.slice(lead[0].length);
	}
	for (const [re, ic, tn] of EV_LOOK)
		if (re.test(title)) {
			icon = typeof ic === "function" ? ic(text) : ic;
			tone = typeof tn === "function" ? tn(text) : tn;
			break;
		}
	if (/magnet mike/i.test(title)) {
		stickerShow(
			`<div class="mike"><div class="mk-st"><div class="mk-box"><span class="mk-name">Magnet Mike</span><span class="mk-big mk-mid">${esc(text.replace(/,? so Magnet Mike is coming for them!?/i, "").trim())}</span><span class="mk-sub">He's coming for them!</span></div><img alt="" src="${MIKE_ART}"></div></div>`,
		);
		return;
	}
	stickerShow(
		`<div class="evs ${tone}"><div class="ev-box"><span class="ev-ic">${icon}</span><div class="ev-tx"><span class="ev-t">${esc(title.replace(/!$/, ""))}</span><span class="ev-x">${esc(text)}</span></div></div></div>`,
	);
}
function showMike(ev) {
	sfx("magnet");
	const n = ev.left || 0,
		img = MIKE_ART;
	const line = n === 1 ? `strikes <i>this round!</i>` : `strikes in <i>${n}</i> rounds`;
	stickerShow(
		`<div class="mike${n === 1 ? " now" : ""}"><div class="mk-st"><div class="mk-box"><span class="mk-name">Magnet Mike</span><span class="mk-big">${line}</span>${n === 1 ? `<span class="mk-sub">Someone's getting hauled away…</span>` : ""}</div>${img ? `<img alt="" src="${img}">` : ""}</div></div>`,
	);
}
/* team minigame reveal: "1 vs 3!" with each side's trucks on its colour */
function showVs(ev) {
	const side = (s) =>
		G.players
			.filter((p) => ev.vs[p.key] === s)
			.map(
				(p) =>
					`<span class="vs-t${p.key === me.key ? " me" : ""}"><img alt="" src="${thumb(p.truck)}"><b>${esc(p.key === me.key ? "You" : p.name)}</b></span>`,
			)
			.join("");
	stickerShow(
		`<div class="vss"><div class="vs-box"><span class="vs-big">${esc(ev.title)}</span><div class="vs-row"><div class="vs-side" style="--sc:${ev.tc[0]}">${side(0)}</div><span class="vs-x">VS</span><div class="vs-side" style="--sc:${ev.tc[1]}">${side(1)}</div></div></div></div>`,
	);
}
function boardFx(bd, dt) {
	const ps = G.players;
	ps.forEach((p) => {
		const t = GFX.tok[p.key];
		if (!t) return;
		const pos = t.g.position;
		if (t.lc === undefined) {
			t.lc = p.coins;
			t.lb = p.bat;
		}
		if (p.coins !== t.lc) {
			const d = p.coins - t.lc;
			t.lc = p.coins;
			if (d > 0) {
				burst(bd.scene, pos.x, pos.y + 1.2, pos.z, {
					n: Math.min(3 + d, 16),
					shape: "coin",
					cols: ["#FFC83D", "#FFE27A"],
					spd: 2.2,
					up: 7,
					grav: 14,
					life: 1.1,
				});
				sfx("coin");
			} else {
				burst(bd.scene, pos.x, pos.y + 1, pos.z, {
					n: Math.min(3 - d, 12),
					shape: "coin",
					cols: ["#E5484D", "#B5313A"],
					spd: 2.5,
					up: 3,
					grav: 10,
					life: 0.9,
				});
				sfx("loss");
			}
		}
		if (p.bat !== t.lb) {
			if (p.bat > t.lb) {
				burst(bd.scene, pos.x, pos.y + 1.5, pos.z, {
					n: 30,
					shape: "ico",
					cols: BAT_FX[batKey()],
					spd: 5,
					up: 8,
					grav: 9,
					life: 1.5,
				});
				sfx("battery");
			}
			t.lb = p.bat;
		}
		/* Volcano Quarry cargo: purple shards pop up when dug, scatter dark when lost (refining is animated by the gate itself) */
		const sh = p.shards | 0,
			ce = p.dust | 0;
		if (t.lsh === undefined) {
			t.lsh = sh;
			t.lce = ce;
		}
		if (ce > t.lce) {
		} else if (sh > t.lsh) {
			burst(bd.scene, pos.x, pos.y + 1.2, pos.z, {
				n: 6 + 5 * (sh - t.lsh),
				shape: "ico",
				cols: ["#7A3CFF", "#B78CFF", "#3B2466"],
				spd: 2.4,
				up: 7,
				grav: 13,
				life: 1.1,
			});
			sfx("coin");
		} else if (sh < t.lsh) {
			burst(bd.scene, pos.x, pos.y + 1, pos.z, {
				n: 10,
				shape: "ico",
				cols: ["#3B2466", "#2A1D19", "#FF6A1F"],
				spd: 2.6,
				up: 3,
				grav: 10,
				life: 0.9,
			});
			sfx("loss");
		}
		t.lsh = sh;
		t.lce = ce;
		if (t.anim && !t.wasAnim) sfx("step");
		if (!t.anim && t.wasAnim) {
			t.sq = 0.28;
			burst(bd.scene, pos.x, 0.55, pos.z, { n: 6, shape: "ico", cols: DUST, spd: 1.6, up: 1.2, grav: 4, life: 0.6 });
		}
		t.wasAnim = !!t.anim;
		if (t.sq > 0) {
			t.sq = Math.max(0, t.sq - dt);
			const k = Math.sin((1 - t.sq / 0.28) * Math.PI) * 0.22;
			t.tr.scale.set(0.62 * (1 + k * 0.5), 0.62 * (1 - k), 0.62 * (1 + k * 0.5));
		} else t.tr.scale.setScalar(0.62);
	});
	bd.crushers.forEach((c) => {
		const low = c.blk.position.y < 1;
		if (low && !c.was)
			burst(
				bd.scene,
				c.blk.position.x + (c.blk.parent ? c.blk.parent.position.x : 0),
				0.6,
				c.blk.parent ? c.blk.parent.position.z : 0,
				{ n: 7, shape: "ico", cols: DUST, spd: 2.4, up: 1.5, grav: 5, life: 0.7 },
			);
		c.was = low;
	});
	if (!bd.dots) {
		bd.dots = [];
		for (let i = 0; i < 18; i++) {
			const m = new THREE.Mesh(
				new THREE.CircleGeometry(0.32, 12),
				new THREE.MeshBasicMaterial({ color: "#FFE27A", transparent: true, opacity: 0.85 }),
			);
			m.rotation.x = -Math.PI / 2;
			m.visible = false;
			bd.scene.add(m);
			bd.dots.push(m);
		}
	}
	let di = 0;
	const tm = performance.now() / 1000;
	if (G.phase === "fork" && G.fork)
		G.fork.opts.forEach((o, k) => {
			let n = o,
				f = G.fork.at;
			for (let s = 0; s < 6 && di < bd.dots.length; s++) {
				const nd = MAP.nodes[n];
				if (!nd) break;
				const m = bd.dots[di++];
				m.visible = true;
				m.position.set(nd.x, (nd.y || 0) + 0.56, nd.z);
				m.material.opacity = 0.35 + 0.5 * Math.max(0, Math.sin(tm * 5 - s * 0.7));
				m.scale.setScalar(1 - s * 0.08);
				const nx = travelOpts(n, f)[0];
				f = n;
				n = nx;
			}
		});
	for (; di < bd.dots.length; di++) bd.dots[di].visible = false;
	stepParts(bd.scene, dt);
}
