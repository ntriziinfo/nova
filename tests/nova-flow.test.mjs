import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('nova-art.js','utf8'),context);
vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),context);
const flow=context.NovaFlow;
test('CZ and strong CZ defaults and exact success thresholds',()=>{
 assert.equal(flow.enterCZ(false,undefined,()=>.399999).success,true);
 assert.equal(flow.enterCZ(false,undefined,()=>.4).success,false);
 assert.equal(flow.enterCZ(true,undefined,()=>.699999).success,true);
 assert.equal(flow.enterCZ(true,undefined,()=>.7).success,false);
 assert.equal(flow.enterCZ(false).remaining,10);
 assert.equal(flow.enterCZ(true).remaining,10);
});
test('CZ consumes exactly ten subsequent games and persists success across reload',()=>{
 let state=flow.enterCZ(true,undefined,()=>0);
 state=flow.normalize(JSON.parse(JSON.stringify(state)));
 for(let i=0;i<9;i++){assert.equal(state.remaining,10-i);state=flow.advance(state);}
 assert.equal(state.remaining,1);assert.equal(state.success,true);
 state=flow.advance(state);assert.equal(state.phase,'normal');
});
test('ART starts at 50 and returns to normal only after the 50th game',()=>{
 let state=flow.afterBonus(null,undefined,1);
 for(let n=50;n>0;n--){assert.equal(state.phase,'art');assert.equal(state.remaining,String(n));state=context.NovaArt.step(state,{rare:0},()=>0).flow;}
 assert.equal(state.phase,'normal');assert.equal(state.remaining,0);
 assert.equal(flow.normalize({phase:'rising',remaining:32}).phase,'normal');
});
test('Base replay/bell distribution yields expected net 1.2pt with 3pt BET',()=>{
 const counts={REPLAY:0,BELL:0,MISS:0};
 for(let i=0;i<10000;i++)counts[flow.drawRT(()=> (i+.5)/10000)]++;
 assert.deepEqual(counts,{REPLAY:6000,BELL:3000,MISS:1000});
 assert.ok(Math.abs((counts.REPLAY*3+counts.BELL*8)/10000-3-1.2)<1e-12);
});
test('normal entry lottery has separate CZ and strong CZ rates',()=>{
 const counts={CZ:0,STRONG_CZ:0,'':0};
 for(let i=0;i<60000;i++)counts[flow.drawEntry(undefined,()=> (i+.5)/60000)]++;
 assert.deepEqual(counts,{CZ:500,STRONG_CZ:100,'':59400});
});
test('new flow and isolated state storage are wired into game',()=>{
 const game=fs.readFileSync('jag.html','utf8');
 assert.match(game,/nova-flow\.js/);
 assert.match(game,/normalState\.flow = NovaFlow\.afterBonus/);
 assert.match(game,/flow:NovaFlow\.normalize\(data\.normalState\.flow\)/);
 assert.match(game,/nova_slot_state_v1_/);
 const draw=game.slice(game.indexOf('  function drawIndependentATypeOutcome(){'),game.indexOf('  function drawNormalResult(){'));
 assert.match(draw,/NovaFlow\.drawRT\(\)/);
 assert.match(draw,/flow\.remaining === 1 && flow\.success/);
 assert.doesNotMatch(draw,/novaBonusModeScale|bigP|regP/);
});
