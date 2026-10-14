import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const a=ctx.NovaArt,n=ctx.NovaNormal;
test('mode checkpoints favor even hundreds in A and odd hundreds in B',()=>{
 assert.deepEqual([...n.modes],['A','B','C','天国','天国ループ']);assert.deepEqual([...n.ceilings],[800,700,400,200,200]);
 for(const mode of n.modes){const state=n.normalize({mode,games:321,impurity:55});assert.equal(state.mode,mode);assert.equal(state.games,321);assert.equal(state.impurity,55);}
 for(const g of [200,400,600])assert(n.zoneRate({mode:'A'},g)>n.zoneRate({mode:'B'},g));
 for(const g of [300,500])assert(n.zoneRate({mode:'B'},g)>n.zoneRate({mode:'A'},g));
 assert.equal(n.ceiling({mode:'B'}),700);assert.equal(n.zoneRate({mode:'天国'},100),.65);
});
