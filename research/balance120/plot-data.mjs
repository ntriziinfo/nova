import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {baseCommit,loadCandidate} from './model.mjs';
import {simulate} from '../burst112/production-model.mjs';
const selection=JSON.parse(fs.readFileSync('research/balance120/selected-data.json')),panels=[];
const previous=JSON.parse(fs.readFileSync('docs/balance118-final-summary.json'));
for(const setting of [1,6])for(const version of ['before','after']){
 const file=version==='before'?previous.settings.find(s=>s.setting===setting).file:selection.jobs.find(j=>j.setting===setting).file;
 const {rows,report}=JSON.parse(fs.readFileSync(file));
 if(version==='before'){for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInThisContext(execFileSync('git',['show',baseCommit+':'+f],{encoding:'utf8'}));}else loadCandidate(report);
 const net=r=>(r.firstComplete??r).net,sorted=rows.toSorted((a,b)=>net(a)-net(b)||a.seed-b.seed),curves=[];
 for(const percentile of [.1,.5,.9]){
  const row=sorted[Math.floor((rows.length-1)*percentile)],points=new Map([[0,0]]);
  const out=simulate(setting,30000,row.seed,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:true,onGame:(g,bet,paid)=>{if(g%20===0)points.set(g,paid-bet);}});
  points.set(out.games,out.net);for(const k of ['games','totalBet','totalPaid','net'])assert.equal(out[k],(row.firstComplete??row)[k],version+'/'+setting+'/'+k);
  curves.push({percentile,seed:row.seed,points:[...points],endNet:out.net});
 }
 panels.push({setting,version,trials:rows.length,curves});
}
fs.writeFileSync('docs/balance120-waveforms.json',JSON.stringify({selection:'Final stopped-net percentile 10/50/90; seed breaks ties; 20G sampling; complete stops',panels})+'\n');
