import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({A_TYPE_MODE:true});
for(const file of ['nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const {NovaNormal:n,NovaArt:a,NovaSpinResume:resume}=ctx;
const source=fs.readFileSync('nova-game.js','utf8');
vm.runInContext(source.match(/  function normalRewardFor\([^]*?\n  }/)[0],ctx);
const flow=(phase,extra={})=>({phase,totalGames:20,remaining:20,success:false,winProbability:.55,lampRoll:.3,rainbowRoll:.8,...extra});

test('CZ watermelon displays and pays replay while its last-game rare-role rewrite still awards BIG',()=>{
 for(const phase of ['cz','strong_cz'])for(const forced of ['WEAK_SUICA','STRONG_SUICA']){
  const token=n.spin({games:120},flow(phase,{remaining:1}),1,{},()=>0,forced);
  assert.equal(token.result,'REPLAY');assert.equal(token.internalResult,'WEAK_SUICA');
  assert.equal(token.czFlow.success,true);assert.ok(token.internalBonus);assert.equal(token.state.impurity,0);
  assert.equal(n.pay(token.result)+a.replayRefund(token.result),3);
  assert.equal(ctx.normalRewardFor(token.result),3);
  const replay=n.spin({games:120},flow(phase,{remaining:1}),1,{},()=>0,'REPLAY');
  assert.equal(replay.internalBonus,null);assert.equal(replay.czFlow.success,false);
 }
});

test('CZ losses, fake CZ, first 100G and ceiling spins also pay replay without changing the internal success rules',()=>{
 for(const phase of ['cz','strong_cz']){
  const lost=n.spin({games:120},flow(phase,{remaining:1}),1,{},()=>.999,'WEAK_SUICA');
  assert.equal(lost.result,'REPLAY');assert.equal(lost.internalBonus,null);assert.equal(lost.state.impurity,1);
  const fake=n.spin({games:120},flow(phase,{modeFake:true}),1,{},()=>0,'WEAK_SUICA');
  assert.equal(fake.result,'REPLAY');assert.equal(fake.czFlow.success,false);
  const early=n.spin({games:60},flow(phase),1,{},()=>0,'WEAK_SUICA');
  assert.equal(early.result,'REPLAY');assert.equal(early.internalBonus,null);
  const ceiling=n.spin({games:799,mode:'A'},flow(phase),1,{},()=>.999,'WEAK_SUICA');
  assert.equal(ceiling.result,'REPLAY');assert.equal(ceiling.internalBonus,null);assert.equal(ceiling.czFlow.success,true);assert.equal(ceiling.state.impurity,5);
  const reveal=n.spin(ceiling.state,{...ceiling.czFlow,remaining:1},1,{},()=>.999,'WEAK_SUICA');
  assert.equal(reveal.result,'REPLAY');assert.match(reveal.internalBonus.source,/天井800G/);assert.equal(reveal.state.impurity,5);
 }
});

test('ordinary normal play, normal-to-CZ entry and other CZ roles retain their original role and cash',()=>{
 for(const games of [120,199]){
  const t=n.spin({games,mode:'A',modeChecked:1,fiftyChecked:true},{phase:'normal'},1,{},()=>.99,'WEAK_SUICA');
  assert.equal(t.result,'WEAK_SUICA');assert.equal(t.internalResult,undefined);assert.equal(n.pay(t.result),3);
 }
 for(const role of ['MISS','BELL','REPLAY','WEAK_NOVA','STRONG_NOVA']){
  const t=n.spin({games:120},flow('cz'),1,{},()=>.999,role);
  assert.equal(t.result,role);assert.equal(t.internalResult,undefined);
  if(['WEAK_NOVA','STRONG_NOVA'].includes(role)){assert.equal(n.pay(t.result),2);assert.equal(ctx.normalRewardFor(t.result),2);}
 }
});

test('rare sortie keeps the internal watermelon and saved replay spins retain the already drawn result and 3pt payment',()=>{
 let draws=0;
 const c=vm.createContext({A_TYPE_MODE:true,settings:{setting:3},currentGameProfit:()=>0,NovaProgress:{drawSortie:(s,role)=>{assert.equal(role,'WEAK_SUICA');draws++;return true;}}});
 vm.runInContext(source.match(/  function drawRareSortie\([^]*?\n  }/)[0],c);
 const resolved={internalResult:'WEAK_SUICA',reward:3,flowBefore:{phase:'cz'}};
 c.drawRareSortie('REPLAY',resolved);assert.equal(draws,1);assert.equal(resolved.sortieWon,true);
 const saved=resume.capture({result:'REPLAY',resolved,grid:Array.from({length:3},()=>['REPLAY','REPLAY','REPLAY']),stopped:[true,false,false]});
 const restored=resume.restore(saved,{REPLAY:{}});
 assert.equal(restored.result,'REPLAY');assert.equal(restored.resolved.internalResult,'WEAK_SUICA');
 assert.equal(restored.resolved.reward,3);assert.equal(restored.resolved.sortieWon,true);assert.equal(draws,1);
});

test('CZ replay disguise also retains the internal-role fake-sortie rate',()=>{
 const roles=[];
 const c=vm.createContext({A_TYPE_MODE:true,settings:{setting:2},currentGameProfit:()=>0,
  NovaProgress:{drawSortie:(_,role)=>{roles.push(role);return false;},sortieEligible:role=>{roles.push(role);return true;},sortieChance:(_,role)=>{roles.push(role);return .01;}},
  NovaStockEntry:{drawFake:(p,won)=>{assert.equal(p,.01);assert.equal(won,false);return true;}}
 });
 vm.runInContext(source.match(/  function drawRareSortie\([^]*?\n  }/)[0],c);
 const resolved={internalResult:'WEAK_SUICA'};c.drawRareSortie('REPLAY',resolved);
 assert.deepEqual(roles,['WEAK_SUICA','WEAK_SUICA','WEAK_SUICA']);assert.equal(resolved.sortieFakeWon,true);
});
