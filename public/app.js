/* Code Editor by Karan Sharma: editor, runners, themes, save to MongoDB (with local fallback). */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const LANGS={c:{name:'C',file:'main.c',mode:'text/x-csrc'},cpp:{name:'C++',file:'main.cpp',mode:'text/x-c++src'},java:{name:'Java',file:'Main.java',mode:'text/x-java'},
 python:{name:'Python',file:'main.py',mode:'python'},js:{name:'JavaScript',file:'script.js',mode:'javascript'},html:{name:'HTML',file:'index.html',mode:'htmlmixed'}};
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
const docs={};let lang='python';const State={lastErr:''};
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
function toast(t){const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2600)}
/* editor */
const cm=CodeMirror.fromTextArea($('#code'),{theme:'ce',lineNumbers:true,matchBrackets:true,autoCloseBrackets:true,styleActiveLine:true,indentUnit:4,tabSize:4,
  extraKeys:{Tab:c=>c.somethingSelected()?c.indentSelection('add'):c.replaceSelection('    '),'Ctrl-Enter':()=>runCode(),'Cmd-Enter':()=>runCode(),'Ctrl-S':()=>openSave(),'Cmd-S':()=>openSave()}});
function clearMarks(){for(let i=0;i<cm.lineCount();i++)cm.removeLineClass(i,'background','errline')}
function markLines(ls){clearMarks();ls.forEach(n=>{if(n>=1&&n<=cm.lineCount())cm.addLineClass(n-1,'background','errline')})}
cm.on('change',()=>{if(cur.id||cur.title)setStatus('UNSAVED CHANGES')});
function setLang(l,keep){
  if(!keep)docs[lang]=cm.getValue();lang=l;store.set('ce-lang',l);$('#lang').value=l;cm.setOption('mode',LANGS[l].mode);
  if(!keep)cm.setValue(docs[l]!==undefined?docs[l]:(store.get('ce-draft-'+l)||SAMPLES[l]));$('#fname').textContent=LANGS[l].file;clearMarks();
  $('#t-prev').hidden=l!=='html';showTab('out');if(l==='html')runCode(true);
}
$('#lang').onchange=e=>{cur={id:null,title:''};setStatus('UNSAVED');setLang(e.target.value);window.drake&&drake.say(`Switched to <b>${LANGS[lang].name}</b>.`)};
/* tabs / output */
function showTab(t){const o=t==='out';$('#p-out').hidden=!o;$('#p-prev').hidden=o;$('#t-out').setAttribute('aria-selected',o);$('#t-prev').setAttribute('aria-selected',!o)}
$('#t-out').onclick=()=>showTab('out');$('#t-prev').onclick=()=>showTab('prev');
const out=$('#out');
function put(s,c){const sp=document.createElement('span');if(c)sp.className=c;sp.innerHTML=esc(s);out.appendChild(sp);$('#p-out').scrollTop=1e9}
/* themes */
const MODES=[['dark','Dark'],['light','Light'],['neon','Neon'],['cyberpunk','Cyberpunk'],['zen','Zen']];
function setMode(m){const i=Math.max(0,MODES.findIndex(x=>x[0]===m));document.documentElement.dataset.mode=MODES[i][0];$('#themeName').textContent=MODES[i][1];
  store.set('ce-mode',MODES[i][0]);document.querySelector('meta[name=theme-color]').content=getComputedStyle(document.body).backgroundColor;dispatchEvent(new Event('modechange'))}
$('#theme').onclick=()=>{const i=MODES.findIndex(x=>x[0]===document.documentElement.dataset.mode);setMode(MODES[(i+1)%MODES.length][0]);window.drake&&drake.say(`<b>${$('#themeName').textContent}</b> mode on.`)};
/* JS / HTML sandbox */
const BRIDGE=`<script>(function(){function s(t,a){try{parent.postMessage({ce:1,t:t,m:a.map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}}
['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){s(k,[].slice.call(arguments));o.apply(console,arguments)}});
window.onerror=function(m,u,l){s('err',[m+(l&&OFF>=0?' (line '+(l-OFF)+')':'')]);return true};
window.addEventListener('unhandledrejection',function(e){s('err',['Unhandled promise: '+(e.reason&&e.reason.message||e.reason)])});})();<\/script>`;
let jsTimer;
addEventListener('message',e=>{const d=e.data;if(!d||!d.ce)return;
  if(d.t==='err'){put(d.m+'\n','e');State.lastErr=d.m;const m=/line (\d+)/.exec(d.m);if(m)markLines([+m[1]]);window.drake&&drake.react('bad',d.m)}
  else put(d.m+'\n',d.t==='warn'?'i':d.t==='error'?'e':'')});
