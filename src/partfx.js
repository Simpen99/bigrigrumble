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
		/* sound effects go through their own bus, 25% under the music */
		SFX.fx = SFX.ctx.createGain();
		SFX.fx.gain.value = 0.75;
		SFX.fx.connect(SFX.out);
		SFX.to = SFX.fx;
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
	g.connect(SFX.to || SFX.out);
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
	g.connect(SFX.to || SFX.out);
	s.start(t);
}
/* ---------- music: a step sequencer with its own synth voices (16th-note steps, scheduled 0.12 s ahead) ----------
   musPlay(song, lvl) starts a SONGS entry, musLevel(n) moves it to section n (a drum fill from the middle of the bar, a
   crash on the next downbeat), musHit() lands a crash + chord stab on the next beat, musEnd(win) rings out a final chord
   (major when win), musStop(fade) fades it out. musJingle(name, key) plays a short JINGLES entry over it (the song ducks).
   musScene(view) (from render) picks the board theme of the map. Each song / jingle plays through its own output
   (musOut: a gain + guitar overdrive, set in MO while notes are scheduled) into the shared bus (musBus: a tempo delay for
   the lead, a short reverb, a glue compressor) straight into SFX.out, above the sound effects. Muted with the sound button
   like the rest, silent in a background tab. */
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
/* the 16th string ostinato through the chord: root, fifth, top, fifth, third, fifth, top, fifth */
const OST = [0, 2, 3, 2, 1, 2, 3, 2];
/* song: vol, key (semitones from C, for the jingles over it), sec = sections (levels). A section: bpm; ch = per bar
   [bass root, 3 minor | 4 major, 7th (10 | 11) or 0]; kick / snare / ohat = steps; hat = 2 eighths | 1 sixteenths | 0;
   tom = [step, pitch, ...]; crash = bars; swing = odd 16ths late by this share of a step; bass = "8" | "oct" | [step,
   semitones, ...]; gtr = "hit" (3-3-2) | "chug" (palm-muted 8ths) | "drive" (open 8ths); str = ostinato (sv volume);
   pad; keys = steps of a chord stab (kv "ep" electric piano | "clav"); mel = per bar [step, note, length in steps, ...]
   played by lead voice lv (MV) */
