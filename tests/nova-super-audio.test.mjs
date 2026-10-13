import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
class Clip{
  constructor(src){this.src=src;this.paused=true;this.ended=false;this.currentTime=0;this.plays=0;this.pauses=0;}
  getAttribute(){return this.src;}setAttribute(k,v){this.src=v;}load(){}
  play(){this.plays++;this.paused=false;return Promise.resolve();}pause(){this.pauses++;this.paused=true;}
}
function setup(){
 const c=vm.createContext({Audio:Clip,oneShotSoundCache:new Map(),superSpeedActive:true,debugFastSpinActive:false,speedToBonusActive:false,premiumBigConfirmSilence:false,
   sfxOutputVolume:()=>.5,soundOutputVolume:(src,v)=>v,prepareCharacterVoiceAudio(){},currentSpin:null,payoutSound:new Clip('bell'),
   shouldSuppressPayoutSound:()=>false,payoutSoundSrcFor:()=> 'bell',payoutSoundScaleFor:()=>1,payoutOutputVolumeForSource:()=>.5});
 vm.runInContext(fn('playOneShotSound')+fn('playPayoutSound'),c);return c;
}
test('six-speed repeated stop/voice clips finish without pause/seek restarts, and can play again after ending',()=>{
 const c=setup(),audio=c.playOneShotSound('stop').audio;audio.currentTime=.12;
 for(let i=0;i<20;i++)assert.equal(c.playOneShotSound('stop').audio,audio);
 assert.equal(audio.plays,1);assert.equal(audio.pauses,1);assert.equal(audio.currentTime,.12);
 assert.equal(c.playOneShotSound('different').audio.plays,1);
 audio.paused=true;audio.ended=true;c.playOneShotSound('stop');assert.equal(audio.plays,2);assert.equal(audio.currentTime,0);
});
test('ordinary speed keeps every stop cue, and payout avoids repeated six-speed restarts',()=>{
 const c=setup();c.superSpeedActive=false;
 c.playOneShotSound('stop');c.playOneShotSound('stop');assert.equal(c.oneShotSoundCache.get('stop').plays,2);
 c.superSpeedActive=true;c.playPayoutSound();c.payoutSound.currentTime=.25;
 for(let i=0;i<20;i++)c.playPayoutSound();
 assert.equal(c.payoutSound.plays,1);assert.equal(c.payoutSound.currentTime,.25);
 c.superSpeedActive=false;c.playPayoutSound();assert.equal(c.payoutSound.plays,2);
});
