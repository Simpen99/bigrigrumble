/* ---------- events ---------- */
document.addEventListener("input", (e) => {
	if (e.target.id === "jcode") pendingCode = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
	if (e.target.id === "nm") {
		me.name = e.target.value.slice(0, 12);
		saveMe();
		setPresence({ here: { name: me.name || "Driver" } });
	}
});
function pickTruck(i) {
	me.truck = (i + TRUCKS.length) % TRUCKS.length;
	saveMe();
	document.querySelectorAll(".tc").forEach((x) => {
		const on = +x.dataset.t === me.truck;
		x.classList.toggle("sel", on);
		x.setAttribute("aria-pressed", on);
	});
	const sel = document.querySelector(".tc.sel");
	if (sel) sel.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
	const sn = $("#shown");
	if (sn) sn.innerHTML = showNameHTML(me.truck);
	if (GFX.ok && (view === "home" || view === "join")) setShowroom([me.truck]);
	if (role === "client") setPresence({ me: { key: me.key, name: me.name || "Driver", truck: me.truck } });
	if (role === "host" && HG && HG.phase === "lobby") {
		const p = pByKey(me.key);
		if (p) {
			p.truck = me.truck;
			push();
		}
	}
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("button");
	if (!b) return;
	if (b.dataset.t !== undefined) {
		pickTruck(+b.dataset.t);
		return;
	}
	if (b.dataset.step) {
		pickTruck(me.truck + +b.dataset.step);
		return;
	}
	if (b.dataset.tvprac) {
		if (role === "host" && HG && HG.tv) tvPractice(b.dataset.tvprac);
		else if (role === "client") act({ t: "prac", g: b.dataset.tvprac });
		return;
	}
	if (b.dataset.join) {
		if (!me.name) {
			me.name = "Driver";
			saveMe();
		}
		clientJoin(b.dataset.join);
		return;
	}
	if (b.dataset.kick && role === "host") {
		HG.players = HG.players.filter((p) => p.key !== b.dataset.kick);
		if (!HG.kick.includes(b.dataset.kick)) HG.kick.push(b.dataset.kick);
		push();
		return;
	}
	if (b.dataset.rounds && role === "host") {
		HG.rounds = +b.dataset.rounds;
		push();
		return;
	}
	if (b.dataset.roll) {
		if (!G) return;
		b.disabled = true;
		act({ t: "roll", die: b.dataset.roll, seq: G.seq }, b.dataset.for || me.key);
		unstick();
		return;
	}
	if (b.dataset.buy) {
		if (!G) return;
		b.disabled = true;
		act({ t: "buy", yes: b.dataset.buy === "1", how: b.dataset.how, seq: G.seq }, b.dataset.for || me.key);
		unstick();
		return;
	}
	const a = b.dataset.a;
	if (a === "host") {
		notice = "";
		LS.del("trp_host");
		if (!me.name) {
			me.name = "Driver";
			saveMe();
		}
		hostCreate();
	} else if (a === "resume") {
		notice = "";
		hostResume(LS.get("trp_host", null));
	} else if (a === "joinlist") {
		notice = "";
		homeSub = "join";
		render();
	} else if (a === "connect") {
		const c = (($("#jcode") || {}).value || "").toUpperCase().replace(/[^A-Z]/g, "");
		if (c) {
			pendingCode = c;
			const g = NET.status === "connected" && NET.code === c && gamesAvailable()[0];
			if (g) {
				if (!me.name) {
					me.name = "Driver";
					saveMe();
				}
				clientJoin(g.id);
			} else {
				NET.join(c);
				render.last = null;
				render();
			}
		}
	} else if (a === "home") {
		homeSub = "main";
		render();
	} else if (a === "addcpu" && role === "host") addCpu();
	else if (a === "tbtip") {
		LS.set("trp_tbtip", true);
		render.last = null;
		render();
	} else if (a === "hosttv") {
		notice = "";
		LS.del("trp_host");
		hostCreate(true);
	} else if (a === "tvstart" && role === "client") act({ t: "start" });
	else if (a === "tvcpu" && role === "client") act({ t: "addcpu" });
	else if (a === "addlocal") {
		localForm = !localForm;
		render.last = null;
		render();
	} else if (a === "addlocalok" && role === "host" && HG.players.length < 8) {
		const nm = ($("#lname").value || "").trim() || `Player ${HG.players.length + 1}`;
		HG.players.push(newPlayer(rid(), nm, +$("#ltruck").value, false, true));
		localForm = false;
		push();
	} else if (a === "start" && role === "host") hostStart();
	else if (a === "quit") hostQuit();
	else if (a === "again") hostPlayAgain();
	else if (a === "endask") {
		if (confirm("End this game for everyone?")) hostQuit();
	} else if (a === "leave") {
		if (role === "client") clientLeave();
		else {
			role = "none";
			render();
		}
	} else if (a === "changetruck") {
		changingTruck = !changingTruck;
		render.last = null;
		render();
	} else if (a === "replaypod") replayPodium();
	else if (a === "peek") togglePeek();
	else if (a === "cam") {
		GFX.follow = !GFX.follow;
		GFX.ov = null;
		if (!GFX.follow) camHint();
		updateGame();
	}
});
function unstick() {
	setTimeout(() => {
		render.lastPanel = null;
		if (view === "game" && G) updateGame();
	}, 3000);
}

