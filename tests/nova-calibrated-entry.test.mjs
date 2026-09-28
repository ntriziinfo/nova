import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-art.js','utf8'),ctx);const a=ctx.NovaArt;
test('weak NOVA retains its common AT threshold and reserves the zone for the prelude',()=>{
 for(let setting=1;setting<=6;setting++){
  const threshold=.25*2*a.commonAtRules.weakNova;
  assert.ok(threshold>0&&threshold<1);
  const run=roll=>{let seq=[.99,roll,.5,.99];return a.step(a.enter(),{setting},()=>seq.shift()??.99,'WEAK_NOVA');};
  assert.equal(run(threshold-1e-9).flow.atPrelude.zones.length,1);
  assert.equal(run(threshold+1e-9).flow.atPrelude.zones.length,0);
  assert.ok(a.ladderValues.includes(Number(a.startZone(a.enter(),'giru',{setting}).initialAward)));
 }
});
