/* ---------- identity & runtime ---------- */
const me = LS.get("trp_me", null) || { key: rid(), name: "", truck: rnd(TRUCKS.length) };
if (!me.key) me.key = rid();
me.truck = Math.min(TRUCKS.length - 1, Math.max(0, me.truck | 0));
const saveMe = () => LS.set("trp_me", me);
saveMe();
let room = null,
	roomState = "connecting",
	roomConnected = false,
	presenceErr = "",
	peers = [];
let role = "none",
	G = null,
	joinId = null,
	homeSub = "main",
	notice = "",
	changingTruck = false,
	localForm = false;
let hostSeenAt = 0;
function setPresence(patch) {
	if (!room) return;
	room
		.presence(patch)
		.then(() => {
			if (presenceErr) {
				presenceErr = "";
				render();
			}
		})
		.catch((e) => {
			presenceErr = (e && (e.code || e.message)) || "error";
			render();
		});
}
const othersHere = () => peers.filter((p) => !p.sameTab && p.kind !== "agent");

/* ---------- host engine ---------- */
let mgWait = 0;
let HG = null,
	tickIv = null,
	pendingCont = null,
	mgDeadline = 0,
	mgClosing = false;
const timers = new Set(),
	processed = {},
	offSince = {};
function later(fn, ms) {
	const t = setTimeout(() => {
		timers.delete(t);
		fn();
	}, ms);
	timers.add(t);
	return t;
}
function clearTimers() {
	timers.forEach(clearTimeout);
	timers.clear();
}
function push() {
	HG.v++;
	G = HG;
	if (!HG.practice) {
		LS.set("trp_host", HG);
		setPresence({ game: HG, join: null, me: null, act: null });
	}
	render();
}
const cur = () => HG.players[HG.turn];
const pByKey = (k) => HG.players.find((p) => p.key === k);
function online(key) {
	if (key === me.key) return true;
	const p = HG && pByKey(key);
	if (p && (p.local || p.bot)) return true;
	return peers.some((x) => x.presence && x.presence.join === HG.id && x.presence.me && x.presence.me.key === key);
}
const clampTruck = (t) => {
	t = Math.floor(Number(t));
	return t >= 0 && t < TRUCKS.length ? t : 0;
};
function newPlayer(key, name, truck, bot, local) {
	const used = HG.players.map((p) => p.col);
	let col = 0;
	while (used.includes(col) && col < 7) col++;
	return {
		key,
		name:
			String(name || "Driver")
				.replace(/[\u0000-\u001f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, "")
				.slice(0, 12) || "Driver",
		truck: clampTruck(truck),
		bot: !!bot,
		local: !!local,
		col,
		pos: 0,
		coins: START_COINS,
		bat: 0,
		items: [],
		up: [],
		team: HG.players.filter((p) => (p.team || 0) === 0).length <= HG.players.filter((p) => p.team === 1).length ? 0 : 1,
	};
}
function makeCode() {
	const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
	let s = "";
	for (let i = 0; i < 5; i++) s += A[rnd(A.length)];
	return s;
}
let pendingCode = "";
function startHub(tries = 0) {
	if (!NET.ok || !HG) return;
	NET.host(HG.code)
		.then(() => {
			if (HG) push();
		})
		.catch(() => {
			if (HG && tries < 6) {
				HG.code = makeCode();
				push();
				startHub(tries + 1);
			}
		});
}
function hostCreate(tv) {
	role = "host";
	HG = {
		id: "g" + rid().slice(1),
		map: "junk",
		teams: false,
		traps: {},
		rival: null,
		code: makeCode(),
		v: 0,
		phase: "lobby",
		rounds: 8,
		round: 1,
		turn: 0,
		seq: 1,
		factory: 10,
		players: [],
		msg: "",
		roll: null,
		fx: null,
		ev: null,
		buy: null,
		mg: null,
		lastMg: null,
		kick: [],
		hostName: tv ? "The TV" : me.name || "Driver",
		left: 0,
		tv: !!tv,
	};
	if (!tv) HG.players.push(newPlayer(me.key, me.name, me.truck, false, false));
	startHostLoops();
	push();
	startHub();
}
function startHostLoops() {
	clearInterval(tickIv);
	tickIv = setInterval(hostTick, 1000);
}
function hostQuit() {
	NET.close();
	const wasPractice = !!(HG && HG.practice);
	clearTimers();
	clearInterval(tickIv);
	HG = null;
	G = null;
	role = "none";
	if (!wasPractice) LS.del("trp_host");
	setPresence({ game: null });
	closeMg();
	render();
}
function hostResume(saved) {
	role = "host";
	HG = saved;
	HG.intro = false;
	HG.hold = false;
	if (!HG.code || HG.code.length < 5) HG.code = makeCode();
	startHostLoops();
	startHub();
	const p = HG.phase;
	if (p === "lobby" || p === "over") push();
	else if (p === "minigame" || p === "teams") startMinigame();
	else if (p === "mgres") afterMg();
	else {
		if (!HG.players[HG.turn]) HG.turn = 0;
		startTurn();
	}
}
function hostOnPeers() {
	if (!HG) return;
	let changed = false;
	for (const p of peers) {
		if (p.sameTab) continue;
		const pr = p.presence || {};
		if (pr.join !== HG.id || !pr.me || typeof pr.me.key !== "string") continue;
		const key = pr.me.key.slice(0, 24);
		let pl = pByKey(key);
		if (!pl && HG.phase === "lobby" && !HG.kick.includes(key) && HG.players.length < 8) {
			pl = newPlayer(key, pr.me.name, pr.me.truck, false, false);
			HG.players.push(pl);
			changed = true;
		} else if (pl && HG.phase === "lobby" && !pl.local && !pl.bot) {
			const np = newPlayer(key, pr.me.name, pr.me.truck);
			if (pl.name !== np.name || pl.truck !== np.truck) {
				pl.name = np.name;
				pl.truck = np.truck;
				changed = true;
			}
		}
		if (pl && !pl.local && !pl.bot && pr.act) handleAct(pl, pr.act);
	}
	if (changed) push();
	else render();
	if (HG && HG.phase === "minigame") {
		checkReady();
		checkMgDone();
	}
}
function ctrl(p) {
	return p && (p.key === me.key || (role === "host" && p.local));
}
function act(a, key = me.key) {
	a.id = rid();
	if (role === "host") {
		const p = pByKey(key);
		if (p) handleAct(p, a);
	} else setPresence({ act: a });
}

/* ---------- client ---------- */
function clientJoin(gid) {
	role = "client";
	joinId = gid;
	G = null;
	hostSeenAt = Date.now();
	setPresence({ game: null, join: gid, me: { key: me.key, name: me.name || "Driver", truck: me.truck }, act: null });
	clientOnPeers();
}
function clientLeave(msg) {
	role = "none";
	G = null;
	joinId = null;
	notice = msg || "";
	closeMg();
	setPresence({ join: null, me: null, act: null, here: { name: me.name || "Driver" } });
	render();
}
function clientOnPeers() {
	let best = null;
	for (const p of peers) {
		const g = p.presence && p.presence.game;
		if (g && g.id === joinId && (!best || g.v > best.v)) best = g;
	}
	if (best) {
		G = best;
		hostSeenAt = Date.now();
	}
	if (G && G.kick && G.kick.includes(me.key)) {
		clientLeave("The host removed you from the game.");
		return;
	}
	render();
}
function gamesAvailable() {
	return peers
		.filter((p) => !p.sameTab && p.presence && p.presence.game && p.presence.game.id)
		.map((p) => p.presence.game)
		.filter((g) => g.phase === "lobby" || (g.players || []).some((x) => x.key === me.key));
}

/* ---------- views ---------- */
let view = null,
	seen = {};
function computeView() {
	if (role === "none") return homeSub === "join" ? "join" : homeSub === "practice" ? "practice" : "home";
	if (!G) return "waiting";
	if (G.phase === "lobby") return "lobby";
	if (G.phase === "over") return "over";
	return "game";
}
function statusHTML() {
	if (!room) return `<span class="status bad"><b></b>Couldn't load multiplayer. Check your internet and reload.</span>`;
	const n = othersHere().length;
	if (NET.hub)
		return NET.status === "hosting"
			? `<span class="status ok"><b></b>Hosting game ${esc(NET.code)}, ${n} other ${n === 1 ? "phone" : "phones"} connected</span>`
			: `<span class="status wait"><b></b>Opening game ${esc(NET.code || "")}…</span>`;
	if (NET.status === "connected" && roomConnected)
		return `<span class="status ok"><b></b>Connected to game ${esc(NET.code)}</span>`;
	if (NET.status === "connecting" || NET.status === "reconnecting")
		return `<span class="status wait"><b></b>Connecting to game ${esc(NET.code || "")}…</span>`;
	if (NET.status === "failed") return `<span class="status bad"><b></b>${esc(NET.err || "Couldn't connect")}</span>`;
	return `<span class="status"><b></b>Not connected yet</span>`;
}
function render() {
	syncMap();
	const v = computeView();
	if (v !== view) {
		view = v;
		render.last = null;
		if (v === "game") initSeen();
	}
	document.body.dataset.view = v;
	{
		const tvp = role === "client" && !!G && !!G.tv;
		document.body.classList.toggle("tvphone", tvp);
		if (tvp && !document.getElementById("rotov")) {
			const o = document.createElement("div");
			o.id = "rotov";
			o.innerHTML = rotHTML();
			document.body.appendChild(o);
		}
	}
	const tvHost = !!(role === "host" && G && G.tv),
		ctlr = !!(role === "client" && G && G.tv && v === "game");
	document.body.classList.toggle("tv", tvHost);
	document.body.classList.toggle("ctl", ctlr);
	GFX.ctl = ctlr;
	if (!ctlr && GFX.peek) togglePeek(false);
	if (GFX.ok) {
		setMode(GFX.mode === "edit" ? "edit" : W ? "mg" : v === "game" ? "board" : v === "over" ? "podium" : "show");
		if (v === "home" || v === "join" || v === "waiting" || v === "practice") setShowroom([me.truck]);
		else if (v === "lobby" && G) setShowroom(G.players.map((p) => p.truck));
		else if (v === "over" && G) setPodium(standings(G.players).slice(0, 3));
	}
	if (v === "game") {
		if (!$("#hudbot")) buildGame();
		updateGame();
		handleFx();
		return;
	}
	let key =
		v +
		"|" +
		notice +
		"|" +
		presenceErr +
		"|" +
		roomConnected +
		"|" +
		(room ? 1 : 0) +
		"|" +
		NET.status +
		NET.err +
		NET.code;
	if (v === "join") key += JSON.stringify([othersHere().length, gamesAvailable().map((g) => g.id + ":" + g.v)]);
	else if (v === "home") key += othersHere().length;
	else
		key += JSON.stringify([
			G && G.v,
			peers.map((p) => p.peer + (p.presence && p.presence.join ? 1 : 0)).join(","),
			changingTruck,
			localForm,
		]);
	if (key === render.last) return;
	render.last = key;
	const app = $("#app"),
		ae = document.activeElement,
		keep = ae && ae.id && ae.tagName === "INPUT" ? { id: ae.id, v: ae.value, s: ae.selectionStart } : null;
	if (v === "home") app.innerHTML = homeHTML();
	else if (v === "join") app.innerHTML = joinHTML();
	else if (v === "practice") app.innerHTML = practiceHTML();
	else if (v === "waiting")
		app.innerHTML = `<div class="stage"></div><div class="sheet"><h2>Connecting to the host…</h2><p class="note">Hang tight. If this takes more than a few seconds, the host may have closed the game.</p><div style="margin-top:12px">${statusHTML()}</div><button class="btn ghost" data-a="leave" style="margin-top:12px">Back</button></div>`;
	else if (v === "lobby") {
		app.innerHTML = role === "host" && G.tv ? tvLobbyHTML() : lobbyHTML();
		drawQR();
	} else if (v === "over") app.innerHTML = overHTML();
	if (keep) {
		const el = document.getElementById(keep.id);
		if (el) {
			el.value = keep.v;
			el.focus();
			try {
				el.setSelectionRange(keep.s, keep.s);
			} catch (e) {}
		}
	}
	if (mgOpen) closeMg();
}
function carouselHTML(sel) {
	return `<div class="carousel" id="car">${TRUCKS.map((t, i) => `<button class="tc ${i === sel ? "sel" : ""}" data-t="${i}" aria-pressed="${i === sel}"><img alt="" src="${thumb(i)}"><span>${esc(t.name)}</span></button>`).join("")}</div>`;
}
function showNameHTML(i) {
	const t = TRUCKS[i];
	return `<div class="showname"><div><h2>${esc(t.name)}</h2><p>${esc(t.blurb)}</p><div style="margin-top:8px">${facesHTML(t.faces)}</div></div><div class="arrows"><button class="arr" data-step="-1" aria-label="Previous truck">‹</button><button class="arr" data-step="1" aria-label="Next truck">›</button></div></div>`;
}
function homeHTML() {
	const saved = LS.get("trp_host", null);
	const canResume = saved && saved.phase && saved.phase !== "over" && saved.players && saved.players.length;
	return `<div class="stage"><div class="logo" role="img" aria-label="Big Rig Rumble"><span class="l1">BIG RIG</span><span class="l2">RUMBLE</span><span class="l3">The truck party board game</span></div><div id="shown">${showNameHTML(me.truck)}</div></div>
  ${notice ? `<div class="banner">${esc(notice)}</div>` : ""}
  <section class="sheet"><label class="field">Driver name<input id="nm" maxlength="12" value="${esc(me.name)}" placeholder="Your name" autocomplete="off"></label>
  <h2 style="margin-top:14px">Choose your truck</h2>${carouselHTML(me.truck)}
  <p class="note" style="margin-top:4px">Each truck brings its own die. Small numbers under a face are coins you gain or pay when you roll it. The standard 1–6 die is always available too.</p></section>
  <section class="sheet stack">
    ${canResume ? `<button class="btn go" data-a="resume">Resume your hosted game</button>` : ""}
    <button class="btn ${canResume ? "ghost" : "go"}" data-a="host">Host Game</button>
    <button class="btn sign" data-a="joinlist">Join Game</button>
    <button class="btn ghost" data-a="hosttv">📺 Host on a TV / big screen</button>
    <button class="btn ghost" data-a="practice">🎮 Minigame practice</button>
    ${FINE && GFX.ok ? `<button class="btn ghost" data-a="editor">🛠 Map editor</button>` : ""}
    <div>${statusHTML()}</div>
  </section>
  <details class="sheet how"><summary>How to play</summary><ul>
    <li>On your turn, pick the standard die or your truck's special die and roll.</li>
    <li>Blue tiles pay 3 coins, red tiles cost 3, and purple tiles trigger a surprise.</li>
    <li>Drive onto or past the battery factory with ${PRICE} coins to buy a battery. The factory then moves somewhere new.</li>
    <li>Volcano Quarry works differently: mine obsidian shards in the crater, grind them into dust at a refinery, and have the factory melt 5 dust plus 10 coins into a battery (or pay 50 coins).</li>
    <li>After everyone moves, all drivers play a minigame at the same time. First place earns 10 coins.</li>
    <li>After the last round, the most batteries wins. Coins break ties.</li>
    <li>No second phone? The host can add players on the same phone and pass it around.</li>
  </ul></details>`;
}
function diagHTML() {
	if (!room)
		return `<div class="empty">Multiplayer couldn't load. Check your internet connection and reload the page.</div>`;
	if (!roomConnected)
		return `<div class="empty">${NET.status === "connecting" || NET.status === "reconnecting" ? "Connecting…" : NET.status === "failed" ? esc(NET.err) : "Enter the code shown on the host's screen, or scan the host's QR code."}</div>`;
	return "";
}
function joinHTML() {
	const list = gamesAvailable(),
		n = othersHere().length;
	let body = diagHTML();
	if (!body) {
		if (!list.length) body = `<div class="empty">Connected, waiting for the host's lobby…</div>`;
		else
			body = list
				.map((g) => {
					const h = (g.players || [])[0],
						mine = (g.players || []).some((x) => x.key === me.key);
					return `<button class="gamebtn" data-join="${esc(g.id)}"><img alt="" src="${thumb(h ? clampTruck(h.truck) : 0)}"><span><b>${esc(g.hostName || "Host")}'s game</b><br><small>${(g.players || []).length} driver${(g.players || []).length === 1 ? "" : "s"}, ${mine && g.phase !== "lobby" ? "tap to rejoin" : "in the lobby"}</small></span><span class="code">${esc(g.code || "")}</span></button>`;
				})
				.join("");
	}
	return `<div class="stage short"><div class="brand"><i></i>Big Rig Rumble</div></div><section class="sheet"><h2>Join Game</h2>
  <div class="row" style="align-items:flex-end;margin-bottom:12px"><label class="field" style="flex:2">Game code<input id="jcode" maxlength="6" autocapitalize="characters" autocomplete="off" value="${esc(pendingCode)}" placeholder="ABCDE" style="text-transform:uppercase;letter-spacing:3px;font-weight:800"></label><button class="btn sign" data-a="connect" style="flex:1">${NET.status === "connected" && NET.code && NET.code === pendingCode && gamesAvailable().length ? "Join" : "Connect"}</button></div>${body}
  <p class="note">You'll join as <b>${esc(me.name || "Driver")}</b> driving ${esc(TRUCKS[me.truck].name)}. Match the code with the one on the host's screen.</p>
  <div style="margin-top:10px">${statusHTML()}</div></section><button class="btn ghost" data-a="home" style="margin-top:12px">Back</button>`;
}
function playerRow(p, host) {
	const on = role === "host" ? online(p.key) : true;
	const tag = p.bot ? "CPU" : p.local ? "on the host's phone" : !on ? "offline" : "";
	return `<li><span class="dot" style="background:${pcol(p)}"></span><img alt="" src="${thumb(p.truck)}"><span class="nm">${esc(p.name)}${p.key === me.key ? " (you)" : ""}<small>${esc(TRUCKS[p.truck].name)}${tag ? ", " + tag : ""}</small></span>${G.teams ? `<button class="teamb" data-team="${esc(p.key)}" style="--tc:${TEAMS[p.team || 0].col}" ${host ? "" : "disabled"}>${TEAMS[p.team || 0].name.replace("Team ", "")}</button>` : ""}${host && p.key !== me.key ? `<button class="xbtn" data-kick="${esc(p.key)}" aria-label="Remove ${esc(p.name)}">Remove</button>` : ""}</li>`;
}
function joinURL() {
	return location.origin + location.pathname + "?join=" + encodeURIComponent((G && G.code) || "");
}
function lobbyHTML() {
	const host = role === "host";
	const watching = othersHere().filter((p) => !(p.presence && (p.presence.join === G.id || p.presence.game))).length;
	const qr = host
		? `<section class="sheet"><div class="row" style="align-items:center"><h2 style="margin:0">Scan to join</h2><span class="code" style="text-align:right">${esc(G.code)}</span></div>
    <div class="qrbox" style="margin-top:10px"><div class="qr" id="qr"></div><div><p style="font-size:14px">Scan with the phone camera to open the game, pick a name and truck, then tap <b>Join Game</b>. Or enter code <b>${esc(G.code)}</b> on the Join screen.</p>
    <div style="margin-top:8px">${statusHTML()}</div></div></div>
    ${watching ? `<p class="note">${watching} ${watching === 1 ? "person has" : "people have"} the page open but hasn't joined yet.</p>` : ""}
    ${presenceErr ? `<div class="banner">The game couldn't broadcast (${esc(presenceErr)}). Try closing and hosting again.</div>` : ""}
    ${!room ? `<div class="banner">Multiplayer isn't available in this view. Add CPU trucks or players on this phone instead.</div>` : ""}
    <div class="linkline">${esc(joinURL())}</div>
    <p class="note">Keep this phone's screen on during the game. It connects everyone.</p></section>`
		: "";
	const plist = `<section class="sheet"><h2>Drivers (${G.players.length}/8)</h2><ul class="plist">${G.players.map((p) => playerRow(p, host)).join("")}</ul>
    ${
			host
				? `<div class="row" style="margin-top:10px"><button class="btn ghost small" data-a="addcpu" ${G.players.length >= 8 ? "disabled" : ""}>+ CPU truck</button><button class="btn ghost small" data-a="addlocal" ${G.players.length >= 8 ? "disabled" : ""}>+ Player on this phone</button></div>
    ${localForm ? `<div class="localform"><label class="field">Name<input id="lname" maxlength="12" placeholder="Player name" autocomplete="off"></label><label class="field" style="margin-top:8px">Truck<select class="inp" id="ltruck">${TRUCKS.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join("")}</select></label><button class="btn go small" data-a="addlocalok" style="width:100%;margin-top:10px">Add player</button></div>` : ""}`
				: ""
		}</section>`;
	const settings = host
		? `<section class="sheet"><h2>Map</h2><div class="mapgrid">${Object.values(MAPS)
				.map(
					(m) =>
						`<button class="mapb ${G.map === m.id ? "on" : ""}" data-map="${m.id}"><b>${esc(m.name)}</b><small>${esc(m.blurb)}</small>${m.dice ? `<em class="mapdice">🎲 ${m.dice}x dice multiplier</em>` : ""}</button>`,
				)
				.join("")}</div>${mapRulesHTML()}</section>
    <section class="sheet"><h2>Mode</h2><div class="seg"><button data-mode="ffa" class="${!G.teams ? "on" : ""}">Free-for-all</button><button data-mode="teams" class="${G.teams ? "on" : ""}">Teams</button></div>${G.teams ? `<p class="note">Teammates add their batteries together and can't duel or rob each other. Tap a team badge to switch a driver's team.</p>` : ""}</section>
    <section class="sheet"><h2>Test mode</h2><div class="seg"><button data-test="off" class="${!G.test ? "on" : ""}">Off</button><button data-test="on" class="${G.test ? "on" : ""}">On</button></div>${G.test ? `<p class="note">On your turn you can pick your exact roll, tap any space to jump there and trigger it, and top up coins, shards and dust.</p>` : ""}</section>
    <section class="sheet"><h2>Rounds</h2><div class="seg">${[4, 6, 8, 10, 12, 16].map((r) => `<button data-rounds="${r}" class="${G.rounds === r ? "on" : ""}">${r}</button>`).join("")}</div></section>
    <section class="sheet stack"><button class="btn go" data-a="start" ${G.players.length < 2 ? "disabled" : ""}>${G.players.length < 2 ? "Waiting for another driver" : "Start the race"}</button><button class="btn ghost" data-a="quit">Close game</button></section>`
		: G.tv
			? `${IOS_SAFARI && !LS.get("trp_tbtip", false) ? `<section class="sheet tbsheet"><h2>📱 Play fullscreen</h2>${tbTipHTML()}<button class="btn ghost small" data-a="tbtip">Got it</button></section>` : ""}<section class="sheet"><h2>📺 You're in! Watch the TV</h2><p class="note" style="margin-top:0">Game ${esc(G.code || "")}: ${esc((MAPS[G.map] || JUNK).name)}, ${G.rounds} rounds${G.teams ? ", teams" : ""}. You're driving ${esc(TRUCKS[me.truck].name)}. This phone is your controller.</p>
       ${tvLead() && tvLead().key === me.key ? `<div class="stack" style="margin-top:10px"><button class="btn go" data-a="tvstart" ${G.players.length < 2 ? "disabled" : ""}>${G.players.length < 2 ? "Waiting for another driver" : "Start the race"}</button><button class="btn ghost small" data-a="tvcpu" ${G.players.length >= 8 ? "disabled" : ""}>+ CPU truck</button></div><h2 style="margin-top:14px">Practice a minigame</h2>${pracHTML()}` : `<p class="note">${esc((tvLead() || {}).name || "The first driver")} starts the race.</p>`}
       <button class="btn ghost" data-a="changetruck" style="margin-top:10px">${changingTruck ? "Done" : "Change truck"}</button>${changingTruck ? `<div style="margin-top:10px">${carouselHTML(me.truck)}</div>` : ""}</section>
       <button class="btn ghost" data-a="leave" style="margin-top:12px">Leave game</button>`
			: `<section class="sheet"><h2>Waiting for ${esc(G.hostName || "the host")} to start</h2><p class="note" style="margin-top:0">Game ${esc(G.code || "")}: ${esc((MAPS[G.map] || JUNK).name)}, ${G.rounds} rounds${G.teams ? ", teams" : ""}. You're driving ${esc(TRUCKS[me.truck].name)}.</p>
       <button class="btn ghost" data-a="changetruck" style="margin-top:10px">${changingTruck ? "Done" : "Change truck"}</button>${changingTruck ? `<div style="margin-top:10px">${carouselHTML(me.truck)}</div>` : ""}</section>
       <button class="btn ghost" data-a="leave" style="margin-top:12px">Leave game</button>`;
	return `<div class="stage short"><div class="brand"><i></i>Lobby</div></div>${qr}${plist}${settings}`;
}
function drawQR() {
	const el = $("#qr");
	if (!el) return;
	if (window.QRCode) {
		try {
			new QRCode(el, {
				text: joinURL(),
				width: 268,
				height: 268,
				colorDark: "#151B24",
				colorLight: "#ffffff",
				correctLevel: QRCode.CorrectLevel.M,
			});
			return;
		} catch (e) {}
	}
	el.innerHTML = `<small>QR unavailable</small>`;
}
/* phones in a TV game play sideways: full-screen "turn your phone" overlay while upright, plus a tip for hiding Safari's toolbar on iPhone */
const IOS_SAFARI =
	(/iP(hone|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) &&
	!/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent) &&
	!navigator.standalone;
const tbTipHTML = () =>
	`<p class="tbtip"><b>Tip:</b> tap the page icon next to the web address, then <b>⋯</b>, then <b>Hide Toolbar</b> to play fullscreen.</p>`;
function rotHTML() {
	return `<div class="rotbox"><div class="rotph"><i></i></div><h2>Turn your phone sideways</h2><p>Big Rig Rumble on the TV is played in landscape.</p>${IOS_SAFARI ? tbTipHTML() : ""}</div>`;
}
/* TV lobby: the PC hosts and shows the game on the big screen, phones join as controllers */
const tvLead = () => G && G.players.find((p) => !p.bot);
const pracHTML = () =>
	`<div class="pracgrid">${Object.keys(MG)
		.map((k) => `<button class="pracb" data-tvprac="${k}">${esc(MG[k].name)}</button>`)
		.join("")}</div>`;
function tvLobbyHTML() {
	const lead = tvLead(),
		n = G.players.length;
	return `<div class="tvlobby"><div class="logo tvlogo"><span class="l1">BIG RIG</span><span class="l2">RUMBLE</span><span class="l3">The truck party board game</span></div>
  <section class="sheet tvjoin"><h2>Scan to join</h2><div class="qr big" id="qr"></div><p>or open <b>${esc(location.host + location.pathname)}</b> and enter</p><div class="code">${esc(G.code)}</div><div>${statusHTML()}</div></section>
  <section class="sheet tvdrivers"><h2>Drivers (${n}/8)</h2>${n ? `<ul class="plist">${G.players.map((p) => playerRow(p, true)).join("")}</ul>` : `<div class="empty">Waiting for phones to join…</div>`}
    <div class="row" style="margin-top:10px"><button class="btn ghost small" data-a="addcpu" ${n >= 8 ? "disabled" : ""}>+ CPU truck</button></div>
    <h2 style="margin-top:16px">Practice a minigame</h2><p class="note" style="margin:-4px 0 8px">One minigame with everyone here. No coins, back to the lobby after.</p>${pracHTML()}</section>
  <section class="sheet tvset"><h2>Map</h2><div class="mapgrid">${Object.values(MAPS)
		.map(
			(m) =>
				`<button class="mapb ${G.map === m.id ? "on" : ""}" data-map="${m.id}"><b>${esc(m.name)}</b><small>${esc(m.blurb)}</small>${m.dice ? `<em class="mapdice">🎲 ${m.dice}x dice multiplier</em>` : ""}</button>`,
		)
		.join("")}</div>${mapRulesHTML()}
    <h2 style="margin-top:14px">Rounds</h2><div class="seg">${[4, 6, 8, 10, 12, 16].map((r) => `<button data-rounds="${r}" class="${G.rounds === r ? "on" : ""}">${r}</button>`).join("")}</div>
    <h2 style="margin-top:14px">Mode</h2><div class="seg"><button data-mode="ffa" class="${!G.teams ? "on" : ""}">Free-for-all</button><button data-mode="teams" class="${G.teams ? "on" : ""}">Teams</button></div>
    <div class="stack" style="margin-top:14px"><button class="btn go" data-a="start" ${n < 2 ? "disabled" : ""}>${n < 2 ? "Waiting for drivers" : "Start the race"}</button>${lead ? `<p class="note" style="margin:0">${esc(lead.name)} can also start from their phone.</p>` : ""}<button class="btn ghost" data-a="quit">Close game</button></div></section></div>`;
}
/* ---------- game view ---------- */
function buildGame() {
	$("#app").innerHTML =
		`<div class="hudtop"><span class="chip" id="rnd"></span><span class="chip grow" id="turnchip"></span><button class="chip" data-a="snd" aria-label="Sound on or off">${SFX.on ? "🔊" : "🔇"}</button><button class="chip" data-a="cam" id="cambtn">Board</button><button class="chip" data-a="peek" id="peekbtn">${GFX.peek ? "🎮 Controls" : "🗺 Board"}</button><button class="chip" data-a="${role === "host" ? "endask" : "leave"}" aria-label="Leave game">✕</button></div>
  <div class="hudbot" id="hudbot"><div id="hostgone"></div><div id="ctlme"></div><div class="hcard"><div class="msg"><i></i><span id="msg" aria-live="polite"></span></div><div id="panel"></div><div class="pstrip" id="pstrip"></div></div></div>`;
	render.lastPanel = render.lastStrip = render.lastMe = null;
}
/* TV-mode phones: peek at the 3D board (follow cam, drag / pinch to look around); closes itself when it becomes your move */
function togglePeek(on) {
	GFX.peek = on === undefined ? !GFX.peek : !!on;
	document.body.classList.toggle("peek", GFX.peek);
	const b = $("#peekbtn");
	if (b) b.textContent = GFX.peek ? "🎮 Controls" : "🗺 Board";
	if (GFX.peek) {
		GFX.follow = true;
		GFX.ov = null;
		GFX.camPos = null;
		gfxResize();
	}
}
function ctlMeHTML() {
	const p = G.players.find((x) => x.key === me.key);
	if (!p) return "";
	const col = G.teams ? TEAMS[p.team || 0].col : pcol(p),
		rank = standings(G.players).indexOf(p) + 1,
		c = G.players[G.turn];
	const mine =
		(G.phase === "turn" && c === p) ||
		(G.phase === "fork" && G.fork && G.fork.pid === p.key) ||
		(G.phase === "shop" && G.shop && G.shop.pid === p.key) ||
		(G.phase === "buy" && G.buy && G.buy.pid === p.key) ||
		(G.phase === "duelpick" && G.duelPick && G.duelPick.pid === p.key);
	return `<div class="ctlcard ${mine ? "now" : ""}" style="--c:${col}"><img alt="" src="${thumb(p.truck)}"><div class="who"><b>${esc(p.name)}</b><small>${G.teams ? esc(TEAMS[p.team || 0].name) : ordinal(rank) + " place"}</small></div><div class="stats"><span>${p.bat}${bIco()}</span><span>${p.coins}${coinIco}</span>${cargoHTML(p)}</div></div>${mine ? "" : `<div class="ctlidle">📺 Watch the TV</div>`}`;
}
const ordinal = (n) =>
	n +
	(n % 10 === 1 && n % 100 !== 11
		? "st"
		: n % 10 === 2 && n % 100 !== 12
			? "nd"
			: n % 10 === 3 && n % 100 !== 13
				? "rd"
				: "th");
function updateGame() {
	if (uiPick && (uiPick.seq !== G.seq || G.phase !== "turn")) uiPick = null;
	syncBoard();
	const players = G.players,
		c = players[G.turn];
	$("#rnd").textContent =
		`Round ${G.round}/${G.rounds}${MAP.lava && G.phase !== "lobby" ? " " + lavaChip(G.round) : ""}`;
	$("#turnchip").textContent =
		G.phase === "minigame" || G.phase === "mgres"
			? "Minigame"
			: c
				? ctrl(c) && !c.local && !(role === "host" && G.players.some((p) => p.local))
					? "Your turn"
					: `${c.name}'s turn`
				: "";
	{
		const c = G.players[G.turn];
		let m = G.msg || "";
		if (G.phase === "turn" && c && m === `${c.name}'s turn` && ctrl(c))
			m = c.local || (role === "host" && G.players.some((p) => p.local)) ? `${c.name}, your turn` : "Your turn";
		$("#msg").innerHTML = esc(m).replace(/(^|[^\w#])(\d+)(?=[^\w;]|$)/g, "$1<em>$2</em>");
	}
	$("#cambtn").textContent = GFX.follow ? "Board" : "Follow";
	const hostHere = !room || peers.some((p) => p.presence && p.presence.game && p.presence.game.id === joinId);
	if (hostHere) hostSeenAt = Date.now();
	$("#hostgone").innerHTML =
		role === "client" && Date.now() - hostSeenAt > 5000
			? `<div class="hostgone">Lost contact with the host. The game continues when they're back.</div>`
			: "";
	if (GFX.ctl) {
		const h = ctlMeHTML(),
			mine = h.includes("ctlcard now");
		if (h !== render.lastMe) {
			render.lastMe = h;
			$("#ctlme").innerHTML = h;
		}
		if (mine && !render.wasMine && GFX.peek) togglePeek(false);
		render.wasMine = mine;
	}
	const ph = panelHTML();
	if (ph !== render.lastPanel) {
		render.lastPanel = ph;
		$("#panel").innerHTML = ph;
	}
	const st = stripHTML();
	if (st !== render.lastStrip) {
		render.lastStrip = st;
		$("#pstrip").innerHTML = st;
	}
}
/* ---------- effects ---------- */
function initSeen() {
	if (G && G.round === 1 && G.turn === 0 && G.phase === "turn") GFX.introEnd = performance.now() + 5000;
	seen = { roll: G.roll && G.roll.n, fx: G.fx && G.fx.n, ev: G.ev && G.ev.n, res: null };
	GFX.camPos = null;
}
let fxTimer = null;
function handleFx() {
	if (G.roll && G.roll.n !== seen.roll) {
		seen.roll = G.roll.n;
		showDice(G.roll);
	}
	if (G.fx && G.fx.n !== seen.fx) {
		seen.fx = G.fx.n;
		setTimeout(() => showBattery(G.fx), 50);
	}
	if (G.ev && G.ev.n !== seen.ev) {
		seen.ev = G.ev.n;
		showEvent(G.ev);
	}
	if (W && (!G.mg || W.mg.nonce !== G.mg.nonce) && G.phase === "minigame") closeMg();
	if (TVC && (!G.mg || TVC.mg.nonce !== G.mg.nonce) && G.phase === "minigame") closeMg();
	if (G.phase === "minigame" && G.mg && G.mg.tv && role === "host" && !mgBusy) {
		if (G.mg.tv === "split") openTvSplit(G.mg);
		else openTvMg(G.mg);
	}
	if (G.phase === "minigame" && G.mg && !mgBusy) {
		const pend = mgPending();
		if (pend.length) enterMg(G.mg, pend[0]);
	}
	if (W) syncStart();
	if (G.phase === "mgres" && G.mg && seen.res !== G.mg.nonce) {
		seen.res = G.mg.nonce;
		showMgResults(G.mg);
	}
	if (G.phase !== "minigame" && G.phase !== "mgres" && mgOpen) closeMg();
}
function fxShow(html, ms) {
	clearTimeout(fxTimer);
	$("#fx").innerHTML = html;
	fxTimer = setTimeout(() => ($("#fx").innerHTML = ""), ms);
}
function showBattery(fx) {
	const p = G.players.find((x) => x.key === fx.pid);
	if (!p) return;
	if (p.key === me.key) {
		try {
			navigator.vibrate && navigator.vibrate([60, 40, 140]);
		} catch (e) {}
	}
	sfx("fanfare");
	if (!GFX.ok || !GFX.board || (GFX.ctl && !GFX.peek)) return;
	const bd = GFX.board;
	if (GFX.bseq && GFX.bseq.m) bd.scene.remove(GFX.bseq.m);
	const m = batteryMesh();
	m.scale.setScalar(0.01);
	bd.scene.add(m);
	GFX.bseq = { pid: p.key, t0: performance.now(), m };
}
function showEvent(ev) {
	if (ev.k === "mike") {
		showMike(ev);
		return;
	}
	if (ev.vs) {
		sfx("fanfare");
		showVs(ev);
		return;
	}
	sfx(
		/Magnet/.test(ev.title)
			? "magnet"
			: /Crusher/.test(ev.title)
				? "crush"
				: /Eruption|Lava rises/.test(ev.title)
					? "thunder"
					: "event",
	);
	showSticker(ev);
}
