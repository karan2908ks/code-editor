/* Code Editor by Karan Sharma. Core: multi-file projects, tabs, themes, layout helpers. */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const LANGS={
 c:{name:'C',mode:'text/x-csrc',ext:'c',def:'main.c'},cpp:{name:'C++',mode:'text/x-c++src',ext:'cpp',def:'main.cpp'},java:{name:'Java',mode:'text/x-java',ext:'java',def:'Main.java'},
 python:{name:'Python',mode:'python',ext:'py',def:'main.py'},js:{name:'JavaScript',mode:'javascript',ext:'js',def:'index.js'},
 html:{name:'HTML',mode:'htmlmixed',ext:'html',def:'index.html'},css:{name:'CSS',mode:'css',ext:'css',def:'styles.css'},text:{name:'Text',mode:null,ext:'txt',def:'notes.txt'}};
const EXT={py:'python',js:'js',mjs:'js',json:'js',html:'html',htm:'html',css:'css',java:'java',c:'c',h:'c',cpp:'cpp',cc:'cpp',hpp:'cpp',txt:'text',md:'text'};
const langOfName=n=>EXT[(String(n).split('.').pop()||'').toLowerCase()]||'text';
const NAME_RE=/^[\w][\w .\-]{0,59}$/;
const SAMPLES={
c:`#include <stdio.h>

int main() {
    int n = 5, sum = 0;
    for (int i = 1; i <= n; i++) {
        sum += i;
    }
    printf("Sum of 1..%d = %d\\n", n, sum);
    return 0;
}
`,
cpp:`#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v = {3, 1, 4, 1, 5};
    int total = 0;
    for (int x : v) total += x;
    cout << "Total: " << total << endl;
    return 0;
}
`,
java:`public class Main {
    public static void main(String[] args) {
        int[] nums = {3, 1, 4, 1, 5};
        int total = 0;
        for (int n : nums) total += n;
        System.out.println("Total: " + total);
    }
}
`,
python:`def fib(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print("Fibonacci:", list(fib(10)))
`,
js:`const greet = name => "Hello, " + name + "!";
console.log(greet("Karan"));
console.log([1, 2, 3].map(n => n * n));
`,
html:`<!DOCTYPE html>
<html>
<head>
  <title>Hello</title>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 40px; }
    button { padding: 10px 18px; font-size: 16px; }
  </style>
</head>
<body>
  <h1 id="t">Hello from Karan Code Arcade</h1>
  <button onclick="document.getElementById('t').textContent='Clicked!'">Click me</button>
</body>
</html>
`};
SAMPLES.css=`body {
  font-family: system-ui, sans-serif;
  background: #15122b;
  color: #f3efe6;
  text-align: center;
  padding: 40px;
}
button {
  padding: 10px 18px;
  font-size: 16px;
  border: 3px solid #f3efe6;
  background: #ee6a7c;
  cursor: pointer;
}
`;
SAMPLES.html=`<!DOCTYPE html>
<html>
<head>
  <title>Hello</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1 id="t">Hello from Code Editor</h1>
  <button id="b">Click me</button>
  <script>
    let n = 0;
    document.getElementById('b').onclick = () => {
      document.getElementById('t').textContent = 'Clicked ' + (++n) + ' times';
    };
  </script>
</body>
</html>
`;
const State={lastErr:''};
let lang='python';
/* ---------- toast, modal, popover ---------- */
function toast(t,undo){const e=$('#toast');e.textContent=t+(undo?'  (click to undo)':'');e.hidden=false;e.onclick=undo?()=>{undo();e.hidden=true}:null;e.style.cursor=undo?'pointer':'';clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,undo?5000:2600)}
function modal(title,opt={}){
  const v=document.createElement('div');v.className='veil';
  v.innerHTML=`<div class="modal ${opt.wide?'wide':opt.mid?'mid':''}" role="dialog" aria-label="${esc(title)}"><h3><span>${esc(title)}</span><button class="btn" data-x style="padding:4px 8px" aria-label="Close">&times;</button></h3><div class="body"></div></div>`;
  const close=()=>{v.remove();document.removeEventListener('keydown',onKey,true);opt.onClose&&opt.onClose()};
  const onKey=e=>{if(e.key!=='Escape')return;const vs=[...document.querySelectorAll('.veil:not([hidden])')];if(vs[vs.length-1]===v){e.stopPropagation();close()}};
  v.addEventListener('mousedown',e=>{if(e.target===v)close()});v.querySelector('[data-x]').onclick=close;document.addEventListener('keydown',onKey,true);
  document.body.appendChild(v);return{el:v,body:v.querySelector('.body'),box:v.querySelector('.modal'),close,title:v.querySelector('h3 span')};
}
let openMenu=null;
function closeMenu(){if(openMenu){openMenu.remove();openMenu=null;document.removeEventListener('mousedown',menuOut,true)}}
function menuOut(e){if(openMenu&&!openMenu.contains(e.target)&&!(openMenu._a&&openMenu._a.contains(e.target)))closeMenu()}
function popover(anchor,build){
  const was=openMenu&&openMenu._a===anchor;closeMenu();if(was)return null;
  const m=document.createElement('div');m.className='menu';m._a=anchor;build(m);document.body.appendChild(m);
  const r=anchor.getBoundingClientRect(),w=m.offsetWidth,h=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';m.style.top=(r.bottom+6+h>innerHeight&&r.top>h+10?r.top-h-6:r.bottom+6)+'px';
  openMenu=m;setTimeout(()=>document.addEventListener('mousedown',menuOut,true),0);return m;
}
addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();if(document.documentElement.dataset.fs==='1'&&!document.querySelector('.veil:not([hidden])'))setFs(false)}});
/* ---------- editor ---------- */
const cm=CodeMirror.fromTextArea($('#code'),{theme:'ce',lineNumbers:true,matchBrackets:true,autoCloseBrackets:true,styleActiveLine:true,indentUnit:4,tabSize:4,
  extraKeys:{Tab:c=>c.somethingSelected()?c.indentSelection('add'):c.replaceSelection('    '),'Ctrl-Enter':()=>runCode(),'Cmd-Enter':()=>runCode(),'Ctrl-S':()=>openSave(),'Cmd-S':()=>openSave(),F2:()=>renameActive()}});
