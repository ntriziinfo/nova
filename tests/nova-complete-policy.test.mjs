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

test('store net-zero threshold and fixed MY19000 are independent',()=>{
 const complete=loadComplete();
 const standalone=complete.configure({setting:1});
 const store=complete.configure({setting:2,completeLimitPt:10000,completeMyLimitPt:10000},true);
 assert.equal(standalone.completeLimitPt,0);
 assert.equal(complete.myLimit(standalone),19000);
 assert.equal(store.completeBasis,'dual');
 assert.equal(store.completeLimitPt,10000);
 assert.equal(complete.myLimit(store),19000);
});

test('obsolete MY10000 completion unlocks with net below 10000 and MY below 19000, retaining AT',()=>{
 const complete=loadComplete(),settings=complete.configure({completeLimitPt:10000},true);
 const state={locked:true,reason:'my',lowestNet:-1114,maxMy:10000,lockedSetting:6,completeProfit:8886,completeMy:10000};
 const flow={remaining:'777',queuedZones:['ura_ouma'],stock:'2'};
 const snapshot={completeTrialState:state,normalState:{flow},stats:{totalFee:20000,totalPaid:28886}};
 const preserved=JSON.stringify({flow,stats:snapshot.stats});
 complete.restore(state,8886,settings.completeLimitPt,complete.myLimit(settings));
 assert.equal(state.locked,false);assert.equal(JSON.stringify({flow,stats:snapshot.stats}),preserved);
 complete.observe(state,9999,10000,19000);assert.equal(state.locked,false);
 complete.observe(state,10000,10000,19000);assert.equal(state.reason,'net');
 const my={lowestNet:-12000};complete.observe(my,6999,10000,19000);assert(!my.locked);
 complete.observe(my,7000,10000,19000);assert.equal(my.reason,'my');
});
