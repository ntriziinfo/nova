import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(){
 const context=vm.createContext({});
 for(const file of ['nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 return context;
}
const {NovaFlow:f,NovaNormal:n}=load();
const sequence=(...values)=>()=>values.shift()??.999999;

test('new sourced CZs are fixed to 15G and preserve source/rule data across reload',()=>{
 for(let setting=1;setting<=6;setting++)for(const source of ['rare','game','background','debug','ceiling']){
  const state=f.enterCZ(false,f.forSetting({},setting),()=>.99,source);
  assert.equal(state.ruleVersion,2);assert.equal(state.source,source);assert.equal(state.setting,setting);
  assert.equal(state.remaining,15);assert.equal(state.totalGames,15);
  assert.deepEqual(f.normalize(JSON.parse(JSON.stringify(state))),state);
 }
 const legacy=f.enterCZ(false,undefined,()=>.99);
 assert.equal(legacy.ruleVersion,undefined);assert.equal(legacy.remaining,20);
 assert.equal(f.normalize({...legacy,remaining:17}).ruleVersion,undefined);
});

test('rare-entry per-game chances exactly reproduce the approved fifteen-game targets',()=>{
 for(let setting=1;setting<=6;setting++){
  const state=f.enterCZ(false,f.forSetting({},setting),()=>.5,'rare');
  assert.equal(state.success,false);assert.equal(state.targetProbability,f.rareTargets[setting-1]);
  assert.ok(Math.abs(1-(1-state.perGameChance)**15-state.targetProbability)<1e-12);
  assert.equal(f.rewrite(state,'MISS',{},()=>state.perGameChance).success,false);
  assert.equal(f.rewrite(state,'MISS',{},()=>state.perGameChance-1e-12).success,true);
 }
});

test('a second CZ lottery hit seals AT direct and one weighted non-Sosuke zone through reload',()=>{
 let state=f.enterCZ(false,f.forSetting({},1),()=>.5,'rare');
 state=f.rewrite(state,'MISS',{},()=>0);assert.equal(state.success,true);assert.equal(state.direct,false);
 state=f.rewrite(state,'REPLAY',{},sequence(0,.5));
 assert.equal(state.success,true);assert.equal(state.direct,true);assert.notEqual(state.directZone,'sosuke');assert.ok(state.directZone);
 const saved=f.normalize(JSON.parse(JSON.stringify(state)));
 assert.equal(saved.direct,true);assert.equal(saved.directZone,state.directZone);
 assert.equal(f.rewrite(saved,'STRONG_NOVA',{},()=>{throw Error('sealed direct must not redraw')}).directZone,state.directZone);
});

test('game-entry CZ keeps its base draw and uses the approved rare-role promotion ladder',()=>{
 for(let setting=1;setting<=6;setting++){
  const cfg=f.forSetting({},setting),rate=f.gameRewriteRates[setting-1];
  let loss=f.enterCZ(false,cfg,sequence(cfg.czChance,.5,.5),'game');
  assert.equal(loss.success,false);assert.equal(f.rewrite(loss,'WEAK_SUICA',{},()=>rate).success,false);
  loss=f.rewrite(loss,'WEAK_NOVA',{},()=>rate-1e-12);assert.equal(loss.success,true);assert.equal(loss.direct,false);
  const direct=f.rewrite(loss,'STRONG_NOVA',{},sequence(.999,.5));
  assert.equal(direct.direct,true);assert.notEqual(direct.directZone,'sosuke');
  const baseWin=f.enterCZ(false,cfg,sequence(cfg.czChance-1e-12,.5,.5),'game');assert.equal(baseWin.success,true);
 }
});

test('fake CZ never promotes, while ceiling CZ begins with its guaranteed BB rung',()=>{
 const cfg=f.forSetting({},3),fake=f.enterCZ(false,{...cfg,modeFake:true},()=>0,'game');
 assert.equal(fake.success,false);assert.equal(fake.perGameChance,0);
 assert.equal(f.rewrite(fake,'STRONG_NOVA',{},()=>0).success,false);
 const ceiling=f.enterCZ(true,cfg,()=>.99,'ceiling');
 assert.equal(ceiling.success,true);assert.equal(ceiling.targetProbability,cfg.strongChance);
});

test('strong rare keeps low-state effective rate and high-state final BB guarantee without automatic direct',()=>{
 for(let setting=1;setting<=6;setting++){
  const low=f.enterCZ(true,{...f.forSetting({},setting),strongChance:.85},()=>.5,'rare');
  assert.equal(low.targetProbability,f.strongRareTargets[setting-1]);
  assert.ok(Math.abs(1-(1-low.perGameChance)**15-low.targetProbability)<1e-12);
  const high=f.enterCZ(true,{...f.forSetting({},setting),strongChance:1},()=>.5,'rare');
  assert.equal(high.finalGuarantee,true);assert.equal(high.success,false);assert.equal(high.direct,false);
  const final=f.rewrite({...high,remaining:1},'MISS',{},()=>.999);
  assert.equal(final.success,true);assert.equal(final.direct,false);assert.equal(final.winProbability,1);
 }
});

test('v2 CZ never ends on early full lamps and terminal direct remains additive to BIG',()=>{
 let flow=f.enterCZ(false,f.forSetting({},1),()=>.9,'rare');
 flow={...flow,remaining:10,success:true,winProbability:1};
 let token=n.spin({games:120},flow,1,{},()=>.999,'MISS');
 assert.equal(token.internalBonus,null);assert.equal(token.direct,false);
 flow={...flow,remaining:1,direct:true,directZone:'toto'};
 token=n.spin({games:120},flow,1,{},()=>.999,'MISS');
 assert.equal(token.internalBonus.kind,'BIG');assert.equal(token.internalBonus.direct,true);
 assert.equal(token.internalBonus.directZone,'toto');assert.equal(token.direct,true);
});