function clearMarks(){for(let i=0;i<cm.lineCount();i++)cm.removeLineClass(i,'background','errline')}
function markLines(ls){clearMarks();ls.forEach(n=>{if(n>=1&&n<=cm.lineCount())cm.addLineClass(n-1,'background','errline')})}
/* ---------- project: files, tabs ---------- */
const WS={files:[],active:null};let fid=1;
const codeOf=f=>f.doc.getValue();
const byName=n=>WS.files.find(f=>f.name===n);
const activeFile=()=>WS.files.find(f=>f.id===WS.active)||WS.files[0];
function mkFile(name,code){
  const f={id:'f'+(fid++),name,doc:new CodeMirror.Doc(code,LANGS[langOfName(name)].mode)};
  CodeMirror.on(f.doc,'change',(d,ch)=>{onDocChange(f,ch)});return f;
}
function uniqueName(want){if(!byName(want))return want;const m=/^(.*?)(\d*)(\.[^.]+)?$/.exec(want);let i=2;while(byName(`${m[1]}${i}${m[3]||''}`))i++;return`${m[1]}${i}${m[3]||''}`}
let wsT;function persist(){clearTimeout(wsT);wsT=setTimeout(()=>{store.set('ce-ws',JSON.stringify({files:WS.files.map(f=>({name:f.name,code:codeOf(f)})),active:(activeFile()||{}).name}));$('#draft').textContent='DRAFT SAVED'},400)}
let lintT;function onDocChange(f,ch){
  if(f===activeFile()){$('#draft').textContent='';if(cur.id||cur.title)setStatus('UNSAVED CHANGES');clearTimeout(lintT);lintT=setTimeout(runLint,800)}
  persist();dispatchEvent(new CustomEvent('ce-change',{detail:{file:f,change:ch}}));
}
function activate(id,opt={}){
  const f=WS.files.find(x=>x.id===id)||WS.files[0];if(!f)return;WS.active=f.id;cm.swapDoc(f.doc);
  lang=langOfName(f.name);$('#lang').value=LANGS[lang]&&lang!=='text'?lang:'python';clearMarks();renderTabs();sbar();
  $('#t-prev').hidden=!WS.files.some(x=>langOfName(x.name)==='html');
  if(!opt.quiet){cm.focus();persist()}runLint();dispatchEvent(new CustomEvent('ce-active',{detail:{file:f}}));
}
function renderTabs(){
  const box=$('#ftabs');box.innerHTML='';
  WS.files.forEach(f=>{
    const t=document.createElement('div');t.className='ftab'+(f.id===WS.active?' on':'');t.dataset.l=langOfName(f.name);t.setAttribute('role','tab');t.setAttribute('aria-selected',f.id===WS.active);t.tabIndex=0;t.dataset.id=f.id;
    t.innerHTML=`<span class="nm">${esc(f.name)}</span><button class="x" title="Close ${esc(f.name)}" aria-label="Close ${esc(f.name)}">&times;</button>`;
    t.onclick=e=>{if(e.target.closest('.x'))closeFile(f.id);else if(f.id!==WS.active)activate(f.id)};
    t.ondblclick=e=>{if(!e.target.closest('.x'))renameFile(f.id)};
    t.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(f.id)}};
    box.appendChild(t)});
  const p=document.createElement('button');p.className='fplus';p.textContent='+';p.title='New file';p.setAttribute('aria-label','New file');p.onclick=()=>newFileMenu(p);box.appendChild(p);
  const on=box.querySelector('.on');if(on)on.scrollIntoView({block:'nearest',inline:'nearest'});
}
function addFile(name,code,opt={}){
  if(WS.files.length>=20){toast('A project can have up to 20 files');return null}
  const f=mkFile(uniqueName(name),code);WS.files.push(f);if(opt.activate!==false)activate(f.id);else renderTabs();persist();dispatchEvent(new CustomEvent('ce-files'));return f;
}
let lastClosed=null;
function closeFile(id){
  if(WS.files.length<2){toast('Keep at least one file open');return}
  const i=WS.files.findIndex(f=>f.id===id),f=WS.files[i];lastClosed={name:f.name,code:codeOf(f),i};
  WS.files.splice(i,1);if(WS.active===id)activate((WS.files[Math.min(i,WS.files.length-1)]).id);else renderTabs();persist();dispatchEvent(new CustomEvent('ce-files',{detail:{removed:f.name}}));
  toast('Closed '+f.name,()=>{const g=mkFile(uniqueName(lastClosed.name),lastClosed.code);WS.files.splice(lastClosed.i,0,g);activate(g.id);dispatchEvent(new CustomEvent('ce-files'))});
}
function renameFile(id){
  const f=WS.files.find(x=>x.id===id);if(!f)return;if(f.id!==WS.active)activate(id);
  const tab=document.querySelector(`.ftab[data-id="${id}"]`);if(!tab)return;const nm=tab.querySelector('.nm');
  const inp=document.createElement('input');inp.value=f.name;inp.setAttribute('aria-label','File name');nm.replaceWith(inp);inp.focus();inp.setSelectionRange(0,f.name.lastIndexOf('.')>0?f.name.lastIndexOf('.'):f.name.length);
  let done=false;const commit=ok=>{if(done)return;done=true;const v=inp.value.trim();
    if(ok&&v&&v!==f.name){if(!NAME_RE.test(v))toast('Use letters, numbers, dots and dashes only');else if(byName(v))toast('A file named '+v+' already exists');
      else{const old=f.name;f.name=v;const l=langOfName(v);cm.setOption('mode',LANGS[l].mode);lang=l;$('#lang').value=l==='text'?'python':l;persist();dispatchEvent(new CustomEvent('ce-files',{detail:{renamed:[old,v]}}))}}
    activate(f.id,{quiet:true});cm.focus()};
  inp.onkeydown=e=>{if(e.key==='Enter')commit(true);else if(e.key==='Escape')commit(false);e.stopPropagation()};inp.onblur=()=>commit(true);
}
function renameActive(){const f=activeFile();if(f)renameFile(f.id)}
function newFileMenu(anchor){
  popover(anchor,m=>{m.innerHTML='<h4>NEW FILE</h4>';
    ['python','js','html','css','java','c','cpp','text'].forEach(l=>{const b=document.createElement('button');b.innerHTML=`${LANGS[l].name}<small>${LANGS[l].def}</small>`;
      b.onclick=()=>{closeMenu();addFile(LANGS[l].def,l==='text'?'':(l==='html'||l==='css'||SAMPLES[l]||''))};m.appendChild(b)})});
}
$('#lang').onchange=e=>{ // change the language of the open file (renames its extension)
  const f=activeFile(),nl=e.target.value,ol=langOfName(f.name);if(nl===ol)return;
  const base=f.name.replace(/\.[^.]*$/,'')||'main';let nn=base+'.'+LANGS[nl].ext;if(byName(nn)&&nn!==f.name)nn=uniqueName(nn);
  const empty=!codeOf(f).trim()||codeOf(f)===SAMPLES[ol];f.name=nn;cm.setOption('mode',LANGS[nl].mode);if(empty&&SAMPLES[nl])f.doc.setValue(SAMPLES[nl]);
  lang=nl;renderTabs();persist();runLint();dispatchEvent(new CustomEvent('ce-files'));window.drake&&drake.say(`Switched this file to <b>${LANGS[nl].name}</b>.`);
};
function loadWorkspace(files,activeName){
  WS.files=[];files.forEach(x=>WS.files.push(mkFile(uniqueName(x.name),x.code)));
  const a=WS.files.find(f=>f.name===activeName)||WS.files[0];activate(a.id,{quiet:true});persist();dispatchEvent(new CustomEvent('ce-files'));
}
function seedFiles(){return[{name:'main.py',code:SAMPLES.python},{name:'index.js',code:SAMPLES.js},{name:'index.html',code:SAMPLES.html},{name:'styles.css',code:SAMPLES.css}]}
/* ---------- themes ---------- */
const THEMES=[['dark','Pixel Dark',['#ee6a7c','#f7d154','#6fdcff','#15122b']],['light','Pixel Light',['#e0455b','#e8b800','#1b9fd0','#f6f1e7']],['neon','Neon',['#ff2bd6','#ffe600','#00f0ff','#07020f']],
 ['cyberpunk','Cyberpunk',['#fcee0a','#ff2a6d','#05d9e8','#0a0414']],['dracula','Dracula',['#ff79c6','#f1fa8c','#8be9fd','#282a36']],['zen','Zen Black',['#7ee0c0','#f2c46d','#9d8cff','#000000']]];
