/* ---------- Flail Derby (free-for-all: wrecking balls on chains, on a scrapyard crusher deck) ----------
   Every truck drags an iron wrecking ball on a chain from its tow hitch. Driving swings it: circle and it whips round you.
   Holding REEL pulls the chain short (FD.LIN); letting go whips the ball out (FD.LOUT, a kick along its swing).
   A ball hit adds dent % to the truck it hits; the more dented a truck, the further hits throw it (platform-fighter style),
   up into the air once they are hard enough, so a battered truck flies over the guardrail.
   The deck is an octagon (apothem FD.A) with a low guardrail and gaps in it over the junk pit (sides in FD.GAP0; the other
   four sides lose their middle rail at FD.DBL, when KOs start counting double). A hydraulic crusher in the middle slams
   every FD.CP s (lamps flash first) and squashes whatever is under it. Fallen or squashed trucks come back: Magnet Mike's
   crane magnet lowers them onto the deck with their dent reset and a short shield.
   Scoring: a KO (the last ball to hit you within FD.CREDIT s gets it) is +FD.KO (double from FD.DBL), each fall costs 1.
   Crates, drums, tyres, fridges, washers and a portable toilet stand on the deck (more are dropped in by the crane during
   the game, from the seed); a ball or a fast truck breaks them, some leave a power-up (heavier ball, spikes, a longer chain,
   a wrench that knocks dent off).
   Sync: each device runs its own trucks and their balls (the host also the CPUs). Shared in e.f: bl = the ball [x, y, z,
   vx, vy, vz], ln = chain length, dn = dent %, sx = state (0 driving, 1 airborne, 2 falling, 3 squashed, 4 on the magnet),
   hx = this truck's ball hits [[victim key, t, nx, nz, impact speed, damage k, knock k]] (the victim's device applies them,
   fdHitsOn), ko = this truck's falls [[KO-er key or "", t, double, cause f | c]], rs = [t, x, z] the last respawn, cr = when
   it was squashed, sh = shield end, pw = [power, until]. Breakables and pick-ups go through W.claim (ids: slot + 1 and
   FD.PID + slot), shared by the engine. */
const FD = {
	A: 17.25 /* deck apothem (centre to the middle of a side) */,
	RAILH: 0.85,
	RAILIN: 0.25 /* the rail stands this far in from the edge */,
	GAPW: 7 /* width of a gap in the rail */,
	GAP0: [0, 2, 4, 6] /* sides open from the start (side k faces angle k * 45°) */,
	TR: 0.95 /* truck radius against rails and props */,
	BR: 0.6 /* ball radius */,
	ARM: 1.9 /* the stiff boom (the flail's handle): reaches this far back from the tail */,
	ARMY: 1.3 /* its tip's height */,
	SWEEP: 9 /* most the boom's sweep adds to the tip's speed (m/s) */,
	L0: 3.2 /* chain length (from the boom's tip) */,
	LIN: 1.4 /* reeled in */,
	LOUT: 5 /* just after a whip */,
	LCH: 1.6 /* the chain power-up adds this */,
	CONE: 1.2 /* the ball swings at most this far (rad) off the boom's line */,
	CONEV: 4 /* rad/s (round the tip) at most that it swings back in when it is out of that */,
	REELV: 7 /* m/s the chain reels in or pays out */,
	WHIP: 8 /* m/s kick along the swing when REEL is let go */,
	WCD: 0.9 /* whip cooldown */,
	BG: 24 /* ball gravity */,
	BFR: 1.4 /* ball ground friction a second */,
	BAIR: 0.35 /* ball air drag a second */,
	BMASS: 0.34 /* ball share of a pull on the chain (the truck feels the rest) */,
	LIFTV: 9 /* whirling at this speed on a tight chain, the ball's gravity halves (it rises toward level) */,
	TUGA: 40 /* the chain pulls the truck at most this hard (m/s²) */,
	BVMAX: 32,
	HITV: 5 /* slowest ball (relative to the truck) that counts as a hit */,
	HCD: 0.45 /* s between two hits of one ball on one truck */,
	DMG: 0.85 /* dent % per m/s of impact over 3 */,
	KB0: 3.5 /* knock: (KB0 + KBV * impact) * (1 + dent / KBD) */,
	KBV: 0.3,
	KBD: 45,
	AIRK: 14 /* knocks harder than this lift the truck */,
	CREDIT: 5 /* s a hit keeps the credit for a KO */,
	KO: 3,
	SHIELD: 2 /* s safe after landing back on the deck */,
	MAGT: 1.4 /* s the magnet takes to lower a truck */,
	RSF: 1.7 /* s from a fall to the magnet */,
	RSC: 1.1 /* s from a squash to the magnet */,
	PIT: -6 /* pit floor */,
	CRH: 2.1 /* crusher bed half size */,
	CPOST: 2.75 /* the gantry's top frame at ±CPOST */,
	GH: 5.1 /* its height */,
	C0: 13 /* first slam */,
	CP: 10 /* s between slams */,
	CUP: 3.3 /* head bottom when up */,
	NBR: 9 /* breakables at the start */,
	NDROP: 10 /* dropped in during the game */,
	DROP0: 9,
	DROPG: 6.5 /* s between drops */,
	DROPW: 1.3 /* s the shadow shows before a drop lands */,
	PU: 0.5 /* share of breakables with a power-up */,
	PUT: 12 /* s a power-up lasts */,
	PID: 100,
	DBL: 70 /* double KOs and the last rails go */,
	BRKV: 5 /* ball speed that breaks a prop */,
	BRKT: 12.5 /* truck speed that breaks a prop */,
	SMD: 90 /* dent % from which a hard hit is a SMASH: an impact freeze, then launched out of the arena */,
	SMK: 20 /* ... a knock this hard */,
	SMC: 80 /* dent % from which the crusher spits a truck out instead of squashing it */,
	FREEZE: 0.16 /* the impact frame */,
	SMV: 34 /* launch speed */,
};
const FD_PW = ["heavy", "spike", "chain", "wrench"];
const FD_UP = new THREE.Vector3(0, 1, 0);
/* breakable kinds: model, scale, radius, weight, debris colours */
const FD_BK = [
	{ m: () => byCrateModel(), sc: 0.66, r: 0.72, w: 0.22, cols: ["#B97A3E", "#8A5428", "#C68848"] },
	{ m: () => byDrumsModel(), sc: 0.68, r: 0.8, w: 0.18, cols: ["#D4692E", "#7A3A22", "#A4733F"] },
	{ m: () => byTyresModel(), sc: 0.85, r: 0.7, w: 0.14, cols: ["#2E323A", "#262A31", "#4A4E57"] },
	{ m: () => fdFridgeModel(), sc: 1, r: 0.56, w: 0.17, cols: ["#E8E1CF", "#C9C0AA", "#9AA1AB"] },
	{ m: () => fdWasherModel(), sc: 1, r: 0.56, w: 0.17, cols: ["#EEF1F4", "#C9CED8", "#4A6C8A"] },
	{ m: () => fdLooModel(), sc: 0.9, r: 0.62, w: 0.12, cols: ["#2F7DE1", "#F4F6F9", "#2A6FCC"] },
];
const FD_N = [...Array(8)].map((_, k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);
/* the side a point is nearest to leaving by: {k, d (distance along its normal), u (along the side)} */
function fdSide(x, z) {
	let k = 0,
		d = -1e9;
	for (let i = 0; i < 8; i++) {
		const v = x * FD_N[i][0] + z * FD_N[i][1];
		if (v > d) {
			d = v;
			k = i;
		}
	}
	return { k, d, u: -x * FD_N[k][1] + z * FD_N[k][0] };
}
const fdOnDeck = (x, z, m = 0) => fdSide(x, z).d < FD.A - m;
/* the crusher head's height (its bottom) at time t, and where in its cycle t is (s from the nearest slam) */
function fdSlam(t) {
	const n = Math.max(0, Math.round((t - FD.C0 + 2.2) / FD.CP - 0.3)),
		ts = FD.C0 + n * FD.CP;
	return t - ts < -2.2 && n > 0 ? t - (ts - FD.CP) : t - ts;
}
function fdHeadY(t) {
	const d = fdSlam(t),
		ease = (u) => u * u * (3 - 2 * u);
	if (d < -1.8 || d >= 2.6) return FD.CUP;
	if (d < -0.18) return FD.CUP - 1.1 * ease((d + 1.8) / 1.62) + Math.sin(d * 60) * 0.04;
	if (d < 0) return FD.CUP - 1.1 - (FD.CUP - 1.1 - 0.4) * Math.pow((d + 0.18) / 0.18, 2);
	if (d < 1) return 0.4;
	return 0.4 + (FD.CUP - 0.4) * ease((d - 1) / 1.6);
}

/* ---------- models ---------- */
/* an old fridge: freezer door over the main door, chunky handles, fridge magnets, feet, a vent grille at the back */
function fdFridgeModel() {
	const g = new THREE.Group(),
		C = "#E8E1CF",
		D = "#F1EBDB",
		H = "#9AA1AB",
		h = 1.66,
		y0 = 0.07;
	g.add(B(0.8, h, 0.72, C, 0, y0 + h / 2, 0));
	[-1, 1].forEach((sx) =>
		[-1, 1].forEach((sz) => g.add(Cy(0.05, 0.06, y0, 6, "#5A6272", sx * 0.3, y0 / 2, sz * 0.26))),
	);
	/* doors stand proud of the front, a gap between them */
	g.add(B(0.76, 0.46, 0.06, D, 0, y0 + h - 0.27, 0.38));
	g.add(B(0.76, 0.98, 0.06, D, 0, y0 + 0.65, 0.38));
	g.add(B(0.05, 0.28, 0.08, H, 0.29, y0 + h - 0.31, 0.44));
	g.add(B(0.05, 0.5, 0.08, H, 0.29, y0 + 0.85, 0.44));
	/* magnets */
	[
		["#E5484D", -0.2, 0.95],
		["#FFC83D", -0.06, 1.05],
		["#2F7DE1", -0.14, 0.78],
	].forEach(([c, x, y]) => g.add(B(0.1, 0.1, 0.04, c, x, y0 + y, 0.42)));
	/* kick plate and back grille */
	g.add(B(0.72, 0.08, 0.04, "#5A6272", 0, y0 + 0.07, 0.37));
	for (let k = 0; k < 4; k++) g.add(B(0.62, 0.04, 0.04, "#5A6272", 0, y0 + 0.2 + k * 0.12, -0.38));
	/* a top trim */
	g.add(B(0.84, 0.05, 0.76, "#D6CEB8", 0, y0 + h + 0.025, 0));
	return g;
}
/* a front-loading washing machine: porthole door, control strip with a knob, detergent drawer */
function fdWasherModel() {
	const g = new THREE.Group(),
		C = "#EEF1F4",
		h = 0.86,
		y0 = 0.05;
	g.add(B(0.76, h, 0.7, C, 0, y0 + h / 2, 0));
	g.add(B(0.8, 0.04, 0.74, "#DDE2E8", 0, y0 + h + 0.02, 0));
	[-1, 1].forEach((sx) =>
		[-1, 1].forEach((sz) => g.add(Cy(0.04, 0.05, y0, 6, "#5A6272", sx * 0.3, y0 / 2, sz * 0.26))),
	);
	g.add(B(0.76, 0.14, 0.04, "#C9CED8", 0, y0 + h - 0.08, 0.37));
	g.add(B(0.2, 0.08, 0.03, "#DDE2E8", -0.22, y0 + h - 0.08, 0.4));
	{
		const kn = Cy(0.05, 0.05, 0.05, 10, "#5A6272", 0.24, y0 + h - 0.08, 0.41);
		kn.rotation.x = Math.PI / 2;
		g.add(kn);
	}
	/* porthole: a chrome ring, dark glass, the drum behind it */
	const ring = mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 16), "#B8BEC8");
	ring.position.set(0, y0 + 0.4, 0.38);
	g.add(ring);
	const gl = Cy(0.2, 0.2, 0.04, 16, "#4A6C8A", 0, y0 + 0.4, 0.36, { metalness: 0.3, roughness: 0.25 });
	gl.rotation.x = Math.PI / 2;
	g.add(gl);
	g.add(B(0.06, 0.12, 0.05, "#9AA1AB", 0.25, y0 + 0.4, 0.39));
	g.add(B(0.7, 0.05, 0.04, "#5A6272", 0, y0 + 0.04, 0.36));
	return g;
}
/* a portable toilet: ribbed blue walls, white base and roof with a vent dome, a door with vent slots and a handle */
function fdLooModel() {
	const g = new THREE.Group(),
		BL = "#2F7DE1",
		WH = "#E6EAF0";
	g.add(B(1.08, 0.12, 1.08, WH, 0, 0.06, 0));
	g.add(B(0.98, 1.9, 0.98, BL, 0, 0.12 + 0.95, 0));
	g.add(B(1.08, 0.1, 1.08, WH, 0, 2.07, 0));
	g.add(Cy(0.34, 0.46, 0.16, 10, "#F4F6F9", 0, 2.2, 0));
	g.add(Cy(0.1, 0.1, 0.12, 8, "#9AA1AB", 0.22, 2.34, -0.2));
	/* ribs on the sides and back */
	[-0.24, 0.24].forEach((t) => {
		[-1, 1].forEach((sx) => g.add(B(0.06, 1.76, 0.06, "#2A6FCC", sx * 0.51, 1.07, t)));
		g.add(B(0.06, 1.76, 0.06, "#2A6FCC", t, 1.07, -0.51));
	});
	/* the door */
	g.add(B(0.76, 1.78, 0.05, "#2A6FCC", 0, 1.03, 0.51));
	[0, 1, 2].forEach((i) => g.add(B(0.46, 0.04, 0.03, "#1D4F99", 0, 1.68 + i * 0.09, 0.545)));
	g.add(B(0.07, 0.2, 0.08, "#F4F6F9", 0.28, 1.05, 0.56));
	g.add(B(0.14, 0.06, 0.03, "#E5484D", 0.28, 1.25, 0.545));
	return g;
}
/* the wrecking ball: faceted iron, a band in the player's colour, the lug the chain hangs from, spikes (power-up); all in
   `o`, which fdVis turns so the lug points up the chain */
