import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-normal.js','utf8'),ctx);const n=ctx.NovaNormal;
test('normal play base stays within 30–35 games per 50pt at every setting',()=>{
 const bases=[];
 for(let setting=1;setting<=6;setting++){
  const p=n.roleProbabilities(setting);assert.ok(Math.abs(Object.values(p).reduce((s,x)=>s+x,0)-1)<1e-12);
  const payout=Object.entries(p).reduce((s,[role,chance])=>s+chance*n.pay(role),0),base=50/(3*(1-p.REPLAY)-payout);
  assert.ok(base>=30&&base<=35);bases.push(base);
 }
 assert.ok(Math.max(...bases)-Math.min(...bases)<1);
});
