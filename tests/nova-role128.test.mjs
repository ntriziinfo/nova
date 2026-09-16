import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
loadModel();const n=NovaNormal,a=NovaArt,f=NovaFlow;
const seq=(...values)=>()=>values.shift()??.99999;
const spin=(state,rng=()=>.99999,flow={phase:'normal'},role='BELL')=>n.spin(state,flow,6,{},rng,role);

test('old modes and fake hints retire without losing counters, impurity or a won prelude',()=>{
 for(const mode of ['通常A','通常B','通常C','チャンス','天国準備','天国','天国A','天国B','特殊']){
  const state=n.normalize({mode,games:321,impurity:75,morningCeiling:true,level:'high',highLeft:8,prelude:{kind:'fake',left:4}});
  assert.equal(state.mode,'通常');assert.equal(state.games,321);assert.equal(state.impurity,75);assert.equal(state.highLeft,8);
  assert.equal(state.morningCeiling,false);assert.equal(state.prelude,null);assert.equal(n.ceiling(state),800);
  assert.deepEqual(n.normalize(JSON.parse(JSON.stringify(state))),state);
 }
 const saved=n.normalize({mode:'通常B',games:300,prelude:{kind:'cz',left:1}});
 assert.equal(saved.prelude.presentation,'legacy');assert.equal(spin(saved).entry,'CZ');
 // A reserved win takes priority even if a legacy counter has passed the new ceiling.
 assert.equal(spin({...saved,games:900}).entry,'CZ');
});

test('game counts, reset, and AT exit cannot select a zone or a heaven mode',()=>{
 for(const role of ['MISS','BELL','REPLAY'])for(let games=0;games<799;games++){
  const token=spin({games,mode:'天国'},()=>0,{phase:'normal'},role);
  assert.equal(token.entry,'');assert.equal(token.internalBonus,null);assert.equal(token.state.prelude,null);
 }
 assert.equal(n.reset(()=>.5,6).mode,'通常');assert.equal(n.ceiling(n.reset(()=>.5,6)),800);
 for(const dryAtEnd of [false,true]){
  const ended=n.afterArt({mode:'天国',games:100,impurity:20,level:'high',highLeft:10},{phase:'art'},{phase:'normal',dryAtEnd},{},()=>{throw Error('Mode RNG must not run');});
  assert.equal(ended.games,0);assert.equal(ended.mode,'通常');assert.equal(ended.impurity,dryAtEnd?22:20);assert.equal(ended.level,'low');
 }
 const after=n.afterBonus({mode:'天国準備',impurity:55},()=>{throw Error('Mode RNG must not run');});
 assert.equal(after.mode,'通常');assert.equal(after.impurity,55);assert.equal(after.games,0);
});

test('all rare roles draw CZ at their thresholds, using the state before the role',()=>{
 for(let setting=1;setting<=6;setting++)for(const level of ['low','high'])for(const role of Object.keys(n.rare)){
  const rate=n.roleCzRate({level},role,setting),state={level,highLeft:10};assert(rate>0&&rate<=1);
  const run=roll=>n.spin(state,{phase:'normal'},setting,{},()=>roll,role);
  assert.equal(run(Math.max(0,rate-1e-10)).entry,role==='STRONG_NOVA'?'STRONG_CZ':'CZ');
  if(rate<1)assert.equal(run(rate).entry,'');
  if(role==='STRONG_NOVA')assert.equal(run(.99999).czOptions.strongChance,level==='high'?1:.85);
 }
 const rate=n.roleCzRate({},'STRONG_SUICA',6);
 const promoted=n.spin({}, {phase:'normal'},6,{},seq(0,rate),'STRONG_SUICA');
 assert.equal(promoted.state.level,'high');assert.equal(promoted.entry,'');
 assert(n.roleCzRate({level:'high'},'WEAK_SUICA',6)>n.roleCzRate({},'WEAK_SUICA',6));
});

test('common ceiling awards once after the prelude and respects an active CZ',()=>{
 for(const [roll,bonus] of [[.49,true],[.5,false]]){
  let t=spin({games:799,impurity:0},seq(roll,0));
  assert.equal(t.internalBonus,null);assert.equal(t.state.impurity,10);assert.equal(t.state.prelude.originG,800);
  for(let i=0;i<3;i++)t=spin(n.normalize(JSON.parse(JSON.stringify(t.state))));
  if(bonus){assert.equal(t.internalBonus.kind,'BIG');assert.match(t.internalBonus.source,/800G/);}
  else{assert.equal(t.entry,'STRONG_CZ');assert.equal(t.czOptions.strongChance,1);}
  assert.equal(t.state.ceilingHandled,true);assert.equal(spin(t.state).state.impurity,10);
 }
 const cz={phase:'cz',remaining:2,totalGames:15,success:false,winProbability:.4};
 const held=spin({games:799},seq(.9,0),cz);assert.equal(held.entry,'');assert.equal(held.state.prelude.kind,'ceilingCz');
 const won=spin({games:799},seq(.9,0),{...cz,remaining:1,success:true});assert(won.internalBonus);
 assert.equal(n.afterBonus(won.state).prelude,null);
});

test('explicit CZ debug odds and guarantees are not overwritten by setting tuning',()=>{
 for(let setting=1;setting<=6;setting++){
  assert.equal(f.forSetting({czChance:1,strongChance:1},setting).czChance,1);
  assert.equal(f.forSetting({czChance:.2,strongChance:.85},setting).strongChance,.85);
  const p=n.roleProbabilities(setting);
  assert(Object.values(p).every(p=>p>=0&&p<=1));assert(Math.abs(Object.values(p).reduce((a,b)=>a+b,0)-1)<1e-12);
  assert(Math.abs(50/(3*(1-p.REPLAY)-Object.entries(p).reduce((sum,[role,p])=>sum+p*n.pay(role),0))-33.5)<1e-10);
 }
 assert.equal(a.initialHitBoost,undefined);
});
