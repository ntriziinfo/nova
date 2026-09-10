import fs from 'node:fs';
import {fork,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {loadModel,simulate} from '../burst112/production-model.mjs';
import {summarize} from '../burst113/trial.mjs';
const files=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','research/burst112/production-model.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
if(process.argv[2]==='worker'){
 const c=JSON.parse(process.argv[3]),start=Date.now(),sourceHashes=hashes();loadModel();
 const rows=[],art=c.weights?{atLevelWeights:c.weights}:{};
 for(const role of NovaArt.comebackRules.guaranteedRoles)assert.equal(NovaArt.comebackChance(role,c.setting),1);
 for(let i=0;i<c.trials;i++){
  const row=simulate(c.setting,30000,c.seedBase+c.setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false,art});
  assert.equal(row.games,30000);rows.push(row);
  if((i+1)%100===0)console.log(`${c.tag} 設定${c.setting}: ${i+1}/${c.trials} × 30,000G (${Math.round((Date.now()-start)/1000)}秒)`);
 }
 assert.deepEqual(hashes(),sourceHashes);
 const report=summarize(rows,{...c,sourceHashes,entry:NovaArt.burstRules.entry,award:NovaArt.burstRules.award,comebackRules:NovaArt.comebackRules,weights:c.weights||NovaArt.atLevelRules.weights[c.setting-1]});
 report.comeback={entries:0,games:0,wins:0,roles:{}};
 for(const row of rows){for(const k of ['entries','games','wins'])report.comeback[k]+=row.comeback[k];for(const [role,v]of Object.entries(row.comeback.roles)){const r=report.comeback.roles[role]??={games:0,wins:0};r.games+=v.games;r.wins+=v.wins;}}
 for(const role of NovaArt.comebackRules.guaranteedRoles){const r=report.comeback.roles[role];if(r)assert.equal(r.games,r.wins);}
 report.reachWithoutBurst=rows.filter(r=>r.firstComplete&&!r.firstComplete.burstWins).length/c.trials;
 report.elapsedSeconds=(Date.now()-start)/1000;
 const file=`docs/comeback116-${c.tag}-${c.setting}.json`;
 fs.writeFileSync(file,JSON.stringify({report,rows},null,2)+'\n');
 console.log(JSON.stringify({setting:c.setting,tag:c.tag,rtp:report.stoppedRtp.value,unlimited:report.rtp.value,reach:report.completeRate,reachWithoutBurst:report.reachWithoutBurst,weights:report.weights,burstAttempts:report.burstAttempts,burstWins:report.burstWins}));
}else{
 const jobs=JSON.parse(fs.readFileSync(process.argv[2]));
 fs.writeFileSync(`research/comeback116/${jobs[0].tag}-manifest.json`,JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:hashes(),startedAt:new Date().toISOString(),jobs},null,2)+'\n');
 async function lane(){while(jobs.length){const c=jobs.shift();await new Promise((resolve,reject)=>{const child=fork(fileURLToPath(import.meta.url),['worker',JSON.stringify(c)],{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(String(code))));});}}
 await Promise.all(Array.from({length:4},lane));
}
