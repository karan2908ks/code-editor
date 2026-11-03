/* Drake: the pixel AI bot. Offline analyzer (spots + fixes common mistakes) and a small chat. */
const dcv=$('#dcv'),dx=dcv.getContext('2d');
function tok(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888'}
const D={mood:'idle',f:0,talk:0,unread:0};
function px(x,y,w,h,c){dx.fillStyle=c;dx.fillRect(x,y,w,h)}
function draw(){
  const body=tok('--c3'),ac=tok('--c2'),ln=tok('--fg'),bg=tok('--bg'),ok=tok('--ok'),bad=tok('--bad'),c1=tok('--c1');
  dx.clearRect(0,0,16,16);const f=D.f,m=D.mood,b=(f%10<5)?0:1;
  px(7,0+b,2,1,(f%6<3)?c1:ln);px(7,1+b,2,1,ln);
  px(2,2+b,12,10,ln);px(3,3+b,10,8,body);px(0,5+b,2,4,ac);px(14,5+b,2,4,ac);px(4,4+b,8,6,bg);
  if(m==='happy'){px(5,7+b,1,1,ok);px(6,6+b,1,1,ok);px(7,7+b,1,1,ok);px(9,7+b,1,1,ok);px(10,6+b,1,1,ok);px(11,7+b,1,1,ok);px(6,9+b,4,1,ok)}
  else if(m==='sad'){px(5,6+b,2,2,bad);px(9,6+b,2,2,bad);px(7,9+b,2,1,bad)}
  else if(m==='wow'){px(5,5+b,2,3,ln);px(9,5+b,2,3,ln);px(7,9+b,2,2,ln);px(4,3+b,3,1,ac);px(9,3+b,3,1,ac)}
  else if(m==='sleep'){px(5,7+b,2,1,ln);px(9,7+b,2,1,ln);px(7,9+b,2,1,ln);if(f%12<6){px(12,1,2,1,ac);px(13,2,1,1,ac);px(12,3,2,1,ac)}}
  else if(m==='wink'){px(5,6+b,2,2,ln);px(9,7+b,2,1,ln);px(6,9+b,4,1,ok)}
  else if(m==='think'){const o=(f%6<3)?0:1;px(5+o,6+b,2,2,ac);px(9+o,6+b,2,2,ac);px(6,9+b,(f%4<2)?4:2,1,ln)}
  else{if(f%16===0){px(5,7+b,2,1,ln);px(9,7+b,2,1,ln)}else{px(5,6+b,2,2,ln);px(9,6+b,2,2,ln)}if(D.talk>0)px(7,9+b,2,1,ln)}
  px(4,12+b,8,1,ln);px(3,13,10,3,ln);px(4,14,8,2,c1);
  if(D.shown!==m){D.shown=m;const l=document.getElementById('dmood');if(l)l.textContent=({idle:'IDLE',think:'THINKING',happy:'HAPPY',sad:'WORRIED',wow:'SURPRISED',wink:'WINK',sleep:'SLEEPING'}[m]||m).toUpperCase()}
}
setInterval(()=>{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){D.f++;if(D.talk>0)D.talk--}draw()},150);
addEventListener('modechange',draw);
/* ---------- Drake: explain compiler / runtime errors ---------- */
const EXPL=[
 [/NameError.*'(\w+)'|ReferenceError: (\w+) is not defined|undeclared.*'(\w+)'|cannot find symbol[\s\S]*?symbol:\s*(?:variable|class|method)?\s*(\w+)/i,m=>`The name <code>${m[1]||m[2]||m[3]||m[4]||'?'}</code> is used before it exists. Check the spelling, or declare it first.`],
 [/SyntaxError|expected ';'|expected ‘;’|expected '\)'|expected expression|';' expected|bad input|Unexpected token|Unexpected identifier|Unexpected end/i,()=>'There is a syntax error: a missing symbol (like <code>;</code>, <code>:</code> or a bracket) or a typo near the marked line.'],
 [/IndentationError|unindent|expected an indented/i,()=>'The indentation is wrong. Lines inside a block must be indented by the same amount.'],
 [/undefined reference to/i,()=>'The linker cannot find a function you call. Check its name or that it is defined.'],
 [/implicit declaration|was not declared|has not been declared/i,()=>'A function or variable is used without being declared. You probably need an <code>#include</code> or a declaration.'],
 [/TypeError/i,()=>'A value is used the wrong way (wrong type, or calling something that is not a function).'],
 [/ZeroDivision|division by zero/i,()=>'The code divides by zero. Check the divisor before dividing.'],
 [/IndexError|out of range|ArrayIndexOutOfBounds/i,()=>'An index is outside the list or array. Valid indexes run from 0 to length-1.'],
 [/incompatible types|cannot convert|invalid conversion/i,()=>'A value of one type is assigned to a different type. Convert it or change the variable type.'],
 [/class .* is public|should be declared in a file named/i,()=>'The public class name must match the file name. Use <code>public class Main</code> here.'],
 [/missing return|return type/i,()=>'A function is missing a return statement, or returns the wrong type.']
];
function explain(t){t=String(t||'');for(const[r,f]of EXPL){const m=r.exec(t);if(m)return f(m)+'\n<code>'+esc(t.split('\n').find(l=>/error|Error/.test(l))||t.split('\n')[0]).slice(0,200)+'</code>'}
  return 'Something went wrong:\n<code>'+esc(t.split('\n')[0]).slice(0,200)+'</code>'}