function setMode(m){const i=Math.max(0,THEMES.findIndex(x=>x[0]===m)),t=THEMES[i];document.documentElement.dataset.mode=t[0];$('#themeName').textContent=t[1];
  $('#themeDots').innerHTML=t[2].slice(0,3).map(c=>`<s style="background:${c}"></s>`).join('');store.set('ce-mode',t[0]);
  document.querySelector('meta[name=theme-color]').content=getComputedStyle(document.body).backgroundColor;dispatchEvent(new Event('modechange'))}
$('#theme').onclick=e=>popover(e.currentTarget,m=>{m.innerHTML='<h4>THEME</h4>';THEMES.forEach(t=>{const b=document.createElement('button');b.setAttribute('aria-current',document.documentElement.dataset.mode===t[0]);
  b.innerHTML=`<span class="sw">${t[2].map(c=>`<i style="background:${c}"></i>`).join('')}</span>${t[1]}`;b.onclick=()=>{setMode(t[0]);closeMenu();window.drake&&drake.say(`<b>${t[1]}</b> theme on.`)};m.appendChild(b)})});
/* ---------- layout: fullscreen, split, font size, focus ---------- */
function setFs(on){document.documentElement.dataset.fs=on?'1':'0';setTimeout(()=>cm.refresh(),30);
  if(on&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});else if(!on&&document.fullscreenElement)document.exitFullscreen().catch(()=>{})}
