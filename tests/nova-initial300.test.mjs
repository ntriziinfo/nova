import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
const reload=(a,s)=>a.normalize(JSON.parse(JSON.stringify(s)));
const start=(a,setting,rng)=>a.startZone({...a.enterInitial({setting},()=>.99),initialStage:'entry'},'kushuri_nito',{setting},rng);

test('A plan preserves actual AT role frequencies and setting-specific initial points',()=>{
 loadModel();const a=NovaArt;let referenceBonus;
 assert.deepEqual(a.freshInitialBases,[100,100,100,161,214,249]);
 assert.equal(a.freshInitialRules.version,20261027);assert.equal(a.freshInitialRules.legacyVersion,20261007);
 for(let setting=1;setting<=6;setting++){
  const roles=Object.entries(a.roleProbabilities(setting)).filter(([,p])=>p>0);let edge=0;
  const picks=roles.map(([role,p])=>{const pick=edge+p/2;edge+=p;return {role:role==='BELL15'?'BELL':role,p,pick};});
  const distribution={};let mean=0;
  for(const first of picks)for(const second of picks)for(const third of picks){
   const items=[first,second,third];let calls=0;const plan=a.scriptedInitialRoles(setting,()=>items[calls++].pick);
   assert.equal(calls,3);assert.deepEqual(plan,items.map(r=>r.role));
   const points=plan.reduce((sum,role)=>sum+a.freshInitialAward(setting,role),0),prob=items.reduce((n,r)=>n*r.p,1);
   distribution[points]=(distribution[points]||0)+prob;mean+=points*prob;
  }
  const expected=3*a.freshInitialBase(setting)+6.0206038135593225;
  assert(Math.abs(mean-expected)<1e-9);assert(Math.abs(Object.values(distribution).reduce((a,b)=>a+b,0)-1)<1e-12);
  assert(Math.abs(NovaBalance.zoneMean('kushuri_nito',{setting,initialBoostActive:true})-mean)<1e-9);
  const bonus=Object.fromEntries(Object.entries(distribution).map(([points,p])=>[Number(points)-3*a.freshInitialBase(setting),p]));
  if(referenceBonus)assert.deepEqual(bonus,referenceBonus);else referenceBonus=bonus;
 }
});

test('fresh entry keeps the approved RNG order and uses the saved model setting',()=>{
 loadModel();const a=NovaArt;let enterCalls=0;
 const waiting=a.enterInitial({setting:6},()=>{enterCalls++;return .99;});
 assert.equal(enterCalls,3);assert.equal(waiting.modelSetting,6);assert.equal(waiting.entryQuota,'747');
 let roleCalls=0;const s=a.startZone({...waiting,initialStage:'entry'},'kushuri_nito',{setting:1},()=>{roleCalls++;return .99;});
 assert.equal(roleCalls,3);assert.equal(s.modelSetting,6);assert.deepEqual(s.initialPlan,[249,249,249]);assert.equal(s.entryQuota,'747');
 let stepCalls=0;const out=a.step(reload(a,s),{setting:1},()=>{stepCalls++;return 0;});
 assert.equal(stepCalls,0);assert.equal(out.zoneAward,249);
});

test('three sealed roles survive save/reload and match displayed awards without new role draws',()=>{
 loadModel();const a=NovaArt;
 for(let setting=1;setting<=6;setting++)for(let seed=0;seed<100;seed++){
  let s=start(a,setting,xoshiro128('sealed-'+seed)),roles=s.initialRolePlan.slice(),plan=s.initialPlan.slice();
  const total=plan.reduce((n,x)=>n+x,0);assert.equal(s.entryQuota,String(total));assert.equal(s.initialMultiplier,1);
  for(let i=0;i<3;i++){
   let calls=0;const out=a.step(reload(a,s),{setting},()=>{calls++;return .99;});
   assert.equal(out.result,roles[i]);assert.equal(out.zoneAward,plan[i]);assert.equal(calls,0);s=out.flow;
  }
  assert.equal(s.remaining,String(total));assert.equal(s.award,String(total));assert.equal(s.initialStage,'');assert.deepEqual(s.initialRolePlan,[]);
 }
});

test('legacy awarded plans and multipliers keep their original weak/strong payouts',()=>{
 loadModel();const a=NovaArt;
 for(const initialMultiplier of [1,2,3,4,5]){
  let s={...a.enterInitial({setting:6},()=>.99),initialRuleVersion:0,initialRolePlan:[],initialStage:'zone',zone:'kushuri_nito',initialPlan:[50,100,50],initialMultiplier,initialIndex:1,award:String(50*initialMultiplier),zoneLeft:2};
  for(const role of ['WEAK_NOVA','STRONG_NOVA'])s=a.step(reload(a,s),{setting:6},()=>.99,role).flow;
  assert.equal(s.remaining,String(350*initialMultiplier));assert.equal(s.initialBoostActive,false);
 }
});

test('20261007 saves retain the exact 100/150/200 awards across reloads',()=>{
 loadModel();const a=NovaArt;
 assert(a.isFreshInitialRuleVersion(20261007));assert(a.isFreshInitialRuleVersion(20261027));assert(!a.isFreshInitialRuleVersion(0));
 for(let setting=1;setting<=6;setting++){
  assert.equal(a.freshInitialBase(setting,20261007),100);
  assert.equal(a.freshInitialAward(setting,'BELL',20261007),100);
  assert.equal(a.freshInitialAward(setting,'WEAK_NOVA',20261007),150);
  assert.equal(a.freshInitialAward(setting,'STRONG_NOVA',20261007),200);
 }
 let s=reload(a,{...a.enterInitial({setting:6},()=>.99),initialRuleVersion:20261007,initialStage:'zone',zone:'kushuri_nito',initialRolePlan:['BELL','WEAK_NOVA','STRONG_NOVA'],initialPlan:[100,150,200],initialIndex:0,zoneLeft:3,award:'0',remaining:'0'});
 assert.equal(s.initialRuleVersion,20261007);
 for(const expected of [100,150,200]){
  let calls=0;const out=a.step(reload(a,s),{setting:1},()=>{calls++;return .01;});
  assert.equal(calls,0);assert.equal(out.zoneAward,expected);s=out.flow;
 }
 assert.equal(s.remaining,'450');
});

test('planned rare roles still draw sortie and the initial challenge follows the approved setting-specific entry',()=>{
 loadModel();const a=NovaArt;
 for(let setting=1;setting<=6;setting++){
  for(const net of [-1000,5000,10000]){
   const rate=NovaProgress.sortieChance(setting,'STRONG_NOVA',net);NovaProgress.reset();
   assert(NovaProgress.drawSortie(setting,'STRONG_NOVA',{flowBefore:{zone:'kushuri_nito',initialStage:'zone'}},()=>rate-1e-10,net));
   assert.equal(NovaProgress.snapshot().sorties,1);
  }
  for(const [roll,expected]of [[a.initialBurstChance(setting)-1e-9,true],[a.initialBurstChance(setting),false]]){
   let call=0;const flow=a.enterInitial({setting},()=>[.99,.99,roll][call++]);assert.equal(flow.burstPending,expected);assert.equal(call,3);
   if(expected){assert.equal(flow.initialStage,'');assert.equal(flow.initialBoostActive,false);}
  }
 }
});
