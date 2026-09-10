import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadCandidate} from './trial.mjs';
import {simulate} from '../burst112/production-model.mjs';
const reports=[];
for(const setting of [1,6]){
 const {rows,report}=JSON.parse(fs.readFileSync(`docs/balance118-p7-${setting}.json`));
 const selected=[rows[0],rows.find(r=>r.burst.wins),rows.find(r=>r.firstComplete)];
 for(const cache of [true,false]){
  loadCandidate({...report,cache});const start=Date.now();
  for(const row of selected){
   const actual=simulate(setting,30000,row.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false});
   assert.deepEqual(JSON.parse(JSON.stringify(actual)),row,`S${setting} seed=${row.seed} cache=${cache}`);
  }
  reports.push({setting,cache,trials:selected.length,seconds:(Date.now()-start)/1000});
 }
}
fs.writeFileSync('docs/balance118-cache-parity.json',JSON.stringify({passed:true,reports},null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
