import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8'),fn=name=>html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
test('replay consumes no quota and grants exactly one free BET, surviving saved state',()=>{
 const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
 vm.runInContext(`const A_TYPE_MODE=true,SPIN_COST=3,stats={totalFee:0},session={active:true,cost:0},normalState=JSON.parse('{"replayFree":true}');const clearCzReelBlackout=()=>{};const recordSlumpPoint=()=>{},updateCompleteTrialState=()=>{};`+fn('chargeSpinCost'),ctx);
 ctx.chargeSpinCost();assert.equal(vm.runInContext('stats.totalFee',ctx),0);ctx.chargeSpinCost();assert.equal(vm.runInContext('stats.totalFee',ctx),3);
 assert.equal(ctx.NovaArt.step({...ctx.NovaArt.enter(),remaining:'80'},{},()=>.99,'REPLAY').flow.remaining,'80');
 assert.equal(ctx.NovaNormal.pay('REPLAY'),0);
});
test('preparation rares can award ART and a zone, misses cannot',()=>{
 const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
 assert.equal(ctx.NovaArt.drawPreparation('MISS',1,()=>0).sets,0);
 const won=ctx.NovaArt.drawPreparation('STRONG_NOVA',1,()=>0);assert.equal(won.sets,1);assert.equal(won.zones[0],'sosuke');
 assert.equal(ctx.NovaArt.drawPreparation('STRONG_NOVA',1,()=>.99).sets,0);
});
test('locked sound waits for ended, not a fixed timeout, and gates play',()=>{
 const timers=[];class Audio{constructor(src){this.src=src;}pause(){} getAttribute(){return this.src;}play(){return Promise.resolve();}}
 const ctx=vm.createContext({Audio,setTimeout:fn=>{timers.push(fn);return 1;},clearTimeout:()=>{},updateAutoUi:()=>{},applyAudioSourceOutputScale:x=>x,isCompleteTrialLocked:()=>false});
 vm.runInContext(`const A_TYPE_MODE=true,debugFastSpinActive=false,speedToBonusActive=false,SEVEN_CONFIRM_SOUND_SRC='seven';let bonusConfirmSoundPlaying=false,bonusEndBgmPlaying=false,bonusConfirmSoundTimer=null,bonusConfirmSoundAudio=null;const oneShotSoundCache=new Map();`+fn('clearBonusConfirmSoundLock')+fn('playLockedBonusConfirmSound')+fn('canPlayCompleteTrial'),ctx);
 ctx.playLockedBonusConfirmSound('patrol',.5);assert.equal(ctx.canPlayCompleteTrial(),false);assert.equal(timers.length,0);
 vm.runInContext('bonusConfirmSoundAudio.onended()',ctx);assert.equal(ctx.canPlayCompleteTrial(),true);
});
