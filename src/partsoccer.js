/* ---------- Truck Soccer (2 vs 2, a Rocket League style arena) ----------
   A walled pitch with rounded corners and a goal sunk into each end wall; one big ball. Push it into the other team's
   goal; BOOST (the dash button) smashes it harder and lifts it. Most goals after dur s wins; a draw pays both teams.
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
	BR: 1.45 /* ball radius */,
	WALL: 6.2 /* wall + glass height (above the goals) */,
	KERB: 1.2 /* the solid kerb under the glass */,
	H: 1 / 120 /* ball physics step */,
	GRAV: 34 /* the ball falls fast, so it is on the ground more than in the air */,
	FLOOR: 0.55 /* floor bounce */,
	BOUNCE: 0.7 /* wall bounce */,
	ROLL: 0.99625 /* rolling slow-down per step (about 0.64 per second) */,
	AIR: 0.99979 /* air drag per step */,
	KO: 3.5 /* s from a goal to the next kickoff */,
	HOLD: 1.6 /* s before a kickoff when the trucks are put back on their spots */,
	GOALWAIT: 1.2 /* s the host waits for the kicker's device to announce a goal before it does */,
	KICKCD: 0.1 /* s between two kicks by the same truck */,
	MAXV: 32 /* the ball's top speed */,
	/* kicks (rules): a plain touch sends the ball at TOUCH x the truck's speed (+0.6 m/s), a BOOST shot at 1.1 x + SHOT
	   m/s with CHIP m/s up; AIM = how much the ball follows the way the truck faces instead of the contact direction */
	TOUCH: 1.05,
	SHOT: 13,
	CHIP: 4.5,
	AIM: 0.45,
	POP: 14 /* m/s up when the ball is squeezed between two trucks (about 2.9 m up, clear over the roofs) */,
	ESC: 7 /* m/s sideways for a popped ball, so it lands out of the pile (about 6 m away), and off a roof */,
	ROOF: 0.6 /* a ball falling onto a truck with its bottom this high rolls off the roof */,
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
	m.castShadow = true;
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
		rr(T.FX - 0.6, T.FZ - 0.6, T.CR - 0.6);
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
		dur: 90,
		bound: { t: "none" },
		water: false,
		bare: true,
		noAssist: true,
		camZoom: 1.1,
		sun: [13.9, 41, 12.1],
		lt: { amb: 0.42, sun: 0.7, warm: 0.3, haze: 50 },
		fx: { aa: 1 },
		/* the chip under the clock: your team live, the score at the end (results are your goals * 100 + theirs) */
		fmt: (W, e) => (e.side === 1 ? "🔴 Red team" : "🔵 Blue team"),
		fmtV: (v) => `${Math.floor(v / 100)}-${v % 100}`,
		ramK: 0.75 /* bumps between trucks a bit softer than Mud Brawl's rams */,
		how: "Push the ball into the other team's goal. Most goals wins!",
		teamHow: (s) =>
			s === 0 ? "Blue: score in the far goal (up the screen)." : "Red: score in the near goal (down the screen).",
		tvHint: "Drag to drive · BOOST smashes the ball",
		ramLabel: "BOOST",
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
			e.f = { bl: null, gl: [] };
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
			this.goals(W);
			this.stadium(W);
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
			/* the scoreboard over the far goal, facing the cameras */
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
			sb.position.set(0, 10.5, -(T.FZ + T.GD + 8.4));
			sb.rotation.x = 0.12;
			sb.traverse((o) => (o.userData.dyn = true));
			s.add(sb);
			W.sbd = { cv, tex, key: "" };
			this.board(W);
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
				e.vx = e.vz = 0;
				e.boostT = 0;
				return;
			}
			e.spotted = false;
			arenaPhys(W, e, inp, dt);
			const c = tsClamp(e.x, e.z, e.rad || 0.95, false, 0);
			if (c) {
				e.x = c.x;
				e.z = c.z;
				const vn = e.vx * c.nx + e.vz * c.nz;
				if (vn > 0) {
					e.vx -= 1.5 * vn * c.nx;
					e.vz -= 1.5 * vn * c.nz;
				}
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
			if (goals.length > W.goals.length) goals.slice(W.goals.length).forEach((g) => this.scored(W, g));
			W.goals = goals;
			W.ballK = goals.length;
			W.koT = goals.length ? goals[goals.length - 1][2] + T.KO : 0;
			this.board(W);
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
			for (let i = 0; i < 3; i++)
				burst(W.sc, (i - 1) * 2.5, 1.6, z, {
					n: 26,
					shape: "ico",
					cols: [col, "#FFC83D", "#F4F6F9"],
					spd: 7,
					up: 9,
					grav: 12,
					life: 1.5,
					size: 1.2,
				});
			W.shake = 0.5;
			W.hype = 1;
			if (e) fb(W, e, e.side === side ? "GOAL!" : "OWN GOAL", { stamp: true, tone: e.side === side ? "good" : "bad" });
			sfx("fanfare");
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
			W.ballSh.visible = W.ball.visible;
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
		   BOOST is the shot: much harder, with a chip up */
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
			if (d > r || d < 0.001 || b.y - T.BR > 1.45) return;
			const nx = dx / d,
				nz = dz / d,
				ts = Math.max(0, e.vx * nx + e.vz * nz),
				boost = e.boostT > 0,
				hx = Math.cos(e.yaw),
				hz = -Math.sin(e.yaw),
				/* the ball in front of the truck goes partly where the truck faces */
				aim = hx * nx + hz * nz > 0.3 && ts > 1 ? T.AIM : 0;
			let ux = nx * (1 - aim) + hx * aim,
				uz = nz * (1 - aim) + hz * aim;
			const ul = Math.hypot(ux, uz) || 1;
			ux /= ul;
			uz /= ul;
			const ba = b.vx * ux + b.vz * uz,
				along = Math.max(ba, boost ? ts * 1.1 + T.SHOT : ts * T.TOUCH + 0.6);
			let vx = (b.vx - ba * ux) * 0.5 + ux * along,
				vz = (b.vz - ba * uz) * 0.5 + uz * along;
			const sp = Math.hypot(vx, vz);
			if (sp > T.MAXV) {
				vx *= T.MAXV / sp;
				vz *= T.MAXV / sp;
			}
			let vy = Math.max(b.vy, boost ? T.CHIP : Math.min(3, Math.max(0, ts - 8) * 0.6));
			/* a scrum: another truck right on the far side of the ball. The ball shoots up out of the pile instead of
			   being squeezed back and forth between them: off to the side of the two trucks (the side the kicker faces),
			   so it doesn't land back between them. A BOOST keeps its shot and pops it over the other truck */
			const jam = W.list.find((o) => {
				if (o === e || o.gone || !o.al || o.falling) return false;
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
			} else if (b.vy < 0 && b.y - T.BR > T.ROOF) {
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
			if (boost || ts > 6) {
				if (e.isMe || W.tv) W.shake = Math.max(W.shake || 0, boost ? 0.3 : 0.15);
				sfx("ram");
			}
			mgLog(
				W,
				`kick ${mgName(e)} ${boost ? "BOOST " : ""}${jam ? "POP " : b.y - T.BR > T.ROOF ? "ROOF " : ""}${Math.round(Math.min(sp, T.MAXV))} m/s`,
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
				b = g.filter((q) => q[1] === 1).length,
				left = Math.max(0, Math.ceil(this.dur - Math.max(0, W.t)));
			return `🔵 ${a}-${b} 🔴 · ${left}`;
		},
		/* the camera: phones follow your truck and lean towards the ball; the TV shows the whole pitch, drifting with the ball */
		cam(W, tgt, pos, far) {
			const b = W.bDraw || { x: 0, z: 0 };
			if (W.tv) {
				const t = new THREE.Vector3(b.x * 0.05, 0, b.z * 0.05 + 5.5);
				return [t, t.clone().add(new THREE.Vector3(0, 52, 27))];
			}
			if (mgSpec(W)) return [tgt, pos];
			const me = W.me,
				t = new THREE.Vector3(me.x * 0.62 + b.x * 0.38, 0, me.z * 0.62 + b.z * 0.38),
				zm = this.camZoom * far * (far > 1 ? 1.1 : 1);
			return [t, t.clone().add(new THREE.Vector3(0, 23 * zm, 17 * zm))];
		},
		render(W, e, dt) {
			if (W.crowdT !== W.t) {
				W.crowdT = W.t;
				W.hype = Math.max(0, (W.hype || 0) - dt * 0.4);
				crowdStep(W, W.bDraw ? W.bDraw.z : null, 0.3 + (W.hype || 0) * 0.7);
			}
		},
		/* CPU: the truck nearest the ball goes behind it and drives it at the goal (boosting when lined up); the others
		   hold a spot between the ball and their own goal */
		bot(W, e) {
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
				o.boost = td < 5.5 && e.bcd <= 0 && W.rng() < 0.06;
				return o;
			}
			/* swing round the ball to get behind it, keeping clear of it */
			const sx = ax - e.x,
				sz = az - e.z,
				side = sx * -uz + sz * ux > 0 ? 1 : -1,
				ox = ax + -uz * side * (lined < 0 ? 2.5 : 0),
				oz = az + ux * side * (lined < 0 ? 2.5 : 0);
			return steer(e, ox, oz, 1);
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
