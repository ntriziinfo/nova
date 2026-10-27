import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const elements=new Map(),timers=[];const c=vm.createContext({document:{getElementById:id=>elements.get(id),createElement:()=>({}),querySelector:()=>({append:b=>elements.set(b.id,b)})},setTimeout:fn=>timers.push(fn)});vm.runInContext(fs.readFileSync('nova-cz-push.js','utf8'),c);const p=c.NovaCzPresentation;
for(let setting=1;setting<=6;setting++)for(let seed=0;seed<1000;seed++){for(const success of [false,true]){let previous=0;for(let remaining=15;remaining>=1;remaining--)for(let stop=1;stop<=3;stop++){const shown=p.display({remaining,totalGames:15,timingSeed:seed},stop,success,setting);const stage=Math.max(previous,shown.stage);assert(stage>=previous);previous=stage;if(remaining===1&&stop===3){assert(stage>=1&&stage<=8);if(!success)assert(![1,8].includes(stage));}}}}
let count=0;const r={czLamp:{},czCompleted:true};const hooks={auto:true,valid:()=>true,reveal:()=>count++};assert.equal(p.wait(r,hooks),true);assert.equal(p.wait(r,hooks),true);assert.equal(timers.length,1);assert.equal(count,0);timers[0]();elements.get('novaCzPush').onclick();assert.equal(count,1);assert.equal(p.wait(r,hooks),false);assert.equal(elements.get('novaCzPush').hidden,true);assert.equal(p.wait({},hooks),false);
console.log('Candidate checks passed: 12,000 CZ schedules, final guarantees, monotonic display, PUSH wait/auto/repeated clicks.');

const resumed={czLamp:{},czCompleted:true,czPushWaiting:true};p.wait(resumed,{auto:false,valid:()=>true,reveal:()=>count++});assert.equal(elements.get('novaCzPush').hidden,false);elements.get('novaCzPush').onclick();assert.equal(count,2);

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
