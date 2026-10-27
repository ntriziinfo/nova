import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
loadModel();const a=NovaArt,n=NovaNormal;
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));
const zone=s=>a.prepareBet({...s,initialStage:'entry',entryStage:'confirmed',pendingZone:'kushuri_nito'}, {setting:s.modelSetting},()=>.99);

test('every setting awards a 100pt base plus weak and strong rare-role additions',()=>{
 for(let setting=1;setting<=6;setting++){
  const expected=[1,0,0,0,0];
  assert.deepEqual(a.initialBoostRules.weights[setting-1],expected);let edge=0;
  for(let i=0;i<1;i++){
   let calls=0;const rng=()=>[.999999,edge+expected[i]/2,.99][calls++];
   const fresh=a.enterInitial({setting},rng);assert.equal(calls,3);assert.equal(fresh.initialMultiplier,i+1);assert(fresh.initialBoostActive);assert(!fresh.burstPending);
   let s=zone(reload(fresh));
   for(const role of ['BELL','WEAK_NOVA','STRONG_NOVA']){
    const r=a.step(reload(s),{setting},()=>.99,role);assert.equal(r.zoneAward,a.freshInitialAward(setting,role)*(i+1));s=r.flow;
   }
   assert.equal(s.remaining,String(['BELL','WEAK_NOVA','STRONG_NOVA'].reduce((sum,role)=>sum+a.freshInitialAward(setting,role),0)));assert.equal(s.initialBoostActive,false);assert.equal(s.initialStage,'');
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

test('rare-role CZ entry uses the odd/even profile after the common capped lottery; strong NOVA remains certain',()=>{
 for(const [level,options]of [['low',{}],['high',{}],['high',{highMultiplier:100}]]){
  const reference=n.roleCzRate({level},'WEAK_SUICA',3,options)/NovaTuning.balanceProfile(3).rareCzEntry;
  for(let setting=1;setting<=6;setting++){
   const p=n.roleCzRate({level},'WEAK_SUICA',setting,options),expected=reference*NovaTuning.balanceProfile(setting).rareCzEntry;
   assert.ok(Math.abs(p-expected)<1e-12,`${setting}/${level}`);assert.equal(n.roleCzRate({level},'WEAK_NOVA',setting,options),p);
   assert.equal(n.roleCzRate({level},'STRONG_NOVA',setting,options),1);assert.equal(n.roleCzRate({level},'BELL',setting,options),0);
  }
 }
 for(const odd of [1,3,5])assert.ok(n.roleCzRate({},'WEAK_SUICA',odd+1)>n.roleCzRate({},'WEAK_SUICA',odd));
});
