import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
loadModel();const n=NovaNormal,a=NovaArt,f=NovaFlow;
const seq=(...values)=>()=>values.shift()??.99999;
const spin=(state,rng=()=>.99999,flow={phase:'normal'},role='BELL')=>n.spin(state,flow,6,{},rng,role);

test('legacy modes migrate while valid heaven and saved CZ reservations survive',()=>{
 for(const mode of ['通常A','通常B','通常C','チャンス','天国準備','天国','天国A','天国B','特殊']){
  const state=n.normalize({mode,games:321,impurity:75,morningCeiling:true,level:'high',highLeft:8,prelude:{kind:'fake',left:4}});
  assert.equal(state.mode,mode==='天国'?'天国':'A');assert.equal(state.games,321);assert.equal(state.impurity,75);assert.equal(state.highLeft,8);
  assert.equal(state.morningCeiling,true);assert.equal(state.prelude,null);assert.equal(n.ceiling(state),mode==='天国'?200:600);
  assert.deepEqual(n.normalize(JSON.parse(JSON.stringify(state))),state);
 }
 const saved=n.normalize({mode:'通常B',games:300,modeChecked:3,fiftyChecked:true,prelude:{kind:'cz',left:1}});
 assert.equal(saved.prelude.presentation,'legacy');assert.equal(spin(saved).entry,'CZ');
 const ceiling=spin({...saved,games:900});assert.equal(ceiling.internalBonus.kind,'BIG');assert.equal(ceiling.state.prelude,null);
});

test('AT exit redraws heaven without changing impurity, and bonus cannot demote it',()=>{
 assert.equal(n.reset(()=>.5,6).mode,'A');assert.equal(n.ceiling(n.reset(()=>.5,6)),600);
 assert.equal(n.reset(()=>.6,6).mode,'B');assert.equal(n.ceiling(n.reset(()=>.6,6)),600);
 for(const dryAtEnd of [false,true]){
  const ended=n.afterArt({mode:'天国',games:100,impurity:20,level:'high',highLeft:10},{phase:'art'},{phase:'normal',dryAtEnd},{},()=>0);
  assert.equal(ended.games,0);assert.equal(ended.mode,'A');assert.equal(ended.impurity,dryAtEnd?22:20);assert.equal(ended.level,'low');
 }
 const after=n.afterBonus({mode:'天国',impurity:55},()=>0);
 assert.equal(after.mode,'天国');assert.equal(after.impurity,55);assert.equal(after.games,0);
});

test('all rare roles draw CZ at their thresholds, using the state before the role',()=>{
 for(let setting=1;setting<=6;setting++)for(const level of ['low','high'])for(const role of Object.keys(n.rare)){
  const rate=n.roleCzRate({level},role,setting),state={level,highLeft:10,games:120,modeChecked:1,fiftyChecked:true};assert(rate>0&&rate<=1);
  const run=roll=>n.spin(state,{phase:'normal'},setting,{},()=>roll,role);
  const hit=run(Math.max(0,rate-1e-10));assert.equal(hit.entry,'');assert.equal(hit.state.prelude.entry,role==='STRONG_NOVA'?'STRONG_CZ':'CZ');
  if(rate<1)assert.equal(run(rate).entry,'');
  if(role==='STRONG_NOVA')assert.equal(run(.99999).czOptions.strongChance,level==='high'?1:.85);
 }
 const rate=n.roleCzRate({},'WEAK_SUICA',6);
 const promoted=n.spin({games:120,modeChecked:1,fiftyChecked:true}, {phase:'normal'},6,{},seq(0,rate),'WEAK_SUICA');
 assert.equal(promoted.state.level,'high');assert.equal(promoted.entry,'');
 assert(n.roleCzRate({level:'high'},'WEAK_SUICA',6)>n.roleCzRate({},'WEAK_SUICA',6));
});

test('mode ceiling guarantees BIG during a CZ and resets after the bonus',()=>{
 const cz={phase:'cz',remaining:2,totalGames:15,success:false,winProbability:.4};
 for(const flow of [{phase:'normal'},cz,{...cz,remaining:1,success:true}]){
  const t=spin({mode:'A',games:799,impurity:0},seq(.9,0),flow);
  assert.equal(t.internalBonus.kind,'BIG');assert.match(t.internalBonus.source,/800G/);
  assert.equal(t.state.impurity,10);assert.equal(t.state.ceilingHandled,true);assert.equal(t.state.prelude,null);
  const fresh=n.afterBonus(t.state,()=>0);assert.equal(fresh.ceilingHandled,false);assert.equal(fresh.games,0);
  assert.equal(spin(fresh).internalBonus,null);
 }
});

test('explicit CZ debug odds and guarantees are not overwritten by setting tuning',()=>{
 for(let setting=1;setting<=6;setting++){
  assert.equal(f.forSetting({czChance:1,strongChance:1},setting).czChance,1);
  assert.equal(f.forSetting({czChance:.2,strongChance:.85},setting).strongChance,.85);
  const p=n.roleProbabilities(setting);
  assert(Object.values(p).every(p=>p>=0&&p<=1));assert(Math.abs(Object.values(p).reduce((a,b)=>a+b,0)-1)<1e-12);
  assert(Math.abs(50/(3*(1-p.REPLAY)-Object.entries(p).reduce((sum,[role,p])=>sum+p*n.pay(role),0))-JSON.parse(fs.readFileSync('tests/fixtures/nova-role-merge-approved.json')).sharedBases[setting-1])<1e-10);
 }
 assert.equal(a.initialHitBoost,undefined);
});
