import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-art.js','utf8'),ctx);const a=ctx.NovaArt;
test('calibrated entry scale controls rare-role zone wins without changing payout or zone awards',()=>{
 for(let setting=1;setting<=6;setting++){
  const threshold=(a.defaults.big+a.defaults.zone)*(1+.2*a.biasFor(setting))*a.zoneEntryScale[setting-1];
  assert.ok(threshold>0&&threshold<1);
  const run=roll=>{let seq=[.99,roll,.5,.99];return a.step(a.enter(),{setting},()=>seq.shift()??.99,'RARE');};
  assert.equal(run(threshold-1e-9).flow.entryStage,'seven');
  assert.equal(run(threshold+1e-9).flow.entryStage,'');
  assert.equal(a.startZone(a.enter(),'giru',{setting}).initialAward,'100');
 }
});
