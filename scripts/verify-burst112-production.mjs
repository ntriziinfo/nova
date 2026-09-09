import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadModel,simulate} from '../research/burst112/production-model.mjs';

const all=process.argv.includes('--all');
const fixtures=JSON.parse(fs.readFileSync('research/burst112/verified-traces.json','utf8'));
loadModel();const reports=[];
for(const {setting,rows} of fixtures){
 const chosen=all?rows:[...new Map([
  ...rows.slice(0,3),...rows.filter(r=>r.burst.wins).slice(0,3),
  ...rows.filter(r=>r.burst.attempts&&!r.burst.wins).slice(0,3)
 ].map(r=>[r.seed,r])).values()];
 for(const expected of chosen){
  const actual=simulate(setting,30000,expected.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false});
  const financial=Object.fromEntries(Object.keys(expected).map(k=>[k,actual[k]]));
  assert.deepEqual(financial,expected,'production/trial mismatch: setting '+setting+', seed '+expected.seed);
 }
 reports.push({setting,trials:chosen.length,games:chosen.length*30000,matched:true});
 console.log(JSON.stringify(reports.at(-1)));
}
const sourceHashes=Object.fromEntries(['nova-art.js','nova-normal.js','nova-flow.js','nova-balance.js','research/burst112/production-model.mjs'].map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
fs.writeFileSync('docs/burst112-production-parity.json',JSON.stringify({sourceHashes,reports,all},null,2));
