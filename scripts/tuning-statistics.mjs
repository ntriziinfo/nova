export function summarizeTrials(rows){
 const n=rows.length;if(n<2)throw new RangeError('At least two trials are required');
 const wilson=k=>{const p=k/n,z=1.96,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return[c-h,c+h];};
 const ledger=stop=>{
  const data=rows.map(r=>stop&&r.firstComplete?r.firstComplete:r);
  const bet=data.reduce((s,r)=>s+r.totalBet,0),paid=data.reduce((s,r)=>s+r.totalPaid,0),rtp=paid/bet;
  const se=Math.sqrt(data.reduce((s,r)=>s+(r.totalPaid-rtp*r.totalBet)**2,0)/(n-1)/n)/(bet/n);
  const nets=data.map(r=>r.totalPaid-r.totalBet).sort((a,b)=>a-b),wins=nets.filter(x=>x>0).length;
  const quantile=p=>{const k=(n-1)*p,i=Math.floor(k);return nets[i]+(nets[Math.ceil(k)]-nets[i])*(k-i);};
  return {rtp,rtpCi95:[rtp-1.96*se,rtp+1.96*se],winRate:wins/n,winCi95:wilson(wins),meanNet:(paid-bet)/n,p10:quantile(.1),median:quantile(.5),p90:quantile(.9),bet,paid};
 };
 const reached=rows.filter(r=>r.peak>=10000).length,normalGames=rows.reduce((a,r)=>a+r.counts.normal,0);
 return {n,uncapped:ledger(false),stopped:ledger(true),reach:reached/n,reachCi95:wilson(reached),
  final10000:rows.filter(r=>r.net>=10000).length/n,
  normalAtDenominator:normalGames/rows.reduce((a,r)=>a+r.counts.artEntries,0),
  normalCzDenominator:normalGames/rows.reduce((a,r)=>a+r.counts.czEntries+r.counts.strongEntries,0)};
}
