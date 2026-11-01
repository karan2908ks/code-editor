/* Footer playground: draw with the cursor (strokes fade after a few seconds), walking pixel mobs, torches, spider, fireflies. */
(function(){
const cv=document.getElementById('fcv'),ctx=cv.getContext('2d'),foot=document.getElementById('footer'),slainEl=document.getElementById('slain');
let W=0,H=0,dpr=1,C={},visible=true,t0=performance.now();
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function tok(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888'}
function readTokens(){C={c1:tok('--c1'),c2:tok('--c2'),c3:tok('--c3'),fg:tok('--fg'),bg:tok('--bg'),line:tok('--line'),ok:tok('--ok')}}
function resize(){const r=foot.getBoundingClientRect();dpr=Math.min(2,devicePixelRatio||1);W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
  mobs.forEach(m=>{m.x=Math.min(Math.max(m.x,40),W-40)})}
addEventListener('resize',resize);addEventListener('modechange',()=>{readTokens();render(performance.now())});
let slain=0;try{slain=+localStorage.getItem('ce-slain')||0}catch(e){}slainEl.textContent=slain;
/* mobs */
const KINDS={creeper:{u:5,w:30,h:70,sp:.35},skeleton:{u:4,w:24,h:60,sp:.5},pig:{u:4,w:44,h:30,sp:.3}};
const mobs=[],pops=[];
function spawn(kind,x){const k=KINDS[kind];mobs.push({kind,x:x,dir:Math.random()<.5?-1:1,sp:k.sp*(.8+Math.random()*.5),ph:Math.random()*10})}
spawn('skeleton',140);spawn('creeper',640);spawn('pig',980);
function gy(){return H-34}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function drawMob(m,t){
  const k=KINDS[m.kind],u=k.u,g=gy(),step=Math.floor(t/220+m.ph)%2,cx=m.x,f=m.dir;
  if(m.kind==='creeper'){
    const a='#5cb85c',b='#3f8f43',d='#17301a',hx=cx-3*u,hy=g-14*u;
    rect(cx-2*u,g-8*u,4*u,6*u,a);rect(cx-2*u,g-8*u,4*u,u,b);
    rect(cx-3*u,g-2*u+(step?0:-u*.5),2*u,2*u,b);rect(cx+u,g-2*u+(step?-u*.5:0),2*u,2*u,b);
    rect(hx,hy,6*u,6*u,a);rect(hx,hy,6*u,u,b);rect(hx+u,hy+2*u,u,u,d);rect(hx+4*u,hy+2*u,u,u,d);
    rect(hx+2*u,hy+3*u,2*u,u,d);rect(hx+u,hy+4*u,u,2*u,d);rect(hx+4*u,hy+4*u,u,2*u,d);rect(hx+2*u,hy+4*u,2*u,u,d);
  }else if(m.kind==='skeleton'){
    const a='#dcdcdc',d='#2a2a2a',hx=cx-2.5*u,hy=g-15*u;
    rect(hx,hy,5*u,5*u,a);rect(hx+u,hy+2*u,u,u,d);rect(hx+3*u,hy+2*u,u,u,d);rect(hx+u,hy+4*u,3*u,u*.6,d);
    rect(cx-2*u,g-10*u,4*u,6*u,a);for(let i=0;i<3;i++)rect(cx-2*u,g-9*u+i*2*u,4*u,u*.6,d);
    const sw=step?u:-u;rect(cx-3*u,g-10*u+(step?u:0),u,5*u,a);rect(cx+2*u,g-10*u+(step?0:u),u,5*u,a);
    rect(cx-2*u,g-4*u,u,4*u+(step?0:-u*.5),a);rect(cx+u,g-4*u,u,4*u+(step?-u*.5:0),a);
    rect(cx+(f>0?3:-4)*u,g-9*u,u,4*u,'#8b5a2b');
  }else{
    const a='#f4a6b0',b='#d9808c',d='#2a2a2a';const L=f>0?1:-1,bx=cx-5*u;
    rect(bx,g-7*u,10*u,5*u,a);rect(bx,g-7*u,10*u,u*.7,b);
    rect(bx+1*u,g-2*u+(step?0:-u*.4),u*1.4,2*u,b);rect(bx+3*u,g-2*u+(step?-u*.4:0),u*1.4,2*u,b);rect(bx+6*u,g-2*u+(step?0:-u*.4),u*1.4,2*u,b);rect(bx+8*u,g-2*u+(step?-u*.4:0),u*1.4,2*u,b);
    const hx=L>0?bx+9*u:bx-4*u;rect(hx,g-8*u,5*u,4*u,a);rect(L>0?hx+4*u:hx-u,g-6.5*u,2*u,2*u,b);
    rect(L>0?hx+3*u:hx+u,g-7*u,u*.9,u*.9,d);
  }
}
function slay(m){
  const g=gy(),k=KINDS[m.kind];for(let i=0;i<16;i++)pops.push({x:m.x+(Math.random()-.5)*k.w,y:g-k.h/2+(Math.random()-.5)*k.h*.6,vx:(Math.random()-.5)*3,vy:-Math.random()*3-1,t:0,c:[C.c1,C.c2,C.c3,C.fg][i%4]});
  mobs.splice(mobs.indexOf(m),1);slain++;slainEl.textContent=slain;try{localStorage.setItem('ce-slain',slain)}catch(e){}
  const kinds=Object.keys(KINDS);setTimeout(()=>spawn(kinds[Math.floor(Math.random()*3)],Math.random()<.5?30:W-30),900);
}
function hitMob(x,y){const g=gy();for(const m of mobs){const k=KINDS[m.kind];if(Math.abs(x-m.x)<k.w/2+8&&y>g-k.h-6&&y<g+4)return m}return null}
/* drawing */
const dots=[];let down=false,last=null,ci=0;
function addDot(x,y,life,size){const s=size;dots.push({x:Math.round(x/s)*s,y:Math.round(y/s)*s,s,t:performance.now(),life,c:ci++%3})}
function stroke(x,y,life,size){if(last){const dx=x-last.x,dy=y-last.y,n=Math.max(1,Math.floor(Math.hypot(dx,dy)/size));for(let i=1;i<=n;i++)addDot(last.x+dx*i/n,last.y+dy*i/n,life,size)}else addDot(x,y,life,size);last={x,y}}
function pos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
cv.addEventListener('pointerdown',e=>{const p=pos(e),m=hitMob(p.x,p.y);if(m){slay(m);return}down=true;last=null;try{cv.setPointerCapture(e.pointerId)}catch(_){}stroke(p.x,p.y,3500,10);kick()});
cv.addEventListener('pointermove',e=>{const p=pos(e);if(down)stroke(p.x,p.y,3500,10);else{stroke(p.x,p.y,1100,6)}kick()});
['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>{down=false;last=null}));
cv.addEventListener('pointerleave',()=>{if(!down)last=null});
/* ambient */
const flies=Array.from({length:26},()=>({x:Math.random(),y:Math.random(),p:Math.random()*6,s:.0001+Math.random()*.0002}));
function web(){ctx.strokeStyle=C.fg;ctx.globalAlpha=.25;ctx.lineWidth=1;const R=Math.min(260,W*.3);
  for(let i=0;i<=6;i++){const a=i/6*Math.PI/2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);ctx.stroke()}
  for(let r=1;r<=5;r++){ctx.beginPath();const rr=R*r/5;for(let i=0;i<=6;i++){const a=i/6*Math.PI/2,x=Math.cos(a)*rr*(1-.05*Math.sin(i*2)),y=Math.sin(a)*rr*(1-.05*Math.sin(i*2));i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}ctx.globalAlpha=1}
function spider(t){const x=W*.42,len=70+Math.sin(t/1800)*50;ctx.strokeStyle=C.fg;ctx.globalAlpha=.4;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,len);ctx.stroke();ctx.globalAlpha=1;
  rect(x-6,len,12,8,'#2b2433');rect(x-4,len+2,2,2,'#ff4d4d');rect(x+2,len+2,2,2,'#ff4d4d');ctx.fillStyle='#2b2433';for(let i=0;i<3;i++){rect(x-12-i*2,len+i*2,6,1,'#2b2433');rect(x+6+i*2,len+i*2,6,1,'#2b2433')}}
function torch(x,t){const g=gy(),fl=Math.sin(t/90+x)*2;const gr=ctx.createRadialGradient(x,g-46,2,x,g-46,70+fl*2);gr.addColorStop(0,'rgba(255,190,70,.35)');gr.addColorStop(1,'rgba(255,190,70,0)');ctx.fillStyle=gr;ctx.fillRect(x-80,g-130,160,150);
  rect(x-3,g-36,6,36,'#7a4a21');rect(x-5,g-46,10,10,'#ffb23f');rect(x-3,g-52+fl,6,8,'#ffe27a');rect(x-1,g-56+fl,2,5,'#fff3b8')}
function ground(){const g=gy();rect(0,g,W,12,'#58b13f');rect(0,g,W,3,'#7fdc5a');rect(0,g+12,W,H-g-12,'#6b4423');
  for(let x=0;x<W;x+=18){rect(x,g+12+((x/18)%3)*6,6,6,'#59371b');rect(x+9,g+24,5,5,'#7c5230')}}
/* frame */
function render(now){
  const t=now-t0;ctx.clearRect(0,0,W,H);
  ctx.fillStyle=C.fg;flies.forEach(f=>{const x=((f.x+Math.sin(t*f.s+f.p)*.03)%1)*W,y=(.15+f.y*.7+Math.cos(t*f.s*1.3+f.p)*.03)*(H-60);const a=.35+.65*Math.abs(Math.sin(t/700+f.p));ctx.globalAlpha=a;rect(x,y,3,3,C.ok);ctx.globalAlpha=1});
  web();spider(t);ground();torch(90,t);torch(W-90,t);
  for(const d of dots){const age=now-d.t;if(age>d.life)continue;ctx.globalAlpha=Math.max(0,1-age/d.life);rect(d.x-d.s/2,d.y-d.s/2,d.s,d.s,[C.c1,C.c2,C.c3][d.c]);}ctx.globalAlpha=1;
  for(const m of mobs){if(!reduce){m.x+=m.dir*m.sp*(16/16);if(m.x<30){m.x=30;m.dir=1}if(m.x>W-30){m.x=W-30;m.dir=-1}if(Math.random()<.002)m.dir*=-1}drawMob(m,t)}
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t++;p.x+=p.vx;p.y+=p.vy;p.vy+=.18;ctx.globalAlpha=Math.max(0,1-p.t/40);rect(p.x,p.y,5,5,p.c);ctx.globalAlpha=1;if(p.t>40)pops.splice(i,1)}
  while(dots.length&&now-dots[0].t>dots[0].life+200)dots.shift();
}
let raf=0;function loop(now){raf=0;if(!visible)return;render(now);if(!reduce||dots.length||pops.length)raf=requestAnimationFrame(loop)}
function kick(){if(!raf&&visible)raf=requestAnimationFrame(loop)}
new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)kick()}).observe(foot);
readTokens();resize();render(performance.now());kick();
if(window.ResizeObserver)new ResizeObserver(()=>{resize();render(performance.now())}).observe(foot);
})();
