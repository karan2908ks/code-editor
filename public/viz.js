/* Algorithm Visualizer for Code Editor. Self-contained IIFE: injects its own CSS + modal.
   Needs from app.js: Files.add, Tools.add (and optionally toast). Public API: window.Viz. */
(function () {
'use strict';
const RATE = [1, 2, 4, 8, 15, 30, 60, 120, 240, 480]; // steps per second for speed 1..10
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];       // up, right, down, left (same order in the Python code)
const COLS = 24, ROWS = 14;

const ALGOS = {
  bubble: { name: 'Bubble Sort', kind: 'sort', file: 'bubble_sort.py',
    blurb: 'Bubble Sort compares neighbours and swaps them when they are out of order. The biggest value bubbles to the end each pass.',
    big: [['BEST', 'O(n)'], ['AVERAGE', 'O(n²)'], ['WORST', 'O(n²)'], ['SPACE', 'O(1)']] },
  quick: { name: 'Quick Sort', kind: 'sort', file: 'quick_sort.py',
    blurb: 'Quick Sort picks a pivot, moves smaller values to its left, then sorts each side the same way.',
    big: [['BEST', 'O(n log n)'], ['AVERAGE', 'O(n log n)'], ['WORST', 'O(n²)'], ['SPACE', 'O(log n)']] },
  bfs: { name: 'Breadth-First Search', kind: 'grid', file: 'bfs.py',
    blurb: 'BFS explores the grid layer by layer, so the first time it reaches the end it has found a shortest path. Draw walls, or move Start and End.',
    big: [['TIME', 'O(V + E)'], ['SPACE', 'O(V)'], ['PATH', 'shortest (unweighted)']] },
  dfs: { name: 'Depth-First Search', kind: 'grid', file: 'dfs.py',
    blurb: 'DFS dives down one direction as far as it can before backing up. It finds a path, but not always the shortest one.',
    big: [['TIME', 'O(V + E)'], ['SPACE', 'O(V)'], ['PATH', 'any path']] },
  dijkstra: { name: 'Dijkstra', kind: 'grid', file: 'dijkstra.py',
    blurb: 'Dijkstra always settles the cheapest unvisited cell next. Darker cells cost more to enter (1 to 9).',
    big: [['TIME', 'O(V²) here, O((V+E) log V) with a heap'], ['SPACE', 'O(V)'], ['PATH', 'cheapest']] },
  bst: { name: 'Binary Search Tree', kind: 'tree', file: 'bst.py',
    blurb: 'Each value goes left of a node if it is smaller and right if it is larger. An in-order walk then reads the values in sorted order.',
    big: [['INSERT AVG', 'O(log n)'], ['INSERT WORST', 'O(n)'], ['IN-ORDER', 'O(n)'], ['SPACE', 'O(n)']] }
};

/* ---------------- data ---------------- */
const rnd = n => Math.floor(Math.random() * n);
const randArr = (n = 22) => Array.from({ length: n }, () => 8 + rnd(93));
function randTree(n = 11) { const a = Array.from({ length: 99 }, (_, i) => i + 1); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }
function randWeights(g) { for (let i = 0; i < g.w.length; i++) g.w[i] = 1 + rnd(9); }
function makeGrid() {
  const g = { cols: COLS, rows: ROWS, walls: new Uint8Array(COLS * ROWS), w: new Uint8Array(COLS * ROWS), start: { x: 2, y: 7 }, end: { x: 21, y: 7 } };
  for (let y = 0; y <= 9; y++) g.walls[y * COLS + 9] = 1;
  for (let y = 4; y <= 13; y++) g.walls[y * COLS + 15] = 1;
  randWeights(g); return g;
}
function randMaze(g) {
  g.walls.fill(0);
  for (let i = 0; i < g.walls.length; i++) if (Math.random() < 0.3) g.walls[i] = 1;
  g.walls[g.start.y * g.cols + g.start.x] = 0; g.walls[g.end.y * g.cols + g.end.x] = 0;
}

let sortInit = randArr(), grid = makeGrid(), treeInit = randTree();
let algo = 'bubble', S = null, it = null, steps = 0, done = false, playing = false, desc = '';
let speed = 5, acc = 0, last = 0, raf = 0, isOpen = false, tool = 'wall', cell = 28, cssW = 600, cssH = 300, dpr = 1, prevFocus = null;
let T = {}, FONT_PX = 'monospace', FONT_MONO = 'monospace';

/* ---------------- generators (mutate S, yield a plain-English line) ---------------- */
function* bubbleGen(s) {
  const a = s.arr, n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let sw = false;
    for (let j = 0; j < n - 1 - i; j++) {
      s.cmp++; s.hi = { i: j, j: j + 1, t: 'cmp' };
      yield `Compare ${a[j]} and ${a[j + 1]}: ${a[j] > a[j + 1] ? 'out of order, so swap them' : 'already in order'}`;
      if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; s.swp++; sw = true; s.hi = { i: j, j: j + 1, t: 'swap' }; yield `Swapped: ${a[j]} now sits before ${a[j + 1]}`; }
    }
    s.sorted.add(n - 1 - i); s.hi = null;
    yield `Pass ${i + 1} done: ${a[n - 1 - i]} is in its final place`;
    if (!sw) { yield 'No swaps in this pass, so the rest is already sorted'; break; }
  }
  for (let k = 0; k < n; k++) s.sorted.add(k);
  s.hi = null;
  return `Sorted after ${s.cmp} comparisons and ${s.swp} swaps`;
}
function* quickGen(s) {
  const a = s.arr;
  function* qs(lo, hi) {
    if (lo > hi) return;
    if (lo === hi) { s.sorted.add(lo); return; }
    s.range = [lo, hi]; const p = a[hi]; s.pivot = hi;
    yield `Partition positions ${lo} to ${hi} around pivot ${p}`;
    let i = lo;
    for (let j = lo; j < hi; j++) {
      s.cmp++; s.hi = { i: j, j: hi, t: 'cmp' };
      yield `Compare ${a[j]} with pivot ${p}: ${a[j] < p ? 'smaller, move it left' : 'not smaller, leave it'}`;
      if (a[j] < p) {
        if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; s.swp++; s.hi = { i, j, t: 'swap' }; yield `Swapped ${a[i]} and ${a[j]} to grow the smaller side`; }
        i++;
      }
    }
    if (i !== hi) { [a[i], a[hi]] = [a[hi], a[i]]; s.swp++; s.pivot = i; s.hi = { i, j: hi, t: 'swap' }; yield `Moved pivot ${p} into position ${i}`; }
    s.pivot = -1; s.hi = null; s.sorted.add(i);
    yield `Pivot ${p} is now at its final position ${i}`;
    yield* qs(lo, i - 1);
    yield* qs(i + 1, hi);
  }
  yield* qs(0, a.length - 1);
  for (let k = 0; k < a.length; k++) s.sorted.add(k);
  s.range = null; s.hi = null; s.pivot = -1;
  return `Sorted after ${s.cmp} comparisons and ${s.swp} swaps`;
}
function finishPath(s, parent, end) {
  const path = []; for (let p = end; p !== -1; p = parent[p]) path.push(p);
  path.forEach(p => { s.vis[p] = 3; }); s.pathLen = path.length - 1; return path;
}
function* bfsGen(s) {
  const g = s.g, N = g.cols * g.rows, id = (x, y) => y * g.cols + x, start = id(g.start.x, g.start.y), end = id(g.end.x, g.end.y);
  const parent = new Int32Array(N).fill(-1), seen = new Uint8Array(N), q = [start]; let head = 0;
  seen[start] = 1; s.vis[start] = 2;
  while (head < q.length) {
    const c = q[head++], cx = c % g.cols, cy = (c / g.cols) | 0;
    s.vis[c] = 1; s.visited++;
    if (c === end) { yield `Visit (${cx},${cy}): this is the end cell`; break; }
    for (const [dx, dy] of DIRS) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) continue;
      const n = id(x, y); if (g.walls[n] || seen[n]) continue;
      seen[n] = 1; parent[n] = c; s.vis[n] = 2; q.push(n);
    }
    yield `Visit (${cx},${cy}); ${q.length - head} cell${q.length - head === 1 ? '' : 's'} waiting in the queue`;
  }
  if (!seen[end] || s.vis[end] !== 1) return 'No path exists: walls block every route to the end';
  finishPath(s, parent, end); return `Shortest path found: ${s.pathLen} steps`;
}
function* dfsGen(s) {
  const g = s.g, N = g.cols * g.rows, id = (x, y) => y * g.cols + x, start = id(g.start.x, g.start.y), end = id(g.end.x, g.end.y);
  const parent = new Int32Array(N).fill(-1), seen = new Uint8Array(N), st = [start]; let found = false;
  while (st.length) {
    const c = st.pop(); if (seen[c]) continue;
    const cx = c % g.cols, cy = (c / g.cols) | 0; seen[c] = 1; s.vis[c] = 1; s.visited++;
    if (c === end) { found = true; yield `Visit (${cx},${cy}): this is the end cell`; break; }
    for (const [dx, dy] of DIRS) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) continue;
      const n = id(x, y); if (g.walls[n] || seen[n]) continue;
      parent[n] = c; s.vis[n] = 2; st.push(n);
    }
    yield `Visit (${cx},${cy}); ${st.length} cell${st.length === 1 ? '' : 's'} on the stack`;
  }
  if (!found) return 'No path exists: walls block every route to the end';
  finishPath(s, parent, end); return `Path found with ${s.pathLen} steps (DFS does not promise the shortest)`;
}
function* dijkstraGen(s) {
  const g = s.g, N = g.cols * g.rows, id = (x, y) => y * g.cols + x, start = id(g.start.x, g.start.y), end = id(g.end.x, g.end.y);
  const dist = new Array(N).fill(Infinity), parent = new Int32Array(N).fill(-1), settled = new Uint8Array(N); dist[start] = 0; s.vis[start] = 2; let found = false;
  for (;;) {
    let c = -1, best = Infinity;
    for (let i = 0; i < N; i++) if (!settled[i] && dist[i] < best) { best = dist[i]; c = i; }
    if (c < 0) break;
    settled[c] = 1; s.vis[c] = 1; s.visited++;
    const cx = c % g.cols, cy = (c / g.cols) | 0;
    if (c === end) { found = true; yield `Settle (${cx},${cy}) at total cost ${best}: this is the end cell`; break; }
    for (const [dx, dy] of DIRS) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) continue;
      const n = id(x, y); if (g.walls[n] || settled[n]) continue;
      const nd = best + g.w[n]; if (nd < dist[n]) { dist[n] = nd; parent[n] = c; s.vis[n] = 2; }
    }
    yield `Settle (${cx},${cy}) at total cost ${best}`;
  }
  if (!found) return 'No path exists: walls block every route to the end';
  finishPath(s, parent, end); s.cost = dist[end]; return `Cheapest path found: total cost ${s.cost} over ${s.pathLen} steps`;
}
function* bstGen(s) {
  for (const v of s.pending) {
    s.path = []; s.fresh = null;
    if (!s.root) { s.root = { v, l: null, r: null }; s.count++; s.fresh = s.root; s.path = [s.root]; yield `Insert ${v}: the tree is empty, so ${v} becomes the root`; continue; }
    let n = s.root, left = false;
    for (;;) {
      s.path.push(n); s.focus = n; s.cmp++; left = v < n.v;
      yield `Insert ${v}: ${v} is ${left ? 'smaller' : 'larger'} than ${n.v}, go ${left ? 'left' : 'right'}`;
      const nx = left ? n.l : n.r;
      if (!nx) { const nn = { v, l: null, r: null }; if (left) n.l = nn; else n.r = nn; s.count++; s.fresh = nn; s.focus = nn; s.path.push(nn); break; }
      n = nx;
    }
    yield `Placed ${v} as the ${left ? 'left' : 'right'} child`;
  }
  s.pending = []; s.path = []; s.fresh = null; s.focus = null; s.phase = 'inorder';
  yield 'All values inserted. Now an in-order walk: left subtree, node, right subtree';
  function* walk(n) {
    if (!n) return;
    yield* walk(n.l);
    s.focus = n; s.order.push(n.v); s.seen.add(n); s.visited++;
    yield `Visit ${n.v}; in-order so far: ${s.order.join(', ')}`;
    yield* walk(n.r);
  }
  yield* walk(s.root); s.focus = null;
  return `In-order walk finished: ${s.order.join(', ')} (always sorted)`;
}
const GEN = { bubble: bubbleGen, quick: quickGen, bfs: bfsGen, dfs: dfsGen, dijkstra: dijkstraGen, bst: bstGen };