const SONGS = {
	/* Monster Mash, an anime-opening rock track in E minor, one section per boss phase:
	   1 verse: i VI VII V, rock beat, 16th string ostinato, 3-3-2 guitar hits, a lead hook in the second half
	   2 pre-chorus: iv v VI VII climbing an octave higher, palm-muted chugs, a rising melody
	   3 chorus: the royal road IV V iii vi, four on the floor with off-beat open hats, octave bass, driving guitar, soaring lead */
	boss: {
		vol: 1,
		key: 4,
		boom: 1,
		sec: [
			{
				bpm: 168,
				ch: [
					[40, 3],
					[36, 4],
					[38, 4],
					[35, 4],
					[40, 3],
					[36, 4],
					[38, 4],
					[35, 4],
				],
				kick: [0, 8, 10],
				snare: [4, 12],
				ohat: [],
				crash: [0],
				gtr: "hit",
				bass: "8",
				str: OST,
				sv: 0.028,
				lv: "anime",
				mel: [
					0,
					0,
					0,
					0,
					[0, 71, 2, 2, 76, 2, 4, 79, 2, 6, 78, 2, 8, 76, 6, 14, 74, 2],
					[0, 76, 3, 3, 74, 1, 4, 72, 4, 8, 67, 4, 12, 72, 4],
					[0, 74, 6, 6, 78, 2, 8, 81, 6, 14, 79, 2],
					[0, 78, 8, 8, 75, 4, 12, 71, 4],
				],
			},
			{
				bpm: 176,
				ch: [
					[45, 3],
					[47, 3],
					[48, 4],
					[50, 4],
				],
				kick: [0, 8, 11],
				snare: [4, 12],
				ohat: [],
				crash: [0],
				gtr: "chug",
				bass: "8",
				str: OST,
				sv: 0.028,
				pad: 1,
				lv: "anime",
				mel: [
					[0, 69, 4, 4, 72, 4, 8, 76, 6, 14, 74, 2],
					[0, 71, 4, 4, 74, 4, 8, 78, 6, 14, 76, 2],
					[0, 76, 4, 4, 79, 4, 8, 76, 4, 12, 79, 4],
					[0, 81, 8, 8, 78, 2, 10, 79, 2, 12, 81, 4],
				],
			},
			{
				bpm: 184,
				ch: [
					[36, 4],
					[38, 4],
					[35, 3],
					[40, 3],
					[36, 4],
					[38, 4],
					[35, 4],
					[35, 4],
				],
				kick: [0, 4, 8, 12],
				snare: [4, 12],
				ohat: [2, 6, 10, 14],
				crash: [0, 4],
				gtr: "drive",
				bass: "oct",
				str: OST,
				sv: 0.022,
				pad: 1,
				lv: "anime",
				mel: [
					[0, 76, 6, 6, 74, 2, 8, 76, 4, 12, 79, 4],
					[0, 78, 6, 6, 76, 2, 8, 74, 4, 12, 69, 4],
					[0, 71, 4, 4, 74, 2, 6, 78, 6, 12, 76, 2, 14, 74, 2],
					[0, 76, 12, 12, 71, 2, 14, 74, 2],
					[0, 76, 6, 6, 74, 2, 8, 76, 4, 12, 79, 4],
					[0, 81, 6, 6, 79, 2, 8, 78, 4, 12, 74, 4],
					[0, 78, 4, 4, 79, 4, 8, 81, 4, 12, 83, 4],
					[0, 83, 8, 8, 81, 2, 10, 79, 2, 12, 78, 4],
				],
			},
		],
	},
	/* Classic board: bouncy city pop in C, IV V iii vi ii V I with sevenths, octave bass, off-beat electric piano, a bell
	   melody. 2 = the last 3 rounds: faster, four on the floor, open hats, strings and pad */
	classic: {
		vol: 0.55,
		key: 0,
		sec: [
			{
				bpm: 126,
				ch: [
					[41, 4, 11],
					[43, 4, 10],
					[40, 3, 10],
					[45, 3, 10],
					[38, 3, 10],
					[43, 4, 10],
					[36, 4, 11],
					[36, 4, 11],
				],
				kick: [0, 6, 8],
				snare: [4, 12],
				ohat: [],
				crash: [0],
				bass: [0, 0, 3, 12, 6, 0, 8, 0, 10, 12, 14, 7],
				keys: [2, 6, 10, 14],
				kv: "ep",
				lv: "bell",
				mel: [
					[0, 72, 2, 2, 76, 2, 4, 77, 3, 7, 76, 1, 8, 72, 2, 10, 69, 2, 12, 72, 4],
					[0, 74, 3, 3, 71, 1, 4, 74, 2, 6, 79, 2, 8, 77, 4, 12, 74, 4],
					[0, 71, 2, 2, 74, 2, 4, 76, 3, 7, 79, 1, 8, 76, 4, 12, 74, 2, 14, 72, 2],
					[0, 72, 4, 4, 76, 4, 8, 79, 6, 14, 81, 2],
					[0, 81, 3, 3, 79, 1, 4, 77, 2, 6, 74, 2, 8, 77, 4, 12, 81, 4],
					[0, 79, 3, 3, 77, 1, 4, 74, 2, 6, 71, 2, 8, 74, 4, 12, 77, 4],
					[0, 76, 6, 6, 79, 2, 8, 83, 4, 12, 84, 4],
					[0, 84, 8, 8, 79, 2, 10, 76, 2, 12, 74, 4],
				],
			},
			{
				bpm: 138,
				ch: [
					[41, 4, 11],
					[43, 4, 10],
					[40, 3, 10],
					[45, 3, 10],
					[38, 3, 10],
					[43, 4, 10],
					[36, 4, 11],
					[36, 4, 11],
				],
				kick: [0, 4, 8, 12],
				snare: [4, 12],
				ohat: [2, 6, 10, 14],
				crash: [0, 4],
				bass: "oct",
				keys: [2, 6, 10, 14],
				kv: "ep",
				str: OST,
				sv: 0.018,
				pad: 1,
				lv: "bell",
				mel: "same",
			},
		],
	},
	/* Junkyard Jumble: a scrappy swung funk groove in A, i i IV IV i i V IV with sevenths, slap-ish bass, clav, horn riffs.
	   2 = the last 3 rounds: faster, busier kick, distorted guitar hits */
	junk: {
		vol: 0.55,
		key: -3,
		sec: [
			{
				bpm: 100,
				swing: 0.3,
				ch: [
					[45, 3, 10],
					[45, 3, 10],
					[38, 4, 10],
					[38, 4, 10],
					[45, 3, 10],
					[45, 3, 10],
					[40, 4, 10],
					[38, 4, 10],
				],
				kick: [0, 7, 10],
				snare: [4, 12],
				hat: 1,
				ohat: [14],
				crash: [0],
				bass: [0, 0, 3, 0, 4, 12, 6, 0, 8, 0, 10, 7, 11, 10, 14, 12],
				keys: [2, 3, 6, 10, 11, 14],
				kv: "clav",
				lv: "horn",
				mel: [
					[0, 69, 1, 2, 72, 1, 3, 74, 2, 6, 72, 1, 7, 69, 1, 10, 76, 2, 12, 74, 1, 13, 72, 1, 14, 69, 2],
					0,
					[0, 74, 1, 2, 78, 1, 3, 81, 2, 6, 78, 1, 7, 74, 1, 10, 72, 2, 12, 74, 4],
					0,
					[0, 69, 1, 2, 72, 1, 3, 74, 2, 6, 72, 1, 7, 69, 1, 10, 76, 2, 12, 74, 1, 13, 72, 1, 14, 69, 2],
					[0, 81, 2, 2, 79, 1, 3, 76, 1, 4, 79, 2, 6, 76, 2, 8, 74, 2, 10, 72, 2, 12, 69, 4],
					[0, 80, 2, 2, 76, 2, 4, 74, 2, 6, 71, 2, 8, 76, 4, 12, 74, 4],
					[0, 74, 4, 4, 72, 2, 6, 69, 2, 8, 72, 2, 10, 74, 2, 12, 76, 4],
				],
			},
			{
				bpm: 108,
				swing: 0.3,
				ch: [
					[45, 3, 10],
					[45, 3, 10],
					[38, 4, 10],
					[38, 4, 10],
					[45, 3, 10],
					[45, 3, 10],
					[40, 4, 10],
					[38, 4, 10],
				],
				kick: [0, 3, 7, 10],
				snare: [4, 12],
				hat: 1,
				ohat: [6, 14],
				crash: [0, 4],
				bass: [0, 0, 3, 0, 4, 12, 6, 0, 8, 0, 10, 7, 11, 10, 14, 12],
				gtr: "hit",
				keys: [2, 3, 6, 10, 11, 14],
				kv: "clav",
				lv: "horn",
				mel: "same",
			},
		],
	},
	/* Volcano Quarry: brooding D minor, i VI iv V over a falling bass, taiko toms, a low string ostinato and a dark lead.
	   2 = eruption coming (the 2 rounds before it): faster, rock beat, palm-muted guitar; 3 = erupting: the boss's chorus
	   energy (four on the floor, driving guitar, octave bass) */
	volcano: {
		vol: 0.6,
		key: 2,
		boom: 1,
		sec: [
			{
				bpm: 92,
				ch: [
					[38, 3],
					[34, 4],
					[31, 3],
					[33, 4],
				],
				kick: [0, 10],
				snare: [8],
				hat: 0,
				ohat: [],
				tom: [0, 0.55, 3, 0.55, 6, 0.7, 14, 0.8],
				crash: [0],
				bass: "8",
				str: [0, 1, 2, 1, 0, 1, 2, 3],
				sv: 0.022,
				pad: 1,
				lv: "dark",
				mel: [
					[0, 62, 6, 6, 65, 2, 8, 69, 8],
					[0, 70, 6, 6, 69, 2, 8, 65, 8],
					[0, 67, 6, 6, 70, 2, 8, 74, 6, 14, 72, 2],
					[0, 73, 8, 8, 69, 4, 12, 64, 4],
				],
			},
			{
				bpm: 112,
				ch: [
					[38, 3],
					[34, 4],
					[31, 3],
					[33, 4],
				],
				kick: [0, 6, 10],
				snare: [4, 12],
				ohat: [],
				tom: [14, 0.8, 15, 0.7],
				crash: [0],
				bass: "8",
				gtr: "chug",
				str: OST,
				sv: 0.024,
				pad: 1,
				lv: "dark",
				mel: "same",
			},
			{
				bpm: 150,
				ch: [
					[38, 3],
					[34, 4],
					[31, 3],
					[33, 4],
				],
				kick: [0, 4, 8, 12],
				snare: [4, 12],
				ohat: [2, 6, 10, 14],
				crash: [0, 2],
				bass: "oct",
				gtr: "drive",
				str: OST,
				sv: 0.022,
				pad: 1,
				lv: "anime",
				mel: "same",
			},
		],
	},
};
/* sections with mel "same" reuse the first section's melody */
Object.values(SONGS).forEach((S) => S.sec.forEach((s) => s.mel === "same" && (s.mel = S.sec[0].mel)));
function musBus() {
	if (SFX.mus) return SFX.mus;
	const c = SFX.ctx,
		B = {},
		gain = (v, to) => {
			const g = c.createGain();
			g.gain.value = v;
			if (to) g.connect(to);
			return g;
		};
	B.comp = c.createDynamicsCompressor();
	B.comp.threshold.value = -16;
	B.comp.ratio.value = 4;
	B.comp.attack.value = 0.004;
	B.comp.release.value = 0.15;
	B.comp.connect(gain(0.4, SFX.out));
	/* one shared noise buffer for the drums */
	B.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
	const nz = B.noise.getChannelData(0);
	for (let i = 0; i < nz.length; i++) nz[i] = Math.random() * 2 - 1;
	/* reverb: a generated 1.6 s noise tail */
	const len = (c.sampleRate * 1.6) | 0,
		ir = c.createBuffer(2, len, c.sampleRate);
	for (let ch = 0; ch < 2; ch++) {
		const d = ir.getChannelData(ch);
		for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
	}
	B.rv = c.createConvolver();
	B.rv.buffer = ir;
	B.rv.connect(gain(0.3, B.comp));
	/* lead delay: a dotted eighth, set per tempo */
	B.dl = c.createDelay(1);
	const dlp = c.createBiquadFilter();
	dlp.type = "lowpass";
	dlp.frequency.value = 2600;
	B.dl.connect(dlp);
	dlp.connect(gain(0.3, B.dl));
	dlp.connect(gain(0.32, B.comp));
	/* the guitar overdrive curve */
	B.curve = new Float32Array(1024);
	for (let i = 0; i < 1024; i++) B.curve[i] = Math.tanh((i / 511.5 - 1) * 6);
	return (SFX.mus = B);
}
/* one song's or jingle's output: a gain (volume, fades, ducking) into the bus, with its own guitar overdrive in front */
function musOut(v) {
	const c = SFX.ctx,
		B = musBus(),
		g = c.createGain(),
		gtr = c.createGain(),
		ws = c.createWaveShaper(),
		cab = c.createBiquadFilter(),
		go = c.createGain();
	g.gain.value = v;
	g.connect(B.comp);
	ws.curve = B.curve;
	ws.oversample = "2x";
	cab.type = "lowpass";
	cab.frequency.value = 3400;
	cab.Q.value = 0.8;
	go.gain.value = 0.11;
	gtr.connect(ws);
	ws.connect(cab);
	cab.connect(go);
	go.connect(g);
	return { g, gtr, v };
}
/* fade an output to 0 over about fade seconds and unplug it afterwards */
function musFade(o, fade) {
	const c = SFX.ctx,
		t = c.currentTime;
	o.g.gain.cancelScheduledValues(t);
	o.g.gain.setValueAtTime(o.g.gain.value, t);
	o.g.gain.setTargetAtTime(0, t, Math.max(0.01, fade / 3));
	setTimeout(() => o.g.disconnect(), fade * 1000 + 500);
}
let MO = null;
/* one music note: n detuned oscillators (waves w, spread det cents) through a lowpass; attack a, decay to sus over dec,
   held to d, release r; vib = vibrato depth in cents that fades in; to = "gtr" for the overdrive; rv / dl = reverb / delay
   sends */
