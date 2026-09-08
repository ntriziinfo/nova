import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
const fn=name=>html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
test('eyecatch holds next spin until ended, without a fixed release timer',()=>{
 let audio;const c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,A_TYPE_MODE:true,SEVEN_CONFIRM_SOUND_SRC:'seven',oneShotSoundCache:new Map(),bonusConfirmSoundPlaying:false,bonusConfirmSoundAudio:null,bonusConfirmSoundTimer:null,updateAutoUi(){},applyAudioSourceOutputScale:v=>v,setTimeout(){throw Error('unexpected timeout')},clearTimeout(){},Audio:class{constructor(src){audio=this;this.src=src;}pause(){}getAttribute(){return this.src;}play(){return Promise.resolve();}}});
 vm.runInContext(fn('clearBonusConfirmSoundLock')+'\n'+fn('playLockedBonusConfirmSound'),c);
 c.playLockedBonusConfirmSound('assets/media/nova/result-eyecatch.wav',.5);
 assert.equal(c.bonusConfirmSoundPlaying,true);assert.equal(audio.volume,.5);
 audio.onended();assert.equal(c.bonusConfirmSoundPlaying,false);
});
test('zone and AT result third stops skip result delay; ordinary games keep it',()=>{
 const code=html.match(/      const r=currentSpin.resolved;[^]*?const resultWaitMs =[^\n]+/)[0];
 for(const [before,after,expected] of [[{zone:'toto'},{zone:''},0],[{phase:'art'},{phase:'normal'},0],[{phase:'normal'},{phase:'normal'},1000]]){
  const c=vm.createContext({currentSpin:{resolved:{flowBefore:before,flowAfter:after}},normalState:{},isPremiumBigFinalBonusSpin:()=>false,autoResultWaitMs:1000});vm.runInContext(code+';globalThis.wait=resultWaitMs;',c);assert.equal(c.wait,expected);
 }
});
