import fs from 'node:fs';
export const bands=[
 {label:'−10,000pt未満',test:x=>x< -10000},
 {label:'−10,000〜−5,000pt未満',test:x=>x>=-10000&&x< -5000},
 {label:'−5,000〜0pt未満',test:x=>x>=-5000&&x<0},
 {label:'±0pt',test:x=>x===0},
 {label:'0超〜＋5,000pt未満',test:x=>x>0&&x<5000},
 {label:'＋5,000〜＋10,000pt未満',test:x=>x>=5000&&x<10000},
 {label:'＋10,000pt以上',test:x=>x>=10000}
];
function wilson(k,n){const p=k/n,z=1.96,d=1+z*z/n,m=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [m-h,m+h];}
export function distribution(rows,stopped){
 const values=rows.map(r=>{const s=stopped?(r.firstComplete??r):r;return s.totalPaid-s.totalBet;}).sort((a,b)=>a-b),n=values.length;
 const wins=values.filter(v=>v>0).length,draws=values.filter(v=>v===0).length,mean=values.reduce((s,v)=>s+v,0)/n;
 const quantile=p=>{const i=(n-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return values[lo]+(values[hi]-values[lo])*(i-lo);};
 const se=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/(n-1)/n);
 const result={trials:n,wins,winRate:wins/n,winRateCI:wilson(wins,n),draws,losses:n-wins-draws,mean,meanCI:[mean-1.96*se,mean+1.96*se],min:values[0],p05:quantile(.05),p25:quantile(.25),median:quantile(.5),p75:quantile(.75),p95:quantile(.95),max:values.at(-1),bands:bands.map(b=>({label:b.label,count:values.filter(b.test).length})),values};
 if(result.bands.reduce((s,b)=>s+b.count,0)!==n)throw Error('Invalid distribution bins');
 return result;
}
if(process.argv[2]){
 const tag=process.argv[2],sources=tag==='final'?JSON.parse(fs.readFileSync('research/burst113/selected-data.json')):[1,2,3,4,5,6].map(setting=>({setting,file:`docs/burst113-${tag}-${setting}.json`}));
 const out=sources.map(({setting,file})=>{const d=JSON.parse(fs.readFileSync(file));return {setting,sourceFile:file,report:d.report,stopped:distribution(d.rows,true),unlimited:distribution(d.rows,false)};});
 fs.writeFileSync(`docs/burst113-${tag}-distribution.json`,JSON.stringify({definition:{maxGames:30000,stopped:'net +10000pt complete or 30000G',unlimited:'exactly 30000G regardless of complete',win:'final net > 0',net:'actual payout minus actual BET'},settings:out},null,2)+'\n');
 console.log(JSON.stringify(out.map(r=>({s:r.setting,win:r.stopped.winRate,winCI:r.stopped.winRateCI,mean:r.stopped.mean,median:r.stopped.median,reach:r.report.completeRate,rtp:r.report.stoppedRtp.value,unlimitedWin:r.unlimited.winRate,unlimitedMean:r.unlimited.mean}))));
}
