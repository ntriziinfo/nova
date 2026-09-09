import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-art.js','utf8'),ctx);const a=ctx.NovaArt;
test('ART natural and forced Giru entries preserve the selected setting',()=>{
 let forced=a.step(a.enter(),{setting:5},()=>0,'ZONE_giru');assert.equal(forced.flow.giruSetting,5);
 for(const atLevel of [0,1,2,3,4,5]){
  const row=a.atZoneWeights(6,false,false,atLevel);const pick=(row[0]+row[1]+row[2]+row[3]/2)/100;let sequence=[.99,pick,.99];const natural=a.step({...a.enter({},()=>.5),atLevel},{setting:6},()=>sequence.shift(),'STRONG_NOVA');
  assert.equal(natural.flow.pendingZone,'giru');assert.equal(natural.flow.entryStage,'seven');assert.equal(natural.flow.giruSetting,6);
 }
});
test('AT NOVA entry preserves quota through bonus interruption',()=>{const t=a.step(a.enter(),{setting:3},()=>.5,'STRONG_NOVA');assert.equal(t.flow.entryStage,'seven');assert.equal(a.afterBonus(t.flow).remaining,'150');assert.equal(t.internalBonus,null);});
