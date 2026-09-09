import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadModel,simulate} from '../burst112/production-model.mjs';
const tag=process.argv[2]||'final';loadModel();const reports=[];
const sources=tag==='final'?JSON.parse(fs.readFileSync('research/burst113/selected-data.json')):[1,2,3,4,5,6].map(setting=>({setting,file:`docs/burst113-${tag}-${setting}.json`}));
for(let setting=1;setting<=6;setting++){
 const data=JSON.parse(fs.readFileSync(sources.find(r=>r.setting===setting).file));
 assert.equal(NovaArt.burstRules.award,data.report.award);assert.equal(NovaArt.burstRules.entry[setting-1],data.report.entry[setting-1]);
 const selected=[...new Map([...data.rows.slice(0,3),...data.rows.filter(r=>r.burst.wins).slice(0,3),...data.rows.filter(r=>r.burst.attempts&&!r.burst.wins).slice(0,3)].map(r=>[r.seed,r])).values()];
 for(const expected of selected){
  const actual=simulate(setting,30000,expected.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false});
  for(const key of ['totalBet','totalPaid','games','net','peak','firstComplete','burst','endPhase','unspentAtQuota','atEpisodes'])assert.deepEqual(actual[key],expected[key],`${setting}/${expected.seed}/${key}`);
 }
 reports.push({setting,trials:selected.length,games:selected.length*30000,matched:true});console.log(JSON.stringify(reports.at(-1)));
}
fs.writeFileSync('docs/burst113-production-parity.json',JSON.stringify({sourceHashes:Object.fromEntries(['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'].map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),reports},null,2)+'\n');
