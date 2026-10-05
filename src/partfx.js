
/* ---------- sky gradients ---------- */
const SKY = { storm: ["#4A5260", "#7C8594", "#A4ACB8"], night: ["#0B1030", "#2A2352", "#5A3558"], dusk: ["#2E3470", "#D9668A", "#FFB36B"], def: ["#4E9BE0", "#9FD4F5", "#E3F3FA"], junk: ["#5B8FCF", "#E8C08F", "#F3DDBE"], warm: ["#4E9BE0", "#A9D9F2", "#F4E9D2"], volc: ["#4A78B8", "#D9A07E", "#E8B48C"] };
function applySky(s, pal) { const p = SKY[pal] || SKY.def; s.background = canvasTex(4, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, p[0]); g.addColorStop(.62, p[1]); g.addColorStop(1, p[2]); x.fillStyle = g; x.fillRect(0, 0, w, h); }); if (s.fog) s.fog.color.set(p[2]); }

/* ---------- per-face colour variation (classic low-poly shading) ---------- */
function varyColors(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo, n = g.attributes.position.count, col = new Float32Array(n * 3);
  let v = 1; for (let i = 0; i < n; i++) { if (i % 6 === 0) v = 1 + (Math.random() - .5) * .1; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); return g;
}

/* ---------- particles ---------- */
const PGEO = {}, PMAT = {};
const pgeo = k => PGEO[k] || (PGEO[k] = k === "coin" ? new THREE.CylinderGeometry(.16, .16, .05, 8) : k === "ico" ? new THREE.IcosahedronGeometry(.14, 0) : new THREE.BoxGeometry(.14, .14, .14));
const pmat = (c, op = 1) => { const k = c + op; return PMAT[k] || (PMAT[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: .6, emissive: c, emissiveIntensity: .25 }, op < 1 ? { transparent: true, opacity: op, depthWrite: false, roughness: .15 } : {}))); };
function burst(scene, x, y, z, o = {}) {
  if (!scene || !GFX.ok) return; const L = scene.userData.parts || (scene.userData.parts = []); const cols = o.cols || ["#FFC83D"], n = Math.min(o.n || 10, 40);
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(pgeo(o.shape || "cube"), pmat(cols[i % cols.length], o.op)); const a = Math.random() * 6.28, sp = (o.spd || 3) * (.4 + Math.random() * .8);
    m.position.set(x, y, z); m.scale.setScalar((o.size || 1) * (o.vary ? .45 + Math.random() * o.vary : 1)); scene.add(m);
    L.push({ m, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: (o.up || 4) * (.6 + Math.random() * .7), g: o.grav === undefined ? 12 : o.grav, life: (o.life || .9) * (.7 + Math.random() * .6), t: 0, s: o.size || 1, sx: (Math.random() - .5) * 12, sy: (Math.random() - .5) * 12, floor: o.floor }); }
}
function stepParts(scene, dt) {
  const L = scene && scene.userData.parts; if (!L || !L.length) return;
  for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; p.t += dt; p.vy -= p.g * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    if (p.floor !== undefined && p.m.position.y < p.floor) { p.m.position.y = p.floor; p.vy *= -.35; p.vx *= .7; p.vz *= .7; }
    p.m.rotation.x += p.sx * dt; p.m.rotation.y += p.sy * dt; const k = 1 - p.t / p.life; p.m.scale.setScalar(Math.max(.001, p.s * Math.min(1, k * 2.5)));
    if (p.t >= p.life) { scene.remove(p.m); L.splice(i, 1); } }
}
const DUST = ["#D8CBB0", "#C9BC9F", "#EDE3CF"];

