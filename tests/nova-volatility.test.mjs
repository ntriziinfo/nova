import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const a=ctx.NovaArt,n=ctx.NovaNormal;
test('retired normal/heaven modes migrate to common normal without mode-zone lotteries',()=>{
 assert.deepEqual([...n.modes],['通常']);assert.deepEqual([...n.ceilings],[800]);
 for(const mode of ['通常A','通常B','通常C','チャンス','天国準備','天国','特殊']){
  const state=n.normalize({mode,games:321,impurity:55});assert.equal(state.mode,'通常');assert.equal(state.games,321);assert.equal(state.impurity,55);
  for(const g of [50,100,200,300,500,600])assert.equal(n.zoneRate({...state,games:g},6),0);
 }
});
