import fs from 'node:fs';
import assert from 'node:assert/strict';
import {install,simulate,options,hashes} from './model.mjs';
import {xoshiro128} from '../../scripts/zone-v2-rng.mjs';
const before=hashes(),checks=[];
for(let setting=1;setting<=6;setting++){
 install({setting});
 const a=simulate(setting,30000,'wrapper-equivalence-'+setting,options);
 install({setting,extraRate:0});
 assert.deepEqual(simulate(setting,30000,'wrapper-equivalence-'+setting,options),a);
 checks.push({setting,unmodifiedWrapperExactMatch:true});
}
const samples=[];
for(const setting of [1,6]){
 install({setting,replay:1/7.3,extraRate:setting===6?.8:.2});
 NovaDecrement.reset(setting,[1,2,3,4]);
 for(const upper of [false,true])for(const role of ['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B']){
  const expected=.2*(upper?1.5:1)*(role==='STRONG_SUICA'?2:1),rng=xoshiro128('role-check-'+setting+'-'+upper+'-'+role);
  let won=0;const n=100000;
  for(let i=0;i<n;i++)won+=!!NovaArt.resolveAtRole({atHigh:false,researchUpper:upper},role,setting,rng).zone;
  assert(Math.abs(won/n-expected)<.006);
  samples.push({setting,upper,role,n,expected,actual:won/n});
 }
 const s=simulate(setting,30000,'checkpoint-preserved-'+setting,options);
 assert(s.checkpointStats&&Number.isFinite(s.checkpointStats.started));
 assert.equal(s.checkpointStats.started,s.upper.bySource.threshold.started);
}
assert.deepEqual(hashes(),before);
fs.writeFileSync('research/replay-base-20260929/verification.json',JSON.stringify({checks,samples,productionUnchanged:true,sourceHashes:before},null,2));
console.log('6 seeded 30,000G equivalence checks and 16 conditional lottery frequency checks passed.');
