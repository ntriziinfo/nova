import test from 'node:test';
import assert from 'node:assert/strict';
import {INPUTS,valid,currentReport} from '../scripts/rtp-current.mjs';

const hashes=Object.fromEntries(INPUTS.map(f=>[f,'matching-hash']));
function evidence(){return {
 gamesPerSetting:1_000_000_000,sourceHashes:{...hashes},sourceCommit:'a'.repeat(40),
 options:{exactGames:true,completeLimitPt:0,completeMyLimitPt:0,stopAtComplete:false},
 results:[1,2,3,4,5,6].map(setting=>({setting,games:1_000_000_000,totalBet:3_000_000_000,totalPaid:3_030_000_000,net:30_000_000}))
};}
test('only complete uncapped billion-game evidence matching the engine is displayed',()=>{
 const r=evidence();assert(valid(r,hashes));
 const data=currentReport(r,hashes,'b'.repeat(40));
 assert.equal(data.status,'ready');assert.equal(data.settings[0].rtpPct,101);
 assert.equal(data.sourceCommit,r.sourceCommit);assert.equal(data.commit,'b'.repeat(40));
 for(const change of [
  r=>{r.gamesPerSetting=100_000_000;},r=>{r.options.completeMyLimitPt=19000;},
  r=>{r.options.completeLimitPt=10000;},r=>{r.options.stopAtComplete=true;},
  r=>{r.results[0].games=999999999;},r=>{r.results[0].totalBet=1;},
  r=>{r.results[0].net=0;},r=>{r.results[0].totalPaid=NaN;},
  r=>{r.results[0].setting=2;},r=>{r.sourceHashes[INPUTS[0]]='old';}
 ]){
  const bad=evidence();change(bad);assert.equal(valid(bad,hashes),false);
  assert.deepEqual(currentReport(bad,hashes,'b').settings,[]);
 }
 assert.equal(currentReport(null,hashes,'b').status,'pending');
});
