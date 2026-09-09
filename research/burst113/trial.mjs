import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel,simulate} from '../burst112/production-model.mjs';
export const baseEntry=[.0006,.00115,.00165,.0027,.0036,.0052];
export function loadTrial({award=2000,entry=baseEntry}={}){
 loadModel('../research/burst113/baseline112');
 let source=fs.readFileSync('research/burst113/baseline112/nova-art.js','utf8');
 const replace=(a,b)=>{if(!source.includes(a))throw Error('Missing trial anchor: '+a);source=source.replace(a,b);};
 replace('success:.5,award:8000',`success:.5,award:${award}`);
 replace('entry:Object.freeze([.0006,.00115,.00165,.0027,.0036,.0052])',`entry:Object.freeze(${JSON.stringify(entry)})`);
 replace('＋8,000pt',`＋${award.toLocaleString('en-US')}pt`);
 vm.runInThisContext(source,{filename:'burst113/nova-art.js'});
 return NovaArt;
}
const sum=(rows,key)=>rows.reduce((s,r)=>s+r[key],0);
function ratio(rows){const bet=sum(rows,'totalBet'),paid=sum(rows,'totalPaid'),value=paid/bet,n=rows.length,se=Math.sqrt(rows.reduce((s,r)=>s+(r.totalPaid-value*r.totalBet)**2,0)/(n-1)/n)/(bet/n);return {bet,paid,value,ci:[value-1.96*se,value+1.96*se]};}
function wilson(k,n){const p=k/n,z=1.96,d=1+z*z/n,m=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [m-h,m+h];}
function atStats(episodes){const done=episodes.filter(e=>!e.censored),values=done.map(e=>e.paid).sort((a,b)=>a-b),n=values.length;return {completed:n,censored:episodes.length-n,mean:n?values.reduce((s,n)=>s+n,0)/n:null,p50:values[Math.floor((n-1)*.5)],p90:values[Math.floor((n-1)*.9)],p99:values[Math.floor((n-1)*.99)],over2000:n?values.filter(p=>p>2000).length/n:null,over10000:n?values.filter(p=>p>=10000).length/n:null};}
export function summarize(rows,config){
 const n=rows.length,complete=rows.filter(r=>r.firstComplete).length,stopped=rows.map(r=>r.firstComplete??r),episodes=rows.flatMap(r=>r.atEpisodes),count=k=>rows.reduce((s,r)=>s+r.counts[k],0);
 return {...config,setting:rows[0].setting,trials:n,gamesPerTrial:30000,games:sum(rows,'games'),complete,completeRate:complete/n,completeCI:wilson(complete,n),rtp:ratio(rows),stoppedRtp:ratio(stopped),stoppedGames:sum(stopped,'games'),ordinary:atStats(episodes.filter(r=>!r.burstWon)),burst:atStats(episodes.filter(r=>r.burstWon)),burstAttempts:rows.reduce((s,r)=>s+r.burst.attempts,0),burstWins:rows.reduce((s,r)=>s+r.burst.wins,0),atEntries:count('artEntries'),czEntries:count('czEntries')+count('strongEntries'),normalGames:count('normal')};
}
export function run(setting,trials,config){
 loadTrial(config);const rows=[];
 for(let i=0;i<trials;i++){
  rows.push(simulate(setting,30000,config.seedBase+setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false}));
  if((i+1)%100===0)console.log(`${config.tag} 設定${setting}: ${i+1}/${trials} × 30,000G`);
 }
 return {report:summarize(rows,config),rows};
}
