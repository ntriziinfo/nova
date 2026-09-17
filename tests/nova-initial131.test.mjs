import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt;
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));

test('initial draw has all nineteen 50pt steps, normalized weights and exact mean 750',()=>{
 const r=a.entryQuotaRules;assert.equal(r.weights.reduce((n,w)=>n+w,0),100);
 assert.equal(r.values.reduce((n,p,i)=>n+p*r.weights[i],0)/100,750);
 let cumulative=0;
 for(let i=0;i<19;i++){
  assert.equal(r.values[i],300+i*50);
  for(let setting=1;setting<=6;setting++)assert.equal(a.enterInitial({setting},()=>(cumulative+r.weights[i]/2)/100).entryQuota,String(r.values[i]));
  cumulative+=r.weights[i];
 }
});

test('fresh bonus win waits exactly three paid games then seven, roulette and initial zone',()=>{
 let draws=0;let s=a.afterBonus({phase:'normal'},{setting:6},2,()=>{draws++;return .5;});
 assert.equal(draws,1);assert.equal(s.remaining,'0');assert.equal(s.entryQuota,'750');assert.equal(s.sets,'1');
 for(let g=0;g<3;g++){
  assert.equal(s.initialWait,3-g);assert.equal(s.entryStage,'');assert.equal(s.zone,'');
  s=a.step(reload(s),{setting:6},()=>.5).flow;
  assert.equal(s.remaining,'0');assert.equal(s.entryQuota,'750');assert.equal(s.sets,'1');
 }
 assert.equal(s.initialStage,'entry');assert.equal(s.entryStage,'seven');
 let t=a.step(reload(s),{},()=>.5);assert.equal(t.result,'BIG');assert.equal(t.zoneSpin,true);assert.equal(t.flow.entryStage,'roulette');
 t=a.step(reload(t.flow),{},()=>.5,'STRONG_NOVA');assert.equal(t.flow.entryStage,'confirmed');assert.equal(t.flow.rouletteTable,0);
 s=a.prepareBet(reload(t.flow),{},()=>.5);assert.equal(s.initialStage,'zone');assert.equal(s.remaining,'0');assert.equal(s.zoneLeft,5);
});

test('every character reveals every possible sealed quota exactly once, despite forced roles and reloads',()=>{
 for(const zone of a.zoneIds)for(const target of a.entryQuotaRules.values)for(let seed=1;seed<=5;seed++){
  const rng=xoshiro128(seed+target),base={...a.enterInitial({},rng),initialStage:'entry',initialWait:0,entryQuota:String(target),entryStage:'confirmed',pendingZone:zone,sets:'2',queuedZones:['ura_sora']};
  let s=a.prepareBet(reload(base),{},rng);assert.equal(s.entryStage,'');assert.equal(s.remaining,'0');
  for(let g=0;g<5;g++){
   assert.deepEqual(reload(s),s);
   const prepared=a.prepareBet(s,{},rng);assert.deepEqual(prepared,s);
   const t=a.step(prepared,{},rng,g%2?'MISS':'STRONG_NOVA');s=reload(t.flow);
   assert.equal(t.zoneSpin,true);assert.equal(t.internalBonus,undefined);assert.equal(s.oumaPending,false);assert.equal(s.zero,false);
   assert.equal(s.sets,'2');assert.deepEqual(s.queuedZones,['ura_sora']);
   assert.equal(s.remaining,g===4?String(target):'0');
   assert.ok(Number(s.award)<=target);
  }
  assert.equal(s.initialStage,'');assert.equal(s.zone,'');assert.equal(s.award,String(target));assert.equal(s.entryQuota,String(target));
  assert.deepEqual(a.settleZone(s),s);
  const next=a.step(s,{},rng);assert.equal(next.flow.zone,'sora');assert.equal(next.flow.ura,true);assert.equal(next.flow.initialStage,'');
 }
});

test('loss, resume and legacy saves never trigger a fresh initial presentation or reassign points',()=>{
 const never=()=>{throw Error('unexpected draw');};
 assert.equal(a.afterBonus({phase:'normal'},{},0,never).phase,'normal');
 const old=a.normalize({phase:'art',payoutVersion:1,burstVersion:2,remaining:'937',entryQuota:'1000',sets:'2'});
 assert.equal(old.initialStage,'');const restored=a.afterBonus(old,{},1,never);assert.equal(restored.remaining,'937');assert.equal(restored.sets,'3');assert.equal(restored.initialStage,'');
 const waiting=a.enterInitial({},()=>.5),resumed=a.afterBonus(waiting,{},2,never);assert.equal(resumed.initialWait,3);assert.equal(resumed.remaining,'0');assert.equal(resumed.sets,'2');assert.equal(resumed.entryQuota,'750');
});

test('ordinary special zones retain random success and independent awards',()=>{
 const s=a.startZone(a.enter({},()=>.5),'sosuke',{},()=>0);
 const first=a.step(s,{},()=>.9).flow;
 const loss=a.step(first,{},()=>.99,'MISS');assert.equal(loss.flow.zone,'');assert.equal(loss.flow.remaining,'800');
 assert.equal(loss.flow.entryQuota,'750');assert.equal(loss.flow.initialStage,'');
});
