/* ---------- Truck Soccer (2 vs 2, a Rocket League style arena) ----------
   A walled pitch with rounded corners and a goal sunk into each end wall; one big ball. Push it into the other team's
   goal; BOOST (the dash button) smashes it harder and lifts it. First to WIN goals wins (the match ends WINWAIT s after
   that goal); if nobody gets there in dur s, the team ahead wins, a draw pays both teams.
   Side 0 (blue) defends the +z goal (the near end) and attacks -z; side 1 (red) the other way.
   Sync: the ball flies along a path that is a pure function of its last kick (fixed 1/120 s steps, only + - * / and
   sqrt, so every device computes the same numbers): floor, walls, goal frames and nets, nothing else. A device only
   kicks with its own trucks (the host also with the CPUs): on contact it shares the new kick in that truck's
   e.f.bl = [kickoff index, n, t, x, y, z, vx, vy, vz], and every device follows the newest kick of the current
   kickoff (latest t, ties by key). The trucks that aren't yours don't touch your copy of the ball until their own
   device kicks it. A goal is announced by the device whose truck made the last kick (or, if nobody has after
   GOALWAIT s, by the host) in e.f.gl = [[kickoff index, scoring side, t, kicker key]]; everyone counts the union of
   those (the earliest per kickoff), and the next kickoff starts KO s after the goal. */
const TS = {
	FX: 15 /* half the pitch width (x) */,
	FZ: 24 /* half its length (z), to the goal lines */,
	CR: 6 /* corner radius */,
	GW: 5.5 /* half the goal mouth's width */,
	GH: 4.8 /* goal height (tall enough for a boosted shot that pops the ball up) */,
	GD: 3.2 /* goal depth behind the line */,
	BR: 1.23 /* ball radius */,
	WALL: 6.2 /* wall + glass height (above the goals) */,
	KERB: 1.2 /* the solid kerb under the glass */,
	H: 1 / 120 /* ball physics step */,
	GRAV: 34 /* the ball falls fast, so it is on the ground more than in the air */,
	FLOOR: 0.55 /* floor bounce */,
	BOUNCE: 0.7 /* wall bounce */,
	ROLL: 0.99625 /* rolling slow-down per step (about 0.64 per second) */,
	AIR: 0.99979 /* air drag per step */,
	KO: 3.5 /* s from a goal to the next kickoff */,
	WIN: 3 /* goals to win the match */,
	/* boost is a meter (0..BMAX), BSTART at every kickoff. BOOST is held: it drains BDRAIN a second and pushes the truck
	   (BACC m/s² on the ground, up to BTOP m/s; in the air BAIR forward and BLIFT up, which beats gravity: an aerial).
	   A pad near each corner fills it, back PADT s after it is taken (PADS = where, PADR = pick-up reach) */
	BMAX: 100,
	BSTART: 33,
	BDRAIN: 33,
	BACC: 18,
	BTOP: 15,
	NORMV: 11.5 /* top speed without boost (the engine's) */,
	BAIR: 16,
	BLIFT: 33,
	PADS: [
		[-9.5, -18],
		[9.5, -18],
		[-9.5, 18],
		[9.5, 18],
	],
	PADR: 1.9,
	PADT: 8,
	/* the ramps: a quarter pipe of radius RR along every wall but the goal mouths, from the floor up to vertical at the
	   wall. Trucks ride up and roll back; one still going out at the lip launches straight up (LAUNCHK x its speed out,
	   at most LAUNCHMAX m/s) and drops back in. The ball rolls up them too (in tsStep) */
	RR: 3,
	LAUNCHK: 1.5,
	LAUNCHMAX: 15,
	BOOMR: 15 /* m: trucks this close to a goal explosion get blown away */,
	BOOMV: 16 /* m/s that blast gives a truck right at it */,
	/* a tackle: BOOSTing into a truck of the other team at TACKV m/s or more knocks it TACKK m/s away and stuns it for
	   STUN s (no steering, boost or jump) */
	STUN: 1,
	TACKV: 14,
	TACKK: 11,
	WINWAIT: 3 /* s of celebration after the winning goal before the match ends */,
	HOLD: 1.6 /* s before a kickoff when the trucks are put back on their spots */,
	GOALWAIT: 1.2 /* s the host waits for the kicker's device to announce a goal before it does */,
	KICKCD: 0.1 /* s between two kicks by the same truck */,
	MAXV: 32 /* the ball's top speed */,
	/* kicks (rules): a plain touch sends the ball at TOUCH x the truck's speed (+0.6 m/s), a BOOST shot at 1.1 x + SHOT
	   m/s with CHIP m/s up; AIM = how much the ball follows the way the truck faces instead of the contact direction */
	TOUCH: 1.05,
	SHOT: 8.5 /* boosting, the truck is already fast: the shot adds this on top */,
	CHIP: 11 /* about 1.8 m up at the top */,
	AIM: 0.45,
	POP: 14 /* m/s up when the ball is squeezed between two trucks (about 2.9 m up, clear over the roofs) */,
	ESC: 7 /* m/s sideways for a popped ball, so it lands out of the pile (about 6 m away), and off a roof */,
	ROOF: 0.6 /* a ball falling onto a truck with its bottom this high rolls off the roof */,
	/* JUMP (the second button, Rocket League style): a hop (off a ramp: away from its surface), then a second tap in
	   the air flips the truck the way the stick points (or forward), a burst of FLIPV m/s; a flip into the ball is a
	   power hit (+FLIPK m/s). AIRC = how much the stick steers in the air */
	JUMP: 10,
	TGRAV: 26 /* the trucks' gravity: a hop is about 1.9 m and 0.8 s */,
	FLIPWIN: 1.4 /* s after the jump the flip can still be used */,
	FLIPV: 13,
	FLIPDUR: 0.5 /* s the flip's spin takes */,
	FLIPK: 11,
	AIRC: 10,
	TVD: [45, 24] /* the TV camera's height and distance out to the side */,
	TVK: [1.1, 0.55] /* its zoom: at most [0], else [1] x the screen's width / height (both goals in view) */,
	SIDEZ: 1.35 /* the follow camera pulled back this much in the side view (a wide screen shows less of the pitch's width) */,
	TVX: 0.5 /* the TV camera's aim, metres towards the near side */,
};
/* where a circle of radius r centred at (x, z) is pushed back to (walls, goal posts, nets), or null when it fits;
   ball = true: the goal mouth is only open under the crossbar (y = the ball's height). Returns {x, z, nx, nz} with
   (nx, nz) pointing out of the pitch. Pure arithmetic + sqrt (the ball physics must give the same numbers everywhere) */
function tsClamp(x, z, r, ball, y) {
	const T = TS,
		az = Math.abs(z),
		sz = z < 0 ? -1 : 1,
		mouthX = T.GW - r,
		open = !ball || y < T.GH - r;
	/* inside a goal: its side nets, back net (and the ball: its roof) */
	if (az > T.FZ && Math.abs(x) <= T.GW) {
		let nx = 0,
			nz = 0,
			px = x,
			pz = z,
			hit = false;
		if (Math.abs(x) > mouthX) {
			px = (x < 0 ? -1 : 1) * mouthX;
			nx = x < 0 ? -1 : 1;
			hit = true;
		}
		if (az > T.FZ + T.GD - r) {
			pz = sz * (T.FZ + T.GD - r);
			nz = sz;
			hit = true;
		}
		if (!hit) return null;
		const l = Math.sqrt(nx * nx + nz * nz);
		return { x: px, z: pz, nx: nx / l, nz: nz / l };
	}
	/* in the goal mouth, crossing the line: free (the posts are handled as the wall's ends) */
	if (open && az > T.FZ - r && Math.abs(x) < mouthX) return null;
	/* the rounded rectangle, shrunk by r */
	const ax = T.FX - r,
		azz = T.FZ - r,
		c = T.CR - r,
		cx = Math.max(-(ax - c), Math.min(ax - c, x)),
		cz = Math.max(-(azz - c), Math.min(azz - c, z)),
		dx = x - cx,
		dz = z - cz,
		d = Math.sqrt(dx * dx + dz * dz);
	if (d <= c) return null;
	return { x: cx + (dx / d) * c, z: cz + (dz / d) * c, nx: dx / d, nz: dz / d };
}
/* the nearest wall for a point on the pitch when it is within the ramps' reach: {d: distance to the wall, nx, nz: the
   outward normal}, or null (further in, or in front of a goal mouth, where there is no ramp). Pure arithmetic + sqrt */
function tsEdge(x, z) {
	const T = TS;
	if (Math.abs(x) < T.GW) return null;
	const cx = Math.max(-(T.FX - T.CR), Math.min(T.FX - T.CR, x)),
		cz = Math.max(-(T.FZ - T.CR), Math.min(T.FZ - T.CR, z)),
		dx = x - cx,
		dz = z - cz,
		dc = Math.sqrt(dx * dx + dz * dz);
	if (dc < T.CR - T.RR) return null;
	return { d: T.CR - dc, nx: dx / dc, nz: dz / dc };
}
/* the ramp's height at a distance d from the wall (0 = the top, at the wall) */
const tsRampY = (d) => {
	const R = TS.RR,
		u = R - Math.max(0, d);
	return u <= 0 ? 0 : R - Math.sqrt(Math.max(0, R * R - u * u));
};
/* the floor under a point: the ramp, or 0 */
function tsGround(x, z) {
	const E = tsEdge(x, z);
	return E && E.d < TS.RR ? tsRampY(E.d) : 0;
}
/* one 1/120 s step of the ball (state s: x y z vx vy vz). Returns the scoring side once it is fully over a goal line:
   0 = into the -z goal (blue scores), 1 = into the +z goal (red scores) */
