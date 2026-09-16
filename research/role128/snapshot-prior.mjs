import fs from 'node:fs';
import {createHash} from 'node:crypto';
const mean=(rows,key)=>rows.reduce((n,r)=>n+r[key],0)/rows.length;
const settings=[1,2,3,4,5,6].map(setting=>{
 const files=setting===6?['a','b','c'].map(t=>`research/s6-127/verify-${t}-6.json`):[`research/start126/verify-${setting}.json`];
 const inputs=files.map(f=>({file:f,source:fs.readFileSync(f)})),rows=inputs.flatMap(x=>JSON.parse(x.source).rows);
 return {setting,trials:rows.length,netMean:mean(rows.flatMap(r=>r.atEpisodes).filter(e=>!e.censored),'net'),meanMaxDrawdown:mean(rows,'maxDrawdown'),sources:inputs.map(x=>({file:x.file,sha256:createHash('sha256').update(x.source).digest('hex')}))};
});
fs.writeFileSync('research/role128/previous-metrics.json',JSON.stringify({baseline:'3e99d5f56377a6cb961de0a520e16b8ea0e72173',settings},null,2)+'\n');
