import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';vm.runInThisContext(fs.readFileSync('nova-art.js','utf8'));const a=NovaArt;
test('retired minus-2000 bonus no longer overrides the chosen AT treatment',()=>{
 assert.equal(a.lossRewardControl.enabled,false);
 for(const [atLevel,low,high] of [[1,.3,.9],[2,.425,1],[3,.55,1],[4,.675,1],[5,.8,1],[0,.5,1]])for(const [atHigh,chance]of [[false,low],[true,high]]){
  let wins=0;for(let i=0;i<1000;i++)if(a.resolveAtRole({atLevel,atHigh,atHighLeft:10},'WEAK_NOVA',1,()=>(i+.5)/1000,-2000).zone)wins++;
  assert.equal(wins,Math.round(1000*chance));
 }
});
test('direct win rates follow the AT treatment and amounts retain their tables',()=>{
 for(const treatment of [1,2,3,4,5])for(const [role,rule]of Object.entries(a.atRoleRules)){
  let wins=0;for(let i=0;i<3000;i++){
   const out=a.resolveAtRole({atLevel:treatment,atHigh:true,atHighLeft:10},role,6,()=>(i+.5)/3000,-50000);
   if(out.direct){wins++;assert.ok(rule.values.includes(out.direct));}
  }
  assert.equal(wins,Math.round(3000*Math.min(1,rule.hit*a.atLevelRules.levels[treatment].direct)));
 }
});
