import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
loadModel();const a=NovaArt,n=NovaNormal;
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));
const zone=s=>a.prepareBet({...s,initialStage:'entry',entryStage:'confirmed',pendingZone:'kushuri_nito'}, {setting:s.modelSetting},()=>.99);

test('every setting uses the same 300pt base with 150/200pt rare upgrades',()=>{
 for(let setting=1;setting<=6;setting++){
  const expected=[1,0,0,0,0];
  assert.deepEqual(a.initialBoostRules.weights[setting-1],expected);let edge=0;
  for(let i=0;i<1;i++){
   let calls=0;const rng=()=>[.999999,edge+expected[i]/2,.99][calls++];
   const fresh=a.enterInitial({setting},rng);assert.equal(calls,3);assert.equal(fresh.initialMultiplier,i+1);assert(fresh.initialBoostActive);assert(!fresh.burstPending);
   let s=zone(reload(fresh));
   for(const [role,base]of [['BELL',100],['WEAK_NOVA',150],['STRONG_NOVA',200]]){
    const r=a.step(reload(s),{setting},()=>.99,role);assert.equal(r.zoneAward,base*(i+1));s=r.flow;
   }
   assert.equal(s.remaining,String(450*(i+1)));assert.equal(s.initialBoostActive,false);assert.equal(s.initialStage,'');
   const again=a.step({...s,queuedZones:['kushuri_nito']},{setting},()=>.999999,'BELL');assert.equal(again.zoneAward,100);
   assert.equal(a.normalize({...fresh,comebackLeft:5}).initialBoostActive,false);
   edge+=expected[i];
  }
 }
});

test('initial upper-challenge route and legacy saves cannot boost later duo stocks',()=>{
 let draw=0;const fresh=a.enterInitial({setting:6},()=>[.99,.999,0][draw++]);
 assert.equal(fresh.initialMultiplier,1);assert.equal(fresh.initialStage,'');assert.equal(fresh.initialBoostActive,false);assert(fresh.burstPending);
 const stock=a.step({...fresh,burstPending:false,researchChallengeSource:'',queuedZones:['kushuri_nito']},{setting:6},()=>.999999,'BELL');assert.equal(stock.zoneAward,100);
 const legacy={...zone(a.enterInitial({setting:6},()=>.99)),initialPlan:[50,100,50],initialIndex:1,award:'50',zoneLeft:2};
 delete legacy.initialMultiplier;delete legacy.initialBoostActive;
 let s=reload(legacy);assert.equal(s.initialMultiplier,1);assert.equal(s.initialBoostActive,false);
 for(let g=0;g<2;g++)s=a.step(reload(s),{setting:6},()=>.99,'BELL').flow;
 assert.equal(s.remaining,'200');assert.equal(s.award,'200');
});

test('CZ entry factor is setting-specific after the cap; strong NOVA remains certain',()=>{
 assert.deepEqual(n.czEntryFactors,[0.22268664850432007,0.4148931203498602,0.45184686111129607,0.6193210126716288,0.20954105055,0.48247092581814]);
 for(let setting=1;setting<=6;setting++){
  for(const level of ['low','high']){
   const p=n.roleCzRate({level},'WEAK_SUICA',setting);
   assert(p>0&&p<=n.czEntryFactors[setting-1]);assert.equal(n.roleCzRate({level},'WEAK_NOVA',setting),p);
   assert.equal(n.roleCzRate({level},'STRONG_NOVA',setting),1);assert.equal(n.roleCzRate({level},'BELL',setting),0);
  }
  // Large high multiplier must cap before applying the approved CZ factor.
  assert.equal(n.roleCzRate({level:'high'},'WEAK_SUICA',setting,{highMultiplier:100}),n.czEntryFactors[setting-1]);
 }
});
