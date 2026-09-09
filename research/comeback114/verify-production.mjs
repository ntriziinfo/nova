import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadModel,simulate} from '../burst112/production-model.mjs';
loadModel(undefined,false);const reports=[];
const sources=JSON.parse(fs.readFileSync('research/comeback114/selected-data.json'));
for(let setting=1;setting<=6;setting++){
 const data=JSON.parse(fs.readFileSync(sources.find(r=>r.setting===setting).file));
 assert.equal(NovaArt.burstRules.award,data.report.award);assert.equal(NovaArt.burstRules.entry[setting-1],data.report.entry[setting-1]);
 assert.equal(NovaArt.comebackRules.rare[setting-1],data.report.comebackRules.rare[setting-1]);
 const selected=[...new Map([...data.rows.slice(0,3),...data.rows.filter(r=>r.burst.wins).slice(0,3),...data.rows.filter(r=>r.burst.attempts&&!r.burst.wins).slice(0,3)].map(r=>[r.seed,r])).values()];
 for(const expected of selected){
  const actual=simulate(setting,30000,expected.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false});
  for(const key of ['totalBet','totalPaid','games','net','peak','firstComplete','burst','comeback','counts','endPhase','unspentAtQuota','atEpisodes'])assert.deepEqual(actual[key],expected[key],`${setting}/${expected.seed}/${key}`);
 }
 reports.push({setting,trials:selected.length,games:selected.length*30000,matched:true});console.log(JSON.stringify(reports.at(-1)));
}
fs.writeFileSync('docs/comeback114-production-parity.json',JSON.stringify({sourceHashes:Object.fromEntries(['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'].map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),cache:false,reports},null,2)+'\n');
