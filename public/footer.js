/* Footer: a night scene like the portfolio. Textured Minecraft-style ground, constellation network,
   torches with embers, walking mobs you can slay, and a canvas you can draw on (strokes fade after a few seconds).
   Game layer: press Enter or click the player to play a 3-level platformer (ABOUT, SKILLS, WORK). Off by default. */
(function(){
const gstore=(typeof store!=='undefined'&&store&&store.get)?store:{get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const say=m=>{try{if(typeof toast==='function')toast(m)}catch(e){}};
const cv=document.getElementById('fcv'),ctx=cv.getContext('2d'),foot=document.getElementById('footer'),slainEl=document.getElementById('slain');
const root=document.documentElement;
let W=0,H=0,dpr=1,C={},visible=true,GY=0,groundCv=null,nodes=[],ptr=null;
const t0=performance.now();
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const focusOn=()=>root.dataset.focus==='1';
const tok=n=>getComputedStyle(root).getPropertyValue(n).trim()||'#888';
function readTokens(){C={c1:tok('--c1'),c2:tok('--c2'),c3:tok('--c3'),fg:tok('--fg'),bg:tok('--bg'),line:tok('--line'),ok:tok('--ok')}}
function hash(x,y){let h=(x*374761393+y*668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return(((h^(h>>>16))>>>0)%10000)/10000}
function shade(hex,d){const n=parseInt(hex.slice(1),16),f=1+d,cl=v=>Math.max(0,Math.min(255,v*f))|0;return`rgb(${cl(n>>16&255)},${cl(n>>8&255)},${cl(n&255)})`}
function prect(c,x,y,w,h,col,u,amt,seed){for(let j=0;j<h;j+=u)for(let i=0;i<w;i+=u){c.fillStyle=shade(col,(hash(((x+i)/u|0)+(seed||0),((y+j)/u|0))-.5)*(amt==null?.2:amt));c.fillRect(x+i,y+j,Math.min(u,w-i),Math.min(u,h-j))}}
function mk(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;fn(x);return c}
/* ---------- sprites (textured, built once) ---------- */
const KINDS={creeper:{w:32,h:68,sp:.3},skeleton:{w:33,h:66,sp:.45},pig:{w:60,h:32,sp:.28}};
const SP={};
function buildSprites(){
  SP.creeper=[0,1].map(step=>mk(32,68,x=>{const G='#5cb04c',D='#0f1a0f',u=4;
    prect(x,0,0,32,32,G,u,.3,1);
    [[1,2],[2,2],[1,3],[2,3],[5,2],[6,2],[5,3],[6,3],[3,4],[4,4],[2,5],[3,5],[4,5],[5,5],[2,6],[5,6]].forEach(p=>{x.fillStyle=D;x.fillRect(p[0]*u,p[1]*u,u,u)});
    prect(x,8,32,16,24,G,u,.3,7);
    prect(x,0,56,12,step?12:8,G,u,.3,11);prect(x,20,56,12,step?8:12,G,u,.3,13)}));
  SP.skeleton=[0,1].map(step=>mk(33,66,x=>{const B='#d9d9cf',D='#2b2b2b',o=3;
    prect(x,o,0,24,24,B,3,.2,21);x.fillStyle=D;
    [[1,3],[2,3],[1,4],[2,4],[5,3],[6,3],[5,4],[6,4]].forEach(p=>x.fillRect(o+p[0]*3,p[1]*3,3,3));x.fillRect(o+6,18,12,3);
    prect(x,o+6,24,12,21,B,3,.2,23);x.fillStyle=D;[1,3,5].forEach(r=>x.fillRect(o+6,24+r*3,12,3));
    prect(x,o+3,24,3,18,B,3,.2,25);prect(x,o+18,24,3,18,B,3,.2,26);
    prect(x,o+6,45,6,step?21:18,B,3,.2,27);prect(x,o+12,45,6,step?18:21,B,3,.2,28);
    x.fillStyle='#8a5a2b';x.fillRect(27,21,6,3);x.fillRect(30,24,3,18);x.fillRect(27,42,6,3);x.fillStyle='#e8e8e8';x.fillRect(27,24,1,18)}));
  SP.pig=[0,1].map(step=>mk(60,32,x=>{const P='#f2a3b0',L='#d9808c',u=4;
    prect(x,2,20,6,step?12:8,L,u,.14,41);prect(x,30,20,6,step?12:8,L,u,.14,42);
    prect(x,10,20,6,step?8:12,L,u,.14,43);prect(x,22,20,6,step?8:12,L,u,.14,44);
    prect(x,0,0,36,20,P,u,.16,31);prect(x,36,4,16,16,P,u,.16,33);prect(x,38,0,6,4,L,u,.12,34);
    prect(x,52,10,8,8,'#e88c9c',u,.12,35);x.fillStyle='#8a3d4a';x.fillRect(54,13,2,3);x.fillRect(58,13,2,3);
    x.fillStyle='#ffffff';x.fillRect(44,8,4,4);x.fillStyle='#3a2a6a';x.fillRect(46,8,2,4)}));
  /* player: dark hair, shades, coral headset, black suit (frames: 0 stand/walk A, 1 walk B, 2 jump) */
  SP.player=[0,1,2].map(f=>mk(24,48,x=>{const u=3,HAIR='#1a1630',SKIN='#e0b48a',SUIT='#15131f',SHIRT='#f3efe6',CUP='#ee6a7c';
    prect(x,0,0,24,9,HAIR,u,.25,61);prect(x,3,9,18,12,SKIN,u,.12,62);
    prect(x,0,9,3,6,HAIR,u,.25,63);prect(x,21,9,3,6,HAIR,u,.25,64);
    x.fillStyle='#050505';x.fillRect(3,12,18,3);x.fillStyle='#4a4a66';x.fillRect(5,12,3,1);x.fillRect(14,12,3,1);
    x.fillStyle=CUP;x.fillRect(0,12,3,9);x.fillRect(21,12,3,9);x.fillRect(0,6,24,1);
    x.fillStyle='#ffffff';x.fillRect(9,18,6,3);prect(x,9,21,6,3,SKIN,u,.1,65);
    prect(x,3,24,18,15,SUIT,u,.15,66);x.fillStyle=SHIRT;x.fillRect(9,24,6,9);x.fillStyle=CUP;x.fillRect(11,27,2,9);
    if(f===2){prect(x,0,15,3,15,SUIT,u,.15,67);prect(x,21,15,3,15,SUIT,u,.15,68);x.fillStyle=SKIN;x.fillRect(0,12,3,3);x.fillRect(21,12,3,3)}
    else{prect(x,0,24,3,12,SUIT,u,.15,67);prect(x,21,24,3,12,SUIT,u,.15,68);x.fillStyle=SKIN;x.fillRect(0,36,3,3);x.fillRect(21,36,3,3)}
    const l=f===2?6:(f?6:9),r=f===2?6:(f?9:6);
    prect(x,4,39,8,l,'#0f0d18',u,.12,69);prect(x,13,39,8,r,'#0f0d18',u,.12,70);
    x.fillStyle='#050505';x.fillRect(4,39+l-3,8,3);x.fillRect(13,39+r-3,8,3)}));
  /* little robot for the 'drake' easter egg */
  SP.robot=[0,1].map(s=>mk(24,42,x=>{const B='#6fdcff',D='#14102a',Y='#f7d154',R='#ee6a7c';
    x.fillStyle=Y;x.fillRect(10,0,4,3);x.fillStyle=D;x.fillRect(11,3,2,3);prect(x,3,6,18,18,B,3,.15,71);
    x.fillStyle=Y;x.fillRect(0,9,3,9);x.fillRect(21,9,3,9);x.fillStyle=D;x.fillRect(6,9,12,12);
    x.fillStyle='#fff';x.fillRect(9,12,3,3);x.fillRect(15,12,3,3);x.fillRect(9,18,6,2);
    prect(x,6,24,12,9,R,3,.15,72);x.fillStyle=D;x.fillRect(10,27,4,3);
    x.fillStyle='#2a2550';x.fillRect(6,33,4,s?9:6);x.fillRect(14,33,4,s?6:9)}));
}
/* ---------- ground texture (pre-rendered) ---------- */
function buildGround(){
  const p=4,rows=Math.ceil((H-GY)/p),cols=Math.ceil(W/p);
  groundCv=mk(Math.max(1,W),Math.max(1,H-GY),x=>{
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const h=hash(c,r+300);let col,amt=.2;
      if(r<2){col=r===0?'#7cc455':'#5fae3d'}
      else if(r===2&&hash(c,5)>.4){col='#5fae3d'}
      else if(r===3&&hash(c,6)>.78){col='#4f9a35'}
      else{col='#7a5532';if(h<.07)col='#5f3f22';else if(h<.12)col='#8c6840';else if(h>.97)col='#8a8a8a'}
      x.fillStyle=shade(col,(hash(c,r)-.5)*amt);x.fillRect(c*p,r*p,p,p)}
    x.fillStyle='rgba(0,0,0,.18)';for(let c=0;c<cols;c+=4)x.fillRect(c*p,8,1,H-GY);for(let r=4;r<rows;r+=4)x.fillRect(0,r*p,W,1);
    x.fillStyle='rgba(0,0,0,.35)';x.fillRect(0,0,W,1)});
}
function resize(){
  const r=foot.getBoundingClientRect();dpr=Math.min(2,devicePixelRatio||1);W=Math.max(1,r.width);H=Math.max(1,r.height);
  cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
  GY=H-48;buildGround();initNodes();mobs.forEach(m=>{m.x=Math.min(Math.max(m.x,50),W-50)});
  G.px=Math.max(22,Math.min(W-22,G.px));G.py=GY+3;G.vy=0;G.onGround=true;dyn.forEach(c=>{c.x=Math.min(Math.max(c.x,20),W-20);c.y=Math.min(c.y,GY-9)});layout();
}
addEventListener('resize',resize);
addEventListener('modechange',()=>{readTokens();day=root.dataset.mode==='light';render(performance.now())});
addEventListener('focuschange',()=>{if(focusOn())stopGame();render(performance.now());kick()});
let slain=0;try{slain=+localStorage.getItem('ce-slain')||0}catch(e){}slainEl.textContent=slain;
/* ---------- mobs ---------- */
const mobs=[],pops=[],embers=[];
function spawn(kind,x){const k=KINDS[kind];mobs.push({kind,x,dir:Math.random()<.5?-1:1,sp:k.sp*(.8+Math.random()*.5),ph:Math.random()*10})}
function drawMob(m,t){
  const k=KINDS[m.kind],step=Math.floor(t/260+m.ph)%2,spr=SP[m.kind][step],y=Math.round(GY-k.h+3);
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(Math.round(m.x-k.w/2),GY,k.w,4);
  if(m.kind!=='creeper'&&m.dir<0){ctx.save();ctx.translate(Math.round(m.x),0);ctx.scale(-1,1);ctx.drawImage(spr,-Math.round(k.w/2),y);ctx.restore()}
  else ctx.drawImage(spr,Math.round(m.x-k.w/2),y);
}
function slay(m){
  const k=KINDS[m.kind];for(let i=0;i<18;i++)pops.push({x:m.x+(Math.random()-.5)*k.w,y:GY-k.h/2+(Math.random()-.5)*k.h*.7,vx:(Math.random()-.5)*3,vy:-Math.random()*3-1,t:0,c:['#e8e8e8','#bdbdbd','#9a9a9a',C.c2][i%4]});
  mobs.splice(mobs.indexOf(m),1);slain++;slainEl.textContent=slain;try{localStorage.setItem('ce-slain',slain)}catch(e){}updatePanel();
  const ks=Object.keys(KINDS);setTimeout(()=>{spawn(ks[Math.floor(Math.random()*3)],Math.random()<.5?60:W-60);kick()},900);
}
function hitMob(x,y){for(const m of mobs){const k=KINDS[m.kind];if(Math.abs(x-m.x)<k.w/2+6&&y>GY-k.h-6&&y<GY+6)return m}return null}
/* ---------- drawing ---------- */
const dots=[];let down=false,last=null,ci=0;
function addDot(x,y,life,s){dots.push({x:Math.round(x/s)*s,y:Math.round(y/s)*s,s,t:performance.now(),life,c:ci++%3})}
function stroke(x,y,life,s){if(last){const dx=x-last.x,dy=y-last.y,n=Math.max(1,Math.floor(Math.hypot(dx,dy)/s));for(let i=1;i<=n;i++)addDot(last.x+dx*i/n,last.y+dy*i/n,life,s)}else addDot(x,y,life,s);last={x,y}}
function pos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
cv.addEventListener('pointerdown',e=>{if(focusOn()||G.active)return;const p=pos(e);if(hitCoinAt(p)){kick();return}const m=hitMob(p.x,p.y);if(m){slay(m);mood('wow');kick();return}
  if(hitTorch(p)){toggleDay();return}if(hitSpider(p)){dropBonus();return}if(hitPlayer(p)){startGame();return}down=true;last=null;try{cv.setPointerCapture(e.pointerId)}catch(_){}stroke(p.x,p.y,3500,10);kick()});
cv.addEventListener('pointermove',e=>{if(focusOn()||G.active)return;const p=pos(e);ptr={x:p.x,y:p.y};if(down)stroke(p.x,p.y,3500,10);else stroke(p.x,p.y,1000,5);kick()});
['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>{down=false;last=null}));
cv.addEventListener('pointerleave',()=>{ptr=null;if(!down)last=null});
/* ---------- ambient layers ---------- */
function initNodes(){const n=Math.min(54,Math.floor(W/26));nodes=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*Math.max(40,GY-80),vx:(Math.random()-.5)*.2,vy:(Math.random()-.5)*.2}))}
function net(move){
  const lim=Math.max(40,GY-80);ctx.lineWidth=1;
  for(let i=0;i<nodes.length;i++){const a=nodes[i];
    if(move){a.x+=a.vx;a.y+=a.vy;if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>lim)a.vy*=-1}
    for(let j=i+1;j<nodes.length;j++){const b=nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<140){ctx.globalAlpha=(1-d/140)*.2;ctx.strokeStyle=C.fg;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
    if(ptr){const d=Math.hypot(a.x-ptr.x,a.y-ptr.y);if(d<170){ctx.globalAlpha=(1-d/170)*.55;ctx.strokeStyle=C.c3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(ptr.x,ptr.y);ctx.stroke()}}
  }
  ctx.fillStyle=C.fg;nodes.forEach(a=>{ctx.globalAlpha=.55;ctx.fillRect(Math.round(a.x),Math.round(a.y),2,2)});ctx.globalAlpha=1;
}
function stars(t){ctx.fillStyle=C.fg;for(let i=0;i<36;i++){ctx.globalAlpha=.25+.4*Math.abs(Math.sin(t/1100+i*1.7));ctx.fillRect(Math.round(hash(i,1)*W),Math.round(hash(i,2)*(GY-90)),2,2)}ctx.globalAlpha=1}
function web(){ctx.strokeStyle=C.fg;ctx.globalAlpha=.28;ctx.lineWidth=1;const R=Math.min(250,W*.28);
  for(let i=0;i<=6;i++){const a=i/6*Math.PI/2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);ctx.stroke()}
  for(let r=1;r<=5;r++){ctx.beginPath();const rr=R*r/5;for(let i=0;i<=6;i++){const a=i/6*Math.PI/2,k=1-.06*Math.sin(i*2+r),x=Math.cos(a)*rr*k,y=Math.sin(a)*rr*k;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}ctx.globalAlpha=1}
const spiderLen=t=>60+Math.sin(t/2200)*45;
function spider(t){const x=W*.44,len=spiderLen(t);ctx.strokeStyle=C.fg;ctx.globalAlpha=.4;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,len);ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle='#2b2433';ctx.fillRect(x-6,len,12,8);ctx.fillStyle='#ff4d4d';ctx.fillRect(x-4,len+2,2,2);ctx.fillRect(x+2,len+2,2,2);ctx.fillStyle='#3a3046';for(let i=0;i<3;i++){ctx.fillRect(x-12-i*2,len+i*2,6,1);ctx.fillRect(x+6+i*2,len+i*2,6,1)}}
function torch(x,t,move){
  const fl=Math.floor(t/110+x)%3;if(!day){const g=ctx.createRadialGradient(x,GY-46,2,x,GY-46,90);g.addColorStop(0,'rgba(255,180,70,.30)');g.addColorStop(1,'rgba(255,180,70,0)');ctx.fillStyle=g;ctx.fillRect(x-100,GY-150,200,170)}
  prect(ctx,x-3,GY-34,6,34,'#7a4a21',3,.25,x|0);ctx.fillStyle='#ff9d2e';ctx.fillRect(x-4,GY-42,8,8);ctx.fillStyle='#ffe27a';ctx.fillRect(x-2,GY-46-fl,4,6);ctx.fillStyle='#fff6c8';ctx.fillRect(x-1,GY-49-fl,2,3);
  if(move&&Math.random()<.14)embers.push({x:x+(Math.random()-.5)*6,y:GY-46,vx:(Math.random()-.5)*.5,vy:-.5-Math.random()*.6,t:0});
}
const flies=Array.from({length:14},(_,i)=>({x:hash(i,7),y:hash(i,8),p:hash(i,9)*6,s:.0001+hash(i,10)*.0002}));
/* ---------- game layer: Karan the player, coins, 3 levels (ABOUT, SKILLS, WORK), easter eggs ---------- */
let day=false;
const G={active:false,state:'idle',px:140,py:0,vy:0,vx:0,onGround:true,face:1,lvl:1,coins:0,lvlCoins:0,step:0,cardT:0,hurtT:0,plats:[],pickups:[],gm:[]};
const dyn=[],fx=[],keys={l:false,r:false,j:false};
let robot=null,secret='',best=+gstore.get('ce-best')||0,total=+gstore.get('ce-coins')||0,unlocked=gstore.get('ce-gh')==='1';
const LEVELS=[
 {name:'ABOUT',card:'B.TECH STUDENT. BUILDER. LEARNING',plats:[[.2,50,110],[.43,80,110],[.66,58,110]],coins:[[.2,50],[.43,80],[.66,58],[.31,0],[.54,0],[.8,0]],mobs:[['skeleton',.56]]},
 {name:'SKILLS',card:'C . C++ . JAVA . PYTHON . JS . HTML',plats:[[.13,46,90],[.3,78,90],[.48,52,90],[.65,80,90],[.82,56,90]],coins:[[.13,46],[.3,78],[.48,52],[.65,80],[.82,56],[.22,0],[.57,0],[.9,0]],mobs:[['creeper',.4],['skeleton',.74]]},
 {name:'WORK',card:'ARCODE . PORTFOLIO . ARCADE',plats:[[.16,40,90],[.32,70,90],[.5,100,100],[.68,70,90],[.84,40,90]],coins:[[.16,40],[.32,70],[.5,100],[.68,70],[.84,40],[.25,0],[.6,0],[.92,0]],mobs:[['skeleton',.3],['creeper',.55],['skeleton',.78]]}
];
/* tiny sound effects (Web Audio, starts after the first click) */
let AC=null,sfxOn=gstore.get('ce-sfx')!=='0';
function beep(fr,d,type,vol,slide){if(!sfxOn)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain(),n=AC.currentTime;o.type=type||'square';o.frequency.setValueAtTime(fr,n);if(slide)o.frequency.exponentialRampToValueAtTime(slide,n+d);g.gain.setValueAtTime(vol||.04,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(n+d)}catch(e){}}
const SFX={coin(){beep(880,.08);setTimeout(()=>beep(1320,.12),70)},jump(){beep(300,.16,'square',.035,640)},stomp(){beep(220,.14,'sawtooth',.05,90)},hurt(){beep(170,.3,'sawtooth',.06,55)},start(){beep(440,.1);setTimeout(()=>beep(660,.1),90)},win(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.18),i*130))}};
const sfx=n=>{if(SFX[n])SFX[n]()};
const mood=m=>{try{window.drake&&drake.setMood&&drake.setMood(m)}catch(e){}};
const dsay=h=>{try{window.drake&&drake.say&&drake.say(h)}catch(e){}};
const hintEl=document.getElementById('hint'),ghLink=document.getElementById('ghLink');
const HINT_IDLE='CLICK THE PLAYER OR PRESS ENTER TO PLAY · TORCH: DAY / NIGHT · SPIDER: BONUS COIN · DRAG TO DRAW';
const HINT_PLAY='A / D OR ARROWS MOVE · W OR SPACE JUMP · STOMP MOBS · REACH THE FLAG · ESC QUITS · M MUTES';
function updatePanel(){
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('coins',G.coins);set('best',best);set('lvl',Math.min(G.lvl,LEVELS.length));set('slain',slain);
  if(!unlocked&&total>=5)unlockGh();
}
function unlockGh(){unlocked=true;gstore.set('ce-gh','1');if(ghLink){ghLink.classList.remove('locked');ghLink.textContent='GITHUB';ghLink.setAttribute('aria-label','GitHub')}say('GitHub link unlocked!');sfx('win')}
if(unlocked&&ghLink){ghLink.classList.remove('locked');ghLink.textContent='GITHUB'}
function layout(){
  const L=LEVELS[Math.min(G.lvl,LEVELS.length)-1],gnd=GY+3;
  G.plats=L.plats.map(p=>({x:p[0]*W,h:p[1],w:Math.min(p[2],W*.2)}));
  G.pickups=L.coins.map(c=>({x:c[0]*W,y:gnd-c[1]-26,got:false}));
  G.gm=L.mobs.map(m=>({kind:m[0],x:m[1]*W,x0:m[1]*W,dir:Math.random()<.5?-1:1,sp:KINDS[m[0]].sp*1.5,dead:false,ph:Math.random()*10}));
}
function addFx(x,y,txt,c){fx.push({x,y,t:0,txt,c:c||C.c2})}
function collect(n,x,y){G.coins+=n;total+=n;best=Math.max(best,G.coins);gstore.set('ce-coins',total);gstore.set('ce-best',best);addFx(x,y,'+'+n);sfx('coin');updatePanel()}
function startGame(){
  if(focusOn()){say('Turn off Focus mode to play.');return}
  G.active=true;G.state='play';G.lvl=1;G.coins=0;G.lvlCoins=0;G.px=40;G.py=GY+3;G.vy=0;G.onGround=true;G.hurtT=0;layout();
  foot.classList.add('playing');try{foot.scrollIntoView({behavior:'smooth',block:'end'})}catch(e){}if(hintEl)hintEl.textContent=HINT_PLAY;try{cv.focus({preventScroll:true})}catch(e){cv.focus()}
  sfx('start');mood('wow');updatePanel();kick();
}
function stopGame(){
  if(!G.active&&!foot.classList.contains('playing'))return;
  G.active=false;G.state='idle';keys.l=keys.r=keys.j=false;G.px=140;G.py=GY+3;G.vy=0;foot.classList.remove('playing');if(hintEl)hintEl.textContent=HINT_IDLE;G.lvl=1;layout();updatePanel();kick();
}
function restartLevel(){G.coins-=G.lvlCoins;G.lvlCoins=0;G.px=40;G.py=GY+3;G.vy=0;G.hurtT=60;layout();sfx('hurt');addFx(G.px,GY-60,'OUCH',C.c1);mood('sad');updatePanel()}
function levelDone(){
  best=Math.max(best,G.coins);gstore.set('ce-best',best);sfx('win');
  if(G.lvl>=LEVELS.length){G.state='win';G.cardT=260;mood('happy');dsay('You finished all 3 levels. Nice run!');if(!unlocked){total=Math.max(total,5);gstore.set('ce-coins',total)}updatePanel();spawnRobot()}
  else{G.state='card';G.cardT=140;mood('happy')}
  updatePanel();
}
function nextLevel(){G.lvl++;G.lvlCoins=0;G.state='play';G.px=40;G.py=GY+3;G.vy=0;layout();updatePanel()}
function spawnRobot(){if(robot)return;robot={x:-20,dir:1,t:0,said:false};mood('wow');kick()}
function stepGame(dt){
  if(G.state==='card'){G.cardT-=dt;if(G.cardT<=0)nextLevel();return}
  if(G.state==='win'){G.cardT-=dt;if(G.cardT<=0)stopGame();return}
  const gnd=GY+3,prev=G.py,ax=(keys.r?1:0)-(keys.l?1:0);
  G.vx=ax*3.2;if(ax)G.face=ax;
  if(keys.j&&G.onGround){G.vy=-11;G.onGround=false;sfx('jump')}
  G.vy+=.62*dt;G.px=Math.max(16,Math.min(W-16,G.px+G.vx*dt));G.py+=G.vy*dt;G.onGround=false;
  if(G.py>=gnd){G.py=gnd;G.vy=0;G.onGround=true}
  else if(G.vy>=0){for(const p of G.plats){const top=gnd-p.h;if(Math.abs(G.px-p.x)<p.w/2+8&&prev<=top+2&&G.py>=top){G.py=top;G.vy=0;G.onGround=true;break}}}
  G.step+=Math.abs(G.vx)*dt*.1;if(G.hurtT>0)G.hurtT-=dt;
  for(const c of G.pickups)if(!c.got&&Math.abs(G.px-c.x)<18&&Math.abs((G.py-24)-c.y)<32){c.got=true;G.lvlCoins++;collect(1,c.x,c.y)}
  for(const c of dyn)if(!c.got&&Math.abs(G.px-c.x)<18&&Math.abs((G.py-24)-c.y)<34){c.got=true;collect(1,c.x,c.y)}
  for(const m of G.gm){if(m.dead)continue;const k=KINDS[m.kind];m.x+=m.dir*m.sp*dt;if(Math.abs(m.x-m.x0)>90)m.dir*=-1;
    if(Math.abs(G.px-m.x)<k.w/2+7){const top=gnd-k.h;
      if(G.vy>0&&prev<=top+16){m.dead=true;slain++;gstore.set('ce-slain',slain);G.vy=-8;sfx('stomp');addFx(m.x,top,'STOMP');for(let i=0;i<14;i++)pops.push({x:m.x+(Math.random()-.5)*k.w,y:gnd-k.h/2+(Math.random()-.5)*k.h*.6,vx:(Math.random()-.5)*3,vy:-Math.random()*3-1,t:0,c:['#e8e8e8','#bdbdbd','#9a9a9a',C.c2][i%4]});mood('wow');updatePanel()}
      else if(G.hurtT<=0&&G.py>top+16){restartLevel();return}}}
  if(G.px>W-114)levelDone();
}
const drawCoin=(x,y,t)=>{const w=Math.max(2,Math.round(10*Math.abs(Math.cos(t/220+x))));ctx.fillStyle='#b8860b';ctx.fillRect(Math.round(x-w/2-1),Math.round(y-7),w+2,14);ctx.fillStyle='#ffd23f';ctx.fillRect(Math.round(x-w/2),Math.round(y-6),w,12);ctx.fillStyle='#fff2a8';ctx.fillRect(Math.round(x-w/2),Math.round(y-5),Math.max(1,w>>2),4)};
function drawPlayer(t){
  const moving=G.active&&Math.abs(G.vx)>0,fr=!G.onGround&&G.active?2:(moving?Math.floor(G.step)%2:0),spr=SP.player[fr];
  const bob=!G.active?Math.round(Math.sin(t/420)):0,x=Math.round(G.px),y=Math.round(G.py-48+bob);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(x-11,GY+1,22,4);
  if(G.hurtT>0&&Math.floor(G.hurtT/4)%2)ctx.globalAlpha=.35;
  if(G.face<0){ctx.save();ctx.translate(x,0);ctx.scale(-1,1);ctx.drawImage(spr,-12,y);ctx.restore()}else ctx.drawImage(spr,x-12,y);
  ctx.globalAlpha=1;
  if(!G.active&&!focusOn()){ctx.font="8px 'Press Start 2P',monospace";ctx.textAlign='center';ctx.fillStyle=C.c2;ctx.globalAlpha=.55+.45*Math.sin(t/300);ctx.fillText('PLAY',x,y-8+bob);ctx.globalAlpha=1;ctx.textAlign='left'}
}
function gameLayer(t,now){
  const gnd=GY+3;
  if(G.active){
    for(const p of G.plats){const x=Math.round(p.x-p.w/2),y=gnd-p.h;prect(ctx,x,y,p.w,16,'#7a5532',4,.2,p.x|0);ctx.fillStyle='#5fae3d';ctx.fillRect(x,y,p.w,6);ctx.fillStyle='#7cc455';ctx.fillRect(x,y,p.w,2)}
    const fxp=W-124;ctx.fillStyle='#e8e8e8';ctx.fillRect(fxp,gnd-84,3,84);const wv=Math.floor(t/160)%3;ctx.fillStyle=C.c1;ctx.fillRect(fxp+3,gnd-84,22,10);ctx.fillRect(fxp+3,gnd-74,16+wv*2,8);ctx.fillRect(fxp+3,gnd-66,10,6);
    for(const c of G.pickups)if(!c.got)drawCoin(c.x,c.y,t);
    for(const m of G.gm)if(!m.dead)drawMob(m,t);
  }
  for(const c of dyn){if(!c.rest){c.vy+=.5;c.y+=c.vy;if(c.y>=GY-9){c.y=GY-9;c.vy*=-.4;if(Math.abs(c.vy)<1){c.vy=0;c.rest=true}}}if(!c.got)drawCoin(c.x,c.y,t)}
  for(let i=dyn.length-1;i>=0;i--)if(dyn[i].got)dyn.splice(i,1);
  drawPlayer(t);
}
function fxLayer(){
  ctx.font="9px 'Press Start 2P',monospace";ctx.textAlign='center';
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.t++;f.y-=.6;ctx.globalAlpha=Math.max(0,1-f.t/55);ctx.fillStyle=f.c;ctx.fillText(f.txt,Math.round(f.x),Math.round(f.y));if(f.t>55)fx.splice(i,1)}
  ctx.globalAlpha=1;
  if(robot){robot.t++;robot.x+=1.3*robot.dir;const s=Math.floor(robot.t/10)%2;ctx.drawImage(SP.robot[s],Math.round(robot.x-12),GY-42+3);
    if(!robot.said&&robot.x>W*.45){robot.said=true;addFx(robot.x,GY-60,'HI, I AM DRAKE',C.c3);dsay('Hi from the footer! I am <b>Drake</b>. Ask me to explain, debug or fix your code.')}
    if(robot.x>W+30)robot=null}
  if(G.active&&(G.state==='card'||G.state==='win')){
    const w=Math.min(540,W-32),h=104,x=Math.round(W/2-w/2),y=Math.round(GY-190);
    ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(x,y,w,h);ctx.strokeStyle=C.c2;ctx.lineWidth=3;ctx.strokeRect(x+1.5,y+1.5,w-3,h-3);
    const win=G.state==='win',L=LEVELS[Math.min(G.lvl,LEVELS.length)-1];
    ctx.fillStyle=C.c2;ctx.font="13px 'Press Start 2P',monospace";ctx.fillText(win?'YOU WIN!':'LEVEL '+G.lvl+' CLEAR: '+L.name,W/2,y+36);
    ctx.fillStyle='#fff';ctx.font="9px 'Press Start 2P',monospace";ctx.fillText(win?'ALL 3 LEVELS. GITHUB UNLOCKED.':L.card,W/2,y+62);
    ctx.fillStyle=C.c3;ctx.fillText('COINS '+G.coins+'   BEST '+best,W/2,y+86)}
  else if(G.active){ctx.fillStyle=C.c3;ctx.globalAlpha=.9;ctx.font="9px 'Press Start 2P',monospace";ctx.textAlign='left';ctx.fillText('LEVEL '+G.lvl+': '+LEVELS[Math.min(G.lvl,LEVELS.length)-1].name,16,GY-120);ctx.globalAlpha=1}
  ctx.textAlign='left';
}
/* hit tests for the idle scene */
const hitTorch=p=>p.y>GY-62&&p.y<GY+4&&(Math.abs(p.x-90)<18||Math.abs(p.x-(W-90))<18);
const hitSpider=p=>{const len=spiderLen(performance.now()-t0);return Math.abs(p.x-W*.44)<20&&Math.abs(p.y-(len+4))<20};
const hitPlayer=p=>Math.abs(p.x-G.px)<18&&p.y>GY-56&&p.y<GY+6;
function toggleDay(){day=!day;addFx(90,GY-70,day?'DAY':'NIGHT',C.c2);sfx('coin');mood('wink');setTimeout(()=>{if(window.drake&&drake.setMood)drake.setMood('idle')},1100)}
function dropBonus(){if(dyn.filter(c=>!c.got).length>=6)return;const len=spiderLen(performance.now()-t0);dyn.push({x:W*.44+(Math.random()-.5)*10,y:len+14,vy:0,rest:false,got:false});sfx('jump');mood('wow')}
function hitCoinAt(p){const c=dyn.find(c=>!c.got&&Math.hypot(p.x-c.x,p.y-c.y)<18);if(c){c.got=true;collect(1,c.x,c.y);return true}return false}
/* keyboard, touch pad */
const typing=e=>{const t=e.target;return t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||(t.closest&&t.closest('.CodeMirror,[contenteditable="true"]')))};
addEventListener('keydown',e=>{
  if(typing(e)||e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key.toLowerCase();
  if(!G.active){
    if(k==='enter'&&document.activeElement===cv){e.preventDefault();startGame();return}
    secret=(secret+(k.length===1?k:'')).slice(-5);if(secret==='drake'){secret='';spawnRobot()}return}
  if(k==='escape'){stopGame();return}
  if(k==='m'){sfxOn=!sfxOn;gstore.set('ce-sfx',sfxOn?'1':'0');say(sfxOn?'Sound on':'Sound off');return}
  if(k==='arrowleft'||k==='a')keys.l=true;else if(k==='arrowright'||k==='d')keys.r=true;else if(k==='arrowup'||k==='w'||k===' ')keys.j=true;else return;
  e.preventDefault();kick()});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')keys.l=false;else if(k==='arrowright'||k==='d')keys.r=false;else if(k==='arrowup'||k==='w'||k===' ')keys.j=false});
[['padL','l'],['padR','r'],['padJ','j']].forEach(([id,k])=>{const b=document.getElementById(id);if(!b)return;
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(!G.active&&!focusOn())startGame();keys[k]=true;kick()});
  ['pointerup','pointerleave','pointercancel'].forEach(n=>b.addEventListener(n,()=>{keys[k]=false}))});
