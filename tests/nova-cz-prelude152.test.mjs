import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';
loadModel();const n=NovaNormal;
const spin=(state,role='BELL',rng=()=>.99)=>n.spin(state,{phase:'normal'},3,{},rng,role);

test('every prelude length enters CZ on full blackout and announces on the first CZ game',()=>{
 for(let total=3;total<=10;total++){
  let t=spin({},'STRONG_NOVA',()=>(total-3)/8+.001);
  assert.equal(t.entry,'');assert.equal(t.state.prelude.total,total);assert([1,2].includes(t.czPrelude.after));
  const stages=[];
  for(let game=1;game<total;game++){
   t=spin(JSON.parse(JSON.stringify(t.state)));
   assert.equal(t.entry,game===total-1?'STRONG_CZ':'');assert.equal(t.czPrelude.left,total-game-1);
   stages.push(t.czPrelude.after);
   assert.equal(n.normalize(t.state).prelude.left,total-game-1);
   if(game<total-1)assert(t.czPrelude.after<3);
  }
  assert.equal(stages.at(-1),3);assert(stages.slice(0,-1).every(n=>n===1||n===2));
  assert.equal(n.czPreludeStage(t.state.prelude),0);
  assert.equal(t.entrySource,'rare');assert.equal(t.czOptions.strongChance,.85);
  const flow=NovaFlow.enterCZ(true,t.czOptions,()=>.9),remaining=flow.remaining;
  t=n.spin(JSON.parse(JSON.stringify(t.state)),flow,3,{},()=>.99,'REPLAY');
  assert.equal(t.entry,'');assert.equal(t.result,'REPLAY');assert.equal(t.state.prelude,null);assert.equal(t.czPrelude.announce,true);
  assert.equal(t.czLamp.remaining,remaining);assert.equal(NovaFlow.advance(t.czFlow).remaining,remaining-1);
  const next=n.spin(t.state,NovaFlow.advance(t.czFlow),3,{},()=>.99,'BELL');assert.equal(next.czPrelude,undefined);
 }
});

test('additional roles cannot restart a won prelude, and strong NOVA promotion retains the deadline',()=>{
 let t=spin({},'WEAK_NOVA',()=>0);const total=t.state.prelude.total;
 assert.equal(t.state.prelude.entry,'CZ');
 t=spin(t.state,'STRONG_SUICA',()=>0);assert.equal(t.state.prelude.total,total);assert.equal(t.state.prelude.left,total-2);
 t=spin(t.state,'STRONG_NOVA');assert.equal(t.state.prelude.left,total-3);assert.equal(t.state.prelude.entry,'STRONG_CZ');
 assert.equal(t.entry,'STRONG_CZ');assert.equal(t.czOptions.strongChance,1);
});

test('ceiling and premium outcomes do not duplicate or leave a stale CZ reservation',()=>{
 let t=spin({games:799},'BELL',()=>.9);assert.equal(t.state.prelude.kind,'ceilingCz');
 for(let i=0;i<11&&!t.entry;i++)t=spin(t.state);
 assert.equal(t.entry,'STRONG_CZ');assert.equal(t.czOptions.strongChance,1);assert.equal(t.entrySource,'ceiling');
 assert.equal(t.state.impurity,10);assert.equal(spin(t.state).state.impurity,10);
 const won=spin({},'STRONG_NOVA');
 const frozen=spin(won.state,'FREEZE');assert(frozen.internalBonus.premiumBonus);assert.equal(frozen.state.prelude,null);
 const premium=spin(won.state,'',()=>0);assert.equal(premium.result,'SUPER_NOVA');assert.equal(premium.state.prelude,null);
 assert.equal(n.afterBonus(won.state).prelude,null);
 assert.equal(n.afterArt(won.state,{phase:'art'},{phase:'normal'}).prelude,null);
});
