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
  else if(m==='think'){const o=(f%6<3)?0:1;px(5+o,6+b,2,2,ac);px(9+o,6+b,2,2,ac);px(6,9+b,(f%4<2)?4:2,1,ln)}
  else{if(f%16===0){px(5,7+b,2,1,ln);px(9,7+b,2,1,ln)}else{px(5,6+b,2,2,ln);px(9,6+b,2,2,ln)}if(D.talk>0)px(7,9+b,2,1,ln)}
  px(4,12+b,8,1,ln);px(3,13,10,3,ln);px(4,14,8,2,c1);
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
  setMood(m){D.mood=m;clearTimeout(D.rt);if(m==='happy'||m==='sad')D.rt=setTimeout(()=>drake.setMood('idle'),6000)},
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
$('#check').onclick=()=>runCheck();$('#fix').onclick=()=>runFix();
$('#explain').onclick=()=>drake.say(State.lastErr?explain(State.lastErr):'Run your code first and I will explain any error.');
function answer(q){
  const t=q.toLowerCase().trim();
  if(/^(hi|hello|hey|yo)\b|who are you|your name/.test(t))return `I am <b>Drake</b>, the AI bot inside Karan's Code Editor. I read your ${LANGS[lang].name} code, spot errors, explain them and fix them.`;
  if(/explain|why|error|wrong|bug/.test(t))return State.lastErr?explain(State.lastErr):'Run your code first, or press CHECK, and I will explain what I find.';
  if(/fix|correct|repair/.test(t)){setTimeout(runFix,50);return 'On it.'}
  if(/check|review|scan/.test(t)){setTimeout(()=>runCheck(),50);return 'Reading your code...'}
  if(/focus|coding mode|distract|quiet|stop animation/.test(t)){setFocus(true);return 'Focus mode is on. All animation is paused.'}
  if(/theme|mode|neon|dark|light|cyber|punk/.test(t)){const m=/zen|black/.test(t)?'zen':/neon/.test(t)?'neon':/cyber|punk/.test(t)?'cyberpunk':/light/.test(t)?'light':'dark';setMode(m);return `Switched to ${m} mode.`}
  if(/save/.test(t)){setTimeout(openSave,50);return 'Opening save.'}
  for(const k in KB)if(t.includes(k)||(k==='print'&&/output|show|hello world/.test(t))||(k==='loop'&&/iterate|repeat/.test(t))||(k==='input'&&/read|scanf|cin/.test(t)))return `Here is ${k} in ${LANGS[lang].name}:\n<code>${esc(KB[k][lang])}</code>`;
  return 'I can check code, explain errors, fix mistakes, or show a snippet. Try "how to loop", "explain error" or "fix".'}
$('#askf').onsubmit=e=>{e.preventDefault();const v=$('#askin').value.trim();if(!v)return;$('#askin').value='';drake.me(v);setTimeout(()=>drake.say(answer(v)),250)};
window.drake=drake;
setLang(lang,true);draw();
drake.say('Hi, I am <b>Drake</b>. I spot errors in your code and fix them. Try breaking the sample, then press <b>CHECK</b>.');
setTimeout(()=>{if(panel.hidden)showTip('Hi, I am Drake. Click me to check or fix your code.',6000)},1200);
