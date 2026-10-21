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
		how: "Bump a rival to pass the dynamite on. Whoever holds it when it blows is out!",
		build(W) {
			const s = W.sc,
				r = mulberry((W.mg.seed || 1) + 77);
			W.R = { r: -1, ph: "wait", next: 1.2 };
			const tile = (x, w, h, fn) => {
				// draw fn at all 9 wrap offsets so blobs crossing an edge continue on the other side of the tile
				for (const ox of [-w, 0, w])
					for (const oy of [-h, 0, h]) {
						x.save();
						x.translate(ox, oy);
						fn();
						x.restore();
					}
			};
			const dirt = canvasTex(256, 256, (x, w, h) => {
				// packed dirt: soft damp and dry patches, grit, pebbles with little shadows, hairline cracks
				x.fillStyle = "#9A7A57";
				x.fillRect(0, 0, w, h);
				for (let i = 0; i < 26; i++) {
					const px = r() * w,
						py = r() * h,
						rad = 14 + r() * 40,
						dk = r() < 0.5,
						q = x.createRadialGradient(px, py, 0, px, py, rad);
					q.addColorStop(0, dk ? "rgba(92,66,42,.32)" : "rgba(196,160,118,.3)");
					q.addColorStop(1, dk ? "rgba(92,66,42,0)" : "rgba(196,160,118,0)");
					tile(x, w, h, () => {
						x.fillStyle = q;
						x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
					});
				}
				for (let i = 0; i < 1400; i++) {
					x.fillStyle = r() < 0.55 ? "rgba(70,50,30,.2)" : "rgba(255,235,200,.14)";
					const z = 0.8 + r() * 2.4;
					x.fillRect(r() * w, r() * h, z, z);
				}
				for (let i = 0; i < 70; i++) {
					const px = r() * w,
						py = r() * h,
						rad = 1.4 + r() * 2.4,
						a = r() * 3;
					x.fillStyle = "rgba(50,36,22,.35)";
					x.beginPath();
					x.ellipse(px + 1, py + 1.2, rad, rad * 0.8, a, 0, 6.283);
					x.fill();
					x.fillStyle = ["#B59A7A", "#8E8478", "#A7896A", "#C4AE92"][i % 4];
					x.beginPath();
					x.ellipse(px, py, rad, rad * 0.8, a, 0, 6.283);
					x.fill();
				}
				x.strokeStyle = "rgba(60,42,26,.3)";
				x.lineWidth = 1;
				for (let i = 0; i < 10; i++) {
					let px = r() * w,
						py = r() * h;
					x.beginPath();
					x.moveTo(px, py);
					for (let k = 0; k < 5; k++) {
						px += (r() - 0.5) * 22;
						py += (r() - 0.5) * 22;
						x.lineTo(px, py);
					}
					x.stroke();
				}
			});
			dirt.wrapS = dirt.wrapT = THREE.RepeatWrapping;
			dirt.repeat.set(4, 4);
			const pad = new THREE.Mesh(
				new THREE.BoxGeometry(24, 1, 24),
				new THREE.MeshStandardMaterial({ map: dirt, roughness: 1 }),
			);
			pad.position.y = -0.5;
			pad.receiveShadow = true;
			s.add(pad);
			const grav = canvasTex(256, 256, (x, w, h) => {
				x.fillStyle = "#7E6649";
				x.fillRect(0, 0, w, h);
				for (let i = 0; i < 2200; i++) {
					x.fillStyle = ["rgba(60,44,30,.3)", "rgba(170,150,128,.3)", "rgba(110,104,98,.35)"][i % 3];
					const z = 1 + r() * 3;
					x.fillRect(r() * w, r() * h, z, z);
				}
			});
			grav.wrapS = grav.wrapT = THREE.RepeatWrapping;
			grav.repeat.set(30, 30);
			const fl = new THREE.Mesh(
				new THREE.CircleGeometry(90, 40),
				new THREE.MeshStandardMaterial({ map: grav, roughness: 1 }),
			);
			fl.rotation.x = -Math.PI / 2;
			fl.position.y = -0.3;
			fl.receiveShadow = true;
			s.add(fl);
			barrierRing(s, 11);
			this.floor(W, r);
			this.yard(W, r);
			this.mkBomb(W);
			W.trk = tyreTracks(W, "#BBA995", "#FFFFFF", 900, 12, 1, true);
		},
		floor(W, r) {
			// things painted on or lying on the dirt: a worn hazard ring, oil stains, puddles, steel plates, pebbles, planks
			const s = W.sc,
				decal = (tex, w, h, x, z, rot, k, mat) => {
					const m = new THREE.Mesh(
						new THREE.PlaneGeometry(w, h),
						mat ||
							new THREE.MeshBasicMaterial({
								map: tex,
								transparent: true,
								depthWrite: false,
								polygonOffset: true,
								polygonOffsetFactor: -1 - k,
							}),
					);
					m.rotation.set(-Math.PI / 2, 0, rot);
					m.position.set(x, 0.004 + k * 0.001, z);
					m.renderOrder = k;
					m.receiveShadow = true;
					s.add(m);
					return m;
				};
			const ring = canvasTex(256, 256, (x, w, h) => {
				const c = w / 2;
				x.save();
				x.beginPath();
				x.arc(c, c, 124, 0, 6.283);
				x.arc(c, c, 104, 0, 6.283, true);
				x.clip();
				for (let i = -20; i < 20; i++) {
					x.fillStyle = i % 2 ? "#F2C230" : "#22252C";
					x.beginPath();
					x.moveTo(c + i * 14, 0);
					x.lineTo(c + i * 14 + 14, 0);
					x.lineTo(c + i * 14 + 14 - h, h);
					x.lineTo(c + i * 14 - h, h);
					x.fill();
				}
				x.restore();
				x.strokeStyle = "#F2C230";
				x.lineWidth = 4;
				x.setLineDash([14, 12]);
				x.beginPath();
				x.arc(c, c, 62, 0, 6.283);
				x.stroke();
				x.globalCompositeOperation = "destination-out";
				for (let i = 0; i < 260; i++) {
					x.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.7})`;
					const z = 2 + r() * 9;
					x.fillRect(r() * w, r() * h, z, z * (0.4 + r()));
				}
			});
			decal(ring, 7.5, 7.5, 0, 0, 0.3, 0).material.opacity = 0.6;
			const oil = canvasTex(128, 128, (x, w, h) => {
				for (let i = 0; i < 6; i++) {
					const px = w / 2 + (r() - 0.5) * 50,
						py = h / 2 + (r() - 0.5) * 50,
						rad = 18 + r() * 26,
						q = x.createRadialGradient(px, py, 0, px, py, rad);
					q.addColorStop(0, "rgba(22,18,16,.55)");
					q.addColorStop(0.7, "rgba(30,24,20,.3)");
					q.addColorStop(1, "rgba(30,24,20,0)");
					x.fillStyle = q;
					x.fillRect(0, 0, w, h);
				}
			});
			[
				[-6.5, -4.5, 2.4],
				[7, 6, 1.8],
				[4.5, -7.5, 2],
			].forEach(([x, z, sz]) => decal(oil, sz, sz, x, z, r() * 6, 1));
			const pud = canvasTex(128, 128, (x, w, h) => {
				x.fillStyle = "#fff";
				x.filter = "blur(3px)";
				x.beginPath();
				for (let i = 0; i <= 16; i++) {
					const a = (i / 16) * 6.283,
						rr = 40 + r() * 18;
					x[i ? "lineTo" : "moveTo"](w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr * 0.8);
				}
				x.fill();
			});
			[
				[-7.5, 6.5, 3.2, 0.4],
				[8, -2, 2.6, 1.9],
			].forEach(([x, z, sz, rot]) =>
				decal(
					null,
					sz,
					sz,
					x,
					z,
					rot,
					2,
					new THREE.MeshStandardMaterial({
						color: "#4E5A62",
						map: pud,
						transparent: true,
						opacity: 0.85,
						roughness: 0.08,
						metalness: 0.45,
						depthWrite: false,
						polygonOffset: true,
						polygonOffsetFactor: -3,
					}),
				),
			);
			[
				[-3.5, 7.5, 0.25, "#6E737C"],
				[6.5, 2.2, -0.5, "#8A6A52"],
			].forEach(([x, z, ry, col]) => {
				const g = new THREE.Group();
				g.position.set(x, 0, z);
				g.rotation.y = ry;
				g.add(B(2.2, 0.03, 1.4, col, 0, 0.015, 0));
				for (const bx of [-0.95, 0.95])
					for (const bz of [-0.55, 0.55]) g.add(Cy(0.06, 0.06, 0.03, 6, "#3A3F48", bx, 0.04, bz));
				g.traverse((o) => (o.castShadow = false));
				s.add(g);
			});
			{
				const N = 110,
					im = new THREE.InstancedMesh(
						new THREE.IcosahedronGeometry(0.16, 0),
						new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }),
						N,
					),
					o = new THREE.Object3D(),
					c = new THREE.Color();
				for (let i = 0; i < N; i++) {
					const sc = 0.5 + r() * 1.3;
					o.position.set((r() - 0.5) * 22.5, 0.03 * sc, (r() - 0.5) * 22.5);
					o.rotation.set(r() * 3, r() * 3, r() * 3);
					o.scale.set(sc, sc * 0.55, sc);
					o.updateMatrix();
					im.setMatrixAt(i, o.matrix);
					im.setColorAt(i, c.set(["#A08A70", "#7F7870", "#B7A48A", "#8C6E52"][i % 4]));
				}
				im.receiveShadow = true;
				s.add(im);
			}
			[
				[-9.8, -9.2, 0.6],
				[9.6, 9.9, 2.1],
				[-10.1, 3.5, 1.4],
			].forEach(([x, z, ry]) => {
				const p = B(1.7, 0.07, 0.28, "#B08A5A", x, 0.035, z);
				p.rotation.y = ry;
				p.castShadow = false;
				s.add(p);
			});
		},
		yard(W, r) {
			// demolition yard packed in tight around the barrier (phones only see a few metres past it): containers and the sign behind,
			// a container wall, blast bunker with the detonator, crates and drums at the sides, only low things in front
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
			cont(-8.2, -14.2, 0, "#2F7DE1");
			cont(-1.9, -14.4, 0.03, "#C8402F");
			cont(4.4, -14.2, 0, "#1FA35C");
			cont(-5.1, -14.3, 0, "#FF8A1F", 2.6);
			cont(-14.3, -3.8, Math.PI / 2, "#7A5BD6");
			cont(-14.3, 2.6, Math.PI / 2, "#8E96A3");
			const cm = new THREE.MeshStandardMaterial({ map: hlCrateTex(), roughness: 0.9 });
			const crate = (x, y, z, ry) => {
				const c = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), cm);
				c.position.set(x, y + 0.25, z);
				c.rotation.y = ry;
				c.castShadow = c.receiveShadow = true;
				s.add(c);
			};
			const stack = (x, z, n, along) => {
				for (let k = 0; k < n; k++) {
					const lv = k < 3 ? 0 : 1,
						o = (k < 3 ? k - 1 : k - 3.5) * 1.15;
					crate(x + (along ? 0 : o), lv * 1.1, z + (along ? o : 0), (r() - 0.5) * 0.3);
				}
			};
			stack(9.8, -13.6, 5);
			stack(-13.6, -9.6, 4, true);
			stack(13.6, 1.8, 5, true);
			stack(7.2, 13.3, 2);
			const drum = (x, z, col, lie) => {
				const d = new THREE.Group();
				d.add(Cy(0.42, 0.42, 1.2, 14, col, 0, 0, 0));
				[-0.38, 0.38].forEach((y) => d.add(Cy(0.45, 0.45, 0.07, 14, "#2A2F3A", 0, y, 0)));
				if (lie) {
					d.rotation.set(Math.PI / 2, r() * 3, 0, "YXZ");
					d.position.set(x, 0.12, z);
				} else d.position.set(x, 0.3, z);
				s.add(d);
			};
			drum(13.4, 6.4, "#2F7DE1");
			drum(14.4, 7.1, "#C8402F");
			drum(13.6, 7.7, "#2F7DE1");
			drum(-13.4, 8.2, "#FFC83D");
			drum(-14.3, 8.9, "#FFC83D");
			drum(-4.2, 13.3, "#C8402F", true);
			drum(-2.8, 13.5, "#2F7DE1");
			const tyres = (x, z, n) => {
				for (let k = 0; k < n; k++) {
					const t = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.22, 8, 16), M("#24272D", { roughness: 0.9 }));
					t.rotation.x = -Math.PI / 2;
					t.position.set(x + (r() - 0.5) * 0.12, -0.08 + k * 0.42, z + (r() - 0.5) * 0.12);
					t.castShadow = true;
					s.add(t);
				}
			};
			tyres(-9, 13.4, 3);
			tyres(-10.4, 13.6, 2);
			tyres(13.5, 10.6, 3);
			[
				[10.6, 13.2],
				[11.6, 12.8],
				[-13.1, 11.6],
			].forEach(([x, z]) => {
				s.add(
					mesh(new THREE.ConeGeometry(0.32, 0.9, 12), "#FF7A1A")
						.translateX(x)
						.translateY(0.15)
						.translateZ(z),
				);
				s.add(B(0.7, 0.06, 0.7, "#2A2F3A", x, -0.27, z));
			});
			{
				// low DANGER board in front, facing the camera
				const tex = canvasTex(256, 80, (x, w, h) => {
					x.fillStyle = "#F2C230";
					x.fillRect(0, 0, w, h);
					x.fillStyle = "#22252C";
					x.fillRect(0, 0, w, 10);
					x.fillRect(0, h - 10, w, 10);
					x.font = "bold 30px Bungee, 'Arial Black', Impact, sans-serif";
					x.textAlign = "center";
					x.textBaseline = "middle";
					x.fillText("DANGER!", w / 2, h / 2 - 9);
					x.font = "bold 15px 'Arial Black', Impact, sans-serif";
					x.fillText("BLASTING IN PROGRESS", w / 2, h / 2 + 18);
				});
				const g = new THREE.Group();
				g.position.set(1.4, -0.3, 13.6);
				g.rotation.y = 0.1;
				const bd = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1, 0.08), [
					M("#22252C"),
					M("#22252C"),
					M("#22252C"),
					M("#22252C"),
					new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
					M("#22252C"),
				]);
				bd.position.y = 1.15;
				bd.castShadow = true;
				g.add(bd, B(0.12, 0.7, 0.12, "#5A6272", -1.3, 0.35, -0.06), B(0.12, 0.7, 0.12, "#5A6272", 1.3, 0.35, -0.06));
				s.add(g);
			}
			{
				// blast bunker with sandbags and the detonator plunger on the right
				const g = new THREE.Group();
				g.position.set(14.6, -0.3, -5.8);
				g.rotation.y = -Math.PI / 2;
				g.add(B(3.4, 2.2, 2.4, "#9EA3AB", 0, 1.1, -0.2), B(3.6, 0.25, 2.6, "#8A9099", 0, 2.32, -0.2));
				g.add(B(2.2, 0.28, 0.06, "#1B1F27", 0, 1.5, 1.01));
				for (let i = 0; i < 7; i++) {
					const sb = B(0.62, 0.26, 0.42, "#C9B48A", -1.65 + i * 0.55, 0.13 + (i % 2) * 0.01, 1.35);
					sb.rotation.y = (r() - 0.5) * 0.3;
					g.add(sb);
				}
				for (let i = 0; i < 6; i++) g.add(B(0.62, 0.26, 0.42, "#BBA67C", -1.38 + i * 0.55, 0.39, 1.33));
				g.add(B(1.2, 0.7, 0.8, "#6B4F35", 2.4, 0.35, 1.2), B(0.6, 0.45, 0.5, "#C8261B", 2.4, 0.93, 1.2));
				const pl = new THREE.Group();
				pl.add(Cy(0.05, 0.05, 0.7, 6, "#B9C0CC", 0, 0.35, 0), B(0.7, 0.1, 0.1, "#2A2F3A", 0, 0.7, 0));
				pl.position.set(2.4, 1.05, 1.2);
				g.add(pl);
				s.add(g);
				W.plunger = pl;
				W.plungeY = 1.05;
			}
			W.lamps = [];
			[
				[-1, -1],
				[1, -1],
				[-1, 1],
				[1, 1],
			].forEach(([sx, sz]) => {
				if (sz < 0) {
					// floodlights only at the back: in front they'd stand between the camera and the yard
					const x = sx * 13.8,
						z = sz * 13.8,
						h = new THREE.Group();
					s.add(B(0.4, 10, 0.4, "#5A6272", x, 4.7, z));
					h.position.set(x, 9.8, z);
					h.rotation.y = Math.atan2(-x, -z);
					h.add(B(2.4, 1, 0.5, "#3A404C", 0, 0, 0));
					h.add(B(2.1, 0.75, 0.08, "#FFF6D8", 0, 0, 0.29, { emissive: "#FFF1C4", emissiveIntensity: 0.9 }));
					s.add(h);
				}
				const lm = new THREE.MeshStandardMaterial({ color: "#FFB020", emissive: "#FF9A00", emissiveIntensity: 0.3 });
				s.add(Cy(0.1, 0.1, 1.1, 8, "#3A404C", sx * 11.5, 0.9, sz * 11.5));
				const b = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 12), lm);
				b.position.set(sx * 11.5, 1.6, sz * 11.5);
				s.add(b);
				W.lamps.push(lm);
			});
			{
				const sg = signBoard("HOT LOAD", { style: "race", w: 11, h: 2.2, col: "#FF6A3D" });
				sg.position.set(0, 7.3, -15.9);
				s.add(sg, B(0.35, 7, 0.35, "#5A6272", -4.6, 3.2, -16.1), B(0.35, 7, 0.35, "#5A6272", 4.6, 3.2, -16.1));
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
			const sp = (20 - Math.min(d, 12)) / 1.33;
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
			tyreStep(W, W.trk, dt);
			const R = W.R,
				b = W.bomb,
				live = R.ph === "live" && R.h && !R.h.gone;
			W.flash.intensity = Math.max(0, W.flash.intensity - dt * 18);
			if (W.plunger) W.plunger.position.y = W.plungeY - (W.t - (W.plungeT || -9) < 0.6 ? 0.5 : 0);
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

/* ---------- Paint the Lot ---------- */
/* Tron / Paper.io style. The lot is a grid of 0.5 m cells (W.P.own = owner index per cell, -1 = bare). A truck outside its
   own paint leaves a trail; driving back onto its paint (or its own trail) closes the loop: a bucket tips and everything the
   loop encloses becomes its paint. Another truck crossing an open trail washes it away, and so does a rival's fill over it.
   Each device runs its own trucks and shares closed loops as events in e.f.ev ([n, t * 100, ...trail cells], the last 6) and
   the open trail as points in e.f.tp; every device replays all events in time order, so the paint ends up the same everywhere. */
Object.assign(MG, {
	paint: {
		name: "Paint the Lot",
		kind: "arena",
		ctrl: "stick",
		hi: true,
		unit: "%",
		dur: 50,
		bound: { t: "sq", h: 17 },
		water: false,
		bare: true,
		S: 17,
		CS: 0.5,
		ramLabel: "BOOST",
		noAssist: true,
		canRam: () => false,
		CD: 4,
		sun: [12, 19, 13],
		look: {
			exp: 0.85,
			amb: 0.75,
			sun: 1.4,
			warm: 0.62,
			env: 0.35,
			paint: 0.5,
			haze: 46,
			glow: 1.01,
			bloom: 0.25,
			vig: 0,
			sat: 0.08,
			fill: ["#86AEEA", "#8E7A62"],
			sky: ["#3D73C2", "#98BEE2", "#F6D2A0"],
		},
		how: "Loop out of your paint and back to fill everything inside. Cross a rival's open trail to wash it away!",
		kits() {
			this.canKits();
			bakeKit(lightTowerModel());
		},
		CANS: ["#E5484D", "#2F7DE1", "#FFC83D", "#1FA35C", "#8E5BE0", "#FF8A1F"],
		canKits() {
			return this.CANS.map((c) => bakeKit(paintCanModel(c)));
		},
		build(W) {
			const S = this.S,
				N = Math.round((2 * S) / this.CS),
				n = W.plist.length;
			this.yard(W);
			const P = (W.P = {
				N,
				own: new Int8Array(N * N).fill(-1),
				ct: new Float32Array(N * N).fill(-1e9),
				disp: new Int8Array(N * N).fill(-1),
				rev: new Float32Array(N * N),
				base: null,
				evs: [],
				keys: new Set(),
				fresh: [],
				lastT: -1e9,
				q: new Int32Array(N * N),
				seen: new Uint8Array(N * N),
				cols: W.plist.map((q) => pcol(q)),
				cans: [],
				box: [1e9, 1e9, -1, -1],
				drawn: -1,
			});
			/* each truck starts on a round patch of its own paint */
			W.plist.forEach((q, i) => {
				const sp = this.spawn(W, i, n);
				for (let cz = 0; cz < N; cz++)
					for (let cx = 0; cx < N; cx++) {
						const [x, z] = this.ctr(cx, cz);
						if (Math.hypot(x - sp.x, z - sp.z) < 2.4) P.own[cz * N + cx] = i;
					}
			});
			P.base = P.own.slice();
			/* the paint layer: a canvas over the lot, redrawn when cells change */
			const px = 6;
			P.px = px;
			P.cv = document.createElement("canvas");
			P.cv.width = P.cv.height = N * px;
			P.cx = P.cv.getContext("2d");
			P.tex = new THREE.CanvasTexture(P.cv);
			P.tex.anisotropy = 4;
			const pm = new THREE.Mesh(
				new THREE.PlaneGeometry(2 * S, 2 * S),
				new THREE.MeshStandardMaterial({
					map: P.tex,
					transparent: true,
					depthWrite: false,
					roughness: 0.3,
					metalness: 0,
					polygonOffset: true,
					polygonOffsetFactor: -3,
					polygonOffsetUnits: -6,
				}),
			);
			pm.rotation.x = -Math.PI / 2;
			pm.position.y = 0.03;
			pm.renderOrder = 3;
			pm.receiveShadow = true;
			W.sc.add(pm);
			P.layer = pm;
			/* one ribbon per truck for its open trail */
			P.rib = W.plist.map((q, i) => {
				const MX = 600,
					geo = new THREE.BufferGeometry(),
					pos = new Float32Array(MX * 2 * 3),
					nor = new Float32Array(MX * 2 * 3),
					idx = [];
				for (let k = 0; k < MX * 2; k++) nor[k * 3 + 1] = 1;
				for (let k = 0; k < MX - 1; k++) {
					const a = k * 2;
					idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
				}
				geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
				geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
				geo.setIndex(idx);
				geo.setDrawRange(0, 0);
				const m = new THREE.Mesh(
					geo,
					new THREE.MeshStandardMaterial({
						color: P.cols[i],
						emissive: P.cols[i],
						emissiveIntensity: 0.5,
						roughness: 0.25,
						polygonOffset: true,
						polygonOffsetFactor: -5,
						polygonOffsetUnits: -10,
					}),
				);
				m.frustumCulled = false;
				m.renderOrder = 4;
				m.receiveShadow = true;
				W.sc.add(m);
				return { geo, pos, m, MX };
			});
		},
		yard(W) {
			/* SPLASH PAINTS factory car park: asphalt lot with bay lines inside a kerb of paint-coloured blocks, the factory with its
			   sign, drips and a giant tipped can behind, mixing tanks and pallets of cans at the sides, light towers, trees beyond */
			const s = W.sc,
				S = this.S,
				r = mulberry((W.mg.seed || 1) + 31);
			s.add(texBox(2 * S + 1, 1, 2 * S + 1, asphaltTex(), 8, 0, -0.5, 0, { color: "#F4F6F9" }));
			s.add(texBox(90, 1, 90, concreteTex(), 8, 0, -0.56, 0, { color: "#D9DCE1" }));
			s.add(texBox(320, 1, 320, grassTex(), 10, 0, -0.62, 0));
			roadWear(s, -S, S, S, -S, 0.004, 1.2, 0.3);
			/* parking bays round the edge and down the middle (the paint covers them) */
			for (let i = -S + 2.6; i < S - 2; i += 2.6) {
				decal(s, new THREE.PlaneGeometry(0.1, 3.2), "#E9EDF2", i, 0.008, -S + 1.9, 0.75);
				decal(s, new THREE.PlaneGeometry(0.1, 3.2), "#E9EDF2", i, 0.008, S - 1.9, 0.75);
			}
			decal(s, new THREE.PlaneGeometry(2 * S - 5, 0.1), "#E9EDF2", 0, 0.008, -S + 3.5, 0.75);
			decal(s, new THREE.PlaneGeometry(2 * S - 5, 0.1), "#E9EDF2", 0, 0.008, S - 3.5, 0.75);
			/* kerb blocks, alternating white and the can colours */
			{
				const R = S + 0.45,
					C = this.CANS;
				let k = 0;
				for (let i = -S; i < S - 0.01; i += 2)
					[
						[i + 1, -R, 0],
						[i + 1, R, 0],
						[-R, i + 1, 1],
						[R, i + 1, 1],
					].forEach(([x, z, rt], q) => {
						const col = (k + q) % 2 ? "#F4F6F9" : C[(k + q) % C.length];
						s.add(B(rt ? 0.6 : 1.94, 0.5, rt ? 1.94 : 0.6, col, x, 0.25, z));
						k++;
					});
				[-1, 1].forEach((a) =>
					[-1, 1].forEach((b) => s.add(B(0.7, 0.62, 0.7, "#3A3F48", a * (S + 0.45), 0.31, b * (S + 0.45)))),
				);
			}
			/* the factory behind the lot */
			const FZ = -(S + 9),
				FD = 10,
				FF = FZ + FD / 2;
			s.add(B(46, 8, FD, "#E8E2D6", 0, 4, FZ), B(46.4, 0.5, FD + 0.4, "#5A6272", 0, 8.25, FZ));
			for (let x = -22; x <= 22.01; x += 2.2) s.add(B(0.24, 7.4, 0.12, "#D6CFC2", x, 3.7, FF + 0.06));
			[-14, 0, 14].forEach((x, j) => {
				s.add(B(6.2, 5.6, 0.2, "#3A3F48", x, 2.8, FF + 0.1));
				const dh = j === 1 ? 1.8 : 5.2;
				s.add(B(5.6, dh, 0.14, "#A9B0B9", x, 5.6 - dh / 2 - 0.3, FF + 0.27));
				for (let y = 5.3 - dh + 0.2; y < 5.25; y += 0.4) s.add(B(5.6, 0.1, 0.1, "#9AA1AB", x, y, FF + 0.39));
				[-1, 1].forEach((sd) => s.add(B(0.4, 5.8, 0.1, "#FFC83D", x + sd * 3.15, 2.9, FF + 0.25)));
			});
			/* paint running down the facade from the roof edge */
			this.CANS.forEach((c, i) => {
				const x = -20 + i * 7.3 + (r() - 0.5) * 2,
					l = 1.4 + r() * 2.4;
				if ([-14, 0, 14].some((d) => Math.abs(x - d) < 3.6)) return;
				s.add(B(0.9, l, 0.08, c, x, 8 - l / 2, FF + 0.17), B(0.4, 0.5, 0.08, c, x - 0.2, 8 - l - 0.15, FF + 0.17));
				s.add(B(1.1, 0.18, 0.4, c, x, 8.1, FF + 0.05));
			});
			{
				const sg = signBoard("SPLASH PAINTS", { style: "race", w: 15, h: 2.6, col: "#E5484D" });
				sg.position.set(-6, 10.2, FF - 1.4);
				s.add(sg);
			}
			{
				/* giant can tipped on the roof, pouring onto the facade */
				const gc = paintCanModel("#2F7DE1", true);
				gc.scale.setScalar(3.2);
				gc.rotation.set(0, 0.3, -0.5);
				gc.position.set(12, 8.7, FZ + 1);
				s.add(gc, B(2.6, 0.2, 2.2, "#2F7DE1", 13.4, 8.6, FF - 1.1), B(1.4, 2.2, 0.1, "#2F7DE1", 13.6, 7.3, FF + 0.21));
			}
			/* mixing tanks on the east side */
			[
				[S + 6, -6, "#E5484D"],
				[S + 6, -1.5, "#FFC83D"],
				[S + 6, 3, "#2F7DE1"],
			].forEach(([x, z, c]) => {
				s.add(Cy(1.8, 1.8, 6, 16, "#DDE1E6", x, 3.4, z, { metalness: 0.4, roughness: 0.4 }));
				s.add(Cy(1.86, 1.86, 1.2, 16, c, x, 4.6, z), Cy(1.2, 1.8, 0.8, 16, "#C9CED6", x, 6.8, z));
				s.add(Cy(0.4, 0.4, 0.4, 8, "#8E96A3", x, 7.4, z));
				[0, 1, 2, 3].forEach((k) => {
					const a = (k / 4) * 6.283 + 0.4;
					s.add(B(0.18, 0.5, 0.18, "#5A6272", x + Math.cos(a) * 1.5, 0.25, z + Math.sin(a) * 1.5));
				});
				s.add(B(0.1, 6.2, 0.4, "#5A6272", x - 1.86, 3.4, z));
				s.add(roundShadow(4.4, 0.32, x, z, 0.03));
			});
			s.add(B(0.4, 0.4, 10, "#8E96A3", S + 6, 7.6, -1.5));
			/* pallets of cans: west side and the back corners */
			{
				const kits = this.canKits(),
					L = [],
					pal = (x, z, rows) => {
						s.add(B(2.6, 0.18, 2.6, "#B07A45", x, 0.09, z));
						s.add(contactShadow(2.8, 2.8, 0.3, x, z, 0.02));
						for (let a = 0; a < 3; a++)
							for (let b = 0; b < 3; b++) {
								const h = Math.max(1, rows - ((a + b) % 2));
								for (let y = 0; y < h; y++)
									L.push({
										k: Math.floor(r() * kits.length),
										x: x - 0.86 + a * 0.86,
										y: 0.18 + y * 1.04,
										z: z - 0.86 + b * 0.86,
										ry: r() * 6,
									});
							}
					};
				pal(-S - 3.6, -8, 2);
				pal(-S - 3.6, -4.6, 1);
				pal(-S - 6.6, -6.3, 2);
				pal(-S - 3.6, 6.5, 1);
				pal(S + 3.6, 8.5, 2);
				pal(-11, -S - 3.4, 2);
				pal(8, -S - 3.4, 1);
				/* loose cans by the kerb, one knocked over in front */
				[
					[-S - 1.6, 1.5],
					[-S - 1.8, 2.6],
					[S + 1.7, -9],
					[S + 1.6, 12],
					[-6, S + 1.8],
					[5.5, S + 1.7],
				].forEach(([x, z]) => L.push({ k: Math.floor(r() * kits.length), x, y: 0, z, ry: r() * 6 }));
				placeKits(s, kits, L, 0);
				const sp = paintCanModel("#1FA35C", true);
				sp.rotation.set(0, 0.6, Math.PI / 2);
				sp.position.set(-2.2, 0.45, S + 2.2);
				s.add(sp);
				decal(s, new THREE.CircleGeometry(1.1, 18), "#1FA35C", -1.1, 0.012, S + 2.6, 0.95);
			}
			/* light towers in the back corners, trees beyond */
			[-1, 1].forEach((sd) => {
				const lt = kitGroup(bakeKit(lightTowerModel()));
				lt.position.set(sd * (S + 3.5), 0, -S - 3.2);
				lt.rotation.y = sd * 0.6;
				s.add(lt);
			});
			for (let i = 0; i < 16; i++) {
				const u = (r() - 0.5) * 90,
					d = 40 + r() * 12,
					[x, z] = i % 3 === 0 ? [-d, u] : i % 3 === 1 ? [d, u] : [u, d];
				s.add(tree(x, z, 1.2 + r() * 0.8, i % 3));
			}
		},
		spawn: ringSpawn(10),
		cell(x, z) {
			const N = W.P.N,
				cx = Math.max(0, Math.min(N - 1, Math.floor((x + this.S) / this.CS))),
				cz = Math.max(0, Math.min(N - 1, Math.floor((z + this.S) / this.CS)));
			return cz * N + cx;
		},
		ctr(cx, cz) {
			return [-this.S + (cx + 0.5) * this.CS, -this.S + (cz + 0.5) * this.CS];
		},
		phys(W, e, inp, dt) {
			const was = e.bcd;
			arenaPhys(W, e, inp, dt);
			if (e.bcd > was + 0.5) e.bcd = this.CD;
		},
		ramCd: (W) => Math.min(1, W.me.bcd / MG.paint.CD),
		/* ---- the grid: replay closed loops ---- */
		fill(W, ev, keep) {
			/* trail cells become q's, then everything the outside can't reach without crossing q's paint does too */
			const P = W.P,
				N = P.N,
				own = P.own,
				q = ev.q,
				t = ev.t,
				Q = P.q,
				seen = P.seen,
				ch = keep ? [] : null;
			for (const c of ev.cells)
				if (own[c] !== q) {
					if (ch) ch.push(c);
					own[c] = q;
					P.ct[c] = t;
				}
			seen.fill(0);
			let h = 0,
				tl = 0;
			const push = (c) => {
				if (!seen[c] && own[c] !== q) {
					seen[c] = 1;
					Q[tl++] = c;
				}
			};
			for (let k = 0; k < N; k++) {
				push(k);
				push((N - 1) * N + k);
				push(k * N);
				push(k * N + N - 1);
			}
			while (h < tl) {
				const c = Q[h++],
					x = c % N;
				if (x > 0) push(c - 1);
				if (x < N - 1) push(c + 1);
				if (c >= N) push(c - N);
				if (c < N * (N - 1)) push(c + N);
			}
			for (let c = 0; c < N * N; c++)
				if (!seen[c] && own[c] !== q) {
					if (ch) ch.push(c);
					own[c] = q;
					P.ct[c] = t;
				}
			return ch;
		},
		addEv(W, e, raw) {
			const P = W.P;
			if (!Array.isArray(raw) || raw.length < 3) return;
			const key = e.k + ":" + raw[0];
			if (P.keys.has(key)) return;
			P.keys.add(key);
			const ev = { q: e.i, n: raw[0], t: raw[1] / 100, cells: raw.slice(2).filter((c) => c >= 0 && c < P.N * P.N) };
			P.evs.push(ev);
			P.fresh.push(ev);
			mgLog(W, `${e.local ? "sends" : "got"} ${mgName(e)} loop #${raw[0]} (${ev.cells.length} cells)`);
		},
		replay(W) {
			const P = W.P;
			if (!P.fresh.length) return;
			const ord = (a, b) => a.t - b.t || a.q - b.q || a.n - b.n,
				fresh = P.fresh.sort(ord),
				newC = [];
			P.fresh = [];
			P.evs.sort(ord);
			if (fresh[0].t < P.lastT) {
				/* an event from the past arrived: replay everything from the start */
				P.own.set(P.base);
				P.ct.fill(-1e9);
				P.evs.forEach((ev) => {
					const ch = this.fill(W, ev, fresh.includes(ev));
					if (ch) newC.push([ev, ch]);
				});
			} else fresh.forEach((ev) => newC.push([ev, this.fill(W, ev, true)]));
			P.lastT = Math.max(P.lastT, fresh[fresh.length - 1].t);
			newC.forEach(([ev, ch]) => {
				if (!ch.length) return;
				let sx = 0,
					sz = 0;
				const pts = ch.map((c) => this.ctr(c % P.N, Math.floor(c / P.N)));
				pts.forEach(([x, z]) => {
					sx += x;
					sz += z;
				});
				sx /= pts.length;
				sz /= pts.length;
				let b = pts[0],
					bd = 1e9;
				pts.forEach((p) => {
					const d = Math.hypot(p[0] - sx, p[1] - sz);
					if (d < bd) {
						bd = d;
						b = p;
					}
				});
				/* only a real loop gets a bucket; skimming the edge of your paint closes tiny ones that just paint in place */
				const recent = W.t - ev.t < 1.5 && ch.length >= this.BUCKET,
					t0 = W.t + 0.5;
				ch.forEach((c, j) => {
					const [x, z] = pts[j];
					P.rev[c] = recent ? t0 + Math.hypot(x - b[0], z - b[1]) / 15 : 0;
				});
				if (recent) this.bucket(W, ev.q, b[0], b[1], ch.length);
			});
		},
		/* ---- paint layer ---- */
		draw(W, bx) {
			/* each pixel blends the 2x2 nearest cells (bilinear weight per owner), so the outlines come out smooth instead of
			   stepped; the sample point is pushed around by a fixed wobble field so the edges are wavy like spilled paint.
			   The winner's lead over the runner-up gives soft edges and a darker wet rim. Only the changed box is redrawn. */
			const P = W.P,
				N = P.N,
				px = P.px,
				Z = N * px,
				D = P.disp;
			if (!P.img) {
				P.img = P.cx.createImageData(Z, Z);
				P.rgb = P.cols.map((c) => {
					const k = new THREE.Color(c);
					return [k.r * 255, k.g * 255, k.b * 255];
				});
				const r = mulberry(4242),
					wv = Array.from({ length: 6 }, (_, i) => ({
						a: r() * 6.283,
						f: (i < 3 ? 0.55 : 1.3) * (0.8 + r() * 0.4),
						p: r() * 6.283,
						m: i < 3 ? 0.3 : 0.12,
					}));
				P.wx = new Float32Array(Z * Z);
				P.wz = new Float32Array(Z * Z);
				for (let v = 0; v < Z; v++)
					for (let u = 0; u < Z; u++) {
						const gx = (u + 0.5) / px,
							gz = (v + 0.5) / px;
						let ox = 0,
							oz = 0;
						wv.forEach((w, i) => {
							const s = Math.sin((gx * Math.cos(w.a) + gz * Math.sin(w.a)) * w.f + w.p) * w.m;
							if (i % 2) ox += s;
							else oz += s;
						});
						P.wx[v * Z + u] = ox;
						P.wz[v * Z + u] = oz;
					}
			}
			const dat = P.img.data,
				rgb = P.rgb,
				u0 = Math.max(0, (bx[0] - 2) * px),
				v0 = Math.max(0, (bx[1] - 2) * px),
				u1 = Math.min(Z, (bx[2] + 3) * px),
				v1 = Math.min(Z, (bx[3] + 3) * px),
				ow = [0, 0, 0, 0],
				wt = [0, 0, 0, 0];
			let n = 0;
			const add = (o, w) => {
				for (let k = 0; k < n; k++)
					if (ow[k] === o) {
						wt[k] += w;
						return;
					}
				ow[n] = o;
				wt[n++] = w;
			};
			for (let v = v0; v < v1; v++)
				for (let u = u0; u < u1; u++) {
					const i = v * Z + u,
						gx = Math.max(0, Math.min(N - 1.001, (u + 0.5) / px - 0.5 + P.wx[i])),
						gz = Math.max(0, Math.min(N - 1.001, (v + 0.5) / px - 0.5 + P.wz[i])),
						ix = Math.floor(gx),
						iz = Math.floor(gz),
						fx = gx - ix,
						fz = gz - iz,
						c = iz * N + ix,
						cx1 = ix < N - 1 ? 1 : 0,
						cz1 = iz < N - 1 ? N : 0;
					n = 0;
					add(D[c], (1 - fx) * (1 - fz));
					add(D[c + cx1], fx * (1 - fz));
					add(D[c + cz1], (1 - fx) * fz);
					add(D[c + cx1 + cz1], fx * fz);
					let b = 0,
						s2 = 0,
						wb = 0;
					for (let k = 1; k < n; k++) if (wt[k] > wt[b]) b = k;
					for (let k = 0; k < n; k++) {
						if (k !== b && wt[k] > s2) s2 = wt[k];
						if (ow[k] < 0) wb = wt[k];
					}
					const o = ow[b],
						j = i * 4;
					if (o < 0) {
						dat[j + 3] = 0;
						continue;
					}
					const lead = wt[b] - s2,
						sh = 0.62 + 0.38 * Math.min(1, lead / 0.4),
						cl = rgb[o];
					dat[j] = cl[0] * sh;
					dat[j + 1] = cl[1] * sh;
					dat[j + 2] = cl[2] * sh;
					dat[j + 3] = wb > 0 ? Math.min(255, (wt[b] - wb) * 1400) : 255;
				}
			P.cx.putImageData(P.img, 0, 0, u0, v0, u1 - u0, v1 - v0);
			P.tex.needsUpdate = true;
		},
		bucket(W, q, x, z, size) {
			const g = new THREE.Group(),
				can = paintCanModel(W.P.cols[q], true),
				sc = Math.min(2.2, 1.3 + size / 400);
			can.position.x = -0.45;
			g.add(can);
			g.scale.setScalar(sc);
			g.position.set(x + 0.45 * sc, 8, z);
			W.sc.add(g);
			W.P.cans.push({ g, t0: W.t, x, z, q, sc, sp: false });
		},
		cans(W) {
			const P = W.P;
			P.cans = P.cans.filter((b) => {
				const a = W.t - b.t0;
				if (a > 1.6 || a < -1) {
					W.sc.remove(b.g);
					return false;
				}
				const fall = Math.min(1, a / 0.3);
				b.g.position.y = 8 * (1 - fall * fall);
				b.g.rotation.z = a < 0.3 ? 0 : Math.min(1.95, (a - 0.3) * 9);
				b.g.scale.setScalar(b.sc * (a > 1.25 ? Math.max(0.01, 1 - (a - 1.25) / 0.35) : 1));
				if (!b.sp && a > 0.48) {
					b.sp = true;
					const c = P.cols[b.q];
					burst(W.sc, b.x, 0.6, b.z, {
						n: 26,
						shape: "ico",
						cols: [c, c, "#FFFFFF"],
						spd: 6,
						up: 6,
						grav: 16,
						life: 0.75,
						size: 1.1,
					});
					if (W.tv || Math.hypot(b.x - W.me.x, b.z - W.me.z) < 14) sfx("splash");
					if (!W.tv && W.me.i === b.q) W.shake = Math.max(W.shake, 0.18);
				}
				return true;
			});
		},
		/* ---- trails ---- */
		initEnt(W, e) {
			e.pl = { cells: [], at: new Map(), vt: new Map(), pts: [], n: 0, ev: [], lx: e.x, lz: e.z, cut: 0 };
			e.f.tp = [];
			e.f.ev = [];
			e.f.cut = 0;
			this.mkRoller(W, e);
		},
		/* ---- paint roller towed behind each truck: a trailing arm from a hitch at the back, so it swings out on turns and
		   settles back in line, and the open trail is drawn from it ---- */
		RL: 1.25,
		BUCKET: 16,
		mkRoller(W, e) {
			e.tr.updateMatrixWorld(true);
			const bb = new THREE.Box3().setFromObject(e.tr),
				col = W.P.cols[e.i],
				L = this.RL,
				A = new THREE.Group(),
				spin = new THREE.Group(),
				R = 0.2,
				Y = 0.22,
				D = "#3A3F48",
				met = { metalness: 0.45, roughness: 0.4 };
			/* arm group: hitch at the origin, roller axle at x = L, axle across z */
			strut(A, [0, 0.42, 0], [L - 0.3, Y + 0.12, 0], 0.07, D, 1);
			A.add(B(0.12, 0.14, 0.16, D, 0.02, 0.42, 0));
			strut(A, [L - 0.3, Y + 0.12, -0.6], [L - 0.3, Y + 0.12, 0.6], 0.06, "#8E96A3", 2);
			[-1, 1].forEach((sd) => strut(A, [L - 0.3, Y + 0.12, sd * 0.6], [L, Y, sd * 0.6], 0.06, "#8E96A3", 1));
			spin.position.set(L, Y, 0);
			const nap = Cy(R, R, 1.08, 12, col, 0, 0, 0, { roughness: 0.55 });
			nap.rotation.x = Math.PI / 2;
			spin.add(nap);
			[-1, 1].forEach((sd) => {
				const c = Cy(0.1, 0.1, 0.08, 8, "#C9CED6", 0, 0, sd * 0.58, met);
				c.rotation.x = Math.PI / 2;
				spin.add(c);
			});
			/* a raised stripe of paint round the nap so its spin shows */
			const st = B(0.08, 0.05, 1.1, "#F4F6F9", 0, R + 0.01, 0);
			spin.add(st);
			A.add(spin);
			A.traverse((o) => (o.userData.dyn = true));
			e.g.add(A);
			const hx = bb.min.x - 0.05,
				hb = { x: e.x + Math.cos(e.yaw) * hx, z: e.z - Math.sin(e.yaw) * hx };
			e.rl = { A, spin, hx, x: hb.x - Math.cos(e.yaw) * L, z: hb.z + Math.sin(e.yaw) * L, rot: 0 };
		},
		rollAt(e) {
			return e.rl ? [e.rl.x, e.rl.z] : [e.x, e.z];
		},
		roller(W, e, dt) {
			const r = e.rl;
			if (!r) return;
			const hx = e.x + Math.cos(e.yaw) * r.hx,
				hz = e.z - Math.sin(e.yaw) * r.hx;
			let dx = r.x - hx,
				dz = r.z - hz;
			const l = Math.hypot(dx, dz) || 1,
				nx = hx + (dx / l) * this.RL,
				nz = hz + (dz / l) * this.RL,
				mv = Math.hypot(nx - r.x, nz - r.z);
			/* roll forward or back depending on which way it moved along the arm */
			r.rot += (mv / 0.2) * ((nx - r.x) * dx + (nz - r.z) * dz > 0 ? -1 : 1);
			r.x = nx;
			r.z = nz;
			dx = r.x - hx;
			dz = r.z - hz;
			r.A.position.set(hx - e.x, 0, hz - e.z);
			r.A.rotation.y = Math.atan2(-dz, dx);
			r.spin.rotation.z = r.rot;
		},
		close(W, e) {
			const pl = e.pl,
				raw = [++pl.n, Math.round(W.t * 100)].concat(pl.cells);
			pl.ev.push(raw);
			e.f.ev = pl.ev.slice(-6);
			this.addEv(W, e, raw);
			this.clearTrail(e);
		},
		clearTrail(e) {
			e.pl.cells = [];
			e.pl.at = new Map();
			e.pl.vt = new Map();
			e.pl.pts = [];
			e.f.tp = [];
		},
		cutTrail(W, e) {
			this.washFx(W, e, e.pl.pts);
			this.clearTrail(e);
			e.f.cut = ++e.pl.cut;
			e.pl.cutT = W.t;
			fb(W, e, "Washed away", { tone: "bad" });
			if (e.isMe) W.shake = Math.max(W.shake, 0.3);
		},
		washFx(W, e, pts) {
			const c = W.P.cols[e.i],
				st = Math.max(1, Math.floor(pts.length / 14));
			for (let k = 0; k < pts.length; k += st)
				burst(W.sc, pts[k][0], 0.3, pts[k][1], {
					n: 3,
					shape: "ico",
					cols: [c, "#FFFFFF"],
					spd: 1.6,
					up: 3,
					grav: 9,
					life: 0.5,
					size: 0.6,
				});
			if (W.tv || e.isMe) sfx("crack");
		},
		visit(W, e, c) {
			/* the truck reached cell c: close the loop, or extend the trail. Returns true when the loop closed */
			const P = W.P,
				pl = e.pl;
			if (P.own[c] === e.i) {
				if (pl.cells.length) {
					this.close(W, e);
					return true;
				}
				return false;
			}
			const j = pl.at.get(c);
			if (j !== undefined) {
				if (j < pl.cells.length - 5) {
					this.close(W, e);
					return true;
				}
				return false;
			}
			if (!pl.cells.length) pl.pts = [this.rollAt(e)];
			pl.at.set(c, pl.cells.length);
			pl.vt.set(c, W.t);
			pl.cells.push(c);
			return false;
		},
		rules(W, e) {
			if (e.d || !W.P) return;
			const P = W.P,
				N = P.N,
				pl = e.pl;
			/* walk from the last position in small steps; a diagonal move adds the corner cell so the trail has no gaps */
			const dx = e.x - pl.lx,
				dz = e.z - pl.lz,
				st = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
			let last = this.cell(pl.lx, pl.lz);
			for (let s = 1; s <= st; s++) {
				const c = this.cell(pl.lx + (dx * s) / st, pl.lz + (dz * s) / st);
				if (c === last) continue;
				if (c % N !== last % N && Math.floor(c / N) !== Math.floor(last / N))
					if (this.visit(W, e, Math.floor(last / N) * N + (c % N))) break;
				last = c;
				if (this.visit(W, e, c)) break;
			}
			{
				const c = this.cell(e.x, e.z);
				if (!pl.cells.length && P.own[c] !== e.i) this.visit(W, e, c);
			}
			pl.lx = e.x;
			pl.lz = e.z;
			if (pl.cells.length) {
				const lp = pl.pts[pl.pts.length - 1],
					ra = this.rollAt(e);
				if (!lp || Math.hypot(lp[0] - ra[0], lp[1] - ra[1]) > 0.5) {
					pl.pts.push(ra);
					e.f.tp = [].concat(...pl.pts.map(([x, z]) => [Math.round(x * 10), Math.round(z * 10)]));
				}
				/* a rival touching the open trail washes it away */
				for (const o of W.list) {
					if (o === e || o.gone || !o.al || o.d || (!o.local && !o.seen)) continue;
					const ox = Math.floor((o.x + this.S) / this.CS),
						oz = Math.floor((o.z + this.S) / this.CS);
					let hit = false;
					for (let a = -1; a <= 1 && !hit; a++)
						for (let b = -1; b <= 1 && !hit; b++) {
							const cx = ox + a,
								cz = oz + b;
							if (cx < 0 || cz < 0 || cx >= N || cz >= N || !pl.at.has(cz * N + cx)) continue;
							const [x, z] = this.ctr(cx, cz);
							if (Math.hypot(x - o.x, z - o.z) < 0.55) hit = true;
						}
					if (hit) {
						this.cutTrail(W, e);
						break;
					}
				}
			}
			/* so does a rival's fill over it */
			if (pl.cells.length)
				for (const c of pl.cells)
					if (P.own[c] !== e.i && P.own[c] >= 0 && P.ct[c] > pl.vt.get(c)) {
						this.cutTrail(W, e);
						break;
					}
		},
		frame(W) {
			const P = W.P;
			for (const e of W.list) {
				if (e.gone || e.local || !e.f) continue;
				if (Array.isArray(e.f.ev)) e.f.ev.forEach((raw) => this.addEv(W, e, raw));
				const ct = e.f.cut || 0;
				if (e.seenCut === undefined) e.seenCut = ct;
				if (ct > e.seenCut) {
					e.seenCut = ct;
					const tp = e.lastTp || [],
						pts = [];
					for (let k = 0; k + 1 < tp.length; k += 2) pts.push([tp[k] / 10, tp[k + 1] / 10]);
					this.washFx(W, e, pts);
				}
				if (Array.isArray(e.f.tp) && e.f.tp.length) e.lastTp = e.f.tp;
			}
			this.replay(W);
			/* reveal changed cells as the bucket's paint spreads */
			const D = P.disp,
				own = P.own;
			const bx = P.box;
			for (let c = 0; c < own.length; c++)
				if (D[c] !== own[c] && W.t >= P.rev[c]) {
					D[c] = own[c];
					const cx = c % P.N,
						cz = (c - cx) / P.N;
					bx[0] = Math.min(bx[0], cx);
					bx[1] = Math.min(bx[1], cz);
					bx[2] = Math.max(bx[2], cx);
					bx[3] = Math.max(bx[3], cz);
				}
			const now = performance.now();
			if (bx[2] >= 0 && now - P.drawn > 50) {
				P.drawn = now;
				this.draw(W, bx);
				P.box = [1e9, 1e9, -1, -1];
			}
			/* scores: share of the lot in your paint */
			const cnt = new Array(P.cols.length).fill(0);
			for (let c = 0; c < own.length; c++) if (own[c] >= 0) cnt[own[c]]++;
			W.list.forEach((e) => {
				if (e.local && !e.gone) e.sc = Math.round((cnt[e.i] / own.length) * 100);
			});
			this.cans(W);
			W.list.forEach((e) => this.ribbon(W, e));
		},
		ribbon(W, e) {
			const R = W.P.rib[e.i];
			if (!R) return;
			let pts = [];
			if (e.gone) pts = [];
			else if (e.local) pts = e.pl.pts;
			else {
				const tp = (e.f && e.f.tp) || [];
				for (let k = 0; k + 1 < tp.length; k += 2) pts.push([tp[k] / 10, tp[k + 1] / 10]);
			}
			if (pts.length) pts = pts.slice(-(R.MX - 1)).concat([this.rollAt(e)]);
			const n = pts.length,
				p = R.pos,
				w = 0.34,
				y = 0.07;
			for (let k = 0; k < n; k++) {
				const a = pts[Math.max(0, k - 1)],
					b = pts[Math.min(n - 1, k + 1)];
				let tx = b[0] - a[0],
					tz = b[1] - a[1];
				const l = Math.hypot(tx, tz) || 1;
				tx /= l;
				tz /= l;
				const o = k * 6;
				p[o] = pts[k][0] - tz * w;
				p[o + 1] = y;
				p[o + 2] = pts[k][1] + tx * w;
				p[o + 3] = pts[k][0] + tz * w;
				p[o + 4] = y;
				p[o + 5] = pts[k][1] - tx * w;
			}
			R.geo.attributes.position.needsUpdate = true;
			R.geo.setDrawRange(0, Math.max(0, n - 1) * 6);
		},
		render(W, e, dt) {
			this.roller(W, e, dt);
			if (W.fxT === W.t) return;
			W.fxT = W.t;
			this.frame(W);
		},
		/* ---- CPUs: short loops out of their paint, cut nearby open trails, run home when a rival gets close ---- */
		trailPts(o) {
			if (o.local) return (o.pl && o.pl.pts) || [];
			const tp = (o.f && o.f.tp) || [],
				pts = [];
			for (let k = 0; k + 1 < tp.length; k += 2) pts.push([tp[k] / 10, tp[k + 1] / 10]);
			return pts;
		},
		home(W, e) {
			/* nearest cell of its own paint, searched in growing squares */
			const P = W.P,
				N = P.N,
				cx0 = Math.floor((e.x + this.S) / this.CS),
				cz0 = Math.floor((e.z + this.S) / this.CS);
			let hb = null,
				hd = 1e9;
			for (let r = 1; r < N && !hb; r++)
				for (let a = -r; a <= r; a++)
					for (const [cx, cz] of [
						[cx0 + a, cz0 - r],
						[cx0 + a, cz0 + r],
						[cx0 - r, cz0 + a],
						[cx0 + r, cz0 + a],
					]) {
						if (cx < 0 || cz < 0 || cx >= N || cz >= N || P.own[cz * N + cx] !== e.i) continue;
						const [x, z] = this.ctr(cx, cz),
							d = Math.hypot(x - e.x, z - e.z);
						if (d < hd) {
							hd = d;
							hb = [x, z];
						}
					}
			return hb;
		},
		bot(W, e) {
			const pl = e.pl,
				S = this.S - 1;
			/* hunt an open rival trail close by */
			let best = null,
				bd = 1e9;
			for (const o of W.list) {
				if (o === e || o.gone || !o.al || o.d) continue;
				const pts = this.trailPts(o);
				if (pts.length < 4) continue;
				for (let k = 0; k < pts.length - 2; k += 2) {
					const d = Math.hypot(pts[k][0] - e.x, pts[k][1] - e.z);
					if (d < bd) {
						bd = d;
						best = pts[k];
					}
				}
			}
			if (W.t > (e.huntT || 0)) {
				e.hunt = Math.random() < 0.3;
				e.huntT = W.t + 2.5 + Math.random() * 2;
			}
			if (e.hunt && best && bd < 2.5 + (e.i % 3) * 0.8 && pl.cells.length < 12) {
				const s = steer(e, best[0], best[1], 1);
				if (bd < 2.5 && e.bcd <= 0 && Math.random() < 0.02) s.boost = true;
				return s;
			}
			/* head home when the trail is long or a rival is near it */
			if (pl.cells.length) {
				const threat = W.list.some(
					(o) =>
						o !== e &&
						!o.gone &&
						o.al &&
						!o.d &&
						pl.pts.some((p, k) => k % 3 === 0 && Math.hypot(p[0] - o.x, p[1] - o.z) < 4),
				);
				if (threat || pl.cells.length > (e.bLen || 30)) {
					const h = this.home(W, e);
					if (h) {
						const s = steer(e, h[0], h[1], 1);
						if (threat && e.bcd <= 0 && Math.random() < 0.03) s.boost = true;
						return s;
					}
				}
			}
			/* otherwise follow a planned loop: out, sideways, then back home */
			if (!e.plan || W.t > e.plan.until || (e.plan.k >= e.plan.w.length && !pl.cells.length)) {
				const a0 = Math.random() * 6.283,
					L = 3 + Math.random() * (3 + (e.i % 3)),
					sd = Math.random() < 0.5 ? 1 : -1,
					cl = (v) => Math.max(-S, Math.min(S, v)),
					p1 = [cl(e.x + Math.cos(a0) * L), cl(e.z + Math.sin(a0) * L)],
					p2 = [cl(p1[0] - Math.sin(a0) * L * sd), cl(p1[1] + Math.cos(a0) * L * sd)];
				e.plan = { w: [p1, p2], k: 0, until: W.t + 5 };
				e.bLen = 16 + Math.floor(Math.random() * 24);
			}
			const P_ = e.plan;
			if (P_.k < P_.w.length) {
				const wp = P_.w[P_.k];
				if (Math.hypot(wp[0] - e.x, wp[1] - e.z) < 1.2) P_.k++;
				return steer(e, wp[0], wp[1], 0.9);
			}
			const h = this.home(W, e);
			return h ? steer(e, h[0], h[1], 0.9) : wander(W, e, 0.016, 8);
		},
		botScore: () => 8 + rnd(25),
		/* tools/nettest.mjs: the paint (cells per truck) must match whenever both devices hold the same loops (key) */
		syncSnap(W) {
			const c = {};
			W.P.own.forEach((v) => {
				if (v >= 0) c[mgName(W.list[v])] = (c[mgName(W.list[v])] || 0) + 1;
			});
			return { key: W.P.evs.map((v) => v.q + ":" + v.n).join(" "), state: c };
		},
	},
});

/* ---------- Plinko ---------- */
/* Plinko: every truck drops down one shared peg board (side view: x across, y up, the board in the z = 0 plane) into the
   slots at the bottom, DROPS times, the points add up. Each truck rides in a clear plastic ball (radius R, the truck at
   TS scale sits in its bottom and tilts with the motion), so it glides off the pegs instead of catching on them. Hanging
   from its magnet at the top, ◀ ▶ move it along the rail and HOP drops it; falling, ◀ ▶ push it a little that way and
   HOP pops the ball up off whatever it touches (towards the side held; cooldown HOPCD). A x3 sign slides back and forth
   under the slots (a function of W.t, the same everywhere). Physics: planck.js, one world per truck on the device that
   runs it (pegs, walls, dividers static, its ball dynamic); every other ball is a kinematic body in that world following
   where it is drawn, so balls bump each other (each device only pushes its own). e.x / e.y = the ball's centre. Shared
   per truck in e.f: an (ball spin), tt (the truck's tilt in it), st (0 hanging, 1 falling, 2 in a slot, 3 done and
   parked), im [n, x, y] (last hard knock, flashes that peg), hp (hops, for the pop), ls [n, slot, x3] */
Object.assign(MG, {
	plinko: {
		name: "Plinko",
		kind: "lane",
		ctrl: "custom",
		truckMode: "springs",
		hi: true,
		unit: "pts",
		dur: 90,
		bare: true,
		/* the light panel's values (2026-10-11): low sun straight in front, bright fill */
		sun: [0, 9, 31.6],
		lt: { amb: 0.84, sun: 0.44, warm: 0.28, haze: 70 },
		fx: { col: 0.06 },
		how: "3 rounds, everyone drops at once, a new board every round. Steer and hop your ball into the best slot, catch the sliding ×3!",
		tvHint:
			"Before the drop: LEFT / RIGHT move your magnet. Falling: LEFT / RIGHT steer, HOP (right half) pops you off pegs.",
		tapHint:
			"◀ ▶ move your magnet before the drop, then steer as you fall; HOP pops you off the pegs (arrow keys, Space).",
		/* board: COLS slots SW wide between walls at ±HW; ROWS peg rows RY apart from Y0 up (even rows line up with the
		   slot dividers, odd rows sit between; every gap a ball must pass is ~3.4 m, the ball 2.9); slot dividers SH high on
		   the floor FLOOR; the ground GY below the plinth */
		COLS: 7,
		SW: 4.4,
		HW: 15.4,
		ROWS: 8,
		RY: 3.4,
		Y0: 5,
		PR: 0.32,
		SH: 2.2,
		FLOOR: 0.12,
		DW: 0.24,
		GY: -2.6,
		R: 0.83 /* the ball */,
		TS: 0.43 /* the truck's scale inside it */,
		WB: 0.63 /* the truck's wheels this far below the ball's centre */,
		TOPY: 31.6 /* a hanging ball's centre (the top peg row is at 28.8) */,
		CEIL: 33.8 /* just under the magnet rail */,
		RAIL: 34.7,
		HDR: 36 /* the header's middle */,
		VAL: [100, 300, 50, 500, 50, 300, 100],
		SCOL: { 500: "#FFC83D", 300: "#1FA35C", 100: "#2F7DE1", 50: "#E5484D" },
		MP: 11 /* the x3 sign's trip there and back, s */,
		DROPS: 3 /* rounds */,
		/* rounds: everyone aims for AIMT s (the first round AIM0 s after GO), then all drop at once; a round ends BETWEEN s
		   after the last ball lands, or ROUNDT s after the drop at the latest */
		AIM0: 4,
		ROUNDT: 25,
		BETWEEN: 1.6,
		/* feel: gravity, peg bounce, ball friction (low: it glides), steering push (m/s²), hop speed and cooldown, magnet
		   speed, how long a ball may hang before it drops by itself */
		GRAV: 13,
		PEGR: 0.68,
		FRIC: 0.05,
		PUSH: 2.6,
		HOPV: 6.5,
		HOPCD: 1.1,
		AIMV: 7,
		AIMT: 4,
		/* flippers (replace a peg, flick up on their own rhythm) and x2 gates (between two pegs in a row: pass through
		   one for double points on this drop; two make x4) */
		NFLIP: 3,
		NGATE: 2,
		/* a split gate (one per round, higher up): your ball comes out as two, both steered by you, both score; the two
		   leave the gate SPLITV m/s apart */
		SPLITV: 2.6,
		FL: 1.9 /* flipper length */,
		/* pop bumpers: how many, radius, kick speed, points per hit */
		NBUMP: 3,
		BR: 0.62,
		BUMPV: 10.3,
		BUMPPTS: 25,
		/* TNT pegs: one at a time, live TNTL s (from the seed, counted from the round's drop: W.tnt), the blast reaches TNTR m
		   and throws at up to TNTV */
		TNTL: 8,
		TNTR: 5,
		TNTV: 12,
		kits() {
			loadPlanck();
		},
		/* peg centres [x, y], the half pegs on the walls included */
		pegs() {
			if (this.PG) return this.PG;
			const L = [];
			for (let r = 0; r < this.ROWS; r++) {
				const y = this.Y0 + r * this.RY;
				if (r % 2 === 0) for (let k = 0; k <= this.COLS; k++) L.push([-this.HW + k * this.SW, y]);
				else for (let k = 0; k < this.COLS; k++) L.push([-this.HW + (k + 0.5) * this.SW, y]);
			}
			return (this.PG = L);
		},
		/* round rd's board, the same on every device (from the seed and the round): W.pegs (the grid minus the flipper and
		   bumper pegs), W.flips [{x, y, dir}] (W.flipT = when each last fired), W.bumps [{x, y}], W.gates [{x, y, w}] (x2) and
		   W.splits [{x, y, w}] (split gate),
		   W.tnt [{n, dt, i, x, y}] (s after the drop and on which peg each TNT turns up; W.tntX = the ones that went off) */
		/* rows (LR: flippers / bumpers / TNT, x2 gates, the split gate) and spacing (k) scale with the board, for Plinko
		   Sabotage's smaller boards */
		LR: { f: [1, 4], g: [0, 4], s: [3, 6] },
		layout(W, rd) {
			const r = mulberry((W.mg.seed || 1) * 7 + 3 + rd * 7919),
				all = this.pegs(),
				k = this.SW / 4.4,
				LR = this.LR,
				row = (y) => Math.round((y - this.Y0) / this.RY),
				cand = all.filter(([x, y]) => row(y) >= LR.f[0] && row(y) <= LR.f[1] && Math.abs(x) < this.HW - 0.5),
				fl = [];
			while (fl.length < this.NFLIP && cand.length) {
				const p = cand.splice(Math.floor(r() * cand.length), 1)[0];
				if (!fl.some((q) => row(q[1]) === row(p[1]))) fl.push(p);
			}
			W.flips = fl.map(([x, y]) => ({ x, y, dir: x < -0.1 ? 1 : x > 0.1 ? -1 : r() < 0.5 ? -1 : 1 }));
			W.flipT = W.flips.map(() => -99);
			const bc = cand.filter(([x, y]) => !fl.some((q) => Math.hypot(q[0] - x, q[1] - y) < 4.5 * k)),
				bm = [];
			while (bm.length < this.NBUMP && bc.length) {
				const q = bc.splice(Math.floor(r() * bc.length), 1)[0];
				if (!bm.some((b) => Math.hypot(b[0] - q[0], b[1] - q[1]) < 5 * k)) bm.push(q);
			}
			W.bumps = bm.map(([x, y]) => ({ x, y }));
			W.pegs = all.filter((p) => !fl.includes(p) && !bm.includes(p));
			const gaps = [];
			for (let n = LR.g[0]; n <= LR.g[1]; n++) {
				const ps = W.pegs.filter((p) => row(p[1]) === n).sort((a, b) => a[0] - b[0]);
				for (let j = 0; j + 1 < ps.length; j++) {
					const a = ps[j],
						b = ps[j + 1],
						x = (a[0] + b[0]) / 2;
					if (
						b[0] - a[0] < this.SW + 0.1 &&
						!W.flips.some((f) => Math.hypot(f.x - x, f.y - a[1]) < 4 * k) &&
						!W.bumps.some((q) => Math.hypot(q.x - x, q.y - a[1]) < 3.5 * k)
					)
						gaps.push({ x, y: a[1], w: b[0] - a[0] });
				}
			}
			W.gates = [];
			while (W.gates.length < this.NGATE && gaps.length) {
				const g = gaps.splice(Math.floor(r() * gaps.length), 1)[0];
				if (!W.gates.some((q) => Math.abs(q.y - g.y) < 0.1)) W.gates.push(g);
			}
			const sg = [];
			for (let n = LR.s[0]; n <= LR.s[1]; n++) {
				const ps = W.pegs.filter((q) => row(q[1]) === n).sort((a, b) => a[0] - b[0]);
				for (let j = 0; j + 1 < ps.length; j++) {
					const a = ps[j],
						b = ps[j + 1],
						x = (a[0] + b[0]) / 2;
					if (
						b[0] - a[0] < this.SW + 0.1 &&
						!W.flips.some((f) => Math.hypot(f.x - x, f.y - a[1]) < 4 * k) &&
						!W.bumps.some((q) => Math.hypot(q.x - x, q.y - a[1]) < 3.5 * k) &&
						!W.gates.some((q) => Math.hypot(q.x - x, q.y - a[1]) < 3 * k)
					)
						sg.push({ x, y: a[1], w: b[0] - a[0] });
				}
			}
			W.splits = sg.length ? [sg[Math.floor(r() * sg.length)]] : [];
			const tc = W.pegs
				.map((q, i) => i)
				.filter((i) => {
					const [x, y] = W.pegs[i];
					return (
						row(y) >= LR.f[0] &&
						row(y) <= LR.f[1] &&
						Math.abs(x) < this.HW - 0.5 &&
						!W.flips.some((q) => Math.hypot(q.x - x, q.y - y) < 3 * k) &&
						!W.bumps.some((q) => Math.hypot(q.x - x, q.y - y) < 3 * k)
					);
				});
			W.tnt = [];
			W.tntX = W.tntX || {};
			for (let n = 0, t = 1 + r() * 2; t < this.ROUNDT - 3 && tc.length; n++) {
				const i = tc[Math.floor(r() * tc.length)];
				W.tnt.push({ n: rd * 10 + n, dt: t, i, x: W.pegs[i][0], y: W.pegs[i][1] });
				t += this.TNTL + 1 + r() * 3;
			}
		},
		/* a flipper's angle s seconds after it fired: rests tipped down, snaps up, holds, eases back. It fires when a ball
		   lands on it (shared as e.f.fp, the fire time), with a short cooldown */
		flipA(f, s) {
			const k = s < 0 || s > 0.8 ? 0 : s < 0.08 ? s / 0.08 : s < 0.25 ? 1 : 1 - (s - 0.25) / 0.55,
				a = -0.45 + k;
			return f.dir > 0 ? a : Math.PI - a;
		},
		/* the TNT that is live now (one at a time, only while balls fall), or null; q.t = when it turned up */
		tntNow(W) {
			const S = this.sched(W);
			if (S.E !== null) return null;
			for (const q of W.tnt) {
				q.t = S.D + q.dt;
				if (W.t >= q.t && W.t < q.t + this.TNTL && W.tntX[q.n] === undefined) return q;
			}
			return null;
		},
		/* the round schedule, worked out the same way on every device from the trucks' landing times (e.f.lt[round]):
		   {r: round, D: its drop time, E: when it ends (null while balls are still falling), over: all rounds done}. It also
		   swaps the board when a new round starts */
		roundEnd(W, r, D) {
			const lts = W.list
					.filter((o) => !o.gone)
					.map((o) => {
						const a = o.local ? o.lt : o.f && o.f.lt;
						return a ? a[r] : undefined;
					}),
				cap = D + this.ROUNDT;
			if (lts.length && lts.every((v) => typeof v === "number")) return Math.min(Math.max(...lts), cap) + this.BETWEEN;
			return W.t >= cap ? cap + this.BETWEEN : null;
		},
		sched(W) {
			if (W.schT === W.t && W.sch) return W.sch;
			let r = 0,
				D = this.AIM0,
				E;
			for (;;) {
				E = this.roundEnd(W, r, D);
				if (E === null || W.t < E || r === this.DROPS - 1) break;
				r++;
				D = E + this.AIMT;
			}
			W.schT = W.t;
			W.sch = { r, D, E, over: E !== null && W.t >= E && r === this.DROPS - 1 };
			if (W.lr !== r) this.setBoard(W, r);
			return W.sch;
		},
		slotX: (k) => -MG.plinko.HW + (k + 0.5) * MG.plinko.SW,
		/* the x3 sign: position in slots (0 .. COLS-1), sliding there and back at a steady speed; the slot it's under counts */
		mpos(t) {
			const u = ((Math.max(0, t) / this.MP) % 1) * 2;
			return (u < 1 ? u : 2 - u) * (this.COLS - 1);
		},
		mslot(t) {
			return Math.round(this.mpos(t));
		},
		build(W) {
			const s = W.sc,
				n = W.plist.length,
				{ HW, SW, COLS, SH, FLOOR, DW, GY } = this;
			W.laneX = (i) => (i - (n - 1) / 2) * 4.4;
			this.cabinet(W);
			/* the board: dark blue back with column panels, red frame and header, a plinth under the slots */
			const top = this.HDR + 0.9,
				bh = top - GY;
			s.add(B(2 * HW, bh, 0.4, "#1B2A4F", 0, GY + bh / 2, -1.95));
			for (let k = 0; k < COLS; k++)
				s.add(B(SW - 0.1, top - 1.8, 0.06, k % 2 ? "#26437E" : "#1F3869", this.slotX(k), (top - 1.8) / 2, -1.72));
			[-1, 1].forEach((sd) => {
				s.add(B(0.7, bh, 3.6, "#E5484D", sd * (HW + 0.35), GY + bh / 2, -0.1));
				s.add(B(0.3, bh, 0.06, "#B8333A", sd * (HW + 0.35), GY + bh / 2, 1.73));
			});
			s.add(B(2 * HW + 1.4, 1.8, 3.6, "#E5484D", 0, this.HDR, -0.1));
			{
				const tx = canvasTex(1024, 96, (x, w, h) => {
					x.font = "64px Bungee, 'Arial Black', Impact, sans-serif";
					x.textAlign = "center";
					x.textBaseline = "middle";
					x.lineWidth = 10;
					x.strokeStyle = "#7A1D22";
					x.strokeText("PLINKO", w / 2, h / 2 + 4);
					x.fillStyle = "#FFE27A";
					x.fillText("PLINKO", w / 2, h / 2 + 4);
				});
				const p = new THREE.Mesh(
					new THREE.PlaneGeometry(10.6, 1),
					new THREE.MeshBasicMaterial({ map: tx, transparent: true }),
				);
				p.position.set(0, this.HDR, 1.74);
				s.add(p);
			}
			/* the magnet rail under the header */
			s.add(B(2 * HW, 0.3, 0.36, "#8E96A3", 0, this.RAIL, 0));
			/* plinth: value plates on its front, a rail for the x3 sign */
			s.add(B(2 * HW, -GY, 3.6, "#2A3550", 0, GY / 2, -0.1));
			s.add(B(2 * HW - 0.4, 0.14, 0.08, "#8E96A3", 0, -0.55, 1.74));
			W.slotF = [];
			for (let k = 0; k < COLS; k++) {
				const v = this.VAL[k],
					c = this.SCOL[v],
					x = this.slotX(k),
					pt = canvasTex(256, 112, (g, w, h) => {
						g.fillStyle = "#151B24";
						rr(g, 2, 2, w - 4, h - 4, 22);
						g.fill();
						g.fillStyle = c;
						rr(g, 10, 10, w - 20, h - 20, 16);
						g.fill();
						g.font = "64px Bungee, 'Arial Black', Impact, sans-serif";
						g.textAlign = "center";
						g.textBaseline = "middle";
						g.fillStyle = v === 500 ? "#3A2A00" : "#F4F6F9";
						g.fillText(String(v), w / 2, h / 2 + 4);
					}),
					pl = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.36), new THREE.MeshBasicMaterial({ map: pt }));
				pl.position.set(x, -1.75, 1.73);
				s.add(pl);
				/* the slot floor in the slot's colour; it glows under the x3 sign and flashes when a truck scores */
				const fm = new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.6 }),
					f = new THREE.Mesh(new THREE.BoxGeometry(SW - DW, FLOOR, 3.4), fm);
				f.position.set(x, FLOOR / 2, -0.05);
				f.receiveShadow = true;
				s.add(f);
				W.slotF.push({ m: fm, c: new THREE.Color(c), fl: 0, fc: new THREE.Color() });
			}
			/* slot dividers with round tops */
			for (let k = 1; k < COLS; k++) {
				const x = -HW + k * SW;
				s.add(B(DW, SH - FLOOR, 3.2, "#F4F6F9", x, (SH + FLOOR) / 2, -0.15));
				const t = Cy(DW / 2, DW / 2, 3.2, 8, "#F4F6F9", x, SH, -0.15);
				t.rotation.x = Math.PI / 2;
				s.add(t);
			}
			/* the TNT barrel (one at a time, moved onto its peg) */
			W.tntG = this.tntModel();
			s.add(W.tntG);
			this.setBoard(W, 0);
			/* marquee bulbs on the frame and the header, chasing (W.bulbs: one instanced mesh each, the cabinet adds its own) */
			{
				const P = [];
				[-1, 1].forEach((sd) => {
					for (let y = GY + 0.5; y < this.HDR - 1; y += 0.95) P.push([sd * (HW + 0.35), y]);
				});
				[this.HDR - 0.65, this.HDR + 0.65].forEach((y) => {
					for (let x = -HW - 0.2; x <= HW + 0.2; x += 0.95) P.push([x, y]);
				});
				const bl = new THREE.InstancedMesh(
						new THREE.IcosahedronGeometry(0.13, 0),
						new THREE.MeshBasicMaterial(),
						P.length,
					),
					o = new THREE.Object3D(),
					c = new THREE.Color("#FFE9A8");
				P.forEach(([x, y], i) => {
					o.position.set(x, y, 1.8);
					o.updateMatrix();
					bl.setMatrixAt(i, o.matrix);
					bl.setColorAt(i, c);
				});
				s.add(bl);
				W.bulbs.push(bl);
			}
			/* the x3 sign */
			{
				const g = new THREE.Group(),
					tx = canvasTex(192, 96, (x, w, h) => {
						x.font = "62px Bungee, 'Arial Black', Impact, sans-serif";
						x.textAlign = "center";
						x.textBaseline = "middle";
						x.fillStyle = "#151B24";
						x.fillText("×3", w / 2, h / 2 + 4);
					}),
					tp = new THREE.Mesh(
						new THREE.PlaneGeometry(1.5, 0.75),
						new THREE.MeshBasicMaterial({ map: tx, transparent: true }),
					);
				tp.position.z = 0.09;
				g.add(B(1.9, 0.86, 0.16, "#FFC83D", 0, 0, 0), tp);
				/* an arrow up at the slot it multiplies */
				const ar = new THREE.Mesh(
					new THREE.ConeGeometry(0.3, 0.4, 3),
					new THREE.MeshBasicMaterial({ color: "#FFC83D" }),
				);
				ar.position.set(0, 0.68, 0);
				g.add(ar);
				g.position.set(0, -0.55, 1.86);
				s.add(g);
				W.mSign = g;
			}
			/* magnets on the rail, one per truck: trolley, cable, magnet */
			W.mag = {};
			W.plist.forEach((p) => {
				const g = new THREE.Group(),
					cab = Cy(0.05, 0.05, 1, 5, "#3A3F48", 0, 0, 0),
					mg = new THREE.Group();
				g.add(B(1, 0.5, 0.8, "#FFC83D", 0, this.RAIL, 0), B(0.6, 0.18, 0.6, "#23272F", 0, this.RAIL - 0.34, 0));
				mg.add(Cy(0.75, 0.75, 0.3, 12, "#2A2F3A", 0, 0.15, 0), Cy(0.78, 0.78, 0.08, 12, "#E5484D", 0, 0.04, 0));
				g.add(cab, mg);
				g.userData = { cab, mg };
				s.add(g);
				W.mag[p.key] = g;
			});
		},
		/* the TNT barrel (hidden until a TNT turns up) */
		tntModel() {
			const g = new THREE.Group(),
				body = Cy(0.52, 0.52, 1, 14, "#D63A3A", 0, 0, 1),
				bands = [0.62, 1.38].map((z) => Cy(0.55, 0.55, 0.08, 14, "#23272F", 0, 0, z)),
				fuse = Cy(0.04, 0.04, 0.45, 5, "#3A3F48", 0.22, 0.6, 1),
				tx = canvasTex(128, 64, (x, w, h) => {
					x.font = "44px Bungee, 'Arial Black', Impact, sans-serif";
					x.textAlign = "center";
					x.textBaseline = "middle";
					x.fillStyle = "#FFE27A";
					x.fillText("TNT", w / 2, h / 2 + 3);
				}),
				lb = new THREE.Mesh(
					new THREE.PlaneGeometry(0.9, 0.45),
					new THREE.MeshBasicMaterial({ map: tx, transparent: true }),
				);
			[body, ...bands].forEach((m) => (m.rotation.x = Math.PI / 2));
			fuse.rotation.z = -0.4;
			lb.position.z = 1.52;
			g.add(body, ...bands, fuse, lb);
			g.visible = false;
			return g;
		},
		/* round rd's pegs, flippers, x2 gates and bumpers (W.bd, rebuilt every round): pegs are a steel post out of the board
		   with a flange and a cap (instanced; the caps light up when knocked), flippers a red paddle with a white stripe on a
		   yellow hub, gates a green light strip across the gap with a soft glow round it (additive halos in front and on the
		   board, so it glows on the TV too, where the post effects are off) and the x2 on the board under it, bumpers a red
		   drum out of the board with a white skirt, yellow cap and a ring that flashes when it kicks */
		setBoard(W, rd) {
			W.lr = rd;
			this.layout(W, rd);
			if (W.bd) {
				W.sc.remove(W.bd);
				W.bd.traverse((o) => o.geometry && o.geometry.dispose());
			}
			const s = (W.bd = new THREE.Group());
			W.sc.add(s);
			Object.assign(W, this.boardFx(W, s, W));
			W.pegFl = W.pegs.map(() => null);
			W.flipT = W.flips.map(() => -99);
		},
		/* the models of a board layout L (pegs, flips, gates, splits, bumps) into group s; textures cached on W. Returns
		   {caps, pegI (the peg instanced meshes), flipG, gateM, splitM, bumpG} for the animation */
		boardFx(W, s, L) {
			const pg = L.pegs,
				inst = (geo, col, z, n) => {
					const m = new THREE.InstancedMesh(
							geo,
							new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.45, metalness: 0.1 }),
							n,
						),
						o = new THREE.Object3D(),
						c = new THREE.Color(col);
					pg.forEach(([x, y], i) => {
						o.position.set(x, y, z);
						o.updateMatrix();
						m.setMatrixAt(i, o.matrix);
						m.setColorAt(i, c);
					});
					m.castShadow = m.receiveShadow = true;
					s.add(m);
					return m;
				},
				cyz = (r, h, seg) => new THREE.CylinderGeometry(r, r, h, seg).rotateX(Math.PI / 2);
			const posts = inst(cyz(0.26, 3, 10), "#C9CED8", -0.25, pg.length),
				flanges = inst(cyz(0.48, 0.12, 10), "#8E96A3", -1.63, pg.length),
				caps = inst(cyz(0.38, 0.22, 10), "#FFC83D", 1.32, pg.length),
				flipG = L.flips.map((f) => {
					const g = new THREE.Group(),
						L = this.FL,
						tip = Cy(0.16, 0.16, 2.6, 8, "#E5484D", L, 0, -0.3),
						hub = Cy(0.4, 0.4, 0.3, 12, "#FFC83D", 0, 0, 1.15),
						ax = Cy(0.3, 0.3, 2.9, 10, "#C9CED8", 0, 0, -0.25);
					[tip, hub, ax].forEach((m) => (m.rotation.x = Math.PI / 2));
					g.add(
						B(L, 0.32, 2.6, "#E5484D", L / 2, 0, -0.3),
						B(L * 0.75, 0.04, 2.2, "#F4F6F9", L / 2, 0.18, -0.3),
						tip,
						hub,
						ax,
					);
					g.position.set(f.x, f.y, 0);
					g.rotation.z = this.flipA(f, 99);
					s.add(g);
					return g;
				});
			const glow = (k, c0, c1, c2) =>
					W[k] ||
					(W[k] = canvasTex(256, 128, (x, w, h) => {
						const g = x.createRadialGradient(h / 2, h / 2, 4, h / 2, h / 2, h / 2);
						g.addColorStop(0, c0);
						g.addColorStop(0.35, c1);
						g.addColorStop(1, c2);
						x.save();
						x.scale(w / h, 1);
						x.fillStyle = g;
						x.fillRect(0, 0, h, h);
						x.restore();
					})),
				halo = glow("haloTex", "rgba(140,255,190,0.9)", "rgba(70,230,140,0.45)", "rgba(40,200,110,0)"),
				x2 =
					W.x2Tex ||
					(W.x2Tex = canvasTex(128, 64, (x, w, h) => {
						x.font = "48px Bungee, 'Arial Black', Impact, sans-serif";
						x.textAlign = "center";
						x.textBaseline = "middle";
						x.lineWidth = 8;
						x.strokeStyle = "#0E5A32";
						x.strokeText("×2", w / 2, h / 2 + 3);
						x.fillStyle = "#7CF2B0";
						x.fillText("×2", w / 2, h / 2 + 3);
					}));
			/* a gate: a light strip across the gap with a soft glow round it, its label on the board under it */
			const gate = (q, col, hl, lbTex, lw) => {
				const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false }),
					st = new THREE.Mesh(new THREE.BoxGeometry(q.w - 0.75, 0.21, 2.4), m),
					lb = new THREE.Mesh(
						new THREE.PlaneGeometry(lw, 1),
						new THREE.MeshBasicMaterial({ map: lbTex, transparent: true }),
					),
					hm = new THREE.MeshBasicMaterial({
						map: hl,
						transparent: true,
						opacity: 0.8,
						blending: THREE.AdditiveBlending,
						depthWrite: false,
					});
				st.position.set(q.x, q.y, -0.3);
				st.renderOrder = 1;
				[1.35, -1.6].forEach((z, j) => {
					const h = new THREE.Mesh(new THREE.PlaneGeometry(q.w + (j ? 1.6 : 0.8), j ? 1.54 : 0.91), hm);
					h.position.set(q.x, q.y, z);
					h.renderOrder = 4;
					s.add(h);
				});
				lb.position.set(q.x, q.y - 0.95, -1.64);
				s.add(st, lb);
				return { m, hm, fl: -9, col };
			};
			const spl =
				W.splTex ||
				(W.splTex = canvasTex(256, 64, (x, w, h) => {
					x.font = "44px Bungee, 'Arial Black', Impact, sans-serif";
					x.textAlign = "center";
					x.textBaseline = "middle";
					x.lineWidth = 8;
					x.strokeStyle = "#6A1440";
					x.strokeText("SPLIT", w / 2, h / 2 + 3);
					x.fillStyle = "#FFB3D9";
					x.fillText("SPLIT", w / 2, h / 2 + 3);
				}));
			const splitM = L.splits.map((q) =>
				gate(
					q,
					"#FF8CC8",
					glow("haloTexP", "rgba(255,150,210,0.9)", "rgba(255,90,170,0.45)", "rgba(230,60,150,0)"),
					spl,
					3,
				),
			);
			const gateM = L.gates.map((q) => {
				const m = new THREE.MeshBasicMaterial({
						color: "#8CFFC0",
						transparent: true,
						opacity: 0.55,
						depthWrite: false,
					}),
					st = new THREE.Mesh(new THREE.BoxGeometry(q.w - 0.75, 0.21, 2.4), m),
					lb = new THREE.Mesh(
						new THREE.PlaneGeometry(2, 1),
						new THREE.MeshBasicMaterial({ map: x2, transparent: true }),
					),
					hm = new THREE.MeshBasicMaterial({
						map: halo,
						transparent: true,
						opacity: 0.8,
						blending: THREE.AdditiveBlending,
						depthWrite: false,
					});
				st.position.set(q.x, q.y, -0.3);
				st.renderOrder = 1;
				[1.35, -1.6].forEach((z, j) => {
					const h = new THREE.Mesh(new THREE.PlaneGeometry(q.w + (j ? 1.6 : 0.8), j ? 1.54 : 0.91), hm);
					h.position.set(q.x, q.y, z);
					h.renderOrder = 4;
					s.add(h);
				});
				lb.position.set(q.x, q.y - 0.95, -1.64);
				s.add(st, lb);
				return { m, hm, fl: -9 };
			});
			const bumpG = L.bumps.map((q) => {
				const g = new THREE.Group(),
					rm = new THREE.MeshBasicMaterial({ color: "#FFE27A" }),
					ring = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.08, 6, 24), rm),
					parts = [
						Cy(0.9, 0.9, 0.12, 16, "#8E96A3", 0, 0, -1.63),
						Cy(this.BR, this.BR, 2.8, 16, "#E5484D", 0, 0, -0.3),
						Cy(0.76, 0.76, 0.22, 16, "#F4F6F9", 0, 0, 1.0),
						Cy(0.5, 0.5, 0.3, 16, "#FFC83D", 0, 0, 1.1),
					];
				parts.forEach((m) => (m.rotation.x = Math.PI / 2));
				ring.position.z = 1.16;
				g.add(...parts, ring);
				g.position.set(q.x, q.y, 0);
				s.add(g);
				return { g, rm, t: -9 };
			});
			return { caps, pegI: [posts, flanges, caps], flipG, gateM, splitM, bumpG };
		},
		/* the board is the playfield of a giant arcade cabinet, seen from inside: side walls fanning out to the edges of
		   the view (the board's navy, red / yellow / white racing stripes, red and yellow neon strips, a yellow edge with chasing bulbs, speakers), a hood over the
		   top, a dark arcade floor with neon lines fanning out from the board */
		cabinet(W) {
			const s = W.sc,
				{ HW, GY } = this,
				BG = "#0F1730",
				top = this.HDR + 4,
				H = top - GY,
				Z0 = -2.2,
				Z1 = 30,
				SP = 9 /* how far each wall fans out over its length */,
				L = Math.hypot(SP, Z1 - Z0),
				th = Math.atan2(SP, Z1 - Z0),
				P = [],
				neon = (c) => new THREE.MeshBasicMaterial({ color: c });
			s.background = new THREE.Color(BG);
			s.fog.color.set(BG);
			s.fog.near = 80;
			s.fog.far = 220;
			W.bulbs = [];
			s.add(B(160, 0.4, 140, "#1A2440", 0, GY - 0.2, 20));
			/* neon lines on the floor */
			[
				[-1, "#FF5A5F"],
				[1, "#FFC83D"],
			].forEach(([sd, c]) =>
				[
					[4, 9],
					[10.5, 21],
				].forEach(([x0, x1]) => {
					const dz = 34,
						dx = x1 - x0,
						m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, Math.hypot(dx, dz)), neon(c));
					m.position.set((sd * (x0 + x1)) / 2, GY + 0.02, 3 + dz / 2);
					m.rotation.y = sd * Math.atan2(dx, dz);
					s.add(m);
				}),
			);
			[-1, 1].forEach((sd) => {
				const g = new THREE.Group(),
					a = sd * th,
					cx = sd * (HW + 1.15 + SP / 2),
					cz = (Z0 + Z1) / 2,
					ix = -sd * 0.45,
					at = (lx, y, lz) => [cx + lx * Math.cos(a) + lz * Math.sin(a), y, cz - lx * Math.sin(a) + lz * Math.cos(a)];
				g.position.set(cx, 0, cz);
				g.rotation.y = a;
				g.add(B(0.9, H, L, "#1B2A4F", 0, GY + H / 2, 0));
				/* racing stripes along the inner face */
				["#E5484D", "#FFC83D", "#F4F6F9"].forEach((c, k) =>
					g.add(B(0.06, 0.8, L - 1.5, c, ix - sd * 0.03, 2.4 + k * 1, -0.5)),
				);
				/* neon strips up the wall */
				[-0.3, 0.05, 0.4].forEach((u, k) => {
					const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, H - 9, 0.2), neon(k % 2 ? "#FFC83D" : "#FF5A5F"));
					m.position.set(ix - sd * 0.03, 6.5 + (H - 9) / 2 + GY, u * L);
					g.add(m);
				});
				/* speakers high up */
				[-0.15, 0.2].forEach((u) => {
					const c1 = Cy(1.6, 1.6, 0.08, 14, "#151B24", ix - sd * 0.04, 22, u * L),
						c2 = Cy(0.6, 0.6, 0.12, 10, "#3A3F48", ix - sd * 0.06, 22, u * L),
						c3 = Cy(1.75, 1.75, 0.04, 14, "#2F4A7F", ix - sd * 0.02, 22, u * L);
					[c1, c2, c3].forEach((m) => (m.rotation.z = Math.PI / 2));
					g.add(c3, c1, c2);
				});
				/* the yellow edge on the front, with bulbs up its inner side */
				g.add(B(1.1, H, 0.36, "#FFC83D", 0, GY + H / 2, L / 2));
				for (let y = GY + 0.6; y < top - 0.4; y += 1.1) P.push(at(ix - sd * 0.12, y, L / 2 - 0.35));
				s.add(g);
			});
			/* the hood over the top, bulbs along its front edge */
			const hw = HW + 1.6 + SP;
			s.add(B(2 * hw + 2, 0.9, Z1 - Z0, "#1B2A4F", 0, top + 0.45, (Z0 + Z1) / 2));
			s.add(B(2 * hw + 2, 0.5, 0.36, "#FFC83D", 0, top + 0.2, Z1));
			for (let x = -hw; x <= hw; x += 1.1) P.push([x, top - 0.12, Z1 - 0.4]);
			const bl = new THREE.InstancedMesh(
					new THREE.IcosahedronGeometry(0.16, 0),
					new THREE.MeshBasicMaterial(),
					P.length,
				),
				o = new THREE.Object3D();
			P.forEach(([x, y, z], i) => {
				o.position.set(x, y, z);
				o.updateMatrix();
				bl.setMatrixAt(i, o.matrix);
				bl.setColorAt(i, new THREE.Color("#FFE9A8"));
			});
			s.add(bl);
			W.bulbs.push(bl);
		},
		spawn: (W, i) => ({ x: W.laneX(i), z: 0, yaw: i % 2 ? Math.PI : 0 }),
		initEnt(W, e) {
			e.fc = e.i % 2 ? -1 : 1;
			e.st = 0;
			e.ax = e.x;
			e.x0 = e.x;
			e.y = this.TOPY;
			e.ang = 0;
			e.tt = 0;
			e.dn = 0;
			e.lt = [];
			e.g.scale.setScalar(this.TS);
			e.f = {
				an: 0,
				tt: 0,
				st: 0,
				hp: 0,
				im: [0, 0, 0],
				ls: [0, 0, 0],
				gt: [0, 0],
				fp: [0, 0, 0],
				bp: [0, 0],
				tx: [0, 0],
				lt: [],
				sg: [0, 0],
				c2: 0,
			};
			e.balls = [];
			loadPlanck();
		},
		/* a ball's centre for any truck: local ones from their body, others from where they're drawn */
		ctr(e) {
			if (e.b) {
				const p = e.b.getPosition();
				return [p.x, p.y];
			}
			return [e.x, e.y];
		},
		shapeT() {
			return window.planck.Circle(this.R);
		},
		world(W, e) {
			if (e.pw || !window.planck) return e.pw;
			const pl = window.planck,
				V = pl.Vec2,
				w = new pl.World({ gravity: V(0, -this.GRAV) }),
				g = w.createBody(),
				{ HW, SW, SH, FLOOR, DW, PR } = this,
				fx = (sh, r, f) => g.createFixture(sh, { restitution: r, friction: f });
			fx(pl.Edge(V(-HW - 1, FLOOR), V(HW + 1, FLOOR)), 0, 0.7);
			[-1, 1].forEach((sd) => fx(pl.Edge(V(sd * HW, 0), V(sd * HW, this.CEIL + 1)), 0.23, 0.2));
			fx(pl.Edge(V(-HW, this.CEIL), V(HW, this.CEIL)), 0.23, 0.2);
			/* pegs, bumpers and flippers are tagged (userData) so a ball touching them can tell which */
			W.pegs.forEach(([x, y], i) =>
				g.createFixture({
					shape: pl.Circle(V(x, y), PR),
					restitution: this.PEGR,
					friction: 0.4,
					userData: { peg: i },
				}),
			);
			W.bumps.forEach((q, i) =>
				g.createFixture({
					shape: pl.Circle(V(q.x, q.y), this.BR),
					restitution: 0.69,
					friction: 0.2,
					userData: { bump: i },
				}),
			);
			e.flb = W.flips.map((f, i) => {
				const b = w.createBody({ type: "kinematic", position: V(f.x, f.y), angle: this.flipA(f, W.t - W.flipT[i]) }),
					o = { restitution: 0.35, friction: 0.3, userData: { flip: i } };
				b.createFixture(pl.Box(this.FL / 2, 0.16, V(this.FL / 2, 0), 0), o);
				b.createFixture(pl.Circle(V(0, 0), 0.32), o);
				b.createFixture(pl.Circle(V(this.FL, 0), 0.16), o);
				return { f, b };
			});
			e.ptm = W.t;
			for (let k = 1; k < this.COLS; k++) {
				const x = -HW + k * SW;
				fx(pl.Box(DW / 2, (SH - FLOOR) / 2, V(x, (SH + FLOOR) / 2), 0), 0.1, 0.3);
				fx(pl.Circle(V(x, SH), DW / 2), 0.3, 0.3);
			}
			e.pw = w;
			e.acc = 0;
			e.kin = {};
			return w;
		},
		/* every other falling (or landed) truck as a kinematic body in this truck's world, moved to where it is now */
		kinFollow(W, e, h) {
			const pl = window.planck,
				V = pl.Vec2;
			const all = [];
			W.list.forEach((o) => {
				if (o === e) return;
				const on = !o.gone && (o.local ? o.st === 1 || o.st === 2 : o.f && (o.f.st === 1 || o.f.st === 2)),
					c2 = o.local ? o.balls && o.balls[1] && o.balls[1].b.getPosition() : o.f && o.f.c2;
				all.push([o.k, on, ...this.ctr(o)]);
				all.push([o.k + "#2", on && !!c2, c2 ? (c2.x ?? c2[0]) : 0, c2 ? (c2.y ?? c2[1]) : 0]);
			});
			all.forEach(([key, on, x, y]) => {
				let kb = e.kin[key];
				if (!on) {
					if (kb && kb.isActive()) kb.setActive(false);
					return;
				}
				if (!kb) {
					kb = e.kin[key] = e.pw.createBody({ type: "kinematic", position: V(x, y) });
					kb.createFixture(this.shapeT(), { friction: this.FRIC, restitution: 0.35 });
				}
				const p = kb.getPosition();
				if (!kb.isActive() || Math.hypot(x - p.x, y - p.y) > 4) {
					kb.setActive(true);
					kb.setTransform(V(x, y), 0);
					kb.setLinearVelocity(V(0, 0));
				} else kb.setLinearVelocity(V((x - p.x) / h, (y - p.y) / h));
			});
		},
		touching(b) {
			for (let c = b.getContactList(); c; c = c.next) if (c.contact.isTouching()) return c.contact;
			return null;
		},
		/* controls: e.tl = +1 (◀ held) / -1 (▶ held); HOP is queued as the time it was pressed (good for 0.2 s) */
		ctlHTML() {
			return `<div class="rjctl"><button class="rjb" id="pkl" style="--bc:#2F7DE1" aria-label="Left"><i>◀</i></button><button class="rjb pkhop" id="pkh" style="--bc:#FF8A1F" aria-label="Drop or hop"><b>HOP</b></button><button class="rjb" id="pkr" style="--bc:#2F7DE1" aria-label="Right"><i>▶</i></button></div>`;
		},
		press(W, side, on) {
			if (!W || !W.me) return;
			const e = W.me;
			if (side === "h") {
				if (on) e.hopQ = W.t;
				return;
			}
			e.tb = e.tb || {};
			e.tb[side] = on;
			e.tl = (e.tb.l ? 1 : 0) - (e.tb.r ? 1 : 0);
		},
		wire() {
			[
				["pkl", "l"],
				["pkh", "h"],
				["pkr", "r"],
			].forEach(([id, sd]) =>
				cxWireBtn(
					document.getElementById(id),
					() => MG.plinko.press(W, sd, true),
					() => MG.plinko.press(W, sd, false),
				),
			);
		},
		onKey(W, k, down) {
			if (k === "arrowleft" || k === "a") this.press(W, "l", down);
			else if (k === "arrowright" || k === "d") this.press(W, "r", down);
			else if (down && [" ", "enter", "w", "arrowup"].includes(k)) this.press(W, "h", true);
		},
		/* the magnet moves during the countdown too; everyone drops together when the round's countdown runs out */
		pre(W, e, dt) {
			if (e.st === 0) this.aim(W, e, dt);
		},
		aim(W, e, dt) {
			const lim = this.HW - 1.8;
			e.ax = Math.max(-lim, Math.min(lim, e.ax - (e.tl || 0) * this.AIMV * dt));
			e.swing = (e.swing || 0) + ((e.tl || 0) * 0.12 - (e.swing || 0)) * Math.min(1, dt * 5);
			e.x = e.ax;
			e.y = this.TOPY;
			e.tt = e.swing + Math.sin(W.t * 2.2 + e.i) * 0.03;
		},
		drop(W, e) {
			const pl = window.planck,
				V = pl.Vec2;
			const m = this.mkBall(e, e.ax, this.TOPY, 0, -1, []);
			m.main = true;
			e.balls = [m];
			e.b = m.b;
			e.split2 = false;
			e.st = 1;
			e.dropT = W.t;
			e.lastTouch = -9;
			e.hopQ = undefined;
			mgLog(W, `${mgName(e)} drops in round ${e.rr + 1} at x ${e.ax.toFixed(1)}`);
			if (e.isMe) sfx("magnet");
		},
		/* one of a truck's balls (its own two never touch each other: collision group -1); gx = the x2 gates it went through */
		mkBall(e, x, y, vx, vy, gx) {
			const V = window.planck.Vec2,
				b = e.pw.createBody({
					type: "dynamic",
					position: V(x, y),
					linearDamping: 0.02,
					angularDamping: 0.3,
					bullet: true,
				});
			b.createFixture(this.shapeT(), { density: 1, friction: this.FRIC, restitution: 0.35, filterGroupIndex: -1 });
			b.setLinearVelocity(V(vx, vy));
			return { b, gx: gx.slice(), py0: y, lastTouch: -9, hopCd: 0, stk: 0, tt: 0, done: false };
		},
		/* a new round: back on the magnet at its home spot, a fresh physics world for the new board */
		newRound(W, e, r) {
			e.rr = r;
			e.pw = null;
			e.b = null;
			e.balls = [];
			e.split2 = false;
			e.f.c2 = 0;
			e.st = 0;
			e.ax = e.x0;
			e.swing = 0;
			e.aimX = undefined;
			e.z = 0;
			this.aim(W, e, 0);
		},
		rules(W, e, dt) {
			if (e.d) return;
			const S = this.sched(W);
			if (S.r !== e.rr) this.newRound(W, e, S.r);
			/* all rounds done: parked on the cabinet floor in front of the board, by the walls */
			if (S.over) {
				e.st = 3;
				e.d = true;
				e.b = null;
				e.balls = [];
				e.f.c2 = 0;
				e.x = [-1, 1, -1, 1, -1, 1][e.i] * (this.HW + 0.9 + Math.floor(e.i / 2) * 0.9);
				e.z = 4.2 + Math.floor(e.i / 2) * 3.2;
				e.y = this.GY + this.R;
				e.ang = e.tt = 0;
				e.vx = 0;
				e.f.st = 3;
				fb(W, e, `${e.sc}`, { stamp: true });
				if (e.isMe) sfx("fanfare");
				return;
			}
			const w = this.world(W, e);
			if (!w) return;
			const pl = window.planck,
				V = pl.Vec2;
			if (e.st === 0) {
				this.aim(W, e, dt);
				if (W.t >= S.D) this.drop(W, e);
				e.hopQ = undefined;
			}
			/* fixed physics steps; ◀ ▶ push every ball of yours that's still falling a little that way */
			e.acc = Math.min(0.1, e.acc + dt);
			if (Math.abs(e.ptm - W.t) > 0.1) e.ptm = W.t;
			while (e.acc >= 1 / 60) {
				const h = 1 / 60,
					live = e.st === 1 ? e.balls.filter((q) => !q.done) : [];
				this.kinFollow(W, e, h);
				/* flippers: turned to where they are at the end of this step (all devices agree: a function of time) */
				e.ptm += h;
				e.flb.forEach(({ f, b }, i) => b.setAngularVelocity((this.flipA(f, e.ptm - W.flipT[i]) - b.getAngle()) / h));
				live.forEach((q) => {
					if (e.tl) q.b.applyForceToCenter(V(-e.tl * this.PUSH * q.b.getMass(), 0), true);
					q.v0 = q.b.getLinearVelocity().clone();
				});
				w.step(h, 8, 3);
				live.forEach((q) => this.ballStep(W, e, q));
				e.acc -= h;
			}
			if (e.st === 1) {
				let hopped = false;
				e.balls.forEach((q) => {
					if (q.done) return;
					const b = q.b,
						p = b.getPosition();
					/* in a slot: it counts the moment the ball touches anything down there (no hopping out); still falling when
					   the round runs out of time: stuck, no points */
					if (p.y < this.SH && W.t - q.lastTouch < 0.05) return this.score(W, e, q);
					if (W.t >= S.D + this.ROUNDT) {
						q.done = true;
						fb(W, e, "Stuck!", { tone: "bad", at: [p.x, p.y + 1.6, 0] });
						mgLog(W, `${mgName(e)} stuck in round ${e.rr + 1}`);
						return;
					}
					/* HOP: the ball pops up off whatever it touches, leaning to the side held */
					if (
						e.hopQ !== undefined &&
						W.t - e.hopQ < 0.2 &&
						W.t - q.lastTouch < 0.25 &&
						W.t >= q.hopCd &&
						p.y >= this.SH
					) {
						const ux = -(e.tl || 0) * 0.55,
							l = Math.hypot(ux, 1),
							v = b.getLinearVelocity();
						b.setLinearVelocity(V(v.x * 0.4 + (ux / l) * this.HOPV, Math.max(0, v.y) * 0.3 + (1 / l) * this.HOPV));
						q.hopCd = W.t + this.HOPCD;
						q.hopT = W.t;
						hopped = true;
					}
					/* resting on a peg, a flipper or a divider top: nudge it off */
					q.stk = b.getLinearVelocity().length() < 0.35 ? q.stk + dt : 0;
					if (q.stk > 1.6) {
						q.stk = 0;
						b.setLinearVelocity(V((Math.random() < 0.5 ? -1 : 1) * 3, 2));
					}
				});
				if (hopped) {
					e.hopQ = undefined;
					e.f.hp++;
					mgLog(W, mgName(e) + " hops");
				}
				/* the last ball down ends the truck's round */
				if (e.balls.length && e.balls.every((q) => q.done)) {
					e.st = 2;
					e.scT = W.t;
					e.dn++;
					e.lt[e.rr] = Math.round(W.t * 100) / 100;
					e.f.lt = e.lt.slice();
				}
			}
			/* the copy from a split gate, for the other screens: [x, y, spin, tilt] */
			{
				const c = e.balls && e.balls[1];
				if (c) {
					const cp = c.b.getPosition(),
						cvx = c.b.getLinearVelocity().x;
					c.tt +=
						(Math.max(-0.35, Math.min(0.35, -cvx * 0.05)) + (c.done ? 0 : (e.tl || 0) * 0.22) - c.tt) *
						Math.min(1, dt * 6);
					e.f.c2 = [cp.x, cp.y, c.b.getAngle(), c.tt].map((v) => Math.round(v * 100) / 100);
				} else e.f.c2 = 0;
				/* the camera follows a ball still falling (the copy once the main ball is down) */
				const fq = e.balls && (e.balls.find((q) => !q.done) || e.balls[0]);
				e.cf = fq ? [fq.b.getPosition().x, fq.b.getPosition().y] : null;
			}
			if (e.b) {
				const p = e.b.getPosition(),
					vx = e.b.getLinearVelocity().x;
				e.ang = e.b.getAngle();
				e.x = p.x;
				e.y = p.y;
				e.vx = vx;
				/* the truck sways in its ball: back against the motion, towards the side steered */
				const tg = Math.max(-0.35, Math.min(0.35, -vx * 0.05)) + (e.st === 1 ? (e.tl || 0) * 0.22 : 0);
				e.tt += (tg - e.tt) * Math.min(1, dt * 6);
			} else if (e.st === 0) e.vx = 0;
			e.vz = 0;
			e.f.an = Math.round(e.ang * 100) / 100;
			e.f.tt = Math.round(e.tt * 100) / 100;
			e.f.st = e.st;
		},
		/* one physics step's aftermath for one of a truck's balls: what it touches, a hard knock (shared so every screen lights
		   the peg), x2 gates and the split gate it crosses (its line, downwards, between its pegs) */
		ballStep(W, e, q) {
			const b = q.b,
				c = this.touching(b),
				p = b.getPosition();
			if (c) {
				q.lastTouch = e.lastTouch = W.t;
				this.contacts(W, e, b);
				const dv = b.getLinearVelocity().clone().sub(q.v0).length();
				if (dv > 3.5 && W.t - (e.imT || 0) > 0.12) {
					e.imT = W.t;
					const wm = c.getWorldManifold(null),
						k = (wm && wm.points && wm.points[0]) || p;
					e.f.im = [e.f.im[0] + 1, Math.round(k.x * 100) / 100, Math.round(k.y * 100) / 100];
				}
			}
			const crossed = (g) => q.py0 >= g.y && p.y < g.y && Math.abs(p.x - g.x) <= g.w / 2 - this.PR;
			W.gates.forEach((g, i) => {
				if (q.gx.includes(i) || !crossed(g)) return;
				q.gx.push(i);
				e.f.gt = [e.f.gt[0] + 1, i];
				fb(W, e, q.gx.length > 1 ? "×4!" : "×2!", { tone: "good", at: [p.x, p.y + 1.6, 0] });
				mgLog(W, mgName(e) + " through x2 gate " + i);
				if (e.isMe) sfx("coin");
			});
			W.splits.forEach((g, i) => {
				if (!q.main || e.split2 || !crossed(g)) return;
				e.split2 = true;
				const v = b.getLinearVelocity();
				b.setLinearVelocity(window.planck.Vec2(v.x - this.SPLITV / 2, v.y));
				const c2 = this.mkBall(e, p.x, p.y, v.x + this.SPLITV / 2, v.y, q.gx);
				c2.tt = q.tt;
				e.balls.push(c2);
				e.f.sg = [(e.f.sg ? e.f.sg[0] : 0) + 1, i];
				fb(W, e, "SPLIT!", { stamp: true });
				mgLog(W, mgName(e) + " splits");
				if (e.isMe) sfx("coin");
			});
			q.py0 = p.y;
		},
		/* what a ball touches: a flipper fires, a bumper kicks it away (+points), the live TNT goes off */
		contacts(W, e, b) {
			for (let c = b.getContactList(); c; c = c.next) {
				const ct = c.contact;
				if (!ct.isTouching()) continue;
				const fa = ct.getFixtureA(),
					fo = fa.getBody() === b ? ct.getFixtureB() : fa,
					u = fo.getUserData();
				if (!u) continue;
				if (u.flip !== undefined) this.flipHit(W, e, u.flip);
				else if (u.bump !== undefined) this.bumpHit(W, e, u.bump, b);
				else if (u.peg !== undefined) this.tntHit(W, e, u.peg);
			}
		},
		flipHit(W, e, i) {
			if (W.t - W.flipT[i] < 0.9) return;
			W.flipT[i] = W.t + 0.05;
			e.f.fp = [e.f.fp[0] + 1, i, Math.round(W.flipT[i] * 100) / 100];
			mgLog(W, mgName(e) + " fires flipper " + i);
		},
		bumpHit(W, e, i, bb) {
			e.bmT = e.bmT || {};
			if (W.t - (e.bmT[i] ?? -9) < 0.3) return;
			e.bmT[i] = W.t;
			const q = W.bumps[i],
				p = bb.getPosition(),
				dx = p.x - q.x,
				dy = p.y - q.y,
				l = Math.hypot(dx, dy) || 1;
			bb.setLinearVelocity(window.planck.Vec2((dx / l) * this.BUMPV, (dy / l) * this.BUMPV + 1));
			/* x2 per gate this ball went through */
			const q2 = (e.balls || []).find((o) => o.b === bb),
				m = 2 ** ((q2 && q2.gx.length) || 0);
			e.sc += this.BUMPPTS * m;
			fb(W, e, "+" + this.BUMPPTS + (m > 1 ? " ×" + m : ""), { tone: "good", at: [p.x, p.y + 1.6, 0] });
			e.f.bp = [e.f.bp[0] + 1, i];
			mgLog(W, mgName(e) + " hits bumper " + i + " (+" + this.BUMPPTS * m + ")");
		},
		tntHit(W, e, i) {
			const q = this.tntNow(W);
			if (!q || q.i !== i) return;
			e.f.tx = [e.f.tx[0] + 1, q.n];
			fb(W, e, "BOOM!", { stamp: true });
			mgLog(W, mgName(e) + " sets off TNT " + q.n);
			this.boom(W, q);
		},
		/* a TNT goes off (here, or heard from another device): every ball this device runs within TNTR is thrown away */
		boom(W, q) {
			if (W.tntX[q.n] !== undefined) return;
			W.tntX[q.n] = W.t;
			const V = window.planck && window.planck.Vec2;
			W.list.forEach((o) => {
				if (!V || !o.local || !o.balls || o.st !== 1) return;
				o.balls.forEach((bq) => {
					if (bq.done) return;
					const p = bq.b.getPosition(),
						dx = p.x - q.x,
						dy = p.y - q.y,
						d = Math.hypot(dx, dy);
					if (d > this.TNTR) return;
					const k = 1 - d / this.TNTR,
						l = d || 1,
						v = bq.b.getLinearVelocity();
					bq.b.setLinearVelocity(V(v.x * 0.3 + (dx / l) * this.TNTV * k, v.y * 0.3 + (dy / l) * this.TNTV * k + 3 * k));
					if (o.isMe) W.shake = 0.6;
				});
			});
			burst(W.sc, q.x, q.y, 1.4, {
				n: 30,
				shape: "ico",
				cols: ["#FF8A1F", "#FFC83D", "#E5484D", "#3A3F48"],
				spd: 7,
				up: 4,
				life: 0.9,
				size: 1.4,
			});
			if (W.split || W.list.some((o) => o.isMe)) sfx("cannon");
		},
		/* a ball lands in a slot: its value, x3 if the sign is under it, x2 per gate it went through */
		score(W, e, q) {
			const p = q.b.getPosition(),
				k = Math.max(0, Math.min(this.COLS - 1, Math.floor((p.x + this.HW) / this.SW))),
				x3 = k === this.mslot(W.t),
				g2 = 2 ** q.gx.length,
				v = this.VAL[k] * (x3 ? 3 : 1) * g2;
			q.done = true;
			e.sc += v;
			e.f.ls = [e.f.ls[0] + 1, k, x3 ? 1 : 0];
			fb(W, e, `+${v}`, { tone: v >= 300 ? "good" : v <= 50 ? "bad" : "", at: [p.x, p.y + 1.6, 0] });
			if (x3) fb(W, e, "×3!", { stamp: true });
			mgLog(
				W,
				`${mgName(e)} round ${e.rr + 1}: slot ${k} ${this.VAL[k]}${x3 ? " x3" : ""}${g2 > 1 ? " x" + g2 : ""} = ${v}, total ${e.sc}`,
			);
			if (e.isMe) sfx(x3 || v >= 500 ? "fanfare" : v <= 50 ? "loss" : "coin");
		},
		timeUp(W, e) {
			if (e.st !== 3) fb(W, e, `${e.sc}`, { stamp: true });
		},
		fmt: (W, e) => `${e.sc} pts`,
		/* the top chip: the round, not the seconds left (the rounds end when the balls land) */
		clock: (W) => `Round ${Math.min(MG.plinko.DROPS, MG.plinko.sched(W).r + 1)}/${MG.plinko.DROPS}`,
		/* the share of the screen's height the buttons and the x3 strip cover at the bottom (phone mode; the board is framed
		   above them) */
		btmCover(W) {
			if (W.split || W.tv) return 0;
			const els = ["#mg .rjctl", "#mg .pkbar"].map((q) => document.querySelector(q)).filter(Boolean);
			if (!els.length || !GFX.h) return 0.26;
			const top = Math.min(
				...els.map((el) => {
					const r = el.getBoundingClientRect();
					return r.height ? r.top - 18 : GFX.h;
				}),
			);
			return Math.max(0, Math.min(0.5, (GFX.h - top) / GFX.h));
		},
		/* phone mode: a strip over the buttons with the slots, where the x3 sign is now and where your ball is across the board,
		   so you can steer for the x3 before it's in view */
		bar(W, e) {
			if (!W.pkBar || !W.pkBar.isConnected) {
				const box = document.getElementById("mg");
				if (!box) return;
				const el = document.createElement("div");
				el.className = "pkbar";
				el.innerHTML =
					this.VAL.map(
						(v) => '<i style="background:' + this.SCOL[v] + (v === 500 ? ";color:#3A2A00" : "") + '">' + v + "</i>",
					).join("") +
					'<b class="pkx3">×3</b><u class="pkme" style="background:' +
					pcol(e.p) +
					'"></u>';
				box.appendChild(el);
				W.pkBar = el;
			}
			const el = W.pkBar;
			el.children[this.COLS].style.left = ((this.mpos(W.t) + 0.5) / this.COLS) * 100 + "%";
			el.children[this.COLS + 1].style.left = Math.max(2, Math.min(98, ((e.x + this.HW) / (2 * this.HW)) * 100)) + "%";
			el.children[this.COLS + 1].style.opacity = e.st === 3 ? 0 : 1;
		},
		/* phone mode: follows your truck (portrait sees about 12 m across) in the part of the screen over the buttons,
		   the whole board once you're done */
		cam(W, tgt, pos, far) {
			const e = W.me,
				asp = GFX.w / GFX.h,
				tn = Math.tan((20 * Math.PI) / 180),
				b = this.btmCover(W);
			/* the whole board while everyone aims (and on the ready screen) and once you're done; the zoom in to your ball
			   starts just before the drop */
			if (e.st === 3 || W.t < this.sched(W).D - 0.7) return this.tvsCam(W, asp, 0, b, true);
			const [cx, cy] = e.cf || this.ctr(e),
				D = asp < 1 ? 34 : 30,
				hw = D * tn * asp,
				hh = D * tn,
				sh = hh * b /* the camera aims this much lower, so the free part's middle sits on the truck */,
				mx = this.HW + 1 - hw,
				lo = this.GY - 0.5 + hh * (1 - b) - sh,
				hi = this.HDR + 0.6 - hh,
				x = mx <= 0 ? 0 : Math.max(-mx, Math.min(mx, cx)),
				y = lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, cy - sh)),
				t = new THREE.Vector3(x, y, 0);
			return [t, t.clone().add(new THREE.Vector3(0, D * 0.1, D))];
		},
		/* the TV: the whole board while everyone aims, then it follows the falling balls (at least FOLLOWH m of the board
		   in view); the phone's overview (narrow) is always the whole board */
		FOLLOWH: 19,
		tvsCam(W, a, halfW, b, narrow) {
			/* on the TV the player cards cover the bottom: frame the board above them */
			if (b === undefined) {
				const el = document.querySelector("#mg .tvscards"),
					r = el && el.getBoundingClientRect();
				b = r && r.height ? Math.max(0, Math.min(0.35, (innerHeight - r.top) / innerHeight + 0.01)) : 0;
			}
			const tn = Math.tan((20 * Math.PI) / 180);
			let y0 = this.GY - 0.4,
				y1 = this.HDR + 1;
			if (!narrow) {
				const S = this.sched(W),
					fl = W.list.filter((o) => {
						/* still falling, or landed less than 2 s ago (its score pops up) */
						const st = o.local ? o.st : o.f && o.f.st,
							lt = (o.local ? o.lt : o.f && o.f.lt) || [];
						return !o.gone && (st === 1 || (st === 2 && W.t - (lt[S.r] ?? -9) < 2));
					});
				if (fl.length && W.t > S.D - 0.3) {
					const ys = fl.map((o) => o.y);
					fl.forEach((o) => {
						const c2 = o.f && o.f.c2;
						if (c2) ys.push(c2[1]);
					});
					let lo = Math.max(y0, Math.min(...ys) - 7),
						hi = Math.min(y1, Math.max(...ys) + 4.5);
					if (hi - lo < this.FOLLOWH) {
						const m = (lo + hi) / 2;
						lo = Math.max(y0, m - this.FOLLOWH / 2);
						hi = Math.min(y1, lo + this.FOLLOWH);
						lo = hi - this.FOLLOWH;
					}
					y0 = lo;
					y1 = hi;
				}
			}
			const D = Math.max((y1 - y0) / 2 / (1 - b) / tn, (this.HW + (narrow ? 1 : 2)) / (tn * a)) * 1.04,
				t = new THREE.Vector3(0, (y0 + y1) / 2 - D * tn * b, 0);
			return [t, t.clone().add(new THREE.Vector3(0, D * 0.08, D))];
		},
		render(W, e, dt) {
			this.scene(W, dt);
			const f = e.f || {};
			/* other trucks: ball spin and truck tilt, and a jump back to the magnet (or the parking spot) snaps instead of sliding */
			if (!e.local) {
				const k = 1 - Math.exp(-dt * 14);
				e.ang = lerpA(e.ang || 0, f.an || 0, k);
				e.tt = (e.tt || 0) + ((f.tt || 0) - (e.tt || 0)) * k;
				const n = e.net;
				if (n && Math.hypot(n.x - e.x, (n.y || 0) - e.y, n.z - e.z) > 6) {
					e.x = n.x;
					e.y = n.y || 0;
					e.z = n.z;
				}
			}
			/* the truck sits in the bottom of its ball (e.x / e.y = the ball's centre), tilted by tt */
			e.pitch = e.tt * e.fc;
			e.tr.rotation.z = e.pitch;
			e.g.position.set(e.x + this.WB * Math.sin(e.tt), e.y - this.WB * Math.cos(e.tt), e.z);
			const bl = this.ball(W, e),
				ha = e.hopT === undefined ? 9 : W.t - e.hopT,
				q = ha >= 0 && ha < 0.35 ? 0.13 * Math.sin((ha / 0.35) * Math.PI) : 0;
			bl.g.visible = !e.gone;
			bl.g.position.set(e.x, e.y, e.z);
			bl.g.scale.set(1 + q, 1 - q, 1 + q);
			bl.spin.rotation.z = e.ang;
			const col = pcol(e.p),
				st = e.local ? e.st : f.st || 0;
			if (st !== e.stSeen) {
				e.stSeen = st;
				e.stT = Math.max(0, W.t);
			}
			/* a hard knock: the peg it hit flashes in the truck's colour, with a few sparks */
			if (f.im && f.im[0] !== (e.imSeen || 0)) {
				e.imSeen = f.im[0];
				const [, x, y] = f.im;
				let bi = -1,
					bd = 1.4;
				W.pegs.forEach(([px, py], i) => {
					const d = Math.hypot(px - x, py - y);
					if (d < bd) {
						bd = d;
						bi = i;
					}
				});
				if (bi >= 0) W.pegFl[bi] = { t: W.t, c: new THREE.Color(col) };
				burst(W.sc, x, y, 1.5, {
					n: 5,
					shape: "cube",
					cols: ["#FFE27A", "#FFFFFF", col],
					spd: 2.5,
					up: 2,
					life: 0.4,
					size: 0.6,
				});
				if (W.split || e.isMe) sfx("click");
			}
			/* the copy from a split gate: a second truck in a second ball, drawn from e.f.c2 */
			{
				const c2 = f.c2;
				if (c2 && !e.tr2) {
					e.g2 = new THREE.Group();
					e.tr2 = buildTruck(e.p.truck, "springs");
					e.tr2.scale.setScalar(0.8);
					e.tr2.rotation.order = "YXZ";
					e.g2.add(e.tr2);
					e.g2.scale.setScalar(this.TS);
					W.sc.add(e.g2);
				}
				const b2 = c2 ? this.ball(W, e, "ball2") : e.ball2;
				if (e.g2) e.g2.visible = !!c2 && !e.gone;
				if (b2) b2.g.visible = !!c2 && !e.gone;
				if (c2 && !e.gone) {
					const [x, y, an, tt] = c2;
					e.tr2.rotation.set(0, e.yaw, tt * e.fc);
					e.g2.position.set(x + this.WB * Math.sin(tt), y - this.WB * Math.cos(tt), 0);
					b2.g.position.set(x, y, 0);
					b2.spin.rotation.z = an;
				}
			}
			if (f.sg && f.sg[0] !== (e.sgSeen || 0)) {
				e.sgSeen = f.sg[0];
				const g = W.splitM[f.sg[1]],
					q = W.splits[f.sg[1]];
				if (g) g.fl = W.t;
				if (q)
					burst(W.sc, q.x, q.y, 1.4, {
						n: 12,
						shape: "ico",
						cols: ["#FF8CC8", "#FFB3D9", "#FFFFFF"],
						spd: 3.5,
						up: 2,
						life: 0.6,
					});
			}
			/* through a x2 gate: it flashes */
			if (f.gt && f.gt[0] !== (e.gtSeen || 0)) {
				e.gtSeen = f.gt[0];
				const g = W.gateM[f.gt[1]],
					q = W.gates[f.gt[1]];
				if (g) g.fl = W.t;
				if (q)
					burst(W.sc, q.x, q.y, 1.4, {
						n: 8,
						shape: "ico",
						cols: ["#3DDC84", "#7CF2B0", "#FFFFFF"],
						spd: 3,
						up: 2,
						life: 0.5,
					});
			}
			/* a flipper fired (here or elsewhere: the latest fire time wins), a bumper kicked, a TNT went off */
			if (f.fp && f.fp[0] !== (e.fpSeen || 0)) {
				e.fpSeen = f.fp[0];
				const i = f.fp[1];
				if (W.flipT[i] !== undefined) W.flipT[i] = Math.max(W.flipT[i], f.fp[2]);
				if (W.split || e.isMe) sfx("click");
			}
			if (f.bp && f.bp[0] !== (e.bpSeen || 0)) {
				e.bpSeen = f.bp[0];
				const b = W.bumpG[f.bp[1]],
					q = W.bumps[f.bp[1]];
				if (b) b.t = W.t;
				if (q)
					burst(W.sc, q.x, q.y, 1.4, {
						n: 10,
						shape: "cube",
						cols: ["#FFE27A", "#FFFFFF", col],
						spd: 4,
						up: 2,
						life: 0.4,
						size: 0.7,
					});
				if (W.split || e.isMe) sfx("ram");
			}
			if (f.tx && f.tx[0] !== (e.txSeen || 0)) {
				e.txSeen = f.tx[0];
				const q = W.tnt.find((t) => t.n === f.tx[1]);
				if (q) this.boom(W, q);
			}
			if (e.isMe && !W.split && !W.tv) this.bar(W, e);
			/* the last 5 s before a falling ball counts as stuck: a small red countdown over it (TV: every truck, phone: yours) */
			{
				const S = this.sched(W),
					left = S.D + this.ROUNDT - W.t,
					show = st === 1 && S.E === null && left > 0 && left <= 5 && (W.split || e.isMe);
				if (show) {
					if (!e.tpill) {
						e.tpill = pillSprite();
						W.sc.add(e.tpill.sp);
					}
					const [x, y] = (e.local && e.cf) || [e.x, e.y],
						cam = (typeof TVS !== "undefined" && TVS && TVS.scam) || W.cam,
						sp = e.tpill.sp;
					e.tpill.set(String(Math.ceil(left)), "#E5484D");
					sp.position.set(x, y + this.R + 0.9, 1.5);
					const h = cam.position.distanceTo(sp.position) * 0.028;
					sp.scale.set(h * 3, h, 1);
				}
				if (e.tpill) e.tpill.sp.visible = !!show;
			}
			/* the hop: the ball pops (squash and stretch), the truck's wheels kick inside, a puff under it */
			if ((f.hp || 0) !== (e.hpSeen || 0)) {
				e.hpSeen = f.hp || 0;
				e.hopT = W.t;
				burst(W.sc, e.x, e.y - this.R, 0.6, {
					n: 7,
					shape: "ico",
					cols: ["#E8ECF2", "#C9CED8"],
					spd: 2,
					up: 1,
					life: 0.5,
				});
				if (W.split || e.isMe) sfx("step");
			}
			{
				const sa = e.hopT === undefined ? 9 : W.t - e.hopT;
				springSet(e.tr, sa < 0 ? 0 : sa < 0.07 ? (sa / 0.07) * 0.3 : Math.max(0, 0.3 * (1 - (sa - 0.07) / 0.3)));
			}
			/* scored: the slot floor flashes in the truck's colour, coins fly */
			if (f.ls && f.ls[0] !== (e.lsSeen || 0)) {
				e.lsSeen = f.ls[0];
				const sl = W.slotF[f.ls[1]];
				if (sl) {
					sl.fl = W.t;
					sl.fc.set(col);
				}
				burst(W.sc, this.slotX(f.ls[1]), 1.5, 0.5, {
					n: f.ls[2] ? 22 : 12,
					shape: "coin",
					cols: ["#FFC83D", "#FFE27A"],
					spd: 3,
					up: 7,
					life: 0.9,
				});
			}
			/* the magnet: on top of the hanging ball, back home while it falls */
			const mg = W.mag[e.k];
			if (mg) {
				const hang = st === 0 && !e.gone,
					tx = hang ? e.x : e.x0 !== undefined ? e.x0 : e.x,
					u = mg.userData,
					my = hang ? e.y + this.R - 0.02 : this.RAIL - 1.3;
				mg.position.x = hang ? tx : mg.position.x + (tx - mg.position.x) * Math.min(1, dt * 3);
				u.my = u.my === undefined ? my : u.my + (my - u.my) * Math.min(1, dt * (hang ? 20 : 3));
				u.mg.position.y = u.my;
				u.mg.rotation.z = hang ? e.tt * 0.3 : 0;
				const top = this.RAIL - 0.43,
					len = Math.max(0.05, top - u.my - 0.3);
				u.cab.scale.y = len;
				u.cab.position.y = u.my + 0.3 + len / 2;
				mg.visible = !e.gone;
			}
			if (e.isMe) crowdStep(W, null, st === 1 ? 0.8 : 0.3);
		},
		/* a truck's plastic ball: a faceted clear shell tinted in its colour, two seams in its colour that show the spin,
		   a shine that stays put */
		ball(W, e, key = "ball") {
			if (e[key]) return e[key];
			const g = new THREE.Group(),
				spin = new THREE.Group(),
				col = new THREE.Color(pcol(e.p)),
				R = this.R,
				shell = new THREE.Mesh(
					new THREE.IcosahedronGeometry(R, 2),
					new THREE.MeshStandardMaterial({
						color: col.clone().lerp(new THREE.Color("#F4F6F9"), 0.65),
						transparent: true,
						opacity: 0.22,
						roughness: 0.12,
						metalness: 0,
						flatShading: true,
						depthWrite: false,
					}),
				),
				sm = new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.8, roughness: 0.4 });
			shell.renderOrder = 2;
			[
				[0, Math.PI / 2],
				[Math.PI / 2, 0],
			].forEach(([rx, ry]) => {
				const r = new THREE.Mesh(new THREE.TorusGeometry(R, 0.045, 4, 36), sm);
				r.rotation.set(rx, ry, 0);
				r.renderOrder = 2;
				spin.add(r);
			});
			const sh = new THREE.Mesh(
				new THREE.SphereGeometry(0.26, 8, 6),
				new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.5, depthWrite: false }),
			);
			sh.position.set(-0.5 * R, 0.55 * R, 0.66 * R);
			sh.scale.set(1, 0.6, 0.35);
			sh.rotation.z = 0.7;
			sh.renderOrder = 3;
			g.add(shell, spin, sh);
			W.sc.add(g);
			return (e[key] = { g, spin });
		},
		/* once a frame: chasing bulbs, flippers, gates, the x3 sign and its glowing slot, peg flashes, slot flashes */
		scene(W, dt) {
			if (W.scF === W.t) return;
			W.scF = W.t;
			/* the round's countdown: "ROUND 2", then 3 2 1 and DROP! (the first round's after GO) */
			if (W.t >= 0) {
				const S = this.sched(W),
					left = S.D - W.t,
					st = S.D - (S.r ? this.AIMT : this.AIM0);
				W.big =
					S.E !== null && S.r === this.DROPS - 1 && W.t >= S.E
						? ""
						: S.r && W.t - st < 1.2 && left > 0
							? `ROUND ${S.r + 1}`
							: left > 0 && left <= 3
								? String(Math.ceil(left))
								: left <= 0 && left > -0.7
									? "DROP!"
									: "";
				W.bigT = W.t + 0.2;
			}
			const t = Math.max(0, W.t);
			{
				const ph = Math.floor(t * 8);
				if (ph !== W.bph) {
					W.bph = ph;
					const on = new THREE.Color("#FFE9A8"),
						off = new THREE.Color("#6B5A3A");
					W.bulbs.forEach((bl) => {
						for (let i = 0; i < bl.count; i++) bl.setColorAt(i, (i + ph) % 4 < 2 ? on : off);
						bl.instanceColor.needsUpdate = true;
					});
				}
			}
			W.flips.forEach((f, i) => (W.flipG[i].rotation.z = this.flipA(f, W.t - W.flipT[i])));
			W.bumpG.forEach((b) => {
				const k = W.t >= b.t ? Math.max(0, 1 - (W.t - b.t) / 0.35) : 0;
				b.g.scale.setScalar(1 + 0.18 * k);
				b.rm.color.set(k > 0.3 ? "#FFFFFF" : "#FFE27A");
			});
			{
				const q = this.tntNow(W),
					g = W.tntG;
				g.visible = !!q;
				if (q) {
					const a = Math.min(1, (W.t - q.t) / 0.25),
						left = q.t + this.TNTL - W.t;
					g.position.set(q.x, q.y, 0);
					g.scale.setScalar(a * (1 + Math.sin(W.t * (left < 2 ? 22 : 9)) * 0.06));
					if (Math.random() < dt * 18)
						burst(W.sc, q.x + 0.32, q.y + 0.82, 1, {
							n: 1,
							shape: "ico",
							cols: ["#FFE27A", "#FF8A1F"],
							spd: 1,
							up: 1.2,
							life: 0.35,
							size: 0.4,
						});
				}
			}
			W.gateM.concat(W.splitM).forEach((g) => {
				const k = W.t >= g.fl ? Math.max(0, 1 - (W.t - g.fl) / 0.6) : 0,
					w = Math.sin(Math.max(0, W.t) * 4);
				g.m.opacity = 0.5 + 0.12 * w + k * 0.4;
				g.hm.opacity = 0.5 + 0.15 * w + k * 0.35;
				g.m.color.set(k > 0.5 ? "#FFFFFF" : g.col || "#8CFFC0");
			});
			const mp = this.mpos(W.t),
				ms = Math.round(mp);
			W.mSign.position.x = this.slotX(0) + mp * this.SW;
			W.slotF.forEach((s, k) => {
				const fl = s.fl ? Math.max(0, 1 - (W.t - s.fl) / 0.9) : 0,
					gl = k === ms && W.t >= 0 ? 0.35 + 0.15 * Math.sin(W.t * 10) : 0;
				s.m.color.copy(s.c).lerp(s.fc, fl);
				s.m.emissive.copy(fl ? s.fc : s.c).multiplyScalar(Math.max(gl, fl * 0.8));
			});
			{
				const base = new THREE.Color("#FFC83D"),
					c = new THREE.Color();
				let ch = false;
				W.pegFl.forEach((q, i) => {
					if (!q) return;
					const k = Math.max(0, 1 - (W.t - q.t) / 0.6);
					W.caps.setColorAt(i, c.copy(base).lerp(q.c, k));
					if (!k) W.pegFl[i] = null;
					ch = true;
				});
				if (ch) W.caps.instanceColor.needsUpdate = true;
			}
		},
		/* CPUs: aim the magnet at a slot (usually the middle), then lean towards the best slot in reach as they fall,
		   counting the x3 sign where it will be when they get there; hop when stuck or now and then off a peg */
		bot(W, e, dt) {
			e.sk = e.sk ?? 0.3 + Math.random() * 0.7;
			if (e.st === 0) {
				if (W.t < 0) return null;
				if (e.aimX === undefined)
					e.aimX = Math.random() < 0.4 + e.sk * 0.3 ? (Math.random() - 0.5) * 2.4 : (Math.random() - 0.5) * 18;
				const dx = e.aimX - e.ax;
				e.tl = Math.abs(dx) > 0.3 ? (dx < 0 ? 1 : -1) : 0;
				return null;
			}
			if (e.st !== 1 || !e.b) {
				e.tl = 0;
				return null;
			}
			e.bt = (e.bt || 0) - dt;
			if (e.bt > 0) return null;
			e.bt = 0.12 + 0.35 * (1 - e.sk) + Math.random() * 0.1;
			const p = e.b.getPosition(),
				eta = Math.sqrt((2 * Math.max(0, p.y - this.SH)) / this.GRAV) * 1.7,
				m = this.mslot(W.t + eta);
			let best = 0,
				tx = p.x;
			for (let k = 0; k < this.COLS; k++) {
				const x = this.slotX(k),
					v = this.VAL[k] * (k === m ? 3 : 1) - Math.abs(x - p.x) * (60 + 400 / Math.max(1, p.y));
				if (v > best || k === 0) {
					best = v;
					tx = x;
				}
			}
			const dx = tx - p.x;
			e.tl = dx > 0.5 ? -1 : dx < -0.5 ? 1 : 0;
			if (
				p.y > this.SH + 0.6 &&
				W.t - e.lastTouch < 0.2 &&
				((e.balls[0] && e.balls[0].stk) > 0.4 || Math.random() < 0.08 * e.sk)
			)
				e.hopQ = W.t;
			return null;
		},
		watchSum: (W) =>
			W.list
				.filter((e) => !e.gone)
				.map((e) => `${mgName(e)} ${e.sc} (${e.dn} rounds)`)
				.join(", "),
		botScore: () => 300 + rnd(9) * 100,
	},
});

/* ---------- Plinko Sabotage ---------- */
/* Plinko Sabotage: every truck has its own small Plinko board (the same base layout for everyone, side by side). Each of
   DROPS rounds: PLANT s of planning, where your phone shows your target's board and you spend a coin budget placing traps
   in the gaps between its pegs (a ring from the seed: everyone sabotages exactly one rival, a different one each round
   when there are 3+), then everyone drops at once. Traps are hidden, on the TV too, until a ball sets them off; the
   saboteur scores TRAPPTS per trap hit. After the last ball lands every trap is revealed for BETWEEN s.
   Planning happens on the 3D board: the phone's camera moves to your target's board, you drag onto a gap and lift to drop
   the selected trap (W.sbIn from a raycast, planInput). On the TV every board shows its saboteur's traps and cursor live
   (they vanish at the drop), and the phone is a trackpad (def.pad: inp.x / inp.y, a lift = inp.boost) plus the tray.
   The controls (ctlHTML) hold the plan panel and the play buttons, switched by data-ph on the root; on the TV the phones
   mirror the TV's copy and send taps back as button presses, so the same handlers run everywhere.
   Shared per truck in e.f: an / tt / st / hp / ls / lt as in Plinko, pd [round] = when it pressed READY,
   tr {r, l: [[trap, gap]]} = the traps it placed this round, tg {r, l: [trap index]} = the traps on its board it set off,
   cu [gap, trap, finger down] = its planning cursor (0 outside planning) */
Object.assign(MG, {
	sabo: {
		name: "Plinko Sabotage",
		kind: "lane",
		ctrl: "custom",
		truckMode: "springs",
		hi: true,
		unit: "pts",
		dur: 290,
		bare: true,
		sun: [0, 9, 31.6],
		lt: { amb: 0.84, sun: 0.44, warm: 0.28, haze: 70 },
		fx: { col: 0.06 },
		how: "Every round: hide traps on a rival's board (wall off their way to the ×2 and SPLIT gates, plant a fake ×2, mine their pegs), then everyone drops. Traps stay hidden until hit; you score from your slots, plus points for every trap your rival hits!",
		tvHint:
			"Planning: your phone shows your rival's board: pick a trap, tap a gap. Playing: LEFT / RIGHT move and steer, HOP on the right half.",
		tapHint:
			"Planning: pick a trap, tap a gap on your rival's board (swipe to look around). Playing: ◀ ▶ move and steer, HOP pops you off the pegs.",
		pad: ".sbpad",
		ctlPhases: true,
		clock(W) {
			const S = this.sched(W);
			return S.plan ? `Plan ${Math.max(0, Math.ceil(S.P + this.PLANT - W.t))} s` : `Round ${S.r + 1}/${this.DROPS}`;
		},
		/* one board: COLS slots SW wide between walls at ±HW, ROWS peg rows RY apart from Y0 up; boards BW apart */
		/* each board is a full Plinko board in Plinko's units (the physics too, so it plays the same), drawn at K scale
		   (W.bg[board]: a group at its lane, scaled about the ground) so the boards fit side by side BW apart; e.x / e.y
		   are world positions (wx / wy), the physics board-local */
		K: 0.6,
		COLS: 7,
		SW: 4.4,
		HW: 15.4,
		ROWS: 8,
		RY: 3.4,
		Y0: 5,
		PR: 0.32,
		SH: 2.2,
		FLOOR: 0.12,
		DW: 0.24,
		GY: -2.6,
		BW: 21,
		R: 0.83,
		TS: 0.43,
		WB: 0.63,
		TOPY: 31.6 /* a hanging ball's centre (the top peg row is at 28.8) */,
		CEIL: 33.8,
		RAIL: 34.7,
		HDR: 36,
		VAL: [100, 300, 50, 500, 50, 300, 100],
		SCOL: { 500: "#FFC83D", 300: "#1FA35C", 100: "#2F7DE1", 50: "#E5484D" },
		MP: 11,
		DROPS: 3,
		PLANT: 60,
		AIMT: 4,
		ROUNDT: 25,
		BETWEEN: 4.5 /* the reveal after a round: every trap shows, phones zoom out to all boards */,
		BUDGET: 100,
		TRAPPTS: 40,
		GRAV: 13,
		PEGR: 0.68,
		FRIC: 0.05,
		PUSH: 2.6,
		HOPV: 6.5,
		HOPCD: 1.1,
		AIMV: 7,
		/* the Plinko board parts on every board, the same layout for everyone each round (Plinko's layout() with these
		   counts, rows LR and sizes): flippers, x2 gates, one split gate, pop bumpers, TNT */
		NFLIP: 3,
		NGATE: 2,
		NBUMP: 3,
		LR: { f: [1, 4], g: [0, 4], s: [3, 6] },
		SPLITV: 2.6,
		FL: 1.9,
		BR: 0.62,
		BUMPV: 10.3,
		BUMPPTS: 25,
		TNTL: 8,
		TNTR: 5,
		TNTV: 12,
		/* gravity trap: upside down and back every GFT s for GFLIP s; mine: blows away the pegs within MR, throws at MINEV */
		GFLIP: 6,
		GFT: 1.5,
		MR: 4.7,
		MINEV: 13.5,
		/* traps: key, name, icon, cost, colour, where it goes (s: between two pegs, straight or diagonal; h: straight only;
		   p: on a peg) */
		TRAPS: [
			{ k: "wall", n: "Wall", ic: "▬", c: 20, col: "#8E96A3", on: "s" },
			{ k: "fake", n: "Fake ×2", ic: "½", c: 30, col: "#3DDC84", on: "h" },
			{ k: "stun", n: "Stun", ic: "⚡", c: 25, col: "#E0A800", on: "s" },
			{ k: "grav", n: "Gravity", ic: "⇅", c: 25, col: "#8E5BE0", on: "s" },
			{ k: "flip", n: "Flipper", ic: "↗", c: 20, col: "#2F7DE1", on: "p" },
			{ k: "bomb", n: "Mine", ic: "✹", c: 35, col: "#FF8A1F", on: "p" },
		],
		kits() {
			loadPlanck();
		},
		/* borrowed from Plinko: the ball model, physics bits, the sliding x3 sign, the round end from landing times */
		ball: MG.plinko.ball,
		shapeT: MG.plinko.shapeT,
		touching: MG.plinko.touching,
		mpos: MG.plinko.mpos,
		mslot: MG.plinko.mslot,
		roundEnd: MG.plinko.roundEnd,
		layout: MG.plinko.layout,
		boardFx: MG.plinko.boardFx,
		tntModel: MG.plinko.tntModel,
		flipA: MG.plinko.flipA,
		mkBall: MG.plinko.mkBall,
		slotX(k) {
			return -this.HW + (k + 0.5) * this.SW;
		},
		/* board-local → world, and back (e.ox = the board's lane) */
		wx(e, x) {
			return e.ox + this.K * x;
		},
		wy(y) {
			return this.GY + this.K * (y - this.GY);
		},
		ly(y) {
			return this.GY + (y - this.GY) / this.K;
		},
		/* the full peg grid (board-local x); the round's layout (W.L) takes out the flipper and bumper pegs */
		pegs() {
			if (this.PG) return this.PG;
			const L = [];
			for (let r = 0; r < this.ROWS; r++) {
				const y = this.Y0 + r * this.RY;
				if (r % 2 === 0) for (let k = 0; k <= this.COLS; k++) L.push([-this.HW + k * this.SW, y, r]);
				else for (let k = 0; k < this.COLS; k++) L.push([-this.HW + (k + 0.5) * this.SW, y, r]);
			}
			return (this.PG = L);
		},
		/* the spots traps go on this round (W.L.tg): between two neighbouring pegs (bumpers and flipper hubs count), straight
		   ({k: "s", h: true}, not the x2 / split gates themselves, so walls block the way to them) or diagonal to the next row
		   up, and the pegs themselves ({k: "p"}); never in the bottom row (a wall over the 500 would shut it) or the top one */
		gaps(W) {
			const L = W.L;
			if (L.tg) return L.tg;
			const row = (y) => Math.round((y - this.Y0) / this.RY),
				lo = 1,
				hi = this.ROWS - 2,
				/* everything a ball bounces off at a grid point: pegs, bumpers, flipper hubs [x, y, radius, peg index] */
				P = L.pegs
					.map((q, i) => [q[0], q[1], this.PR, i])
					.concat(
						L.bumps.map((q) => [q.x, q.y, this.BR, -1]),
						L.flips.map((q) => [q.x, q.y, 0.32, -1]),
					),
				gs = L.gates.concat(L.splits),
				out = [],
				seg = (a, b, h) => {
					const len = Math.hypot(b[0] - a[0], b[1] - a[1]),
						x = (a[0] + b[0]) / 2,
						y = (a[1] + b[1]) / 2;
					if (h && gs.some((g) => Math.abs(g.x - x) < 0.1 && Math.abs(g.y - y) < 0.1)) return;
					out.push({
						k: "s",
						h,
						ax: a[0],
						ay: a[1],
						bx: b[0],
						by: b[1],
						u0: a[2] / len,
						u1: 1 - b[2] / len,
						x,
						y,
						len,
						w: len,
						cl: len - a[2] - b[2],
						ang: Math.atan2(b[1] - a[1], b[0] - a[0]),
						row: row(Math.min(a[1], b[1])),
					});
				};
			for (let n = lo; n <= hi; n++) {
				const ps = P.filter((q) => row(q[1]) === n).sort((a, b) => a[0] - b[0]);
				for (let j = 0; j + 1 < ps.length; j++)
					if (ps[j + 1][0] - ps[j][0] < this.SW + 0.1) seg(ps[j], ps[j + 1], true);
				if (n < hi)
					ps.forEach((a) =>
						P.filter((b) => row(b[1]) === n + 1 && Math.abs(Math.abs(b[0] - a[0]) - this.SW / 2) < 0.1).forEach((b) =>
							seg(a, b, false),
						),
					);
			}
			L.pegs.forEach((q, i) => {
				if (row(q[1]) >= lo && row(q[1]) <= hi) out.push({ k: "p", x: q[0], y: q[1], pi: i, row: row(q[1]) });
			});
			return (L.tg = out);
		},
		/* can trap t go on spot g */
		fits(t, g) {
			const o = this.TRAPS[t] && this.TRAPS[t].on;
			return !!g && (o === "p" ? g.k === "p" : g.k === "s" && (o !== "h" || g.h));
		},
		/* the pegs a mine on spot g blows away (indices into the round's pegs) */
		minePegs(W, g) {
			const out = [];
			W.L.pegs.forEach((q, i) => {
				if (Math.hypot(q[0] - g.x, q[1] - g.y) <= this.MR) out.push(i);
			});
			return out;
		},
		/* does a ball moving from (x0, y0) to (x1, y1) cross spot g's line (between its pegs) */
		crosses(g, x0, y0, x1, y1) {
			const dx = x1 - x0,
				dy = y1 - y0,
				ex = g.bx - g.ax,
				ey = g.by - g.ay,
				den = dx * ey - dy * ex;
			if (Math.abs(den) < 1e-9) return false;
			const t = ((g.ax - x0) * ey - (g.ay - y0) * ex) / den,
				u = ((g.ax - x0) * dy - (g.ay - y0) * dx) / den;
			return t >= 0 && t <= 1 && u >= g.u0 && u <= g.u1;
		},
		/* round rd's layout and its models on every board (W.bd, rebuilt every round; W.bx[board] = its parts) */
		setBoard(W, rd) {
			W.lr = rd;
			const L = (W.L = { mg: W.mg });
			this.layout(L, rd);
			if (W.bd) {
				W.sc.remove(W.bd);
				W.bd.traverse((o) => o.geometry && o.geometry.dispose());
			}
			W.bd = new THREE.Group();
			W.sc.add(W.bd);
			W.bx = W.plist.map((pl, bi) => {
				const g = new THREE.Group(),
					tg = this.tntModel();
				this.boardPose(W, g, bi);
				W.bd.add(g);
				g.add(tg);
				return Object.assign(this.boardFx(W, g, L), { tntG: tg, k: pl.key });
			});
		},
		/* a group in board bi's local units: at its lane, scaled K about the ground */
		boardPose(W, g, bi) {
			g.position.set(W.laneX(bi), this.GY * (1 - this.K), 0);
			g.scale.setScalar(this.K);
			return g;
		},
		/* who sabotages whom: a ring of the players shuffled by the seed, turned a different step each round */
		ring(W) {
			if (W.ring) return W.ring;
			const r = mulberry((W.mg.seed || 1) * 13 + 5),
				o = W.plist.map((q) => q.key).sort();
			for (let i = o.length - 1; i > 0; i--) {
				const j = Math.floor(r() * (i + 1));
				[o[i], o[j]] = [o[j], o[i]];
			}
			return (W.ring = o);
		},
		step(W, rd) {
			const n = this.ring(W).length;
			return n < 2 ? 0 : 1 + (rd % (n - 1));
		},
		victimOf(W, k, rd) {
			const o = this.ring(W),
				n = o.length;
			return o[(o.indexOf(k) + this.step(W, rd)) % n];
		},
		sabOf(W, k, rd) {
			const o = this.ring(W),
				n = o.length;
			return o[(o.indexOf(k) - this.step(W, rd) + n) % n];
		},
		/* the traps on k's board this round: [[trap type, gap index]] as its saboteur placed them */
		trapsOn(W, k, rd) {
			const s = W.ents[this.sabOf(W, k, rd)];
			if (!s || s.gone) return [];
			const a = s.local ? { r: s.rr, l: s.trp || [] } : s.f && s.f.tr;
			return a && a.r === rd ? a.l || [] : [];
		},
		/* the traps on k's board that have gone off this round */
		hitsOn(W, k, rd) {
			const e = W.ents[k];
			if (!e) return [];
			const a = e.local ? { r: e.rr, l: e.tgl || [] } : e.f && e.f.tg;
			return a && a.r === rd ? a.l || [] : [];
		},
		/* the round schedule, the same on every device: planning from P until PE (when everyone pressed DONE, or after PLANT
		   s), the drop at D = PE + AIMT, the end E from the landing times (as in Plinko). plan / over flags */
		planEnd(W, rd, P) {
			const ds = W.list
				.filter((o) => !o.gone)
				.map((o) => {
					const a = o.local ? o.pd : o.f && o.f.pd;
					return a ? a[rd] : undefined;
				});
			if (ds.length && ds.every((v) => typeof v === "number")) return Math.min(Math.max(...ds) + 0.3, P + this.PLANT);
			return W.t >= P + this.PLANT ? P + this.PLANT : null;
		},
		sched(W) {
			if (W.schT === W.t && W.sch) return W.sch;
			let r = 0,
				P = 0,
				PE,
				D,
				E;
			for (;;) {
				PE = this.planEnd(W, r, P);
				D = PE === null ? null : PE + this.AIMT;
				E = D !== null && W.t >= D ? this.roundEnd(W, r, D) : null;
				if (E === null || W.t < E || r === this.DROPS - 1) break;
				r++;
				P = E;
			}
			W.schT = W.t;
			W.sch = {
				r,
				P,
				PE,
				D,
				E,
				plan: W.t >= 0 && (PE === null || W.t < PE),
				over: E !== null && W.t >= E && r === this.DROPS - 1,
			};
			if (W.lr !== r) this.setBoard(W, r);
			return W.sch;
		},
		/* one board's frame at x = ox (its owner's name on the header): back, slots and plates, walls, dividers, the x3 sign
		   (the pegs and parts come per round from setBoard). Also builds the controller's view of a single board (tvcOpen) */
		boardAt(W, s, pl, ox, plate) {
			const { HW, SW, COLS, SH, FLOOR, DW, GY, HDR } = this,
				top = HDR + 0.9,
				bh = top - GY;
			s.add(B(2 * HW, bh, 0.4, "#1B2A4F", ox, GY + bh / 2, -1.95));
			for (let k = 0; k < COLS; k++)
				s.add(B(SW - 0.1, top - 1.8, 0.06, k % 2 ? "#26437E" : "#1F3869", ox + this.slotX(k), (top - 1.8) / 2, -1.72));
			[-1, 1].forEach((sd) => {
				s.add(B(0.7, bh, 3.6, "#E5484D", ox + sd * (HW + 0.35), GY + bh / 2, -0.1));
				s.add(B(0.3, bh, 0.06, "#B8333A", ox + sd * (HW + 0.35), GY + bh / 2, 1.73));
			});
			/* the header carries the board's owner, in their colour */
			s.add(B(2 * HW + 1.4, 1.8, 3.6, "#E5484D", ox, HDR, -0.1));
			const nm = canvasTex(512, 96, (x, w, h) => {
					x.font = "56px Bungee, 'Arial Black', Impact, sans-serif";
					x.textAlign = "center";
					x.textBaseline = "middle";
					x.lineWidth = 10;
					x.strokeStyle = "#151B24";
					x.strokeText(pl.name.slice(0, 12).toUpperCase(), w / 2, h / 2 + 4, w - 20);
					x.fillStyle = pcol(pl);
					x.fillText(pl.name.slice(0, 12).toUpperCase(), w / 2, h / 2 + 4, w - 20);
				}),
				np = new THREE.Mesh(
					new THREE.PlaneGeometry(14, 1.7),
					new THREE.MeshBasicMaterial({ map: nm, transparent: true }),
				);
			np.position.set(ox, HDR, 1.74);
			s.add(np);
			s.add(B(2 * HW, 0.3, 0.36, "#8E96A3", ox, this.RAIL, 0));
			s.add(B(2 * HW, -GY, 3.6, "#2A3550", ox, GY / 2, -0.1));
			s.add(B(2 * HW - 0.4, 0.14, 0.08, "#8E96A3", ox, -0.55, 1.74));
			const sf = [];
			for (let k = 0; k < COLS; k++) {
				const v = this.VAL[k],
					c = this.SCOL[v],
					x = ox + this.slotX(k);
				plate[v] =
					plate[v] ||
					canvasTex(256, 112, (g, w, h) => {
						g.fillStyle = "#151B24";
						rr(g, 2, 2, w - 4, h - 4, 22);
						g.fill();
						g.fillStyle = c;
						rr(g, 10, 10, w - 20, h - 20, 16);
						g.fill();
						g.font = "64px Bungee, 'Arial Black', Impact, sans-serif";
						g.textAlign = "center";
						g.textBaseline = "middle";
						g.fillStyle = v === 500 ? "#3A2A00" : "#F4F6F9";
						g.fillText(String(v), w / 2, h / 2 + 4);
					});
				const pm = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.36), new THREE.MeshBasicMaterial({ map: plate[v] }));
				pm.position.set(x, -1.75, 1.73);
				s.add(pm);
				const fm = new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.6 }),
					f = new THREE.Mesh(new THREE.BoxGeometry(SW - DW, FLOOR, 3.4), fm);
				f.position.set(x, FLOOR / 2, -0.05);
				f.receiveShadow = true;
				s.add(f);
				sf.push({ m: fm, c: new THREE.Color(c), fl: 0, fc: new THREE.Color() });
			}
			W.slotF.push(sf);
			for (let k = 1; k < COLS; k++) {
				const x = ox - HW + k * SW;
				s.add(B(DW, SH - FLOOR, 3.2, "#F4F6F9", x, (SH + FLOOR) / 2, -0.15));
				const t = Cy(DW / 2, DW / 2, 3.2, 8, "#F4F6F9", x, SH, -0.15);
				t.rotation.x = Math.PI / 2;
				s.add(t);
			}
			/* the x3 sign under the slots */
			const g = new THREE.Group(),
				tx = (W.x3Tex =
					W.x3Tex ||
					canvasTex(192, 96, (x, w, h) => {
						x.font = "62px Bungee, 'Arial Black', Impact, sans-serif";
						x.textAlign = "center";
						x.textBaseline = "middle";
						x.fillStyle = "#151B24";
						x.fillText("×3", w / 2, h / 2 + 4);
					})),
				tp = new THREE.Mesh(
					new THREE.PlaneGeometry(1.5, 0.75),
					new THREE.MeshBasicMaterial({ map: tx, transparent: true }),
				),
				ar = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 3), new THREE.MeshBasicMaterial({ color: "#FFC83D" }));
			tp.position.z = 0.09;
			ar.position.set(0, 0.68, 0);
			g.add(B(1.9, 0.86, 0.16, "#FFC83D", 0, 0, 0), tp, ar);
			g.position.set(ox, -0.55, 1.86);
			s.add(g);
			W.signs.push({ g, ox });
		},
		/* ---- scene: the cabinet round all the boards, one board per truck side by side ---- */
		build(W) {
			const s = W.sc,
				n = W.plist.length,
				{ GY, HDR } = this,
				plate = {};
			W.laneX = (i) => (i - (n - 1) / 2) * this.BW;
			MG.plinko.cabinet.call(
				Object.assign(Object.create(MG.plinko), { HW: (n * this.BW) / 2 - 1.5, HDR: this.wy(HDR), GY }),
				W,
			);
			W.slotF = [];
			W.signs = [];
			W.bg = W.plist.map((pl, bi) => {
				const g = this.boardPose(W, new THREE.Group(), bi);
				s.add(g);
				this.boardAt(W, g, pl, 0, plate);
				return g;
			});
			this.setBoard(W, 0);
			/* magnets on the rail, one per truck */
			W.mag = {};
			W.plist.forEach((p) => {
				const g = new THREE.Group(),
					cab = Cy(0.05, 0.05, 1, 5, "#3A3F48", 0, 0, 0),
					mg = new THREE.Group();
				g.add(B(1, 0.5, 0.8, "#FFC83D", 0, this.RAIL, 0), B(0.6, 0.18, 0.6, "#23272F", 0, this.RAIL - 0.34, 0));
				mg.add(Cy(0.75, 0.75, 0.3, 12, "#2A2F3A", 0, 0.15, 0), Cy(0.78, 0.78, 0.08, 12, "#E5484D", 0, 0.04, 0));
				g.add(cab, mg);
				g.userData = { cab, mg };
				W.bg[W.plist.indexOf(p)].add(g);
				W.mag[p.key] = g;
			});
			W.trapV = {};
			W.bpill = {};
		},
		spawn: (W, i) => ({ x: W.laneX(i), z: 0, yaw: i % 2 ? Math.PI : 0 }),
		initEnt(W, e) {
			e.fc = e.i % 2 ? -1 : 1;
			e.ox = e.x;
			e.st = 0;
			e.ax = 0;
			e.y = this.wy(this.TOPY);
			e.ang = e.tt = 0;
			e.dn = 0;
			e.lt = [];
			e.pd = [];
			e.trp = [];
			e.tgl = [];
			e.sel = 0;
			e.g.scale.setScalar(this.TS * this.K);
			e.balls = [];
			e.f = {
				an: 0,
				tt: 0,
				st: 0,
				hp: 0,
				ls: [0, 0, 0],
				lt: [],
				pd: [],
				tr: { r: 0, l: [] },
				tg: { r: 0, l: [] },
				gt: [0, 0],
				fp: [0, 0, 0],
				tf: [0, 0, 0],
				bp: [0, 0],
				tx: [0, 0],
				sg: [0, 0],
				c2: 0,
			};
			loadPlanck();
		},
		/* ---- controls: the plan panel and the play buttons in one root, data-ph = plan | play ---- */
		/* the plan panel: a pad (phone mode: see-through over the 3D board, drag onto a gap; TV controller: a trackpad
		   for the cursor on the TV), the target / coins / time line and the tray of traps with READY */
		ctlHTML() {
			const tray = this.TRAPS.map(
				(t, i) =>
					`<button class="sbt" data-t="${i}" style="--bc:${t.col}"><i>${t.ic}</i><b>${t.n}</b><em>${t.c}</em></button>`,
			).join("");
			return `<div class="sbctl" data-ph="play"><div class="sbplan"><div class="sbpad"><span class="sbhint">Tap a gap to drop the trap · swipe to look around</span><span class="sbhint tv">Slide to move your cursor on the TV · lift to drop</span></div><div class="sbbot"><div class="sbtop"><b class="sbtgt">Sabotage</b><span class="sbcoin">${this.BUDGET}</span><span class="sbtime">${this.PLANT} s</span></div><div class="sbtray">${tray}<button class="sbdone">READY</button></div></div></div><div class="rjctl"><button class="rjb sbl" style="--bc:#2F7DE1" aria-label="Left"><i>◀</i></button><button class="rjb pkhop sbh" style="--bc:#FF8A1F" aria-label="Hop"><b>HOP</b></button><button class="rjb sbr" style="--bc:#2F7DE1" aria-label="Right"><i>▶</i></button></div></div>`;
		},
		wire() {
			document.querySelectorAll(".sbctl").forEach((root) => {
				if (root.dataset.wired) return;
				root.dataset.wired = "1";
				root.addEventListener("pointerdown", (ev) => {
					const b = ev.target.closest && ev.target.closest(".sbplan button");
					if (!b) return;
					ev.preventDefault();
					MG.sabo.tap(W, b);
				});
				/* phone mode: the finger on the board, as a point in the board plane (z = 0) from the camera; a tap drops the
				   trap, a swipe scrolls the view up / down the board (W.sbDrag, px) */
				const pad = root.querySelector(".sbpad");
				let pid = null,
					sx = 0,
					sy = 0,
					ly = 0,
					moved = false;
				const at = (ev, h) => {
					if (!W || !W.me || W.split || !GFX.cam) return;
					const r = GFX.r.domElement.getBoundingClientRect(),
						rc = new THREE.Raycaster();
					rc.setFromCamera(
						new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, 1 - ((ev.clientY - r.top) / r.height) * 2),
						GFX.cam,
					);
					const o = rc.ray.origin,
						d = rc.ray.direction;
					if (Math.abs(d.z) < 1e-4) return;
					const s = -o.z / d.z;
					W.sbIn = { x: o.x + d.x * s, y: o.y + d.y * s, h, up: !h };
				};
				pad.addEventListener("pointerdown", (ev) => {
					if (pid !== null) return;
					ev.preventDefault();
					pid = ev.pointerId;
					sx = ev.clientX;
					sy = ly = ev.clientY;
					moved = false;
					try {
						pad.setPointerCapture(pid);
					} catch (e) {}
					at(ev, true);
				});
				pad.addEventListener("pointermove", (ev) => {
					if (ev.pointerId !== pid || !W) return;
					if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) {
						moved = true;
						if (W.sbIn) W.sbIn.h = false;
					}
					if (moved) W.sbDrag = (W.sbDrag || 0) + ev.clientY - ly;
					else at(ev, true);
					ly = ev.clientY;
				});
				pad.addEventListener("pointerup", (ev) => {
					if (ev.pointerId !== pid) return;
					pid = null;
					if (!moved) at(ev, false);
				});
				pad.addEventListener("pointercancel", (ev) => {
					if (ev.pointerId !== pid) return;
					pid = null;
					if (W && W.sbIn) W.sbIn.h = false;
				});
				[
					["sbl", "l"],
					["sbh", "h"],
					["sbr", "r"],
				].forEach(([c, sd]) =>
					cxWireBtn(
						root.querySelector("." + c),
						() => MG.sabo.press(W, sd, true),
						() => MG.sabo.press(W, sd, false),
					),
				);
			});
		},
		press: MG.plinko.press,
		onKey(W, k, down) {
			if (k === "arrowleft" || k === "a") this.press(W, "l", down);
			else if (k === "arrowright" || k === "d") this.press(W, "r", down);
			else if (down && [" ", "enter", "w", "arrowup"].includes(k)) this.press(W, "h", true);
		},
		/* a tap in the plan panel: pick a trap, or READY */
		tap(W, b) {
			if (!W || !W.me) return;
			const e = W.me,
				S = this.sched(W);
			if (!S.plan || e.rr !== S.r) return;
			if (b.dataset.t !== undefined) e.sel = +b.dataset.t;
			else if (b.classList.contains("sbdone")) {
				if (e.pd[S.r] !== undefined) return;
				e.pd[S.r] = Math.round(W.t * 100) / 100;
				e.f.pd = e.pd.slice();
			}
			if (e.isMe) sfx("click");
		},
		spent(e) {
			return (e.trp || []).reduce((a, [t]) => a + this.TRAPS[t].c, 0);
		},
		/* put trap t on spot gi: the same trap there again takes it back (a flipper first turns round: [t, gi, direction]),
		   another one swaps it; false when it can't go there or doesn't fit the coins left (5 walls can't close a row:
		   there's always a way through) */
		place(W, e, t, gi) {
			const i = e.trp.findIndex((q) => q[1] === gi),
				old = i >= 0 ? e.trp.splice(i, 1)[0] : null,
				g = this.gaps(W)[gi],
				flip = this.TRAPS[t] && this.TRAPS[t].k === "flip";
			let ok = true;
			if (old && old[0] === t && flip && old[2] === this.flipDir(g)) e.trp.splice(i, 0, [t, gi, -old[2]]);
			else if (!old || old[0] !== t) {
				const T = this.TRAPS[t];
				ok = this.fits(t, g) && this.spent(e) + T.c <= this.BUDGET;
				if (ok) e.trp.push(flip ? [t, gi, this.flipDir(g)] : [t, gi]);
				else if (old) e.trp.splice(i, 0, old);
			}
			e.f.tr = { r: e.rr, l: e.trp.map((q) => q.slice()) };
			return ok;
		},
		/* a gap as a spot on the TV controller's pad (-1 .. 1, the inverse of planInput's mapping) */
		padXY(W, gi) {
			const g = this.gaps(W)[gi],
				yl = this.Y0 + 0.4 * this.RY,
				yh = this.Y0 + (this.ROWS - 1.4) * this.RY;
			return [g.x / (this.HW - 0.8), (2 * (yh - g.y)) / (yh - yl) - 1];
		},
		/* the TV controller's planning view: a camera on your target's board (built here from the same parts), zoomed to the
		   pad's width; swipe up / down to look around, tap a gap to drop the selected trap (sent like a trackpad: the gap's
		   spot, then a lift). The target and your traps come from the mirrored root's data-vk / data-trp */
		tvcOpen(api) {
			const wrap = api.wrap,
				cv = document.createElement("canvas"),
				hint = document.createElement("div"),
				V = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, 1, 1, 300), y: null, w: 0, h: 0, raf: 0 },
				VW = { slotF: [], signs: [] },
				tn = Math.tan((15 * Math.PI) / 180);
			let rd;
			try {
				rd = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
			} catch (e) {
				return null;
			}
			cv.className = "sbview";
			hint.className = "sbvhint";
			hint.textContent = "Tap a gap to drop the trap · swipe to look around";
			cv.hidden = hint.hidden = true;
			wrap.parentNode.append(cv, hint);
			rd.setPixelRatio(Math.min(2, devicePixelRatio || 1));
			V.sc.background = new THREE.Color("#10151E");
			const sun = new THREE.DirectionalLight("#FFFFFF", 0.6);
			sun.position.set(4, 40, 30);
			V.sc.add(new THREE.AmbientLight("#FFFFFF", 0.72), sun);
			const board = new THREE.Group(),
				traps = new THREE.Group(),
				mark = new THREE.Group();
			V.sc.add(board, traps, mark);
			const fr = new THREE.Mesh(
					new THREE.PlaneGeometry(this.SW - 0.3, 1.9),
					new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false }),
				),
				ic = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, opacity: 0.85 }));
			fr.renderOrder = 7;
			ic.renderOrder = 8;
			ic.scale.setScalar(1.25);
			ic.position.z = 0.4;
			mark.add(fr, ic);
			mark.visible = false;
			let vk = null,
				fk = null,
				trp = null,
				tapT = -1e9,
				pid = null,
				sy = 0,
				ly = 0,
				sx = 0,
				moved = false;
			const clear = (g) => {
					while (g.children.length) g.remove(g.children[0]);
				},
				view = () => {
					const asp = V.w / Math.max(1, V.h),
						D = (this.HW + 1) / (tn * asp),
						hh = D * tn,
						lo = this.GY - 0.4 + hh,
						hi = this.HDR + 2.4 - hh;
					if (V.y === null) V.y = hi;
					V.y = lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, V.y));
					return { D, hh };
				},
				tap = (ev) => {
					const rc = cv.getBoundingClientRect(),
						ray = new THREE.Raycaster();
					ray.setFromCamera(
						new THREE.Vector2(((ev.clientX - rc.left) / rc.width) * 2 - 1, 1 - ((ev.clientY - rc.top) / rc.height) * 2),
						V.cam,
					);
					const o = ray.ray.origin,
						d = ray.ray.direction;
					if (Math.abs(d.z) < 1e-4) return;
					const k = -o.z / d.z,
						sel = Math.max(
							0,
							[...wrap.querySelectorAll(".sbt")].findIndex((b) => b.classList.contains("on")),
						),
						gi = this.nearGap(VW, o.x + d.x * k, o.y + d.y * k, true, sel);
					if (gi < 0) return;
					const g = this.gaps(VW)[gi];
					mark.position.set(g.x, g.y, 1.3);
					mark.userData.g = g;
					fr.material.map = VW.curTex;
					fr.material.color.set(api.col || "#FFFFFF");
					fr.material.needsUpdate = true;
					ic.material.map = this.iconTex(VW, Math.max(0, sel));
					ic.material.needsUpdate = true;
					tapT = performance.now();
					api.put(...this.padXY(VW, gi));
				};
			wrap.addEventListener("pointerdown", (ev) => {
				if (pid !== null || cv.hidden || !ev.target.closest || !ev.target.closest(".sbpad")) return;
				ev.preventDefault();
				pid = ev.pointerId;
				sx = ev.clientX;
				sy = ly = ev.clientY;
				moved = false;
				try {
					ev.target.setPointerCapture(pid);
				} catch (e) {}
			});
			wrap.addEventListener("pointermove", (ev) => {
				if (ev.pointerId !== pid) return;
				if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) moved = true;
				if (moved && V.h) V.y += ((ev.clientY - ly) * 2 * view().hh) / V.h;
				ly = ev.clientY;
			});
			const up = (ev) => {
				if (ev.pointerId !== pid) return;
				pid = null;
				if (ev.type === "pointerup" && !moved) tap(ev);
			};
			wrap.addEventListener("pointerup", up);
			wrap.addEventListener("pointercancel", up);
			const loop = () => {
				V.raf = requestAnimationFrame(loop);
				const root = wrap.querySelector(".sbctl"),
					pad = wrap.querySelector(".sbpad"),
					on = !!root && !!pad && root.getAttribute("data-ph") === "plan",
					rc = on && pad.getBoundingClientRect();
				cv.hidden = hint.hidden = !(rc && rc.width);
				if (cv.hidden) return;
				const w = Math.round(rc.width - 6),
					h = Math.round(rc.height - 6);
				if (w !== V.w || h !== V.h) {
					V.w = w;
					V.h = h;
					Object.assign(cv.style, { left: rc.left + 3 + "px", top: rc.top + 3 + "px" });
					rd.setSize(w, h);
					V.cam.aspect = w / h;
					V.cam.updateProjectionMatrix();
					hint.style.left = rc.left + rc.width / 2 + "px";
					hint.style.top = rc.bottom - 12 + "px";
				}
				/* the target's board, built again when the target changes (a new round) */
				const bk = root.dataset.vk + ":" + root.dataset.r;
				if (bk !== vk) {
					vk = bk;
					trp = null;
					V.y = null;
					clear(board);
					const pl = (G && G.players.find((q) => q.key === root.dataset.vk)) || { name: "", key: root.dataset.vk };
					VW.L = { mg: (G && G.mg) || { seed: 1 } };
					this.layout(VW.L, +root.dataset.r || 0);
					this.boardAt(VW, board, pl, 0, {});
					this.boardFx(VW, board, VW.L);
					const frame = (dash, lw) =>
						canvasTex(256, 128, (x, cw, ch) => {
							if (!dash) {
								x.strokeStyle = "#151B24";
								x.lineWidth = lw + 12;
								rr(x, 14, 14, cw - 28, ch - 28, 30);
								x.stroke();
							}
							x.strokeStyle = "#FFFFFF";
							x.lineWidth = lw;
							if (dash) x.setLineDash([22, 14]);
							rr(x, 14, 14, cw - 28, ch - 28, 30);
							x.stroke();
						});
					VW.gapTex = VW.gapTex || frame(true, 8);
					VW.curTex = VW.curTex || frame(false, 14);
					fk = null;
				}
				/* the markers of the spots the selected trap fits */
				const sel = Math.max(
						0,
						[...wrap.querySelectorAll(".sbt")].findIndex((b) => b.classList.contains("on")),
					),
					sk = vk + ":" + this.TRAPS[sel].on;
				if (sk !== fk) {
					fk = sk;
					if (V.gm) board.remove(V.gm);
					V.gm = this.spotFrames(VW, sel);
					board.add(V.gm);
				}
				/* your traps, as the TV has them */
				if ((root.dataset.trp || "") !== trp) {
					trp = root.dataset.trp || "";
					clear(traps);
					trp
						.split(" ")
						.filter(Boolean)
						.forEach((q) => {
							const [t, gi, d] = q.split(".").map(Number),
								g = this.gaps(VW)[gi];
							if (!g || !this.TRAPS[t]) return;
							const m = this.trapMesh(VW, t, g, d);
							m.visible = true;
							traps.add(m);
						});
					tapT = -1e9;
				}
				/* the tapped gap shows the trap at once, until the TV's answer comes back */
				const ta = (performance.now() - tapT) / 1000;
				mark.visible = ta < 1.2;
				if (mark.visible) this.fitCursor(fr, mark.userData.g, 1 + 0.15 * Math.max(0, 1 - ta * 4));
				const { D } = view();
				V.cam.position.set(0, V.y + D * 0.04, D);
				V.cam.lookAt(0, V.y, 0);
				rd.render(V.sc, V.cam);
			};
			loop();
			return () => {
				cancelAnimationFrame(V.raf);
				try {
					rd.dispose();
					rd.forceContextLoss();
				} catch (e) {}
				cv.remove();
				hint.remove();
			};
		},
		/* the spot nearest a point on the board (board-local) that trap t fits; strict: -1 when it's not near any */
		nearGap(W, x, y, strict, t) {
			let best = -1,
				bd = 1e9;
			this.gaps(W).forEach((g, i) => {
				if (t !== undefined && !this.fits(t, g)) return;
				let d;
				if (g.k === "p") d = Math.hypot(x - g.x, y - g.y);
				else {
					/* to the nearest point of its line between the pegs */
					const ex = g.bx - g.ax,
						ey = g.by - g.ay,
						u = Math.max(g.u0, Math.min(g.u1, ((x - g.ax) * ex + (y - g.ay) * ey) / (ex * ex + ey * ey)));
					d = Math.hypot(x - (g.ax + ex * u), y - (g.ay + ey * u));
				}
				if (d < bd) {
					bd = d;
					best = i;
				}
			});
			return strict && bd > 1.6 ? -1 : best;
		},
		/* the planning cursor of a local human: the TV's trackpad (inp.x / inp.y over the gap rows, a lift = inp.boost) or
		   the finger on the phone's board (W.sbIn); lifting drops the selected trap into the gap under the cursor */
		planInput(W, e, S) {
			let x,
				y,
				h,
				up = false;
			if (W.split) {
				const i = W.inp,
					yl = this.Y0 + 0.4 * this.RY,
					yh = this.Y0 + (this.ROWS - 1.4) * this.RY;
				up = !!i.boost;
				i.boost = false;
				h = 1;
				x = Math.max(-1, Math.min(1, i.x || 0)) * (this.HW - 0.8);
				y = yh - ((Math.max(-1, Math.min(1, i.y || 0)) + 1) / 2) * (yh - yl);
			} else {
				const q = W.sbIn,
					v = W.ents[this.victimOf(W, e.k, S.r)];
				if (!q) return;
				h = q.h ? 1 : 0;
				up = q.up;
				q.up = false;
				x = (q.x - (v ? v.ox : 0)) / this.K;
				y = this.ly(q.y);
			}
			const gi = this.nearGap(W, x, y, !W.split, e.sel);
			if (h || gi >= 0) e.cu = gi;
			e.cuH = h && gi >= 0 ? 1 : 0;
			if (!up || gi < 0) return;
			const ok = this.place(W, e, e.sel, gi);
			if (!ok) W.sbNo = W.t;
			if (e.isMe) sfx(ok ? "click" : "loss");
		},
		/* CPUs pick a few traps for the middle rows, then put them down one by one (the cursor shows on the TV), then READY */
		botPlan(W, e, S) {
			if (e.bp !== S.r) {
				e.bp = S.r;
				const G0 = this.gaps(W);
				let left = this.BUDGET;
				e.bq = [];
				for (let n = 0; n < 12; n++) {
					const ok = this.TRAPS.map((t, i) => i).filter((i) => this.TRAPS[i].c <= left);
					if (!ok.length) break;
					const t = ok[Math.floor(Math.random() * ok.length)],
						g = G0.map((q, i) => i).filter(
							(i) => G0[i].row <= 5 && this.fits(t, G0[i]) && !e.bq.some((q) => q[1] === i),
						);
					if (!g.length) break;
					left -= this.TRAPS[t].c;
					e.bq.push([t, g[Math.floor(Math.random() * g.length)]]);
				}
				e.bnext = W.t + 1.5 + Math.random() * 2;
				e.botDone = 1e9;
			}
			if (!e.bq.length) return;
			const [t, gi] = e.bq[0];
			e.sel = t;
			e.cu = gi;
			e.cuH = 1;
			if (W.t < e.bnext) return;
			this.place(W, e, t, gi);
			e.bq.shift();
			e.cuH = 0;
			e.bnext = W.t + 1 + Math.random() * 2.5;
			if (!e.bq.length) e.botDone = W.t + 1 + Math.random() * 4;
		},
		/* ---- rounds ---- */
		newRound(W, e, r) {
			e.rr = r;
			e.pw = null;
			e.b = null;
			e.balls = [];
			e.split2 = false;
			e.f.c2 = 0;
			e.cf = null;
			e.st = 0;
			e.ax = 0;
			e.swing = 0;
			e.z = 0;
			e.trp = [];
			e.tgl = [];
			e.trig = {};
			e.tgSeen = {};
			e.stunT = -9;
			e.gravT = -99;
			e.gUp = false;
			e.f.tr = { r, l: [] };
			e.f.tg = { r, l: [] };
			e.f.cu = 0;
			e.cu = this.nearGap(W, 0, this.Y0 + 3 * this.RY, false, e.sel);
			e.cuH = 0;
			if (e.isMe) W.sbIn = W.sbY = null;
			this.aim(W, e, 0);
		},
		aim(W, e, dt) {
			const lim = this.HW - 1.4;
			e.ax = Math.max(-lim, Math.min(lim, e.ax - (e.tl || 0) * this.AIMV * dt));
			e.swing = (e.swing || 0) + ((e.tl || 0) * 0.12 - (e.swing || 0)) * Math.min(1, dt * 5);
			e.x = this.wx(e, e.ax);
			e.y = this.wy(this.TOPY);
			e.tt = e.swing + Math.sin(W.t * 2.2 + e.i) * 0.03;
		},
		/* a board's flipper fire times this round (W.fT[key]: set by its owner's balls, or heard through e.f.fp) */
		flipTimes(W, k) {
			const o = (W.fT = W.fT || {});
			if (!o[k] || o[k].r !== W.lr) o[k] = { r: W.lr, a: W.L.flips.map(() => -99) };
			return o[k].a;
		},
		/* a flipper trap on peg spot g: pointing d (1 right, -1 left), at first in towards the middle */
		flipDir(g) {
			return g.x < -0.1 ? 1 : -1;
		},
		trapFlip(g, d) {
			return { x: g.x, y: g.y, dir: d || this.flipDir(g) };
		},
		/* a board's flipper-trap fire times this round (W.tfT[key] {trap index: time}) */
		trapFT(W, k) {
			const o = (W.tfT = W.tfT || {});
			if (!o[k] || o[k].r !== W.lr) o[k] = { r: W.lr, a: {} };
			return o[k].a;
		},
		/* this truck's physics world (board-local x), made at the drop: the round's pegs, bumpers and flippers (tagged, like
		   Plinko's), walls, dividers, and the traps its saboteur placed that ball can hit (walls, flippers) */
		world(W, e) {
			if (e.pw || !window.planck) return e.pw;
			const pl = window.planck,
				V = pl.Vec2,
				L = W.L,
				w = new pl.World({ gravity: V(0, -this.GRAV) }),
				g = w.createBody(),
				{ HW, SW, SH, FLOOR, DW, PR } = this,
				fx = (sh, r, f, u) => g.createFixture({ shape: sh, restitution: r, friction: f, userData: u || null });
			fx(pl.Edge(V(-HW - 1, FLOOR), V(HW + 1, FLOOR)), 0, 0.7);
			[-1, 1].forEach((sd) => fx(pl.Edge(V(sd * HW, 0), V(sd * HW, this.CEIL + 1)), 0.23, 0.2));
			fx(pl.Edge(V(-HW, this.CEIL), V(HW, this.CEIL)), 0.23, 0.2);
			const G0 = this.gaps(W);
			e.traps = this.trapsOn(W, e.k, e.rr)
				.filter(([t, gi]) => this.fits(t, G0[gi]))
				.map((q) => q.slice());
			/* a flipper trap takes its peg's place */
			const under = {};
			e.traps.forEach(([t, gi]) => {
				if (this.TRAPS[t].k === "flip") under[G0[gi].pi] = 1;
			});
			e.pegFx = L.pegs.map(([x, y], i) => (under[i] ? null : fx(pl.Circle(V(x, y), PR), this.PEGR, 0.4, { peg: i })));
			L.bumps.forEach((q, i) => fx(pl.Circle(V(q.x, q.y), this.BR), 0.69, 0.2, { bump: i }));
			const FT = this.flipTimes(W, e.k);
			e.flb = L.flips.map((f, i) => {
				const b = w.createBody({ type: "kinematic", position: V(f.x, f.y), angle: this.flipA(f, W.t - FT[i]) }),
					o = { restitution: 0.35, friction: 0.3, userData: { flip: i } };
				b.createFixture(pl.Box(this.FL / 2, 0.16, V(this.FL / 2, 0), 0), o);
				b.createFixture(pl.Circle(V(0, 0), 0.32), o);
				b.createFixture(pl.Circle(V(this.FL, 0), 0.16), o);
				return { f, b };
			});
			e.ptm = W.t;
			for (let k = 1; k < this.COLS; k++) {
				const x = -HW + k * SW;
				fx(pl.Box(DW / 2, (SH - FLOOR) / 2, V(x, (SH + FLOOR) / 2), 0), 0.1, 0.3);
				fx(pl.Circle(V(x, SH), DW / 2), 0.3, 0.3);
			}
			/* walls along their line, flipper traps as Plinko's flippers (firing when a ball lands on them) */
			e.tfb = [];
			e.traps.forEach(([t, gi, d], idx) => {
				const q = G0[gi],
					k = this.TRAPS[t].k;
				if (k === "wall") fx(pl.Box(q.cl / 2 - 0.02, 0.16, V(q.x, q.y), q.ang), 0.35, 0.3, { trap: idx });
				else if (k === "flip") {
					const f = this.trapFlip(q, d),
						b = w.createBody({ type: "kinematic", position: V(q.x, q.y), angle: this.flipA(f, 99) }),
						o = { restitution: 0.35, friction: 0.3, userData: { trap: idx } };
					b.createFixture(pl.Box(this.FL / 2, 0.16, V(this.FL / 2, 0), 0), o);
					b.createFixture(pl.Circle(V(0, 0), 0.32), o);
					b.createFixture(pl.Circle(V(this.FL, 0), 0.16), o);
					e.tfb.push({ f, b, idx });
				}
			});
			e.pw = w;
			e.acc = 0;
			return w;
		},
		drop(W, e) {
			const m = this.mkBall(e, e.ax, this.TOPY, 0, -1, []);
			m.main = true;
			m.hv = 0;
			m.hx = {};
			e.balls = [m];
			e.b = m.b;
			e.split2 = false;
			e.st = 1;
			e.lastTouch = -9;
			e.hopQ = undefined;
			mgLog(W, `${mgName(e)} drops in round ${e.rr + 1} (${e.traps.length} traps on the board)`);
			if (e.isMe) sfx("magnet");
		},
		/* a trap goes off on this truck's board under ball q: its effect; the first time also shown to everyone (e.f.tg) and
		   scored by the saboteur. A fake x2 halves every ball that goes through it */
		trigger(W, e, q, idx) {
			const T = this.TRAPS[e.traps[idx][0]],
				g = this.gaps(W)[e.traps[idx][1]],
				b = q.b,
				V = window.planck.Vec2,
				p = b.getPosition(),
				at = [this.wx(e, p.x), this.wy(p.y + 1.6), 0];
			if (T.k === "fake") {
				if (q.hx[idx]) return;
				q.hx[idx] = 1;
				q.hv++;
			} else if (T.k === "flip") {
				/* a flipper trap fires every time a ball lands on it (it only counts as hit the first time) */
				const TF = this.trapFT(W, e.k);
				if (W.t - (TF[idx] ?? -99) >= 0.9) {
					TF[idx] = W.t + 0.05;
					e.f.tf = [(e.f.tf ? e.f.tf[0] : 0) + 1, idx, Math.round(TF[idx] * 100) / 100];
				}
				if (e.trig[idx]) return;
			} else if (e.trig[idx]) return;
			if (!e.trig[idx]) {
				e.trig[idx] = 1;
				e.tgl.push(idx);
				e.f.tg = { r: e.rr, l: e.tgl.slice() };
				mgLog(W, `${mgName(e)} hits a ${T.n} from ${mgName(W.ents[this.sabOf(W, e.k, e.rr)])}`);
				if (e.isMe) sfx("loss");
			}
			if (T.k === "fake") fb(W, e, "FAKE! ×½", { tone: "bad", at });
			else if (T.k === "stun") {
				e.stunT = W.t + 3;
				fb(W, e, "STUNNED!", { tone: "bad", at });
			} else if (T.k === "grav") {
				e.gravT = W.t;
				fb(W, e, "GRAVITY!", { tone: "bad", at });
			} else if (T.k === "flip") fb(W, e, "FLIPPED!", { tone: "bad", at });
			else if (T.k === "bomb") {
				/* the mine: the pegs round it are gone, every ball of this truck near it is thrown away */
				this.minePegs(W, g).forEach((i) => {
					const f = e.pegFx[i];
					if (f) {
						f.getBody().destroyFixture(f);
						e.pegFx[i] = null;
					}
				});
				e.balls.forEach((o) => {
					if (o.done) return;
					const op = o.b.getPosition(),
						dx = op.x - g.x,
						dy = op.y - g.y,
						d = Math.hypot(dx, dy) || 1;
					if (d > this.MR + 1) return;
					o.b.setLinearVelocity(V((dx / d) * this.MINEV, (dy / d) * this.MINEV + 2));
				});
				fb(W, e, "BOOM!", { tone: "bad", at });
				if (e.isMe) W.shake = 0.6;
			} else fb(W, e, "Blocked!", { tone: "bad", at });
		},
		/* the saboteur's side: points for every trap of yours your target set off */
		sabTick(W, e, S) {
			const vk = this.victimOf(W, e.k, S.r);
			this.hitsOn(W, vk, S.r).forEach((idx) => {
				if (e.tgSeen[idx]) return;
				e.tgSeen[idx] = 1;
				e.sc += this.TRAPPTS;
				fb(W, e, `+${this.TRAPPTS} trap!`, { tone: "good" });
				mgLog(W, `${mgName(e)} scores ${this.TRAPPTS} for a trap`);
				if (e.isMe) sfx("coin");
			});
		},
		rules(W, e, dt) {
			if (e.d) return;
			const S = this.sched(W);
			if (S.r !== e.rr) this.newRound(W, e, S.r);
			if (S.over) {
				e.st = 3;
				e.d = true;
				e.b = null;
				e.balls = [];
				e.f.c2 = 0;
				e.cf = null;
				e.x = e.ox + (e.i % 2 ? 1 : -1) * 4;
				e.z = 4.4;
				e.y = this.GY + this.R * this.K;
				e.ang = e.tt = 0;
				e.vx = 0;
				e.f.st = 3;
				fb(W, e, `${e.sc}`, { stamp: true });
				if (e.isMe) sfx("fanfare");
				return;
			}
			this.sabTick(W, e, S);
			if (!S.plan && e.f.cu) e.f.cu = 0;
			if (S.plan) {
				if (e.bot) {
					this.botPlan(W, e, S);
					if (W.t >= e.botDone && e.pd[S.r] === undefined) {
						e.pd[S.r] = Math.round(W.t * 100) / 100;
						e.f.pd = e.pd.slice();
					}
				} else if (e.isMe) this.planInput(W, e, S);
				e.f.cu = [e.cu, e.sel, e.cuH];
				this.aim(W, e, 0);
				this.sync(e);
				return;
			}
			if (e.st === 0) {
				this.aim(W, e, dt);
				e.hopQ = undefined;
				if (S.D !== null && W.t >= S.D) {
					if (!this.world(W, e)) return this.sync(e);
					this.drop(W, e);
				} else return this.sync(e);
			}
			const w = this.world(W, e);
			if (!w || !e.balls.length) return this.sync(e);
			const V = window.planck.Vec2,
				FT = this.flipTimes(W, e.k),
				TF = this.trapFT(W, e.k),
				gT = W.t - e.gravT,
				gOn = gT >= 0 && gT < this.GFLIP,
				gUp = gOn && Math.floor(gT / this.GFT) % 2 === 0;
			/* the gravity trap: upside down, back, upside down, back */
			if (gUp !== e.gUp) {
				e.gUp = gUp;
				w.setGravity(V(0, gUp ? this.GRAV : -this.GRAV));
				if (gOn) fb(W, e, gUp ? "⇈" : "⇊", { tone: "bad" });
			}
			/* fixed physics steps; ◀ ▶ push every ball still falling (not while stunned) */
			e.acc = Math.min(0.1, e.acc + dt);
			if (Math.abs(e.ptm - W.t) > 0.1) e.ptm = W.t;
			while (e.acc >= 1 / 60) {
				const h = 1 / 60,
					live = e.st === 1 ? e.balls.filter((q) => !q.done) : [],
					tl = e.tl || 0;
				e.ptm += h;
				e.flb.forEach(({ f, b }, i) => b.setAngularVelocity((this.flipA(f, e.ptm - FT[i]) - b.getAngle()) / h));
				e.tfb.forEach(({ f, b, idx }) =>
					b.setAngularVelocity((this.flipA(f, e.ptm - (TF[idx] ?? -99)) - b.getAngle()) / h),
				);
				live.forEach((q) => {
					if (tl && W.t >= e.stunT) q.b.applyForceToCenter(V(-tl * this.PUSH * q.b.getMass(), 0), true);
				});
				w.step(h, 8, 3);
				live.forEach((q) => this.ballStep(W, e, q));
				e.acc -= h;
			}
			if (e.st === 1) {
				let hopped = false;
				e.balls.forEach((q) => {
					if (q.done) return;
					const b = q.b,
						p = b.getPosition();
					if (p.y < this.SH && W.t - q.lastTouch < 0.05) return this.score(W, e, q);
					if (W.t >= S.D + this.ROUNDT) {
						q.done = true;
						fb(W, e, "Stuck!", { tone: "bad", at: [this.wx(e, p.x), this.wy(p.y + 1.6), 0] });
						mgLog(W, `${mgName(e)} stuck in round ${e.rr + 1}`);
						return;
					}
					if (
						e.hopQ !== undefined &&
						W.t - e.hopQ < 0.2 &&
						W.t - q.lastTouch < 0.25 &&
						W.t >= q.hopCd &&
						W.t >= e.stunT &&
						p.y >= this.SH
					) {
						/* off the surface, whichever way gravity points */
						const ux = -(e.tl || 0) * 0.55,
							l = Math.hypot(ux, 1),
							v = b.getLinearVelocity(),
							sg = e.gUp ? -1 : 1;
						b.setLinearVelocity(
							V(v.x * 0.4 + (ux / l) * this.HOPV, sg * (Math.max(0, sg * v.y) * 0.3 + (1 / l) * this.HOPV)),
						);
						q.hopCd = W.t + this.HOPCD;
						hopped = true;
					}
					q.stk = b.getLinearVelocity().length() < 0.35 ? q.stk + dt : 0;
					if (q.stk > 1.6) {
						q.stk = 0;
						b.setLinearVelocity(V((Math.random() < 0.5 ? -1 : 1) * 3, 2));
					}
				});
				if (hopped) {
					e.hopQ = undefined;
					e.f.hp++;
				}
				/* the last ball down ends the truck's round */
				if (e.balls.every((q) => q.done)) {
					e.st = 2;
					e.dn++;
					e.lt[e.rr] = Math.round(W.t * 100) / 100;
					e.f.lt = e.lt.slice();
				}
			}
			/* the copy from a split gate, for the other screens: [x (world), y, spin, tilt]; the camera follows a ball still
			   falling (the copy once the main ball is down) */
			const c = e.balls[1];
			if (c) {
				const cp = c.b.getPosition(),
					cvx = c.b.getLinearVelocity().x;
				c.tt +=
					(Math.max(-0.35, Math.min(0.35, -cvx * 0.05)) + (c.done ? 0 : (e.tl || 0) * 0.22) - c.tt) *
					Math.min(1, dt * 6);
				e.f.c2 = [this.wx(e, cp.x), this.wy(cp.y), c.b.getAngle(), c.tt].map((v) => Math.round(v * 100) / 100);
			} else e.f.c2 = 0;
			const fq = e.balls.find((q) => !q.done) || e.balls[0],
				fp = fq.b.getPosition();
			e.cf = [this.wx(e, fp.x), this.wy(fp.y)];
			const p = e.b.getPosition(),
				vx = e.b.getLinearVelocity().x;
			e.ang = e.b.getAngle();
			e.x = this.wx(e, p.x);
			e.y = this.wy(p.y);
			e.vx = vx;
			const tg = Math.max(-0.35, Math.min(0.35, -vx * 0.05)) + (e.st === 1 ? (e.tl || 0) * 0.22 : 0);
			e.tt += (tg - e.tt) * Math.min(1, dt * 6);
			this.sync(e);
		},
		/* one physics step's aftermath for one ball: what it touches (a wall trap, a flipper, a bumper, the live TNT), the x2
		   gates and the split gate it crosses, and the traps in the gaps it drops through */
		ballStep(W, e, q) {
			const b = q.b,
				L = W.L,
				p = b.getPosition();
			if (this.touching(b)) {
				q.lastTouch = e.lastTouch = W.t;
				for (let c = b.getContactList(); c; c = c.next) {
					const ct = c.contact;
					if (!ct.isTouching()) continue;
					const fa = ct.getFixtureA(),
						u = (fa.getBody() === b ? ct.getFixtureB() : fa).getUserData();
					if (!u) continue;
					if (u.trap !== undefined) this.trigger(W, e, q, u.trap);
					else if (u.flip !== undefined) this.flipHit(W, e, u.flip);
					else if (u.bump !== undefined) this.bumpHit(W, e, u.bump, q);
					else if (u.peg !== undefined) this.tntHit(W, e, u.peg);
				}
			}
			const crossed = (g) => q.py0 >= g.y && p.y < g.y && Math.abs(p.x - g.x) <= g.w / 2 - this.PR;
			L.gates.forEach((g, i) => {
				if (q.gx.includes(i) || !crossed(g)) return;
				q.gx.push(i);
				e.f.gt = [e.f.gt[0] + 1, i];
				fb(W, e, q.gx.length > 1 ? "×4!" : "×2!", { tone: "good", at: [this.wx(e, p.x), this.wy(p.y + 1.6), 0] });
				mgLog(W, mgName(e) + " through x2 gate " + i);
				if (e.isMe) sfx("coin");
			});
			L.splits.forEach((g, i) => {
				if (!q.main || e.split2 || !crossed(g)) return;
				e.split2 = true;
				const v = b.getLinearVelocity();
				b.setLinearVelocity(window.planck.Vec2(v.x - this.SPLITV / 2, v.y));
				const c2 = this.mkBall(e, p.x, p.y, v.x + this.SPLITV / 2, v.y, q.gx);
				c2.tt = q.tt;
				c2.hv = q.hv;
				c2.hx = Object.assign({}, q.hx);
				e.balls.push(c2);
				e.f.sg = [e.f.sg[0] + 1, i];
				fb(W, e, "SPLIT!", { stamp: true });
				mgLog(W, mgName(e) + " splits");
				if (e.isMe) sfx("coin");
			});
			/* traps on its way: lines it crosses (stun, gravity, fake x2), a mine it comes close to */
			const G0 = this.gaps(W);
			e.traps.forEach(([t, gi], idx) => {
				const k = this.TRAPS[t].k,
					g = G0[gi];
				if (k === "bomb") {
					if (!e.trig[idx] && Math.hypot(p.x - g.x, p.y - g.y) < this.R + this.PR + 0.45) this.trigger(W, e, q, idx);
				} else if (k !== "wall" && k !== "flip" && this.crosses(g, q.px0 ?? p.x, q.py0, p.x, p.y))
					this.trigger(W, e, q, idx);
			});
			q.px0 = p.x;
			q.py0 = p.y;
		},
		flipHit(W, e, i) {
			const FT = this.flipTimes(W, e.k);
			if (W.t - FT[i] < 0.9) return;
			FT[i] = W.t + 0.05;
			e.f.fp = [e.f.fp[0] + 1, i, Math.round(FT[i] * 100) / 100];
		},
		/* a bumper kicks the ball away: +BUMPPTS, x2 per gate that ball went through */
		bumpHit(W, e, i, q) {
			e.bmT = e.bmT || {};
			if (W.t - (e.bmT[i] ?? -9) < 0.3) return;
			e.bmT[i] = W.t;
			const g = W.L.bumps[i],
				bb = q.b,
				p = bb.getPosition(),
				dx = p.x - g.x,
				dy = p.y - g.y,
				l = Math.hypot(dx, dy) || 1,
				m = 2 ** q.gx.length;
			bb.setLinearVelocity(window.planck.Vec2((dx / l) * this.BUMPV, (dy / l) * this.BUMPV + 1));
			e.sc += this.BUMPPTS * m;
			fb(W, e, "+" + this.BUMPPTS + (m > 1 ? " ×" + m : ""), {
				tone: "good",
				at: [this.wx(e, p.x), this.wy(p.y + 1.6), 0],
			});
			e.f.bp = [e.f.bp[0] + 1, i];
		},
		/* TNT: the same schedule on every board (from the drop), each board's barrels go off on their own (W.tntXB[key]) */
		tntNow(W, k) {
			const S = this.sched(W),
				X = (W.tntXB = W.tntXB || {})[k] || {};
			if (S.E !== null || S.D === null || W.t < S.D) return null;
			for (const q of W.L.tnt) {
				q.t = S.D + q.dt;
				if (W.t >= q.t && W.t < q.t + this.TNTL && X[q.n] === undefined) return q;
			}
			return null;
		},
		tntHit(W, e, i) {
			const q = this.tntNow(W, e.k);
			if (!q || q.i !== i) return;
			e.f.tx = [e.f.tx[0] + 1, q.n];
			fb(W, e, "BOOM!", { stamp: true });
			mgLog(W, mgName(e) + " sets off TNT " + q.n);
			this.boom(W, e, q);
		},
		/* a TNT on e's board goes off (here, or heard from another device): e's balls within TNTR are thrown away */
		boom(W, e, q) {
			const X = ((W.tntXB = W.tntXB || {})[e.k] = W.tntXB[e.k] || {});
			if (X[q.n] !== undefined) return;
			X[q.n] = W.t;
			const V = window.planck && window.planck.Vec2;
			if (V && e.local && e.st === 1)
				e.balls.forEach((bq) => {
					if (bq.done) return;
					const p = bq.b.getPosition(),
						dx = p.x - q.x,
						dy = p.y - q.y,
						d = Math.hypot(dx, dy);
					if (d > this.TNTR) return;
					const k = 1 - d / this.TNTR,
						l = d || 1,
						v = bq.b.getLinearVelocity();
					bq.b.setLinearVelocity(V(v.x * 0.3 + (dx / l) * this.TNTV * k, v.y * 0.3 + (dy / l) * this.TNTV * k + 3 * k));
					if (e.isMe) W.shake = 0.6;
				});
			burst(W.sc, this.wx(e, q.x), this.wy(q.y), 1.4, {
				n: 24,
				shape: "ico",
				cols: ["#FF8A1F", "#FFC83D", "#E5484D", "#3A3F48"],
				spd: 6,
				up: 4,
				life: 0.8,
				size: 1.2,
			});
			if (W.split || e.isMe) sfx("cannon");
		},
		sync(e) {
			e.vz = 0;
			e.f.an = Math.round(e.ang * 100) / 100;
			e.f.tt = Math.round(e.tt * 100) / 100;
			e.f.st = e.st;
		},
		/* a ball lands: the slot's value, x3 under the sign, x2 per gate it went through, x½ per fake it went through */
		score(W, e, q) {
			const p = q.b.getPosition(),
				k = Math.max(0, Math.min(this.COLS - 1, Math.floor((p.x + this.HW) / this.SW))),
				x3 = k === this.mslot(W.t),
				m = 2 ** q.gx.length * 0.5 ** q.hv,
				v = Math.round(this.VAL[k] * (x3 ? 3 : 1) * m);
			q.done = true;
			e.sc += v;
			e.f.ls = [e.f.ls[0] + 1, k, x3 ? 1 : 0];
			fb(W, e, `+${v}`, {
				tone: v >= 300 ? "good" : v <= 50 ? "bad" : "",
				at: [this.wx(e, p.x), this.wy(p.y + 1.6), 0],
			});
			if (x3) fb(W, e, "×3!", { stamp: true });
			mgLog(
				W,
				`${mgName(e)} round ${e.rr + 1}: slot ${k} ${this.VAL[k]}${x3 ? " x3" : ""}${m !== 1 ? " x" + m : ""} = ${v}, total ${e.sc}`,
			);
			if (e.isMe) sfx(x3 || v >= 500 ? "fanfare" : v <= 50 ? "loss" : "coin");
		},
		timeUp(W, e) {
			if (e.st !== 3) fb(W, e, `${e.sc}`, { stamp: true });
		},
		fmt: (W, e) => `${e.sc} pts`,
		/* ---- cameras ---- */
		btmCover: MG.plinko.btmCover,
		/* planning (phone mode): the shares of the screen the tray covers [at the bottom, at the right] (landscape: a column on
		   the right) */
		cover(W) {
			if (W.split || W.tv) return [0, 0];
			const el = document.querySelector("#mg .sbbot"),
				r = el && el.getBoundingClientRect();
			if (!r || !r.height || !GFX.h) return [0.3, 0];
			if (GFX.w > GFX.h) return [0, Math.max(0, Math.min(0.5, (GFX.w - r.left + 8) / GFX.w))];
			return [Math.max(0, Math.min(0.6, (GFX.h - r.top + 10) / GFX.h)), 0];
		},
		cam(W, tgt, pos, far) {
			const e = W.me,
				asp = GFX.w / GFX.h,
				tn = Math.tan((20 * Math.PI) / 180),
				S = this.sched(W),
				pv = S.plan && W.t >= 0 && W.ents[this.victimOf(W, e.k, S.r)],
				[b, rc] = pv ? this.cover(W) : [this.btmCover(W), 0],
				ox = (pv ? pv.ox : e.ox) || 0;
			/* your target's whole board while planning, your own while aiming (and on the ready screen), then it follows
			   your ball; the reveal after each round (and the end) zooms out to every board, square on above the buttons */
			W.camShift = null;
			if (S.E !== null && W.t >= 0 && (W.t < S.E || S.over)) {
				const y0 = this.wy(this.GY - 0.4),
					y1 = this.wy(this.HDR + 1),
					top = document.querySelector("#mg .m3top"),
					tc = top && GFX.h ? Math.max(0, Math.min(0.2, top.getBoundingClientRect().bottom / GFX.h)) : 0,
					n = W.plist.length,
					/* portrait is too narrow for every board side by side: one board wide, panning from the first to the last
					   (the end of the game: your own) */
					pan = asp < 1 && n > 1,
					u = Math.max(0, Math.min(1, (W.t - (S.E - this.BETWEEN) - 0.4) / (this.BETWEEN - 1.2))),
					D =
						Math.max((y1 - y0) / 2 / (1 - b - tc) / tn, (pan ? this.BW * 0.52 : (n * this.BW) / 2) / (tn * asp)) * 1.03,
					t = new THREE.Vector3(
						!pan ? 0 : S.over && W.t >= S.E ? e.ox : W.laneX(0) + u * u * (3 - 2 * u) * (W.laneX(n - 1) - W.laneX(0)),
						(y0 + y1) / 2,
						0,
					);
				W.camShift = [0, (b - tc) / 2];
				return [t, new THREE.Vector3(t.x, t.y, D)];
			}
			if (e.st !== 1 && e.st !== 2) {
				const y0 = this.wy(this.GY - 0.4),
					y1 = this.wy(this.HDR + 1),
					top = !W.split && !W.tv && document.querySelector("#mg .m3top"),
					tc = top && GFX.h ? Math.max(0, Math.min(0.2, top.getBoundingClientRect().bottom / GFX.h)) : 0,
					/* planning: the board's width, but at least 60% of its height in view */
					D = pv
						? Math.max(((this.K * (this.HW + 1)) / (tn * asp * (1 - rc))) * 1.04, ((y1 - y0) * 0.3) / (1 - b - tc) / tn)
						: Math.max((y1 - y0) / 2 / (1 - b - tc) / tn, (this.K * (this.HW + 1)) / (tn * asp * (1 - rc))) * 1.04,
					hb = D * tn * (1 - b - tc);
				let cy = (y0 + y1) / 2;
				/* planning: the target's board zoomed to the width; when it's taller than the view a swipe scrolls it */
				if (pv && (y1 - y0) / 2 > hb) {
					const lo = y0 + hb,
						hi = y1 - hb,
						dy = ((W.sbDrag || 0) * 2 * D * tn) / Math.max(1, GFX.h),
						y = Math.max(lo, Math.min(hi, (W.sbY ?? hi) + dy));
					if (GFX.mgCam && W.sbY != null) {
						GFX.mgCam.t.y += y - W.sbY;
						GFX.mgCam.p.y += y - W.sbY;
					}
					W.sbY = cy = y;
				}
				W.sbDrag = 0;
				/* planning: square on to the target's board, the picture shifted beside the tray / above it (no angle) */
				if (pv) {
					W.camShift = [rc / 2, (b - tc) / 2];
					const t = new THREE.Vector3(ox, cy, 0);
					return [t, new THREE.Vector3(ox, cy, D)];
				}
				const t = new THREE.Vector3(ox + D * tn * asp * rc, cy - D * tn * (b - tc), 0);
				return [t, t.clone().add(new THREE.Vector3(0, D * 0.08, D))];
			}
			/* following the ball: framed like Plinko's (in its units) */
			const D = (asp < 1 ? 26 : 24) * this.K,
				hw = D * tn * asp,
				hh = D * tn,
				sh = hh * b,
				mx = this.K * (this.HW + 1) - hw,
				lo = this.wy(this.GY - 0.5) + hh * (1 - b) - sh,
				hi = this.wy(this.HDR + 0.6) - hh,
				[fx, fy] = e.cf || [e.x, e.y],
				x = ox + (mx <= 0 ? 0 : Math.max(-mx, Math.min(mx, fx - ox))),
				y = lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, fy - sh)),
				t = new THREE.Vector3(x, y, 0);
			return [t, t.clone().add(new THREE.Vector3(0, D * 0.1, D))];
		},
		/* the TV: every board */
		tvsCam(W, a) {
			const el = document.querySelector("#mg .tvscards"),
				r = el && el.getBoundingClientRect(),
				b = r && r.height ? Math.max(0, Math.min(0.35, (innerHeight - r.top) / innerHeight + 0.01)) : 0,
				tn = Math.tan((20 * Math.PI) / 180),
				y0 = this.wy(this.GY - 0.4),
				y1 = this.wy(this.HDR + 1),
				half = (W.plist.length * this.BW) / 2,
				/* the ready screen: the boards sit right of the intro card (its left 30%) */
				c = !W.startAt || W.t < 0 ? 0.3 : 0,
				D = Math.max((y1 - y0) / 2 / (1 - b) / tn, half / (1 - c) / (tn * a)) * 1.03,
				t = new THREE.Vector3(-D * tn * a * c, (y0 + y1) / 2 - D * tn * b, 0);
			return [t, t.clone().add(new THREE.Vector3(0, D * 0.06, D))];
		},
		/* ---- drawing ---- */
		render(W, e, dt) {
			this.scene(W, dt);
			const f = e.f || {};
			if (!e.local) {
				const k = 1 - Math.exp(-dt * 14);
				e.ang = lerpA(e.ang || 0, f.an || 0, k);
				e.tt = (e.tt || 0) + ((f.tt || 0) - (e.tt || 0)) * k;
				const n = e.net;
				if (n && Math.hypot(n.x - e.x, (n.y || 0) - e.y, n.z - e.z) > 6) {
					e.x = n.x;
					e.y = n.y || 0;
					e.z = n.z;
				}
			}
			e.pitch = e.tt * e.fc;
			e.tr.rotation.z = e.pitch;
			const K = this.K;
			e.g.position.set(e.x + this.WB * K * Math.sin(e.tt), e.y - this.WB * K * Math.cos(e.tt), e.z);
			const bl = this.ball(W, e),
				ha = e.hopT === undefined ? 9 : W.t - e.hopT,
				q = ha >= 0 && ha < 0.35 ? 0.13 * Math.sin((ha / 0.35) * Math.PI) : 0;
			bl.g.visible = !e.gone;
			bl.g.position.set(e.x, e.y, e.z);
			bl.g.scale.set((1 + q) * K, (1 - q) * K, (1 + q) * K);
			bl.spin.rotation.z = e.ang;
			const col = pcol(e.p),
				st = e.local ? e.st : f.st || 0;
			if ((f.hp || 0) !== (e.hpSeen || 0)) {
				e.hpSeen = f.hp || 0;
				e.hopT = W.t;
				if (W.split || e.isMe) sfx("step");
			}
			{
				const sa = e.hopT === undefined ? 9 : W.t - e.hopT;
				springSet(e.tr, sa < 0 ? 0 : sa < 0.07 ? (sa / 0.07) * 0.3 : Math.max(0, 0.3 * (1 - (sa - 0.07) / 0.3)));
			}
			if (f.ls && f.ls[0] !== (e.lsSeen || 0)) {
				e.lsSeen = f.ls[0];
				const sl = W.slotF[e.i] && W.slotF[e.i][f.ls[1]];
				if (sl) {
					sl.fl = W.t;
					sl.fc.set(col);
				}
				burst(W.sc, this.wx(e, this.slotX(f.ls[1])), this.wy(1.5), 0.5, {
					n: f.ls[2] ? 22 : 12,
					shape: "coin",
					cols: ["#FFC83D", "#FFE27A"],
					spd: 3,
					up: 7,
					life: 0.9,
				});
			}
			this.parts(W, e, f, col);
			const mg = W.mag[e.k];
			if (mg) {
				const hang = st === 0 && !e.gone,
					u = mg.userData,
					my = hang ? this.ly(e.y) + this.R - 0.02 : this.RAIL - 1.3;
				mg.position.x = hang ? (e.x - e.ox) / K : mg.position.x * (1 - Math.min(1, dt * 3));
				u.my = u.my === undefined ? my : u.my + (my - u.my) * Math.min(1, dt * (hang ? 20 : 3));
				u.mg.position.y = u.my;
				u.mg.rotation.z = hang ? e.tt * 0.3 : 0;
				const top = this.RAIL - 0.43,
					len = Math.max(0.05, top - u.my - 0.3);
				u.cab.scale.y = len;
				u.cab.position.y = u.my + 0.3 + len / 2;
				mg.visible = !e.gone;
			}
			if (e === W.me) this.ui(W, e);
		},
		/* a truck's board parts as its e.f reports them (here or from its device): gates and the split gate flash, flippers
		   fire, bumpers kick, TNT goes off; and the copy from a split gate, a second truck in a second ball */
		parts(W, e, f, col) {
			const bx = W.bx && W.bx[e.i],
				L = W.L,
				pop = (q, cols, n) =>
					burst(W.sc, this.wx(e, q.x), this.wy(q.y), 1.4, { n, shape: "ico", cols, spd: 3, up: 2, life: 0.5 });
			if (f.gt && f.gt[0] !== (e.gtSeen || 0)) {
				e.gtSeen = f.gt[0];
				const g = bx && bx.gateM[f.gt[1]],
					q = L.gates[f.gt[1]];
				if (g) g.fl = W.t;
				if (q) pop(q, ["#3DDC84", "#7CF2B0", "#FFFFFF"], 8);
			}
			if (f.sg && f.sg[0] !== (e.sgSeen || 0)) {
				e.sgSeen = f.sg[0];
				const g = bx && bx.splitM[f.sg[1]],
					q = L.splits[f.sg[1]];
				if (g) g.fl = W.t;
				if (q) pop(q, ["#FF8CC8", "#FFB3D9", "#FFFFFF"], 12);
			}
			if (f.fp && f.fp[0] !== (e.fpSeen || 0)) {
				e.fpSeen = f.fp[0];
				const FT = this.flipTimes(W, e.k),
					i = f.fp[1];
				if (FT[i] !== undefined) FT[i] = Math.max(FT[i], f.fp[2]);
				if (W.split || e.isMe) sfx("click");
			}
			if (f.bp && f.bp[0] !== (e.bpSeen || 0)) {
				e.bpSeen = f.bp[0];
				const b = bx && bx.bumpG[f.bp[1]],
					q = L.bumps[f.bp[1]];
				if (b) b.t = W.t;
				if (q)
					burst(W.sc, this.wx(e, q.x), this.wy(q.y), 1.4, {
						n: 10,
						shape: "cube",
						cols: ["#FFE27A", "#FFFFFF", col],
						spd: 4,
						up: 2,
						life: 0.4,
						size: 0.7,
					});
				if (W.split || e.isMe) sfx("ram");
			}
			if (f.tx && f.tx[0] !== (e.txSeen || 0)) {
				e.txSeen = f.tx[0];
				const q = L.tnt.find((t) => t.n === f.tx[1]);
				if (q) this.boom(W, e, q);
			}
			if (f.tf && f.tf[0] !== (e.tfSeen || 0)) {
				e.tfSeen = f.tf[0];
				const TF = this.trapFT(W, e.k);
				TF[f.tf[1]] = Math.max(TF[f.tf[1]] ?? -99, f.tf[2]);
				if (W.split || e.isMe) sfx("click");
			}
			const c2 = f.c2;
			if (c2 && !e.tr2) {
				e.g2 = new THREE.Group();
				e.tr2 = buildTruck(e.p.truck, "springs");
				e.tr2.scale.setScalar(0.8);
				e.tr2.rotation.order = "YXZ";
				e.g2.add(e.tr2);
				e.g2.scale.setScalar(this.TS * this.K);
				W.sc.add(e.g2);
			}
			const b2 = c2 ? this.ball(W, e, "ball2") : e.ball2;
			if (e.g2) e.g2.visible = !!c2 && !e.gone;
			if (b2) b2.g.visible = !!c2 && !e.gone;
			if (c2 && !e.gone) {
				const [x, y, an, tt] = c2;
				e.tr2.rotation.set(0, e.yaw, tt * e.fc);
				e.g2.position.set(x + this.WB * this.K * Math.sin(tt), y - this.WB * this.K * Math.cos(tt), 0);
				b2.g.position.set(x, y, 0);
				b2.g.scale.setScalar(this.K);
				b2.spin.rotation.z = an;
			}
		},
		/* the controls' root for this world (the TV keeps one copy per phone) */
		root(W) {
			if (typeof TVS !== "undefined" && TVS) {
				const s = TVS.worlds.find((q) => q.W === W);
				return s && s.ctl && s.ctl.querySelector(".sbctl");
			}
			return document.querySelector("#mg .sbctl");
		},
		/* the plan panel: your target's name, coins left, seconds left, the traps you placed; DONE once pressed */
		ui(W, e) {
			const root = this.root(W);
			if (!root) return;
			const S = this.sched(W),
				ph = S.plan && !S.over ? "plan" : "play";
			if (root.getAttribute("data-ph") !== ph) root.setAttribute("data-ph", ph);
			if (ph !== "plan") return;
			const vk = this.victimOf(W, e.k, S.r),
				v = W.ents[vk],
				left = this.BUDGET - this.spent(e),
				secs = Math.max(0, Math.ceil(S.P + this.PLANT - W.t)),
				done = e.pd[S.r] !== undefined,
				no = W.sbNo !== undefined && W.t - W.sbNo < 0.6,
				used = e.trp.length > 0 || !!root.dataset.used,
				sig = JSON.stringify([vk, left, secs, e.sel, done, no, used]);
			if (root.sbSig === sig) return;
			root.sbSig = sig;
			const set = (sel, txt, cls) => {
				const n = root.querySelector(sel);
				if (!n) return;
				if (n.textContent !== txt) n.textContent = txt;
				if (cls !== undefined && n.getAttribute("class") !== cls) n.setAttribute("class", cls);
			};
			if (used && !root.dataset.used) root.setAttribute("data-used", "1");
			root.setAttribute("data-vk", vk);
			root.setAttribute("data-r", String(S.r));
			root.setAttribute("data-trp", e.trp.map((q) => q.join(".")).join(" "));
			set(".sbtgt", `Sabotage ${v ? v.p.name : ""}!`);
			set(".sbcoin", String(left), no ? "sbcoin no" : "sbcoin");
			set(".sbtime", `${secs} s`, secs <= 10 ? "sbtime low" : "sbtime");
			set(".sbdone", done ? "READY ✓" : "READY", done ? "sbdone on" : "sbdone");
			root.querySelectorAll(".sbt").forEach((b, i) => {
				const c = (i === e.sel ? "on" : "") + (this.TRAPS[i].c > left ? " off" : "");
				if ((b.getAttribute("class") || "") !== ("sbt " + c).trim()) b.setAttribute("class", ("sbt " + c).trim());
			});
		},
		/* a trap's icon: a round badge in its colour */
		iconTex(W, t) {
			const T = this.TRAPS[t];
			W.trapTex = W.trapTex || {};
			return (
				W.trapTex[t] ||
				(W.trapTex[t] = canvasTex(128, 128, (x, w, h) => {
					x.fillStyle = "#151B24";
					x.beginPath();
					x.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
					x.fill();
					x.fillStyle = T.col;
					x.beginPath();
					x.arc(w / 2, h / 2, w / 2 - 14, 0, Math.PI * 2);
					x.fill();
					x.font = "900 64px Arial, sans-serif";
					x.textAlign = "center";
					x.textBaseline = "middle";
					x.fillStyle = "#FFFFFF";
					x.fillText(T.ic, w / 2, h / 2 + 4);
				}))
			);
		},
		/* while planning: faint dashed frames in the gaps of a board being sabotaged, and its saboteur's cursor (a frame
		   in their colour with the selected trap's icon; on the TV always, with their name, until they're READY; on a
		   phone only your own, while your finger is down) */
		planMarks(W, bi, k, S, see, dt) {
			W.pm = W.pm || {};
			let m = W.pm[k];
			if (!see && !m) return;
			if (!m) {
				const frame = (dash, lw) =>
						canvasTex(256, 128, (x, w, h) => {
							if (!dash) {
								x.strokeStyle = "#151B24";
								x.lineWidth = lw + 12;
								rr(x, 14, 14, w - 28, h - 28, 30);
								x.stroke();
							}
							x.strokeStyle = "#FFFFFF";
							x.lineWidth = lw;
							if (dash) x.setLineDash([22, 14]);
							rr(x, 14, 14, w - 28, h - 28, 30);
							x.stroke();
						}),
					ct = (W.curTex = W.curTex || frame(false, 14));
				W.gapTex = W.gapTex || frame(true, 8);
				const cur = new THREE.Group(),
					fr = new THREE.Mesh(
						new THREE.PlaneGeometry(this.SW - 0.3, 1.9),
						new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, depthTest: false }),
					),
					ic = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, opacity: 0.85 }));
				fr.renderOrder = 7;
				ic.renderOrder = 8;
				ic.scale.setScalar(2);
				ic.position.z = 0.4;
				cur.add(fr, ic);
				W.bg[bi].add(cur);
				m = W.pm[k] = { gm: null, r: -1, cur, fr, ic, t: -1, p: null, pill: null };
			}
			const sk = this.sabOf(W, k, S.r),
				sb = W.ents[sk],
				d = sb && (sb.local ? [sb.cu, sb.sel, sb.cuH] : sb.f && sb.f.cu),
				fk = W.lr + ":" + ((d && this.TRAPS[d[1]] && this.TRAPS[d[1]].on) || "s");
			/* the dashed markers of the spots the saboteur's selected trap fits, this round */
			if (see && m.r !== fk) {
				if (m.gm) {
					m.gm.parent.remove(m.gm);
					m.gm.geometry.dispose();
				}
				m.gm = this.spotFrames(W, (d && d[1]) || 0);
				W.bg[bi].add(m.gm);
				m.r = fk;
			}
			if (m.gm) m.gm.visible = !!see;
			const pd = sb && (sb.local ? sb.pd : sb.f && sb.f.pd),
				tvw = !!(W.split || W.tv),
				on =
					!!see &&
					!!d &&
					d[0] >= 0 &&
					d[0] < this.gaps(W).length &&
					(tvw ? !(pd && pd[S.r] !== undefined) : sk === (W.me && W.me.k) && !!d[2]);
			m.cur.visible = on;
			if (m.pill) m.pill.sp.visible = on && tvw;
			if (!on) {
				m.p = null;
				return;
			}
			const g = this.gaps(W)[d[0]],
				tx = g.x;
			if (!m.p) m.p = new THREE.Vector3(tx, g.y, 1.3);
			const kk = 1 - Math.exp(-dt * 16);
			m.p.x += (tx - m.p.x) * kk;
			m.p.y += (g.y - m.p.y) * kk;
			m.cur.position.copy(m.p);
			m.fr.material.color.set(pcol(sb.p));
			if (m.t !== d[1]) {
				m.t = d[1];
				m.ic.material.map = this.iconTex(W, d[1] || 0);
				m.ic.material.needsUpdate = true;
			}
			this.fitCursor(m.fr, g, 1 + 0.05 * Math.sin(W.t * 8));
			if (tvw) {
				if (!m.pill) {
					m.pill = pillSprite();
					W.bg[bi].add(m.pill.sp);
				}
				m.pill.set(sb.p.name.slice(0, 10), pcol(sb.p));
				m.pill.sp.position.set(m.p.x, m.p.y + 2.4, 1.6);
				m.pill.sp.scale.set(6.6, 2.2, 1);
			}
		},
		/* trap models, hidden until set off (or the reveal after the round) */
		trapMesh(W, t, g, d) {
			const T = this.TRAPS[t],
				m = new THREE.Group(),
				body = new THREE.Group(),
				L = g.cl || 3.6;
			if (T.k === "wall") {
				body.add(B(L - 0.1, 0.32, 2.4, "#5E636D", 0, 0, -0.3));
				[-1, 1].forEach((sd) => body.add(B(0.4, 0.36, 2.42, "#FFC83D", (sd * (L - 0.6)) / 2, 0, -0.3)));
			} else if (T.k === "fake") {
				/* a fake x2 gate: Plinko's gate (light strip, glow, the x2 on the board), red with x½ once it's found out */
				const st = new THREE.MeshBasicMaterial({
						color: "#8CFFC0",
						transparent: true,
						opacity: 0.55,
						depthWrite: false,
					}),
					bar = new THREE.Mesh(new THREE.BoxGeometry(g.w - 0.75, 0.21, 2.4), st),
					hm = new THREE.MeshBasicMaterial({
						map: W.haloTex || null,
						transparent: true,
						opacity: 0.8,
						blending: THREE.AdditiveBlending,
						depthWrite: false,
					}),
					lb = new THREE.Mesh(
						new THREE.PlaneGeometry(2, 1),
						new THREE.MeshBasicMaterial({ map: W.x2Tex || null, transparent: true }),
					);
				bar.position.z = -0.3;
				bar.renderOrder = 1;
				[1.35, -1.6].forEach((z, j) => {
					const h = new THREE.Mesh(new THREE.PlaneGeometry(g.w + (j ? 1.6 : 0.8), j ? 1.54 : 0.91), hm);
					h.position.z = z;
					h.renderOrder = 4;
					body.add(h);
				});
				lb.position.set(0, -0.95, -1.64);
				body.add(bar, lb);
				m.userData.fake = { st, hm, lb, rv: false };
			} else if (T.k === "flip") {
				/* a blue flipper in the peg's place (Plinko's flipper model) */
				const pg = new THREE.Group(),
					F = this.FL,
					tip = Cy(0.16, 0.16, 2.6, 8, "#2F7DE1", F, 0, -0.3),
					hub = Cy(0.4, 0.4, 0.3, 12, "#FFC83D", 0, 0, 1.15),
					ax = Cy(0.3, 0.3, 2.9, 10, "#C9CED8", 0, 0, -0.25);
				[tip, hub, ax].forEach((q) => (q.rotation.x = Math.PI / 2));
				pg.add(
					B(F, 0.32, 2.6, "#2F7DE1", F / 2, 0, -0.3),
					B(F * 0.75, 0.04, 2.2, "#F4F6F9", F / 2, 0.18, -0.3),
					tip,
					hub,
					ax,
				);
				const f = this.trapFlip(g, d);
				pg.rotation.z = this.flipA(f, 99);
				body.add(pg);
				m.userData.flip = { g: pg, f };
			} else if (T.k === "bomb") {
				/* a mine stuck on the peg */
				const bm = new THREE.Group(),
					l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: "#FF3B30" }));
				bm.add(mesh(new THREE.IcosahedronGeometry(0.7, 1), "#23272F"));
				[0, 1, 2, 3, 4, 5].forEach((i) => {
					const a = (i / 6) * Math.PI * 2,
						sp = Cy(0.09, 0.09, 0.45, 5, "#3A3F48", Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0);
					sp.rotation.z = a - Math.PI / 2;
					bm.add(sp);
				});
				l.position.set(0, 0, 0.72);
				bm.add(l);
				bm.position.z = 0.6;
				body.add(bm);
				m.userData.bomb = bm;
			} else {
				const st = new THREE.Mesh(
					new THREE.BoxGeometry(L - 0.05, 0.21, 2.4),
					new THREE.MeshBasicMaterial({ color: T.col, transparent: true, opacity: 0.7, depthWrite: false }),
				);
				st.position.z = -0.3;
				body.add(st);
			}
			if (g.k === "s") body.rotation.z = g.ang;
			m.add(body);
			/* its icon in a pill over it */
			const ic = new THREE.Sprite(
				new THREE.SpriteMaterial({ map: this.iconTex(W, t), depthTest: false, transparent: true }),
			);
			ic.scale.setScalar(1.8);
			ic.position.set(0, 1.25, 1.4);
			ic.renderOrder = 6;
			m.add(ic);
			m.userData.ic = ic;
			m.position.set(g.x, g.y, 0);
			m.visible = false;
			return m;
		},
		/* the dashed markers of every spot trap t fits (lines between pegs, rings round pegs), as one instanced mesh */
		spotFrames(W, t) {
			const G0 = this.gaps(W).filter((g) => this.fits(t, g)),
				peg = this.TRAPS[t].on === "p",
				tex = peg
					? W.ringTex ||
						(W.ringTex = canvasTex(128, 128, (x, w, h) => {
							x.strokeStyle = "#FFFFFF";
							x.lineWidth = 12;
							x.setLineDash([16, 12]);
							x.beginPath();
							x.arc(w / 2, h / 2, w / 2 - 10, 0, Math.PI * 2);
							x.stroke();
						}))
					: W.lineTex ||
						(W.lineTex = canvasTex(256, 32, (x, w, h) => {
							x.strokeStyle = "#FFFFFF";
							x.lineWidth = 12;
							x.lineCap = "round";
							x.setLineDash([22, 16]);
							x.beginPath();
							x.moveTo(10, h / 2);
							x.lineTo(w - 10, h / 2);
							x.stroke();
						})),
				gm = new THREE.InstancedMesh(
					new THREE.PlaneGeometry(1, 1),
					new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.22, depthWrite: false }),
					Math.max(1, G0.length),
				),
				o = new THREE.Object3D();
			G0.forEach((g, i) => {
				o.position.set(g.x, g.y, 1.1);
				o.rotation.set(0, 0, g.k === "s" ? g.ang : 0);
				if (g.k === "s") o.scale.set(g.cl - 0.5, 0.42, 1);
				else o.scale.set(1.9, 1.9, 1);
				o.updateMatrix();
				gm.setMatrixAt(i, o.matrix);
			});
			gm.count = G0.length;
			gm.renderOrder = 5;
			return gm;
		},
		/* a cursor frame (a plane SW - 0.3 by 1.9) fitted round spot g, pulsing by k */
		fitCursor(fr, g, k) {
			const sx = g.k === "s" ? (g.cl + 0.7) / (this.SW - 0.3) : 2.6 / (this.SW - 0.3),
				sy = g.k === "s" ? 1 : 2.6 / 1.9;
			fr.rotation.z = g.k === "s" ? g.ang : 0;
			fr.scale.set(sx * k, sy * k, 1);
		},
		/* a mine on board bi went off (once per round and board): its pegs vanish from the picture, a blast */
		mineBlast(W, bi, idx, g) {
			const bx = W.bx && W.bx[bi];
			if (!bx || !g) return;
			bx.boomed = bx.boomed || {};
			if (bx.boomed[idx]) return;
			bx.boomed[idx] = 1;
			const z = new THREE.Matrix4().makeScale(0, 0, 0);
			this.minePegs(W, g).forEach((i) =>
				bx.pegI.forEach((im) => {
					im.setMatrixAt(i, z);
					im.instanceMatrix.needsUpdate = true;
				}),
			);
			const x = W.laneX(bi) + this.K * g.x,
				y = this.wy(g.y);
			burst(W.sc, x, y, 1.4, {
				n: 34,
				shape: "ico",
				cols: ["#FF8A1F", "#FFC83D", "#E5484D", "#3A3F48"],
				spd: 7,
				up: 4,
				life: 0.9,
				size: 1.3,
			});
			burst(W.sc, x, y, 1.4, {
				n: 14,
				shape: "cube",
				cols: ["#C9CED8", "#FFC83D"],
				spd: 5,
				up: 3,
				life: 0.8,
				size: 0.7,
			});
			if (W.split || W.me) sfx("cannon");
		},
		/* a fake x2: disguised, or found out (red, x½) */
		fakeLook(W, f, rv) {
			if (f.rv === rv) return;
			f.rv = rv;
			f.st.color.set(rv ? "#FF5A5F" : "#8CFFC0");
			f.hm.color.set(rv ? "#FF6060" : "#FFFFFF");
			f.lb.material.map = rv
				? W.halfTex ||
					(W.halfTex = canvasTex(128, 64, (x, w, h) => {
						x.font = "48px Bungee, 'Arial Black', Impact, sans-serif";
						x.textAlign = "center";
						x.textBaseline = "middle";
						x.lineWidth = 8;
						x.strokeStyle = "#5A0E12";
						x.strokeText("×½", w / 2, h / 2 + 3);
						x.fillStyle = "#FF9C9C";
						x.fillText("×½", w / 2, h / 2 + 3);
					}))
				: W.x2Tex;
			f.lb.material.needsUpdate = true;
		},
		/* once a frame: the bulbs, the x3 signs, slot flashes, the traps on every board, the planning pills, the countdowns */
		scene(W, dt) {
			if (W.scF === W.t) return;
			W.scF = W.t;
			const S = this.sched(W),
				t = Math.max(0, W.t);
			{
				const ph = Math.floor(t * 8);
				if (ph !== W.bph) {
					W.bph = ph;
					const on = new THREE.Color("#FFE9A8"),
						off = new THREE.Color("#6B5A3A");
					W.bulbs.forEach((bl) => {
						for (let i = 0; i < bl.count; i++) bl.setColorAt(i, (i + ph) % 4 < 2 ? on : off);
						bl.instanceColor.needsUpdate = true;
					});
				}
			}
			const mp = this.mpos(W.t),
				ms = Math.round(mp);
			W.signs.forEach((q) => (q.g.position.x = q.ox + this.slotX(0) + mp * this.SW));
			W.slotF.forEach((sf) =>
				sf.forEach((s, k) => {
					const fl = s.fl ? Math.max(0, 1 - (W.t - s.fl) / 0.9) : 0,
						gl = k === ms && W.t >= 0 && !S.plan ? 0.35 + 0.15 * Math.sin(W.t * 10) : 0;
					s.m.color.copy(s.c).lerp(s.fc, fl);
					s.m.emissive.copy(fl ? s.fc : s.c).multiplyScalar(Math.max(gl, fl * 0.8));
				}),
			);
			/* traps: built from each saboteur's list for this round, shown once set off or in the reveal; while planning, the
			   TV shows every board's traps and its saboteur's cursor, a phone only the board it's sabotaging */
			const reveal = S.E !== null && W.t >= 0,
				tvw = !!(W.split || W.tv),
				myV = W.me && W.t >= 0 ? this.victimOf(W, W.me.k, S.r) : null;
			W.plist.forEach((pl, bi) => {
				const k = pl.key,
					see = S.plan && W.t >= 0 && (tvw || k === myV),
					L = S.plan && !see ? [] : this.trapsOn(W, k, S.r),
					key = S.r + ":" + JSON.stringify(L),
					tv = W.trapV[k] || (W.trapV[k] = { key: "", g: null, items: [] });
				if (tv.key !== key) {
					if (tv.g && tv.g.parent) tv.g.parent.remove(tv.g);
					tv.key = key;
					tv.g = new THREE.Group();
					tv.items = L.map(([ty, gi, d]) => {
						const m = this.trapMesh(W, ty, this.gaps(W)[gi], d);
						tv.g.add(m);
						return { m, shown: 0 };
					});
					W.bg[bi].add(tv.g);
				}
				const hits = this.hitsOn(W, k, S.r),
					wv = Math.sin(Math.max(0, W.t) * 4),
					TF = this.trapFT(W, k);
				/* when each trap first showed in full (by "trap.gap", kept across rebuilds so only the new one pops) */
				if (tv.r !== S.r) {
					tv.r = S.r;
					tv.seen = {};
				}
				tv.items.forEach((it, idx) => {
					const T = this.TRAPS[L[idx][0]],
						id = L[idx].join("."),
						hit = hits.includes(idx),
						full = reveal || see || hit,
						u = it.m.userData,
						on = full || (T.k === "fake" && W.t >= 0 && !S.plan);
					if (full && tv.seen[id] === undefined) {
						tv.seen[id] = W.t;
						burst(W.sc, W.laneX(bi) + this.K * it.m.position.x, this.wy(it.m.position.y), 1.4, {
							n: 10,
							shape: "ico",
							cols: ["#FFFFFF", T.col],
							spd: 3,
							up: 2,
							life: 0.5,
						});
					}
					if (!full && !see) delete tv.seen[id];
					it.m.visible = !!on;
					if (u.ic) u.ic.visible = !!full;
					if (u.flip) u.flip.g.rotation.z = this.flipA(u.flip.f, W.t - (TF[idx] ?? -99));
					if (u.bomb) {
						u.bomb.visible = !hit;
						if (hit) this.mineBlast(W, bi, idx, this.gaps(W)[L[idx][1]]);
					}
					if (u.fake) {
						this.fakeLook(W, u.fake, hit || reveal);
						u.fake.st.opacity = 0.5 + 0.12 * wv;
						u.fake.hm.opacity = 0.5 + 0.15 * wv;
					}
					it.m.scale.setScalar(full ? Math.min(1, 0.3 + (W.t - tv.seen[id]) * 4) : 1);
				});
				/* planning: a pill over each board, PLANNING or READY */
				let pp = W.bpill[k];
				if (S.plan && !pp) {
					pp = W.bpill[k] = pillSprite();
					W.bg[bi].add(pp.sp);
				}
				if (pp) {
					pp.sp.visible = !!S.plan;
					if (S.plan) {
						const e = W.ents[k],
							a = e && (e.local ? e.pd : e.f && e.f.pd),
							ready = a && a[S.r] !== undefined;
						pp.set(ready ? "READY ✓" : "PLANNING…", pcol(pl));
						pp.sp.position.set(0, 1.4, 2.2);
						pp.sp.scale.set(10, 3.3, 1);
					}
				}
				this.planMarks(W, bi, k, S, see, dt);
			});
			/* every board's flippers, bumpers, gates and TNT */
			(W.bx || []).forEach((bx, bi) => {
				const FT = this.flipTimes(W, bx.k),
					wv = Math.sin(Math.max(0, W.t) * 4);
				W.L.flips.forEach((f, i) => (bx.flipG[i].rotation.z = this.flipA(f, W.t - FT[i])));
				bx.bumpG.forEach((b) => {
					const k = W.t >= b.t ? Math.max(0, 1 - (W.t - b.t) / 0.35) : 0;
					b.g.scale.setScalar(1 + 0.18 * k);
					b.rm.color.set(k > 0.3 ? "#FFFFFF" : "#FFE27A");
				});
				bx.gateM.concat(bx.splitM).forEach((g) => {
					const k = W.t >= g.fl ? Math.max(0, 1 - (W.t - g.fl) / 0.6) : 0;
					g.m.opacity = 0.5 + 0.12 * wv + k * 0.4;
					g.hm.opacity = 0.5 + 0.15 * wv + k * 0.35;
					g.m.color.set(k > 0.5 ? "#FFFFFF" : g.col || "#8CFFC0");
				});
				const q = this.tntNow(W, bx.k),
					g = bx.tntG;
				g.visible = !!q;
				if (q) {
					const a = Math.min(1, (W.t - q.t) / 0.25),
						left = q.t + this.TNTL - W.t;
					g.position.set(q.x, q.y, 0);
					g.scale.setScalar(a * (1 + Math.sin(W.t * (left < 2 ? 22 : 9)) * 0.06));
					if (Math.random() < dt * 12)
						burst(W.sc, W.laneX(bi) + this.K * (q.x + 0.32), this.wy(q.y + 0.82), 1, {
							n: 1,
							shape: "ico",
							cols: ["#FFE27A", "#FF8A1F"],
							spd: 1,
							up: 1.2,
							life: 0.35,
							size: 0.4,
						});
				}
			});
			/* the big word: SABOTAGE! / ROUND n at the start of planning, its last seconds, then 3 2 1 DROP!, REVEAL! */
			if (W.t >= 0) {
				const pl = S.P + this.PLANT - W.t;
				W.big = S.over
					? ""
					: S.plan
						? W.t - S.P < 1.5
							? S.r
								? `ROUND ${S.r + 1}`
								: "SABOTAGE!"
							: pl <= 5 && pl > 0
								? String(Math.ceil(pl))
								: ""
						: S.D !== null && W.t < S.D
							? S.D - W.t <= 3
								? String(Math.ceil(S.D - W.t))
								: ""
							: S.D !== null && W.t - S.D < 0.7
								? "DROP!"
								: reveal && W.t - S.E + this.BETWEEN < 1.2
									? "REVEAL!"
									: "";
				W.bigT = W.t + 0.2;
			}
		},
		/* CPUs: aim for the middle-ish, then steer towards the best slot (counting the x3) and hop when stuck */
		bot(W, e, dt) {
			e.sk = e.sk ?? 0.3 + Math.random() * 0.7;
			const S = this.sched(W);
			if (S.plan) return null;
			if (e.st === 0) {
				if (e.aimR !== S.r) {
					e.aimR = S.r;
					e.aimX = (Math.random() - 0.5) * (Math.random() < 0.5 ? 2 : 10);
				}
				const dx = e.aimX - e.ax;
				e.tl = Math.abs(dx) > 0.3 ? (dx < 0 ? 1 : -1) : 0;
				return null;
			}
			if (e.st !== 1 || !e.b) {
				e.tl = 0;
				return null;
			}
			e.bt = (e.bt || 0) - dt;
			if (e.bt > 0) return null;
			e.bt = 0.12 + 0.35 * (1 - e.sk) + Math.random() * 0.1;
			const p = e.b.getPosition(),
				m = this.mslot(W.t + Math.sqrt((2 * Math.max(0, p.y - this.SH)) / this.GRAV) * 1.7);
			let best = -1e9,
				tx = p.x;
			for (let k = 0; k < this.COLS; k++) {
				const x = this.slotX(k),
					v = this.VAL[k] * (k === m ? 3 : 1) - Math.abs(x - p.x) * (60 + 400 / Math.max(1, p.y));
				if (v > best) {
					best = v;
					tx = x;
				}
			}
			const dx = tx - p.x;
			e.tl = dx > 0.5 ? -1 : dx < -0.5 ? 1 : 0;
			if (
				p.y > this.SH + 0.6 &&
				W.t - e.lastTouch < 0.2 &&
				((e.balls[0] && e.balls[0].stk) > 0.4 || Math.random() < 0.08 * e.sk)
			)
				e.hopQ = W.t;
			return null;
		},
		watchSum: (W) =>
			W.list
				.filter((e) => !e.gone)
				.map((e) => `${mgName(e)} ${e.sc}`)
				.join(", "),
		botScore: () => 300 + rnd(8) * 100,
	},
});

/* ---------- team minigames ---------- */
/* Monster Mash (1 vs 3 boss fight) on Mud Brawl's arena (MG.bumper: build, bowl, mud fall).
   The monster (side 0, a giant truck) sits on a turntable in the middle: tap FIRE to shoot tyres (aimed with the stick),
   hold it for a Ground Pound (a shockwave ring; DASH through it). Anyone who stays close too long gets lifted by a
   magnet and flung into the mud (tap DASH to break free; a TNT hit on the boss drops them too). The others grab TNT
   crates and drive them into the monster: it has 3 HP per survivor, gets angrier each third, and in the last third the
   turntable drops and it drives. The team wins by knocking it out or surviving the timer.
   Sync: the monster's device shares its shots in e.f.ty = [[id, t0, x, z, angle, h]] and pounds in e.f.gp = [id, t0, x, z];
   every device moves the tyres and rings from those times and decides hits on its own trucks. Survivors share
   e.f.dy (crate carried), e.f.dh (TNT hits; the boss HP is the sum), e.f.nr (magnet timer), e.f.gr (grabbed).
   Crates come from the seed (pickups through W.claim). */
const MM = {
	R: 19.5 /* the stage, 30% bigger than it was: its outer band (past RC) crumbles away during the fight */,
	RC: 14.4 /* the solid core; the band from RC to R is SECS slices that sink one batch at a time */,
	SECS: 16,
	WARN: 3 /* a slice cracks and glows this long before it sinks */,
	LIVES: 3 /* falls into the mud before a survivor is out */,
	TV: 12 /* tyre speed */,
	TYR: 1.65 /* a tyre (sliding flat, spinning) hits a truck within TYR of its middle */,
	TYN: 3 /* TYN tyre hits within TYWIN s stun a survivor for TYSTUN s */,
	TYWIN: 4,
	TYSTUN: 2,
	CLAW: 1.1 /* seconds close before the magnet grabs */,
	WIND: 0.6 /* ground pound: wind-up after the button */,
	JUMP: 0.7 /* then the jump before the slam */,
	STUN: 1 /* shockwave stun */,
	RING: 10 /* shockwave speed */,
	CUT: 1.6 /* phase change: everyone freezes while the camera visits the monster */,
	hpMax: (n) => Math.max(8, n * 8),
};
/* the highest roof along a truck's centre line (raycast down): {x, y} in the truck's parent space */
function truckTop(tr) {
	tr.updateMatrixWorld(true);
	const box = new THREE.Box3().setFromObject(tr),
		rc = new THREE.Raycaster(),
		hits = [];
	for (let x = box.min.x + 0.15; x < box.max.x - 0.15; x += 0.12) {
		rc.set(new THREE.Vector3(x, box.max.y + 1, 0), new THREE.Vector3(0, -1, 0));
		const h = rc.intersectObject(tr, true)[0];
		if (h) hits.push([x, h.point.y]);
	}
	if (!hits.length) return { x: 0, y: box.max.y };
	const top = Math.max(...hits.map((h) => h[1])),
		flat = hits.filter((h) => h[1] > top - 0.12);
	return { x: (flat[0][0] + flat[flat.length - 1][0]) / 2, y: top };
}
/* chunky monster tyre, axle along x (rolls along z; Monster Mash lays it flat to slide spinning): tread, sidewalls,
   silver hub, yellow cap, tread blocks */
function mmTyreKit() {
	const g = new THREE.Group(),
		cy = (r, w, col) => {
			const c = Cy(r, r, w, 10, col, 0, 0, 0);
			c.rotation.z = Math.PI / 2;
			g.add(c);
		};
	cy(0.6, 0.5, "#2E323A");
	cy(0.46, 0.56, "#3D424C");
	cy(0.22, 0.62, "#C9CED8");
	cy(0.1, 0.66, "#FFC83D");
	for (let i = 0; i < 10; i++) {
		const a = (i / 10) * Math.PI * 2,
			b = B(0.5, 0.2, 0.1, "#2E323A", 0, Math.sin(a) * 0.62, Math.cos(a) * 0.62);
		b.rotation.x = -a;
		g.add(b);
	}
	return bakeKit(g, { ao: false, ground: false });
}
/* the tyre cannon on the monster's roof: turret ring, armoured base with a hazard band, a stout barrel with a tyre loaded */
function mmCannon() {
	const g = new THREE.Group(),
		bar = new THREE.Group(),
		cx = (rt, rb, l, col, x) => {
			const c = Cy(rt, rb, l, 10, col, 0, 0, 0);
			c.rotation.z = -Math.PI / 2;
			c.position.x = x;
			bar.add(c);
		};
	g.add(Cy(0.62, 0.7, 0.22, 10, "#3D424C", 0, 0.11, 0));
	g.add(B(1.0, 0.42, 0.9, "#5A6272", 0, 0.42, 0));
	g.add(B(1.04, 0.1, 0.94, "#FFC83D", 0, 0.5, 0));
	[-0.5, 0.5].forEach((z) => g.add(B(0.7, 0.5, 0.08, "#4A525C", 0.05, 0.62, z)));
	cx(0.4, 0.44, 1.7, "#4A525C", 0.55);
	cx(0.47, 0.47, 0.12, "#FFC83D", 0.2);
	cx(0.5, 0.5, 0.2, "#E5484D", 1.38);
	cx(0.33, 0.33, 0.22, "#2E323A", 1.42);
	bar.position.set(0, 0.68, 0);
	bar.rotation.z = 0.12;
	g.add(bar);
	g.userData.bar = bar;
	return g;
}
/* a chain of alternating links, laid between two points each frame (mmChainSet) */
function mmChain() {
	const g = new THREE.Group(),
		geo = new THREE.BoxGeometry(0.1, 0.22, 0.05),
		mat = M("#3D424C");
	for (let i = 0; i < 26; i++) g.add(new THREE.Mesh(geo, mat));
	g.visible = false;
	return g;
}
const _cy = new THREE.Vector3(0, 1, 0),
	_cq = new THREE.Quaternion(),
	_ct = new THREE.Quaternion();
function mmChainSet(ch, a, b) {
	const d = b.clone().sub(a),
		len = d.length(),
		n = Math.max(1, Math.min(ch.children.length, Math.ceil(len / 0.19)));
	d.normalize();
	_cq.setFromUnitVectors(_cy, d);
	ch.children.forEach((l, i) => {
		l.visible = i < n;
		if (i >= n) return;
		l.position.copy(a).addScaledVector(d, ((i + 0.5) / n) * len);
		l.quaternion.copy(_cq).multiply(_ct.setFromAxisAngle(_cy, i % 2 ? Math.PI / 2 : 0));
	});
}
/* the electromagnet the boss shoots out of its mouth at anyone who stays too close */
function mmMagnet() {
	const g = new THREE.Group();
	g.add(Cy(0.95, 0.95, 0.42, 12, "#4A525C", 0, 0.21, 0));
	g.add(Cy(1.0, 1.0, 0.14, 12, "#FFC83D", 0, 0.25, 0));
	g.add(Cy(0.85, 0.95, 0.12, 12, "#C9CED8", 0, -0.04, 0));
	g.add(Cy(0.7, 0.9, 0.24, 12, "#E5484D", 0, 0.54, 0));
	g.add(Cy(0.16, 0.16, 0.3, 6, "#3D424C", 0, 0.8, 0));
	g.visible = false;
	return g;
}
/* dizzy stars circling over a stunned truck: three chunky five-point stars */
function mmStars() {
	const g = new THREE.Group(),
		sh = new THREE.Shape();
	for (let i = 0; i < 10; i++) {
		const a = (i / 10) * Math.PI * 2 - Math.PI / 2,
			r = i % 2 ? 0.11 : 0.26;
		if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
	}
	const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }).translate(0, 0, -0.04),
		mat = new THREE.MeshStandardMaterial({
			color: "#FFD23F",
			emissive: "#FFB000",
			emissiveIntensity: 0.6,
			flatShading: true,
		});
	for (let i = 0; i < 3; i++) {
		const m = new THREE.Mesh(geo, mat),
			a = (i / 3) * Math.PI * 2;
		m.position.set(Math.cos(a) * 0.75, Math.sin(i * 2.1) * 0.12, Math.sin(a) * 0.75);
		m.rotation.y = -a;
		g.add(m);
	}
	g.visible = false;
	return g;
}
/* TNT bundle on a carrier's roof: three red sticks, two tape bands, a wick */
function mmBundle() {
	const g = new THREE.Group();
	[
		[-0.15, 0],
		[0.15, 0],
		[0, 0.25],
	].forEach(([z, y]) => {
		const c = Cy(0.15, 0.15, 0.8, 8, "#D7372B", 0, y + 0.15, z);
		c.rotation.z = Math.PI / 2;
		g.add(c);
	});
	[-0.22, 0.22].forEach((x) => {
		const t = Cy(0.34, 0.34, 0.09, 10, "#2E323A", x, 0.24, 0);
		t.rotation.z = Math.PI / 2;
		g.add(t);
	});
	g.add(Cy(0.03, 0.03, 0.4, 5, "#E8DCC0", 0, 0.6, 0));
	g.visible = false;
	return g;
}
Object.assign(MG, {
	mash: Object.assign({}, MG.bumper, {
		name: "Monster Mash",
		team: "1v3",
		dur: 120,
		lastStanding: false,
		noAssist: true,
		camZoom: 1.15,
		BOWL: 26.5 /* Mud Brawl's bowl, 55% bigger */,
		deathY: -99 /* falling into the mud costs a life (fallen), it doesn't knock you out by itself */,
		/* new look: a stadium at dusk, floodlights on the stage (starting values, tune in the light panel) */
		sun: [14, 15, 11],
		look: {
			exp: 0.85,
			amb: 0.42,
			sun: 0.36,
			warm: 0.85,
			env: 0.4,
			haze: 60,
			glow: 1.0,
			bloom: 0.25,
			vig: 0.15,
			sat: 0.08,
			lamp: 1,
			fill: ["#8A95D8", "#5A4535"],
			sky: ["#232D57", "#9E5876", "#EE925C"],
		},
		how: "Boss fight! Drive TNT into the monster to knock it out, or survive to win as a team.",
		teamHow: (s) =>
			s === 0
				? "You're the MONSTER: knock them all into the mud!"
				: "Drive 🧨 TNT into the monster. Don't hang around it: the magnet grabs you!",
		stickHint: (fine) =>
			fine
				? "WASD or arrows to drive (the monster aims with them). Space: fire / dash, E: ground pound."
				: "Drag to drive (the monster aims). Buttons: FIRE + POUND for the monster, DASH for everyone else.",
		ramLabel: (side) => (side === 0 ? "FIRE" : "DASH"),
		btn2: (side) => (side === 0 ? "POUND" : null),
		btn2Cd(W) {
			const e = W.me;
			return e.side !== 0 ? 0 : e.chgT !== undefined ? 1 : Math.min(1, (e.pcd || 0) / 6);
		},
		R: () => MM.R,
		cam(W, tgt, pos, far) {
			/* portrait phones: 30% further out, following you a bit closer (0.9 instead of 0.85) and looking 3 m further
			   south, so the rim next to you and the near edge (above the buttons) stay on screen */
			if (far > 1 && !mgSpec(W)) {
				const off = pos.clone().sub(tgt).multiplyScalar(1.3);
				tgt.multiplyScalar(0.9 / 0.85).z += 3;
				pos = tgt.clone().add(off);
			}
			const mm = W.mm,
				m = W.ms,
				t = mm && mm.phT !== undefined ? W.t - mm.phT : 9;
			if (!m || t > MM.CUT) return [tgt, pos];
			const k = Math.sin((t / MM.CUT) * Math.PI),
				bt = new THREE.Vector3(m.x, 2, m.z),
				bp = bt.clone().add(new THREE.Vector3(0, 8 * far, 9 * far));
			return [tgt.lerp(bt, k), pos.lerp(bp, k)];
		},
		canRam: () => false,
		ramCd(W) {
			const e = W.me;
			return e.side === 0 ? Math.min(1, Math.max(0, e.fcd || 0)) : Math.min(1, e.bcd / 2);
		},
		ramReady(W) {
			const e = W.me;
			return e.side === 0 ? (e.fcd || 0) <= 0 : e.bcd <= 0 || !!e.gr;
		},
		build(W) {
			MG.bumper.build.call(this, W);
			audLoad("sfx/roar.mp3");
			W.plat.scale.set(MM.R / 11, 1, MM.R / 11);
			const s = W.sc;
			/* turntable: steel drum with a hazard band, a turning top plate with ribs and bolts, a skirt on the stage */
			const tt = new THREE.Group(),
				top = new THREE.Group();
			tt.add(Cy(3.0, 3.1, 0.16, 28, "#3D424C", 0, 0.08, 0));
			tt.add(Cy(2.8, 2.8, 0.5, 28, "#4A525C", 0, 0.25, 0));
			const band = new THREE.Mesh(
				new THREE.CylinderGeometry(2.84, 2.84, 0.2, 28, 1, true),
				new THREE.MeshStandardMaterial({
					map: canvasTex(256, 32, (x, w, h) => {
						x.fillStyle = "#FFC83D";
						x.fillRect(0, 0, w, h);
						x.fillStyle = "#23272F";
						for (let i = 0; i < 16; i++) {
							x.beginPath();
							x.moveTo(i * 16, h);
							x.lineTo(i * 16 + 8, 0);
							x.lineTo(i * 16 + 16, 0);
							x.lineTo(i * 16 + 8, h);
							x.fill();
						}
					}),
					roughness: 0.7,
				}),
			);
			band.position.y = 0.3;
			tt.add(band);
			top.add(Cy(2.65, 2.65, 0.08, 28, "#8C95A5", 0, 0.54, 0));
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2,
					r = B(1.5, 0.06, 0.16, "#6B7380", Math.cos(a) * 1.55, 0.61, Math.sin(a) * 1.55);
				r.rotation.y = -a;
				top.add(r);
			}
			for (let i = 0; i < 16; i++) {
				const a = (i / 16) * Math.PI * 2 + 0.2;
				top.add(Cy(0.08, 0.08, 0.06, 6, "#C9CED8", Math.cos(a) * 2.45, 0.61, Math.sin(a) * 2.45));
			}
			tt.add(top);
			s.add(tt);
			/* pound warning ring round the monster, and the shockwave ring */
			const ringMat = (c) =>
				new THREE.MeshBasicMaterial({
					color: c,
					transparent: true,
					opacity: 0,
					depthWrite: false,
					side: THREE.DoubleSide,
					polygonOffset: true,
					polygonOffsetFactor: -2,
				});
			const warn = new THREE.Mesh(new THREE.RingGeometry(3.05, 3.5, 40), ringMat("#FF3B1F"));
			warn.rotation.x = -Math.PI / 2;
			warn.visible = false;
			s.add(warn);
			const wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 56), ringMat("#FFE27A"));
			wave.rotation.x = -Math.PI / 2;
			wave.visible = false;
			s.add(wave);
			W.mm = { tt, top, warn, wave, ringMat, mag: {}, ty: [], slamSeen: 0, lastHp: null, ph: 1 };
			/* tyre pool */
			const kit = mmTyreKit();
			for (let i = 0; i < 10; i++) {
				const o = new THREE.Group(),
					t = kitGroup(kit, 0);
				o.add(t);
				o.visible = false;
				s.add(o);
				W.mm.ty.push({ o, t, id: null });
			}
			/* boss HP: 2 per survivor */
			const n = W.mg.tm ? Object.values(W.mg.tm).filter((x) => x === 1).length : Math.max(1, W.plist.length - 1);
			W.HP = W.hp = MM.hpMax(n);
			W.ph = 1;
			/* TNT crates on a schedule from the seed, more often with fewer survivors; until the stage starts crumbling
			   they drop out on its outer band (each crate also has a spot there, `ox` / `oz`: the choice is made just
			   before it drops, in `tick`) */
			const every = Math.min(6, Math.max(2, 9 / n)),
				rr = mulberry((W.mg.seed || 1) + 907),
				ro = mulberry((W.mg.seed || 1) + 911),
				cm = new THREE.MeshStandardMaterial({ map: hlCrateTex(), roughness: 0.9 });
			W.mm.crates = [];
			for (let k = 0; 2.5 + k * every < this.dur; k++) {
				const a = rr() * Math.PI * 2,
					r = 6.5 + rr() * (MM.RC - 7.7),
					g = new THREE.Group(),
					box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), cm);
				box.castShadow = true;
				g.add(box);
				const sh = roundShadow(1.3, 0.35, 0, 0, 0.04);
				g.add(sh);
				const mark = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 24), ringMat("#FFC83D"));
				mark.rotation.x = -Math.PI / 2;
				mark.position.y = 0.06;
				g.add(mark);
				g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
				g.visible = false;
				s.add(g);
				const ts = 2.5 + k * every,
					oa = ro() * Math.PI * 2,
					or = MM.RC + 1 + ro() * (MM.R - MM.RC - 2.2),
					ox = Math.cos(oa) * or,
					oz = Math.sin(oa) * or;
				W.mm.crates.push({
					id: k + 1,
					ts,
					te: ts + 14,
					x: g.position.x,
					z: g.position.z,
					ox,
					oz,
					sec: this.secAt(ox, oz),
					g,
					box,
					sh,
					mark,
				});
			}
			this.lights(W);
			this.stage(W);
			this.geysers(W);
		},
		/* the stage, rebuilt: a solid core (RC) and a band of SECS slices round it, each its own piece that can crack and
		   sink; faint seams show where it will break */
		stage(W) {
			const P = W.plat;
			while (P.children.length) P.remove(P.children[0]);
			P.scale.set(1, 1, 1);
			const RC = MM.RC,
				R = MM.R,
				top = "#8A6A48",
				side = "#6B4F35";
			P.add(Cy(RC, RC, 1.4, 48, top, 0, -0.7, 0), Cy(RC - 0.6, RC, 2.2, 48, side, 0, -1.3, 0));
			P.add(Cy(3, 3, 0.06, 24, "#E5484D", 0, 0.03, 0), Cy(2.6, 2.6, 0.06, 24, "#FFC83D", 0, 0.06, 0));
			const stripes = canvasTex(64, 32, (x, w, h) => {
					for (let i = 0; i < 4; i++) {
						x.fillStyle = i % 2 ? "#E5484D" : "#FFC83D";
						x.fillRect(i * 16, 0, 16, h);
					}
				}),
				crackTex = canvasTex(256, 256, (x, w, h) => {
					/* jagged dark cracks */
					x.strokeStyle = "rgba(35,22,12,0.95)";
					x.lineCap = "round";
					const rr = mulberry(77);
					for (let k = 0; k < 9; k++) {
						let px = rr() * w,
							py = rr() * h,
							a = rr() * 6.28;
						x.lineWidth = 2 + rr() * 3;
						x.beginPath();
						x.moveTo(px, py);
						for (let j = 0; j < 7; j++) {
							a += (rr() - 0.5) * 1.4;
							px += Math.cos(a) * 22;
							py += Math.sin(a) * 22;
							x.lineTo(px, py);
						}
						x.stroke();
					}
				}),
				sideM = M(side),
				da = (Math.PI * 2) / MM.SECS;
			crackTex.wrapS = crackTex.wrapT = THREE.RepeatWrapping;
			crackTex.repeat.set(1 / 7, 1 / 7);
			W.mm.sec = [];
			for (let i = 0; i < MM.SECS; i++) {
				const a0 = i * da + 0.012,
					a1 = (i + 1) * da - 0.012,
					sh = new THREE.Shape(),
					N = 6;
				for (let j = 0; j <= N; j++) {
					const a = a0 + ((a1 - a0) * j) / N;
					if (j) sh.lineTo(Math.cos(a) * R, Math.sin(a) * R);
					else sh.moveTo(Math.cos(a) * R, Math.sin(a) * R);
				}
				for (let j = N; j >= 0; j--) {
					const a = a0 + ((a1 - a0) * j) / N;
					sh.lineTo(Math.cos(a) * (RC + 0.04), Math.sin(a) * (RC + 0.04));
				}
				const geo = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: false, curveSegments: 1 });
				geo.rotateX(-Math.PI / 2);
				geo.translate(0, -2.4, 0);
				const topM = M(top).clone(),
					m = new THREE.Mesh(geo, [topM, sideM]),
					g = new THREE.Group(),
					rim = new THREE.Mesh(
						new THREE.CylinderGeometry(R + 0.05, R + 0.05, 0.5, 6, 1, true, a0 + Math.PI / 2, a1 - a0),
						new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide }),
					),
					ck = new THREE.Mesh(
						new THREE.ShapeGeometry(sh, 1),
						new THREE.MeshBasicMaterial({
							map: crackTex,
							transparent: true,
							opacity: 0,
							depthWrite: false,
							polygonOffset: true,
							polygonOffsetFactor: -3,
						}),
					);
				rim.material.map.repeat.set(((a1 - a0) * R) / 4, 1);
				rim.material.map.wrapS = THREE.RepeatWrapping;
				rim.position.y = -0.2;
				ck.rotation.x = -Math.PI / 2;
				ck.position.y = 0.03;
				ck.visible = false;
				m.castShadow = m.receiveShadow = true;
				g.add(m, rim, ck);
				P.add(g);
				W.mm.sec.push({ i, g, topM, ck, am: (i + 0.5) * da, warnT: undefined });
			}
			/* faint seams: the core's edge and the cuts between slices */
			const seam = new THREE.Mesh(
				new THREE.RingGeometry(RC - 0.03, RC + 0.05, 64),
				new THREE.MeshBasicMaterial({ color: "#4A3524", transparent: true, opacity: 0.55, depthWrite: false }),
			);
			seam.rotation.x = -Math.PI / 2;
			seam.position.y = 0.02;
			P.add(seam);
			/* which slices go, batch by batch: the same order on every device (from the seed) */
			const rr = mulberry((W.mg.seed || 1) + 313),
				ord = Array.from({ length: MM.SECS }, (_, i) => i);
			for (let i = ord.length - 1; i > 0; i--) {
				const j = Math.floor(rr() * (i + 1));
				[ord[i], ord[j]] = [ord[j], ord[i]];
			}
			W.mm.ord = ord;
			W.mm.crN = 0;
			W.mm.crDone = {};
		},
		/* slice index at a point, and whether that slice is gone (or about to go: soon = counting its warning too) */
		secAt(x, z) {
			const a = Math.atan2(-z, x);
			return Math.floor((((a % 6.2832) + 6.2832) % 6.2832) / ((Math.PI * 2) / MM.SECS)) % MM.SECS;
		},
		gone(W, i, soon) {
			const q = W.mm.sec && W.mm.sec[i];
			return !!(q && q.warnT !== undefined && W.t >= q.warnT + (soon ? 0 : MM.WARN));
		},
		/* how far out the stage reaches in this direction */
		edgeR(W, x, z, soon) {
			return this.gone(W, this.secAt(x, z), soon) ? MM.RC : MM.R;
		},
		/* a batch of slices starts cracking: 3 more from the seeded order */
		crumble(W, why) {
			const mm = W.mm;
			if (!mm.sec) return;
			const ids = mm.ord.slice(mm.crN * 3, mm.crN * 3 + 3);
			if (!ids.length) return;
			mm.crN++;
			ids.forEach((i) => (mm.sec[i].warnT = W.t));
			mgLog(W, `CRUMBLE ${why}: slices ${ids.join(",")}`);
			sfx("rumble");
		},
		/* mud geysers on a schedule from the seed: more often as the fight goes on; each bubbles for 2 s, then blasts */
		geysers(W) {
			const rr = mulberry((W.mg.seed || 1) + 571),
				g = [];
			for (let t = 10 + rr() * 4; t < this.dur; t += Math.max(3.2, 9 - t * 0.05) * (0.8 + rr() * 0.4)) {
				const a = rr() * Math.PI * 2,
					d = 4.6 + rr() * (MM.RC - 6.2);
				g.push({ id: g.length + 1, t, x: Math.cos(a) * d, z: Math.sin(a) * d });
			}
			W.mm.gy = g;
			W.mm.gyFx = {};
		},

		/* dusk stadium: a lamp bank on top of each of the bowl's 8 floodlight poles (glowing lenses), and two real
		   spotlights with fading beams from opposite poles onto the stage (more would cost phones too much) */
		lights(W) {
			const s = W.sc,
				R0 = this.BOWL,
				lin = (c) => new THREE.Color(c).convertSRGBToLinear(),
				lens = { emissive: "#FFE6B8", emissiveIntensity: 2.2 };
			W.lamps = [];
			W.lampFx = [];
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * 6.283 + 0.39,
					x = Math.cos(a) * (R0 + 6.6),
					z = Math.sin(a) * (R0 + 6.6),
					g = new THREE.Group();
				g.position.set(x, 0, z);
				g.rotation.y = Math.atan2(x, z) + Math.PI;
				g.add(B(0.34, 1.3, 0.34, "#5A6272", 0, 13.5, 0));
				g.add(B(2.9, 1.2, 0.5, "#2E323A", 0, 14.6, 0.05));
				for (let j = 0; j < 3; j++) g.add(B(0.78, 0.82, 0.06, "#FFF4D6", -0.92 + j * 0.92, 14.6, 0.34, lens));
				g.add(B(3.1, 0.1, 0.7, "#3D424C", 0, 15.25, 0.1));
				s.add(g);
				if (i % 4 !== 1) continue;
				const hy = 14.6,
					sp = new THREE.SpotLight(lin("#FFE6B8"), 2.6, 70, 0.42, 0.55, 1);
				sp.userData.base = 2.6;
				sp.position.set(x * 0.97, hy, z * 0.97);
				sp.target.position.set(0, 0, 0);
				s.add(sp, sp.target);
				W.lamps.push(sp);
				const len = 26,
					cone = new THREE.ConeGeometry(Math.tan(0.42) * len, len, 20, 1, true);
				cone.translate(0, -len / 2, 0);
				const beam = new THREE.Mesh(
					cone,
					new THREE.MeshBasicMaterial({
						map: canvasTex(8, 64, (c, w, h) => {
							const gr = c.createLinearGradient(0, 0, 0, h);
							gr.addColorStop(0, "rgba(255,236,200,1)");
							gr.addColorStop(0.35, "rgba(255,226,170,0.45)");
							gr.addColorStop(0.8, "rgba(255,226,170,0.08)");
							gr.addColorStop(1, "rgba(255,226,170,0)");
							c.fillStyle = gr;
							c.fillRect(0, 0, w, h);
						}),
						transparent: true,
						opacity: 0.2,
						blending: THREE.AdditiveBlending,
						depthWrite: false,
						fog: false,
					}),
				);
				beam.position.copy(sp.position);
				beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), sp.position.clone().negate().normalize());
				beam.castShadow = false;
				beam.userData.base = 0.2;
				W.lampFx.push(beam);
				s.add(beam);
			}
		},
		spawn(W, i, n) {
			const e = W.list[i];
			if (e && e.side === 0) return { x: 0, z: 0, yaw: -Math.PI / 2 };
			const solo = W.list[0] && W.list[0].side === 0,
				j = solo ? i - 1 : i,
				m = solo ? n - 1 : n,
				a = (j / Math.max(1, m)) * Math.PI * 2 + Math.PI / 2;
			return { x: Math.cos(a) * 12, z: Math.sin(a) * 12, yaw: Math.atan2(Math.sin(a), -Math.cos(a)) };
		},
		initEnt(W, e) {
			e.f = { dh: 0, dy: 0 };
			e.dashK = 0.7;
			e.tyHit = {};
			e.gpHit = {};
			e.nr = 0;
			if (e.side !== 0) {
				const t = truckTop(e.tr),
					b = mmBundle();
				b.position.set(t.x / 0.8, t.y / 0.8, 0);
				b.scale.setScalar(1 / 0.8);
				e.tr.add(b);
				e.bun = b;
				e.topY = t.y;
				e.stars = mmStars();
				e.stars.position.y = t.y + 0.55;
				e.g.add(e.stars);
				return;
			}
			/* the monster: a giant on the turntable with a tyre cannon on its roof */
			/* the boss drives the monster version of its own truck (buildTruck mode "monster"), scaled up */
			const k = 1.45,
				sc = 0.8 * k;
			e.g.remove(e.tr);
			e.tr = buildTruck(e.p.truck, "monster");
			e.g.add(e.tr);
			e.tr.scale.setScalar(sc);
			e.g.children.forEach((o) => {
				if (o.userData.disc) o.visible = false;
				else if (o.isSprite) o.position.y = 5.2;
			});
			const t = truckTop(e.tr),
				c = mmCannon();
			c.position.set(t.x / sc, t.y / sc - 0.02, 0);
			c.scale.setScalar(1 / sc);
			e.tr.add(c);
			e.can = c;
			e.muzY = t.y + 0.75;
			e.rad = 2.8;
			e.mass = 50;
			e.spd = 0.765;
			e.fcd = 1.2;
			e.pcd = 4;
			e.chg = 0;
		},
		inside(W, x, z, e) {
			if (e && e.side === 0) return true;
			const d = Math.hypot(x, z);
			return d < MM.RC + 0.15 || (d < MM.R + 0.15 && !this.gone(W, this.secAt(x, z)));
		},
		/* in the mud: a truck under a slice that sank can float in there (the stage's side is the core's) */
		fallPhys(W, e, dt) {
			const o = Object.create(this),
				out = this.gone(W, this.secAt(e.x, e.z));
			o.R = () => (out ? (MM.RC - 0.4) / 1.04 : MM.R);
			return MG.bumper.fallPhys.call(o, W, e, dt);
		},
		/* shared per-frame state: boss HP and phase, live tyres and shockwave from the monster's shared fields */
		tick(W) {
			const m = (W.ms = W.list.find((o) => o.side === 0 && !o.gone)),
				sv = W.list.filter((o) => o.side !== 0 && !o.gone);
			W.hp = W.HP - sv.reduce((t, o) => t + ((o.f && o.f.dh) | 0), 0);
			const ph = W.hp > (W.HP * 2) / 3 ? 1 : W.hp > W.HP / 3 ? 2 : 3;
			if (ph !== W.mm.ph && W.hp > 0) {
				W.mm.ph = ph;
				W.mm.phT = W.t;
				sfx("roar");
				W.shake = Math.max(W.shake, 0.6);
				if (m)
					for (let i = 0; i < 3; i++)
						burst(W.sc, m.x, 3 + i, m.z, {
							n: 14,
							shape: "ico",
							cols: ["#FFC83D", "#FF8A1F", "#E5484D", "#3D424C"],
							spd: 4 + i * 2,
							up: 7,
							grav: 6,
							life: 1.1,
							size: 1.6,
						});
				mgLog(W, `PHASE ${ph} (${W.hp} HP)`);
				W.mm.crQ = (W.mm.crQ || []).concat([["phase " + ph, W.t + MM.CUT]]);
				if (m)
					burst(W.sc, m.x, 2, m.z, {
						n: 26,
						shape: "ico",
						cols: ["#E5484D", "#FF8A1F", "#5A6272"],
						spd: 5,
						up: 6,
						life: 0.9,
						size: 1.3,
					});
				sfx("thunder");
			}
			W.ph = W.mm.ph;
			{
				const mm = W.mm;
				[40, 80].forEach((T) => {
					if (W.t >= T && !mm.crDone[T]) {
						mm.crDone[T] = 1;
						mm.crQ = (mm.crQ || []).concat([[T + " s", W.t]]);
					}
				});
				if (mm.crQ && W.ko === undefined)
					mm.crQ = mm.crQ.filter(([why, t]) => {
						if (W.t < t) return true;
						this.crumble(W, why);
						return false;
					});
				/* TNT crates: out on the outer band while no slice has cracked yet (its own slice still whole), else where
				   they always drop; one on a slice that starts cracking goes down with it */
				mm.crates.forEach((c) => {
					if (c.out === undefined && W.t >= c.ts - 0.6) {
						c.out = mm.crN === 0 && !this.gone(W, c.sec, true);
						mgLog(W, `TNT crate ${c.id} drops ${c.out ? "on the outer band" : "inside"}`);
						if (c.out) {
							c.x = c.ox;
							c.z = c.oz;
							c.g.position.set(c.x, 0, c.z);
						}
					}
					const q = c.out && mm.sec[c.sec];
					if (q && q.warnT !== undefined) c.te = Math.min(c.te, q.warnT + MM.WARN);
				});
				/* a slice going down under a truck: that's what knocked it in */
				W.list.forEach((o) => {
					if (o.local && o.al && !o.falling && o.side !== 0 && !this.inside(W, o.x, o.z, o))
						o.lastHit = { k: "crumble", t: W.t };
				});
				/* geysers: the eruption window; local survivors on top get thrown */
				W.gyLive = (mm.gy || []).filter((q) => W.t > q.t - 2 && W.t < q.t + 1.2);
			}
			if (m) {
				m.rad = W.ph < 3 ? 2.8 : 1.71;
				m.mass = W.ph < 3 ? 50 : 4;
			}
			if (W.hp <= 0 && W.ko === undefined) {
				W.ko = W.t;
				mgLog(W, "BOSS KNOCKED OUT");
				W.list.forEach((o) => {
					if (o.local && !o.gone) {
						if (o.gr) this.release(W, o, 4);
						o.d = true;
					}
				});
			}
			const f = (m && m.f) || {};
			W.tyLive = (f.ty || [])
				.map(([id, t0, x0, z0, a, h]) => {
					const age = W.t - t0;
					if (age < 0 || age > 4) return null;
					const dx = Math.cos(a),
						dz = -Math.sin(a),
						s = 1.4 + age * MM.TV,
						pd = x0 * dx + z0 * dz,
						Re = MM.R + 0.2,
						sx = -pd + Math.sqrt(Math.max(0, pd * pd - (x0 * x0 + z0 * z0) + Re * Re)),
						on = s < sx;
					return { id, x: x0 + dx * s, z: z0 + dz * s, dx, dz, s, sx, h, on, hit: on && s > 3.2 };
				})
				.filter(Boolean);
			const gp = f.gp;
			W.gpLive = null;
			if (gp && W.t < gp[1] + MM.JUMP + 1.5) {
				const slam = gp[1] + MM.JUMP;
				W.gpLive = {
					id: gp[0],
					t0: gp[1],
					slam,
					x: gp[2],
					z: gp[3],
					r: W.t >= slam ? 2.6 + (W.t - slam) * MM.RING : -1,
				};
			}
		},
		phys(W, e, inp, dt) {
			/* phase change: every truck stops (no firing or pounding either) while the camera visits the monster, survivors
			   can't be hit until 0.5 s after; trucks already falling or held by the magnet carry on */
			const mm = W.mm;
			if (mm.phT !== undefined && W.t - mm.phT < MM.CUT && !e.falling && !e.gr && e.outT === undefined) {
				e.vx = e.vz = 0;
				if (inp) inp.boost = inp.b2 = false;
				e.cutInv = mm.phT + MM.CUT + 0.5;
				return;
			}
			if (e.side === 0) this.monPhys(W, e, inp, dt);
			else this.survPhys(W, e, inp, dt);
		},
		monPhys(W, e, inp, dt) {
			const press = !!(inp && (inp.boost || inp.fire)),
				pound = !!(inp && (inp.b2 || inp.pound));
			if (inp) inp.boost = inp.b2 = false;
			if (W.ko !== undefined || e.d) {
				e.vx = e.vz = 0;
				return;
			}
			const ph = W.ph,
				gp = e.f.gp,
				jumping = gp && W.t < gp[1] + MM.JUMP;
			if (ph < 3) {
				/* on the turntable: the stick turns it */
				e.x = e.z = e.vx = e.vz = 0;
				if (inp && Math.hypot(inp.x, inp.y) > 0.3) {
					const d = wrapA(Math.atan2(-inp.y, inp.x) - e.yaw),
						rt = (ph === 2 ? 3.4 : 2.8) * dt;
					e.yaw += Math.max(-rt, Math.min(rt, d));
				}
			} else {
				/* loose: drives (no ram), can't leave the stage */
				arenaPhys(W, e, inp && !jumping ? { x: inp.x, y: inp.y, boost: false } : null, dt);
				if (jumping) e.vx = e.vz = 0;
				const lim = this.edgeR(W, e.x, e.z) - 1.2,
					d = Math.hypot(e.x, e.z);
				if (d > lim) {
					const nx = e.x / d,
						nz = e.z / d,
						vn = e.vx * nx + e.vz * nz;
					e.x = nx * lim;
					e.z = nz * lim;
					if (vn > 0) {
						e.vx -= vn * nx;
						e.vz -= vn * nz;
					}
				}
			}
			e.fcd = Math.max(0, e.fcd - dt);
			e.pcd = Math.max(0, e.pcd - dt);
			if (press && e.fcd <= 0 && !jumping && W.t > 1.2) {
				const r = (v) => Math.round(v * 100) / 100;
				e.f.ty = (e.f.ty || []).slice(-8);
				(ph === 1 ? [0] : [-0.13, 0.13]).forEach((o) => {
					e.f.tn = (e.f.tn | 0) + 1;
					e.f.ty.push([e.f.tn, r(W.t), r(e.x), r(e.z), r(e.yaw + o), r(e.muzY + (ph < 3 ? 0.58 : 0))]);
				});
				e.fcd = ph === 1 ? 1 : 0.85;
				e.recoil = 1;
				if (e.isMe) buzz(25);
			}
			/* POUND: a short wind-up (the warning ring grows), then the jump and the slam */
			if (pound && e.pcd <= 0 && !jumping && e.chgT === undefined && W.t > 1.2) e.chgT = W.t;
			if (e.chgT !== undefined) {
				e.chg = W.t - e.chgT;
				if (e.chg >= MM.WIND) {
					const r = (v) => Math.round(v * 100) / 100;
					e.chg = 0;
					e.chgT = undefined;
					e.pcd = ph === 3 ? 6 : 7;
					e.f.gpn = (e.f.gpn | 0) + 1;
					e.f.gp = [e.f.gpn, r(W.t), r(e.x), r(e.z)];
					mgLog(W, "boss: ground pound");
				}
			} else e.chg = 0;
			e.f.ch = Math.round((e.chg / MM.WIND) * 10) / 10;
			const sv = W.list.filter((o) => o.side !== 0 && !o.gone);
			e.sc = sv.filter((o) => !o.al).length;
			if (sv.length && W.t > 1 && sv.every((o) => !o.al) && !e.won) {
				e.d = true;
				e.won = true;
			}
		},
		/* a survivor in the mud: loses a life; with one left, back on the stage after 2.2 s where it fell off, a few
		   metres in, blinking and safe from hits and the magnet for 2 s */
		fallen(W, e) {
			if (e.outT === undefined) {
				e.outT = W.t;
				e.lives = (e.lives === undefined ? MM.LIVES : e.lives) - 1;
				e.f.lv = e.lives;
				e.f.dy = 0;
				e.gr = null;
				e.f.gr = 0;
				e.fly = false;
				e.nr = e.f.nr = 0;
				if (e.lives <= 0) {
					eliminate(W, e);
					return;
				}
				fb(W, e, e.lives === 1 ? "1 LIFE" : `${e.lives} LIVES`, { stamp: true });
				mgLog(W, `FALL ${mgName(e)} (${e.lastHit && W.t - e.lastHit.t < 2 ? e.lastHit.k : "own fault"})`);
				e.buzz = (e.buzz || 0) + 1;
				if (e.isMe && !W.tv) buzz(150);
				return;
			}
			if (W.t - e.outT > 2.2) {
				const a = Math.atan2(e.z, e.x),
					r = MM.R * 0.62;
				Object.assign(e, {
					x: Math.cos(a) * r,
					z: Math.sin(a) * r,
					y: 0,
					vx: 0,
					vz: 0,
					vy: 0,
					falling: false,
					mud: false,
					splorch: false,
					spin: 0,
					outT: undefined,
					stunT: 0,
					reelT: 0,
					inv: W.t + 2,
				});
				e.f.inv = Math.round((W.t + 2) * 100) / 100;
				mgLog(W, `${mgName(e)} is back (${e.lives} life left)`);
			}
		},
		knock(W, e, nx, nz, K, sl, why) {
			e.lastHit = { k: why, t: W.t };
			mgLog(W, `${why} hits ${mgName(e)}`);
			e.vx += nx * K;
			e.vz += nz * K;
			e.slideT = sl;
			e.hitAng = [nx, nz];
			e.buzz = (e.buzz || 0) + 1;
			if (e.isMe) {
				W.shake = 0.4;
				if (!W.tv) buzz(70);
			}
			hitFx(e, e);
		},
		release(W, e, push) {
			e.gr = null;
			e.f.gr = 0;
			e.fly = false;
			e.nr = 0;
			const m = W.ms;
			if (m) {
				const dx = e.x - m.x,
					dz = e.z - m.z,
					d = Math.hypot(dx, dz) || 1;
				e.vx = (dx / d) * push;
				e.vz = (dz / d) * push;
			}
		},
		survPhys(W, e, inp, dt) {
			const m = W.ms;
			if (e.gr) {
				/* held up by the magnet: tap to break free, a TNT hit on the boss drops you, otherwise flung into the mud */
				const g = e.gr,
					fx = m ? Math.cos(m.yaw) : 0,
					fz = m ? -Math.sin(m.yaw) : 0,
					tx = m ? m.x + fx * ((m.rad || 1.7) + 1.4) : g.x,
					tz = m ? m.z + fz * ((m.rad || 1.7) + 1.4) : g.z;
				e.vx = e.vz = 0;
				e.x += (tx - e.x) * Math.min(1, dt * 6);
				e.z += (tz - e.z) * Math.min(1, dt * 6);
				e.y += (3.2 - e.y) * Math.min(1, dt * 5);
				if (inp && inp.boost) {
					g.taps++;
					inp.boost = false;
					e.wig = 0.25;
				}
				if (W.hp < g.hp || g.taps >= 7) {
					mgLog(W, `${mgName(e)} ${g.taps >= 7 ? "breaks free" : "dropped (boss hit)"}`);
					this.release(W, e, 5);
				} else if (W.t - g.t0 >= 1.6) {
					const dx = m ? fx : e.x,
						dz = m ? fz : e.z,
						d = Math.hypot(dx, dz) || 1;
					e.gr = null;
					e.f.gr = 0;
					e.fly = false;
					e.f.dy = 0;
					e.vx = (dx / d) * 24;
					e.vz = (dz / d) * 24;
					e.vy = 8;
					e.falling = true;
					e.lastHit = { k: "magnet fling", t: W.t };
					if (e.isMe) W.shake = 0.5;
					sfx("magnet");
				}
				return;
			}
			if (e.y > 0 && !e.falling) {
				e.vy = (e.vy || 0) - 30 * dt;
				e.y = Math.max(0, e.y + e.vy * dt);
				if (!e.y) e.vy = 0;
			}
			/* stunned (shockwave), or reeling for a moment after a tyre hit so the push carries */
			if (e.reelT > 0) e.reelT -= dt;
			if (e.stunT > 0 || e.reelT > 0) {
				e.stunT -= dt;
				if (inp) inp.boost = false;
				inp = { x: 0, y: 0, boost: false };
			}
			arenaPhys(W, e, inp, dt);
			if (e.falling && e.al && W.t >= 0) {
				this.fallen(W, e);
				return;
			}
			if (!e.al || e.falling || e.d || W.t < 0) return;
			e.tA = W.t;
			const safe = W.t < (e.inv || 0) || W.t < (e.cutInv || 0);
			e.sc = Math.floor(W.t * 10);
			for (const t of W.tyLive || []) {
				if (!t.hit || safe || e.tyHit[t.id]) continue;
				const rx = e.x - t.x,
					rz = e.z - t.z;
				if (Math.hypot(rx, rz) > MM.TYR) continue;
				e.tyHit[t.id] = 1;
				if (W.t - (e.tyT || -9) > 0.3) {
					e.tyT = W.t;
					this.knock(W, e, t.dx, t.dz, 13, 0.7, "tyre");
					e.reelT = 0.35;
					/* the third tyre within TYWIN s: dizzy for TYSTUN s (no tanking the shots for the team) */
					e.tyH = (e.tyH || []).filter((q) => W.t - q < MM.TYWIN).concat([W.t]);
					if (e.tyH.length >= MM.TYN) {
						e.tyH = [];
						e.stunT = Math.max(e.stunT || 0, MM.TYSTUN);
						e.f.stn = Math.round((W.t + MM.TYSTUN) * 100) / 100;
						fb(W, e, "DIZZY!", { tone: "bad" });
						mgLog(W, `${mgName(e)} stunned by ${MM.TYN} tyres`);
						if (e.isMe || Math.hypot(e.x - W.me.x, e.z - W.me.z) < 6) sfx("stun");
					}
				}
			}
			const g = W.gpLive;
			if (g && g.r > 0 && !safe && !e.gpHit[g.id]) {
				const dx = e.x - g.x,
					dz = e.z - g.z,
					d = Math.hypot(dx, dz) || 1;
				if (Math.abs(d - g.r) < 0.8) {
					e.gpHit[g.id] = 1;
					if (e.boostT > 0) {
						burst(W.sc, e.x, 1.2, e.z, {
							n: 10,
							shape: "cube",
							cols: ["#F4F6F9", "#BFE6FF"],
							spd: 3,
							up: 3,
							life: 0.4,
						});
						fb(W, e, "Dodged!", { tone: "good" });
						mgLog(W, `${mgName(e)} dodges the shockwave`);
					} else {
						this.knock(W, e, dx / d, dz / d, 6, 0.5, "shockwave");
						e.stunT = MM.STUN;
						e.f.stn = Math.round((W.t + MM.STUN) * 100) / 100;
						if (e.isMe || Math.hypot(e.x - W.me.x, e.z - W.me.z) < 6) sfx("stun");
					}
				}
			}
			for (const q of W.gyLive || [])
				if (W.t >= q.t && W.t < q.t + 0.5 && !safe && !(e.gyHit || (e.gyHit = {}))[q.id]) {
					const dx = e.x - q.x,
						dz = e.z - q.z,
						d = Math.hypot(dx, dz);
					if (d < 2.1) {
						e.gyHit[q.id] = 1;
						const nx = d > 0.1 ? dx / d : Math.cos(q.id),
							nz = d > 0.1 ? dz / d : Math.sin(q.id);
						this.knock(W, e, nx, nz, 7, 0.6, "geyser");
						e.vy = 13;
						e.y = Math.max(e.y, 0.05);
						e.stunT = Math.max(e.stunT || 0, 0.5);
						e.f.gyl = Math.round(W.t * 100) / 100;
					}
				}
			if (!e.f.dy)
				for (const c of W.mm.crates)
					if (W.t >= c.ts + 0.5 && W.t < c.te && Math.hypot(e.x - c.x, e.z - c.z) < 1.6 && W.claim(c.id)) {
						e.c.push(c.id);
						e.f.dy = c.id;
						mgLog(W, `${mgName(e)} picks up TNT`);
						if (e.isMe) sfx("coin");
						break;
					}
			if (!m || W.ko !== undefined) return;
			const dx = e.x - m.x,
				dz = e.z - m.z,
				d = Math.hypot(dx, dz) || 1;
			if (e.f.dy && d < (m.rad || 1.7) + 1.4) {
				/* TNT delivered: the boss loses 1 HP (everyone sums e.f.dh), the blast bounces you off */
				e.f.dy = 0;
				e.f.dh = (e.f.dh | 0) + 1;
				this.knock(W, e, dx / d, dz / d, 9, 0.45, "TNT bounce");
				mgLog(W, `TNT ${mgName(e)} hits the boss (${W.hp - 1} HP left)`);
			}
			const cr = ((W.ph < 3 ? 2.8 : 1.71) + 1.7) * 1.2;
			e.nr = d < cr && !safe ? e.nr + dt : Math.max(0, e.nr - dt * 1.5);
			if (e.nr >= MM.CLAW) {
				e.gr = { t0: W.t, hp: W.hp, taps: 0, x: e.x, z: e.z };
				e.f.gr = 1;
				e.fly = true;
				mgLog(W, `magnet grabs ${mgName(e)}`);
				if (e.isMe) {
					sfx("magnet");
					buzz(120);
				}
			}
			e.f.nr = Math.round(e.nr * 10) / 10;
		},
		rules() {},
		/* tools/watch.mjs: one summary line, and a rough stand-in for a human player (the boss aims straight at a truck, no
		   leading; survivors play like the CPUs) */
		/* tools/nettest.mjs: what must look the same on every device */
		syncSnap(W) {
			return {
				hp: W.hp,
				phase: W.ph,
				ko: W.ko !== undefined,
				crates: [...W.claimed].sort((a, b) => a - b).join(","),
				grabbed: W.list
					.filter((e) => e.f && e.f.gr)
					.map(mgName)
					.join(","),
			};
		},
		watchSum(W) {
			const m = W.ms,
				f = (m && m.f) || {};
			return `boss ${Math.max(0, W.hp)}/${W.HP} HP, ${f.tn | 0} tyres, ${f.gpn | 0} pounds`;
		},
		humanBot(W, e, dt) {
			const o = this.bot(W, e, dt);
			if (e.side !== 0 || W.ph === 3) return o;
			const tg = W.list
				.filter((q) => q.side === 1 && q.al && !q.falling && !q.gone)
				.sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
			if (tg) {
				const a = Math.atan2(-(tg.z - e.z), tg.x - e.x);
				o.x = Math.cos(a);
				o.y = -Math.sin(a);
				o.fire = Math.abs(wrapA(a - e.yaw)) < 0.12;
			}
			return o;
		},
		timeUp() {},
		/* survivor: 1000 if still on the stage + 100 per TNT hit + seconds on the stage; monster: 100 per crushed + HP left */
		final(W, e) {
			if (e.side === 0) return e.sc * 100 + Math.max(0, W.hp);
			return (e.al ? 1000 : 0) + ((e.f.dh | 0) % 10) * 100 + Math.min(99, Math.floor(e.tA || 0));
		},
		fmtE(W, e) {
			if (e.side === 0) return `${Math.max(0, W.hp)} HP`;
			const lv = e.local
				? e.lives === undefined
					? MM.LIVES
					: e.lives
				: e.f && e.f.lv !== undefined
					? e.f.lv
					: MM.LIVES;
			return !e.al ? "OUT" : `${"♥".repeat(Math.max(0, lv))} ${e.f && e.f.dy ? "🧨" : ((e.f && e.f.dh) | 0) + " 💥"}`;
		},
		fmtTeam(v, s) {
			if (s === 0) return `Crushed ${Math.floor(v / 100)}, ${v % 100} HP left`;
			const h = Math.floor((v % 1000) / 100);
			return `${v >= 1000 ? "Survived" : `Out after ${v % 100} s`}${h ? `, ${h} TNT hit${h > 1 ? "s" : ""}` : ""}`;
		},
		teamWin(res, tm) {
			const sv = Object.keys(tm).filter((k) => tm[k] === 1);
			let hits = 0,
				ok = false;
			sv.forEach((k) => {
				if (!(k in res)) return;
				if (res[k] >= 1000) ok = true;
				hits += Math.floor((res[k] % 1000) / 100);
			});
			return ok || hits >= MM.hpMax(sv.length) ? 1 : 0;
		},
		/* visuals: the monster on its turntable (jump, recoil, KO), TNT on roofs, then the shared scene once a frame */
		render(W, e, dt) {
			MG.bumper.render.call(this, W, e, dt);
			const mm = W.mm;
			if (e.side === 0) {
				const ph = W.ph || 1,
					drop = ph < 3 ? 0 : Math.min(1, (W.t - (mm.phT || 0)) / 0.8),
					gp = W.gpLive;
				let y = 0.58 * (1 - drop);
				if (gp && W.t < gp.slam) y += Math.sin(((W.t - gp.t0) / MM.JUMP) * Math.PI) * 2.2;
				e.g.position.y += y;
				const ch = (e.local ? e.chg / MM.WIND : e.f && e.f.ch) || 0;
				if (ch > 0) e.tr.rotation.z += (Math.random() - 0.5) * 0.06 * ch;
				if (e.can) {
					e.recoil = Math.max(0, (e.recoil || 0) - dt * 5);
					e.can.userData.bar.position.x = -0.35 * e.recoil;
				}
				if (W.ko !== undefined) {
					e.tr.rotation.z = Math.min(1, (W.t - W.ko) / 0.8) * 1.1;
					if (Math.random() < dt * 8)
						burst(W.sc, e.x, 3, e.z, {
							n: 2,
							shape: "ico",
							cols: ["#5A6272", "#3D424C"],
							spd: 0.8,
							up: 3,
							grav: -1,
							life: 1.4,
							size: 1.6,
							op: 0.6,
						});
				}
				mm.tt.position.y = -0.46 * drop;
				const fl = e.tr.userData.flames;
				if (fl)
					fl.forEach((f) => {
						f.scale.multiplyScalar(ph === 3 ? 1.6 : 1);
						if (ph === 3 && Math.random() < dt * 9) {
							const p = f.getWorldPosition(new THREE.Vector3());
							burst(W.sc, p.x, p.y + 0.3, p.z, {
								n: 3,
								shape: "ico",
								cols: ["#FFC83D", "#FF8A1F", "#E5484D"],
								spd: 0.5,
								up: 7,
								grav: -2,
								life: 0.45,
								size: 1.2,
							});
						}
					});
				if (ph < 3) mm.top.rotation.y = e.yaw;
			} else if (e.bun) {
				const inv = e.local ? W.t < (e.inv || 0) : !!(e.f && W.t < (e.f.inv || 0));
				e.tr.visible = !inv || Math.sin(W.t * 30) > 0;
				e.bun.visible = !!(e.f && e.f.dy && e.al);
				const st = e.local ? e.stunT > 0 : e.f && W.t < e.f.stn;
				e.stars.visible = !!(st && e.al);
				if (st) e.stars.rotation.y = W.t * 6;
				if (e.wig) {
					e.wig = Math.max(0, e.wig - dt);
					e.tr.rotation.z += Math.sin(W.t * 60) * e.wig;
				}
			}
			if (mm.frame === W.t) return;
			mm.frame = W.t;
			this.renderShared(W, dt);
		},
		renderShared(W, dt) {
			const mm = W.mm,
				m = W.ms;
			/* boss music: starts with the fight, one section per phase, ends on a chord when the boss is down (major) or the
			   game ends (minor) */
			if (!mm.mus && W.t > -0.5) {
				mm.mus = 1;
				musPlay("boss");
			}
			if (mm.mus === 1) {
				musLevel(W.ph || 1);
				if (W.ko !== undefined || W.over) {
					mm.mus = 2;
					musEnd(W.ko !== undefined);
				}
			}
			/* the last phase: the monster roars as its turntable drops */
			if (W.ph === 3 && !mm.roared) {
				mm.roared = 1;
				sfxFile("sfx/roar.mp3", 0.9);
			}
			/* the phase change freeze is over: GO! */
			if (mm.phT !== undefined && mm.goT !== mm.phT && W.t - mm.phT >= MM.CUT) {
				mm.goT = mm.phT;
				W.big = "GO!";
				W.bigT = W.t + 0.8;
				sfx("go");
			}
			/* boss hit: explosion and a flinch */
			if (mm.lastHp !== null && W.hp < mm.lastHp && m) {
				burst(W.sc, m.x, 2, m.z, {
					n: 34,
					shape: "ico",
					cols: ["#FFE27A", "#FF8A1F", "#E5484D", "#5A6272"],
					spd: 7,
					up: 8,
					life: 0.9,
					size: 1.4,
				});
				sfx("thunder");
				W.shake = Math.max(W.shake, 0.35);
				mm.flinch = 1;
				musHit();
			}
			mm.lastHp = W.hp;
			if (m && mm.flinch > 0) {
				mm.flinch = Math.max(0, mm.flinch - dt * 3);
				m.tr.rotation.x += Math.sin(mm.flinch * 20) * 0.08 * mm.flinch;
			}
			/* tyres: arc out of the muzzle, roll with a bounce, drop off the edge into the mud */
			const live = W.tyLive || [],
				used = new Set();
			const nw = live.filter((t) => t.id > (mm.tySeen || 0));
			if (nw.length) {
				mm.tySeen = Math.max(...nw.map((t) => t.id));
				sfx("cannon");
				nw.forEach((t) =>
					burst(W.sc, t.x - t.dx * (t.s - 1.6), t.h, t.z - t.dz * (t.s - 1.6), {
						n: 6,
						shape: "ico",
						cols: ["#C9CED8", "#8C95A5", "#F4F6F9"],
						spd: 1.2,
						up: 1.5,
						grav: -1,
						life: 0.7,
						size: 1.1,
						op: 0.7,
					}),
				);
			}
			live.forEach((t) => {
				const sl =
					mm.ty.find((q) => q.id === t.id) || mm.ty.find((q) => q.id === null || !live.some((l) => l.id === q.id));
				if (!sl) return;
				if (sl.id !== t.id) {
					sl.id = t.id;
					sl.spl = false;
				}
				used.add(sl);
				let y;
				if (t.s < 3.6) {
					const k = (t.s - 1.4) / 2.2;
					y = 0.36 + (t.h - 0.36) * (1 - k * k);
				} else if (t.on) y = 0.36 + Math.abs(Math.sin(t.s * 0.9)) * 0.35;
				else {
					const tf = (t.s - t.sx) / MM.TV;
					y = 0.36 - 15 * tf * tf;
					if (y < this.MUD + 0.4 && !sl.spl) {
						sl.spl = true;
						burst(W.sc, t.x, this.MUD + 0.3, t.z, {
							n: 10,
							shape: "ico",
							cols: ["#4A3524", "#6B4F35"],
							spd: 2.5,
							up: 4,
							grav: 12,
							life: 0.7,
							size: 1,
						});
					}
				}
				sl.o.visible = y > this.MUD - 1;
				sl.o.position.set(t.x, y, t.z);
				/* lying flat (axle up): it slides and skips across the stage spinning, as wide as it is round */
				sl.o.rotation.y = t.s * 0.8;
				sl.t.rotation.set(0, 0, Math.PI / 2);
			});
			mm.ty.forEach((q) => {
				if (!used.has(q)) {
					q.o.visible = false;
					q.id = null;
				}
			});
			/* ground pound: a pulsing warning ring while it charges and jumps, then the shockwave */
			const ch = m ? (m.local ? m.chg / MM.WIND : (m.f && m.f.ch) || 0) : 0,
				gp = W.gpLive,
				wv = !!((gp && W.t < gp.slam) || ch > 0);
			mm.warn.visible = wv;
			if (ch > 0 && !mm.wu) {
				mm.wu = true;
				sfx("windup");
			} else if (!ch) mm.wu = false;
			if (wv) {
				const s = W.ph < 3 ? 1 : 0.62;
				mm.warn.position.set(m ? m.x : 0, 0.12, m ? m.z : 0);
				mm.warn.scale.set(s, s, 1);
				mm.warn.material.opacity = (gp && W.t < gp.slam ? 0.85 : ch * 0.7) * (0.65 + 0.35 * Math.sin(W.t * 24));
			}
			mm.wave.visible = !!(gp && gp.r > 0 && gp.r < MM.R + 2);
			if (mm.wave.visible) {
				mm.wave.position.set(gp.x, 0.25, gp.z);
				mm.wave.scale.set(gp.r, gp.r, 1);
				mm.wave.material.opacity = 0.9 * (1 - gp.r / (MM.R + 2));
				if (mm.slamSeen !== gp.id) {
					mm.slamSeen = gp.id;
					sfx("crush");
					if (Math.hypot(W.me.x - gp.x, W.me.z - gp.z) < 16) W.shake = Math.max(W.shake, 0.5);
					for (let i = 0; i < 18; i++) {
						const a = (i / 18) * Math.PI * 2;
						burst(W.sc, gp.x + Math.cos(a) * 3, 0.4, gp.z + Math.sin(a) * 3, {
							n: 2,
							shape: "ico",
							cols: ["#8A6A48", "#A88563"],
							spd: 3,
							up: 3,
							grav: 12,
							life: 0.7,
							size: 1.1,
						});
					}
				}
			}
			/* the mouth: the boss's jaw opens as someone lingers close (a red ring under them), the magnet peeks out, then
			   shoots out on a chain, grabs them and holds them up in front of the face */
			let mouth = null,
				open = 0;
			if (m && m.tr.userData.mouth) {
				m.g.updateMatrixWorld(true);
				mouth = m.tr.localToWorld(m.tr.userData.mouth.clone());
			}
			W.list.forEach((e) => {
				if (e.side === 0 || e.gone) return;
				const nr = e.local ? e.nr : (e.f && e.f.nr) || 0,
					gr = !!(e.f && e.f.gr);
				let g = mm.mag[e.k];
				if (!g) {
					g = mm.mag[e.k] = {
						m: mmMagnet(),
						ch: mmChain(),
						w: new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 28), mm.ringMat("#FF3B1F")),
					};
					g.w.rotation.x = -Math.PI / 2;
					g.w.visible = false;
					W.sc.add(g.m, g.ch, g.w);
				}
				if (gr && !g.grT) g.grT = W.t;
				if (!gr) g.grT = 0;
				const on = !!(mouth && e.al && !e.falling && (gr || nr > 0.25)),
					k = gr ? 1 : Math.min(1, Math.max(0, (nr - 0.25) / (MM.CLAW - 0.25)));
				if (on) open = Math.max(open, gr ? 1 : k);
				g.m.visible = g.ch.visible = on;
				g.w.visible = !!(on && !gr);
				/* grabbed: a mini DASH button hammered by the truck says how to break free */
				if (gr && e.al && !e.falling) inputHint(W, e, "DASH", "mash");
				/* about to be grabbed: a flashing warning sign on the magnet */
				if (!g.wn) {
					g.wn = iconSprite("warn", warnSignDraw, 0.8);
					W.sc.add(g.wn);
				}
				g.wn.visible = !!(on && !gr && nr > 0.35 && fbShow(W, e) && Math.sin(W.t * 16) > -0.3);
				if (!on) return;
				const top = new THREE.Vector3(e.x, e.y + (e.topY || 1.4) + 0.1, e.z),
					p = gr
						? mouth.clone().lerp(top, Math.min(1, (W.t - g.grT) / 0.18))
						: mouth.clone().addScaledVector(top.clone().sub(mouth).normalize(), 0.5 * k),
					sc = gr ? 0.7 : 0.3 + 0.3 * k;
				g.m.position.copy(p);
				g.m.scale.setScalar(sc);
				g.wn.position.set(p.x, p.y + 1.1, p.z);
				mmChainSet(g.ch, mouth, p.clone().add(new THREE.Vector3(0, 0.75 * sc, 0)));
				g.w.position.set(e.x, 0.1, e.z);
				g.w.material.opacity = Math.min(1, nr / MM.CLAW) * (0.6 + 0.4 * Math.sin(W.t * 20));
			});
			if (m && m.tr.userData.jaw) {
				mm.jawK = (mm.jawK || 0) + (open - (mm.jawK || 0)) * Math.min(1, dt * 10);
				m.tr.userData.jaw.rotation.z = -0.8 * mm.jawK;
			}
			/* crates: drop in, sit with a pulsing ring, blink before they vanish */
			mm.crates.forEach((c) => {
				const vis = W.t >= c.ts && W.t < c.te && !W.claimed.has(c.id);
				c.g.visible = !!vis;
				if (!vis) return;
				const k = Math.min(1, (W.t - c.ts) / 0.5);
				c.box.position.y = 0.48 + (1 - k) * (1 - k) * 9;
				c.box.rotation.y = W.t * 0.8 + c.id;
				c.box.visible = !!(c.te - W.t > 2 || Math.sin(W.t * 18) > 0);
				c.sh.scale.setScalar(0.4 + 0.6 * k);
				c.mark.material.opacity = k * (0.45 + 0.3 * Math.sin(W.t * 6));
			});
			this.stageFx(W, dt);
			/* boss bar: the monster's name and one segment per HP */
			let bar = document.getElementById("mmbar");
			const box = document.getElementById("mg");
			if (!bar && box && m) {
				bar = document.createElement("div");
				bar.id = "mmbar";
				bar.innerHTML = `<b>${esc(TRUCKS[m.p.truck].name)}</b><div class="mmhp" style="width:${Math.min(
					210,
					W.HP * 18,
				)}px"></div>`;
				box.appendChild(bar);
				mm.barHp = null;
			}
			if (bar && mm.barHp !== W.hp) {
				mm.barHp = W.hp;
				bar.querySelector(".mmhp").innerHTML = Array.from(
					{ length: W.HP },
					(_, i) => `<i class="${i < W.hp ? "on" : ""}"></i>`,
				).join("");
				bar.classList.toggle("rage", W.ph === 3);
				bar.classList.remove("hit");
				void bar.offsetWidth;
				bar.classList.add("hit");
			}
		},
		/* a cracking slice glows and shakes (cracks spreading over it), then tips outwards and sinks into the mud; a geyser
		   bubbles in a ring that says how far it reaches, then blasts a column of mud */
		stageFx(W, dt) {
			const mm = W.mm,
				near = (x, z, d) => W.tv || Math.hypot(W.me.x - x, W.me.z - z) < d;
			(mm.sec || []).forEach((q) => {
				if (q.warnT === undefined || q.sunk) return;
				const k = W.t - q.warnT,
					cx = Math.cos(q.am) * (MM.R + MM.RC) * 0.5,
					cz = -Math.sin(q.am) * (MM.R + MM.RC) * 0.5;
				if (k < MM.WARN) {
					q.ck.visible = true;
					q.ck.material.opacity = Math.min(1, k / 1.5);
					q.topM.emissive.set("#FF5A1F");
					q.topM.emissiveIntensity = (0.12 + 0.3 * (k / MM.WARN)) * (0.6 + 0.4 * Math.sin(W.t * (8 + k * 5)));
					q.g.position.y = (Math.random() - 0.5) * 0.05 * (k / MM.WARN);
					if (Math.random() < dt * (3 + k * 3)) {
						const a = q.am + (Math.random() - 0.5) * 0.35,
							d = MM.RC + Math.random() * (MM.R - MM.RC);
						burst(W.sc, Math.cos(a) * d, 0.2, -Math.sin(a) * d, {
							n: 3,
							shape: "cube",
							cols: ["#8A6A48", "#6B4F35"],
							spd: 1.2,
							up: 2.5,
							grav: 14,
							life: 0.7,
							size: 0.9,
						});
					}
					return;
				}
				const sk = k - MM.WARN;
				if (!q.down) {
					q.down = 1;
					q.topM.emissiveIntensity = 0;
					if (near(cx, cz, 30)) sfx("slump");
					if (near(cx, cz, 12)) W.shake = Math.max(W.shake, 0.35);
					for (let j = 0; j < 6; j++) {
						const a = q.am + (j / 5 - 0.5) * 0.36;
						burst(W.sc, Math.cos(a) * MM.R, this.MUD + 0.4, -Math.sin(a) * MM.R, {
							n: 5,
							shape: "ico",
							cols: ["#4A3524", "#6B4F35", "#8A6A48"],
							spd: 2.5,
							up: 5,
							grav: 12,
							life: 0.9,
							size: 1.2,
						});
					}
				}
				q.g.position.y = -sk * 1.4 - sk * sk * 2.4;
				q.g.quaternion.setFromAxisAngle(
					new THREE.Vector3(Math.sin(q.am), 0, Math.cos(q.am)),
					-0.3 * Math.min(1, sk / 1.2),
				);
				if (sk > 1.8) {
					q.sunk = true;
					q.g.visible = false;
				}
			});
			/* geysers */
			mm.gyFx = mm.gyFx || {};
			const live = new Set();
			(W.gyLive || []).forEach((q) => {
				live.add(q.id);
				let fx = mm.gyFx[q.id];
				if (!fx) {
					const ring = new THREE.Mesh(new THREE.RingGeometry(1.75, 2.1, 32), mm.ringMat("#FF8A1F")),
						dome = mesh(new THREE.SphereGeometry(1, 12, 6, 0, 6.29, 0, 1.57), "#6B4F35", { roughness: 0.25 }),
						col = new THREE.Group(),
						body = mesh(new THREE.CylinderGeometry(0.75, 1.15, 1, 10, 1, true), "#5A4030", { roughness: 0.3 }),
						cap = mesh(new THREE.IcosahedronGeometry(1.1, 1), "#6B4F35", { roughness: 0.3 });
					ring.rotation.x = -Math.PI / 2;
					body.position.y = 0.5;
					col.add(body, cap);
					dome.castShadow = false;
					W.sc.add(ring, dome, col);
					fx = mm.gyFx[q.id] = { ring, dome, col, body, cap };
				}
				const k = W.t - q.t,
					y = 0.06 + ((W.plat && W.plat.position.y) || 0);
				fx.ring.position.set(q.x, y, q.z);
				fx.dome.position.set(q.x, y - 0.1, q.z);
				fx.col.position.set(q.x, y, q.z);
				if (k < 0) {
					/* bubbling */
					const w = 1 + k / 2;
					fx.ring.visible = true;
					fx.ring.material.opacity = (0.35 + 0.5 * w) * (0.6 + 0.4 * Math.sin(W.t * (10 + w * 10)));
					fx.dome.visible = true;
					fx.dome.scale.set(0.5 + w * 0.9, (0.15 + w * 0.5) * (1 + 0.15 * Math.sin(W.t * 18)), 0.5 + w * 0.9);
					fx.col.visible = false;
					if (Math.random() < dt * (4 + w * 8))
						burst(W.sc, q.x + (Math.random() - 0.5) * 2, y + 0.3, q.z + (Math.random() - 0.5) * 2, {
							n: 2,
							shape: "ico",
							cols: ["#6B4F35", "#8A6A48"],
							spd: 0.6,
							up: 2.5 + w * 2,
							grav: 12,
							life: 0.5,
							size: 0.7,
						});
					if (!fx.bub && near(q.x, q.z, 14)) {
						fx.bub = 1;
						sfx("bubble");
					}
					return;
				}
				/* the blast: a column shoots up and falls back */
				fx.ring.visible = fx.dome.visible = false;
				const h = k < 0.25 ? (k / 0.25) * 7 : Math.max(0, 7 * (1 - (k - 0.25) / 0.95));
				fx.col.visible = h > 0.1;
				fx.body.scale.set(1 + Math.sin(W.t * 30) * 0.06, h, 1 + Math.cos(W.t * 27) * 0.06);
				fx.cap.position.y = h;
				fx.cap.scale.setScalar(0.6 + Math.min(1, h / 5) * 0.6);
				if (!fx.blast) {
					fx.blast = 1;
					if (near(q.x, q.z, 30)) sfx("geyser");
					if (near(q.x, q.z, 9)) W.shake = Math.max(W.shake, 0.3);
					burst(W.sc, q.x, y + 1, q.z, {
						n: 26,
						shape: "ico",
						cols: ["#4A3524", "#6B4F35", "#8A6A48"],
						spd: 4,
						up: 12,
						grav: 16,
						life: 1.3,
						size: 1.2,
					});
				}
				if (h > 1 && Math.random() < dt * 20)
					burst(W.sc, q.x, y + h, q.z, {
						n: 2,
						shape: "ico",
						cols: ["#4A3524", "#6B4F35"],
						spd: 3,
						up: 3,
						grav: 16,
						life: 0.8,
						size: 1,
					});
			});
			for (const id in mm.gyFx)
				if (!live.has(+id)) {
					const fx = mm.gyFx[id];
					W.sc.remove(fx.ring, fx.dome, fx.col);
					delete mm.gyFx[id];
				}
		},
		bot(W, e, dt) {
			const m = W.ms,
				sv = W.list.filter((o) => o.side !== 0 && !o.gone && o.al && !o.d && !o.falling && !o.gr);
			if (e.side === 0) {
				/* aim ahead of a target (TNT carriers first), fire when lined up, pound when trucks crowd in */
				const near = (o) => Math.hypot(o.x - e.x, o.z - e.z),
					tg =
						sv.filter((o) => o.f && o.f.dy).sort((a, b) => near(a) - near(b))[0] ||
						sv.sort((a, b) => near(a) - near(b))[0],
					out = { x: 0, y: 0, fire: false, pound: false };
				if (tg) {
					if (e.aimErr === undefined) {
						e.aimErr = (Math.random() - 0.5) * 0.6;
						e.lead = 0.2 + Math.random() * 1.2;
					}
					const T = ((near(tg) / MM.TV) * 0.6 + 0.1) * e.lead,
						dx = tg.x + tg.vx * T - e.x,
						dz = tg.z + tg.vz * T - e.z,
						l = Math.hypot(dx, dz) || 1;
					const a = Math.atan2(-dz, dx) + e.aimErr;
					out.x = W.ph === 3 ? dx / l : Math.cos(a);
					out.y = W.ph === 3 ? dz / l : -Math.sin(a);
					out.fire = Math.abs(wrapA(a - e.yaw)) < 0.14 && Math.random() < dt * 5;
					if (out.fire) e.aimErr = undefined;
				}
				const crowd = sv.filter((o) => near(o) < 7.5).length,
					carrier = sv.some((o) => o.f && o.f.dy && near(o) < 6.5);
				if (e.pcd <= 0 && (crowd >= 2 || carrier || sv.some((o) => near(o) < 4.8))) e.wantP = true;
				if (e.pcd > 0) e.wantP = false;
				out.pound = !!e.wantP;
				return out;
			}
			/* survivors: fetch TNT and deliver it, keep clear of the monster otherwise, sidestep tyres, dash through rings */
			/* a CPU mashes to break free at 3-5 taps a second (7 within 1.6 s gets it out) */
			if (e.gr) return { x: 0, y: 0, boost: Math.random() < dt * (e.mashR || (e.mashR = 3 + Math.random() * 2)) };
			let x = 0,
				z = 0;
			const go = (tx, tz, w) => {
				const dx = tx - e.x,
					dz = tz - e.z,
					l = Math.hypot(dx, dz) || 1;
				x += (dx / l) * w;
				z += (dz / l) * w;
			};
			const md = m ? Math.hypot(e.x - m.x, e.z - m.z) : 99;
			let edge = Math.min(MM.R * 0.72, this.edgeR(W, e.x, e.z, true) - 2.6);
			if (e.f.dy && m) go(m.x, m.z, 1.4);
			else {
				/* stick with the chosen crate while it's there, so two equally near crates don't flip the CPU back and forth */
				const ok = (c) => c && W.t >= c.ts && W.t < c.te - 1 && !W.claimed.has(c.id);
				let c = W.mm.crates.find((q) => q.id === e.tgC);
				if (!ok(c))
					c = W.mm.crates
						.filter(ok)
						.sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
				e.tgC = c ? c.id : null;
				if (c) {
					go(c.x, c.z, 1);
					/* a crate out near the edge: the edge pull mustn't fight the trip there */
					edge = Math.max(edge, Math.min(this.edgeR(W, c.x, c.z, true) - 1.6, Math.hypot(c.x, c.z) + 0.6));
				} else go(Math.cos(W.t * 0.4 + e.i * 2) * 8, Math.sin(W.t * 0.4 + e.i * 2) * 8, 0.6);
				if (m && md < (m.rad || 1.7) + 3) go(m.x, m.z, -1.8);
			}
			/* tyres: each CPU notices a given tyre only sometimes, and late, so aimed shots land */
			e.tyNote = e.tyNote || {};
			for (const t of W.tyLive || []) {
				if (!t.on) continue;
				const rx = e.x - t.x,
					rz = e.z - t.z,
					ahead = rx * t.dx + rz * t.dz,
					side = rx * -t.dz + rz * t.dx;
				if (ahead > 0 && ahead < 4.5 && Math.abs(side) < MM.TYR + 0.4) {
					if (e.tyNote[t.id] === undefined) e.tyNote[t.id] = Math.random() < 0.5;
					if (!e.tyNote[t.id]) continue;
					const sg = side >= 0 ? 1 : -1;
					x += -t.dz * sg * 1.6;
					z += t.dx * sg * 1.6;
				}
			}
			e.gyNote = e.gyNote || {};
			for (const q of W.gyLive || []) {
				if (W.t > q.t + 0.4 || Math.hypot(e.x - q.x, e.z - q.z) > 3.6) continue;
				if (e.gyNote[q.id] === undefined) e.gyNote[q.id] = Math.random() < 0.7;
				if (e.gyNote[q.id]) go(q.x, q.z, -2.2);
			}
			const r = Math.hypot(e.x, e.z),
				er = this.edgeR(W, e.x, e.z, true);
			if (r > edge) go(0, 0, ((r - edge) / Math.max(1, er - edge)) * 2);
			let boost = false;
			const g = W.gpLive;
			if (g && e.bcd <= 0) {
				const d = Math.hypot(e.x - g.x, e.z - g.z),
					eta = g.r > 0 ? (d - g.r) / MM.RING : g.slam - W.t + (d - 2.6) / MM.RING;
				if (e.dodgeId !== g.id) {
					e.dodgeId = g.id;
					e.dodgeRoll = Math.random() < 0.6;
					e.dodgeAt = -0.05 + Math.random() * 0.7;
				}
				if (e.dodgeRoll && eta < e.dodgeAt) {
					e.dodgeRoll = false;
					boost = true;
				}
			}
			/* smooth the steering (~0.25 s) so CPUs drive in arcs instead of flicking back and forth */
			const l = Math.hypot(x, z),
				k = 1 - Math.exp(-dt * 4);
			e.bsx = (e.bsx || 0) + ((l < 0.05 ? 0 : x / l) - (e.bsx || 0)) * k;
			e.bsz = (e.bsz || 0) + ((l < 0.05 ? 0 : z / l) - (e.bsz || 0)) * k;
			/* knocked about, or right at the rim: steer straight back towards the middle, like a player would */
			if ((e.slideT > 0 && r > er * 0.5) || r > er - 1.3) {
				e.bsx = -e.x / r;
				e.bsz = -e.z / r;
			}
			/* dodging the shockwave: dash inwards through the ring, never towards the edge */
			if (boost && g) {
				const d = Math.hypot(e.x - g.x, e.z - g.z) || 1;
				e.bsx = (g.x - e.x) / d;
				e.bsz = (g.z - e.z) / d;
			}
			const sl = Math.hypot(e.bsx, e.bsz);
			return sl < 0.05 ? { x: 0, y: 0, boost } : { x: e.bsx / sl, y: e.bsz / sl, boost };
		},
		botScore: (s) =>
			s === 0 ? rnd(4) * 100 + rnd(6) : rnd(2) ? 1000 + rnd(3) * 100 + 45 : rnd(3) * 100 + 10 + rnd(30),
	}),
});

/* Getaway (1 vs 3): a highway chase. The solo truck is an armoured cash truck (bigger, heavier) with BAGS cash bags on
   its roof; the other three are cops. Everyone cruises up the road (-z) on their own: the stick steers across the lanes,
   up / down speed up and brake within a band round V0. A cop's ram knocks one bag off (gone for good, +1 for that cop),
   then the truck can't lose another for IMM s. The truck's button drops an oil slick behind it: cops that drive into it
   spin out. Slower traffic (Rush Hour's cars, from the seed) fills the lanes for both sides; hitting a car costs speed.
   The truck escapes if it reaches the tunnel TL m up the road with any cash; the cops win by stripping every bag, or if
   time runs out first.
   Sync: the truck's device owns its bags (e.f.bg), shares lost bags as e.f.lb [[n, cop key]] (the cop's device credits
   it), oil slicks as e.f.oil [[id, x, z, t]] and the escape as e.f.esc; every device checks its own trucks against the
   traffic (a function of time) and the slicks. Rams come through the engine (collide / rth → onRammed on the truck's
   device). */
Object.assign(MG, {
	getaway: {
		name: "Getaway",
		kind: "arena",
		ctrl: "stick",
		team: "1v3",
		hi: true,
		unit: "bags",
		dur: 150,
		bare: true,
		/* dusk: the headlights, the cops' light bars and the helicopter's spotlight light up the road (glowing pools) */
		dusk: true,
		lt: { amb: 0.5, sun: 0.62, warm: 0.85, haze: 60 },
		bound: { t: "none" },
		/* cops: no roof ornaments or amber beacons, the light bar on the cab (the cash truck is rebuilt as "armour") */
		truckMode: "cop",
		/* camera shakes at 30% (the chase is busy enough) */
		shakeK: 0.3,
		/* the road: LANES lanes LW wide, ROADL long, the tunnel TL up it; traffic at CARV */
		LANES: 6,
		LW: 3.6,
		ROADL: 2500,
		TL: 2200,
		/* sections (metres up the road): a river bridge, roadworks with the two left lanes shut */
		BRIDGE: [800, 1160],
		WORKS: [1450, 1750],
		CARV: 9,
		CARCOL: MG.hop.CARCOL,
		/* traffic cars at CARS of Rush Hour's size; traffic waves (a car in every lane) met round these shares of the run */
		CARS: 0.85,
		WAVES: [0.13, 0.3, 0.48, 0.66, 0.84],
		/* the cash truck ramming a car: left with CARHIT of its speed, CARSLOW m/s off its top speed for CART s: no slowdown
		   now, just a nudge sideways (tried ~11 m, ~7 m, ~5 m and ~0.1 m lost a car) */
		CARHIT: 1,
		CARSLOW: 0,
		CART: 0,
		/* driving: cruise V0, the stick adds up to UP (truck) / UPC (cops) or takes off DN; lateral push LATA */
		V0: 16,
		UP: 6.5 /* the cash truck: 22.5 m/s top (was 21.5) */,
		UPC: 7.5 /* cops 1 m/s faster than the cash truck (23.5 vs 22.5 m/s top), so they can get past it to lay spikes */,
		DN: 6,
		LATA: 34,
		/* cash: BAGS on the truck, IMM s safe after losing one; oil: cooldown OILCD, lasts OILT, radius OILR */
		BAGS: 12 /* was 20 (the truck escaped every test game), then 10, 15, 12, 15, 10 */,
		IMM: 3,
		/* every button (oil, slam, harpoon, tricks) wakes up ARM s after the start */
		ARM: 4,
		/* slam (the truck's second button): cooldown SWCD; it hops SWHOP s, slams, and a shockwave ring runs out from it at
		   SWV m/s to SWR m, blasting every cop it reaches */
		SWCD: 11 /* was 10, then 12 */,
		SWHOP: 0.35,
		SWV: 22,
		SWR: 9,
		/* harpoon (the cops' main button): cooldown HPCD, reach HPR m within HPA rad of where it's aimed; the head flies 0.2 s,
		   then the cop is reeled in until HPT s (unless the truck swerves it off); reaching the truck = a hit (a bag off) */
		HPCD: 4,
		HPCDV: 2.5 /* after vaulting a car the harpoon reloads in HPCDV s instead */,
		HPR: 14 /* reach to a car (was 16, then 12.5) */,
		HPRT: 14 /* reach to the cash truck (was 9, then 12.5), and only from behind it */,
		/* spike strip: a cop at least SSA m ahead of the cash truck drops one with its main button, right under itself (SSB m back),
		   SSW wide across the road, lying SST s; driving over it costs the truck a bag (once a strip) */
		SSA: 4,
		LEAD: 12,
		SSB: 0,
		SSW: 7.6,
		SST: 7,
		/* the cash truck's SPEAR ("GET OVER HERE!", its third button, cooldown SPCD): it hits the nearest cop in front of it
		   (clear of its nose, within WHR m, anywhere across the road): the spear flies WHF s, then reels it into the truck's
		   nose over WHY s, where it crashes and spins out (WHS s). It was automatic (a cop WHA s in front) */
		SPCD: 15,
		WHR: 30,
		WHF: 0.3,
		WHY: 0.55,
		WHS: 1.2,
		WHH: 5 /* held up on the chain this long */,
		WHL: 0.7 /* then flung into the furthest guardrail for WHL s, landing WHB m behind the truck */,
		WHB: 4,
		HPA: 0.4,
		HPT: 0.9,
		/* each cop's second button is its own truck's trick (by TRUCKS[].kind): lobs land a hazard ZL s later in front of the
		   cash truck (radius r, gone after ZT s; "obj" ones smash when hit), the rest act on the cop itself or at the truck */
		ZL: 1,
		ZT: 8,
		/* lobs lead the cash truck by LOBLEAD s more than their flight, so they come down just in front of its nose (aimed at
		   where it would be on landing, most came down under it or just behind it) */
		LOBLEAD: 0.35,
		/* Steady Eddie's NAILS: a crate that bursts into nails; driving over them blows a tyre on that side: the truck pulls
		   that way at NAILP m/s² for NAILT s (counter-steer to go straight) */
		NAILT: 4,
		NAILP: 13,
		/* Taco Tina's SPICY: a hot-sauce bottle flies SPF s onto the cash truck from anywhere: its left and right swap for
		   SPT s (flames out of the exhaust) */
		SPF: 0.6,
		SPT: 2.2,
		/* Garbo's BINS: BN wheelie bins flung (BF s) onto the road BLEAD s ahead of the cash truck, BGAP m apart and BSIDE m
		   to one side of its lane, then rolling across it at BV m/s, BDLY s after each other: timed so they cross its lane as
		   it gets there (flung from the road's far edge they rolled past behind the truck); hitting one costs speed */
		BN: 4,
		BF: 0.8,
		BLEAD: 2,
		BGAP: 4,
		BSIDE: 7,
		BV: 6,
		BDLY: 0.2,
		/* Rusty's WRECKING BALL: a wrecked car on its crane cable swung round it for WBT s, out to WBR m at WBW rad/s, WBY m
		   up; it smashes traffic it meets and spins the cash truck out (WBS s) */
		WBT: 4,
		WBR: 5.5,
		WBW: 5 /* was 2.6 */,
		WBG: 14 /* it grabs the nearest traffic car within WBG m to swing (a crushed car of its own if there's none) */,
		WBY: 1.3,
		WBS: 1.4,
		/* Crusher's JUMP: JMPT s in the air at JMPV m/s over its top speed */
		JMPT: 1.2,
		JMPV: 15,
		/* a harpoon that catches a car instead: the cop vaults over it at VLV m/s faster than the traffic, landing VLX m past
		   it, VLTH m high (speed and distance 20% up from 22 / 7) */
		VLV: 26.4,
		VLX: 8.4,
		VLTH: 3.2,
		/* cooldowns by how hard a trick hits: self buffs and light knocks 7-8 s, slows and obstacles 11-12 s, the ones that
		   take the truck's control or spin it out 13-15 s (was 8-11 s for all) */
		AB: {
			pickup: { lbl: "NITRO", cd: 7 },
			monster: { lbl: "JUMP", cd: 8 },
			dump: { lbl: "GRAVEL", cd: 8, lob: "gravel", r: 2.1, obj: 1 },
			mail: { lbl: "PARCELS", cd: 8, lob: "parcel", r: 2.6, obj: 1 },
			icecream: { lbl: "SCOOPS", cd: 11, lob: "ice", r: 2.4 },
			garbage: { lbl: "BINS", cd: 11 },
			box: { lbl: "NAILS", cd: 12, lob: "nails", r: 2.4 },
			mixer: { lbl: "CEMENT", cd: 13, lob: "cement", r: 2.4 },
			food: { lbl: "SPICY", cd: 13 },
			fire: { lbl: "HOSE", cd: 14 },
			tanker: { lbl: "FUEL", cd: 14, lob: "fuel", r: 2.4 },
			tow: { lbl: "WRECK", cd: 15 },
		},
		/* a cop's ability (its truck's kind) */
		abOf(e) {
			const t = e && e.p && TRUCKS[e.p.truck];
			return Object.assign({ kind: (t && t.kind) || "pickup" }, this.AB[(t && t.kind) || "pickup"] || this.AB.pickup);
		},
		lobR(kind) {
			return (Object.values(this.AB).find((a) => a.lob === kind) || { r: 2.2 }).r;
		},
		/* Blaze's hose: soaked tyres lose their grip this long */
		HOSET: 2.2,
		OILCD: 8 /* was 7, then 9 */,
		OILT: 8,
		OILR: 1.9,
		how: "1 vs 3 highway chase! The cash truck has to reach the tunnel with any cash left; the cops harpoon it from close behind or get ahead and drop spikes to knock the money bags off.",
		teamHow: (s) =>
			s === 0
				? "You're the CASH TRUCK: reach the tunnel with cash left. CLAW grabs a cop in front of you and flings it into the wall; OIL spins them out behind you, SLAM blasts them away."
				: "You're a COP: HARPOON the cash truck from close behind, or get ahead of it and the same button drops SPIKES. Harpoon a car to vault over it!",
		stickHint: (fine) =>
			fine
				? "WASD or arrows: steer, up = faster, down = brake. Space: harpoon (cops) / oil (cash truck). E: your truck's trick / slam. R: claw (cash truck)."
				: "Drag to steer: up = faster, down = brake. Buttons: HARPOON + your truck's trick for cops, OIL + SLAM + CLAW for the cash truck.",
		ramLabel: (side) => (side === 0 ? "OIL" : "HARPOON"),
		/* only a cop being reeled in hits the truck (bumping into it does nothing to the bags) */
		canRam: (e) => e.side === 1 && !!e.reelOn,
		btn2(side, p) {
			return side === 0 ? "SLAM" : this.abOf({ p }).lbl;
		},
		btn2Cd(W) {
			const e = W.me,
				[t, cd] = e.side === 0 ? [e.swCd, this.SWCD] : [e.abCd, this.abOf(e).cd];
			if (this.dazed(W, e)) return 1;
			return Math.min(1, Math.max(0, ((t || 0) - W.t) / cd));
		},
		/* a cop spinning out (or in the cash truck's claw) can't use its buttons: they show dark meanwhile */
		dazed(W, e) {
			return e.side === 1 && (W.t < (e.spinT || 0) || !!e.yank);
		},
		/* the cash truck's third button: the SPEAR (dark while it reloads or while no cop is in front to hit) */
		btn3(side) {
			return side === 0 ? "CLAW" : null;
		},
		btn3Cd(W) {
			const e = W.me;
			if (e.side !== 0) return 0;
			const c = Math.min(1, Math.max(0, ((e.spCd || 0) - W.t) / this.SPCD));
			return c > 0 ? c : this.spearTarget(W, e) ? 0 : 1;
		},
		/* the cop the spear would hit: the nearest one clear in front of the truck's nose within WHR m */
		spearTarget(W, T) {
			let best = null,
				bd = 1e9;
			for (const c of W.list) {
				if (c.side !== 1 || c.gone || c.yank) continue;
				const lead = T.z - c.z;
				if (lead < T.hb[1] + c.hb[1] + 0.5 || lead > this.WHR) continue;
				const d = Math.hypot(c.x - T.x, lead);
				if (d < bd) {
					bd = d;
					best = c;
				}
			}
			return best;
		},
		/* firing it: shared as e.f.sr = [id, when, the cop's key]; the cop's own device reels it in */
		spear(W, e) {
			if (W.t < (e.spCd || 0) || e.d || e.esc) return;
			const c = this.spearTarget(W, e);
			if (!c) return;
			e.spCd = W.t + this.SPCD;
			e.spN = (e.spN || 0) + 1;
			e.f.sr = [e.spN, Math.round(W.t * 100) / 100, c.k];
			mgLog(W, `${mgName(e)} claws ${mgName(c)}`);
		},
		ramCd(W) {
			const e = W.me,
				[t, cd] = e.side === 0 ? [e.oilCd, this.OILCD] : [e.hpCd, this.HPCD];
			if (this.dazed(W, e)) return 1;
			return Math.min(1, Math.max(0, ((t || 0) - W.t) / cd));
		},
		ramReady(W) {
			const e = W.me;
			return !this.dazed(W, e) && W.t >= ((e.side === 0 ? e.oilCd : e.hpCd) || 0);
		},
		/* the sound packs it plays (sfxPack: a random take each time) and its synth sounds (sfx), for the 🔧 panel's Sound tab */
		PACKS: [
			"hit",
			"whip",
			"whimsy",
			"coin",
			"crunchy",
			"spike",
			"splash",
			"strip",
			"lob",
			"thud",
			"jump",
			"jumpboost",
			"speed",
		],
		SYNTH: ["go", "crack", "land", "windup", "fanfare"],
		kits() {
			MG.hop.kits.call(MG.hop);
			audLoad("music/pursuit.mp3");
			this.PACKS.forEach(sfxPackLoad);
		},
		lx(l) {
			return (l - (this.LANES - 1) / 2) * this.LW;
		},
		/* a car's z: up the road at CARV; a car squeezed over by a narrowing road (only a wave's cars ever are) drops back
		   5.5 m a lane it moves over, so it queues behind the car in the lane it merges into */
		carZ(W, c, t = W.t) {
			const z = c.z0 - this.CARV * Math.max(0, t);
			return c.wave ? z + (Math.abs(this.carX(W, c, z) - this.lx(c.l)) / this.LW) * 5.5 : z;
		},
		/* a car's x at z: its lane, squeezed in where the road narrows (it merges over along the bridge's tapers and the
		   roadworks, never drives inside a guardrail or barrier) */
		carX(W, c, z) {
			const [lo, hi] = this.edges(z);
			return Math.max(lo + 1.3, Math.min(hi - 1.3, this.lx(c.l)));
		},
		signTxt(z) {
			return `TUNNEL ${Math.max(0, Math.round(this.TL + z))} m ▲`;
		},
		/* the cash truck (side 0) */
		solo(W) {
			return W.list.find((e) => e.side === 0 && !e.gone) || null;
		},
		build(W) {
			const s = W.sc,
				wid = this.LANES * this.LW;
			this.road(W, wid);
			/* traffic from the seed: rows of 1-3 cars, always at least three lanes free; a row the pack meets in the
			   roadworks (it overtakes a car that started at z0 somewhere round 1.35-2.45 z0) stays out of the shut lanes */
			W.cars = [];
			/* each car type's half width / half length on the road (the models scaled by CARS), for the hit tests */
			W.carHB = {};
			const kits = {},
				/* traffic waves: WAVES times a run a row fills every lane (a rolling roadblock the cash truck has to ram
				   through), the pack meeting them round these shares of the road (a car at z0 is met near 1.8 z0); where
				   the road is narrower the cars in the shut lanes queue up behind the others (carZ) */
				waves = this.WAVES.map((f) => ((f + (W.rng() - 0.5) * 0.08) * this.TL) / 1.8);
			for (let z = -55; z > -this.TL + 25; z -= 15 + W.rng() * 12) {
				const meets = ([a, b], m0, m1) => -z * 2.45 > a - m0 && -z * 1.35 < b + m1,
					shut = meets(this.WORKS, 50, 10),
					narrow = meets(this.BRIDGE, this.TB + 10, this.TA + 5),
					wave = waves.length && -z >= waves[0],
					lanes = (wave || !(shut || narrow) ? [0, 1, 2, 3, 4, 5] : shut ? [2, 3, 4, 5] : [1, 2, 3, 4]).sort(
						() => W.rng() - 0.5,
					),
					nc = wave ? lanes.length : Math.min(shut || narrow ? 2 : 3, 1 + Math.floor(W.rng() * 2.4));
				if (wave) waves.shift();
				for (let k = 0; k < nc; k++) {
					const c = {
							id: W.cars.length,
							l: lanes[k],
							z0: z - W.rng() * (wave ? 1.2 : 4),
							c: this.CARCOL[Math.floor(W.rng() * this.CARCOL.length)],
						},
						ty = CAR_TYPES[c.id % 4];
					if (!kits[ty + c.c]) {
						const m = carModel(ty, c.c);
						if (!W.carHB[ty]) {
							const sz = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
							W.carHB[ty] = [(sz.x / 2) * this.CARS, (sz.z / 2) * this.CARS];
						}
						kits[ty + c.c] = bakeKit(m);
					}
					const g = kitGroup(kits[ty + c.c]);
					g.scale.setScalar(this.CARS);
					g.position.set(this.lx(c.l), 0, c.z0);
					s.add(g);
					c.g = g;
					c.hb = W.carHB[ty];
					if (wave) c.wave = this.WAVES.length - waves.length;
					W.cars.push(c);
				}
			}
			W.cars.sort((a, b) => b.z0 - a.z0);
			this.tunnel(W, wid);
			W.oilM = {};
			W.hpV = {};
			W.loose = [];
			this.streaks(W);
			W.heli = this.heliModel(W);
		},
		/* is z on the bridge (with its ends) */
		onBridge(z, m = 0) {
			return -z > this.BRIDGE[0] - m && -z < this.BRIDGE[1] + m;
		},
		/* the drivable width at z: the bridge carries the middle 4 lanes (guardrails taper in TB m before it and out TA m
		   after), the roadworks shut the two left lanes (a taper of cones in and out) */
		TB: 40,
		TA: 25,
		edges(z) {
			const hw = (this.LANES * this.LW) / 2,
				d = -z,
				[a, b] = this.WORKS,
				[c0, c1] = this.BRIDGE,
				lo2 = -hw + 2 * this.LW + 0.35,
				nb = this.LW * 2;
			let lo = -hw,
				hi = hw;
			if (d > a - 45 && d < a) lo = -hw + (lo2 + hw) * ((d - (a - 45)) / 45);
			else if (d >= a && d <= b) lo = lo2;
			else if (d > b && d < b + 20) lo = lo2 - (lo2 + hw) * ((d - b) / 20);
			let k = 0;
			if (d > c0 - this.TB && d < c0) k = (d - (c0 - this.TB)) / this.TB;
			else if (d >= c0 && d <= c1) k = 1;
			else if (d > c1 && d < c1 + this.TA) k = 1 - (d - c1) / this.TA;
			if (k) {
				hi = hw - (hw - nb) * k;
				lo = Math.max(lo, -hi);
			}
			return [lo, hi];
		},
		/* the highway: suburbs (houses, trees, guardrails) as in Rush Hour, then a bridge over a river (parapets, lamps,
		   piers, banks), more suburbs, roadworks (barriers, cones, light towers, a flashing arrow board) and the tunnel */
		road(W, wid) {
			const s = W.sc,
				L = this.ROADL,
				zc = -L / 2 + 30,
				hw = wid / 2,
				[b0, b1] = this.BRIDGE,
				[w0, w1] = this.WORKS,
				off = (z, m) => !this.onBridge(z, m),
				land = [
					[30, -b0],
					[-b1, -L + 30],
				];
			land.forEach(([za, zb]) => s.add(texBox(220, 0.4, za - zb, grassTex(), 10, 0, -0.25, (za + zb) / 2)));
			const nb = this.LW * 2,
				road = [
					[30, -b0, hw],
					[-b0, -b1, nb],
					[-b1, -L + 30, hw],
				];
			road.forEach(([za, zb, h]) => {
				s.add(texBox(2 * h + 1.4, 0.1, za - zb, asphaltTex(), 8, 0, 0.05, (za + zb) / 2));
				roadWear(s, -h - 0.7, h + 0.7, za, zb, 0.101, 0.8);
			});
			autoTracks(W, "#9DA0A6", 0.112);
			land.forEach(([za, zb]) =>
				vergeScatter(
					s,
					[
						[-hw - 13, -hw - 1.5],
						[hw + 1.5, hw + 13],
					],
					za,
					zb,
					Math.round((3600 * (za - zb)) / 1070),
					[-1, 1].flatMap((sd) =>
						Array.from({ length: Math.floor((za - zb - 10) / 8) }, (_, i) => [sd * (hw + 1.35), za - 10 - i * 8]),
					),
					-0.05,
				),
			);
			/* guardrails on land, and along the tapers to and from the bridge (each post on the slanted line) */
			const rails = [
				[30, -(b0 - this.TB)],
				[-(b1 + this.TA), -L + 30],
			];
			[-1, 1].forEach((sd) => {
				rails.forEach(([za, zb]) => s.add(B(0.2, 0.5, za - zb, "#C9CED8", sd * (hw + 1.1), 0.75, (za + zb) / 2)));
				for (let z = 20; z > -L + 30; z -= 4)
					if (z > rails[0][1] || z < rails[1][0]) s.add(B(0.16, 0.7, 0.16, "#8E96A3", sd * (hw + 1.1), 0.35, z));
				[
					[-(b0 - this.TB), -b0],
					[-b1, -(b1 + this.TA)],
				].forEach(([za, zb]) => {
					const xa = this.edges(za + 0.01)[1] + 1.1,
						xb = this.edges(zb - 0.01)[1] + 1.1,
						len = Math.hypot(xa - xb, za - zb),
						rail = B(0.2, 0.5, len, "#C9CED8", (sd * (xa + xb)) / 2, 0.75, (za + zb) / 2);
					rail.rotation.y = Math.atan2(sd * (xa - xb), za - zb);
					s.add(rail);
					for (let u = 0; u <= 1.001; u += 4 / (za - zb))
						s.add(B(0.16, 0.7, 0.16, "#8E96A3", sd * (xa + (xb - xa) * u), 0.35, za + (zb - za) * u));
				});
			});
			/* hatched paint where the outer lanes close up before the bridge and open again after it */
			const hatch = canvasTex(64, 64, (x, w, h) => {
				x.strokeStyle = "#F4F6F9";
				x.lineWidth = 12;
				for (let i = -2; i < 4; i++) {
					x.beginPath();
					x.moveTo(i * 32, h);
					x.lineTo(i * 32 + h, 0);
					x.stroke();
				}
			});
			hatch.wrapS = hatch.wrapT = THREE.RepeatWrapping;
			hatch.repeat.set(1 / 3, 1 / 3);
			[
				[-(b0 - this.TB), -b0],
				[-(b1 + this.TA), -b1],
			].forEach(([za, zb]) =>
				[-1, 1].forEach((sd) => {
					const sh = new THREE.Shape();
					sh.moveTo(sd * hw, -za);
					sh.lineTo(sd * hw, -zb);
					sh.lineTo(sd * nb, -zb);
					sh.closePath();
					const m = new THREE.Mesh(
						new THREE.ShapeGeometry(sh),
						new THREE.MeshBasicMaterial({
							map: hatch,
							transparent: true,
							opacity: 0.8,
							depthWrite: false,
							polygonOffset: true,
							polygonOffsetFactor: -2,
						}),
					);
					m.rotation.x = -Math.PI / 2;
					m.position.y = 0.106;
					s.add(m);
				}),
			);
			road.forEach(([za, zb, h], j) => {
				roadLines(s, [-(h + 0.35), h + 0.35], za, zb, 0.104);
				roadLines(
					s,
					Array.from({ length: (h * 2) / this.LW - 1 }, (_, i) => (i + 1) * this.LW - h),
					j ? za : 21.3,
					zb,
					0.104,
					{ dash: 2.6, gap: 3.4 },
				);
			});
			for (let z = -60; z > -L + 30; z -= 140) {
				if (!off(z, 6)) continue;
				s.add(B(0.4, 7, 0.4, "#5A6272", -hw - 2, 3.5, z), B(0.4, 7, 0.4, "#5A6272", hw + 2, 3.5, z));
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
							x.fillText(this.signTxt(z), w / 2, h / 2 + 2);
						}),
					}),
				);
				sg.position.set(0, 6.6, z + 0.25);
				s.add(sg, B(wid + 4, 0.4, 0.3, "#5A6272", 0, 6.6, z - 0.1));
			}
			const homes = [],
				spots = [];
			[-1, 1].forEach((sd) => {
				for (let z = 10, k = 0; z > -L + 30; z -= 22, k++) {
					if (!off(z, 34)) continue;
					/* the roadworks' compound sits on the left verge there */
					if (sd < 0 && -z > w0 - 10 && -z < w1 + 10) continue;
					homes.push({
						k: (k + (sd > 0 ? 1 : 0) * 2) % 4,
						x: sd > 0 ? hw + 9.5 + (k % 3) * 1.5 : -(hw + 7.7 + (k % 3) * 1.5),
						y: -0.05,
						z,
						ry: 0,
					});
					const tx = sd * (hw + 6 + (k % 2) * 2.5),
						hx = homes[homes.length - 1].x,
						tr = tree(tx, z - 9, 1, k % 3);
					tr.position.y = -0.05;
					s.add(tr);
					spots.push([tx, z - 9], [hx - 3.1, z + 2.6], [hx + 3.1, z + 2.6], [hx - 4.65, z + 7.9], [hx + 4.65, z + 7.9]);
				}
			});
			placeKits(s, houseKits(), homes, 0.3, 120);
			vergeScatter(s, [], 0, 0, 0, spots, -0.05);
			this.bridge(W, wid);
			this.works(W, wid);
		},
		/* the bridge: a concrete deck over a river, parapets with a steel rail, lamp posts (warm pools on the road),
		   piers into the water, grassy banks down to it */
		bridge(W, wid) {
			const s = W.sc,
				hw = this.LW * 2,
				[b0, b1] = this.BRIDGE,
				bl = b1 - b0,
				zc = -(b0 + b1) / 2,
				CON = "#A3ACBB";
			wid = hw * 2;
			/* pylons at both ends, one each side, cables fanning down to the parapets */
			[-(b0 + 28), -(b1 - 28)].forEach((zt, j) =>
				[-1, 1].forEach((sd) => {
					const px = sd * (hw + 2.7);
					s.add(B(1.3, 26, 1.7, "#C9CED8", px, 5.5, zt), B(1.6, 0.5, 2, "#A3ACBB", px, 18.7, zt));
					s.add(B(1.5, 0.35, 1.9, "#E5484D", px, 17.2, zt));
					for (let k = 1; k <= 5; k++)
						[-1, 1].forEach((dir) => {
							const zz = zt + dir * k * 13;
							if (-zz < b0 + 4 || -zz > b1 - 4) return;
							strut(s, [px, 16.6 - k * 0.9, zt], [sd * (hw + 1.15), 1.35, zz], 0.07, "#E8ECF2", 1);
						});
				}),
			);
			s.add(B(wid + 3.4, 1.3, bl + 4, CON, 0, -0.62, zc));
			[-1, 1].forEach((sd) => {
				s.add(B(0.15, 1.5, bl + 4, "#8E96A3", sd * (hw + 1.75), -0.65, zc));
				s.add(B(0.45, 0.95, bl + 4, "#B8BEC8", sd * (hw + 1.15), 0.5, zc));
				s.add(B(0.14, 0.12, bl + 4, "#7C8593", sd * (hw + 1.15), 1.32, zc));
				for (let z = -b0; z > -b1; z -= 3) s.add(B(0.08, 0.3, 0.08, "#7C8593", sd * (hw + 1.15), 1.12, z));
			});
			/* lamp posts, staggered, each with a pool of light on the road */
			const lampM = M("#FFE6B8", { emissive: "#FFD58A", emissiveIntensity: 1.6 }),
				glow = this.glowTex(W);
			for (let i = 0, z = -b0 - 18; z > -b1 + 10; z -= 36, i++) {
				const sd = i % 2 ? 1 : -1,
					px = sd * (hw + 1.15);
				s.add(Cy(0.08, 0.11, 6, 8, "#5A6272", px, 3.97, z));
				s.add(B(1.6, 0.1, 0.12, "#5A6272", px - sd * 0.75, 6.95, z));
				const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.32), lampM);
				head.position.set(px - sd * 1.45, 6.87, z);
				s.add(head);
				const pool = new THREE.Mesh(
					new THREE.PlaneGeometry(7, 7),
					new THREE.MeshBasicMaterial({
						map: glow,
						color: "#FFD9A0",
						transparent: true,
						opacity: 0.32,
						depthWrite: false,
						blending: THREE.AdditiveBlending,
					}),
				);
				pool.rotation.x = -Math.PI / 2;
				pool.position.set(px - sd * 2.6, 0.125, z);
				pool.renderOrder = 2;
				pool.userData.fx = 1;
				s.add(pool);
			}
			/* piers: two columns on a footing, a cap beam under the deck */
			for (let z = -b0 - 45; z > -b1 + 30; z -= 60) {
				[-1, 1].forEach((sd) => {
					s.add(Cy(0.85, 0.95, 7.6, 12, "#9AA1AC", sd * (hw - 2.6), -5.05, z));
					s.add(B(2.4, 0.6, 2.4, "#8E96A3", sd * (hw - 2.6), -7.3, z));
				});
				s.add(B(wid - 1, 0.9, 2.2, "#9AA1AC", 0, -1.72, z));
			}
			/* abutments where the deck meets the banks */
			[-b0, -b1].forEach((z) => s.add(B(wid + 4.4, 3.2, 3, "#9AA1AC", 0, -1.85, z)));
			/* the river and its grassy banks */
			const water = new THREE.Mesh(
				new THREE.PlaneGeometry(400, bl + 10),
				new THREE.MeshStandardMaterial({ color: "#2E6C8A", roughness: 0.22, metalness: 0.12 }),
			);
			water.rotation.x = -Math.PI / 2;
			water.position.set(0, -7, zc);
			s.add(water);
			[
				[-b0 - 15, -0.23],
				[-b1 + 15, 0.23],
			].forEach(([z, a]) => {
				const bank = texBox(220, 1, 31.5, grassTex(), 10, 0, -4.1, z);
				bank.rotation.x = a;
				s.add(bank);
			});
			/* foam round the piers */
			for (let z = -b0 - 45; z > -b1 + 30; z -= 60)
				[-1, 1].forEach((sd) => {
					const f = new THREE.Mesh(
						new THREE.RingGeometry(0.95, 1.6, 16),
						new THREE.MeshBasicMaterial({ color: "#D9EEF5", transparent: true, opacity: 0.45, depthWrite: false }),
					);
					f.rotation.x = -Math.PI / 2;
					f.position.set(sd * (hw - 2.6), -6.97, z);
					s.add(f);
				});
		},
		/* the roadworks: red and white barriers along the shut lanes, tapers of cones in and out, a flashing arrow board,
		   fresh dark asphalt, light towers, dirt piles and cones in the compound on the verge */
		works(W, wid) {
			const s = W.sc,
				hw = wid / 2,
				[w0, w1] = this.WORKS,
				bx = -hw + 2 * this.LW + 0.1,
				barrier = (col) => {
					const g = new THREE.Group();
					g.add(B(0.55, 0.22, 1.9, col, 0, 0.11, 0), B(0.36, 0.56, 1.8, col, 0, 0.5, 0));
					g.add(B(0.38, 0.1, 1.82, "#F4F6F9", 0, 0.62, 0));
					return bakeKit(g, { ao: false });
				},
				cone = () => {
					const g = new THREE.Group();
					g.add(B(0.44, 0.05, 0.44, "#23272F", 0, 0.025, 0), Cy(0.03, 0.2, 0.62, 10, "#FF8A1F", 0, 0.36, 0));
					g.add(Cy(0.115, 0.14, 0.09, 10, "#F4F6F9", 0, 0.4, 0));
					return bakeKit(g, { ao: false });
				},
				kits = [barrier("#E5484D"), barrier("#F4F6F9"), cone()],
				list = [];
			for (let i = 0, z = -w0; z > -w1; z -= 1.95, i++) list.push({ k: i % 2, x: bx, y: 0.1, z, ry: 0 });
			/* tapers: cones on the diagonal from the left edge to the barrier line */
			for (let d = 0; d <= 45; d += 3)
				list.push({ k: 2, x: -hw + 0.5 + ((bx + hw - 0.5) * d) / 45, y: 0.1, z: -(w0 - 45 + d), ry: 0 });
			for (let d = 0; d <= 20; d += 2.5)
				list.push({ k: 2, x: bx - ((bx + hw - 0.5) * d) / 20, y: 0.1, z: -(w1 + d), ry: 0 });
			/* in the shut lanes: cones scattered, dirt piles */
			const rr = mulberry((W.mg.seed || 1) + 77);
			for (let z = -w0 - 12; z > -w1 + 10; z -= 9 + rr() * 8) {
				list.push({ k: 2, x: -hw + 1 + rr() * (2 * this.LW - 2.5), y: 0.1, z, ry: 0 });
				if (rr() < 0.4) {
					const pile = Cy(0.2, 1.3, 0.9, 9, "#8A6A48", -hw + 1.8 + rr() * 3, 0.55, z - 3);
					s.add(pile);
				}
			}
			placeKits(s, kits, list, 0.3, 120);
			/* fresh asphalt over the shut lanes */
			s.add(B(2 * this.LW - 0.2, 0.012, w1 - w0, "#2A2E35", -hw + this.LW - 0.05, 0.106, -(w0 + w1) / 2));
			/* flashing lamps on every fourth barrier, and the arrow board in the taper */
			W.wLamp = M("#FFB547", { emissive: "#FF9A1F", emissiveIntensity: 1.4 }).clone();
			for (let z = -w0; z > -w1; z -= 7.8) {
				const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), W.wLamp);
				l.position.set(bx, 0.85, z);
				s.add(l);
			}
			const arrow = new THREE.Mesh(
				new THREE.PlaneGeometry(2.2, 1.5),
				new THREE.MeshStandardMaterial({
					map: canvasTex(128, 88, (x, w, h) => {
						x.fillStyle = "#151B24";
						x.fillRect(0, 0, w, h);
						x.fillStyle = "#FFB547";
						for (let i = 0; i < 9; i++) {
							x.beginPath();
							x.arc(14 + i * 11, h / 2, 4, 0, 6.3);
							x.fill();
						}
						[
							[96, 22],
							[106, 33],
							[96, 66],
							[106, 55],
						].forEach(([cx, cy]) => {
							x.beginPath();
							x.arc(cx, cy, 4, 0, 6.3);
							x.fill();
						});
					}),
					emissive: "#FFFFFF",
					emissiveIntensity: 0.9,
				}),
			);
			arrow.material.emissiveMap = arrow.material.map;
			arrow.position.set(-hw + 1.8, 2.2, -(w0 - 6));
			W.wArrow = arrow;
			s.add(
				arrow,
				B(2.4, 1.7, 0.18, "#3A3F48", -hw + 1.8, 2.2, -(w0 - 6) - 0.12),
				B(0.14, 1.4, 0.14, "#3A3F48", -hw + 1.8, 0.7, -(w0 - 6) - 0.12),
			);
			s.add(B(2, 0.5, 1.6, "#FFC83D", -hw + 1.8, 0.3, -(w0 - 6) - 0.5));
			/* the compound on the left verge: light towers (with pools), a site cabin */
			const glow = this.glowTex(W);
			[0.25, 0.7].forEach((u, i) => {
				const z = -(w0 + (w1 - w0) * u),
					t = lightTowerModel();
				t.position.set(-hw - 5.5, -0.05, z);
				t.rotation.y = Math.PI / 2;
				s.add(t);
				const pool = new THREE.Mesh(
					new THREE.PlaneGeometry(12, 12),
					new THREE.MeshBasicMaterial({
						map: glow,
						color: "#FFF1D0",
						transparent: true,
						opacity: 0.3,
						depthWrite: false,
						blending: THREE.AdditiveBlending,
					}),
				);
				pool.rotation.x = -Math.PI / 2;
				pool.position.set(-hw + 1.5, 0.125, z);
				pool.renderOrder = 2;
				pool.userData.fx = 1;
				s.add(pool);
				if (i === 0) {
					const c = siteCabinModel("#FFC83D", "#3D424C", "SITE");
					c.position.set(-hw - 9, -0.05, z - 14);
					c.rotation.y = Math.PI / 2;
					s.add(c);
				}
			});
			/* a warning sign ahead of it on the left verge */
			const sign = new THREE.Mesh(
				new THREE.PlaneGeometry(1.7, 1.7),
				new THREE.MeshBasicMaterial({
					map: canvasTex(128, 128, (x, w, h) => {
						x.translate(w / 2, h / 2);
						x.rotate(Math.PI / 4);
						x.fillStyle = "#151B24";
						x.fillRect(-44, -44, 88, 88);
						x.fillStyle = "#FFC83D";
						x.fillRect(-39, -39, 78, 78);
						x.rotate(-Math.PI / 4);
						x.fillStyle = "#151B24";
						x.font = "17px Bungee, 'Arial Black', Impact, sans-serif";
						x.textAlign = "center";
						x.textBaseline = "middle";
						x.fillText("ROAD", 0, -9);
						x.fillText("WORKS", 0, 11);
					}),
					transparent: true,
				}),
			);
			sign.position.set(-hw - 2.4, 2.4, -(w0 - 160));
			s.add(sign, B(0.12, 2.4, 0.12, "#5A6272", -hw - 2.4, 1.2, -(w0 - 160) - 0.1));
		},
		/* the tunnel: a concrete portal into a grassy hill, its name on the beam, amber lamps */
		tunnel(W, wid) {
			const s = W.sc,
				z = -this.TL,
				hw = wid / 2 + 1.6;
			s.add(texBox(wid + 120, 18, 140, grassTex(), 10, 0, 8.6, z - 72));
			s.add(B(wid + 40, 6, 40, "#5E9E4F", 0, 19, z - 50));
			[-1, 1].forEach((sd) => {
				s.add(B(3.2, 10, 3.4, "#9AA1AC", sd * (hw + 1.6), 5, z));
				s.add(B(0.5, 10.2, 3.5, "#C9CED8", sd * (hw + 0.05), 5, z));
			});
			s.add(B(wid + 9.6, 2.6, 3.4, "#9AA1AC", 0, 8.7, z));
			s.add(B(wid + 3.2, 7.4, 0.3, "#07090D", 0, 3.7, z - 1.55));
			for (let i = 0; i < 6; i++) {
				const m = B(0.9, 0.25, 0.3, "#FFB547", -wid / 2 + 2 + (i * (wid - 4)) / 5, 7.2, z + 1.8, {
					emissive: "#FF9A1F",
					emissiveIntensity: 1.4,
				});
				s.add(m);
			}
			const sg = new THREE.Mesh(
				new THREE.PlaneGeometry(wid * 0.6, 1.6),
				new THREE.MeshBasicMaterial({
					map: canvasTex(512, 72, (x, w, h) => {
						x.font = "52px Bungee, 'Arial Black', Impact, sans-serif";
						x.textAlign = "center";
						x.textBaseline = "middle";
						x.fillStyle = "#151B24";
						x.fillText("BORDER TUNNEL", w / 2, h / 2 + 3);
					}),
					transparent: true,
				}),
			);
			sg.position.set(0, 8.7, z + 1.75);
			s.add(sg);
		},
		/* the cash truck leads in the middle; the cops line up behind */
		spawn(W, i) {
			const e = W.list[i];
			if (e && e.side === 0) return { x: 0, z: -14, yaw: Math.PI / 2 };
			const solo = W.list[0] && W.list[0].side === 0,
				j = solo ? i - 1 : i;
			return { x: [-5.4, 5.4, 0, -9, 9][j % 5], z: 0, yaw: Math.PI / 2 };
		},
		initEnt(W, e) {
			e.vx = e.vz = 0;
			e.oilHit = {};
			e.hitC = {};
			e.oilCd = e.swCd = e.hpCd = e.abCd = e.spCd = this.ARM;
			if (e.side === 0) {
				e.bags = this.BAGS;
				/* the first half of the bags hang in the right-hand nets, the rest in the left (top tier first if there is one, rear first): e.bm = the ones still on */
				e.bm = (1 << this.BAGS) - 1;
				e.lbN = 0;
				e.snapA = {};
				e.mass = 3.2;
				e.rad = 1.6;
				/* the armoured version of its own truck (buildTruck mode "armour"), a size up */
				const sc = 0.8 * 1.45;
				e.g.remove(e.tr);
				e.tr = buildTruck(e.p.truck, "armour");
				e.tr.scale.setScalar(sc);
				e.g.add(e.tr);
				e.g.children.forEach((o) => {
					if (o.isSprite) o.position.y = 3.8;
				});
				e.f = { bg: this.BAGS, bm: e.bm, lb: [], oil: [], sp: [], hs: [], esc: 0 };
			} else {
				e.f = {};
			}
			this.hitBox(e);
		},
		/* the hitbox: the truck's own body as a box (e.hb = [half width, half length] on the road, which the engine's
		   collide uses instead of the round e.rad), measured before the light bar or bag nets go on */
		hitBox(e) {
			const tr = e.tr,
				par = tr.parent;
			if (par) par.remove(tr);
			tr.updateMatrixWorld(true);
			const sz = new THREE.Box3().setFromObject(tr).getSize(new THREE.Vector3());
			if (par) par.add(tr);
			/* the model points along +x: its z is the truck's width */
			e.hb = [(sz.z / 2) * 0.95, (sz.x / 2) * 0.95];
		},
		/* driving: cruise up the road; the stick steers and sets the speed; the button rams (cops) or drops oil (truck) */
		phys(W, e, inp, dt) {
			const solo = e.side === 0,
				T = solo ? null : this.solo(W),
				/* catch-up: a cop more than 30 m behind the truck cruises faster and gets extra top speed (up to 8 m/s; was 12
				   from 27 m), so the pack stays together (and on the TV); vaulting cars is the quick way back */
				lag = T ? e.z - T.z - 30 : 0,
				cu = lag > 0 ? Math.min(8, lag * 0.3) : 0,
				/* and the other way: a cop more than LEAD m ahead of the truck loses top speed the further it gets (up to 9
				   m/s), so it hangs about 15-25 m ahead (spike range, still on screen with the truck) instead of racing off */
				ld = T ? T.z - e.z - this.LEAD : 0,
				ldk = ld > 0 ? Math.min(9, ld * 0.5) : 0,
				hooks = solo ? this.hooks(W, e) : [],
				/* the cash truck: slowed a moment after a hit, by a hook on it, in cement / gravel / trash; a cop: on nitro */
				nitro = !solo && W.t < (e.nitroT || 0),
				slow = solo
					? (W.t < (e.hitSlowT || 0) ? 3 : 0) +
						(W.t < (e.cemT || 0) ? 9 : 0) +
						(W.t < (e.gravT || 0) ? 5 : 0) +
						(W.t < (e.trashT || 0) ? 4 : 0) +
						(W.t < (e.blowT || 0) ? 2 : 0) +
						(W.t < (e.carT || 0) ? this.CARSLOW : 0) +
						Math.min(2, hooks.length) * 2
					: 0,
				top = this.V0 + (solo ? this.UP : this.UPC) + cu - ldk - slow + (nitro ? (e.f.nt && e.f.nt[1] ? 14 : 12) : 0),
				low = this.V0 - this.DN,
				on = inp && !e.d;
			if (!solo && T && e.yank && this.yankStep(W, e, T, dt)) {
				if (inp) inp.boost = inp.b2 = inp.b3 = false;
				return;
			}
			let fv = -e.vz;
			const thr = on ? -(inp.y || 0) : 0,
				want = Math.min(
					top,
					cu + (thr >= 0 ? this.V0 + thr * Math.max(0, top - cu - this.V0) : this.V0 + thr * (this.V0 - low)),
				),
				acc = (nitro ? 30 : W.t < (e.crT || 0) ? 5 : 11) * dt,
				ice = solo && W.t < (e.iceT || 0);
			fv += Math.max(-acc, Math.min(acc, (nitro ? top : want) - fv));
			/* on ice cream the steering hardly bites and the truck drifts */
			/* too spicy: left and right swapped; a blown tyre: it pulls to that side */
			if (on) e.vx += (inp.x || 0) * (solo && W.t < (e.spicyT || 0) ? -1 : 1) * this.LATA * (ice ? 0.35 : 1) * dt;
			if (solo && W.t < (e.blowT || 0)) e.vx += e.blowSd * this.NAILP * dt;
			if (ice) e.vx += Math.sin(W.t * 4 + e.i) * 7 * dt;
			e.slideT = Math.max(0, (e.slideT || 0) - dt);
			e.bcd = Math.max(0, (e.bcd || 0) - dt);
			e.boostT = Math.max(0, (e.boostT || 0) - dt);
			const dazed = this.dazed(W, e);
			if (on && inp.boost && !dazed) {
				if (solo) this.oil(W, e);
				else this.harpoon(W, e, inp);
			}
			if (on && inp.b2 && !dazed) {
				if (solo) this.slam(W, e);
				else this.ability(W, e);
			}
			if (on && inp.b3 && solo) this.spear(W, e);
			if (inp) inp.boost = inp.b2 = inp.b3 = false;
			/* the harpoon drags the truck towards each cop holding it, and a hard swerve away (moving away fast for 0.3 s)
			   snaps the line */
			hooks.forEach(({ c, id }) => {
				const sd = c.x > e.x ? 1 : -1,
					away = -e.vx * sd;
				e.vx += sd * 3 * dt;
				const key = c.k + ":" + id;
				e.snapA[key] = away > 5.5 ? (e.snapA[key] || 0) + dt : Math.max(0, (e.snapA[key] || 0) - dt * 0.5);
				if (e.snapA[key] > 0.25 && !(c.f.hp && c.f.hp[4])) {
					e.f.hs = (e.f.hs || []).concat([[c.k, id]]).slice(-6);
					mgLog(W, `${mgName(e)} snaps ${mgName(c)}'s harpoon`);
				}
			});
			/* a cop whose harpoon holds is reeled in: flung at the truck; touching it is the hit (the engine's ram), then
			   the line lets go */
			e.reelOn = !!(!solo && T && this.hookOn(W, e, T));
			if (e.reelOn) {
				const dx = T.x - e.x,
					dz = T.z - e.z,
					d = Math.hypot(dx, dz) || 1,
					sp = e.f.hp[4] ? 30 : 24;
				e.vx = (T.vx || 0) + (dx / d) * sp;
				fv = -((T.vz || 0) + (dz / d) * sp);
				e.boostT = Math.max(e.boostT, 0.15);
				if (Math.abs(dx) < e.hb[0] + T.hb[0] + 0.35 && Math.abs(dz) < e.hb[1] + T.hb[1] + 0.35 && !e.reelHitT)
					e.reelHitT = W.t;
				if (e.reelHitT && W.t - e.reelHitT > 0.12) {
					e.f.hr = e.f.hp[0];
					e.reelOn = false;
					e.slideT = 0.6;
				}
			} else e.reelHitT = 0;
			/* the harpoon vault: slung up and over the car it caught, lined up with it on the way up, landing past it */
			const vt = e.vault,
				vk = vt ? (W.t - vt.t) / vt.dur : -1,
				vault = vk >= 0 && vk < 1;
			if (vault) {
				fv = Math.max(fv, this.CARV + this.VLV);
				if (vk < 0.5) e.vx = (this.carX(W, vt.car, this.carZ(W, vt.car)) - e.x) * 5;
			} else if (vk >= 1) e.vault = null;
			/* JUMP (Crusher): a long leap up the road, over the traffic */
			const jump = !solo && W.t < (e.jumpT ?? -9) + this.JMPT,
				air = jump || vault;
			if (jump) fv = Math.max(fv, top + this.JMPV);
			/* spun out on oil: speed bleeds off, the truck slews */
			const spin = W.t < (e.spinT || 0);
			if (spin) {
				fv *= Math.exp(-1.6 * dt);
				e.vx += Math.sin(W.t * 9 + e.i) * 20 * dt;
			}
			e.vx *= Math.exp(-(ice ? 0.35 : e.slideT > 0 || spin ? 1.2 : 3.4) * dt);
			const mx = e.reelOn ? 32 : e.boostT > 0 || W.t < (e.blastT || 0) || vault ? 20 : ice ? 12 : 9;
			e.vx = Math.max(-mx, Math.min(mx, e.vx));
			fv = Math.max(0, Math.min(e.reelOn ? 60 : top + (air ? this.JMPV : e.boostT > 0 ? 12 : 0), fv));
			e.vz = -fv;
			e.x += e.vx * dt;
			e.z += e.vz * dt;
			/* guardrails (and the roadworks' barriers) */
			const [lo, hi] = this.edges(e.z),
				rr = e.hb[0];
			if (e.x > hi - rr || e.x < lo + rr) {
				e.x = e.x > hi - rr ? hi - rr : lo + rr;
				e.vx *= -0.4;
				/* a light scrub (by time, not per frame): a slanted rail guides you in rather than stopping you */
				e.vz *= Math.exp(-0.25 * dt);
			}
			e.yaw = spin ? e.yaw + 11 * dt : lerpA(e.yaw, Math.atan2(-e.vz, e.vx), Math.min(1, dt * 8));
			if (!air) this.traffic(W, e);
			if (solo) this.hazards(W, e, dt);
			e.f.t = Math.round(W.t * 100) / 100;
		},
		/* a clawed cop: the claw flies WHF s (it keeps driving), then it's reeled in (WHY s) and held clamped right in front
		   of the truck's nose for WHH s (no control: pushed along like a plough; the engine doesn't collide the two, see
		   noCollide), then flung across the road into the furthest guardrail (WHL s), where it crashes and spins out WHS s,
		   WHB m behind the truck; true while the claw has it */
		yankStep(W, e, T, dt) {
			const Y = e.yank,
				a = W.t - Y.t - this.WHF,
				hold = this.WHY + this.WHH,
				nose = -(T.hb[1] + e.hb[1] + 0.25);
			if (a < 0) return false;
			e.vx = 0;
			e.vz = T.vz || 0;
			e.y = 0;
			e.f.t = Math.round(W.t * 100) / 100;
			if (a >= hold + this.WHL) {
				/* into the wall */
				e.yank = null;
				e.vz = (T.vz || -18) * 0.45;
				e.vx = -Y.fd * 3;
				e.spinT = W.t + this.WHS;
				e.slideT = 0.6;
				e.crT = W.t + this.WHS + 0.5;
				mgLog(W, `${mgName(e)} flung into the guardrail by the cash truck`);
				if (e.isMe) {
					W.shake = 0.7;
					buzz(140);
				}
				return false;
			}
			if (a >= hold) {
				/* flung across the road to the guardrail furthest from it, low and fast */
				if (Y.hx === undefined) {
					const [lo, hi] = this.edges(e.z);
					Y.hx = e.x;
					Y.hz = e.z - T.z;
					Y.fd = hi - e.x > e.x - lo ? 1 : -1;
					Y.fx = Y.fd > 0 ? hi - e.hb[0] : lo + e.hb[0];
				}
				const k = (a - hold) / this.WHL;
				e.x = Y.hx + (Y.fx - Y.hx) * (1 - (1 - k) * (1 - k));
				e.z = T.z + Y.hz + (this.WHB - Y.hz) * k;
				e.y = Math.sin(k * Math.PI) * 1.2;
				e.yaw += (dt || 0.016) * 14 * Y.fd;
				return true;
			}
			if (a >= this.WHY) {
				/* clamped right in front of the nose, on the road */
				e.x = T.x;
				e.z = T.z + nose;
				e.yaw = Math.PI / 2;
				return true;
			}
			if (Y.x0 === undefined) {
				Y.x0 = e.x;
				Y.z0 = e.z - T.z;
			}
			/* reeled in, faster and faster */
			const k = a / this.WHY;
			e.x = Y.x0 + (T.x - Y.x0) * k * k;
			e.z = T.z + Y.z0 + (nose - Y.z0) * k * k;
			return true;
		},
		/* the engine's truck-to-truck pushes leave the cash truck and the cop its claw has alone (it holds it right against
		   its nose) */
		noCollide(W, a, b) {
			const T = this.solo(W),
				sr = T && T.f && T.f.sr,
				c = a === T ? b : b === T ? a : null;
			if (!c || !sr || sr[2] !== c.k) return false;
			const age = W.t - sr[1];
			return age >= 0 && age < this.WHF + this.WHY + this.WHH + this.WHL;
		},
		/* bumping into a car: thrown out beside it, down to below the traffic's speed for a moment */
		traffic(W, e) {
			const [hw, hl] = e.hb || [0.6, 0.9];
			for (const c of W.cars) {
				if (c.held) continue;
				const cz = this.carZ(W, c);
				if (cz > e.z + 5) continue;
				if (cz < e.z - 5) {
					/* (a wave car queued behind its row can be later in the list: look 12 m further) */
					if (cz < e.z - 17) break;
					continue;
				}
				if (c.kT !== undefined) {
					/* a car the cash truck sent flying: it wrecks any cop in its way while it's still low over the road */
					const kp = this.carPos(W, c);
					if (
						e.side === 1 &&
						W.t - c.kT < 1.6 &&
						kp.y < 1.6 &&
						Math.abs(e.x - kp.x) < c.hb[0] + hw + 0.3 &&
						Math.abs(e.z - kp.z) < c.hb[1] + hl &&
						W.t - (e.hitC[c.id] ?? -9) > 1.5
					) {
						e.hitC[c.id] = W.t;
						e.vx = c.kd * 10;
						e.vz *= 0.35;
						e.spinT = W.t + 1;
						e.slideT = 0.8;
						e.crT = W.t + 1.4;
						this.letGo(W, e, "flying car");
						mgLog(W, `${mgName(e)} hit by a flying car`);
						e.lastHit = { k: "flying car", t: W.t };
						if (e.isMe) W.shake = 0.6;
						if (this.heard(W, e)) sfxPack("hit");
					}
					continue;
				}
				const cx = this.carX(W, c, cz),
					dx = e.x - cx;
				if (Math.abs(dx) > c.hb[0] + hw || Math.abs(e.z - cz) > c.hb[1] + hl) continue;
				let sd = dx >= 0 ? 1 : -1;
				/* the cash truck just shoves cars off the road (shared as e.f.tk, so every screen sees it fly) */
				if (e.side === 0) {
					c.kT = W.t;
					c.kd = -sd;
					e.f.tk = (e.f.tk || []).concat([[c.id, Math.round(W.t * 100) / 100, -sd]]).slice(-8);
					/* the crunch costs it: CARHIT of its speed gone, then CARSLOW m/s off its top speed and half the
					   acceleration for CART s (cops catch up), nudged away from the car */
					if (e.vz < -8) e.vz = Math.min(-8, e.vz * this.CARHIT);
					e.carT = W.t + this.CART;
					e.crT = Math.max(e.crT || 0, e.carT);
					e.vx += sd * 2.5;
					if (c.wave && e.waveLog !== c.wave) {
						e.waveLog = c.wave;
						mgLog(W, `${mgName(e)} rams through traffic wave ${c.wave} at ${Math.round(-e.z)} m`);
					}
					if (e.isMe) W.shake = Math.max(W.shake || 0, 0.25);
					this.carFx(W, c, e);
					continue;
				}
				/* scraping along a car's side (more overlap along the road than across it): just pushed out beside it with a
				   light nudge, no speed lost, so squeezing between two cars and touching one doesn't ping-pong you between
				   them */
				const ox = c.hb[0] + hw - Math.abs(dx),
					oz = c.hb[1] + hl - Math.abs(e.z - cz);
				if (ox < oz * 0.6) {
					e.x = cx + sd * (c.hb[0] + hw + 0.02);
					e.vx = sd * Math.min(1.2, Math.max(0, sd * e.vx) + 0.6);
					continue;
				}
				/* driving into its back: thrown out beside the car (never through a guardrail or barrier: no room there, the
				   other side) and slowed */
				{
					const [lo, hi] = this.edges(e.z),
						nx = cx + sd * (c.hb[0] + hw + 0.1);
					if (nx > hi - hw || nx < lo + hw) sd = -sd;
				}
				e.x = cx + sd * (c.hb[0] + hw + 0.1);
				e.vx = sd * 3;
				e.vz = -(this.CARV - 3);
				e.slideT = 0.3;
				e.crT = W.t + 1.2;
				if (W.t - (e.hitC[c.id] ?? -9) > 1.5) {
					e.hitC[c.id] = W.t;
					mgLog(W, `${mgName(e)} hits traffic`);
					e.lastHit = { k: "traffic", t: W.t };
					if (e.isMe) W.shake = 0.45;
				}
			}
		},
		/* where a car is (a knocked one flies sideways off the road: across the lanes, up, landing in the field) */
		carPos(W, c) {
			const z = this.carZ(W, c);
			if (c.kT === undefined) return { x: this.carX(W, c, z), y: 0, z };
			const a = Math.max(0, W.t - c.kT),
				s = Math.min(1, a / 1.4);
			const x = this.carX(W, c, this.carZ(W, c, c.kT)) + c.kd * (16 * s - 4 * s * s),
				zz = z + a * 4,
				drop = this.onBridge(zz) && Math.abs(x) > (this.LANES * this.LW) / 2 + 1.5;
			return { x, y: drop ? Math.max(-9, 5 * a - 6 * a * a) : Math.max(0, 5 * a - 6 * a * a), z: zz };
		},
		/* a car knocked off the road: glass and bits, a crunch */
		carFx(W, c, by) {
			const z = this.carZ(W, c),
				x = this.carX(W, c, z);
			burst(W.sc, x, 0.9, z, {
				n: 14,
				shape: "cube",
				cols: [c.c, "#C9CED8", "#9FD8F0"],
				spd: 5,
				up: 5,
				life: 0.8,
				size: 0.7,
			});
			if (by && (W.split || this.heard(W, by))) sfxPack("hit");
		},
		/* the cash truck's oil slick, a few metres behind it */
		oil(W, e) {
			if (W.t < (e.oilCd || 0) || e.d) return;
			e.oilCd = W.t + this.OILCD;
			e.oilN = (e.oilN || 0) + 1;
			const r = (v) => Math.round(v * 100) / 100;
			e.f.oil = e.f.oil.concat([[e.oilN, r(e.x), r(e.z + 3.2), r(W.t)]]).slice(-4);
			mgLog(W, `${mgName(e)} drops oil`);
			if (this.heard(W, e)) sfxPack("splash");
		},
		/* the cash truck's slam: a hop, then a shockwave ring round it (shared as e.f.sw = [id, time pressed]) */
		slam(W, e) {
			if (W.t < (e.swCd || 0) || e.d) return;
			e.swCd = W.t + this.SWCD;
			e.swN = (e.swN || 0) + 1;
			e.f.sw = [e.swN, Math.round(W.t * 100) / 100];
			mgLog(W, `${mgName(e)} slams`);
			if (this.heard(W, e)) sfx("windup");
		},
		/* the slam's ring right now: {id, slam time, r} (r < 0 while the truck is still in the air), or null */
		ring(W, T) {
			const w = T && T.f && T.f.sw;
			if (!w) return null;
			const slam = w[1] + this.SWHOP,
				r = W.t >= slam ? 1.6 + (W.t - slam) * this.SWV : -1;
			return r > this.SWR + 1.5 ? null : { id: w[0], t0: w[1], slam, r };
		},
		/* a cop's harpoon: hooks the cash truck if it's within reach (shared as e.f.hp = [id, t, hooked]) */
		harpoon(W, e, inp) {
			if (W.t < (e.hpCd || 0) || e.d) return;
			e.hpCd = W.t + this.HPCD;
			const rd = (v) => Math.round(v * 100) / 100,
				T = this.solo(W);
			/* ahead of the cash truck: the button drops a spike strip across the road behind the cop instead */
			if (this.ahead(W, e, T)) {
				e.ssN = (e.ssN || 0) + 1;
				const z = e.z + this.SSB,
					[lo, hi] = this.edges(z),
					x = Math.max(lo + this.SSW / 2 - 0.3, Math.min(hi - this.SSW / 2 + 0.3, e.x));
				e.f.ss = (e.f.ss || []).concat([[e.ssN, rd(x), rd(z), rd(W.t)]]).slice(-3);
				mgLog(W, `${mgName(e)} drops a spike strip ${Math.round(T.z - e.z - this.SSB)} m ahead of the truck`);
				if (this.heard(W, e)) sfxPack("strip");
				return;
			}
			e.hpN = (e.hpN || 0) + 1;
			/* aimed up the road, swung by the stick: it hooks the cash truck only from behind it (within HPRT m), any car
			   ahead within HPR m */
			const aim = Math.atan2(1, ((inp && inp.x) || 0) * 0.7),
				rg = this.HPR,
				rt = this.HPRT,
				cone = this.HPA;
			let hit = 0;
			const inCone = (x, z, r = rg) =>
				Math.hypot(x - e.x, z - e.z) < r && Math.abs(wrapA(Math.atan2(-(z - e.z), x - e.x) - aim)) < cone;
			if (T && !(T.f && T.f.esc) && T.z < e.z - 1) hit = inCone(T.x, T.z, rt) ? 1 : 0;
			/* missed the truck: the nearest car ahead in the cone catches it instead, and the cop vaults over it */
			let car = null;
			if (!hit) {
				let best = 1e9;
				for (const c of W.cars) {
					if (c.kT !== undefined) continue;
					const cz = this.carZ(W, c);
					if (cz > e.z + 1) continue;
					if (cz < e.z - rg - 12) break;
					/* any part of the car in the cone counts, not just its middle: reach and aim widened by its size */
					const cx = this.carX(W, c, cz),
						d = Math.hypot(cx - e.x, cz - e.z),
						off = Math.abs(wrapA(Math.atan2(-(cz - e.z), cx - e.x) - aim));
					if (d < best && d > 1 && d < rg + c.hb[1] && off < cone + Math.atan2(c.hb[0] + 0.4, d)) {
						best = d;
						car = c;
					}
				}
			}
			e.f.hp = [e.hpN, rd(W.t), hit, rd(aim), 0];
			if (car) {
				/* the vault: from the moment the head bites (0.2 s) the cop is in the air VLT s, slung forward over the car */
				const d = Math.hypot(this.carX(W, car, this.carZ(W, car)) - e.x, this.carZ(W, car) - e.z),
					dur = rd(Math.max(0.7, Math.min(1.3, (d + this.VLX) / this.VLV)));
				e.f.hp.push(car.id);
				e.hpCd = W.t + this.HPCDV;
				e.vault = { t: W.t + 0.2, dur, car };
				e.f.vt = [rd(W.t + 0.2), dur];
			}
			mgLog(W, `${mgName(e)} fires the harpoon (${hit ? "hooked" : car ? "vaults a car" : "missed"})`);
			if (this.heard(W, e)) sfxPack("whip");
		},
		/* who hears a truck's own sounds: its player, the TV for every truck (the CPUs too), and any player within HEARR m
		   of it (the 🔧 panel's Hear range: SFXT.hear) */
		HEARR: 30,
		heard(W, e) {
			const R = SFXT.hear ?? this.HEARR;
			return !!(e.isMe || W.tv || (W.me && Math.hypot(W.me.x - e.x, W.me.z - e.z) < R));
		},
		/* far enough ahead of the cash truck that the main button drops spikes */
		ahead(W, e, T) {
			return !!(T && !(T.f && T.f.esc) && e.z < T.z - this.SSA);
		},
		/* a cop's second button: its truck's trick */
		ability(W, e) {
			const A = this.abOf(e);
			if (W.t < (e.abCd || 0) || e.d) return;
			e.abCd = W.t + A.cd;
			e.abN = (e.abN || 0) + 1;
			const rd = (v) => Math.round(v * 100) / 100,
				T = this.solo(W);
			if (A.lob) {
				/* lobbed to land in front of the cash truck (where it'll be in ZL s), however far back the cop is (up the
				   road ahead of the cop only if there's no cash truck) */
				let tx = e.x,
					tz = e.z - 18;
				if (T) {
					tz = T.z + Math.min(T.vz || -18, -12) * (this.ZL + this.LOBLEAD);
					tx = T.x + (T.vx || 0) * this.ZL * 0.4;
				}
				const [lo, hi] = this.edges(tz);
				tx = Math.max(lo + 1, Math.min(hi - 1, tx));
				e.f.zn = (e.f.zn || []).concat([[e.abN, A.lob, rd(tx), rd(tz), rd(W.t), rd(e.x), rd(e.z)]]).slice(-3);
			} else if (A.kind === "pickup") {
				e.nitroT = W.t + 2.2;
				e.f.nt = [rd(e.nitroT), 0];
			} else if (A.kind === "food") {
				/* the hot-sauce bottle: [id, thrown at, from x, from z] */
				e.f.sp = [e.abN, rd(W.t), rd(e.x), rd(e.z)];
			} else if (A.kind === "garbage") {
				/* the bins: [id, thrown at, row z, roll direction, from x, from z, start x] */
				if (T) {
					const z0 = T.z + Math.min(T.vz || -18, -12) * this.BLEAD,
						/* rolling in from the side with more road (from up against the edge they cross its lane too early) */
						dir = Math.abs(T.x) < 2 ? (Math.random() < 0.5 ? 1 : -1) : T.x > 0 ? 1 : -1,
						[lo, hi] = this.edges(z0);
					e.f.rb = [
						e.abN,
						rd(W.t),
						rd(z0),
						dir,
						rd(e.x),
						rd(e.z),
						rd(Math.max(lo + 0.6, Math.min(hi - 0.6, T.x - dir * this.BSIDE))),
					];
				}
			} else if (A.kind === "monster") {
				e.jumpT = W.t;
				e.f.jp = rd(W.t);
			} else if (A.kind === "fire") e.f.wj = [e.abN, rd(W.t)];
			else if (A.kind === "tow") {
				/* the wrecking ball: [id, swung at, start angle (behind it), turning direction (towards the truck first)] */
				/* ... and the traffic car it grabs (its id, -1 = none near: it swings its own crushed car) */
				let pick = -1,
					bd = this.WBG;
				for (const c of W.cars) {
					if (c.kT !== undefined) continue;
					const cz = this.carZ(W, c);
					if (Math.abs(cz - e.z) > bd) continue;
					const d = Math.hypot(this.carX(W, c, cz) - e.x, cz - e.z);
					if (d < bd) {
						bd = d;
						pick = c.id;
					}
				}
				e.f.wb = [e.abN, rd(W.t), rd(Math.PI * 1.5), T && T.x < e.x ? 1 : -1, pick];
				mgLog(W, `${mgName(e)} swings ${pick >= 0 ? "a traffic car" : "its own wreck"}`);
			}
			mgLog(W, `${mgName(e)}: ${A.lbl}`);
			/* thrown tricks (the lobs, the sauce bottle, the bins) a soft throw; Crusher's jump and the nitro sound in trickFx */
			if (this.heard(W, e) && A.kind !== "pickup" && A.kind !== "monster")
				if (A.lob || A.kind === "food" || A.kind === "garbage") sfxPack("lob");
				else sfx("go");
		},
		/* on the cash truck's device: the cops' hazards in its way (once each), and Blaze's hose */
		hazards(W, e, dt) {
			e.zHit = e.zHit || {};
			for (const c of W.list) {
				if (c.side !== 1 || c.gone || !c.f) continue;
				(c.f.zn || []).forEach(([id, kind, x, z, t]) => {
					const key = c.k + ":" + id,
						a = W.t - t - this.ZL;
					/* for tools/watch.mjs: where it came down, measured from the truck (ahead of it +, beside it) */
					if (a >= 0 && !(e.zLand || (e.zLand = {}))[key]) {
						e.zLand[key] = 1;
						mgLog(W, `${kind} lands ${Math.round(e.z - z)} m ahead, ${Math.round(Math.abs(e.x - x))} m beside`);
					}
					if (a < 0 || a > this.ZT || e.zHit[key] || Math.hypot(e.x - x, e.z - z) > this.lobR(kind) + 0.9) return;
					e.zHit[key] = 1;
					const A = Object.values(this.AB).find((q) => q.lob === kind);
					if (A && A.obj) e.f.zh = (e.f.zh || []).concat([key]).slice(-12);
					if (kind === "ice") e.iceT = W.t + 2.2;
					else if (kind === "cement") e.cemT = W.t + 2;
					else if (kind === "gravel") e.gravT = W.t + 1.5;
					else if (kind === "trash") e.trashT = W.t + 3;
					else if (kind === "nails") {
						/* the tyre on the side the nails were on blows (straight over them: either side) */
						e.blowT = W.t + this.NAILT;
						e.blowSd = Math.abs(x - e.x) > 0.3 ? Math.sign(x - e.x) : id % 2 ? 1 : -1;
						e.f.bl = [Math.round(W.t * 100) / 100, e.blowSd];
					} else if (kind === "fuel") {
						e.spinT = W.t + 0.9;
						e.vz *= 0.8;
					} else {
						e.vx += (e.x > x ? 1 : -1) * 7;
						e.vz *= 0.82;
						e.slideT = 0.5;
					}
					mgLog(W, `${mgName(e)} hits ${mgName(c)}'s ${kind}`);
					if (e.isMe) W.shake = 0.35;
					/* nails: the blown tyre's own sound (render) */
					if (this.heard(W, e) && kind !== "nails") sfxPack(A && A.obj ? "spike" : "splash");
				});
				/* Taco Tina's hot sauce: always lands, SPF s after the throw; left and right swap for SPT s */
				const sp = c.f.sp;
				if (sp && W.t >= sp[1] + this.SPF && W.t < sp[1] + this.SPF + 0.5 && !e.zHit[c.k + ":p" + sp[0]]) {
					e.zHit[c.k + ":p" + sp[0]] = 1;
					e.spicyT = W.t + this.SPT;
					mgLog(W, `${mgName(e)} gets ${mgName(c)}'s hot sauce`);
					if (this.heard(W, e)) sfxPack("splash");
				}
				/* Rusty's wrecking ball: the swinging car hits the truck once a swing: it spins out */
				const wb = c.f.wb,
					wp = this.wbPos(W, c);
				if (wp && wp.a > 0.3 && !e.zHit[c.k + ":wb" + wb[0]] && Math.hypot(e.x - wp.x, e.z - wp.z) < e.hb[0] + 1.3) {
					e.zHit[c.k + ":wb" + wb[0]] = 1;
					const d = Math.hypot(e.x - c.x, e.z - c.z) || 1;
					e.spinT = W.t + this.WBS;
					e.vz *= 0.7;
					e.vx += ((e.x - c.x) / d) * 9;
					e.slideT = 0.8;
					mgLog(W, `${mgName(e)} spun out by ${mgName(c)}'s wrecking ball`);
					if (e.isMe) W.shake = 0.6;
					if (this.heard(W, e)) sfxPack("hit");
				}
				/* Garbo's bins: bumping one while it rolls costs speed and sends it flying (shared as e.f.bh) */
				const rb = c.f.rb;
				if (rb)
					for (let i = 0; i < this.BN; i++) {
						const key = c.k + ":b" + rb[0] + ":" + i,
							b = this.binPos(W, rb, i);
						if (!b || b.fly || e.zHit[key]) continue;
						if (Math.abs(e.x - b.x) > e.hb[0] + 0.55 || Math.abs(e.z - b.z) > e.hb[1] + 0.55) continue;
						e.zHit[key] = 1;
						e.f.bh = (e.f.bh || []).concat([key]).slice(-12);
						/* only the first bin of a throw costs speed, the others just knock it about */
						if (!e.zHit[c.k + ":bt" + rb[0]] && e.vz < -8) e.vz = Math.min(-8, e.vz * 0.75);
						e.zHit[c.k + ":bt" + rb[0]] = 1;
						e.vx += (e.x >= b.x ? 1 : -1) * 4;
						e.slideT = 0.4;
						mgLog(W, `${mgName(e)} hits one of ${mgName(c)}'s bins`);
						if (e.isMe) W.shake = 0.3;
						if (this.heard(W, e)) sfxPack("hit");
					}
				/* spike strips: driving over one costs a bag (credited to the cop who dropped it), unless the shield is up */
				(c.f.ss || []).forEach(([id, x, z, t]) => {
					const key = c.k + ":s" + id;
					if (W.t - t < 0.25 || W.t - t > this.SST || e.zHit[key]) return;
					if (Math.abs(e.z - z) > e.hb[1] + 0.45 || Math.abs(e.x - x) > this.SSW / 2 + e.hb[0] - 0.2) return;
					e.zHit[key] = 1;
					if (W.t < (e.immT || 0) || e.esc) return;
					mgLog(W, `${mgName(e)} drives over ${mgName(c)}'s spike strip`);
					this.onRammed(W, e, c);
					if (e.isMe) W.shake = 0.4;
					if (this.heard(W, e)) sfxPack("spike");
				});
				/* the hose: the blast reaches the truck from any distance (like the lobs) once the jet is out: knocked sideways, and soaked
				   tyres lose their grip for HOSET s (the ice cream's slide: steering hardly bites, it drifts) */
				const wj = c.f.wj;
				if (wj && W.t - wj[1] < 1.3 && W.t >= wj[1] + 0.15 && !e.zHit[c.k + ":w" + wj[0]]) {
					e.zHit[c.k + ":w" + wj[0]] = 1;
					e.vx += (e.x >= c.x ? 1 : -1) * 9;
					e.iceT = Math.max(e.iceT || 0, W.t + this.HOSET);
					e.f.wt = Math.round(W.t * 100) / 100;
					mgLog(W, `${mgName(e)} soaked by ${mgName(c)}'s hose`);
					if (e.isMe) W.shake = 0.3;
					if (this.heard(W, e)) sfxPack("splash");
				}
			}
		},
		/* is cop c's harpoon holding truck T right now (flying out takes 0.2 s, then it reels until HPT s, unless it let go
		   or T snapped it) */
		hookOn(W, c, T) {
			const h = c.f && c.f.hp;
			if (!h || !h[2] || W.t < h[1] + 0.2 || W.t > h[1] + this.HPT) return false;
			return c.f.hr !== h[0] && !((T.f && T.f.hs) || []).some(([k, id]) => k === c.k && id === h[0]);
		},
		/* a cop knocked about (oil, the slam, a flying car) loses its grip: its harpoon lets go (shared as e.f.hr = that
		   harpoon's id) */
		letGo(W, e, why) {
			const T = this.solo(W);
			if (!T || !e.f.hp || !this.hookOn(W, e, T)) return;
			e.f.hr = e.f.hp[0];
			mgLog(W, `${mgName(e)} lets go of the harpoon (${why})`);
		},
		hooks(W, T) {
			return W.list.filter((c) => c.side === 1 && !c.gone && this.hookOn(W, c, T)).map((c) => ({ c, id: c.f.hp[0] }));
		},
		/* a cop rams the cash truck (on the truck's device): one bag off (from the side it was hit on), unless it lost one
		   just now */
		onRammed(W, e, by) {
			if (e.side !== 0 || !by || by.side !== 1 || e.esc || e.bags <= 0 || W.t < (e.immT || 0)) return;
			const lz = (by.x - e.x) * Math.sin(e.yaw) + (by.z - e.z) * Math.cos(e.yaw),
				half = Math.ceil(this.BAGS / 2),
				all = Array.from({ length: this.BAGS }, (_, i) => i),
				order = lz >= 0 ? all : all.slice(half).concat(all.slice(0, half)),
				slot = order.find((i) => e.bm & (1 << i));
			e.bm &= ~(1 << slot);
			e.bags--;
			e.immT = W.t + this.IMM;
			e.lbN++;
			e.f.bg = e.bags;
			e.f.bm = e.bm;
			e.f.lb = e.f.lb.concat([[e.lbN, by.k, slot]]).slice(-6);
			e.f.im = Math.round(e.immT * 100) / 100;
			e.vz *= 0.85;
			e.hitSlowT = W.t + 1;
			fb(W, e, "−1 💰", { tone: "bad" });
			mgLog(W, `${mgName(by)} knocks a bag off ${mgName(e)} (${e.bags} left)`);
			if (!e.bags) fb(W, e, "STRIPPED!", { stamp: true });
		},
		rules(W, e, dt) {
			if (e.d) return;
			const T = this.solo(W),
				tf = (T && T.f) || {};
			/* the cash truck reaches the tunnel */
			if (e === T && e.z < -this.TL && e.bags > 0 && !e.esc) {
				e.esc = W.t;
				e.f.esc = 1;
				fb(W, e, "ESCAPED!", { stamp: true });
				mgLog(W, `${mgName(e)} escapes with ${e.bags} bags`);
				if (this.heard(W, e)) sfx("fanfare");
			}
			if (e.side === 1 && T) {
				/* a bag this cop knocked off (the truck's device decides) */
				(tf.lb || []).forEach(([n, k]) => {
					if (k !== e.k || n <= (e.lbSeen || 0)) return;
					e.lbSeen = n;
					e.sc++;
					fb(W, e, "+1 💰", { tone: "good" });
					/* (unless it hears the truck losing it: render) */
					if (e.isMe && !this.heard(W, T)) sfxPack("coin");
				});
				/* the slam's shockwave: once the ring reaches you (or has passed you, if the news came late) you're blasted
				   away from the truck: thrown sideways, a cop behind it knocked back, a moment of spin, the harpoon lets go */
				const ring = this.ring(W, T);
				if (ring && ring.r > 0 && e.swHit !== ring.id) {
					const dx = e.x - T.x,
						dz = e.z - T.z,
						d = Math.hypot(dx, dz) || 0.01;
					if (d < this.SWR + 1 && d <= ring.r + 0.8) {
						e.swHit = ring.id;
						const nx = dx / d,
							nz = dz / d;
						e.vx += nx * 18;
						e.vz += Math.max(0, nz) * 14;
						e.blastT = W.t + 0.6;
						e.slideT = 0.8;
						e.spinT = W.t + 0.5;
						e.crT = W.t + 1;
						this.letGo(W, e, "shockwave");
						mgLog(W, `${mgName(e)} blasted by the slam`);
						e.lastHit = { k: "slam", t: W.t };
						if (e.isMe) {
							W.shake = 0.5;
							buzz(90);
						}
					}
				}
				/* the wrecking ball smashes traffic in its way */
				const wp = this.wbPos(W, e);
				if (wp && wp.a > 0.3)
					for (const c of W.cars) {
						if (c.kT !== undefined) continue;
						const cz = this.carZ(W, c);
						if (Math.abs(cz - wp.z) > c.hb[1] + 1 || Math.abs(this.carX(W, c, cz) - wp.x) > c.hb[0] + 1) continue;
						const kd = this.carX(W, c, cz) >= e.x ? 1 : -1;
						c.kT = W.t;
						c.kd = kd;
						e.f.wk = (e.f.wk || []).concat([[c.id, Math.round(W.t * 100) / 100, kd]]).slice(-8);
						this.carFx(W, c, e);
					}
				/* the cash truck's spear aimed at this cop (tf.sr = [id, when, cop key]): reeled into its nose */
				const sr = tf.sr;
				if (sr && sr[2] === e.k && e.srSeen !== sr[0] && W.t - sr[1] < this.WHF + this.WHY) {
					e.srSeen = sr[0];
					e.yank = { t: sr[1], sd: e.x >= T.x ? 1 : -1 };
					this.letGo(W, e, "speared");
					mgLog(W, `${mgName(e)} clawed and reeled in by the cash truck`);
					e.lastHit = { k: "spear", t: W.t };
				}
				/* oil slicks */
				(tf.oil || []).forEach(([id, x, z, t]) => {
					if (W.t - t > this.OILT || e.oilHit[id] || Math.hypot(e.x - x, e.z - z) > this.OILR) return;
					e.oilHit[id] = 1;
					e.spinT = W.t + 1.1;
					e.vz *= 0.6;
					this.letGo(W, e, "oil");
					mgLog(W, `${mgName(e)} spins out on oil`);
					if (e.isMe) W.shake = 0.3;
					if (this.heard(W, e)) sfxPack("whimsy");
				});
			}
			/* it's over once the truck is through the tunnel or has nothing left (a moment later, so it shows) */
			const over = tf.esc || (tf.bg !== undefined && tf.bg <= 0);
			if (over && e.dT === undefined) e.dT = W.t + 1.5;
			if (e.dT !== undefined && W.t >= e.dT) e.d = true;
		},
		timeUp() {},
		stop(W) {
			if (W.wind) W.wind.stop();
			if (W.musOn === 1 && MUS.track) musStop(0.6);
		},
		/* truck: 1000 if it escaped + bags left; cops: bags knocked off */
		final(W, e) {
			return e.side === 0 ? (e.esc ? 1000 : 0) + e.bags : e.sc;
		},
		fmtE(W, e) {
			if (e.side === 0) return `💰 ${e.local ? e.bags : e.f && e.f.bg !== undefined ? e.f.bg : this.BAGS}`;
			return `+${Math.round(e.sc)} 💰`;
		},
		fmtTeam(v, s) {
			if (s === 0) return v >= 1000 ? `Escaped with ${v - 1000} 💰` : v > 0 ? `Caught with ${v} 💰` : "Stripped clean";
			return `${v} 💰 knocked off`;
		},
		teamWin(res, tm) {
			const k = Object.keys(tm).find((q) => tm[q] === 0);
			return k in res && res[k] >= 1000 ? 0 : 1;
		},
		botScore: (s) => (s === 0 ? (rnd(2) ? 1000 + 1 + rnd(7) : 0) : rnd(4)),
		/* the top chip: how far the tunnel is */
		clock(W) {
			const T = this.solo(W);
			return T ? `Tunnel ${Math.max(0, Math.round(this.TL + T.z))} m` : "";
		},
		/* cameras: yours from behind and above, looking up the road; the TV follows the whole pack */
		cam(W, tgt, pos, far) {
			if (W.tv) {
				/* the chase is about the cash truck: the trucks within 25 m ahead of it to 60 m behind it (a cop racing far
				   ahead or a straggler far back drops out of the shot, the truck never does) */
				const T = this.solo(W),
					L = W.list.filter((e) => !e.gone && (!T || (e.z > T.z - 25 && e.z < T.z + 60))),
					zs = (L.length ? L : W.list).map((e) => e.z),
					z0 = Math.min(...zs),
					z1 = Math.max(...zs),
					sp = z1 - z0;
				/* a fixed tilt (35 degrees down) at the middle of the pack, pulled back as its length grows (hl = half the
				   pack) so both ends stay in view */
				const hl = Math.min(sp / 2 + 6, 48),
					zc = (z0 + z1) / 2,
					a = 0.62,
					D = Math.max(26, hl * 2 + 6),
					t = new THREE.Vector3(0, 0, zc),
					p = new THREE.Vector3(0, D * Math.sin(a), zc + D * Math.cos(a));
				return [t, p];
			}
			const e = W.me,
				x = e.x * 0.85,
				t = new THREE.Vector3(x, 0, e.z - 13 * far),
				p = new THREE.Vector3(x, 11.5 * far, e.z + 13.5 * far);
			return [t, p];
		},
		/* visuals: traffic moving, the bags on the truck's roof, light bars on the cops, oil slicks, lost bags */
		render(W, e, dt) {
			this.scene(W, dt);
			const f = e.f || {};
			this.truckLights(W, e);
			/* grinding along the guardrail: sparks (and a grind for your own truck) */
			const [lo, hi] = this.edges(e.z),
				rr = e.hb ? e.hb[0] : 0.6;
			if (W.t > 0 && !e.gone && Math.hypot(e.vx || 0, e.vz || 0) > 5) {
				if (e.x > hi - rr - 0.03) this.sparks(W, e, hi + 0.1, e.z);
				else if (e.x < lo + rr + 0.03) this.sparks(W, e, lo - 0.1, e.z);
			}
			/* the slam: the truck hops, nose up a touch, and comes down hard */
			if (e.side === 0 && f.sw && W.t >= f.sw[1] && W.t < f.sw[1] + this.SWHOP) {
				const k = (W.t - f.sw[1]) / this.SWHOP;
				e.g.position.y += Math.sin(k * Math.PI) * 1.1;
				e.tr.rotation.z += Math.sin(k * Math.PI) * 0.12;
			}
			/* another device's truck: projected on by the update's real age (its game time e.f.t, clocks are synced), the
			   engine's guess doesn't know how old an update is and at highway speed every 0.1 s is 2 m */
			if (!e.local && e.net && f.t !== undefined) {
				const n = e.net,
					age = Math.max(0, Math.min(0.6, W.t - f.t)),
					k = Math.min(1, dt * 18);
				e.x += (n.x + (n.vx || 0) * age - e.x) * k;
				e.z += (n.z + (n.vz || 0) * age - e.z) * k;
			}
			if (e.side === 0) {
				if (!e.slots) this.bagNets(W, e);
				/* a tyre blown by Steady Eddie's nails (e.f.bl = [when, side]): it leans onto that side, the rim throws sparks */
				if (f.bl && W.t >= f.bl[0] && W.t < f.bl[0] + this.NAILT) {
					const sd = f.bl[1];
					if (e.blSeen !== f.bl[0]) {
						e.blSeen = f.bl[0];
						burst(W.sc, e.x + sd * e.hb[0], 0.5, e.z, {
							n: 14,
							shape: "cube",
							cols: ["#2A2E36", "#3D424C"],
							spd: 5,
							up: 4,
							grav: 14,
							life: 0.7,
							size: 0.8,
						});
						if (W.split || this.heard(W, e)) sfxPack("spike");
					}
					e.tr.rotation.x += sd * 0.07;
					if (Math.random() < dt * 12) this.sparks(W, e, e.x + sd * e.hb[0], e.z + 0.8);
				}
				/* soaked by Blaze's hose (e.f.wt): water streams off it while its tyres have no grip */
				if (f.wt !== undefined && W.t >= f.wt && W.t < f.wt + this.HOSET && Math.random() < dt * 30)
					burst(W.sc, e.x + (Math.random() - 0.5) * 2, 1.6 + Math.random(), e.z + (Math.random() - 0.5) * 2.4, {
						n: 2,
						shape: "ico",
						cols: ["#9FD8F0", "#D9EEF5", "#5AA9FF"],
						spd: 1,
						up: 0.5,
						grav: 9,
						life: 0.45,
						size: 0.7,
					});
				const n = e.local ? e.bags : (f.bg ?? this.BAGS),
					bm = e.local ? e.bm : (f.bm ?? (1 << this.BAGS) - 1);
				e.slots.forEach((q, i) => {
					const on = !!(bm & (1 << i));
					q.bag.visible = on;
					q.net.visible = on || !q.top;
					if (on !== q.on) {
						q.on = on;
						/* full: the net hugs the bag; empty: it hangs slack, flat on the fender and over its edge */
						q.net.scale.set(on ? 1 : 1.2, on ? 0.86 : 0.2, on ? 1 : 1.25);
						q.net.position.set(q.x, on ? q.y : q.y - 0.14, on ? q.z : q.z + q.sd * 0.06);
						q.net.rotation.x = on ? 0 : q.sd * 0.35;
					}
				});
				/* a bag knocked off: notes everywhere */
				const lb = f.lb || [],
					last = lb.length ? lb[lb.length - 1][0] : 0;
				if (last !== (e.lbFx || 0)) {
					/* every bag that came off tumbles down onto the road from its net */
					lb.filter(([k]) => k > (e.lbFx || 0)).forEach(([, , sl]) =>
						this.dropBag(W, e, (e.slots[sl] || e.slots[0]).bag),
					);
					e.lbFx = last;
					burst(W.sc, e.x, 2.2, e.z, {
						n: 22,
						shape: "cube",
						cols: ["#3DBA6E", "#9BE3B0", "#F4F6F9", "#C9A86A"],
						spd: 6,
						up: 6,
						life: 1.1,
						size: 0.8,
					});
					if (W.split || this.heard(W, e)) sfxPack("coin");
				}
				/* the cash trail: notes flutter out behind it, more the more bags it has lost */
				if (W.t > 0 && !e.gone) {
					const lost = this.BAGS - n;
					e.trail = (e.trail || 0) + dt * (2 + lost * 1.6);
					for (; e.trail >= 1; e.trail--) {
						const a = e.yaw + Math.PI,
							d = 1.6;
						burst(W.sc, e.x + Math.cos(a) * d, 2.2 + Math.random() * 0.6, e.z - Math.sin(a) * d, {
							n: 1,
							shape: "cube",
							cols: ["#3DBA6E", "#9BE3B0", "#F4F6F9"],
							spd: 1.6,
							up: 1.4,
							life: 1.8,
							size: 0.55,
						});
					}
				}
				/* the shield while it can't lose a bag: pops up, shimmers, blinks fast in its last 1.5 s */
				{
					const im = (e.local ? e.immT : f.im) || 0,
						left = im - W.t,
						on = left > 0 && !e.gone && (left > 1.5 || Math.sin(W.t * (left > 0.7 ? 28 : 45)) > 0);
					e.shield.forEach((g) => {
						g.visible = !!on;
						if (!on) return;
						const pop = Math.min(1, (this.IMM - left) / 0.15);
						g.scale.copy(g.userData.s0).multiplyScalar(0.7 + 0.3 * pop);
						g.children[0].material.opacity = 0.18 + 0.06 * Math.sin(W.t * 9);
						g.rotation.x = Math.sin(W.t * 2) * 0.05;
					});
				}
			} else {
				if (!e.bar) e.bar = this.copBar(e.tr);
				this.harpoonFx(W, e);
				this.spearFx(W, e);
				/* ahead of the cash truck with the button ready, it drops spikes: a mini SPIKES button by the truck says so
				   (and your own phone's button reads SPIKES) */
				if (e.local && e.p && !e.p.bot && W.t >= 0 && !e.gone) {
					const sp = this.ahead(W, e, this.solo(W)) && W.t >= (e.hpCd || 0);
					if (sp && (e.isMe || W.tv)) inputHint(W, e, "SPIKES", "tap");
					if (e.isMe && !W.tv) {
						const b = document.querySelector("#ram span"),
							want = sp ? "SPIKES" : "HARPOON";
						if (b && b.textContent !== want) b.textContent = want;
					}
				}
				this.trickFx(W, e, dt);
				const ph = Math.floor(W.t * 6 + e.i) % 2;
				e.bar.red.material.emissiveIntensity = ph ? 1.6 : 0.1;
				e.bar.blue.material.emissiveIntensity = ph ? 0.1 : 1.6;
			}
		},
		/* a cop's light bar on its roof (red and blue, kept inside the roof's width) with the harpoon gun beside it, in
		   world-size units whatever the truck's scale */
		copBar(tr) {
			/* on the cab: the highest flat bit of the front third, measured with the truck on its own (in its own
			   coordinates, wherever it is on the road) */
			const par = tr.parent;
			if (par) par.remove(tr);
			tr.updateMatrixWorld(true);
			const box = new THREE.Box3().setFromObject(tr),
				rc = new THREE.Raycaster(),
				hits = [];
			for (let x = box.max.x - (box.max.x - box.min.x) * 0.33; x < box.max.x - 0.1; x += 0.05) {
				rc.set(new THREE.Vector3(x, box.max.y + 1, 0), new THREE.Vector3(0, -1, 0));
				const h = rc.intersectObject(tr, true)[0];
				if (h) hits.push([x, h.point.y]);
			}
			if (par) par.add(tr);
			const hy = hits.length ? Math.max(...hits.map((h) => h[1])) : box.max.y,
				flat = hits.filter((h) => h[1] > hy - 0.05),
				top = { x: flat.length ? (flat[0][0] + flat[flat.length - 1][0]) / 2 : 0, y: hy },
				sc = tr.scale.x,
				g = new THREE.Group(),
				red = B(0.26, 0.14, 0.36, "#E5484D", 0, -0.03, -0.2, { emissive: "#FF2A2A", emissiveIntensity: 1 }),
				blue = B(0.26, 0.14, 0.36, "#2F7DE1", 0, -0.03, 0.2, { emissive: "#2A6BFF", emissiveIntensity: 1 }),
				gun = new THREE.Group(),
				tip = Cy(0, 0.1, 0.26, 6, "#FFC83D", 0.5, 0, 0);
			g.add(B(0.3, 0.1, 0.86, "#23272F", 0, -0.13, 0), red, blue);
			/* the harpoon gun: a mount, a barrel, the yellow harpoon head in its muzzle */
			const bar = Cy(0.07, 0.08, 0.62, 8, "#3D424C", 0.12, 0, 0);
			bar.rotation.z = -Math.PI / 2;
			tip.rotation.z = -Math.PI / 2;
			gun.add(B(0.2, 0.14, 0.2, "#5A6272", 0, -0.1, 0), bar, tip);
			gun.position.set(0.28, 0.02, 0);
			g.add(gun);
			g.position.set(top.x / sc, (top.y + 0.18) / sc, 0);
			g.scale.setScalar(1 / sc);
			tr.add(g);
			return { g, red, blue, gun, tip };
		},
		/* the cash in cargo nets on the steel fenders over its tyres: 5 bags a side (3 on the rear fender, 2 on the front),
		   each sack under a dark net that goes slack once its bag is knocked off */
		bagNets(W, e) {
			const fend = (e.tr.userData.fend || []).slice().sort((a, b) => a.x - b.x),
				kit = this.bagKit(),
				mat =
					W.netM ||
					(W.netM = new THREE.MeshStandardMaterial({
						map: (() => {
							const t = canvasTex(64, 64, (x, w, h) => {
								x.strokeStyle = "#1E2228";
								x.lineWidth = 5;
								for (let i = -4; i <= 8; i++) {
									x.beginPath();
									x.moveTo(i * 16, 0);
									x.lineTo(i * 16 + h, h);
									x.moveTo(i * 16 + h, 0);
									x.lineTo(i * 16, h);
									x.stroke();
								}
							});
							t.wrapS = t.wrapT = THREE.RepeatWrapping;
							t.repeat.set(4, 3);
							return t;
						})(),
						transparent: true,
						alphaTest: 0.35,
						side: THREE.DoubleSide,
						roughness: 0.9,
					})),
				geo = W.netG || (W.netG = new THREE.SphereGeometry(0.215, 12, 8));
			e.slots = [];
			[1, -1].forEach((sd) => {
				const fs = fend.filter((f) => Math.sign(f.z) === sd),
					spots = [];
				fs.forEach((f, j) => {
					const k = j === 0 ? 3 : 2,
						step = 0.42;
					for (let i = 0; i < k && spots.length < 5; i++) spots.push([f.x + (i - (k - 1) / 2) * step, f.y, f.z]);
				});
				while (spots.length < 5) spots.push([-0.6 + spots.length * 0.4, 1.2, sd * 1.1]);
				/* more than 5 a side: a second tier on top of the first (it goes first) */
				const per =
						sd > 0
							? Math.ceil(this.BAGS / 2)
							: Math.floor(this.BAGS / 2) /* an odd count: the extra one on the right */,
					low = spots.map((p) => [...p, 0]),
					tiers =
						per > low.length
							? spots
									.slice(0, per - low.length)
									.map(([x, y, z]) => [x + 0.05, y + 0.33, z - sd * 0.04, 1])
									.concat(low)
							: low.slice(0, per);
				tiers.forEach(([x, y, z, top], i) => {
					const bag = kitGroup(kit, 0),
						net = new THREE.Mesh(geo, mat),
						q = { bag, net, x, y: y + 0.19, z: z - sd * 0.03, sd, top, on: null };
					bag.position.set(q.x, q.y, q.z);
					bag.rotation.y = i * 1.3 + (sd > 0 ? 0 : 0.7);
					net.position.set(q.x, q.y, q.z);
					e.tr.add(bag, net);
					e.slots.push(q);
				});
			});
			/* the shield: a faceted energy shell round each side's nets while the truck can't lose a bag */
			e.shield = [1, -1].map((sd) => {
				const qs = e.slots.filter((q) => q.sd === sd),
					box = new THREE.Box3();
				qs.forEach((q) => box.expandByPoint(new THREE.Vector3(q.x, q.y, q.z)));
				const c = box.getCenter(new THREE.Vector3()),
					sz = box.getSize(new THREE.Vector3()),
					g = new THREE.Group(),
					geo = new THREE.IcosahedronGeometry(1, 1),
					shell = new THREE.Mesh(
						geo,
						new THREE.MeshBasicMaterial({
							color: "#6FD6FF",
							transparent: true,
							opacity: 0.22,
							depthWrite: false,
							blending: THREE.AdditiveBlending,
							side: THREE.DoubleSide,
						}),
					),
					edges = new THREE.LineSegments(
						new THREE.EdgesGeometry(geo),
						new THREE.LineBasicMaterial({
							color: "#B8ECFF",
							transparent: true,
							opacity: 0.7,
							depthWrite: false,
							blending: THREE.AdditiveBlending,
						}),
					);
				g.add(shell, edges);
				g.position.copy(c);
				g.scale.set(sz.x / 2 + 0.45, sz.y / 2 + 0.38, sz.z / 2 + 0.4);
				g.userData.s0 = g.scale.clone();
				g.visible = false;
				e.tr.add(g);
				return g;
			});
		},
		/* a cop's own trick on every screen: Crusher's jump (an arc, dust as it lands), nitro / hot sauce flames, Blaze's
		   water jet onto the cash truck */
		trickFx(W, c, dt) {
			const f = c.f || {},
				T = this.solo(W);
			if (f.jp !== undefined) {
				const k = (W.t - f.jp) / this.JMPT;
				if (k >= 0 && k < 1) {
					if (c.jpUp !== f.jp) {
						c.jpUp = f.jp;
						if (this.heard(W, c)) sfxPack("jumpboost");
					}
					c.g.position.y += Math.sin(k * Math.PI) * 3.4;
					c.tr.rotation.z += Math.sin(k * Math.PI) * 0.35;
				} else if (k >= 1 && c.jpSeen !== f.jp) {
					c.jpSeen = f.jp;
					burst(W.sc, c.x, 0.4, c.z, {
						n: 16,
						shape: "ico",
						cols: ["#9DA0A6", "#C9CED8"],
						spd: 4,
						up: 3,
						grav: 12,
						life: 0.6,
						size: 1.1,
					});
					if (this.heard(W, c)) sfx("land");
				}
			}
			/* the harpoon vault: up over the car nose first, down past it, dust as it lands */
			if (f.vt) {
				const k = (W.t - f.vt[0]) / f.vt[1];
				if (k >= 0 && k < 1) {
					if (c.vtUp !== f.vt[0]) {
						c.vtUp = f.vt[0];
						if (this.heard(W, c)) sfxPack("jump");
					}
					c.g.position.y += Math.sin(k * Math.PI) * this.VLTH;
					c.tr.rotation.z += Math.sin(k * Math.PI * 2) * 0.3;
				} else if (k >= 1 && c.vtSeen !== f.vt[0]) {
					c.vtSeen = f.vt[0];
					burst(W.sc, c.x, 0.4, c.z, {
						n: 12,
						shape: "ico",
						cols: ["#9DA0A6", "#C9CED8"],
						spd: 3.5,
						up: 2.5,
						grav: 12,
						life: 0.5,
						size: 1,
					});
				}
			}
			if (f.nt && W.t < f.nt[0] && c.ntUp !== f.nt[0]) {
				c.ntUp = f.nt[0];
				if (this.heard(W, c)) sfxPack("speed");
			}
			if (f.nt && W.t < f.nt[0] && Math.random() < dt * 30) {
				const a = c.yaw + Math.PI;
				burst(W.sc, c.x + Math.cos(a) * 1.3, 0.7, c.z - Math.sin(a) * 1.3, {
					n: 2,
					shape: "ico",
					cols: f.nt[1] ? ["#E5484D", "#FF8A1F", "#FFC83D"] : ["#9FD8F0", "#F4F6F9", "#5AA9FF"],
					spd: 1.5,
					up: 1,
					grav: -1,
					life: 0.35,
					size: 0.9,
				});
			}
			this.hoseFx(W, c, dt);
			this.spicyFx(W, c, dt);
			this.wreckFx(W, c, dt);
			this.binFx(W, c, dt);
		},
		/* where Rusty's wrecking ball is (round cop c as it is now), or null when it isn't swinging: the cable pays out over
		   the first 0.4 s, then it whirls round */
		wbPos(W, c) {
			const wb = c.f && c.f.wb,
				a = wb ? W.t - wb[1] : 99;
			if (!wb || a < 0 || a > this.WBT || c.gone) return null;
			const r = this.WBR * Math.min(1, 0.35 + a / 0.4),
				ang = wb[2] + wb[3] * this.WBW * a;
			return { x: c.x + Math.cos(ang) * r, z: c.z - Math.sin(ang) * r, ang, a };
		},
		/* where bin i of a BINS throw is: flying from the cop to its start at the road's edge, then rolling across; null
		   once it has rolled off the road */
		binPos(W, rb, i) {
			const [, t, z0, dir, sx, sz, xs] = rb,
				z = z0 - i * this.BGAP,
				[lo, hi] = this.edges(z),
				x0 = xs !== undefined ? xs : dir > 0 ? lo + 0.6 : hi - 0.6,
				fl = this.BF + i * this.BDLY,
				a = W.t - t;
			if (a < 0) return null;
			if (a < fl) {
				const k = a / fl;
				return { x: sx + (x0 - sx) * k, z: sz + (z - sz) * k, y: 0.55 + Math.sin(k * Math.PI) * 5, fly: true, k };
			}
			const x = x0 + dir * this.BV * (a - fl);
			return x > hi + 1 || x < lo - 1 ? null : { x, z, y: 0.55, roll: (x - x0) / 0.55, fly: false };
		},
		/* Garbo's bins on every screen: green wheelie bins flung up the road, then tumbling across it on their sides; one the
		   cash truck hit flies off */
		binFx(W, c, dt) {
			const rb = c.f && c.f.rb,
				T = this.solo(W),
				hit = new Set(((T && T.f && T.f.bh) || []).map(String));
			W.binV = W.binV || {};
			if (!rb) return;
			if (!W.binKit) {
				const m = wheelieBinModel("#3D8B4F", "trash", "bottle");
				W.binKit = bakeKit(m, { ao: false, ground: false });
			}
			for (let i = 0; i < this.BN; i++) {
				const key = c.k + ":b" + rb[0] + ":" + i,
					b = this.binPos(W, rb, i);
				let v = W.binV[key];
				if (!b) {
					if (v) {
						W.sc.remove(v.o);
						delete W.binV[key];
					}
					continue;
				}
				if (!v) {
					const o = new THREE.Group(),
						lie = new THREE.Group(),
						g = kitGroup(W.binKit, 0);
					/* lying on its side, rolling about its own long axis (along the road) */
					g.scale.setScalar(0.5);
					g.position.y = -0.35;
					lie.add(g);
					lie.rotation.x = Math.PI / 2;
					o.add(lie);
					W.sc.add(o);
					v = W.binV[key] = { o, lie };
				}
				if (hit.has(key)) {
					if (!v.gone) {
						v.gone = W.t;
						burst(W.sc, b.x, 0.8, b.z, {
							n: 12,
							shape: "cube",
							cols: ["#3D8B4F", "#2E6B3C", "#C9CED8"],
							spd: 5,
							up: 4,
							life: 0.6,
						});
					}
					const k = W.t - v.gone;
					v.o.position.set(b.x + (b.x < (T ? T.x : 0) ? -1 : 1) * k * 9, 0.55 + k * 6 - k * k * 12, b.z);
					v.o.rotation.x += dt * 9;
					v.o.visible = k < 1.2;
					continue;
				}
				v.o.position.set(b.x, b.y, b.z);
				if (b.fly) v.o.rotation.set(b.k * 6, 0, b.k * 4);
				else v.o.rotation.set(0, 0, -rb[3] * b.roll);
				v.lie.rotation.x = b.fly ? 0 : Math.PI / 2;
			}
		},
		/* Rusty's wrecking ball on every screen: the traffic car it grabbed (lifted off the road over 0.35 s) or a crushed
		   car of its own, on a cable from its crane, whirling round it; a grabbed car is smashed when it lets go */
		wreckFx(W, c, dt) {
			const wp = this.wbPos(W, c),
				wb = c.f && c.f.wb,
				held = wb && wb[4] >= 0 ? W.cars.find((x) => x.id === wb[4] && x.held && x.held.by === wb[0]) : null;
			W.wbV = W.wbV || {};
			if (held && !wp && !held.smashed && W.t >= held.kT) {
				held.smashed = 1;
				held.g.visible = false;
				burst(W.sc, held.g.position.x, 1, held.g.position.z, {
					n: 18,
					shape: "cube",
					cols: [held.c, "#C9CED8", "#9FD8F0"],
					spd: 6,
					up: 5,
					life: 0.8,
					size: 0.8,
				});
				if (this.heard(W, c)) sfxPack("hit");
			}
			let v = W.wbV[c.k];
			if (!v && !wp) return;
			if (!v) {
				W.wbKit = W.wbKit || bakeKit(crushedCarModel("sedan", "#7C8593"), { ao: false, ground: false });
				const car = kitGroup(W.wbKit, 0);
				car.scale.setScalar(0.75);
				v = W.wbV[c.k] = {
					car,
					line: mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 5), "#3D424C"),
				};
				W.sc.add(car, v.line);
			}
			v.line.visible = !!wp;
			v.car.visible = !!(wp && !held);
			if (c.tr.userData.hook) c.tr.userData.hook.visible = !wp;
			if (!wp) return;
			const ball = held ? held.g : v.car,
				k = held ? Math.min(1, wp.a / 0.35) : 1,
				by = this.WBY - 0.4 + Math.sin(wp.a * 9) * 0.15;
			ball.position.set(
				held ? held.held.x + (wp.x - held.held.x) * k : wp.x,
				by * k,
				held ? held.held.z + (wp.z - held.held.z) * k : wp.z,
			);
			ball.rotation.set(0.25 * k, wp.ang + Math.PI / 2, Math.sin(wp.a * 5) * 0.3 * k);
			/* the cable runs from the tip of Rusty's crane boom (its dangling hook hidden meanwhile) */
			const hk = c.tr.userData.hook,
				back = new THREE.Vector3(-Math.cos(c.yaw), 0, Math.sin(c.yaw)),
				p0 = new THREE.Vector3(c.x, 2.1, c.z).addScaledVector(back, 0.7);
			if (hk) {
				c.tr.updateMatrixWorld(true);
				hk.getWorldPosition(p0);
			}
			const p1 = new THREE.Vector3(wp.x, this.WBY + 0.3, wp.z),
				d = p1.clone().sub(p0);
			v.line.position.copy(p0).addScaledVector(d, 0.5);
			v.line.scale.y = Math.max(0.01, d.length());
			v.line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
			if (Math.random() < dt * 6)
				burst(W.sc, wp.x, 0.4, wp.z, {
					n: 1,
					shape: "ico",
					cols: ["#9DA0A6", "#C9CED8"],
					spd: 1,
					up: 1,
					life: 0.4,
					size: 0.9,
				});
		},
		/* Taco Tina's hot sauce on every screen: a red bottle arcs onto the cash truck, then flames burst out of its back
		   while its steering is swapped */
		spicyFx(W, c, dt) {
			const sp = c.f && c.f.sp,
				T = this.solo(W);
			W.spV = W.spV || {};
			let v = W.spV[c.k];
			const a = sp && T ? W.t - sp[1] : 99;
			if (!v && a < this.SPF) {
				v = W.spV[c.k] = new THREE.Group();
				v.add(
					Cy(0.16, 0.16, 0.42, 8, "#E5484D", 0, 0, 0),
					Cy(0.07, 0.12, 0.16, 8, "#F4F6F9", 0, 0.28, 0),
					Cy(0.08, 0.08, 0.1, 8, "#2E7D32", 0, 0.4, 0),
				);
				v.scale.setScalar(1.6);
				W.sc.add(v);
			}
			if (v) {
				v.visible = a >= 0 && a < this.SPF;
				if (v.visible) {
					const k = a / this.SPF;
					v.position.set(sp[2] + (T.x - sp[2]) * k, 2 + Math.sin(k * Math.PI) * 5, sp[3] + (T.z - sp[3]) * k);
					v.rotation.set(k * 9, 0, k * 5);
				}
			}
			if (T && a >= this.SPF && a < this.SPF + this.SPT && Math.random() < dt * 30) {
				const b = Math.cos(T.yaw),
					d = -Math.sin(T.yaw);
				burst(W.sc, T.x - b * (T.hb[1] + 0.2), 1, T.z - d * (T.hb[1] + 0.2), {
					n: 2,
					shape: "ico",
					cols: ["#E5484D", "#FF8A1F", "#FFC83D"],
					spd: 2,
					up: 2,
					grav: -2,
					life: 0.45,
					size: 1.1,
				});
			}
		},
		/* Blaze's hose on every screen: a thick arcing jet of water from its roof (a flowing outer stream round a white
		   core) onto the cash truck wherever it is, with a big splash where it lands */
		hoseFx(W, c, dt) {
			const wj = c.f && c.f.wj,
				T = this.solo(W),
				a = wj ? W.t - wj[1] : 99,
				on = !!(T && a >= 0 && a < 1.3 && !c.gone);
			W.jet = W.jet || {};
			let v = W.jet[c.k];
			if (!v && !on) return;
			if (!v) {
				if (!W.jetTex) {
					/* opaque streaks (no see-through pixels for phones to garble), tinted by the material */
					W.jetTex = canvasTex(128, 32, (x, w, h) => {
						x.fillStyle = "#BFE6F7";
						x.fillRect(0, 0, w, h);
						const r = mulberry(5);
						for (let i = 0; i < 40; i++) {
							x.fillStyle = i % 3 ? "#FFFFFF" : "#7CC4E8";
							x.fillRect(r() * w, r() * h, 12 + r() * 40, 2 + r() * 3);
						}
					});
					W.jetTex.wrapS = W.jetTex.wrapT = THREE.RepeatWrapping;
					W.jetTex.repeat.set(3, 1);
				}
				v = W.jet[c.k] = {
					outer: new THREE.Mesh(
						new THREE.BufferGeometry(),
						new THREE.MeshBasicMaterial({ map: W.jetTex, transparent: true, opacity: 0.7, depthWrite: false }),
					),
					inner: new THREE.Mesh(
						new THREE.BufferGeometry(),
						new THREE.MeshBasicMaterial({ color: "#F4F6F9", transparent: true, opacity: 0.9, depthWrite: false }),
					),
				};
				v.outer.renderOrder = 3;
				v.inner.renderOrder = 2;
				W.sc.add(v.outer, v.inner);
			}
			v.outer.visible = v.inner.visible = on;
			if (!on) return;
			const p0 = new THREE.Vector3(c.x, 2.3, c.z).addScaledVector(
					new THREE.Vector3(Math.cos(c.yaw), 0, -Math.sin(c.yaw)),
					0.6,
				),
				hit = true,
				end = new THREE.Vector3(T.x, 1.4, T.z),
				/* the jet shoots out over 0.15 s and thins away over the last 0.25 s */
				grow = Math.min(1, a / 0.15),
				thin = Math.max(0.05, Math.min(1, (1.3 - a) / 0.25)),
				p2 = p0.clone().lerp(end, Math.max(0.05, grow)),
				p1 = p0
					.clone()
					.lerp(p2, 0.45)
					.add(new THREE.Vector3(0, 1.2 + p0.distanceTo(p2) * 0.06, 0)),
				curve = new THREE.QuadraticBezierCurve3(p0, p1, p2),
				wob = 1 + Math.sin(W.t * 40) * 0.08;
			v.outer.geometry.dispose();
			v.inner.geometry.dispose();
			v.outer.geometry = new THREE.TubeGeometry(curve, 18, 0.36 * thin * wob, 8, false);
			v.inner.geometry = new THREE.TubeGeometry(curve, 18, 0.16 * thin, 6, false);
			W.jetTex.offset.x -= dt * 4;
			/* the splash where it lands (and a spray at the nozzle) */
			if (grow >= 1 && Math.random() < dt * 40)
				burst(W.sc, p2.x, p2.y, p2.z, {
					n: 3,
					shape: "ico",
					cols: ["#F4F6F9", "#BFE6F7", "#7CC4E8"],
					spd: hit ? 5 : 3.5,
					up: 3,
					grav: 10,
					life: 0.5,
					size: hit ? 1.3 : 1,
				});
			if (Math.random() < dt * 12)
				burst(W.sc, p0.x, p0.y, p0.z, {
					n: 1,
					shape: "ico",
					cols: ["#F4F6F9", "#BFE6F7"],
					spd: 1.5,
					up: 1,
					grav: 6,
					life: 0.3,
					size: 0.8,
				});
		},
		/* a cop's harpoon: the head flies out (0.2 s), the line holds onto the truck's rear while it's hooked, a miss shoots
		   forward and reels back in, a snapped line whips away */
		harpoonFx(W, c) {
			const h = c.f && c.f.hp,
				T = this.solo(W);
			let v = W.hpV[c.k];
			if (!v) {
				v = W.hpV[c.k] = {
					line: mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 5), "#2E323A"),
					head: Cy(0, 0.12, 0.34, 6, "#FFC83D", 0, 0, 0),
				};
				W.sc.add(v.line, v.head);
			}
			const age = h ? W.t - h[1] : 99,
				show = !!(h && T && age >= 0 && age < this.HPT + 1.4 && v.done !== h[0]);
			v.line.scale.x = v.line.scale.z = h && h[4] ? 2 : 1;
			v.line.visible = v.head.visible = show;
			c.bar.tip.visible = !show;
			if (!show) return;
			c.tr.updateMatrixWorld(true);
			const a = c.bar.tip.getWorldPosition(new THREE.Vector3()),
				fwd =
					h[3] !== undefined
						? new THREE.Vector3(Math.cos(h[3]), 0, -Math.sin(h[3]))
						: new THREE.Vector3(Math.cos(c.yaw), 0, -Math.sin(c.yaw)),
				snapped = c.f.hr === h[0] || ((T.f && T.f.hs) || []).some(([k, id]) => k === c.k && id === h[0]);
			let b;
			if (v.id !== h[0]) {
				v.id = h[0];
				v.relT = undefined;
			}
			const done = () => {
				v.done = h[0];
				v.line.visible = v.head.visible = false;
				c.bar.tip.visible = true;
			};
			if (h[2] && !snapped && age < this.HPT) {
				const tb = new THREE.Vector3(T.x, 1.3, T.z).addScaledVector(
					new THREE.Vector3(Math.cos(T.yaw), 0, -Math.sin(T.yaw)),
					-2.1,
				);
				b = age < 0.2 ? a.clone().lerp(tb, age / 0.2) : tb;
				/* where it holds, relative to the gun: a snapped line whips back from there */
				v.off = b.clone().sub(a);
			} else if (h[2]) {
				/* snapped (or let go): the line whips sideways and droops as it reels back into the gun */
				if (v.relT === undefined) {
					v.relT = W.t;
					if (snapped && (this.heard(W, c) || T.isMe)) sfx("crack");
				}
				const k = (W.t - v.relT) / 0.45;
				if (k >= 1 || !v.off) return done();
				const side = new THREE.Vector3(-v.off.z, 0, v.off.x).normalize();
				b = a
					.clone()
					.addScaledVector(v.off, (1 - k) * (1 - k))
					.addScaledVector(side, Math.sin(k * Math.PI * 2) * 1.6 * (1 - k));
				b.y -= Math.sin(k * Math.PI) * 0.9;
			} else if (h[5] !== undefined) {
				/* caught a car: the line holds onto its roof until the cop is over it */
				const car = W.cars.find((q) => q.id === h[5]),
					vt = c.f.vt,
					hold = vt ? vt[0] - h[1] + vt[1] * 0.55 : 0.8;
				if (!car || age >= hold) return done();
				const cp = this.carPos(W, car),
					tb = new THREE.Vector3(cp.x, cp.y + 1.3 * this.CARS, cp.z);
				b = age < 0.2 ? a.clone().lerp(tb, age / 0.2) : tb;
			} else {
				/* a miss: out up to 12 m ahead, then reeled back */
				const out = age < 0.25 ? age / 0.25 : Math.max(0, 1 - (age - 0.25) / 0.35);
				if (out <= 0) return done();
				b = a.clone().addScaledVector(fwd, 12 * out);
				b.y -= (1 - out) * 0.2;
			}
			const d = b.clone().sub(a),
				len = Math.max(0.01, d.length());
			v.line.position.copy(a).addScaledVector(d, 0.5);
			v.line.scale.y = len;
			v.line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
			v.head.position.copy(b);
			v.head.quaternion.copy(v.line.quaternion);
			if ((h[2] || h[5] !== undefined) && age >= 0.2 && age < 0.25 && !v.clank) {
				v.clank = h[0];
				if (h[2] && (this.heard(W, c) || T.isMe)) sfxPack("hit", 0.6);
			}
			if (v.clank && v.clank !== h[0]) v.clank = 0;
		},
		/* a bag knocked off the truck: thrown from where it sat, it tumbles, bounces and lies on the road a while (only for
		   show: nobody picks it up) */
		dropBag(W, e, src) {
			const g = kitGroup(this.bagKit(), 0.3),
				p = new THREE.Vector3();
			(src || e.g).getWorldPosition(p);
			g.position.copy(p);
			g.scale.setScalar(1.15);
			W.sc.add(g);
			const sd = Math.random() < 0.5 ? -1 : 1;
			W.loose.push({
				g,
				vx: (e.vx || 0) + sd * (2.5 + Math.random() * 2),
				vy: 4.5,
				vz: (e.vz || 0) * 0.45,
				sp: (Math.random() - 0.5) * 14,
				t: W.t,
			});
		},
		/* a few sparks at (x, z) by truck e (rate-limited per truck) */
		sparks(W, e, x, z) {
			if (W.t - (e.spkT ?? -9) < 0.07) return;
			e.spkT = W.t;
			burst(W.sc, x, 0.55 + Math.random() * 0.4, z, {
				n: 4,
				shape: "cube",
				cols: ["#FFE27A", "#FFB547", "#FFF6D8"],
				spd: 4.5,
				up: 3,
				life: 0.35,
				size: 0.32,
			});
		},
		/* speed lines: wind streaks (windStreaks) hanging in the air along the road, drifting back a little; more of them
		   the faster you go (the TV: the pack) */
		streaks(W) {
			W.stk = windStreaks(W, 48, 0.2);
		},
		/* where the action is: your truck, or the pack on the TV, and how fast it goes */
		focus(W) {
			const L = W.tv ? W.list.filter((e) => !e.gone) : [W.me],
				n = Math.max(1, L.length);
			return {
				x: L.reduce((a, e) => a + e.x, 0) / n,
				z: W.tv ? Math.min(...L.map((e) => e.z)) : W.me.z,
				sp: L.reduce((a, e) => a + Math.hypot(e.vx || 0, e.vz || 0), 0) / n,
			};
		},
		streakStep(W, dt) {
			if (!W.stk) return;
			const F = this.focus(W);
			W.stk.step(dt, { x: F.x * 0.5, z: F.z, amt: W.t > 0 && !W.over ? (F.sp - 10) / 10 : 0, drift: 9 });
		},
		/* lights on the road at dusk: a warm pool ahead of every truck's headlights; under each cop a pool flashing red
		   and blue with its light bar */
		truckLights(W, e) {
			if (!e.hl) {
				const pool = (col, w, l, x) => {
						const m = new THREE.Mesh(
							new THREE.PlaneGeometry(l, w),
							new THREE.MeshBasicMaterial({
								map: this.glowTex(W),
								color: col,
								transparent: true,
								opacity: 0.5,
								depthWrite: false,
								blending: THREE.AdditiveBlending,
							}),
						);
						m.rotation.x = -Math.PI / 2;
						m.position.set(x, 0.14, 0);
						m.renderOrder = 2;
						e.g.add(m);
						return m;
					},
					big = e.side === 0;
				e.hl = { head: pool("#FFE7B0", big ? 4.6 : 3.4, big ? 10 : 8, 0), d: big ? 6.2 : 4.8 };
				if (e.side === 1) e.hl.bar = pool("#FF3B3B", 5, 5, 0);
			}
			/* e.g only moves, the truck model inside it turns: the beam follows the heading */
			const hd = e.hl.head;
			hd.position.set(Math.cos(e.yaw) * e.hl.d, 0.14, -Math.sin(e.yaw) * e.hl.d);
			hd.rotation.set(-Math.PI / 2, 0, e.yaw);
			hd.visible = !e.gone;
			if (e.hl.bar) {
				const ph = Math.floor(W.t * 6 + e.i) % 2;
				e.hl.bar.material.color.set(ph ? "#FF2E2E" : "#2E6BFF");
				e.hl.bar.material.opacity = 0.35 + 0.15 * Math.sin(W.t * 37);
				e.hl.bar.visible = !e.gone;
			}
		},
		/* a soft round glow (white in the middle, nothing at the edge), tinted per use */
		glowTex(W) {
			return (
				W.glowTex ||
				/* opaque, white fading to black (every pool using it is additive, so black adds nothing): a see-through
				   white-to-clear canvas gets its faint pixels un-premultiplied wrongly on phones (as the lava haze did) */
				(W.glowTex = canvasTex(128, 128, (x, w, h) => {
					const g = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
					g.addColorStop(0, "#FFFFFF");
					g.addColorStop(0.45, "#8C8C8C");
					g.addColorStop(1, "#000000");
					x.fillStyle = g;
					x.fillRect(0, 0, w, h);
				}))
			);
		},
		/* the police helicopter: a chunky toy chopper in police blue and white, rotor and tail rotor turning, a red and blue
		   belly light; its spotlight (a soft beam cone and a bright pool on the road) sweeps round the cash truck */
		heliModel(W) {
			const g = new THREE.Group(),
				BL = "#3D6FD1",
				WH = "#F4F6F9",
				DK = "#3D424C",
				cab = mesh(new THREE.IcosahedronGeometry(1, 1), BL),
				glass = mesh(new THREE.IcosahedronGeometry(0.72, 1), "#9FD8F0", { roughness: 0.2 }),
				rotor = new THREE.Group(),
				tail = new THREE.Group(),
				boom = Cy(0.12, 0.24, 2.6, 8, BL, -2.2, 0.15, 0);
			cab.scale.set(1.55, 0.95, 1.0);
			glass.scale.set(0.95, 0.72, 0.86);
			glass.position.set(0.75, 0.12, 0);
			boom.rotation.z = Math.PI / 2;
			g.add(cab, glass, boom, B(1.6, 0.18, 1.62, WH, -0.1, -0.15, 0));
			g.add(B(0.55, 0.75, 0.09, BL, -3.45, 0.55, 0), B(0.7, 0.08, 0.6, WH, -3.3, 0.2, 0));
			/* skids */
			[-1, 1].forEach((sd) => {
				const sk = Cy(0.06, 0.06, 2.4, 6, DK, 0.1, -1.05, sd * 0.7);
				sk.rotation.z = Math.PI / 2;
				g.add(
					sk,
					Cy(0.05, 0.05, 0.55, 6, DK, 0.55, -0.8, sd * 0.62),
					Cy(0.05, 0.05, 0.55, 6, DK, -0.45, -0.8, sd * 0.62),
				);
			});
			/* main rotor on a mast, tail rotor */
			g.add(Cy(0.1, 0.12, 0.42, 8, DK, 0, 1.08, 0));
			rotor.position.set(0, 1.3, 0);
			rotor.add(B(5.6, 0.05, 0.26, DK, 0, 0, 0), B(0.26, 0.05, 5.6, DK, 0, 0, 0), Cy(0.18, 0.18, 0.12, 8, WH, 0, 0, 0));
			tail.position.set(-3.45, 0.6, 0.12);
			tail.add(B(0.06, 1.0, 0.04, DK, 0, 0, 0), B(1.0, 0.06, 0.04, DK, 0, 0, 0));
			g.add(rotor, tail);
			const lamp = B(0.3, 0.12, 0.3, "#FF3B3B", 0.2, -0.95, 0, { emissive: "#FF2A2A", emissiveIntensity: 1.4 });
			g.add(lamp);
			[rotor, tail, lamp].forEach((o) => (o.userData.dyn = true));
			g.position.set(0, 11, -10);
			g.rotation.y = Math.PI / 2;
			W.sc.add(g);
			/* the beam (a cone, tip up at the helicopter) and the pool on the road */
			const beam = new THREE.Mesh(
					new THREE.ConeGeometry(1, 1, 18, 1, true),
					new THREE.MeshBasicMaterial({
						color: "#FFF3C4",
						transparent: true,
						opacity: 0.1,
						depthWrite: false,
						side: THREE.DoubleSide,
						blending: THREE.AdditiveBlending,
					}),
				),
				pool = new THREE.Mesh(
					new THREE.PlaneGeometry(1, 1),
					new THREE.MeshBasicMaterial({
						map: this.glowTex(W),
						color: "#FFF3C4",
						transparent: true,
						opacity: 0.7,
						depthWrite: false,
						blending: THREE.AdditiveBlending,
					}),
				);
			pool.rotation.x = -Math.PI / 2;
			pool.scale.set(8, 8, 1);
			pool.renderOrder = beam.renderOrder = 3;
			W.sc.add(beam, pool);
			return { g, rotor, tail, lamp, beam, pool, p: g.position.clone() };
		},
		heliStep(W, dt) {
			const H = W.heli,
				T = this.solo(W);
			if (!H || !T) return;
			/* ahead of the cash truck out over the roadside, easing after it: high on a phone (out of your view: you see its
			   shadow and beam), lower on the TV, whose camera looks down from higher up */
			const tv = !!W.tv,
				tx = T.x * 0.4 + (tv ? 6 : 9),
				tz = T.z - (tv ? 8 : 17),
				k = 1 - Math.exp(-dt * 1.6);
			H.p.x += (tx - H.p.x) * k;
			H.p.z += (tz - H.p.z) * (1 - Math.exp(-dt * 3));
			H.p.y = (tv ? 9.5 : 15) + Math.sin(W.t * 1.3) * 0.4;
			H.g.position.copy(H.p);
			H.g.rotation.z = -0.12 + Math.sin(W.t * 0.9) * 0.04;
			H.g.rotation.x = (tx - H.p.x) * 0.04;
			H.rotor.rotation.y += dt * 26;
			H.tail.rotation.z += dt * 34;
			H.lamp.material.color.set(Math.floor(W.t * 3) % 2 ? "#FF3B3B" : "#2E6BFF");
			H.lamp.material.emissive.set(Math.floor(W.t * 3) % 2 ? "#FF2A2A" : "#2A6BFF");
			/* the spotlight sweeps round the truck */
			const sx = T.x + Math.sin(W.t * 0.8) * 1.6,
				sz = T.z + Math.cos(W.t * 1.1) * 2.2,
				top = new THREE.Vector3(H.p.x, H.p.y - 0.9, H.p.z),
				bot = new THREE.Vector3(sx, 0.15, sz),
				d = top.clone().sub(bot),
				len = d.length();
			H.pool.position.set(sx, 0.16, sz);
			H.beam.position.copy(bot).addScaledVector(d, 0.5);
			H.beam.scale.set(3.2, len, 3.2);
			H.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
			const on = W.t > -1;
			H.beam.visible = H.pool.visible = on;
		},
		/* the cops' lobbed hazards: the thing flies in an arc (a flashing ring where it'll land), then lies on the road
		   until ZT s are up (objects smash when the truck hits them) */
		hazardFx(W) {
			W.zV = W.zV || {};
			const T = this.solo(W),
				gone = new Set(((T && T.f && T.f.zh) || []).map(String)),
				live = new Set();
			W.list.forEach((c) => {
				if (c.side !== 1 || !c.f) return;
				(c.f.zn || []).forEach(([id, kind, x, z, t, sx, sz]) => {
					const key = c.k + ":" + id,
						a = W.t - t;
					if (a < 0 || a > this.ZL + this.ZT) return;
					live.add(key);
					let v = W.zV[key];
					if (!v) {
						v = W.zV[key] = { fly: this.lobModel(kind, 0), lie: this.lobModel(kind, 1) };
						v.lie.position.set(x, 0.12, z);
						v.mark = new THREE.Mesh(
							new THREE.RingGeometry(this.lobR(kind) - 0.25, this.lobR(kind), 28),
							new THREE.MeshBasicMaterial({
								color: "#FF8A1F",
								transparent: true,
								opacity: 0,
								depthWrite: false,
								polygonOffset: true,
								polygonOffsetFactor: -3,
							}),
						);
						v.mark.rotation.x = -Math.PI / 2;
						v.mark.position.set(x, 0.14, z);
						W.sc.add(v.fly, v.lie, v.mark);
					}
					const k = a / this.ZL,
						smashed = gone.has(key);
					v.fly.visible = k < 1;
					v.mark.visible = k < 1;
					v.lie.visible = k >= 1 && !smashed;
					if (k < 1) {
						/* a long throw from far back arcs higher */
						const hgt = 6 + Math.min(14, Math.hypot(x - sx, z - sz) * 0.1);
						v.fly.position.set(sx + (x - sx) * k, 1.6 + Math.sin(k * Math.PI) * hgt, sz + (z - sz) * k);
						v.fly.rotation.set(k * 7, k * 4, 0);
						v.mark.material.opacity = 0.35 + 0.35 * Math.sin(W.t * 20);
					} else if (!v.landed) {
						v.landed = 1;
						/* a faint thud where it lands (near you, or on the TV) */
						if (a < this.ZL + 0.3 && (W.tv || Math.hypot(W.me.x - x, W.me.z - z) < 30)) sfxPack("thud");
						burst(W.sc, x, 0.5, z, {
							n: 10,
							shape: "ico",
							cols: this.lobCols(kind),
							spd: 3,
							up: 3,
							grav: 12,
							life: 0.6,
							size: 1,
						});
					}
					if (smashed && !v.smash) {
						v.smash = 1;
						burst(W.sc, x, 0.8, z, {
							n: 18,
							shape: "cube",
							cols: this.lobCols(kind),
							spd: 5,
							up: 5,
							grav: 14,
							life: 0.8,
							size: 1,
						});
					}
					if (k >= 1 && !smashed) {
						const fade = Math.min(1, (this.ZL + this.ZT - a) / 1.2);
						v.lie.scale.setScalar(0.4 + 0.6 * Math.min(1, (k - 1) * 6) * fade);
					}
				});
			});
			for (const key in W.zV)
				if (!live.has(key)) {
					const v = W.zV[key];
					W.sc.remove(v.fly, v.lie, v.mark);
					delete W.zV[key];
				}
		},
		lobCols(kind) {
			return {
				ice: ["#F7B8D2", "#FFF6E6", "#8A5A3C"],
				cement: ["#9AA1AC", "#C9CED8"],
				gravel: ["#8A7A68", "#6B6258", "#A89C8A"],
				fuel: ["#E5A23D", "#FFC83D", "#E5484D"],
				trash: ["#3D5A3A", "#6B8F5A", "#C9CED8"],
				parcel: ["#C9A06A", "#E8D5A8", "#8A6A48"],
				crate: ["#B07A45", "#8A5A30", "#D9A86A"],
				nails: ["#9DA0A6", "#5A6272", "#B07A45"],
			}[kind];
		},
		/* what a cop lobs: in flight (lie 0) and lying on the road (lie 1) */
		lobModel(kind, lie) {
			const g = new THREE.Group(),
				R = this.lobR(kind),
				add = (...m) => m.forEach((o) => g.add(o)),
				blob = (rad, col, x, y, z, sy = 1) => {
					const m = mesh(new THREE.IcosahedronGeometry(rad, 1), col, { roughness: 0.4 });
					m.position.set(x, y, z);
					m.scale.y = sy;
					return m;
				},
				box = (w, h, d, col, x, y, z, ry = 0) => {
					const b = B(w, h, d, col, x, y, z);
					b.rotation.y = ry;
					return b;
				},
				pool = (col, op, rad = R) => {
					const m = new THREE.Mesh(
						new THREE.CircleGeometry(rad, 20),
						new THREE.MeshBasicMaterial({
							color: col,
							transparent: true,
							opacity: op,
							depthWrite: false,
							polygonOffset: true,
							polygonOffsetFactor: -2,
						}),
					);
					m.rotation.x = -Math.PI / 2;
					m.position.y = 0.01;
					return m;
				};
			if (kind === "ice") {
				if (lie)
					add(
						pool("#F7B8D2", 0.85),
						pool("#FFF6E6", 0.8, R * 0.55),
						blob(0.45, "#F7B8D2", 0.6, 0.1, 0.3, 0.5),
						blob(0.4, "#FFF6E6", -0.5, 0.1, -0.4, 0.5),
						blob(0.35, "#8A5A3C", 0.1, 0.1, 0.7, 0.5),
					);
				else
					add(
						Cy(0.45, 0.05, 1.1, 8, "#D9A86A", 0, -0.4, 0),
						blob(0.45, "#F7B8D2", 0, 0.3, 0),
						blob(0.4, "#FFF6E6", 0, 0.8, 0),
					);
			} else if (kind === "cement") {
				if (lie)
					add(
						pool("#9AA1AC", 0.9),
						blob(0.5, "#A3ACBB", 0.4, 0.1, 0.2, 0.45),
						blob(0.4, "#8E96A3", -0.6, 0.1, -0.3, 0.4),
					);
				else add(blob(0.7, "#9AA1AC", 0, 0, 0), blob(0.4, "#C9CED8", 0.4, 0.3, 0.2));
			} else if (kind === "gravel") {
				for (let i = 0; i < (lie ? 11 : 5); i++) {
					const a = i * 2.4,
						d = lie ? 0.3 + (i % 4) * 0.45 : 0.3;
					add(
						blob(
							lie ? 0.3 + (i % 3) * 0.12 : 0.3,
							["#8A7A68", "#6B6258", "#A89C8A"][i % 3],
							Math.cos(a) * d,
							lie ? 0.15 : 0,
							Math.sin(a) * d,
							0.8,
						),
					);
				}
			} else if (kind === "fuel") {
				const bar = Cy(0.4, 0.4, 1.1, 10, "#E5484D", 0, 0, 0);
				add(bar, Cy(0.42, 0.42, 0.12, 10, "#FFC83D", 0, 0.25, 0), Cy(0.42, 0.42, 0.12, 10, "#FFC83D", 0, -0.25, 0));
				if (lie) {
					g.children.forEach((o) => {
						o.rotation.z = Math.PI / 2;
						o.position.set(o.position.y + 0.9, 0.42, 0.6);
					});
					add(pool("#C98A1F", 0.75));
				}
			} else if (kind === "trash") {
				const bag = (x, z) => [
					blob(0.42, "#3D5A3A", x, lie ? 0.35 : 0, z, 0.9),
					Cy(0.07, 0.1, 0.2, 6, "#2E3A2C", x, lie ? 0.78 : 0.42, z),
				];
				add(...bag(0, 0), ...bag(0.8, 0.4));
				if (lie)
					add(
						...bag(-0.7, -0.5),
						box(0.3, 0.05, 0.4, "#C9CED8", 0.3, 0.05, -0.8, 0.5),
						box(0.2, 0.05, 0.3, "#E5484D", -0.9, 0.05, 0.6, 1),
					);
			} else if (kind === "parcel") {
				[
					[0, 0, 0],
					[1.1, 0, 0.6],
					[-1, 0, -0.5],
				].forEach(([x, , z], i) => {
					const px = lie ? x : x * 0.4,
						pz = lie ? z : z * 0.4,
						py = lie ? 0.3 : i * 0.2;
					add(box(0.6, 0.5, 0.6, "#C9A06A", px, py, pz, i), box(0.62, 0.08, 0.15, "#E8D5A8", px, py + 0.22, pz, i));
				});
			} else if (kind === "nails" && lie) {
				for (let i = 0; i < 16; i++) {
					const a = i * 2.39,
						d = 0.3 + (i % 5) * (R / 6),
						n = Cy(0, 0.07, 0.22, 3, i % 2 ? "#9DA0A6" : "#5A6272", Math.cos(a) * d, 0.11, Math.sin(a) * d);
					n.rotation.set(i * 0.7, i, 0.4);
					add(n);
				}
				add(
					box(1.1, 0.08, 0.28, "#B07A45", 0.5, 0.04, -0.7, 0.6),
					box(0.9, 0.08, 0.28, "#8A5A30", -0.6, 0.04, 0.5, 2.1),
				);
			} else {
				const kit = crateKits()[0];
				[
					[0, 0],
					[1.2, 0.7],
				].forEach(([x, z], i) => {
					const c = kitGroup(kit, 0);
					c.scale.setScalar(0.85);
					/* crateModel is built round its middle (0.8 tall): on the road it stands on its base */
					c.position.set(lie ? x : x * 0.3, lie ? 0.4 * 0.85 : i * 0.7 - 0.4, lie ? z : z * 0.3);
					c.rotation.y = i * 0.8;
					add(c);
				});
			}
			return g;
		},
		/* the cash truck's spear on every screen (from its shot, T.f.sr): the chain and spear head flying from its nose (WHF
		   s), the cry, the cop reeled in (WHY s) and the crash */
		spearFx(W, c) {
			const T = this.solo(W),
				sr = T && T.f && T.f.sr,
				wy = sr && sr[2] === c.k ? sr[1] : undefined;
			let v = W.wyV && W.wyV[c.k];
			const a = wy !== undefined ? W.t - wy : 99,
				on = !!(T && a >= 0 && a < this.WHF + this.WHY + this.WHH && !c.gone);
			/* the fling ends in the guardrail: sparks and bits */
			if (
				T &&
				a >= this.WHF + this.WHY + this.WHH + this.WHL &&
				a < this.WHF + this.WHY + this.WHH + this.WHL + 0.5 &&
				c.wyOut !== wy
			) {
				c.wyOut = wy;
				burst(W.sc, c.x, 1, c.z, {
					n: 18,
					shape: "cube",
					cols: ["#C9CED8", "#FFC83D", "#3D424C"],
					spd: 6,
					up: 4,
					life: 0.7,
					size: 0.9,
				});
				this.sparks(W, c, c.x + (c.x > T.x ? 1 : -1) * c.hb[0], c.z);
				if (this.heard(W, c) || T.isMe) sfxPack("hit");
			}
			/* the claw bites */
			if (T && a >= this.WHF && a < this.WHF + 0.5 && c.wyHit !== wy) {
				c.wyHit = wy;
				burst(W.sc, c.x, 1, c.z, {
					n: 10,
					shape: "cube",
					cols: ["#C9CED8", "#5A6272"],
					spd: 4,
					up: 2,
					life: 0.5,
					size: 0.7,
				});
			}
			if (!v && !on) return;
			if (!v) {
				W.wyV = W.wyV || {};
				v = W.wyV[c.k] = {
					line: mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), "#3D424C"),
					head: this.clawModel(),
				};
				W.sc.add(v.line, v.head);
			}
			v.line.visible = v.head.visible = on;
			if (!on) return;
			if (v.cry !== wy) {
				v.cry = wy;
				fb(W, c, "GET OVER HERE!", { tone: "bad" });
				if (this.heard(W, c) || T.isMe) sfxPack("whip");
			}
			/* from the truck's bull bar to the cop's tail: the claw flies open, then closes on it */
			const fw = new THREE.Vector3(Math.cos(T.yaw), 0, -Math.sin(T.yaw)),
				p0 = new THREE.Vector3(T.x, 0.9, T.z).addScaledVector(fw, T.hb[1] + 0.1),
				tgt = new THREE.Vector3(c.x, 0.9, c.z).addScaledVector(fw, -(c.hb[1] - 0.15)),
				p1 = a < this.WHF ? p0.clone().lerp(tgt, a / this.WHF) : tgt,
				open = a < this.WHF ? 1 : Math.max(0, 1 - (a - this.WHF) / 0.12);
			v.head.userData.fingers.forEach((q) => (q.rotation.x = 0.15 + open * 0.75));
			const d = p1.clone().sub(p0),
				len = Math.max(0.01, d.length());
			v.line.position.copy(p0).addScaledVector(d, 0.5);
			v.line.scale.y = len;
			v.line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
			v.head.position.copy(p1);
			v.head.quaternion.copy(v.line.quaternion);
		},
		/* the cash truck's claw: a steel hub with three hooked yellow fingers that open while it flies and close on a cop;
		   points along +y (the chain's direction) */
		clawModel() {
			const g = new THREE.Group(),
				fingers = [];
			g.add(Cy(0.2, 0.24, 0.24, 8, "#5A6272", 0, 0, 0), Cy(0.1, 0.1, 0.12, 6, "#3D424C", 0, -0.16, 0));
			for (let i = 0; i < 3; i++) {
				const piv = new THREE.Group(),
					f = new THREE.Group();
				piv.rotation.y = (i / 3) * Math.PI * 2;
				f.position.set(0, 0.1, 0.16);
				f.add(B(0.1, 0.42, 0.08, "#FFC83D", 0, 0.21, 0), B(0.14, 0.08, 0.13, "#FFC83D", 0, 0.405, -0.035));
				f.rotation.x = 0.5;
				piv.add(f);
				g.add(piv);
				fingers.push(f);
			}
			g.userData.fingers = fingers;
			g.scale.setScalar(1.3);
			return g;
		},
		/* a police spike strip (stinger): hinged yellow and black links SSW long with steel spikes standing up on each,
		   end caps with handles; lies across the road (along x) */
		stripModel() {
			const g = new THREE.Group(),
				n = 13,
				L = this.SSW,
				step = L / n;
			for (let i = 0; i < n; i++) {
				const x = -L / 2 + step * (i + 0.5);
				g.add(B(step - 0.06, 0.08, 0.5, i % 2 ? "#23272F" : "#FFC83D", x, 0.04, 0));
				if (i < n - 1) g.add(B(0.1, 0.06, 0.56, "#5A6272", x + step / 2, 0.04, 0));
				[-0.14, 0.14].forEach((z, j) => {
					const sp = Cy(0, 0.05, 0.24, 4, "#C9CED8", x + (j ? 0.12 : -0.12), 0.19, z);
					g.add(sp);
				});
			}
			[-1, 1].forEach((sd) => {
				g.add(B(0.2, 0.14, 0.6, "#E5484D", sd * (L / 2 + 0.06), 0.07, 0));
				g.add(B(0.1, 0.08, 0.4, "#23272F", sd * (L / 2 + 0.2), 0.12, 0));
			});
			return g;
		},
		/* every cop's spike strips on every screen: unrolled across the road from where it was dropped, gone after SST s */
		stripFx(W) {
			W.ssV = W.ssV || {};
			const live = new Set();
			W.list.forEach((c) => {
				if (c.side !== 1 || !c.f) return;
				(c.f.ss || []).forEach(([id, x, z, t]) => {
					const a = W.t - t,
						key = c.k + ":" + id;
					if (a < 0 || a > this.SST) return;
					live.add(key);
					let v = W.ssV[key];
					if (!v) {
						W.ssKit = W.ssKit || bakeKit(this.stripModel(), { ao: false });
						v = W.ssV[key] = kitGroup(W.ssKit, 0.25);
						v.position.set(x, 0.11, z);
						W.sc.add(v);
						burst(W.sc, x, 0.4, z, { n: 8, shape: "cube", cols: ["#FFC83D", "#23272F"], spd: 3, up: 2, life: 0.4 });
					}
					const k = Math.min(1, a / 0.3),
						out = Math.min(1, (this.SST - a) / 0.4);
					v.scale.set(Math.max(0.05, k), 1, 1);
					v.position.y = 0.11 - (1 - out) * 0.25;
				});
			});
			for (const key in W.ssV)
				if (!live.has(key)) {
					W.sc.remove(W.ssV[key]);
					delete W.ssV[key];
				}
		},
		/* a money bag: a squat sack with a tied neck */
		bagKit() {
			if (this.BK) return this.BK;
			const g = new THREE.Group(),
				sack = mesh(new THREE.IcosahedronGeometry(0.19, 1), "#C9A86A");
			sack.scale.set(1, 0.85, 1);
			g.add(sack, Cy(0.07, 0.095, 0.09, 6, "#A88A52", 0, 0.17, 0), B(0.17, 0.04, 0.17, "#3DBA6E", 0, 0.05, 0.175));
			return (this.BK = bakeKit(g, { ao: false, ground: false }));
		},
		/* once a frame: the traffic, the oil slicks */
		scene(W, dt) {
			if (W.scF === W.t) return;
			W.scF = W.t;
			/* the chase song (Pursuit Mode, from a file) from the countdown until it's over; wind by your speed (the TV: the
			   pack's); once even with several worlds on one screen */
			if (!W.split || (typeof TVS !== "undefined" && TVS && TVS.worlds[0].W === W)) {
				if (!W.musOn && W.t > -2.5) {
					W.musOn = 1;
					musTrack("music/pursuit.mp3", 0.75);
				}
				const done = W.over || W.list.some((e) => e.side === 0 && e.f && (e.f.esc || e.f.bg === 0));
				if (W.musOn === 1 && done) {
					W.musOn = 2;
					musStop(2.5);
				}
				if (!W.wind && W.t > -1) W.wind = windSnd() || { set() {}, stop() {} };
				if (W.wind) {
					const L = W.tv ? W.list.filter((e) => !e.gone) : [W.me],
						sp = L.reduce((a, e) => a + Math.hypot(e.vx || 0, e.vz || 0), 0) / Math.max(1, L.length);
					W.wind.set(Math.min(1, sp / (this.V0 + this.UP)), W.t >= 0 && !W.over);
				}
			}
			const T = this.solo(W);
			/* cars the cash truck hit (here or on its device) or a wrecking ball smashed fly off the road: sideways, up,
			   spinning, into the field */
			W.list.forEach((q) => {
				if (q.side !== 1 || !q.f || !q.f.wk) return;
				q.f.wk.forEach(([id, t, d]) => {
					const c = W.cars.find((x) => x.id === id);
					if (c && c.kT === undefined) {
						c.kT = t;
						c.kd = d;
						this.carFx(W, c, q);
					}
				});
			});
			((T && T.f && T.f.tk) || []).forEach(([id, t, d]) => {
				const c = W.cars.find((q) => q.id === id);
				if (c && c.kT === undefined) {
					c.kT = t;
					c.kd = d;
					this.carFx(W, c, T);
				}
			});
			/* a car grabbed by a wrecking ball leaves the traffic (it counts as knocked from then on, wreckFx swings it) */
			W.list.forEach((q) => {
				const wb = q.side === 1 && q.f && q.f.wb;
				if (!wb || !(wb[4] >= 0)) return;
				const c = W.cars.find((x) => x.id === wb[4]);
				if (!c || c.kT !== undefined) return;
				const z0 = this.carZ(W, c, wb[1]);
				c.held = { x: this.carX(W, c, z0), z: z0, by: wb[0] };
				c.kT = wb[1] + this.WBT;
				c.kd = 1;
			});
			W.cars.forEach((c) => {
				if (c.held) return;
				if (c.kT === undefined) {
					const z = this.carZ(W, c);
					return c.g.position.set(this.carX(W, c, z), 0, z);
				}
				const p = this.carPos(W, c),
					a = Math.max(0, W.t - c.kT);
				c.g.position.set(p.x, p.y, p.z);
				c.g.rotation.set(0, c.kd * a * 3.2, c.kd * Math.min(1.4, a * 2.4));
			});
			const fdt = Math.min(0.05, dt || 0.016);
			this.streakStep(W, fdt);
			this.heliStep(W, fdt);
			/* for tools/watch.mjs: seconds cops spent right in front of the cash truck, in its lane */
			if (T && W.t > 0)
				W.list.forEach((c) => {
					if (c.side === 1 && !c.gone && c.z < T.z && c.z > T.z - 7 && Math.abs(c.x - T.x) < c.hb[0] + T.hb[0])
						W.blockT = (W.blockT || 0) + fdt;
					if (c.side === 1 && !c.gone) {
						W.maxAhead = Math.max(W.maxAhead || 0, T.z - c.z);
						/* where each cop spends its time: far behind (30+ m), behind, alongside, ahead */
						const dz = c.z - T.z,
							q = ((W.copT = W.copT || {})[mgName(c)] = W.copT[mgName(c)] || [0, 0, 0, 0]);
						q[dz > 30 ? 0 : dz > T.hb[1] + c.hb[1] ? 1 : dz > -T.hb[1] - c.hb[1] ? 2 : 3] += fdt;
					}
				});
			/* trucks grinding side by side: sparks between them */
			if (W.t > 0)
				W.list.forEach((a, i) =>
					W.list.slice(i + 1).forEach((b) => {
						if (a.gone || b.gone) return;
						if (!a.hb || !b.hb) return;
						const dx = b.x - a.x,
							dz = b.z - a.z;
						if (Math.abs(dx) < a.hb[0] + b.hb[0] + 0.12 && Math.abs(dz) < (a.hb[1] + b.hb[1]) * 0.8)
							this.sparks(W, a, (a.x + b.x) / 2, (a.z + b.z) / 2);
					}),
				);
			W.loose = W.loose.filter((b) => {
				const g = b.g;
				if (W.t - b.t > 10) {
					W.sc.remove(g);
					return false;
				}
				b.vy -= 22 * fdt;
				g.position.x += b.vx * fdt;
				g.position.y += b.vy * fdt;
				g.position.z += b.vz * fdt;
				g.rotation.x += b.sp * fdt;
				g.rotation.z += b.sp * 0.7 * fdt;
				if (g.position.y < 0.22) {
					g.position.y = 0.22;
					b.vy = Math.abs(b.vy) > 1.5 ? -b.vy * 0.35 : 0;
					b.vx *= 0.55;
					b.vz *= 0.55;
					b.sp *= 0.5;
				}
				return true;
			});
			this.hazardFx(W);
			this.stripFx(W);
			/* the slam's shockwave: a glowing ring running out round the truck, dust and a thump as it lands */
			{
				const ring = this.ring(W, T);
				if (!W.swM) {
					W.swM = new THREE.Mesh(
						new THREE.RingGeometry(0.85, 1, 56),
						new THREE.MeshBasicMaterial({
							color: "#FFE27A",
							transparent: true,
							opacity: 0,
							depthWrite: false,
							blending: THREE.AdditiveBlending,
							side: THREE.DoubleSide,
						}),
					);
					W.swM.rotation.x = -Math.PI / 2;
					W.swM.renderOrder = 3;
					W.sc.add(W.swM);
				}
				W.swM.visible = !!(ring && ring.r > 0);
				if (W.swM.visible) {
					W.swM.position.set(T.x, 0.3, T.z);
					W.swM.scale.set(ring.r, ring.r, 1);
					W.swM.material.opacity = 0.95 * (1 - ring.r / (this.SWR + 1.5));
					if (W.swSeen !== ring.id) {
						W.swSeen = ring.id;
						const near = W.tv || Math.hypot(W.me.x - T.x, W.me.z - T.z) < 20;
						if (near) {
							sfxPack("crunchy");
							W.shake = Math.max(W.shake, 0.45);
						}
						for (let i = 0; i < 16; i++) {
							const a = (i / 16) * Math.PI * 2;
							burst(W.sc, T.x + Math.cos(a) * 2.2, 0.4, T.z + Math.sin(a) * 2.6, {
								n: 2,
								shape: "ico",
								cols: ["#9DA0A6", "#C9CED8", "#FFE27A"],
								spd: 5,
								up: 3,
								grav: 12,
								life: 0.6,
								size: 1.1,
							});
						}
					}
				}
			}
			/* cars falling off the bridge: a splash in the river */
			W.cars.forEach((c) => {
				if (c.kT === undefined || c.spl || c.g.position.y > -6.6) return;
				c.spl = 1;
				burst(W.sc, c.g.position.x, -6.8, c.g.position.z, {
					n: 22,
					shape: "ico",
					cols: ["#D9EEF5", "#9FD8F0", "#F4F6F9"],
					spd: 4,
					up: 8,
					grav: 14,
					life: 1,
					size: 1.2,
				});
				c.g.visible = false;
			});
			if (W.wLamp) W.wLamp.emissiveIntensity = Math.floor(W.t * 2.5) % 2 ? 1.8 : 0.15;
			if (W.wArrow) W.wArrow.material.emissiveIntensity = Math.floor(W.t * 2) % 2 ? 1.1 : 0.25;
			const oil = (T && T.f && T.f.oil) || [];
			oil.forEach(([id, x, z, t]) => {
				let m = W.oilM[id];
				if (!m) {
					m = W.oilM[id] = decal(W.sc, new THREE.CircleGeometry(this.OILR, 18), "#101317", x, 0.13, z, 0.85);
					m.scale.set(1, 0.75, 1);
					m.userData.t = t;
				}
			});
			for (const id in W.oilM) {
				const m = W.oilM[id],
					a = W.t - m.userData.t;
				m.visible = a < this.OILT;
				if (m.visible) m.material.opacity = 0.85 * Math.min(1, (this.OILT - a) / 1.5) * Math.min(1, a * 4 + 0.3);
			}
		},
		/* CPUs: the truck keeps to a clear lane at full speed and oils a cop close behind; cops steer at it, catch up and
		   ram when close; both swerve round traffic ahead */
		bot(W, e) {
			const o = { x: 0, y: -1, boost: false };
			if (W.t < 0 || e.d) return o;
			e.sk = e.sk ?? 0.4 + Math.random() * 0.6;
			const T = this.solo(W),
				oil = (T && T.f && T.f.oil) || [],
				blocked = (x, far) =>
					x < this.edges(e.z - Math.min(far, 18))[0] + 1.2 ||
					x < this.edges(e.z - far)[0] + 1.2 ||
					W.cars.some((c) => {
						const cz = this.carZ(W, c);
						return cz < e.z && cz > e.z - far && Math.abs(this.carX(W, c, cz) - x) < 2.4;
					}) ||
					(e.side === 0 &&
						W.list.some(
							(c) =>
								(c.side === 1 &&
									((c.f && c.f.zn) || []).some(
										([id, kind, zx, zz, t]) =>
											W.t - t < this.ZL + this.ZT &&
											zz < e.z &&
											zz > e.z - far &&
											Math.abs(zx - x) < this.lobR(kind) + 1.6 &&
											W.t >= this.lobSeen(e, c.k + ":" + id, t),
									)) ||
								/* spike strips: in plain sight on the road, spotted 0.35-0.7 s after they go down */
								((c.f && c.f.ss) || []).some(
									([, sx, sz, t]) =>
										W.t - t > 0.35 + 0.35 * (1.2 - e.sk) &&
										W.t - t < this.SST &&
										sz < e.z &&
										sz > e.z - far &&
										Math.abs(sx - x) < this.SSW / 2 + 1.6,
								) ||
								/* rolling bins: in plain sight */
								(c.f &&
									c.f.rb &&
									Array.from({ length: this.BN }, (_, i) => this.binPos(W, c.f.rb, i)).some(
										(b) => b && !b.fly && b.z < e.z && b.z > e.z - far && Math.abs(b.x - x) < 2.2,
									)),
						)) ||
					(e.side === 1 &&
						oil.some(
							([, ox, oz, t]) => W.t - t < this.OILT && oz < e.z && oz > e.z - far * 0.6 && Math.abs(ox - x) < 2.6,
						)),
				clear = (want) => {
					let best = want,
						bd = 1e9;
					for (let l = 0; l < this.LANES; l++) {
						const x = this.lx(l);
						if (blocked(x, 26)) continue;
						const d = Math.abs(x - want) + Math.abs(x - e.x) * 0.5;
						if (d < bd) {
							bd = d;
							best = x;
						}
					}
					return best;
				};
			let tx = e.x;
			if (e.side === 0 || !T) {
				const cops = W.list.filter((q) => q.side === 1 && !q.gone),
					near = cops.find((q) => Math.abs(q.x - e.x) < 4.5 && Math.abs(q.z - e.z) < 5);
				tx = blocked(e.x, 24) ? clear(e.x) : near ? e.x + (e.x > near.x ? 6 : -6) : e.x;
				if (cops.some((q) => q.z > e.z + 2 && q.z < e.z + 9 && Math.abs(q.x - e.x) < 3) && Math.random() < 0.12 * e.sk)
					o.boost = true;
				/* slam when cops crowd round (two within 7 m, or one right on it); a harpoon on it: swerve hard away to snap it
				   (if it notices) */
				const close = cops.filter((q) => Math.hypot(q.x - e.x, q.z - e.z) < 7);
				if (
					(close.length >= 2 || close.some((q) => Math.hypot(q.x - e.x, q.z - e.z) < 4)) &&
					Math.random() < 0.06 * e.sk
				)
					o.b2 = true;
				/* the spear at a cop in front of it, now and then (soonest at one lining up to drop spikes) */
				if (W.t >= (e.spCd || 0) && Math.random() < 0.03 * e.sk) {
					const c = this.spearTarget(W, e);
					if (c && (Math.abs(c.x - e.x) < 3 || e.z - c.z < 15)) o.b3 = true;
				}
				/* like a person: it notices a harpoon only now and then (44-65% by skill), and a beat late (0.3-0.6 s after it
				   bites), so a cop close behind usually lands the hit before the swerve snaps the line */
				const hk = this.hooks(W, e)[0];
				if (hk) {
					const key = hk.c.k + ":" + hk.id;
					e.snapTry = e.snapTry || {};
					if (e.snapTry[key] === undefined)
						e.snapTry[key] = Math.random() < 0.3 + 0.35 * e.sk ? W.t + 0.3 + Math.random() * 0.3 * (1.4 - e.sk) : -1;
					if (e.snapTry[key] >= 0 && W.t >= e.snapTry[key]) tx = e.x + (e.x > hk.c.x ? 9 : -9);
				}
			} else {
				/* a beat late and a little off: re-aim every 0.3-0.8 s with a miss of up to a lane, and ease off to about the
				   truck's speed once close instead of riding its bumper */
				if (W.t >= (e.reT || 0)) {
					e.reT = W.t + 0.3 + Math.random() * 0.5 * (1.4 - e.sk);
					e.aimX = T.x + (Math.random() - 0.5) * 2.4 * (1.3 - e.sk);
				}
				const dz = e.z - T.z,
					dT = Math.hypot(T.x - e.x, T.z - e.z),
					/* think time, like a person: once a button is ready the CPU waits a while (lo .. lo + span s, less when
					   skilled) before it's willing to use it */
					think = (key, cd, lo, span) => {
						if (W.t < cd) {
							e[key] = undefined;
							return false;
						}
						if (e[key] === undefined) e[key] = W.t + lo + Math.random() * span * (1.3 - e.sk);
						return W.t >= e[key];
					},
					hpOk = think("hpAt", e.hpCd || 0, 1, 2),
					/* dropping spikes needs no aim: a short think (0.3-0.8 s) */
					ssOk = think("ssAt", e.hpCd || 0, 0.3, 0.5),
					/* one harpoon at a time: it waits while another cop's is out (or was fired in the last 1.5 s) */
					busy = W.list.some((c) => c !== e && c.side === 1 && !c.gone && c.f && c.f.hp && W.t - c.f.hp[1] < 1.5),
					sd = e.x >= T.x ? 1 : -1,
					gap = e.hb[0] + T.hb[0] + 2.2,
					[lo, hi] = this.edges(e.z),
					/* roles: the cop closest behind the truck (human or CPU) is the hunter that goes for the harpoon; every
					   other CPU cop is a runner whose job is to get past the truck and lay spikes */
					hunter = W.list.filter((c) => c.side === 1 && !c.gone && c.z > T.z).sort((a, b) => a.z - b.z)[0],
					runner = hunter !== e;
				let wx = e.aimX;
				if (this.ahead(W, e, T) && W.t >= (e.hpCd || 0)) {
					/* ahead of it with spikes ready: get into its lane 10-25 m ahead and drop the strip once lined up (the
					   strip lands 10-25 m in front of the truck: about 0.5-1.1 s to swerve round it) */
					wx = T.x;
					o.y = dz > -10 ? -1 : dz < -25 ? 1 : 0.2;
					if (ssOk && dz < -10 && Math.abs(e.x - T.x) < 1.8) {
						o.boost = true;
						return o;
					}
				} else if (runner && (dz > -this.SSA || W.t >= (e.hpCd || 0) - 2)) {
					/* the runner: alongside its lane, flat out, vaulting cars to get past it (once ahead, only while its spikes are nearly ready: it doesn't hang in front) */
					const want = T.x + sd * gap;
					wx = want > hi - 1 || want < lo + 1 ? T.x - sd * gap : want;
					o.y = -1;
				} else if (dz < 2) {
					/* level with it or ahead (spikes used): pull out of its lane, to the side it is already on (out of the
					   spear), and drop back behind it */
					const want = T.x + sd * gap;
					wx = want > hi - 1 || want < lo + 1 ? T.x - sd * gap : want;
					o.y = dz < -1 ? 1 : 0.5;
				} else o.y = dz > 6 ? -1 : dz > 1.5 ? -0.65 : 0.5;
				tx = blocked(wx, 22) ? clear(wx) : wx;
				/* the harpoon at the truck: only from close behind, lined up, and not while another cop's is out */
				const ang = Math.atan2(T.x - e.x, Math.max(0.1, dz));
				if (!runner && hpOk && !busy && dz > 1 && dT < this.HPRT - 1 && Math.abs(ang) < this.HPA * 1.3) {
					o.boost = true;
					o.x = Math.max(-1, Math.min(1, ang * 1.3 + (Math.random() - 0.5) * 0.4));
					return o;
				}
				/* far behind (or stuck behind a car), or the runner until it's past: harpoon a car ahead and vault it (a short
				   think: a car needs no careful aim) */
				if (think("vtAt", e.hpCd || 0, 0.2, 0.5) && (dz > 12 || (runner && dz > -this.SSA - 2))) {
					const car = W.cars.find((c) => {
						const cz = this.carZ(W, c);
						return c.kT === undefined && cz < e.z - 4 && cz > e.z - 14.5 && Math.abs(this.carX(W, c, cz) - e.x) < 4.5;
					});
					if (car) {
						const cz = this.carZ(W, car);
						o.boost = true;
						o.x = Math.max(-1, Math.min(1, (this.carX(W, car, cz) - e.x) / (0.7 * (e.z - cz))));
						return o;
					}
				}
				/* its truck's trick: after a longer think (2-5 s), and only when it fits */
				if (think("abAt", e.abCd || 0, 2, 3)) {
					const A = this.abOf(e),
						k = A.kind;
					if (
						(A.lob && dz > 0 && dT < 40) ||
						(k === "pickup" && (dz > 16 || (runner && dz > -3))) ||
						(k === "food" && dT < 60) ||
						(k === "garbage" && dz > 0 && dT < 50) ||
						(k === "monster" && dz > 14 && dz < 42) ||
						(k === "fire" && dT < 40) ||
						(k === "tow" && Math.abs(dz) < 5 && dT < 8)
					)
						o.b2 = true;
				}
			}
			o.x = Math.max(-1, Math.min(1, (tx - e.x) * 0.45));
			if (o.b2 && e.side === 0 && W.t < (e.swCd || 0)) o.b2 = false;
			return o;
		},
		/* when the CPU cash truck sees a lob coming (thrown at t): like a person it spots one in flight only now and then
		   (35-65% by skill) and a beat late (0.45-0.85 s after the throw, landing at ZL = 1 s); the rest once they're
		   lying on the road */
		lobSeen(e, key, t) {
			e.lobSn = e.lobSn || {};
			if (e.lobSn[key] === undefined)
				e.lobSn[key] =
					Math.random() < 0.35 + 0.3 * e.sk ? t + 0.45 + Math.random() * 0.4 * (1.4 - e.sk) : t + this.ZL + 0.3;
			return e.lobSn[key];
		},
		watchSum(W) {
			const T = this.solo(W);
			return T
				? `cash truck: ${T.f.bg} bags${T.f.esc ? ", escaped" : ""}, at ${Math.round(-T.z)} m; cops in front of it ${Math.round(W.blockT || 0)} s, a cop got up to ${Math.round(W.maxAhead || 0)} m ahead; s far behind / behind / alongside / ahead: ${Object.entries(
						W.copT || {},
					)
						.map(([k, q]) => `${k} ${q.map(Math.round).join("/")}`)
						.join(", ")}`
				: "";
		},
		/* tools/nettest.mjs: the bags and the escape must agree */
		syncSnap(W) {
			const T = this.solo(W);
			return T ? { bags: T.local ? T.bags : T.f.bg, mask: T.local ? T.bm : T.f.bm, esc: !!(T.f && T.f.esc) } : 0;
		},
	},
});
