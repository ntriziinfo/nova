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
  assert.equal(t.entry,'');assert.equal(t.state.prelude.total,total);assert.equal(t.czPrelude.after,0);
  const stages=[];
  for(let game=1;game<=total;game++){
   t=spin(JSON.parse(JSON.stringify(t.state)));
   assert.equal(t.entry,game===total?'STRONG_CZ':'');assert.equal(t.czPrelude.left,total-game);
   stages.push(t.czPrelude.after);
   assert.equal(n.normalize(t.state).prelude.left,total-game);
   if(game<total)assert(t.czPrelude.after<3);
  }
  assert.deepEqual([...new Set(stages.filter(Boolean))],[1,2,3]);
  assert.equal(n.czPreludeStage(t.state.prelude),3);
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
 t=spin(t.state,'STRONG_SUICA',()=>0);assert.equal(t.state.prelude.total,total);assert.equal(t.state.prelude.left,total-1);
 t=spin(t.state,'STRONG_NOVA');assert.equal(t.state.prelude.left,total-2);assert.equal(t.state.prelude.entry,'STRONG_CZ');
 t=spin(t.state);assert.equal(t.entry,'STRONG_CZ');assert.equal(t.czOptions.strongChance,1);
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

test('blackout commits only on the landed third stop, with one announcement on the following BET',()=>{
 const source=fs.readFileSync('jag.html','utf8'),painted=[],announcements=[];
 const c=vm.createContext({renderCzPrelude:stage=>painted.push(stage),updateDisplay(){},showMessage(){},showOverlay:message=>announcements.push(message)});
 vm.runInContext(source.match(/  function showCzPrelude\([^]*?\n  }/)[0],c);
 const final={czPrelude:{before:2,after:3}};
 for(let stop=0;stop<=3;stop++)c.showCzPrelude(stop,final);
 assert.deepEqual(painted,[2,3]);assert.deepEqual(announcements,[]);
 const entry={czPrelude:{before:3,after:0,announce:true},flowAfter:{phase:'strong_cz'}};
 c.showCzPrelude(0,entry);c.showCzPrelude(0,entry);c.showCzPrelude(3,entry);
 assert.deepEqual(announcements,['強CZ突入']);assert.equal(painted.at(-1),0);
 c.showCzPrelude(0,{});assert.equal(painted.at(-1),0);
});