/* ---------- sound (synthesised, no files) ---------- */
const SFX = { ctx: null, on: LS.get("trp_snd", true) };
function sfxInit() { if (SFX.ctx) return; try { const C = window.AudioContext || window.webkitAudioContext; SFX.ctx = new C(); SFX.out = SFX.ctx.createGain(); SFX.out.gain.value = .32; SFX.out.connect(SFX.ctx.destination); } catch (e) { SFX.ctx = null; } }
addEventListener("pointerdown", () => { sfxInit(); if (SFX.ctx && SFX.ctx.state === "suspended") SFX.ctx.resume(); }, { capture: true });
addEventListener("keydown", () => { sfxInit(); if (SFX.ctx && SFX.ctx.state === "suspended") SFX.ctx.resume(); }, { capture: true });
function tone(f, d, type = "sine", vol = .25, f2 = 0, at = 0) {
  const c = SFX.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(SFX.out); o.start(t); o.stop(t + d + .02);
}
function noiseHit(d, vol = .3, f1 = 800, f2 = 200, at = 0, q = 1) {
  const c = SFX.ctx, t = c.currentTime + at, len = Math.ceil(c.sampleRate * d), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; fl.type = "bandpass"; fl.Q.value = q;
  fl.frequency.setValueAtTime(f1, t); fl.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(SFX.out); s.start(t);
}
function sfx(n) {
  if (!SFX.on || !SFX.ctx || SFX.ctx.state !== "running") return;
  try { switch (n) {
    case "click": tone(1250, .05, "triangle", .08); break;
    case "coin": tone(988, .07, "square", .07); tone(1480, .16, "square", .07, 0, .06); break;
    case "loss": tone(420, .22, "triangle", .14, 210); break;
    case "dice": for (let i = 0; i < 6; i++) noiseHit(.04, .22, 3000, 1500, i * .09 + Math.random() * .03, 3); break;
    case "diceland": noiseHit(.08, .3, 1800, 600, 0, 2); tone(660, .12, "triangle", .1); break;
    case "step": tone(180 + Math.random() * 40, .06, "triangle", .06); break;
    case "land": noiseHit(.12, .18, 600, 150, 0, 1); break;
    case "battery": [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, "square", .08, 0, i * .08)); tone(1568, .4, "triangle", .1, 0, .34); break;
    case "event": [880, 1175, 1568].forEach((f, i) => tone(f, .14, "triangle", .1, 0, i * .06)); break;
    case "magnet": tone(520, .9, "sawtooth", .06, 780); tone(780, .9, "sawtooth", .05, 520, .45); break;
    case "beep": tone(660, .12, "square", .09); break;
    case "go": tone(990, .35, "square", .1); tone(1320, .35, "triangle", .08); break;
    case "ram": noiseHit(.18, .45, 1200, 100, 0, .8); tone(110, .2, "sine", .3, 55); break;
    case "splash": noiseHit(.5, .35, 2500, 300, 0, .7); break;
    case "fanfare": [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 5 ? .5 : .14, "square", .08, 0, i * .12)); break;
    case "honk": tone(196, .5, "square", .12); tone(247, .5, "square", .1); tone(196, .6, "square", .12, 0, .6); tone(247, .6, "square", .1, 0, .6); break;
    case "skid": noiseHit(.55, .2, 2400, 900, 0, 4); noiseHit(.45, .12, 1300, 700, .08, 3); break;
    case "crack": noiseHit(.07, .16, 3200, 1400, 0, 1.6); noiseHit(.12, .1, 1500, 400, .04, 1); break;
    case "thunder": noiseHit(1.6, .5, 220, 40, 0, .5); noiseHit(.9, .35, 400, 60, .15, .7); tone(48, 1.2, "sine", .22, 30); break;
    case "crush": tone(90, .3, "sine", .35, 40); noiseHit(.25, .3, 500, 80); break;
  } } catch (e) {}
}
document.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.a === "snd") { SFX.on = !SFX.on; LS.set("trp_snd", SFX.on); b.textContent = SFX.on ? "🔊" : "🔇"; if (SFX.on) sfx("click"); return; } sfx("click"); });

