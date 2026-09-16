import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';

test('entry quota draw happens once on a new AT, never on loss, resume, or reload',()=>{
 loadModel();const a=NovaArt;let calls=0;const rng=()=>{calls++;return .99;};
 assert.equal(a.afterBonus({phase:'normal'},{},0,rng).phase,'normal');assert.equal(calls,0);
 const fresh=a.afterBonus({phase:'normal'},{},2,rng);
 assert.equal(calls,1);assert.equal(fresh.entryQuota,'1000');assert.equal(fresh.remaining,'1000');assert.equal(fresh.sets,'1');assert.equal(fresh.setQuota,'150');
 const saved=a.normalize(JSON.parse(JSON.stringify(fresh)));assert.deepEqual(saved,fresh);
 const resumed=a.afterBonus(saved,{},1,rng);assert.equal(calls,1);assert.equal(resumed.remaining,'1000');assert.equal(resumed.sets,'2');assert.equal(resumed.entryQuota,'1000');
 const direct=a.enter({},rng);assert.equal(calls,2);assert.equal(direct.remaining,'1000');
});

test('all settings draw the same initial quota distribution with valid weights',()=>{
 loadModel();const a=NovaArt;assert.equal(a.entryQuotaRules.weights.reduce((a,b)=>a+b,0),100);
 for(const [roll,expected] of [[0,500],[.24999,500],[.25001,750],[.74999,750],[.75001,1000],[.99999,1000]]){
  for(let setting=1;setting<=6;setting++)assert.equal(a.enter({setting},()=>roll).remaining,String(expected));
 }
});

test('extra sets keep their awarded quota, including old saved 300pt sets',()=>{
 loadModel();const a=NovaArt;
 const legacy=a.normalize({phase:'art',payoutVersion:1,remaining:'1',sets:'2',burstVersion:2});
 assert.equal(legacy.setQuota,'300');
 const oldNext=a.step(legacy,{},()=>.999,'BELL');assert.equal(oldNext.flow.remaining,'300');assert.equal(oldNext.flow.sets,'1');
 const fresh={...a.enter({},()=>.5),remaining:'1',sets:'2'};
 const next=a.step(fresh,{},()=>.999,'BELL');assert.equal(next.flow.remaining,'150');assert.equal(next.flow.sets,'1');assert.equal(next.flow.entryQuota,'750');
});

test('entry quota never caps or changes later role rewards',()=>{
 loadModel();const a=NovaArt;
 const run=(quota,role)=>a.step({...a.enter({},()=>.5),entryQuota:String(quota),remaining:'2500',burstUsed:true},{setting:6},xoshiro128(126),role);
 for(const role of Object.keys(a.rareRoles).concat('BELL','REPLAY')){
  const low=run(150,role),high=run(2000,role);
  assert.deepEqual({...low,flow:{...low.flow,entryQuota:'0'}},{...high,flow:{...high.flow,entryQuota:'0'}});
 }
 const raised=a.settleZone({...a.enter({},()=>.5),zone:'giru',remaining:'100',award:'3000',zoneVersion:2});
 assert.equal(raised.remaining,'3100');assert.equal(raised.entryQuota,'750');
});

test('comeback and ura challenge preserve the entry draw and earned balance',()=>{
 loadModel();const a=NovaArt,start=a.enter({},()=>.99);
 const comeback=a.prepareComeback(a.beginComeback(start),{setting:6},()=>.5);
 const revival=a.step(comeback,{setting:6},()=>.5,'STRONG_NOVA');assert.equal(revival.comebackEvent,'success');assert.equal(revival.flow.entryQuota,'1000');
 const win=a.step({...start,burstPending:true,burstUsed:true},{setting:6},()=>0);
 assert.equal(win.burstReward.type,'ura');assert.equal(win.burstReward.points,0);assert.equal(win.flow.entryQuota,'1000');assert.equal(win.flow.remaining,'1000');
});
