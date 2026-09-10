import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';

test('final payout enters five recovery games immediately; only the fifth miss ends AT',()=>{
 loadModel();const a=NovaArt,n=NovaNormal,base={...a.enter({setting:1},()=>0),remaining:'1'};
 let t=a.step(base,{setting:1},()=>.999999,'BELL');
 assert.equal(t.result,'BELL');assert.equal(t.flow.phase,'art');assert.equal(t.flow.remaining,'0');assert.equal(t.flow.comebackLeft,5);assert.equal(t.comebackEvent,'entry');
 const internal=n.normalize({games:123,mode:'通常A',impurity:10});
 assert.deepEqual(n.afterArt(internal,base,t.flow,{},()=>0),internal);
 for(let g=1;g<=5;g++){
  const before=t.flow;t=a.step(before,{setting:1},()=>.999999,'MISS');
  assert.equal(t.comebackEvent,g===5?'failure':'continue');assert.equal(t.flow.phase,g===5?'normal':'art');
  if(g<5)assert.equal(t.flow.comebackLeft,5-g);
  else {const end=n.afterArt(internal,before,t.flow,{setting:1},()=>0);assert.equal(end.games,0);assert.equal(end.impurity,12);assert.notEqual(end.mode,'通常A');}
 }
});

test('a pending lamp is chosen once per BET and misses choose a new lamp next game',()=>{
 loadModel();const a=NovaArt;
 const waiting=a.beginComeback(a.enter({},()=>0));let calls=0;
 const ready=a.prepareBet(waiting,{},()=>{calls++;return 0;});assert.equal(ready.comebackLamp,'sosuke');
 const second=a.prepareBet(ready,{},()=>{throw Error('redraw');});assert.equal(second.comebackLamp,ready.comebackLamp);assert.equal(calls,1);
 const miss=a.step(second,{},()=>.9999,'MISS');assert.equal(miss.flow.comebackLamp,'');assert.equal(miss.flow.comebackLeft,4);
 assert.notEqual(a.prepareBet(miss.flow,{},()=>.999).comebackLamp,'sosuke');
});

test('every drawn role is eligible, with the configured marginal probability',()=>{
 loadModel();const a=NovaArt,probs=a.comebackRoleProbabilities(6);
 assert.ok(Math.abs(Object.values(probs).reduce((a,b)=>a+b,0)-1)<1e-12);
 for(const role of Object.keys(probs))assert.ok(a.comebackChance(role,6)>0,role);
 const ready={...a.beginComeback(a.enter({},()=>0)),comebackLamp:'toto'};
 for(const role of ['MISS','BELL','REPLAY','WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B','WEAK_NOVA']){
  const rng=xoshiro128(114);let hits=0;const count=20000;
  for(let i=0;i<count;i++)hits+=a.step(ready,{setting:3},rng,role).comebackEvent==='success';
  assert.ok(Math.abs(hits/count-a.comebackChance(role,3))<.015,role);
 }
});

test('win lights the selected zone and revives from its award without a free 150pt',()=>{
 loadModel();const a=NovaArt;
 const base={...a.beginComeback(a.enter({},()=>0)),comebackLeft:1,comebackLamp:'sosuke',atLevel:5,burstWon:true,burstUsed:true};
 const won=a.step(base,{},()=>0,'REPLAY');assert.equal(won.comebackEvent,'success');assert.equal(won.flow.remaining,'0');assert.equal(won.flow.atLevel,5);assert.equal(won.flow.burstUsed,true);
 assert.equal(base.comebackLeft,1);assert.equal(base.comebackConfirmed,false);
 assert.equal(won.flow.pendingZone,'sosuke');assert.equal(won.flow.comebackConfirmed,true);
 const reload=a.normalize(JSON.parse(JSON.stringify(won.flow)));assert.deepEqual(reload,won.flow);
 const entered=a.prepareBet(reload,{},()=>0);assert.equal(entered.zone,'sosuke');assert.equal(entered.comebackLeft,0);assert.equal(entered.comebackConfirmed,false);
 const finished=a.settleZone({...entered,award:'100'});assert.equal(finished.remaining,'100');assert.equal(finished.atLevel,5);
});

