import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readGameSource} from '../scripts/game-source.mjs';
const source=readGameSource();
const fn=name=>source.match(new RegExp('  (?:async )?function '+name+'\\([^]*?\\n  }'))[0];
function setup({completeAt=Infinity,cancel=false,fail=false,hold=false}={}){
 const messages=[],node={};let steps=0,yields=0,resets=0;
 const c=vm.createContext({debugOneClickSimActive:false,debugFastSpinActive:false,debugFastSpinCount:0,isSpinning:false,DEBUG_ONE_CLICK_SIM_SPINS:10000,stats:{totalFee:0},
  showMessage:(...args)=>messages.push(args),readSettings(){},resetRuntimeForMorning(){resets++;steps=0;},updateDebugFastUi(){},updateDisplay(){},persistState(){},log(){},
  $:()=>node,isCompleteTrialLocked:()=>c.debugFastSpinCount>=completeAt,currentProfit:()=>12,currentRtp:()=>1.01,formatSigned:n=>'+'+n,
  setTimeout(cb){yields++;if(cancel&&yields===2)c.debugFastSpinActive=false;cb();},
  runDebugFastStep(){steps++;if(fail&&steps===25)throw Error('test failure');return !hold&&steps%3!==0;}
 });
 vm.runInContext(fn('runTenKSimulation')+fn('runCountSimulation'),c);
 return {c,messages,node,get steps(){return steps;},get yields(){return yields;},get resets(){return resets;}};
}
test('50k trial counts only actual games, yields to UI, and retains 10k trial',async()=>{
 for(const target of [10000,50000]){
  const h=setup();await(target===10000?h.c.runTenKSimulation():h.c.runCountSimulation(target));
  assert.equal(h.c.debugFastSpinCount,target);assert(h.steps>target);assert(h.yields>1);assert.equal(h.resets,1);
  assert.match(h.messages.at(-1)[0],new RegExp(target/10000+'万回転試算完了'));
  assert.equal(h.c.debugFastSpinActive,false);assert.equal(h.c.debugOneClickSimActive,false);
 }
});
test('complete stops early; manual interruption and errors are not reported as completion',async()=>{
 const complete=setup({completeAt:412});await complete.c.runCountSimulation(50000);assert.equal(complete.c.debugFastSpinCount,412);assert.match(complete.messages.at(-1)[0],/COMPLETE/);
 const cancel=setup({cancel:true});await cancel.c.runCountSimulation(50000);assert(cancel.c.debugFastSpinCount<50000);assert.match(cancel.messages.at(-1)[0],/中断/);
 for(const option of [{fail:true},{hold:true}]){const h=setup(option);await h.c.runCountSimulation(50000);assert.match(h.messages.at(-1)[0],/エラー/);assert.equal(h.c.debugOneClickSimActive,false);}
});
test('reentry, mid-spin, and unsupported horizons cannot reset an active trial',async()=>{
 const h=setup();const active=h.c.runCountSimulation(50000);await h.c.runCountSimulation(10000);await active;assert.equal(h.resets,1);
 h.c.isSpinning=true;await h.c.runCountSimulation(50000);assert.equal(h.resets,1);assert.match(h.messages.at(-1)[0],/待機/);
 h.c.isSpinning=false;await h.c.runCountSimulation(123);assert.equal(h.resets,1);
});

test('live fast step excludes resolved 0G chains but counts bonus games',()=>{
 for(const [bonus,zero,expected]of [[false,true,false],[false,false,true],[true,false,true]]){
  const c=vm.createContext({A_TYPE_MODE:true,session:{active:bonus,phase:'idle'},normalState:{flow:{phase:'art'}},isSpinning:false,sessionStartGuard:false,pendingAtStartTimer:null,
   pendingForceResult:'',forcePremiumEffect:false,jagLastGamePayout:0,jagChanceHold:false,
   canUsePlayState:()=>true,canPlayCompleteTrial:()=>true,isGoraiZoneActive:()=>false,isATypeBonusActive:()=>bonus,isATypeBonusComplete:()=>false,isContinuationBattleActive:()=>false,
   takeForcedResult:()=>'', $:()=>null,countTotalSpinIfNeeded(){c.normalState.flow.zero=zero;},chargeSpinCost(){},activateReachMeBonusAnnouncementIfNeeded:()=>false,
   drawNormalResult:()=> 'BELL',drawResult:()=> 'BELL',resultLineRow:()=>1,resolveNormalOutcome:()=>({}),resolveOutcome:()=>({}),decideBigPremiumEffect:()=>false,shouldScheduleBonusAnnouncement:()=>false,
   drawRareSortie(){},applyNormalResult(){c.normalState.flow.zero=false;},applyResult(){}
  });
  vm.runInContext(fn('runDebugFastStep'),c);assert.equal(c.runDebugFastStep(),expected);
 }
});
