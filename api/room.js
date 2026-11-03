// Real-time collaboration without WebSockets: clients poll this endpoint about once a second.
// Edits arrive as diff-match-patch patches and are merged on the server, so two people can type at once.
const DiffMatchPatch = require('diff-match-patch');
const { getCollection } = require('./_db');

const dmp = new DiffMatchPatch();
const ID_RE = /^[A-Z2-9]{6}$/;
const NAME_RE = /^[\w][\w .\-]{0,59}$/;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PRESENCE_MS = 12000;

const newId = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
const fail = (status, message) => Object.assign(new Error(message), { status });

function cleanUser(u) {
  u = u || {};
  return {
    id: String(u.id || '').slice(0, 40).replace(/[^\w-]/g, ''),
    name: String(u.name || 'Guest').slice(0, 24),
    color: /^#[0-9a-fA-F]{6}$/.test(u.color) ? u.color : '#6fdcff',
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const col = await getCollection('rooms');
    const now = Date.now();

    if (b.action === 'create') {
      const files = (Array.isArray(b.files) ? b.files : []).slice(0, 20).filter((f) => f && NAME_RE.test(f.name)).map((f) => ({ name: f.name, code: String(f.code ?? '').slice(0, 100000) }));
      if (!files.length) throw fail(400, 'No files to share');
      for (let i = 0; i < 5; i++) {
        const id = newId();
        try {
          await col.insertOne({ _id: id, files, version: 1, presence: {}, updatedAt: new Date() });
          return res.status(201).json({ room: id, version: 1 });
        } catch (e) { if (i === 4) throw e; }
      }
    }

    if (b.action === 'sync') {
      const id = String(b.room || '').toUpperCase();
      if (!ID_RE.test(id)) throw fail(400, 'Invalid room code');
      const room = await col.findOne({ _id: id });
      if (!room) throw fail(404, 'Room not found or expired');
      const user = cleanUser(b.user);
      if (!user.id) throw fail(400, 'Missing user id');

      let files = room.files;
      let changed = false;
      for (const e of Array.isArray(b.edits) ? b.edits.slice(0, 20) : []) {
        if (!e || !NAME_RE.test(e.name)) continue;
        let f = files.find((x) => x.name === e.name);
        if (!f) { if (files.length >= 20) continue; f = { name: e.name, code: '' }; files.push(f); changed = true; }
        if (typeof e.patch === 'string' && e.patch.length < 200000) {
          const [text, ok] = dmp.patch_apply(dmp.patch_fromText(e.patch), f.code);
          if (ok.some(Boolean) && text.length < 300000 && text !== f.code) { f.code = text; changed = true; }
        }
      }
      for (const name of Array.isArray(b.removed) ? b.removed.slice(0, 20) : []) {
        if (files.length > 1 && files.some((x) => x.name === name)) { files = files.filter((x) => x.name !== name); changed = true; }
      }
      const presence = room.presence || {};
      presence[user.id] = { name: user.name, color: user.color, file: String(b.file || '').slice(0, 60), line: Math.max(0, Math.min(1e5, +b.line || 0)), t: now };
      for (const k of Object.keys(presence)) if (now - presence[k].t > PRESENCE_MS * 3) delete presence[k];
      const version = room.version + (changed ? 1 : 0);
      await col.updateOne({ _id: id }, { $set: { files, presence, version, updatedAt: new Date() } });

      const live = Object.entries(presence).filter(([, p]) => now - p.t < PRESENCE_MS).map(([uid, p]) => ({ id: uid, name: p.name, color: p.color, file: p.file, line: p.line }));
      const out = { version, users: live };
      if (changed || +b.version !== version) out.files = files;
      return res.status(200).json(out);
    }
    throw fail(400, 'Unknown action');
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: status === 500 ? 'Database error' : e.message });
  }
};
