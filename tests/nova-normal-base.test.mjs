import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-normal.js','utf8'),ctx);const n=ctx.NovaNormal;
test('shared normal base follows the approved role merge',()=>{
 const bases=[];
 for(let setting=1;setting<=6;setting++){
  const p=n.roleProbabilities(setting);assert.ok(Math.abs(Object.values(p).reduce((s,x)=>s+x,0)-1)<1e-12);
  const payout=Object.entries(p).reduce((s,[role,chance])=>s+chance*n.pay(role),0),base=50/(3*(1-p.REPLAY)-payout);
  assert.ok(Math.abs(base-JSON.parse(fs.readFileSync('tests/fixtures/nova-role-merge-approved.json')).sharedBases[setting-1])<1e-10);bases.push(base);
 }
 assert.ok(bases[5]>bases[0]);
});
