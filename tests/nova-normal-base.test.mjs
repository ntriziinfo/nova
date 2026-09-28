import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-normal.js','utf8'),ctx);const n=ctx.NovaNormal;
test('normal play base is 33.5 for settings 1-5 and 42 for setting 6',()=>{
 const bases=[];
 for(let setting=1;setting<=6;setting++){
  const p=n.roleProbabilities(setting);assert.ok(Math.abs(Object.values(p).reduce((s,x)=>s+x,0)-1)<1e-12);
  const payout=Object.entries(p).reduce((s,[role,chance])=>s+chance*n.pay(role),0),base=50/(3*(1-p.REPLAY)-payout);
  assert.ok(Math.abs(base-(setting===6?42:33.5))<1e-10);bases.push(base);
 }
 assert.ok(Math.abs(bases[5]-bases[0]-8.5)<1e-10);
});
