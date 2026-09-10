import fs from 'node:fs';
import assert from 'node:assert/strict';
const selected=JSON.parse(fs.readFileSync('research/balance118/selected-data.json'));
const training=new Set(),holdout=new Set();
function addTraining(c){for(let i=0;i<c.trials;i++)training.add(c.seedBase+c.setting*100003+i*7919);}
for(const f of fs.readdirSync('research/balance118').filter(f=>/^pilot\d+\.json$/.test(f)))for(const c of JSON.parse(fs.readFileSync('research/balance118/'+f)))addTraining(c);
const config=job=>JSON.parse(fs.readFileSync(job.manifest)).jobs.find(c=>c.setting===job.setting);
for(const job of selected.rejected)addTraining(config(job));
for(const job of selected.jobs){
 const c=config(job);assert(c);assert(c.trials>=3000);
 for(let i=0;i<c.trials;i++){
  const seed=c.seedBase+c.setting*100003+i*7919;
  assert(!training.has(seed),'Selected seed overlaps training/rejected validation: '+seed);
  assert(!holdout.has(seed),'Duplicate selected seed: '+seed);holdout.add(seed);
 }
}
const result={trainingAndRejectedSeeds:training.size,selectedSeeds:holdout.size,independentFromTuning:true,uniqueSelectedSeeds:true};
fs.writeFileSync('docs/balance118-final-seed-check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