function mv(m, d, at, o) {
	const c = SFX.ctx,
		B = musBus(),
		t = c.currentTime + at,
		g = c.createGain(),
		lp = c.createBiquadFilter(),
		n = o.n || 1,
		w = [].concat(o.w || "sawtooth"),
		v = o.v || 0.05,
		a = o.a || 0.005,
		r = o.r || 0.06,
		end = t + d + r * 4;
	lp.type = "lowpass";
	lp.frequency.value = o.cut || 4000;
	g.gain.setValueAtTime(0, t);
	g.gain.linearRampToValueAtTime(v, t + a);
	if (o.sus) g.gain.setTargetAtTime(v * o.sus, t + a, o.dec || 0.1);
	g.gain.setTargetAtTime(0, t + Math.max(a, d), r);
	let lg = null;
	if (o.vib && d > 0.25) {
		const lfo = c.createOscillator();
		lg = c.createGain();
		lfo.frequency.value = 5.5;
		lg.gain.setValueAtTime(0, t);
		lg.gain.linearRampToValueAtTime(o.vib, t + Math.min(0.4, d));
		lfo.connect(lg);
		lfo.start(t);
		lfo.stop(end);
	}
	for (let i = 0; i < n; i++) {
		const os = c.createOscillator();
		os.type = w[i % w.length];
		os.frequency.value = NOTE(m);
		if (n > 1) os.detune.value = (i / (n - 1) - 0.5) * (o.det || 14);
		if (lg) lg.connect(os.detune);
		os.connect(lp);
		os.start(t);
		os.stop(end);
	}
	lp.connect(g);
	g.connect(o.to === "gtr" ? MO.gtr : MO.g);
	if (o.rv) g.connect(B.rv);
	if (o.dl) g.connect(B.dl);
}
/* drums: a pitched body (f -> f2, gone after d) and / or a highpassed noise burst (n seconds) */
const DRUM = {
	kick: { f: 150, f2: 42, d: 0.24, tv: 0.6, n: 0.012, hp: 2500, v: 0.1 },
	boom: { f: 90, f2: 28, d: 1, tv: 0.55 },
	snare: { f: 200, f2: 150, d: 0.1, tv: 0.2, w: "triangle", n: 0.17, hp: 1000, v: 0.26, rv: 1 },
	tom: { f: 190, f2: 100, d: 0.28, tv: 0.4 },
	hat: { n: 0.035, hp: 7500, v: 0.07 },
	ohat: { n: 0.2, hp: 7000, v: 0.055 },
	crash: { n: 1.6, hp: 4000, v: 0.15, rv: 1 },
};
function mdrum(k, at, vm = 1, fm = 1) {
	const D = DRUM[k],
		c = SFX.ctx,
		B = musBus(),
		t = c.currentTime + at;
	if (D.f) {
		const o = c.createOscillator(),
			g = c.createGain();
		o.type = D.w || "sine";
		o.frequency.setValueAtTime(D.f * fm, t);
		o.frequency.exponentialRampToValueAtTime(D.f2 * fm, t + D.d * 0.6);
		g.gain.setValueAtTime(D.tv * vm, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + D.d);
		o.connect(g);
		g.connect(MO.g);
		o.start(t);
		o.stop(t + D.d + 0.02);
	}
	if (D.n) {
		const s = c.createBufferSource(),
			hp = c.createBiquadFilter(),
			g = c.createGain();
		s.buffer = B.noise;
		hp.type = "highpass";
		hp.frequency.value = D.hp;
		g.gain.setValueAtTime(D.v * vm, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + D.n);
		s.connect(hp);
		hp.connect(g);
		g.connect(MO.g);
		if (D.rv) g.connect(B.rv);
		s.start(t, Math.random() * 0.3, D.n + 0.02);
	}
}
/* chord tones: a power chord for the guitar; the triad + top (the 7th if the chord has one, else the octave) for the
   strings (from A3..G#4), keys and pad (up) */
