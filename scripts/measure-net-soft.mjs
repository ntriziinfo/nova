import fs from 'node:fs';import {loadModel,simulate} from './zone-v2-model.mjs';
loadModel();if(process.argv[4]==='early'){NovaArt.netRewardControl.startRatio=0;NovaArt.netRewardControl.floor=.05;}const trials=Number(process.argv[2]||200),out=process.argv[3],rows=[];
for(let setting=1;setting<=6;setting++){
 const paired=[];for(let i=0;i<trials;i++){
  const seed=383837+setting*100000+i*7919;
  const before=simulate(setting,10000,seed,{rng:'xoshiro128',netGuard:false});
  const after=simulate(setting,10000,seed,{rng:'xoshiro128'});
  paired.push({seed,before,after});
 }
 const report={setting,trials,gamesPerTrial:10000,limit:NovaArt.netLimits[setting-1],results:{},paired};
 for(const variant of ['before','after']){const samples=paired.map(x=>x[variant]),sum=k=>samples.reduce((v,r)=>v+r[k],0);report.results[variant]={rtp:sum('totalPaid')/sum('totalBet'),over:Object.fromEntries([2000,4000,5000].map(n=>[n,samples.filter(r=>r.peak>n).length])),wins:samples.filter(r=>r.net>0).length,meanNet:sum('net')/trials,totalBet:sum('totalBet'),totalPaid:sum('totalPaid')};}
 rows.push(report);fs.writeFileSync(out,JSON.stringify(rows,null,2));console.log(JSON.stringify({...report,paired:undefined}));
}
