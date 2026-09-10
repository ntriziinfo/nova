import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadModel,simulate} from '../burst112/production-model.mjs';
loadModel(undefined,false);
const manifest=JSON.parse(fs.readFileSync('research/balance117/verify-manifest.json'));
const targets=process.argv.slice(2).map(Number),output='docs/balance117-production-parity.json';
const prior=targets.length&&fs.existsSync(output)?JSON.parse(fs.readFileSync(output)):null;
const reports=prior?.commit===manifest.commit?prior.reports.filter(r=>!targets.includes(r.setting)):[];
for(const {setting,file}of manifest.jobs.map(r=>({...r,file:`docs/balance117-${r.tag}-${r.setting}.json`})).filter(r=>!targets.length||targets.includes(r.setting))){
 const data=JSON.parse(fs.readFileSync(file));
 const selected=[...new Map([...data.rows.slice(0,2),...data.rows.filter(r=>r.burst.wins).slice(0,2),...data.rows.filter(r=>r.burst.attempts&&!r.burst.wins).slice(0,2)].map(r=>[r.seed,r])).values()];
 for(const expected of selected){
  const actual=simulate(setting,30000,expected.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false});
  for(const key of ['totalBet','totalPaid','games','net','peak','firstComplete','burst','comeback','counts','endPhase','unspentAtQuota','atEpisodes'])assert.deepEqual(actual[key],expected[key],`${setting}/${expected.seed}/${key}`);
 }
 const completeExpected=data.rows.find(r=>r.firstComplete);
 assert(completeExpected,'complete-stop example missing');
 const directStop=simulate(setting,30000,completeExpected.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:true});
 for(const key of ['games','totalBet','totalPaid','net'])assert.equal(directStop[key],completeExpected.firstComplete[key],`direct stop ${setting}/${key}`);
 const result={setting,trials:selected.length,games:selected.length*30000,matched:true,directStop:{seed:completeExpected.seed,games:directStop.games,matched:true}};reports.push(result);console.log(JSON.stringify(result));
}
reports.sort((a,b)=>a.setting-b.setting);
fs.writeFileSync(output,JSON.stringify({commit:manifest.commit,cache:false,complete:reports.length===6,reports},null,2)+'\n');
