import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({});
for(const f of ['nova-tuning.js','nova-decrement.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const n=c.NovaNormal,f=c.NovaFlow;
test('reset caps only A/B at 600 and preserves the saved entitlement without a redraw',()=>{
 for(let setting=1;setting<=6;setting++)for(const [i,mode]of n.modes.entries()){
  const row=n.modeSelection.initial[setting-1],roll=(row.slice(0,i).reduce((a,b)=>a+b,0)+row[i]/2)/100;let draws=0;
  const state=n.reset(()=>++draws===1?.5:roll,setting);
  assert.equal(draws,2);assert.equal(state.mode,mode);assert.equal(state.morningCeiling,true);
  const saved=n.normalize(JSON.parse(JSON.stringify({...state,games:150})));
  assert.equal(saved.games,150);assert.equal(saved.mode,mode);assert.equal(n.ceiling(saved),Math.min(n.ceilings[i],600));
 }
});
test('morning ceiling guarantees BIG at the boundary in normal play and commits a CZ win for its final reveal',()=>{
 for(const [i,mode]of n.modes.entries()){
  const ceiling=Math.min(n.ceilings[i],600),ceilingImpurity=5+(ceiling===400?2:ceiling===600?3:0),state=n.normalize({mode,games:ceiling-2,morningCeiling:true,fiftyChecked:true,modeChecked:10});
  const normalOne=n.spin(state,{phase:'normal'},1,{},()=>.99,'MISS');assert.equal(normalOne.internalBonus,null);assert.equal(normalOne.state.games,ceiling-1);
  const normalTwo=n.spin(normalOne.state,{phase:'normal'},1,{},()=>.99,'MISS');assert.equal(normalTwo.internalBonus.kind,'BIG');assert.equal(normalTwo.state.games,ceiling);assert(normalTwo.internalBonus.source.includes(ceiling+'G'));assert.equal(normalTwo.state.impurity,ceilingImpurity);
  let flow=f.enterCZ(false,{czChance:0,modeFake:true},()=>.99),one=n.spin(state,flow,1,{},()=>.99,'MISS');
  assert.equal(one.internalBonus,null);assert.equal(one.state.games,ceiling-1);flow=f.advance(one.czFlow);
  let two=n.spin(one.state,flow,1,{},()=>.99,'MISS');assert.equal(two.internalBonus,null);assert.equal(two.state.games,ceiling);assert.equal(two.czFlow.success,true);assert.equal(two.czFlow.winProbability,1);assert.equal(two.state.impurity,ceilingImpurity);
  let current=two.state;flow=f.advance(two.czFlow);
  while(flow.remaining>1){two=n.spin(current,flow,1,{},()=>.99,'MISS');assert.equal(two.internalBonus,null);assert.equal(two.czFlow.success,true);assert.equal(two.state.impurity,ceilingImpurity);current=two.state;flow=f.advance(two.czFlow);}
  const reveal=n.spin(current,flow,1,{},()=>.99,'MISS');assert.equal(reveal.internalBonus.kind,'BIG');assert(reveal.internalBonus.source.includes(ceiling+'G'));assert.equal(reveal.state.impurity,ceilingImpurity);
 }
});
test('first BB clears morning ceiling even if it fails to enter AT; AT return also clears it',()=>{
 for(const [i,mode]of n.modes.entries()){
  const state=n.normalize({mode,games:150,morningCeiling:true});
  const bb=n.afterBonus(state,()=>0,1);assert.equal(bb.morningCeiling,false);assert.equal(n.ceiling(bb),n.ceilings[i]);
  assert.equal(n.bonusEnd(bb,'BIG',{phase:'normal'}).morningCeiling,false);
  const ongoing=n.afterArt(state,{phase:'art'},{phase:'art'},{setting:1},()=>{throw Error('unexpected redraw');});assert.equal(ongoing.morningCeiling,true);
  const end=n.afterArt(state,{phase:'art'},{phase:'normal'},{setting:1},()=>0);assert.equal(end.morningCeiling,false);assert.equal(end.mode,'A');assert.equal(n.ceiling(end),800);
 }
});
test('ordinary saved games without morning entitlement retain all mode ceilings',()=>{
 for(const [i,mode]of n.modes.entries())for(const value of [{mode,games:650},{mode,games:650,morningCeiling:false}]){
  const saved=n.normalize(JSON.parse(JSON.stringify(value)));assert.equal(saved.morningCeiling,false);assert.equal(n.ceiling(saved),n.ceilings[i]);assert.equal(saved.games,650);
 }
});
