import assert from 'node:assert/strict';
function estimate(values){const n=values.length,mean=values.reduce((s,v)=>s+v,0)/n,se=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/(n-1)/n);return {value:mean,ci:[mean-1.96*se,mean+1.96*se]};}
export function compare(before,after){
 assert.equal(before.rows.length,after.rows.length);
 before.rows.forEach((r,i)=>assert.equal(r.seed,after.rows[i].seed));
 const b=before.rows.map(r=>r.firstComplete??r),a=after.rows.map(r=>r.firstComplete??r),n=b.length;
 const rb=before.report.stoppedRtp.value,ra=after.report.stoppedRtp.value;
 const ba=b.reduce((s,r)=>s+r.totalBet,0)/n,aa=a.reduce((s,r)=>s+r.totalBet,0)/n;
 const influence=a.map((r,i)=>(r.totalPaid-ra*r.totalBet)/aa-(b[i].totalPaid-rb*b[i].totalBet)/ba);
 const radius=estimate(influence).ci[1];
 return {trials:n,rtp:{value:ra-rb,ci:[ra-rb-radius,ra-rb+radius]},reach:estimate(after.rows.map((r,i)=>Number(!!r.firstComplete)-Number(!!before.rows[i].firstComplete))),win:estimate(a.map((r,i)=>Number(r.net>0)-Number(b[i].net>0))),net:estimate(a.map((r,i)=>r.net-b[i].net))};
}
