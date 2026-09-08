import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const h=fs.readFileSync('jag.html','utf8'),fn=h.match(/  function playStopSound\([^]*?\n  }/)[0];
test('ordinary super NOVA plays once but reverse freeze skips the lineup sound',()=>{
 for(const reverse of [false,true]){
  const sounds=[];const c=vm.createContext({currentSpin:{result:'SUPER_NOVA',resolved:{oumaFreeze:reverse}},STOP_SOUND_SRC:'normal',sfxOutputVolume:()=>1,playOneShotSound(src){sounds.push(src)}});vm.runInContext(fn,c);
  c.playStopSound(2,1);c.playStopSound(0,2);c.playStopSound(1,3);c.playStopSound(1,3);
  assert.deepEqual(sounds,reverse?['normal','normal']:['normal','normal','assets/media/nova/super-nova-stop.wav']);
 }
});
