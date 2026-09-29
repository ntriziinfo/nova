import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Worker,isMainThread,parentPort} from 'node:worker_threads';
import {install,simulate,options,summarize,hashes} from './model.mjs';
const dir='research/release-173';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.split('=')));
if(!isMainThread){
 parentPort.on('message',job=>{
  const config=install(job.variant),rows=[];
  for(let i=job.start;i<job.start+job.count;i++){
   const seed=job.seed+'-S'+job.variant.setting+'-trial'+i,r=simulate(job.variant.setting,30000,seed,options);
   assert.equal(r.games,30000);assert.equal(r.rare.draws,30000);assert.equal(r.net,r.totalPaid-r.totalBet);assert.equal(r.decrement?.games,30000);
   rows.push(r);
  }
  parentPort.postMessage({id:job.id,config,rows});
 });
}else{
 const plan=JSON.parse(fs.readFileSync(args.plan)),trials=Number(args.trials||60),batch=Number(args.batch||10),workers=Number(args.workers||6),seed=args.seed||'NOVA-replay-base-pilot-20260929',output=args.output||'pilot';
 const sourceHashes=hashes(),rows=Object.fromEntries(Object.keys(plan).map(id=>[id,[]])),configs={},jobs=[],started=Date.now();let done=0;
 for(let start=0;start<trials;start+=batch)for(const[id,variant]of Object.entries(plan))jobs.push({id,variant,start,count:Math.min(batch,trials-start),seed});
 const total=jobs.length;
 const compact=()=>Object.fromEntries(Object.entries(rows).filter(([,r])=>r.length>=2).map(([id,r])=>{const s=summarize(r);return[id,{n:s.n,rtp:+(s.stopped.rtp*100).toFixed(2),win:+(s.stopped.winRate*100).toFixed(1),reach:+(s.reach*100).toFixed(1)}];}));
 await Promise.all(Array.from({length:workers},()=>new Promise((resolve,reject)=>{
  const worker=new Worker(new URL(import.meta.url));worker.on('error',reject);
  const next=()=>{const job=jobs.shift();if(job)worker.postMessage(job);else worker.terminate().then(resolve);};
  worker.on('message',({id,config,rows:chunk})=>{configs[id]=config;rows[id].push(...chunk);done++;
   if(done%18===0||done===total){const partial={done,total,seconds:Math.round((Date.now()-started)/1000),summary:compact()};fs.writeFileSync(`${dir}/${output}-progress.json`,JSON.stringify(partial));console.log(JSON.stringify(partial));}next();});next();
 })));
 const summary={};for(const[id,r]of Object.entries(rows)){assert.equal(r.length,trials);assert.equal(new Set(r.map(x=>x.seed)).size,trials);r.sort((a,b)=>Number(a.seed.split('trial').at(-1))-Number(b.seed.split('trial').at(-1)));summary[id]=summarize(r);}
 assert.deepEqual(hashes(),sourceHashes);
 fs.writeFileSync(`${dir}/${output}-rows.json`,JSON.stringify(rows));
 fs.writeFileSync(`${dir}/${output}.json`,JSON.stringify({proposalOnly:true,games:30000,trials,seed,plan,configs,options,sourceHashes,summary,seconds:(Date.now()-started)/1000},null,2));
 console.log(JSON.stringify({finished:true,seconds:(Date.now()-started)/1000,summary:compact()}));
}