function newState() {
  const k = ALGOS[algo].kind;
  if (k === 'sort') return { kind: 'sort', arr: sortInit.slice(), init: sortInit, hi: null, pivot: -1, range: null, sorted: new Set(), cmp: 0, swp: 0 };
  if (k === 'grid') return { kind: 'grid', g: grid, weighted: algo === 'dijkstra', vis: new Uint8Array(grid.cols * grid.rows), visited: 0, pathLen: -1, cost: -1 };
  return { kind: 'tree', root: null, pending: treeInit.slice(), init: treeInit, path: [], focus: null, fresh: null, order: [], seen: new Set(), cmp: 0, count: 0, visited: 0, phase: 'insert' };
}

/* ---------------- python code for "Load code" ---------------- */
function pyGridRows() {
  const g = grid, rows = [];
  for (let y = 0; y < g.rows; y++) { let r = ''; for (let x = 0; x < g.cols; x++) r += g.walls[y * g.cols + x] ? '#' : '.'; rows.push('    "' + r + '",'); }
  return rows.join('\n');
}
function pyCostRows() {
  const g = grid, rows = [];
  for (let y = 0; y < g.rows; y++) { const r = []; for (let x = 0; x < g.cols; x++) r.push(g.walls[y * g.cols + x] ? 0 : g.w[y * g.cols + x]); rows.push('    [' + r.join(', ') + '],'); }
  return rows.join('\n');
}
function pyGridHead(body) {
  return `${body.imports || ''}# '#' is a wall, '.' is open. Positions are (x, y).\nGRID = [\n${pyGridRows()}\n]\nSTART = (${grid.start.x}, ${grid.start.y})\nEND = (${grid.end.x}, ${grid.end.y})\nDIRS = [(0, -1), (1, 0), (0, 1), (-1, 0)]  # up, right, down, left\n`;
}
function pyCode(key) {
  const init = (key === 'bst' ? treeInit : sortInit).join(', ');
  if (key === 'bubble') return `def bubble_sort(a):\n    a = list(a)\n    n = len(a)\n    for i in range(n - 1):\n        swapped = False\n        for j in range(n - 1 - i):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n                swapped = True\n        if not swapped:\n            break\n    return a\n\n\ndata = [${init}]\nprint(bubble_sort(data))\n`;
  if (key === 'quick') return `def quick_sort(a, lo=0, hi=None):\n    if hi is None:\n        a = list(a)\n        hi = len(a) - 1\n    if lo < hi:\n        pivot = a[hi]\n        i = lo\n        for j in range(lo, hi):\n            if a[j] < pivot:\n                a[i], a[j] = a[j], a[i]\n                i += 1\n        a[i], a[hi] = a[hi], a[i]\n        quick_sort(a, lo, i - 1)\n        quick_sort(a, i + 1, hi)\n    return a\n\n\ndata = [${init}]\nprint(quick_sort(data))\n`;
  if (key === 'bfs') return pyGridHead({ imports: 'from collections import deque\n\n' }) + `\n\ndef bfs(grid, start, end):\n    rows, cols = len(grid), len(grid[0])\n    parent = {start: None}\n    queue = deque([start])\n    while queue:\n        cur = queue.popleft()\n        if cur == end:\n            break\n        for dx, dy in DIRS:\n            x, y = cur[0] + dx, cur[1] + dy\n            if 0 <= x < cols and 0 <= y < rows and grid[y][x] != "#" and (x, y) not in parent:\n                parent[(x, y)] = cur\n                queue.append((x, y))\n    if end not in parent:\n        return None\n    path = []\n    node = end\n    while node is not None:\n        path.append(node)\n        node = parent[node]\n    return path[::-1]\n\n\npath = bfs(GRID, START, END)\nif path is None:\n    print("No path found")\nelse:\n    print("Shortest path:", len(path) - 1, "steps")\n`;
  if (key === 'dfs') return pyGridHead({}) + `\n\ndef dfs(grid, start, end):\n    rows, cols = len(grid), len(grid[0])\n    parent = {}\n    seen = set()\n    stack = [start]\n    while stack:\n        cur = stack.pop()\n        if cur in seen:\n            continue\n        seen.add(cur)\n        if cur == end:\n            break\n        for dx, dy in DIRS:\n            x, y = cur[0] + dx, cur[1] + dy\n            if 0 <= x < cols and 0 <= y < rows and grid[y][x] != "#" and (x, y) not in seen:\n                parent[(x, y)] = cur\n                stack.append((x, y))\n    if end not in seen:\n        return None\n    path = [end]\n    while path[-1] != start:\n        path.append(parent[path[-1]])\n    return path[::-1]\n\n\npath = dfs(GRID, START, END)\nif path is None:\n    print("No path found")\nelse:\n    print("Path:", len(path) - 1, "steps")\n`;
  if (key === 'dijkstra') return `import heapq\n\n# Cost of entering each cell (1 to 9). 0 is a wall. Positions are (x, y).\nCOST = [\n${pyCostRows()}\n]\nSTART = (${grid.start.x}, ${grid.start.y})\nEND = (${grid.end.x}, ${grid.end.y})\nDIRS = [(0, -1), (1, 0), (0, 1), (-1, 0)]  # up, right, down, left\n\n\ndef dijkstra(cost, start, end):\n    rows, cols = len(cost), len(cost[0])\n    dist = {start: 0}\n    parent = {}\n    done = set()\n    heap = [(0, start)]\n    while heap:\n        d, cur = heapq.heappop(heap)\n        if cur in done:\n            continue\n        done.add(cur)\n        if cur == end:\n            break\n        for dx, dy in DIRS:\n            x, y = cur[0] + dx, cur[1] + dy\n            if 0 <= x < cols and 0 <= y < rows and cost[y][x] != 0:\n                nd = d + cost[y][x]\n                if nd < dist.get((x, y), float("inf")):\n                    dist[(x, y)] = nd\n                    parent[(x, y)] = cur\n                    heapq.heappush(heap, (nd, (x, y)))\n    if end not in done:\n        return None, None\n    path = [end]\n    while path[-1] != start:\n        path.append(parent[path[-1]])\n    return dist[end], path[::-1]\n\n\ntotal, path = dijkstra(COST, START, END)\nif path is None:\n    print("No path found")\nelse:\n    print("Cheapest cost:", total, "over", len(path) - 1, "steps")\n`;
  return `class Node:\n    def __init__(self, value):\n        self.value = value\n        self.left = None\n        self.right = None\n\n\ndef insert(root, value):\n    if root is None:\n        return Node(value)\n    if value < root.value:\n        root.left = insert(root.left, value)\n    else:\n        root.right = insert(root.right, value)\n    return root\n\n\ndef in_order(node, out):\n    if node:\n        in_order(node.left, out)\n        out.append(node.value)\n        in_order(node.right, out)\n    return out\n\n\nroot = None\nfor v in [${init}]:\n    root = insert(root, v)\nprint("In-order:", in_order(root, []))\n`;
}

