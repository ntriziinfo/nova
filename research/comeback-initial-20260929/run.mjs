import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {loadModel,simulate} from '../../scripts/zone-v2-model.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
const files=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','nova-tuning.js','nova-progress.js','nova-decrement.js'];
const trials=100,games=30000,seedPrefix='NOVA-comeback-20260929-v1';
if(!isMainThread){
 const {setting,name}=workerData;
 loadModel('../research/comeback-initial-20260929/'+name);
 const rows=[];
 for(let i=0;i<(name==='before'?10:trials);i++){
  const seed=`${seedPrefix}|${setting}|${i}`;
  const r=simulate(setting,games,seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:true,exactGames:true});
  rows.push(r);
 }
 parentPort.postMessage({setting,name,rows});
}else{
 for(const [name,p] of [['before',.2],['fixed',.2],['p25',.25],['p30',.3]]){
  fs.mkdirSync(path.join(dir,name),{recursive:true});
  for(const file of files){
   let s=fs.readFileSync(file,'utf8');
   if(file==='nova-art.js'){
    if(name==='before')s=execFileSync('git',['show','f1f0f4c:nova-art.js'],{encoding:'utf8'});
    if(p!==.2){assert(s.includes('games:5,totalChance:.20,'));s=s.replace('games:5,totalChance:.20,',`games:5,totalChance:${p},`);}
   }
   fs.writeFileSync(path.join(dir,name,file),s);
  }
 }
 const jobs=Array.from({length:6},(_,i)=>['before','fixed','p25','p30'].map(name=>({setting:i+1,name}))).flat();
 const results=[];
 await Promise.all(Array.from({length:4},async()=>{
  while(jobs.length){
   const job=jobs.shift();
   const r=await new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:job});w.once('message',resolve);w.once('error',reject);w.once('exit',code=>{if(code)reject(Error('Worker exited '+code));});});
   fs.writeFileSync(path.join(dir,`${r.name}-${r.setting}.json`),JSON.stringify(r));
   results.push(r);console.log(`${r.name} setting ${r.setting}: ${r.rows.length} trials done`);
  }
 }));
 const summary=[];
 for(let setting=1;setting<=6;setting++){
  const base=results.find(r=>r.setting===setting&&r.name==='before').rows;
  const fixed=results.find(r=>r.setting===setting&&r.name==='fixed').rows;
  assert.deepEqual(fixed.slice(0,10),base,`setting ${setting}: normal-play parity`);
  for(const name of ['fixed','p25','p30']){
   const rows=results.find(r=>r.setting===setting&&r.name===name).rows;
   const bet=rows.reduce((s,r)=>s+r.totalBet,0),paid=rows.reduce((s,r)=>s+r.totalPaid,0),ratio=paid/bet;
   const residual=rows.map(r=>r.totalPaid-ratio*r.totalBet);
   const se=Math.sqrt(residual.reduce((s,r)=>s+r*r,0)/(trials-1)/trials)/(bet/trials);
   summary.push({setting,name,trials,games,rtp:ratio*100,rtpCI95:[(ratio-1.96*se)*100,(ratio+1.96*se)*100],winRate:rows.filter(r=>r.net>0).length/trials*100,reach10000:rows.filter(r=>r.firstComplete).length/trials*100});
  }
 }
 const result={seedPrefix,trials,maxGames:games,completeLimitPt:10000,parity:{trials:60,games:30000,fullResultsEqual:true},summary};
 fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}
