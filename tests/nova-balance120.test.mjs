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
 assert.equal(a.defaults.initial,200);assert.equal(a.comebackRules.games,5);for(const r of a.comebackRules.guaranteedRoles)assert.equal(a.comebackChance(r,6),1);
});
test('upper challenge rare role holds, then wins on the following aim game',()=>{
 loadCandidate();const a=NovaArt;
 for(const role of [...Object.keys(a.rareRoles),'SUPER_NOVA']){
  const base={...a.enter({setting:6},()=>.5),remaining:'123',burstPending:true,burstUsed:true};
  const held=a.step(base,{setting:6},()=>.99,role);assert.equal(held.burstEvent,'continue');assert.equal(held.flow.burstLeft,10);assert.equal(held.flow.researchAim,'rare');
  const won=a.step(a.normalize(JSON.parse(JSON.stringify(held.flow))),{setting:6},()=>.99,'MISS');
  assert.equal(won.burstEvent,'success');assert.equal(won.result,'SUPER_NOVA');assert.equal(won.flow.researchUpper,true);
  assert.equal(won.flow.atLevel,undefined);assert.equal(won.flow.burstLeft,0);assert.equal(won.burstReward,undefined);
 }
});

test('ten misses finish the upper challenge, while bell/replay and their aim games HOLD',()=>{
 loadCandidate();const a=NovaArt;
 for(const role of ['BELL','REPLAY']){
  let s={...a.enter({setting:6},()=>.5),burstPending:true,burstUsed:true};
  let out=a.step(s,{setting:6},()=>.999,role);assert.equal(out.flow.burstLeft,10);assert.equal(out.flow.researchAim,'common');
  out=a.step(out.flow,{setting:6},()=>.999,'MISS');assert.equal(out.flow.burstLeft,10);assert.equal(out.burstEvent,'continue');s=out.flow;
  for(let g=0;g<10;g++){out=a.step(s,{setting:6},()=>.999,'MISS');s=out.flow;assert.equal(out.burstEvent,g===9?'failure':'continue');}
  assert.equal(s.burstLeft,0);assert.equal(s.burstPending,false);assert.equal(s.burstUsed,true);
 }
});
