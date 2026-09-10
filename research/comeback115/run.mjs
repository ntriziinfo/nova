import fs from 'node:fs';
import {fork, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {loadModel,simulate} from '../burst112/production-model.mjs';
import {summarize} from '../burst113/trial.mjs';

const files=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','research/burst112/production-model.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const trials=1000, seedBase=115900000;
if(process.argv[2]==='worker'){
 const setting=Number(process.argv[3]),start=Date.now(),sourceHashes=hashes();
 loadModel();
 for(const role of NovaArt.comebackRules.guaranteedRoles)assert.equal(NovaArt.comebackChance(role,setting),1);
 const rows=[];
 for(let i=0;i<trials;i++){
  const row=simulate(setting,30000,seedBase+setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false});
  assert.equal(row.games,30000);assert.equal(row.net,row.totalPaid-row.totalBet);
  if(row.firstComplete){assert(row.firstComplete.net>=10000);assert(row.firstComplete.games<=30000);}
  rows.push(row);
  if((i+1)%100===0)console.log(`設定${setting}: ${i+1}/${trials} × 30,000G (${Math.round((Date.now()-start)/1000)}秒)`);
 }
 assert.deepEqual(hashes(),sourceHashes,'source changed during simulation');
 const report=summarize(rows,{version:115,trials,seedBase,setting,sourceHashes,award:NovaArt.burstRules.award,entry:NovaArt.burstRules.entry,comebackRules:NovaArt.comebackRules});
 report.comeback={entries:0,games:0,wins:0,roles:{},zones:{}};
 for(const row of rows){const c=row.comeback;for(const k of ['entries','games','wins'])report.comeback[k]+=c[k];for(const [role,v]of Object.entries(c.roles)){const x=report.comeback.roles[role]??={games:0,wins:0};x.games+=v.games;x.wins+=v.wins;}for(const [z,n]of Object.entries(c.zones))report.comeback.zones[z]=(report.comeback.zones[z]||0)+n;}
 for(const role of NovaArt.comebackRules.guaranteedRoles){const r=report.comeback.roles[role];if(r)assert.equal(r.games,r.wins,role);}
 report.elapsedSeconds=(Date.now()-start)/1000;
 fs.writeFileSync(`docs/comeback115-run-${setting}.json`,JSON.stringify({report,rows},null,2)+'\n');
 console.log(JSON.stringify({setting,complete:true,stoppedRtp:report.stoppedRtp.value,unlimitedRtp:report.rtp.value,reach:report.completeRate,recovery:report.comeback.wins/report.comeback.entries}));
}else{
 const jobs=[1,2,3,4,5,6],manifest={version:115,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),startedAt:new Date().toISOString(),trialsPerSetting:trials,gamesPerTrial:30000,seedBase,sourceHashes:hashes(),sources:jobs.map(setting=>({setting,file:`docs/comeback115-run-${setting}.json`}))};
 fs.writeFileSync('research/comeback115/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 async function lane(){while(jobs.length){const setting=jobs.shift();await new Promise((resolve,reject)=>{const child=fork(fileURLToPath(import.meta.url),['worker',String(setting)],{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`setting ${setting}: ${code}`)));});}}
 await Promise.all(Array.from({length:4},lane));
 console.log('全6設定、合計180,000,000G完了');
}
