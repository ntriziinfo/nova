import fs from 'node:fs';
import {simulate} from './simulate-normal.mjs';
const setting=Number(process.argv[2]||1),mode=process.argv[3]||'fit';
const original=NovaArt.zoneEntryScale[setting-1];
const evalAt=(factor,games,seed)=>{NovaArt.zoneEntryScale[setting-1]=factor;return simulate(setting,NovaBalance.profile(setting).scale,games,seed);};
let lo=0,hi=original;
if(mode==='fit'){
 for(let i=0;i<8;i++){const factor=(lo+hi)/2;const rows=[0,1,2].map(k=>evalAt(factor,120000,43123+k*193739));const rtp=rows.reduce((a,x)=>a+x.totalBet*x.rtp,0)/rows.reduce((a,x)=>a+x.totalBet,0);console.log(JSON.stringify({setting,i,factor,rtp}));if(rtp<NovaBalance.targets[setting-1])lo=factor;else hi=factor;}
 const factor=(lo+hi)/2;fs.writeFileSync(`calibration-23-fit-${setting}.json`,JSON.stringify({setting,factor,lo,hi}));
}else{
 const factor=Number(process.argv[4]||original);const rows=[];for(let k=0;k<10;k++){const r=evalAt(factor,Number(process.argv[6]||500000),Number(process.argv[5]||(setting===1?1598731:3339841))+k*191399+setting);rows.push(r);console.log(JSON.stringify({setting,k,rtp:r.rtp}));}const bet=rows.reduce((a,x)=>a+x.totalBet,0),rtp=rows.reduce((a,x)=>a+x.totalBet*x.rtp,0)/bet;fs.writeFileSync(`calibration-23-verify-${setting}.json`,JSON.stringify({setting,factor,rtp,rows},null,2));
}
