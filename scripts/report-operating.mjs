import fs from 'node:fs';
import path from 'node:path';
import {Worker,isMainThread,workerData,parentPort} from 'node:worker_threads';
import {loadModel,simulate} from './operating-model.mjs';
import {REQUIRED_OPTIONS,hashes,modelHash} from './rtp-current.mjs';
const operatingOptions=my=>({...REQUIRED_OPTIONS,recordBlocks:0,operatingLimit:true,stopAtComplete:true,completeMyLimitPt:my});
if(!isMainThread){
 loadModel();const rows=[];
 for(let i=0;i<workerData.sessions;i++){
  const seed=`operating-20261104|${workerData.setting}|${i}`;
  const r=simulate(workerData.setting,10000,seed,operatingOptions(workerData.my));
  if(r.totalBet!==r.games*3||r.totalPaid-r.totalBet!==r.net||r.games<10000&&!r.firstComplete)throw Error('Accounting invariant failed');
  rows.push({seed,games:r.games,bet:r.totalBet,paid:r.totalPaid,net:r.net,peak:r.peak,maxMy:r.maxMy,complete:!!r.firstComplete,endPhase:r.endPhase});
  if(i%100===99)parentPort.postMessage({progress:i+1,setting:workerData.setting});
 }
 parentPort.postMessage({setting:workerData.setting,rows});
}else{
 const dest=path.resolve(process.argv[2]||'../reliability-evidence-20261104/operating');fs.mkdirSync(dest,{recursive:true});
 const sessions=Number(process.argv[3]||1200),my=Number(process.argv[4]||10000);
 fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify({date:new Date().toISOString(),sourceHashes:hashes(),modelHash:modelHash(hashes()),sessions,my,limit:10000,policy:'At 10000G finish the current spin; keep art chain until normal. MY stops immediately after payout.',options:operatingOptions(my)},null,2));
 const queue=[1,2,3,4,5,6];const run=()=>new Promise((resolve,reject)=>{
  const setting=queue.shift();if(!setting)return resolve();
  const w=new Worker(new URL(import.meta.url),{workerData:{setting,sessions,my}});
  w.on('message',m=>{if(m.rows)fs.writeFileSync(path.join(dest,`setting-${setting}.json`),JSON.stringify(m));else console.log(JSON.stringify(m));});w.on('error',reject);w.on('exit',c=>c?reject(Error('Worker failed '+c)):run().then(resolve,reject));
 });await Promise.all([run(),run(),run()]);console.log('Operating samples complete');
}
