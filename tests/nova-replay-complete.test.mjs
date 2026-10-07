import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({});
for(const file of ['nova-complete.js','nova-tuning.js','nova-art.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const a=c.NovaArt,observe=c.NovaComplete.observe;

test('replay refunds cash but cannot consume BIG award target or award special-zone points',()=>{
 assert.equal(a.cashPayout('REPLAY'),3);assert.equal(a.payout('REPLAY'),0);
 for(const paid of [0,47,50])assert.equal(a.bonusPayout({paid},'REPLAY'),0);
 assert.equal(a.replayRefund('REPLAY',{zero:true}),0);
 assert.equal(a.replayRefund('REPLAY',{replayRefund:false}),0);
 assert.equal(a.cashPayout('BELL'),8);assert.equal(a.cashPayout('BELL15'),15);
});

test('every AT BET costs three: replay has zero net and preserves the net quota',()=>{
 for(const upper of [false,true]){
  let flow={...a.enter({setting:3},()=>.99),remaining:'200',researchUpper:upper},fee=0,paid=0;
  for(const role of ['BELL','REPLAY','REPLAY','MISS','BELL15','REPLAY']){
   fee+=3;flow=a.restoreBetCost(flow,3);
   flow=a.step(flow,{setting:3},()=>.999,role).flow;paid+=a.cashPayout(role);
   assert.equal(Number(flow.remaining),200-(paid-fee));
  }
  assert.equal(fee,18);assert.equal(paid,32);assert.equal(flow.remaining,'186');
 }
});

test('both caps stop on the first reached condition, including a MY stop below zero',()=>{
 for(const [path,reason,net] of [[[0,9999,10000],'net',10000],[[0,-8000,6999,7000],'my',7000],[[0,-20000,-5001,-5000],'my',-5000]]){
  const state={};for(const p of path.slice(0,-1)){observe(state,p);assert(!state.locked);}
  observe(state,path.at(-1));assert.equal(state.reason,reason);assert.equal(state.completeProfit,net);
  const saved=JSON.parse(JSON.stringify(state));observe(saved,-30000);
  assert.equal(saved.reason,reason);assert.equal(saved.completeProfit,net);assert.equal(saved.locked,true);
 }
});

test('MY uses an earlier trough, not peak minus a later trough; reset starts again at zero',()=>{
 const state={};for(const p of [0,8000,-8000,6999])observe(state,p);
 assert(!state.locked);assert.equal(state.maxMy,14999);assert.equal(state.lowestNet,-8000);
 observe(state,7000);assert(state.locked);
 const reset={};observe(reset,7000);assert(!reset.locked);assert.equal(reset.lowestNet,0);
});

test('MY uses constant-size state and remembers charged-BET lows across serialization',()=>{
 let state={};for(let i=0;i<100000;i++){observe(state,-500-i%10);state=JSON.parse(JSON.stringify(state));}
 assert.equal(state.lowestNet,-509);assert(Object.keys(state).length<=2);
 observe(state,14491,20000,15000);assert.equal(state.reason,'my');
});

test('MY arrival cancels every automatic player and gates the next manual BET',()=>{
 const calls=[],ctx=vm.createContext({NovaComplete:c.NovaComplete,COMPLETE_TRIAL_ENABLED:true,settings:{setting:6},completeTrialState:{lowestNet:-8000},
  completeTrialProfit:()=>7000,completeLimitPt:()=>10000,isCompleteLockEnabled:()=>true,
  stopAutoPlay:()=>calls.push('auto'),stopSpeedToBonus:()=>calls.push('speed'),stopDebugFastSpin:()=>calls.push('fast'),
  showOverlay(){},showMessage(){},log(){},persistState(){},updateDisplay(){},formatSigned:String,
  bonusConfirmSoundPlaying:false,bonusEndBgmPlaying:false});
 const src=fs.readFileSync('nova-game.js','utf8');
 for(const name of ['isCompleteTrialLocked','updateCompleteTrialState','canPlayCompleteTrial'])vm.runInContext(src.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],ctx);
 assert.equal(ctx.updateCompleteTrialState(),true);assert.deepEqual(calls,['auto','speed','fast']);
 assert.equal(ctx.completeTrialState.reason,'my');assert.equal(ctx.canPlayCompleteTrial(),false);
});
