import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source=fs.readFileSync('nova-game.js','utf8');
function fn(name){
 const found=source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'));
 assert(found,`missing ${name}`);
 return found[0];
}

test('both reset paths clear every transient presentation without touching lottery state',()=>{
 for(const name of ['resetGame','resetRuntimeForMorning']){
  const body=fn(name);
  assert.match(body,/NovaCzPresentation\.reset\(\);/);
  assert.match(body,/NovaImpurityHint\.arm\(''\);/);
  assert.match(body,/NovaImpurityHint\.hide\(\);/);
  assert.match(body,/NovaImpurityHint\.syncRelease\(null\);/);
  assert.match(body,/hideOverlay\(\);/);
  assert.match(body,/stopTransientPresentationAudio\(\);/);
 }
 const confirmedReset=fn('resetGame');
 assert(confirmedReset.indexOf('if(!confirm(')<confirmedReset.indexOf('NovaCzPresentation.reset();'),'cancelled reset must leave the current presentation intact');
 const spin=source.slice(source.indexOf('  async function spin(options={})'),source.indexOf('  function stopAllReels'));
 assert.match(spin,/const resumeAfterCzFailure=NovaCzPresentation\.failureActive;\s*NovaCzPresentation\.reset\(\);\s*if\(resumeAfterCzFailure\)playNormalBgm\(\);/);
 assert.doesNotMatch(fn('stopTransientPresentationAudio'),/Math\.random|NovaNormal|draw|resolve/);
});

test('reset-only audio cleanup stops locked confirmation and every aim-win clone',()=>{
 const clearedTimeouts=[],clearedIntervals=[],released=[];let uiUpdates=0;
 const makeAudio=fadeTimer=>({
  paused:false,currentTime:4,playbackRate:6,onended(){},onerror(){},aimFadeTimer:fadeTimer,
  pause(){this.paused=true;this.pauseCalls=(this.pauseCalls||0)+1;},
  novaCancelPlaybackWatch(){this.watchCancelled=true;}
 });
 const locked=makeAudio(undefined),aimA=makeAudio(11),aimB=makeAudio(undefined);
 const context={
  bonusConfirmSoundPlaying:true,bonusConfirmSoundTimer:7,bonusConfirmSoundAudio:locked,
  aimWinAudios:new Set([aimA,aimB]),clearTimeout:id=>clearedTimeouts.push(id),clearInterval:id=>clearedIntervals.push(id),
  updateAutoUi(){uiUpdates++;},releaseCharacterVoiceAudio:audio=>released.push(audio)
 };
 vm.createContext(context);
 vm.runInContext(fn('clearBonusConfirmSoundLock')+'\n'+fn('stopTransientPresentationAudio'),context);
 context.stopTransientPresentationAudio();
 assert.equal(locked.paused,true);assert.equal(locked.currentTime,0);assert.equal(locked.playbackRate,1);assert.equal(locked.watchCancelled,true);
 assert.equal(context.bonusConfirmSoundAudio,null);assert.equal(context.bonusConfirmSoundPlaying,false);assert.deepEqual(clearedTimeouts,[7]);
 assert.equal(uiUpdates,1);
 for(const audio of [aimA,aimB]){assert.equal(audio.paused,true);assert.equal(audio.currentTime,0);assert.equal(audio.onended,null);assert.equal(audio.onerror,null);}
 assert.deepEqual(clearedIntervals,[11]);assert.equal(context.aimWinAudios.size,0);assert.deepEqual(released,[locked,aimA,aimB]);
});

test('a stale overlay timer cannot hide a newer overlay and reset hides immediately',()=>{
 const classes=new Set(),timers=[],cleared=[];
 const overlay={style:{setProperty(){}},classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}};
 Object.defineProperty(overlay,'offsetWidth',{get(){return 100;}});
 const overlayText={textContent:''},target={getBoundingClientRect:()=>({left:0,top:0,width:600,height:400})};
 const context={
  overlayHideTimer:null,overlayEpoch:0,debugFastSpinActive:false,speedToBonusActive:false,normalState:{},
  NovaSortie:{label:value=>value},isRogiThirdStopHoldActive:()=>false,
  $:id=>id==='overlay'?overlay:overlayText,document:{querySelector:()=>target},window:{innerWidth:1200},
  setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout:id=>cleared.push(id)
 };
 vm.createContext(context);vm.runInContext(fn('hideOverlay')+'\n'+fn('showOverlay'),context);
 context.showOverlay('old');const oldTimer=timers[0];
 context.showOverlay('new');const newTimer=timers[1];
 assert.equal(overlayText.textContent,'new');assert(classes.has('show'));assert.deepEqual(cleared,[1]);
 oldTimer.fn();assert(classes.has('show'),'old timer must not hide the new overlay');
 newTimer.fn();assert(!classes.has('show'));
 context.showOverlay('reset');const resetTimer=timers.at(-1);context.hideOverlay();assert(!classes.has('show'));
 resetTimer.fn();assert(!classes.has('show'));
});

test('page cache keys load the reset-safe presentation scripts',()=>{
 const page=fs.readFileSync('jag.html','utf8');
 assert.match(page,/nova-cz-push\.js\?v=20261030-presentation-reset/);
 assert.match(page,/nova-game\.js\?v=20261030-auto-rtp/);
});
