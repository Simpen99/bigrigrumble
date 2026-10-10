/* fake PeerJS for multi-device tests (nettest, tvtest): pages load FAKE in place of PeerJS, and node relays reg / conn /
   data / close between them with optional lag. fakeNet(lag).relay(page) is exposed to each page as __net */
/* ---- fake PeerJS: same API slice partnet.js uses; node routes reg / conn / data / close between the pages ---- */
export const FAKE = `(() => {
	const peers = {}, conns = {};
	let n = 0;
	const on = (o) => { o.h = {}; o.on = (e, f) => ((o.h[e] || (o.h[e] = [])).push(f), o); o.emit = (e, ...a) => (o.h[e] || []).slice().forEach((f) => { try { f(...a); } catch (x) { console.error(x); } }); };
	class Conn {
		constructor(p, cid, other) { on(this); this.p = p; this.cid = cid; this.peer = other; this.open = false; conns[cid] = this; }
		send(m) { if (this.open) __net("data", { cid: this.cid, to: this.peer, m: JSON.stringify(m) }); }
		close() { if (!conns[this.cid]) return; delete conns[this.cid]; this.open = false; __net("close", { cid: this.cid, to: this.peer }); this.emit("close"); }
	}
	window.Peer = class {
		constructor(id) {
			on(this);
			if (typeof id !== "string") id = "c" + Math.random().toString(36).slice(2, 9);
			this.id = id; this.destroyed = false; peers[id] = this;
			__net("reg", { id }).then((ok) => { if (!this.destroyed) ok ? this.emit("open", id) : this.emit("error", { type: "unavailable-id" }); });
		}
		connect(to) {
			const cid = this.id + "~" + ++n, c = new Conn(this, cid, to);
			__net("conn", { from: this.id, to, cid }).then((ok) => { if (!ok) { delete conns[cid]; this.emit("error", { type: "peer-unavailable" }); } });
			return c;
		}
		reconnect() {}
		destroy() { this.destroyed = true; Object.values(conns).filter((c) => c.p === this).forEach((c) => c.close()); __net("unreg", { id: this.id }); delete peers[this.id]; }
	};
	window.__fakeIn = (m) => {
		const c = conns[m.cid];
		if (m.t === "conn") { const p = peers[m.to]; if (!p) return; const k = new Conn(p, m.cid, m.from); k.open = true; p.emit("connection", k); setTimeout(() => k.emit("open"), 0); }
		else if (m.t === "opened" && c) { c.open = true; c.emit("open"); }
		else if (m.t === "data" && c && c.open) c.emit("data", JSON.parse(m.m));
		else if (m.t === "close" && c) { delete conns[m.cid]; c.open = false; c.emit("close"); }
	};
})();`;
export function fakeNet(lag = 0) {
	const jit = lag ? lag / 3 : 0;
	const owner = new Map(),
		lastAt = new Map(),
		queues = new Map(),
		stats = { msgs: 0, bytes: 0, late: 0, worst: 0 };
	/* ordered delivery per receiving page, each message delayed by lag + jitter. Everything due goes over in one call, and
   the relay measures its own extra delay (headless pages are slow), so a slow test can't pass for a game bug */
	function deliver(page, m) {
		const at = Math.max(Date.now() + lag + (Math.random() - 0.5) * 2 * jit, lastAt.get(page) || 0);
		lastAt.set(page, at);
		let q = queues.get(page);
		if (!q) queues.set(page, (q = { list: [], busy: false }));
		q.list.push({ at, m });
		setTimeout(() => pump(page, q), Math.max(0, at - Date.now()));
	}
	async function pump(page, q) {
		if (q.busy) return;
		q.busy = true;
		while (q.list.length && q.list[0].at <= Date.now()) {
			const due = [];
			while (q.list.length && q.list[0].at <= Date.now()) due.push(q.list.shift());
			const now = Date.now();
			due.forEach((d) => {
				const late = now - d.at;
				stats.worst = Math.max(stats.worst, late);
				if (late > 150) stats.late++;
			});
			await page
				.evaluate(
					(ms) => window.__fakeIn && ms.forEach((m) => __fakeIn(m)),
					due.map((d) => d.m),
				)
				.catch(() => {});
		}
		q.busy = false;
		if (q.list.length) setTimeout(() => pump(page, q), Math.max(0, q.list[0].at - Date.now()));
	}
	const relay = (page) => async (type, d) => {
		if (type === "reg") {
			if (owner.has(d.id)) return false;
			owner.set(d.id, page);
			return true;
		}
		if (type === "unreg") owner.delete(d.id);
		const to = owner.get(d.to);
		if (type === "conn") {
			if (!to) return false;
			deliver(to, { t: "conn", from: d.from, to: d.to, cid: d.cid });
			deliver(page, { t: "opened", cid: d.cid });
			return true;
		}
		if (type === "data" && to) {
			stats.msgs++;
			stats.bytes += d.m.length;
			deliver(to, { t: "data", cid: d.cid, m: d.m });
		}
		if (type === "close" && to) deliver(to, { t: "close", cid: d.cid });
		return true;
	};
	return { relay, stats };
}
