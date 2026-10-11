import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=readGameSource();
function setup(stage='bet'){
 const calls=[];const context=vm.createContext({stopSuperSpeedIfNeeded:()=>false,autoPlay:true,bonusEndBgmPlaying:false,bonusConfirmSoundPlaying:false,
  completeTrialState:{},oumaPresentation:{stage},isSpinning:false,locked:false,isCompleteTrialLocked:()=>context.locked,
  resolveOumaChallenge(){calls.push('challenge');context.oumaPresentation.stage='lift';},
  queueAutoStep:()=>calls.push('queue'),autoPollDelayMs:()=>75,
  stopAutoPlay:()=>calls.push('stop'),stopSpeedToBonus(){},stopDebugFastSpin(){},showMessage(){},showOverlay(){},completeLimitPt:()=>10000});
 for(const name of ['canPlayCompleteTrial','runAutoStep'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],context);
 return {context,calls};
}
test('AUTO handles Ouma BET before the manual-input presentation lock',()=>{
 const {context:c,calls}=setup();assert.equal(c.canPlayCompleteTrial(),false);
 c.runAutoStep();assert.deepEqual(calls,['challenge','queue']);c.runAutoStep();assert.deepEqual(calls,['challenge','queue','queue']);
});
test('AUTO polls through Ouma hold without skipping it or drawing another game',()=>{
 const {context:c,calls}=setup('hold');c.runAutoStep();assert.deepEqual(calls,['queue']);
});
test('audio and COMPLETE locks still apply during the Ouma presentation',()=>{
 const {context:c,calls}=setup();c.bonusConfirmSoundPlaying=true;c.runAutoStep();assert.deepEqual(calls,['queue']);
 c.bonusConfirmSoundPlaying=false;c.locked=true;c.runAutoStep();assert.deepEqual(calls,['queue','stop']);
});

test('AUTO and super AUTO wait the full sortie award hold before any spin or phase handling',()=>{
 for(const name of ['runAutoStep','scheduleNextAuto']){
  const delays=[],c=vm.createContext({autoPlay:true,superSpeedActive:true,NovaSortie:{busy:true,waitMs:3999},queueAutoStep:ms=>delays.push(ms)});
  vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
  c[name]();assert.deepEqual(delays,[3999]);
  c.autoPlay=false;c[name]();assert.deepEqual(delays,[3999],'stopping AUTO must not restart it');
 }
});

test('manual BET during sortie award hold returns before charging or drawing a game',async()=>{
 const c=vm.createContext({canUsePlayState:()=>true,NovaSortie:{busy:true}});
 vm.runInContext(html.match(/  async function spin\([^]*?\n  }/)[0],c);
 await c.spin();
});