function tsStep(s) {
	const T = TS,
		h = T.H;
	s.vy -= T.GRAV * h;
	s.vx *= T.AIR;
	s.vz *= T.AIR;
	s.vy *= T.AIR;
	s.x += s.vx * h;
	s.y += s.vy * h;
	s.z += s.vz * h;
	if (s.y < T.BR) {
		s.y = T.BR;
		if (s.vy < 0) s.vy = s.vy < -1.2 ? -s.vy * T.FLOOR : 0;
	}
	if (s.y <= T.BR + 0.001 && s.vy === 0) {
		s.vx *= T.ROLL;
		s.vz *= T.ROLL;
	}
	/* the ramps: the ball's centre stays RR - BR from the pipe's axis (RR in from the wall, RR up); moving into the
		   curve it loses that part of its speed (a hard hit bounces a little), so it rolls up and back down */
	const E = tsEdge(s.x, s.z);
	if (E && E.d < T.RR) {
		const oo = T.RR - E.d,
			dn = T.RR - s.y;
		if (oo > 0 && dn > 0) {
			const q = Math.sqrt(oo * oo + dn * dn),
				lim = T.RR - T.BR;
			if (q > lim) {
				const ux = oo / q,
					uy = dn / q,
					back = oo - ux * lim;
				s.x -= E.nx * back;
				s.z -= E.nz * back;
				s.y = T.RR - uy * lim;
				const vn = (s.vx * E.nx + s.vz * E.nz) * ux - s.vy * uy;
				if (vn > 0) {
					const k = vn > 6 ? 1 + T.BOUNCE * 0.5 : 1;
					s.vx -= E.nx * ux * vn * k;
					s.vz -= E.nz * ux * vn * k;
					s.vy += uy * vn * k;
					s.vx *= T.ROLL;
					s.vz *= T.ROLL;
					s.vy *= T.ROLL;
				}
			}
		}
	}
	/* the goal roof */
	if (Math.abs(s.z) > T.FZ && Math.abs(s.x) <= T.GW && s.y > T.GH - T.BR) {
		s.y = T.GH - T.BR;
		if (s.vy > 0) s.vy = -s.vy * T.BOUNCE;
	}
	const c = tsClamp(s.x, s.z, T.BR, true, s.y);
	if (c) {
		s.x = c.x;
		s.z = c.z;
		const vn = s.vx * c.nx + s.vz * c.nz;
		if (vn > 0) {
			s.vx -= (1 + T.BOUNCE) * vn * c.nx;
			s.vz -= (1 + T.BOUNCE) * vn * c.nz;
		}
	}
	if (Math.abs(s.x) < T.GW && Math.abs(s.z) > T.FZ + T.BR) return s.z < 0 ? 0 : 1;
	return -1;
}
/* the faceted soccer ball: an icosahedron split twice, the faces nearest the 12 original corners dark (12 small pentagons) */
function tsBallMesh() {
	const R = TS.BR,
		geo = new THREE.IcosahedronGeometry(R, 2).toNonIndexed(),
		ico = new THREE.IcosahedronGeometry(1, 0),
		corners = [],
		ip = ico.attributes.position,
		p = geo.attributes.position,
		col = new Float32Array(p.count * 3),
		dark = new THREE.Color("#2A2F3A"),
		lite = new THREE.Color("#F4F6F9");
	for (let i = 0; i < ip.count; i++) {
		const v = new THREE.Vector3(ip.getX(i), ip.getY(i), ip.getZ(i)).normalize();
		if (!corners.some((c) => c.distanceTo(v) < 0.01)) corners.push(v);
	}
	for (let f = 0; f < p.count; f += 3) {
		const m = new THREE.Vector3();
		for (let k = 0; k < 3; k++) m.add(new THREE.Vector3(p.getX(f + k), p.getY(f + k), p.getZ(f + k)));
		m.normalize();
		const c = corners.some((q) => q.dot(m) > 0.97) ? dark : lite;
		for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (f + k) * 3);
	}
	geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
	geo.computeVertexNormals();
	const m = new THREE.Mesh(
		geo,
		new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.55 }),
	);
	/* no sun shadow: the round shadow straight under it (drawBall) shows where it is, a second one off to the side was confusing */
	return m;
}
/* the turf: mown stripes, the lines, both goal floors tinted in the team that defends them */
function tsPitchTex() {
	const T = TS,
		LX = T.FX * 2,
		LZ = (T.FZ + T.GD) * 2,
		PX = 512,
		PZ = Math.round((PX * LZ) / LX),
		s = PX / LX;
	return canvasTex(PX, PZ, (x, w, h) => {
		const X = (v) => w / 2 + v * s,
			Z = (v) => h / 2 + v * s;
		x.fillStyle = "#4F8644";
		x.fillRect(0, 0, w, h);
		const bands = 12,
			bl = (T.FZ * 2) / bands;
		for (let i = 0; i < bands; i++) {
			x.fillStyle = i % 2 ? "#5F9A50" : "#57914A";
			x.fillRect(0, Z(-T.FZ + i * bl), w, bl * s + 1);
		}
		/* goal floors in the defending team's colour (side 0 blue at +z) */
		[
			[1, "#3E6FC4"],
			[-1, "#C9474B"],
		].forEach(([sd, c]) => {
			x.fillStyle = c;
			x.fillRect(X(-T.GW), sd > 0 ? Z(T.FZ) : Z(-T.FZ - T.GD), T.GW * 2 * s, T.GD * s);
		});
		x.strokeStyle = "rgba(244,246,249,0.72)";
		x.lineWidth = 3;
		const rr = (hx, hz, r) => {
			x.beginPath();
			x.moveTo(X(-hx + r), Z(-hz));
			x.arcTo(X(hx), Z(-hz), X(hx), Z(hz), r * s);
			x.arcTo(X(hx), Z(hz), X(-hx), Z(hz), r * s);
			x.arcTo(X(-hx), Z(hz), X(-hx), Z(-hz), r * s);
			x.arcTo(X(-hx), Z(-hz), X(hx), Z(-hz), r * s);
			x.closePath();
			x.stroke();
		};
		x.beginPath();
		x.moveTo(X(-T.FX + 0.6), Z(0));
		x.lineTo(X(T.FX - 0.6), Z(0));
		x.stroke();
		x.beginPath();
		x.arc(X(0), Z(0), 5 * s, 0, Math.PI * 2);
		x.stroke();
		x.fillStyle = "rgba(244,246,249,0.72)";
		x.beginPath();
		x.arc(X(0), Z(0), 0.45 * s, 0, Math.PI * 2);
		x.fill();
		[-1, 1].forEach((sd) => {
			x.strokeRect(X(-9), sd > 0 ? Z(T.FZ - 0.6 - 7) : Z(-T.FZ + 0.6), 18 * s, 7 * s);
			x.strokeRect(X(-T.GW - 1.5), sd > 0 ? Z(T.FZ - 0.6 - 3) : Z(-T.FZ + 0.6), (T.GW + 1.5) * 2 * s, 3 * s);
			x.beginPath();
			x.arc(X(0), Z(sd * (T.FZ - 10)), 0.35 * s, 0, Math.PI * 2);
			x.fill();
		});
	});
}
/* points round the pitch wall (inner face), with the goal mouth's edges exactly on the path */
function tsWallPath() {
	const T = TS,
		pts = [],
		push = (x, z) => pts.push([x, z]),
		line = (x0, z0, x1, z1, step) => {
			const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step));
			for (let i = 0; i < n; i++) push(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n);
		},
		arc = (cx, cz, a0, a1) => {
			const n = 6;
			for (let i = 0; i < n; i++) {
				const a = a0 + ((a1 - a0) * i) / n;
				push(cx + Math.cos(a) * T.CR, cz + Math.sin(a) * T.CR);
			}
		},
		ix = T.FX - T.CR,
		iz = T.FZ - T.CR;
	/* the far end (-z): right corner to the mouth, the mouth, on to the left corner; then the left side, near end, right side */
	line(ix, -T.FZ, T.GW, -T.FZ, 2.2);
	line(T.GW, -T.FZ, -T.GW, -T.FZ, 9);
	line(-T.GW, -T.FZ, -ix, -T.FZ, 2.2);
	arc(-ix, -iz, -Math.PI / 2, -Math.PI);
	line(-T.FX, -iz, -T.FX, iz, 2.4);
	arc(-ix, iz, Math.PI, Math.PI / 2);
	line(-ix, T.FZ, -T.GW, T.FZ, 2.2);
	line(-T.GW, T.FZ, T.GW, T.FZ, 9);
	line(T.GW, T.FZ, ix, T.FZ, 2.2);
	arc(ix, iz, Math.PI / 2, 0);
	line(T.FX, iz, T.FX, -iz, 2.4);
	arc(ix, -iz, 0, -Math.PI / 2);
	return pts;
}

