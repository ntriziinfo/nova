import assert from 'node:assert/strict';
// Cache deterministic arithmetic only. Return a fresh r because roleProbabilities adds BELL/REPLAY.
export function cacheMix(source){
  const anchor='function atMix(setting=3,level=0){';
  assert.equal(source.split(anchor).length,2);
  return source.replace(anchor,`const atMixMemo=new Map();
 function atMix(setting=3,level=0){
  const key=String(setting)+':'+String(level);let row=atMixMemo.get(key);
  if(!row){row=computeAtMix(setting,level);atMixMemo.set(key,row);}
  return {r:{...row.r},chance:row.chance,mean:row.mean};
 }
 function computeAtMix(setting=3,level=0){`);
}
