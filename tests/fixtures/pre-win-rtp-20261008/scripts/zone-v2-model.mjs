import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {fileURLToPath} from 'node:url';import {xoshiro128,xoshiro128State} from './zone-v2-rng.mjs';
export const ROOT=path.dirname(fileURLToPath(import.meta.url));
export function loadModel(variant='..',cache=true,tuningOverrides){
 vm.runInThisContext(fs.readFileSync(path.join(ROOT,'../nova-complete.js'),'utf8'),{filename:'nova-complete.js'});
 globalThis.NovaDecrement=undefined;globalThis.NovaProgress=undefined;
 const files=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'];
 if(fs.existsSync(path.join(ROOT,variant,'nova-tuning.js'))){if(fs.existsSync(path.join(ROOT,variant,'nova-decrement.js')))files.unshift('nova-decrement.js');files.unshift('nova-tuning.js');files.push('nova-progress.js');}
 for(const f of files){
  let s=fs.readFileSync(path.join(ROOT,variant,f),'utf8');
  if(f==='nova-flow.js'&&cache)s=s.replace('function lampWeights(p){','const lampCache=new Map();function lampWeights(p){if(!lampCache.has(p))lampCache.set(p,computeLampWeights(p));return lampCache.get(p);}function computeLampWeights(p){');
  if(f==='nova-normal.js'&&variant==='baseline'){
   s=s.replace("if(rng()<rareEntry){token.entry=","if(rng()<rareEntry){token.entrySource='rare';token.entry=");
   s=s.replace("if(!forced){token.entry=NovaFlow.drawEntry(","if(!forced){token.entrySource='background';token.entry=NovaFlow.drawEntry(");
  }
  vm.runInThisContext(s,{filename:variant+'/'+f});
  if(f==='nova-tuning.js'&&tuningOverrides)globalThis.NovaTuning=NovaTuning.withOverrides(tuningOverrides);
 }
}
export function lcg(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function mulberry(seed){return ()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function simulate(setting,games,seed,options={}){
 options={rareSortie:!!globalThis.NovaTuning,rareDenominator:globalThis.NovaTuning?.profile(setting).denominator||10000,...options};
 // Frozen historical fixtures retain their original total-G lottery for replay tests.
 const roleSortieRates=options.roleSortieRates||(globalThis.NovaProgress?.sortieChance?Object.fromEntries(['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA'].map(role=>[role,NovaProgress.sortieChance(setting,role)])):null);
 const a=NovaArt,n=NovaNormal,replayRefund=!!a.replayRefund&&options.replayRefund!==false;
 const completeNetLimit=options.completeLimitPt??(replayRefund?10000:19000);
 const completeMyLimit=options.completeMyLimitPt??(replayRefund?15000:0),completion={};
 const refund=role=>replayRefund?a.replayRefund(role):0,cash=role=>n.pay(role)+refund(role);
 const c={...a.defaults,setting,...options.art,replayRefund},rng=(options.rng==='xoshiro128'?xoshiro128:options.rng==='mulberry'?mulberry:lcg)(seed);
 globalThis.NovaDecrement?.reset(setting,xoshiro128State(seed+'|decrement-interval'),options.decrement!==false);
 a.resetResearchCheckpoints?.();
 const atPayoutBins=Object.fromEntries(['0-499','500-999','1000-1999','2000-2999','3000-4999','5000-9999','10000+'].map(k=>[k,0]));
 const actualAtZone={normal:{games:0,wins:0},upper:{games:0,wins:0}};
 const upper={spins:0,upperGames:0,bySource:{initial:{started:0,won:0,failed:0},threshold:{started:0,won:0,failed:0},rare:{started:0,won:0,failed:0}}};
 const entryRng=xoshiro128(String(seed)+'|sortie-entry');
 const rare={...(roleSortieRates?{eligibleRoles:{},eligibleByPhase:{},triggersByRole:{}}:{}),draws:0,triggered:0,pending:0,started:0,completed:0,newAt:0,spins:0,stocks:0,guaranteedStocks:0,byPhase:{},tiers:{},stockHist:{},zones:{},audit:options.rareAudit?[]:undefined};
 const forcedRare=options.rareForcedGames?new Set(options.rareForcedGames):null;
 const isReady=()=>flow.phase==='art'&&!flow.initialStage&&!flow.zone&&!flow.entryStage&&!flow.atPrelude&&!flow.burstPending&&!flow.burstLeft&&!flow.researchSortieLeft&&!flow.queuedZones?.length&&Number(flow.sets||0)===0&&Number(flow.stock||0)===0;
 let flow={phase:'normal'},state=options.initialImpurity===undefined?n.reset(rng,setting):n.normalize({impurity:options.initialImpurity});
 if(options.initialMode)state.mode=options.initialMode;
 if(options.initialModeWeights){let r=rng()*options.initialModeWeights.reduce((s,w)=>s+w,0);state.mode=n.modes[options.initialModeWeights.findIndex(w=>(r-=w)<0)];}
 const initialMode=state.mode;let cutoff=null;
 let paid=0,count=0,fee=0,replay=false,peak=0,maxDrawdown=0,maxNormalGames=0,artStart=null,maxArtNet=0;
 let bonusG=0,bonusP=0,bonusFee=0,freezes=0,ceilings=0,release=0,normalGap=0,maxBonusGap=0;
 const counts={normal:0,cz:0,prep:0,align:0,bonus:0,at:0,zone:0,zero:0,BIG:0,REG:0,czEntries:0,strongEntries:0,czWins:0,artEntries:0,zoneEntries:0,gameCzEntries:0,ceilingCzEntries:0,rareCzEntries:0,backgroundCzEntries:0,highNormalG:0,favoredNormalG:0};
 const bonusMetrics={normal:{completed:0,nebulaWins:0},upper:{completed:0,nebulaWins:0}};
 const atLevelMetrics=Object.fromEntries([0,1,2,3,4,5].map(t=>[t,{entries:0,completed:0,completedPaid:0,completedNet:0,games:0}]));let treatmentStart=null;
 const atMetrics={eligible:0,high:0,zoneWins:0,directWins:0,directPoints:0,promotions:0,suica100:0,suica300:0};const blocks=[];let blockBet=0,blockPaid=0,blockPeak=0,firstComplete=null;
 const zones={},normalRoles={},normalPayout={bet:0,paid:0,games:0};
 const sessionEnd=Symbol('session end'),scale=NovaBalance.profile(setting).scale*(options.scaleMultiplier??1);
 const track=()=>{if(flow.phase==='art'&&!treatmentStart){const tier=flow.atLevel||0;treatmentStart={tier,paid,fee,comebackPaid:0};atLevelMetrics[tier].entries++;}if(flow.phase!=='art'&&treatmentStart){const row=atLevelMetrics[treatmentStart.tier];row.completed++;row.completedPaid+=paid-treatmentStart.paid;
 const total=paid-treatmentStart.paid;atPayoutBins[total<500?'0-499':total<1000?'500-999':total<2000?'1000-1999':total<3000?'2000-2999':total<5000?'3000-4999':total<10000?'5000-9999':'10000+']++;row.completedNet+=paid-treatmentStart.paid-fee+treatmentStart.fee;treatmentStart=null;}const net=paid-fee;globalThis.NovaDecrement?.observe(net);a.observeResearchNet?.(net);peak=Math.max(peak,net);maxDrawdown=Math.max(maxDrawdown,peak-net);if(artStart!==null)maxArtNet=Math.max(maxArtNet,net-artStart);if(options.recordBlocks)blockPeak=Math.max(blockPeak,net-(blockPaid-blockBet));NovaComplete.observe(completion,net,completeNetLimit,completeMyLimit);if(!firstComplete&&completion.locked)firstComplete={games:count,totalBet:fee,totalPaid:paid,net,...(completeMyLimit?{reason:completion.reason,my:net-completion.lowestNet}: {})};};
 const saveBlock=()=>{blocks.push({endGame:count,totalBet:fee-blockBet,totalPaid:paid-blockPaid,net:paid-blockPaid-fee+blockBet,peak:blockPeak});blockBet=fee;blockPaid=paid;blockPeak=0;};
 const roleSortie=(role,phase)=>{
  if(!roleSortieRates||!['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA'].includes(role))return;
  rare.eligibleRoles[role]=(rare.eligibleRoles[role]||0)+1;
  const byPhase=rare.eligibleByPhase[phase] ||= {};byPhase[role]=(byPhase[role]||0)+1;
  const chance=options.roleSortieRates?roleSortieRates[role]||0:globalThis.NovaProgress?.sortieChance?.(setting,role,paid-fee)??roleSortieRates?.[role]??0;
  if(options.rareSortie&&!forcedRare&&chance>0&&entryRng()<chance){rare.triggered++;rare.pending++;rare.byPhase[phase]=(rare.byPhase[phase]||0)+1;rare.triggersByRole[role]=(rare.triggersByRole[role]||0)+1;if(rare.audit)rare.audit.push({type:'trigger',game:count,phase,role});}
 };
 const bet=phase=>{track();if(options.stopAtComplete!==false&&completion.locked&&((replayRefund?completeNetLimit:options.completeLimitPt)||completeMyLimit))throw sessionEnd;if(count>=games&&!cutoff)cutoff={games:count,totalBet:fee,totalPaid:paid,net:paid-fee,peak,phase};if(options.exactGames!==false&&!options.settleEnd&&count>=games)throw sessionEnd;if(options.recordBlocks&&count>0&&count%options.recordBlocks===0)saveBlock();count++;globalThis.NovaDecrement?.beforeBet(phase);counts[phase]++;normalGap++;
 if(options.rareSortie){rare.draws++;const hit=forcedRare?forcedRare.has(count):roleSortieRates?false:entryRng()<1/(options.rareDenominator||10000);if(hit){rare.triggered++;rare.pending++;rare.byPhase[phase]=(rare.byPhase[phase]||0)+1;if(rare.audit)rare.audit.push({type:'trigger',game:count,phase});}}const charged=!replayRefund&&replay?0:3;fee+=charged;replay=false;completion.lowestNet=Math.min(completion.lowestNet||0,paid-fee);return charged;};
 const zoneEntry=f=>{if(f.zone){counts.zoneEntries++;const name=(f.ura?'ura_':'')+f.zone;zones[name]=(zones[name]||0)+1;}};
 function bonus(kind,freeze=false){
  if(a.drawBonusTier)kind='BIG';counts[kind==='MID'?'REG':'BIG']++;maxBonusGap=Math.max(maxBonusGap,normalGap);normalGap=0;
  const prep={sets:0,zones:[]};
  for(let i=0,total=2+Math.floor(rng()*4);i<total;i++){
   const role=(a.drawPreparationRole||n.drawRole)(setting,rng),won=a.drawPreparation(role,setting,rng);bet('prep');roleSortie(role,'prep');paid+=cash(role);replay=role==='REPLAY';prep.sets+=won.sets;prep.zones.push(...won.zones);
  }
  bet('align');const claim=n.claim(state,freeze,rng);if(state.impurity===100)release++;
  state=flow.phase==='art'?claim.state:n.afterBonus(claim.state,rng,setting);claim.zones.push(...prep.zones);let sets=claim.sets+prep.sets;
  const tier=a.drawBonusTier?.(rng)||'normal';let nebula=false;
  for(let bonusPaid=0;bonusPaid<a.bonusTarget(kind);){
   const r=a.drawBonus(rng,setting,tier,flow.phase==='art'||sets>0),pay=a.bonusPayout?a.bonusPayout({paid:bonusPaid},r):n.pay(r);bonusPaid+=pay;const before=fee;bet('bonus');roleSortie(r,'bonus');bonusFee+=fee-before;paid+=pay+refund(r);replay=r==='REPLAY';bonusG++;bonusP+=pay+refund(r);track();if(r==='NEBULA'){sets++;nebula=true;}
  }
  bonusMetrics[tier].completed++;bonusMetrics[tier].nebulaWins+=nebula;
  const before=flow;flow=a.afterBonus(flow,c,sets,rng);state=n.bonusEnd(state,kind,flow);state=n.afterArt(state,before,flow,{...options.normal,setting},rng);
  if(before.phase!=='art'&&flow.phase==='art')counts.artEntries++;
  if(flow.phase==='art'&&claim.zones.length){flow.queuedZones.push(...claim.zones);if(!flow.zone&&!flow.initialStage){flow=a.startZone(flow,flow.queuedZones.shift(),{...c,allowUra:true},rng);zoneEntry(flow);}}
 }
 try{while(count<games||(options.settleEnd&&flow.phase==='art')){
  track();if(options.stopAtComplete!==false&&completion.locked&&((replayRefund?completeNetLimit:options.completeLimitPt)||completeMyLimit))throw sessionEnd;if(flow.phase==='art'&&artStart===null)artStart=paid-fee;else if(flow.phase!=='art')artStart=null;
  if(a.hasResearchCheckpoint?.()&&flow.phase==='normal'&&!state.prelude){flow=a.enterResearchCheckpoint(c,rng);counts.artEntries++;track();}
  if(a.queueResearchThreshold&&a.observeResearchNet&&flow.phase==='art')flow=a.queueResearchThreshold(flow,paid-fee);
  if(options.rareSortie&&rare.pending){
   if(flow.phase==='normal'&&!state.prelude){flow=a.enterInitial(c,rng);counts.artEntries++;rare.newAt++;track();if(rare.audit)rare.audit.push({type:'newAt',game:count});}
   if(isReady()){rare.pending--;rare.started++;flow=a.beginResearchSortie(flow,rng);const p=flow.researchSortieRate;rare.tiers[p]=(rare.tiers[p]||0)+1;if(rare.audit)rare.audit.push({type:'start',game:count,rate:p});}
  }
  if(flow.phase==='art'){
   if(a.queueResearchThreshold)flow=a.queueResearchThreshold(flow,a.observeResearchNet?paid-fee:Math.max(0,paid-(treatmentStart?.paid??paid)-(treatmentStart?.comebackPaid||0)));
   const prior=flow;flow=a.prepareBet(flow,c,rng);if(!prior.zone&&flow.zone)zoneEntry(flow);
   if(!flow.zero){const charged=bet(flow.zone?'zone':'at');if(options.atBetRefund!==false&&a.restoreBetCost)flow=a.restoreBetCost(flow,charged);}else counts.zero++;
   if(!flow.zero)atLevelMetrics[flow.atLevel||0].games++;
   const eligible=!flow.researchSortieLeft&&!flow.zone&&!flow.entryStage&&!flow.queuedZones?.length&&Number(flow.stock||0)===0&&Number(flow.remaining)>0;
   const s=a.step(flow,{...c,netPt:options.netGuard===false?0:paid-fee},rng);
   if(!flow.zero&&!s.researchSortie&&!s.researchChallenge)roleSortie(s.result,flow.zone?'zone':'at');
   if(eligible){atMetrics.eligible++;if(flow.atHigh)atMetrics.high++;if(s.flow.entryStage==='seven')atMetrics.zoneWins++;}
   if(s.researchChallenge){const e=s.researchChallenge,r=upper.bySource[e.source];upper.spins++;if(e.started)r.started++;if(e.won)r.won++;if(e.finished&&!e.won)r.failed++;}
   if(eligible&&flow.researchUpper&&!s.researchChallenge)upper.upperGames++;
   if(s.researchSortie){const r=s.researchSortie;rare.spins++;rare.stocks+=r.won;rare.guaranteedStocks+=r.guaranteed;if(r.zone)rare.zones[r.zone]=(rare.zones[r.zone]||0)+1;if(r.finished){rare.completed++;rare.stockHist[r.hits]=(rare.stockHist[r.hits]||0)+1;}}
   if(options.rareSortie&&rare.pending&&s.flow.phase==='normal'){
    s.flow={...a.normalize(flow),remaining:'0',zone:'',entryStage:'',comebackLeft:0,comebackConfirmed:false,comebackLamp:'',dryEligible:false};
   }
   if(s.atOutcome){const measured=actualAtZone[flow.researchUpper?'upper':'normal'];measured.games++;measured.wins+=!!s.atOutcome.zone;const o=s.atOutcome;if(o.promoted)atMetrics.promotions++;if(o.direct){atMetrics.directWins++;atMetrics.directPoints+=o.direct;if(s.result==='STRONG_SUICA'&&o.direct===100)atMetrics.suica100++;if(s.result==='STRONG_SUICA'&&o.direct===300)atMetrics.suica300++;}}if(!flow.zone&&s.flow.zone)zoneEntry(s.flow);
   if(flow.comebackLeft&&!s.researchChallenge&&treatmentStart)treatmentStart.comebackPaid+=n.pay(s.result);paid+=cash(s.result);if(s.result==='REPLAY')replay=true;state=n.afterArt(state,flow,s.flow,{...options.normal,setting},rng);flow=s.flow;if(s.internalBonus)bonus('BIG');continue;
  }
  const normal=flow.phase==='normal',charged=bet(normal?'normal':'cz');
  if(normal){counts.highNormalG+=state.level==='high';counts.favoredNormalG+=n.favored(state);}
  const t=n.spin(state,flow,setting,{scale,normal:options.normal,cz:options.cz,art:c},rng);roleSortie(t.result,normal?'normal':'cz');state=t.state;maxNormalGames=Math.max(maxNormalGames,state.games);paid+=cash(t.result);replay=t.result==='REPLAY';
  if(normal){normalRoles[t.result]=(normalRoles[t.result]||0)+1;normalPayout.bet+=charged;normalPayout.paid+=cash(t.result);normalPayout.games++;}
  if(t.result==='SUPER_NOVA'){const freeze=rng()<.5;if(freeze)freezes++;flow={phase:'normal'};bonus('BIG',freeze);}
  else if(t.internalBonus){if(t.internalBonus.source.includes('天井'))ceilings++;else counts.czWins++;flow={phase:'normal'};bonus(t.internalBonus.kind);}
  else if(t.direct){flow=(a.enterInitial||a.enter)(c,rng);counts.artEntries++;}
  else if(t.entry){if(t.entry==='STRONG_CZ')counts.strongEntries++;else counts.czEntries++;if(t.entrySource==='game')counts.gameCzEntries++;if(t.entrySource==='ceiling')counts.ceilingCzEntries++;if(t.entrySource==='rare')counts.rareCzEntries++;else if(t.entrySource==='background')counts.backgroundCzEntries++;flow=NovaFlow.enterCZ(t.entry==='STRONG_CZ',t.czOptions??options.cz,rng);}
  else flow=NovaFlow.advance(t.czFlow);
 }}catch(e){if(e!==sessionEnd)throw e;}
 track();maxBonusGap=Math.max(maxBonusGap,normalGap);if(options.recordBlocks)saveBlock();
 return {lowestNet:completion.lowestNet||0,maxMy:completion.maxMy||0,completeReason:firstComplete?(completion.reason||'net'):null,...(options.decrementAudit?{decrement:globalThis.NovaDecrement?.metrics()}:{}),checkpointStats:a.researchCheckpointStats?.(),atPayoutBins,actualAtZone,upper,rare,atLevelMetrics,bonusMetrics,atMetrics,seed,setting,initialMode,cutoff:cutoff||{games:count,totalBet:fee,totalPaid:paid,net:paid-fee,peak,phase:flow.phase},games:count,totalBet:fee,totalPaid:paid,rtp:paid/fee,net:paid-fee,peak,maxDrawdown,maxNormalGames,maxBonusGap,maxArtNet,freezes,ceilings,release,bonusNet:(bonusP-bonusFee)/bonusG,counts,zones,normalRoles,normalPayout,endPhase:flow.phase,firstComplete,blocks:options.recordBlocks?blocks:undefined,unspentZoneStocks:flow.phase==='art'?Number(flow.sets||0)+(flow.queuedZones?.length||0):0,unspentAtQuota:flow.phase==='art'?Number(flow.remaining||0)+(flow.zone?Number(flow.award||0):0):0};
}
