import {simulate} from '../burst112/production-model.mjs';
import {summarize} from '../burst113/trial.mjs';
import {loadCandidate} from './model.mjs';
const stats=values=>{const sorted=values.toSorted((a,b)=>a-b),n=values.length,mean=values.reduce((a,b)=>a+b,0)/n;return {n,mean,sd:Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/(n-1)),p10:sorted[Math.floor(n*.1)],p50:sorted[Math.floor(n*.5)],p90:sorted[Math.floor(n*.9)],p99:sorted[Math.floor(n*.99)]};};
export function run(job){
 loadCandidate(job);const rows=[],started=Date.now(),challenge={entries:{points:0,ura:0},wins:{points:0,ura:0},awards:{500:0,1000:0,2000:0},levels:{0:0,4:0,5:0},ura:{ura_giru:0,ura_sora:0,ura_ouma:0}},step=NovaArt.step;
 NovaArt.step=(value,options,rng,forced)=>{const t=step(value,options,rng,forced);if(value.burstPending&&t.burstEvent)challenge.entries[value.burstType||'points']++;if(t.burstEvent==='success'){challenge.wins[value.burstType||'points']++;if(t.burstReward?.type==='points'){challenge.awards[t.burstReward.points]++;challenge.levels[t.burstReward.promoted?t.burstReward.level:0]++;}else if(t.burstReward?.zone)challenge.ura[t.burstReward.zone]++;}return t;};
 for(let i=0;i<job.trials;i++){
  rows.push(simulate(job.setting,30000,job.seedBase+job.setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false,recordBlocks:1000}));
  if((i+1)%100===0)console.log(`${job.tag} S${job.setting}: ${i+1}/${job.trials} × 30,000G`);
 }
 const report=summarize(rows,job),blocks=rows.flatMap(r=>r.blocks).filter(b=>b.endGame%1000===0&&b.totalBet>0),net=blocks.map(b=>b.net);
 const stoppedNet=rows.flatMap(r=>r.blocks.filter(b=>b.endGame<=(r.firstComplete?.games??30000)&&b.endGame%1000===0&&b.totalBet>0)).map(b=>b.net);
 Object.assign(report,{challenge,win:rows.filter(r=>(r.firstComplete??r).net>0).length/job.trials,reachWithoutBurst:rows.filter(r=>r.firstComplete&&!r.firstComplete.burstWins).length/job.trials,volatility:{block1000:stats(net),drop500:net.filter(n=>n<=-500).length/net.length,rise500:net.filter(n=>n>=500).length/net.length,drawdown:stats(rows.map(r=>r.maxDrawdown)),maxNormalGames:stats(rows.map(r=>r.maxNormalGames))},seconds:(Date.now()-started)/1000});
 report.stoppedVolatility={block1000:stats(stoppedNet),drop500:stoppedNet.filter(n=>n<=-500).length/stoppedNet.length,rise500:stoppedNet.filter(n=>n>=500).length/stoppedNet.length};
 return {report,rows};
}
export const compact=r=>({tag:r.tag,s:r.setting,rtp:r.stoppedRtp.value,reach:r.completeRate,win:r.win,ordinary:r.ordinary.mean,burst:r.burst.mean,attempts:r.burstAttempts,vol:r.volatility.block1000.sd,drop:r.volatility.drop500,rise:r.volatility.rise500,drawdown:r.volatility.drawdown.p50,seconds:r.seconds});
