import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadComplete(){
 const context=vm.createContext({});
 vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),context);
 return context.NovaComplete;
}

test('disabled COMPLETE policy clears both caps without changing unrelated settings',()=>{
 const complete=loadComplete();
 const configured=complete.configure({setting:5,completeEnabled:true,completeBasis:'net',completeLimitPt:10000,completeMyLimitPt:19000,novaArt:{initial:300}},true,false);
 assert.equal(configured.setting,5);
 assert.equal(configured.completeEnabled,false);
 assert.equal(configured.completeBasis,'none');
 assert.equal(configured.completeLimitPt,0);
 assert.equal(configured.completeMyLimitPt,0);
 assert.deepEqual(configured.novaArt,{initial:300});
 assert.equal(complete.myLimit(configured),0);
});

test('disabled policy unlocks a saved COMPLETE state and cannot immediately relock it',()=>{
 const complete=loadComplete();
 const configured=complete.configure({completeBasis:'my',completeMyLimitPt:19000},false,false);
 const state={locked:true,lockedSetting:6,reason:'my',completeProfit:14000,completeMy:19000,lowestNet:-5000,maxMy:19000};
 complete.restore(state,14000,configured.completeLimitPt,complete.myLimit(configured));
 assert.equal(state.locked,false);
 assert.equal(state.lockedSetting,0);
 assert.equal(state.completeProfit,0);
 assert.equal(state.reason,undefined);
 assert.equal(state.completeMy,undefined);
 complete.observe(state,1000000,configured.completeLimitPt,complete.myLimit(configured));
 assert.equal(state.locked,false);
});

test('legacy callers keep the historical store and standalone policies when enabled is omitted',()=>{
 const complete=loadComplete();
 const standalone=complete.configure({setting:1});
 const store=complete.configure({setting:2,completeMyLimitPt:12000},true);
 assert.equal(standalone.completeLimitPt,0);
 assert.equal(complete.myLimit(standalone),19000);
 assert.equal(store.completeBasis,'net');
 assert.equal(store.completeLimitPt,12000);
 assert.equal(complete.myLimit(store),0);
});