const musPow = (ch) => [ch[0] + 12, ch[0] + 19, ch[0] + 24];
const musTri = (ch, up = 0) => {
	const b = 57 + ((((ch[0] - 57) % 12) + 12) % 12) + up;
	return [b, b + ch[1], b + 7, b + (ch[2] || 12)];
};
function musGtr(ch, d, at, open, v = 0.22) {
	musPow(ch).forEach((m) => mv(m, d, at, { to: "gtr", n: 2, det: 12, v, cut: open ? 3000 : 900 }));
}
/* lead and jingle voices: (note, seconds, at, volume) */
const MV = {
	/* the boss lead: square + saw with vibrato, an octave-down triangle under it */
	anime(m, d, at, v = 1) {
		mv(m, d, at, {
			w: ["square", "sawtooth"],
			n: 2,
			det: 10,
			v: 0.045 * v,
			cut: 3800,
			a: 0.012,
			r: 0.08,
			vib: 22,
			rv: 1,
			dl: 1,
		});
		mv(m - 12, d, at, { w: "triangle", v: 0.04 * v, a: 0.012, r: 0.08, vib: 22 });
	},
	/* a plucky bell-ish lead (city pop) */
	bell(m, d, at, v = 1) {
		mv(m, d, at, {
			w: ["triangle", "square"],
			n: 2,
			det: 6,
			v: 0.05 * v,
			cut: 4500,
			a: 0.003,
			sus: 0.45,
			dec: 0.12,
			r: 0.12,
			vib: 12,
			rv: 1,
			dl: 1,
		});
		mv(m + 12, d * 0.5, at, { w: "sine", v: 0.018 * v, a: 0.002, sus: 0.2, dec: 0.06, r: 0.1 });
	},
	/* a horn section: three detuned saws, darker */
	horn(m, d, at, v = 1) {
		mv(m, d, at, { n: 3, det: 16, v: 0.04 * v, cut: 1900, a: 0.02, sus: 0.75, dec: 0.15, r: 0.07, vib: 14, rv: 1 });
		mv(m - 12, d, at, { w: "square", v: 0.016 * v, cut: 1200, a: 0.02, r: 0.07 });
	},
	/* a dark, slow-attack lead (volcano) */
	dark(m, d, at, v = 1) {
		mv(m, d, at, { n: 2, det: 16, v: 0.042 * v, cut: 1800, a: 0.06, r: 0.15, vib: 18, rv: 1, dl: 1 });
		mv(m - 12, d, at, { w: "triangle", v: 0.04 * v, a: 0.06, r: 0.15 });
	},
	/* jingles: brass stabs, a bass note */
	brass(m, d, at, v = 1) {
		mv(m, d, at, { n: 3, det: 14, v: 0.03 * v, cut: 2600, a: 0.025, sus: 0.7, dec: 0.3, r: 0.12, rv: 1 });
	},
	bass(m, d, at, v = 1) {
		mv(m, d, at, { v: 0.09 * v, cut: 1100, r: 0.05 });
		mv(m, d, at, { w: "sine", v: 0.1 * v, r: 0.05 });
	},
};
const MUS = { song: null, name: null, o: null, lvl: 1, want: 1, step: 0, next: 0, iv: 0, hit: false, land: false };
function musPlay(name, lvl = 1) {
	musStop();
	if (!SFX.ctx || !SONGS[name]) return;
	const S = SONGS[name];
	MUS.song = S;
	MUS.name = name;
	MUS.o = musOut(S.vol || 1);
	MUS.lvl = MUS.want = Math.max(1, Math.min(S.sec.length, lvl | 0));
	MUS.step = 0;
	MUS.land = true;
	MUS.fill = false;
	MUS.next = SFX.ctx.currentTime + 0.1;
	MUS.iv = setInterval(musTick, 25);
}
function musLevel(n) {
	if (MUS.song) MUS.want = Math.max(1, Math.min(MUS.song.sec.length, n | 0));
}
function musHit() {
	MUS.hit = true;
}
function musStop(fade = 0.25) {
	clearInterval(MUS.iv);
	MUS.iv = 0;
	MUS.song = MUS.name = null;
	if (MUS.o && SFX.ctx) musFade(MUS.o, fade);
	MUS.o = null;
}
/* duck the song under a jingle for dur seconds */
function musDuck(dur, to = 0.2) {
	const o = MUS.o;
	if (!o || !SFX.ctx) return;
	const t = SFX.ctx.currentTime,
		g = o.g.gain;
	g.cancelScheduledValues(t);
	g.setValueAtTime(g.value, t);
	g.setTargetAtTime(o.v * to, t, 0.04);
	g.setTargetAtTime(o.v, t + dur, 0.25);
}
/* the final chord: crash, boom and a ringing E chord, major (with a high lead) when win; the output stays until the next
   musStop / musPlay fades it */
