import fs from 'node:fs';
import {simulate} from './simulate-normal.mjs';
const setting=Number(process.argv[2]), rows=[];
for(let i=0;i<1000;i++){
 const seed=(1926813579+setting*10000019+i*15485863)>>>0;
 const r=simulate(setting,NovaBalance.profile(setting).scale,10000,seed,{exactGames:true});
 if(r.games!==10000)throw Error('Session length mismatch');
 rows.push({seed,games:r.games,net:r.net,peak:r.peak,totalBet:r.totalBet,totalPaid:r.totalBet+r.net});
 if((i+1)%250===0)console.log(JSON.stringify({setting,done:i+1}));
}
const sum=k=>rows.reduce((s,r)=>s+r[k],0);
const report={setting,trials:rows.length,gamesPerTrial:10000,wins:rows.filter(r=>r.net>0).length,draws:rows.filter(r=>r.net===0).length,over:Object.fromEntries([1000,2000,4000].map(t=>[t,rows.filter(r=>r.peak>t).length])),rtp:sum('totalPaid')/sum('totalBet'),totalPaid:sum('totalPaid'),totalBet:sum('totalBet'),meanNet:sum('net')/rows.length,rows};
fs.writeFileSync(`reset-stats-setting-${setting}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,rows:undefined}));
