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
		how: "Drive out of your paint to draw a trail, then get back to it: the paint bucket fills everything inside your loop. Cross a rival's open trail to wash it away! Most paint at the end wins.",
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
		prompt(W, me) {
			if (!me.pl || W.t < 0) return "";
			if (me.pl.cutT !== undefined && W.t - me.pl.cutT < 1.6) return "✂️ Your trail got washed away!";
			if (me.pl.cells.length) return "🎨 Get back to your paint to fill the loop!";
			return W.t < 6 ? "Drive out of your paint, loop round and come back!" : "";
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
	R: 12.5,
	TV: 12 /* tyre speed */,
	CLAW: 1.1 /* seconds close before the magnet grabs */,
	JUMP: 0.7 /* ground pound: jump time before the slam */,
	RING: 10 /* shockwave speed */,
	hpMax: (n) => Math.min(14, Math.max(6, n * 3)),
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
/* chunky monster tyre, axle along x (rolls along z): tread, sidewalls, silver hub, yellow cap, tread blocks */
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
/* the electromagnet that comes down for anyone who stays too close (on a cable from a crane off screen) */
function mmMagnet() {
	const g = new THREE.Group();
	g.add(Cy(0.95, 0.95, 0.42, 12, "#4A525C", 0, 0.21, 0));
	g.add(Cy(1.0, 1.0, 0.14, 12, "#FFC83D", 0, 0.25, 0));
	g.add(Cy(0.85, 0.95, 0.12, 12, "#C9CED8", 0, -0.04, 0));
	g.add(Cy(0.7, 0.9, 0.24, 12, "#E5484D", 0, 0.54, 0));
	g.add(Cy(0.16, 0.16, 0.3, 6, "#3D424C", 0, 0.8, 0));
	g.add(Cy(0.06, 0.06, 30, 5, "#3D424C", 0, 15.9, 0));
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
		dur: 45,
		lastStanding: false,
		noAssist: true,
		camZoom: 1.08,
		how: "Boss fight! The monster truck fires tyres and ground-pounds from its turntable. Grab TNT crates and drive them into it: knock it out or survive to win as a team.",
		teamHow: (s) =>
			s === 0
				? "You're the MONSTER: tap FIRE for tyres, hold it for a Ground Pound. Knock them all into the mud!"
				: "Grab 🧨 TNT and drive it into the monster! DASH through shockwaves, and don't hang around it: the magnet grabs you.",
		stickHint: (fine) =>
			fine
				? "WASD or arrows to drive (the monster aims with them). Space: fire / dash."
				: "Drag to drive (the monster aims). The button fires (hold: Ground Pound) or dashes.",
		R: () => MM.R,
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
			/* TNT crates on a schedule from the seed, more often with fewer survivors */
			const every = Math.min(7, Math.max(2.2, 12 / n)),
				rr = mulberry((W.mg.seed || 1) + 907),
				cm = new THREE.MeshStandardMaterial({ map: hlCrateTex(), roughness: 0.9 });
			W.mm.crates = [];
			for (let k = 0; 2.5 + k * every < this.dur; k++) {
				const a = rr() * Math.PI * 2,
					r = 6.5 + rr() * (MM.R - 7.7),
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
				const ts = 2.5 + k * every;
				W.mm.crates.push({ id: k + 1, ts, te: ts + 14, x: g.position.x, z: g.position.z, g, box, sh, mark });
			}
		},
		spawn(W, i, n) {
			const e = W.list[i];
			if (e && e.side === 0) return { x: 0, z: 0, yaw: -Math.PI / 2 };
			const solo = W.list[0] && W.list[0].side === 0,
				j = solo ? i - 1 : i,
				m = solo ? n - 1 : n,
				a = (j / Math.max(1, m)) * Math.PI * 2 + Math.PI / 2;
			return { x: Math.cos(a) * 8, z: Math.sin(a) * 8, yaw: Math.atan2(Math.sin(a), -Math.cos(a)) };
		},
		initEnt(W, e) {
			e.f = { dh: 0, dy: 0 };
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
				return;
			}
			/* the monster: a giant on the turntable with a tyre cannon on its roof */
			const k = 1.8,
				sc = 0.8 * k;
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
			e.spd = 0.85;
			e.fcd = 1.2;
			e.pcd = 4;
			e.chg = 0;
		},
		inside(W, x, z, e) {
			return (e && e.side === 0) || Math.hypot(x, z) < MM.R + 0.15;
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
				W.mm.banner = ph === 2 ? "ENRAGED! Double tyres!" : "The turntable drops: it's loose!";
				W.mm.bannerT = W.t + 2.2;
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
			if (m) {
				m.rad = W.ph < 3 ? 2.8 : 1.71;
				m.mass = W.ph < 3 ? 50 : 4;
			}
			if (W.hp <= 0 && W.ko === undefined) {
				W.ko = W.t;
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
			if (e.side === 0) this.monPhys(W, e, inp, dt);
			else this.survPhys(W, e, inp, dt);
		},
		monPhys(W, e, inp, dt) {
			const press = !!(inp && (inp.boost || inp.fire));
			if (inp) inp.boost = false;
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
				const lim = MM.R - 1.2,
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
			}
			if (inp && inp.hold && e.pcd <= 0 && !jumping) {
				e.chg += dt;
				if (e.chg >= 0.8) {
					const r = (v) => Math.round(v * 100) / 100;
					e.chg = 0;
					e.pcd = ph === 3 ? 5 : 6;
					e.f.gpn = (e.f.gpn | 0) + 1;
					e.f.gp = [e.f.gpn, r(W.t), r(e.x), r(e.z)];
				}
			} else e.chg = 0;
			e.f.ch = Math.round((e.chg / 0.8) * 10) / 10;
			const sv = W.list.filter((o) => o.side !== 0 && !o.gone);
			e.sc = sv.filter((o) => !o.al).length;
			if (sv.length && W.t > 1 && sv.every((o) => !o.al)) {
				e.d = true;
				e.won = true;
			}
		},
		knock(W, e, nx, nz, K, sl) {
			e.vx += nx * K;
			e.vz += nz * K;
			e.slideT = sl;
			e.hitAng = [nx, nz];
			if (e.isMe) W.shake = 0.4;
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
				const g = e.gr;
				e.vx = e.vz = 0;
				e.x += (g.x - e.x) * Math.min(1, dt * 6);
				e.z += (g.z - e.z) * Math.min(1, dt * 6);
				e.y += (3 - e.y) * Math.min(1, dt * 5);
				if (inp && inp.boost) {
					g.taps++;
					inp.boost = false;
					e.wig = 0.25;
				}
				if (W.hp < g.hp || g.taps >= 5) this.release(W, e, 5);
				else if (W.t - g.t0 >= 1.6) {
					const dx = e.x - (m ? m.x : 0),
						dz = e.z - (m ? m.z : 0),
						d = Math.hypot(dx, dz) || 1;
					e.gr = null;
					e.f.gr = 0;
					e.fly = false;
					e.f.dy = 0;
					e.vx = (dx / d) * 20;
					e.vz = (dz / d) * 20;
					e.vy = 6;
					e.falling = true;
					eliminate(W, e);
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
			arenaPhys(W, e, inp, dt);
			if (!e.al || e.falling || e.d || W.t < 0) return;
			e.tA = W.t;
			e.sc = Math.floor(W.t * 10);
			for (const t of W.tyLive || [])
				if (t.hit && !e.tyHit[t.id] && Math.hypot(e.x - t.x, e.z - t.z) < 1.4) {
					e.tyHit[t.id] = 1;
					if (W.t - (e.tyT || -9) > 0.3) {
						e.tyT = W.t;
						this.knock(W, e, t.dx, t.dz, 11, 0.5);
					}
				}
			const g = W.gpLive;
			if (g && g.r > 0 && !e.gpHit[g.id]) {
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
						if (e.isMe) {
							W.mm.banner = "Dodged!";
							W.mm.bannerT = W.t + 0.8;
						}
					} else this.knock(W, e, dx / d, dz / d, 11, 0.5);
				}
			}
			if (!e.f.dy)
				for (const c of W.mm.crates)
					if (W.t >= c.ts + 0.5 && W.t < c.te && Math.hypot(e.x - c.x, e.z - c.z) < 1.6 && W.claim(c.id)) {
						e.c.push(c.id);
						e.f.dy = c.id;
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
				this.knock(W, e, dx / d, dz / d, 12, 0.5);
			}
			const cr = (W.ph < 3 ? 2.8 : 1.71) + 1.7;
			e.nr = d < cr ? e.nr + dt : Math.max(0, e.nr - dt * 1.5);
			if (e.nr >= MM.CLAW) {
				e.gr = { t0: W.t, hp: W.hp, taps: 0, x: e.x, z: e.z };
				e.f.gr = 1;
				e.fly = true;
				if (e.isMe) sfx("magnet");
			}
			e.f.nr = Math.round(e.nr * 10) / 10;
		},
		rules() {},
		timeUp() {},
		/* survivor: 1000 if still on the stage + 100 per TNT hit + seconds on the stage; monster: 100 per crushed + HP left */
		final(W, e) {
			if (e.side === 0) return e.sc * 100 + Math.max(0, W.hp);
			return (e.al ? 1000 : 0) + ((e.f.dh | 0) % 10) * 100 + Math.min(99, Math.floor(e.tA || 0));
		},
		fmtE(W, e) {
			if (e.side === 0) return `${Math.max(0, W.hp)} HP`;
			return !e.al ? "OUT" : e.f && e.f.dy ? "🧨" : `${(e.f && e.f.dh) | 0} 💥`;
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
		prompt(W, me) {
			const mm = W.mm;
			if (mm.banner && W.t < mm.bannerT) return mm.banner;
			if (me.side === 0) return W.t < 4 ? "Tap FIRE for tyres, hold it for a Ground Pound!" : "";
			if (me.gr) return "Tap DASH to break free!";
			if (me.nr > 0.35) return "Too close! The magnet is coming!";
			if (me.f.dy) return "Drive the TNT into the monster!";
			return "";
		},
		donePrompt(W, me) {
			if (W.ko !== undefined) return me.side === 0 ? "KNOCKED OUT!" : "The monster is down!";
			if (me.side === 0) return me.won ? "You crushed them all!" : "Time's up!";
			return me.al ? "You survived!" : "Into the mud! Watch the others…";
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
				const ch = (e.local ? e.chg / 0.8 : e.f && e.f.ch) || 0;
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
				if (ph < 3) mm.top.rotation.y = e.yaw;
			} else if (e.bun) {
				e.bun.visible = !!(e.f && e.f.dy && e.al);
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
			}
			mm.lastHp = W.hp;
			if (m && mm.flinch > 0) {
				mm.flinch = Math.max(0, mm.flinch - dt * 3);
				m.tr.rotation.x += Math.sin(mm.flinch * 20) * 0.08 * mm.flinch;
			}
			/* tyres: arc out of the muzzle, roll with a bounce, drop off the edge into the mud */
			const live = W.tyLive || [],
				used = new Set();
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
					y = 0.6 + (t.h - 0.6) * (1 - k * k);
				} else if (t.on) y = 0.6 + Math.abs(Math.sin(t.s * 0.9)) * 0.35;
				else {
					const tf = (t.s - t.sx) / MM.TV;
					y = 0.6 - 15 * tf * tf;
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
				sl.o.rotation.y = Math.atan2(t.dx, t.dz);
				sl.t.rotation.x = t.s / 0.6;
			});
			mm.ty.forEach((q) => {
				if (!used.has(q)) {
					q.o.visible = false;
					q.id = null;
				}
			});
			/* ground pound: a pulsing warning ring while it charges and jumps, then the shockwave */
			const ch = m ? (m.local ? m.chg / 0.8 : (m.f && m.f.ch) || 0) : 0,
				gp = W.gpLive,
				wv = !!((gp && W.t < gp.slam) || ch > 0);
			mm.warn.visible = wv;
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
			/* magnets: a red ring under anyone who stays close, the magnet coming down, then holding them up */
			W.list.forEach((e) => {
				if (e.side === 0 || e.gone) return;
				const nr = e.local ? e.nr : (e.f && e.f.nr) || 0,
					gr = !!(e.f && e.f.gr);
				let g = mm.mag[e.k];
				if (!g) {
					g = mm.mag[e.k] = {
						m: mmMagnet(),
						w: new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 28), mm.ringMat("#FF3B1F")),
					};
					g.w.rotation.x = -Math.PI / 2;
					g.w.visible = false;
					W.sc.add(g.m, g.w);
				}
				const on = e.al && !e.falling && (gr || nr > 0.25);
				g.m.visible = !!on;
				g.w.visible = !!(on && !gr);
				if (!on) return;
				const top = e.y + (e.topY || 1.4) + 0.1;
				g.m.position.set(e.x, gr ? top : Math.max(top, 16 - (nr / MM.CLAW) * (16 - top)), e.z);
				g.w.position.set(e.x, 0.1, e.z);
				g.w.material.opacity = Math.min(1, nr / MM.CLAW) * (0.6 + 0.4 * Math.sin(W.t * 20));
			});
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
			/* boss bar: the monster's name and one segment per HP */
			let bar = document.getElementById("mmbar");
			const box = document.getElementById("mg");
			if (!bar && box && m) {
				bar = document.createElement("div");
				bar.id = "mmbar";
				bar.innerHTML = `<b>${esc(TRUCKS[m.p.truck].name)}</b><div class="mmhp"></div>`;
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
			if (!mm.lbl) {
				const sp = document.querySelector("#ram span");
				if (sp) {
					sp.textContent = W.me.side === 0 ? "FIRE" : "DASH";
					mm.lbl = true;
				}
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
					out = { x: 0, y: 0, fire: false, hold: false };
				if (tg) {
					const T = near(tg) / MM.TV + 0.15,
						dx = tg.x + tg.vx * T - e.x,
						dz = tg.z + tg.vz * T - e.z,
						l = Math.hypot(dx, dz) || 1;
					if (e.aimErr === undefined || Math.random() < dt * 1.5) e.aimErr = (Math.random() - 0.5) * 0.2;
					const a = Math.atan2(-dz, dx) + e.aimErr;
					out.x = W.ph === 3 ? dx / l : Math.cos(a);
					out.y = W.ph === 3 ? dz / l : -Math.sin(a);
					out.fire = Math.abs(wrapA(a - e.yaw)) < 0.14 && Math.random() < dt * 12;
				}
				const crowd = sv.filter((o) => near(o) < 7.5).length,
					carrier = sv.some((o) => o.f && o.f.dy && near(o) < 6.5);
				if (e.pcd <= 0 && (crowd >= 2 || carrier || sv.some((o) => near(o) < 4.8))) e.wantP = true;
				if (e.pcd > 0) e.wantP = false;
				out.hold = !!e.wantP;
				return out;
			}
			/* survivors: fetch TNT and deliver it, keep clear of the monster otherwise, sidestep tyres, dash through rings */
			if (e.gr) return { x: 0, y: 0, boost: Math.random() < dt * 3.2 };
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
			if (e.f.dy && m) go(m.x, m.z, 1.4);
			else {
				const c = W.mm.crates
					.filter((c) => W.t >= c.ts && W.t < c.te - 1 && !W.claimed.has(c.id))
					.sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
				if (c) go(c.x, c.z, 1);
				else go(Math.cos(W.t * 0.4 + e.i * 2) * 8, Math.sin(W.t * 0.4 + e.i * 2) * 8, 0.6);
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
				if (ahead > 0 && ahead < 4.5 && Math.abs(side) < 1.8) {
					if (e.tyNote[t.id] === undefined) e.tyNote[t.id] = Math.random() < 0.4;
					if (!e.tyNote[t.id]) continue;
					const sg = side >= 0 ? 1 : -1;
					x += -t.dz * sg * 1.6;
					z += t.dx * sg * 1.6;
				}
			}
			const r = Math.hypot(e.x, e.z);
			if (r > MM.R * 0.72) go(0, 0, ((r / MM.R - 0.72) / 0.28) * 2);
			let boost = false;
			const g = W.gpLive;
			if (g && e.bcd <= 0) {
				const d = Math.hypot(e.x - g.x, e.z - g.z),
					eta = g.r > 0 ? (d - g.r) / MM.RING : g.slam - W.t + (d - 2.6) / MM.RING;
				if (eta > 0 && eta < 0.12) {
					if (e.dodgeRoll === undefined) e.dodgeRoll = Math.random() < 0.7;
					boost = e.dodgeRoll;
				}
				if (g.r > d + 1) e.dodgeRoll = undefined;
			}
			const l = Math.hypot(x, z);
			return l < 0.05 ? { x: 0, y: 0, boost } : { x: x / l, y: z / l, boost };
		},
		botScore: (s) =>
			s === 0 ? rnd(4) * 100 + rnd(6) : rnd(2) ? 1000 + rnd(3) * 100 + 45 : rnd(3) * 100 + 10 + rnd(30),
	}),
});