$('#full').onclick=()=>setFs(document.documentElement.dataset.fs!=='1');$('#fsx').onclick=()=>setFs(false);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.documentElement.dataset.fs==='1')setFs(false)});
(function split(){const ws=$('#workspace'),h=$('#vsplit');let drag=false;
  const apply=px=>{const w=ws.getBoundingClientRect().width;px=Math.max(300,Math.min(w-300-12,px));ws.style.setProperty('--lw',px+'px');store.set('ce-split',String(px/w));cm.refresh()};
  const saved=parseFloat(store.get('ce-split'));if(saved>0&&saved<1&&innerWidth>900)ws.style.setProperty('--lw',(saved*ws.getBoundingClientRect().width)+'px');
  h.addEventListener('pointerdown',e=>{drag=true;h.classList.add('drag');h.setPointerCapture(e.pointerId);document.body.style.userSelect='none'});
  h.addEventListener('pointermove',e=>{if(drag)apply(e.clientX-ws.getBoundingClientRect().left)});
  const end=()=>{drag=false;h.classList.remove('drag');document.body.style.userSelect=''};h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);
  h.addEventListener('dblclick',()=>{ws.style.removeProperty('--lw');store.del('ce-split');cm.refresh()});
  h.addEventListener('keydown',e=>{const w=$('#edBox').getBoundingClientRect().width;if(e.key==='ArrowLeft'){apply(w-30);e.preventDefault()}if(e.key==='ArrowRight'){apply(w+30);e.preventDefault()}});
  addEventListener('resize',()=>{if(innerWidth>900)cm.refresh()});
})();
let fsz=+store.get('ce-fs')||13.5;function applyFs(){cm.getWrapperElement().style.fontSize=fsz+'px';cm.refresh();store.set('ce-fs',fsz)}
$('#fminus').onclick=()=>{fsz=Math.max(10,fsz-1);applyFs()};$('#fplus').onclick=()=>{fsz=Math.min(26,fsz+1);applyFs()};applyFs();
const focusOn=()=>document.documentElement.dataset.focus==='1';
function setFocus(on,quiet){document.documentElement.dataset.focus=on?'1':'0';const b=$('#focus');b.setAttribute('aria-pressed',on);b.textContent=on?'Focus: On':'Focus';store.set('ce-focus',on?'1':'0');
  dispatchEvent(new Event('focuschange'));setTimeout(()=>cm.refresh(),30);if(!quiet)toast(on?'Focus mode on. Animations paused.':'Focus mode off.')}
