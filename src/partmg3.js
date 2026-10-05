/* ---------- newer minigames: Hot Load ---------- */
/* Hot Load: a ticking dynamite bundle rides on one truck; touching a rival passes it on. Rounds and fuse lengths come from the
   seed, so every device agrees when it blows. Passing is decided by the holder's device and shared as e.f.gv = [round, seq, key]:
   the highest seq this round names the holder. No passing in the last LOCK seconds, so a pass in flight can't split the blast. */
function hlCrateTex() {
	return canvasTex(128, 128, (x, w, h) => {
		x.fillStyle = "#B97A3E";
		x.fillRect(0, 0, w, h);
		x.fillStyle = "rgba(60,32,12,.35)";
		for (let i = 1; i < 4; i++) x.fillRect(0, (i * h) / 4 - 2, w, 4);
		x.strokeStyle = "#5A3518";
		x.lineWidth = 10;
		x.strokeRect(5, 5, w - 10, h - 10);
		x.font = "bold 46px Bungee, 'Arial Black', Impact, sans-serif";
		x.textAlign = "center";
		x.textBaseline = "middle";
		x.fillStyle = "#C8261B";
		x.fillText("TNT", w / 2, h / 2 + 3);
	});
}
Object.assign(MG, {
	hotload: {
		name: "Hot Load",
		kind: "arena",
		ctrl: "stick",
		hi: true,
		unit: "pts",
		dur: 110,
		lastStanding: true,
		bound: { t: "sq", h: 11 },
		water: false,
		bare: true,
		dusk: true,
		fallY: -6,
		LOCK: 0.9,
		how: "A ticking bundle of dynamite! Bump into a rival to pass it on. Whoever holds it when it blows is out. Last truck standing wins.",
		build(W) {
			const s = W.sc,
				r = mulberry((W.mg.seed || 1) + 77);
			W.R = { r: -1, ph: "wait", next: 1.2 };
			const dirt = canvasTex(256, 256, (x, w, h) => {
				x.fillStyle = "#9A7A57";
				x.fillRect(0, 0, w, h);
				for (let i = 0; i < 900; i++) {
					x.fillStyle = r() < 0.5 ? "rgba(70,50,30,.18)" : "rgba(255,235,200,.12)";
					const z = 1 + r() * 3;
					x.fillRect(r() * w, r() * h, z, z);
				}
				x.strokeStyle = "rgba(60,42,26,.22)";
				x.lineWidth = 5;
				for (let i = 0; i < 6; i++) {
					const y0 = r() * h;
					x.beginPath();
					x.moveTo(0, y0);
					x.bezierCurveTo(w * 0.3, y0 + (r() - 0.5) * 120, w * 0.7, y0 + (r() - 0.5) * 120, w, y0 + (r() - 0.5) * 60);
					x.stroke();
				}
			});
			dirt.wrapS = dirt.wrapT = THREE.RepeatWrapping;
			dirt.repeat.set(3, 3);
			const pad = new THREE.Mesh(
				new THREE.BoxGeometry(24, 1, 24),
				new THREE.MeshStandardMaterial({ map: dirt, roughness: 1 }),
			);
			pad.position.y = -0.5;
			pad.receiveShadow = true;
			s.add(pad);
			const fl = new THREE.Mesh(new THREE.CircleGeometry(90, 40), M("#7E6649", { roughness: 1 }));
			fl.rotation.x = -Math.PI / 2;
			fl.position.y = -0.3;
			fl.receiveShadow = true;
			s.add(fl);
			barrierRing(s, 11);
			this.yard(W, r);
			this.mkBomb(W);
		},
		yard(W, r) {
			// demolition yard: quarry walls, shipping containers, TNT stacks, floodlights, beacons, the detonator and the title sign
			const s = W.sc;
			{
				const g = new THREE.CylinderGeometry(44, 50, 16, 30, 3, true),
					p = g.attributes.position,
					jit = {};
				for (let i = 0; i < p.count; i++) {
					const y = p.getY(i),
						key = Math.round(p.getX(i) * 10) + "," + Math.round(y * 10) + "," + Math.round(p.getZ(i) * 10);
					if (y > -7.9 && y < 7.9) {
						if (jit[key] === undefined) jit[key] = 0.95 + r() * 0.1;
						p.setX(i, p.getX(i) * jit[key]);
						p.setZ(i, p.getZ(i) * jit[key]);
					}
				}
				g.computeVertexNormals();
				const q = new THREE.Mesh(g, M("#8B6E52", { side: THREE.BackSide, roughness: 1 }));
				q.position.y = 7.5;
				s.add(q);
			}
			const cont = (x, z, ry, col, y = 0) => {
				const g = new THREE.Group();
				g.position.set(x, y - 0.3, z);
				g.rotation.y = ry;
				g.add(B(6, 2.6, 2.4, col, 0, 1.3, 0));
				for (let i = -2.6; i <= 2.61; i += 0.52) g.add(B(0.1, 2.3, 2.5, col, i, 1.3, 0));
				g.add(B(0.08, 2.4, 2.2, "#2A2F3A", 3.02, 1.3, 0));
				s.add(g);
			};
			cont(-10, -18, 0, "#2F7DE1");
			cont(-3.6, -18, 0, "#C8402F");
			cont(-6.8, -18, 0, "#FF8A1F", 2.6);
			cont(10.5, -18.5, 0.12, "#1FA35C");
			cont(-18.5, 3, Math.PI / 2, "#7A5BD6");
			cont(-18.5, -4, Math.PI / 2 + 0.06, "#8E96A3");
			const ctex = hlCrateTex(),
				cm = new THREE.MeshStandardMaterial({ map: ctex, roughness: 0.9 });
			const crate = (x, y, z, ry) => {
				const c = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), cm);
				c.position.set(x, y + 0.25, z);
				c.rotation.y = ry;
				c.castShadow = c.receiveShadow = true;
				s.add(c);
			};
			[
				[-15.5, -14],
				[16, -12],
				[-16, 12],
				[17, 10],
			].forEach(([x, z]) => {
				for (let k = 0; k < 5; k++) {
					const lv = k < 3 ? 0 : 1,
						o = k < 3 ? k - 1 : k - 3.5;
					crate(x + o * 1.15, lv * 1.1, z + (r() - 0.5) * 0.2, (r() - 0.5) * 0.3);
				}
			});
			W.lamps = [];
			[
				[-1, -1],
				[1, -1],
				[-1, 1],
				[1, 1],
			].forEach(([sx, sz]) => {
				const x = sx * 21,
					z = sz * 21,
					a = Math.atan2(-x, -z);
				s.add(B(0.45, 11, 0.45, "#5A6272", x, 5.2, z));
				const h = new THREE.Group();
				h.position.set(x, 10.8, z);
				h.rotation.y = a;
				h.add(B(2.6, 1.1, 0.5, "#3A404C", 0, 0, 0));
				h.add(B(2.3, 0.85, 0.08, "#FFF6D8", 0, 0, 0.29, { emissive: "#FFF1C4", emissiveIntensity: 0.9 }));
				s.add(h);
				const lm = new THREE.MeshStandardMaterial({ color: "#FFB020", emissive: "#FF9A00", emissiveIntensity: 0.3 });
				s.add(Cy(0.1, 0.1, 1.1, 8, "#3A404C", sx * 11.5, 0.9, sz * 11.5));
				const b = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 12), lm);
				b.position.set(sx * 11.5, 1.6, sz * 11.5);
				s.add(b);
				W.lamps.push(lm);
			});
			{
				const g = new THREE.Group();
				g.position.set(14.5, -0.3, -14.5);
				g.rotation.y = -0.6;
				g.add(B(1.8, 0.9, 1.1, "#6B4F35", 0, 0.45, 0));
				g.add(B(0.8, 0.55, 0.6, "#C8261B", 0, 1.17, 0));
				const pl = new THREE.Group();
				pl.add(Cy(0.05, 0.05, 0.8, 6, "#B9C0CC", 0, 0.4, 0), B(0.8, 0.12, 0.12, "#2A2F3A", 0, 0.8, 0));
				pl.position.y = 1.2;
				g.add(pl);
				s.add(g);
				W.plunger = pl;
			}
			{
				const sg = signBoard("HOT LOAD", { style: "race", w: 12, h: 2.4, col: "#FF6A3D" });
				sg.position.set(0, 8.8, -20.5);
				s.add(sg, B(0.35, 8, 0.35, "#5A6272", -5, 3.7, -20.8), B(0.35, 8, 0.35, "#5A6272", 5, 3.7, -20.8));
			}
			W.flash = new THREE.PointLight("#FFB25A", 0, 34);
			s.add(W.flash);
			W.scorch = [];
			W.scorchTex = canvasTex(128, 128, (x, w, h) => {
				// soft sooty blast mark with a few streaks flung outwards
				const q = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
				q.addColorStop(0, "rgba(20,14,10,.75)");
				q.addColorStop(0.45, "rgba(28,20,14,.5)");
				q.addColorStop(1, "rgba(28,20,14,0)");
				x.fillStyle = q;
				x.fillRect(0, 0, w, h);
				x.strokeStyle = "rgba(20,14,10,.35)";
				x.lineCap = "round";
				for (let i = 0; i < 9; i++) {
					const a = (i / 9) * 6.283 + r() * 0.5,
						l = 30 + r() * 28;
					x.lineWidth = 3 + r() * 4;
					x.beginPath();
					x.moveTo(w / 2 + Math.cos(a) * 18, h / 2 + Math.sin(a) * 18);
					x.lineTo(w / 2 + Math.cos(a) * l, h / 2 + Math.sin(a) * l);
					x.stroke();
				}
			});
		},
		mkBomb(W) {
			// three dynamite sticks taped together, a burning wick with a spark, and a danger ring painted under the holder
			const g = new THREE.Group(),
				red = new THREE.MeshStandardMaterial({
					color: "#D7372B",
					emissive: "#FF2A10",
					emissiveIntensity: 0,
					roughness: 0.6,
				}),
				tape = M("#22252C");
			[
				[-0.21, 0],
				[0.21, 0],
				[0, 0.34],
			].forEach(([x, y]) => {
				const c = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 1.1, 12), red);
				c.rotation.z = Math.PI / 2;
				c.position.set(0, y, x);
				c.castShadow = true;
				g.add(c);
			});
			[-0.3, 0.3].forEach((x) => {
				const t = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.12, 14), tape);
				t.rotation.z = Math.PI / 2;
				t.position.set(x, 0.12, 0);
				g.add(t);
			});
			const wick = new THREE.Group();
			wick.position.set(0, 0.52, 0);
			wick.add(Cy(0.035, 0.035, 0.7, 5, "#E8DCC0", 0, 0.35, 0));
			g.add(wick);
			const spark = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: canvasTex(64, 64, (x, w, h) => {
						const q = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
						q.addColorStop(0, "rgba(255,255,230,1)");
						q.addColorStop(0.3, "rgba(255,200,60,.9)");
						q.addColorStop(1, "rgba(255,120,0,0)");
						x.fillStyle = q;
						x.fillRect(0, 0, w, h);
					}),
					transparent: true,
					depthWrite: false,
					blending: THREE.AdditiveBlending,
				}),
			);
			g.add(spark);
			g.visible = false;
			W.sc.add(g);
			const ring = new THREE.Mesh(
				new THREE.RingGeometry(1.15, 1.45, 36),
				new THREE.MeshBasicMaterial({
					color: "#FF3B1F",
					transparent: true,
					opacity: 0.7,
					depthWrite: false,
					side: THREE.DoubleSide,
					polygonOffset: true,
					polygonOffsetFactor: -2,
				}),
			);
			ring.rotation.x = -Math.PI / 2;
			ring.visible = false;
			W.sc.add(ring);
			g.scale.setScalar(1.3);
			W.bomb = { g, red, wick, spark, ring };
		},
		spawn: ringSpawn(6),
		holder(W) {
			const R = W.R;
			let best = 0,
				k = R.st;
			for (const e of W.list) {
				const g = e.f && e.f.gv;
				if (Array.isArray(g) && g[0] === R.r && g[1] > best) {
					best = g[1];
					k = g[2];
				}
			}
			R.seq = best;
			return W.ents[k] || null;
		},
		newRound(W) {
			const al = W.list.filter((e) => !e.gone && e.al && !e.d).sort((a, b) => a.i - b.i);
			if (al.length < 2) {
				W.R.ph = "end";
				return;
			}
			const r = W.R.r + 1,
				q = mulberry((W.mg.seed || 1) + r * 7919),
				n = al.length;
			q();
			const S = W.R.next,
				F = (n >= 6 ? 7 : 9) + q() * 4,
				st = al[Math.floor(q() * n)];
			W.R = { r, ph: "live", S, B: S + F, st: st.k, h: null, from: null, since: S, seq: 0, nb: S + 0.6 };
		},
		tick(W, dt) {
			const R = W.R;
			if (R.ph === "wait" && W.t >= R.next) this.newRound(W);
			if (W.R.ph !== "live") return;
			const Q = W.R,
				h = this.holder(W);
			if (h !== Q.h) {
				if (Q.h) {
					Q.ax = Q.h.x;
					Q.az = Q.h.z;
					Q.aT = W.t;
					if (Q.h.isMe || (h && h.isMe)) sfx("honk");
				}
				Q.from = Q.h ? Q.h.k : null;
				Q.h = h;
				Q.since = W.t;
			}
			if (h && h.local && h.al && !h.d) {
				h.bcd = Math.max(0, h.bcd - dt);
				if (W.t - Q.since > 0.45 && W.t > Q.S + 0.6 && W.t < Q.B - this.LOCK)
					for (const o of W.list) {
						if (o === h || o.gone || !o.al || o.d || o.fly || o.falling) continue;
						if (o.k === Q.from && W.t - Q.since < 1.3) continue;
						if (Math.hypot(o.x - h.x, o.z - h.z) < 2.15) {
							h.f.gv = [Q.r, Q.seq + 1, o.k];
							break;
						}
					}
			}
			if (W.t >= Q.B) {
				Q.ph = "wait";
				Q.next = Q.B + 2.6;
				const v = h && !h.gone && h.al ? h : null;
				const bx = v ? v.x : W.bomb.g.position.x,
					bz = v ? v.z : W.bomb.g.position.z;
				this.boom(W, bx, bz);
				if (v && v.local) this.launch(W, v);
			}
		},
		boom(W, x, z) {
			burst(W.sc, x, 1.6, z, {
				n: 44,
				shape: "ico",
				cols: ["#FFF3B0", "#FFC83D", "#FF8A1F", "#E5484D"],
				spd: 9,
				up: 9,
				grav: 5,
				life: 0.85,
				size: 1.7,
			});
			burst(W.sc, x, 1.2, z, {
				n: 18,
				shape: "ico",
				cols: ["#4A4E57", "#6B707A", "#2E3138"],
				spd: 3,
				up: 5,
				grav: -1.5,
				life: 1.9,
				size: 2.3,
				op: 0.6,
			});
			burst(W.sc, x, 1, z, {
				n: 14,
				shape: "cube",
				cols: ["#2A2F3A", "#C8261B", "#B97A3E"],
				spd: 7,
				up: 11,
				grav: 22,
				life: 1.2,
			});
			W.flash.position.set(x, 3, z);
			W.flash.intensity = 7;
			W.shake = Math.max(W.shake, Math.hypot(x - W.me.x, z - W.me.z) < 9 || W.tv ? 0.6 : 0.3);
			W.plungeT = W.t;
			sfx("thunder");
			sfx("crush");
			const inPad = Math.abs(x) < 11.9 && Math.abs(z) < 11.9,
				sc = new THREE.Mesh(
					new THREE.PlaneGeometry(4.2, 4.2),
					new THREE.MeshBasicMaterial({
						map: W.scorchTex,
						transparent: true,
						depthWrite: false,
						polygonOffset: true,
						polygonOffsetFactor: -1,
					}),
				);
			sc.rotation.set(-Math.PI / 2, 0, Math.random() * 6.283);
			sc.position.set(x, inPad ? 0.01 : -0.29, z);
			W.sc.add(sc);
			W.scorch.push(sc);
		},
		launch(W, e) {
			// blown out of the yard: the truck arcs over the barrier and lands upside down outside
			const d = Math.hypot(e.x, e.z);
			let ux, uz;
			if (d > 1) {
				ux = e.x / d;
				uz = e.z / d;
			} else {
				const a = Math.random() * 6.283;
				ux = Math.cos(a);
				uz = Math.sin(a);
			}
			const sp = (17.5 - Math.min(d, 12)) / 1.33;
			e.fly = true;
			e.vy = 20;
			e.vx = ux * sp;
			e.vz = uz * sp;
			eliminate(W, e);
			if (e.isMe) W.shake = 0.8;
		},
		fallPhys(W, e, dt) {
			if (e.f.wr) return true;
			e.vy -= 30 * dt;
			e.y += e.vy * dt;
			e.x += e.vx * dt;
			e.z += e.vz * dt;
			e.spin = (e.spin || 0) + dt * 7;
			const gy = Math.abs(e.x) < 12 && Math.abs(e.z) < 12 ? 0 : -0.3;
			if (e.vy < 0 && e.y <= gy) {
				e.y = gy;
				e.vx = e.vz = e.vy = 0;
				e.spin = 0;
				e.f.wr = 1;
				burst(W.sc, e.x, gy + 0.3, e.z, {
					n: 12,
					shape: "ico",
					cols: ["#9A7A57", "#7E6649"],
					spd: 3,
					up: 3,
					grav: 10,
					life: 0.7,
				});
				sfx("land");
			}
			return true;
		},
		rules(W, e) {
			if (e.al && !e.d) e.sc = Math.floor(W.t * 10);
		},
		timeUp(W, e) {
			if (e.al) e.sc = this.dur * 10 + 100;
		},
		render(W, e, dt) {
			if (e.f && e.f.wr) {
				e.tr.rotation.set(0, e.yaw, Math.PI);
				e.g.position.y += 1.2;
				if (Math.random() < dt * 2.5)
					burst(W.sc, e.x, e.y + 0.8, e.z, {
						n: 1,
						shape: "ico",
						cols: ["#4A4E57", "#6B707A"],
						spd: 0.4,
						up: 2,
						grav: -1,
						life: 1.6,
						size: 1.2,
						op: 0.45,
					});
			}
			if (W.fxT === W.t) return;
			W.fxT = W.t;
			const R = W.R,
				b = W.bomb,
				live = R.ph === "live" && R.h && !R.h.gone;
			W.flash.intensity = Math.max(0, W.flash.intensity - dt * 18);
			if (W.plunger) W.plunger.position.y = 1.2 - (W.t - (W.plungeT || -9) < 0.6 ? 0.5 : 0);
			b.g.visible = !!live;
			b.ring.visible = !!live;
			if (!live) {
				W.lamps.forEach((m) => (m.emissiveIntensity = 0.3));
				return;
			}
			const h = R.h,
				rem = R.B - W.t,
				fr = Math.max(0, Math.min(1, rem / (R.B - R.S)));
			let x = h.x,
				y = h.y + 1.95,
				z = h.z;
			const dk = (W.t - R.S) / 0.6;
			if (dk < 1) y += (1 - dk) * (1 - dk) * 15;
			const ak = R.aT !== undefined ? (W.t - R.aT) / 0.3 : 1;
			if (ak < 1) {
				x = R.ax + (x - R.ax) * ak;
				z = R.az + (z - R.az) * ak;
				y += Math.sin(ak * Math.PI) * 2.5;
			}
			b.g.position.set(x, y, z);
			b.g.rotation.y = h.yaw;
			b.wick.scale.y = Math.max(0.06, fr);
			b.spark.position.set(0, 0.52 + 0.7 * Math.max(0.06, fr), 0);
			b.spark.scale.setScalar(0.55 + Math.random() * 0.35);
			const hz = 2 + 12 * (1 - fr) * (1 - fr),
				pulse = 0.5 + 0.5 * Math.sin(W.t * hz * 6.283);
			b.red.emissiveIntensity = rem < this.LOCK ? 1.2 : (1 - fr) * 0.9 * pulse;
			b.ring.position.set(h.x, h.y + 0.08, h.z);
			b.ring.scale.setScalar(1 + pulse * 0.12);
			b.ring.material.opacity = 0.45 + pulse * 0.35;
			W.lamps.forEach((m, i) => (m.emissiveIntensity = rem < 3 ? ((W.t * 6 + i) % 2 < 1 ? 1.6 : 0.2) : 0.3));
			if (W.t >= R.nb && W.t < R.B) {
				sfx("beep");
				R.nb = W.t + (rem > 5 ? 1 : rem > 2.5 ? 0.5 : 0.22);
			}
			if (Math.random() < dt * 14)
				burst(W.sc, x, y + 0.6 + 0.7 * fr, z, {
					n: 1,
					shape: "cube",
					cols: ["#FFE27A", "#FFC83D"],
					spd: 1.6,
					up: 2,
					grav: 8,
					life: 0.35,
					size: 0.35,
				});
		},
		cam(W, tgt, pos, far) {
			if (W.tv) return tvCam(W);
			if (!W.me.al) {
				tgt.set(0, 0, 0);
				pos.set(0, 23 * far, 17 * far);
			}
			return [tgt, pos];
		},
		prompt(W, me) {
			const R = W.R;
			if (!R || R.ph !== "live") return R && R.ph === "wait" && W.t > 2 ? "Next load incoming…" : "";
			if (R.h === me)
				return W.t > R.B - this.LOCK ? "💥 Too late! Brace yourself!" : "🧨 You've got the Hot Load! Bump someone!";
			return R.h ? `🧨 ${R.h.p.name} has the Hot Load. Keep away!` : "";
		},
		bot(W, e, dt) {
			const R = W.R,
				h = R && R.ph === "live" ? R.h : null;
			if (!h) return wander(W, e, dt, 7);
			if (h === e) {
				let t = null,
					td = 1e9;
				for (const o of W.list) {
					if (o === e || o.gone || !o.al || o.d) continue;
					if (o.k === R.from && W.t - R.since < 1.3) continue;
					const d = Math.hypot(o.x - e.x, o.z - e.z);
					if (d < td) {
						td = d;
						t = o;
					}
				}
				if (!t) return wander(W, e, dt, 7);
				const s = steer(e, t.x + t.vx * 0.25, t.z + t.vz * 0.25, 1);
				if (td < 4.5 && e.bcd <= 0 && Math.random() < 0.06) s.boost = true;
				return s;
			}
			const dx = e.x - h.x,
				dz = e.z - h.z,
				d = Math.hypot(dx, dz) || 1;
			if (!e.fear) e.fear = 5.5 + (e.i % 3) * 1.2;
			if (d > e.fear) return wander(W, e, dt, 7);
			let ux = dx / d,
				uz = dz / d;
			if (Math.abs(e.x + ux * 6) > 9.5 || Math.abs(e.z + uz * 6) > 9.5) {
				// cornered: slide along the barrier toward the side that leads back to the middle
				const left = -uz * -e.x + ux * -e.z > 0 ? 1 : -1;
				ux = ux * 0.3 - uz * left;
				uz = uz * 0.3 + (dx / d) * left;
			}
			const s = steer(e, e.x + ux * 5, e.z + uz * 5, 1);
			if (d < 2.8 && e.bcd <= 0 && Math.random() < 0.05) {
				s.x = -uz;
				s.y = ux;
				s.boost = true;
			}
			return s;
		},
		botScore: () => 100 + rnd(400),
	},
});
