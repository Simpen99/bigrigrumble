
/* ---------- events ---------- */
document.addEventListener("input", e => { if (e.target.id === "nm") { me.name = e.target.value.slice(0, 12); saveMe(); setPresence({ here: { name: me.name || "Driver" } }); } });
function pickTruck(i) {
  me.truck = (i + TRUCKS.length) % TRUCKS.length; saveMe();
  document.querySelectorAll(".tc").forEach(x => { const on = +x.dataset.t === me.truck; x.classList.toggle("sel", on); x.setAttribute("aria-pressed", on); });
  const sel = document.querySelector(".tc.sel"); if (sel) sel.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  const sn = $("#shown"); if (sn) sn.innerHTML = showNameHTML(me.truck);
  if (GFX.ok && (view === "home" || view === "join")) setShowroom([me.truck]);
  if (role === "client") setPresence({ me: { key: me.key, name: me.name || "Driver", truck: me.truck } });
  if (role === "host" && HG && HG.phase === "lobby") { const p = pByKey(me.key); if (p) { p.truck = me.truck; push(); } }
}
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.t !== undefined) { pickTruck(+b.dataset.t); return; }
  if (b.dataset.step) { pickTruck(me.truck + +b.dataset.step); return; }
  if (b.dataset.join) { if (!me.name) { me.name = "Driver"; saveMe(); } clientJoin(b.dataset.join); return; }
  if (b.dataset.kick && role === "host") { HG.players = HG.players.filter(p => p.key !== b.dataset.kick); if (!HG.kick.includes(b.dataset.kick)) HG.kick.push(b.dataset.kick); push(); return; }
  if (b.dataset.rounds && role === "host") { HG.rounds = +b.dataset.rounds; push(); return; }
  if (b.dataset.roll) { if (!G) return; b.disabled = true; act({ t: "roll", die: b.dataset.roll, seq: G.seq }, b.dataset.for || me.key); unstick(); return; }
  if (b.dataset.buy) { if (!G) return; b.disabled = true; act({ t: "buy", yes: b.dataset.buy === "1", how: b.dataset.how, seq: G.seq }, b.dataset.for || me.key); unstick(); return; }
  const a = b.dataset.a;
  if (a === "host") { notice = ""; LS.del("trp_host"); if (!me.name) { me.name = "Driver"; saveMe(); } hostCreate(); }
  else if (a === "resume") { notice = ""; hostResume(LS.get("trp_host", null)); }
  else if (a === "joinlist") { notice = ""; homeSub = "join"; render(); }
  else if (a === "home") { homeSub = "main"; render(); }
  else if (a === "addcpu" && role === "host" && HG.players.length < 8) {
    const used = HG.players.map(p => p.truck), free = TRUCKS.map((t, i) => i).filter(i => !used.includes(i)), tr = free.length ? free[rnd(free.length)] : rnd(TRUCKS.length);
    HG.players.push(newPlayer(rid(), "CPU " + TRUCKS[tr].name.split(" ")[0], tr, true, false)); push();
  }
  else if (a === "addlocal") { localForm = !localForm; render.last = null; render(); }
  else if (a === "addlocalok" && role === "host" && HG.players.length < 8) {
    const nm = ($("#lname").value || "").trim() || `Player ${HG.players.length + 1}`; HG.players.push(newPlayer(rid(), nm, +$("#ltruck").value, false, true)); localForm = false; push();
  }
  else if (a === "start" && role === "host") hostStart();
  else if (a === "quit") hostQuit();
  else if (a === "again") hostPlayAgain();
  else if (a === "endask") { if (confirm("End this game for everyone?")) hostQuit(); }
  else if (a === "leave") { if (role === "client") clientLeave(); else { role = "none"; render(); } }
  else if (a === "changetruck") { changingTruck = !changingTruck; render.last = null; render(); }
  else if (a === "replaypod") replayPodium();
  else if (a === "cam") { GFX.follow = !GFX.follow; GFX.ov = null; if (!GFX.follow) camHint(); updateGame(); }
});
function unstick() { setTimeout(() => { render.lastPanel = null; if (view === "game" && G) updateGame(); }, 3000); }

/* ---------- boot ---------- */
setInterval(() => { if (W && GFX.mode === "mg" && (document.hidden || performance.now() - lastT > 400)) { if (TVS) { try { tvsFrame(); } catch (e) { console.error(e); } return; } try { for (let i = 0; i < 3 && W; i++) stepMG(.033); GFX.mgLast = performance.now(); } catch (e) {} } }, 100);
gfxInit();
render();
setInterval(() => { if (view === "game" && role === "client") updateGame(); if (view === "join") render(); }, 2000);
(async () => {
  try { room = window.claude && typeof window.claude.use === "function" ? await window.claude.use("room") : null; } catch (e) { room = null; }
  if (!room) { roomState = "none"; render(); return; }
  roomState = "ok";
  room.onConnection(c => { roomConnected = !!c; render.last = null; render(); }, () => { roomConnected = false; render.last = null; render(); });
  room.onPeers(ch => { peers = ch.peers || []; if (role === "host") hostOnPeers(); else if (role === "client") clientOnPeers(); else render(); },
    err => { room = null; roomState = "none"; render.last = null; render(); });
  setPresence({ here: { name: me.name || "Driver" } });
  render.last = null; render();
})();
</script>
</body>
</html>
