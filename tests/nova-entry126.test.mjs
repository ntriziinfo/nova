import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';

test('new AT draws a base quota, multiplier and initial challenge once; resume and reload draw neither',()=>{
 loadModel();const a=NovaArt;let calls=0;const rng=()=>{calls++;return .99;};
 assert.equal(a.afterBonus({phase:'normal'},{},0,rng).phase,'normal');assert.equal(calls,0);
 const fresh=a.afterBonus({phase:'normal'},{},2,rng);assert.equal(calls,3);assert.equal(fresh.entryQuota,'300');assert.equal(fresh.remaining,'0');assert.equal(fresh.initialWait,3);assert.equal(fresh.sets,'1');assert.equal(fresh.setQuota,'200');
 const saved=a.normalize(JSON.parse(JSON.stringify(fresh)));assert.deepEqual(saved,fresh);
 const resumed=a.afterBonus(saved,{},1,rng);assert.equal(calls,3);assert.equal(resumed.remaining,'0');assert.equal(resumed.sets,'2');assert.equal(resumed.entryQuota,'300');
 a.enterInitial({},rng);assert.equal(calls,6);
});

test('setting-dependent initial bases plus rare-role rewrites average 180 through 230pt',()=>{
 loadModel();const a=NovaArt;
 for(let setting=1;setting<=6;setting++){
  const weights=a.entryWeights[setting-1];assert(Math.abs(weights.reduce((x,y)=>x+y,0)-1)<1e-12);
  let offset=0,base=0;
  for(let i=0;i<weights.length;i++){assert(weights[i]>0);assert.equal(a.drawEntryQuota({setting},()=>offset+weights[i]/2),a.entryQuotaRules.values[i]);offset+=weights[i];base+=weights[i]*a.entryQuotaRules.values[i]/3;}
  const mean=3*Object.entries(a.roleProbabilities(setting)).reduce((sum,[role,p])=>sum+p*(a.initialRareAwards[role]??base),0);
  assert(Math.abs(mean-JSON.parse(fs.readFileSync('tests/fixtures/nova-role-merge-approved.json')).entryMeans[setting-1])<1e-9,setting+': '+mean);
 }
});

test('saved extra stocks become special zones without granting legacy 150/300pt quotas',()=>{
 loadModel();const a=NovaArt;
 const legacy=a.normalize({phase:'art',payoutVersion:1,remaining:'1',sets:'2',burstVersion:2});
 assert.equal(legacy.setQuota,'300');
 const oldNext=a.step(legacy,{},()=>.999,'BELL');assert.equal(oldNext.flow.remaining,'1');assert.equal(oldNext.flow.sets,'1');assert.equal(oldNext.flow.entryStage,'roulette');
 const fresh={...a.enter({},()=>.5),remaining:'1',sets:'2'};
 const next=a.step(fresh,{},()=>.999,'BELL');assert.equal(next.flow.remaining,'1');assert.equal(next.flow.sets,'1');assert.equal(next.flow.entryQuota,'200');assert.equal(next.flow.entryStage,'roulette');
});

test('entry quota never caps or changes later role rewards',()=>{
 loadModel();const a=NovaArt;
 const run=(quota,role)=>a.step({...a.enter({},()=>.5),entryQuota:String(quota),remaining:'2500',burstUsed:true},{setting:6},xoshiro128(126),role);
 for(const role of Object.keys(a.rareRoles).concat('BELL','REPLAY')){
  const low=run(150,role),high=run(2000,role);
  assert.deepEqual({...low,flow:{...low.flow,entryQuota:'0'}},{...high,flow:{...high.flow,entryQuota:'0'}});
 }
 const raised=a.settleZone({...a.enter({},()=>.5),zone:'giru',remaining:'100',award:'3000',zoneVersion:2});
 assert.equal(raised.remaining,'3100');assert.equal(raised.entryQuota,'200');
});

test('comeback and rare-triggered upper challenge preserve entry quota and earned balance',()=>{
 loadModel();const a=NovaArt,start=a.enter({},()=>.99);
 const comeback=a.prepareComeback(a.beginComeback(start),{setting:6},()=>.5);
 const revival=a.step(comeback,{setting:6},()=>.5,'STRONG_NOVA');assert.equal(revival.comebackEvent,'success');assert.equal(revival.flow.entryQuota,'300');
 const held=a.step({...start,burstPending:true,burstUsed:true},{setting:6},()=>.99,'WEAK_NOVA');
 const win=a.step(held.flow,{setting:6},()=>.99,'MISS');assert.equal(win.burstEvent,'success');assert.equal(win.flow.entryQuota,'300');assert.equal(win.flow.remaining,'300');assert.equal(win.flow.researchUpper,true);
});