function musEnd(win) {
	const c = SFX.ctx;
	clearInterval(MUS.iv);
	MUS.iv = 0;
	MUS.song = MUS.name = null;
	if (!c || !MUS.o || !SFX.on || c.state !== "running") return;
	MO = MUS.o;
	const at = 0.04,
		ch = [40, win ? 4 : 3];
	mdrum("crash", at, 1.3);
	mdrum("boom", at);
	mdrum("kick", at);
	musGtr(ch, 2.2, at, true, 0.25);
	musTri(ch, 12).forEach((m) => mv(m, 2.2, at, { n: 2, det: 18, v: 0.03, a: 0.05, r: 0.5, cut: 2200, rv: 1 }));
	mv(ch[0], 2, at, { w: "sine", v: 0.12, r: 0.4 });
	if (win) MV.anime(76, 2, at, 1.2);
}
/* jingles, written in C (transposed by key): bpm, len in beats, n = [beat, note or chord, length in beats, voice, vol],
   d = [beat, drum, vol, pitch] */
const JROLL = (a, b, step, v0, v1) => {
	const r = [];
	for (let x = a; x < b - 1e-6; x += step) r.push([x, "snare", v0 + ((v1 - v0) * (x - a)) / (b - a)]);
	return r;
};
const JINGLES = {
	/* board -> minigame (during the clouds): a snare roll up a C arpeggio into a big chord */
	mgstart: {
		bpm: 150,
		len: 4,
		n: [
			[0, 67, 0.4, "brass"],
			[0.5, 72, 0.4, "brass"],
			[1, 76, 0.4, "brass"],
			[1.5, [72, 76, 79, 84], 1.8, "brass", 1.2],
			[1.5, 84, 1.8, "anime", 0.8],
			[1.5, 36, 1.8, "bass"],
		],
		d: [...JROLL(0, 1.5, 0.25, 0.35, 0.9), [1.5, "crash", 1.2], [1.5, "kick", 1], [1.5, "boom", 0.6]],
	},
	/* minigame results: win (1st / winning team), mid (in between), lose (last / losing team) */
	win: {
		bpm: 140,
		len: 6,
		n: [
			[0, [72, 76], 0.28, "brass"],
			[0.33, [72, 76], 0.28, "brass"],
			[0.67, [72, 76], 0.28, "brass"],
			[1, [74, 77], 0.9, "brass"],
			[2, [76, 79], 0.45, "brass"],
			[2.5, [74, 77], 0.45, "brass"],
			[3, [76, 79, 84], 2.2, "brass", 1.2],
			[3, 84, 2.2, "anime", 0.8],
			[3, 84, 0.25, "bell"],
			[3.25, 88, 0.25, "bell"],
			[3.5, 91, 0.25, "bell"],
			[3.75, 96, 0.8, "bell"],
			[0, 48, 0.9, "bass"],
			[1, 41, 0.9, "bass"],
			[2, 43, 0.9, "bass"],
			[3, 36, 2.2, "bass"],
		],
		d: [
			[0, "kick", 1],
			[1, "kick", 1],
			[2, "kick", 1],
			[1, "snare", 0.8],
			[2.5, "snare", 0.6],
			...JROLL(2.5, 3, 0.125, 0.5, 0.9),
			[3, "crash", 1.2],
			[3, "kick", 1],
			[3, "boom", 0.5],
		],
	},
	mid: {
		bpm: 140,
		len: 3.5,
		n: [
			[0, [67, 72, 76], 0.4, "brass"],
			[0.5, [69, 74, 77], 0.4, "brass"],
			[1, [72, 76, 79], 1.4, "brass", 1.1],
			[1, 79, 1.4, "bell"],
			[0, 43, 0.45, "bass"],
			[0.5, 41, 0.45, "bass"],
			[1, 36, 1.4, "bass"],
		],
		d: [
			[0, "kick", 1],
			[0.5, "snare", 0.7],
			[1, "kick", 1],
			[1, "crash", 0.9],
		],
	},
	lose: {
		bpm: 104,
		len: 4.5,
		n: [
			[0, 67, 0.45, "horn", 1.1],
			[0.5, 66, 0.45, "horn", 1.1],
			[1, 65, 0.45, "horn", 1.1],
			[1.5, 64, 2, "horn", 1.2],
			[0, 43, 0.45, "bass"],
			[0.5, 42, 0.45, "bass"],
			[1, 41, 0.45, "bass"],
			[1.5, 40, 2, "bass"],
		],
		d: [
			[0, "tom", 0.6, 1.2],
			[0.5, "tom", 0.6, 1.1],
			[1, "tom", 0.6, 1],
			[1.5, "tom", 0.8, 0.8],
			[1.5, "kick", 0.8],
		],
	},
	/* dice roll: the song ducks while the die rattles (sfx "dice"), a chord stab when it lands (1.15 s) */
	dice: {
		bpm: 120,
		len: 3,
		n: [
			[2.3, [72, 79, 84], 0.6, "bell"],
			[2.3, 48, 0.5, "bass", 0.8],
		],
		d: [
			[2.3, "crash", 0.5],
			[2.3, "kick", 0.9],
		],
	},
	/* game over, on the podium: a triumphant phrase over C F G C with a full band */
	finale: {
		bpm: 132,
		len: 12,
		n: [
			[0, [64, 67, 72], 1.8, "brass"],
			[0, 72, 0.75, "anime"],
			[0.75, 74, 0.25, "anime"],
			[1, 76, 1, "anime"],
			[2, [64, 67, 72], 1.8, "brass"],
			[2, 79, 1.5, "anime"],
			[3.5, 77, 0.5, "anime"],
			[4, [65, 69, 72], 1.8, "brass"],
			[4, 81, 1.5, "anime"],
			[5.5, 79, 0.5, "anime"],
			[6, [67, 71, 74], 1.8, "brass"],
			[6, 77, 0.75, "anime"],
			[6.75, 76, 0.25, "anime"],
			[7, 74, 1, "anime"],
			[8, [72, 76, 79, 84], 3.5, "brass", 1.3],
			[8, 84, 3.5, "anime", 1.1],
			[8, 84, 0.25, "bell"],
			[8.25, 88, 0.25, "bell"],
			[8.5, 91, 0.25, "bell"],
			[8.75, 96, 1.5, "bell"],
			[0, 48, 1.9, "bass"],
			[2, 48, 1.9, "bass"],
			[4, 41, 1.9, "bass"],
			[6, 43, 1.9, "bass"],
			[8, 36, 3.5, "bass"],
		],
		d: [
			[0, "crash", 1.1],
			...[0, 1, 2, 3, 4, 5, 6].map((b) => [b, "kick", 1]),
			...[1, 3, 5].map((b) => [b, "snare", 0.9]),
			...JROLL(7, 8, 0.125, 0.5, 1),
			[8, "crash", 1.3],
			[8, "kick", 1],
			[8, "boom", 0.7],
		],
	},
};
function musJingle(name, key = 0) {
	const c = SFX.ctx,
		J = JINGLES[name];
	if (!c || !J || !SFX.on || c.state !== "running" || document.hidden) return;
	const b = 60 / J.bpm,
		o = musOut(0.9),
		at = 0.03;
	MO = o;
	J.n.forEach(([bt, m, l, vc, v]) => [].concat(m).forEach((n) => MV[vc](n + key, l * b, at + bt * b, v)));
	J.d.forEach(([bt, k, v, f]) => mdrum(k, at + bt * b, v, f));
	musDuck(J.len * b, 0.2);
	setTimeout(() => o.g.disconnect(), (J.len * b + 3) * 1000);
}
/* one 16th step: section sec at step count step (from the section start), at seconds from now */
function musStep(sec, step, at) {
	const st = step % 16,
		bar = (step >> 4) % sec.ch.length,
		ch = sec.ch[bar],
		dur = 60 / sec.bpm / 4,
		turn = bar === sec.ch.length - 1 && st >= 12,
		B = musBus();
	B.dl.delayTime.setValueAtTime(dur * 3, SFX.ctx.currentTime + at);
	if (MUS.land && st === 0) {
		MUS.land = false;
		mdrum("crash", at, 1.2);
		if (MUS.song.boom) mdrum("boom", at, 0.8);
	} else if (st === 0 && sec.crash.includes(bar)) mdrum("crash", at);
	if (MUS.hit && st % 4 === 0) {
		MUS.hit = false;
		mdrum("crash", at, 1.1);
		mdrum("boom", at);
		musGtr(ch, dur * 4, at, true, 0.3);
	}
	/* drums: the beat, a turnaround fill at the end of the loop, a bigger fill (snare roll into toms) before a new section */
	if (MUS.fill) {
		if (st < 12) mdrum("snare", at, 0.5 + (st - 8) * 0.15);
		else mdrum("tom", at, 1, 1.4 - (st - 12) * 0.2);
		if (st === 8 || st === 12) mdrum("kick", at);
	} else {
		const hat = sec.hat === undefined ? 2 : sec.hat;
		if (sec.kick.includes(st)) mdrum("kick", at);
		if (turn) mdrum("snare", at, 0.6 + (st - 12) * 0.12);
		else if (sec.snare.includes(st)) mdrum("snare", at);
		if (sec.ohat.includes(st)) mdrum("ohat", at);
		else if (hat && st % hat === 0) mdrum("hat", at, st % 4 ? 0.7 : 1);
		if (sec.tom) for (let i = 0; i < sec.tom.length; i += 2) if (sec.tom[i] === st) mdrum("tom", at, 1, sec.tom[i + 1]);
	}
	/* bass: 8ths on the root, octave jumps ("oct") or a pattern; a saw for phone speakers + a sine sub */
	let bn = null;
	if (Array.isArray(sec.bass)) {
		for (let i = 0; i < sec.bass.length; i += 2) if (sec.bass[i] === st) bn = ch[0] + sec.bass[i + 1];
	} else if (st % 2 === 0) bn = ch[0] + (sec.bass === "oct" && st % 4 === 2 ? 12 : 0);
	if (bn !== null) {
		mv(bn, dur * 1.7, at, { v: 0.085, cut: 1100, r: 0.03 });
		mv(bn, dur * 1.7, at, { w: "sine", v: 0.1, r: 0.03 });
	}
	/* guitar */
	if (sec.gtr === "hit" && (st === 0 || st === 6 || st === 12)) musGtr(ch, dur * (st === 12 ? 3.6 : 5.6), at, true);
	if (sec.gtr === "chug" && st % 2 === 0) musGtr(ch, dur * (st ? 0.7 : 1.6), at, !st, st ? 0.18 : 0.24);
	if (sec.gtr === "drive" && st % 2 === 0) musGtr(ch, dur * 1.8, at, true, st % 4 ? 0.17 : 0.22);
	/* keys: short chord stabs, electric piano or clav */
	if (sec.keys && sec.keys.includes(st))
		musTri(ch, 12).forEach((m) =>
			sec.kv === "clav"
				? mv(m, dur * 0.6, at, { w: "square", v: 0.014, cut: 1700, a: 0.002, r: 0.03 })
				: mv(m, dur * 1.4, at, {
						w: ["triangle", "sine"],
						n: 2,
						det: 6,
						v: 0.022,
						cut: 3000,
						a: 0.003,
						sus: 0.4,
						dec: 0.1,
						r: 0.08,
						rv: 1,
					}),
		);
	/* strings: a 16th ostinato through the chord */
	if (sec.str) {
		const tri = musTri(ch);
		mv(tri[sec.str[st % 8]], dur * 0.7, at, { n: 2, det: 12, v: sec.sv, cut: 2400, a: 0.004, r: 0.04, rv: 1 });
	}
	/* pad: the chord held for the bar */
	if (sec.pad && st === 0)
		musTri(ch, 12)
			.slice(0, ch[2] ? 4 : 3)
			.forEach((m) => mv(m, dur * 16, at, { n: 2, det: 18, v: 0.016, a: 0.25, r: 0.2, cut: 1600, rv: 1 }));
	/* lead */
	const ml = sec.mel && sec.mel[bar];
	if (ml) for (let i = 0; i < ml.length; i += 3) if (ml[i] === st) MV[sec.lv](ml[i + 1], dur * ml[i + 2] * 0.92, at);
}
function musTick() {
	const c = SFX.ctx,
		S = MUS.song;
	if (!c || !S || !MUS.o) return;
	/* catch up after a stall (or a background tab, which stays silent) without a burst of notes */
	if (MUS.next < c.currentTime - 0.2 || document.hidden) MUS.next = c.currentTime + 0.05;
	if (document.hidden) return;
	MO = MUS.o;
	while (MUS.next < c.currentTime + 0.12) {
		/* a new section starts on the downbeat after its fill (the second half of a bar) */
		if (MUS.step % 16 === 0 && MUS.fill) {
			MUS.lvl = MUS.want;
			MUS.step = 0;
			MUS.land = true;
		}
		MUS.fill = MUS.want !== MUS.lvl && MUS.step % 16 >= 8;
		const sec = S.sec[MUS.lvl - 1],
			dur = 60 / sec.bpm / 4,
			sw = sec.swing && MUS.step % 2 ? sec.swing * dur : 0;
		if (SFX.on && c.state === "running") musStep(sec, MUS.step, Math.max(0, MUS.next - c.currentTime) + sw);
		MUS.next += dur;
		MUS.step++;
	}
}
/* the music for what's on screen (called from render): the map's board theme on the board, level 2 in the last 3
   rounds (Volcano Quarry: 2 in the 2 rounds before an eruption, 3 while it erupts); the podium fanfare when the game is
   over; silence elsewhere. Minigames play their own (Monster Mash), TV controller phones stay quiet */
let musOverSeen = false;
function musScene(v) {
	if (!SFX.ctx) return;
	if (v === "over" && !musOverSeen) {
		musOverSeen = true;
		musStop(0.3);
		musJingle("finale");
	}
	if (v !== "over") musOverSeen = false;
	const board =
		v === "game" &&
		G &&
		!G.practice &&
		!(G.tv && role === "client") &&
		!W &&
		!mgOpen &&
		!mgBusy &&
		!["minigame", "mgres", "teams"].includes(G.phase);
	if (!board) {
		if (MUS.name && MUS.name !== "boss") musStop(0.6);
		return;
	}
	const name = SONGS[G.map] ? G.map : "classic";
	let lvl = G.round > G.rounds - 3 ? 2 : 1;
	if (name === "volcano") lvl = G.phase === "erupt" ? 3 : lavaPh(G.round) >= 5 ? 2 : 1;
	if (MUS.name !== name) musPlay(name, lvl);
	else musLevel(lvl);
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
