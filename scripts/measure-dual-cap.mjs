import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Worker,isMainThread,parentPort} from 'node:worker_threads';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadModel,simulate} from './zone-v2-model.mjs';
import {summarizeTrials} from './tuning-statistics.mjs';
const dir=process.argv[3]||'research/dual-cap-recheck';
const options={rng:'xoshiro128',exactGames:true,completeLimitPt:10000,completeMyLimitPt:15000,stopAtComplete:true,rareSortie:true,atBetRefund:true,replayRefund:true};
const hash=f=>createHash('sha256').update(fs.readFileSync(f,'utf8').replaceAll('\r\n','\n')).digest('hex');
if(!isMainThread){
 loadModel();
 parentPort.on('message',job=>{
  const rows=job.seeds.map(seed=>{
   const r=simulate(job.setting,job.horizon,seed,options);
   assert.equal(r.net,r.totalPaid-r.totalBet);assert.equal(r.totalBet,r.games*3);assert(r.firstComplete||r.games===job.horizon);
   if(r.firstComplete){assert.equal(r.games,r.firstComplete.games);assert.equal(r.net,r.firstComplete.net);}
   return {horizon:job.horizon,setting:job.setting,seed,games:r.games,totalBet:r.totalBet,totalPaid:r.totalPaid,net:r.net,peak:r.peak,lowestNet:r.lowestNet,maxMy:r.maxMy,firstComplete:r.firstComplete,counts:r.counts};
  });parentPort.postMessage(rows);
 });
}else{
 const n=Number(process.argv[2]||1000),rows=[],jobs=[],started=Date.now();let last=started;
 if(!Number.isSafeInteger(n)||n<2)throw new RangeError('Use at least two trials per setting');
 fs.mkdirSync(dir,{recursive:true});
 const sourceHashes=Object.fromEntries(['nova-art.js','nova-normal.js','nova-flow.js','nova-tuning.js','nova-decrement.js','nova-progress.js','nova-balance.js','nova-complete.js','scripts/zone-v2-model.mjs'].map(f=>[f,f]).map(([f,p])=>[f,hash(p)]));
 for(const horizon of [10000,50000])for(let setting=1;setting<=6;setting++)for(let i=0;i<n;i+=5)jobs.push({horizon,setting,seeds:Array.from({length:Math.min(5,n-i)},(_,j)=>'dual-cap-20261007|s'+setting+'|'+(i+j))});
 await Promise.all(Array.from({length:6},()=>new Promise((resolve,reject)=>{
  const w=new Worker(new URL(import.meta.url));w.on('error',reject);
  const next=()=>{const job=jobs.shift();if(job)w.postMessage(job);else w.terminate().then(resolve);};
  w.on('message',data=>{rows.push(...data);if(Date.now()-last>30000){last=Date.now();console.log(JSON.stringify({done:rows.length,total:n*12,seconds:Math.round((last-started)/1000)}));fs.writeFileSync(dir+'/progress.json',JSON.stringify({done:rows.length,total:n*12}));}next();});next();
 })));
 const results=[10000,50000].map(horizon=>({gamesPerTrial:horizon,trialsPerSetting:n,settings:[1,2,3,4,5,6].map(setting=>{
  const data=rows.filter(r=>r.horizon===horizon&&r.setting===setting),s=summarizeTrials(data);assert.equal(data.length,n);
  return {setting,rtp:s.stopped.rtp,rtpCi95:s.stopped.rtpCi95,win:s.stopped.winRate,winCi95:s.stopped.winCi95,reach:s.reach,reachCi95:s.reachCi95,complete:data.filter(r=>r.firstComplete).length/n,myComplete:data.filter(r=>r.firstComplete?.reason==='my').length/n,meanGames:data.reduce((sum,r)=>sum+r.games,0)/n,meanNet:s.stopped.meanNet,bet:s.stopped.bet,paid:s.stopped.paid};
 })}));
 for(const [f,digest]of Object.entries(sourceHashes))assert.equal(hash(f),digest,'live source changed: '+f);
 fs.writeFileSync(dir+'/results.json',JSON.stringify({options,sourceHashes,results,seconds:(Date.now()-started)/1000},null,2));
 fs.writeFileSync(dir+'/rows.json.gz',gzipSync(JSON.stringify(rows),{level:9}));console.log(JSON.stringify(results));
}
