// Drake's brain. Uses Claude when ANTHROPIC_API_KEY is set; otherwise answers 503 and the page falls back to its built-in rules.
const hits = new Map();
const MODES = {
  explain: 'Explain what this code does, step by step, in plain language for a student. Mention the key idea and any gotchas.',
  debug: 'Find the bugs or errors in this code. If an error message is given, explain its cause. Show the corrected lines.',
  optimize: 'Suggest concrete improvements for readability, speed or memory. Show a short improved version of the most important part.',
  chat: 'Answer the question about the code or programming concisely.',
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'no_key' });
  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
    if (recent.length >= 20) return res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' });
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 2000) hits.clear();

    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const mode = MODES[b.mode] ? b.mode : 'chat';
    const code = String(b.code || '').slice(0, 20000);
    const user = [
      MODES[mode],
      `Language: ${String(b.lang || 'unknown').slice(0, 20)}`,
      b.error ? `Error output:\n${String(b.error).slice(0, 3000)}` : '',
      b.question ? `Question: ${String(b.question).slice(0, 1000)}` : '',
      code ? `Code:\n\`\`\`\n${code}\n\`\`\`` : '',
    ].filter(Boolean).join('\n\n');

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.DRAKE_MODEL || 'claude-sonnet-5-5',
        max_tokens: 900,
        system: 'You are Drake, a friendly pixel-robot coding assistant inside Karan Sharma\'s Code Editor. Be concise (under 200 words), use short paragraphs and small code blocks, and never invent APIs.',
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'AI service error (' + r.status + ')' });
    const j = await r.json();
    const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
    return res.status(200).json({ text: text || 'I have nothing to add.' });
  } catch (e) {
    return res.status(502).json({ error: 'AI service error' });
  }
};
