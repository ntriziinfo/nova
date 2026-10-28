import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const copy=value=>JSON.parse(JSON.stringify(value));
function harness(saved){
 const c=vm.createContext({crypto:globalThis.crypto,A_TYPE_MODE:true,settings:{setting:6},
  stats:saved?.stats||{totalFee:3000,totalPaid:5300,slumpHigh:2300},
  normalState:saved?.normalState||{},session:saved?.session||{paid:0,active:false}});
 for(const f of ['nova-tuning.js','nova-art.js','nova-progress.js','nova-decrement.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
 for(const name of ['syncNovaProgress','currentProfit','currentGameProfit','completeTrialProfit','settleBellNavigationPenalty','prepareManualRareOutcome','atCheckpointStatus','aTypeBonusNet','aTypeBonusRemainingNet','isATypeBonusActive','isATypeBonusComplete','willCompleteATypeBonusWithSpin'])vm.runInContext(fn(name),c);
 c.aTypeBonusTarget=()=>c.NovaArt.bonusTarget();c.syncNovaProgress();return c;
}
function settledBell(c,role,missed,upper=false){
 c.stats.totalFee+=3;
 const flow=c.NovaArt.restoreBetCost(c.normalState.flow||{...c.NovaArt.enter({setting:6},()=>.99),remaining:'500',researchUpper:upper},3);
 const out=c.NovaArt.step(flow,{setting:6,netPt:c.currentGameProfit(),checkpointQuiet:true,checkpointNext:c.NovaProgress.snapshot().next},()=>.99,role);
 const spin={result:role,stopped:[true,true,true],bellNaviOrder:[2,1,0],auditPressOrder:missed?[0,1,2]:[2,1,0],
  resolved:{reward:c.NovaArt.cashPayout(role),flowBefore:flow,flowAfter:out.flow,atOutcome:out.atOutcome}};
 c.prepareManualRareOutcome(spin);c.settleBellNavigationPenalty(spin.resolved);
 c.stats.totalPaid+=spin.resolved.reward;c.normalState.flow=out.flow;c.NovaProgress.observeNet(c.currentGameProfit());return spin;
}

test('navigation miss advances the same AT quota and checkpoint but permanently loses 8/15 cash pt',()=>{
 for(const role of ['BELL','BELL15'])for(const upper of [false,true]){
  const good=harness(),bad=harness(),paid=good.NovaArt.cashPayout(role);
  const a=settledBell(good,role,false,upper),b=settledBell(bad,role,true,upper);
  assert.deepEqual(copy(b.resolved.flowAfter),copy(a.resolved.flowAfter));
  assert.equal(b.resolved.reward,0);assert.equal(good.currentProfit()-bad.currentProfit(),paid);
  assert.equal(bad.currentGameProfit(),good.currentGameProfit());
  assert.equal(bad.atCheckpointStatus(bad.normalState.flow,bad.NovaProgress.snapshot(),bad.currentGameProfit()).left,100-(paid-3));
  assert.equal(bad.completeTrialProfit(),2300-3); // Completion/settlement still use real cash.
  assert.equal(bad.normalState.flow.remaining,String(500-(paid-3)));
  bad.settleBellNavigationPenalty(b.resolved);assert.equal(bad.normalState.novaProgress.bellNaviForfeitedPt,paid);
 }
});

test('repeated missed bells still earn the checkpoint and consume carry, even below the cash threshold',()=>{
 const good=harness(),bad=harness();
 for(let n=0;n<9;n++){settledBell(good,'BELL15',false);settledBell(bad,'BELL15',true);}
 assert.equal(good.currentProfit(),2408);assert.equal(bad.currentProfit(),2273);
 assert.equal(bad.NovaProgress.snapshot().pending,1);assert.equal(bad.NovaProgress.snapshot().next,4800);
 const before=bad.NovaProgress.beforeBet(bad.normalState.flow,{setting:6},bad.currentGameProfit());
 const out=bad.NovaArt.step(before,{setting:6,netPt:bad.currentGameProfit()},()=>.99);
 assert.equal(out.researchChallenge.started,true);assert.equal(out.researchChallenge.source,'threshold');
 assert.equal(bad.NovaProgress.snapshot().started,1);assert.equal(out.flow.remaining,'0');
 assert.equal(bad.currentProfit(),2273);
});

test('reload preserves a pending penalty and a settled penalty exactly once; reset removes the offset',()=>{
 const c=harness(),spin={result:'BELL15',grid:Array.from({length:3},()=>['a','b','c']),stopped:[true,true,true],bellNaviOrder:[2,1,0],auditPressOrder:[0,1,2],resolved:{reward:15}};
 c.prepareManualRareOutcome(spin);
 const saved=()=>copy({stats:c.stats,normalState:c.normalState,session:c.session});
 const reload=harness(saved()),pending=reload.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),{BELL15:{}});
 reload.prepareManualRareOutcome(pending);reload.settleBellNavigationPenalty(pending.resolved);
 const settled=harness(copy({stats:reload.stats,normalState:reload.normalState,session:reload.session}));
 settled.settleBellNavigationPenalty(copy(pending.resolved));assert.equal(settled.currentGameProfit(),2315);assert.equal(settled.currentProfit(),2300);
 settled.normalState={};settled.syncNovaProgress();assert.equal(settled.currentGameProfit(),2300);
});

test('bonus bells consume their capped quota on a miss, without extending BB or crediting its result',()=>{
 const c=harness();c.session={active:true,phase:'a_type_bonus',bonusKind:'BIG',paid:40,bonusArtSets:1};
 for(const expected of [8,2]){
  const reward=c.NovaArt.bonusPayout(c.session,'BELL');assert.equal(reward,expected);
  const spin={result:'BELL',stopped:[true,true,true],bellNaviOrder:[2,1,0],auditPressOrder:[0,1,2],aTypeBonusActiveAtStart:true,resolved:{reward,aTypeBonusGame:true}};
  c.prepareManualRareOutcome(spin);assert.equal(c.willCompleteATypeBonusWithSpin(spin),expected===2);
  c.settleBellNavigationPenalty(spin.resolved);Object.assign(c.session,c.NovaArt.advanceBonus(c.session,false,spin.resolved.reward));
 }
 assert.equal(c.aTypeBonusRemainingNet(),0);assert.equal(c.isATypeBonusComplete(),true);
 assert.equal(c.aTypeBonusNet(),40);assert.equal(c.NovaArt.bonusPayout(c.session,'BELL'),0);
 const restored=harness(copy({stats:c.stats,normalState:c.normalState,session:c.session}));assert.equal(restored.aTypeBonusRemainingNet(),0);assert.equal(restored.isATypeBonusComplete(),true);
});

test('correct navigation, un-navigated bells, and rare misses do not create internal bell credit',()=>{
 for(const role of ['BELL','BELL15','WEAK_SUICA']){
  const c=harness();const spin={result:role,stopped:[true,true,true],auditPressOrder:[0,1,2],rareRoleMissed:role==='WEAK_SUICA',resolved:{reward:8}};
  c.prepareManualRareOutcome(spin);c.settleBellNavigationPenalty(spin.resolved);assert.equal(c.currentGameProfit(),c.currentProfit());
 }
});
