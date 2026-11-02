/* Footer: a night scene like the portfolio. Textured Minecraft-style ground, constellation network,
   torches with embers, walking mobs you can slay, and a canvas you can draw on (strokes fade after a few seconds). */
(function(){
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
}
addEventListener('resize',resize);
addEventListener('modechange',()=>{readTokens();render(performance.now())});
addEventListener('focuschange',()=>{render(performance.now());kick()});
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
  mobs.splice(mobs.indexOf(m),1);slain++;slainEl.textContent=slain;try{localStorage.setItem('ce-slain',slain)}catch(e){}
  const ks=Object.keys(KINDS);setTimeout(()=>{spawn(ks[Math.floor(Math.random()*3)],Math.random()<.5?60:W-60);kick()},900);
}
function hitMob(x,y){for(const m of mobs){const k=KINDS[m.kind];if(Math.abs(x-m.x)<k.w/2+6&&y>GY-k.h-6&&y<GY+6)return m}return null}
/* ---------- drawing ---------- */
const dots=[];let down=false,last=null,ci=0;
function addDot(x,y,life,s){dots.push({x:Math.round(x/s)*s,y:Math.round(y/s)*s,s,t:performance.now(),life,c:ci++%3})}
function stroke(x,y,life,s){if(last){const dx=x-last.x,dy=y-last.y,n=Math.max(1,Math.floor(Math.hypot(dx,dy)/s));for(let i=1;i<=n;i++)addDot(last.x+dx*i/n,last.y+dy*i/n,life,s)}else addDot(x,y,life,s);last={x,y}}
function pos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
cv.addEventListener('pointerdown',e=>{if(focusOn())return;const p=pos(e),m=hitMob(p.x,p.y);if(m){slay(m);kick();return}down=true;last=null;try{cv.setPointerCapture(e.pointerId)}catch(_){}stroke(p.x,p.y,3500,10);kick()});
cv.addEventListener('pointermove',e=>{if(focusOn())return;const p=pos(e);ptr={x:p.x,y:p.y};if(down)stroke(p.x,p.y,3500,10);else stroke(p.x,p.y,1000,5);kick()});
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
function spider(t){const x=W*.44,len=60+Math.sin(t/2200)*45;ctx.strokeStyle=C.fg;ctx.globalAlpha=.4;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,len);ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle='#2b2433';ctx.fillRect(x-6,len,12,8);ctx.fillStyle='#ff4d4d';ctx.fillRect(x-4,len+2,2,2);ctx.fillRect(x+2,len+2,2,2);ctx.fillStyle='#3a3046';for(let i=0;i<3;i++){ctx.fillRect(x-12-i*2,len+i*2,6,1);ctx.fillRect(x+6+i*2,len+i*2,6,1)}}
function torch(x,t,move){
  const fl=Math.floor(t/110+x)%3,g=ctx.createRadialGradient(x,GY-46,2,x,GY-46,90);g.addColorStop(0,'rgba(255,180,70,.30)');g.addColorStop(1,'rgba(255,180,70,0)');ctx.fillStyle=g;ctx.fillRect(x-100,GY-150,200,170);
  prect(ctx,x-3,GY-34,6,34,'#7a4a21',3,.25,x|0);ctx.fillStyle='#ff9d2e';ctx.fillRect(x-4,GY-42,8,8);ctx.fillStyle='#ffe27a';ctx.fillRect(x-2,GY-46-fl,4,6);ctx.fillStyle='#fff6c8';ctx.fillRect(x-1,GY-49-fl,2,3);
  if(move&&Math.random()<.14)embers.push({x:x+(Math.random()-.5)*6,y:GY-46,vx:(Math.random()-.5)*.5,vy:-.5-Math.random()*.6,t:0});
}
const flies=Array.from({length:14},(_,i)=>({x:hash(i,7),y:hash(i,8),p:hash(i,9)*6,s:.0001+hash(i,10)*.0002}));
/* ---------- frame ---------- */
function render(now){
  const t=now-t0,move=!reduce&&!focusOn();ctx.clearRect(0,0,W,H);
  stars(t);net(move);web();spider(t);
  flies.forEach(f=>{const x=((f.x+Math.sin(t*f.s+f.p)*.03)%1)*W,y=(.12+f.y*.62+Math.cos(t*f.s*1.3+f.p)*.03)*(GY-30);ctx.globalAlpha=.3+.7*Math.abs(Math.sin(t/700+f.p));ctx.fillStyle=C.ok;ctx.fillRect(Math.round(x),Math.round(y),3,3)});ctx.globalAlpha=1;
  ctx.drawImage(groundCv,0,GY);
  torch(90,t,move);torch(W-90,t,move);
  for(const m of mobs){if(move){m.x+=m.dir*m.sp;if(m.x<50){m.x=50;m.dir=1}if(m.x>W-50){m.x=W-50;m.dir=-1}if(Math.random()<.0015)m.dir*=-1}drawMob(m,t)}
  for(let i=embers.length-1;i>=0;i--){const e=embers[i];e.t++;e.x+=e.vx;e.y+=e.vy;ctx.globalAlpha=Math.max(0,1-e.t/70);ctx.fillStyle=e.t<30?'#ffd27a':'#ff8a2e';ctx.fillRect(Math.round(e.x),Math.round(e.y),2,2);ctx.globalAlpha=1;if(e.t>70)embers.splice(i,1)}
  for(const d of dots){const age=now-d.t;if(age>d.life)continue;ctx.globalAlpha=Math.max(0,1-age/d.life);ctx.fillStyle=[C.c1,C.c2,C.c3][d.c];ctx.fillRect(d.x-d.s/2,d.y-d.s/2,d.s,d.s)}ctx.globalAlpha=1;
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t++;p.x+=p.vx;p.y+=p.vy;p.vy+=.18;ctx.globalAlpha=Math.max(0,1-p.t/40);ctx.fillStyle=p.c;ctx.fillRect(Math.round(p.x),Math.round(p.y),5,5);ctx.globalAlpha=1;if(p.t>40)pops.splice(i,1)}
  while(dots.length&&now-dots[0].t>dots[0].life+200)dots.shift();
}
let raf=0;
function loop(now){raf=0;if(!visible)return;render(now);if(focusOn())return;if(!reduce||dots.length||pops.length)raf=requestAnimationFrame(loop)}
function kick(){if(!raf&&visible)raf=requestAnimationFrame(loop)}
new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)kick()}).observe(foot);
readTokens();buildSprites();resize();
spawn('skeleton',W*.16);spawn('creeper',W*.52);spawn('pig',W*.8);
render(performance.now());kick();
if(window.ResizeObserver)new ResizeObserver(()=>{resize();render(performance.now())}).observe(foot);
})();
