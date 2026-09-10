import fs from 'node:fs';
import assert from 'node:assert/strict';
const training=new Set();
for(const file of fs.readdirSync('research/balance118').filter(f=>/^pilot\d+\.json$/.test(f))){
 for(const c of JSON.parse(fs.readFileSync('research/balance118/'+file)))for(let i=0;i<c.trials;i++)training.add(c.seedBase+c.setting*100003+i*7919);
}
const jobs=JSON.parse(fs.readFileSync(process.argv[2])),holdout=new Set();
for(const c of jobs)for(let i=0;i<c.trials;i++){
 const seed=c.seedBase+c.setting*100003+i*7919;
 assert(!training.has(seed),'Training/holdout overlap: '+seed);assert(!holdout.has(seed),'Duplicate holdout seed: '+seed);holdout.add(seed);
}
const result={trainingSeeds:training.size,holdoutSeeds:holdout.size,disjoint:true,uniqueHoldout:true};
fs.writeFileSync('docs/balance118-seed-check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