function fdBallModel(col) {
	const g = new THREE.Group(),
		o = new THREE.Group(),
		r = FD.BR,
		ball = mesh(new THREE.IcosahedronGeometry(r, 1), "#454A54", { metalness: 0.35, roughness: 0.55 });
	g.add(o);
	o.add(ball);
	const band = new THREE.Mesh(
		new THREE.CylinderGeometry(r * 1.04, r * 1.04, r * 0.36, 16, 1, true),
		new THREE.MeshStandardMaterial({ color: col, flatShading: true, roughness: 0.6 }),
	);
	band.castShadow = true;
	o.add(band);
	const lug = mesh(new THREE.TorusGeometry(0.13, 0.05, 5, 10), "#5A6070", { metalness: 0.4 });
	lug.position.y = r + 0.08;
	o.add(lug);
	const spk = new THREE.Group(),
		ico = new THREE.IcosahedronGeometry(1, 0).attributes.position,
		seen = new Set();
	for (let i = 0; i < ico.count; i++) {
		const v = new THREE.Vector3().fromBufferAttribute(ico, i).normalize(),
			key = v
				.toArray()
				.map((a) => a.toFixed(2))
				.join();
		if (seen.has(key) || v.y > 0.8) continue;
		seen.add(key);
		const c = mesh(new THREE.ConeGeometry(0.13, 0.42, 6), "#C9CED8", { metalness: 0.5 });
		c.position.copy(v).multiplyScalar(r + 0.12);
		c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
		spk.add(c);
	}
	spk.visible = false;
	o.add(spk);
	return { g, o, spk };
}
/* the flail's handle: a stiff boom off the tow hitch, angled up and back (built facing -x from the truck's tail at x 0):
   a swivel block, a box beam with a stripe in the player's colour on top, a brace under it, a sheave at the tip where
   the chain comes off */
function fdArmModel(col) {
	const g = new THREE.Group(),
		y0 = 0.62,
		dy = FD.ARMY - y0,
		L = Math.hypot(FD.ARM, dy),
		th = Math.atan2(dy, FD.ARM),
		D = "#3A3F48";
	g.add(B(0.4, 0.34, 0.46, D, 0.05, 0.55, 0));
	g.add(Cy(0.16, 0.16, 0.5, 8, "#5A6070", -0.12, 0.62, 0).rotateX(Math.PI / 2));
	const bm = new THREE.Group();
	bm.position.set(-FD.ARM / 2 - 0.06, y0 + dy / 2, 0);
	bm.rotation.z = -th;
	bm.add(B(L, 0.18, 0.2, "#4A505A", 0, 0, 0));
	bm.add(B(L * 0.86, 0.05, 0.24, col, -0.02, 0.105, 0));
	[-0.3, 0, 0.3].forEach((t) => bm.add(B(0.06, 0.22, 0.28, D, t * L, 0, 0)));
	g.add(bm);
	strut(g, [-0.05, 0.4, 0], [-FD.ARM * 0.55, y0 + dy * 0.55 - 0.1, 0], 0.1, D, 1);
	/* the tip: cheek plates either side of a sheave */
	const tx = -FD.ARM - 0.08,
		ty = FD.ARMY;
	[-1, 1].forEach((sz) => g.add(B(0.34, 0.3, 0.04, "#4A505A", tx, ty, sz * 0.11)));
	g.add(Cy(0.13, 0.13, 0.14, 10, "#C9CED8", tx, ty, 0, { metalness: 0.5 }).rotateX(Math.PI / 2));
	g.add(Cy(0.05, 0.05, 0.3, 6, D, tx, ty, 0).rotateX(Math.PI / 2));
	return g;
}
/* the respawn magnet: a dark disc with a red band, a hook frame and a cable up out of the picture */
function fdMagnetModel() {
	const g = new THREE.Group();
	g.add(Cy(1.05, 1.1, 0.42, 16, "#3A3F48", 0, 0.21, 0));
	g.add(Cy(1.13, 1.13, 0.16, 16, "#E5484D", 0, 0.21, 0));
	g.add(Cy(0.85, 0.85, 0.05, 16, "#23272F", 0, -0.02, 0));
	g.add(B(0.18, 0.5, 0.9, "#FFC83D", 0, 0.66, 0));
	g.add(B(0.6, 0.14, 0.18, "#FFC83D", 0, 0.92, 0));
	g.add(Cy(0.05, 0.05, 30, 5, "#2A2F3A", 0, 15.9, 0));
	g.traverse((o) => {
		if (o.isMesh) o.castShadow = true;
	});
	return g;
}
/* the crusher's gantry: a square top frame over the middle, hung from four lattice trusses that run out to towers standing
   in the pit beyond the deck's corners (nothing stands on the deck, so balls swing freely under it) */
function fdGantry() {
	const g = new THREE.Group(),
		P = FD.CPOST,
		Y = "#E0A21C",
		Y2 = "#C98E18",
		D = "#4A505A",
		h = FD.GH,
		RC = FD.A / Math.cos(Math.PI / 8) + 1.3,
		top = h + 0.9;
	/* top frame and the ram's cylinder */
	[-1, 1].forEach((sz) => g.add(B(2 * P + 0.7, 0.6, 0.6, Y, 0, h + 0.3, sz * P)));
	[-1, 1].forEach((sx) => g.add(B(0.6, 0.6, 2 * P - 0.6, Y, sx * P, h + 0.3, 0)));
	g.add(B(2 * P - 0.6, 0.44, 1.2, Y2, 0, h + 0.4, 0));
	g.add(Cy(0.7, 0.7, 1.9, 12, D, 0, h + 1.5, 0));
	g.add(Cy(0.78, 0.78, 0.18, 12, "#3A3F48", 0, h + 0.71, 0));
	g.add(Cy(0.5, 0.5, 0.2, 12, "#3A3F48", 0, h + 2.5, 0));
	[-1, 1].forEach((sx) =>
		[-1, 1].forEach((sz) => {
			const a = sx < 0 ? Math.PI - (sz * Math.PI) / 8 : (sz * Math.PI) / 8,
				tx = Math.cos(a) * RC,
				tz = Math.sin(a) * RC,
				fx = sx * P,
				fz = sz * P,
				L = Math.hypot(tx - fx, tz - fz),
				ux = (tx - fx) / L,
				uz = (tz - fz) / L,
				px = -uz * 0.38,
				pz = ux * 0.38,
				n = Math.round(L / 1.5),
				at = (k, o, y) => [fx + ux * k + px * o, y, fz + uz * k + pz * o];
			/* a triangular truss: two bottom chords, one top chord, zig-zag braces and rungs */
			strut(g, at(0.2, -1, h + 0.05), at(L, -1, top - 0.6), 0.2, Y, 1);
			strut(g, at(0.2, 1, h + 0.05), at(L, 1, top - 0.6), 0.2, Y, 1);
			strut(g, at(0.2, 0, h + 0.75), at(L, 0, top + 0.1), 0.2, Y, 2);
			for (let i = 0; i <= n; i++) {
				const k = 0.2 + ((L - 0.2) * i) / n,
					y0 = h + 0.05 + ((top - 0.6 - h - 0.05) * i) / n,
					kn = 0.2 + ((L - 0.2) * Math.min(n, i + 1)) / n,
					y1 = h + 0.75 + ((top + 0.1 - h - 0.75) * Math.min(n, i + 1)) / n;
				strut(g, at(k, -1, y0), at(k, 1, y0), 0.1, Y2, 2);
				if (i < n) {
					strut(g, at(k, -1, y0), at(kn, 0, y1), 0.09, Y2, 1);
					strut(g, at(k, 1, y0), at(kn, 0, y1), 0.09, Y2, 2);
				}
			}
			/* the tower in the pit: four chords, rings, cross braces, a cap and a footing */
			const T = 0.65,
				bot = FD.PIT;
			g.add(B(2.2, 0.6, 2.2, "#A3A9B2", tx, bot + 0.3, tz));
			[-1, 1].forEach((cx) =>
				[-1, 1].forEach((cz) =>
					strut(g, [tx + cx * T, bot + 0.6, tz + cz * T], [tx + cx * T, top + 0.3, tz + cz * T], 0.22, Y, 1),
				),
			);
			for (let y = bot + 1.6, i = 0; y < top; y += 2, i++)
				[
					[-1, -1, 1, -1],
					[1, -1, 1, 1],
					[1, 1, -1, 1],
					[-1, 1, -1, -1],
				].forEach(([x0, z0, x1, z1], j) => {
					strut(g, [tx + x0 * T, y, tz + z0 * T], [tx + x1 * T, y, tz + z1 * T], 0.1, Y2, 2);
					if (y + 2 < top)
						strut(g, [tx + x0 * T, y, tz + z0 * T], [tx + x1 * T, y + 2, tz + z1 * T], 0.08, Y2, (i + j) % 2 ? 1 : 2);
				});
			g.add(B(1.8, 0.36, 1.8, D, tx, top + 0.48, tz));
		}),
	);
	return g;
}
/* the crusher: the striped bed, the gantry, a hydraulic ram and the head (moves: W.head / W.rod) */
function fdCrusher(W) {
	const s = W.sc,
		g = new THREE.Group();
	/* the bed: worn dark steel in a hazard frame, raised a touch over the deck */
	g.add(B(2 * FD.CRH, 0.08, 2 * FD.CRH, "#5A616C", 0, 0.04, 0));
	const haz = new THREE.MeshStandardMaterial({ map: byHazardTex(), roughness: 0.8 });
	[
		[0, FD.CRH + 0.2, 2 * FD.CRH + 0.8, 0.4],
		[0, -FD.CRH - 0.2, 2 * FD.CRH + 0.8, 0.4],
		[FD.CRH + 0.2, 0, 0.4, 2 * FD.CRH],
		[-FD.CRH - 0.2, 0, 0.4, 2 * FD.CRH],
	].forEach(([x, z, w, d]) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), haz);
		m.position.set(x, 0.03, z);
		m.receiveShadow = true;
		g.add(m);
	});
	for (let i = -2; i <= 2; i++) g.add(B(0.14, 0.03, 2 * FD.CRH - 0.3, "#4A505A", i * 0.8, 0.095, 0));
	g.add(fdGantry());
	s.add(g);
	/* the head: a heavy block with a hazard band, ribs underneath, warning lamps on the corners */
	const head = new THREE.Group();
	head.add(B(2 * FD.CRH + 0.2, 1, 2 * FD.CRH + 0.2, "#5A6272", 0, 0.5, 0));
	{
		const band = new THREE.Mesh(new THREE.BoxGeometry(2 * FD.CRH + 0.26, 0.3, 2 * FD.CRH + 0.26), haz);
		band.position.y = 0.62;
		band.castShadow = true;
		head.add(band);
	}
	head.add(B(2 * FD.CRH - 0.4, 0.3, 2 * FD.CRH - 0.4, "#4A505A", 0, 1.15, 0));
	[-1, 0, 1].forEach((i) => head.add(B(2 * FD.CRH - 0.2, 0.14, 0.34, "#3A3F48", 0, -0.07, i * 1.3)));
	W.lampM = new THREE.MeshStandardMaterial({ color: "#B23A2E", emissive: "#FF3020", emissiveIntensity: 0 });
	[-1, 1].forEach((sx) =>
		[-1, 1].forEach((sz) => {
			const l = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.26, 8), W.lampM);
			l.position.set(sx * (FD.CRH - 0.2), 1.43, sz * (FD.CRH - 0.2));
			head.add(l);
			head.add(Cy(0.24, 0.24, 0.05, 8, "#23272F", sx * (FD.CRH - 0.2), 1.31, sz * (FD.CRH - 0.2)));
		}),
	);
	head.traverse((o) => {
		if (o.isMesh) o.castShadow = o.receiveShadow = true;
	});
	head.position.y = FD.CUP;
	s.add(head);
	const rod = Cy(0.36, 0.36, 1, 10, "#C9CED8", 0, 0, 0, { metalness: 0.6, roughness: 0.3 });
	s.add(rod);
	W.head = head;
	W.rod = rod;
	W.rodTop = FD.GH;
}
/* the SMASH flash: a hot white core and spiky rays (white on black, drawn additively so no soft alpha edges speckle) */
function fdFlashTex() {
	return (
		BLD_TEX.fdFlash ||
		(BLD_TEX.fdFlash = canvasTex(256, 256, (x, w) => {
			const c = w / 2;
			x.fillStyle = "#000";
			x.fillRect(0, 0, w, w);
			x.fillStyle = "#FFF4C8";
			x.beginPath();
			for (let i = 0; i < 24; i++) {
				const a = (i / 24) * 6.283,
					r = i % 2 ? 34 : 118 - (i % 4) * 22;
				x[i ? "lineTo" : "moveTo"](c + Math.cos(a) * r, c + Math.sin(a) * r);
			}
			x.closePath();
			x.fill();
			const q = x.createRadialGradient(c, c, 0, c, c, 60);
			q.addColorStop(0, "#FFFFFF");
			q.addColorStop(1, "rgba(255,255,255,0)");
			x.fillStyle = q;
			x.fillRect(0, 0, w, w);
		}))
	);
}
/* red and white chevrons pointing over the edge (up the texture = out of the deck) */
function fdChevTex() {
	return (
		BLD_TEX.fdChev ||
		(BLD_TEX.fdChev = canvasTex(512, 40, (x, w, h) => {
			x.fillStyle = "#D93A30";
			x.fillRect(0, 0, w, h);
			x.fillStyle = "#F4F6F9";
			for (let i = 0; i < 12; i++) {
				const cx = 22 + i * 42.5;
				x.beginPath();
				x.moveTo(cx - 15, h - 6);
				x.lineTo(cx, 8);
				x.lineTo(cx + 15, h - 6);
				x.lineTo(cx + 7, h - 6);
				x.lineTo(cx, 20);
				x.lineTo(cx - 7, h - 6);
				x.closePath();
				x.fill();
			}
		}))
	);
}
/* power-up badge icons on a gold coin */
function fdIconTex(kind) {
	const k = "fdIc" + kind;
	return (
		BLD_TEX[k] ||
		(BLD_TEX[k] = canvasTex(128, 128, (x, w) => {
			const c = w / 2,
				ball = (bx, by, r) => {
					x.fillStyle = "#3A3F48";
					x.beginPath();
					x.arc(bx, by, r, 0, 6.283);
					x.fill();
					x.fillStyle = "#6B717C";
					x.beginPath();
					x.arc(bx - r * 0.35, by - r * 0.35, r * 0.28, 0, 6.283);
					x.fill();
				};
			x.fillStyle = "#FFC83D";
			x.fillRect(0, 0, w, w);
			x.fillStyle = "#FFE27A";
			x.beginPath();
			x.arc(c, c, 52, 0, 6.283);
			x.fill();
			x.lineWidth = 6;
			x.strokeStyle = "#E0A21C";
			x.stroke();
			x.lineCap = x.lineJoin = "round";
			if (kind === "heavy") {
				ball(c - 6, c + 6, 32);
				x.fillStyle = "#E5484D";
				x.fillRect(c + 22, c - 40, 10, 34);
				x.fillRect(c + 10, c - 28, 34, 10);
			} else if (kind === "spike") {
				x.fillStyle = "#9AA1AB";
				for (let i = 0; i < 8; i++) {
					const a = (i / 8) * 6.283;
					x.beginPath();
					x.moveTo(c + Math.cos(a - 0.28) * 24, c + Math.sin(a - 0.28) * 24);
					x.lineTo(c + Math.cos(a) * 46, c + Math.sin(a) * 46);
					x.lineTo(c + Math.cos(a + 0.28) * 24, c + Math.sin(a + 0.28) * 24);
					x.fill();
				}
				ball(c, c, 27);
			} else if (kind === "chain") {
				x.strokeStyle = "#4A505A";
				x.lineWidth = 9;
				[-1, 0, 1].forEach((i) => {
					x.save();
					x.translate(c + i * 24, c - i * 24);
					x.rotate(-0.785 + (i % 2 ? 1.57 : 0));
					x.beginPath();
					x.ellipse(0, 0, 20, 11, 0, 0, 6.283);
					x.stroke();
					x.restore();
				});
			} else {
				x.save();
				x.translate(c, c);
				x.rotate(-0.785);
				x.fillStyle = "#4A505A";
				rr(x, -9, -6, 18, 52, 8);
				x.fill();
				x.beginPath();
				x.arc(0, -22, 24, 0, 6.283);
				x.fill();
				x.fillStyle = "#FFE27A";
				x.fillRect(-9, -50, 18, 30);
				x.restore();
			}
		}))
	);
}

