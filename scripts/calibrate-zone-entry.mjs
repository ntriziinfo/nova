import {simulate} from './simulate-normal.mjs';
import fs from 'node:fs';
const report=[];
for(let setting=1;setting<=6;setting++){
 let lo=0,hi=2;
 for(let i=0;i<8;i++){
  const scale=(lo+hi)/2;NovaArt.zoneEntryScale[setting-1]=scale;
  const results=[0,1,2].map(k=>simulate(setting,NovaBalance.profile(setting).scale,250000,6400001+k*98761+setting));
  const mean=results.reduce((s,r)=>s+r.rtp,0)/results.length;
  if(mean<NovaBalance.targets[setting-1])lo=scale;else hi=scale;
 }
 NovaArt.zoneEntryScale[setting-1]=(lo+hi)/2;
 report.push({setting,scale:NovaArt.zoneEntryScale[setting-1]});console.log(JSON.stringify(report.at(-1)));
 fs.writeFileSync('../../outputs/zone-calibration.json',JSON.stringify(report,null,2));
}
