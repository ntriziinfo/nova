import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(){
 let now=0,id=0;const timers=new Map(),audios=[];
 const c=vm.createContext({performance:{now:()=>now},
  setTimeout(cb,ms){timers.set(++id,{cb,due:now+ms});return id;},clearTimeout(id){timers.delete(id);},
  Audio:class{constructor(src){this.src=src;this.currentTime=0;this.ended=false;this.paused=true;audios.push(this);}pause(){this.paused=true;}play(){this.paused=false;return new Promise(()=>{});}getAttribute(){return this.src;}},
  superSpeedActive:false,debugFastSpinActive:false,speedToBonusActive:false,A_TYPE_MODE:true,
  SEVEN_CONFIRM_SOUND_SRC:'seven',oneShotSoundCache:new Map(),bonusConfirmSoundPlaying:false,
  bonusConfirmSoundAudio:null,bonusConfirmSoundTimer:null,updateAutoUi(){},soundOutputVolume:(src,v)=>v,prepareCharacterVoiceAudio(){}});
 for(const name of ['watchPlaybackProgress','clearBonusConfirmSoundLock','playLockedBonusConfirmSound'])vm.runInContext(fn(name),c);
 function advance(ms){const end=now+ms;while(true){const next=[...timers.entries()].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];if(!next)break;now=next[1].due;timers.delete(next[0]);next[1].cb();}now=end;}
 return {c,timers,audios,advance};
}
test('pending audio play promise recovers its AUTO lock after ten seconds without progress',()=>{
 const t=setup();t.c.playLockedBonusConfirmSound('result',.5);
 t.advance(9999);assert.equal(t.c.bonusConfirmSoundPlaying,true);
 t.advance(1);assert.equal(t.c.bonusConfirmSoundPlaying,false);assert.equal(t.audios[0].paused,true);assert.equal(t.timers.size,0);
});
test('healthy long audio is never cut short, while a later stall is recovered',()=>{
 const t=setup();t.c.playLockedBonusConfirmSound('result',.5);const audio=t.audios[0];
 for(let sec=1;sec<=40;sec++){audio.currentTime=sec;t.advance(1000);assert.equal(t.c.bonusConfirmSoundPlaying,true);}
 t.advance(9999);assert.equal(t.c.bonusConfirmSoundPlaying,true);t.advance(1);
 assert.equal(t.c.bonusConfirmSoundPlaying,false);assert.equal(audio.paused,true);
});
test('ended/error and cancellation remove the watchdog; old waits cannot release a newer clip',()=>{
 for(const event of ['onended','onerror']){
  const t=setup();t.c.playLockedBonusConfirmSound('result',.5);t.audios[0][event]();
  assert.equal(t.c.bonusConfirmSoundPlaying,false);assert.equal(t.timers.size,0);
 }
 const t=setup();t.c.playLockedBonusConfirmSound('first',.5);const old=[...t.timers.values()][0].cb;
 t.c.playLockedBonusConfirmSound('second',.5);old();assert.equal(t.c.bonusConfirmSoundPlaying,true);assert.equal(t.audios[1].paused,false);
 t.c.clearBonusConfirmSoundLock();assert.equal(t.timers.size,0);t.advance(20000);assert.equal(t.c.bonusConfirmSoundPlaying,false);
});
test('missing ended event also releases the completed audio',()=>{
 const t=setup();t.c.playLockedBonusConfirmSound('result',.5);t.audios[0].ended=true;t.advance(1000);
 assert.equal(t.c.bonusConfirmSoundPlaying,false);assert.equal(t.timers.size,0);
});
