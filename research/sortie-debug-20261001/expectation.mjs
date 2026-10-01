import fs from 'node:fs';
import vm from 'node:vm';
for(const f of ['nova-tuning.js','nova-art.js','nova-balance.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const zones=[...NovaArt.zoneIds,'kushuri_nito'],rows=[];
// Award-only valuation: consume every earned stock, excluding session checkpoints,
// initial AT awards, small-role payouts and later AT/comeback lotteries.
for(let setting=1;setting<=6;setting++){
 const p=NovaTuning.profile(setting),means=zones.map(id=>NovaBalance.zoneMean(id,{setting}));
 const stocks=[.1,.25,.4,.6,.8].reduce((s,r,i)=>s+p.tiers[i]*(10*r+2*(1-r)**10+10*r*(1-r)**9),0);
 rows.push({setting,denominator:p.denominator,stocks,zoneMean:means.reduce((s,n,i)=>s+n*p.weights[i],0),zones:Object.fromEntries(zones.map((z,i)=>[z,means[i]]))});
 rows.at(-1).expectedPt=stocks*rows.at(-1).zoneMean;
}
let seed=20261001;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const trials=Number(process.env.ZONE_TRIALS||20000),checks=process.env.REUSE_CHECKS?JSON.parse(fs.readFileSync('research/sortie-debug-20261001/expectation.json','utf8')).checks:[];
if(!process.env.REUSE_CHECKS)for(let setting=1;setting<=6;setting++)for(const zone of zones){
 let sum=0,sum2=0;
 for(let i=0;i<trials;i++){
  let flow={...NovaArt.enter({setting},rng),remaining:'0',queuedZones:[zone]},steps=0;
  do{
   flow=NovaArt.prepareBet(flow,{setting},rng);
   if(!flow.zone&&!flow.initialStage&&!flow.queuedZones.length)break;
   flow=NovaArt.step(flow,{setting},rng).flow;
   if(++steps>10000)throw Error('Zone failed to finish');
  }while(flow.zone||flow.initialStage||flow.queuedZones.length);
  const award=Number(flow.remaining);sum+=award;sum2+=award*award;
 }
 const mean=sum/trials,se=Math.sqrt((sum2/trials-mean**2)/(trials-1)),exact=rows[setting-1].zones[zone];
 checks.push({setting,zone,trials,mean,se,exact,z:se?(mean-exact)/se:0});
}
for(const check of checks){check.exact=rows[check.setting-1].zones[check.zone];check.z=check.se?(check.mean-check.exact)/check.se:0;}
const report={definition:'All earned zone awards; no checkpoint/complete truncation or later AT returns',rows,checks};
fs.writeFileSync('research/sortie-debug-20261001/expectation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({rows:rows.map(({zones,...r})=>r),maxZ:Math.max(...checks.map(c=>Math.abs(c.z))),outliers:checks.filter(c=>Math.abs(c.z)>4)}));
