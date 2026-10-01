import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Worker,isMainThread,parentPort} from 'node:worker_threads';
import {loadModel,simulate} from './zone-v2-model.mjs';
const output='docs/at-bet-refund-validation-20261001.json';
const options={rng:'xoshiro128',exactGames:true,completeLimitPt:10000,stopAtComplete:true,rareSortie:true};
function summarize(rows){
 const n=rows.length,bet=rows.reduce((s,r)=>s+r.totalBet,0),paid=rows.reduce((s,r)=>s+r.totalPaid,0),rtp=paid/bet;
 const se=Math.sqrt(rows.reduce((s,r)=>s+(r.totalPaid-rtp*r.totalBet)**2,0)/(n-1)/n)/(bet/n);
 return {trials:n,rtp,ci95:[rtp-1.96*se,rtp+1.96*se],win:rows.filter(r=>r.net>0).length/n,complete:rows.filter(r=>r.complete).length/n,meanGames:rows.reduce((s,r)=>s+r.games,0)/n};
}
if(!isMainThread){
 loadModel();
 parentPort.on('message',job=>{
  const rows=[];
  for(let i=job.start;i<job.start+job.count;i++)for(const atBetRefund of [false,true]){
   const seed='NOVA-bet-refund-20261001-S'+job.setting+'-'+i;
   const r=simulate(job.setting,30000,seed,{...options,atBetRefund});
   assert.equal(r.totalPaid-r.totalBet,r.net);assert(r.games===30000||r.firstComplete);
   rows.push({setting:job.setting,trial:i,atBetRefund,games:r.games,totalBet:r.totalBet,totalPaid:r.totalPaid,net:r.net,complete:!!r.firstComplete});
  }
  parentPort.postMessage(rows);
 });
}else{
 const trials=Number(process.argv[2]||60),jobs=[],rows=[],started=Date.now();let lastPrint=0;
 for(let start=0;start<trials;start+=5)for(let setting=1;setting<=6;setting++)jobs.push({setting,start,count:Math.min(5,trials-start)});
 await Promise.all(Array.from({length:4},()=>new Promise((resolve,reject)=>{
  const w=new Worker(new URL(import.meta.url));w.on('error',reject);
  const next=()=>{const job=jobs.shift();if(job)w.postMessage(job);else w.terminate().then(resolve);};
  w.on('message',part=>{rows.push(...part);if(Date.now()-lastPrint>15000){lastPrint=Date.now();console.log(JSON.stringify({completed:rows.length,total:trials*12,seconds:(Date.now()-started)/1000}));}next();});next();
 })));
 const report={date:'2026-10-01',status:'pilot',gamesPerTrial:30000,trialsPerSettingAndVariant:trials,options,definition:'Pooled actual payout / charged BET. 30,000 total games including bonus, or cumulative net +10,000pt stop. Same reset seeds, independent trials. Only actually charged BETs during quota-consuming AT are restored.',seconds:(Date.now()-started)/1000,
  summary:Array.from({length:6},(_,i)=>({setting:i+1,before:summarize(rows.filter(r=>r.setting===i+1&&!r.atBetRefund)),after:summarize(rows.filter(r=>r.setting===i+1&&r.atBetRefund))})),rows};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));
}
