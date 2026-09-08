// Each setting: ten independent 500,000-game samples, replay BET excluded from input.
import fs from 'node:fs';import {loadModel,simulate} from './zone-v2-model.mjs';
loadModel();const rows=[];
for(let setting=1;setting<=6;setting++){
 const batches=[];
 for(let i=0;i<10;i++)batches.push(simulate(setting,500000,1976518+setting*100+i,{rng:'xoshiro128'}));
 const bet=batches.reduce((s,r)=>s+r.totalBet,0),paid=batches.reduce((s,r)=>s+r.totalPaid,0),mean=paid/bet;
 const sample=batches.map(r=>r.rtp),avg=sample.reduce((s,x)=>s+x,0)/10,se=Math.sqrt(sample.reduce((s,x)=>s+(x-avg)**2,0)/9/10);
 rows.push({setting,bonusSpecial:NovaArt.bonusSpecialFor(setting),games:5000000,rtp:mean,ci95:2.262*se,bet,paid,batches});
 console.log(JSON.stringify({...rows.at(-1),batches:undefined}));if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(rows,null,2));
}
