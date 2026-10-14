import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const h=readGameSource(),fn=n=>h.match(new RegExp('  function '+n+'\\([^]*?\\n  }'))[0];
test('cancelled reverse playback cannot start when its play promise resolves later',async()=>{
 let resolve,created=0,paused=0,started=0;const ctx=vm.createContext({watchPlaybackProgress:()=>()=>{},Audio:function(){created++;this.play=()=>new Promise(r=>resolve=r);this.pause=()=>paused++;this.removeAttribute=()=>{};this.load=()=>{};},performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},sfxOutputVolumeForSource:()=>.93,SFX_OUTPUT_SCALE:1,reels:[{}, {}, {}],REEL_STRIPS:[[],[],[]],cellHtml(){},NovaReelMotion:{startSynced(){started++;}},currentSpin:{resolved:{oumaFreeze:true},grid:[[],[],[]]}});
 vm.runInContext('var oumaReverseAudio=null,oumaReverseLoadTimer=null;'+fn('clearOumaReverseAudio')+fn('startOumaReverseAudio'),ctx);
 ctx.startOumaReverseAudio({resolved:{oumaFreeze:false}});assert.equal(created,0);
 ctx.startOumaReverseAudio(ctx.currentSpin);assert.equal(created,1);assert.equal(ctx.oumaReverseAudio.volume,.93);
 ctx.clearOumaReverseAudio();resolve();await Promise.resolve();await Promise.resolve();assert.equal(started,0);assert.equal(ctx.oumaReverseAudio,null);assert.ok(paused>=2);
});

test('reverse audio stalling after playback begins switches its reel clock to elapsed time',async()=>{
 let now=0,audio,onStall,watchCancelled=0;const clocks=[],timers=new Map();let id=0;
 const c=vm.createContext({watchPlaybackProgress(a,cb){onStall=cb;return ()=>watchCancelled++;},
  Audio:function(){audio=this;this.currentTime=0;this.play=()=>Promise.resolve();this.pause=()=>{};},
  performance:{now:()=>now},setTimeout(cb){timers.set(++id,cb);return id;},clearTimeout(id){timers.delete(id);},
  sfxOutputVolumeForSource:()=>.9,SFX_OUTPUT_SCALE:1,reels:[{},{},{}],REEL_STRIPS:[[],[],[]],cellHtml(){},
  NovaReelMotion:{startSynced(i,reel,strip,column,reverse,html,clock){clocks.push(clock);}},
  currentSpin:{resolved:{oumaFreeze:true},grid:[[],[],[]]}});
 vm.runInContext('var oumaReverseAudio=null,oumaReverseLoadTimer=null,oumaStoppedTops=[0,0,0];'+fn('clearOumaReverseAudio')+fn('startOumaReverseAudio'),c);
 c.startOumaReverseAudio(c.currentSpin);await Promise.resolve();
 assert.equal(clocks.length,3);audio.currentTime=1.2;assert.equal(clocks[0](),1.2);
 now=15000;onStall();now=16000;assert.equal(clocks[0](),2.2);assert.equal(clocks.length,3);assert(watchCancelled>0);
});

test('a failed reverse SE cannot leave the next zero-chain BET waiting for an ended event',()=>{
 let audio,queued=0;const machine={dataset:{}},button={},flow={zone:'ouma',oumaPending:true};
 const c=vm.createContext({watchPlaybackProgress:()=>()=>{},
  Audio:function(){audio=this;this.currentTime=0;this.ended=false;this.paused=false;this.play=()=>new Promise(()=>{});this.pause=()=>{this.paused=true;};this.removeAttribute=()=>{};this.load=()=>{};},
  performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},sfxOutputVolumeForSource:()=>1,SFX_OUTPUT_SCALE:1,
  reels:[0,1,2].map(()=>({style:{setProperty(){}}})),REEL_STRIPS:[[],[],[]],cellHtml(){},NovaReelMotion:{startSynced(){}},
  currentSpin:{resolved:{oumaFreeze:true},grid:[[],[],[]]},normalState:{flow},debugFastSpinActive:false,
  isCompleteTrialLocked:()=>false,clearOumaPresentation(){},stopSpeedToBonus(){},
  document:{getElementById:()=>machine},$:()=>button,stopBtns:[{}],autoPlay:true,
  NovaArt:{zoneName:()=>'逢魔'},queueAutoStep(){queued++;},autoDelayMs:()=>100});
 vm.runInContext('var oumaPresentation=null,oumaReverseAudio=null,oumaReverseLoadTimer=null,oumaStoppedTops=[0,0,0];'+['clearOumaReverseAudio','startOumaReverseAudio','scheduleOumaZeroChain'].map(fn).join('\n'),c);
 c.startOumaReverseAudio(c.currentSpin);audio.onerror();
 c.currentSpin=null;c.scheduleOumaZeroChain();
 assert.equal(machine.dataset.oumaFreeze,'bet');assert.equal(button.disabled,false);assert.equal(queued,1);
});