$('#focus').onclick=()=>setFocus(!focusOn());
addEventListener('keydown',e=>{if(((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='f')||(e.altKey&&e.code==='KeyZ')){e.preventDefault();setFocus(!focusOn())}});
/* status bar, download, reset */
function sbar(){const p=cm.getCursor();$('#pos').textContent=`Ln ${p.line+1}, Col ${p.ch+1}`;$('#cnt').textContent=`${cm.lineCount()} lines · ${cm.getValue().length} chars`}
cm.on('cursorActivity',sbar);cm.on('change',sbar);
$('#dl').onclick=()=>{try{const f=activeFile(),b=new Blob([codeOf(f)],{type:'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);toast('Downloaded '+f.name)}catch(e){toast('Download is blocked in this view')}};
$('#rs').onclick=()=>{const f=activeFile(),s=SAMPLES[langOfName(f.name)];f.doc.setValue(s||'');clearMarks();toast(s?'Sample restored':'File cleared')};
document.querySelectorAll('[data-split]').forEach(el=>{const t=el.textContent;el.textContent='';el.setAttribute('aria-label',t);
  [...t].forEach((ch,i)=>{const s=document.createElement('span');s.className='ch'+(ch===' '?' sp':'');s.style.setProperty('--i',i);s.setAttribute('aria-hidden','true');s.textContent=ch===' '?' ':ch;el.appendChild(s)})});
function burst(el){if(focusOn()||matchMedia('(prefers-reduced-motion: reduce)').matches||!el.animate)return;const r=el.getBoundingClientRect(),cs=['#ee6a7c','#f7d154','#6fdcff','#5cf2a0'];
  for(let i=0;i<18;i++){const p=document.createElement('i');p.className='spark';p.style.cssText=`left:${r.left+r.width/2}px;top:${r.top+r.height/2}px;background:${cs[i%4]}`;document.body.appendChild(p);
    const a=Math.random()*6.283,d=40+Math.random()*70;p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d+30}px) scale(.2)`,opacity:0}],{duration:700+Math.random()*300,easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish=()=>p.remove()}}

/* ---------- output panel: tabs, meter, terminal, problems ---------- */
const out=$('#out'),termlog=$('#termlog');
const TABS=['out','term','prob','prev'];
function showTab(t){TABS.forEach(k=>{$('#p-'+k).hidden=k!==t;$('#t-'+k).setAttribute('aria-selected',k===t)})}
TABS.forEach(k=>$('#t-'+k).onclick=()=>showTab(k));
function put(s,c){const sp=document.createElement('span');if(c)sp.className=c;sp.textContent=s;out.appendChild(sp);$('#p-out').scrollTop=1e9}
function tlog(h,c){const d=document.createElement('div');if(c)d.className=c;d.innerHTML=h;termlog.appendChild(d);termlog.scrollTop=1e9}
function setMeter(o){
  const e=$('#mExit'),t=$('#mTime'),m=$('#mMem');
  e.textContent='EXIT '+(o.status==null?'-':o.status);e.className=o.status==null?'':(+o.status===0?'ok':'bad');
  t.textContent='TIME '+(o.ms==null?'-':o.ms>999?(o.ms/1000).toFixed(2)+'s':Math.round(o.ms)+'ms');
  m.textContent='MEM '+(o.mem==null?'n/a':o.mem>=1048576?(o.mem/1048576).toFixed(1)+'MB':Math.max(1,Math.round(o.mem/1024))+'KB');
  m.title='Approximate JavaScript heap, measured in Chrome-based browsers. Not available for C, C++ and Java, which run on a remote compiler.';
}
setMeter({});
$('#clrOut').onclick=()=>{out.innerHTML='<span class="i">Output cleared.</span>';termlog.innerHTML='<span class="i">$ cleared.</span>';PROBS.run=[];renderProblems();setMeter({})};
$('#copyOut').onclick=async()=>{try{await navigator.clipboard.writeText(out.textContent);toast('Output copied')}catch(e){toast('Could not copy. Select the text instead.')}};
const PROBS={run:[],lint:[]};
function renderProblems(){
  const all=[...PROBS.run,...PROBS.lint],box=$('#problems'),c=$('#probCnt');
  c.hidden=!all.length;c.textContent=all.length;
  if(!all.length){box.innerHTML='<div class="noprob">NO PROBLEMS FOUND.<br>Drake checks the open file as you type.</div>';return}
  box.innerHTML='';
  all.forEach(p=>{const d=document.createElement('div');d.className='prob';d.innerHTML=`<span class="sev ${p.sev==='error'?'err':'warn'}">${p.sev==='error'?'ERROR':'WARN'}</span><span>${p.html?p.msg:esc(p.msg)}</span><span class="loc">${esc(p.file)}:${p.line||'-'}</span>`;
    d.onclick=()=>gotoLine(p.file,p.line);box.appendChild(d)})}
function gotoLine(name,line){const f=byName(name);if(f&&f.id!==WS.active)activate(f.id);if(line>0){cm.setCursor({line:line-1,ch:0});cm.scrollIntoView({line:line-1,ch:0},120);markLines([line])}cm.focus()}
function runLint(){const f=activeFile();if(!f||typeof lint!=='function'){return}const l=langOfName(f.name);
  PROBS.lint=['c','cpp','java','python','js','html'].includes(l)?lint(l,codeOf(f)).map(i=>({sev:'warn',file:f.name,line:i.line,msg:i.msg,html:true})):[];renderProblems()}
/* ---------- parse compiler / runtime errors into Problems ---------- */
function parseProblems(text,entry){
  const list=[],t=String(text||'');let m;
  const norm=n=>byName(n)?n:(byName(String(n).replace(/^prog\./,'main.'))?String(n).replace(/^prog\./,'main.'):entry.name);
  const g=/([\w.\-\/]+\.(?:c|cpp|cc|h|hpp|java)):(\d+)(?::(\d+))?:\s*(fatal error|error|warning):\s*(.*)/g;
  while((m=g.exec(t)))list.push({sev:m[4]==='warning'?'warn':'error',file:norm(m[1].split('/').pop()),line:+m[2],msg:m[5]});
  if(!list.length){const py=/(?:^|\n)\s*([A-Za-z]*(?:Error|Exception)[^\n]*?)(?: on)? line (\d+)/.exec(t)||/([A-Za-z]*Error[^\n]*)\s*\(line (\d+)\)/.exec(t);
    if(py)list.push({sev:'error',file:entry.name,line:+py[2],msg:py[1].trim()});
    else{const ln=/line (\d+)/i.exec(t);list.push({sev:'error',file:entry.name,line:ln?+ln[1]:0,msg:(t.split('\n').find(x=>x.trim())||'Error').trim().slice(0,300)})}}
  return list;
}
/* ---------- run engine ---------- */
const BRIDGE=`<script>(function(){function s(t,a){try{parent.postMessage({ce:1,t:t,m:a.map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}}
['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){s(k,[].slice.call(arguments));o.apply(console,arguments)}});
window.onerror=function(m,u,l){s('err',[m+(l&&OFF>=0?' (line '+(l-OFF)+')':'')]);return true};
window.addEventListener('unhandledrejection',function(e){s('err',['Unhandled promise: '+(e.reason&&e.reason.message||e.reason)])});window.__t0=performance.now()})();<\/script>`;
const DONE=`<script>parent.postMessage({ce:1,t:'done',ms:performance.now()-window.__t0,mem:(performance.memory||{}).usedJSHeapSize||0},'*')<\/script>`;
let jsWait=null,jsKill;
addEventListener('message',e=>{const d=e.data;if(!d||!d.ce)return;
  if(d.t==='done'){if(jsWait)jsWait(d);return}
  if(d.t==='err'){put(d.m+'\n','e');State.lastErr=d.m;const m=/line (\d+)/.exec(d.m);if(m)markLines([+m[1]]);jsErrs.push(d.m)}
  else put(d.m+'\n',d.t==='warn'?'i':d.t==='error'?'e':'')});
let jsErrs=[];
function bundleHtml(f){ // inline linked stylesheets and scripts that exist in the project
  let h=codeOf(f);
  h=h.replace(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi,(m,p)=>{const q=byName(p.split('/').pop());return q&&langOfName(q.name)==='css'&&/stylesheet/i.test(m)?`<style>\n${codeOf(q)}\n</style>`:m});
  h=h.replace(/<script\b([^>]*?)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,(m,a,p,b)=>{const q=byName(p.split('/').pop());return q&&langOfName(q.name)==='js'?`<script${a}${b}>\n${codeOf(q).replace(/<\/script>/gi,'<\\/script>')}\n<\/script>`:m});
  return h;
}
function runJS(f){
  jsErrs=[];const pre=BRIDGE.replace('OFF','4');
  const f1=document.createElement('iframe');f1.sandbox='allow-scripts';f1.style.display='none';
  f1.srcdoc='<!doctype html><body>'+pre+'<script>\n'+codeOf(f).replace(/<\/script>/gi,'<\\/script>')+'\n<\/script>'+DONE;document.body.appendChild(f1);
  return new Promise(res=>{jsWait=d=>{jsWait=null;setTimeout(()=>res({status:jsErrs.length?1:0,ms:d.ms,mem:d.mem||null}),150)};clearTimeout(jsKill);jsKill=setTimeout(()=>{if(jsWait){jsWait=null;res({status:jsErrs.length?1:0,ms:null,mem:null})}},6000);setTimeout(()=>f1.remove(),6500)});
}
function runHtml(f){
  jsErrs=[];const pre=BRIDGE.replace('OFF','-1'),h=bundleHtml(f);
  $('#prev').srcdoc=/<head[^>]*>/i.test(h)?h.replace(/<head[^>]*>/i,m=>m+pre):pre+h;showTab('prev');put('HTML rendered in the Preview tab. Console messages from the page appear here.\n','i');
  return new Promise(res=>setTimeout(()=>res({status:jsErrs.length?1:0,ms:null,mem:null}),500));
}
async function runPy(f){
  const lines=($('#stdin').value||'').split('\n');let li=0;
  Sk.configure({output:t=>put(t),read:x=>{const base=String(x).split('/').pop(),q=WS.files.find(z=>z!==f&&z.name===base&&langOfName(z.name)==='python');if(q)return codeOf(q);
      if(!Sk.builtinFiles||!Sk.builtinFiles.files[x])throw "File not found: '"+x+"'";return Sk.builtinFiles.files[x]},
    inputfun:p=>{put(p||'');const v=li<lines.length?lines[li++]:'';put(v+'\n','i');return v},__future__:Sk.python3,execLimit:8000});
  const m0=performance.memory?performance.memory.usedJSHeapSize:null,t0=performance.now();
  await Sk.misceval.asyncToPromise(()=>Sk.importMainWithBody('<stdin>',false,codeOf(f),true));
  const m1=performance.memory?performance.memory.usedJSHeapSize:null;return{status:0,ms:performance.now()-t0,mem:m0!=null&&m1!=null?Math.max(0,m1-m0):null};
}
async function runRemote(kind,f){
  put('Compiling...\n','i');
  const fam=kind==='java'?['java']:['c','cpp'],others=WS.files.filter(z=>z!==f&&fam.includes(langOfName(z.name))).map(z=>({name:z.name,code:codeOf(z)}));
  const t0=performance.now();
  const r=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang:kind,code:codeOf(f),files:others,stdin:$('#stdin').value||''})});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Compiler service error');
  out.innerHTML='';const ms=performance.now()-t0;
  if(j.compiler_error){put(j.compiler_error,'e');const er=new Error('compile');er.text=j.compiler_error;er.meta={status:1,ms,mem:null};throw er}
  if(j.program_output)put(j.program_output);
  if(j.program_error){put(j.program_error,'e');if(+j.status!==0){const er=new Error('runtime');er.text=j.program_error;er.meta={status:+j.status,ms,mem:null};throw er}}
  return{status:+j.status||0,ms,mem:null};
}
function entryFile(){
  const f=activeFile(),l=langOfName(f.name);
  if(l==='css'||l==='text')return WS.files.find(x=>langOfName(x.name)==='html')||f;
  if(l==='js'){const re=new RegExp('src=["\'][^"\']*'+f.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'["\']','i');return WS.files.find(x=>langOfName(x.name)==='html'&&re.test(codeOf(x)))||f}
  return f;
}
let running=false;
async function runCode(silent){
  if(running)return;const entry=entryFile(),l=langOfName(entry.name);
  if(l==='css'||l==='text'){toast('Nothing to run in '+entry.name+'. Open a code file or an HTML file.');return}
  running=true;const b=$('#run');b.disabled=true;State.lastErr='';PROBS.run=[];
  out.innerHTML='';clearMarks();setMeter({});window.drake&&drake.setMood('think');
  const cmd={python:'python',js:'node',java:'java',c:'gcc',cpp:'g++',html:'open'}[l]+' '+entry.name;tlog('$ '+esc(cmd),'cmd');
  if(l!=='html'&&$('#p-prev').hidden===false)showTab('out');
  let meta=null;
  try{
    meta=l==='js'?await runJS(entry):l==='html'?await runHtml(entry):l==='python'?await runPy(entry):await runRemote(l,entry);
    if(State.lastErr&&meta.status===0)meta.status=1;
    if(jsErrs.length&&(l==='js'||l==='html')){PROBS.run=jsErrs.map(m=>{const ln=/\(line (\d+)\)/.exec(m);return{sev:'error',file:entry.name,line:ln?+ln[1]:0,msg:m.replace(/\s*\(line \d+\)/,'')}})}
    if(!State.lastErr&&!silent&&window.drake){drake.react('ok');burst($('#run'))}
  }catch(err){
    const text=err&&err.text?err.text:(err&&err.message?err.message:String(err));
    meta=(err&&err.meta)||{status:1,ms:null,mem:null};
    if(!(err&&err.text))put(text+'\n','e');
    if(!(err&&err.text)&&(err instanceof TypeError||/compiler service|Failed to fetch|Load failed/i.test(text))){
      put('\nThe compiler service is not reachable. C, C++ and Java run through /api/run on Vercel.\n','i');meta={status:null,ms:null,mem:null};
      window.drake&&drake.say('I cannot reach the compiler service, so I will read your code instead.');window.drake&&drake.check(true)
    }else{State.lastErr=text;PROBS.run=parseProblems(text,entry);const ls=PROBS.run.filter(p=>p.file===activeFile().name).map(p=>p.line);markLines(ls);window.drake&&drake.react('bad',text)}
  }
  setMeter(meta||{});renderProblems();
  tlog(State.lastErr?`[exit ${meta&&meta.status!=null?meta.status:1}] ${PROBS.run.length} problem${PROBS.run.length===1?'':'s'}`:`[exit ${meta&&meta.status!=null?meta.status:0}] done${meta&&meta.ms!=null?' in '+(meta.ms>999?(meta.ms/1000).toFixed(2)+'s':Math.round(meta.ms)+'ms'):''}`,State.lastErr?'bad':'ok');
  if(State.lastErr&&PROBS.run.length&&$('#p-out').hidden===false){/* stay on Output, badge shows on Problems */}
  running=false;b.disabled=false;
}
$('#run').onclick=()=>runCode();
/* ---------- save, open, share (MongoDB, with a browser fallback) ---------- */
let cur={id:null,title:''};
function owner(){let o=store.get('ce-owner');if(!o){o=(crypto.randomUUID?crypto.randomUUID():'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,10));store.set('ce-owner',o)}return o}
function setStatus(t,ok){const s=$('#status');s.textContent=t;s.className=ok?'ok':''}
async function api(method,qs,body){
  const r=await fetch('/api/snippets'+(qs||''),{method,headers:{'Content-Type':'application/json','X-Owner':owner()},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j;
}
const local={all(){try{return JSON.parse(store.get('ce-local')||'[]')}catch(e){return[]}},put(a){store.set('ce-local',JSON.stringify(a))}};
const projectFiles=()=>WS.files.map(f=>({name:f.name,code:codeOf(f)}));
function projLang(){const l=langOfName(activeFile().name);return l==='text'?'python':l}
async function saveProject(title){
  const body={id:cur.id&&!String(cur.id).startsWith('L')?cur.id:null,title,lang:projLang(),files:projectFiles(),activeName:activeFile().name};
  try{const j=await api('POST','',body);cur={id:j.id,title};setStatus('SAVED TO MONGODB \u00b7 '+title.toUpperCase(),true);toast('Saved to MongoDB');return j.id}
  catch(e){const a=local.all();const id=cur.id&&String(cur.id).startsWith('L')?cur.id:'L'+Date.now();const i=a.findIndex(x=>x.id===id);
    const item={id,title,lang:body.lang,files:body.files,updatedAt:new Date().toISOString()};if(i>=0)a[i]=item;else a.unshift(item);local.put(a);
    cur={id,title};setStatus('SAVED IN THIS BROWSER \u00b7 '+title.toUpperCase(),true);toast('Database offline. Saved in this browser.');return null}
}
function openSave(){$('#title').value=cur.title||'';$('#saveDlg').hidden=false;setTimeout(()=>$('#title').focus(),30)}
$('#save').onclick=openSave;$('#saveCancel').onclick=()=>$('#saveDlg').hidden=true;
$('#saveForm').onsubmit=async e=>{e.preventDefault();const t=$('#title').value.trim()||('Project '+new Date().toLocaleDateString());$('#saveDlg').hidden=true;await saveProject(t)};
async function listAll(){let remote=[],err=null;try{remote=(await api('GET')).items||[]}catch(e){err=e}
  return{items:[...remote.map(x=>({...x,src:'db'})),...local.all().map(x=>({...x,src:'local',fileCount:x.files?x.files.length:1}))],err}}
function openProject(item,id){
  const files=item.files&&item.files.length?item.files:[{name:'main.'+LANGS[item.lang||'python'].ext,code:item.code||''}];
  loadWorkspace(files,files[0].name);cur={id:id||null,title:item.title||''};setStatus('LOADED \u00b7 '+String(item.title||'').toUpperCase(),true);window.drake&&drake.say(`Opened <b>${esc(item.title||'project')}</b> (${files.length} file${files.length>1?'s':''}).`)}
async function openMine(){
  $('#mineDlg').hidden=false;const box=$('#mineList');box.innerHTML='<div class="empty">LOADING...</div>';
  const{items,err}=await listAll();
  if(!items.length){box.innerHTML='<div class="empty">NO SAVED PROJECTS YET.<br>PRESS SAVE TO KEEP YOUR WORK.'+(err?'<br>(DATABASE: '+esc(err.message).toUpperCase()+')':'')+'</div>';return}
  box.innerHTML='';
  items.forEach(it=>{const d=document.createElement('div');d.className='item';
    d.innerHTML=`<div><b>${esc(it.title)}</b><small>${it.fileCount||1} FILE${(it.fileCount||1)>1?'S':''} \u00b7 ${new Date(it.updatedAt).toLocaleDateString()} \u00b7 ${it.src==='db'?'MONGODB':'BROWSER'}</small></div><div class="row"><button class="op">OPEN</button><button class="del">DEL</button></div>`;
    d.querySelector('.op').onclick=async()=>{try{const item=it.src==='db'?(await (await fetch('/api/snippets?id='+encodeURIComponent(it.id))).json()).item:it;if(!item)throw new Error('Not found');openProject(item,it.id);$('#mineDlg').hidden=true}catch(e){toast('Could not open: '+e.message)}};
    d.querySelector('.del').onclick=async()=>{try{if(it.src==='db')await api('DELETE','?id='+encodeURIComponent(it.id));else local.put(local.all().filter(x=>x.id!==it.id));d.remove();if(cur.id===it.id){cur={id:null,title:''};setStatus('UNSAVED')}toast('Deleted')}catch(e){toast('Delete failed: '+e.message)}};
    box.appendChild(d)});
}
$('#mine').onclick=openMine;$('#mineClose').onclick=()=>$('#mineDlg').hidden=true;
document.querySelectorAll('.veil[id]').forEach(v=>v.addEventListener('mousedown',e=>{if(e.target===v)v.hidden=true}));
addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.veil[id]').forEach(v=>v.hidden=true)});
$('#share').onclick=async()=>{
  try{const t=cur.title||('Shared '+LANGS[projLang()].name);const dbId=cur.id&&!String(cur.id).startsWith('L')?cur.id:null;
    const j=await api('POST','',{id:dbId,title:t,lang:projLang(),files:projectFiles(),activeName:activeFile().name});cur={id:j.id,title:t};setStatus('SAVED TO MONGODB \u00b7 '+t.toUpperCase(),true);
    const url=location.origin+location.pathname+'?s='+j.id;try{await navigator.clipboard.writeText(url);toast('Share link copied')}catch(e){toast(url)}
  }catch(e){toast('Sharing needs the database. Set MONGODB_URI on Vercel.')}
};
function loadShared(){const sid=new URLSearchParams(location.search).get('s');if(!sid)return;
  fetch('/api/snippets?id='+encodeURIComponent(sid)).then(r=>r.json()).then(j=>{if(!j.item)throw 0;openProject(j.item,null);setStatus('SHARED \u00b7 '+String(j.item.title).toUpperCase());toast('Loaded shared project: '+j.item.title)}).catch(()=>toast('Shared project not found'))}
/* ---------- bridge for the add-on modules (viz.js, github.js, collab.js) ---------- */
const Tools={list:{},add(name,fn){this.list[name]=fn},
  run(name){const fn=this.list[name];if(fn)fn();else toast(name+' did not load. Check your connection and reload.')}};
const Files={
  add(name,code){const f=addFile(name,code);return f?f.name:null},
  current(){const f=activeFile();return f?{name:f.name,lang:langOfName(f.name),code:codeOf(f)}:null},
  all(){return WS.files.map(f=>({name:f.name,lang:langOfName(f.name),code:codeOf(f)}))},
  replace(name,text){const f=byName(name);if(f&&codeOf(f)!==text)f.doc.setValue(text)}
};
window.Tools=Tools;window.Files=Files;
addEventListener('ce-files',()=>dispatchEvent(new Event('filechange')));
addEventListener('ce-active',()=>dispatchEvent(new Event('filechange')));
$('#viz').onclick=()=>Tools.run('Algorithm Visualizer');
$('#gh').onclick=()=>Tools.run('GitHub');
$('#live').onclick=()=>Tools.run('Multiplayer');
/* ---------- boot ---------- */
(function boot(){
  let ws=null;try{ws=JSON.parse(store.get('ce-ws')||'null')}catch(e){}
  const files=ws&&Array.isArray(ws.files)&&ws.files.length?ws.files.filter(f=>f&&NAME_RE.test(f.name)).slice(0,20):seedFiles();
  loadWorkspace(files.length?files:seedFiles(),ws&&ws.active);
  setMode(store.get('ce-mode')||'dark');if(store.get('ce-focus')==='1')setFocus(true,true);
  $('#draft').textContent='';loadShared();
})();
