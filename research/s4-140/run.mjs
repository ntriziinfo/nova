import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {simulate} from '../../scripts/zone-v2-model.mjs';
const dir='research/s4-140';
export const files=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'];
export const hash=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
export const options={rng:'xoshiro128',exactGames:true,completeLimitPt:10000,stopAtComplete:false,recordBlocks:10000};
export function load(c={},cache=true){
 const sources={};
 for(const f of files){
  let s=fs.readFileSync(f,'utf8');sources[f]=hash(s);
  if(f==='nova-normal.js'&&c.czScale!==undefined){
   const re=/czScale:Object.freeze\(\[([^\]]+)\]\)/,m=s.match(re);assert(m);
   const row=m[1].split(',').map(Number);assert(row.every(Number.isFinite));row[3]=c.czScale;s=s.replace(re,'czScale:Object.freeze('+JSON.stringify(row)+')');
  }
  if(cache){
   const anchor=f==='nova-art.js'?'function atMix(setting=3){':f==='nova-flow.js'?'function lampWeights(p){':null;
   if(anchor){assert.equal(s.split(anchor).length,2);s=s.replace(anchor,f==='nova-art.js'?'const mixCache=new Map();function atMix(setting=3){let r=mixCache.get(setting);if(!r){r=computeAtMix(setting);mixCache.set(setting,r);}return {...r,r:{...r.r}};}function computeAtMix(setting=3){':'const lampCache=new Map();function lampWeights(p){if(!lampCache.has(p))lampCache.set(p,computeLampWeights(p));return lampCache.get(p);}function computeLampWeights(p){');}
  }
  vm.runInThisContext(s,{filename:f});
 }
 return sources;
}
export function stats(rows){
 const n=rows.length,bet=rows.reduce((s,r)=>s+r.totalBet,0),paid=rows.reduce((s,r)=>s+r.totalPaid,0),rtp=paid/bet;
 const se=Math.sqrt(rows.reduce((s,r)=>s+(r.totalPaid-rtp*r.totalBet)**2,0)/(n-1)/n)/(bet/n);
 return {trials:n,games:rows.reduce((s,r)=>s+r.games,0),bet,paid,rtp,ci95:[rtp-1.96*se,rtp+1.96*se],win:rows.filter(r=>r.net>0).length/n,netMean:(paid-bet)/n};
}
export function summarize(rows){
 const result={};
 for(const games of [20000,30000]){
  const full=rows.map(r=>{const blocks=r.blocks.filter(b=>b.endGame<=games);assert.equal(blocks.length,games/10000);const totalBet=blocks.reduce((s,b)=>s+b.totalBet,0),totalPaid=blocks.reduce((s,b)=>s+b.totalPaid,0);return {games,totalBet,totalPaid,net:totalPaid-totalBet};});
  const stopped=rows.map((r,i)=>r.firstComplete?.games<=games?r.firstComplete:full[i]);
  result[games]={full:stats(full),stopped:stats(stopped),completeRate:rows.filter(r=>r.firstComplete?.games<=games).length/rows.length};
 }
 const totals=Object.fromEntries(Object.keys(rows[0].counts).map(k=>[k,rows.reduce((n,r)=>n+r.counts[k],0)]));
 return {horizons:result,counts:totals,czDenom:totals.normal/(totals.czEntries+totals.strongEntries),czSuccess:totals.czWins/(totals.czEntries+totals.strongEntries),atDenom:totals.normal/totals.artEntries};
}
async function main(){
 if(process.argv[2]==='worker'){
  const c=JSON.parse(process.argv[3]),sources=load(c),rows=[],start=Date.now();
  for(let i=0;i<c.trials;i++){
   const seed=c.seedBase+i*7919,r=simulate(4,30000,seed,options);
   assert.equal(r.games,30000);assert.equal(r.net,r.totalPaid-r.totalBet);assert.equal(r.counts.gameCzEntries,0);assert.equal(r.counts.backgroundCzEntries,0);
   rows.push({seed,setting:4,games:r.games,totalBet:r.totalBet,totalPaid:r.totalPaid,net:r.net,firstComplete:r.firstComplete,blocks:r.blocks,counts:r.counts});
   if((i+1)%500===0)console.log(c.tag+': '+(i+1)+'/'+c.trials);
  }
  const summary=summarize(rows),report={config:c,sources,seconds:(Date.now()-start)/1000,summary,rows};
  fs.writeFileSync(dir+'/'+c.tag+'.json',JSON.stringify(report));console.log(JSON.stringify({tag:c.tag,seconds:report.seconds,...summary}));
 }else{
  const jobs=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  async function lane(){while(jobs.length){const c=jobs.shift();await new Promise((resolve,reject)=>{const child=fork(fileURLToPath(import.meta.url),['worker',JSON.stringify(c)],{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',n=>n===0?resolve():reject(Error('Worker exited '+n)));});}}
  await Promise.all(Array.from({length:3},lane));
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url))await main();
