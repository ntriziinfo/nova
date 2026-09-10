import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadModel,simulate} from '../burst112/production-model.mjs';
import {dataJob,verifySettingRuntime} from './selected-data.mjs';
loadModel(undefined,false);
const tag=process.argv[2]??'verify',reports=[];
for(let setting=1;setting<=6;setting++){
 const job=dataJob(tag,setting),{rows,report}=JSON.parse(fs.readFileSync(job.file));
 if(tag==='final')verifySettingRuntime(report,job);
 const selected=[...new Map([...rows.slice(0,2),...rows.filter(r=>r.burst.wins).slice(0,2),...rows.filter(r=>r.burst.attempts&&!r.burst.wins).slice(0,2)].map(r=>[r.seed,r])).values()];
 for(const expected of selected){
  const actual=simulate(setting,30000,expected.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false});
  assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected,`${setting}/${expected.seed}`);
 }
 const row=rows.find(r=>r.firstComplete);assert(row);
 const stopped=simulate(setting,30000,row.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:true});
 for(const k of ['games','totalBet','totalPaid','net'])assert.equal(stopped[k],row.firstComplete[k],`direct stop S${setting}/${k}`);
 reports.push({setting,trials:selected.length,games:selected.length*30000,matched:true,directStop:{seed:row.seed,games:stopped.games,matched:true}});
 console.log(JSON.stringify(reports.at(-1)));
}
fs.writeFileSync(`docs/balance118-${tag}-production-parity.json`,JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),cache:false,reports},null,2)+'\n');
