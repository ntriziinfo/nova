import test from 'node:test';import assert from 'node:assert/strict';import {loadModel} from '../scripts/zone-v2-model.mjs';
test('weak roles keep a common fifteen-percent response and setting-specific quality while strong-role awards remain independent',()=>{
 loadModel();const a=NovaArt;assert.deepEqual(a.weakAtAwardScales,[1,1,1,1,1,1]);
 const sequence=(...values)=>()=>values.shift()??.999999;
 for(let setting=1;setting<=6;setting++)for(const upper of [false,true]){
  const profile=NovaTuning.balanceProfile(setting),weights=a.weakQualityWeights(setting,upper);
  assert.equal(profile.weakResponse,.15);
  assert.equal(a.weakAtResponseChance(setting,upper,false),profile.weakResponse);
  assert(Math.abs(a.weakAtResponseChance(setting,upper,true)-.225)<1e-12);
  assert.equal(a.drawWeakAtReward(setting,{upper},()=>profile.weakResponse).quality,-1);
  const qualityOne=(weights[0]+weights[1]/2)/weights.reduce((sum,value)=>sum+value,0);
  const kept=a.drawWeakAtReward(setting,{upper},sequence(0,qualityOne));
  assert.equal(kept.direct,upper?50:0);assert.equal(kept.zone,upper?'':'sosuke');assert.equal(kept.fixed50,!upper);
 }
 for(let setting=1;setting<=6;setting++){const draws=[.1,0];const out=a.resolveAtRole({},'STRONG_NOVA',setting,()=>{assert(draws.length);return draws.shift();});assert.equal(out.fixed50,true);assert.equal(draws.length,0);}
});
test('game-entry CZ success follows the approved odd/even profile and preserves explicit overrides',()=>{
 loadModel();const f=NovaFlow;
 for(let setting=1;setting<=6;setting++){
  const profile=NovaTuning.balanceProfile(setting),cfg=f.forSetting({},setting);
  assert.equal(cfg.czChance,profile.gameCzSuccess);assert.equal(cfg.strongChance,profile.strongCzSuccess);
  assert.equal(f.enterCZ(false,cfg,()=>profile.gameCzSuccess-1e-9,'game').success,true);
  assert.equal(f.enterCZ(false,cfg,()=>profile.gameCzSuccess,'game').success,false);
 }
 assert.equal(f.forSetting({czChance:0},5).czChance,0);assert.equal(f.forSetting({czChance:1},5).czChance,1);
});

test('rare-entry CZ targets and strong targets are wired to the same setting profile',()=>{
 loadModel();const f=NovaFlow;
 for(let setting=1;setting<=6;setting++){
  const profile=NovaTuning.balanceProfile(setting),cfg=f.forSetting({},setting),rare=f.enterCZ(false,cfg,()=>.999999,'rare'),strong=f.enterCZ(true,cfg,()=>.999999,'rare');
  assert.equal(f.rareTargets[setting-1],profile.rareCzSuccess);assert.equal(f.strongRareTargets[setting-1],profile.strongRareSuccess);
  assert.equal(rare.targetProbability,profile.rareCzSuccess);assert.equal(strong.targetProbability,profile.strongRareSuccess);
  assert.equal(rare.remaining,15);assert.equal(strong.remaining,15);
 }
});
