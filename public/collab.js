/* Multiplayer coding for Arcode.
   Peer to peer over WebRTC (PeerJS public broker). Star topology: the host is the authority and relays.
   Sync: operational transformation (ot.js style retain/insert/delete ops, one server revision log per file on the host,
   a three-state client on guests), so simultaneous typing converges. Presence: colored remote carets and selections.
   Public API: window.collab (default instance) and window.Collab.create(env) for tests / custom transports. */
(function () {
  'use strict';
  var PEER_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  var COLORS = ['#ff6b8a', '#5ee6ff', '#f7d154', '#5cf2a0', '#b69bff', '#ffa24d', '#6aa8ff', '#ff8ad8'];
  var ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
  var MAX_HIST = 2000;

  /* ------------------------------------------------------------------ OT */
  function isRet(c) { return typeof c === 'number' && c > 0; }
  function isDel(c) { return typeof c === 'number' && c < 0; }
  function isIns(c) { return typeof c === 'string'; }

  function Op() { this.c = []; this.base = 0; this.target = 0; }
  Op.prototype.retain = function (n) {
    if (n <= 0) return this;
    this.base += n; this.target += n;
    var k = this.c.length;
    if (k && isRet(this.c[k - 1])) this.c[k - 1] += n; else this.c.push(n);
    return this;
  };
  Op.prototype.insert = function (s) {
    if (!s) return this;
    this.target += s.length;
    var k = this.c.length, last = this.c[k - 1];
    if (isIns(last)) this.c[k - 1] += s;
    else if (isDel(last)) { if (isIns(this.c[k - 2])) this.c[k - 2] += s; else this.c.splice(k - 1, 0, s); }
    else this.c.push(s);
    return this;
  };
  Op.prototype.delete = function (n) {
    n = Math.abs(n);
    if (!n) return this;
    this.base += n;
    var k = this.c.length;
    if (k && isDel(this.c[k - 1])) this.c[k - 1] -= n; else this.c.push(-n);
    return this;
  };
  Op.prototype.isNoop = function () { return this.c.length === 0 || (this.c.length === 1 && isRet(this.c[0])); };
  Op.prototype.apply = function (s) {
    if (s.length !== this.base) throw new Error('op base length mismatch');
    var out = [], i = 0;
    for (var k = 0; k < this.c.length; k++) {
      var c = this.c[k];
      if (isRet(c)) { out.push(s.slice(i, i + c)); i += c; }
      else if (isIns(c)) out.push(c);
      else i -= c;
    }
    return out.join('');
  };
  Op.from = function (arr) {
    if (!Array.isArray(arr)) throw new Error('bad op');
    var o = new Op();
    for (var k = 0; k < arr.length; k++) {
      var c = arr[k];
      if (typeof c === 'number' && c % 1 === 0 && c !== 0) { if (c > 0) o.retain(c); else o['delete'](-c); }
      else if (typeof c === 'string') o.insert(c);
      else throw new Error('bad op');
    }
    return o;
  };

  function compose(a, b) {
    if (a.target !== b.base) throw new Error('compose length mismatch');
    var res = new Op(), i1 = 0, i2 = 0, o1 = a.c[i1++], o2 = b.c[i2++];
    for (;;) {
      if (o1 === undefined && o2 === undefined) break;
      if (isDel(o1)) { res['delete'](-o1); o1 = a.c[i1++]; continue; }
      if (isIns(o2)) { res.insert(o2); o2 = b.c[i2++]; continue; }
      if (o1 === undefined || o2 === undefined) throw new Error('compose: ops too short');
      if (isRet(o1) && isRet(o2)) {
        if (o1 > o2) { res.retain(o2); o1 -= o2; o2 = b.c[i2++]; }
        else if (o1 === o2) { res.retain(o1); o1 = a.c[i1++]; o2 = b.c[i2++]; }
        else { res.retain(o1); o2 -= o1; o1 = a.c[i1++]; }
      } else if (isIns(o1) && isDel(o2)) {
        if (o1.length > -o2) { o1 = o1.slice(-o2); o2 = b.c[i2++]; }
        else if (o1.length === -o2) { o1 = a.c[i1++]; o2 = b.c[i2++]; }
        else { o2 += o1.length; o1 = a.c[i1++]; }
      } else if (isIns(o1) && isRet(o2)) {
        if (o1.length > o2) { res.insert(o1.slice(0, o2)); o1 = o1.slice(o2); o2 = b.c[i2++]; }
        else if (o1.length === o2) { res.insert(o1); o1 = a.c[i1++]; o2 = b.c[i2++]; }
        else { res.insert(o1); o2 -= o1.length; o1 = a.c[i1++]; }
      } else if (isRet(o1) && isDel(o2)) {
        if (o1 > -o2) { res['delete'](o2); o1 += o2; o2 = b.c[i2++]; }
        else if (o1 === -o2) { res['delete'](o2); o1 = a.c[i1++]; o2 = b.c[i2++]; }
        else { res['delete'](o1); o2 += o1; o1 = a.c[i1++]; }
      } else throw new Error('compose: unreachable');
    }
    return res;
  }

  /* transform(a, b) -> [a', b'] with apply(apply(s,a),b') == apply(apply(s,b),a'). On equal-position inserts, a goes first. */
  function transform(a, b) {
    if (a.base !== b.base) throw new Error('transform base mismatch');
    var a1 = new Op(), b1 = new Op(), i1 = 0, i2 = 0, o1 = a.c[i1++], o2 = b.c[i2++], m;
    for (;;) {
      if (o1 === undefined && o2 === undefined) break;
      if (isIns(o1)) { a1.insert(o1); b1.retain(o1.length); o1 = a.c[i1++]; continue; }
      if (isIns(o2)) { a1.retain(o2.length); b1.insert(o2); o2 = b.c[i2++]; continue; }
      if (o1 === undefined || o2 === undefined) throw new Error('transform: ops too short');
      if (isRet(o1) && isRet(o2)) {
        if (o1 > o2) { m = o2; o1 -= o2; o2 = b.c[i2++]; }
        else if (o1 === o2) { m = o2; o1 = a.c[i1++]; o2 = b.c[i2++]; }
        else { m = o1; o2 -= o1; o1 = a.c[i1++]; }
        a1.retain(m); b1.retain(m);
      } else if (isDel(o1) && isDel(o2)) {
        if (-o1 > -o2) { o1 -= o2; o2 = b.c[i2++]; }
        else if (o1 === o2) { o1 = a.c[i1++]; o2 = b.c[i2++]; }
        else { o2 -= o1; o1 = a.c[i1++]; }
      } else if (isDel(o1) && isRet(o2)) {
        if (-o1 > o2) { m = o2; o1 += o2; o2 = b.c[i2++]; }
        else if (-o1 === o2) { m = o2; o1 = a.c[i1++]; o2 = b.c[i2++]; }
        else { m = -o1; o2 += o1; o1 = a.c[i1++]; }
        a1['delete'](m);
      } else if (isRet(o1) && isDel(o2)) {
        if (o1 > -o2) { m = -o2; o1 += o2; o2 = b.c[i2++]; }
        else if (o1 === -o2) { m = o1; o1 = a.c[i1++]; o2 = b.c[i2++]; }
        else { m = o1; o2 += o1; o1 = a.c[i1++]; }
        b1['delete'](m);
      } else throw new Error('transform: unreachable');
    }
    return [a1, b1];
  }

  /* where does index idx (in the pre-op doc) land after op? Carets at an insert point stay before the insert. */
  function mapIdx(op, idx) {
    var o = 0, n = 0;
    for (var k = 0; k < op.c.length; k++) {
      var c = op.c[k];
      if (isRet(c)) { if (idx < o + c) return n + (idx - o); o += c; n += c; }
      else if (isIns(c)) { if (idx === o) return n; n += c.length; }
      else { var l = -c; if (idx < o + l) return n; o += l; }
    }
    return n + (idx - o);
  }

  function hash(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }

  /* ------------------------------------------------------- PeerJS transport */
  function loadPeer() {
    if (window.Peer) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = PEER_URL; s.onload = res;
      s.onerror = function () { rej(new Error('Could not load PeerJS. Check your connection or ad blocker.')); };
      document.head.appendChild(s);
    });
  }
  function peerError(e) {
    var t = e && e.type, err;
    if (t === 'peer-unavailable') err = new Error('Room not found. Check the code and try again.');
    else if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') err = new Error('Cannot reach the PeerJS broker. Check your connection.');
    else err = new Error((e && e.message) || 'Connection failed');
    err.type = t; return err;
  }
  function wrapConn(c, peer) {
    return {
      id: c.peer,
      send: function (m) { c.send(m); },
      close: function () { try { c.close(); } catch (e) {} if (peer) { try { peer.destroy(); } catch (e2) {} } },
      onData: function (f) { c.on('data', f); },
      onClose: function (f) { c.on('close', f); c.on('error', f); }
    };
  }
  var PeerTransport = {
    host: function (code) {
      return loadPeer().then(function () {
        return new Promise(function (res, rej) {
          var peer = new window.Peer('ce-' + code, { debug: 0 }), cb = function () {}, opened = false;
          peer.on('open', function () {
            opened = true;
            res({ onConnection: function (f) { cb = f; }, close: function () { try { peer.destroy(); } catch (e) {} } });
          });
          peer.on('connection', function (c) { c.on('open', function () { cb(wrapConn(c)); }); });
          peer.on('error', function (e) { if (!opened) { try { peer.destroy(); } catch (x) {} rej(peerError(e)); } });
        });
      });
    },
    join: function (code) {
      return loadPeer().then(function () {
        return new Promise(function (res, rej) {
          var peer = new window.Peer(undefined, { debug: 0 }), done = false;
          var timer = setTimeout(function () { if (!done) { done = true; try { peer.destroy(); } catch (e) {} rej(new Error('Timed out connecting to the room.')); } }, 12000);
          function fail(e) { if (done) return; done = true; clearTimeout(timer); try { peer.destroy(); } catch (x) {} rej(peerError(e)); }
          peer.on('error', fail);
          peer.on('open', function () {
            var c = peer.connect('ce-' + code, { reliable: true, serialization: 'json' });
            c.on('open', function () { if (done) return; done = true; clearTimeout(timer); res(wrapConn(c, peer)); });
            c.on('error', fail);
          });
        });
      });
    }
  };

  /* --------------------------------------------------------------- session */
  function create(env0) {
    var env = Object.assign({ sumEvery: 4000, ui: true, toast: function () {} }, env0);
    var cm = env.cm, Files = env.Files, ev = env.events || window, tr = env.transport || PeerTransport;
    var toast = env.toast;
    var role = null, code = '', status = 'idle', error = '';
    var me = { id: null, name: '', color: COLORS[0] };
    var users = {};               // remote users: id -> {id,name,color,file,a,h,marks[]}
    var peers = new Map();        // host: conn -> {conn,id,name,color}
    var hostConn = null, hostApi = null, pendingJoin = null;
    var docs = {}, localOnly = {}, applying = false, sumTimer = null, curT = 0, uidN = 0, colorN = 0, lastResync = {};
    var listeners = [];
    var ui = null;

    function curName() { return Files.current().name; }
    function docLength() { var l = cm.lastLine(); return cm.indexFromPos({ line: l, ch: cm.getLine(l).length }); }
    function getText(name) {
      if (name === curName()) return cm.getValue();
      var f = Files.all().filter(function (x) { return x.name === name; })[0];
      return f ? f.code : '';
    }
    function curLen(name) { return name === curName() ? docLength() : getText(name).length; }
    function guarded(fn) { var p = applying; applying = true; try { return fn(); } finally { applying = p; } }
    function setText(name, text) {
      guarded(function () {
        var active = name === curName(), idx = 0;
        if (active) idx = cm.indexFromPos(cm.getCursor('head'));
        Files.replace(name, text);
        if (active) { try { cm.setCursor(cm.posFromIndex(Math.min(idx, text.length))); } catch (e) {} }
      });
    }
    function newDoc() { return { base: 0, hist: [], rev: 0, out: null, buf: null }; }
    function docRev(d) { return role === 'host' ? d.base + d.hist.length : d.rev; }
    function send(m) { if (hostConn) { try { hostConn.send(m); } catch (e) {} } }
    function bcast(m, except) { peers.forEach(function (p) { if (p.conn !== except) { try { p.conn.send(m); } catch (e) {} } }); }
    function emit() {
      var s = api.state();
      if (env.onState) env.onState(s);
      listeners.forEach(function (f) { try { f(s); } catch (e) {} });
      if (ui) ui.refresh();
    }
    function setStatus(s, err) { status = s; error = err || ''; emit(); }
    function genCode() { var s = ''; for (var i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }
    function rosterList() {
      var l = [{ id: me.id, name: me.name, color: me.color }];
      Object.keys(users).forEach(function (k) { l.push({ id: k, name: users[k].name, color: users[k].color }); });
      return l;
    }
    function rosterMsg() { return { t: 'roster', users: rosterList() }; }

    /* ---- presence rendering ---- */
    function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
    function clearMarks(u) { (u.marks || []).forEach(function (m) { try { m.clear(); } catch (e) {} }); u.marks = []; }
    function renderUser(u) {
      clearMarks(u);
      if (!role || u.file !== curName() || u.a == null || u.h == null) return;
      var len = docLength(), a = Math.max(0, Math.min(len, u.a)), h = Math.max(0, Math.min(len, u.h));
      try {
        if (a !== h) {
          var lo = Math.min(a, h), hi = Math.max(a, h);
          u.marks.push(cm.markText(cm.posFromIndex(lo), cm.posFromIndex(hi), { css: 'background:' + rgba(u.color, 0.28), className: 'cc-sel' }));
        }
        var el = document.createElement('span');
        el.className = 'cc-caret'; el.style.borderColor = u.color;
        var tag = document.createElement('span');
        tag.className = 'cc-tag'; tag.textContent = u.name; tag.style.background = u.color;
        el.appendChild(tag);
        u.marks.push(cm.setBookmark(cm.posFromIndex(h), { widget: el, insertLeft: true }));
      } catch (e) {}
    }
    function renderAll() { Object.keys(users).forEach(function (k) { renderUser(users[k]); }); }
    function shiftCursors(file, op) {
      Object.keys(users).forEach(function (k) {
        var u = users[k];
        if (u.file === file && u.a != null) { u.a = mapIdx(op, u.a); u.h = mapIdx(op, u.h); }
      });
    }

    /* ---- applying ops to the local view ---- */
    function applyOp(file, op) {
      shiftCursors(file, op);
      if (file === curName()) {
        guarded(function () {
          cm.operation(function () {
            var i = 0;
            for (var k = 0; k < op.c.length; k++) {
              var c = op.c[k];
              if (isRet(c)) i += c;
              else if (isIns(c)) { cm.replaceRange(c, cm.posFromIndex(i), undefined, '+collab'); i += c.length; }
              else { cm.replaceRange('', cm.posFromIndex(i), cm.posFromIndex(i - c), '+collab'); }
            }
          });
        });
        renderAll();
      } else {
        setText(file, op.apply(getText(file)));
      }
    }

    /* ---- local edits -> ops ---- */
    function localOp(file, op) {
      var d = docs[file];
      shiftCursors(file, op);
      if (role === 'host') {
        d.hist.push(op);
        bcast({ t: 'op', file: file, rev: d.base + d.hist.length, op: op.c, uid: me.id });
        if (d.hist.length > MAX_HIST) { d.hist.shift(); d.base++; }
      } else {
        if (!d.out) { d.out = op; send({ t: 'op', file: file, rev: d.rev, op: op.c }); }
        else d.buf = d.buf ? compose(d.buf, op) : op;
      }
    }
    function onBefore(inst, ch) {
      if (!role || applying || ch.origin === '+collab') return;
      var file = curName();
      if (!docs[file]) return;
      try {
        var from = cm.indexFromPos(ch.from), removed = cm.getRange(ch.from, ch.to, '\n').length;
        var ins = ch.text.join('\n'), total = docLength();
        var op = new Op().retain(from)['delete'](removed).insert(ins).retain(total - from - removed);
        if (!op.isNoop()) localOp(file, op);
      } catch (e) { requestResync(file); }
    }
    cm.on('beforeChange', onBefore);

    function sendCursor() {
      if (!role) return;
      var file = curName();
      if (!docs[file]) return;
      var m = { t: 'cur', file: file, a: cm.indexFromPos(cm.getCursor('anchor')), h: cm.indexFromPos(cm.getCursor('head')), uid: me.id };
      if (role === 'host') bcast(m); else send(m);
    }
    cm.on('cursorActivity', function () {
      if (!role || applying || curT) return;
      curT = setTimeout(function () { curT = 0; sendCursor(); }, 80);
    });
    function syncFileList() {
      if (!role || applying) return;
      Files.all().forEach(function (f) {
        if (docs[f.name] || localOnly[f.name]) return;
        docs[f.name] = newDoc();
        var m = { t: 'newfile', name: f.name, lang: f.lang, text: f.name === curName() ? cm.getValue() : f.code };
        if (role === 'host') bcast(m); else send(m);
      });
    }
    ev.addEventListener('filechange', function () { if (!role) return; syncFileList(); renderAll(); sendCursor(); });

    /* ---- host side ---- */
    function sendSnap(conn, file) { if (docs[file]) conn.send({ t: 'snap', file: file, rev: docRev(docs[file]), text: getText(file) }); }
    function hostRecv(conn, msg) {
      var p = peers.get(conn);
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'hello') return onHello(conn, msg);
      if (!p) return;
      try {
        switch (msg.t) {
          case 'op': {
            var d = docs[msg.file];
            if (!d) return;
            var op = Op.from(msg.op), r = msg.rev;
            if (typeof r !== 'number' || r < d.base || r > d.base + d.hist.length) return sendSnap(conn, msg.file);
            for (var i = r - d.base; i < d.hist.length; i++) op = transform(op, d.hist[i])[0];
            if (op.base !== curLen(msg.file)) return sendSnap(conn, msg.file);
            applyOp(msg.file, op);
            d.hist.push(op);
            var rev = d.base + d.hist.length;
            conn.send({ t: 'ack', file: msg.file, rev: rev });
            bcast({ t: 'op', file: msg.file, rev: rev, op: op.c, uid: p.id }, conn);
            if (d.hist.length > MAX_HIST) { d.hist.shift(); d.base++; }
            break;
          }
          case 'cur': {
            var u = users[p.id];
            if (!u || typeof msg.a !== 'number' || typeof msg.h !== 'number') return;
            u.file = msg.file; u.a = msg.a; u.h = msg.h; renderUser(u);
            bcast({ t: 'cur', file: msg.file, a: msg.a, h: msg.h, uid: p.id }, conn);
            break;
          }
          case 'resync': sendSnap(conn, msg.file); break;
          case 'newfile': {
            if (!msg.name || typeof msg.text !== 'string') return;
            if (docs[msg.name]) return sendSnap(conn, msg.name);
            docs[msg.name] = newDoc();
            guarded(function () { Files.replace(msg.name, msg.text); });
            bcast({ t: 'newfile', name: msg.name, lang: msg.lang, text: msg.text }, conn);
            break;
          }
          case 'bye': guestGone(conn); break;
        }
      } catch (e) { sendSnap(conn, msg.file); }
    }
    function onHello(conn, msg) {
      if (peers.has(conn)) return;
      var name = String(msg.name || 'Guest').slice(0, 20), id = 'u' + (++uidN), color = COLORS[(++colorN) % COLORS.length];
      Files.all().forEach(function (f) { if (!docs[f.name]) docs[f.name] = newDoc(); });
      var files = Files.all().map(function (f) { return { name: f.name, lang: f.lang, text: getText(f.name), rev: docRev(docs[f.name]) }; });
      peers.set(conn, { conn: conn, id: id, name: name, color: color });
      users[id] = { id: id, name: name, color: color, file: null, a: null, h: null, marks: [] };
      conn.send({ t: 'welcome', id: id, color: color, users: rosterList(), files: files, active: curName() });
      bcast(rosterMsg(), conn);
      toast(name + ' joined the room');
      emit();
      sendCursor();
    }
    function guestGone(conn) {
      var p = peers.get(conn);
      if (!p) return;
      peers.delete(conn);
      if (users[p.id]) { clearMarks(users[p.id]); delete users[p.id]; }
      try { conn.close(); } catch (e) {}
      bcast(rosterMsg());
      toast(p.name + ' left the room');
      emit();
    }
    function sendSums() {
      if (role !== 'host' || !peers.size) return;
      Object.keys(docs).forEach(function (f) { bcast({ t: 'sum', file: f, rev: docRev(docs[f]), hash: hash(getText(f)) }); });
    }

    /* ---- guest side ---- */
    function requestResync(file) {
      var now = Date.now();
      if (role !== 'guest' || (lastResync[file] && now - lastResync[file] < 1500)) return;
      lastResync[file] = now; send({ t: 'resync', file: file });
    }
    function guestRecv(msg) {
      if (!msg || typeof msg !== 'object') return;
      try {
        switch (msg.t) {
          case 'welcome': return onWelcome(msg);
          case 'bye': return endSession('The host closed the room', true);
          case 'roster': {
            var next = {};
            msg.users.forEach(function (x) {
              if (x.id === me.id) return;
              next[x.id] = users[x.id] ? Object.assign(users[x.id], { name: x.name, color: x.color }) : { id: x.id, name: x.name, color: x.color, file: null, a: null, h: null, marks: [] };
            });
            Object.keys(users).forEach(function (k) { if (!next[k]) clearMarks(users[k]); });
            users = next; emit(); return;
          }
          case 'op': {
            var d = docs[msg.file];
            if (!d) return;
            var sp = Op.from(msg.op);
            if (d.out) {
              var t1 = transform(d.out, sp); d.out = t1[0]; sp = t1[1];
              if (d.buf) { var t2 = transform(d.buf, sp); d.buf = t2[0]; sp = t2[1]; }
            }
            d.rev = msg.rev;
            if (sp.base !== curLen(msg.file)) return requestResync(msg.file);
            applyOp(msg.file, sp);
            return;
          }
          case 'ack': {
            var da = docs[msg.file];
            if (!da) return;
            da.rev = msg.rev;
            if (da.buf) { da.out = da.buf; da.buf = null; send({ t: 'op', file: msg.file, rev: da.rev, op: da.out.c }); }
            else da.out = null;
            return;
          }
          case 'cur': {
            var u = users[msg.uid];
            if (!u || typeof msg.a !== 'number' || typeof msg.h !== 'number') return;
            u.file = msg.file; u.a = msg.a; u.h = msg.h; renderUser(u); return;
          }
          case 'sum': {
            var ds = docs[msg.file];
            if (!ds || ds.rev !== msg.rev || ds.out || ds.buf) return;
            if (hash(getText(msg.file)) !== msg.hash) requestResync(msg.file);
            return;
          }
          case 'snap': {
            var dn = docs[msg.file];
            if (!dn || typeof msg.text !== 'string') return;
            dn.out = null; dn.buf = null; dn.rev = msg.rev;
            setText(msg.file, msg.text); renderAll();
            return;
          }
          case 'newfile': {
            if (!msg.name || typeof msg.text !== 'string' || docs[msg.name]) return;
            docs[msg.name] = newDoc();
            guarded(function () { Files.replace(msg.name, msg.text); });
            return;
          }
        }
      } catch (e) { if (msg.file) requestResync(msg.file); }
    }
    function onWelcome(msg) {
      if (!pendingJoin) return;
      me.id = msg.id; me.color = msg.color;
      var names = {};
      msg.files.forEach(function (f) { names[f.name] = 1; docs[f.name] = newDoc(); docs[f.name].rev = f.rev; });
      Files.all().forEach(function (f) { if (!names[f.name]) localOnly[f.name] = 1; });
      guarded(function () { msg.files.forEach(function (f) { Files.replace(f.name, f.text); }); });
      role = 'guest';
      users = {};
      msg.users.forEach(function (x) { if (x.id !== me.id) users[x.id] = { id: x.id, name: x.name, color: x.color, file: null, a: null, h: null, marks: [] }; });
      var pj = pendingJoin; pendingJoin = null; clearTimeout(pj.timer);
      status = 'connected'; error = '';
      emit(); sendCursor();
      pj.resolve(code);
    }

    /* ---- lifecycle ---- */
    function reset() {
      Object.keys(users).forEach(function (k) { clearMarks(users[k]); });
      clearInterval(sumTimer); sumTimer = null; clearTimeout(curT); curT = 0;
      role = null; users = {}; docs = {}; localOnly = {}; peers = new Map(); hostConn = null; hostApi = null; pendingJoin = null; lastResync = {};
    }
    function endSession(reason, silentClose) {
      if (role === 'host') { bcast({ t: 'bye' }); peers.forEach(function (p) { try { p.conn.close(); } catch (e) {} }); if (hostApi) hostApi.close(); }
      else if (hostConn) { if (!silentClose) { try { hostConn.send({ t: 'bye' }); } catch (e) {} } try { hostConn.close(); } catch (e2) {} }
      var had = role || status === 'connecting';
      reset(); code = ''; status = 'idle'; error = '';
      emit();
      if (had && reason) toast(reason);
    }
    function ensureIdle() { if (role || status === 'connecting') throw new Error('You are already in a room. Leave it first.'); }

    var api = {
      host: function (name) {
        ensureIdle();
        me = { id: 'host', name: (name || 'Host').slice(0, 20), color: COLORS[0] };
        setStatus('connecting');
        var attempt = 0;
        function tryHost() {
          code = genCode();
          return tr.host(code).catch(function (e) {
            if (e && e.type === 'unavailable-id' && ++attempt < 4) return tryHost();
            throw e;
          });
        }
        return tryHost().then(function (h) {
          hostApi = h; role = 'host';
          Files.all().forEach(function (f) { docs[f.name] = newDoc(); });
          h.onConnection(function (conn) {
            conn.onData(function (m) { hostRecv(conn, m); });
            conn.onClose(function () { guestGone(conn); });
          });
          sumTimer = setInterval(sendSums, env.sumEvery);
          status = 'connected'; emit();
          return code;
        }, function (e) { reset(); code = ''; setStatus('idle', e.message); throw e; });
      },
      join: function (c, name) {
        ensureIdle();
        c = String(c || '').trim().toLowerCase().replace(/^ce-/, '');
        if (!c) return Promise.reject(new Error('Enter a room code.'));
        me = { id: null, name: (name || 'Guest').slice(0, 20), color: COLORS[1] };
        code = c; setStatus('connecting');
        return tr.join(c).then(function (conn) {
          hostConn = conn;
          conn.onData(guestRecv);
          conn.onClose(function () { if (hostConn === conn && (role === 'guest' || pendingJoin)) endSession('Lost connection to the host', true); });
          return new Promise(function (resolve, reject) {
            pendingJoin = { resolve: resolve, reject: reject, timer: setTimeout(function () { if (pendingJoin) { var pj = pendingJoin; pendingJoin = null; reject(new Error('The host did not respond.')); } }, 8000) };
            conn.send({ t: 'hello', name: me.name });
          });
        }).catch(function (e) {
          if (hostConn) { try { hostConn.close(); } catch (x) {} }
          reset(); code = ''; setStatus('idle', e.message); throw e;
        });
      },
      leave: function () { endSession('You left the room'); },
      state: function () {
        return { role: role, code: code, status: status, error: error, me: { id: me.id, name: me.name, color: me.color },
          users: rosterList().map(function (u) { return { id: u.id, name: u.name, color: u.color }; }),
          link: code ? location.origin + location.pathname + '?room=' + code : '' };
      },
      on: function (f) { listeners.push(f); },
      open: function (opts) { if (ui) ui.open(opts); },
      _docs: docs, _users: function () { return users; }, _syncFiles: syncFileList, _sendSums: sendSums
    };
    Object.defineProperty(api, '_docs', { get: function () { return docs; } });

    /* ---- UI ---- */
    if (env.ui) ui = buildUI(api, env);
    if (env.Tools && env.ui) env.Tools.add('Multiplayer', function () { api.open(); });
    return api;
  }

  /* ------------------------------------------------------------------- UI */
  function buildUI(api, env) {
    var toast = env.toast, store = env.store || { get: function () { return null; }, set: function () {} };
    var esc = env.esc || function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var css = document.createElement('style');
    css.textContent =
      '.cc-pill{position:fixed;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:58;display:flex;gap:8px;align-items:center;background:var(--panel2);color:var(--fg);border:2px solid var(--c3);font:400 10px var(--px);letter-spacing:.08em;padding:9px 12px;cursor:pointer}' +
      '.cc-pill i{width:8px;height:8px;background:var(--ok);display:block;flex:none}.cc-pill[hidden]{display:none}' +
      '.cc-caret{position:relative;display:inline-block;width:0;height:1.25em;vertical-align:text-bottom;border-left:2px solid;margin-left:-1px;pointer-events:none}' +
      '.cc-tag{position:absolute;left:-2px;top:-1.3em;font:700 9px/1 var(--mono);color:#000;padding:2px 4px;white-space:nowrap;z-index:5}' +
      '.cc-box{display:flex;flex-direction:column;gap:12px}.cc-box p{margin:0;font-size:13px;color:var(--muted);line-height:1.5}' +
      '.cc-box label{font:400 10px var(--px);letter-spacing:.1em;color:var(--c3)}' +
      '.cc-box input[type=text]{background:var(--bg);color:var(--fg);border:2px solid var(--line);padding:10px 12px;font:500 14px var(--mono);width:100%}' +
      '.cc-row{display:flex;gap:8px}.cc-row input{flex:1;min-width:0}' +
      '.cc-or{font:400 10px var(--px);color:var(--muted);text-align:center;letter-spacing:.12em}' +
      '.cc-warn{color:var(--c2)!important}.cc-err{color:var(--bad)!important;min-height:1.2em}' +
      '.cc-code{font:700 26px var(--mono);letter-spacing:.2em;color:var(--c1);text-align:center;border:2px dashed var(--line);padding:10px}' +
      '.cc-user{display:flex;align-items:center;gap:10px;border:2px solid var(--line);padding:8px 10px;background:var(--panel2);font-size:13px}' +
      '.cc-user i{width:12px;height:12px;flex:none}.cc-user span{margin-left:auto;color:var(--muted);font:400 9px var(--px)}';
    document.head.appendChild(css);

    var pill = document.createElement('div');
    pill.className = 'cc-pill'; pill.hidden = true; pill.setAttribute('role', 'button'); pill.tabIndex = 0;
    pill.addEventListener('click', function () { open(); });
    pill.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') open(); });
    document.body.appendChild(pill);

    var veil = document.createElement('div');
    veil.className = 'veil'; veil.hidden = true;
    veil.innerHTML = '<div class="modal" role="dialog" aria-label="Multiplayer"><h3>MULTIPLAYER <button class="btn" data-x style="padding:4px 8px">&times;</button></h3><div class="body cc-box"></div></div>';
    document.body.appendChild(veil);
    var body = veil.querySelector('.body');
    veil.addEventListener('mousedown', function (e) { if (e.target === veil) veil.hidden = true; });
    veil.querySelector('[data-x]').onclick = function () { veil.hidden = true; };
    var prefill = '', busy = false, msg = '';

    function myName() { var el = body.querySelector('#ccName'); return (el && el.value.trim()) || store.get('ce-name') || ('Guest ' + (100 + Math.floor(Math.random() * 900))); }
    function setMsg(t) { msg = t || ''; var e = body.querySelector('#ccErr'); if (e) e.textContent = msg; }

    function render() {
      var s = api.state();
      if (s.status === 'connected') {
        var rows = s.users.map(function (u) { return '<div class="cc-user"><i style="background:' + u.color + '"></i>' + esc(u.name) + (u.id === s.me.id ? '<span>YOU</span>' : '') + '</div>'; }).join('');
        body.innerHTML =
          '<label>ROOM CODE</label><div class="cc-code">' + esc(s.code.toUpperCase()) + '</div>' +
          '<label>INVITE LINK</label><div class="cc-row"><input type="text" id="ccLink" readonly value="' + esc(s.link) + '"><button class="btn pri" id="ccCopy">Copy invite link</button></div>' +
          '<label>PEOPLE (' + s.users.length + ')</label>' + rows +
          '<p>' + (s.role === 'host' ? 'You are the host. Everyone you invite can edit all your files while the room is open.' : 'Your files were replaced with the host\'s files.') + '</p>' +
          '<button class="btn" id="ccLeave" style="border-color:var(--bad);color:var(--bad)">Leave room</button>';
        body.querySelector('#ccCopy').onclick = function () {
          var inp = body.querySelector('#ccLink');
          function fallback() { inp.select(); toast('Press Ctrl+C to copy the link'); }
          try { navigator.clipboard.writeText(s.link).then(function () { toast('Invite link copied'); }, fallback); } catch (e) { fallback(); }
        };
        body.querySelector('#ccLeave').onclick = function () { api.leave(); };
      } else {
        body.innerHTML =
          '<p>Code together in real time. Rooms run peer to peer through WebRTC, and anyone with the room code can edit the host\'s files.</p>' +
          '<label for="ccName">YOUR NAME</label><input type="text" id="ccName" maxlength="20" autocomplete="off" placeholder="Display name" value="' + esc(store.get('ce-name') || '') + '">' +
          '<button class="btn pri" id="ccHost"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Connecting...' : 'Start a room') + '</button>' +
          '<div class="cc-or">OR JOIN A ROOM</div>' +
          '<div class="cc-row"><input type="text" id="ccCode" maxlength="8" autocomplete="off" placeholder="Room code" value="' + esc(prefill) + '"><button class="btn" id="ccJoin"' + (busy ? ' disabled' : '') + '>Join</button></div>' +
          '<p class="cc-warn">' + (prefill ? 'You were invited to room ' + esc(prefill.toUpperCase()) + '. ' : '') + 'Joining replaces your current files with the host\'s files.</p>' +
          '<p class="cc-err" id="ccErr">' + esc(msg || s.error || '') + '</p>';
        body.querySelector('#ccHost').onclick = function () { run(function (n) { return api.host(n); }); };
        body.querySelector('#ccJoin').onclick = function () { var c = body.querySelector('#ccCode').value; run(function (n) { return api.join(c, n); }); };
        body.querySelector('#ccCode').addEventListener('keydown', function (e) { if (e.key === 'Enter') body.querySelector('#ccJoin').click(); });
      }
    }
    function run(fn) {
      var n = myName(); store.set('ce-name', n); busy = true; setMsg(''); render();
      fn(n).then(function () { busy = false; prefill = ''; msg = ''; render(); }, function (e) { busy = false; msg = e.message; render(); });
    }
    function open(opts) {
      if (opts && opts.code) prefill = opts.code;
      render(); veil.hidden = false;
      var f = body.querySelector('#ccName'); if (f) setTimeout(function () { f.focus(); }, 30);
    }
    function refresh() {
      var s = api.state();
      pill.hidden = s.status !== 'connected';
      if (!pill.hidden) pill.innerHTML = '<i></i>ROOM ' + esc(s.code.toUpperCase()) + ' &middot; ' + s.users.length + (s.users.length === 1 ? ' PERSON' : ' PEOPLE');
      if (!veil.hidden && !busy) render();
    }
    // invite link: ?room=CODE opens the join dialog asking for a display name
    if (env.autoJoin !== false) {
      var m = /[?&]room=([A-Za-z0-9]{4,10})/.exec(location.search);
      if (m) setTimeout(function () { open({ code: m[1] }); }, 400);
    }
    return { open: open, refresh: refresh };
  }

  window.Collab = { create: create, Op: Op, transform: transform, compose: compose, mapIdx: mapIdx, hash: hash, PeerTransport: PeerTransport };

  // default instance wired to the app globals (cm, Files, Tools, toast, store, esc)
  if (typeof cm !== 'undefined' && typeof Files !== 'undefined') {
    window.collab = create({
      cm: cm, Files: Files, Tools: typeof Tools !== 'undefined' ? Tools : null,
      toast: typeof toast === 'function' ? toast : function () {},
      store: typeof store !== 'undefined' ? store : null, esc: typeof esc === 'function' ? esc : null, ui: true
    });
  }
})();
