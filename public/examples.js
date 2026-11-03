/* Example programs. Clicking one opens it in a new file tab. */
const EXAMPLES={
python:[
 {t:'FizzBuzz',f:'fizzbuzz.py',c:`for i in range(1, 21):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
`},
 {t:'Classes and objects',f:'bank.py',c:`class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount
        return self.balance

acc = Account("Karan", 100)
print(acc.owner, acc.deposit(50))
`},
 {t:'Recursion: factorial',f:'factorial.py',c:`def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

for n in range(1, 8):
    print(n, "! =", factorial(n))
`},
 {t:'Read input',f:'greet.py',c:`name = input("Your name? ")
age = int(input("Your age? "))
print("Hello,", name, "- next year you will be", age + 1)
`}],
js:[
 {t:'Array methods',f:'arrays.js',c:`const nums = [1, 2, 3, 4, 5, 6];
const even = nums.filter(n => n % 2 === 0);
const squares = nums.map(n => n * n);
const total = nums.reduce((a, b) => a + b, 0);
console.log(even, squares, total);
`},
 {t:'Closures',f:'counter.js',c:`function makeCounter() {
  let count = 0;
  return () => ++count;
}
const next = makeCounter();
console.log(next(), next(), next());
`},
 {t:'Async and promises',f:'async.js',c:`const wait = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));
async function main() {
  console.log("start");
  const a = await wait(200, "first");
  const b = await wait(100, "second");
  console.log(a, b, "done");
}
main();
`}],
html:[
 {t:'Counter app',f:'counter.html',c:`<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;text-align:center;padding:40px">
  <h1 id="n">0</h1>
  <button onclick="n.textContent = +n.textContent + 1">+1</button>
  <button onclick="n.textContent = 0">Reset</button>
</body>
</html>
`},
 {t:'Responsive card',f:'card.html',c:`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: system-ui; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #15122b; }
  .card { background: #f3efe6; padding: 24px; width: min(320px, 90vw); border: 4px solid #ee6a7c; box-shadow: 8px 8px 0 #6fdcff; }
</style>
</head>
<body>
  <div class="card"><h2>Pixel card</h2><p>Resize the preview to see it adapt.</p></div>
</body>
</html>
`},
 {t:'Canvas animation',f:'canvas.html',c:`<!DOCTYPE html>
<html>
<body style="margin:0;background:#000">
<canvas id="c" width="400" height="240"></canvas>
<script>
  const ctx = c.getContext('2d'); let x = 0;
  (function loop() {
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(0, 0, 400, 240);
    ctx.fillStyle = '#f7d154'; ctx.fillRect(x % 400, 110 + Math.sin(x / 15) * 60, 12, 12);
    x += 3; requestAnimationFrame(loop);
  })();
<\/script>
</body>
</html>
`}],
java:[
 {t:'Classes and objects',f:'Main.java',c:`public class Main {
    static class Dog {
        String name;
        Dog(String name) { this.name = name; }
        String speak() { return name + " says woof"; }
    }
    public static void main(String[] args) {
        Dog d = new Dog("Rex");
        System.out.println(d.speak());
    }
}
`},
 {t:'ArrayList and loops',f:'Main.java',c:`import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>(List.of(5, 3, 8, 1));
        Collections.sort(list);
        for (int n : list) System.out.println(n);
    }
}
`},
 {t:'Read input',f:'Main.java',c:`import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt(), b = sc.nextInt();
        System.out.println("Sum = " + (a + b));
    }
}
`}],
c:[
 {t:'Pointers',f:'pointers.c',c:`#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a; *a = *b; *b = t;
}

int main() {
    int x = 3, y = 9;
    swap(&x, &y);
    printf("x=%d y=%d\\n", x, y);
    return 0;
}
`},
 {t:'Structs',f:'student.c',c:`#include <stdio.h>

struct Student { char name[20]; int marks; };

int main() {
    struct Student s = {"Karan", 92};
    printf("%s scored %d\\n", s.name, s.marks);
    return 0;
}
`},
 {t:'Read input',f:'sum.c',c:`#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("Sum = %d\\n", a + b);
    return 0;
}
`}],
cpp:[
 {t:'Vector and sort',f:'sort.cpp',c:`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> v = {5, 2, 9, 1, 7};
    sort(v.begin(), v.end());
    for (int x : v) cout << x << " ";
    cout << endl;
    return 0;
}
`},
 {t:'Classes',f:'shapes.cpp',c:`#include <iostream>
using namespace std;

class Rect {
public:
    double w, h;
    Rect(double w, double h) : w(w), h(h) {}
    double area() const { return w * h; }
};

int main() {
    Rect r(3, 4.5);
    cout << "Area: " << r.area() << endl;
    return 0;
}
`},
 {t:'Read input',f:'sum.cpp',c:`#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << "Sum = " << a + b << endl;
    return 0;
}
`}]
};
function openExamples(only,anchor){
  popover(anchor||$('#exBtn'),m=>{
    const langs=only?[only]:['python','js','html','java','c','cpp'];
    langs.forEach(l=>{const h=document.createElement('h4');h.textContent=LANGS[l].name.toUpperCase()+' EXAMPLES';m.appendChild(h);
      EXAMPLES[l].forEach(ex=>{const b=document.createElement('button');b.innerHTML=`${esc(ex.t)}<small>${esc(ex.f)}</small>`;
        b.onclick=()=>{closeMenu();const f=addFile(ex.f,ex.c);if(f){toast('Opened '+f.name);window.drake&&drake.say(`Opened the <b>${esc(ex.t)}</b> example. Press Run to try it.`)}};m.appendChild(b)})})})}
$('#exBtn').onclick=e=>openExamples(null,e.currentTarget);
document.querySelectorAll('#chips button').forEach(b=>b.onclick=()=>openExamples(b.dataset.l,b));