/* ---------------- DOM ---------------- */
const CSS = `
.modal.vz{width:min(980px,100%);max-height:94vh}
.vz .vzb{gap:10px}
.vz-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.vz-row label{font:400 10px var(--px,monospace);letter-spacing:.1em;color:var(--muted)}
.vz-row select{min-width:0}
.vz-row input[type=range]{accent-color:var(--c1);width:120px;min-width:0}
.vz-row .grow{flex:1}
.vz-tools{display:flex;border:2px solid var(--line)}.vz-tools[hidden]{display:none}
.vz-tools button{border:0;border-right:2px solid var(--line);background:var(--bg);color:var(--fg);font:400 9px var(--px,monospace);letter-spacing:.08em;padding:8px 9px;cursor:pointer;text-transform:uppercase}
.vz-tools button:last-child{border-right:0}
.vz-tools button[aria-pressed="true"]{background:var(--c1);color:var(--on-c1)}
.vz-cvwrap{width:100%;display:block;overflow:hidden}
#vzCv{display:block;margin:0 auto;box-sizing:content-box;max-width:100%;background:var(--panel2);border:2px solid var(--line)}
.vz-desc{margin:0;min-height:3em;font:500 13px/1.5 var(--mono,monospace);color:var(--fg);border-left:4px solid var(--c1);padding:5px 10px;background:var(--panel2)}
.vz-chips{display:flex;flex-wrap:wrap;gap:8px}
.vz-chip{font:400 10px var(--px,monospace);letter-spacing:.06em;border:2px solid var(--line);padding:6px 9px;color:var(--fg);background:var(--bg)}
.vz-chip b{color:var(--c3);font-weight:400;margin-right:6px}
.vz-chip.o b{color:var(--c2)}
.vz-leg{display:flex;flex-wrap:wrap;gap:6px 12px;font:400 9px var(--px,monospace);letter-spacing:.06em;color:var(--muted)}
.vz-leg i{display:inline-block;width:10px;height:10px;margin-right:5px;vertical-align:-1px;border:1px solid var(--line)}
@media(max-width:520px){.vz-row input[type=range]{width:90px}.vz-chip{font-size:9px;padding:5px 7px}}
`;
let veil, cv, ctx, q = {};
function build() {
  const st = document.createElement('style'); st.id = 'vz-style'; st.textContent = CSS; document.head.appendChild(st);
  veil = document.createElement('div'); veil.className = 'veil'; veil.id = 'vzVeil'; veil.hidden = true;
  const opts = Object.keys(ALGOS).map(k => `<option value="${k}">${ALGOS[k].name}</option>`).join('');
  veil.innerHTML = `<div class="modal vz" role="dialog" aria-modal="true" aria-label="Algorithm Visualizer">
  <h3><span>ALGORITHM VISUALIZER</span><button class="btn" id="vzX" type="button" aria-label="Close" style="padding:4px 8px">&times;</button></h3>
  <div class="body vzb">
    <div class="vz-row">
      <label for="vzAlgo">ALGORITHM</label><select id="vzAlgo">${opts}</select>
      <button class="btn pri" id="vzPlay" type="button">&#9654; Play</button>
      <button class="btn" id="vzStep" type="button">Step</button>
      <button class="btn" id="vzReset" type="button">Reset</button>
      <button class="btn" id="vzNew" type="button">New data</button>
      <button class="btn" id="vzMaze" type="button" hidden>Random maze</button>
    </div>
    <div class="vz-row">
      <label for="vzSpeed">SPEED</label><input type="range" id="vzSpeed" min="1" max="10" value="5">
      <div class="vz-tools" id="vzTools" role="group" aria-label="Grid tool" hidden>
        <button type="button" data-t="wall" aria-pressed="true">Wall</button><button type="button" data-t="erase" aria-pressed="false">Erase</button><button type="button" data-t="start" aria-pressed="false">Start</button><button type="button" data-t="end" aria-pressed="false">End</button>
      </div>
      <span class="grow"></span>
      <button class="btn" id="vzLoad" type="button">Load code</button>
    </div>
    <div class="vz-cvwrap"><canvas id="vzCv" role="img" aria-label="Algorithm animation"></canvas></div>
    <div class="vz-leg" id="vzLeg"></div>
    <p class="vz-desc" id="vzDesc" aria-live="polite"></p>
    <div class="vz-chips" id="vzStats"></div>
    <div class="vz-chips" id="vzO"></div>
  </div></div>`;
  document.body.appendChild(veil);
  ['Algo', 'Play', 'Step', 'Reset', 'New', 'Maze', 'Speed', 'Tools', 'Load', 'Desc', 'Stats', 'O', 'Leg', 'X'].forEach(k => { q[k] = veil.querySelector('#vz' + k); });
  cv = veil.querySelector('#vzCv'); ctx = cv.getContext('2d');

  q.Algo.onchange = () => { setAlgo(q.Algo.value); };
  q.Play.onclick = () => togglePlay();
  q.Step.onclick = () => { setPlaying(false); if (done) resetRun(); step(); refresh(); };
  q.Reset.onclick = () => resetRun();
  q.New.onclick = () => newData();
  q.Maze.onclick = () => { randMaze(grid); resetRun(); };
  q.Speed.oninput = () => { speed = +q.Speed.value; };
  q.Load.onclick = () => loadCode();
  q.X.onclick = () => close();
  q.Tools.querySelectorAll('button').forEach(b => { b.onclick = () => { tool = b.dataset.t; q.Tools.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); }; });
  veil.addEventListener('mousedown', e => { if (e.target === veil) close(); });
  veil.addEventListener('keydown', onKey);
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  ['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, () => { painting = false; }));
  window.addEventListener('resize', () => { if (isOpen) { layout(); draw(); } });
  window.addEventListener('modechange', () => { readTokens(); if (isOpen) draw(); });
}