if(ghLink)ghLink.addEventListener('click',e=>{if(ghLink.classList.contains('locked')){e.preventDefault();say('Collect 5 coins to unlock GitHub.')}});
/* ---------- frame ---------- */
function render(now){
  const t=now-t0,move=!reduce&&!focusOn();ctx.clearRect(0,0,W,H);
  if(day){ctx.fillStyle='rgba(125,195,255,.28)';ctx.fillRect(0,0,W,GY);ctx.fillStyle='#ffe27a';ctx.fillRect(W-92,36,28,28);ctx.fillRect(W-86,26,16,4);ctx.fillRect(W-86,70,16,4);ctx.fillRect(W-102,42,4,16);ctx.fillRect(W-58,42,4,16)}else stars(t);
  net(move);web();spider(t);
  flies.forEach(f=>{const x=((f.x+Math.sin(t*f.s+f.p)*.03)%1)*W,y=(.12+f.y*.62+Math.cos(t*f.s*1.3+f.p)*.03)*(GY-30);ctx.globalAlpha=.3+.7*Math.abs(Math.sin(t/700+f.p));ctx.fillStyle=C.ok;ctx.fillRect(Math.round(x),Math.round(y),3,3)});ctx.globalAlpha=1;
  ctx.drawImage(groundCv,0,GY);
  torch(90,t,move);torch(W-90,t,move);
  if(!G.active)for(const m of mobs){if(move){m.x+=m.dir*m.sp;if(m.x<50){m.x=50;m.dir=1}if(m.x>W-50){m.x=W-50;m.dir=-1}if(Math.random()<.0015)m.dir*=-1}drawMob(m,t)}
  gameLayer(t,now);
  for(let i=embers.length-1;i>=0;i--){const e=embers[i];e.t++;e.x+=e.vx;e.y+=e.vy;ctx.globalAlpha=Math.max(0,1-e.t/70);ctx.fillStyle=e.t<30?'#ffd27a':'#ff8a2e';ctx.fillRect(Math.round(e.x),Math.round(e.y),2,2);ctx.globalAlpha=1;if(e.t>70)embers.splice(i,1)}
  for(const d of dots){const age=now-d.t;if(age>d.life)continue;ctx.globalAlpha=Math.max(0,1-age/d.life);ctx.fillStyle=[C.c1,C.c2,C.c3][d.c];ctx.fillRect(d.x-d.s/2,d.y-d.s/2,d.s,d.s)}ctx.globalAlpha=1;
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t++;p.x+=p.vx;p.y+=p.vy;p.vy+=.18;ctx.globalAlpha=Math.max(0,1-p.t/40);ctx.fillStyle=p.c;ctx.fillRect(Math.round(p.x),Math.round(p.y),5,5);ctx.globalAlpha=1;if(p.t>40)pops.splice(i,1)}
  fxLayer();
  while(dots.length&&now-dots[0].t>dots[0].life+200)dots.shift();
}
let raf=0,lastNow=0;
const busy=()=>!reduce||dots.length||pops.length||G.active||fx.length||robot||dyn.some(c=>!c.rest);
function loop(now){raf=0;if(!visible)return;
  if(G.active&&!focusOn()){const dt=lastNow?Math.max(0,Math.min(3,(now-lastNow)/16.667)):1;stepGame(dt)}
  lastNow=now;render(now);if(focusOn())return;if(busy())raf=requestAnimationFrame(loop)}
function kick(){if(!raf&&visible){lastNow=0;raf=requestAnimationFrame(loop)}}
new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(!visible)stopGame();else kick()}).observe(foot);
readTokens();buildSprites();resize();
spawn('skeleton',W*.16);spawn('creeper',W*.52);spawn('pig',W*.8);
render(performance.now());kick();
if(window.ResizeObserver)new ResizeObserver(()=>{resize();render(performance.now())}).observe(foot);
})();
