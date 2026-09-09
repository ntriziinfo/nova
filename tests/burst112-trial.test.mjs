import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBurstTrial} from '../scripts/burst112-trial-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';

test('trial retains initial 150, BIG chances, zone locations, mode guarantees and disk sources',()=>{
 const files=['nova-art.js','nova-normal.js','nova-flow.js'];
 const before=files.map(f=>fs.readFileSync(f,'utf8'));
 const a=loadBurstTrial({normalBoost:.48});const n=NovaNormal;
 assert.equal(a.enter({},()=>.5).remaining,'150');
 assert.equal(a.bonusRules.normal.atChance,.52);assert.equal(a.bonusRules.upper.atChance,.8);
 assert.deepEqual(n.ceilings,[600,600,500,600,300,100,200]);
 assert.deepEqual(n.transitions[4],[0,0,0,0,0,100,0]);
 for(const row of [...n.transitions,...Object.values(n.atEndModeWeights)]){
  assert.ok(row.every(p=>p>=0));assert.ok(Math.abs(row.reduce((s,p)=>s+p,0)-100)<1e-9);assert.equal(row[6],0);
 }
 assert.equal(n.atEndModeWeights.dry[0],0);
 assert.equal(n.zoneRate({mode:'通常A',games:99}),0);
 assert.ok(n.zoneRate({mode:'通常A',games:199})>.55);
 assert.ok(n.zoneRate({mode:'チャンス',games:49})<n.zoneRate({mode:'チャンス',games:99}));
 files.forEach((f,i)=>assert.equal(fs.readFileSync(f,'utf8'),before[i]));
});

test('three-game challenge gives 50% overall success, retains quota on failure, and never redraws',()=>{
 const a=loadBurstTrial();const initial={...a.enter({},()=>.5),atLevel:2,burstUsed:true,burstPending:true};
 let fail=initial;
 for(let i=0;i<3;i++)fail=a.step(fail,{},()=>.999).flow;
 assert.equal(fail.burstLeft,0);assert.equal(fail.burstPending,false);assert.equal(fail.burstWon,false);
 assert.equal(fail.remaining,'150');assert.equal(fail.atLevel,2);
 const next=a.step(fail,{},()=>.999,'REPLAY');assert.equal(next.flow.burstLeft,0);assert.equal(Burst112.attempts,1);
 const rng=xoshiro128(112);let won=0;const N=30000;
 for(let i=0;i<N;i++){
  let s=initial;
  for(let g=0;g<3&&!s.burstWon;g++)s=a.step(s,{},rng).flow;
  won+=s.burstWon;
 }
 assert.ok(Math.abs(won/N-.5)<.015);
});

test('success promotes same AT to Lv5 and adds 1500; state survives save, zone and bonus',()=>{
 const a=loadBurstTrial();let s={...a.enter({},()=>0),burstUsed:true,burstPending:true};
 s=a.step(s,{},()=>0).flow;
 assert.equal(s.atLevel,5);assert.equal(s.remaining,'1650');assert.equal(s.burstWon,true);assert.equal(s.dryEligible,false);
 s=a.normalize(JSON.parse(JSON.stringify(s)));
 s=a.afterBonus(s,{},1,()=>{throw Error('redraw');});
 s=a.settleZone(a.startZone(s,'sosuke',{},()=>.5));
 assert.equal(s.burstWon,true);assert.equal(s.burstUsed,true);assert.equal(s.atLevel,5);
 assert.equal(a.enter({},()=>0).burstUsed,false);
});

test('last-quota trigger is retained; zone prize and net-independent outcomes are retained',()=>{
 const a=loadBurstTrial({entry:Array(6).fill(1)});
 const base={...a.enter({},()=>0),remaining:'1'};
 // Avoid high/direct, then trigger on weak watermelon; its 6pt payout must not lose the challenge.
 const values=[.5,.9,.9,0];let i=0;
 const t=a.step(base,{setting:1},()=>values[i++]??.99,'WEAK_SUICA');
 assert.equal(t.flow.phase,'art');assert.equal(t.flow.burstPending,true);assert.equal(t.flow.remaining,'1');
 const strong=a.step(base,{setting:1},()=>0,'STRONG_NOVA');
 assert.equal(strong.flow.burstPending,true);assert.equal(strong.flow.entryStage,'seven');assert.ok(strong.flow.pendingZone);
 const pending=a.step(strong.flow,{setting:1},()=>.99).flow;assert.equal(pending.burstPending,true);assert.equal(pending.entryStage,'roulette');
 const run=netPt=>a.step({...base,remaining:'9999'},{setting:1,netPt},xoshiro128(112),'WEAK_NOVA');
 assert.deepEqual(run(-10000),run(10000));
});
