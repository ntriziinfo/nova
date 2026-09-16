import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';vm.runInThisContext(fs.readFileSync('nova-art.js','utf8'));const a=NovaArt;
test('retired minus-2000 bonus no longer overrides the common AT rules',()=>{
 assert.equal(a.lossRewardControl.enabled,false);
 for(const atLevel of [0,1,2,3,4,5])for(const [atHigh,chance]of [[false,Math.min(1,.5*a.commonAtRules.weakNova)],[true,Math.min(1,1.5*a.commonAtRules.weakNova)]]){
  let wins=0;for(let i=0;i<1000;i++)if(a.resolveAtRole({atLevel,atHigh,atHighLeft:10},'WEAK_NOVA',1,()=>(i+.5)/1000,-2000).zone)wins++;
  assert.equal(wins,Math.round(1000*chance));
 }
});
test('direct win rates use common AT rules and amounts retain their tables',()=>{
 for(const treatment of [1,2,3,4,5])for(const [role,rule]of Object.entries(a.atRoleRules)){
  let wins=0;for(let i=0;i<3000;i++){
   const out=a.resolveAtRole({atLevel:treatment,atHigh:true,atHighLeft:10},role,6,()=>(i+.5)/3000,-50000);
   if(out.direct){wins++;assert.ok(rule.values.includes(out.direct));}
  }
  assert.equal(wins,Math.round(3000*Math.min(1,rule.hit*a.commonAtRules.direct)));
 }
});
