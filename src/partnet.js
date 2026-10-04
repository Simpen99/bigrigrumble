
/* ---------- peer-to-peer multiplayer (PeerJS, host phone is the hub) ---------- */
const NET = (() => {
  const PREFIX = "trkrally26-", store = {}, rooms = {}, connH = [], dirty = {}, hubConns = new Map();
  let peer = null, hub = false, conn = null, myLabel = "me", connected = false, status = "idle", err = "", code = null, retryT = null, flushT = null, closing = false;
  const S = n => store[n] || (store[n] = new Map());
  const changed = () => { try { NET.onchange && NET.onchange(); } catch (e) {} };
  const setConn = v => { if (connected !== v) { connected = v; connH.forEach(h => { try { h(v); } catch (e) {} }); } changed(); };
  function merge(old, patch) { const o = Object.assign({}, old || {}); for (const k in patch) { if (patch[k] === null) delete o[k]; else o[k] = patch[k]; } return o; }
  function markDirty(room, label, removed) { const d = dirty[room] || (dirty[room] = { up: new Set(), rm: new Set() }); if (removed) { d.rm.add(label); d.up.delete(label); } else { d.up.add(label); d.rm.delete(label); } if (!flushT) { if (document.hidden) { flushT = 1; Promise.resolve().then(flush); } else flushT = setTimeout(flush, 45); } }
  function flush() {
    flushT = null;
    for (const room of Object.keys(dirty)) { const d = dirty[room]; delete dirty[room]; const up = {}; d.up.forEach(l => { const v = S(room).get(l); if (v) up[l] = v; });
      const msg = { t: "d", room, up, rm: [...d.rm] }; hubConns.forEach(c => { if (c.open) { try { c.send(msg); } catch (e) {} } }); refresh(room); }
  }
  const refresh = room => { if (rooms[room]) rooms[room].rebuild(); };
  function hubApply(label, room, patch) {
    const m = S(room);
    if (patch === "__leave") { if (m.has(label)) { m.delete(label); markDirty(room, label, true); } return; }
    if (!patch || typeof patch !== "object") return;
    m.set(label, merge(m.get(label), patch)); markDirty(room, label);
  }
  function mkRoom(name) {
    const r = { name, mine: {}, handlers: [], cache: [], pc: new Map(), self: null };
    r.rebuild = () => {
      if (!r.self || r.self.presence !== r.mine || r.self.peer !== myLabel) r.self = { peer: myLabel, by: null, isMe: true, sameTab: true, kind: "viewer", guest: false, presence: r.mine, updatedAt: Date.now() };
      const list = [r.self];
      S(name).forEach((pres, label) => { if (label === myLabel) return; let p = r.pc.get(label);
        if (!p || p.presence !== pres) { p = { peer: label, by: null, isMe: false, sameTab: false, kind: "viewer", guest: false, presence: pres, updatedAt: Date.now() }; r.pc.set(label, p); } list.push(p); });
      r.cache = list; const ch = { peers: list, joined: [], left: [], updated: [] };
      r.handlers.forEach(h => { try { h(ch); } catch (e) { console.error(e); } });
    };
    r.api = {
      name,
      presence(patch) { r.mine = merge(r.mine, patch);
        if (hub) hubApply(myLabel, name, patch); else if (conn && conn.open) { try { conn.send({ t: "p", room: name, patch }); } catch (e) {} }
        r.rebuild(); return Promise.resolve(); },
      onPeers(h) { r.handlers.push(h); setTimeout(() => h({ peers: r.cache, joined: r.cache, left: [], updated: [] }), 0); return () => { r.handlers = r.handlers.filter(x => x !== h); }; },
      onConnection(h) { connH.push(h); setTimeout(() => h(connected), 0); return () => {}; },
      peers() { return r.cache; }, connected() { return connected; },
      join: async n => room(n),
      leave: async () => { if (hub) hubApply(myLabel, name, "__leave"); else if (conn && conn.open) { try { conn.send({ t: "p", room: name, patch: "__leave" }); } catch (e) {} } r.mine = {}; delete rooms[name]; }
    };
    r.rebuild(); return r;
  }
  function room(n) { return (rooms[n] || (rooms[n] = mkRoom(n))).api; }
  function onHubConn(c) {
    c.on("open", () => { hubConns.set(c.peer, c); for (const rn of Object.keys(store)) { try { c.send({ t: "d", room: rn, up: Object.fromEntries(store[rn]), rm: [] }); } catch (e) {} } changed(); });
    c.on("data", m => { if (m && m.t === "p" && typeof m.room === "string" && m.room.length < 60) hubApply(c.peer, m.room, m.patch); });
    const gone = () => { if (!hubConns.has(c.peer)) return; hubConns.delete(c.peer); for (const rn of Object.keys(store)) if (store[rn].has(c.peer)) { store[rn].delete(c.peer); markDirty(rn, c.peer, true); } changed(); };
    c.on("close", gone); c.on("error", gone);
  }
  function host(c) {
    close(); code = c; hub = true; myLabel = "hub"; status = "starting"; err = ""; changed();
    return new Promise((res, rej) => {
      peer = new Peer(PREFIX + c, { debug: 0 });
      peer.on("open", () => { status = "hosting"; Object.values(rooms).forEach(r => { if (Object.keys(r.mine).length) hubApply(myLabel, r.name, r.mine); r.rebuild(); }); setConn(true); res(); });
      peer.on("connection", onHubConn);
      peer.on("error", e => { if (e && e.type === "unavailable-id") { status = "idle"; hub = false; rej(e); } else { err = (e && e.type) || "error"; changed(); } });
      peer.on("disconnected", () => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) {} });
    });
  }
  function onClientData(m) {
    if (!m || m.t !== "d" || typeof m.room !== "string") return;
    const s = S(m.room); for (const l in m.up) s.set(l, m.up[l]); (m.rm || []).forEach(l => s.delete(l)); refresh(m.room);
  }
  function connectHub() {
    if (!peer || peer.destroyed || hub) return;
    const c = peer.connect(PREFIX + code, { reliable: true, serialization: "json" }); conn = c;
    c.on("open", () => { if (conn !== c) return; status = "connected"; err = ""; Object.values(rooms).forEach(r => { if (Object.keys(r.mine).length) { try { c.send({ t: "p", room: r.name, patch: r.mine }); } catch (e) {} } }); setConn(true); });
    c.on("data", onClientData);
    const lost = () => { if (conn !== c) return; conn = null; for (const n of Object.keys(store)) store[n].clear(); Object.keys(rooms).forEach(refresh); status = "reconnecting"; setConn(false); if (!closing) retry(2500); };
    c.on("close", lost); c.on("error", lost);
  }
  function retry(ms) { clearTimeout(retryT); retryT = setTimeout(() => { if (!hub && code && peer && !peer.destroyed && !(conn && conn.open)) connectHub(); }, ms); }
  function join(c) {
    close(); code = c; hub = false; status = "connecting"; err = ""; changed();
    peer = new Peer({ debug: 0 });
    peer.on("open", id => { myLabel = id; Object.values(rooms).forEach(r => r.rebuild()); connectHub(); });
    peer.on("error", e => { const t = e && e.type;
      if (t === "peer-unavailable") { err = `No game with code ${code} right now. Check the code and make sure the host's screen is on.`; status = "failed"; conn = null; setConn(false); retry(4000); }
      else if (t === "network" || t === "server-error" || t === "socket-error" || t === "socket-closed") { err = "Can't reach the connection server. Check your internet connection."; status = "failed"; setConn(false); retry(4000); }
      else { err = t || "error"; changed(); } });
    peer.on("disconnected", () => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) {} });
  }
  function close() {
    closing = true; clearTimeout(retryT);
    try { conn && conn.close(); } catch (e) {} hubConns.forEach(c => { try { c.close(); } catch (e) {} }); hubConns.clear();
    try { peer && peer.destroy(); } catch (e) {}
    peer = null; conn = null; hub = false; code = null; myLabel = "me"; status = "idle";
    for (const n of Object.keys(store)) store[n].clear(); Object.keys(rooms).forEach(refresh);
    closing = false; setConn(false);
  }
  return { lobby: () => room("lobby"), host, join, close,
    get ok() { return typeof Peer !== "undefined"; }, get status() { return status; }, get err() { return err; }, get code() { return code; }, get hub() { return hub; }, get players() { return hubConns.size; } };
})();
