import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {install,readSource,hashes,summarize,studySimulator} from './model.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.split('='))),dir='research/decrement-rollout-20260929';
const options={rng:'xoshiro128',exactGames:true,completeLimitPt:10000,stopAtComplete:false,rareSortie:true};
if(!isMainThread){
 const simulate=await studySimulator();
 parentPort.on('message',job=>{
  const control=install(workerData.source,job.variant),rows=[];
  for(let i=job.start;i<job.start+job.count;i++){
   const seed=job.seed+'-S'+job.variant.setting+'-trial'+i,r=simulate(job.variant.setting,30000,seed,options);
   assert.equal(r.games,30000);assert.equal(r.totalPaid-r.totalBet,r.net);r.decrement=control.snapshot();assert.equal(r.decrement.games,30000);rows.push(r);
  }
  parentPort.postMessage({job,rows});
 });
}else{
 const source=readSource(),before=hashes(source),plan=JSON.parse(fs.readFileSync(args.plan||dir+'/pilot-plan.json')),trials=Number(args.trials||100),batch=Number(args.batch||20),workers=Number(args.workers||6),seed=args.seed||'NOVA-decrement-pilot-20260929',output=args.output||'pilot';
 const rows=Object.fromEntries(Object.keys(plan).map(id=>[id,[]])),jobs=[],started=Date.now();let done=0;
 for(let start=0;start<trials;start+=batch)for(const [id,variant]of Object.entries(plan))jobs.push({id,variant,start,count:Math.min(batch,trials-start),seed});
 const total=jobs.length;
 await Promise.all(Array.from({length:workers},()=>new Promise((resolve,reject)=>{
  const w=new Worker(new URL(import.meta.url),{workerData:{source}});w.on('error',reject);
  const next=()=>{const job=jobs.shift();if(job)w.postMessage(job);else w.terminate().then(resolve);};
  w.on('message',({job,rows:chunk})=>{rows[job.id].push(...chunk);done++;if(done%12===0||done===total)console.log(JSON.stringify({done,total,seconds:Math.round((Date.now()-started)/1000)}));next();});next();
 })));
 const summary={};
 for(const [id,rr]of Object.entries(rows)){
  assert.equal(rr.length,trials);rr.sort((a,b)=>Number(a.seed.split('trial').at(-1))-Number(b.seed.split('trial').at(-1)));
  const sum=fn=>rr.reduce((s,r)=>s+fn(r),0);summary[id]={...summarize(rr),lowShare:sum(r=>r.decrement.lowGames)/(trials*30000),entries:sum(r=>r.decrement.entries)/trials,exits:sum(r=>r.decrement.exits)/trials};
 }
 assert.deepEqual(hashes(readSource()),before);
 const result={proposalOnly:true,sourceCommit:'f1111ae',createdAt:new Date().toISOString(),games:30000,trials,seed,plan,options,hashes:before,summary,seconds:(Date.now()-started)/1000};
 fs.writeFileSync(`${dir}/${output}-rows.json`,JSON.stringify(rows));fs.writeFileSync(`${dir}/${output}.json`,JSON.stringify(result,null,2));fs.writeFileSync(`${dir}/source.json`,JSON.stringify(source));
 console.log(JSON.stringify({finished:true,seconds:result.seconds,summary:Object.fromEntries(Object.entries(summary).map(([id,s])=>[id,{rtp:s.stopped.rtp,win:s.stopped.winRate,reach:s.reach,low:s.lowShare}]))}));
}
