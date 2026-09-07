import fs from 'node:fs';import {simulate} from './simulate-normal.mjs';
const quantile=(xs,p)=>xs[Math.min(xs.length-1,Math.floor(p*xs.length))];const rows=[];
for(const games of [1000,3000,10000]){
 const groups={};for(const setting of [1,6]){groups[setting]=[];for(let i=0;i<300;i++)groups[setting].push(simulate(setting,NovaBalance.profile(setting).scale,games,345667+setting+i*98567).rtp);groups[setting].sort((a,b)=>a-b);}
 let auc=0;for(const high of groups[6])for(const low of groups[1])auc+=high>low?1:high===low?.5:0;auc/=90000;
 const result={games,setting1:[.1,.5,.9].map(p=>quantile(groups[1],p)),setting6:[.1,.5,.9].map(p=>quantile(groups[6],p)),higherSettingHasHigherReturn:auc};rows.push(result);console.log(JSON.stringify(result));
}
fs.writeFileSync('../../outputs/setting-overlap.json',JSON.stringify(rows,null,2));
