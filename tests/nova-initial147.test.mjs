import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt;
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));

test('initial character weights exclude all three ladders only for unsupported quotas',()=>{
 for(let setting=1;setting<=6;setting++)for(const quota of a.entryQuotaRules.values){
  const old=a.atZoneWeights(setting,false,true),weights=a.initialZoneWeights(setting,quota),total=weights.reduce((n,w)=>n+w,0);
  assert.ok(total>0);let edge=0;
  for(let i=0;i<weights.length;i++){
   const ladder=['sosuke','giru','ura_giru'].includes(a.zoneIds[i]),allowed=!ladder||[300,500,1000].includes(quota);
   assert.equal(weights[i],allowed?old[i]:0);
   if(weights[i])assert.equal(a.pickInitialZone(setting,quota,()=>(edge+weights[i]/2)/total),a.zoneIds[i]);
   edge+=weights[i];
  }
  const state={...a.enterInitial({setting},()=>.5),initialWait:1,entryQuota:String(quota)};
  for(const roll of [0,.1,.3,.5,.7,.9,.999999]){
   const next=a.step(state,{setting},()=>roll).flow;
   assert.equal(next.entryQuota,String(quota));assert.ok(a.initialZoneAllowed(next.pendingZone,quota));
  }
 }
});

test('ladder initial plans use only native amount and shutter images and settle the sealed quota once',()=>{
 for(const zone of ['sosuke','giru','ura_giru'])for(const quota of [300,500,1000])for(let seed=1;seed<=40;seed++){
  const rng=xoshiro128('147/'+zone+'/'+quota+'/'+seed),base={...a.enterInitial({},rng),initialStage:'entry',entryStage:'confirmed',pendingZone:zone,entryQuota:String(quota),sets:'2'};
  let state=a.prepareBet(base,{},rng);
  assert.equal((state.ura?'ura_':'')+state.zone,zone);
  assert.equal(state.ladder.length,5);assert.equal(state.ladder[4],quota);
  assert.equal(state.initialPlan.reduce((n,p)=>n+p,0),quota);
  for(let i=0;i<5;i++){
   const pt=state.ladder[i];assert.ok(a.ladderValues.includes(pt));
   assert.ok(fs.existsSync(`assets/ladder/${pt}.png`));assert.ok(fs.existsSync(`assets/ladder/shutter-${pt}.png`));
   if(i)assert.ok(pt>=state.ladder[i-1]);
  }
  for(let i=0;i<5;i++){
   state=a.step(reload(state),{},rng).flow;
   assert.equal(state.sets,'2');assert.equal(state.remaining,i===4?String(quota):'0');
  }
  assert.equal(state.zone,'');assert.equal(state.initialStage,'');assert.deepEqual(a.settleZone(state),state);
 }
});

test('saved pending initial selections migrate before confirmation while in-progress and ordinary zones stay intact',()=>{
 for(const [zone,replacement]of [['sosuke','toto'],['giru','sora'],['ura_giru','ura_sora']]){
  const base={...a.enterInitial({},()=>.5),entryQuota:'750',initialStage:'entry',entryStage:'confirmed',pendingZone:zone,sets:'2',queuedZones:['giru']};
  const migrated=reload(base);assert.equal(migrated.pendingZone,replacement);assert.deepEqual(reload(migrated),migrated);
  const started=a.prepareBet(base,{},()=>.5);assert.equal((started.ura?'ura_':'')+started.zone,replacement);
  assert.equal(started.entryQuota,'750');assert.equal(started.sets,'2');assert.deepEqual(started.queuedZones,['giru']);
  const direct=a.startZone(base,zone,{},()=>.5);assert.equal((direct.ura?'ura_':'')+direct.zone,replacement);
  const ordinary=a.prepareBet({...base,initialStage:''},{},()=>.5);assert.equal((ordinary.ura?'ura_':'')+ordinary.zone,zone);
  const running={...ordinary,initialStage:'zone',initialIndex:2,initialPlan:[100,150,150,150,200],ladder:[100,250,400,550,750],award:'250'};
  const restored=reload(running);assert.deepEqual(restored.initialPlan,running.initialPlan);assert.deepEqual(restored.ladder,running.ladder);assert.equal(restored.award,'250');
 }
});
