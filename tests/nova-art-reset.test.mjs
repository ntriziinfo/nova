import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});
for(const file of ['nova-art.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const a=ctx.NovaArt,n=ctx.NovaNormal;
const normal={mode:'通常B',games:245,impurity:78,level:'high'};
test('ART final game resets normal ceiling count and next normal game is 1G',()=>{
 const before={...a.enter(),remaining:'1'},after=a.step(before,{},()=>.99,'BELL').flow;
 const state=n.afterArt(normal,before,after);
 assert.equal(state.games,0);assert.equal(state.mode,'通常B');assert.equal(state.impurity,78);assert.equal(state.level,'high');
 assert.equal(n.spin(state,after,1,{scale:0},()=>.99,'MISS').state.games,1);
 assert.equal(normal.games,245);
});
test('set continuation, zones, and CZ failure do not reset the count',()=>{
 const before={...a.enter(),remaining:'1',sets:'1'};
 const next=a.step(before,{},()=>.99,'BELL').flow;
 assert.equal(next.phase,'art');assert.equal(n.afterArt(normal,before,next).games,245);
 assert.equal(n.afterArt(normal,before,a.startZone(before,'sosuke')).games,245);
 assert.equal(n.afterArt(normal,{phase:'cz'},{phase:'normal'}).games,245);
});
test('bonus at ART boundary resets only when it returns to normal, not when a set is earned',()=>{
 const before={...a.enter(),remaining:'0'};
 assert.equal(n.afterArt(normal,before,a.afterBonus(before,{},0)).games,0);
 assert.equal(n.afterArt(normal,before,a.afterBonus(before,{},1)).games,245);
});
test('live transition resets displayed and internal counters without changing lifetime statistics',()=>{
 const source=fs.readFileSync('jag.html','utf8');
 const helper=source.match(/  function resetNormalCountersAfterArt\([^]*?\n  }/)[0];
 vm.runInContext('var normalState={sinceBonus:295,internal:{games:245,impurity:78,mode:"通常B"}};var stats={totalSpins:1500};'+helper+';resetNormalCountersAfterArt({phase:"art"},{phase:"normal"});',ctx);
 assert.equal(ctx.normalState.sinceBonus,0);assert.equal(ctx.normalState.internal.games,0);assert.equal(ctx.stats.totalSpins,1500);
});