/* ---------- boot ---------- */
setInterval(() => {
	if (W && GFX.mode === "mg" && (document.hidden || performance.now() - lastT > 400)) {
		if (TVS) {
			try {
				tvsFrame();
			} catch (e) {
				console.error(e);
			}
			return;
		}
		try {
			for (let i = 0; i < 3 && W; i++) stepMG(0.033);
			GFX.mgLast = performance.now();
		} catch (e) {}
	}
}, 100);
gfxInit();
render();
setInterval(() => {
	if (view === "game" && role === "client") updateGame();
	if (view === "join") render();
}, 2000);
(async () => {
	if (!NET.ok) {
		roomState = "none";
		render.last = null;
		render();
		return;
	}
	room = NET.lobby();
	NET.onchange = () => {
		render.last = null;
		render();
	};
	roomState = "ok";
	room.onConnection(
		(c) => {
			roomConnected = !!c;
			render.last = null;
			render();
		},
		() => {
			roomConnected = false;
			render.last = null;
			render();
		},
	);
	room.onPeers(
		(ch) => {
			peers = ch.peers || [];
			if (role === "host") hostOnPeers();
			else if (role === "client") clientOnPeers();
			else render();
		},
		(err) => {
			room = null;
			roomState = "none";
			render.last = null;
			render();
		},
	);
	setPresence({ here: { name: me.name || "Driver" } });
	const jc = (new URLSearchParams(location.search).get("join") || "")
		.toUpperCase()
		.replace(/[^A-Z]/g, "")
		.slice(0, 6);
	if (jc) {
		pendingCode = jc;
		notice = `You're joining game ${jc}. Pick your name and truck, then tap Join Game.`;
		NET.join(jc);
	}
	render.last = null;
	render();
})();

/* ---------- bug reports: three fingers held (F8 on a keyboard, or the home screen button) opens a panel with a
   screenshot of the game view, recent errors and the game state; Share sends it all (iPhone), Copy copies the text ---------- */
