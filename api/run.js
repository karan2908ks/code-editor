// Compiles and runs C, C++ and Java through the public Wandbox service.
const MATCH = {
  c: [/^C$/, /^gcc-[\d.]+-c$/],
  cpp: [/^C\+\+$/, /^gcc-[\d.]+$/],
  java: [/^Java$/, /^openjdk-jdk-/],
};
let list = null;
let listAt = 0;

async function compilerFor(kind) {
  if (!list || Date.now() - listAt > 3600e3) {
    const r = await fetch('https://wandbox.org/api/list.json');
    if (!r.ok) throw new Error('Compiler list unavailable');
    list = await r.json();
    listAt = Date.now();
  }
  const [lang, name] = MATCH[kind];
  const c = list
    .filter((x) => lang.test(x.language) && name.test(x.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (!c.length) throw new Error('No compiler found for ' + kind);
  return c[c.length - 1].name;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (!MATCH[b.lang]) return res.status(400).json({ error: 'Unsupported language' });
    const code = String(b.code ?? '');
    if (code.length > 100 * 1024) return res.status(413).json({ error: 'Code is larger than 100 KB' });
    const compiler = await compilerFor(b.lang);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25000);
    const r = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compiler, code, stdin: String(b.stdin ?? '').slice(0, 10000), save: false }),
      signal: ctl.signal,
    }).finally(() => clearTimeout(timer));
    if (!r.ok) return res.status(502).json({ error: 'Compiler service error (' + r.status + ')' });
    const j = await r.json();
    return res.status(200).json({
      compiler_error: j.compiler_error || '',
      program_output: j.program_output || '',
      program_error: j.program_error || '',
      status: j.status || '0',
    });
  } catch (e) {
    return res.status(502).json({ error: e.name === 'AbortError' ? 'Compiler timed out' : 'Compiler service error' });
  }
};
