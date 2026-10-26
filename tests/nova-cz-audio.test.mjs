import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';
const source=readGameSource();
const fn=source.match(/  function playCzCountdownOnLever\([^]*?\n  }/)[0];
const played=[];const ctx=vm.createContext({voiceOutputVolume:()=>.5,playOneShotSound:(src,volume)=>played.push({src,volume})});vm.runInContext(fn,ctx);
test('CZ and strong CZ play exactly the post-lever 3, 2, 1 and final game clips',()=>{
 for(const phase of ['cz','strong_cz']){
  played.length=0;for(let remaining=20;remaining>=1;remaining--)ctx.playCzCountdownOnLever({flowBefore:{phase,remaining}});
  assert.deepEqual(played.map(p=>p.src),['assets/media/jag/cz_remaining_3.wav?v=count2','assets/media/jag/cz_remaining_2.wav?v=count2','assets/media/nova/cz_remaining_1.wav','assets/media/jag/cz_last.wav?v=count2']);
  assert.ok(played.every(p=>p.volume===.5));
 }
});
test('normal, ART, bonus pending, and missing flow do not play countdown',()=>{
 played.length=0;for(const phase of ['normal','art'])ctx.playCzCountdownOnLever({flowBefore:{phase,remaining:1}});
 ctx.playCzCountdownOnLever({flowBefore:{phase:'cz',remaining:1},bonusPendingAtStart:true});ctx.playCzCountdownOnLever({});assert.equal(played.length,0);
});
test('comeback counts games remaining after the lever, including successful and failed final games',()=>{
 vm.runInContext('Math.random=()=>{throw Error("Countdown must not draw game RNG");}',ctx);
 for(const comebackEvent of ['continue','success','failure']){
  played.length=0;
  for(let comebackLeft=5;comebackLeft>=1;comebackLeft--){
   const resolved={flowBefore:{phase:'art',remaining:'900',comebackLeft},comebackEvent},before=JSON.stringify(resolved);
   ctx.playCzCountdownOnLever(resolved);assert.equal(JSON.stringify(resolved),before);
  }
  assert.deepEqual(played.map(p=>p.src),['assets/media/jag/cz_remaining_3.wav?v=count2','assets/media/jag/cz_remaining_2.wav?v=count2','assets/media/nova/cz_remaining_1.wav','assets/media/jag/cz_last.wav?v=count2']);
  assert(played.every(p=>p.volume===.5));
 }
});
test('comeback entry, stale counters and pending bonus do not announce another countdown',()=>{
 played.length=0;
 for(const resolved of [
  {flowBefore:{phase:'art',comebackLeft:3},comebackEvent:'entry'},
  {flowBefore:{phase:'art',comebackLeft:2}},
  {flowBefore:{phase:'normal',comebackLeft:1},comebackEvent:'success'},
  {flowBefore:{phase:'art',comebackLeft:1},comebackEvent:'success',bonusPendingAtStart:true}
 ])ctx.playCzCountdownOnLever(resolved);
 assert.equal(played.length,0);
});
test('CZ voice assets match normalization output and preserve supplied originals',()=>{
 const manifest=JSON.parse(fs.readFileSync('docs/character-voice-normalization.json','utf8'));
 const pairs=[['3.wav','cz_remaining_3.wav'],['2.wav','cz_remaining_2.wav'],['ラスト.wav','cz_last.wav']];
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 for(const [original,dest] of pairs){
  const asset='assets/media/jag/'+dest,record=manifest.files.find(file=>file.src===asset);
  assert.ok(record,'normalization record for '+dest);
  assert.equal(hash(asset),record.outputSha256);
  const path='C:/Users/nitro/Dropbox/NOVA台用イラスト/'+original;
  if(!fs.existsSync(path))continue;
  assert.equal(hash(path),record.sourceSha256);
 }
});

test('lever subtraction maps 4/3/2/1 to 3/2/1/last without repeating at zero',()=>{
 const expected=['cz_remaining_3.wav?v=count2','cz_remaining_2.wav?v=count2','cz_remaining_1.wav','cz_last.wav?v=count2'];
 for(let before=4;before>=1;before--){played.length=0;ctx.playCzCountdownOnLever({flowBefore:{phase:'cz',remaining:before}});assert.equal(played.length,1);assert.ok(played[0].src.endsWith(expected[4-before]));}
 played.length=0;for(const remaining of [0,-1,undefined])ctx.playCzCountdownOnLever({flowBefore:{phase:'cz',remaining}});assert.equal(played.length,0);
});
