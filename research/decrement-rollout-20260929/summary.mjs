const wilson=(wins,n)=>{const p=wins/n,z=1.96,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return[c-h,c+h];};
export function summarize(rows){
 const n=rows.length,sum=fn=>rows.reduce((s,r)=>s+fn(r),0);
 function ledger(stopped){
  const ledgers=rows.map(r=>stopped&&r.firstComplete?r.firstComplete:r),fee=ledgers.reduce((s,r)=>s+r.totalBet,0),paid=ledgers.reduce((s,r)=>s+r.totalPaid,0),ratio=paid/fee;
  const residualVariance=ledgers.reduce((s,r)=>s+(r.totalPaid-ratio*r.totalBet)**2,0)/(n-1),se=Math.sqrt(residualVariance/n)/(fee/n);
  const nets=ledgers.map(r=>r.totalPaid-r.totalBet),sorted=[...nets].sort((a,b)=>a-b),mean=nets.reduce((a,b)=>a+b,0)/n;
  const q=p=>{const k=(n-1)*p,i=Math.floor(k);return sorted[i]+(sorted[Math.ceil(k)]-sorted[i])*(k-i);};
  return {rtp:ratio,rtpCi95:[ratio-1.96*se,ratio+1.96*se],totalBet:fee,totalPaid:paid,winRate:nets.filter(x=>x>0).length/n,meanNet:mean,p10:q(.1),median:q(.5),p90:q(.9),netSd:Math.sqrt(nets.reduce((s,x)=>s+(x-mean)**2,0)/(n-1))};
 }
 const hits=sum(r=>!!r.firstComplete),normalGames=sum(r=>r.counts.normal),navis=sum(r=>r.navi?.navis||0),normalCost=sum(r=>r.normalPayout.bet-r.normalPayout.paid);
 return {n,stopped:ledger(true),uncapped:ledger(false),reach:hits/n,reachCi95:wilson(hits,n),normalGames,realizedNormalBase:50*normalGames/normalCost,navis,naviDenominator:navis?normalGames/navis:null,atPerNormalG:normalGames/sum(r=>r.counts.artEntries),czPerNormalG:normalGames/sum(r=>r.counts.czEntries+r.counts.strongEntries),thresholds:sum(r=>r.checkpointStats.started)/n};
}
