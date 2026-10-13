import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8'),fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
test('admin MY limit is saved, restored and triggers at the requested recovery amount without changing the setting or net cap',()=>{
 let net=8000,saved;const stopped=[];
 const c=vm.createContext({settings:{setting:6,completeLimitPt:0,completeMyLimitPt:19000},VERTEX_CONTROLLER_ENABLED:false,DEFAULT_COMPLETE_LIMIT_PT:0,COMPLETE_TRIAL_ENABLED:true,completeTrialState:{lowestNet:-3000},
  $:()=>null,canUsePlayState:()=>true,readSettings(){},persistState(){saved=JSON.parse(JSON.stringify(c.settings));return true;},updateDisplay(){},log(){},showMessage(){},formatSigned:String,
  completeTrialProfit:()=>net,completeLimitPt:()=>c.settings.completeLimitPt,isCompleteLockEnabled:()=>true,
  stopAutoPlay:()=>stopped.push('auto'),stopSpeedToBonus:()=>stopped.push('speed'),stopDebugFastSpin:()=>stopped.push('fast'),syncCompletePresentation(){}});
 vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),c);
 for(const name of ['isCompleteTrialLocked','updateCompleteTrialState','applyAdminSettings'])vm.runInContext(fn(name),c);
 vm.runInContext('Math.random=()=>{throw Error("must not consume game RNG")}',c);
 c.applyAdminSettings({completeMyLimitPt:12000,completeLimitPt:0});
 assert.equal(c.settings.setting,6);assert.equal(c.settings.completeLimitPt,0);assert.equal(saved.completeMyLimitPt,12000);assert(!c.completeTrialState.locked);
 const restored=JSON.parse(JSON.stringify(c.completeTrialState));c.NovaComplete.restore(restored,net,0,c.NovaComplete.myLimit(saved));assert(!restored.locked);
 net=9000;assert(c.updateCompleteTrialState());assert.equal(c.completeTrialState.reason,'my');assert.deepEqual(stopped,['auto','speed','fast']);
});

test('store completion migrates MY limits to net zero and only stops at the positive threshold',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),c);
 const settings=c.NovaComplete.configure({setting:5,completeLimitPt:0,completeMyLimitPt:10000},true);
 assert.equal(settings.setting,5);assert.equal(settings.completeBasis,'net');assert.equal(settings.completeLimitPt,10000);assert.equal(c.NovaComplete.myLimit(settings),0);
 const state={};for(const net of [-3000,7000,9999]){c.NovaComplete.observe(state,net,settings.completeLimitPt,c.NovaComplete.myLimit(settings));assert(!state.locked);}
 c.NovaComplete.observe(state,10000,settings.completeLimitPt,c.NovaComplete.myLimit(settings));assert(state.locked);assert.equal(state.reason,'net');
 assert.equal(c.NovaComplete.label(settings,state.reason),'累計差枚＋10,000pt');
 const restored={lowestNet:-20000,maxMy:27000,locked:true,reason:'my'};c.NovaComplete.restore(restored,7000,10000,0);assert(!restored.locked);
 const saved=JSON.parse(JSON.stringify(settings));assert.deepEqual(JSON.parse(JSON.stringify(c.NovaComplete.configure(saved,true))),saved);
 assert.equal(c.NovaComplete.myLimit(c.NovaComplete.configure({})),19000);
});

test('store polling applies the latest limit even with no new commands and never overwrites the setting',()=>{
 const calls=[],c=vm.createContext({settings:{setting:6,completeBasis:'net',completeLimitPt:19000,completeMyLimitPt:0},applyAdminSettings:patch=>{calls.push(JSON.parse(JSON.stringify(patch)));Object.assign(c.settings,patch);}});
 vm.runInContext(fn('applyStoreCompleteSettings'),c);
 c.applyStoreCompleteSettings({completeBasis:'net',completeLimitPt:10000});c.applyStoreCompleteSettings({completeBasis:'net',completeLimitPt:10000});
 c.applyStoreCompleteSettings({completeBasis:'net',completeLimitPt:0});
 assert.deepEqual(calls,[{completeBasis:'net',completeLimitPt:10000,completeMyLimitPt:0}]);assert.equal(c.settings.setting,6);
});
test('existing sessions without a custom MY threshold keep MY19000',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),c);
 assert.equal(c.NovaComplete.myLimit({}),19000);assert.equal(c.NovaComplete.myLimit({completeMyLimitPt:0}),19000);
 for(const limit of [10000,19000,22000]){const state={lowestNet:-5000};c.NovaComplete.observe(state,limit-5001,0,c.NovaComplete.myLimit({completeMyLimitPt:limit}));assert(!state.locked);c.NovaComplete.observe(state,limit-5000,0,limit);assert.equal(state.reason,'my');}
});
