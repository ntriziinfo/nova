import fs from 'node:fs';
import vm from 'node:vm';
import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {simulate} from '../burst112/production-model.mjs';
import {summarize} from '../burst113/trial.mjs';
const files=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'];
function load(c){
 for(const f of files){
  let s=fs.readFileSync(f,'utf8');
  if(f==='nova-art.js'){
   if(c.quota)s=s.replace(/const entryQuotaRules=Object.freeze\(.*?;\r?\n/,`const entryQuotaRules=Object.freeze(${JSON.stringify({version:128,...c.quota})});\n`);
   if(c.rules)s=s.replace(/const commonAtRules=Object.freeze\(.*?;\r?\n/,`const commonAtRules=Object.freeze(${JSON.stringify(c.rules)});\n`);
   if(c.boosts)s=s.replace(/normalBoost:Object.freeze\(\[[^\]]+\]\)/,`normalBoost:Object.freeze(${JSON.stringify(c.boosts)})`);
   if(c.entries)s=s.replace(/entry:Object.freeze\(\[[^\]]+\]\)/,`entry:Object.freeze(${JSON.stringify(c.entries)})`);
   s=s.replace('function atMix(setting=3){',`const mixCache=new Map();function atMix(setting=3){let r=mixCache.get(setting);if(!r){r=computeAtMix(setting);mixCache.set(setting,r);}return {...r,r:{...r.r}};}function computeAtMix(setting=3){`);
  }
  if(f==='nova-normal.js'&&c.czScales)s=s.replace(/czScale:Object.freeze\(\[[^\]]+\]\)/,`czScale:Object.freeze(${JSON.stringify(c.czScales)})`);
  if(f==='nova-normal.js'&&c.base){s=s.replace(/r.REPLAY=frequent\*[\d.]+/,`r.REPLAY=frequent*${c.replay??.48}`).replace(/rarePay-50\/[\d.]+/,`rarePay-50/${c.base}`);}
  if(f==='nova-flow.js')s=s.replace('function lampWeights(p){','const lampCache=new Map();function lampWeights(p){if(!lampCache.has(p))lampCache.set(p,computeLampWeights(p));return lampCache.get(p);}function computeLampWeights(p){');
  vm.runInThisContext(s,{filename:f});
 }
 for(let setting=1;setting<=6;setting++)for(const probabilities of [NovaArt.roleProbabilities(setting),NovaNormal.roleProbabilities(setting)]){
  if(Object.values(probabilities).some(p=>p<0||p>1)||Math.abs(Object.values(probabilities).reduce((a,b)=>a+b,0)-1)>1e-10)throw Error('Invalid probabilities for setting '+setting);
 }
}
function run(c){
 load(c);const rows=[],start=Date.now();
 for(let i=0;i<c.trials;i++){
  rows.push(simulate(c.setting,30000,c.seedBase+c.setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:true}));
  if((i+1)%250===0)console.log(`${c.tag} S${c.setting}: ${i+1}/${c.trials}`);
 }
 const report=summarize(rows,c),episodes=rows.flatMap(r=>r.atEpisodes),done=episodes.filter(e=>!e.censored),bins=[[0,500],[500,1000],[1000,2000],[2000,3000],[3000,4000],[4000,10000],[10000,Infinity]];
 report.distribution=bins.map(([lo,hi])=>({lo,hi:Number.isFinite(hi)?hi:null,count:done.filter(e=>e.paid>=lo&&e.paid<hi).length,rate:done.filter(e=>e.paid>=lo&&e.paid<hi).length/done.length}));
 report.episodes={completed:done.length,censored:episodes.length-done.length,mean:done.reduce((a,e)=>a+e.paid,0)/done.length,netMean:done.reduce((a,e)=>a+e.net,0)/done.length,reach2000:episodes.filter(e=>e.paid>=2000).length/episodes.length,mid:done.filter(e=>e.paid>=800&&e.paid<1500).length/done.length};
 report.win=rows.filter(r=>r.net>0).length/rows.length;report.seconds=(Date.now()-start)/1000;
 report.sourceHashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
 report.canonicalSourceHashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n')).digest('hex')]));
 fs.writeFileSync(`research/role128/${c.tag}-${c.setting}.json`,JSON.stringify({report,rows})+'\n');
 console.log(JSON.stringify({tag:c.tag,s:c.setting,rtp:report.rtp.value,reach:report.completeRate,win:report.win,...report.episodes,seconds:report.seconds}));
}
if(process.argv[2]==='worker')run(JSON.parse(process.argv[3]));
else{
 const jobs=JSON.parse(fs.readFileSync(process.argv[2]));
 async function lane(){while(jobs.length){const c=jobs.shift();await new Promise((resolve,reject)=>{const child=fork(fileURLToPath(import.meta.url),['worker',JSON.stringify(c)],{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',n=>n===0?resolve():reject(Error('Worker exit '+n)));});}}
 await Promise.all(Array.from({length:3},lane));
}
