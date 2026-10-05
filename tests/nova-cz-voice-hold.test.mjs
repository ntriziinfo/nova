import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(){
 const timers=new Map();let nextTimer=0,started=0,stopped=0,queued=0;
 class Audio extends EventTarget{
  constructor(src){super();this.src=src;this.currentTime=0;this.ended=false;this.pauses=0;}
  getAttribute(){return this.src;}setAttribute(k,v){this.src=v;}load(){}
  pause(){this.pauses++;}play(){return this.promise;}
 }
 const c=vm.createContext({Audio,czIntroVoiceHold:null,superSpeedActive:false,debugFastSpinActive:false,speedToBonusActive:false,
  speedModeSpinRequest:false,premiumBigConfirmSilence:false,oneShotSoundCache:new Map(),sfxOutputVolume:()=>.5,
  soundOutputVolume:(src,v)=>v,prepareCharacterVoiceAudio(){},
  setTimeout:(f,ms)=>{timers.set(++nextTimer,{f,ms});return nextTimer;},clearTimeout:id=>timers.delete(id),
  canUsePlayState:()=>true,NovaLadder:{},NovaAim:{},NovaDirectAward:{},NovaResults:{},normalState:{},oumaPresentation:null,
  isSpinning:false,bonusEndBgmPlaying:false,bonusConfirmSoundPlaying:false,canPlayCompleteTrial:()=>true,
  stopAllReels:()=>stopped++,autoPlay:true,stopSuperSpeedIfNeeded:()=>false,isRogiThirdStopHoldActive:()=>false,
  session:{active:false},A_TYPE_MODE:true,queueAutoStep:()=>queued++,autoDelayMs:()=>100,
  startNextBet:()=>started++
 });
 for(const name of ['clearCzIntroVoiceHold','isCzIntroVoiceHolding','holdCzIntroVoice','playOneShotSound','runAutoStep'])vm.runInContext(fn(name),c);
 // Exercise the real BET entry guards; the sentinel is where game mutation would begin.
 const prefix=source.slice(source.indexOf('  async function spin(options={}){'),source.indexOf('    // A queued ending (including after a zone result/reload)'));
 vm.runInContext(prefix+'startNextBet();\n  }\nMath.random=()=>{throw Error("Unexpected lottery draw");};',c);
 function voice(promise){const audio=new Audio('voice.wav');audio.promise=promise;c.oneShotSoundCache.set(audio.src,audio);c.holdCzIntroVoice(c.playOneShotSound(audio.src));return audio;}
 return {c,timers,voice,counts:()=>({started,stopped,queued})};
}

test('manual BET and AUTO wait through loading and playback until ended; current reels can stop',async()=>{
 const h=setup(),{c}=h;let loaded;
 const audio=h.voice(new Promise(resolve=>loaded=resolve));
 await c.spin();c.runAutoStep();assert.deepEqual(h.counts(),{started:0,stopped:0,queued:1});
 c.isSpinning=true;await c.spin();assert.equal(h.counts().stopped,1);c.isSpinning=false;
 loaded();await Promise.resolve();assert(c.isCzIntroVoiceHolding(),'play() resolution is not the end');
 audio.currentTime=1;audio.dispatchEvent(new Event('timeupdate'));await c.spin();assert.equal(h.counts().started,0);
 audio.ended=true;audio.dispatchEvent(new Event('ended'));assert.equal(h.timers.size,0);
 await c.spin();c.runAutoStep();assert.equal(h.counts().started,2);
});

test('super speed bypasses the voice hold without changing or restarting its playback',async()=>{
 const h=setup(),{c}=h,audio=h.voice(Promise.resolve());
 c.superSpeedActive=true;await c.spin();assert.equal(h.counts().started,1);assert.equal(audio.pauses,1);
 c.superSpeedActive=false;await c.spin();assert.equal(h.counts().started,1);
 audio.dispatchEvent(new Event('ended'));await c.spin();assert.equal(h.counts().started,2);
});

test('playback rejection, media errors and stalled loading release the hold',async()=>{
 for(const failure of ['rejection','error','stalled']){
  const h=setup(),audio=h.voice(failure==='rejection'?Promise.reject(new Error('NotAllowedError')):new Promise(()=>{}));
  if(failure==='error')audio.dispatchEvent(new Event('error'));
  if(failure==='stalled'){
   const timer=[...h.timers.values()][0];assert.equal(timer.ms,10000);
   audio.dispatchEvent(new Event('timeupdate'));assert.equal([...h.timers.values()][0],timer,'unchanged time does not extend stalled playback');timer.f();
  }
  await Promise.resolve();assert.equal(h.c.isCzIntroVoiceHolding(),false);assert.equal(h.timers.size,0);assert.equal(audio.pauses,2);
  await h.c.spin();assert.equal(h.counts().started,1);
 }
});

test('reset cancels playback; stale end, timeout and rejection cannot release a new CZ hold',async()=>{
 const h=setup();let reject;
 const old=h.voice(new Promise((resolve,fail)=>reject=fail)),stale=[...h.timers.values()][0].f;
 h.c.clearCzIntroVoiceHold(true);assert.equal(old.pauses,2);assert.equal(h.timers.size,0);
 const next=h.voice(Promise.resolve());old.dispatchEvent(new Event('ended'));stale();reject(new Error('old playback cancelled'));
 await Promise.resolve();assert(h.c.isCzIntroVoiceHolding());assert.equal(h.timers.size,1);
 next.dispatchEvent(new Event('ended'));assert.equal(h.c.isCzIntroVoiceHolding(),false);
 for(const name of ['resetGame','resetRuntimeForMorning'])assert.match(fn(name),/clearCzIntroVoiceHold\(true\)/);
});
