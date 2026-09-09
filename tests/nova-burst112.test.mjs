import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';

test('production burst is one three-game chance per new AT, with a 50% success rate',()=>{
 loadModel();const a=NovaArt,initial={...a.enter({setting:6},()=>0),burstUsed:true,burstPending:true};
 const rng=xoshiro128(112);let wins=0;
 for(let i=0;i<30000;i++){
  let s=initial;
  for(let g=0;g<3&&!s.burstWon;g++)s=a.step(s,{setting:6},rng).flow;
  wins+=s.burstWon;
  assert.equal(s.remaining,s.burstWon?'2150':'150');
  assert.equal(s.atLevel,s.burstWon?5:1);
  assert.equal(s.burstPending,false);assert.equal(s.burstLeft,0);
 }
 assert.ok(Math.abs(wins/30000-.5)<.015);
 let s=initial;
 for(let i=0;i<3;i++)s=a.step(s,{},()=>.999).flow;
 const next=a.step(s,{},()=>0,'STRONG_NOVA');
 assert.equal(next.flow.burstPending,false);assert.equal(next.flow.burstUsed,true);
});

test('success persists through save, bonus and zones; legacy AT cannot gain a new burst',()=>{
 loadModel();const a=NovaArt;
 let s=a.step({...a.enter({},()=>0),burstUsed:true,burstPending:true},{},()=>0).flow;
 s=a.afterBonus(a.normalize(JSON.parse(JSON.stringify(s))),{},1,()=>{throw Error('redraw');});
 s=a.settleZone(a.startZone(s,'sosuke',{},()=>.5));
 assert.equal(s.burstWon,true);assert.equal(s.atLevel,5);assert.equal(s.burstUsed,true);
 const old={...a.enter({},()=>0),atLevel:5,remaining:'9876'};delete old.burstVersion;
 const retained=a.normalize(old);assert.equal(retained.atLevel,5);assert.equal(retained.remaining,'9876');
 const step=a.step(retained,{setting:6},()=>0,'STRONG_NOVA');
 assert.equal(step.flow.burstPending,false);assert.equal(step.flow.entryStage,'seven');
 assert.equal(a.enter({},()=>0).burstVersion,1);assert.equal(a.enter({},()=>0).burstUsed,false);
});

test('last-quota trigger and preexisting zone are preserved without net-dependent adjustment',()=>{
 loadModel();const a=NovaArt,base={...a.enter({},()=>0),remaining:'1'};
 const values=[.5,.9,.9,0];let i=0;
 const t=a.step(base,{setting:1},()=>values[i++]??.99,'WEAK_SUICA');
 assert.equal(t.flow.phase,'art');assert.equal(t.flow.burstPending,true);assert.equal(t.flow.remaining,'1');
 const strong=a.step(base,{setting:1},()=>0,'STRONG_NOVA');
 assert.equal(strong.flow.burstPending,true);assert.equal(strong.flow.entryStage,'seven');
 const entry=a.step(strong.flow,{setting:1},()=>.99);
 assert.equal(entry.burstEvent,undefined);assert.equal(entry.flow.entryStage,'roulette');
 const run=netPt=>a.step({...base,remaining:'9999'},{setting:1,netPt},xoshiro128(112),'WEAK_NOVA');
 assert.deepEqual(run(-10000),run(10000));
});

test('normal/CZ setting profile retains forbidden zones, mode hints and guaranteed CZ',()=>{
 loadModel();const a=NovaArt,n=NovaNormal,f=NovaFlow;
 for(let setting=1;setting<=6;setting++){
  const b=a.initialHitBoost(setting),cfg=f.forSetting({},setting);
  assert.equal(cfg.czChance,.4+.4*b);assert.equal(cfg.strongChance,.7+.2*b);
  assert.equal(f.forSetting({strongChance:1},setting).strongChance,1);
  assert.equal(f.forSetting(cfg,setting).czChance,cfg.czChance);
  assert.equal(n.zoneRate({mode:'通常A',games:99},setting),0);
  assert.ok(Math.abs(n.zoneRate({mode:'通常A',games:199},setting)-(.55+.45*b))<1e-12);
  assert.equal(n.afterBonus({mode:'天国準備'},()=>.1,setting).mode,'天国');
  for(let j=0;j<100;j++)assert.notEqual(n.afterArt({}, {phase:'art'}, {phase:'normal',dryAtEnd:true},{setting},()=>j/100).mode,'通常A');
  assert.equal(a.enter({setting},()=>.999999).atLevel,3);
 }
 assert.equal(a.bonusRules.normal.atChance,.52);assert.equal(a.bonusRules.upper.atChance,.8);
});
