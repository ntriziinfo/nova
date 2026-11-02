import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
vm.runInContext('Math.random=()=>{throw Error("game limit consumed a lottery draw");}',context);
vm.runInContext(fs.readFileSync('nova-play-limit.js','utf8'),context);
const limit=context.NovaPlayLimit;

test('normal play stops only after the 10,000th game has settled',()=>{
 let state=limit.observe(null,{totalSpins:9999});
 assert.equal(state.locked,false);
 state=limit.observe(state,{totalSpins:10000,unsettled:true});
 assert.equal(state.locked,false);assert.equal(state.reached,false);
 state=limit.observe(state,{totalSpins:10000});
 assert.equal(state.locked,true);assert.equal(state.stoppedAt,10000);
});

test('an AT at the limit continues until its authorized continuation finishes',()=>{
 let state=limit.observe(null,{totalSpins:10000,continuingAt:true});
 assert.equal(state.locked,false);assert.equal(state.finishingAt,true);
 for(const totalSpins of [10001,11000,15000]){
  state=limit.observe(state,{totalSpins,continuingAt:true});
  assert.equal(state.locked,false);assert.equal(state.reachedAt,10000);
 }
 state=limit.observe(state,{totalSpins:15001});
 assert.equal(state.locked,true);assert.equal(state.finishingAt,false);
 assert.equal(state.stoppedAt,15001);
});

test('saved terminal states survive reload and user handoff; only a fresh state resets',()=>{
 const saved=JSON.parse(JSON.stringify(limit.observe(null,{totalSpins:10000})));
 for(const totalSpins of [0,9999,10000,12000]){
  const state=limit.observe(saved,{totalSpins,continuingAt:true});
  assert.equal(state.locked,true);assert.equal(state.stoppedAt,10000);
 }
 assert.equal(limit.observe(null,{totalSpins:0}).locked,false);
});

test('installing the policy on an existing machine observes its cumulative games',()=>{
 assert.equal(limit.observe(null,{totalSpins:13613}).locked,true);
 assert.equal(limit.observe(null,{totalSpins:13613,continuingAt:true}).finishingAt,true);
});

test('resume of an unfinished threshold game waits for settlement and its AT result',()=>{
 const saved=JSON.parse(JSON.stringify(limit.observe(null,{totalSpins:10000,unsettled:true})));
 assert.equal(limit.observe(saved,{totalSpins:10000,unsettled:true}).locked,false);
 assert.equal(limit.observe(saved,{totalSpins:10000,continuingAt:true}).finishingAt,true);
 assert.equal(limit.observe(saved,{totalSpins:10000,continuingAt:false}).locked,true);
});

test('a reached AT limit survives a temporarily stale cabinet total after handoff',()=>{
 const saved=limit.observe(null,{totalSpins:10000,continuingAt:true});
 assert.equal(limit.observe(saved,{totalSpins:9980,continuingAt:true}).locked,false);
 const stopped=limit.observe(saved,{totalSpins:9980,continuingAt:false});
 assert.equal(stopped.locked,true);assert.equal(stopped.stoppedAt,10000);
});

