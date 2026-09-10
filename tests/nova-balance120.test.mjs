import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
const loadCandidate=()=>loadModel();
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
test('50pt BIG has valid payouts and exactly the tier AT chance before four bells',()=>{
 loadCandidate({setting:6,cache:false});const a=NovaArt;
 for(const tier of ['normal','upper']){
  const p=a.bonusRoleProbabilities(6,tier);assert(Object.values(p).every(v=>v>=0&&v<=1));
  assert(Math.abs(1-(p.BELL/(p.BELL+p.NEBULA))**4-a.bonusRules[tier].atChance)<1e-12);
  let paid=0;for(let i=0;i<4;i++)paid+=a.bonusPayout({paid},'BELL');assert.equal(paid,50);assert.equal(a.bonusPayout({paid},'BELL'),0);
 }
 assert.equal(a.defaults.initial,300);assert.equal(a.comebackRules.games,5);for(const r of a.comebackRules.guaranteedRoles)assert.equal(a.comebackChance(r,6),1);
});
test('500/1000/2000 rewards and level lottery are separate and never demote an existing level',()=>{
 loadCandidate({setting:6});const a=NovaArt;
 for(const [roll,pt] of [[0,500],[.7,1000],[.99,2000]])for(const [levelRoll,level] of [[0,1],[.7,4],[.99,5]]){
  const s={...a.enter({setting:6},()=>0),remaining:'777',burstType:'points'},values=[roll,levelRoll];
  const reward=a.burstReward(s,()=>values.shift());assert.equal(reward.points,pt);assert.equal(s.remaining,String(777+pt));assert.equal(s.atLevel,level);
 }
 const s={...a.enter({setting:6},()=>0),atLevel:5,burstType:'points'};a.burstReward(s,()=>0);assert.equal(s.atLevel,5);
});
test('ura reward guarantees one of the three ura zones and no automatic level promotion',()=>{
 loadCandidate({setting:6});const a=NovaArt;
 for(const [roll,zone] of [[0,'ura_giru'],[.5,'ura_sora'],[.99,'ura_ouma']]){
  const base={...a.enter({setting:6},()=>0),remaining:'123',burstType:'ura',burstPending:true,burstUsed:true},values=[0,roll];
  const won=a.step(base,{setting:6},()=>values.shift());assert.equal(won.burstEvent,'success');assert.equal(won.burstReward.zone,zone);assert.equal(won.flow.remaining,'123');assert.equal(won.flow.atLevel,1);assert.equal(won.flow.entryStage,'confirmed');
  const ready=a.prepareBet(a.normalize(JSON.parse(JSON.stringify(won.flow))),{setting:6},()=>0);assert.equal(a.zoneName(ready),a.zoneName(zone));assert(ready.ura);
 }
});
test('both challenge types retain three-game 50% success and a used flag after failure',()=>{
 loadCandidate({setting:6});const a=NovaArt;
 for(const burstType of ['points','ura']){
  const rng=xoshiro128(120);let wins=0;
  for(let i=0;i<10000;i++){let s={...a.enter({setting:6},()=>0),burstType,burstPending:true,burstUsed:true};for(let g=0;g<3&&!s.burstWon;g++)s=a.step(s,{setting:6},rng).flow;wins+=s.burstWon;assert.equal(s.burstLeft,0);assert.equal(s.burstPending,false);assert.equal(s.burstUsed,true);}
  assert(Math.abs(wins/10000-.5)<.02);
 }
});
