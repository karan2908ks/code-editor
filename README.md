# Code Editor by Karan Sharma

Browser code editor for C, C++, Java, Python, JavaScript and HTML.
Drake (the pixel AI bot) spots errors and fixes common mistakes. Five themes: dark, light, neon, terminal, zen (pure black).
Snippets are saved to MongoDB.

## How it runs code
- JavaScript, HTML, Python: in the browser (sandboxed iframe, Skulpt).
- C, C++, Java: `api/run.js` sends the code to the public Wandbox compiler. Java classes should be named `Main`.

## Deploy on Vercel
1. Create a free MongoDB Atlas cluster. Under Database Access add a user, under Network Access allow `0.0.0.0/0` (Vercel IPs change).
2. Copy the connection string (`mongodb+srv://...`).
3. Push this folder to GitHub, then in Vercel choose **Add New > Project** and import the repo.
4. In **Settings > Environment Variables** add:
   - `MONGODB_URI` = your connection string
   - `MONGODB_DB` = `codeeditor` (optional)
5. Deploy. Or from this folder: `npm i -g vercel && vercel --prod`.

Without `MONGODB_URI` the app still works. Save falls back to this browser's localStorage.

## Notes
- Snippets belong to an anonymous id stored in the visitor's browser (no login). Clearing site data loses access to them.
  Add real auth (for example NextAuth or Clerk) before storing anything private.
- Drake is rule-based, so it needs no API key. To make it a real LLM, add an `api/drake.js` function that calls your model provider and call it from `drake.js`.
