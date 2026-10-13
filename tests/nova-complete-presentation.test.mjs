import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {loadVoiceCatalog} from './helpers/voice-catalog.mjs';
const source=fs.readFileSync('nova-game.js','utf8'),fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
function setup(){
 let root,scale=1,profit=0;const played=[],stopped=[],elements=[];
 const box=(x,y,w,h)=>({getBoundingClientRect:()=>rect(10+x*scale,20+y*scale,w*scale,h*scale)});
 const reels=box(200,500,600,300),lamps=box(180,340,650,150),status=box(220,320,560,24);
 const host={...box(0,0,1000,1200),offsetWidth:1000,querySelector:()=>reels,querySelectorAll:()=>[lamps,status],append:n=>{root=n;}};
 const c=vm.createContext({document:{getElementById:()=>host,createElement:()=>({style:{},setAttribute(){}})},window:{addEventListener(){}},
  requestAnimationFrame:f=>{f();return 1;},cancelAnimationFrame(){},
  COMPLETE_TRIAL_ENABLED:true,settings:{setting:6},completeTrialState:{},completeLimitPt:()=>10000,completeTrialProfit:()=>profit,isCompleteLockEnabled:()=>true,
  stopAutoPlay:()=>stopped.push('auto'),stopSpeedToBonus:()=>{c.speedToBonusActive=false;stopped.push('speed');},stopDebugFastSpin:()=>{c.debugFastSpinActive=false;stopped.push('fast');},
  showMessage(){},showOverlay(){},log(){},persistState(){},formatSigned:String,
  pauseNormalBgm(){},stopBarBgm(){},stopBattleBgm(){},bonusConfirmSoundAudio:null,clearBonusConfirmSoundLock(){},
  clearCzIntroVoiceHold(){},clearComebackIntroVoiceHold(){},aimWinAudios:new Set(),oumaIntroAudio:null,oumaReverseAudio:null,
  debugFastSpinActive:false,speedToBonusActive:false,superSpeedActive:false,premiumBigConfirmSilence:false,oneShotSoundCache:new Map(),voiceOutputVolume:()=>.7,sfxOutputVolume:()=>.5,soundOutputVolume:(src,v)=>v,prepareCharacterVoiceAudio(){},
  Audio:class {constructor(src){this.src=src;this.currentTime=0;elements.push(this);}getAttribute(){return this.src;}pause(){this.paused=true;}play(){this.paused=false;played.push(this.src);return Promise.resolve();}},
  updateDisplay:()=>c.syncCompletePresentation()
 });
 vm.runInContext(fs.readFileSync('nova-complete-presentation.js','utf8'),c);vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),c);
 c.MODE_EVENT_VOICE_SRCS=loadVoiceCatalog(c).MODE_EVENT_VOICE_SRCS;
 for(const name of ['isCompleteTrialLocked','syncCompletePresentation','updateCompleteTrialState','playOneShotSound'])vm.runInContext(fn(name),c);
 vm.runInContext('Math.random=()=>{throw Error("Completion presentation must not consume RNG")}',c);
 return {c,played,stopped,elements,root:()=>root,setProfit:v=>profit=v,setScale:v=>scale=v};
}
test('only net completion announces once and displays both Japanese lines, regardless of prior MY',()=>{
 for(const my of [false,true]){
  const h=setup(),c=h.c;if(my)c.completeTrialState.lowestNet=-8000;
  h.setProfit(my?7000:9999);assert(!c.updateCompleteTrialState());assert.equal(h.played.length,0);assert(!c.NovaCompletePresentation.active);
  h.setProfit(10000);assert(c.updateCompleteTrialState());c.updateCompleteTrialState();c.updateDisplay();
  assert.equal(c.completeTrialState.reason,'net');assert.deepEqual(h.stopped,['auto','speed','fast']);
  assert.deepEqual(h.played,['assets/media/nova/sosuke-complete.wav']);assert(!h.root().hidden);
  assert.match(h.root().innerHTML,/コンプリート機能が発動しました/);assert.match(h.root().innerHTML,/本日の遊技は終了となります/);
 }
});
test('the opaque screen spans lamps and reels using cabinet-local coordinates, including mobile scale',()=>{
 const h=setup();h.c.NovaCompletePresentation.sync(true);
 const first={...h.root().style};assert.equal(first.left,'176px');assert.equal(first.top,'316px');assert.equal(first.width,'658px');assert.equal(first.height,'488px');
 h.setScale(.4);h.c.NovaCompletePresentation.layout();for(const key of ['left','top','width','height'])assert(Math.abs(parseFloat(h.root().style[key])-parseFloat(first[key]))<.0001,key);
});
test('a saved COMPLETE restores silently; resetting hides the screen and cancels its sound',()=>{
 const h=setup(),c=h.c;c.completeTrialState={locked:true};c.syncCompletePresentation();assert(!h.root().hidden);assert.equal(h.played.length,0);
 c.completeTrialState={};c.syncCompletePresentation();assert(h.root().hidden);
 h.setProfit(10000);c.updateCompleteTrialState();const sound=h.elements.at(-1);assert(!sound.paused);assert.equal(sound.loop,false);
 c.completeTrialState={};c.syncCompletePresentation();assert(sound.paused);assert(h.root().hidden);
});
test('completion stops fast players before announcing; later result/effect sounds cannot replace the terminal voice',()=>{
 const h=setup(),c=h.c;c.debugFastSpinActive=true;c.speedToBonusActive=true;h.setProfit(10000);c.updateCompleteTrialState();
 c.playOneShotSound('assets/media/nova/result-eyecatch.wav');assert.equal(h.played.length,1);
  vm.runInContext(fn('playLockedBonusConfirmSound'),c);c.playLockedBonusConfirmSound('assets/media/nova/sosuke-sortie-entry.wav',.7);assert.equal(h.played.length,1);
  // This body-level overlay otherwise sits above the cabinet's stacking context.
  vm.runInContext(fn('showOverlay'),c);c.showOverlay('HOLD');
});
test('missing audio never removes the terminal screen or unlocks play',()=>{
 const h=setup();h.c.playOneShotSound=()=>undefined;h.setProfit(10000);assert(h.c.updateCompleteTrialState());assert(!h.root().hidden);assert(h.c.isCompleteTrialLocked());
});
