import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';vm.runInThisContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-art.js','utf8'));const a=NovaArt;
const sequence=(...values)=>()=>values.shift()??.999999;
test('retired minus-2000 bonus no longer overrides the profiled weak-role response',()=>{
 assert.equal(a.lossRewardControl.enabled,false);
 for(let setting=1;setting<=6;setting++)for(const atHigh of [false,true])for(const role of Object.keys(a.atRoleRules)){
  const profile=NovaTuning.balanceProfile(setting),weights=a.weakQualityWeights(setting,false),quality=(weights[0]+weights[1]/2)/100;
  const run=net=>a.resolveAtRole({atHigh,atHighLeft:10},role,setting,sequence(...(atHigh?[]:[.99]),profile.weakResponse/2,quality),net);
  assert.deepEqual(run(-2000),run(20000));
 }
});
test('weak-role response gate stays at six percent and quality one keeps the fixed Sosuke route',()=>{
 for(let setting=1;setting<=6;setting++)for(const role of Object.keys(a.atRoleRules)){
  const response=a.weakAtResponseChance(setting,false,true),weights=a.weakQualityWeights(setting,false),qualityOne=(weights[0]+weights[1]/2)/100;
  const miss=a.resolveAtRole({atHigh:true,atHighLeft:10},role,setting,sequence(response),-50000);
  assert.equal(miss.direct,0);assert.equal(miss.zone,'');assert.equal(!!miss.fixed50,false);
  const hit=a.resolveAtRole({atHigh:true,atHighLeft:10},role,setting,sequence(response-1e-12,qualityOne),-50000);
  assert.equal(hit.direct,0);assert.equal(hit.zone,'sosuke');assert.equal(hit.fixed50,true);
 }
});
