import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {fileURLToPath} from 'node:url';import {xoshiro128} from './zone-v2-rng.mjs';
export const ROOT=path.dirname(fileURLToPath(import.meta.url));
export function loadModel(variant='..',cache=true){
 for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js']){
  let s=fs.readFileSync(path.join(ROOT,variant,f),'utf8');
  if(f==='nova-flow.js'&&cache)s=s.replace('function lampWeights(p){','const lampCache=new Map();function lampWeights(p){if(!lampCache.has(p))lampCache.set(p,computeLampWeights(p));return lampCache.get(p);}function computeLampWeights(p){');
  if(f==='nova-normal.js'&&variant==='baseline'){
   s=s.replace("if(rng()<rareEntry){token.entry=","if(rng()<rareEntry){token.entrySource='rare';token.entry=");
   s=s.replace("if(!forced){token.entry=NovaFlow.drawEntry(","if(!forced){token.entrySource='background';token.entry=NovaFlow.drawEntry(");
  }
  vm.runInThisContext(s,{filename:variant+'/'+f});
 }
}
export function lcg(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function mulberry(seed){return ()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function simulate(setting,games,seed,options={}){
 const a=NovaArt,n=NovaNormal,c={...a.defaults,setting,...options.art},rng=(options.rng==='xoshiro128'?xoshiro128:options.rng==='mulberry'?mulberry:lcg)(seed);
 let flow={phase:'normal'},state=options.initialImpurity===undefined?n.reset(rng,setting):n.normalize({impurity:options.initialImpurity});
 if(options.initialMode)state.mode=options.initialMode;
 if(options.initialModeWeights){let r=rng()*options.initialModeWeights.reduce((s,w)=>s+w,0);state.mode=n.modes[options.initialModeWeights.findIndex(w=>(r-=w)<0)];}
 const initialMode=state.mode;let cutoff=null;
 let paid=0,count=0,fee=0,replay=false,peak=0,maxDrawdown=0,maxNormalGames=0,artStart=null,maxArtNet=0;
 let bonusG=0,bonusP=0,bonusFee=0,freezes=0,ceilings=0,release=0,normalGap=0,maxBonusGap=0;
 const counts={normal:0,cz:0,prep:0,align:0,bonus:0,at:0,zone:0,zero:0,BIG:0,REG:0,czEntries:0,strongEntries:0,czWins:0,artEntries:0,zoneEntries:0,rareCzEntries:0,backgroundCzEntries:0,highNormalG:0,favoredNormalG:0};
 const atMetrics={eligible:0,high:0,zoneWins:0,directWins:0,directPoints:0,promotions:0,suica100:0,suica300:0};const blocks=[];let blockBet=0,blockPaid=0,blockPeak=0,firstComplete=null;
 const zones={},normalRoles={},normalPayout={bet:0,paid:0,games:0};
 const sessionEnd=Symbol('session end'),scale=NovaBalance.profile(setting).scale*(options.scaleMultiplier??1);
 const track=()=>{const net=paid-fee;peak=Math.max(peak,net);maxDrawdown=Math.max(maxDrawdown,peak-net);if(artStart!==null)maxArtNet=Math.max(maxArtNet,net-artStart);if(options.recordBlocks)blockPeak=Math.max(blockPeak,net-(blockPaid-blockBet));if(!firstComplete&&net>=19000)firstComplete={games:count,totalBet:fee,totalPaid:paid,net};};
 const saveBlock=()=>{blocks.push({endGame:count,totalBet:fee-blockBet,totalPaid:paid-blockPaid,net:paid-blockPaid-fee+blockBet,peak:blockPeak});blockBet=fee;blockPaid=paid;blockPeak=0;};
 const bet=phase=>{track();if(count>=games&&!cutoff)cutoff={games:count,totalBet:fee,totalPaid:paid,net:paid-fee,peak,phase};if(options.exactGames!==false&&!options.settleEnd&&count>=games)throw sessionEnd;if(options.recordBlocks&&count>0&&count%options.recordBlocks===0)saveBlock();count++;counts[phase]++;normalGap++;const charged=replay?0:3;fee+=charged;replay=false;return charged;};
 const zoneEntry=f=>{if(f.zone){counts.zoneEntries++;const name=(f.ura?'ura_':'')+f.zone;zones[name]=(zones[name]||0)+1;}};
 function bonus(kind,freeze=false){
  counts[kind==='MID'?'REG':'BIG']++;maxBonusGap=Math.max(maxBonusGap,normalGap);normalGap=0;
  const prep={sets:0,zones:[]};
  for(let i=0,total=2+Math.floor(rng()*4);i<total;i++){
   const role=(a.drawPreparationRole||n.drawRole)(setting,rng),won=a.drawPreparation(role,setting,rng);bet('prep');paid+=n.pay(role);replay=role==='REPLAY';prep.sets+=won.sets;prep.zones.push(...won.zones);
  }
  bet('align');const claim=n.claim(state,freeze,rng);if(state.impurity===100)release++;
  state=flow.phase==='art'?claim.state:n.afterBonus(claim.state,rng);claim.zones.push(...prep.zones);let sets=claim.sets+prep.sets;
  for(let bonusPaid=0;bonusPaid<a.bonusTarget(kind);){
   const r=a.drawBonus(rng,setting),pay=n.pay(r);bonusPaid+=pay;const before=fee;bet('bonus');bonusFee+=fee-before;paid+=pay;replay=r==='REPLAY';bonusG++;bonusP+=pay;track();if(r==='NEBULA')sets++;
  }
  const before=flow;flow=a.afterBonus(flow,c,sets);state=n.afterArt(state,before,flow);
  if(before.phase!=='art'&&flow.phase==='art')counts.artEntries++;
  if(flow.phase==='art'&&claim.zones.length){flow.queuedZones.push(...claim.zones);if(!flow.zone){flow=a.startZone(flow,flow.queuedZones.shift(),{...c,allowUra:true},rng);zoneEntry(flow);}}
 }
 try{while(count<games||(options.settleEnd&&flow.phase==='art')){
  track();if(flow.phase==='art'&&artStart===null)artStart=paid-fee;else if(flow.phase!=='art')artStart=null;
  if(flow.phase==='art'){
   const prior=flow;flow=a.prepareBet(flow,c,rng);if(!prior.zone&&flow.zone)zoneEntry(flow);
   if(!flow.zero)bet(flow.zone?'zone':'at');else counts.zero++;
   const eligible=!flow.zone&&!flow.entryStage&&!flow.queuedZones?.length&&Number(flow.stock||0)===0&&Number(flow.remaining)>0;
   const s=a.step(flow,{...c,netPt:options.netGuard===false?0:paid-fee},rng);
   if(eligible){atMetrics.eligible++;if(flow.atHigh)atMetrics.high++;if(s.flow.entryStage==='seven')atMetrics.zoneWins++;}
   if(s.atOutcome){const o=s.atOutcome;if(o.promoted)atMetrics.promotions++;if(o.direct){atMetrics.directWins++;atMetrics.directPoints+=o.direct;if(s.result==='STRONG_SUICA'&&o.direct===100)atMetrics.suica100++;if(s.result==='STRONG_SUICA'&&o.direct===300)atMetrics.suica300++;}}if(!flow.zone&&s.flow.zone)zoneEntry(s.flow);
   paid+=n.pay(s.result);if(s.result==='REPLAY')replay=true;state=n.afterArt(state,flow,s.flow);flow=s.flow;if(s.internalBonus)bonus('BIG');continue;
  }
  const normal=flow.phase==='normal',charged=bet(normal?'normal':'cz');
  if(normal){counts.highNormalG+=state.level==='high';counts.favoredNormalG+=n.favored(state);}
  const t=n.spin(state,flow,setting,{scale,normal:options.normal,cz:options.cz,art:c},rng);state=t.state;maxNormalGames=Math.max(maxNormalGames,state.games);paid+=n.pay(t.result);replay=t.result==='REPLAY';
  if(normal){normalRoles[t.result]=(normalRoles[t.result]||0)+1;normalPayout.bet+=charged;normalPayout.paid+=n.pay(t.result);normalPayout.games++;}
  if(t.result==='SUPER_NOVA'){const freeze=rng()<.5;if(freeze)freezes++;flow={phase:'normal'};bonus('BIG',freeze);}
  else if(t.internalBonus){if(t.internalBonus.source.includes('天井'))ceilings++;else counts.czWins++;flow={phase:'normal'};bonus(t.internalBonus.kind);}
  else if(t.direct){flow=a.enter(c);counts.artEntries++;}
  else if(t.entry){if(t.entry==='STRONG_CZ')counts.strongEntries++;else counts.czEntries++;if(t.entrySource==='rare')counts.rareCzEntries++;else if(t.entrySource==='background')counts.backgroundCzEntries++;flow=NovaFlow.enterCZ(t.entry==='STRONG_CZ',t.czOptions??options.cz,rng);}
  else flow=NovaFlow.advance(t.czFlow);
 }}catch(e){if(e!==sessionEnd)throw e;}
 track();maxBonusGap=Math.max(maxBonusGap,normalGap);if(options.recordBlocks)saveBlock();
 return {atMetrics,seed,setting,initialMode,cutoff:cutoff||{games:count,totalBet:fee,totalPaid:paid,net:paid-fee,peak,phase:flow.phase},games:count,totalBet:fee,totalPaid:paid,rtp:paid/fee,net:paid-fee,peak,maxDrawdown,maxNormalGames,maxBonusGap,maxArtNet,freezes,ceilings,release,bonusNet:(bonusP-bonusFee)/bonusG,counts,zones,normalRoles,normalPayout,endPhase:flow.phase,firstComplete,blocks:options.recordBlocks?blocks:undefined,unspentAtQuota:flow.phase==='art'?Number(flow.remaining||0)+Number(flow.sets||0)*c.initial+(flow.zone?Number(flow.award||0):0):0};
}