Object.assign(MG, {
	flail: {
		name: "Flail Derby",
		kind: "arena",
		ctrl: "stick",
		hi: true,
		unit: "pts",
		dur: 90,
		bound: { t: "none" },
		water: false,
		bare: true,
		fallY: -5.2,
		sun: [-15, 24, 9],
		lt: { amb: 0.42, sun: 0.86, warm: 0.78, haze: 70 },
		fx: { aa: 1 },
		ramLabel: "REEL",
		controls: [
			["stick", "Drive", "Spin round to swing your ball"],
			["REEL", "Hold: reel the chain in", "Let go to whip the ball out"],
		],
		how: "Swing your wrecking ball into rivals: the more dented they are, the further they fly. Knock them into the pit or under the crusher!",
		initEnt(W, e) {
			e.st = 0;
			e.dent = 0;
			e.f.sx = 0;
			e.f.dn = 0;
			e.f.hx = [];
			e.f.ko = [];
			e.hcd = {};
			e.hSeen = {};
			e.L = FD.L0;
			e.reelT = -1;
			e.whipT = -9;
			/* the tow hitch: just behind the truck's tail (the truck faces +x before the engine turns it) */
			e.g.updateMatrixWorld(true);
			const bb = new THREE.Box3().setFromObject(e.tr);
			e.rearX = Math.max(0.9, -bb.min.x);
			{
				/* the boom bolted to the tail (in the truck's own, scaled units) */
				const k = 1 / e.tr.scale.x,
					arm = fdArmModel(pcol(e.p));
				arm.scale.setScalar(k);
				arm.position.set((-e.rearX + 0.05) * k, 0, 0);
				e.tr.add(arm);
			}
			const fw = [Math.cos(e.yaw), -Math.sin(e.yaw)];
			e.ball = {
				x: e.x - fw[0] * (e.rearX + FD.ARM + FD.L0 * 0.8),
				y: FD.BR,
				z: e.z - fw[1] * (e.rearX + FD.ARM + FD.L0 * 0.8),
				vx: 0,
				vy: 0,
				vz: 0,
			};
			const col = pcol(e.p),
				bm = fdBallModel(col);
			e.bv = bm;
			W.sc.add(bm.g);
			/* the chain: links as one InstancedMesh, laid along a few verlet nodes between the hitch and the ball */
			const NL = 14;
			e.chain = new THREE.InstancedMesh(
				new THREE.TorusGeometry(0.12, 0.042, 4, 8).scale(1.5, 1, 1),
				new THREE.MeshStandardMaterial({ color: "#5E6472", metalness: 0.5, roughness: 0.45, flatShading: true }),
				NL,
			);
			e.chain.castShadow = true;
			e.chain.frustumCulled = false;
			W.sc.add(e.chain);
			e.cn = [...Array(NL + 1)].map(() => ({ x: e.ball.x, y: 0.6, z: e.ball.z, px: e.ball.x, py: 0.6, pz: e.ball.z }));
			/* dent % over the truck */
			const cv = document.createElement("canvas");
			cv.width = 256;
			cv.height = 112;
			const tex = new THREE.CanvasTexture(cv),
				sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
			sp.scale.set(1.9, 0.83, 1);
			sp.position.y = 3.25;
			sp.renderOrder = 11;
			e.g.add(sp);
			e.dl = { cv, tex, sp, v: -1, pop: 0 };
			e.mag = fdMagnetModel();
			e.mag.visible = false;
			W.sc.add(e.mag);
		},
		kits() {
			return [
				...FD_BK.map((b) => bakeKit(b.m())),
				...[
					["sedan", "#B5452F"],
					["hatch", "#5E7FA8"],
					["van", "#6E8B4A"],
					["pickup", "#C08A2E"],
					["sedan", "#7C6A9C"],
					["hatch", "#A3A9B2"],
				].map(([t, c]) => bakeKit(crushedCarModel(t, c))),
			];
		},
		spawn(W, i, n) {
			const a = (i / Math.max(n, 2)) * Math.PI * 2 + Math.PI / 2 + 0.39,
				r = 10.6,
				x = Math.cos(a) * r,
				z = Math.sin(a) * r;
			/* facing along the ring, so the ball trails on the deck */
			return { x, z, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
		},
		build(W) {
			const s = W.sc,
				rng = mulberry((W.mg.seed || 1) + 5150);
			W.gap = [...Array(8)].map((_, k) => FD.GAP0.includes(k));
			W.flyRail = [];
			W.koSeen = new Set();
			this.fdDeck(W, rng);
			this.fdRails(W);
			fdCrusher(W);
			this.fdPit(W, rng);
			this.fdBreakables(W, rng);
			W.picks = {};
			W.lastSlam = -99;
			W.dropSh = [];
		},
		/* the deck: tread-plate trapezoids in three rings (the core under the crusher, the middle, the outer one), a hazard
		   strip round the edge, rivets, a rust-orange skirt under the edge */
		fdDeck(W, rng) {
			const s = W.sc,
				A = FD.A,
				c8 = Math.cos(Math.PI / 8),
				corner = (ap, a) => [(Math.cos(a) * ap) / c8, (Math.sin(a) * ap) / c8],
				mats = ["#E9ECF0", "#DCE0E6", "#F1EEE8"].map(
					(c) =>
						new THREE.MeshStandardMaterial({
							color: c,
							map: texRep(treadTex(), 0.2, 0.2),
							roughness: 0.7,
							metalness: 0.15,
						}),
				),
				hz = new THREE.MeshStandardMaterial({ map: byHazardTex(), roughness: 0.8 }),
				rings = [
					[0, 5.2],
					[5.2, 11.4],
					[11.4, A - 0.55],
					[A - 0.55, A],
				];
			/* a dark base under it all shows through the seams */
			{
				const base = new THREE.Mesh(new THREE.CylinderGeometry(A / c8, A / c8, 0.3, 8), M("#2A2D34"));
				base.rotation.y = Math.PI / 8;
				base.position.y = -0.27;
				s.add(base);
			}
			rings.forEach(([a0, a1], ri) => {
				for (let k = 0; k < 8; k++) {
					const ak = (k * Math.PI) / 4,
						p = [
							corner(a0, ak - Math.PI / 8),
							corner(a1, ak - Math.PI / 8),
							corner(a1, ak + Math.PI / 8),
							corner(a0, ak + Math.PI / 8),
						],
						cx = p.reduce((q, v) => q + v[0], 0) / 4,
						cz = p.reduce((q, v) => q + v[1], 0) / 4,
						gap = ri === 3 ? 0.03 : 0.06,
						sh = new THREE.Shape();
					/* pulled in a little toward its middle: the seam */
					p.forEach(([x, z], i) => {
						const dx = cx - x,
							dz = cz - z,
							l = Math.hypot(dx, dz) || 1,
							px = x + (dx / l) * gap,
							pz = z + (dz / l) * gap;
						if (i) sh.lineTo(px, -pz);
						else sh.moveTo(px, -pz);
					});
					const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false });
					geo.rotateX(-Math.PI / 2);
					geo.translate(0, -0.14, 0);
					const m = new THREE.Mesh(geo, ri === 3 ? hz : mats[Math.floor(rng() * 3)]);
					m.receiveShadow = true;
					s.add(m);
					/* rivets near the plate's corners */
					if (ri < 3)
						p.forEach(([x, z]) => {
							const dx = cx - x,
								dz = cz - z,
								l = Math.hypot(dx, dz) || 1;
							s.add(Cy(0.07, 0.08, 0.05, 6, "#8E949C", x + (dx / l) * 0.35, 0.02, z + (dz / l) * 0.35));
						});
				}
			});
			/* hazard strip texture runs along the edge: a few patches of wear on the plates */
			for (let i = 0; i < 7; i++) {
				const a = rng() * 6.283,
					r = 3 + rng() * 10;
				decal(
					s,
					new THREE.CircleGeometry(0.8 + rng() * 1.4, 10),
					"#2A2520",
					Math.cos(a) * r,
					0.006 + i * 0.0008,
					Math.sin(a) * r,
					0.14,
				);
			}
			/* the skirt: a rust-orange steel band under the edge */
			for (let k = 0; k < 8; k++) {
				const ak = (k * Math.PI) / 4,
					L = 2 * (A + 0.12) * Math.tan(Math.PI / 8),
					m = B(L, 0.7, 0.24, "#A4562E", Math.cos(ak) * (A + 0.12), -0.37, Math.sin(ak) * (A + 0.12));
				m.rotation.y = -ak + Math.PI / 2;
				s.add(m);
			}
		},
		/* the guardrail: yellow rails on dark posts, side by side; the middle section of a closed side (W.mid[k]) can break off */
		fdRails(W) {
			const s = W.sc,
				ap = FD.A - FD.RAILIN,
				Ls = 2 * ap * Math.tan(Math.PI / 8),
				G = FD.GAPW;
			W.mid = [];
			for (let k = 0; k < 8; k++) {
				const [nx, nz] = FD_N[k],
					tx = -nz,
					tz = nx,
					at = (u, y) => [nx * ap + tx * u, y, nz * ap + tz * u],
					seg = (u0, u1, endPost) => {
						const g = new THREE.Group(),
							L = u1 - u0,
							n = Math.max(1, Math.ceil(L / 2.4)),
							ry = Math.atan2(-tz, tx);
						for (let i = 0; i <= n; i++) {
							if (i === n && !endPost) continue;
							const [x, , z] = at(u0 + (L * i) / n, 0),
								edge = (i === 0 && Math.abs(u0) < Ls / 2 - 0.1) || (i === n && Math.abs(u1) < Ls / 2 - 0.1);
							g.add(B(0.16, FD.RAILH + 0.05, 0.16, edge ? "#E5484D" : "#4A505A", x, (FD.RAILH + 0.05) / 2, z));
							if (edge) g.add(B(0.2, 0.12, 0.2, "#F4F6F9", x, FD.RAILH * 0.6, z));
							/* an open gap: the torn-off rail ends hang bent into it */
							if (edge && W.gap[k]) {
								const dir = i === 0 ? -1 : 1,
									u = u0 + (L * i) / n;
								[0.42, FD.RAILH - 0.05].forEach((y, j) =>
									strut(
										g,
										at(u + dir * 0.1, y).map((v, q) => (q === 0 ? v + nx * 0.1 : q === 2 ? v + nz * 0.1 : v)),
										at(u + dir * (0.75 - j * 0.15), y - 0.3 - j * 0.2).map((v, q) =>
											q === 0 ? v + nx * (0.25 + j * 0.2) : q === 2 ? v + nz * (0.25 + j * 0.2) : v,
										),
										0.1,
										"#F2C230",
										j + 1,
									),
								);
							}
						}
						[0.42, FD.RAILH - 0.05].forEach((y) => {
							const [x, , z] = at((u0 + u1) / 2, y),
								r = B(L, 0.12, 0.08, "#F2C230", x + nx * 0.1, y, z + nz * 0.1);
							r.rotation.y = ry;
							g.add(r);
						});
						return g;
					};
				s.add(seg(-Ls / 2, -G / 2, true));
				s.add(seg(G / 2, Ls / 2, false));
				{
					/* chevrons on the edge plates where the rail is open (odd sides' show when their rail breaks) */
					const cg = new THREE.Group(),
						pl = new THREE.Mesh(
							new THREE.PlaneGeometry(G - 0.4, 0.44),
							new THREE.MeshStandardMaterial({
								map: fdChevTex(),
								roughness: 0.7,
								polygonOffset: true,
								polygonOffsetFactor: -2,
								polygonOffsetUnits: -4,
							}),
						);
					pl.rotation.x = -Math.PI / 2;
					pl.receiveShadow = true;
					cg.add(pl);
					cg.position.set(nx * (FD.A - 0.28), 0.004, nz * (FD.A - 0.28));
					cg.rotation.y = Math.atan2(-nx, -nz);
					cg.visible = !!W.gap[k];
					cg.userData.chev = k;
					s.add(cg);
					(W.chev = W.chev || [])[k] = cg;
				}
				if (!W.gap[k]) {
					const m = seg(-G / 2 + 0.25, G / 2 - 0.25, true);
					m.userData.mid = k;
					s.add(m);
					W.mid[k] = m;
				}
			}
		},
		/* the pit round the deck: crushed cars stacked under the edge, a junk floor, junk heaps, a crane, containers with
		   a crowd on top, floodlights and the sign */
		fdPit(W, rng) {
			const s = W.sc,
				A = FD.A,
				P = FD.PIT,
				cars = this.kits().slice(FD_BK.length),
				carL = [],
				c8 = Math.cos(Math.PI / 8);
			/* stacks under the edge: a layer every 0.55 m, each car along the side */
			for (let k = 0; k < 8; k++) {
				const ak = (k * Math.PI) / 4,
					[nx, nz] = FD_N[k],
					L = 2 * (A - 1.6) * Math.tan(Math.PI / 8),
					n = Math.floor(L / 3);
				for (let layer = 0; layer < 11; layer++)
					for (let i = 0; i < n; i++) {
						const u = (i - (n - 1) / 2) * 3 + (layer % 2 ? 0.6 : -0.6),
							ap = A - 1.4 - (rng() * 0.25 + (layer % 3) * 0.08);
						carL.push({
							k: Math.floor(rng() * cars.length),
							x: nx * ap - nz * u,
							y: -0.68 - layer * 0.52,
							z: nz * ap + nx * u,
							ry: -ak + Math.PI / 2 + (rng() - 0.5) * 0.12,
						});
					}
			}
			/* junk on the pit floor */
			for (let i = 0; i < 70; i++) {
				const a = rng() * 6.283,
					r = A / c8 + 1 + rng() * 14;
				carL.push({
					k: Math.floor(rng() * cars.length),
					x: Math.cos(a) * r,
					y: P + (rng() < 0.3 ? 0.5 : 0),
					z: Math.sin(a) * r,
					ry: rng() * 6.3,
				});
			}
			placeKits(s, cars, carL, 0);
			const fl = new THREE.Mesh(
				new THREE.CircleGeometry(80, 40),
				groundMat(dirtTex(), 160, 160, 8, { color: "#8A7462" }),
			);
			fl.rotation.x = -Math.PI / 2;
			fl.position.y = P;
			fl.receiveShadow = true;
			s.add(fl);
			/* junk heaps: lumpy faceted mounds in rust and grime */
			const cols = ["#8C5A3C", "#7A6A5A", "#6E5444", "#9A6A44"];
			for (let i = 0; i < 16; i++) {
				const a = (i / 16) * 6.283 + rng() * 0.3,
					r = 34 + rng() * 10,
					sz = 7 + rng() * 6,
					geo = new THREE.IcosahedronGeometry(sz, 1),
					p = geo.attributes.position;
				for (let j = 0; j < p.count; j++) {
					const y = p.getY(j),
						q = 0.8 + Math.sin(p.getX(j) * 1.3 + i) * 0.12 + Math.cos(p.getZ(j) * 1.1 + i) * 0.12;
					p.setXYZ(j, p.getX(j) * q * 1.4, Math.max(-sz * 0.2, y) * 0.55 * q, p.getZ(j) * q * 1.4);
				}
				geo.computeVertexNormals();
				const m = mesh(geo, cols[i % 4]);
				m.position.set(Math.cos(a) * r, P, Math.sin(a) * r);
				m.rotation.y = rng() * 6;
				s.add(m);
			}
			/* tower crane behind on the left */
			placeKits(s, [bakeKit(towerCraneModel(30, 24))], [{ k: 0, x: -30, y: P, z: -22, ry: -0.5 }], 0.3);
			/* floodlights on the pit floor behind */
			placeKits(
				s,
				[bakeKit(lightTowerModel())],
				[
					{ k: 0, x: 25, y: P, z: -20, ry: -0.7 },
					{ k: 0, x: -24, y: P, z: 18, ry: 2.4 },
				],
				0.3,
			);
			/* containers along the back, three high, the crowd on top */
			const ck = containerKits(["#2E6FB5", "#C2452D", "#3E8A5A", "#D08A2A", "#6B7480"], 0),
				cl = [],
				ppl = [];
			for (let i = 0; i < 6; i++)
				for (let h = 0; h < 3; h++)
					cl.push({ k: (i * 2 + h) % ck.length, x: -16 + i * 6.3, y: P + h * 2.5, z: -27.5, ry: Math.PI / 2 });
			placeKits(s, ck, cl, 0);
			for (let i = 0; i < 34; i++)
				ppl.push({
					x: -18.5 + i * 1.08 + (rng() - 0.5) * 0.3,
					y: P + 7.5,
					z: -27.5 + (i % 2 ? 0.6 : -0.4),
					face: 0,
					ph: rng() * 6.3,
					sp: 7 + rng() * 5,
				});
			crowdMeshes(W, ppl);
			{
				const sg = signBoard("FLAIL DERBY", { style: "race", w: 10, h: 2, col: "#FF6A3D" });
				sg.position.set(0, P + 12.6, -28.6);
				s.add(sg, B(0.4, 5, 0.4, "#5A6272", -4.4, P + 9.8, -28.8), B(0.4, 5, 0.4, "#5A6272", 4.4, P + 9.8, -28.8));
			}
		},
		/* breakables: FD.NBR on the deck from the start, FD.NDROP more dropped in during the game; spots and kinds from the
		   seed, kept off the crusher, the spawns and each other */
		fdBreakables(W, rng) {
			const s = W.sc,
				L = [],
				wsum = FD_BK.reduce((a, b) => a + b.w, 0),
				kindOf = () => {
					let v = rng() * wsum;
					for (let i = 0; i < FD_BK.length; i++) if ((v -= FD_BK[i].w) < 0) return i;
					return 0;
				},
				sp = W.plist.map((_, i) => this.spawn(W, i, W.plist.length)),
				N = FD.NBR + FD.NDROP;
			for (let i = 0; i < N; i++) {
				let x = 0,
					z = 0;
				for (let tr = 0; tr < 30; tr++) {
					const a = rng() * 6.283,
						r = 4.8 + rng() * 9.8;
					x = Math.cos(a) * r;
					z = Math.sin(a) * r;
					const near =
						L.slice(-8).some((b) => Math.hypot(b.x - x, b.z - z) < 3) ||
						(i < FD.NBR && sp.some((q) => Math.hypot(q.x - x, q.z - z) < 3.4));
					if (!near) break;
				}
				const k = kindOf(),
					pu = rng() < FD.PU ? FD_PW[Math.floor(rng() * FD_PW.length)] : null;
				L.push({
					i,
					k,
					x,
					z,
					ry: rng() * 6.283,
					r: FD_BK[k].r,
					at: i < FD.NBR ? -9 : FD.DROP0 + (i - FD.NBR) * FD.DROPG,
					pu,
					gone: false,
				});
			}
			W.br = L;
			W.bkI = FD_BK.map((b, k) => {
				const mine = L.filter((q) => q.k === k);
				mine.forEach((q, j) => (q.ii = j));
				return mine.length
					? byInst(
							s,
							bakeKit(b.m()),
							mine.map((q) => ({ x: q.x, y: q.at > 0 ? -50 : 0, z: q.z, ry: q.ry, sc: q.at > 0 ? 0.0001 : b.sc })),
							0.3,
						)
					: null;
			});
		},
		/* ---------- rules ---------- */
		phys(W, e, inp, dt) {
			const t = W.t;
			this.fdHitsOn(W, e);
			if (e.pw && t > e.pw[1]) {
				e.pw = null;
				e.f.pw = 0;
			}
			const pw = e.pw && e.pw[0];
			/* how fast the driver turns the stick (rad/s, easing off over a moment): only that may add the boom's sweep to
			   the ball (fdTipV), so a truck the ball drags round can't feed the ball (it spun forever) */
			{
				const on = !!(inp && !e.d && Math.hypot(inp.x || 0, inp.y || 0) > 0.3),
					a = on ? Math.atan2(inp.y, inp.x) : null;
				let r = 0;
				if (on && e.stA !== null && e.stA !== undefined)
					r = Math.abs(Math.atan2(Math.sin(a - e.stA), Math.cos(a - e.stA))) / Math.max(dt, 0.001);
				e.stA = a;
				e.stR = Math.max(Math.min(r, 20), (e.stR || 0) * Math.exp(-5 * dt));
			}
			e.spd = pw === "heavy" ? 0.9 : 1;
			if (e.st) e.dv = null;
			if (e.st === 0) {
				const ip =
					inp && !e.d
						? { x: inp.x * (e.bot ? e.botK || 1 : 1), y: inp.y * (e.bot ? e.botK || 1 : 1), boost: false }
						: null;
				if (inp) inp.boost = false;
				/* the truck faces the way the driver drives (e.dv: the stick's own push, eased like arenaPhys does the
				   speed), never the way the chain or a hit shoves it, so a yank slides it instead of swinging it round */
				const yaw0 = e.yaw;
				arenaPhys(W, e, ip, dt);
				{
					const dv = e.dv || (e.dv = [0, 0]),
						k = Math.exp(-2.6 * dt);
					if (ip) {
						dv[0] += ip.x * 32 * e.spd * dt;
						dv[1] += ip.y * 32 * e.spd * dt;
					}
					dv[0] *= k;
					dv[1] *= k;
					const l = Math.hypot(dv[0], dv[1]),
						mx = 11.5 * e.spd;
					if (l > mx) {
						dv[0] *= mx / l;
						dv[1] *= mx / l;
					}
					e.yaw = l > 0.6 ? lerpA(yaw0, Math.atan2(-dv[1], dv[0]), Math.min(1, dt * 10)) : yaw0;
				}
				this.fdTruckWorld(W, e, dt);
			} else if (e.st === 1) {
				e.vy -= 28 * dt;
				e.x += e.vx * dt;
				e.z += e.vz * dt;
				e.y += e.vy * dt;
				e.spin = (e.spin || 0) + dt * (e.spinV || 0);
				const S = fdSide(e.x, e.z);
				/* low enough, the rail still stops it */
				if (S.d > FD.A - FD.RAILIN - FD.TR && S.d < FD.A && e.y < FD.RAILH - 0.25 && !this.fdGapAt(W, S))
					this.fdBounce(e, S);
				if (e.y <= 0 && e.vy < 0) {
					if (S.d < FD.A) {
						e.y = 0;
						e.vy = 0;
						e.st = 0;
						e.spin = 0;
						e.slideT = 0.6;
						burst(W.sc, e.x, 0.2, e.z, {
							n: 6,
							shape: "ico",
							cols: ["#9AA1AB", "#C9CED8"],
							spd: 2.5,
							up: 2,
							grav: 10,
							life: 0.5,
						});
						if (W.tv || e.isMe) sfx("land");
					} else this.fdFall(W, e);
				}
			} else if (e.st === 2) {
				e.vy -= 28 * dt;
				e.x += e.vx * dt;
				e.z += e.vz * dt;
				e.y = Math.max(-20, e.y + e.vy * dt);
				e.spin = (e.spin || 0) + dt * 5;
				if (e.y < FD.PIT + 0.6 && !e.thud) {
					e.thud = true;
					burst(W.sc, e.x, FD.PIT + 0.4, e.z, {
						n: 14,
						shape: "ico",
						cols: ["#8A7462", "#6E5444", "#A89480"],
						spd: 3.5,
						up: 5,
						grav: 12,
						life: 0.9,
						size: 1.2,
					});
					if (W.tv || e.isMe) sfx("crush");
				}
				if (e.y < FD.PIT - 1) e.vx = e.vz = 0;
				if (t - e.outT > FD.RSF) this.fdRespawn(W, e);
			} else if (e.st === 5) {
				/* SMASHED: held still for the impact frame, then off like a rocket */
				if (t - e.outT < FD.FREEZE) {
					e.vx = e.vz = e.vy = 0;
				} else {
					if (!e.smGo) {
						e.smGo = true;
						e.vx = e.smDir[0] * FD.SMV;
						e.vz = e.smDir[1] * FD.SMV;
						e.vy = 15;
						e.spinV = 16;
					}
					e.vy -= 28 * dt;
					e.x += e.vx * dt;
					e.z += e.vz * dt;
					e.y = Math.max(-20, e.y + e.vy * dt);
					e.spin = (e.spin || 0) + dt * e.spinV;
					if (e.y < FD.PIT + 0.6 && !e.thud) {
						e.thud = true;
						e.vx = e.vz = 0;
						burst(W.sc, e.x, FD.PIT + 0.4, e.z, {
							n: 18,
							shape: "ico",
							cols: ["#8A7462", "#6E5444", "#FFE27A"],
							spd: 5,
							up: 7,
							grav: 12,
							life: 1,
							size: 1.4,
						});
					}
				}
				if (t - e.outT > FD.RSF + 0.9) this.fdRespawn(W, e);
			} else if (e.st === 3) {
				if (t - e.outT > FD.RSC) this.fdRespawn(W, e);
			} else if (e.st === 4) {
				const u = (t - e.f.rs[0]) / FD.MAGT;
				e.x = e.f.rs[1];
				e.z = e.f.rs[2];
				e.vx = e.vz = 0;
				if (u < 1) e.y = 1.3 + (1 - u * u * (3 - 2 * u)) * 10;
				else {
					e.st = 1;
					e.vy = 0;
					e.spinV = 0;
					e.f.sh = Math.round((t + FD.SHIELD) * 100) / 100;
				}
			}
			e.fly = e.st !== 0;
			e.falling = false;
			this.fdReel(W, e, inp, dt);
			this.fdBall(W, e, dt);
			this.fdPickups(W, e);
			const r2 = (v) => Math.round(v * 100) / 100,
				b = e.ball;
			e.f.bl = [r2(b.x), r2(b.y), r2(b.z), r2(b.vx), r2(b.vy), r2(b.vz)];
			e.f.ln = r2(e.L);
			e.f.sx = e.st;
			e.f.dn = Math.round(e.dent);
		},
		fdGapAt: (W, S) => W.gap[S.k] && Math.abs(S.u) < FD.GAPW / 2 - 0.15,
		fdBounce(e, S) {
			const [nx, nz] = FD_N[S.k],
				lim = FD.A - FD.RAILIN - FD.TR;
			e.x -= nx * (S.d - lim);
			e.z -= nz * (S.d - lim);
			const vn = e.vx * nx + e.vz * nz;
			if (vn > 0) {
				e.vx -= 1.5 * vn * nx;
				e.vz -= 1.5 * vn * nz;
			}
		},
		/* a truck on the deck: rails (or the drop through a gap), the crusher's columns and head, props */
		fdTruckWorld(W, e, dt) {
			const S = fdSide(e.x, e.z);
			if (S.d > FD.A - FD.RAILIN - FD.TR) {
				if (!this.fdGapAt(W, S)) this.fdBounce(e, S);
				else if (S.d > FD.A - 0.2) {
					const [nx, nz] = FD_N[S.k],
						vn = e.vx * nx + e.vz * nz;
					/* over the edge: tips off it with at least a little speed outward */
					if (vn < 3) {
						e.vx += nx * (3 - vn);
						e.vz += nz * (3 - vn);
					}
					e.vy = 0;
					this.fdFall(W, e);
					return;
				}
			}
			/* the head while it is down is a block */
			const hy = fdHeadY(W.t),
				H = FD.CRH + 0.1 + FD.TR * 0.7;
			if (hy < 1.4 && Math.abs(e.x) < H && Math.abs(e.z) < H) {
				if (H - Math.abs(e.x) < H - Math.abs(e.z)) {
					e.x = Math.sign(e.x || 1) * H;
					e.vx = Math.abs(e.vx) * Math.sign(e.x);
				} else {
					e.z = Math.sign(e.z || 1) * H;
					e.vz = Math.abs(e.vz) * Math.sign(e.z);
				}
			}
			/* props: solid, a fast truck smashes through */
			const sp = Math.hypot(e.vx, e.vz);
			W.br.forEach((b) => {
				if (b.gone || W.t < b.at || W.claimed.has(b.i + 1)) return;
				const dx = e.x - b.x,
					dz = e.z - b.z,
					d = Math.hypot(dx, dz),
					rr = b.r + FD.TR * 0.85;
				if (d >= rr || d < 0.001) return;
				if (sp > FD.BRKT) {
					if (W.claim(b.i + 1)) e.c.push(b.i + 1);
					e.vx *= 0.8;
					e.vz *= 0.8;
					return;
				}
				e.x += (dx / d) * (rr - d);
				e.z += (dz / d) * (rr - d);
				const vn = (e.vx * dx + e.vz * dz) / d;
				if (vn < 0) {
					e.vx -= (1.2 * vn * dx) / d;
					e.vz -= (1.2 * vn * dz) / d;
				}
			});
		},
		/* a SMASH: an impact frame, then launched out of the arena (always a KO) */
		fdSmash(W, e, nx, nz) {
			const l = Math.hypot(nx, nz) || 1;
			e.st = 5;
			e.outT = W.t;
			e.smGo = false;
			e.thud = false;
			e.smDir = [nx / l, nz / l];
			e.f.sm = Math.round(W.t * 100) / 100;
			this.fdKO(W, e, "s");
		},
		fdFall(W, e) {
			if (e.st >= 2) return;
			e.st = 2;
			e.outT = W.t;
			e.thud = false;
			this.fdKO(W, e, "f");
		},
		fdKO(W, e, cause) {
			const h = e.lastHit,
				by = h && W.t - h.t < FD.CREDIT && h.by && h.by !== e.k ? h.by : "";
			e.f.ko = (e.f.ko || []).concat([[by, Math.round(W.t * 100) / 100, W.t >= FD.DBL ? 1 : 0, cause]]);
			mgLog(
				W,
				`${cause === "c" ? "SQUASH" : cause === "s" ? "SMASH" : "FALL"} ${mgName(e)}${by ? ` (KO by ${mgName(W.ents[by])})` : " (own fault)"} at ${Math.round(e.dent)}%`,
			);
			e.lastHit = null;
			if (e.isMe && !W.tv) buzz(160);
		},
		/* back on the deck: the free spot furthest from everyone, lowered by the magnet */
		fdRespawn(W, e) {
			let best = null,
				bd = -1;
			for (let k = 0; k < 8; k++) {
				const a = (k * Math.PI) / 4 + Math.PI / 8,
					x = Math.cos(a) * 8.6,
					z = Math.sin(a) * 8.6,
					d = Math.min(
						99,
						...W.list.filter((o) => o !== e && !o.gone && o.st !== 2).map((o) => Math.hypot(o.x - x, o.z - z)),
						...W.br.filter((b) => !b.gone && W.t > b.at - 2).map((b) => Math.hypot(b.x - x, b.z - z) * 2),
					);
				if (d > bd) {
					bd = d;
					best = [x, z, a];
				}
			}
			const [x, z, a] = best;
			Object.assign(e, {
				st: 4,
				x,
				z,
				y: 11.3,
				vx: 0,
				vz: 0,
				vy: 0,
				spin: 0,
				dent: 0,
				yaw: a + Math.PI / 2,
				lastHit: null,
				L: FD.L0,
			});
			e.tr.scale.setScalar(0.8);
			e.f.cr = 0;
			e.f.rs = [Math.round(W.t * 100) / 100, Math.round(x * 100) / 100, Math.round(z * 100) / 100];
			e.ball = { x, y: 11.3 - FD.L0 * 0.7, z, vx: 0, vy: 0, vz: 0 };
			if (W.tv || e.isMe) sfx("magnet");
		},
		/* REEL: held pulls the chain in; let go after a moment, a whip */
		fdReel(W, e, inp, dt) {
			const t = W.t,
				held = !!(inp && inp.hold) && e.st <= 1 && !e.d,
				pw = e.pw && e.pw[0],
				base = FD.L0 + (pw === "chain" ? FD.LCH : 0);
			if (held && e.reelT < 0) e.reelT = t;
			if (!held && e.reelT >= 0) {
				if (t - e.reelT > 0.18 && t - e.whipT > FD.WCD) this.fdWhip(W, e);
				e.reelT = -1;
			}
			const goal = held ? FD.LIN : t - e.whipT < 0.6 ? FD.LOUT + (pw === "chain" ? FD.LCH : 0) : base;
			e.L += Math.max(-FD.REELV * dt, Math.min(FD.REELV * 1.6 * dt, goal - e.L));
		},
		fdWhip(W, e) {
			const b = e.ball,
				h = this.fdHitch(e),
				dx = b.x - h[0],
				dz = b.z - h[2],
				d = Math.hypot(dx, dz) || 1,
				nx = dx / d,
				nz = dz / d;
			/* along the way it is already swinging round (or straight out if it isn't) */
			let tx = -nz,
				tz = nx;
			const vt = b.vx * tx + b.vz * tz;
			if (vt < 0) {
				tx = -tx;
				tz = -tz;
			}
			const k = Math.min(1, Math.abs(vt) / 6);
			b.vx += (tx * k + nx * (1 - k) * 0.7) * FD.WHIP + nx * 2.5;
			b.vz += (tz * k + nz * (1 - k) * 0.7) * FD.WHIP + nz * 2.5;
			b.vy += 2;
			e.whipT = W.t;
			if (W.tv || e.isMe) sfx("whoosh");
		},
		/* the tip's speed: the truck's own plus its sweep round the truck, the sweep capped at FD.SWEEP so a snap turn
		   flings the ball instead of launching it into orbit */
		fdTipV(e, H0, H1, dt) {
			const k = 1 / Math.max(dt, 0.001),
				tx = e.st === 0 ? e.vx : 0,
				tz = e.st === 0 ? e.vz : 0;
			let sx = (H1[0] - H0[0]) * k - tx,
				sz = (H1[2] - H0[2]) * k - tz;
			/* no faster than the stick's own turning would swing the tip (and never over FD.SWEEP) */
			const l = Math.hypot(sx, sz),
				cap = Math.min(FD.SWEEP, (e.stR || 0) * (e.rearX + FD.ARM) * 1.2);
			if (l > cap) {
				sx *= cap / l;
				sz *= cap / l;
			}
			return [tx + sx, (H1[1] - H0[1]) * k, tz + sz];
		},
		fdHitch(e) {
			const c = Math.cos(e.yaw),
				s = Math.sin(e.yaw),
				r = e.rearX + FD.ARM;
			return [e.x - c * r, e.y + FD.ARMY - 0.12, e.z + s * r];
		},
		/* one local truck's ball: gravity, the deck or the pit floor, the chain, rails, columns, props, the other balls, and
		   hits on other trucks (shared in e.f.hx) */
		fdBall(W, e, dt) {
			const b = e.ball,
				pw = e.pw && e.pw[0],
				R = FD.BR * (pw === "heavy" ? 1.35 : 1),
				share = pw === "heavy" ? 0.48 : FD.BMASS,
				n = Math.max(1, Math.ceil(dt / (1 / 120))),
				h = dt / n,
				/* the boom's tip this frame and last: it sweeps round when the truck turns, so its own speed (not just the
				   truck's) is what the chain pulls the ball with */
				H1 = this.fdHitch(e),
				H0 = e.hp && Math.hypot(e.hp[0] - H1[0], e.hp[2] - H1[2]) < 3 ? e.hp : H1,
				hv = this.fdTipV(e, H0, H1, dt),
				hvx = hv[0],
				hvy = hv[1],
				hvz = hv[2];
			e.hp = H1;
			for (let s = 0; s < n; s++) {
				const wasIn = fdOnDeck(b.x, b.z);
				b.vy -= FD.BG * (e.gK ?? 1) * h;
				b.x += b.vx * h;
				b.y += b.vy * h;
				b.z += b.vz * h;
				const S = fdSide(b.x, b.z),
					inDeck = S.d < FD.A;
				if (inDeck && b.y < R) {
					if (wasIn || b.y > -0.4) {
						b.y = R;
						if (b.vy < -2) b.vy *= -0.3;
						else b.vy = Math.max(0, b.vy);
						const k = Math.exp(-FD.BFR * h);
						b.vx *= k;
						b.vz *= k;
					} else {
						/* under the deck's edge: pushed back out */
						const [nx, nz] = FD_N[S.k];
						b.x += nx * (FD.A + R - S.d);
						b.z += nz * (FD.A + R - S.d);
						const vn = b.vx * nx + b.vz * nz;
						if (vn < 0) {
							b.vx -= vn * nx;
							b.vz -= vn * nz;
						}
					}
				} else if (b.y > R + 0.05) {
					/* air drag */
					const k = Math.exp(-FD.BAIR * h);
					b.vx *= k;
					b.vy *= k;
					b.vz *= k;
				}
				if (!inDeck && b.y < FD.PIT + R) {
					b.y = FD.PIT + R;
					b.vy = Math.max(0, -b.vy * 0.2);
					b.vx *= Math.exp(-4 * h);
					b.vz *= Math.exp(-4 * h);
				}
				/* the rail */
				if (wasIn && b.y < FD.RAILH + R * 0.4 && S.d > FD.A - FD.RAILIN - R && !this.fdGapAt(W, S)) {
					const [nx, nz] = FD_N[S.k],
						lim = FD.A - FD.RAILIN - R,
						vn = b.vx * nx + b.vz * nz;
					b.x -= nx * (S.d - lim);
					b.z -= nz * (S.d - lim);
					if (vn > 0) {
						b.vx -= 1.5 * vn * nx;
						b.vz -= 1.5 * vn * nz;
						if (vn > 7 && (W.tv || e.isMe)) sfx("bonk");
					}
				}
				/* the chain: never longer than e.L; a pull on it drags the truck too */
				const f = (s + 1) / n,
					H = [H0[0] + (H1[0] - H0[0]) * f, H0[1] + (H1[1] - H0[1]) * f, H0[2] + (H1[2] - H0[2]) * f],
					dx = b.x - H[0],
					dy = b.y - H[1],
					dz = b.z - H[2],
					d = Math.hypot(dx, dy, dz);
				e.gK = 1;
				if (d > e.L && d > 0.001) {
					const nx = dx / d,
						ny = dy / d,
						nz = dz / d;
					b.x = H[0] + nx * e.L;
					b.y = H[1] + ny * e.L;
					b.z = H[2] + nz * e.L;
					const vr = (b.vx - hvx) * nx + (b.vy - hvy) * ny + (b.vz - hvz) * nz;
					/* whirling round on a tight chain it rises toward level: the heavy gravity (FD.BG, for weight) eases
					   off with its speed round the tip, as a real-weight ball's would at that speed */
					{
						const rx = b.vx - hvx - nx * vr,
							rz = b.vz - hvz - nz * vr,
							vt = Math.hypot(rx, rz) / FD.LIFTV;
						e.gK = Math.max(0.25, 1 / (1 + vt * vt));
					}
					if (vr > 0) {
						b.vx -= nx * vr * (1 - share);
						b.vy -= ny * vr * (1 - share);
						b.vz -= nz * vr * (1 - share);
						if (e.st === 0) {
							/* the pull drags the truck, but never past its own top speed */
							/* ...and no harder than FD.TUGA m/s², so a chain snapping taut pulls instead of jerking */
							const s0 = Math.max(11.5, Math.hypot(e.vx, e.vz)),
								pl = Math.min(vr * share * 0.8, FD.TUGA * h);
							e.vx += nx * pl;
							e.vz += nz * pl;
							const s1 = Math.hypot(e.vx, e.vz);
							if (s1 > s0) {
								e.vx *= s0 / s1;
								e.vz *= s0 / s1;
							}
						}
					}
				}
				/* the stiff boom carries the chain round: the ball never swings more than FD.CONE off the boom's line, so
				   the chain trails off the tip instead of folding sideways (only the capped tip speed goes into the ball) */
				{
					const dx = b.x - H[0],
						dz = b.z - H[2],
						dh = Math.hypot(dx, dz);
					if (dh > 0.6) {
						const ba = Math.atan2(Math.sin(e.yaw), -Math.cos(e.yaw)),
							ca = Math.atan2(dz, dx),
							off = Math.atan2(Math.sin(ca - ba), Math.cos(ca - ba));
						if (Math.abs(off) <= FD.CONE) e.cS = 0;
						else {
							/* the side it went out on sticks (round the front it doesn't flip over), and its speed (relative to the
						   tip) is steered back into the cone: never moved by hand, so it doesn't jump and hits at its real speed */
							if (!e.cS || Math.abs(off) < 2.4) e.cS = Math.sign(off);
							const sd = e.cS,
								ex = sd * off > 0 ? Math.abs(off) - FD.CONE : 2 * Math.PI - Math.abs(off) - FD.CONE,
								wx = (-dz / dh) * sd,
								wz = (dx / dh) * sd,
								vw = (b.vx - hvx) * wx + (b.vz - hvz) * wz,
								back = -Math.min(ex * 6, FD.CONEV) * dh;
							if (vw > back) {
								b.vx -= wx * (vw - back);
								b.vz -= wz * (vw - back);
							}
						}
					}
				}
			}
			const sp = Math.hypot(b.vx, b.vy, b.vz);
			if (sp > FD.BVMAX) {
				b.vx *= FD.BVMAX / sp;
				b.vy *= FD.BVMAX / sp;
				b.vz *= FD.BVMAX / sp;
			}
			/* the crusher head when it is low */
			{
				const hy = fdHeadY(W.t),
					Hh = FD.CRH + 0.1 + R;
				if (b.y - R < hy + 1.2 && b.y + R > hy && Math.abs(b.x) < Hh && Math.abs(b.z) < Hh) {
					if (b.y > hy + 0.6) {
						b.y = hy + 1.2 + R;
						b.vy = Math.max(0, b.vy);
					} else if (Hh - Math.abs(b.x) < Hh - Math.abs(b.z)) {
						b.x = Math.sign(b.x || 1) * Hh;
						b.vx = Math.abs(b.vx) * Math.sign(b.x) * 0.6;
					} else {
						b.z = Math.sign(b.z || 1) * Hh;
						b.vz = Math.abs(b.vz) * Math.sign(b.z) * 0.6;
					}
				}
			}
			const hsp = Math.hypot(b.vx, b.vz);
			/* props */
			W.br.forEach((q) => {
				if (q.gone || W.t < q.at || W.claimed.has(q.i + 1) || b.y > 2.2) return;
				const dx = b.x - q.x,
					dz = b.z - q.z,
					d = Math.hypot(dx, dz),
					rr = q.r + R;
				if (d >= rr || d < 0.001) return;
				if (hsp > FD.BRKV) {
					if (W.claim(q.i + 1)) e.c.push(q.i + 1);
					b.vx *= 0.7;
					b.vz *= 0.7;
					return;
				}
				b.x += (dx / d) * (rr - d);
				b.z += (dz / d) * (rr - d);
				const vn = (b.vx * dx + b.vz * dz) / d;
				if (vn < 0) {
					b.vx -= (1.3 * vn * dx) / d;
					b.vz -= (1.3 * vn * dz) / d;
				}
			});
			/* the other balls: they clang off each other (a local pair once, from the first one's side) */
			W.list.forEach((o) => {
				if (o === e || o.gone || !o.ball || (o.local && o.i < e.i)) return;
				const q = o.local ? o.ball : o.rb;
				if (!q) return;
				const R2 = FD.BR * (o.f.pw && o.f.pw[0] === "heavy" ? 1.35 : 1),
					dx = b.x - q.x,
					dy = b.y - q.y,
					dz = b.z - q.z,
					d = Math.hypot(dx, dy, dz),
					rr = R + R2;
				if (d >= rr || d < 0.001) return;
				const nx = dx / d,
					ny = dy / d,
					nz = dz / d,
					both = o.local,
					push = both ? (rr - d) / 2 : rr - d;
				b.x += nx * push;
				b.y += ny * push;
				b.z += nz * push;
				if (both) {
					q.x -= nx * push;
					q.y -= ny * push;
					q.z -= nz * push;
				}
				const vr = (b.vx - q.vx) * nx + (b.vy - q.vy) * ny + (b.vz - q.vz) * nz;
				if (vr < 0) {
					const j = both ? vr : vr * 1.2;
					b.vx -= nx * j;
					b.vy -= ny * j;
					b.vz -= nz * j;
					if (both) {
						q.vx += nx * vr;
						q.vy += ny * vr;
						q.vz += nz * vr;
					}
					if (vr < -6) {
						burst(W.sc, b.x - nx * R, b.y, b.z - nz * R, {
							n: 8,
							shape: "cube",
							cols: ["#FFE27A", "#FFC83D", "#FFFFFF"],
							spd: 5,
							up: 3,
							grav: 14,
							life: 0.35,
							size: 0.6,
						});
						if (W.tv || e.isMe || o.isMe) sfx("bonk");
					}
				}
			});
			this.fdHits(W, e, R);
		},
		/* this ball against other trucks: a hit shared for the victim's device */
		fdHits(W, e, R) {
			const b = e.ball,
				pw = e.pw && e.pw[0],
				r3 = (v) => Math.round(v * 1000) / 1000;
			W.list.forEach((o) => {
				if (o === e || o.gone || !o.al) return;
				const st = o.local ? o.st : o.f.sx | 0;
				if (st > 1 || (o.f.sh || 0) > W.t) return;
				const dx = o.x - b.x,
					dz = o.z - b.z,
					d = Math.hypot(dx, dz);
				if (d > R + FD.TR || Math.abs(b.y - (o.y + 0.7)) > 1.1 + R) return;
				const vx = b.vx - (o.vx || 0),
					vz = b.vz - (o.vz || 0),
					p = Math.hypot(vx, vz, b.vy * 0.5);
				if (p < FD.HITV || W.t - (e.hcd[o.k] ?? -9) < FD.HCD) return;
				e.hcd[o.k] = W.t;
				/* away from the ball, leaning the way it swings */
				const l1 = d || 1,
					l2 = Math.hypot(vx, vz) || 1;
				let nx = (dx / l1) * 0.6 + (vx / l2) * 0.4,
					nz = (dz / l1) * 0.6 + (vz / l2) * 0.4;
				const l = Math.hypot(nx, nz) || 1;
				nx /= l;
				nz /= l;
				e.f.hx = (e.f.hx || [])
					.concat([
						[o.k, r3(W.t), r3(nx), r3(nz), r3(Math.min(30, p)), pw === "spike" ? 1.6 : 1, pw === "heavy" ? 1.4 : 1],
					])
					.slice(-8);
				/* the ball bounces back off the truck */
				const vn = b.vx * nx + b.vz * nz;
				if (vn > 0) {
					b.vx -= 1.3 * vn * nx;
					b.vz -= 1.3 * vn * nz;
				}
				b.x -= nx * Math.max(0, R + FD.TR - d) * 0.5;
				b.z -= nz * Math.max(0, R + FD.TR - d) * 0.5;
				this.fdHitFx(W, o, b.x + nx * R, b.z + nz * R, p, e);
				mgLog(W, `${mgName(e)} hits ${mgName(o)} at ${Math.round(p)} m/s`);
			});
		},
		fdHitFx(W, o, x, z, p, by) {
			const big = p > 15;
			burst(W.sc, x, 1, z, {
				n: big ? 16 : 10,
				shape: "cube",
				cols: ["#FFE27A", "#FFC83D", "#FFFFFF", "#FF8A1F"],
				spd: big ? 7 : 5,
				up: 4,
				grav: 12,
				life: 0.5,
			});
			burst(W.sc, x, 1, z, {
				n: 4,
				shape: "ico",
				cols: ["#9AA1AB", "#C9CED8"],
				spd: 3,
				up: 3,
				grav: 14,
				life: 0.6,
				size: 0.7,
			});
			if (W.tv || o.isMe || by.isMe) {
				sfx(big ? "crush" : "ram");
				W.shake = Math.max(W.shake || 0, big ? 0.45 : 0.25);
			}
			if (o.isMe && !W.tv) buzz(big ? 90 : 50);
		},
		/* hits on this device's truck from any ball: dent goes up, the knock grows with it */
		fdHitsOn(W, e) {
			W.list.forEach((a) => {
				const L = a !== e && a.f && a.f.hx;
				if (!Array.isArray(L)) return;
				L.forEach((q) => {
					if (!Array.isArray(q) || q[0] !== e.k) return;
					const id = a.k + ":" + q[1];
					if (e.hSeen[id]) return;
					e.hSeen[id] = 1;
					if (W.t - q[1] > 1.5 || e.st > 1 || (e.f.sh || 0) > W.t) return;
					const nx = +q[2] || 0,
						nz = +q[3] || 0,
						p = +q[4] || 0;
					e.dent = Math.min(999, e.dent + Math.max(2, (p - 3) * FD.DMG * (+q[5] || 1)));
					const K = (FD.KB0 + p * FD.KBV) * (1 + e.dent / FD.KBD) * (+q[6] || 1);
					e.vx += nx * K;
					e.vz += nz * K;
					e.slideT = 1.1;
					e.hitAng = [nx, nz];
					e.lastHit = { k: `ball of ${mgName(a)}`, t: W.t, by: a.k };
					e.dl.pop = 1;
					if (e.dent >= FD.SMD && K > FD.SMK) this.fdSmash(W, e, nx, nz);
					else if (K > FD.AIRK) {
						e.st = 1;
						e.y = Math.max(e.y || 0, 0.05);
						e.vy = Math.min(13, 2.5 + (K - FD.AIRK) * 0.42);
						e.spinV = K > 22 ? (Math.random() < 0.5 ? -1 : 1) * (4 + K * 0.15) : 0;
					}
					if (!a.local) this.fdHitFx(W, e, e.x - nx * 0.8, e.z - nz * 0.8, p, a);
				});
			});
		},
		/* driving over a power-up takes it */
		fdPickups(W, e) {
			if (e.st !== 0) return;
			for (const k in W.picks) {
				const pk = W.picks[k];
				if (W.claimed.has(pk.id) || Math.hypot(pk.x - e.x, pk.z - e.z) > 1.5) continue;
				if (!W.claim(pk.id)) continue;
				e.c.push(pk.id);
				if (pk.k === "wrench") {
					e.dent = Math.max(0, e.dent - 50);
					fb(W, e, "−50%", { tone: "good" });
				} else {
					e.pw = [pk.k, W.t + FD.PUT];
					e.f.pw = [pk.k, Math.round(e.pw[1] * 10) / 10];
					fb(W, e, { heavy: "HEAVY BALL", spike: "SPIKES", chain: "LONG CHAIN" }[pk.k]);
				}
				mgLog(W, `${mgName(e)} takes ${pk.k}`);
				if (W.tv || e.isMe) sfx("coin");
			}
		},
		onClaim(W, id) {
			if (id > FD.PID) {
				const pk = W.picks[id - FD.PID - 1];
				if (pk && pk.vis) {
					W.sc.remove(pk.vis.g, pk.vis.ring);
					burst(W.sc, pk.x, 1, pk.z, { n: 8, shape: "coin", cols: ["#FFC83D", "#FFE27A"], spd: 2.6, up: 5, life: 0.7 });
					pk.vis = null;
				}
				return;
			}
			const b = W.br[id - 1];
			if (!b || b.gone) return;
			b.gone = true;
			const K = FD_BK[b.k];
			W.bkI[b.k].hide(b.ii);
			burst(W.sc, b.x, 0.9, b.z, {
				n: 12,
				shape: "cube",
				cols: K.cols,
				spd: 5,
				up: 7,
				grav: 20,
				life: 0.9,
				size: 1,
				vary: 1.1,
			});
			burst(W.sc, b.x, 0.6, b.z, {
				n: 6,
				shape: "ico",
				cols: ["#A89480", "#C9BBA8"],
				spd: 2,
				up: 2,
				grav: 4,
				life: 0.8,
				size: 1.3,
				op: 0.5,
			});
			if (W.tv || Math.hypot(b.x - W.me.x, b.z - W.me.z) < 14) sfx("crack");
			if (b.pu) this.fdPickVis(W, { id: FD.PID + id, k: b.pu, x: b.x, z: b.z, born: W.t });
		},
		fdPickVis(W, pk) {
			const g = new THREE.Group(),
				face = new THREE.MeshBasicMaterial({ map: fdIconTex(pk.k) }),
				rim = M("#E0A21C", { emissive: "#FFB020", emissiveIntensity: 0.35 }),
				coin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.15, 24), [rim, face, face]);
			coin.rotation.x = Math.PI / 2;
			coin.castShadow = true;
			g.add(coin);
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(0.6, 0.8, 28),
				new THREE.MeshBasicMaterial({
					color: "#FFD45A",
					transparent: true,
					opacity: 0.7,
					depthWrite: false,
					polygonOffset: true,
					polygonOffsetFactor: -2,
				}),
			);
			ring.rotation.x = -Math.PI / 2;
			ring.position.set(pk.x, 0.03, pk.z);
			g.position.set(pk.x, 1, pk.z);
			W.sc.add(g, ring);
			pk.vis = { g, ring };
			W.picks[pk.id - FD.PID - 1] = pk;
		},
		/* once a frame: the crusher, drops, the rails breaking, KO pop-ups */
		tick(W, dt) {
			const t = W.t,
				d = fdSlam(t);
			/* the slam: squashes local trucks under the head */
			if (d >= 0 && d < 0.5 && W.lastSlam !== Math.round(t - d)) {
				W.lastSlam = Math.round(t - d);
				for (let i = 0; i < 10; i++) {
					const a = (i / 10) * 6.283;
					burst(W.sc, Math.cos(a) * FD.CRH, 0.3, Math.sin(a) * FD.CRH, {
						n: 2,
						shape: "ico",
						cols: ["#A89480", "#C9BBA8"],
						spd: 4,
						up: 1.5,
						grav: 3,
						life: 0.8,
						size: 1.2,
						op: 0.55,
					});
				}
				const near = W.tv || Math.hypot(W.me.x, W.me.z) < 16;
				if (near) {
					sfx("crush");
					W.shake = Math.max(W.shake || 0, 0.35);
				}
				W.list.forEach((e) => {
					if (!e.local || e.gone || e.st > 1 || (e.f.sh || 0) > t) return;
					if (Math.abs(e.x) < FD.CRH + 0.4 && Math.abs(e.z) < FD.CRH + 0.4 && (e.y || 0) < 1.5) {
						if (e.dent >= FD.SMC) {
							const a = Math.random() * 6.283;
							this.fdSmash(W, e, Math.cos(a), Math.sin(a));
							return;
						}
						e.st = 3;
						e.outT = t;
						e.f.cr = Math.round(t * 100) / 100;
						this.fdKO(W, e, "c");
					}
				});
			}
			if (d > -1.85 && d < -1.7 && W.warnAt !== Math.round(t - d) && (W.tv || Math.hypot(W.me.x, W.me.z) < 16)) {
				W.warnAt = Math.round(t - d);
				sfx("windup");
			}
			/* drops: a shadow, then the prop lands; trucks under it get a bonk */
			W.br.forEach((b) => {
				if (b.at < 0 || b.landed) return;
				if (t >= b.at) {
					b.landed = true;
					if (!W.claimed.has(b.i + 1)) W.bkI[b.k].put(b.ii, b.x, 0, b.z, b.ry, FD_BK[b.k].sc);
					burst(W.sc, b.x, 0.2, b.z, {
						n: 8,
						shape: "ico",
						cols: ["#A89480", "#C9BBA8"],
						spd: 3,
						up: 1.5,
						grav: 4,
						life: 0.7,
						size: 1.1,
						op: 0.5,
					});
					if (W.tv || Math.hypot(b.x - W.me.x, b.z - W.me.z) < 14) sfx("land");
					W.list.forEach((e) => {
						if (!e.local || e.st > 1 || Math.hypot(e.x - b.x, e.z - b.z) > b.r + FD.TR) return;
						const dx = e.x - b.x,
							dz = e.z - b.z,
							l = Math.hypot(dx, dz) || 1;
						e.dent += 10;
						e.vx += (dx / l) * 8;
						e.vz += (dz / l) * 8;
						e.slideT = 0.8;
						e.dl.pop = 1;
						fb(W, e, "BONK");
					});
				}
			});
			/* the last 20 s: KOs count double, the closed sides lose their middle rail */
			if (t >= FD.DBL && !W.dbl) {
				W.dbl = true;
				W.big = "×2 KO!";
				W.bigT = FD.DBL + 2.2;
				for (let k = 0; k < 8; k++)
					if (!W.gap[k]) {
						W.gap[k] = true;
						const m = W.mid[k];
						if (W.chev[k]) W.chev[k].visible = true;
						if (m) W.flyRail.push({ m, t, vx: FD_N[k][0] * 4, vz: FD_N[k][1] * 4, vy: 5, s: (k % 2 ? 1 : -1) * 2 });
						const [nx, nz] = FD_N[k],
							ap = FD.A - FD.RAILIN;
						burst(W.sc, nx * ap, 0.8, nz * ap, {
							n: 12,
							shape: "cube",
							cols: ["#F2C230", "#4A505A", "#FFE27A"],
							spd: 5,
							up: 6,
							grav: 18,
							life: 0.9,
						});
					}
				sfx("crack");
				W.shake = Math.max(W.shake || 0, 0.4);
				mgLog(W, "double KOs, rails off");
			}
			/* KO pop-ups, everyone's (from the shared falls) */
			W.list.forEach((e) => {
				(e.f.ko || []).forEach((q) => {
					const id = e.k + ":" + q[1];
					if (W.koSeen.has(id)) return;
					W.koSeen.add(id);
					const by = W.ents[q[0]];
					if (by && !by.gone) fb(W, by, `+${q[2] ? FD.KO * 2 : FD.KO}`, { tone: "good" });
					if (q[3] === "c") fb(W, e, "SQUASHED", { stamp: true });
					if (q[3] === "s") fb(W, e, "SMASH!", { stamp: true });
				});
			});
		},
		rules(W, e) {
			let k = 0;
			W.list.forEach((o) => {
				if (o !== e) (o.f.ko || []).forEach((q) => q[0] === e.k && (k += q[2] ? FD.KO * 2 : FD.KO));
			});
			e.kos = k;
			e.sc = Math.max(0, k - (e.f.ko || []).length);
		},
		final: (W, e) => e.sc,
		ramReady: () => true,
		ramCd: (W) => Math.max(0, Math.min(1, 1 - (W.t - W.me.whipT) / FD.WCD)),
		cam(W, tgt, pos, far) {
			const asp = GFX.w / GFX.h,
				up = Math.sin(1.02),
				bk = Math.cos(1.02);
			/* the TV sees the whole deck */
			if (W.tv) {
				const R = FD.A / Math.cos(Math.PI / 8) + 1.2,
					t = Math.tan((20 * Math.PI) / 180),
					D = Math.max((R * 0.92) / t, R / (t * asp)),
					g = new THREE.Vector3(0, 0, 1.2);
				return [g, g.clone().add(new THREE.Vector3(0, up * D, bk * D))];
			}
			const me = W.me,
				st = me.st,
				D = asp < 1 ? 30 : 25,
				lim = asp < 1 ? 7 : 9,
				x = st >= 2 && st !== 4 ? me.x * 0.5 : me.x,
				z = st >= 2 && st !== 4 ? me.z * 0.5 : me.z,
				g = new THREE.Vector3(
					Math.max(-lim, Math.min(lim, x * 0.85)),
					0,
					Math.max(-lim, Math.min(lim, z * 0.85)) + 0.6,
				);
			return [g, g.clone().add(new THREE.Vector3(0, up * D, bk * D))];
		},
		render(W, e, dt) {
			if (W.visT === W.t) return;
			W.visT = W.t;
			this.fdVis(W, dt);
		},
		/* everything drawn each frame: balls and chains (remote balls eased toward their shared spot), dent labels, smoke,
		   the squash, the shield blink, magnets, the crusher, flying rails, drop shadows, pick-ups, the crowd */
		fdVis(W, dt) {
			const t = W.t;
			W.list.forEach((e) => {
				if (e.gone) {
					e.bv.g.visible = e.chain.visible = false;
					return;
				}
				/* the ball */
				let b = e.ball;
				const pw = e.local ? e.pw && e.pw[0] : e.f.pw && e.f.pw[0];
				if (!e.local) {
					const s = e.f.bl;
					if (Array.isArray(s)) {
						const rb = e.rb || (e.rb = { x: +s[0], y: +s[1], z: +s[2], vx: 0, vy: 0, vz: 0 }),
							age = e.net ? Math.min(0.25, (performance.now() - e.net.at) / 1000) : 0,
							k = 1 - Math.exp(-dt * 16),
							far = Math.hypot(rb.x - s[0], rb.z - s[2]) > 8;
						rb.vx = +s[3] || 0;
						rb.vy = +s[4] || 0;
						rb.vz = +s[5] || 0;
						rb.x = far ? +s[0] : rb.x + (+s[0] + rb.vx * age - rb.x) * k;
						rb.y = far ? +s[1] : rb.y + (Math.max(FD.PIT, +s[1] + rb.vy * age) - rb.y) * k;
						rb.z = far ? +s[2] : rb.z + (+s[2] + rb.vz * age - rb.z) * k;
					}
					b = e.rb || b;
				}
				const R = pw === "heavy" ? 1.35 : 1;
				e.bv.g.visible = true;
				e.bv.g.position.set(b.x, b.y, b.z);
				e.bv.g.scale.setScalar(R);
				e.bv.spk.visible = pw === "spike";
				{
					/* the ball hangs off its chain: the lug turns toward the chain's last links (last frame's), easing over, leaning
					   toward the hitch so links flung past the ball can't drag the lug round after them */
					const q = e.cn[e.cn.length - 3],
						Hq = this.fdHitch(e),
						u = W.fdU || (W.fdU = new THREE.Vector3()),
						uh = W.fdUH || (W.fdUH = new THREE.Vector3()),
						tq = W.fdQ || (W.fdQ = new THREE.Quaternion());
					u.set(q.x - b.x, q.y - b.y, q.z - b.z);
					uh.set(Hq[0] - b.x, Hq[1] - b.y, Hq[2] - b.z);
					if (uh.lengthSq() > 0.04) u.lengthSq() > 0.04 ? u.normalize().add(uh.normalize()) : u.copy(uh);
					if (u.lengthSq() > 0.04) {
						tq.setFromUnitVectors(FD_UP, u.normalize());
						e.bv.o.quaternion.slerp(tq, Math.min(1, dt * 14));
					}
					const hv = Math.hypot(b.vx || 0, b.vz || 0);
					if (hv > 15 && Math.random() < dt * 30)
						burst(W.sc, b.x, b.y, b.z, {
							n: 1,
							shape: "ico",
							cols: ["#F4F6F9"],
							spd: 0.3,
							up: 0.5,
							grav: 0,
							life: 0.25,
							size: 0.9,
							op: 0.35,
						});
					if (hv > 16 && (W.tv || e.isMe) && t - (e.wsT || 0) > 0.7) {
						e.wsT = t;
						sfx("whoosh");
					}
				}
				/* the chain: verlet nodes pinned at the hitch and the lug */
				{
					const H = this.fdHitch(e),
						N = e.cn,
						n = N.length - 1,
						lu = (W.fdL || (W.fdL = new THREE.Vector3())).copy(FD_UP).applyQuaternion(e.bv.o.quaternion),
						lr = (FD.BR + 0.12) * R,
						top = [b.x + lu.x * lr, b.y + lu.y * lr, b.z + lu.z * lr],
						/* the drawn chain runs hitch → lug, so it is the physics length less the lug's reach: straight when the
						   ball pulls it tight, sagging only when the ball is in closer */
						L = Math.max(
							0.5,
							Math.min(
								(e.local ? e.L : +e.f.ln || FD.L0) - lr * 0.8,
								Math.hypot(top[0] - H[0], top[1] - H[1], top[2] - H[2]) + 0.5,
							),
						),
						seg = L / n,
						h = Math.min(dt, 0.05);
					if (Math.hypot(N[0].x - H[0], N[0].z - H[2]) > 6)
						N.forEach((q, i) => {
							q.x = q.px = H[0] + ((top[0] - H[0]) * i) / n;
							q.y = q.py = H[1] + ((top[1] - H[1]) * i) / n;
							q.z = q.pz = H[2] + ((top[2] - H[2]) * i) / n;
						});
					N.forEach((q, i) => {
						if (i === 0 || i === n) return;
						const vx = (q.x - q.px) * 0.96,
							vy = (q.y - q.py) * 0.96,
							vz = (q.z - q.pz) * 0.96;
						q.px = q.x;
						q.py = q.y;
						q.pz = q.z;
						q.x += vx;
						q.y += vy - 20 * h * h;
						q.z += vz;
						const fl = fdOnDeck(q.x, q.z) ? 0.06 : FD.PIT + 0.06;
						if (q.y < fl) q.y = fl;
					});
					for (let it = 0; it < 5; it++) {
						Object.assign(N[0], { x: H[0], y: H[1], z: H[2] });
						Object.assign(N[n], { x: top[0], y: top[1], z: top[2] });
						/* links can't pass through the ball */
						for (let i = 1; i < n; i++) {
							const q = N[i],
								ox = q.x - b.x,
								oy = q.y - b.y,
								oz = q.z - b.z,
								od = Math.hypot(ox, oy, oz),
								rr = (FD.BR + 0.08) * R;
							if (od < rr && od > 0.001) {
								q.x = b.x + (ox / od) * rr;
								q.y = b.y + (oy / od) * rr;
								q.z = b.z + (oz / od) * rr;
							}
						}
						for (let i = 0; i < n; i++) {
							const a = N[i],
								c = N[i + 1],
								dx = c.x - a.x,
								dy = c.y - a.y,
								dz = c.z - a.z,
								d = Math.hypot(dx, dy, dz) || 0.001;
							if (d <= seg) continue;
							const k = (d - seg) / d / 2,
								wa = i === 0 ? 0 : 1,
								wc = i + 1 === n ? 0 : 1,
								ws = wa + wc || 1;
							a.x += (dx * k * 2 * wa) / ws;
							a.y += (dy * k * 2 * wa) / ws;
							a.z += (dz * k * 2 * wa) / ws;
							c.x -= (dx * k * 2 * wc) / ws;
							c.y -= (dy * k * 2 * wc) / ws;
							c.z -= (dz * k * 2 * wc) / ws;
						}
					}
					const o = W.fdO || (W.fdO = new THREE.Object3D()),
						up = new THREE.Vector3(1, 0, 0),
						dv = new THREE.Vector3();
					for (let i = 0; i < n; i++) {
						const a = N[i],
							c = N[i + 1];
						dv.set(c.x - a.x, c.y - a.y, c.z - a.z);
						const l = dv.length() || 0.001;
						o.position.set((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
						o.quaternion.setFromUnitVectors(up, dv.divideScalar(l));
						if (i % 2) o.rotateX(Math.PI / 2);
						o.scale.set(Math.max(0.6, Math.min(1.4, l / 0.3)), 1, 1);
						o.updateMatrix();
						e.chain.setMatrixAt(i, o.matrix);
					}
					e.chain.instanceMatrix.needsUpdate = true;
					e.chain.visible = true;
				}
				/* dent label */
				{
					const v = e.local ? Math.round(e.dent) : e.f.dn | 0,
						dl = e.dl,
						st = e.local ? e.st : e.f.sx | 0;
					if (v !== dl.v) {
						if (v > dl.v && !e.local) dl.pop = 1;
						dl.v = v;
						const x = dl.cv.getContext("2d"),
							w = dl.cv.width,
							hh = dl.cv.height,
							c = v < 40 ? "#F4F6F9" : v < 80 ? "#FFD84A" : v < 130 ? "#FF8A1F" : "#FF4A3A";
						x.clearRect(0, 0, w, hh);
						x.font = "64px Bungee, 'Arial Black', Impact, sans-serif";
						x.textAlign = "center";
						x.textBaseline = "middle";
						x.lineJoin = "round";
						x.lineWidth = 14;
						x.strokeStyle = "rgba(24,26,32,.9)";
						x.strokeText(v + "%", w / 2, hh / 2 + 4);
						x.fillStyle = c;
						x.fillText(v + "%", w / 2, hh / 2 + 4);
						dl.tex.needsUpdate = true;
					}
					dl.pop = Math.max(0, dl.pop - dt * 3.5);
					const pk = 1 + Math.sin(dl.pop * Math.PI) * 0.45;
					dl.sp.scale.set(1.9 * pk, 0.83 * pk, 1);
					dl.sp.visible = st <= 1;
					/* smoke from a battered truck */
					if (st <= 1 && v > 60 && Math.random() < dt * (v > 120 ? 9 : 4))
						burst(W.sc, e.x, e.y + 1.4, e.z, {
							n: 1,
							shape: "ico",
							cols: v > 120 ? ["#3A3F48", "#4A4E57"] : ["#9AA1AB", "#B8BEC8"],
							spd: 0.5,
							up: 2.2,
							grav: -1,
							life: 1.2,
							size: 1.1,
							op: 0.5,
						});
					if (st <= 1 && v > 120 && Math.random() < dt * 3)
						burst(W.sc, e.x, e.y + 0.8, e.z, {
							n: 3,
							shape: "cube",
							cols: ["#FFC83D", "#FF8A1F"],
							spd: 2.5,
							up: 3,
							grav: 14,
							life: 0.35,
							size: 0.4,
						});
				}
				/* squashed, shielded, on the magnet */
				{
					const cr = +e.f.cr || 0,
						sq = cr && t - cr < 2.5;
					e.tr.scale.set(0.8 * (sq ? 1.18 : 1), 0.8 * (sq ? 0.24 : 1), 0.8 * (sq ? 1.18 : 1));
					if (sq) e.g.position.y = 0.42;
					/* SMASH: a white-hot flash and a starburst at the impact frame, then a smoke trail behind the launch */
					const sm = +e.f.sm || 0;
					if (sm && e.smSeen !== sm) {
						e.smSeen = sm;
						if (!W.flash) {
							W.flash = new THREE.Sprite(
								new THREE.SpriteMaterial({
									map: fdFlashTex(),
									transparent: true,
									depthTest: false,
									blending: THREE.AdditiveBlending,
								}),
							);
							W.flash.renderOrder = 12;
							W.sc.add(W.flash);
						}
						W.flashT = t;
						W.flashAt = [e.x, e.y + 1, e.z];
						burst(W.sc, e.x, e.y + 1, e.z, {
							n: 24,
							shape: "cube",
							cols: ["#FFFFFF", "#FFE27A", "#FFC83D", "#FF8A1F"],
							spd: 11,
							up: 6,
							grav: 6,
							life: 0.6,
							size: 0.9,
						});
						W.shake = Math.max(W.shake || 0, 0.7);
						sfx("crush");
						sfx("thunder");
						if (e.isMe && !W.tv) buzz(220);
					}
					if (sm && t - sm > FD.FREEZE && t - sm < 1.8 && e.y > FD.PIT && Math.random() < dt * 40)
						burst(W.sc, e.x, e.y + 0.8, e.z, {
							n: 1,
							shape: "ico",
							cols: ["#F4F6F9", "#FFE27A"],
							spd: 0.4,
							up: 0.5,
							grav: 0,
							life: 0.7,
							size: 1.3,
							op: 0.6,
						});
					const sh = (e.f.sh || 0) > t;
					e.tr.visible = !sh || Math.floor(t * 12) % 2 === 0;
					const rs = e.f.rs,
						u = rs ? (t - rs[0]) / FD.MAGT : 9;
					e.mag.visible = u >= 0 && u < 1.7;
					if (e.mag.visible) {
						const ty = u < 1 ? 1.3 + (1 - u * u * (3 - 2 * u)) * 10 : 1.3 + (u - 1) * 18;
						e.mag.position.set(+rs[1], ty + 1.55, +rs[2]);
						if (u >= 1 && !e.magDrop) {
							e.magDrop = rs[0];
						}
					}
				}
			});
			if (W.flash) {
				const u = (t - W.flashT) / 0.35;
				W.flash.visible = u >= 0 && u < 1;
				if (W.flash.visible) {
					W.flash.position.set(...W.flashAt);
					const s = 3 + u * 9;
					W.flash.scale.set(s, s, 1);
					W.flash.material.opacity = 1 - u;
					W.flash.material.rotation = u * 0.6;
				}
			}
			/* the crusher */
			{
				const hy = fdHeadY(t),
					d = fdSlam(t);
				W.head.position.y = hy;
				const L = W.rodTop - (hy + 1.3);
				W.rod.scale.y = Math.max(0.05, L);
				W.rod.position.y = hy + 1.3 + L / 2;
				W.lampM.emissiveIntensity = d > -1.8 && d < 0.2 ? (Math.floor(t * 8) % 2 ? 2.2 : 0.2) : 0;
			}
			/* rails flying off into the pit */
			W.flyRail = W.flyRail.filter((q) => {
				const u = t - q.t;
				q.m.position.set(q.vx * u, q.vy * u - 14 * u * u, q.vz * u);
				q.m.rotation.y = q.s * u * 0.2;
				if (u > 2.5) {
					W.sc.remove(q.m);
					return false;
				}
				return true;
			});
			/* drops: the prop falling and its growing shadow */
			let si = 0;
			W.br.forEach((b) => {
				if (b.at < 0 || b.landed || t < b.at - FD.DROPW) return;
				const u = Math.max(0, (t - (b.at - FD.DROPW)) / FD.DROPW),
					fall = Math.max(0, (t - (b.at - 0.55)) / 0.55);
				let sh = W.dropSh[si];
				if (!sh) {
					sh = roundShadow(2.2, 0.5);
					sh.position.y = 0.02;
					W.sc.add(sh);
					W.dropSh[si] = sh;
				}
				si++;
				sh.visible = true;
				sh.position.x = b.x;
				sh.position.z = b.z;
				sh.scale.setScalar(0.4 + u * 0.7);
				if (!W.claimed.has(b.i + 1))
					W.bkI[b.k].put(
						b.ii,
						b.x,
						fall > 0 ? 14 * (1 - fall * fall) : 30,
						b.z,
						b.ry + (1 - fall) * 2,
						fall > 0 ? FD_BK[b.k].sc : 0.0001,
					);
			});
			for (; si < W.dropSh.length; si++) W.dropSh[si].visible = false;
			/* pick-ups bob and turn */
			for (const k in W.picks) {
				const pk = W.picks[k];
				if (!pk.vis) continue;
				pk.vis.g.position.y = 1 + Math.sin(t * 3 + pk.id) * 0.15;
				pk.vis.g.rotation.y += dt * 2.5;
			}
			crowdStep(W, null, 0.6);
		},
		/* CPUs: pick a rival (the more dented and the closer, the better), circle it at about the chain's length so the ball
		   sweeps through it, reel in on the way and whip on arrival; keep off the edges near the gaps and away from the
		   crusher while it warns; grab power-ups nearby */
		bot(W, e, dt) {
			const t = W.t;
			e.botK = skv(e, 0.78, 0.9, 1);
			if (e.st !== 0) return { x: 0, y: 0, boost: false, hold: false };
			const out = { x: 0, y: 0, boost: false, hold: false },
				S = fdSide(e.x, e.z),
				ds = fdSlam(t + skv(e, 0.2, 0.6, 1));
			/* the crusher about to slam (Easy notices late) */
			if (Math.abs(e.x) < FD.CRH + 2.2 && Math.abs(e.z) < FD.CRH + 2.2 && ds > -2.6 && ds < 0.9) {
				const l = Math.hypot(e.x, e.z) || 1;
				return { x: e.x / l, y: e.z / l, boost: false, hold: false };
			}
			if (!e.tgtT || t > e.tgtT) {
				e.tgtT = t + 1.2 + Math.random();
				const L = W.list.filter(
					(o) => o !== e && !o.gone && (o.local ? o.st : o.f.sx | 0) <= 1 && !((o.f.sh || 0) > t),
				);
				let best = null,
					bs = -1;
				L.forEach((o) => {
					const d = Math.hypot(o.x - e.x, o.z - e.z),
						dn = o.local ? o.dent : o.f.dn | 0,
						sc = (dn + 40) / (d + 6) + (o.isMe && !o.bot ? skv(e, 0.1, 0.05, 0) : 0);
					if (sc > bs) {
						bs = sc;
						best = o;
					}
				});
				e.tgt = best ? best.k : null;
				e.orb = Math.random() < 0.5 ? 1 : -1;
				/* a power-up close by first */
				e.pkGo = null;
				for (const k in W.picks) {
					const pk = W.picks[k];
					if (pk.vis && !W.claimed.has(pk.id) && Math.hypot(pk.x - e.x, pk.z - e.z) < skv(e, 5, 8, 11)) e.pkGo = pk;
				}
			}
			let dx = 0,
				dz = 0;
			const o = W.ents[e.tgt];
			if (e.pkGo && !W.claimed.has(e.pkGo.id)) {
				dx = e.pkGo.x - e.x;
				dz = e.pkGo.z - e.z;
			} else if (o) {
				const ox = o.x + o.vx * skv(e, 0, 0.2, 0.35),
					oz = o.z + o.vz * skv(e, 0, 0.2, 0.35),
					rx = e.x - ox,
					rz = e.z - oz,
					d = Math.hypot(rx, rz) || 1;
				if (d > 8.5) {
					dx = ox - e.x + (-rz / d) * 3 * e.orb;
					dz = oz - e.z + (rx / d) * 3 * e.orb;
					out.hold = d > 11;
				} else {
					/* orbit: along the circle, pulled toward a radius of about the chain */
					const want = skv(e, 5.5, 4.6, 4),
						tx = (-rz / d) * e.orb,
						tz = (rx / d) * e.orb,
						cr = (want - d) * 0.35;
					dx = tx + (rx / d) * cr;
					dz = tz + (rz / d) * cr;
					/* reel in for most of a lap, then let go with the target in reach: a whip */
					if (t - e.whipT > FD.WCD) {
						if (!e.hl) e.hl = t + 0.2 + Math.random() * skv(e, 1.2, 0.6, 0.3);
						if (t >= e.hl) {
							out.hold = true;
							if (t - e.hl > skv(e, 0.5, 0.9, 1.2) && d < 6.8) {
								out.hold = false;
								e.hl = 0;
							}
						}
					}
				}
			} else {
				dx = -e.x;
				dz = -e.z;
			}
			/* keep off the edge where there is no rail (and off the rail itself) */
			const edge = FD.A - (this.fdGapAt(W, S) ? skv(e, 3, 3.8, 4.4) : 2.6);
			if (S.d > edge) {
				const [nx, nz] = FD_N[S.k],
					l = Math.hypot(dx, dz) || 1,
					k = Math.min(2.5, (S.d - edge) * 1.2);
				dx = dx / l - nx * k;
				dz = dz / l - nz * k;
			}
			const l = Math.hypot(dx, dz) || 1;
			out.x = dx / l;
			out.y = dz / l;
			/* a mistake now and then: a moment of wandering (Easy more) */
			if (Math.random() < dt * skv(e, 0.5, 0.2, 0.05)) e.wob = t + 0.6;
			if (e.wob > t) {
				const a = Math.atan2(out.y, out.x) + 1.1;
				out.x = Math.cos(a);
				out.y = Math.sin(a);
			}
			return out;
		},
		watchSum(W) {
			return W.list
				.filter((e) => !e.gone)
				.map((e) => `${mgName(e)} ${e.kos | 0}KO/${(e.f.ko || []).length}fall`)
				.join(" · ");
		},
		syncSnap: (W) => (W.br ? W.br.filter((b) => b.gone).length * 100 + W.gap.filter(Boolean).length : 0),
		botScore: () => rnd(12),
	},
});
