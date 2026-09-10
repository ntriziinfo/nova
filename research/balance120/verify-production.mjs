import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadModel,simulate} from '../burst112/production-model.mjs';
const selected=JSON.parse(fs.readFileSync('research/balance120/selected-data.json')),results=[];
loadModel(undefined,false);
for(const job of selected.jobs){
 const {rows}=JSON.parse(fs.readFileSync(job.file));
 const samples=[...new Map([...rows.slice(0,2),...rows.filter(r=>r.burst.wins).slice(0,2),...rows.filter(r=>r.burst.attempts&&!r.burst.wins).slice(0,2)].map(r=>[r.seed,r])).values()];
 for(const row of samples){const actual=simulate(job.setting,30000,row.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false,recordBlocks:1000});assert.deepEqual(JSON.parse(JSON.stringify(actual)),row,job.setting+'/'+row.seed);}
 const reached=rows.find(r=>r.firstComplete);assert(reached);const stop=simulate(job.setting,30000,reached.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:true});for(const k of ['games','totalBet','totalPaid','net'])assert.equal(stop[k],reached.firstComplete[k]);
 results.push({setting:job.setting,seeds:samples.map(r=>r.seed),cachedAndUncachedMatch:true,immediateCompleteStopMatches:true,stopSeed:reached.seed});console.log(JSON.stringify(results.at(-1)));
}
fs.writeFileSync('docs/balance120-production-parity.json',JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),results},null,2)+'\n');
