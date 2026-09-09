import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const n=NovaNormal,seq=(...xs)=>()=>xs.length>1?xs.shift():xs[0];
const spin=(s,rng=()=>.99,flow={phase:'normal'})=>n.spin(s,flow,1,{},rng,'BELL');
test('seven modes and reset-only special, legacy heavens migrate',()=>{
 assert.deepEqual(n.ceilings,[600,600,500,600,300,100,200]);assert.equal(n.reset(()=>.5).mode,'特殊');
 for(const mode of n.modes)for(let i=0;i<100;i++)assert.notEqual(n.afterBonus({mode},()=>i/100).mode,'特殊');
 assert.equal(n.normalize({mode:'天国B'}).mode,'天国');
 for(const row of n.transitions)assert.equal(row.reduce((s,v)=>s+v,0),100);
});
test('mode priority zones and no high multiplier',()=>{
 assert.equal(n.zoneRate({mode:'通常A',games:199}),.55);assert.equal(n.zoneRate({mode:'通常B',games:499}),.8);
 for(const mode of ['通常A','通常B']){assert.equal(n.zoneRate({mode,games:49}),0);assert.equal(n.advance({mode,games:199},'WEAK_SUICA',{phase:'normal'},{},()=>.075).level,'low');}
});
test('real and fake preludes survive reload and award only real CZ',()=>{
 for(const hit of [true,false]){
  let t=spin({mode:'通常A',games:199},hit?seq(0,0):seq(.99,0,0));assert.equal(t.state.prelude.kind,hit?'cz':'fake');
  for(let i=0;i<3;i++)t=spin(n.normalize(JSON.parse(JSON.stringify(t.state))));
  assert.equal(t.entry,hit?'CZ':'');assert.equal(t.state.prelude,null);assert.equal(t.state.impurity,0);
 }
});
test('ceiling awards once after alpha, bonus and guaranteed CZ equally selectable',()=>{
 for(const [roll,bonus]of [[.49,true],[.5,false]]){
  let t=spin({games:599,impurity:0},seq(roll,0));assert.equal(t.internalBonus,null);assert.equal(t.state.impurity,10);
  for(let i=0;i<3;i++)t=spin(t.state);
  if(bonus)assert.equal(t.internalBonus.kind,'BIG');else {assert.equal(t.entry,'STRONG_CZ');assert.equal(t.czOptions.strongChance,1);}
  assert.equal(t.state.impurity,10);assert.equal(t.state.ceilingHandled,true);
 }
});
test('CZ does not lose its outcome when ceiling is reached and rare hit clears ordinary prelude',()=>{
 const t=spin({games:599},seq(.9,0),{phase:'cz',remaining:2,totalGames:15,success:false,winProbability:.4});
 assert.equal(t.czFlow.phase,'cz');assert.equal(t.state.prelude.kind,'ceilingCz');assert.equal(t.entry,'');
 const rare=n.spin({prelude:{kind:'fake',left:4}},{phase:'normal'},1,{},()=>0,'STRONG_NOVA');assert.equal(rare.entry,'STRONG_CZ');assert.equal(rare.state.prelude,null);
});
