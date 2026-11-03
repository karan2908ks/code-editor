/* GitHub integration for Arcode. Browser-only: talks to api.github.com with the user's own token.
   Needs (from app.js): toast, Files {add,current,all}, Tools {add}. Public API: window.GitHubModule {open, close, isConnected, disconnect}. */
(function(){
'use strict';
if(window.GitHubModule)return;
const API='https://api.github.com',TK='ce-gh-token';
const X=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tell=m=>{try{toast(m)}catch(e){}};
let token='',user=null,repoInfo=null,repos=[],repoPage=0,repoMore=false,tree=[],rate=null,histPage=0,tab='import';

/* ---------- storage: sessionStorage by default, localStorage when "remember" ---------- */
function readTok(){try{const s=sessionStorage.getItem(TK);if(s)return s}catch(e){}try{return localStorage.getItem(TK)||''}catch(e){return ''}}
function saveTok(t,remember){clearTok();try{(remember?localStorage:sessionStorage).setItem(TK,t)}catch(e){try{sessionStorage.setItem(TK,t)}catch(_){}}}
function remembered(){try{return !!localStorage.getItem(TK)}catch(e){return false}}
function clearTok(){try{sessionStorage.removeItem(TK)}catch(e){}try{localStorage.removeItem(TK)}catch(e){}}

/* ---------- base64 (UTF-8 safe) ---------- */
function b64enc(str){const b=new TextEncoder().encode(str);let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s)}
function b64dec(b64){const bin=atob(String(b64).replace(/\s/g,'')),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new TextDecoder('utf-8').decode(u)}
const encPath=p=>p.split('/').map(encodeURIComponent).join('/');

/* ---------- API ---------- */
class GhErr extends Error{constructor(m,s){super(m);this.status=s}}
async function gh(path,o){
  o=o||{};const h={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  if(token)h.Authorization='Bearer '+token;if(o.body)h['Content-Type']='application/json';
  let r;try{r=await fetch(path.startsWith('http')?path:API+path,{method:o.method||'GET',headers:h,body:o.body?JSON.stringify(o.body):undefined})}
  catch(e){throw new GhErr('Network error. Check your connection, or a blocker that stops api.github.com.',0)}
  const rem=r.headers.get('x-ratelimit-remaining');
  if(rem!=null){rate={left:+rem,reset:+(r.headers.get('x-ratelimit-reset')||0)};showRate()}
  if(r.ok)return r.status===204?null:r.json();
  let b={};try{b=await r.json()}catch(e){}const msg=b&&b.message?b.message:'';
  if(r.status===401)throw new GhErr('GitHub rejected the token (wrong or expired). Disconnect and connect again.',401);
  if(r.status===403||r.status===429){
    if(rem==='0'||/rate limit/i.test(msg)){const t=rate&&rate.reset?new Date(rate.reset*1000).toLocaleTimeString():'later';
      throw new GhErr('GitHub rate limit reached. It resets at '+t+'.'+(token?'':' Connect a token to get 5,000 requests per hour.'),403)}
    throw new GhErr('GitHub refused: '+(msg||'permission denied')+'. The token needs Contents read/write (and Gists for gists) on this repo.',403)}
  if(r.status===404)throw new GhErr('Not found. Check the name, or the token cannot see this private repo.',404);
  if(r.status===409)throw new GhErr('Conflict: '+(msg||'the file changed on GitHub')+'. Reload and try again.',409);
  if(r.status===422)throw new GhErr('GitHub rejected it: '+(msg||'invalid data'),422);
  throw new GhErr('GitHub error '+r.status+(msg?': '+msg:''),r.status);
}
const cUrl=(repo,path,ref)=>`/repos/${repo}/contents/${encPath(path)}`+(ref?'?ref='+encodeURIComponent(ref):'');
async function getFile(repo,path,ref){
  const j=await gh(cUrl(repo,path,ref));
  if(Array.isArray(j))throw new GhErr('That path is a folder, not a file.',0);
  let text;
  if(j.encoding==='base64'&&(j.content||j.size===0))text=b64dec(j.content||'');
  else{const b=await gh(`/repos/${repo}/git/blobs/${j.sha}`);text=b64dec(b.content)}
  if(text.indexOf('\u0000')>=0)throw new GhErr('This looks like a binary file, so it cannot be opened in the editor.',0);
  return{text,sha:j.sha};
}
function parseRepo(s){s=String(s||'').trim().replace(/^https?:\/\/(www\.)?github\.com\//i,'').replace(/\.git$/i,'').replace(/\/+$/,'');
  const m=/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/.exec(s);return m?m[1]+'/'+m[2]:null}

/* ---------- DOM ---------- */
const css=document.createElement('style');
css.textContent=`
.gh-veil{position:fixed;inset:0;z-index:75;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,3,15,.7)}
.gh-veil[hidden]{display:none}
.gh-modal{background:var(--panel);color:var(--fg);border:3px solid var(--fg);box-shadow:8px 8px 0 var(--c3);width:min(760px,100%);max-height:min(88vh,860px);display:flex;flex-direction:column;font-family:var(--mono);font-size:13px;min-width:0}
.gh-modal h3{margin:0;padding:12px 16px;border-bottom:2px solid var(--line);font:400 12px var(--px,monospace);color:var(--c2);letter-spacing:.1em;display:flex;justify-content:space-between;align-items:center;flex:none}
.gh-body{padding:14px 16px;overflow:auto;display:flex;flex-direction:column;gap:12px;min-width:0}
.gh-acct{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border:2px solid var(--line);background:var(--panel2);padding:10px 12px}
.gh-acct img{width:34px;height:34px;border:2px solid var(--fg);image-rendering:auto}
.gh-acct .grow{flex:1;min-width:160px}
.gh-modal input[type=text],.gh-modal input[type=password],.gh-modal input:not([type]){background:var(--bg);color:var(--fg);border:2px solid var(--line);padding:8px 10px;font:500 13px var(--mono);width:100%;min-width:0}
.gh-modal input:focus-visible,.gh-modal button:focus-visible{outline:2px solid var(--c3);outline-offset:2px}
.gh-modal label{display:flex;flex-direction:column;gap:4px;font:400 9px var(--px,monospace);letter-spacing:.08em;color:var(--muted);text-transform:uppercase;min-width:0}
.gh-modal label.chk{flex-direction:row;align-items:center;gap:8px;text-transform:none;font:500 12px var(--mono);letter-spacing:0;color:var(--fg)}
.gh-modal label.chk input{width:auto}
.gh-row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.gh-row>label{flex:1;min-width:140px}
.gh-tabs{display:flex;border:2px solid var(--line);flex:none}
.gh-tabs button{flex:1;border:0;border-right:2px solid var(--line);background:var(--panel2);color:var(--muted);font:400 10px var(--px,monospace);letter-spacing:.08em;padding:10px 4px;cursor:pointer;text-transform:uppercase}
.gh-tabs button:last-child{border-right:0}
.gh-tabs button[aria-selected=true]{background:var(--panel);color:var(--c2)}
.gh-note{color:var(--muted);font-size:12px;line-height:1.5}
.gh-msg{font-size:12px;line-height:1.5;min-height:1em;word-break:break-word}
.gh-msg.bad{color:var(--bad)}.gh-msg.ok{color:var(--ok)}.gh-msg a{color:var(--c3)}
.gh-list{border:2px solid var(--line);max-height:240px;overflow:auto;background:var(--bg)}
.gh-item{display:flex;gap:10px;align-items:center;justify-content:space-between;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--fg);padding:8px 10px;font:500 12px var(--mono);cursor:pointer}
.gh-item:last-child{border-bottom:0}.gh-item:hover{background:var(--panel2)}
.gh-item b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.gh-item small{color:var(--muted);flex:none}
.gh-commit{padding:8px 10px;border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:center;justify-content:space-between}
.gh-commit:last-child{border-bottom:0}.gh-commit div{min-width:0}
.gh-commit b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh-commit small{color:var(--muted)}.gh-commit a{color:var(--c3)}
.gh-grp{display:flex;gap:14px;flex-wrap:wrap}
.gh-foot{font:400 9px var(--px,monospace);letter-spacing:.06em;color:var(--muted);padding:8px 16px;border-top:2px solid var(--line);flex:none}
@media(max-width:480px){.gh-modal{box-shadow:5px 5px 0 var(--c3)}.gh-row>label{min-width:100%}}
`;
document.head.appendChild(css);

const root=document.createElement('div');root.className='veil gh-veil';root.hidden=true;
root.innerHTML=`<div class="gh-modal" role="dialog" aria-label="GitHub">
<h3>GITHUB <button class="btn" data-a="close" style="padding:4px 8px" aria-label="Close">&times;</button></h3>
<div class="gh-body">
  <div class="gh-acct" id="ghAcct"></div>
  <div class="gh-tabs" role="tablist">
    <button role="tab" data-tab="import" aria-selected="true">Import</button><button role="tab" data-tab="push" aria-selected="false">Push</button>
    <button role="tab" data-tab="history" aria-selected="false">History</button><button role="tab" data-tab="gist" aria-selected="false">Gist</button>
  </div>
  <div id="ghRepoBar">
    <div class="gh-row">
      <label>Repository<input id="ghRepo" list="ghRepoList" placeholder="owner/repo" autocomplete="off" spellcheck="false"></label>
      <label style="max-width:200px">Branch<input id="ghBranch" placeholder="default" autocomplete="off" spellcheck="false"></label>
      <button class="btn" data-a="load">Load</button>
    </div>
    <datalist id="ghRepoList"></datalist>
    <div class="gh-note" id="ghInfo" style="margin-top:6px"></div>
  </div>

  <div data-pane="import">
    <div id="ghMine"></div>
    <div id="ghTreeBox" hidden>
      <label>Files in this repo<input id="ghFilter" placeholder="Filter by path, e.g. src or .py" autocomplete="off"></label>
      <div class="gh-list" id="ghTree" style="margin-top:8px"></div>
    </div>
  </div>

  <div data-pane="push" hidden>
    <div class="gh-grp">
      <label class="chk"><input type="radio" name="ghScope" value="cur" checked> Current file</label>
      <label class="chk"><input type="radio" name="ghScope" value="all"> All open files</label>
    </div>
    <div class="gh-row" style="margin-top:10px">
      <label id="ghPathL">Path in repo<input id="ghPath" placeholder="main.py" autocomplete="off" spellcheck="false"></label>
      <label id="ghDirL" hidden>Folder (optional)<input id="ghDir" placeholder="src" autocomplete="off" spellcheck="false"></label>
    </div>
    <label style="margin-top:10px">Commit message<input id="ghMsg" placeholder="Update from Arcode" autocomplete="off"></label>
    <div style="margin-top:10px"><button class="btn pri" data-a="push">Commit &amp; push</button></div>
    <div class="gh-msg" id="ghPushOut" style="margin-top:8px"></div>
  </div>

  <div data-pane="history" hidden>
    <div class="gh-row">
      <label>Path filter<input id="ghHPath" placeholder="main.py (empty = all commits)" autocomplete="off" spellcheck="false"></label>
      <button class="btn" data-a="hist">Load commits</button>
    </div>
    <div class="gh-list" id="ghHist" style="margin-top:10px" hidden></div>
    <div class="gh-msg" id="ghHistOut" style="margin-top:8px"></div>
    <button class="btn" data-a="histmore" id="ghHistMore" style="margin-top:8px" hidden>Load more</button>
  </div>

  <div data-pane="gist" hidden>
    <div class="gh-grp">
      <label class="chk"><input type="radio" name="ghGScope" value="cur" checked> Current file</label>
      <label class="chk"><input type="radio" name="ghGScope" value="all"> All open files</label>
    </div>
    <label style="margin-top:10px">Description<input id="ghGDesc" placeholder="Shared from Arcode" autocomplete="off"></label>
    <div class="gh-grp" style="margin-top:10px">
      <label class="chk"><input type="radio" name="ghVis" value="secret" checked> Secret (anyone with the link)</label>
      <label class="chk"><input type="radio" name="ghVis" value="public"> Public</label>
    </div>
    <div style="margin-top:10px"><button class="btn pri" data-a="gist">Create gist</button></div>
    <div class="gh-msg" id="ghGistOut" style="margin-top:8px"></div>
  </div>
  <div class="gh-msg" id="ghMsgBox"></div>
</div>
<div class="gh-foot" id="ghRate">YOUR TOKEN STAYS IN THIS BROWSER AND IS ONLY SENT TO API.GITHUB.COM</div>
</div>`;
document.body.appendChild(root);
const Q=s=>root.querySelector(s),QA=s=>[...root.querySelectorAll(s)];
const val=id=>(Q('#'+id).value||'').trim();
function say(el,html,cls){const e=typeof el==='string'?Q(el):el;e.className='gh-msg'+(cls?' '+cls:'');e.innerHTML=html}
function busy(btn,on,label){if(!btn)return;if(on){btn.dataset.l=btn.textContent;btn.textContent=label||'Working...';btn.disabled=true}else{btn.textContent=btn.dataset.l||btn.textContent;btn.disabled=false}}
function showRate(){if(!rate)return;const t=rate.reset?new Date(rate.reset*1000).toLocaleTimeString():'';Q('#ghRate').textContent=`GITHUB API: ${rate.left} REQUESTS LEFT THIS HOUR`+(t?` (RESETS ${t.toUpperCase()})`:'')}

/* ---------- account ---------- */
function renderAcct(){
  const a=Q('#ghAcct');
  if(token&&user){
    a.innerHTML=`<img src="${X(user.avatar_url)}" alt=""><div class="grow"><b>@${X(user.login)}</b><div class="gh-note">Connected. Token kept in ${remembered()?'this device':'this tab only'}.</div></div><button class="btn" data-a="disc">Disconnect</button>`;
  }else if(token){a.innerHTML='<div class="grow gh-note">Checking token...</div>'}
  else{a.innerHTML=`<div class="grow"><label>Personal access token (optional for public repos)<input type="password" id="ghTok" placeholder="github_pat_..." autocomplete="off" spellcheck="false"></label>
    <div class="gh-note" style="margin-top:6px">Create a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener" style="color:var(--c3)">fine-grained token</a> with Contents: read and write, and Gists if you want gists. It never leaves your browser except in requests to api.github.com.</div>
    <label class="chk" style="margin-top:8px"><input type="checkbox" id="ghRem"> Remember on this device</label></div>
    <button class="btn pri" data-a="conn">Connect</button>`}
}
async function verify(){
  try{user=await gh('/user')}catch(e){
    if(e.status===401){clearTok();token='';user=null;renderAcct();say('#ghMsgBox',X(e.message),'bad');return false}
    say('#ghMsgBox',X(e.message),'bad');return false}
  renderAcct();return true;
}
async function connect(btn){
  const t=val('ghTok');if(!t||/\s/.test(t)){say('#ghMsgBox','Paste your token first (no spaces).','bad');return}
  busy(btn,true,'Checking...');token=t;user=null;const rem=Q('#ghRem').checked;
  try{user=await gh('/user');saveTok(t,rem);renderAcct();say('#ghMsgBox','Connected as @'+X(user.login)+'.','ok');tell('GitHub connected');loadRepos(true)}
  catch(e){token='';user=null;say('#ghMsgBox',X(e.message),'bad');busy(btn,false)}
}
function disconnect(){clearTok();token='';user=null;repos=[];repoInfo=null;tree=[];renderAcct();renderMine();Q('#ghTreeBox').hidden=true;Q('#ghInfo').textContent='';say('#ghMsgBox','Disconnected. The token was removed from this browser.','ok')}

/* ---------- repos + tree (Import) ---------- */
async function loadRepos(reset){
  if(!token)return;if(reset){repos=[];repoPage=0;repoMore=false}
  const box=Q('#ghMine');if(!repos.length)box.innerHTML='<div class="gh-note">Loading your repositories...</div>';
  try{
    const page=repoPage+1,list=await gh(`/user/repos?per_page=100&sort=pushed&page=${page}`);
    repoPage=page;repoMore=list.length===100;repos=repos.concat(list);
    Q('#ghRepoList').innerHTML=repos.map(r=>`<option value="${X(r.full_name)}"></option>`).join('');
    renderMine();
  }catch(e){box.innerHTML='';say('#ghMsgBox',X(e.message),'bad')}
}
function renderMine(){
  const box=Q('#ghMine');
  if(!token){box.innerHTML='<div class="gh-note">Not connected. You can still import from any public repo: type <b>owner/repo</b> above and press Load. Connect a token to list your own and private repos.</div>';return}
  const f=(Q('#ghRFilter')&&Q('#ghRFilter').value||'').toLowerCase();
  const rows=repos.filter(r=>r.full_name.toLowerCase().includes(f));
  box.innerHTML=`<label>Your repositories<input id="ghRFilter" placeholder="Search ${repos.length} repos" value="${X(f)}" autocomplete="off"></label>
   <div class="gh-list" style="margin-top:8px">${rows.length?rows.map(r=>`<button class="gh-item" data-repo="${X(r.full_name)}"><b>${X(r.full_name)}</b><small>${r.private?'private':'public'}</small></button>`).join(''):'<div class="gh-note" style="padding:10px">No repositories match.</div>'}</div>
   ${repoMore?'<button class="btn" data-a="morerepos" style="margin-top:8px">Load more repositories</button>':''}`;
  const i=Q('#ghRFilter');i.oninput=()=>{const p=i.selectionStart;renderMine();const n=Q('#ghRFilter');n.focus();try{n.setSelectionRange(p,p)}catch(e){}};
}
async function loadRepo(){
  const rp=parseRepo(val('ghRepo'));if(!rp){say('#ghMsgBox','Type the repository as owner/repo.','bad');return null}
  try{
    repoInfo=await gh('/repos/'+rp);Q('#ghRepo').value=repoInfo.full_name;
    if(!val('ghBranch'))Q('#ghBranch').value=repoInfo.default_branch;
    const w=repoInfo.permissions&&repoInfo.permissions.push===false?' You cannot push here with this token.':'';
    Q('#ghInfo').textContent=`${repoInfo.private?'Private':'Public'} repo, default branch ${repoInfo.default_branch}.${w}`;
    say('#ghMsgBox','');return repoInfo;
  }catch(e){repoInfo=null;Q('#ghInfo').textContent='';say('#ghMsgBox',X(e.message),'bad');return null}
}
async function ensureRepo(){const rp=parseRepo(val('ghRepo'));if(repoInfo&&rp===repoInfo.full_name)return repoInfo;return loadRepo()}
async function loadTree(){
  const info=await ensureRepo();if(!info)return;const br=val('ghBranch')||info.default_branch;
  const box=Q('#ghTreeBox');box.hidden=false;Q('#ghTree').innerHTML='<div class="gh-note" style="padding:10px">Loading files...</div>';
  try{
    const t=await gh(`/repos/${info.full_name}/git/trees/${encodeURIComponent(br)}?recursive=1`);
    tree=(t.tree||[]).filter(x=>x.type==='blob').sort((a,b)=>a.path.localeCompare(b.path));
    renderTree();if(t.truncated)say('#ghMsgBox','This repo is large, so GitHub returned only part of the file list. Use the filter or a branch with fewer files.','bad');
  }catch(e){Q('#ghTree').innerHTML='';say('#ghMsgBox',X(e.message),'bad')}
}
function renderTree(){
  const f=val('ghFilter').toLowerCase(),rows=tree.filter(x=>x.path.toLowerCase().includes(f)),shown=rows.slice(0,200);
  Q('#ghTree').innerHTML=shown.length?shown.map(x=>`<button class="gh-item" data-file="${X(x.path)}"><b>${X(x.path)}</b><small>${x.size!=null?(x.size>1024?(x.size/1024).toFixed(1)+' KB':x.size+' B'):''}</small></button>`).join('')+(rows.length>shown.length?`<div class="gh-note" style="padding:10px">Showing 200 of ${rows.length}. Type in the filter to narrow it.</div>`:''):'<div class="gh-note" style="padding:10px">No files match.</div>';
}
function openText(path,text,suffix){
  const parts=path.split('/'),base=parts.pop();let name=suffix?base.replace(/(\.[^.]+)?$/,m=>'-'+suffix+(m||'')):base;
  try{if(Files.all().some(f=>f.name===name))name=(parts.pop()||'repo')+'-'+name}catch(e){}
  Files.add(name,text);tell('Opened '+name);
}
async function importFile(path,ref){
  const info=await ensureRepo();if(!info)return;
  say('#ghMsgBox','Opening '+X(path)+'...');
  try{const f=await getFile(info.full_name,path,ref||val('ghBranch')||info.default_branch);openText(path,f.text,ref&&ref!==(val('ghBranch')||info.default_branch)?ref.slice(0,7):'');say('#ghMsgBox','Opened '+X(path)+' in the editor.','ok')}
  catch(e){say('#ghMsgBox',X(e.message),'bad')}
}

/* ---------- push ---------- */
function scopeFiles(name){
  const all=QA(`input[name=${name}]:checked`)[0].value==='all';
  try{return all?Files.all():[Files.current()]}catch(e){return[]}
}
async function push(btn){
  const out=Q('#ghPushOut');
  if(!token){say(out,'Connect a token first. Pushing needs Contents read and write.','bad');return}
  const info=await ensureRepo();if(!info)return;
  const branch=val('ghBranch')||info.default_branch,files=scopeFiles('ghScope'),all=QA('input[name=ghScope]:checked')[0].value==='all';
  if(!files.length||!files[0]){say(out,'There is no file to push.','bad');return}
  const dir=val('ghDir').replace(/^\/+|\/+$/g,''),msg=val('ghMsg')||(all?'Update files from Arcode':'Update '+files[0].name+' from Arcode');
  const targets=files.map(f=>({f,path:all?(dir?dir+'/':'')+f.name:val('ghPath').replace(/^\/+/,'')}));
  for(const t of targets){if(!t.path||/(^|\/)\.\.(\/|$)/.test(t.path)){say(out,'Enter a valid path inside the repo.','bad');return}}
  busy(btn,true,'Pushing...');const lines=[];let fail=false;
  for(const t of targets){
    let sha,same=false;
    try{
      try{const cur=await gh(cUrl(info.full_name,t.path,branch));if(!Array.isArray(cur)){sha=cur.sha;if(cur.encoding==='base64'&&cur.content!=null){same=b64dec(cur.content)===t.f.code}}}
      catch(e){if(e.status!==404)throw e}
      if(same){lines.push(`<span>${X(t.path)}: unchanged, skipped</span>`);continue}
      const r=await gh(cUrl(info.full_name,t.path),{method:'PUT',body:{message:msg,content:b64enc(t.f.code),branch,...(sha?{sha}:{})}});
      lines.push(`<span class="ok">${X(t.path)}: ${sha?'updated':'created'} &rarr; <a href="${X(r.commit.html_url)}" target="_blank" rel="noopener">${X(String(r.commit.sha).slice(0,7))}</a></span>`);
    }catch(e){fail=true;lines.push(`<span class="bad">${X(t.path)}: ${X(e.status===404&&sha===undefined?'Branch '+branch+' or repo not found (or no write access).':e.message)}</span>`)}
  }
  busy(btn,false);say(out,lines.join('<br>'),fail?'bad':'ok');if(!fail)tell('Pushed to '+info.full_name);
}

/* ---------- history ---------- */
async function loadHistory(more,btn){
  const info=await ensureRepo();if(!info)return;
  const path=val('ghHPath').replace(/^\/+/,''),branch=val('ghBranch')||info.default_branch;
  if(!more){histPage=0;Q('#ghHist').innerHTML=''}
  const out=Q('#ghHistOut');say(out,'Loading commits...');busy(btn,true,'Loading...');
  try{
    const page=histPage+1,list=await gh(`/repos/${info.full_name}/commits?sha=${encodeURIComponent(branch)}&per_page=20&page=${page}`+(path?'&path='+encodeURIComponent(path):''));
    histPage=page;const box=Q('#ghHist');box.hidden=false;
    box.insertAdjacentHTML('beforeend',list.map(c=>{const m=(c.commit.message||'').split('\n')[0],who=(c.commit.author&&c.commit.author.name)||(c.author&&c.author.login)||'unknown',d=c.commit.author&&c.commit.author.date?new Date(c.commit.author.date).toLocaleString():'';
      return `<div class="gh-commit"><div><b>${X(m)}</b><small>${X(who)} &middot; ${X(d)} &middot; <a href="${X(c.html_url)}" target="_blank" rel="noopener">${X(c.sha.slice(0,7))}</a></small></div>${path?`<button class="mini" data-ver="${X(c.sha)}">Open this version</button>`:''}</div>`}).join(''));
    Q('#ghHistMore').hidden=list.length<20;
    say(out,box.children.length?(path?'':'Add a path filter to open a file at a past commit.'):'No commits found for this path.',box.children.length?'':'bad');
  }catch(e){say(out,X(e.message),'bad')}
  busy(btn,false);
}

/* ---------- gist ---------- */
async function makeGist(btn){
  const out=Q('#ghGistOut');
  if(!token){say(out,'Connect a token first. Gists need the Gists permission.','bad');return}
  const files=scopeFiles('ghGScope');if(!files.length||!files[0]){say(out,'There is no file to share.','bad');return}
  const body={description:val('ghGDesc')||'Shared from Arcode',public:QA('input[name=ghVis]:checked')[0].value==='public',files:{}};
  for(const f of files){if(!String(f.code).trim()){say(out,X(f.name)+' is empty. Gists cannot contain empty files.','bad');return}body.files[f.name]={content:f.code}}
  busy(btn,true,'Creating...');
  try{const g=await gh('/gists',{method:'POST',body});say(out,`Created ${g.public?'public':'secret'} gist: <a href="${X(g.html_url)}" target="_blank" rel="noopener">${X(g.html_url)}</a>`,'ok');tell('Gist created')}
  catch(e){say(out,X(e.message),'bad')}
  busy(btn,false);
}

/* ---------- wiring ---------- */
function setTab(t){
  tab=t;QA('.gh-tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));
  QA('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==t);Q('#ghRepoBar').hidden=t==='gist';
  Q('.gh-body [data-a=load]').textContent=t==='import'?'Load files':'Load';
  let cur=null;try{cur=Files.current()}catch(e){}
  if(cur){if(t==='push'&&!val('ghPath'))Q('#ghPath').value=cur.name;if(t==='history'&&!Q('#ghHPath').dataset.t){Q('#ghHPath').value=cur.name;Q('#ghHPath').dataset.t=1}}
  say('#ghMsgBox','');
}
root.addEventListener('click',async e=>{
  const t=e.target.closest('button,[data-repo],[data-file]');if(!t||!root.contains(t))return;
  if(t.dataset.tab)return setTab(t.dataset.tab);
  if(t.dataset.repo){Q('#ghRepo').value=t.dataset.repo;Q('#ghBranch').value='';repoInfo=null;return loadTree()}
  if(t.dataset.file)return importFile(t.dataset.file);
  if(t.dataset.ver)return importFile(val('ghHPath').replace(/^\/+/,''),t.dataset.ver);
  switch(t.dataset.a){
    case 'close':return close();
    case 'conn':return connect(t);
    case 'disc':return disconnect();
    case 'load':busy(t,true,'Loading...');try{if(tab==='import')await loadTree();else await loadRepo()}finally{busy(t,false)}return;
    case 'morerepos':return loadRepos(false);
    case 'push':return push(t);
    case 'hist':return loadHistory(false,t);
    case 'histmore':return loadHistory(true,t);
    case 'gist':return makeGist(t);
  }
});
Q('#ghFilter').addEventListener('input',renderTree);
Q('#ghRepo').addEventListener('change',()=>{if(repoInfo&&parseRepo(val('ghRepo'))!==repoInfo.full_name){repoInfo=null;Q('#ghBranch').value='';Q('#ghInfo').textContent='';Q('#ghTreeBox').hidden=true}});
QA('input[name=ghScope]').forEach(r=>r.addEventListener('change',()=>{const all=QA('input[name=ghScope]:checked')[0].value==='all';Q('#ghPathL').hidden=all;Q('#ghDirL').hidden=!all}));
root.addEventListener('mousedown',e=>{if(e.target===root)close()});
root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}else if(e.key==='Enter'&&e.target.id==='ghTok'){e.preventDefault();connect(Q('[data-a=conn]'))}else if(e.key==='Enter'&&e.target.id==='ghRepo'){e.preventDefault();Q('[data-a=load]').click()}});

function open(){
  root.hidden=false;token=token||readTok();renderAcct();renderMine();setTab(tab);
  if(token&&!user)verify().then(ok=>{if(ok&&!repos.length)loadRepos(true)});else if(token&&!repos.length)loadRepos(true);
  setTimeout(()=>{const f=Q('#ghTok')||Q('#ghRepo');f&&f.focus()},30);
}
function close(){root.hidden=true}
token=readTok();
window.GitHubModule={open,close,isConnected:()=>!!(token&&user),disconnect};
if(window.Tools&&Tools.add)Tools.add('GitHub',open);
})();