/* ---------------- controls ---------------- */
function setAlgo(k) {
  algo = k; if (q.Algo.value !== k) q.Algo.value = k;
  const kind = ALGOS[k].kind;
  q.Tools.hidden = kind !== 'grid';
  q.Maze.hidden = k !== 'dijkstra';
  q.New.textContent = kind === 'grid' ? (k === 'dijkstra' ? 'New weights' : 'Random maze') : 'New data';
  cv.style.touchAction = kind === 'grid' ? 'none' : 'auto';
  cv.setAttribute('aria-label', ALGOS[k].name + ' animation. Use the Play and Step buttons to control it.');
  resetRun();
}
function newData() {
  const kind = ALGOS[algo].kind;
  if (kind === 'sort') sortInit = randArr();
  else if (kind === 'tree') treeInit = randTree();
  else if (algo === 'dijkstra') randWeights(grid);
  else randMaze(grid);
  resetRun();
}
function resetRun() {
  setPlaying(false); S = newState(); it = GEN[algo](S); steps = 0; done = false; acc = 0;
  desc = ALGOS[algo].blurb; layout(); refresh();
}
function step() {
  if (done) return false;
  const r = it.next(); steps++;
  if (r.done) { done = true; desc = r.value || 'Done'; setPlaying(false); return false; }
  desc = r.value; return true;
}
function setPlaying(p) {
  playing = p; if (q.Play) q.Play.innerHTML = p ? 'Pause' : (done ? '&#9654; Replay' : '&#9654; Play');
  if (p) { last = performance.now(); acc = 0; if (!raf) raf = requestAnimationFrame(loop); }
}
function togglePlay() {
  if (playing) { setPlaying(false); return; }
  if (done) resetRun();
  setPlaying(true);
}
function loop(ts) {
  raf = 0; if (!isOpen) return;
  if (playing) {
    const dt = Math.min(100, ts - last); last = ts; acc += dt / 1000 * RATE[speed - 1];
    let n = 0; while (acc >= 1 && n < 60 && !done) { step(); acc -= 1; n++; }
    refresh(); raf = playing ? requestAnimationFrame(loop) : 0;
  }
}
function loadCode() {
  const code = pyCode(algo), name = ALGOS[algo].file;
  if (window.Files && Files.add) Files.add(name, code);
  if (typeof window.toast === 'function') window.toast('Loaded ' + name);
  close();
}
function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
  const tag = e.target && e.target.tagName;
  if (e.code === 'Space' && tag !== 'BUTTON' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') { e.preventDefault(); togglePlay(); return; }
  if (e.key === 'ArrowRight' && tag !== 'INPUT' && tag !== 'SELECT') { e.preventDefault(); setPlaying(false); step(); refresh(); return; }
  if (e.key === 'Tab') { // keep focus inside the dialog
    const f = [...veil.querySelectorAll('button,select,input,[tabindex]')].filter(x => !x.disabled && !x.hidden && x.offsetParent !== null);
    if (!f.length) return; const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
}

/* ---------------- grid editing ---------------- */
let painting = false, paintVal = 1;
function cellAt(e) {
  const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left - cv.clientLeft) / cell), y = Math.floor((e.clientY - r.top - cv.clientTop) / cell);
  return (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) ? null : { x, y };
}
function paint(c) {
  const g = grid, i = c.y * g.cols + c.x; let ch = false;
  const isS = c.x === g.start.x && c.y === g.start.y, isE = c.x === g.end.x && c.y === g.end.y;
  if (tool === 'wall' || tool === 'erase') { if (!isS && !isE && g.walls[i] !== paintVal) { g.walls[i] = paintVal; ch = true; } }
  else if (tool === 'start') { if (!isE && !g.walls[i] && !isS) { g.start = { x: c.x, y: c.y }; ch = true; } }
  else if (tool === 'end') { if (!isS && !g.walls[i] && !isE) { g.end = { x: c.x, y: c.y }; ch = true; } }
  if (ch) { const was = steps; resetRun(); desc = was ? 'Grid changed, so the run was reset. Press Play to search again.' : desc; refresh(); }
}
function onDown(e) {
  if (S.kind !== 'grid') return; const c = cellAt(e); if (!c) return;
  e.preventDefault(); painting = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  paintVal = tool === 'erase' ? 0 : (grid.walls[c.y * grid.cols + c.x] ? 0 : 1); paint(c);
}
function onMove(e) { if (!painting || S.kind !== 'grid') return; const c = cellAt(e); if (c) paint(c); }

