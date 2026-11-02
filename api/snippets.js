const { ObjectId } = require('mongodb');
const { getCollection } = require('./_db');

const LANGS = new Set(['c', 'cpp', 'java', 'python', 'js', 'html']);
const OWNER_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_CODE = 100 * 1024;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET' && req.query.id) {
      // public read of one snippet by its unguessable id (used by share links)
      const sid = String(req.query.id);
      if (!ObjectId.isValid(sid)) return res.status(400).json({ error: 'Invalid id' });
      const one = await (await getCollection()).findOne({ _id: new ObjectId(sid) });
      if (!one) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ item: { title: one.title, lang: one.lang, code: one.code } });
    }
    const owner = String(req.headers['x-owner'] || '');
    if (!OWNER_RE.test(owner)) return res.status(400).json({ error: 'Missing or invalid owner id' });
    const col = await getCollection();

    if (req.method === 'GET') {
      const docs = await col.find({ owner }).sort({ updatedAt: -1 }).limit(100).toArray();
      return res.status(200).json({
        items: docs.map((d) => ({ id: String(d._id), title: d.title, lang: d.lang, code: d.code, updatedAt: d.updatedAt })),
      });
    }

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const title = String(b.title || '').trim().slice(0, 80) || 'Untitled';
      const code = String(b.code ?? '');
      if (!LANGS.has(b.lang)) return res.status(400).json({ error: 'Unknown language' });
      if (code.length > MAX_CODE) return res.status(413).json({ error: 'Code is larger than 100 KB' });
      const now = new Date();
      if (b.id && ObjectId.isValid(b.id)) {
        const r = await col.updateOne({ _id: new ObjectId(b.id), owner }, { $set: { title, lang: b.lang, code, updatedAt: now } });
        if (r.matchedCount) return res.status(200).json({ id: String(b.id) });
      }
      if ((await col.countDocuments({ owner })) >= 200) return res.status(429).json({ error: 'Limit of 200 snippets reached' });
      const r = await col.insertOne({ owner, title, lang: b.lang, code, createdAt: now, updatedAt: now });
      return res.status(201).json({ id: String(r.insertedId) });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });
      await col.deleteOne({ _id: new ObjectId(id), owner });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.status === 503 ? e.message : 'Database error' });
  }
};
