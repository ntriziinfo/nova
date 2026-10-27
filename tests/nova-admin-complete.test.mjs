import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];

test('admin COMPLETE patches configure MY and save unrelated settings',()=>{
 let saved;
 const c=vm.createContext({
  settings:{setting:6,audioMuted:false,completeEnabled:false,completeBasis:'none',completeLimitPt:0,completeMyLimitPt:0},
  VERTEX_CONTROLLER_ENABLED:false,COMPLETE_TRIAL_ENABLED:true,
  updateCompleteTrialState(){},$:()=>null,canUsePlayState:()=>true,readSettings(){},persistState(){saved=JSON.parse(JSON.stringify(c.settings));return true;},updateDisplay(){},log(){}
 });
 vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),c);
 vm.runInContext(fn('applyAdminSettings'),c);
 vm.runInContext('Math.random=()=>{throw Error("admin settings must not consume game RNG")}',c);
 c.applyAdminSettings({audioMuted:true,completeEnabled:true,completeBasis:'net',completeLimitPt:10000,completeMyLimitPt:19000});
 assert.equal(c.settings.setting,6);
 assert.equal(c.settings.audioMuted,true);
 assert.deepEqual(
  {enabled:c.settings.completeEnabled,basis:c.settings.completeBasis,net:c.settings.completeLimitPt,my:c.settings.completeMyLimitPt},
  {enabled:true,basis:'my',net:0,my:19000}
 );
 assert.deepEqual(
  {enabled:saved.completeEnabled,basis:saved.completeBasis,net:saved.completeLimitPt,my:saved.completeMyLimitPt},
  {enabled:true,basis:'my',net:0,my:19000}
 );
});

test('admin snapshots retain MY configuration and lock state',()=>{
 const c=vm.createContext({
  settings:{title:'NOVA',setting:4,completeEnabled:true,completeBasis:'my',completeLimitPt:0,completeMyLimitPt:19000},
  stats:{totalFee:300,totalPaid:420},normalState:{},session:{},completeTrialState:{locked:true,reason:'net'},
  machineId:'nova-4',PLAY_SESSION_ID:'play',adminCommandLastId:0,playSessionStartStats:null,
  machineDisplayStats:()=>({}),compactStatsForResume:()=>({totalFee:300,totalPaid:420}),runtimeStateForStorage:()=>({}),
  isSpinning:false,spinCanStop:false,autoPlay:false,superFullAuto:false,superSpeedMode:false,superSpeedActive:false,superSpeedPending:false,superSpeedAllowed:false,superSpeedDebugAllowed:false,
  forceResult:'',forcePremiumEffect:false,$:()=>null
 });
 vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),c);
 vm.runInContext(fn('adminSnapshot'),c);
 const snapshot=c.adminSnapshot();
 assert.deepEqual(
  {enabled:snapshot.settings.completeEnabled,basis:snapshot.settings.completeBasis,net:snapshot.settings.completeLimitPt,my:snapshot.settings.completeMyLimitPt},
  {enabled:true,basis:'my',net:19000,my:19000}
 );
});

test('store polling accepts legacy limit fields, deduplicates and never overwrites setting',()=>{
 const calls=[];
 const c=vm.createContext({settings:{setting:6,completeBasis:'my',completeLimitPt:0,completeMyLimitPt:19000},applyAdminSettings:patch=>calls.push(JSON.parse(JSON.stringify(patch)))});
 vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),c);
 vm.runInContext(fn('applyStoreCompleteSettings'),c);
 assert.equal(c.applyStoreCompleteSettings({completeBasis:'net',completeLimitPt:10000}),true);
 assert.equal(c.applyStoreCompleteSettings({completeBasis:'my',completeMyLimitPt:19000}),false);
 assert.equal(c.applyStoreCompleteSettings({completeLimitPt:0}),false);
 assert.deepEqual(calls,[{completeMyLimitPt:10000}]);
 assert.equal(c.settings.setting,6);
});

test('MY completion stops all automatic modes and survives save/restore',()=>{
 const calls=[];
 const c=vm.createContext({settings:{setting:6,completeBasis:'my',completeMyLimitPt:10000,completeLimitPt:0},COMPLETE_TRIAL_ENABLED:true,completeTrialState:{lowestNet:-5000,maxMy:0},completeTrialProfit:()=>4999,completeLimitPt:()=>0,isCompleteLockEnabled:()=>true,
 stopAutoPlay:()=>calls.push('auto'),stopSpeedToBonus:()=>calls.push('speed'),stopDebugFastSpin:()=>calls.push('fast'),syncCompletePresentation(){},showMessage(){},log(){},persistState(){},updateDisplay(){},formatSigned:String});
 vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),c);
 vm.runInContext(fn('isCompleteTrialLocked')+fn('updateCompleteTrialState'),c);
 assert.equal(c.updateCompleteTrialState(),false);
 c.completeTrialProfit=()=>5000;
 assert.equal(c.updateCompleteTrialState(),true);
 assert.deepEqual(calls,['auto','speed','fast']);
 const saved=JSON.parse(JSON.stringify(c.completeTrialState));
 c.NovaComplete.restore(saved,5000,0,10000);
 assert.equal(saved.locked,true);assert.equal(saved.reason,'my');
});
