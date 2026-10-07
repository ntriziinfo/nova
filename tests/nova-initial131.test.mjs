import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt;
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));

test('default unconfigured initial base has the original mean 200; configured settings use separate weights',()=>{
 const r=a.entryQuotaRules;assert.equal(r.weights.reduce((n,w)=>n+w,0),27);
 assert.equal(r.values.reduce((n,p,i)=>n+p*r.weights[i],0)/27,200);
 let cumulative=0;
 for(let i=0;i<4;i++){
  assert.equal(r.values[i],150+i*50);
  assert.equal(a.drawEntryQuota({},()=>(cumulative+r.weights[i]/2)/27),r.values[i]);
  assert.equal(a.enterInitial({},()=>(cumulative+r.weights[i]/2)/27).entryQuota,'300');
  cumulative+=r.weights[i];
 }
});

test('fresh bonus win waits exactly three paid games then seven, roulette and initial zone',()=>{
 let draws=0;let s=a.afterBonus({phase:'normal'},{setting:6},2,()=>{draws++;return .5;});
 assert.equal(draws,3);assert.equal(s.remaining,'0');assert.equal(s.entryQuota,'300');assert.equal(s.sets,'1');
 for(let g=0;g<3;g++){
  assert.equal(s.initialWait,3-g);assert.equal(s.entryStage,'');assert.equal(s.zone,'');
  s=a.step(reload(s),{setting:6},()=>.5).flow;
  assert.equal(s.remaining,'0');assert.equal(s.entryQuota,'300');assert.equal(s.sets,'1');
 }
 assert.equal(s.initialStage,'entry');assert.equal(s.entryStage,'seven');
 let t=a.step(reload(s),{},()=>.5);assert.equal(t.result,'BIG');assert.equal(t.zoneSpin,true);assert.equal(t.flow.entryStage,'roulette');
 t=a.step(reload(t.flow),{},()=>.5,'STRONG_NOVA');assert.equal(t.flow.entryStage,'confirmed');assert.equal(t.flow.rouletteTable,0);
 s=a.prepareBet(reload(t.flow),{},()=>.5);assert.equal(s.initialStage,'zone');assert.equal(s.remaining,'0');assert.equal(s.zoneLeft,3);
});

test('ordinary roles reveal every possible sealed base quota exactly once across reloads',()=>{
 for(const zone of a.initialZoneIds)for(const target of a.entryQuotaRules.values)for(let seed=1;seed<=5;seed++){
  const rng=xoshiro128(seed+target),base={...a.enterInitial({},rng),initialRuleVersion:0,initialBoostActive:true,burstPending:false,researchChallengeSource:'',initialStage:'entry',initialWait:0,entryQuota:String(target),entryStage:'confirmed',pendingZone:zone,sets:'2',queuedZones:['ura_sora']};
  const boostedTarget=target*base.initialMultiplier;let s=a.prepareBet(reload(base),{},rng);assert.equal(s.entryStage,'');assert.equal(s.remaining,'0');
  for(let g=0;g<3;g++){
   assert.deepEqual(reload(s),s);
   const prepared=a.prepareBet(s,{},rng);assert.deepEqual(prepared,s);
   const t=a.step(prepared,{},rng,g%2?'REPLAY':'BELL');s=reload(t.flow);
   assert.equal(t.zoneSpin,true);assert.equal(t.internalBonus,undefined);assert.equal(s.oumaPending,false);assert.equal(s.zero,false);
   assert.equal(s.sets,'2');assert.deepEqual(s.queuedZones,['ura_sora']);
   assert.equal(s.remaining,g===2?String(boostedTarget):'0');
   assert.ok(Number(s.award)<=boostedTarget);
  }
  assert.equal(s.initialStage,'');assert.equal(s.zone,'');assert.equal(s.award,String(boostedTarget));assert.equal(s.entryQuota,String(target));
  assert.deepEqual(a.settleZone(s),s);
  const next=a.step(s,{},rng);assert.equal(next.flow.zone,'sora');assert.equal(next.flow.ura,true);assert.equal(next.flow.initialStage,'');
 }
});

test('loss, resume and legacy saves never trigger a fresh initial presentation or reassign points',()=>{
 const never=()=>{throw Error('unexpected draw');};
 assert.equal(a.afterBonus({phase:'normal'},{},0,never).phase,'normal');
 const old=a.normalize({phase:'art',payoutVersion:1,burstVersion:2,remaining:'937',entryQuota:'1000',sets:'2'});
 assert.equal(old.initialStage,'');const restored=a.afterBonus(old,{},1,never);assert.equal(restored.remaining,'937');assert.equal(restored.sets,'3');assert.equal(restored.initialStage,'');
 const waiting=a.enterInitial({},()=>.5),resumed=a.afterBonus(waiting,{},2,never);assert.equal(resumed.initialWait,3);assert.equal(resumed.remaining,'0');assert.equal(resumed.sets,'2');assert.equal(resumed.entryQuota,'300');
});

test('ordinary special zones retain random success and independent awards',()=>{
 const s=a.startZone(a.enter({},()=>.5),'sosuke',{},()=>0);
 const first=a.step(s,{},()=>.9).flow;
 const loss=a.step(first,{},()=>.99,'MISS');assert.equal(loss.flow.zone,'');assert.equal(loss.flow.remaining,'250');
 assert.equal(loss.flow.entryQuota,'200');assert.equal(loss.flow.initialStage,'');
});
