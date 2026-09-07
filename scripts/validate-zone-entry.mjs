import {simulate} from './simulate-normal.mjs';import fs from 'node:fs';
const report=[];
for(let setting=1;setting<=6;setting++){
 const results=[];for(let k=0;k<10;k++)results.push(simulate(setting,NovaBalance.profile(setting).scale,500000,({1:79000031,3:89000031,4:89000031,5:59000031,6:99000031}[setting]||69000031)+k*197891+setting));
 const mean=results.reduce((s,r)=>s+r.rtp,0)/10,se=Math.sqrt(results.reduce((s,r)=>s+(r.rtp-mean)**2,0)/90);
 report.push({setting,scale:NovaArt.zoneEntryScale[setting-1],target:NovaBalance.targets[setting-1],mean,ci95:[mean-2.262*se,mean+2.262*se],results});
 console.log(JSON.stringify({setting,mean,ci95:report.at(-1).ci95}));fs.writeFileSync('../../outputs/zone-validation.json',JSON.stringify(report,null,2));
}

