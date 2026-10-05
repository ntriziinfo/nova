import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=readGameSource();
const fn=name=>html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];

test('AT roulette BET plays its voice once; fixed initial roulette keeps the ordinary BET sound',()=>{
 const sounds=[];const c=vm.createContext({superSpeedActive:false,debugFastSpinActive:false,speedToBonusActive:false,normalState:{},isLadderShutterSpin:()=>false,SPIN_SOUND_SRC:'normal.wav',sfxOutputVolume:()=>.5,voiceOutputVolume:()=>.7,playOneShotSound:(...args)=>sounds.push(args)});
 vm.runInContext(fn('playZoneRouletteBetVoice')+fn('playSpinSound'),c);
 for(const initialStage of ['', 'entry']){
  sounds.length=0;
  const r={flowBefore:{phase:'art',entryStage:'roulette',initialStage},flowAfter:{phase:'art',entryStage:'confirmed'}};
  const before=JSON.stringify([r.flowBefore,r.flowAfter]);
  c.playZoneRouletteBetVoice(r);c.playZoneRouletteBetVoice(r);c.playSpinSound(r);
  assert.equal(JSON.stringify([r.flowBefore,r.flowAfter]),before);
  assert.deepEqual(JSON.parse(JSON.stringify(sounds)),[[initialStage?'normal.wav':'assets/media/nova/aim/zone-roulette-confirm.wav?v=20260919-roulette-voice',initialStage ? .5 : .7,{allowDuringPremiumConfirm:true}]]);
 }
 for(const entryStage of ['seven','confirmed','']){
  sounds.length=0;const r={flowBefore:{phase:'art',entryStage}};
  c.playZoneRouletteBetVoice(r);c.playSpinSound(r);assert.equal(sounds[0][0],'normal.wav');assert.equal(sounds.length,1);
 }
 assert.match(html,/playZoneRouletteBetVoice\(resolved\);\s+playAimBetPresentation\(resolved\);/);
});
test('background music stays paused through result callbacks and resumes after result dismissal',()=>{
 let plays=0,pauses=0;const c=vm.createContext({superSpeedActive:false,NovaDirectAward:{busy:false},normalState:{resultCard:{kind:'zone'}},debugFastSpinActive:false,session:{active:false},bonusConfirmBgmHold:false,barBgmActive:false,battleBgmActive:false,bgm:{paused:true,play(){plays++;return Promise.resolve();}},pauseNormalBgm(){pauses++;},ensureNormalBgmSource:()=> 'at.wav',bgmOutputVolumeForSource:()=>.5,BGM_OUTPUT_SCALE:1,getAudio(){}});
 c.NovaInitialDuo={eligible:()=>false};c.presentedArtFlow=()=>null;
 vm.runInContext(fn('playNormalBgm'),c);c.playNormalBgm();c.playNormalBgm();assert.equal(plays,0);assert.equal(pauses,2);
 c.normalState.resultCard=null;c.normalState.pendingZoneResult={kind:'zone'};c.playNormalBgm();assert.equal(plays,0);
 c.normalState.pendingZoneResult=null;c.NovaDirectAward.busy=true;c.playNormalBgm();assert.equal(plays,0);
 c.NovaDirectAward.busy=false;c.playNormalBgm();assert.equal(plays,1);
});
test('normal SUPER NOVA plays once at SFX volume; reverse freeze omits this extra sound',()=>{
 for(const oumaFreeze of [false,true]){
  const sounds=[];const c=vm.createContext({superSpeedActive:false,isLadderShutterSpin:()=>false,currentSpin:{result:'SUPER_NOVA',resolved:{oumaFreeze}},sfxOutputVolume:()=>.5,playOneShotSound:(...args)=>sounds.push(args)});
  vm.runInContext(fn('playStopSound'),c);c.playStopSound(2,3);c.playStopSound(2,3);
  assert.deepEqual(sounds.map(args=>args.slice(0,2)),oumaFreeze?[]:[['assets/media/nova/super-nova-stop.wav',.5]]);
 }
});
test('eyecatch holds next spin until ended, without a fixed release timer',()=>{
 let audio;const c=vm.createContext({superSpeedActive:false,debugFastSpinActive:false,speedToBonusActive:false,A_TYPE_MODE:true,SEVEN_CONFIRM_SOUND_SRC:'seven',oneShotSoundCache:new Map(),bonusConfirmSoundPlaying:false,bonusConfirmSoundAudio:null,bonusConfirmSoundTimer:null,updateAutoUi(){},soundOutputVolume:(src,v)=>v,prepareCharacterVoiceAudio(){},setTimeout(){throw Error('unexpected timeout')},clearTimeout(){},Audio:class{constructor(src){audio=this;this.src=src;}pause(){}getAttribute(){return this.src;}play(){return Promise.resolve();}}});
 vm.runInContext(fn('clearBonusConfirmSoundLock')+'\n'+fn('playLockedBonusConfirmSound'),c);
 c.playLockedBonusConfirmSound('assets/media/nova/result-eyecatch.wav',.5);
 assert.equal(c.bonusConfirmSoundPlaying,true);assert.equal(audio.volume,.5);
 audio.onended();assert.equal(c.bonusConfirmSoundPlaying,false);
});
test('zone and AT result third stops skip result delay; ordinary games keep it',()=>{
 const code=html.match(/      const r=currentSpin.resolved;[^]*?const resultWaitMs =[^]*?;/)[0];
 for(const [before,after,expected] of [[{zone:'toto'},{zone:''},0],[{phase:'art'},{phase:'normal'},0],[{phase:'normal'},{phase:'normal'},1000]]){
  const c=vm.createContext({superSpeedActive:false,NovaLadder:{eligible:()=>false},currentSpin:{resolved:{flowBefore:before,flowAfter:after}},normalState:{},isPremiumBigFinalBonusSpin:()=>false,autoResultWaitMs:1000});vm.runInContext(code+';globalThis.wait=resultWaitMs;',c);assert.equal(c.wait,expected);
 }
});

