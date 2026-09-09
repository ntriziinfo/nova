import fs from 'node:fs';import {loadModel,simulate} from './zone-v2-model.mjs';loadModel();
const setting=Number(process.argv[2]),trials=200,rows=[];
if(!(setting>=1&&setting<=6))throw Error('setting 1..6 required');
for(let i=0;i<trials;i++){rows.push(simulate(setting,10000,110000000+setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000}));if((i+1)%50===0)console.log({setting,done:i+1});}
const sum=k=>rows.reduce((s,r)=>s+r[k],0),count=k=>rows.reduce((s,r)=>s+r.counts[k],0);
const bet=sum('totalBet'),paid=sum('totalPaid'),rtp=paid/bet,meanBet=bet/trials,se=Math.sqrt(rows.reduce((s,r)=>s+(r.totalPaid-rtp*r.totalBet)**2,0)/(trials-1)/trials)/meanBet;
const bonus=Object.fromEntries(['normal','upper'].map(t=>{const completed=rows.reduce((s,r)=>s+r.bonusMetrics[t].completed,0),wins=rows.reduce((s,r)=>s+r.bonusMetrics[t].nebulaWins,0);return [t,{completed,wins,atChance:wins/completed}]}));
const report={setting,trials,games:sum('games'),rtp,ci95:[rtp-1.96*se,rtp+1.96*se],BIG:count('BIG'),REG:count('REG'),artEntries:count('artEntries'),czEntries:count('czEntries')+count('strongEntries'),bonus};
fs.writeFileSync(`docs/bonus110-setting-${setting}.json`,JSON.stringify({report,rows},null,2));console.log(report);