Object.assign(MG, {
	soccer: {
		name: "Truck Soccer",
		kind: "arena",
		ctrl: "stick",
		team: "2v2",
		hi: true,
		unit: "goals",
		dur: 240 /* only a safety limit: the match is first to TS.WIN goals */,
		bound: { t: "none" },
		water: false,
		bare: true,
		noAssist: true,
		camZoom: 1.1,
		/* snappier steering than the other stick games (arenaPhys: 32 / 2.6 / 10): about the same top speed, turns in half the time */
		acc: 60,
		damp: 5,
		turn: 16,
		sun: [13.9, 41, 12.1],
		lt: { amb: 0.42, sun: 0.7, warm: 0.3, haze: 50 },
		fx: { aa: 1 },
		/* the chip under the clock: your team live, the score at the end (results are your goals * 100 + theirs) */
		fmt: (W, e) => (e.side === 1 ? "🔴 Red team" : "🔵 Blue team"),
		fmtV: (v) => `${Math.floor(v / 100)}-${v % 100}`,
		ramK: 0.75 /* bumps between trucks a bit softer than Mud Brawl's rams */,
		how: "Push the ball into the other team's goal. First team to 3 goals wins!",
		teamHow: (s) => (s === 0 ? "Blue: score in the red goal." : "Red: score in the blue goal."),
		tvHint: "Drag to drive · hold BOOST to speed up (corner pads fill it) · JUMP, again in the air to flip",
		/* the BOOST button shows the meter (dark = empty), lit when there is enough for a dash */
		ramCd: (W) => 1 - Math.min(1, (W.me.bst ?? W.me.f.bs ?? 0) / TS.BMAX),
		ramReady: (W) => (W.me.bst ?? W.me.f.bs ?? 0) > 0,
		/* BOOST never rams (the tackle is soccer's own, in tackle) */
		canRam: () => false,
		ramLabel: "BOOST",
		btn2: () => "JUMP",
		/* where trucks line up for a kickoff: each team on its own half, side by side, facing the ball (j of n team mates) */
		spotAt(sd, j, n) {
			return {
				x: n <= 1 ? 0 : (j - (n - 1) / 2) * (n === 2 ? 12 : 6),
				z: (sd === 0 ? 1 : -1) * 11,
				yaw: sd === 0 ? Math.PI / 2 : -Math.PI / 2,
			};
		},
		spot(W, e) {
			const sd = e.side === 1 ? 1 : 0,
				mates = W.list.filter((o) => (o.side === 1 ? 1 : 0) === sd);
			return this.spotAt(sd, Math.max(0, mates.indexOf(e)), mates.length);
		},
		/* the trucks are made one by one (blue first, start3D sorts them), so the first spots come from the team list */
		spawn(W, i, n) {
			const tm = W.mg.tm,
				n0 = tm ? Object.values(tm).filter((s) => s === 0).length : Math.ceil(n / 2);
			return i < n0 ? this.spotAt(0, i, n0) : this.spotAt(1, i - n0, n - n0);
		},
		initEnt(W, e) {
			if (e.side === undefined) e.side = W.list.indexOf(e) % 2;
			e.f = { bl: null, gl: [], fp: null, st: 0, pk: [], bs: TS.BSTART };
			e.bst = TS.BSTART;
		},
		build(W) {
			const T = TS,
				s = W.sc;
			/* ground round the stadium, the pitch on it */
			const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), M("#3F7D3A"));
			ground.rotation.x = -Math.PI / 2;
			ground.position.y = -0.06;
			ground.receiveShadow = true;
			s.add(ground);
			const pitch = new THREE.Mesh(
				new THREE.PlaneGeometry(T.FX * 2, (T.FZ + T.GD) * 2),
				new THREE.MeshStandardMaterial({ map: tsPitchTex(), roughness: 0.95 }),
			);
			pitch.rotation.x = -Math.PI / 2;
			pitch.receiveShadow = true;
			s.add(pitch);
			this.walls(W);
			this.ramps(W);
			this.goals(W);
			this.stadium(W);
			this.pads(W);
			/* the ball and its shadow */
			W.ball = tsBallMesh();
			W.ball.position.set(0, T.BR, 0);
			s.add(W.ball);
			W.ballSh = roundShadow(T.BR * 2.1, 0.32, 0, 0, 0.04);
			s.add(W.ballSh);
			W.goals = [];
			W.bErr = new THREE.Vector3();
			W.bDraw = new THREE.Vector3(0, T.BR, 0);
			W.ballK = 0;
			W.koT = 0;
		},
		/* the wall round the pitch: a dark kerb with a team-coloured lip, glass above it in steel frames; open under the
		   crossbar at each goal mouth */
		walls(W) {
			const T = TS,
				s = W.sc,
				P = tsWallPath(),
				glass = new THREE.MeshStandardMaterial({
					color: "#CFE9FF",
					transparent: true,
					opacity: 0.22,
					depthWrite: false,
					side: THREE.DoubleSide,
					roughness: 0.1,
				}),
				gv = [];
			for (let i = 0; i < P.length; i++) {
				const [x0, z0] = P[i],
					[x1, z1] = P[(i + 1) % P.length],
					len = Math.hypot(x1 - x0, z1 - z0),
					mx = (x0 + x1) / 2,
					mz = (z0 + z1) / 2,
					ang = Math.atan2(z1 - z0, x1 - x0),
					/* outward normal (the path runs clockwise seen from above) */
					on = [Math.sin(ang), -Math.cos(ang)],
					nl = Math.hypot(mx, mz) || 1,
					sg = on[0] * mx + on[1] * mz > 0 ? 1 : -1,
					ox = on[0] * sg,
					oz = on[1] * sg,
					mouth = Math.abs(mz) > T.FZ - 0.01 && Math.abs(mx) < T.GW,
					lo = mouth ? T.GH : 0,
					team = mz > 0 ? "#2F7DE1" : "#E5484D";
				if (!mouth) {
					const k = B(len + 0.08, T.KERB, 0.5, "#2F3644", mx + ox * 0.25, T.KERB / 2, mz + oz * 0.25);
					k.rotation.y = -ang;
					s.add(k);
					const lip = B(len + 0.08, 0.14, 0.62, team, mx + ox * 0.25, T.KERB + 0.07, mz + oz * 0.25);
					lip.rotation.y = -ang;
					s.add(lip);
				} else {
					/* over the goal: a team-coloured beam carrying the glass */
					const bm = B(len, 0.5, 0.5, team, mx + ox * 0.25, T.GH + 0.5, mz + oz * 0.25);
					bm.rotation.y = -ang;
					s.add(bm);
				}
				const y0 = mouth ? T.GH + 0.75 : T.KERB + 0.14;
				gv.push(x0, y0, z0, x1, y0, z1, x1, T.WALL, z1, x0, y0, z0, x1, T.WALL, z1, x0, T.WALL, z0);
				/* top rail and a post at every joint */
				const rail = B(len + 0.06, 0.16, 0.2, "#C9CED8", mx, T.WALL, mz);
				rail.rotation.y = -ang;
				s.add(rail);
				s.add(Cy(0.09, 0.09, T.WALL - lo, 6, "#8C95A5", x0, lo + (T.WALL - lo) / 2, z0));
			}
			const gg = new THREE.BufferGeometry();
			gg.setAttribute("position", new THREE.Float32BufferAttribute(gv, 3));
			gg.computeVertexNormals();
			const gm = new THREE.Mesh(gg, glass);
			gm.renderOrder = 3;
			/* kept on W so the scene merge leaves the transparent glass alone */
			W.glass = gm;
			s.add(gm);
		},
		/* the quarter pipes along the walls (not across the goal mouths): turf swept along the wall path, a cap where they
		   end beside each goal, a team-coloured lip along the top */
		ramps(W) {
			const T = TS,
				R = T.RR,
				P = tsWallPath(),
				NA = 10,
				pos = [],
				cap = [],
				nrm = (x, z) => {
					const E = tsEdge(x + (x > 0 ? -0.01 : 0.01), z) || { nx: 0, nz: z > 0 ? 1 : -1 };
					return [E.nx, E.nz];
				},
				pt = (x, z, n, a) => {
					const d = R * (1 - Math.sin(a));
					return [x - n[0] * d, R * (1 - Math.cos(a)), z - n[1] * d];
				};
			for (let i = 0; i < P.length; i++) {
				const [x0, z0] = P[i],
					[x1, z1] = P[(i + 1) % P.length],
					mx = (x0 + x1) / 2,
					mz = (z0 + z1) / 2;
				if (Math.abs(mz) > T.FZ - 0.01 && Math.abs(mx) < T.GW) continue;
				const n0 = nrm(x0, z0),
					n1 = nrm(x1, z1);
				for (let j = 0; j < NA; j++) {
					const a0 = (j / NA) * (Math.PI / 2),
						a1 = ((j + 1) / NA) * (Math.PI / 2),
						A = pt(x0, z0, n0, a0),
						B2 = pt(x1, z1, n1, a0),
						C = pt(x1, z1, n1, a1),
						D = pt(x0, z0, n0, a1);
					pos.push(...A, ...B2, ...C, ...A, ...C, ...D);
				}
				/* the team-coloured lip along the top */
				const len = Math.hypot(x1 - x0, z1 - z0),
					lip = B(len + 0.06, 0.22, 0.34, mz > 0 ? "#2F7DE1" : "#E5484D", mx, R + 0.11, mz);
				lip.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
				W.sc.add(lip);
			}
			/* caps beside the goal mouths: the quarter-circle profile, filled */
			[-1, 1].forEach((sx) =>
				[-1, 1].forEach((sz) => {
					const x = sx * T.GW,
						z = sz * T.FZ,
						n = [0, sz];
					for (let j = 0; j < NA; j++) {
						const a0 = (j / NA) * (Math.PI / 2),
							a1 = ((j + 1) / NA) * (Math.PI / 2);
						cap.push(x, 0, z, ...pt(x, z, n, a0), ...pt(x, z, n, a1));
					}
				}),
			);
			const mk = (arr, col) => {
				const g = new THREE.BufferGeometry();
				g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
				g.computeVertexNormals();
				const m = new THREE.Mesh(
					g,
					new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, side: THREE.DoubleSide }),
				);
				m.receiveShadow = true;
				W.sc.add(m);
				return m;
			};
			mk(pos, "#5C9A4E");
			mk(cap, "#3E6B37");
		},
		/* each goal: posts and crossbar in the defending team's colour, nets on the sides, back and roof, a glow strip */
		goals(W) {
			const T = TS,
				s = W.sc,
				net = canvasTex(128, 128, (x, w, h) => {
					x.clearRect(0, 0, w, h);
					x.strokeStyle = "rgba(244,246,249,0.9)";
					x.lineWidth = 3;
					for (let i = 0; i <= 8; i++) {
						x.beginPath();
						x.moveTo((i * w) / 8, 0);
						x.lineTo((i * w) / 8, h);
						x.moveTo(0, (i * h) / 8);
						x.lineTo(w, (i * h) / 8);
						x.stroke();
					}
				});
			net.wrapS = net.wrapT = THREE.RepeatWrapping;
			[
				[1, "#2F7DE1"],
				[-1, "#E5484D"],
			].forEach(([sd, col]) => {
				const z = sd * T.FZ,
					zb = sd * (T.FZ + T.GD),
					g = new THREE.Group();
				[-1, 1].forEach((sx) => g.add(Cy(0.24, 0.24, T.GH, 10, col, sx * T.GW, T.GH / 2, z)));
				const bar = Cy(0.24, 0.24, T.GW * 2 + 0.48, 10, col, 0, T.GH, z);
				bar.rotation.z = Math.PI / 2;
				g.add(bar);
				/* the frame round the back of the net */
				[-1, 1].forEach((sx) => g.add(B(0.18, T.GH, 0.18, "#C9CED8", sx * T.GW, T.GH / 2, zb)));
				g.add(B(T.GW * 2, 0.18, 0.18, "#C9CED8", 0, T.GH, zb));
				[-1, 1].forEach((sx) => g.add(B(0.18, 0.18, T.GD, "#C9CED8", sx * T.GW, T.GH, (z + zb) / 2)));
				const nm = (wd, ht, rep) => {
					const t = net.clone();
					t.needsUpdate = true;
					t.repeat.set(rep[0], rep[1]);
					return new THREE.Mesh(
						new THREE.PlaneGeometry(wd, ht),
						new THREE.MeshStandardMaterial({
							map: t,
							transparent: true,
							side: THREE.DoubleSide,
							depthWrite: false,
							alphaTest: 0.05,
						}),
					);
				};
				const back = nm(T.GW * 2, T.GH, [3, 1.5]);
				back.position.set(0, T.GH / 2, zb);
				g.add(back);
				[-1, 1].forEach((sx) => {
					const sn = nm(T.GD, T.GH, [1.2, 1.5]);
					sn.rotation.y = Math.PI / 2;
					sn.position.set(sx * T.GW, T.GH / 2, (z + zb) / 2);
					g.add(sn);
				});
				const roof = nm(T.GW * 2, T.GD, [3, 1.2]);
				roof.rotation.x = Math.PI / 2;
				roof.position.set(0, T.GH, (z + zb) / 2);
				g.add(roof);
				/* a glowing strip along the goal line */
				const strip = new THREE.Mesh(
					new THREE.PlaneGeometry(T.GW * 2, 0.35),
					new THREE.MeshBasicMaterial({
						color: col,
						transparent: true,
						opacity: 0.85,
						depthWrite: false,
						polygonOffset: true,
						polygonOffsetFactor: -2,
					}),
				);
				strip.rotation.x = -Math.PI / 2;
				strip.position.set(0, 0.03, z);
				g.add(strip);
				g.traverse((o) => (o.userData.dyn = true));
				W["goal" + (sd > 0 ? 0 : 1)] = g;
				s.add(g);
			});
		},
		/* stands with a crowd along both long sides, end stands, floodlight masts in the corners, the scoreboard over
		   the far goal */
		stadium(W) {
			const T = TS,
				s = W.sc;
			grandstands(W, T.FX * 2 + 1.2, T.FZ + 7, -T.FZ - 7);
			/* end stands behind the goals: tiers in the team colours */
			[1, -1].forEach((sd) => {
				for (let r = 0; r < 4; r++) {
					const h = 0.8 + r * 0.7,
						z = sd * (T.FZ + T.GD + 2.4 + r * 1.3),
						st = B(T.FX * 2 + 4, h, 1.3, r % 2 ? "#8C95A5" : "#A3ACBB", 0, h / 2, z);
					st.castShadow = false;
					s.add(st);
				}
				const back = B(T.FX * 2 + 6, 5.2, 0.5, sd > 0 ? "#2F7DE1" : "#E5484D", 0, 2.6, sd * (T.FZ + T.GD + 7.6));
				back.castShadow = false;
				s.add(back);
			});
			/* floodlight masts: a lattice-ish pole and a tilted bank of lamps facing the pitch */
			[
				[1, 1],
				[1, -1],
				[-1, 1],
				[-1, -1],
			].forEach(([sx, sz]) => {
				const x = sx * (T.FX + 9),
					z = sz * (T.FZ + 6),
					g = new THREE.Group();
				g.add(Cy(0.45, 0.6, 16, 8, "#5A6272", 0, 8, 0));
				for (let k = 0; k < 4; k++) g.add(Cy(0.62, 0.62, 0.2, 8, "#8C95A5", 0, 3 + k * 3.5, 0));
				const head = new THREE.Group();
				head.add(B(4.2, 2.4, 0.4, "#3A3F48", 0, 0, 0));
				for (let a = 0; a < 3; a++)
					for (let b = 0; b < 2; b++) {
						const l = new THREE.Mesh(
							new THREE.CylinderGeometry(0.42, 0.42, 0.2, 10),
							new THREE.MeshStandardMaterial({ color: "#FFF6D8", emissive: "#FFE9A8", emissiveIntensity: 1.4 }),
						);
						l.rotation.x = Math.PI / 2;
						l.position.set(-1.3 + a * 1.3, -0.55 + b * 1.1, 0.26);
						head.add(l);
					}
				head.position.y = 16.6;
				head.rotation.y = Math.atan2(-x, -z);
				head.rotation.x = 0.35;
				g.add(head);
				g.position.set(x, 0, z);
				s.add(g);
				s.add(roundShadow(2.2, 0.3, x, z, 0.02));
			});
			/* the scoreboard over the far goal, facing the cameras (on the TV, which looks from the side: over the far
			   stand) */
			const sb = new THREE.Group(),
				cv = document.createElement("canvas");
			cv.width = 512;
			cv.height = 160;
			const tex = new THREE.CanvasTexture(cv);
			sb.add(B(13.4, 4.4, 0.6, "#23272F", 0, 0, -0.32));
			sb.add(B(13.8, 0.3, 0.8, "#C9CED8", 0, 2.35, -0.3), B(13.8, 0.3, 0.8, "#C9CED8", 0, -2.35, -0.3));
			const scr = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 3.9), new THREE.MeshBasicMaterial({ map: tex }));
			scr.position.z = 0.02;
			sb.add(scr);
			[-1, 1].forEach((sx) => sb.add(B(0.5, 8, 0.5, "#5A6272", sx * 5, -6, -0.6)));
			sb.rotation.order = "YXZ";
			sb.traverse((o) => (o.userData.dyn = true));
			s.add(sb);
			W.sbd = { cv, tex, key: "", g: sb };
			this.boardAt(W, !!W.tv);
			this.board(W);
		},
		/* the boost pads: a dark plate with an orange glowing ring, an orb floating over it while it is ready */
		pads(W) {
			const glow = new THREE.MeshBasicMaterial({ color: "#FFB52E" }),
				orbM = new THREE.MeshBasicMaterial({ color: "#FFD15C" });
			W.pads = TS.PADS.map(([x, z]) => {
				const g = new THREE.Group();
				g.add(Cy(1.5, 1.6, 0.12, 24, "#2F3644", 0, 0.06, 0));
				const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.12, 6, 28), glow.clone());
				ring.rotation.x = Math.PI / 2;
				ring.position.y = 0.14;
				g.add(ring);
				const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), orbM);
				orb.position.y = 1.1;
				g.add(orb);
				const halo = new THREE.Mesh(
					new THREE.CylinderGeometry(1.1, 1.1, 2.2, 20, 1, true),
					new THREE.MeshBasicMaterial({
						color: "#FFB52E",
						transparent: true,
						opacity: 0.16,
						depthWrite: false,
						side: THREE.DoubleSide,
					}),
				);
				halo.position.y = 1.1;
				g.add(halo);
				g.position.set(x, 0, z);
				g.traverse((o) => (o.userData.dyn = true));
				W.sc.add(g);
				return { x, z, g, ring, orb, halo, ready: 0 };
			});
		},
		/* when each pad is back: from every truck's pick-ups (e.f.pk = [[pad, t]]), in time order, one per PADT s */
		padState(W) {
			const all = [];
			W.list.forEach((e) => (e.f && Array.isArray(e.f.pk) ? e.f.pk : []).forEach((q) => all.push(q)));
			all.sort((a, b) => a[1] - b[1]);
			W.pads.forEach((pd) => (pd.ready = 0));
			all.forEach(([i, t]) => {
				const pd = W.pads[i];
				if (pd && t >= pd.ready) pd.ready = t + TS.PADT;
			});
		},
		/* a local truck over a ready pad fills its meter */
		padPick(W, e) {
			if (e.bst >= TS.BMAX) return;
			W.pads.forEach((pd, i) => {
				if (W.t < pd.ready || Math.hypot(e.x - pd.x, e.z - pd.z) > TS.PADR || (e.y || 0) > 2) return;
				e.f.pk = e.f.pk.concat([[i, Math.round(W.t * 1000) / 1000]]).slice(-8);
				pd.ready = W.t + TS.PADT;
				e.bst = TS.BMAX;
				e.f.pg = Math.round(W.t * 1000) / 1000;
				if (e.isMe) sfx("coin");
				mgLog(W, `pad ${i} ${mgName(e)}`);
			});
		},
		/* the pads drawn: the orb bobs and spins while ready, gone (the ring dim) while it comes back */
		padFx(W) {
			W.pads.forEach((pd, i) => {
				const on = W.t >= pd.ready;
				pd.orb.visible = pd.halo.visible = on;
				pd.orb.position.y = 1.1 + Math.sin(W.t * 2.4 + i) * 0.15;
				pd.orb.rotation.y = W.t * 1.8;
				pd.ring.material.color.set(on ? "#FFB52E" : "#5A4A2A");
			});
		},
		/* boost on the truck: flames out of its back while boosting (local, or the shared boost flag), an orange glow
		   swelling round it when it takes a pad (e.f.pg = when) */
		boostFx(W, e) {
			if (!e.bfx) {
				const q = e.tr.quaternion.clone(),
					p0 = e.tr.position.clone();
				e.tr.quaternion.identity();
				e.tr.position.set(0, 0, 0);
				e.g.updateMatrixWorld(true);
				const bx = new THREE.Box3().setFromObject(e.tr),
					sc = e.tr.scale.x || 1;
				e.tr.quaternion.copy(q);
				e.tr.position.copy(p0);
				const rear = (bx.min.x - e.g.position.x) / sc,
					hy = ((bx.max.y - e.g.position.y) * 0.32) / sc,
					fl = new THREE.Group(),
					add = (r, h, c, z, op) => {
						const m = new THREE.Mesh(
							new THREE.ConeGeometry(r, h, 10),
							new THREE.MeshBasicMaterial({
								color: c,
								transparent: true,
								opacity: op,
								depthWrite: false,
								blending: THREE.AdditiveBlending,
							}),
						);
						m.rotation.z = Math.PI / 2;
						m.position.set(-h / 2, 0, z);
						fl.add(m);
					};
				[-0.35, 0.35].forEach((z) => {
					add(0.3, 1.4, "#FF7A1A", z, 0.85);
					add(0.17, 0.9, "#FFE27A", z, 1);
				});
				fl.position.set(rear, hy, 0);
				fl.visible = false;
				e.tr.add(fl);
				const glow = new THREE.Mesh(
					new THREE.SphereGeometry(1.6, 18, 12),
					new THREE.MeshBasicMaterial({
						color: "#FFB52E",
						transparent: true,
						opacity: 0,
						depthWrite: false,
						blending: THREE.AdditiveBlending,
					}),
				);
				glow.position.y = 0.8;
				glow.visible = false;
				e.g.add(glow);
				e.bfx = { fl, glow };
			}
			const on = e.boostT > 0 && !e.gone && W.t >= 0;
			e.bfx.fl.visible = on;
			if (on) e.bfx.fl.scale.set(0.8 + Math.random() * 0.45, 0.9 + Math.random() * 0.2, 1);
			const a = W.t - ((e.f && e.f.pg) || -9),
				g = e.bfx.glow;
			g.visible = a >= 0 && a < 0.6;
			if (g.visible) {
				g.scale.setScalar(0.8 + a * 1.6);
				g.material.opacity = 0.55 * (1 - a / 0.6);
			}
		},
		/* the boost bar over a truck (its meter: its own, or the shared e.f.bs) */
		boostBar(W, e) {
			if (!e.bbar) {
				const mk = (c, o) => {
					const sp = new THREE.Sprite(
						new THREE.SpriteMaterial({ color: c, depthTest: false, transparent: true, opacity: o }),
					);
					sp.renderOrder = 10;
					sp.position.y = 2.05;
					e.g.add(sp);
					return sp;
				};
				e.bbar = { bg: mk("#10161F", 0.75), fill: mk("#FFB52E", 1) };
				e.bbar.bg.scale.set(1.5, 0.16, 1);
			}
			const v = Math.max(0, Math.min(1, (e.local ? e.bst : e.f.bs || 0) / TS.BMAX)),
				f = e.bbar.fill;
			f.visible = v > 0.01 && !e.gone;
			e.bbar.bg.visible = !e.gone;
			if (f.visible) {
				f.scale.set(1.4 * v, 0.1, 1);
				f.center.set(0.5 / v, 0.5);
			}
		},
		/* the scoreboard faces the camera: over the far goal, or over the far stand when the view is from the side */
		boardAt(W, side) {
			const S = W.sbd,
				T = TS;
			if (!S || S.side === side) return;
			S.side = side;
			if (side) {
				S.g.rotation.set(0.12, Math.PI / 2, 0);
				S.g.position.set(-(T.FX + 14), 13, 0);
			} else {
				S.g.rotation.set(0.12, 0, 0);
				S.g.position.set(0, 10.5, -(T.FZ + T.GD + 8.4));
			}
		},
		/* the scoreboard's picture: BLUE 2 – 1 RED */
		board(W) {
			const S = W.sbd,
				g = W.goals || [],
				a = g.filter((q) => q[1] === 0).length,
				b = g.filter((q) => q[1] === 1).length,
				key = a + ":" + b;
			if (!S || S.key === key) return;
			S.key = key;
			const x = S.cv.getContext("2d"),
				w = S.cv.width,
				h = S.cv.height;
			x.fillStyle = "#151B24";
			x.fillRect(0, 0, w, h);
			x.fillStyle = "#2F7DE1";
			x.fillRect(0, 0, w * 0.34, h);
			x.fillStyle = "#E5484D";
			x.fillRect(w * 0.66, 0, w * 0.34, h);
			x.font = "28px Bungee, 'Arial Black', Impact, sans-serif";
			x.textAlign = "center";
			x.textBaseline = "middle";
			x.fillStyle = "#F4F6F9";
			x.fillText("BLUE", w * 0.17, h / 2);
			x.fillText("RED", w * 0.83, h / 2);
			x.font = "88px Bungee, 'Arial Black', Impact, sans-serif";
			x.fillStyle = "#FFC83D";
			x.fillText(a + "-" + b, w / 2, h / 2 + 6);
			S.tex.needsUpdate = true;
		},
		/* the truck physics, walled in; before a kickoff the trucks wait on their spots */
		phys(W, e, inp, dt) {
			if (W.koT > 0 && W.t < W.koT && W.t > W.koT - TS.HOLD) {
				if (!e.spotted) {
					e.spotted = true;
					const p = this.spot(W, e);
					e.x = p.x;
					e.z = p.z;
					e.yaw = p.yaw;
				}
				e.vx = e.vz = e.vy = e.y = 0;
				e.air = false;
				e.boostT = 0;
				e.bst = TS.BSTART;
				e.f.bs = TS.BSTART;
				e.f.st = 0;
				if (inp) inp.b2 = false;
				return;
			}
			e.spotted = false;
			/* the TV and landscape screens look at the pitch from the side (cam, W.sideV): a player's stick turns with it
			   (screen right = -z, screen up = -x); the button flags are handed back so they still fire once */
			const raw = ((W.tv && e.rem) || (!W.tv && e.isMe && W.sideV)) && inp;
			if (raw) inp = Object.assign({}, raw, { x: raw.y, y: -raw.x });
			this.drive(W, e, inp, dt);
			if (raw) {
				raw.boost = inp.boost;
				raw.b2 = inp.b2;
			}
		},
		drive(W, e, inp, dt) {
			/* tackles on this truck (sent by the tackler's device), then the stun: no input; its end is shared (e.f.st)
			   for the stars */
			this.tackled(W, e);
			if (e.f.st > 0 && W.t < e.f.st) {
				if (inp) inp.boost = inp.b2 = false;
				inp = { x: 0, y: 0, boost: false, b2: false, hold: false };
			}
			/* BOOST is held (no dash): boostT marks it (the engine's faster top speed and the shared flag for the flames);
			   letting go slides it back down to normal speed instead of snapping */
			if (inp) inp.boost = false;
			const boosting = !!(inp && inp.hold) && e.bst > 0 && e.al && !e.d;
			if (boosting) e.boostT = 0.12;
			else if (e.boosting) e.slideT = Math.max(e.slideT || 0, 0.6);
			e.boosting = boosting;
			const jump = !!(inp && inp.b2);
			if (inp) inp.b2 = false;
			if (jump && e.al && !e.d) this.jump(W, e, inp);
			const yaw0 = e.yaw,
				sp0 = Math.hypot(e.vx, e.vz);
			if (e.air) this.airPhys(W, e, inp, dt);
			else {
				arenaPhys(W, e, inp, dt);
				this.rampRide(W, e, dt, yaw0);
			}
			/* not boosting, the stick never takes it past normal speed: after a boost, a knock or a blast (the engine's
			   slide, which allows 23 m/s) it only slows back down */
			const sp1 = Math.hypot(e.vx, e.vz),
				cap = Math.max(TS.NORMV, sp0);
			if (!boosting && sp1 > cap) {
				e.vx *= cap / sp1;
				e.vz *= cap / sp1;
			}
			if (boosting) {
				this.boostPush(W, e, inp, dt);
				this.tackle(W, e);
			}
			this.padPick(W, e);
			e.f.bs = Math.round(e.bst);
			/* the ramps let a truck right up to the wall; only round the goal mouths it keeps its own width off them */
			const T = TS,
				mouth = Math.abs(e.x) < T.GW + 1.5 && Math.abs(e.z) > T.FZ - 2.5,
				c = tsClamp(e.x, e.z, mouth ? e.rad || 0.95 : 0.12, false, 0);
			if (c) {
				e.x = c.x;
				e.z = c.z;
				const vn = e.vx * c.nx + e.vz * c.nz;
				if (vn > 0) {
					const k = mouth ? 1.5 : 1;
					e.vx -= k * vn * c.nx;
					e.vz -= k * vn * c.nz;
				}
			}
		},
		/* holding BOOST: a push the way the stick points (or forward), harder in a straight line than the engine's
		   steering; in the air also up (an aerial); the meter drains */
		boostPush(W, e, inp, dt) {
			const T = TS;
			let dx = inp.x,
				dz = inp.y,
				l = Math.hypot(dx, dz);
			if (l < 0.3) {
				dx = Math.cos(e.yaw);
				dz = -Math.sin(e.yaw);
				l = 1;
			}
			dx /= l;
			dz /= l;
			const a = e.air ? T.BAIR : T.BACC;
			e.vx += dx * a * dt;
			e.vz += dz * a * dt;
			if (e.air) e.vy += T.BLIFT * dt;
			const sp = Math.hypot(e.vx, e.vz);
			if (sp > T.BTOP) {
				e.vx *= T.BTOP / sp;
				e.vz *= T.BTOP / sp;
			}
			e.bst = Math.max(0, e.bst - T.BDRAIN * dt);
		},
		/* boosting fast into a truck of the other team: a tackle, shared as e.f.tk = [[its key, t, push x, push z]] for
		   its own device to apply (tackled); once a stun per truck */
		tackle(W, e) {
			const T = TS,
				r3 = (v) => Math.round(v * 1000) / 1000;
			if (Math.hypot(e.vx, e.vz) < T.TACKV) return;
			W.list.forEach((o) => {
				if (o === e || o.gone || !o.al || (o.side === 1 ? 1 : 0) === (e.side === 1 ? 1 : 0)) return;
				const dx = o.x - e.x,
					dz = o.z - e.z,
					d = Math.hypot(dx, dz) || 0.01;
				if (d > (e.rad || 0.95) + (o.rad || 0.95) + 0.25 || Math.abs((o.y || 0) - (e.y || 0)) > 1.5) return;
				if (dx * e.vx + dz * e.vz <= 0) return;
				e.tkT = e.tkT || {};
				if (W.t - (e.tkT[o.k] ?? -9) < T.STUN + 0.3) return;
				e.tkT[o.k] = W.t;
				e.f.tk = (e.f.tk || []).concat([[o.k, r3(W.t), r3((dx / d) * T.TACKK), r3((dz / d) * T.TACKK)]]).slice(-6);
				e.vx *= 0.7;
				e.vz *= 0.7;
				if (e.isMe || W.tv) W.shake = Math.max(W.shake || 0, 0.35);
				sfx("ram");
				hitFx(o, e);
				mgLog(W, `tackle by ${mgName(e)} on ${mgName(o)}`);
			});
		},
		/* tackles on a truck of this device: knocked away and up, stunned STUN s */
		tackled(W, e) {
			e.tkSeen = e.tkSeen || {};
			W.list.forEach((a) => {
				const L = a.f && a.f.tk;
				if (!Array.isArray(L)) return;
				L.forEach((q) => {
					if (!Array.isArray(q) || q[0] !== e.k) return;
					const id = a.k + ":" + q[1];
					if (e.tkSeen[id]) return;
					e.tkSeen[id] = 1;
					if (W.t - q[1] > 1.5 || !e.al || e.d) return;
					e.vx += +q[2] || 0;
					e.vz += +q[3] || 0;
					e.slideT = 1;
					if (!e.air) {
						e.air = true;
						e.y = Math.max(e.y || 0, 0.01);
						e.vy = 4;
					}
					e.flipOk = false;
					e.f.st = Math.round(Math.max(e.f.st || 0, W.t + TS.STUN) * 1000) / 1000;
					if (e.isMe) W.shake = 0.5;
					if (!a.local) hitFx(e, a);
					sfx("stun");
					mgLog(W, `tackle on ${mgName(e)} by ${mgName(a)}`);
				});
			});
		},
		/* on the ground near a wall: up the ramp (gravity pulls it back down the slope, steeper = harder), heading kept on
		   the steep part so it rolls back down tail first like a skater; still going out at the lip = launched straight up */
		rampRide(W, e, dt, yaw0) {
			const T = TS,
				E = tsEdge(e.x, e.z);
			if (!E || E.d >= T.RR) {
				e.y = 0;
				return;
			}
			const u = Math.min(1, (T.RR - Math.max(0, E.d)) / T.RR),
				cs = Math.sqrt(Math.max(0, 1 - u * u)),
				a = (T.TGRAV * u) / Math.max(0.3, cs);
			e.vx -= E.nx * a * dt;
			e.vz -= E.nz * a * dt;
			e.y = tsRampY(E.d);
			if (u > 0.3) e.yaw = yaw0;
			const vo = e.vx * E.nx + e.vz * E.nz;
			if (u > 0.88 && vo > 0.5) {
				e.vx -= E.nx * vo;
				e.vz -= E.nz * vo;
				e.air = true;
				e.vy = Math.min(T.LAUNCHMAX, vo * T.LAUNCHK + 2);
				e.flipOk = true;
				e.jumpT = W.t;
				mgLog(W, `launch ${mgName(e)} ${Math.round(e.vy)} m/s`);
			}
		},
		/* JUMP on the ground hops; again in the air (once, within FLIPWIN s) flips the way the stick points, or forward.
		   The flip's start is shared (e.f.fp) so every device draws the spin; the height travels with the truck's y */
		jump(W, e, inp) {
			const T = TS;
			if (!e.air) {
				e.air = true;
				e.vy = T.JUMP;
				/* on a ramp: off its surface (on the vertical part straight out from the wall, into the pitch) */
				const E = (e.y || 0) > 0.02 && tsEdge(e.x, e.z);
				if (E && E.d < T.RR) {
					const u = Math.min(1, (T.RR - Math.max(0, E.d)) / T.RR);
					e.vx -= E.nx * u * T.JUMP;
					e.vz -= E.nz * u * T.JUMP;
					e.vy = T.JUMP * Math.max(0.35, Math.sqrt(1 - u * u));
				}
				e.y = Math.max(e.y || 0, 0.01);
				e.flipOk = true;
				e.jumpT = W.t;
				if (e.isMe || W.tv) sfx("whoosh");
				mgLog(W, `jump ${mgName(e)}`);
				return;
			}
			if (!e.flipOk || W.t - e.jumpT > T.FLIPWIN) return;
			e.flipOk = false;
			let dx = inp ? inp.x : 0,
				dz = inp ? inp.y : 0,
				l = Math.hypot(dx, dz);
			if (l < 0.3) {
				dx = Math.cos(e.yaw);
				dz = -Math.sin(e.yaw);
				l = 1;
			}
			dx /= l;
			dz /= l;
			e.vx = e.vx * 0.4 + dx * T.FLIPV;
			e.vz = e.vz * 0.4 + dz * T.FLIPV;
			e.vy = Math.max(e.vy * 0.3, 2);
			e.yaw = Math.atan2(-dz, dx);
			e.flipT = W.t;
			e.flipD = [dx, dz];
			e.f.fp = [Math.round(W.t * 1000) / 1000];
			if (e.isMe || W.tv) sfx("whoosh");
			mgLog(W, `flip ${mgName(e)}`);
		},
		/* in the air: gravity, a little steering, BOOST = an aerial push up and forward; landing puts it back on the
		   ground physics */
		airPhys(W, e, inp, dt) {
			const T = TS;
			if (inp && e.al && !e.d) {
				e.vx += inp.x * T.AIRC * dt;
				e.vz += inp.y * T.AIRC * dt;
			}
			e.bcd = Math.max(0, e.bcd - dt);
			e.boostT = Math.max(0, e.boostT - dt);
			e.vy -= T.TGRAV * dt;
			e.x += e.vx * dt;
			e.z += e.vz * dt;
			e.y += e.vy * dt;
			const sp = Math.hypot(e.vx, e.vz);
			if (sp > 23) {
				e.vx *= 23 / sp;
				e.vz *= 23 / sp;
			}
			if (sp > 0.6 && !(W.t - (e.flipT || -9) < T.FLIPDUR))
				e.yaw = lerpA(e.yaw, Math.atan2(-e.vz, e.vx), Math.min(1, dt * 4));
			/* down on the floor or a ramp: on a ramp the fall turns into speed down the slope */
			const gy = tsGround(e.x, e.z);
			if (e.y <= gy) {
				if (gy > 0.01) {
					const E = tsEdge(e.x, e.z),
						u = Math.min(1, (T.RR - Math.max(0, E.d)) / T.RR),
						push = -e.vy * u * 0.9;
					e.vx -= E.nx * push;
					e.vz -= E.nz * push;
				}
				e.y = gy;
				e.vy = 0;
				e.air = false;
				if (e.isMe) sfx("land");
			}
		},
		/* goals so far (the union of everyone's announcements, the earliest per kickoff, in order) */
		goalList(W) {
			const by = {};
			W.list.forEach((e) => {
				const gl = e.f && e.f.gl;
				if (Array.isArray(gl))
					gl.forEach((g) => {
						if (Array.isArray(g) && (!by[g[0]] || g[2] < by[g[0]][2] || (g[2] === by[g[0]][2] && g[1] < by[g[0]][1])))
							by[g[0]] = g;
					});
			});
			const out = [];
			while (by[out.length]) out.push(by[out.length]);
			return out;
		},
		/* the newest kick of the current kickoff (or the kickoff itself: the ball resting on the centre spot) */
		launch(W) {
			const T = TS,
				k = W.ballK;
			let L = { id: "ko" + k, t: W.koT, x: 0, y: T.BR, z: 0, vx: 0, vy: 0, vz: 0, by: null };
			W.list.forEach((e) => {
				const b = e.f && e.f.bl;
				if (!Array.isArray(b) || b[0] !== k || !(b[2] >= W.koT)) return;
				if (b[2] > L.t || (b[2] === L.t && L.by !== null && e.k > L.by))
					L = { id: e.k + ":" + b[1], t: b[2], x: b[3], y: b[4], z: b[5], vx: b[6], vy: b[7], vz: b[8], by: e.k };
			});
			return L;
		},
		/* once a frame: goals, kickoff, the ball along its path, goal announcements, the ball drawn */
		tick(W, dt) {
			const T = TS,
				goals = this.goalList(W);
			this.padState(W);
			this.padFx(W);
			this.boomFx(W);
			if (goals.length > W.goals.length) goals.slice(W.goals.length).forEach((g) => this.scored(W, g));
			W.goals = goals;
			this.board(W);
			/* the winning goal: no more kickoffs, the ball goes, the trucks drive about for WINWAIT s, then it's over
			   (the goal's time is shared, so every device ends together) */
			const sc0 = goals.filter((q) => q[1] === 0).length,
				sc1 = goals.length - sc0;
			if (Math.max(sc0, sc1) >= T.WIN) {
				const gt = goals[goals.length - 1][2];
				W.koT = Infinity;
				if (W.bsim) this.drawBall(W, dt);
				if (W.t - gt > 0.35 && W.ball.visible) {
					W.ball.visible = W.ballSh.visible = false;
					if (W.bsim && !W.bsim.boom) {
						W.bsim.boom = true;
						burst(W.sc, W.bDraw.x, W.bDraw.y, W.bDraw.z, {
							n: 18,
							shape: "ico",
							cols: ["#F4F6F9", "#2A2F3A", "#FFC83D"],
							spd: 6,
							up: 5,
							grav: 10,
							life: 1,
							size: 1,
						});
					}
				}
				if (W.t - gt >= T.WINWAIT)
					W.list.forEach((e) => {
						if (e.local && !e.gone && !e.d) e.d = true;
					});
				return;
			}
			W.ballK = goals.length;
			W.koT = goals.length ? goals[goals.length - 1][2] + T.KO : 0;
			const L = this.launch(W);
			let S = W.bsim;
			if (!S || S.id !== L.id) {
				const old = S && S.s;
				S = W.bsim = {
					id: L.id,
					L,
					n: 0,
					s: { x: L.x, y: L.y, z: L.z, vx: L.vx, vy: L.vy, vz: L.vz },
					goal: -1,
					gT: 0,
				};
				/* a remote kick that moves the ball: ease the drawn ball over (after the steps below) instead of jumping */
				S.ease = !!(old && L.by && !(W.ents[L.by] && W.ents[L.by].local));
				if (!L.by) W.bErr.set(0, 0, 0);
			}
			let steps = 0;
			while (S.goal < 0 && S.L.t + (S.n + 1) * T.H <= W.t && steps++ < 900) {
				S.n++;
				S.goal = tsStep(S.s);
				if (S.goal >= 0) S.gT = Math.round((S.L.t + S.n * T.H) * 1000) / 1000;
			}
			W.bs = S.s;
			if (S.ease) {
				S.ease = false;
				W.bErr.set(W.bDraw.x - S.s.x, W.bDraw.y - S.s.y, W.bDraw.z - S.s.z);
			}
			/* a goal in my copy: announced by the kicker's device, or by the host if nobody has yet */
			if (S.goal >= 0 && goals.length === W.ballK) {
				const kk = S.L.by && W.ents[S.L.by],
					mine = kk && kk.local && !kk.gone,
					late = W.sim && W.t - S.gT > T.GOALWAIT,
					pub = mine ? kk : late ? W.list.find((o) => o.local && !o.gone) : null;
				if (pub && !pub.f.gl.some((g) => g[0] === W.ballK)) {
					pub.f.gl = pub.f.gl.concat([[W.ballK, S.goal, S.gT, S.L.by]]);
					mgLog(W, `sends GOAL ${W.ballK}`);
				}
			}
			this.drawBall(W, dt);
		},
		/* a goal everyone now counts: fireworks in the goal, a stamp over the scorer, the crowd up */
		scored(W, g) {
			const T = TS,
				[k, side, t, by] = g,
				z = side === 0 ? -(T.FZ + T.GD / 2) : T.FZ + T.GD / 2,
				col = side === 0 ? "#2F7DE1" : "#E5484D",
				e = W.ents[by];
			mgLog(W, `got GOAL ${k} (${side === 0 ? "blue" : "red"} by ${e ? mgName(e) : "?"})`);
			/* where the ball went in (this device's ball, if it saw it cross; else the middle of the goal) */
			const S = W.bsim,
				at = S && S.goal === side ? [S.s.x, Math.max(T.BR, S.s.y), S.s.z] : [0, T.GH / 2, z];
			this.boom(W, at, col);
			W.shake = 0.9;
			W.hype = 1;
			if (e) fb(W, e, e.side === side ? "GOAL!" : "OWN GOAL", { stamp: true, tone: e.side === side ? "good" : "bad" });
			sfx("fanfare");
		},
		/* a Rocket League style goal explosion where the ball went in: a white flash, a low-poly blast in the scoring team's
		   colour, a shockwave ring along the ground, a pillar of light and sparks; trucks close by are blown away (each
		   device its own trucks) */
		boom(W, at, col) {
			const T = TS,
				[x, y, z] = at;
			if (!W.gxM) {
				/* only the white flash adds light; the rest keeps the team colour true over the green */
				const add = (geo, op, rot, glow) => {
					const m = new THREE.Mesh(
						geo,
						new THREE.MeshBasicMaterial({
							color: "#FFFFFF",
							transparent: true,
							opacity: op,
							depthWrite: false,
							blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
							side: THREE.DoubleSide,
						}),
					);
					if (rot) m.rotation.x = -Math.PI / 2;
					m.visible = false;
					m.userData.dyn = true;
					m.renderOrder = 4;
					W.sc.add(m);
					return m;
				};
				W.gxM = {
					flash: add(new THREE.IcosahedronGeometry(1, 2), 1, false, true),
					blast: add(new THREE.IcosahedronGeometry(1, 1), 0.7),
					ring: add(new THREE.RingGeometry(0.9, 1, 64), 0.9, true),
					pillar: add(new THREE.CylinderGeometry(1, 1.6, 1, 16, 1, true), 0.6),
				};
				W.gxM.blast.material.flatShading = true;
			}
			const M = W.gxM;
			M.t0 = W.t;
			M.at = at;
			M.blast.material.color.set(col);
			M.ring.material.color.set(col);
			M.pillar.material.color.set(col);
			[0, 1, 2].forEach((i) =>
				burst(W.sc, x, y, z, {
					n: 30,
					shape: i === 2 ? "box" : "ico",
					cols: i === 1 ? ["#FFC83D", "#FFFFFF"] : [col, "#FFFFFF"],
					spd: 14 + i * 4,
					up: 10,
					grav: 14,
					life: 1.6,
					size: 1.1,
				}),
			);
			sfx("cannon");
			sfx("fanfare");
			/* the blast: away from it, popped into the air */
			W.list.forEach((e) => {
				if (!e.local || e.gone || e.d || !e.al) return;
				const dx = e.x - x,
					dz = e.z - z,
					d = Math.hypot(dx, dz) || 0.01;
				if (d > T.BOOMR) return;
				const k = T.BOOMV * (1 - d / T.BOOMR);
				e.vx += (dx / d) * k;
				e.vz += (dz / d) * k;
				e.air = true;
				e.flipOk = false;
				e.y = Math.max(e.y || 0, 0.01);
				e.vy = Math.max(e.vy || 0, 4 + k * 0.5);
				e.slideT = 1;
			});
		},
		/* the explosion over time: the flash pops and fades, the blast swells, the ring races out, the pillar shoots up */
		boomFx(W) {
			const M = W.gxM;
			if (!M) return;
			const a = W.t - M.t0,
				[x, y, z] = M.at,
				on = a >= 0 && a < 1.4;
			Object.values(M).forEach((m) => m && m.isMesh && (m.visible = on));
			if (!on) return;
			const out = (q) => 1 - (1 - q) * (1 - q);
			M.flash.position.set(x, y, z);
			M.flash.scale.setScalar(1 + out(Math.min(1, a / 0.2)) * 6);
			M.flash.material.opacity = Math.max(0, 1 - a / 0.35);
			M.blast.position.set(x, y, z);
			M.blast.scale.setScalar(2 + out(Math.min(1, a / 0.7)) * 8);
			M.blast.rotation.y = a * 1.5;
			M.blast.material.opacity = Math.max(0, 0.55 * (1 - a / 0.9));
			M.ring.position.set(x, 0.08, z);
			M.ring.scale.setScalar(1 + out(Math.min(1, a / 0.9)) * 22);
			M.ring.material.opacity = Math.max(0, 0.9 * (1 - a / 1.1));
			const ph = out(Math.min(1, a / 0.5)) * 24;
			M.pillar.position.set(x, ph / 2, z);
			M.pillar.scale.set(1.6 - a * 0.8, Math.max(0.01, ph), 1.6 - a * 0.8);
			M.pillar.material.opacity = Math.max(0, 0.6 * (1 - a / 1.4));
		},
		/* the ball drawn where its path says (a remote kick's jump eased out), rolling, its shadow under it; hidden
		   after a goal until it pops back onto the centre spot */
		drawBall(W, dt) {
			const T = TS,
				S = W.bsim,
				s = S.s,
				ahead = S.goal >= 0 ? 0 : Math.max(0, Math.min(T.H, W.t - (S.L.t + S.n * T.H))),
				tx = s.x + s.vx * ahead,
				ty = Math.max(T.BR, s.y + s.vy * ahead),
				tz = s.z + s.vz * ahead;
			W.bErr.multiplyScalar(Math.exp(-dt * 12));
			const nx = tx + W.bErr.x,
				ny = Math.max(T.BR, ty + W.bErr.y),
				nz = tz + W.bErr.z,
				dx = nx - W.bDraw.x,
				dz = nz - W.bDraw.z,
				d = Math.hypot(dx, dz);
			if (d > 0.0001 && d < 3) {
				const ax = new THREE.Vector3(dz, 0, -dx).normalize();
				W.ball.rotateOnWorldAxis(ax, d / T.BR);
			}
			W.bDraw.set(nx, ny, nz);
			const gone = S.goal >= 0 && W.t - S.gT > 0.35 && W.t < W.koT - 1.2,
				pre = W.koT > 0 && W.t < W.koT;
			W.ball.visible = !gone;
			if (pre && W.t >= W.koT - 1.2) W.bDraw.set(0, T.BR + Math.max(0, (W.koT - 0.6 - W.t) * 6), 0);
			W.ball.position.copy(W.bDraw);
			W.ballSh.position.set(W.bDraw.x, 0.04, W.bDraw.z);
			const k = Math.max(0.35, 1 - (W.bDraw.y - T.BR) / 9);
			W.ballSh.scale.setScalar(k);
			W.ballSh.visible = W.ball.visible && tsGround(W.bDraw.x, W.bDraw.z) < 0.05;
			if (S.goal >= 0 && !S.boom && W.t - S.gT > 0.3) {
				S.boom = true;
				burst(W.sc, W.bDraw.x, W.bDraw.y, W.bDraw.z, {
					n: 18,
					shape: "ico",
					cols: ["#F4F6F9", "#2A2F3A", "#FFC83D"],
					spd: 6,
					up: 5,
					grav: 10,
					life: 1,
					size: 1,
				});
			}
			/* the kickoff countdown */
			if (pre && W.t > W.koT - TS.HOLD) {
				W.big = String(Math.ceil(W.koT - W.t));
				W.bigT = W.t + 0.1;
			} else if (W.koT > 0 && W.t >= W.koT && W.t < W.koT + 0.6) {
				W.big = "GO!";
				W.bigT = W.koT + 0.6;
				if (!W.goSaid || W.goSaid < W.koT) {
					W.goSaid = W.koT;
					sfx("go");
				}
			}
		},
		/* a local truck touching the ball kicks it. Steering into it is control: the ball leaves at about the truck's own
		   speed (so you can dribble it), aimed partly the way the truck faces, and stays down unless you hit it fast.
		   BOOST is the shot: much harder, with a chip up. A jumping truck hits it at its own height (a truck rising into
		   the ball lifts it), a flipping one hits it hard the way it flips */
		rules(W, e) {
			e.sc = this.final(W, e);
			const T = TS,
				S = W.bsim,
				b = W.bs;
			if (!S || !b || S.goal >= 0 || W.t < W.koT || W.t - (e.kickT || -9) < T.KICKCD) return;
			const dx = b.x - e.x,
				dz = b.z - e.z,
				d = Math.hypot(dx, dz),
				r = (e.rad || 0.95) + T.BR * 0.92;
			const ey = e.y || 0;
			if (d > r || d < 0.001 || b.y - T.BR > ey + 1.45 || b.y + T.BR < ey + 0.2) return;
			const nx = dx / d,
				nz = dz / d,
				ts = Math.max(0, e.vx * nx + e.vz * nz),
				boost = e.boostT > 0,
				flip = W.t - (e.flipT || -9) < T.FLIPDUR && e.flipD,
				hx = Math.cos(e.yaw),
				hz = -Math.sin(e.yaw),
				/* the ball in front of the truck goes partly where the truck faces */
				aim = hx * nx + hz * nz > 0.3 && ts > 1 ? T.AIM : 0;
			let ux = nx * (1 - aim) + hx * aim,
				uz = nz * (1 - aim) + hz * aim;
			const ul = Math.hypot(ux, uz) || 1;
			ux /= ul;
			uz /= ul;
			if (flip) {
				ux = ux * 0.4 + flip[0] * 0.6;
				uz = uz * 0.4 + flip[1] * 0.6;
				const fl = Math.hypot(ux, uz) || 1;
				ux /= fl;
				uz /= fl;
			}
			const ba = b.vx * ux + b.vz * uz,
				along = Math.max(ba, boost ? ts * 1.1 + T.SHOT : flip ? ts * 1.1 + T.FLIPK : ts * T.TOUCH + 0.6);
			let vx = (b.vx - ba * ux) * 0.5 + ux * along,
				vz = (b.vz - ba * uz) * 0.5 + uz * along;
			const sp = Math.hypot(vx, vz);
			if (sp > T.MAXV) {
				vx *= T.MAXV / sp;
				vz *= T.MAXV / sp;
			}
			let vy = Math.max(b.vy, boost ? T.CHIP : flip ? 3 : Math.min(3, Math.max(0, ts - 8) * 0.6));
			/* in the air: the ball above the truck's middle goes up with it */
			if (ey > 0.2) {
				const up = Math.max(0, Math.min(1, (b.y - (ey + 0.8)) / (T.BR + 0.8)));
				vy = Math.max(vy, (e.vy || 0) * 0.8 + up * along * 0.7);
			}
			/* a scrum: another truck right on the far side of the ball. The ball shoots up out of the pile instead of
			   being squeezed back and forth between them: off to the side of the two trucks (the side the kicker faces),
			   so it doesn't land back between them. A BOOST keeps its shot and pops it over the other truck */
			const jam = W.list.find((o) => {
				if (o === e || o.gone || !o.al || o.falling || Math.abs((o.y || 0) - ey) > 1.2) return false;
				const ox = o.x - b.x,
					oz = o.z - b.z;
				return Math.hypot(ox, oz) < (o.rad || 0.95) + T.BR * 1.02 && ox * vx + oz * vz > 0;
			});
			if (jam) {
				if (!boost) {
					const jx = jam.x - e.x,
						jz = jam.z - e.z,
						jl = Math.hypot(jx, jz) || 1,
						s = -jz * hx + jx * hz < 0 ? -1 : 1,
						px = (-jz / jl) * s,
						pz = (jx / jl) * s;
					vx = vx * 0.3 + px * T.ESC;
					vz = vz * 0.3 + pz * T.ESC;
				}
				vy = Math.max(vy, T.POP);
			} else if (b.vy < 0 && b.y - T.BR - ey > T.ROOF) {
				/* coming down onto a truck: a small hop and rolled off the side of the roof (away from the truck's middle),
				   instead of sinking into it or bouncing on it */
				vy = Math.max(vy, -b.vy * 0.25);
				const off = vx * nx + vz * nz;
				if (off < T.ESC) {
					vx += nx * (T.ESC - off);
					vz += nz * (T.ESC - off);
				}
			}
			/* the kick only changes the ball's speed, it starts from where the ball is (a nudge out of the kicking truck,
			   never a jump: putting it on the far side of the kicker made it blink through the trucks in a scrum) */
			const push = Math.min(0.15, Math.max(0, r - d));
			let x = b.x + nx * push,
				z = b.z + nz * push;
			const c = tsClamp(x, z, T.BR, true, b.y);
			if (c) {
				x = c.x;
				z = c.z;
			}
			const r3 = (v) => Math.round(v * 1000) / 1000;
			e.f.bl = [W.ballK, ((e.f.bl && e.f.bl[1]) || 0) + 1, r3(W.t), r3(x), r3(b.y), r3(z), r3(vx), r3(vy), r3(vz)];
			e.kickT = W.t;
			e.vx *= boost ? 0.8 : 0.95;
			e.vz *= boost ? 0.8 : 0.95;
			/* only real hits thump (a shot, a flip, a fast hit), at most every 0.3 s a truck: dribbling stays quiet */
			if ((boost || flip || ts > 9) && W.t - (e.thudT || -9) > 0.3) {
				e.thudT = W.t;
				if (e.isMe || W.tv) W.shake = Math.max(W.shake || 0, boost ? 0.3 : 0.15);
				sfx("ram");
			}
			mgLog(
				W,
				`kick ${mgName(e)} ${boost ? "BOOST " : ""}${flip ? "FLIP " : ""}${ey > 0.2 ? "AIR " : ""}${jam ? "POP " : b.y - T.BR - ey > T.ROOF ? "ROOF " : ""}${Math.round(Math.min(sp, T.MAXV))} m/s`,
			);
		},
		/* each player's result: their team's goals * 100 + the other team's (the host compares sides with teamWin) */
		final(W, e) {
			const g = W.goals || [],
				sd = e.side === 1 ? 1 : 0,
				f = g.filter((q) => q[1] === sd).length,
				a = g.length - f;
			return f * 100 + a;
		},
		timeUp() {},
		teamWin(res, tm) {
			const k0 = Object.keys(tm).find((k) => tm[k] === 0 && k in res),
				k1 = Object.keys(tm).find((k) => tm[k] === 1 && k in res);
			let a, b;
			if (k0) {
				a = Math.floor(res[k0] / 100);
				b = res[k0] % 100;
			} else if (k1) {
				b = Math.floor(res[k1] / 100);
				a = res[k1] % 100;
			} else return -1;
			return a > b ? 0 : b > a ? 1 : -1;
		},
		fmtTeam(v, s) {
			const f = Math.floor(v / 100),
				a = v % 100;
			return `${f > a ? "Won" : f < a ? "Lost" : "Drew"} ${f}-${a}`;
		},
		fmtE(W, e) {
			const n = (W.goals || []).filter((q) => q[3] === e.k && q[1] === (e.side === 1 ? 1 : 0)).length;
			return n ? "⚽".repeat(Math.min(3, n)) + (n > 3 ? " " + n : "") : "";
		},
		clock(W) {
			const g = W.goals || [],
				a = g.filter((q) => q[1] === 0).length,
				b = g.filter((q) => q[1] === 1).length;
			return `🔵 ${a}-${b} 🔴`;
		},
		/* the camera: phones follow your truck and lean towards the ball; the TV shows the whole pitch, drifting with the ball.
		   The TV and landscape screens (PC, a phone on its side) look from the side, so the long pitch runs across the wide
		   screen (blue's goal on the left); portrait phones look along it */
		cam(W, tgt, pos, far) {
			const b = W.bDraw || { x: 0, z: 0 },
				side = !!W.tv || GFX.w / GFX.h > 1.15;
			W.sideV = side;
			this.boardAt(W, side);
			if (W.tv) {
				const t = new THREE.Vector3(b.x * 0.05 + TS.TVX, 0, b.z * 0.08);
				/* zoomed in on wide screens as far as both goals still fit (and the stands' fronts above and below) */
				const k = Math.min(TS.TVK[0], (TS.TVK[1] * GFX.w) / GFX.h);
				return [t, t.clone().add(new THREE.Vector3(TS.TVD[1] / k, TS.TVD[0] / k, 0))];
			}
			if (mgSpec(W)) return [tgt, pos];
			const me = W.me,
				t = new THREE.Vector3(me.x * 0.62 + b.x * 0.38, 0, me.z * 0.62 + b.z * 0.38),
				zm = this.camZoom * far * (far > 1 ? 1.1 : 1);
			return [
				t,
				t
					.clone()
					.add(
						side
							? new THREE.Vector3(17 * zm * TS.SIDEZ, 23 * zm * TS.SIDEZ, 0)
							: new THREE.Vector3(0, 23 * zm, 17 * zm),
					),
			];
		},
		render(W, e, dt) {
			/* a flip: one somersault round the truck's middle (the shared start time e.f.fp, so remote trucks spin too);
			   the colour disc stays on the ground under a jumping truck */
			const fp = e.f && e.f.fp,
				ft = fp ? W.t - fp[0] : 9;
			if (ft >= 0 && ft < TS.FLIPDUR) {
				const q = ft / TS.FLIPDUR,
					a = q * q * (3 - 2 * q) * Math.PI * 2,
					h = 0.75,
					sa = Math.sin(a);
				e.tr.rotation.x = 0;
				e.tr.rotation.z = -a;
				e.tr.position.set(-h * sa * Math.cos(e.yaw), h * (1 - Math.cos(a)), h * sa * Math.sin(e.yaw));
			} else if (e.tr.position.y) e.tr.position.set(0, 0, 0);
			/* on a ramp: tilted with its slope (sideways too, whichever way it faces); up the wall past the lip: upright
			   against it; jumping well over a ramp: level */
			{
				const E = tsEdge(e.x, e.z),
					y = e.y || 0;
				if (E && E.d < TS.RR && y > 0.02) {
					let u = Math.min(1, (TS.RR - Math.max(0, E.d)) / TS.RR);
					if (y > TS.RR - 0.2 && E.d < 0.6) u = 1;
					else if (y > tsRampY(E.d) + 0.8) u = 0;
					if (u > 0.01) {
						const q = W.tsQ || (W.tsQ = new THREE.Quaternion()),
							ax = W.tsAx || (W.tsAx = new THREE.Vector3());
						ax.set(-E.nz, 0, E.nx);
						q.setFromAxisAngle(ax, Math.asin(u));
						e.tr.quaternion.premultiply(q);
					}
				}
			}
			/* stunned: a quick wobble and dizzy stars circling over it (Monster Mash's) */
			const st = (e.f && e.f.st) || 0,
				stun = st > 0 && W.t >= 0 && W.t < st;
			if (stun && !(ft >= 0 && ft < TS.FLIPDUR)) e.tr.rotation.x = Math.sin(W.t * 45) * 0.14;
			if (stun && !e.stars) {
				e.stars = mmStars();
				e.stars.position.y = 2.1;
				e.g.add(e.stars);
			}
			if (e.stars) {
				e.stars.visible = stun && !e.gone;
				if (stun) e.stars.rotation.y = W.t * 6;
			}
			this.boostFx(W, e);
			if (e.disc === undefined) e.disc = e.g.children.find((c) => c.userData.disc) || null;
			if (e.disc) e.disc.position.y = 0.03 - Math.max(0, e.y || 0);
			this.boostBar(W, e);
			if (W.crowdT !== W.t) {
				W.crowdT = W.t;
				W.hype = Math.max(0, (W.hype || 0) - dt * 0.4);
				crowdStep(W, W.bDraw ? W.bDraw.z : null, 0.3 + (W.hype || 0) * 0.7);
			}
		},
		/* CPU: the truck nearest the ball goes behind it and drives it at the goal (boosting when lined up); the others
		   hold a spot between the ball and their own goal */
		/* every answer says whether BOOST is held (the watch tool copies it onto the player's own input) */
		bot(W, e) {
			const o = this.botIn(W, e);
			o.hold = !!o.hold;
			return o;
		},
		botIn(W, e) {
			const T = TS,
				b = W.bs;
			if (!b || W.t < W.koT) return { x: 0, y: 0, boost: false };
			const sd = e.side === 1 ? 1 : 0,
				dir = sd === 0 ? -1 : 1,
				gx = 0,
				gz = dir * (T.FZ + 1),
				px = b.x + b.vx * 0.25,
				pz = b.z + b.vz * 0.25,
				mates = W.list.filter((o) => !o.gone && (o.side === 1 ? 1 : 0) === sd),
				near = mates.slice().sort((p, q) => Math.hypot(p.x - px, p.z - pz) - Math.hypot(q.x - px, q.z - pz))[0];
			if (near !== e) {
				/* low on boost: fetch a ready pad if one is close */
				if (e.bst < 30 && W.pads) {
					const pd = W.pads
						.filter((q) => W.t >= q.ready)
						.sort((p, q) => Math.hypot(p.x - e.x, p.z - e.z) - Math.hypot(q.x - e.x, q.z - e.z))[0];
					if (pd && Math.hypot(pd.x - e.x, pd.z - e.z) < 13) return steer(e, pd.x, pd.z, 1);
				}
				const z0 = -dir * T.FZ,
					hz = z0 + (pz - z0) * 0.35;
				return steer(e, px * 0.5, hz, Math.hypot(e.x - px * 0.5, e.z - hz) > 2 ? 0.9 : 0.3);
			}
			let ux = gx - px,
				uz = gz - pz;
			const ul = Math.hypot(ux, uz) || 1;
			ux /= ul;
			uz /= ul;
			const back = T.BR + 1.6,
				ax = px - ux * back,
				az = pz - uz * back,
				tx = px - e.x,
				tz = pz - e.z,
				td = Math.hypot(tx, tz) || 1,
				lined = (tx * ux + tz * uz) / td;
			if (lined > 0.75) {
				const o = steer(e, px + ux * 2, pz + uz * 2, 1);
				o.hold = e.bst > 5 && td < 9;
				/* a ball up in the air just ahead: jump for it, and flip into it once close */
				if (!e.air && b.y - T.BR > 1 && td < 6 && W.rng() < 0.15) o.b2 = true;
				else if (e.air && e.flipOk && td < 3.6 && W.t - e.jumpT > 0.2) o.b2 = true;
				return o;
			}
			/* swing round the ball to get behind it, keeping clear of it */
			const sx = ax - e.x,
				sz = az - e.z,
				side = sx * -uz + sz * ux > 0 ? 1 : -1,
				ox = ax + -uz * side * (lined < 0 ? 2.5 : 0),
				oz = az + ux * side * (lined < 0 ? 2.5 : 0);
			const o = steer(e, ox, oz, 1);
			o.hold = e.bst > 40 && Math.hypot(ox - e.x, oz - e.z) > 14;
			return o;
		},
		humanBot(W, e, dt) {
			return this.bot(W, e, dt);
		},
		/* tools/nettest.mjs: the score must match everywhere */
		syncSnap(W) {
			return (W.goals || []).map((g) => g[0] + ":" + g[1]).join(",");
		},
		watchSum(W) {
			const g = W.goals || [];
			return `blue ${g.filter((q) => q[1] === 0).length} - ${g.filter((q) => q[1] === 1).length} red`;
		},
		botScore: (s) => rnd(4) * 100 + rnd(4),
	},
});
