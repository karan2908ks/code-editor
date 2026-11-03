const { ObjectId } = require('mongodb');
const { getCollection } = require('./_db');

const LANGS = new Set(['c', 'cpp', 'java', 'python', 'js', 'html', 'css', 'text']);
const OWNER_RE = /^[A-Za-z0-9_-]{8,64}$/;
const NAME_RE = /^[\w][\w .\-]{0,59}$/;
const MAX_TOTAL = 300 * 1024;
const MAX_FILES = 20;

// Accepts { files: [{name, code}] } or the older single { code }.
function cleanFiles(b) {
  let files = Array.isArray(b.files) ? b.files : [{ name: 'main', code: b.code }];
  if (!files.length || files.length > MAX_FILES) throw Object.assign(new Error('A project needs 1 to ' + MAX_FILES + ' files'), { status: 400 });
  let total = 0;
  const seen = new Set();
  files = files.map((f) => {
    const name = String((f && f.name) || '').trim();
    const code = String((f && f.code) ?? '');
    if (!NAME_RE.test(name) || seen.has(name)) throw Object.assign(new Error('Invalid or duplicate file name: ' + name), { status: 400 });
    seen.add(name);
    total += code.length;
    return { name, code };
  });
  if (total > MAX_TOTAL) throw Object.assign(new Error('Project is larger than 300 KB'), { status: 413 });
  return files;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET' && req.query.id) {
      // public read of one project by its unguessable id (share links and "open")
      const sid = String(req.query.id);
      if (!ObjectId.isValid(sid)) return res.status(400).json({ error: 'Invalid id' });
      const one = await (await getCollection()).findOne({ _id: new ObjectId(sid) });
      if (!one) return res.status(404).json({ error: 'Not found' });
      const files = one.files || [{ name: 'main', code: one.code || '' }];
      return res.status(200).json({ item: { title: one.title, lang: one.lang, code: one.code, files } });
    }

    const owner = String(req.headers['x-owner'] || '');
    if (!OWNER_RE.test(owner)) return res.status(400).json({ error: 'Missing or invalid owner id' });
    const col = await getCollection();

    if (req.method === 'GET') {
      const docs = await col.find({ owner }, { projection: { title: 1, lang: 1, updatedAt: 1, files: 1 } }).sort({ updatedAt: -1 }).limit(100).toArray();
      return res.status(200).json({
        items: docs.map((d) => ({ id: String(d._id), title: d.title, lang: d.lang, updatedAt: d.updatedAt, fileCount: d.files ? d.files.length : 1 })),
      });
    }

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const title = String(b.title || '').trim().slice(0, 80) || 'Untitled';
      if (!LANGS.has(b.lang)) return res.status(400).json({ error: 'Unknown language' });
      const files = cleanFiles(b);
      const code = String((files.find((f) => f.name === b.activeName) || files[0]).code).slice(0, 4000);
      const now = new Date();
      if (b.id && ObjectId.isValid(b.id)) {
        const r = await col.updateOne({ _id: new ObjectId(b.id), owner }, { $set: { title, lang: b.lang, code, files, updatedAt: now } });
        if (r.matchedCount) return res.status(200).json({ id: String(b.id) });
      }
      if ((await col.countDocuments({ owner })) >= 200) return res.status(429).json({ error: 'Limit of 200 projects reached' });
      const r = await col.insertOne({ owner, title, lang: b.lang, code, files, createdAt: now, updatedAt: now });
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
    const status = e.status || 500;
    return res.status(status).json({ error: status === 500 ? 'Database error' : e.message });
  }
};