/* ---------------- drawing ---------------- */
function readTokens() {
  const cs = getComputedStyle(document.documentElement), g = n => cs.getPropertyValue(n).trim();
  T = { bg: g('--bg') || '#15122b', panel: g('--panel') || '#1c1840', panel2: g('--panel2') || '#241f52', line: g('--line') || '#3a3380', fg: g('--fg') || '#f3efe6', muted: g('--muted') || '#9d99cc',
    c1: g('--c1') || '#ee6a7c', c2: g('--c2') || '#f7d154', c3: g('--c3') || '#6fdcff', ok: g('--ok') || '#5cf2a0', bad: g('--bad') || '#ff6b8a', warn: g('--warn') || '#f7d154' };
  FONT_PX = g('--px') || 'monospace'; FONT_MONO = g('--mono') || 'monospace';
}
function layout() {
  if (!cv || !S) return;
  const wrap = cv.parentNode, avail = Math.max(200, wrap.clientWidth - 4); dpr = Math.min(2, window.devicePixelRatio || 1);
  if (S.kind === 'grid') { cell = Math.max(10, Math.min(32, Math.floor(avail / grid.cols))); cssW = cell * grid.cols; cssH = cell * grid.rows; }
  else { cssW = avail; cssH = Math.round(S.kind === 'sort' ? Math.min(340, Math.max(220, avail * 0.42)) : Math.min(400, Math.max(280, avail * 0.46))); }
  cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function sw(c) { return `<span><i style="background:${c}"></i>`; }
function legend() {
  const k = S.kind;
  const L = k === 'sort' ? [['--c3', 'unsorted'], ['--c2', 'comparing'], ['--bad', 'swapped'], algo === 'quick' ? ['--c1', 'pivot'] : null, ['--ok', 'sorted']]
    : k === 'grid' ? [['--ok', 'start'], ['--bad', 'end'], ['--fg', 'wall'], ['--c2', 'frontier'], ['--c3', 'visited'], ['--c1', 'path']]
    : [['--c2', 'search path'], ['--c1', 'new node'], ['--ok', 'visited in order']];
  q.Leg.innerHTML = L.filter(Boolean).map(([v, t]) => `<span><i style="background:var(${v})"></i>${t}</span>`).join('');
}
function chip(k, v, cls) { return `<span class="vz-chip ${cls || ''}"><b>${k}</b>${v}</span>`; }
function refresh() {
  if (!veil) return;
  q.Desc.textContent = desc;
  let st = chip('STEPS', steps);
  if (S.kind === 'sort') st += chip('COMPARISONS', S.cmp) + chip('SWAPS', S.swp);
  else if (S.kind === 'grid') st += chip('VISITED', S.visited) + chip(algo === 'dijkstra' ? 'COST' : 'PATH', S.pathLen < 0 ? '-' : (algo === 'dijkstra' ? S.cost + ' (' + S.pathLen + ' steps)' : S.pathLen + ' steps'));
  else st += chip('COMPARISONS', S.cmp) + chip('NODES', S.count);
  q.Stats.innerHTML = st;
  q.O.innerHTML = ALGOS[algo].big.map(([k, v]) => chip(k, v, 'o')).join('');
  q.Play.innerHTML = playing ? 'Pause' : (done ? '&#9654; Replay' : '&#9654; Play');
  legend(); draw();
}
function draw() {
  if (!isOpen || !ctx || !S) return;
  ctx.clearRect(0, 0, cssW, cssH); ctx.fillStyle = T.panel2; ctx.fillRect(0, 0, cssW, cssH);
  if (S.kind === 'sort') drawSort(); else if (S.kind === 'grid') drawGrid(); else drawTree();
}
function drawSort() {
  const s = S, a = s.arr, n = a.length, pad = 12, top = 22, base = cssH - 14, bw = (cssW - pad * 2) / n;
  if (s.range) { ctx.globalAlpha = 0.14; ctx.fillStyle = T.c2; ctx.fillRect(pad + s.range[0] * bw, 4, (s.range[1] - s.range[0] + 1) * bw, base - 2); ctx.globalAlpha = 1; }
  ctx.textAlign = 'center'; ctx.font = `500 ${bw >= 28 ? 11 : 9}px ${FONT_MONO}`;
  for (let i = 0; i < n; i++) {
    const h = Math.max(3, (base - top) * a[i] / 100), x = pad + i * bw;
    let c = T.c3;
    if (s.sorted.has(i)) c = T.ok;
    if (s.pivot === i) c = T.c1;
    if (s.hi && (s.hi.i === i || s.hi.j === i) && s.pivot !== i) c = s.hi.t === 'swap' ? T.bad : T.c2;
    ctx.fillStyle = c; ctx.fillRect(Math.round(x + 1), Math.round(base - h), Math.max(1, Math.round(bw - 2)), Math.round(h));
    if (bw >= 20) { ctx.fillStyle = T.fg; ctx.fillText(a[i], x + bw / 2, base - h - 4); }
  }
  ctx.fillStyle = T.line; ctx.fillRect(pad, base, cssW - pad * 2, 2);
}
function drawGrid() {
  const g = S.g, cs = cell, wt = S.weighted;
  for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
    const i = y * g.cols + x, px = x * cs, py = y * cs; let c = null, a = 1;
    if (g.walls[i]) { c = T.fg; a = 0.9; }
    else if (S.vis[i] === 3) c = T.c1;
    else if (S.vis[i] === 1) { c = T.c3; a = 0.55; }
    else if (S.vis[i] === 2) { c = T.c2; a = 0.7; }
    else if (wt) { c = T.c2; a = 0.04 + 0.34 * (g.w[i] / 9); }
    if (c) { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2); ctx.globalAlpha = 1; }
    if (wt && !g.walls[i] && cs >= 20) { ctx.fillStyle = T.fg; ctx.globalAlpha = 0.75; ctx.font = `500 ${Math.floor(cs * 0.4)}px ${FONT_MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(g.w[i], px + cs / 2, py + cs / 2 + 1); ctx.globalAlpha = 1; }
  }
  ctx.strokeStyle = T.line; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x <= g.cols; x++) { ctx.moveTo(x * cs + .5, 0); ctx.lineTo(x * cs + .5, g.rows * cs); }
  for (let y = 0; y <= g.rows; y++) { ctx.moveTo(0, y * cs + .5); ctx.lineTo(g.cols * cs, y * cs + .5); }
  ctx.stroke(); ctx.globalAlpha = 1;
  [[g.start, T.ok, 'S'], [g.end, T.bad, 'E']].forEach(([p, c, t]) => {
    ctx.fillStyle = c; ctx.fillRect(p.x * cs + 1, p.y * cs + 1, cs - 2, cs - 2);
    ctx.fillStyle = T.bg; ctx.font = `700 ${Math.floor(cs * 0.5)}px ${FONT_PX}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, p.x * cs + cs / 2, p.y * cs + cs / 2 + 1);
  });
  ctx.textBaseline = 'alphabetic';
}
function drawTree() {
  const s = S, pad = 12, sz = cssW < 500 ? 26 : 32;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = `500 11px ${FONT_MONO}`; ctx.fillStyle = T.muted;
  if (s.pending.length) { const idx = s.fresh || s.path.length ? 1 : 0; ctx.fillText('Next: ' + s.pending.slice(0, 12).join(', ') + (s.pending.length > 12 ? ' ...' : ''), pad, 16); void idx; }
  if (!s.root) { ctx.textAlign = 'center'; ctx.fillText('The tree is empty. Press Play to insert values.', cssW / 2, cssH / 2); return; }
  const nodes = []; let idx = 0, maxD = 0;
  (function walk(n, d) { if (!n) return; walk(n.l, d + 1); n._i = idx++; n._d = d; if (d > maxD) maxD = d; nodes.push(n); walk(n.r, d + 1); })(s.root, 0);
  const N = nodes.length, top = 40, gap = Math.min(56, (cssH - top - 34 - sz) / Math.max(1, maxD));
  const X = n => pad + sz / 2 + (cssW - pad * 2 - sz) * (N === 1 ? 0.5 : n._i / (N - 1)), Y = n => top + sz / 2 + n._d * gap;
  const inPath = new Set(s.path);
  ctx.lineWidth = 2;
  nodes.forEach(n => [n.l, n.r].forEach(c => { if (!c) return; const hot = inPath.has(n) && inPath.has(c); ctx.strokeStyle = hot ? T.c2 : T.line; ctx.beginPath(); ctx.moveTo(X(n), Y(n)); ctx.lineTo(X(c), Y(c)); ctx.stroke(); }));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${sz < 30 ? 11 : 12}px ${FONT_MONO}`;
  nodes.forEach(n => {
    let fill = T.panel, txt = T.fg;
    if (s.seen.has(n)) { fill = T.ok; txt = T.bg; }
    if (inPath.has(n)) { fill = T.c2; txt = T.bg; }
    if (n === s.fresh) { fill = T.c1; txt = T.bg; }
    if (n === s.focus && s.phase === 'inorder') { fill = T.c1; txt = T.bg; }
    ctx.fillStyle = fill; ctx.fillRect(X(n) - sz / 2, Y(n) - sz / 2, sz, sz); ctx.strokeStyle = T.fg; ctx.lineWidth = 2; ctx.strokeRect(X(n) - sz / 2 + 1, Y(n) - sz / 2 + 1, sz - 2, sz - 2);
    ctx.fillStyle = txt; ctx.fillText(n.v, X(n), Y(n) + 1);
  });
  if (s.order.length) { ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = `500 11px ${FONT_MONO}`; ctx.fillStyle = T.ok; ctx.fillText('In-order: ' + s.order.join(', '), pad, cssH - 10); }
  ctx.textBaseline = 'alphabetic';
}

/* ---------------- open / close / API ---------------- */
function open(k) {
  if (!veil) build();
  prevFocus = document.activeElement; readTokens(); veil.hidden = false; isOpen = true;
  if (k && ALGOS[k]) algo = k;
  setAlgo(algo); q.Play.focus();
}
function close() {
  if (!veil || !isOpen) return; setPlaying(false); isOpen = false; veil.hidden = true;
  if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (_) {}
}
function runToEnd(max = 100000) { setPlaying(false); let n = 0; while (!done && n++ < max) step(); refresh(); return steps; }

window.Viz = {
  open, close, algorithms: Object.keys(ALGOS), runToEnd,
  select(k) { if (ALGOS[k]) { if (!veil) build(); setAlgo(k); } },
  state() { return S; }, status() { return { algo, steps, done, playing, desc, speed }; },
  code(k) { return pyCode(k || algo); }, grid() { return grid; }, initData() { return { sort: sortInit.slice(), tree: treeInit.slice() }; }
};
if (window.Tools && typeof Tools.add === 'function') Tools.add('Algorithm Visualizer', () => open());
})();
