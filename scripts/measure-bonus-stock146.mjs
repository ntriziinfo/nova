import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {loadModel,simulate} from './zone-v2-model.mjs';

const references={baseline:'be0c6c6',unadjusted:'448b577',tuned:'working-tree'};
const files=['nova-art.js','nova-normal.js','nova-flow.js','nova-balance.js'];
function sources(variant,factors){
 const result=Object.fromEntries(files.map(file=>[file,references[variant]==='working-tree'?fs.readFileSync(file,'utf8'):execFileSync('git',['show',references[variant]+':'+file],{encoding:'utf8',maxBuffer:8e6})]));
 if(variant==='tuned'&&factors){
  const marker=/bonusStockRules=Object\.freeze\(\{version:146,factors:Object\.freeze\(\[[^\]]+\]\)/;
  if(!marker.test(result['nova-art.js']))throw Error('Missing bonus-stock calibration marker');
  result['nova-art.js']=result['nova-art.js'].replace(marker,'bonusStockRules=Object.freeze({version:146,factors:Object.freeze('+JSON.stringify(factors)+')');
 }
 return result;
}
function install(src,cached=true){
 for(const file of files){
  let code=src[file];
  if(cached&&file==='nova-art.js')code=code.replace('function atMix(setting=3){','const researchMixCache=new Map();function atMix(setting=3){if(!researchMixCache.has(setting))researchMixCache.set(setting,researchAtMix(setting));const v=researchMixCache.get(setting);return {...v,r:{...v.r}};}function researchAtMix(setting=3){');
  if(cached&&file==='nova-flow.js')code=code.replace('function lampWeights(p){','const researchLampCache=new Map();function lampWeights(p){if(!researchLampCache.has(p))researchLampCache.set(p,researchLampWeights(p));return researchLampCache.get(p);}function researchLampWeights(p){');
  vm.runInThisContext(code,{filename:file});
 }
}
function estimate(rows,stopped=true){
 const b=rows.map(r=>stopped?r.bet:r.fullBet),p=rows.map(r=>stopped?r.paid:r.fullPaid),sum=a=>a.reduce((s,x)=>s+x,0);
 const bet=sum(b),paid=sum(p),rtp=paid/bet,meanBet=bet/rows.length;
 const influences=rows.map((_,i)=>(p[i]-rtp*b[i])/meanBet);
 const se=Math.sqrt(sum(influences.map(x=>x*x))/(rows.length-1)/rows.length);
 return {trials:rows.length,bet,paid,rtp,ci95:[rtp-1.96*se,rtp+1.96*se],completeRate:rows.filter(r=>r.complete).length/rows.length};
}
function compare(before,after,stopped=true){
 const x=estimate(before,stopped),y=estimate(after,stopped),field=stopped?['bet','paid']:['fullBet','fullPaid'];
 const d=before.map((r,i)=>{if(r.seed!==after[i].seed)throw Error('Unpaired seed');return (after[i][field[1]]-y.rtp*after[i][field[0]])/(y.bet/after.length)-(r[field[1]]-x.rtp*r[field[0]])/(x.bet/before.length);});
 const mean=d.reduce((s,x)=>s+x,0)/d.length,se=Math.sqrt(d.reduce((s,x)=>s+(x-mean)**2,0)/(d.length-1)/d.length),delta=y.rtp-x.rtp;
 return {delta,ci95:[delta-1.96*se,delta+1.96*se]};
}

if(!isMainThread){
 loadModel();
 parentPort.on('message',job=>{
  install(workerData.sources[job.variant]);
  const rows=[];
  for(let i=job.start;i<job.start+job.count;i++){
   const seed=workerData.seedBase+job.setting*1000003+i*7919;
   const r=simulate(job.setting,30000,seed,{rng:'xoshiro128',exactGames:true,completeLimitPt:10000,stopAtComplete:false});
   if(r.games!==30000)throw Error('Incomplete 30,000G trial');
   const stop=r.firstComplete;
   rows.push({seed,bet:stop?.totalBet??r.totalBet,paid:stop?.totalPaid??r.totalPaid,games:stop?.games??r.games,complete:!!stop,fullBet:r.totalBet,fullPaid:r.totalPaid});
  }
  parentPort.postMessage({job,rows});
 });
}else{
 const opts=Object.fromEntries(process.argv.slice(2).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
 const trials=Number(opts.trials||256),seedBase=Number(opts.seed||146100000),variants=(opts.variants||'baseline,unadjusted,tuned').split(','),settings=(opts.settings||'1,2,3,4,5,6').split(',').map(Number);
 const factors=opts.factors?opts.factors.split(',').map(Number):null;
 if(!Number.isInteger(trials)||trials<2||variants.some(v=>!references[v])||settings.some(s=>!Number.isInteger(s)||s<1||s>6))throw Error('Invalid trial/model/setting options');
 if(factors&&(factors.length!==6||factors.some(n=>!Number.isFinite(n)||n<0||n>1)))throw Error('Six factors in [0,1] required');
 const prefix=opts.output||'data/bonus-stock146-pilot',jobs=[],rows=Object.fromEntries(variants.map(v=>[v,Object.fromEntries(settings.map(s=>[s,[]]))]));
 for(const variant of variants)for(const setting of settings)for(let start=0;start<trials;start+=64)jobs.push({variant,setting,start,count:Math.min(64,trials-start)});
 const sourceCopies=Object.fromEntries(variants.map(v=>[v,sources(v,factors)]));
 const sourceHashes=Object.fromEntries(variants.map(v=>[v,Object.fromEntries(Object.entries(sourceCopies[v]).map(([f,s])=>[f,createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex')]))]));
 // Check that research-only pure math caches preserve every output and RNG draw.
 for(const variant of variants)for(const setting of [1,6]){
  const args=[setting,30000,146000+setting,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false}];
  install(sourceCopies[variant],false);const raw=JSON.stringify(simulate(...args));
  install(sourceCopies[variant]);if(JSON.stringify(simulate(...args))!==raw)throw Error('Research cache diverged: '+variant+'/'+setting);
 }
 const started=Date.now(),total=jobs.length;let finished=0;
 await Promise.all(Array.from({length:Math.min(Number(opts.workers||6),jobs.length)},()=>new Promise((resolve,reject)=>{
  const worker=new Worker(new URL(import.meta.url),{workerData:{sources:sourceCopies,seedBase}});
  worker.on('error',reject);
  const next=()=>{const job=jobs.shift();if(job)worker.postMessage(job);else worker.terminate().then(resolve);};
  worker.on('message',({job,rows:chunk})=>{rows[job.variant][job.setting].push(...chunk);finished++;if(finished%6===0||finished===total)console.log(JSON.stringify({finished,total,seconds:Math.round((Date.now()-started)/1000)}));next();});
  next();
 })));
 for(const variant of variants)for(const setting of settings)rows[variant][setting].sort((a,b)=>a.seed-b.seed);
 const summary=settings.map(setting=>({setting,models:Object.fromEntries(variants.map(v=>[v,{stopped:estimate(rows[v][setting]),uncapped:estimate(rows[v][setting],false)}])),comparisons:rows.baseline?Object.fromEntries(variants.filter(v=>v!=='baseline').map(v=>[v,{stopped:compare(rows.baseline[setting],rows[v][setting]),uncapped:compare(rows.baseline[setting],rows[v][setting],false)}])):{}}));
 fs.mkdirSync(prefix.slice(0,prefix.lastIndexOf('/')),{recursive:true});
 const simulationHashes=Object.fromEntries(['scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs','scripts/measure-bonus-stock146.mjs'].map(f=>[f,createHash('sha256').update(fs.readFileSync(f,'utf8').replaceAll('\r\n','\n')).digest('hex')]));
 const result={version:146,references,trials,gamesPerTrial:30000,completeLimitPt:10000,seedBase,factors,sourceHashes,simulationHashes,researchCaches:'atMix (fresh role copy), lampWeights; exact 30,000G parity on settings 1 and 6',seconds:(Date.now()-started)/1000,summary};
 fs.writeFileSync(prefix+'.json',JSON.stringify(result,null,2)+'\n');
 fs.writeFileSync(prefix+'-rows.json',JSON.stringify(rows)+'\n');
 console.log(JSON.stringify({output:prefix+'.json',summary}));
}