function runJS(code,isHtml){
  if(isHtml){const pre=BRIDGE.replace('OFF','-1');$('#prev').srcdoc=/<head[^>]*>/i.test(code)?code.replace(/<head[^>]*>/i,m=>m+pre):pre+code;showTab('prev');put('HTML rendered in the Preview tab.\n','i');return Promise.resolve()}
  const f=document.createElement('iframe');f.sandbox='allow-scripts';f.style.display='none';
  f.srcdoc='<!doctype html><body>'+BRIDGE.replace('OFF','4')+'<script>\n'+code.replace(/<\/script>/gi,'<\\/script>')+'\n<\/script>';document.body.appendChild(f);
  return new Promise(r=>{clearTimeout(jsTimer);f.onload=()=>setTimeout(r,200);jsTimer=setTimeout(()=>f.remove(),5000)});
}
async function runPy(code){
  const lines=($('#stdin').value||'').split('\n');let li=0;
  Sk.configure({output:t=>put(t),read:x=>{if(!Sk.builtinFiles||!Sk.builtinFiles.files[x])throw "File not found: '"+x+"'";return Sk.builtinFiles.files[x]},
    inputfun:p=>{put(p||'');const v=li<lines.length?lines[li++]:'';put(v+'\n','i');return v},__future__:Sk.python3,execLimit:8000});
  await Sk.misceval.asyncToPromise(()=>Sk.importMainWithBody('<stdin>',false,code,true));
}
async function runRemote(kind,code){
  put('Compiling...\n','i');
  const r=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang:kind,code,stdin:$('#stdin').value||''})});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Compiler service error');
  clearOutKeep();
  if(j.compiler_error){put(j.compiler_error,'e');throw {text:j.compiler_error}}
  if(j.program_output)put(j.program_output);
  if(j.program_error){put(j.program_error,'e');if(+j.status!==0)throw {text:j.program_error}}
  $('#exit').textContent='exit '+(j.status||0);
}
function clearOutKeep(){out.innerHTML=''}
function errLines(t){const s=new Set();let m;const r1=/[\w.]+\.(?:c|cpp|java|py)[:]?(\d+)/g;while((m=r1.exec(t)))s.add(+m[1]);const r2=/line (\d+)/gi;while((m=r2.exec(t)))s.add(+m[1]);return[...s]}
let running=false;
async function runCode(silent){
  if(running)return;running=true;const b=$('#run');b.disabled=true;State.lastErr='';$('#exit').textContent='';
  const T0=performance.now();const code=cm.getValue();out.innerHTML='';clearMarks();showTab(lang==='html'?'prev':'out');window.drake&&drake.setMood('think');
  try{
    if(lang==='js')await runJS(code,false);else if(lang==='html')await runJS(code,true);else if(lang==='python')await runPy(code);else await runRemote(lang,code);
    if(!State.lastErr&&!silent&&window.drake){drake.react('ok');burst($('#run'))}
  }catch(err){
    const text=err&&err.text?err.text:(err&&err.message?err.message:String(err));
    if(!(err&&err.text))put(text+'\n','e');
    if(!(err&&err.text)&&(err instanceof TypeError||/compiler service|Failed to fetch/i.test(text))){
      put('\nThe compiler service is not reachable. C, C++ and Java run through the /api/run function on Vercel.\n','i');
      window.drake&&drake.say('I cannot reach the compiler service, so I will read your code instead.');window.drake&&drake.check(true);
    }else{State.lastErr=text;markLines(errLines(text));window.drake&&drake.react('bad',text)}
  }
  if(lang==='python'||lang==='c'||lang==='cpp'||lang==='java'){const ms=Math.round(performance.now()-T0);$('#exit').textContent=($('#exit').textContent?$('#exit').textContent+' \u00b7 ':'')+(ms>999?(ms/1000).toFixed(1)+'s':ms+'ms')}
  running=false;b.disabled=false;
}
$('#run').onclick=()=>runCode();
/* ---------- save to MongoDB via /api/snippets (falls back to this browser) ---------- */
let cur={id:null,title:''};
function owner(){let o=store.get('ce-owner');if(!o){o=(crypto.randomUUID?crypto.randomUUID():'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,10));store.set('ce-owner',o)}return o}
function setStatus(t,ok){const s=$('#status');s.textContent=t;s.className=ok?'ok':''}
async function api(method,qs,body){
  const r=await fetch('/api/snippets'+(qs||''),{method,headers:{'Content-Type':'application/json','X-Owner':owner()},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j;
}
const local={all(){try{return JSON.parse(store.get('ce-local')||'[]')}catch(e){return[]}},put(a){store.set('ce-local',JSON.stringify(a))}};
async function saveSnippet(title){
  const body={id:cur.id,title,lang,code:cm.getValue()};
  try{const j=await api('POST','',body);cur={id:j.id,title};setStatus('SAVED TO MONGODB · '+title.toUpperCase(),true);toast('Saved to MongoDB')}
  catch(e){const a=local.all();const id=cur.id&&String(cur.id).startsWith('L')?cur.id:'L'+Date.now();const i=a.findIndex(x=>x.id===id);
    const item={id,title,lang,code:body.code,updatedAt:new Date().toISOString()};if(i>=0)a[i]=item;else a.unshift(item);local.put(a);
    cur={id,title};setStatus('SAVED IN THIS BROWSER · '+title.toUpperCase(),true);toast('Database offline. Saved in this browser.')}
}
function openSave(){$('#title').value=cur.title||'';$('#saveDlg').hidden=false;setTimeout(()=>$('#title').focus(),30)}
$('#save').onclick=openSave;$('#saveCancel').onclick=()=>$('#saveDlg').hidden=true;
$('#saveForm').onsubmit=async e=>{e.preventDefault();const t=$('#title').value.trim()||('Untitled '+LANGS[lang].name);$('#saveDlg').hidden=true;await saveSnippet(t)};
async function listAll(){let remote=[],err=null;try{remote=(await api('GET')).items||[]}catch(e){err=e}
  return{items:[...remote.map(x=>({...x,src:'db'})),...local.all().map(x=>({...x,src:'local'}))],err}}
async function openMine(){
  $('#mineDlg').hidden=false;const box=$('#mineList');box.innerHTML='<div class="empty">LOADING...</div>';
  const{items,err}=await listAll();
  if(!items.length){box.innerHTML='<div class="empty">NO SAVED CODE YET.<br>PRESS SAVE TO KEEP YOUR WORK.'+(err?'<br>(DATABASE: '+esc(err.message).toUpperCase()+')':'')+'</div>';return}
  box.innerHTML='';
  items.forEach(it=>{const d=document.createElement('div');d.className='item';
    d.innerHTML=`<div><b>${esc(it.title)}</b><small>${esc((LANGS[it.lang]||{}).name||it.lang)} · ${new Date(it.updatedAt).toLocaleDateString()} · ${it.src==='db'?'MONGODB':'BROWSER'}</small></div><div class="row"><button class="op">OPEN</button><button class="del">DEL</button></div>`;
    d.querySelector('.op').onclick=()=>{docs[lang]=cm.getValue();setLang(it.lang,true);cm.setValue(it.code);docs[it.lang]=it.code;cur={id:it.id,title:it.title};$('#mineDlg').hidden=true;setStatus('LOADED · '+it.title.toUpperCase(),true);window.drake&&drake.say(`Opened <b>${esc(it.title)}</b>.`)};
    d.querySelector('.del').onclick=async()=>{try{if(it.src==='db')await api('DELETE','?id='+encodeURIComponent(it.id));else local.put(local.all().filter(x=>x.id!==it.id));d.remove();if(cur.id===it.id){cur={id:null,title:''};setStatus('UNSAVED')}toast('Deleted')}catch(e){toast('Delete failed: '+e.message)}};
    box.appendChild(d)});
}
$('#mine').onclick=openMine;$('#mineClose').onclick=()=>$('#mineDlg').hidden=true;
document.querySelectorAll('.veil').forEach(v=>v.addEventListener('mousedown',e=>{if(e.target===v)v.hidden=true}));
addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.veil').forEach(v=>v.hidden=true)});
/* boot */
lang=LANGS[store.get('ce-lang')]?store.get('ce-lang'):'python';$('#lang').value=lang;cm.setOption('mode',LANGS[lang].mode);
cm.setValue(store.get('ce-draft-'+lang)||SAMPLES[lang]);$('#fname').textContent=LANGS[lang].file;$('#t-prev').hidden=lang!=='html';setMode(store.get('ce-mode')||'dark');

/* ---------- motion helpers ---------- */
document.querySelectorAll('[data-split]').forEach(el=>{const t=el.textContent;el.textContent='';el.setAttribute('aria-label',t);
  [...t].forEach((ch,i)=>{const s=document.createElement('span');s.className='ch'+(ch===' '?' sp':'');s.style.setProperty('--i',i);s.setAttribute('aria-hidden','true');s.textContent=ch===' '?'\u00a0':ch;el.appendChild(s)})});
const trk=$('#track');if(trk)trk.innerHTML+=trk.innerHTML;
(function typer(){const words=['WRITE C, C++ AND JAVA','RUN PYTHON IN YOUR BROWSER','PREVIEW HTML LIVE','LET DRAKE FIX YOUR BUGS','SAVE TO MONGODB'];const el=$('#typed');let w=0,i=0,del=false;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=words[0];return}
  (function tick(){if(document.documentElement.dataset.focus==='1'){setTimeout(tick,600);return}const s=words[w];i+=del?-1:1;el.textContent=s.slice(0,i);let d=del?28:70;
    if(!del&&i===s.length){del=true;d=1400}else if(del&&i===0){del=false;w=(w+1)%words.length;d=300}setTimeout(tick,d)})()})();
function burst(el){if(document.documentElement.dataset.focus==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches||!el.animate)return;const r=el.getBoundingClientRect(),cs=['#ee6a7c','#f7d154','#6fdcff','#5cf2a0'];
  for(let i=0;i<18;i++){const p=document.createElement('i');p.className='spark';p.style.cssText=`left:${r.left+r.width/2}px;top:${r.top+r.height/2}px;background:${cs[i%4]}`;document.body.appendChild(p);
    const a=Math.random()*6.283,d=40+Math.random()*70;p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d+30}px) scale(.2)`,opacity:0}],{duration:700+Math.random()*300,easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish=()=>p.remove()}}

/* ---------- v3 features ---------- */
const focusOn=()=>document.documentElement.dataset.focus==='1';
function setFocus(on,quiet){document.documentElement.dataset.focus=on?'1':'0';const b=$('#focus');b.setAttribute('aria-pressed',on);b.textContent=on?'Focus: On':'Focus';store.set('ce-focus',on?'1':'0');
  dispatchEvent(new Event('focuschange'));setTimeout(()=>cm.refresh(),30);if(!quiet)toast(on?'Focus mode on. Animations paused.':'Focus mode off.')}
$('#focus').onclick=()=>setFocus(!focusOn());
addEventListener('keydown',e=>{if(((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='f')||(e.altKey&&e.code==='KeyZ')){e.preventDefault();setFocus(!focusOn())}});
if(store.get('ce-focus')==='1')setFocus(true,true);
/* font size */
let fsz=+store.get('ce-fs')||13.5;function applyFs(){cm.getWrapperElement().style.fontSize=fsz+'px';cm.refresh();store.set('ce-fs',fsz)}
$('#fminus').onclick=()=>{fsz=Math.max(10,fsz-1);applyFs()};$('#fplus').onclick=()=>{fsz=Math.min(26,fsz+1);applyFs()};applyFs();
/* download / reset / copy */
$('#dl').onclick=()=>{try{const b=new Blob([cm.getValue()],{type:'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=LANGS[lang].file;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);toast('Downloaded '+LANGS[lang].file)}catch(e){toast('Download is blocked in this view')}};
$('#rs').onclick=()=>{cm.setValue(SAMPLES[lang]);clearMarks();toast('Sample restored')};
$('#copyOut').onclick=async()=>{try{await navigator.clipboard.writeText(out.textContent);toast('Output copied')}catch(e){toast('Could not copy. Select the text instead.')}};
/* autosave draft */
let draftT;cm.on('change',()=>{clearTimeout(draftT);draftT=setTimeout(()=>store.set('ce-draft-'+lang,cm.getValue()),400)});
/* share link (needs MongoDB) */
$('#share').onclick=async()=>{
  try{
    const t=cur.title||('Shared '+LANGS[lang].name);const dbId=cur.id&&!String(cur.id).startsWith('L')?cur.id:null;
    const j=await api('POST','',{id:dbId,title:t,lang,code:cm.getValue()});cur={id:j.id,title:t};setStatus('SAVED TO MONGODB \u00b7 '+t.toUpperCase(),true);
    const url=location.origin+location.pathname+'?s='+j.id;
    try{await navigator.clipboard.writeText(url);toast('Share link copied')}catch(e){toast(url)}
  }catch(e){toast('Sharing needs the database. Set MONGODB_URI on Vercel.')}
};
(function loadShared(){const sid=new URLSearchParams(location.search).get('s');if(!sid)return;
  fetch('/api/snippets?id='+encodeURIComponent(sid)).then(r=>r.json()).then(j=>{if(!j.item)throw 0;const it=j.item;setLang(it.lang,true);cm.setValue(it.code);cur={id:null,title:''};setStatus('SHARED CODE \u00b7 '+String(it.title).toUpperCase());toast('Loaded shared code: '+it.title);window.drake&&drake.say(`Opened shared code <b>${esc(it.title)}</b>. Saving makes your own copy.`)}).catch(()=>toast('Shared code not found'))})();

/* clear output, status bar, draft indicator */
$('#clrOut').onclick=()=>{out.innerHTML='<span class="i">Output cleared.</span>';$('#exit').textContent=''};
function sbar(){const p=cm.getCursor();$('#pos').textContent=`Ln ${p.line+1}, Col ${p.ch+1}`;const v=cm.getValue();$('#cnt').textContent=`${cm.lineCount()} lines \u00b7 ${v.length} chars`}
cm.on('cursorActivity',sbar);cm.on('change',sbar);sbar();
cm.on('change',()=>{$('#draft').textContent='';clearTimeout(sbar.t);sbar.t=setTimeout(()=>{$('#draft').textContent='DRAFT SAVED'},700)});
