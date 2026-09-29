import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';

test('upper challenge includes HOLD and aim games in initial 50% and ordinary 65% success',()=>{
 loadModel();const a=NovaArt;
 for(const [source,target] of [['initial',.5],['rare',.65]]){
  const rng=xoshiro128('challenge-'+source);let wins=0;
  for(let i=0;i<6000;i++){
   let s={...a.enter({setting:6},()=>.5),burstPending:true,burstUsed:true,researchChallengeSource:source},out,g=0;
   do{out=a.step(s,{setting:6},rng);s=out.flow;assert(++g<1000);}while(!out.researchChallenge.finished);
   wins+=out.researchChallenge.won;assert.equal(s.atLevel,undefined);assert.equal(s.burstPending,false);assert.equal(s.burstLeft,0);
   if(source==='initial')assert.equal(s.entryStage,'seven');
  }
  assert(Math.abs(wins/6000-target)<.025,source+': '+wins/6000);
 }
});

test('upper success and earned quota survive reload, bonus and zone transitions',()=>{
 loadModel();const a=NovaArt;
 let s=a.step({...a.enter({},()=>.5),burstUsed:true,burstPending:true},{},()=>.99,'WEAK_NOVA').flow;
 s=a.step(s,{},()=>.99,'MISS').flow;assert.equal(s.burstWon,true);assert.equal(s.researchUpper,true);
 s=a.afterBonus(a.normalize(JSON.parse(JSON.stringify(s))),{},1,()=>{throw Error('redraw');});
 s=a.settleZone(a.startZone(s,'sosuke',{},()=>.5));
 assert.equal(s.burstWon,true);assert.equal(s.researchUpper,true);assert.equal(s.burstUsed,true);assert.equal(s.atLevel,undefined);
 const old={...a.enter({},()=>.5),atLevel:5,remaining:'9876'};delete old.burstVersion;
 const retained=a.normalize(old);assert.equal(retained.atLevel,undefined);assert.equal(retained.remaining,'9876');
 const step=a.step(retained,{setting:6},()=>0,'STRONG_NOVA');
 assert.equal(step.flow.burstPending,true);assert.equal(step.flow.atPrelude.zones.length,1);assert.equal(step.flow.entryStage,'');
});

test('last-quota rare trigger waits for the already won zone and preserves awarded quota',()=>{
 loadModel();const a=NovaArt,base={...a.enter({},()=>.5),remaining:'1'};
 let out=a.step(base,{setting:1},()=>0,'STRONG_NOVA'),s=out.flow;
 assert.equal(s.burstPending,true);assert.equal(s.remaining,'1');assert.equal(s.atPrelude.zones.length,1);
 while(s.atPrelude){out=a.step(s,{setting:1},()=>.99,'MISS');s=out.flow;assert.equal(out.burstEvent,undefined);}
 out=a.step(s,{setting:1},()=>.99);assert.equal(out.burstEvent,undefined);assert.equal(out.flow.entryStage,'roulette');
 const run=netPt=>a.step({...base,remaining:'9999'},{setting:1,netPt},xoshiro128(112),'WEAK_NOVA');
 assert.deepEqual(run(-10000),run(10000));
});

test('normal/CZ setting profile uses role lotteries, common ceiling and guaranteed CZ',()=>{
 loadModel();const a=NovaArt,n=NovaNormal,f=NovaFlow;
 for(let setting=1;setting<=6;setting++){
  const cfg=f.forSetting({},setting);
  assert(cfg.czChance>=.55&&cfg.czChance<=.64);assert(cfg.strongChance>=.77&&cfg.strongChance<=.82);
  assert.equal(f.forSetting({strongChance:1},setting).strongChance,1);
  assert.equal(f.forSetting(cfg,setting).czChance,cfg.czChance);
  assert.equal(n.zoneRate({mode:'通常A',games:99},setting),0);
  assert.equal(n.zoneRate({mode:'通常A',games:199},setting),0);
  assert.equal(n.afterBonus({mode:'天国準備'},()=>.1,setting).mode,'通常');
  for(let j=0;j<100;j++)assert.notEqual(n.afterArt({}, {phase:'art'}, {phase:'normal',dryAtEnd:true},{setting},()=>j/100).mode,'通常A');
  assert.equal(a.enter({setting},()=>.999999).atLevel,undefined);
 }
 assert.equal(a.bonusRules.normal.atChance,.52);assert.equal(a.bonusRules.upper.atChance,.8);
});
