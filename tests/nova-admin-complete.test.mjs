import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];

test('admin COMPLETE patches are ignored while unrelated settings still save',()=>{
 let saved;
 const c=vm.createContext({
  settings:{setting:6,audioMuted:false,completeEnabled:false,completeBasis:'none',completeLimitPt:0,completeMyLimitPt:0},
  VERTEX_CONTROLLER_ENABLED:false,COMPLETE_TRIAL_ENABLED:false,
  $:()=>null,canUsePlayState:()=>true,readSettings(){},persistState(){saved=JSON.parse(JSON.stringify(c.settings));return true;},updateDisplay(){},log(){}
 });
 vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),c);
 vm.runInContext(fn('applyAdminSettings'),c);
 vm.runInContext('Math.random=()=>{throw Error("admin settings must not consume game RNG")}',c);
 c.applyAdminSettings({audioMuted:true,completeEnabled:true,completeBasis:'net',completeLimitPt:10000,completeMyLimitPt:19000});
 assert.equal(c.settings.setting,6);
 assert.equal(c.settings.audioMuted,true);
 assert.deepEqual(
  {enabled:c.settings.completeEnabled,basis:c.settings.completeBasis,net:c.settings.completeLimitPt,my:c.settings.completeMyLimitPt},
  {enabled:false,basis:'none',net:0,my:0}
 );
 assert.deepEqual(
  {enabled:saved.completeEnabled,basis:saved.completeBasis,net:saved.completeLimitPt,my:saved.completeMyLimitPt},
  {enabled:false,basis:'none',net:0,my:0}
 );
});

test('admin snapshots publish COMPLETE as disabled even when stale runtime fields exist',()=>{
 const c=vm.createContext({
  settings:{title:'NOVA',setting:4,completeEnabled:true,completeBasis:'net',completeLimitPt:10000,completeMyLimitPt:19000},
  stats:{totalFee:300,totalPaid:420},normalState:{},session:{},completeTrialState:{locked:true,reason:'net'},
  machineId:'nova-4',PLAY_SESSION_ID:'play',adminCommandLastId:0,playSessionStartStats:null,
  machineDisplayStats:()=>({}),compactStatsForResume:()=>({totalFee:300,totalPaid:420}),runtimeStateForStorage:()=>({}),
  isSpinning:false,spinCanStop:false,autoPlay:false,superFullAuto:false,superSpeedMode:false,superSpeedActive:false,superSpeedPending:false,superSpeedAllowed:false,superSpeedDebugAllowed:false,
  forceResult:'',forcePremiumEffect:false,$:()=>null
 });
 vm.runInContext(fn('adminSnapshot'),c);
 const snapshot=c.adminSnapshot();
 assert.deepEqual(
  {enabled:snapshot.settings.completeEnabled,basis:snapshot.settings.completeBasis,net:snapshot.settings.completeLimitPt,my:snapshot.settings.completeMyLimitPt},
  {enabled:false,basis:'none',net:0,my:0}
 );
});

test('store COMPLETE controls are ignored and never overwrite the setting',()=>{
 const calls=[];
 const c=vm.createContext({settings:{setting:6,completeBasis:'none',completeLimitPt:0,completeMyLimitPt:0},applyAdminSettings:patch=>calls.push(patch)});
 vm.runInContext(source.match(/  function applyStoreCompleteSettings\([^\n]+/)[0],c);
 assert.equal(c.applyStoreCompleteSettings({completeBasis:'net',completeLimitPt:10000}),false);
 assert.equal(c.applyStoreCompleteSettings({completeBasis:'my',completeMyLimitPt:19000}),false);
 assert.deepEqual(calls,[]);
 assert.equal(c.settings.setting,6);
});
