import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-normal.js','utf8'),ctx);const n=ctx.NovaNormal;
test('visible normal roles are common and ordinary play is exact base30',()=>{
 const plain=x=>JSON.parse(JSON.stringify(x)),shared=plain(n.roleProbabilities(1)),ordinary=plain(n.normalRoleProbabilities(1));
 for(let setting=1;setting<=6;setting++){
  const p=n.normalRoleProbabilities(setting);assert.deepEqual(plain(n.roleProbabilities(setting)),shared);assert.deepEqual(plain(p),ordinary);
  assert.ok(Math.abs(Object.values(p).reduce((s,x)=>s+x,0)-1)<1e-12);
  const payout=Object.entries(p).reduce((s,[role,chance])=>s+chance*n.pay(role==='NAVI_BELL'?'BELL':role),0),base=50/(3*(1-p.REPLAY)-payout);
  assert.ok(Math.abs(base-30)<1e-10);
 }
});
