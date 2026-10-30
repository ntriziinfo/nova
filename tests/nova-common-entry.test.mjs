import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128,xoshiro128State} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt;
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));

test('fresh initial roles and 300pt plus alpha awards stay common across settings',()=>{
 const referenceRoles=[],referenceAwards=[];
 for(let setting=1;setting<=6;setting++)for(let seed=0;seed<128;seed++){
  const rng=xoshiro128('common-initial-proof-'+seed),c={setting};let flow=a.enterInitial(c,()=>Math.max(.05,rng()));
  const actual={quota:flow.entryQuota,multiplier:flow.initialMultiplier,awards:[],roles:[]};
  // Exclude the separately tested challenge route during entry, preserving RNG consumption.
  {
   for(let g=0;g<12&&flow.initialStage;g++){
    flow=a.prepareBet(reload(flow),c,rng);const out=a.step(flow,c,rng,flow.initialStage==='wait'?'START_REPLAY_RIGHT':'');flow=out.flow;
    if(out.initialAward&&Number.isFinite(out.zoneAward)){actual.awards.push(out.zoneAward);actual.roles.push(out.result);}
   }
   assert.equal(actual.awards.length,3);
  }
  assert.equal(actual.quota,'300');assert.equal(actual.multiplier,1);
  assert.deepEqual(actual.awards,actual.roles.map(role=>a.freshInitialAward(setting,role)));
  assert(actual.awards.every(points=>[100,150,200].includes(points)));
  assert(actual.awards.reduce((sum,n)=>sum+n,0)>=300);
  if(setting===1){referenceRoles.push(actual.roles);referenceAwards.push(actual.awards);}else{assert.deepEqual(actual.roles,referenceRoles[seed]);assert.deepEqual(actual.awards,referenceAwards[seed]);}
 }
 for(let setting=1;setting<=6;setting++)assert(Math.abs(NovaBalance.zoneMean('kushuri_nito',{setting,initialBoostActive:true})-306.0206038135593)<1e-9);
});

test('saved multipliers 3-5 and fixed initial plans remain earned; later duo stock is never boosted',()=>{
 for(const initialMultiplier of [3,4,5]){
  let s=reload({...a.enterInitial({setting:6},()=>.99),initialMultiplier,initialRuleVersion:0,initialBoostActive:true,initialStage:'zone',zone:'kushuri_nito',initialPlan:[50,100,50],initialIndex:1,zoneLeft:2,award:String(50*initialMultiplier),remaining:'0'});
  for(let g=0;g<2;g++)s=a.step(reload(s),{setting:6},()=>.99,'BELL').flow;
  assert.equal(s.remaining,String(200*initialMultiplier));assert.equal(s.initialBoostActive,false);
  const next=a.step({...s,queuedZones:['kushuri_nito']},{setting:6},()=>.999999,'BELL');
  assert.equal(next.zoneAward,100);
 }
 // Existing ordinary-stock tables are intentionally preserved.
 assert.equal(a.drawEntryQuota({setting:1},()=>.5),150);
 assert.equal(a.drawEntryQuota({setting:6},()=>.5),200);
 assert.equal(a.drawEntryQuota({setting:1},()=>.5,true),300);
 assert.equal(a.drawEntryQuota({setting:6},()=>.5,true),300);
});

test('weak zone chances are derived from the common response and each setting quality profile',()=>{
 for(let setting=1;setting<=6;setting++){
  const profile=NovaTuning.balanceProfile(setting);assert.equal(profile.weakResponse,.15);
  for(const upper of [false,true])for(const high of [false,true]){
   const weights=a.weakQualityWeights(setting,upper),total=weights.reduce((sum,value)=>sum+value,0),zoneStart=upper?2:1;
   const expected=profile.weakResponse*(high?1.5:1)*weights.slice(zoneStart).reduce((sum,value)=>sum+value,0)/total;
   for(const role of ['WEAK_SUICA','WEAK_NOVA'])for(const net of [-10000,0,5000,20000])assert.equal(a.extraZoneChance(setting,role,upper,high,net),expected);
   assert.equal(a.weakAtResponseChance(setting,upper,high),profile.weakResponse*(high?1.5:1));
  }
  assert.equal(a.extraZoneChance(setting,'STRONG_NOVA'),0);
 }
});
