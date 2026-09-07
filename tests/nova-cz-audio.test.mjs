import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';
const source=fs.readFileSync('jag.html','utf8');
const fn=source.match(/  function playCzCountdownOnLever\([^]*?\n  }/)[0];
const played=[];const ctx=vm.createContext({voiceOutputVolume:()=>.5,playOneShotSound:(src,volume)=>played.push({src,volume})});vm.runInContext(fn,ctx);
test('CZ and strong CZ play exactly the remaining 3, 2 and final game clips',()=>{
 for(const phase of ['cz','strong_cz']){
  played.length=0;for(let remaining=20;remaining>=1;remaining--)ctx.playCzCountdownOnLever({flowBefore:{phase,remaining}});
  assert.deepEqual(played.map(p=>p.src),['assets/media/jag/cz_remaining_3.wav','assets/media/jag/cz_remaining_2.wav','assets/media/jag/cz_last.wav']);
  assert.ok(played.every(p=>p.volume===.5));
 }
});
test('normal, ART, bonus pending, and missing flow do not play countdown',()=>{
 played.length=0;for(const phase of ['normal','art'])ctx.playCzCountdownOnLever({flowBefore:{phase,remaining:1}});
 ctx.playCzCountdownOnLever({flowBefore:{phase:'cz',remaining:1},bonusPendingAtStart:true});ctx.playCzCountdownOnLever({});assert.equal(played.length,0);
});
test('provided audio is copied byte-for-byte',()=>{
 const pairs=[['3.wav','cz_remaining_3.wav'],['2.wav','cz_remaining_2.wav'],['ラスト.wav','cz_last.wav']];
 for(const [original,dest] of pairs){
  const path='C:/Users/nitro/Dropbox/NOVA台用イラスト/'+original;
  if(!fs.existsSync(path))continue;
  const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  assert.equal(hash(path),hash('assets/media/jag/'+dest));
 }
});
