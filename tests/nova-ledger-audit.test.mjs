import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({});
for(const file of ['nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
const a=c.NovaArt;
const clone=v=>JSON.parse(JSON.stringify(v));
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

test('all six settings: 120,000 ordinary/upper AT draws conserve net quota plus the actual direct award',()=>{
 for(let setting=1;setting<=6;setting++)for(const upper of [false,true]){
  const rng=random(20261014+setting*31+Number(upper));
  for(let i=0;i<10000;i++){
   const base={...a.enter({setting},rng),remaining:'10000',researchUpper:upper,atHigh:i%2===0,atHighLeft:i%11,sets:'0',stock:'0',queuedZones:[]};
   const unchanged=JSON.stringify(base);
   const paidBet=a.restoreBetCost(base,3);
   const out=a.step(paidBet,{setting},rng);
   // Entry/challenge-confirmation games already suspend quota consumption.
   // Audit the ordinary consuming path independently of that existing rule.
   if(out.flow.entryStage||out.flow.burstPending)continue;
   const expected=10000+3-a.cashPayout(out.result)+Number(out.atOutcome?.direct||0);
   assert.equal(Number(out.flow.remaining),expected,JSON.stringify({setting,upper,role:out.result,out:out.atOutcome}));
   assert.equal(JSON.stringify(base),unchanged,'drawing mutates the saved pre-BET state');
   assert.equal(a.normalize(clone(out.flow)).remaining,out.flow.remaining,'serialization changes quota');
  }
 }
});

test('all zone types transfer their earned award once and never spend the suspended AT quota',()=>{
 for(const zone of a.zoneIds)for(let setting=1;setting<=6;setting++){
  const rng=random(5000+setting+zone.length*7),base={...a.enter({setting},rng),remaining:'1234',sets:'0',stock:'0',queuedZones:[]};
  let flow=a.startZone(base,zone,{setting,allowUra:true},rng),steps=0;
  while(flow.zone&&steps++<10000){
   const before=flow;flow=a.prepareBet(flow,{setting},rng);
   if(!flow.zone)break;
   assert.equal(a.restoreBetCost(flow,3).remaining,flow.remaining,'zone BET must not add quota');
   const out=a.step(flow,{setting},rng);flow=out.flow;
   assert.equal(Number(flow.remaining),flow.zone?1234:1234+Number(flow.award),zone+' quota differs from secured award');
   for(const key of ['remaining','award','stock','sets'])assert.equal(a.normalize(clone(flow))[key],flow[key],zone+' save round trip '+key);
   assert(Number(before.remaining)>=0);
  }
  assert(steps<10000,zone+' did not finish');
  const again=a.settleZone(flow);assert.equal(again.remaining,flow.remaining,'zone award credited twice');
 }
});

test('bonus earned AT rights and stocks survive transfer, including all settings and save round trips',()=>{
 for(let setting=1;setting<=6;setting++)for(let won=0;won<=8;won++)for(const active of [false,true]){
  const rng=random(setting*100+won),before=active?{...a.enter({setting},rng),remaining:'456',sets:'2',stock:'3',queuedZones:['sora','ura_ouma']}:{phase:'normal'};
  const unchanged=JSON.stringify(before),after=a.afterBonus(before,{setting},won,rng);
  assert.equal(JSON.stringify(before),unchanged);
  if(active){assert.equal(after.remaining,'456');assert.equal(Number(after.sets),2+won);assert.equal(after.stock,'3');assert.deepEqual(Array.from(after.queuedZones),['sora','ura_ouma']);}
  else if(won){assert.equal(after.phase,'art');assert.equal(Number(after.sets),won-1);assert.equal(after.initialStage,'wait');}
  else assert.equal(after.phase,'normal');
  assert.equal(a.normalize(clone(after)).remaining,after.remaining===0?'0':after.remaining);
 }
});
