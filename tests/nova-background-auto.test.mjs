import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
function setup(stage='bet'){
 const calls=[];const context=vm.createContext({autoPlay:true,bonusEndBgmPlaying:false,bonusConfirmSoundPlaying:false,
  oumaPresentation:{stage},isSpinning:false,locked:false,isCompleteTrialLocked:()=>context.locked,
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