test('AT includes special zones, checkpoints, upper AT and comeback until normal return',()=>{
 for(const extra of [{},{zone:'sora'},{researchUpper:true},{researchChallengeActive:true,burstLeft:10},
  {comebackLeft:5},{comebackConfirmed:true},{initialStage:'wait'},{stock:1},{researchSortieLeft:10}]){
  const flow={phase:'art',...extra},before=JSON.stringify(flow);
  assert.equal(limit.continuingAt({flow}),true);
  assert.equal(limit.observe(null,{totalSpins:10000,continuingAt:limit.continuingAt({flow})}).locked,false);
  assert.equal(JSON.stringify(flow),before);
 }
 for(const phase of ['normal','cz','strong_cz'])assert.equal(limit.continuingAt({flow:{phase}}),false);
 assert.equal(limit.continuingAt({bonusPending:true,flow:{phase:'normal'}}),false);
});

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function integration({spins=10000,flow={phase:'normal'},base=null,start=null,unsettled=false}={}){
 const calls=[],c=vm.createContext({
  A_TYPE_MODE:true,normalState:{flow},stats:{totalSpins:spins,totalPaid:300,totalFee:300},machineDisplayBase:base,playSessionStartStats:start,displaySinceBonusOffset:0,
  isSpinning:unsettled,currentSpin:unsettled?{}:null,sessionStartGuard:false,bonusEndBgmPlaying:false,
  stopAutoPlay(){calls.push('auto');},stopSpeedToBonus(){calls.push('speed');},stopDebugFastSpin(){calls.push('fast');},
  pauseNormalBgm(){},stopBarBgm(){},stopBattleBgm(){},showMessage(){},log(){},persistState(){calls.push('save');},updateDisplay(){calls.push('display');}
 });
 vm.runInContext(fs.readFileSync('nova-play-limit.js','utf8'),c);
 vm.runInContext('Math.random=()=>{throw Error("limit used game RNG");}',c);
 vm.runInContext(['machineDisplayStats','isPlayLimitLocked','updatePlayLimitState'].map(fn).join('\n'),c);
 return {c,calls};
}

test('integration uses machine totals instead of the current customer session and persists once',()=>{
 const t=integration({spins:25,base:{totalSpins:9995},start:{totalSpins:20}}),before=JSON.stringify(t.c.stats);
 assert.equal(t.c.updatePlayLimitState(),true);
 assert.equal(t.c.normalState.playLimit.stoppedAt,10000);
 assert.deepEqual(t.calls,['auto','speed','fast','save','display']);
 assert.equal(JSON.stringify(t.c.stats),before);
 t.c.updatePlayLimitState();assert.equal(t.calls.length,5);
});

test('integration finishes an in-flight AUTO game before disabling all automatic modes',()=>{
 const t=integration({unsettled:true});
 assert.equal(t.c.updatePlayLimitState(),false);assert.equal(t.calls.length,0);
 t.c.isSpinning=false;t.c.currentSpin=null;
 assert.equal(t.c.updatePlayLimitState(),true);assert(t.calls.includes('auto'));
});

test('integration keeps a restored AT running and stops on the exact normal-return game',()=>{
 const t=integration({spins:10500,flow:{phase:'art',comebackLeft:1}});
 t.c.normalState.playLimit=JSON.parse(JSON.stringify(limit.observe(null,{totalSpins:10000,continuingAt:true})));
 assert.equal(t.c.updatePlayLimitState(),false);assert.equal(t.calls.length,0);
 t.c.stats.totalSpins++;t.c.normalState.flow={phase:'normal'};
 assert.equal(t.c.updatePlayLimitState(),true);
 assert.equal(t.c.normalState.playLimit.stoppedAt,10501);
 assert.equal(t.c.normalState.playLimit.reachedAt,10000);
});

test('all existing input gates check the limit while final settlement and boot observe it',()=>{
 assert.match(fn('canPlayCompleteTrial'),/NovaPlayLimit&&updatePlayLimitState\(\)/);
 assert.match(source,/finally\{if\(globalThis\.NovaPlayLimit\)updatePlayLimitState\(\);persistState\(\);\}/);
 assert.match(fn('bootGame'),/updatePlayLimitState\(\)/);
 assert.match(fn('finishSession'),/updatePlayLimitState\(\)/);
 assert.match(fn('scheduleNextAuto'),/updatePlayLimitState\(\)/);
 for(const name of ['resetGame','resetRuntimeForMorning']){
  assert.match(fn(name),/normalState = \{internal:NovaNormal.reset/);
  assert.match(fn(name),/machineDisplayBase=null;displaySinceBonusOffset=0/);
 }
});