/* ---------- board: coin/battery bursts, landing dust, fork path preview ---------- */
/* battery purchase: zoom on the buyer, a glowing 3D battery pops out of the truck and flies into their card, then the camera follows the factory to its new spot */
/* Volcano Quarry batteries are purple obsidian */
const BAT_LOOK = { g: ["#1FA35C", "#0E6B3A", "#157A44", "#FFE27A", "#FFC83D"], v: ["#5B2BB5", "#7A3CFF", "#3B2466", "#F3E6FF", "#C9A2FF"] };
const BAT_FX = { g: ["#7CF0A8", "#FFE27A", "#FFFFFF", "#1FA35C"], v: ["#B78CFF", "#F3E6FF", "#FFFFFF", "#7A3CFF"] };
const batKey = () => MAP && MAP.shards ? "v" : "g";
function batteryMesh(purple) {
  const g = new THREE.Group(), L = BAT_LOOK[purple === undefined ? batKey() : purple ? "v" : "g"];
  g.add(mesh(chamferBox(1.5, .95, .85, .16), L[0], { emissive: L[1], emissiveIntensity: .55 }));
  const cap = mesh(chamferBox(.24, .46, .52, .06), L[2]); cap.position.x = .86; g.add(cap);
  const bs = new THREE.Shape(); [[.08, .36], [-.2, -.03], [-.01, -.03], [-.09, -.36], [.22, .07], [.03, .07]].forEach(([x, y], i) => i ? bs.lineTo(x, y) : bs.moveTo(x, y)); bs.closePath();
  const bg = new THREE.ExtrudeGeometry(bs, { depth: .05, bevelEnabled: false }), bm = new THREE.MeshStandardMaterial({ color: L[3], emissive: L[4], emissiveIntensity: .9, flatShading: true });
  [1, -1].forEach(sd => { const b = new THREE.Mesh(bg, bm); b.position.z = sd * .43; if (sd < 0) b.rotation.y = Math.PI; g.add(b); });
  return g;
}
function stepBattery(bd, dt) {
  const s = GFX.bseq; if (!s) return null;
  const t = (performance.now() - s.t0) / 1000, tok = GFX.tok[s.pid];
  const mv = 4.4 + (bd.vx ? FAC_RISE : 0) + FAC_HOP;
  if (t > mv + .75 || !tok) { if (s.m) bd.scene.remove(s.m); GFX.bseq = null; return null; }
  const tp = tok.g.position;
  if (s.m) {
    const m = s.m, rise = Math.min(1, t / 1.1), e = 1 - Math.pow(1 - rise, 3), pop = t < .3 ? t / .3 * 1.3 : t < .5 ? 1.3 - (t - .3) / .2 * .3 : 1;
    const dn = Math.max(0, Math.min(1, (t - 1.55) / .5)), de = dn * dn;
    m.position.set(tp.x, tp.y + .9 + e * 2.4 * (1 - de) - de * .5 + Math.sin(t * 4) * .08 * rise * (1 - dn), tp.z); m.rotation.y = t * (6 - rise * 3.5 + dn * 10) + .4; m.rotation.z = Math.sin(t * 3) * .12 * (1 - dn); m.scale.setScalar(.8 * pop * (1 - de * .97));
    if (!s.sp && t > 1) { s.sp = 1; burst(bd.scene, m.position.x, m.position.y, m.position.z, { n: 26, shape: "ico", cols: BAT_FX[batKey()].slice(0, 3), spd: 6, up: 3, grav: 4, life: .9 }); }
    if (dn >= 1) { bd.scene.remove(m); s.m = null; tok.sq = .28; burst(bd.scene, tp.x, tp.y + .9, tp.z, { n: 16, shape: "ico", cols: [BAT_FX[batKey()][3], BAT_FX[batKey()][0], "#FFFFFF"], spd: 3, up: 2, grav: 3, life: .6 }); sfx("coin");
      const card = [...document.querySelectorAll(".pc[data-k]")].find(c => c.dataset.k === s.pid); if (card) { card.classList.remove("batbump"); void card.offsetWidth; card.classList.add("batbump"); } }
  }
  if (t < 2.9) { const tgt = tp.clone(); tgt.y = tp.y + 2.3 - Math.max(0, Math.min(1, (t - 1.55) / .6)) * 1.3; return [tgt, tgt.clone().add(new THREE.Vector3(0, 5.5, 9))]; }
  if (t < mv + .55 && bd.fac) { const f = bd.fac.position, ft = bd.facTarget, tgt = new THREE.Vector3(f.x, 0, f.z); let k = .85;
    /* while the factory moves, frame both its old and new spot */
    if (ft && t > 4.3) { const d = Math.hypot(ft.x - f.x, ft.z - f.z); tgt.set((f.x + ft.x) / 2, 0, (f.z + ft.z) / 2); k = .85 * Math.max(1, d / 14); }
    return [tgt, followCamPos(tgt, GFX.w / GFX.h, k)]; }
  return null;
}
/* Magnet Mike countdown: his anime villain portrait (MIKE_ART) on a navy sticker */
/* stickers (board events, Magnet Mike) play one at a time on their own layer, each for STICKER_MS */
const STICKER_MS = 2700, stQ = []; let stOn = false;
function stickerShow(html) { if (document.body.classList.contains("tvphone")) return; stQ.push(html); if (stQ.length > 4) stQ.splice(0, stQ.length - 4); if (!stOn) stNext(); }
function stNext() { const el = document.getElementById("fxs"), h = stQ.shift(); if (!el || h === undefined) { stOn = false; if (el) el.innerHTML = ""; return; } stOn = true; el.innerHTML = h; setTimeout(stNext, STICKER_MS); }
/* board event popups: navy sticker with a colour-coded icon badge (good / bad / belt / special) */
const EV_LOOK = [
  [/^conveyor/i, t => /backward/.test(t) ? "⏪" : "⏩", "belt"], [/^tailwind/i, "💨", "good"], [/^crusher/i, "🔨", "bad"],
  [/^scrap pile/i, t => /nothing/.test(t) ? "🔩" : "🪙", t => /nothing/.test(t) ? "meh" : "good"], [/spike strip/i, "📌", "bad"], [/^scrap shop/i, "🛒", "meh"],
  [/^road swap/i, "🔀", "spec"], [/^lost cargo/i, "📦", "good"], [/^factory relocates/i, "🏭", "spec"], [/^lucky find/i, "🍀", "good"], [/^minecart/i, "🛒", "good"], [/^rail cart/i, "🛤️", "good"], [/^eruption!$/i, "🌋", "bad"], [/^refinery/i, "⚙️", "good"], [/^truck bed full/i, "📦", "meh"], [/^battery factory/i, "🔋", "spec"], [/^fuel tax/i, "⛽", "spec"], [/^duel/i, "⚔️", "spec"],
  [/^lava/i, "🌋", "bad"], [/^eruption/i, "🌋", "bad"], [/^geyser/i, "💨", "good"], [/^obsidian/i, "💎", "good"], [/^scorched/i, "🔥", "bad"], [/^rock conveyor/i, "🪨", "belt"],
  [/^ore cart/i, t => /nothing/.test(t) ? "🪨" : "🪙", t => /nothing/.test(t) ? "meh" : "good"]];
