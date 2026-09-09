import fs from 'node:fs';
import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {loadModel,simulate} from '../burst112/production-model.mjs';
import {summarize} from '../burst113/trial.mjs';
const [mode,file]=process.argv.slice(2),files=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'];
if(mode==='worker'){
 const config=JSON.parse(file);loadModel(config.variant||'..');
 if(config.burstMultiplier!=null){let s=fs.readFileSync('nova-art.js','utf8');const anchor=/entry:Object\.freeze\(\[[^\]]+\]\)/;if(!anchor.test(s))throw Error('burst anchor');s=s.replace(anchor,`entry:Object.freeze(${JSON.stringify([.0012,.0028,.004,.0046,.0058,.0078].map(e=>e*config.burstMultiplier))})`);const vm=await import('node:vm');vm.runInThisContext(s);}
 const rows=[],sourceHashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
 for(let i=0;i<config.trials;i++){
  rows.push(simulate(config.setting,30000,config.seedBase+config.setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false,art:config.rare==null?{}:{comebackRare:config.rare}}));
  if((i+1)%100===0)console.log(`${config.tag} 設定${config.setting}: ${i+1}/${config.trials} × 30,000G`);
 }
 const report=summarize(rows,{...config,sourceHashes,award:NovaArt.burstRules.award,entry:NovaArt.burstRules.entry,comebackRules:NovaArt.comebackRules});
 report.comeback={entries:0,games:0,wins:0,roles:{},zones:{}};
 for(const row of rows){const c=row.comeback;for(const k of ['entries','games','wins'])report.comeback[k]+=c[k];for(const [role,v] of Object.entries(c.roles)){const x=report.comeback.roles[role]??={games:0,wins:0};x.games+=v.games;x.wins+=v.wins;}for(const [z,n]of Object.entries(c.zones))report.comeback.zones[z]=(report.comeback.zones[z]||0)+n;}
 fs.writeFileSync(`docs/comeback114-${config.tag}-${config.setting}.json`,JSON.stringify({report,rows},null,2)+'\n');
 console.log(JSON.stringify({tag:config.tag,s:config.setting,rare:config.rare,reach:report.completeRate,stopped:report.stoppedRtp.value,unlimited:report.rtp.value,recovery:report.comeback.wins/report.comeback.entries,entries:report.comeback.entries}));
}else{
 const jobs=JSON.parse(fs.readFileSync(file,'utf8'));
 async function lane(){while(jobs.length){const c=jobs.shift();await new Promise((resolve,reject)=>{const p=fork(fileURLToPath(import.meta.url),['worker',JSON.stringify(c)],{stdio:'inherit',windowsHide:true});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(String(code))));});}}
 await Promise.all(Array.from({length:4},lane));
}
