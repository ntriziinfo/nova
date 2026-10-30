import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';

loadModel();
const a=NovaArt;
const fresh=(sets=0)=>({
  bonusKind:'BIG',paid:0,bonusArtSets:sets,
  bonusExtraStockVersion:a.bonusExtraStockRules.version,
  bonusExtraStockReady:false,bonusExtraStockTarget:0,bonusExtraStockRemaining:0
});

test('BB-level extra stock draw has exact 87/10/3 boundaries',()=>{
  assert.deepEqual([...a.bonusExtraStockRules.weights],[.87,.10,.03]);
  for(const [roll,count] of [
    [0,0],[.869999999999,0],[.87,1],[.969999999999,1],[.97,2],[.999999999999,2]
  ])assert.equal(a.drawBonusExtraStockCount(()=>roll),count,`roll=${roll}`);
});

test('saved plans sanitize current data and migrate old secured BBs without a release-only redraw',()=>{
  const version=a.bonusExtraStockRules.version;
  assert.deepEqual(a.restoreBonusExtraStockPlan({bonusExtraStockVersion:version,bonusExtraStockReady:true,bonusExtraStockTarget:99,bonusExtraStockRemaining:88},true),{
    bonusExtraStockVersion:version,bonusExtraStockReady:true,bonusExtraStockTarget:2,bonusExtraStockRemaining:2
  });
  assert.deepEqual(a.restoreBonusExtraStockPlan({bonusExtraStockVersion:version,bonusExtraStockReady:false,bonusExtraStockTarget:2,bonusExtraStockRemaining:2},false),{
    bonusExtraStockVersion:version,bonusExtraStockReady:false,bonusExtraStockTarget:0,bonusExtraStockRemaining:0
  });
  assert.deepEqual(a.restoreBonusExtraStockPlan({bonusArtSets:1},true),{
    bonusExtraStockVersion:version,bonusExtraStockReady:true,bonusExtraStockTarget:0,bonusExtraStockRemaining:0
  });
  assert.deepEqual(a.restoreBonusExtraStockPlan({bonusArtSets:0},false),{
    bonusExtraStockVersion:version,bonusExtraStockReady:false,bonusExtraStockTarget:0,bonusExtraStockRemaining:0
  });
});

test('first AT odds remain 52/80 in every setting and secured natural NEBULA is suppressed',()=>{
  for(let setting=1;setting<=6;setting++)for(const tier of ['normal','upper']){
    const entry=a.bonusRoleProbabilities(setting,tier,false);
    const secured=a.bonusRoleProbabilities(setting,tier,true);
    assert.ok(Math.abs(1-(entry.BELL/(entry.BELL+entry.NEBULA))**7-a.bonusRules[tier].atChance)<1e-12);
    assert.equal(secured.NEBULA,0);
    assert.equal(secured.BELL,entry.BELL);
    assert.equal(secured.REPLAY,entry.REPLAY);
    assert.ok(Math.abs(Object.values(secured).reduce((sum,p)=>sum+p,0)-1)<1e-12);
  }
});

test('the first successful NEBULA grants AT before sealing and does not consume the extra plan',()=>{
  let state=fresh(0);
  const first=a.drawBonusWithPlan(state,{phase:'normal'},()=>0,3,'normal');
  assert.equal(first.role,'NEBULA');assert.equal(first.extraOffer,false);
  state={...state,...first.state,...a.advanceBonus(state,true,0,first.extraOffer)};
  assert.equal(state.bonusArtSets,1);assert.equal(state.bonusExtraStockRemaining,0);
  state={...state,...a.ensureBonusExtraStockPlan(state,()=>.9)};
  assert.equal(state.bonusExtraStockTarget,1);assert.equal(state.bonusExtraStockRemaining,1);
});

function runSecuredPlan(targetRoll,setting,tier,flow={phase:'normal'},startingSets=1){
  const rolls=[targetRoll,0,0,0,0,0];let index=0;
  const rng=()=>rolls[index++]??0;
  let state=fresh(startingSets),offers=0;
  for(let spin=0;spin<4;spin++){
    const draw=a.drawBonusWithPlan(state,flow,rng,setting,tier);
    state={...state,...draw.state};
    if(draw.extraOffer){offers++;state={...state,...a.advanceBonus(state,true,0,true)};continue;}
    assert.notEqual(draw.role,'NEBULA','natural third extra must stay suppressed');
    break;
  }
  return {state,offers};
}

test('secured and guaranteed BBs offer exactly the sealed 0/1/2 extras, independent of setting and tier',()=>{
  for(let setting=1;setting<=6;setting++)for(const tier of ['normal','upper'])for(const [roll,target] of [[0,0],[.9,1],[.98,2]]){
    const guaranteed=runSecuredPlan(roll,setting,tier,{phase:'normal'},1);
    assert.equal(guaranteed.state.bonusExtraStockTarget,target);
    assert.equal(guaranteed.state.bonusExtraStockRemaining,0);
    assert.equal(guaranteed.offers,target);
    assert.equal(guaranteed.state.bonusArtSets,1+target);

    const existingAt=runSecuredPlan(roll,setting,tier,{phase:'art'},0);
    assert.equal(existingAt.state.bonusExtraStockTarget,target);
    assert.equal(existingAt.offers,target);
    assert.equal(existingAt.state.bonusArtSets,target);
  }
});

test('an offered extra is consumed once even when the player misses the lineup',()=>{
  const state={...fresh(1),bonusExtraStockReady:true,bonusExtraStockTarget:1,bonusExtraStockRemaining:1};
  const missed={...state,...a.advanceBonus(state,false,0,true)};
  assert.equal(missed.bonusArtSets,1);assert.equal(missed.bonusExtraStockRemaining,0);
  const won={...state,...a.advanceBonus(state,true,0,true)};
  assert.equal(won.bonusArtSets,2);assert.equal(won.bonusExtraStockRemaining,0);
  const firstAt={...state,...a.advanceBonus(state,true,0,false)};
  assert.equal(firstAt.bonusArtSets,2);assert.equal(firstAt.bonusExtraStockRemaining,1);
});

test('secured-state detection includes saved wins and every active AT phase',()=>{
  assert.equal(a.bonusStockEligible({bonusArtSets:0},{phase:'normal'}),false);
  assert.equal(a.bonusStockEligible({bonusArtSets:1},{phase:'normal'}),true);
  for(const flow of [a.enter({},()=>.5),a.enterInitial({},()=>.5),a.beginComeback(a.enter({},()=>.5))])assert.equal(a.bonusStockEligible({bonusArtSets:0},flow),true);
});
