import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';vm.runInThisContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-art.js','utf8'));const a=NovaArt;
test('retired minus-2000 bonus no longer overrides the common AT rules',()=>{
 assert.equal(a.lossRewardControl.enabled,false);
 for(const atLevel of [0,1,2,3,4,5])for(const [atHigh,chance]of [[false,a.extraZoneChance(1,'WEAK_NOVA',false,false)],[true,a.extraZoneChance(1,'WEAK_NOVA',false,true)]]){
  let wins=0;for(let i=0;i<1000;i++){const out=a.resolveAtRole({atLevel,atHigh,atHighLeft:10},'WEAK_NOVA',1,()=>(i+.5)/1000,-2000);if(out.fixed50?out.extraZone:out.zone)wins++;}
  assert.equal(wins,Math.ceil(1000*chance-.5));
 }
});
test('fixed-zone hit gate retains common AT rules before thinning the former amount draw',()=>{
 for(const treatment of [1,2,3,4,5])for(const [role,rule]of Object.entries(a.atRoleRules)){
  let wins=0;for(let i=0;i<3000;i++){
   let first=true;
   const out=a.resolveAtRole({atLevel:treatment,atHigh:true,atHighLeft:10},role,6,()=>first?(first=false,(i+.5)/3000):0,-50000);
   assert.equal(out.direct,0);if(out.fixed50){wins++;assert.equal(out.zone,'sosuke');}
  }
  assert.equal(wins,Math.round(3000*Math.min(1,rule.hit*a.commonAtRulesFor(6).direct)));
 }
});
