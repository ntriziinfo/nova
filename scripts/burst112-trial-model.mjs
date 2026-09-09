// In-memory design trial. Does not change or deploy the live game.
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from './zone-v2-model.mjs';
import {simulate} from '../research/burst112/session-model.mjs';
export function loadBurstTrial({kick=1500,pass=.5,entry=[.02,.04,.06,.1,.15,.2],normalBoost=0}={}){
 loadModel('../research/burst112/baseline111');
 // Raise real game-count CZ chances and favor short normal modes. The mode
 // ceilings, forbidden zones, prelude hints and BIG's 52%/80% remain unchanged.
 if(!Number.isFinite(normalBoost)||normalBoost<0||normalBoost>1)throw Error('normalBoost must be in [0,1]');
 for(const rates of Object.values(NovaNormal.gameZoneRates))for(const g in rates)rates[g]+=(1-rates[g])*normalBoost;
 const heavenBias=.8*normalBoost;
 const favorHeaven=row=>{for(let i=0;i<row.length;i++)row[i]=row[i]*(1-heavenBias)+(i===5?100*heavenBias:0);};
 NovaNormal.transitions.forEach(favorHeaven);Object.values(NovaNormal.atEndModeWeights).forEach(favorHeaven);
 globalThis.Burst112={kick,pass,entry,attempts:0,wins:0,reset(){this.attempts=0;this.wins=0;}};
 let source=fs.readFileSync('research/burst112/baseline111/nova-art.js','utf8');
 const replace=(before,after)=>{if(!source.includes(before))throw Error('Missing trial anchor: '+before);source=source.replace(before,after);};
 replace('return {atLevel:atLevel(v?.atLevel),','return {burstUsed:!!v?.burstUsed,burstPending:!!v?.burstPending,burstLeft:Math.max(0,Number(v?.burstLeft)||0),burstWon:!!v?.burstWon,atLevel:atLevel(v?.atLevel),');
 replace("if(s.entryStage==='seven'){",`if((s.burstPending&&!s.zone&&!s.entryStage)||s.burstLeft){
    if(!s.burstLeft){s.burstLeft=3;s.burstPending=false;Burst112.attempts++;}
    const hit=rng()<1-Math.pow(1-Burst112.pass,1/3);s.burstLeft--;
    if(hit){s.burstLeft=0;s.burstWon=true;s.dryEligible=false;s.atLevel=5;s.remaining=(integer(s.remaining)+BigInt(Burst112.kick)).toString();Burst112.wins++;}
    return {result:hit?'NEBULA':'MISS',flow:s,message:hit?'爆発チャレンジ成功':'爆発チャレンジ',zoneSpin:true};
   }
   if(s.entryStage==='seven'){`);
 replace('atOutcome=resolveAtRole(s,result,options.setting,rng,options.netPt);',`atOutcome=resolveAtRole(s,result,options.setting,rng,options.netPt);
    const trigger={WEAK_SUICA:.05,STRONG_SUICA:.5,CHANCE_A:.2,CHANCE_B:.2,WEAK_NOVA:.1,STRONG_NOVA:1}[result]||0;
    if(!s.burstUsed&&trigger&&rng()<trigger*Burst112.entry[validSetting(options.setting)-1]){s.burstUsed=true;s.burstPending=true;}`);
 replace('const paid=s.entryStage?0n:', 'const paid=s.entryStage||s.burstPending?0n:');
 vm.runInThisContext(source,{filename:'burst112-trial/nova-art.js'});
 return globalThis.NovaArt;
}
export function runBurstTrial(setting,trials,{normalBoost=0,entry,kick,pass,seedBase=112100000,maxGames=30000,live=false}={}){
 loadBurstTrial({entry,kick,pass,normalBoost});
 if(live)loadModel('../research/burst112/baseline111');
 const mixes=[[35,45,20,0,0],[30,45,25,0,0],[25,45,30,0,0],[20,40,40,0,0],[15,35,50,0,0],[10,30,60,0,0]];
 const rows=[];for(let i=0;i<trials;i++){
  Burst112.reset();const row=simulate(setting,maxGames,seedBase+setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false,...(live?{}:{cz:{czChance:.4+.4*normalBoost,strongChance:.7+.2*normalBoost},art:{atLevelWeights:mixes[setting-1]}})});
  row.burst={attempts:Burst112.attempts,wins:Burst112.wins};rows.push(row);
 }
 const sum=k=>rows.reduce((s,r)=>s+r[k],0),bet=sum('totalBet'),paid=sum('totalPaid'),rtp=paid/bet,complete=rows.filter(r=>r.firstComplete).length;
 const se=Math.sqrt(rows.reduce((s,r)=>s+(r.totalPaid-rtp*r.totalBet)**2,0)/(trials-1)/trials)/(bet/trials);
 const episodes=rows.flatMap(r=>r.atEpisodes),ordinary=episodes.filter(r=>!r.burstWon&&!r.censored),burst=episodes.filter(r=>r.burstWon&&!r.censored);
 const episodeStats=list=>{const values=list.map(r=>r.paid).sort((a,b)=>a-b);return {completed:list.length,mean:values.reduce((s,p)=>s+p,0)/values.length,p50:values[Math.floor((values.length-1)*.5)],p90:values[Math.floor((values.length-1)*.9)],p95:values[Math.floor((values.length-1)*.95)],p99:values[Math.floor((values.length-1)*.99)],over2000:values.filter(v=>v>2000).length/values.length};};
 const count=k=>rows.reduce((s,r)=>s+r.counts[k],0),normalGames=count('normal'),czEntries=count('czEntries')+count('strongEntries'),artEntries=count('artEntries');
 const z=1.96,p=complete/trials,center=(p+z*z/(2*trials))/(1+z*z/trials),half=z*Math.sqrt(p*(1-p)/trials+z*z/(4*trials*trials))/(1+z*z/trials);
 return {report:{maxGames,stopAtComplete:false,live,ordinary:episodeStats(ordinary),burst:episodeStats(burst),censoredOrdinary:episodes.filter(r=>!r.burstWon&&r.censored).length,censoredBurst:episodes.filter(r=>r.burstWon&&r.censored).length,setting,trials,normalBoost,entry:live?0:Burst112.entry[setting-1],kick:live?0:Burst112.kick,pass:live?0:Burst112.pass,weights:live?NovaArt.atLevelRules.weights[setting-1]:mixes[setting-1],seedBase,bet,paid,games:sum('games'),rtp,rtpCI:[rtp-1.96*se,rtp+1.96*se],complete,completeRate:complete/trials,completeCI:[center-half,center+half],normalGames,czEntries,artEntries,normalPerCz:normalGames/czEntries,nonAtPerAt:(normalGames+count('cz')+count('prep')+count('align')+count('bonus'))/artEntries,burstAttempts:rows.reduce((s,r)=>s+r.burst.attempts,0),burstWins:rows.reduce((s,r)=>s+r.burst.wins,0)},rows};
}