test('shutter stops restart movement sound and third stop replaces it with close sound',()=>{
 const sounds=[];let paused=0;const c=vm.createContext({superSpeedActive:false,currentSpin:{result:'REPLAY'},isLadderShutterSpin:()=>true,sfxOutputVolume:()=>.5,oneShotSoundCache:new Map([['assets/media/nova/shutter.wav',{pause(){paused++;}}]]),playOneShotSound:(src)=>sounds.push(src)});
 vm.runInContext(fn('playStopSound'),c);
 c.playStopSound(2,1);c.playStopSound(0,2);c.playStopSound(1,3);
 assert.deepEqual(sounds,['assets/media/nova/shutter.wav','assets/media/nova/shutter.wav','assets/media/nova/shutter-close.wav']);assert.equal(paused,1);
 c.currentSpin.result='MISS';c.playStopSound(1,3);assert.equal(sounds.at(-1),'assets/media/nova/ouma-fail.wav');assert.equal(paused,2);
});

test('internal red seven confirmation plays patrol once before lineup',()=>{
 const played=[];const c=vm.createContext({superSpeedActive:false,debugFastSpinActive:false,speedToBonusActive:false,sfxOutputVolume:()=>.5,playLockedBonusConfirmSound:src=>played.push(src)});
 vm.runInContext(fn('playZoneInternalConfirmedSound'),c);
 const r={flowBefore:{phase:'art',entryStage:''},flowAfter:{phase:'art',entryStage:'seven'}};
 c.playZoneInternalConfirmedSound(r);c.playZoneInternalConfirmedSound(r);assert.equal(played.length,1);assert.equal(played[0],'assets/media/jag/cz_patrol_confirm.wav?v=19');
 c.playZoneInternalConfirmedSound({flowBefore:{phase:'art',entryStage:'seven'},flowAfter:{phase:'art',entryStage:'roulette'}});assert.equal(played.length,1);
 c.playZoneInternalConfirmedSound({flowBefore:{phase:'art'},flowAfter:{phase:'art'}});assert.equal(played.length,1);
});

test('final ladder award BET plays supplied audio instead of regular start sound',()=>{
 const sounds=[];const c=vm.createContext({superSpeedActive:false,normalState:{ladderAwardPresentation:{started:true,card:{pt:"1000"}}},isLadderShutterSpin:()=>false,SPIN_SOUND_SRC:'normal.wav',sfxOutputVolume:()=>.5,playOneShotSound:src=>sounds.push(src)});
 vm.runInContext(fn('playSpinSound'),c);c.playSpinSound();assert.equal(sounds[0],'assets/media/nova/ladder-final-award.wav');
 c.normalState.ladderAwardPresentation.card.pt='999';c.playSpinSound();assert.equal(sounds[1],'assets/media/nova/ladder-final-award-under1000.wav');
 c.normalState.ladderAwardPresentation.card.pt='2000';c.playSpinSound();assert.equal(sounds[2],'assets/media/nova/ladder-final-award.wav');
 c.normalState.ladderAwardPresentation=null;c.playSpinSound();assert.equal(sounds[3],'normal.wav');
});
