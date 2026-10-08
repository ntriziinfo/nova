import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128,xoshiro128State} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt;
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));

test('fresh entry uses identical quota, multiplier, challenge and three rare upgrades for every setting',()=>{
 const reference=[];
 for(let setting=1;setting<=6;setting++)for(let seed=0;seed<128;seed++){
  const rng=xoshiro128('common-initial-proof-'+seed),c={setting};let flow=a.enterInitial(c,rng);
  const actual={quota:flow.entryQuota,multiplier:flow.initialMultiplier,challenge:flow.burstPending,awards:[],roles:[]};
  if(!actual.challenge){
   for(let g=0;g<12&&flow.initialStage;g++){
    flow=a.prepareBet(reload(flow),c,rng);const out=a.step(flow,c,rng);flow=out.flow;
    if(out.initialAward&&Number.isFinite(out.zoneAward)){actual.awards.push(out.zoneAward);actual.roles.push(out.result);}
   }
   assert.equal(actual.awards.length,3);
  }
  if(setting===1)reference.push(actual);else assert.deepEqual(actual,reference[seed]);
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

test('adopted weak zone chances use setting and net tiers, with the pre-role high state',()=>{
 const scales=[1.0491974999999998,1.03,0.7353,0.8400000000000001,1.2054600000000002,1.15],netScales=[.65,.8,.85,.75,11.481481481481481,1];
 for(let setting=1;setting<=6;setting++){
  NovaDecrement.reset(setting,xoshiro128State('common-zone-'+setting));
  for(const low of [false,true]){
   const saved=NovaDecrement.snapshot();saved.low=low;NovaDecrement.bind(saved,setting);
   for(const upper of [false,true])for(const high of [false,true])for(const role of ['WEAK_SUICA','WEAK_NOVA'])for(const net of [-10000,0,4999,5000,5001,20000]){
    const chance=(high?.25:.15)*scales[setting-1]*(net>=5000?netScales[setting-1]:1)*a.positiveNetZoneFactor(setting,net);assert.equal(a.extraZoneChance(setting,role,upper,high,net),chance);
    for(const roll of [chance-1e-9,chance]){
     const draws=high?[.999,roll,.5]:[.999,.999,roll,.5];
     const state={atHigh:high,atHighLeft:10,researchUpper:upper,remaining:'8000',sets:'2',queuedZones:['sora']};
     const out=a.resolveAtRole(state,role,setting,()=>draws.shift()??.999,net);
     assert.equal(!!out.zone,roll<chance);
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
