import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128,xoshiro128State} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt;
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));

test('fresh initial roles stay common while every new entry is fixed at 300pt',()=>{
 const referenceRoles=[];
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
  assert.deepEqual(actual.awards,[100,100,100]);
  if(setting===1)referenceRoles.push(actual.roles);else assert.deepEqual(actual.roles,referenceRoles[seed]);
 }
 for(let setting=1;setting<=6;setting++)assert.equal(NovaBalance.zoneMean('kushuri_nito',{setting,initialBoostActive:true}),300);
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

test('adopted weak zone chances use setting and upper state, then apply the approved retention',()=>{
 const scales=[.15,.15,.15,.18,.3,.3];
 for(let setting=1;setting<=6;setting++){
  NovaDecrement.reset(setting,xoshiro128State('common-zone-'+setting));
  for(const low of [false,true]){
   const saved=NovaDecrement.snapshot();saved.low=low;NovaDecrement.bind(saved,setting);
   for(const upper of [false,true])for(const high of [false,true])for(const role of ['WEAK_SUICA','WEAK_NOVA'])for(const net of [-10000,0,4999,5000,5001,20000]){
    const chance=(upper?[12,12,23,12,12,12][setting-1]:[1.7,4.25,2.5,4.5,3.2,4.85][setting-1])*(high?.25:.15)*scales[setting-1];assert.equal(a.extraZoneChance(setting,role,upper,high,net),chance);
    for(const [roll,retained,expected] of [[chance-1e-9,a.weakAtAwardScales[setting-1]-1e-9,true],[chance-1e-9,a.weakAtAwardScales[setting-1],false],[chance,.999,false]]){
     const draws=high?[.999,roll,...(roll<chance?[.5,retained]:[])]:[.999,.999,roll,...(roll<chance?[.5,retained]:[])];
     const state={atHigh:high,atHighLeft:10,researchUpper:upper,remaining:'8000',sets:'2',queuedZones:['sora']};
     const out=a.resolveAtRole(state,role,setting,()=>draws.shift()??.999,net);
     assert.equal(!!out.zone,expected);
     assert.equal(state.remaining,'8000');assert.equal(state.sets,'2');assert.deepEqual(state.queuedZones,['sora']);
    }
   }
  }
  // Promotion on this role does not apply the high-rate lottery until a later role.
  const draws=[0,.999,.4];const state={};
  const out=a.resolveAtRole(state,'WEAK_NOVA',setting,()=>draws.shift()??.999);
  assert(out.promoted);assert(state.atHigh);assert.equal(out.zone,'');
 }
});