function dbgGrab(cv) {
	DBG.want = false;
	try {
		const k = Math.min(1, 540 / cv.width),
			c = document.createElement("canvas");
		c.width = Math.round(cv.width * k);
		c.height = Math.round(cv.height * k);
		c.getContext("2d").drawImage(cv, 0, 0, c.width, c.height);
		DBG.shot = c.toDataURL("image/jpeg", 0.75);
	} catch (e) {
		DBG.shot = null;
	}
}
/* where the player is, for the crash marker and the report */
function dbgWhere() {
	if (W && W.def) return `minigame ${W.def.name} at ${W.t.toFixed(1)} s`;
	if (G)
		return `${G.practice ? "practice" : G.tv ? "TV game" : "game"}, ${G.phase}${G.round ? ` round ${G.round}/${G.rounds}` : ""}`;
	return `home (${homeSub})`;
}
/* the crash marker: refreshed while the page is on screen, marked clean when it's hidden or left. If the next load
   finds it unclean, the page died on screen (a crash, or iOS killing it for memory) */
{
	const prev = LS.get("trp_live", null);
	if (prev && !prev.clean && Date.now() - prev.at < 30 * 60000)
		DBG.crash = `the page stopped on screen during: ${prev.where} (${Math.round((Date.now() - prev.at) / 60000)} min before this load)`;
	const beat = () => {
		if (!document.hidden) LS.set("trp_live", { at: Date.now(), where: dbgWhere(), clean: false });
	};
	const clean = () => LS.set("trp_live", { at: Date.now(), where: dbgWhere(), clean: true });
	setInterval(beat, 3000);
	addEventListener("pagehide", clean);
	document.addEventListener("visibilitychange", () => (document.hidden ? clean() : beat()));
}
function dbgText(note) {
	const L = [],
		tr = (f) => {
			try {
				f();
			} catch (e) {
				L.push("(" + e.message + ")");
			}
		};
	L.push(`Big Rig Rumble bug report, build ${BUILD}`);
	if (note) L.push(`Note: ${note}`);
	tr(() => {
		let gpu = "";
		try {
			const gl = GFX.r && GFX.r.getContext(),
				x = gl && gl.getExtension("WEBGL_debug_renderer_info");
			gpu = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : "";
		} catch (e) {}
		const fps = (GFX.fps && GFX.fps.el && GFX.fps.el.textContent) || "? fps";
		L.push(
			`Device: ${innerWidth}x${innerHeight} @${devicePixelRatio}x, ${GFX.touch ? "touch" : "mouse"}, ${gpu || "GPU ?"}, ${fps}`,
		);
		L.push(`Browser: ${navigator.userAgent.slice(0, 170)}`);
	});
	tr(() => L.push(`Where: ${dbgWhere()}, page open ${Math.round((Date.now() - DBG.t0) / 1000)} s`));
	tr(() => {
		L.push(
			`Net: role ${role}, ${NET.status}${NET.err ? ` (${NET.err})` : ""}, code ${NET.code || "-"}, ${peers.length} peers`,
		);
		if (!G) return;
		const tag = (p) => (p.bot ? " (CPU)" : p.local ? " (same phone)" : G === HG && !online(p.key) ? " OFFLINE" : "");
		L.push(`Game: phase ${G.phase}, turn ${G.turn}, players ${G.players.map((p) => p.name + tag(p)).join(", ")}`);
		if (G.mg) {
			const mg = G.mg;
			L.push(
				`Minigame state: ${mg.g}${mg.team ? " " + mg.team : ""}${mg.duel ? " duel" : ""}, started ${mg.t0 ? "yes" : "no"}, ready [${Object.keys(mg.ready || {}).join(" ")}], scores from [${Object.keys(mg.res || {}).join(" ")}]`,
			);
		}
	});
	tr(() => {
		if (!W) return;
		const e = W.me,
			flags = [W.tv && "TV", W.split && "split", W.localOnly && "practice run"].filter(Boolean).join(", ");
		L.push(
			`World: ${W.def.name}, t ${W.t.toFixed(1)}, ${W.list.length} trucks, over ${!!W.over}, sent ${!!W.submitted}${flags ? ", " + flags : ""}`,
		);
		if (e)
			L.push(
				`Me: ${e.p.name} at ${e.x.toFixed(1)}, ${e.z.toFixed(1)}, y ${e.y.toFixed(1)}, ${e.al ? "alive" : "out"}${e.d ? ", done" : ""}${e.side !== undefined ? ", side " + e.side : ""}, score ${Math.round(e.sc)}`,
			);
		const age = (x) =>
			x.local ? "" : x.net ? ` (${Math.round(performance.now() - x.net.at)} ms old)` : " (never seen)";
		L.push(
			`Others: ${W.list
				.filter((x) => x !== e)
				.map((x) => mgName(x) + age(x) + (x.al ? "" : " out"))
				.join(", ")}`,
		);
	});
	if (DBG.crash) L.push(`Last session: ${DBG.crash}`);
	L.push(DBG.errs.length ? `Errors (${DBG.errs.length}):` : "Errors: none");
	DBG.errs.forEach((e) =>
		L.push(
			`  ${Math.round((Date.now() - e.at) / 1000)} s ago: ${e.msg}${e.where ? " @ " + e.where : ""}${e.stack ? "\n    " + e.stack : ""}`,
		),
	);
	if (DBG.log.length) {
		L.push("Last game events:");
		DBG.log.slice(-15).forEach((l) => L.push("  " + l));
	}
	return L.join("\n");
}
function dbgOpen() {
	if (document.getElementById("dbgp")) return;
	DBG.shot = null;
	DBG.want = true;
	/* give the next frame a moment to be grabbed (if anything is rendering), then show the panel */
	setTimeout(() => {
		DBG.want = false;
		const p = document.createElement("div");
		p.id = "dbgp";
		p.innerHTML = `<div class="dbgbox"><h2>🐞 Bug report</h2>${DBG.shot ? `<img alt="Screenshot of the game" src="${DBG.shot}">` : `<p class="note">No game view to capture here.</p>`}
      <label class="field">What went wrong? (optional)<input id="dbgnote" maxlength="200" placeholder="e.g. my truck froze after the TNT"></label>
      <textarea id="dbgtx" readonly></textarea>
      <div class="row"><button class="btn go" data-dbg="share">${navigator.share ? "Share" : "Save screenshot"}</button><button class="btn ghost" data-dbg="copy">Copy text</button><button class="btn ghost" data-dbg="close">Close</button></div></div>`;
		document.body.appendChild(p);
		const tx = $("#dbgtx"),
			up = () => (tx.value = dbgText($("#dbgnote").value.trim()));
		up();
		$("#dbgnote").addEventListener("input", up);
	}, 150);
}
async function dbgAct(a) {
	const tx = $("#dbgtx"),
		text = tx ? tx.value : "";
	if (a === "open") dbgOpen();
	else if (a === "close") {
		const p = $("#dbgp");
		if (p) p.remove();
	} else if (a === "copy") {
		try {
			await navigator.clipboard.writeText(text);
		} catch (e) {
			tx.select();
			document.execCommand("copy");
		}
		$('[data-dbg="copy"]').textContent = "Copied ✓";
	} else if (a === "share") {
		let file = null;
		if (DBG.shot) {
			const blob = await (await fetch(DBG.shot)).blob();
			file = new File([blob], "bigrig-bug.jpg", { type: "image/jpeg" });
		}
		if (navigator.share) {
			try {
				if (file && navigator.canShare && navigator.canShare({ files: [file] }))
					await navigator.share({ files: [file], text, title: "Big Rig Rumble bug" });
				else await navigator.share({ text, title: "Big Rig Rumble bug" });
			} catch (e) {}
		} else if (DBG.shot) {
			const l = document.createElement("a");
			l.href = DBG.shot;
			l.download = "bigrig-bug.jpg";
			l.click();
		}
	}
}
document.addEventListener("click", (e) => {
	const b = e.target.closest("[data-dbg]");
	if (b) dbgAct(b.dataset.dbg);
});
/* three fingers held still for 0.9 s (a quick three-finger tap happens when mashing a tap game) */
let dbgHold = 0;
document.addEventListener(
	"touchstart",
	(e) => {
		if (e.touches.length >= 3 && !dbgHold)
			dbgHold = setTimeout(() => {
				dbgHold = 0;
				dbgOpen();
			}, 900);
	},
	{ passive: true },
);
["touchend", "touchcancel"].forEach((ev) =>
	document.addEventListener(
		ev,
		(e) => {
			if (e.touches.length < 3 && dbgHold) {
				clearTimeout(dbgHold);
				dbgHold = 0;
			}
		},
		{ passive: true },
	),
);
addEventListener("keydown", (e) => {
	if (e.key === "F8") dbgOpen();
});
