import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt;

test('every zone reports only new points, including final settlement and 0G chains',()=>{
 for(const id of a.zoneIds)for(let seed=1;seed<=30;seed++){
  const rng=xoshiro128(seed),base=a.enter({},rng);let s=a.startZone(base,id,{},rng),total=0;
  for(let g=0;s.zone&&g<1000;g++){
   s=a.prepareBet(s,{},rng);if(!s.zone)break;
   const before=a.zoneRules(s,a.defaults).family==='ladder'&&!s.ladderRevealed?0:Number(s.award),t=a.step(s,{},rng);
   assert.equal(t.zoneAward,Number(t.flow.award)-before,id);
   assert(t.zoneAward>=0);total+=t.zoneAward;
   s=a.normalize(JSON.parse(JSON.stringify(t.flow)));
  }
  assert.equal(s.zone,'',id);assert.equal(total,Number(s.award),id);
  assert.equal(Number(s.remaining)-Number(base.remaining),total,id);
 }
});

test('ladder repeats and a failed attempt never display the cumulative amount again',()=>{
 let s={...a.startZone(a.enter({},()=>.5),'giru',{},()=>0),ladder:[50,50,300,300,1000],award:'50',ladderRevealed:false};
 for(const [role,delta]of [['MISS',50],['REPLAY',0],['REPLAY',250],['REPLAY',0],['MISS',0]]){
  const t=a.step(s,{},()=>.9,role);assert.equal(t.zoneAward,delta);s=t.flow;
 }
 assert.equal(s.zone,'');assert.equal(s.award,'300');
 const queued=a.step({...a.enter({},()=>.5),queuedZones:['giru']},{},()=>.9);
 assert.equal(queued.zoneAward,Number(queued.flow.award));
 const entry=a.step(a.enter({},()=>.5),{},()=>.9,'ZONE_giru');assert.equal(entry.zoneAward,undefined);
});

test('seven, nebula, guaranteed final nova and free nova report their own increment',()=>{
 const seven=a.startZone(a.enter({},()=>.5),'toto',{},()=>.9);
 assert.equal(a.step({...seven,award:'100'}, {},()=>.9,'NEBULA').zoneAward,10);
 const hit=a.step({...seven,award:'300'}, {},()=>.9,'BIG');assert.equal(hit.zoneAward,Number(hit.flow.award)-300);
 const nova=a.startZone(a.enter({},()=>.5),'ouma',{},()=>.9);
 const final=a.step({...nova,award:'50',zoneLeft:1},{},()=>.9,'MISS');assert.equal(final.zoneAward,50);assert.equal(final.flow.zone,'');
 const zero=a.step({...nova,award:'100',zoneLeft:2,zero:true},{},()=>.9);assert.equal(zero.zoneAward,50);assert.equal(zero.oumaFreeze,true);assert.equal(zero.flow.zoneLeft,2);
});

test('all scripted initial zones sum to exactly the sealed quota without counting it twice',()=>{
 for(const zone of a.zoneIds)for(const quota of a.entryQuotaRules.values){
  const rng=xoshiro128(quota),base={...a.enterInitial({},rng),entryQuota:String(quota),initialStage:'entry',initialWait:0,entryStage:'confirmed',pendingZone:zone};
  let s=a.prepareBet(base,{},rng),total=0;
  for(let g=0;g<5;g++){const t=a.step(s,{},rng);assert.equal(t.zoneAward,s.initialPlan[g]);total+=t.zoneAward;s=t.flow;}
  assert.equal(total,quota);assert.equal(s.award,String(quota));assert.equal(s.remaining,String(quota));
  assert.equal(a.step(s,{},()=>.99,'BELL').zoneAward,0);
 }
});
