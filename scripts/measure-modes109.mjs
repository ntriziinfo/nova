import fs from 'node:fs';import {loadModel,simulate} from './zone-v2-model.mjs';loadModel();
const setting=Number(process.argv[2]),rows=[];
for(let i=0;i<1000;i++){rows.push(simulate(setting,10000,108000000+setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000}));if((i+1)%200===0)console.log({setting,done:i+1});}
const sum=k=>rows.reduce((s,r)=>s+r[k],0),count=k=>rows.reduce((s,r)=>s+r.counts[k],0);
const report={setting,trials:rows.length,games:sum('games'),rtp:sum('totalPaid')/sum('totalBet'),gameCZ:count('gameCzEntries'),ceilingCZ:count('ceilingCzEntries'),rareCZ:count('rareCzEntries'),wins:rows.filter(r=>r.net>0).length};
fs.writeFileSync(`docs/modes109-setting-${setting}.json`,JSON.stringify({report,rows},null,2));console.log(report);