function stripLine(s,l){ // remove strings and comments for scanning
  s=s.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,'""');
  if(l==='python')return s.replace(/#.*$/,'');
  if(l==='html')return s;return s.replace(/\/\/.*$/,'').replace(/\/\*.*?\*\//g,'');
}
const TYPOS={all:[[/\bretrun\b/g,'return'],[/\blenght\b/g,'length'],[/\bfucntion\b/g,'function'],[/\bfuntion\b/g,'function']],
 c:[[/\b(prinf|pritnf|pirntf|printff|printf_)\s*\(/g,'printf('],[/\b(scnaf|scanff|sacnf)\s*\(/g,'scanf(']],
 cpp:[[/\b(prinf|pritnf)\s*\(/g,'printf('],[/\bcount\s*<</g,'cout <<'],[/\bcin\s*<<(?!<)/g,'cin >>'],[/\bendln\b/g,'endl'],[/\bstd::cout\s*>>/g,'std::cout <<'],[/\bcout\s*>>/g,'cout <<']],
 java:[[/\bSystem\.out\.(printn|prinln|pritnln|printLn)\s*\(/g,'System.out.println('],[/\b[sS]ytem\.out\./g,'System.out.'],[/\bsystem\.out\./g,'System.out.'],[/\bstring\b(?=\s*(\[|\w+\s*[=;]))/g,'String'],[/\bString\s+args\s*\)/g,'String[] args)'],[/\bSystem\.out\.println\s*\(\s*\)/g,'System.out.println()']],
 python:[[/\bpritn\s*\(/g,'print('],[/\bpirnt\s*\(/g,'print('],[/\bprnit\s*\(/g,'print('],[/\bTrue\b/g,'True'],[/\belse\s+if\b/g,'elif'],[/\bimput\s*\(/g,'input('],[/\brnage\s*\(/g,'range('],[/\bLen\s*\(/g,'len(']],
 js:[[/\bconsole\.(lg|logg|og)\s*\(/g,'console.log('],[/\bconsol\.log\s*\(/g,'console.log('],[/\bConsole\.log\s*\(/g,'console.log('],[/\bdocument\.getElementByID\b/g,'document.getElementById'],[/\.lenght\b/g,'.length'],[/\bdocument\.write\s*\(/g,'document.write(']]
};
const BR={'(':')','[':']','{':'}'};
function lint(l,code){
  const L=code.split('\n'),I=[];
  const add=(line,msg,fix)=>I.push({line,msg,fix});
  /* typos */
  L.forEach((s,i)=>{for(const[r,to]of[...(TYPOS.all),...(TYPOS[l]||[])]){r.lastIndex=0;if(r.test(s)&&s.replace(r,to)!==s){const fx=s.replace(r,to);add(i+1,`Typo: <code>${esc(s.trim().slice(0,40))}</code> → <code>${esc(fx.trim().slice(0,40))}</code>`,x=>x.replace(r,to))}}});
  if(l!=='html'){
    /* bracket balance (code only) */
    const st=[];let inBlock=false;
    L.forEach((raw,i)=>{let s=raw;if(inBlock){const e=s.indexOf('*/');if(e<0)return;s=s.slice(e+2);inBlock=false}
      s=stripLine(s,l);if(l!=='python'){const b=s.indexOf('/*');if(b>=0){s=s.slice(0,b);inBlock=true}}
      for(const ch of s){if(BR[ch])st.push([ch,i+1]);else if(')]}'.includes(ch)){const t=st.pop();if(!t||BR[t[0]]!==ch){add(i+1,`Unexpected <code>${ch}</code> with no matching opener.`,null);if(t)st.push(t)}}}});
    st.forEach(t=>add(t[1],`Unclosed <code>${t[0]}</code>. Missing <code>${BR[t[0]]}</code>.`,{append:BR[t[0]]}));
  }
  if(l==='c'||l==='cpp'||l==='java'||l==='js'){
    const ctrl=/^\s*(if|for|while|switch|else|do|try|catch|finally|class|struct|enum|namespace|public|private|protected|case|default)\b/;
    L.forEach((raw,i)=>{const s=stripLine(raw,l).trimEnd();const t=s.trim();if(!t||t[0]==='#'||t[0]==='@'||t.startsWith('*')||t.startsWith('/*'))return;
      if(/[;{},:(\[+\-*/&|=<>!?.]$/.test(t)||/^[})\]]/.test(t)&&t.length===1)return;if(/^\}\s*(else|while|catch)/.test(t))return;
      if(ctrl.test(t))return;
      let nx='';for(let j=i+1;j<L.length;j++){const q=stripLine(L[j],l).trim();if(q){nx=q;break}}
      if(/^[{.+\-*/&|?:=<>)]/.test(nx)||/^(else|catch|finally)\b/.test(nx))return;
      if(/\)\s*$/.test(t)&&/^[\w:<>*&\s,~]+\s+[\w:~]+\s*\(.*\)$/.test(t)&&l!=='js')return; // function header
      if(l==='js'&&/^(function|async|import|export)\b/.test(t))return;
      if(/[\w)\]"']$/.test(t)&&/^(return|printf|scanf|puts|cout|cin|std::|System\.|console\.|int|float|double|char|long|short|bool|boolean|string|String|auto|var|let|const|break|continue|[A-Za-z_]\w*\s*(=|\+\+|--|\(|\.|\+=|-=))/.test(t)&&!/^(public|static|void)\b/.test(t))
        add(i+1,`Missing <code>;</code> at the end of this line.`,x=>x.replace(/\s*$/,';'));});
  }
  if(l==='c'||l==='cpp'){
    const has=h=>new RegExp('#\\s*include\\s*<'+h+'>').test(code);
    const needs=[];if(/\b(printf|scanf|puts|getchar|fgets|fopen)\s*\(/.test(code)&&!has('stdio\\.h')&&!has('cstdio')&&!has('bits/stdc\\+\\+\\.h'))needs.push('#include <'+(l==='c'?'stdio.h':'cstdio')+'>');
    if(/\b(malloc|free|atoi|rand|exit)\s*\(/.test(code)&&!has('stdlib\\.h')&&!has('cstdlib')&&!has('bits/stdc\\+\\+\\.h'))needs.push('#include <'+(l==='c'?'stdlib.h':'cstdlib')+'>');
    if(/\b(strlen|strcpy|strcmp|strcat|memset)\s*\(/.test(code)&&!has('string\\.h')&&!has('cstring')&&!has('bits/stdc\\+\\+\\.h'))needs.push('#include <'+(l==='c'?'string.h':'cstring')+'>');
    if(l==='cpp'&&/\b(cout|cin|endl|cerr)\b/.test(code)&&!has('iostream')&&!has('bits/stdc\\+\\+\\.h'))needs.push('#include <iostream>');
    if(l==='cpp'&&/\bvector\s*</.test(code)&&!has('vector')&&!has('bits/stdc\\+\\+\\.h'))needs.push('#include <vector>');
    if(l==='cpp'&&/\bstring\b/.test(code.replace(/std::string/g,''))&&!has('string')&&!has('iostream')&&!has('bits/stdc\\+\\+\\.h'))needs.push('#include <string>');
    needs.forEach(n=>add(1,`Missing <code>${esc(n)}</code>.`,{prepend:n}));
    if(l==='cpp'&&/(?<!std::)\b(cout|cin|endl|vector|string)\b/.test(code.replace(/#.*$/gm,''))&&!/using\s+namespace\s+std/.test(code))add(1,'Using <code>cout/cin/vector</code> without <code>std::</code>. Adding <code>using namespace std;</code>.',{afterIncludes:'using namespace std;'});
    if(!/\bmain\s*\(/.test(code))add(1,'No <code>main()</code> function found.',{append:'\nint main() {\n    return 0;\n}'});
    if(/\bif\s*\([^=!<>]*[^=!<>]=[^=][^)]*\)/.test(stripLine(code,l)))L.forEach((s,i)=>{if(/\bif\s*\(\s*\w+\s*=\s*[^=]/.test(stripLine(s,l)))add(i+1,'Assignment <code>=</code> inside <code>if</code>. Did you mean <code>==</code>?',x=>x.replace(/(\bif\s*\(\s*\w+\s*)=(?!=)/,'$1=='))});
  }
  if(l==='java'){
    if(!/\bclass\s+\w+/.test(code))add(1,'No class found. Java code must live inside a class.',null);
    else if(!/public\s+class\s+Main\b/.test(code)&&/public\s+class\s+\w+/.test(code))add(L.findIndex(s=>/public\s+class/.test(s))+1,'Public class should be named <code>Main</code> (file is Main.java).',x=>x.replace(/public\s+class\s+\w+/,'public class Main'));
    if(!/static\s+void\s+main\s*\(/.test(code))add(1,'No <code>public static void main(String[] args)</code> method.',null);
    L.forEach((s,i)=>{if(/\bif\s*\(\s*\w+\s*=\s*[^=]/.test(stripLine(s,l)))add(i+1,'Assignment <code>=</code> inside <code>if</code>. Did you mean <code>==</code>?',x=>x.replace(/(\bif\s*\(\s*\w+\s*)=(?!=)/,'$1=='))});
  }
  if(l==='js'){L.forEach((s,i)=>{if(/\bif\s*\(\s*\w+\s*=\s*[^=]/.test(stripLine(s,l)))add(i+1,'Assignment <code>=</code> inside <code>if</code>. Did you mean <code>===</code>?',x=>x.replace(/(\bif\s*\(\s*\w+\s*)=(?!=)/,'$1==='))})}
  if(l==='python'){
    const hdr=/^\s*(if|elif|else|for|while|def|class|try|except|finally|with)\b/;
    let prevHdr=null;
    L.forEach((raw,i)=>{const s=stripLine(raw,l);const t=s.trim();if(!t)return;
      const ind=raw.match(/^\s*/)[0].length;
      if(prevHdr&&ind<=prevHdr.ind)add(prevHdr.i+1,'Block has no indented body after this line.',null);
      else if(prevHdr&&ind>prevHdr.ind&&0){}
      prevHdr=null;
      if(hdr.test(t)){
        if(!/:\s*(\S.*)?$/.test(t)&&!/[\[({,\\]$/.test(t))add(i+1,'Missing <code>:</code> at the end of this line.',x=>x.replace(/\s*(#.*)?$/,m=>':'+(m.trim()?' '+m.trim():'')));
        else if(/:\s*$/.test(t))prevHdr={i,ind};
        if(/^\s*(if|elif|while)\s+[^=!<>]*[^=!<>]=[^=]/.test(t))add(i+1,'Assignment <code>=</code> in a condition. Did you mean <code>==</code>?',x=>x.replace(/^(\s*(?:if|elif|while)\s+\w+\s*)=(?!=)/,'$1=='));
      }
      if(/^\s*print\s+[^(\s=]/.test(raw)&&!/^\s*print\s*\(/.test(raw))add(i+1,'Python 3 needs parentheses: <code>print(...)</code>.',x=>x.replace(/^(\s*)print\s+(.*?)\s*$/,'$1print($2)'));
      if(/\b(true|false|null)\b/.test(t))add(i+1,'Use <code>True</code>, <code>False</code>, <code>None</code> in Python.',x=>x.replace(/\btrue\b/g,'True').replace(/\bfalse\b/g,'False').replace(/\bnull\b/g,'None'));
      if(/&&|\|\|/.test(t))add(i+1,'Use <code>and</code> / <code>or</code> instead of <code>&amp;&amp;</code> / <code>||</code>.',x=>x.replace(/&&/g,' and ').replace(/\|\|/g,' or '));
      if(/\t/.test(raw.match(/^\s*/)[0])&&/^ +/.test(raw))add(i+1,'Tabs and spaces are mixed in the indentation.',x=>x.replace(/\t/g,'    '));
    });
    if(prevHdr)add(prevHdr.i+1,'Block has no body after this line.',null);
  }
  if(l==='html'){
    const VOID=new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
    const st=[];const re=/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
    const noC=code.replace(/<!--[\s\S]*?-->/g,m=>m.replace(/[^\n]/g,' ')).replace(/<(script|style)([^>]*)>([\s\S]*?)<\/\1>/gi,(m,a,b,c)=>'<'+a+b+'>'+c.replace(/[^\n]/g,' ')+'</'+a+'>');
    let m;while((m=re.exec(noC))){const line=noC.slice(0,m.index).split('\n').length,tag=m[2].toLowerCase();
      if(m[1]){const j=st.map(x=>x.tag).lastIndexOf(tag);
        if(j<0)add(line,`Closing <code>&lt;/${tag}&gt;</code> has no opening tag.`,null);
        else{while(st.length-1>j){const u=st.pop();add(u.line,`<code>&lt;${u.tag}&gt;</code> is never closed.`,{closeAt:line,tag:u.tag,at:m.index})}st.pop()}}
      else if(!VOID.has(tag)&&!m[4])st.push({tag,line});
      if(tag==='img'&&!/\balt\s*=/.test(m[3]))add(line,'<code>&lt;img&gt;</code> needs an <code>alt</code> attribute.',x=>x.replace(/<img\b/i,'<img alt=""'));}
    st.forEach(u=>{if(!['html','body','head'].includes(u.tag)||1)add(u.line,`<code>&lt;${u.tag}&gt;</code> is never closed.`,{append:`</${u.tag}>`})});
    if(!/<!doctype/i.test(code))add(1,'Missing <code>&lt;!DOCTYPE html&gt;</code>.',{prepend:'<!DOCTYPE html>'});
  }
  return I;
}

function applyFix(l,code){
  let is=lint(l,code);let n=0;
  if(l==='html'){const cl=is.filter(x=>x.fix&&x.fix.closeAt!==undefined).sort((a,b)=>b.fix.at-a.fix.at);
    if(cl.length){cl.forEach(x=>{code=code.slice(0,x.fix.at)+'</'+x.fix.tag+'>'+code.slice(x.fix.at)});n+=cl.length;is=lint(l,code)}}
  let L=code.split('\n');const globals=[];
  const seen=new Set();
  is.forEach(x=>{if(typeof x.fix==='function'){const k=x.line+'|'+x.msg;if(seen.has(k))return;seen.add(k);const o=L[x.line-1];if(o===undefined)return;const v=x.fix(o);if(v!==o){L[x.line-1]=v;n++}}else if(x.fix)globals.push(x.fix)});
  let s=L.join('\n');
  const pre=[],app=[];let after=null;const doneP=new Set();
  globals.forEach(g=>{if(g.prepend&&!doneP.has(g.prepend)){doneP.add(g.prepend);pre.push(g.prepend);n++}
    else if(g.append&&g.closeAt===undefined){app.push(g.append);n++}
    else if(g.afterIncludes){after=g.afterIncludes;n++}
    else if(g.closeAt!==undefined){/* mismatched html close: insert before offending close tag */app.push(null)}});
  if(after){const ls=s.split('\n');let k=-1;ls.forEach((q,i)=>{if(/^\s*#\s*include/.test(q))k=i});ls.splice(k+1,0,...(k<0?[]:['']).slice(0,0),after);s=ls.join('\n')}
  if(pre.length){const nl=pre.filter(p=>!p.startsWith('<!'));const dt=pre.filter(p=>p.startsWith('<!'));s=dt.concat(nl).join('\n')+'\n'+s}
  if(app.filter(Boolean).length){let a=app.filter(Boolean);if(l==='html'){a=[...a].reverse()}
    if(a.some(x=>x.startsWith('\nint main')))s=s.replace(/\s*$/,'')+a.join('');
    else if(/^[)\]}]$/.test(a[0]))s=s.replace(/\s*$/,'')+'\n'+[...a].reverse().join('');
    else s=s.replace(/\s*$/,'')+'\n'+a.join('\n')}
  return{code:s.endsWith('\n')?s:s+'\n',count:n};
}

const KB={
 print:{c:'printf("Hello, %d\\n", 5);',cpp:'cout << "Hello" << endl;',java:'System.out.println("Hello");',python:'print("Hello")',js:'console.log("Hello");',html:'<p>Hello</p>'},
 loop:{c:'for (int i = 0; i < 5; i++) {\n    printf("%d\\n", i);\n}',cpp:'for (int i = 0; i < 5; i++) {\n    cout << i << endl;\n}',java:'for (int i = 0; i < 5; i++) {\n    System.out.println(i);\n}',python:'for i in range(5):\n    print(i)',js:'for (let i = 0; i < 5; i++) {\n  console.log(i);\n}',html:'<ul>\n  <li>One</li>\n  <li>Two</li>\n</ul>'},
 function:{c:'int add(int a, int b) {\n    return a + b;\n}',cpp:'int add(int a, int b) {\n    return a + b;\n}',java:'static int add(int a, int b) {\n    return a + b;\n}',python:'def add(a, b):\n    return a + b',js:'const add = (a, b) => a + b;',html:'<button onclick="hi()">Hi</button>'},
 array:{c:'int a[3] = {1, 2, 3};',cpp:'vector<int> a = {1, 2, 3};',java:'int[] a = {1, 2, 3};',python:'a = [1, 2, 3]',js:'const a = [1, 2, 3];',html:'<ol><li>1</li><li>2</li></ol>'},
 input:{c:'int x;\nscanf("%d", &x);',cpp:'int x;\ncin >> x;',java:'Scanner sc = new Scanner(System.in);\nint x = sc.nextInt();',python:'x = int(input())',js:'const x = prompt("Value?");',html:'<input type="text">'}
};


function plain(h){const t=document.createElement('div');t.innerHTML=h;return t.textContent.replace(/\s+/g,' ').trim()}
const panel=$('#dpanel'),tip=$('#tip'),badge=$('#badge');
function showTip(t,ms){tip.textContent=t;tip.hidden=false;clearTimeout(showTip.t);showTip.t=setTimeout(()=>tip.hidden=true,ms||5000)}
function togglePanel(open){panel.hidden=!open;if(open){tip.hidden=true;D.unread=0;badge.hidden=true;$('#log').scrollTop=1e9;setTimeout(()=>$('#askin').focus(),30)}}
$('#fab').onclick=()=>togglePanel(panel.hidden);$('#dclose').onclick=()=>togglePanel(false);
const drake={
  draw,
  setMood(m){D.mood=m;clearTimeout(D.rt);if(m==='happy'||m==='sad')D.rt=setTimeout(()=>drake.setMood('idle'),6000);else if(m==='wow')D.rt=setTimeout(()=>{if(D.mood==='wow')drake.setMood('idle')},1800)},
  say(h,alert){const d=document.createElement('div');d.className='msg';d.innerHTML=h;$('#log').appendChild(d);$('#log').scrollTop=1e9;D.talk=8;
    if(panel.hidden&&alert){D.unread++;badge.textContent=D.unread;badge.hidden=false;showTip(plain(h).slice(0,70)+'...');const f=$('#fab');f.classList.remove('ping');void f.offsetWidth;f.classList.add('ping')}},
  me(t){const d=document.createElement('div');d.className='msg me';d.textContent=t;$('#log').appendChild(d);$('#log').scrollTop=1e9},
  react(kind,err){
    if(kind==='ok'){drake.setMood('happy');drake.say('<span class="ok">Ran with no errors.</span>')}
    else{drake.setMood('sad');drake.say('<span class="bad">I found a problem.</span>\n'+explain(err)+'\nPress <b>FIX CODE</b> and I will try to correct it.',true)}},
  check(q){return runCheck(q)},fix(){return runFix()}
};
function runCheck(quiet){
  const code=cm.getValue();const is=lint(lang,code);
  if(!is.length){clearMarks();if(!quiet)drake.setMood('happy');drake.say('<span class="ok">I read the whole file and found no problems.</span>');return is}
  markLines([...new Set(is.map(x=>x.line))]);drake.setMood('sad');
  drake.say(`<span class="warn">I found ${is.length} issue${is.length>1?'s':''}:</span>\n`+is.slice(0,8).map(x=>`\u2022 line ${x.line}: ${x.msg}`).join('\n')+(is.length>8?`\n...and ${is.length-8} more`:'')+'\nPress <b>FIX CODE</b> to correct what I can.',true);
  return is}
function runFix(){
  const before=cm.getValue();let cur2=before,total=0;
  for(let k=0;k<3;k++){const r=applyFix(lang,cur2);if(r.code===cur2)break;cur2=r.code;total+=r.count}
  if(cur2===before){const rest=lint(lang,before);
    if(rest.length){markLines(rest.map(x=>x.line));drake.setMood('sad');drake.say('I see issues I cannot fix automatically:\n'+rest.slice(0,6).map(x=>`\u2022 line ${x.line}: ${x.msg}`).join('\n'))}
    else if(State.lastErr){drake.setMood('sad');drake.say('My checks pass, but the last run failed:\n'+explain(State.lastErr)+'\nThat looks like a logic or runtime problem. Check the marked line.')}
    else{drake.setMood('happy');drake.say('<span class="ok">Nothing to fix.</span> Your code looks clean.')}
    return}
  cm.setValue(cur2);clearMarks();State.lastErr='';const rest=lint(lang,cur2);
  drake.setMood(rest.length?'think':'happy');
  drake.say(`<span class="ok">Fixed ${total} thing${total>1?'s':''}.</span>`+(rest.length?` ${rest.length} left that I cannot fix myself:\n`+rest.slice(0,5).map(x=>`\u2022 line ${x.line}: ${x.msg}`).join('\n'):' Press Run to try it.'))}
/* ---------- rule-based explain / optimize (used when no AI key is set) ---------- */
function codeCtx(){const sel=cm.getSelection(),f=activeFile();return{code:sel||cm.getValue(),sel:!!sel,lang:langOfName(f.name),name:f.name}}
function ruleExplain(c){
  const t=c.code,l=c.lang,lines=t.split('\n').length,P=[];
  const fn=[];let m;const rx={python:/^\s*def\s+(\w+)\s*\(([^)]*)\)/gm,js:/function\s+(\w+)\s*\(([^)]*)\)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?([^)=]*)\)?\s*=>/g,
    java:/^\s*(?:public|private|protected|static|\s)*[\w<>\[\]]+\s+(\w+)\s*\(([^)]*)\)\s*\{/gm,c:/^\s*[\w\*]+\s+\**(\w+)\s*\(([^;{)]*)\)\s*\{/gm,cpp:/^\s*[\w:<>\*&]+\s+\**(\w+)\s*\(([^;{)]*)\)\s*\{/gm}[l];
  if(rx)while((m=rx.exec(t))){const n=m[1]||m[3];if(n&&!/^(if|for|while|switch|catch)$/.test(n))fn.push(n+'('+String(m[2]!=null&&m[1]?m[2]:m[4]||'').trim()+')')}
  const cls=[...t.matchAll(/\bclass\s+(\w+)/g)].map(x=>x[1]);
  const cnt=r=>(t.match(r)||[]).length,loops=cnt(/\b(for|while)\b/g),ifs=cnt(/\bif\b/g),prints=cnt(/\b(print|printf|puts|cout|console\.log|System\.out\.print\w*)\b/g),inputs=cnt(/\b(input\(|scanf|cin\s*>>|Scanner|prompt\()/g);
  if(l==='html'){const tags=[...new Set([...t.matchAll(/<([a-z][\w-]*)/gi)].map(x=>x[1].toLowerCase()))];
    P.push(`This is an HTML page of ${lines} lines using ${tags.slice(0,8).map(x=>'<code>&lt;'+x+'&gt;</code>').join(', ')}.`);
    if(/<script/i.test(t))P.push('It includes JavaScript, so the page can react to clicks and change itself.');if(/<style|stylesheet/i.test(t))P.push('It has CSS that controls how the page looks.');return P.join('\n')}
  if(l==='css'){const rules=cnt(/\{/g);return `This stylesheet has ${rules} rule${rules===1?'':'s'}. Each rule picks elements (the selector) and sets how they look (the properties inside the braces).`}
  P.push(`This ${LANGS[l]?LANGS[l].name:''} ${c.sel?'selection':'file'} has ${lines} lines.`);
  if(cls.length)P.push('Classes: '+cls.map(x=>'<code>'+esc(x)+'</code>').join(', ')+'.');
  if(fn.length)P.push('Functions: '+fn.slice(0,8).map(x=>'<code>'+esc(x)+'</code>').join(', ')+'.');
  const bits=[];if(loops)bits.push(`${loops} loop${loops>1?'s':''}`);if(ifs)bits.push(`${ifs} condition${ifs>1?'s':''}`);if(prints)bits.push(`${prints} output statement${prints>1?'s':''}`);if(inputs)bits.push(`${inputs} input read${inputs>1?'s':''}`);
  if(bits.length)P.push('It uses '+bits.join(', ')+'.');
  const rec=fn.map(x=>x.split('(')[0]).filter(n=>new RegExp('\\b'+n+'\\s*\\(','g').test(t)&&(t.match(new RegExp('\\b'+n+'\\s*\\(','g'))||[]).length>2);
  if(rec.length&&/def |function |int |void /.test(t))P.push('<code>'+esc(rec[0])+'</code> may call itself (recursion). Check that it has a stopping case.');
  if(/\bimport\b|#include|require\(/.test(t))P.push('It imports libraries at the top.');
  const base=c.sel?cm.getCursor('from').line:0,W=walkLines(t,l,base);if(W.length)P.push('<b>Walkthrough</b>\n'+W.join('\n'));
  P.push('<span class="warn">Add an ANTHROPIC_API_KEY on Vercel for deeper AI explanations.</span>');return P.join('\n')}
function lineNums(t){const s=new Set();let m;const a=/[\w.]+\.(?:c|cpp|java|py|js)[:](\d+)/g,b=/line (\d+)/gi;while((m=a.exec(t)))s.add(+m[1]);while((m=b.exec(t)))s.add(+m[1]);return[...s]}
function walkLines(t,l,base){
  const out=[],L=t.split('\n'),q=s=>'<code>'+esc(String(s).trim().slice(0,46))+'</code>';
  const R=[
   ['c cpp',/^\s*#\s*include\s*[<"]([^>"]+)/,m=>`brings in the ${q(m[1])} library`],
   ['cpp',/^\s*using\s+namespace\s+(\w+)/,()=>'lets you write <code>cout</code> instead of <code>std::cout</code>'],
   ['python',/^\s*(?:import|from)\s+(\S+)/,m=>`imports ${q(m[1])}`],
   ['js',/^\s*(?:import\b|.*\brequire\()/,()=>'loads a library'],
   ['python',/^\s*def\s+(\w+)\s*\(([^)]*)\)/,m=>`defines the function ${q(m[1])}${m[2].trim()?' that takes '+q(m[2]):''}`],
   ['python java',/^\s*(?:public\s+)?class\s+(\w+)/,m=>`defines the class ${q(m[1])}`],
   ['all',/^\s*(?:\}\s*)?(?:else\s+if|elif)\b\s*\(?(.*?)\)?\s*[:{]?\s*$/,m=>`otherwise checks ${q(m[1])}`],
   ['all',/^\s*(?:\}\s*)?else\b/,()=>'otherwise runs this branch'],
   ['all',/^\s*if\b\s*\(?(.+?)\)?\s*[:{]?\s*$/,m=>`runs the next block only if ${q(m[1])} is true`],
   ['python',/^\s*for\s+(\w+)\s+in\s+(.+?):/,m=>`loops: ${q(m[1])} takes each value of ${q(m[2])} in turn`],
   ['c cpp java js',/^\s*for\s*\((.*)\)/,m=>`loops using ${q(m[1])}`],
   ['all',/^\s*while\b\s*\(?(.+?)\)?\s*[:{]?\s*$/,m=>`repeats while ${q(m[1])} is true`],
   ['python',/^\s*yield\s+(.+)/,()=>'hands out one value at a time (a generator)'],
   ['all',/^\s*return\b\s*(.*)$/,m=>{const v=m[1].replace(/;\s*$/,'').trim();return v?`gives back ${q(v)}`:'ends the function'}],
   ['python',/^\s*(try|except|finally)\b/,m=>({try:'tries code that might fail',except:'handles the failure',finally:'always runs at the end'}[m[1]])],
   ['all',/\b(?:print|printf|puts|cout|console\.log|System\.out\.print(?:ln)?)\b/,()=>'prints to the output'],
   ['all',/\b(?:input\(|scanf|cin\s*>>|Scanner|prompt\()/,()=>'reads input from the user'],
   ['js',/^\s*(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,m=>`defines the function ${q(m[1])}`],
   ['js',/^\s*(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?[^)=]*\)?\s*=>/,m=>`defines the arrow function ${q(m[1])}`],
   ['js',/^\s*(?:const|let|var)\s+(\w+)\s*=\s*(.+?);?\s*$/,m=>`stores ${q(m[2])} in ${q(m[1])}`],
   ['js',/document\.|getElementById|querySelector/,()=>'reads or changes the web page'],
   ['js',/addEventListener|\.onclick/,()=>'reacts to a user event'],
   ['c cpp java',/^\s*(?:public\s+|private\s+|static\s+|final\s+)*(?:int|long|float|double|char|bool|boolean|String|string|auto|vector<[^>]*>)\s+(\w+)\s*(?:=\s*(.+?))?;/,m=>m[2]?`creates ${q(m[1])} set to ${q(m[2])}`:`creates the variable ${q(m[1])}`],
   ['c cpp java',/^\s*(?:public\s+|private\s+|static\s+|final\s+)*[\w<>\[\]:*&]+\s+(\w+)\s*\(([^;]*)\)\s*\{?\s*$/,m=>`defines ${q(m[1]+'('+m[2].trim()+')')}${m[1]==='main'?', where the program starts':''}`],
   ['python',/^\s*([A-Za-z_][\w, ]*?)\s*=\s*(.+)$/,m=>`stores ${q(m[2])} in ${q(m[1])}`]
  ];
  for(let i=0;i<L.length&&out.length<14;i++){const s=L[i];if(!s.trim()||/^\s*(#(?!\s*include)|\/\/|\/\*|\*)/.test(s)||/^\s*[{}]\s*;?$/.test(s))continue;
    for(const[lg,re,fn]of R){if(lg!=='all'&&lg.split(' ').indexOf(l)<0)continue;const m=re.exec(s);if(m){out.push(`\u2022 line ${base+i+1}: ${fn(m)}.`);break}}}
  return out}
function ruleOptimize(c){
  const L=c.code.split('\n'),l=c.lang,S=[];const add=(i,m)=>S.push(`\u2022 line ${i+1}: ${m}`);
  L.forEach((s,i)=>{
    if(l==='python'){if(/for\s+\w+\s+in\s+range\(len\(/.test(s))add(i,'use <code>enumerate(items)</code> instead of <code>range(len(items))</code>.');if(/[=!]=\s*None/.test(s))add(i,'compare with <code>is None</code> / <code>is not None</code>.');
      if(/==\s*True|==\s*False/.test(s))add(i,'write the condition directly, without comparing to True or False.');if(/^\s*\w+\s*\+=\s*['"f]/.test(s)&&L.slice(Math.max(0,i-3),i).some(x=>/\b(for|while)\b/.test(x)))add(i,'building a string with <code>+=</code> in a loop is slow. Collect parts in a list and use <code>"".join(parts)</code>.');
      if(/\.append\(/.test(s)&&/^\s*for\b/.test(L[i-1]||''))add(i,'a loop that only appends can often be a list comprehension.');if(/\bopen\(/.test(s)&&!/\bwith\b/.test(s))add(i,'open files with <code>with open(...) as f:</code> so they always close.')}
    if(l==='js'){if(/\bvar\s/.test(s))add(i,'use <code>let</code> or <code>const</code> instead of <code>var</code>.');if(/[^=!]==[^=]/.test(s.replace(/"[^"]*"|'[^']*'/g,'')))add(i,'prefer <code>===</code> over <code>==</code>.');
      if(/for\s*\(.*\.length/.test(s))add(i,'consider <code>for...of</code>, <code>map</code> or <code>forEach</code>, or cache <code>.length</code>.');if(/\+=\s*['"`]/.test(s)&&L.slice(Math.max(0,i-3),i).some(x=>/\b(for|while)\b/.test(x)))add(i,'collect strings in an array and <code>join</code> them.')}
    if(l==='cpp'){if(/\bendl\b/.test(s))add(i,'<code>endl</code> flushes every time. Use <code>"\\n"</code> in loops.');if(/\(\s*(std::)?(vector|string)\s*<?[^&)]*\s+\w+\s*[,)]/.test(s)&&!/&/.test(s)&&/\)\s*\{?\s*$/.test(s))add(i,'pass large objects by <code>const&amp;</code> to avoid copies.');
      if(/\bfor\s*\(.*strlen\(/.test(s))add(i,'<code>strlen</code> runs every iteration. Compute it once before the loop.')}
    if(l==='c'){if(/\bgets\s*\(/.test(s))add(i,'<code>gets</code> is unsafe. Use <code>fgets</code>.');if(/\bfor\s*\(.*strlen\(/.test(s))add(i,'<code>strlen</code> runs every iteration. Compute it once before the loop.')}
    if(l==='java'){if(/\w+\s*\+=\s*"/.test(s)&&L.slice(Math.max(0,i-3),i).some(x=>/\b(for|while)\b/.test(x)))add(i,'use <code>StringBuilder</code> instead of <code>String +=</code> in loops.');if(/==\s*"|"\s*==/.test(s))add(i,'compare strings with <code>.equals()</code>, not <code>==</code>.');
      if(/catch\s*\([^)]*\)\s*\{\s*\}/.test(s))add(i,'an empty <code>catch</code> hides errors. Log or handle the exception.');if(/new\s+(Integer|Double|Long)\s*\(/.test(s))add(i,'use <code>valueOf</code> or autoboxing.')}
  });
  if(l==='c'&&/\bmalloc\(/.test(c.code)&&!/\bfree\(/.test(c.code))S.push('\u2022 you call <code>malloc</code> but never <code>free</code>. That leaks memory.');
  return S.length?`<span class="warn">${S.length} suggestion${S.length>1?'s':''}:</span>\n`+S.slice(0,10).join('\n'):'<span class="ok">No obvious improvements found.</span> The code looks tidy.';
}
/* ---------- AI (optional) ---------- */
let aiOK=null;
function setAiBadge(){const b=$('#aiMode');b.textContent=aiOK?'AI':'RULES';b.classList.toggle('on',!!aiOK);b.title=aiOK?'Answers come from Claude':'Built-in rules. Set ANTHROPIC_API_KEY on Vercel for AI answers.'}
function mdHtml(t){return esc(t).replace(/```[\w]*\n?([\s\S]*?)```/g,(m,c)=>'<pre>'+c.trim()+'</pre>').replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>')}
async function askAI(mode,question){
  const c=codeCtx();drake.setMood('think');
  try{const r=await fetch('/api/drake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,lang:c.lang,code:c.code,error:State.lastErr||'',question:question||''})});
    if(r.status===503||r.status===404){aiOK=false;setAiBadge();return null}
    const j=await r.json().catch(()=>({}));if(!r.ok){drake.setMood('sad');drake.say('<span class="bad">'+esc(j.error||'AI error')+'</span>');return undefined}
    aiOK=true;setAiBadge();drake.setMood('happy');return j.text}catch(e){return null}}
$('#explain').onclick=async()=>{const c=codeCtx();drake.say(`Explaining ${c.sel?'your selection':esc(c.name)}...`);const t=await askAI('explain');if(t)drake.say(mdHtml(t));else if(t===null){drake.setMood('idle');drake.say(ruleExplain(c))}};
$('#debug').onclick=async()=>{
  const c=codeCtx();drake.say(`Debugging ${c.sel?'your selection':esc(c.name)}...`);
  if(aiOK!==false&&(State.lastErr||PROBS.lint.length||PROBS.run.length)){const t=await askAI('debug');if(t){drake.say(mdHtml(t));return}if(t===undefined)return}
  const is=runCheck(true);if(State.lastErr){const ls=lineNums(State.lastErr).slice(0,3),src=cm.getValue().split('\n');
    drake.say('<span class="bad">Last run failed.</span>\n'+explain(State.lastErr)+(ls.length?'\n\n<b>Where:</b>\n'+ls.map(n=>`\u2022 line ${n}: <code>${esc((src[n-1]||'').trim().slice(0,60))}</code>`).join('\n'):'')+'\n\n<b>Next:</b> fix the marked line, or press <b>FIX</b> and I will try. Then run again.');drake.setMood('think')}else if(!is.length)drake.say('Nothing is wrong that I can see. Run the code, and if it fails I will read the error.')};
$('#optimize').onclick=async()=>{const c=codeCtx();drake.say(`Looking for improvements in ${c.sel?'your selection':esc(c.name)}...`);const t=await askAI('optimize');if(t)drake.say(mdHtml(t));else if(t===null){drake.setMood('happy');drake.say(ruleOptimize(c))}};
$('#fix').onclick=()=>runFix();
/* ---------- navigation and chat ---------- */
const PF='https://karanportfolio-ashen.vercel.app/';
const SECTIONS={about:'About',skills:'Skills',work:'Work',projects:'Work',player:'Player',arcade:'Arcade',contact:'Contact'};
function openSection(key){const name=SECTIONS[key],url=PF+'#'+name.toLowerCase();drake.setMood('wink');
  try{window.open(url,'_blank','noopener')}catch(e){}
  return`Taking you to <a href="${url}" target="_blank" rel="noopener">${name} on Karan's portfolio</a>. If a new tab did not open, tap the link.`}
function navigate(t){
  if(!/\b(go to|goto|open|show|take me|navigate|scroll|switch to|jump to)\b/.test(t)&&!/^(output|terminal|problems|footer|editor|game|examples|github|visualizer|about|skills|work|projects|player|arcade|contact)$/.test(t))return null;
  const tab=k=>{showTab(k);$('#outBox').scrollIntoView({behavior:'smooth',block:'nearest'})};
  const sec=/\b(about|skills|work|projects|player|arcade|contact)\b/.exec(t);if(sec&&!/output|terminal|problem|editor|footer|game|example|github|visuali|live|theme|file/.test(t))return openSection(sec[1]);
  if(/problem|error list/.test(t)){tab('prob');return'Showing <b>Problems</b>.'}
  if(/terminal|stdin/.test(t)){tab('term');return'Opened the <b>Terminal</b> tab. Type program input at the bottom.'}
  if(/preview/.test(t)){if($('#t-prev').hidden)return'There is no HTML file open, so there is no preview yet.';tab('prev');return'Showing the <b>Preview</b>.'}
  if(/output|console/.test(t)){tab('out');return'Showing <b>Output</b>.'}
  if(/example/.test(t)){openExamples(null,$('#exBtn'));return'Here are some examples.'}
  if(/github|git hub/.test(t)){$('#gh').click();return'Opening GitHub tools.'}
  if(/visuali[sz]/.test(t)){$('#viz').click();return'Opening the algorithm visualizer.'}
  if(/live|collab|room|multiplayer/.test(t)){$('#live').click();return'Opening live coding.'}
  if(/my codes|projects|saved/.test(t)){$('#mine').click();return'Here are your saved projects.'}
  if(/save/.test(t)){openSave();return'Opening save.'}
  if(/theme|colou?r/.test(t)){$('#theme').click();return'Pick a theme.'}
  if(/full ?screen/.test(t)){setFs(true);return'Full screen. Press Esc to leave.'}
  if(/footer|game|play|bottom|coin|mobs?/.test(t)){$('#footer').scrollIntoView({behavior:'smooth'});return'Scrolling to the game. Click the scene, then use A/D and W.'}
  if(/portfolio/.test(t)){const a=document.querySelector('.flinks a[href*=karanportfolio]');if(a)a.click();return'Opening Karan\'s portfolio.'}
  if(/editor|code/.test(t)){cm.focus();$('#edBox').scrollIntoView({behavior:'smooth',block:'center'});return'Back to the editor.'}
  if(/top|home/.test(t)){scrollTo({top:0,behavior:'smooth'});return'Back to the top.'}
  return null;
}
function answer(q){
  const t=q.toLowerCase().trim();
  if(/^(hi|hello|hey|yo)\b|who are you|your name/.test(t))return `I am <b>Drake</b>, the AI bot inside Karan's Arcode. I can <b>explain</b>, <b>debug</b>, <b>optimize</b> and <b>fix</b> your code, and take you to any part of the page.`;
  const nav=navigate(t);if(nav)return nav;
  if(/^explain\b/.test(t)&&!/error/.test(t)){setTimeout(()=>$('#explain').click(),50);return'On it.'}
  if(/debug/.test(t)){setTimeout(()=>$('#debug').click(),50);return'Debugging...'}
  if(/optimi[sz]e|faster|improve/.test(t)){setTimeout(()=>$('#optimize').click(),50);return'Looking for improvements...'}
  if(/explain|why|error|wrong|bug/.test(t))return State.lastErr?explain(State.lastErr):'Run your code first, or press DEBUG, and I will explain what I find.';
  if(/fix|correct|repair/.test(t)){setTimeout(runFix,50);return'On it.'}
  if(/check|review|scan/.test(t)){setTimeout(()=>runCheck(),50);return'Reading your code...'}
  if(/focus|coding mode|distract|quiet|stop animation/.test(t)){setFocus(true);return'Focus mode is on. All animation is paused.'}
  if(/theme|mode|neon|dark|light|cyber|punk|dracula|zen|black/.test(t)){const m=/zen|black/.test(t)?'zen':/neon/.test(t)?'neon':/cyber|punk/.test(t)?'cyberpunk':/dracula/.test(t)?'dracula':/light/.test(t)?'light':'dark';setMode(m);return`Switched to ${m} mode.`}
  for(const k in KB)if(t.includes(k)||(k==='print'&&/output|show|hello world/.test(t))||(k==='loop'&&/iterate|repeat/.test(t))||(k==='input'&&/read|scanf|cin/.test(t)))return`Here is ${k} in ${LANGS[lang]?LANGS[lang].name:''}:\n<code>${esc(KB[k][lang]||KB[k].python)}</code>`;
  return null}
$('#askf').onsubmit=async e=>{e.preventDefault();const v=$('#askin').value.trim();if(!v)return;$('#askin').value='';drake.me(v);
  const a=answer(v);if(a){setTimeout(()=>drake.say(a),250);return}
  if(aiOK!==false){const t=await askAI('chat',v);if(t){drake.say(mdHtml(t));return}}
  drake.say('I can explain, debug, optimize or fix your code, show a snippet ("how to loop"), or take you somewhere ("go to output").')};
/* ---------- moods: wink on click, sleep when idle ---------- */
let lastAct=Date.now();
const wake=()=>{lastAct=Date.now();if(D.mood==='sleep')drake.setMood('idle')};
addEventListener('pointerdown',wake,true);addEventListener('keydown',wake,true);
$('#fab').addEventListener('click',()=>{if(panel.hidden===false){drake.setMood('wink');setTimeout(()=>{if(D.mood==='wink')drake.setMood('idle')},1100)}});
setInterval(()=>{if(Date.now()-lastAct>45000&&D.mood==='idle')D.mood='sleep'},5000);
/* quick navigation chips */
(function(){const bar=document.getElementById('navchips');if(!bar)return;
  [['Output','go to output'],['Terminal','go to terminal'],['Game','go to footer'],['About','open about'],['Skills','open skills'],['Work','open work'],['Player','open player'],['Arcade','open arcade'],['Contact','open contact']].forEach(([l,q])=>{
    const b=document.createElement('button');b.type='button';b.textContent=l;b.onclick=()=>{drake.me(q);const a=answer(q);if(a)setTimeout(()=>drake.say(a),200)};bar.appendChild(b)})})();
window.drake=drake;
setAiBadge();draw();
drake.say('Hi, I am <b>Drake</b>. Select some code and press <b>EXPLAIN</b>, <b>DEBUG</b> or <b>OPTIMIZE</b>. You can also type "go to output" or "open github".');
setTimeout(()=>{if(panel.hidden)showTip('Hi, I am Drake. Click me to explain, debug or fix your code.',6000)},1200);
