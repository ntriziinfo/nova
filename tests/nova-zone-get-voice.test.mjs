import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const patrol='assets/media/jag/cz_patrol_confirm.wav?v=19',voice='assets/media/nova/sosuke-zone-get.wav';
const won=()=>({flowBefore:{phase:'art',atPrelude:{left:1}},flowAfter:{phase:'art',entryStage:'seven'}});
function setup(){
 const played=[],timers=[],watches=[];
 class Audio{
  constructor(src){this.src=src;}pause(){}getAttribute(){return this.src;}
  play(){played.push({src:this.src,volume:this.volume,loop:this.loop});return Promise.resolve();}
 }
 const c=vm.createContext({Audio,debugFastSpinActive:false,speedToBonusActive:false,superSpeedActive:false,A_TYPE_MODE:true,
  SEVEN_CONFIRM_SOUND_SRC:'seven',oneShotSoundCache:new Map(),bonusConfirmSoundPlaying:false,bonusConfirmSoundAudio:null,bonusConfirmSoundTimer:null,
  sfxOutputVolume:()=>.4,voiceOutputVolume:()=>.7,soundOutputVolume:(s,v)=>v,prepareCharacterVoiceAudio(){},updateAutoUi(){},
  setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},watchPlaybackProgress:(a,f)=>{watches.push(f);return ()=>{};}
 });
 vm.runInContext(source.match(/  const MODE_EVENT_VOICE_SRCS=[^\n]+/)[0],c);
 for(const name of ['clearBonusConfirmSoundLock','playLockedBonusConfirmSound','playZoneInternalConfirmedSound','playCzConfirmedSound'])vm.runInContext(fn(name),c);
 vm.runInContext('Math.random=()=>{throw Error("Audio must not consume game RNG");}',c);
 return {c,played,timers,watches};
}

test('AT confirmation chains patrol then one voice, retaining the play lock until both end',async()=>{
 const {c,played}=setup(),r=won(),before=JSON.stringify([r.flowBefore,r.flowAfter]);
 c.playZoneInternalConfirmedSound(r);c.playZoneInternalConfirmedSound(r);
 await Promise.resolve();assert.deepEqual(played,[{src:patrol,volume:.4,loop:false}]);
 assert(c.bonusConfirmSoundPlaying);const end=c.bonusConfirmSoundAudio.onended;end();
 assert.deepEqual(played,[{src:patrol,volume:.4,loop:false},{src:voice,volume:.7,loop:false}]);
 assert(c.bonusConfirmSoundPlaying);end();assert.equal(played.length,2);
 c.bonusConfirmSoundAudio.onended();assert(!c.bonusConfirmSoundPlaying);
 assert.equal(JSON.stringify([r.flowBefore,r.flowAfter]),before);
});

test('errors and stalled playback release the lock without announcing a completed patrol',()=>{
 for(const type of ['error','stall']){
  const {c,played,watches}=setup();c.playZoneInternalConfirmedSound(won());
  if(type==='error')c.bonusConfirmSoundAudio.onerror({type:'error'});else watches[0]();
  assert(!c.bonusConfirmSoundPlaying);assert.equal(played.length,1);
 }
});

test('reset or replacement cancels the follow-up; stale callbacks cannot finish a newer cached playback',()=>{
 const {c,played}=setup();c.playZoneInternalConfirmedSound(won());
 const old=c.bonusConfirmSoundAudio.onended;c.clearBonusConfirmSoundLock();old();assert.equal(played.length,1);
 c.playZoneInternalConfirmedSound(won());old();assert.equal(played.length,2);assert(c.bonusConfirmSoundPlaying);
 c.bonusConfirmSoundAudio.onended();assert.equal(played.at(-1).src,voice);
});

test('CZ, fixed initial points, fake preludes and lineup games do not add the AT acquisition voice',()=>{
 const {c,played}=setup();
 c.playCzConfirmedSound({bonusHit:true});c.bonusConfirmSoundAudio.onended();
 c.playZoneInternalConfirmedSound({flowBefore:{phase:'art',initialStage:'wait'},flowAfter:{phase:'art',entryStage:'seven'}});
 c.bonusConfirmSoundAudio.onended();
 for(const r of [{flowBefore:{phase:'normal'},flowAfter:{entryStage:'seven'}},{flowBefore:{phase:'art'},flowAfter:{phase:'art'}},{flowBefore:{phase:'art',entryStage:'seven'},flowAfter:{entryStage:'roulette'}}])c.playZoneInternalConfirmedSound(r);
 assert.deepEqual(played.map(x=>x.src),[patrol,patrol]);
});

test('debug simulation and speed-to-bonus remain silent',()=>{
 const {c,played}=setup();
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){c[flag]=true;c.playZoneInternalConfirmedSound(won());c[flag]=false;}
 assert.equal(played.length,0);
});
