import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(){
 const classes=new Set(),button={textContent:'BET',disabled:false,dataset:{},attrs:{},classList:{toggle(k,v){if(v)classes.add(k);else classes.delete(k);}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}},badge={hidden:true},timers=new Map();let id=0;
 const c=vm.createContext({$:name=>name==='spinBtn'?button:name==='novaAudioWait'?badge:null,bonusEndBgmPlaying:false,bonusConfirmSoundPlaying:false,comebackIntroVoiceHold:null,czIntroVoiceHold:null,isSpinning:false,spinCanStop:false,superSpeedActive:false,complete:false,premium:false,NovaSortie:{busy:false},
  setTimeout:(f,ms)=>{timers.set(++id,{f,ms});return id;},clearTimeout:i=>timers.delete(i)});
 vm.runInContext('function isCompleteTrialLocked(){return complete;} function isPremiumBigConfirmStopLocked(){return premium;} Math.random=()=>{throw Error("Unexpected RNG draw");};',c);
 for(const name of ['syncAudioWaitUi','isCzIntroVoiceHolding','clearCzIntroVoiceHold','holdCzIntroVoice','clearComebackIntroVoiceHold','waitForComebackIntroVoice'])vm.runInContext(fn(name),c);
 class Audio extends EventTarget{currentTime=0;ended=false;pause(){}}
 return {c,button,badge,classes,timers,Audio};
}
test('audio status reflects overlapping gates and restores BET/STOP/WAIT without changing input locks',()=>{
 const {c,button,badge}=setup();
 c.bonusConfirmSoundPlaying=true;c.syncAudioWaitUi();assert(!badge.hidden);assert.equal(button.textContent,'WAIT');assert.equal(button.attrs['aria-label'],'WAIT 音声再生中');assert.equal(button.disabled,false);
 c.bonusEndBgmPlaying=true;c.bonusConfirmSoundPlaying=false;c.syncAudioWaitUi();assert(!badge.hidden);
 c.bonusEndBgmPlaying=false;c.syncAudioWaitUi();assert(badge.hidden);assert.equal(button.textContent,'BET');assert.equal(button.attrs['aria-label'],undefined);
 for(const [spinning,stoppable,sortie,expected] of [[true,true,false,'STOP'],[true,false,false,'WAIT'],[false,false,true,'WAIT']]){
  c.isSpinning=spinning;c.spinCanStop=stoppable;c.NovaSortie.busy=sortie;button.disabled=true;
  c.bonusConfirmSoundPlaying=true;c.syncAudioWaitUi();c.bonusConfirmSoundPlaying=false;c.syncAudioWaitUi();
  assert.equal(button.textContent,expected);assert.equal(button.disabled,true);assert(badge.hidden);
 }
});
test('CZ voice only marks the next BET as waiting, and completion takes priority',()=>{
 const {c,button,badge}=setup();c.czIntroVoiceHold={};c.syncAudioWaitUi();assert(!badge.hidden);
 c.isSpinning=true;c.spinCanStop=true;c.syncAudioWaitUi();assert(badge.hidden);assert.equal(button.textContent,'STOP');
 c.isSpinning=false;c.superSpeedActive=true;c.syncAudioWaitUi();assert(badge.hidden);
 c.bonusConfirmSoundPlaying=true;c.syncAudioWaitUi();assert(!badge.hidden);
 c.complete=true;c.syncAudioWaitUi();assert(badge.hidden);assert.equal(button.textContent,'COMPLETE');
});
test('CZ and comeback voice lifecycle hides WAIT on end, error, stalled playback and reset',async()=>{
 for(const mode of ['cz','comeback'])for(const release of ['ended','error','stalled','reset','rejected']){
  const {c,button,badge,timers,Audio}=setup(),audio=new Audio();
  const playback={audio,promise:release==='rejected'?Promise.reject(Error('blocked')):new Promise(()=>{})};
  const wait=mode==='cz'?c.holdCzIntroVoice(playback):c.waitForComebackIntroVoice(playback);
  assert(!badge.hidden);assert.equal(button.textContent,'WAIT');
  if(release==='ended'){audio.ended=true;audio.dispatchEvent(new Event('ended'));}
  if(release==='error')audio.dispatchEvent(new Event('error'));
  if(release==='stalled')[...timers.values()][0].f();
  if(release==='reset'){if(mode==='cz')c.clearCzIntroVoiceHold(true);else c.clearComebackIntroVoiceHold();}
  await wait;await Promise.resolve();assert(badge.hidden);assert.equal(button.textContent,'BET');assert.equal(timers.size,0);
 }
});
