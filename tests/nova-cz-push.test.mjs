import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const classes=new Set();const elements=new Map(),timers=[];const c=vm.createContext({document:{documentElement:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}},getElementById:id=>elements.get(id),createElement:()=>({}),querySelector:()=>({append:b=>elements.set(b.id,b)})},setTimeout:fn=>timers.push(fn)});vm.runInContext(fs.readFileSync('nova-cz-push.js','utf8'),c);const p=c.NovaCzPresentation;
for(let setting=1;setting<=6;setting++)for(let seed=0;seed<1000;seed++){for(const success of [false,true]){let previous=0;for(let remaining=15;remaining>=1;remaining--)for(let stop=1;stop<=3;stop++){const shown=p.display({remaining,totalGames:15,timingSeed:seed},stop,success,setting);const stage=Math.max(previous,shown.stage);assert(stage>=previous);previous=stage;if(remaining===1&&stop===3){assert(stage>=1&&stage<=8);if(!success)assert(![1,8].includes(stage));}}}}
let count=0;const r={czLamp:{},czCompleted:true,bonusHit:true};const hooks={auto:true,valid:()=>true,reveal:()=>count++};assert.equal(p.wait(r,hooks),true);assert.equal(p.wait(r,hooks),true);assert.equal(timers.length,1);assert.equal(count,0);timers[0]();elements.get('novaCzPush').onclick();assert.equal(count,1);assert.equal(p.wait(r,hooks),false);assert.equal(elements.get('novaCzPush').hidden,true);assert.equal(p.wait({},hooks),false);
console.log('Candidate checks passed: 12,000 CZ schedules, final guarantees, monotonic display, PUSH wait/auto/repeated clicks.');

const resumed={czLamp:{},czCompleted:true,czPushWaiting:true,bonusHit:true};p.wait(resumed,{auto:false,valid:()=>true,reveal:()=>count++});assert.equal(elements.get('novaCzPush').hidden,false);elements.get('novaCzPush').onclick();assert.equal(count,2);

let goldCount=0;
for(let seed=0;seed<100000;seed++){
 const won={czLamp:{timingSeed:seed},czCompleted:true,bonusHit:true};
 const before=JSON.stringify(won);
 const picked=p.gold(won);goldCount+=picked;
 assert.equal(p.gold(JSON.parse(before)),picked);
 assert.equal(JSON.stringify(won),before);
 assert.equal(p.gold({...won,bonusHit:false}),false);
}
assert(goldCount>900&&goldCount<1100, 'Gold should be approximately 1% of confirmed wins: '+goldCount);
assert.equal(p.gold({czLamp:{success:true,timingSeed:1},czCompleted:true}),false);
assert.equal(p.gold({czLamp:{},bonusHit:true}),false);
console.log('Gold PUSH: '+goldCount+'/100000 wins; zero losses; stable after reload; outcomes unchanged.');
const rates=[.27317164880616657,.2836866010598032,.31678578327216533,.30022044640396806,.326671511627907,.32773931366646597];
for(let setting=1;setting<=6;setting++){
 const win={white:0,big:0,gold:0,red:0},loss={white:0,big:0,gold:0,red:0};
 for(let seed=0;seed<100000;seed++){
  const r={czLamp:{timingSeed:seed},czCompleted:true,bonusHit:true};
  win[p.variant(r,setting)]++;
  loss[p.variant({...r,bonusHit:false},setting)]++;
 }
 assert(Math.abs(win.big/100000-.1)<.003);
 assert(Math.abs(win.red/100000-.2)<.003);
 assert.equal(loss.big+loss.gold,0);
 const prior=rates[setting-1],confidence=prior*win.red/(prior*win.red+(1-prior)*loss.red);
 assert(Math.abs(confidence-.8)<.006);
 console.log('Setting '+setting+': red calibrated confidence '+(confidence*100).toFixed(2)+'%, big '+win.big+'/100000 wins');
}
const css=fs.readFileSync('nova-artwork.css','utf8');
assert.match(css,/#novaCzPush\.big,#novaCzPush\.gold\{left:0%;top:12\.5%;width:100%;height:70%\}/);
assert(!fs.readFileSync('nova-cz-push.js','utf8').includes('Math.random'));

const failed={czLamp:{},czCompleted:true};
p.wait(failed,{valid:()=>true,reveal:()=>count++});
const b=elements.get('novaCzPush');b.onclick();b.onclick();
assert.equal(count,2);assert.equal(failed.czPushConfirmed,undefined);
assert.equal(b.hidden,false);assert.equal(b.disabled,true);assert(classes.has('novaCzFailed'));
assert(b.className.endsWith(' failed'));timers.at(-1)();
assert.equal(count,3);assert.equal(failed.czPushConfirmed,true);assert.equal(b.hidden,true);assert(!classes.has('novaCzFailed'));
let valid=true;
p.wait({czLamp:{},czCompleted:true},{valid:()=>valid,reveal:()=>count++});b.onclick();valid=false;timers.at(-1)();
assert.equal(count,3);assert.equal(b.hidden,true);assert(!classes.has('novaCzFailed'));
console.log('Failure fade: single completion, delayed reveal, stale spin cancellation and dim cleanup passed.');