test('every rare role guarantees revival on all five games and settings, including after reload',()=>{
 loadModel();const a=NovaArt;
 const roles=['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'];
 for(let setting=1;setting<=6;setting++)for(let left=1;left<=5;left++)for(const role of roles){
  const base={...a.beginComeback(a.enter({setting},()=>0)),comebackLeft:left,comebackLamp:'toto',atLevel:5,burstUsed:true};
  const restored=a.normalize(JSON.parse(JSON.stringify(base)));
  const won=a.step(restored,{setting,comebackRare:0},()=>1-Number.EPSILON,role);
  assert.equal(won.comebackEvent,'success',`${setting}/${left}/${role}`);
  assert.equal(won.flow.comebackConfirmed,true);assert.equal(won.flow.comebackLeft,0);
  assert.equal(won.flow.atLevel,5);assert.equal(won.flow.burstUsed,true);
  if(!['STRONG_NOVA','SUPER_NOVA'].includes(role))assert.equal(won.flow.pendingZone,'toto');
 }
 const ready={...a.beginComeback(a.enter({},()=>0)),comebackLamp:'toto'};
 for(const [role,p] of [['MISS',.001],['BELL',.01],['REPLAY',.01]]){
  assert.equal(a.step(ready,{},()=>p-Number.EPSILON,role).comebackEvent,'success');
  assert.equal(a.step(ready,{},()=>p,role).comebackEvent,'continue');
 }
});

test('strong NOVA promotes weak lamps to upper zones; SUPER NOVA awards an ura zone',()=>{
 loadModel();const a=NovaArt;
 for(let i=0;i<50;i++)for(const role of ['STRONG_NOVA','SUPER_NOVA']){
  const base={...a.beginComeback(a.enter({},()=>0)),comebackLamp:'toto'};
  const won=a.step(base,{setting:6},xoshiro128(i),role);
  assert.equal(won.comebackEvent,'success');
  assert.ok((role==='SUPER_NOVA'?a.zoneGroups.super:[...a.zoneGroups.strong,...a.zoneGroups.super]).includes(won.flow.pendingZone));
 }
 const ura={...a.beginComeback(a.enter({},()=>0)),comebackLamp:'ura_sora'};
 assert.equal(a.step(ura,{},()=>.99,'STRONG_NOVA').flow.pendingZone,'ura_sora');
 assert.equal(a.step(ura,{},()=>0,'FREEZE').result,'SUPER_NOVA');
});

test('a bonus interruption preserves unused comeback games or uses its awarded AT set',()=>{
 loadModel();const a=NovaArt,base={...a.beginComeback(a.enter({},()=>0)),comebackLeft:3,atLevel:5};
 const lost=a.afterBonus(base,{},0,()=>0);assert.equal(lost.comebackLeft,3);assert.equal(lost.atLevel,5);
 const won=a.afterBonus(base,{},1,()=>0);assert.equal(won.comebackLeft,0);assert.equal(won.remaining,String(a.defaults.initial));assert.equal(won.atLevel,5);
});

test('existing set stock and reserved zones are consumed before end recovery',()=>{
 loadModel();const a=NovaArt;
 const base={...a.enter({},()=>0),remaining:'1',sets:'1'};
 const next=a.step(base,{},()=>.99,'BELL');assert.equal(next.flow.remaining,String(a.defaults.initial));assert.equal(next.flow.sets,'0');assert.equal(next.flow.comebackLeft,0);
 const reserved=a.step({...base,sets:'0',queuedZones:['toto']},{},()=>.99);assert.equal(reserved.flow.zone,'toto');assert.equal(reserved.flow.comebackLeft,0);
});

test('presentation uses original lamp ids; success is shown only from committed flow',()=>{
 loadModel();const ctx=vm.createContext({NovaArt});vm.runInContext(fs.readFileSync('nova-comeback-presentation.js','utf8'),ctx);const p=ctx.NovaComeback;
 const flow={phase:'art',comebackLeft:3,comebackLamp:'toto'};
 assert.equal(p.scene(flow,true).mode,'blink');assert.equal(p.scene(flow,true).lamp,'toto');assert.equal(p.scene(flow,false).mode,'waiting');
 const confirmed={phase:'art',entryStage:'confirmed',comebackConfirmed:true,pendingZone:'ura_giru'};
 assert.equal(p.scene(confirmed).mode,'won');assert.equal(p.scene(confirmed).lamp,'giru1');assert.equal(p.scene(confirmed).ura,true);
 assert.equal(p.scene({phase:'normal'}).mode,'');assert.equal(p.scene({phase:'art',zone:'giru'}).mode,'');
});
