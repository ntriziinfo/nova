import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync('nova-art.js','utf8'));const a=NovaArt;
test('session net thresholds no longer suppress new AT rewards',()=>{
 for(let setting=1;setting<=6;setting++)for(const net of [-50000,-2000,0,2000,4000,5000,50000])assert.equal(a.netRewardFactor(setting,net),1);
 assert.equal(a.netRewardControl.enabled,false);
});
test('positive and negative net neither change AT outcomes nor consume extra randomness',()=>{
 for(let setting=1;setting<=6;setting++)for(const treatment of [0,1,2,3,4,5])for(const role of ['WEAK_NOVA','STRONG_NOVA','WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B']){
  const s={...a.enter({},()=>.5),atLevel:treatment};
  const run=netPt=>{let calls=0;return [a.step(s,{setting,netPt},()=>{calls++;return .1;},role),()=>calls];};
  const [base,count]=run(0);
  for(const netPt of [-50000,2000,5000,50000]){const [actual,n]=run(netPt);assert.deepEqual(actual,base);assert.equal(n(),count());}
 }
});
test('strong Nova awards are never discarded at a positive net threshold',()=>{
 for(const treatment of [0,1,2,3,4,5])for(let setting=1;setting<=6;setting++)assert.ok(a.resolveAtRole({atLevel:treatment},'STRONG_NOVA',setting,()=>.99,50000).zone);
});