function showSticker(ev) {
  let title = String(ev.title || ""), text = String(ev.text || ""), icon = "❗", tone = "spec";
  const lead = title.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*/u); if (lead) { icon = lead[1]; title = title.slice(lead[0].length); }
  for (const [re, ic, tn] of EV_LOOK) if (re.test(title)) { icon = typeof ic === "function" ? ic(text) : ic; tone = typeof tn === "function" ? tn(text) : tn; break; }
  if (/magnet mike/i.test(title)) { stickerShow(`<div class="mike"><div class="mk-st"><div class="mk-box"><span class="mk-name">Magnet Mike</span><span class="mk-big mk-mid">${esc(text.replace(/,? so Magnet Mike is coming for them!?/i, "").trim())}</span><span class="mk-sub">He's coming for them!</span></div><img alt="" src="${MIKE_ART}"></div></div>`); return; }
  stickerShow(`<div class="evs ${tone}"><div class="ev-box"><span class="ev-ic">${icon}</span><div class="ev-tx"><span class="ev-t">${esc(title.replace(/!$/, ""))}</span><span class="ev-x">${esc(text)}</span></div></div></div>`);
}
function showMike(ev) {
  sfx("magnet"); const n = ev.left || 0, img = MIKE_ART;
  const line = n === 1 ? `strikes <i>this round!</i>` : `strikes in <i>${n}</i> rounds`;
  stickerShow(`<div class="mike${n === 1 ? " now" : ""}"><div class="mk-st"><div class="mk-box"><span class="mk-name">Magnet Mike</span><span class="mk-big">${line}</span>${n === 1 ? `<span class="mk-sub">Someone's getting hauled away…</span>` : ""}</div>${img ? `<img alt="" src="${img}">` : ""}</div></div>`);
}
function boardFx(bd, dt) {
  const ps = G.players;
  ps.forEach(p => { const t = GFX.tok[p.key]; if (!t) return; const pos = t.g.position;
    if (t.lc === undefined) { t.lc = p.coins; t.lb = p.bat; }
    if (p.coins !== t.lc) { const d = p.coins - t.lc; t.lc = p.coins;
      if (d > 0) { burst(bd.scene, pos.x, pos.y + 1.2, pos.z, { n: Math.min(3 + d, 16), shape: "coin", cols: ["#FFC83D", "#FFE27A"], spd: 2.2, up: 7, grav: 14, life: 1.1 }); sfx("coin"); }
      else { burst(bd.scene, pos.x, pos.y + 1, pos.z, { n: Math.min(3 - d, 12), shape: "coin", cols: ["#E5484D", "#B5313A"], spd: 2.5, up: 3, grav: 10, life: .9 }); sfx("loss"); } }
    if (p.bat !== t.lb) { if (p.bat > t.lb) { burst(bd.scene, pos.x, pos.y + 1.5, pos.z, { n: 30, shape: "ico", cols: BAT_FX[batKey()], spd: 5, up: 8, grav: 9, life: 1.5 }); sfx("battery"); } t.lb = p.bat; }
    /* Volcano Quarry cargo: purple shards pop up when dug, scatter dark when lost (refining is animated by the gate itself) */
    const sh = p.shards | 0, ce = p.dust | 0; if (t.lsh === undefined) { t.lsh = sh; t.lce = ce; }
    if (ce > t.lce) {}
    else if (sh > t.lsh) { burst(bd.scene, pos.x, pos.y + 1.2, pos.z, { n: 6 + 5 * (sh - t.lsh), shape: "ico", cols: ["#7A3CFF", "#B78CFF", "#3B2466"], spd: 2.4, up: 7, grav: 13, life: 1.1 }); sfx("coin"); }
    else if (sh < t.lsh) { burst(bd.scene, pos.x, pos.y + 1, pos.z, { n: 10, shape: "ico", cols: ["#3B2466", "#2A1D19", "#FF6A1F"], spd: 2.6, up: 3, grav: 10, life: .9 }); sfx("loss"); }
    t.lsh = sh; t.lce = ce;
    if (t.anim && !t.wasAnim) sfx("step");
    if (!t.anim && t.wasAnim) { t.sq = .28; burst(bd.scene, pos.x, .55, pos.z, { n: 6, shape: "ico", cols: DUST, spd: 1.6, up: 1.2, grav: 4, life: .6 }); }
    t.wasAnim = !!t.anim;
    if (t.sq > 0) { t.sq = Math.max(0, t.sq - dt); const k = Math.sin((1 - t.sq / .28) * Math.PI) * .22; t.tr.scale.set(.62 * (1 + k * .5), .62 * (1 - k), .62 * (1 + k * .5)); } else t.tr.scale.setScalar(.62);
  });
  bd.crushers.forEach(c => { const low = c.blk.position.y < 1; if (low && !c.was) burst(bd.scene, c.blk.position.x + (c.blk.parent ? c.blk.parent.position.x : 0), .6, c.blk.parent ? c.blk.parent.position.z : 0, { n: 7, shape: "ico", cols: DUST, spd: 2.4, up: 1.5, grav: 5, life: .7 }); c.was = low; });
  if (!bd.dots) { bd.dots = []; for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(.32, 12), new THREE.MeshBasicMaterial({ color: "#FFE27A", transparent: true, opacity: .85 })); m.rotation.x = -Math.PI / 2; m.visible = false; bd.scene.add(m); bd.dots.push(m); } }
  let di = 0; const tm = performance.now() / 1000;
  if (G.phase === "fork" && G.fork) G.fork.opts.forEach((o, k) => { let n = o, f = G.fork.at; for (let s = 0; s < 6 && di < bd.dots.length; s++) { const nd = MAP.nodes[n]; if (!nd) break; const m = bd.dots[di++]; m.visible = true; m.position.set(nd.x, (nd.y || 0) + .56, nd.z); m.material.opacity = .35 + .5 * Math.max(0, Math.sin(tm * 5 - s * .7)); m.scale.setScalar(1 - s * .08); const nx = travelOpts(n, f)[0]; f = n; n = nx; } });
  for (; di < bd.dots.length; di++) bd.dots[di].visible = false;
  stepParts(bd.scene, dt);
}
