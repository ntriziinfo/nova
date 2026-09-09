import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const a=NovaArt;
test('ura giru always selects six including confirmed entry',()=>{
 for(let setting=1;setting<=6;setting++)for(const roll of [0,.3,.9999]){
  for(const state of [a.enter(),{...a.enter(),entryStage:'confirmed',pendingZone:'ura_giru',giruSetting:setting}]){
   const s=state.entryStage?a.prepareBet(state,{setting},()=>roll):a.startZone(state,'ura_giru',{setting},()=>roll);
   assert.deepEqual(s.ladder,[300,500,1000,2000,3000]);
  }
  assert.ok(Math.abs(NovaBalance.zoneMean('ura_giru',{setting})-42500/27)<1e-8);
 }
});
test('300 is guaranteed but 500 can fail after reload',()=>{
 let s=a.startZone(a.enter(),'ura_giru');s=a.step(s,{},()=>.9999).flow;
 s=a.normalize(JSON.parse(JSON.stringify(s)));s=a.step(s,{},()=>.9999).flow;
 assert.equal(s.award,'500');assert.equal(s.zone,'giru');
 s=a.step(s,{},()=>.9999).flow;assert.equal(s.zone,'');assert.equal(s.award,'500');
});

