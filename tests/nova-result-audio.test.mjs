import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
const fn=name=>html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
test('background music stays paused through result callbacks and resumes after result dismissal',()=>{
 let plays=0,pauses=0;const c=vm.createContext({normalState:{resultCard:{kind:'zone'}},debugFastSpinActive:false,session:{active:false},bonusConfirmBgmHold:false,barBgmActive:false,battleBgmActive:false,bgm:{paused:true,play(){plays++;return Promise.resolve();}},pauseNormalBgm(){pauses++;},ensureNormalBgmSource:()=> 'at.wav',bgmOutputVolumeForSource:()=>.5,BGM_OUTPUT_SCALE:1,getAudio(){}});
 vm.runInContext(fn('playNormalBgm'),c);c.playNormalBgm();c.playNormalBgm();assert.equal(plays,0);assert.equal(pauses,2);
 c.normalState.resultCard=null;c.normalState.pendingZoneResult={kind:'zone'};c.playNormalBgm();assert.equal(plays,0);
 c.normalState.pendingZoneResult=null;c.playNormalBgm();assert.equal(plays,1);
});
test('normal and reverse SUPER NOVA use the same stop sound exactly once',()=>{
 for(const oumaFreeze of [false,true]){const sounds=[];const c=vm.createContext({currentSpin:{result:'SUPER_NOVA',resolved:{oumaFreeze}},sfxOutputVolume:()=>.5,playOneShotSound:(...args)=>sounds.push(args)});vm.runInContext(fn('playStopSound'),c);c.playStopSound(2,3);c.playStopSound(2,3);assert.equal(sounds.length,1);assert.equal(sounds[0][0],'assets/media/nova/super-nova-stop.wav');assert.equal(sounds[0][1],.5);}
});
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
  const c=vm.createContext({NovaLadder:{eligible:()=>false},currentSpin:{resolved:{flowBefore:before,flowAfter:after}},normalState:{},isPremiumBigFinalBonusSpin:()=>false,autoResultWaitMs:1000});vm.runInContext(code+';globalThis.wait=resultWaitMs;',c);assert.equal(c.wait,expected);
 }
});
