import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8'),calls=[],ctx=vm.createContext({BONUS_END_BGM_SRC:'assets/media/nova/bonus_art_end.wav',BGM_OUTPUT_SCALE:1,bgmOutputVolume:()=>.5,playLockedBonusConfirmSound:(src)=>calls.push(src)});
vm.runInContext(html.match(/  function playArtEndSound\([^]*?\n  }/)[0],ctx);
test('ART return to normal plays supplied ending once',()=>{
 const result={flowBefore:{phase:'art'},flowAfter:{phase:'normal'}};
 ctx.playArtEndSound(result);ctx.playArtEndSound(result);assert.deepEqual(calls,['assets/media/nova/bonus_art_end.wav']);
});
test('sets, zones, CZ exit and bonus interruption do not play ART ending',()=>{
 calls.length=0;
 for(const result of [{flowBefore:{phase:'art'},flowAfter:{phase:'art'}},{flowBefore:{phase:'cz'},flowAfter:{phase:'normal'}},{flowBefore:{phase:'art'},flowAfter:{phase:'normal'},bonusHit:true}])ctx.playArtEndSound(result);
 assert.equal(calls.length,0);
 assert.match(html,/const BONUS_END_BGM_SRC = "assets\/media\/nova\/bonus_art_end.wav"/);
});
