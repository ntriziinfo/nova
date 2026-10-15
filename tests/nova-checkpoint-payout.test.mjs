import test from 'node:test';import assert from 'node:assert/strict';import {loadModel} from '../scripts/zone-v2-model.mjs';
test('earned checkpoint countdown pays ten net points per game with unchanged rare rates in all settings and AT tiers',()=>{
 loadModel();const a=NovaArt;
 for(let setting=1;setting<=6;setting++)for(const upper of [false,true]){
  const p=a.roleProbabilities(setting,true,10),original=a.roleProbabilities(setting,upper);
  assert(Math.abs(Object.values(p).reduce((s,v)=>s+v,0)-1)<1e-12);assert(Object.values(p).every(v=>v>=0));
  assert(Math.abs(Object.entries(p).reduce((s,[role,v])=>s+v*(a.cashPayout(role)-3),0)-10)<1e-12);
  for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA'])assert.equal(p[role],original[role]);
  const start={...a.enter({setting},()=>.5),remaining:'400',researchUpper:upper};let net=0;
  for(let i=0;i<1000;i++){
   const draws=[.99,(i+.5)/1000],out=a.step(a.restoreBetCost(start,3),{setting,netPt:1997,checkpointNext:2400,checkpointQuiet:true},()=>{assert(draws.length);return draws.shift();});
   assert.equal(out.atOutcome.checkpointQuiet,true);assert.equal(out.atOutcome.direct,0);assert.equal(out.atOutcome.zone,'');
   assert.equal(out.result==='BELL',false);const paid=a.cashPayout(out.result);net+=paid-3;assert.equal(Number(out.flow.remaining),403-paid);
  }
  assert(Math.abs(net/1000-10)<.02);
 }
});
test('outside an earned countdown the existing normal/upper draws and rare awards are untouched',()=>{
 loadModel();const a=NovaArt;
 for(const upper of [false,true])for(const patch of [{remaining:'399'},{atPrelude:{left:3}},{initialStage:'wait',initialWait:2},{zone:'sora',zoneLeft:3},{researchSortieLeft:3,researchSortieHits:2}])for(const roll of [.01,.1,.4,.65,.9]){
  const flow={...a.enter({setting:6},()=>.5),remaining:'500',researchUpper:upper,...patch};
  let off=0,on=0;
  const options={setting:6,netPt:2000,checkpointNext:2400};
  const before=a.step(flow,{...options,checkpointQuiet:false},()=>{off++;return roll;});
  const after=a.step(flow,{...options,checkpointQuiet:true},()=>{on++;return roll;});
  assert.deepEqual(after,before);assert.equal(on,off);
 }
});
