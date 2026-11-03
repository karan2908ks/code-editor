# Arcode by Karan Sharma

A multi-file browser code editor for C, C++, Java, Python, JavaScript, HTML and CSS, with a pixel-art look that matches [my portfolio](https://karanportfolio-ashen.vercel.app/), an AI bot called **Drake**, and a playable game in the footer.

## Features

**Editor**
- Multi-file projects with tabs, rename (double-click or F2), autosaved drafts, font size A-/A+, download, run time and status bar.
- Output, Terminal (with stdin), Problems and live HTML Preview tabs.
- Save to MongoDB, My codes, and **Share** (`/?s=<id>` link).
- **Focus mode** (button or Alt+Z) pauses every animation so you can code in peace. It is remembered.
- Algorithm Visualizer, GitHub (import, push, gist) and Live code (peer to peer rooms) from the menu bar.

**Six themes** (button in the header). Each one restyles the whole interface: editor, output, terminal, dialogs and the footer scene.
Pixel Dark, Pixel Light (daytime footer with a sun), Neon, Cyberpunk, Dracula, Zen Black (pure black with jade, amber and violet).

**Drake, the pixel AI bot** (bottom right)
- Click it to open a chat panel. Buttons: EXPLAIN, DEBUG, OPTIMIZE, FIX.
- **Explain** walks through your code line by line. **Debug** reads the last run's error, explains it and points at the line. **Fix** applies safe automatic fixes.
- **Navigates**: say "go to skills", "open projects", "show contact" and it opens that section of the portfolio. Chips in the panel do the same. Say "go to output", "go to terminal" and so on to move around the editor.
- **Moods** change with what is happening: idle, thinking, happy (run passed), sad (run failed), wink, sleep (no activity) and wow (when you start the game or squash a mob). The panel header shows the current mood.
- Works offline with rules. Add `ANTHROPIC_API_KEY` and Explain, Debug and Optimize are answered by a real model (badge shows AI instead of RULES).

**Footer game** (click the little character, or press Enter on the footer)
- Platformer with 3 levels (ABOUT, SKILLS, WORK) built from the portfolio sections, with coins, skeleton and creeper mobs to stomp, a flag to reach and a level-clear card.
- Collect 5 coins in total to unlock the GitHub link. Progress (coins, best, mobs slain) is saved in the browser.
- Controls: A/D or arrows to move, W or Space to jump, Esc to quit, M to mute. On phones, on-screen buttons appear.
- Easter eggs: click a torch, the spider, a coin, or type `drake`. Drag anywhere to draw, and the strokes fade out.
- Disabled while Focus mode is on.

## How it runs code
- JavaScript, HTML, CSS and Python run in the browser (sandboxed iframe, Skulpt).
- C, C++ and Java go through `api/run.js` to the public Wandbox compiler. Name the Java class `Main`.

## Deploy on Vercel
1. Create a free MongoDB Atlas cluster. Under Database Access add a user. Under Network Access allow `0.0.0.0/0` (Vercel IPs change).
2. Copy the connection string (`mongodb+srv://...`).
3. Push this folder to GitHub, then in Vercel choose **Add New > Project** and import the repo.
4. In **Settings > Environment Variables** add:
   - `MONGODB_URI` = your connection string
   - `MONGODB_DB` = `codeeditor` (optional)
   - `ANTHROPIC_API_KEY` = your key (optional, turns Drake into a real AI)
   - `DRAKE_MODEL` = model name (optional)
5. Deploy. Or from this folder: `npm i -g vercel && vercel --prod`.

Without `MONGODB_URI` the app still works. Save falls back to this browser's localStorage and Share is disabled.
Never commit `.env` files or your connection string.

## Notes
- Snippets belong to an anonymous id stored in the visitor's browser (no login). Clearing site data loses access to them. Add real auth before storing anything private.
- Live code uses WebRTC through a public PeerJS broker, so rooms can fail behind strict firewalls.
- The GitHub tool keeps your personal access token in this browser only (session storage unless you tick remember). Use a fine-grained token with the least access you need.
