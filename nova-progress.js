/* Session-level sortie queue and cumulative-net checkpoints. Saved with the machine. */
globalThis.NovaProgress=(()=>{
 const a=NovaArt;
 const empty=()=>({version:167,next:2400,pending:0,sorties:0,earned:0,started:0,upperRetries:0,discardedPt:0,discardedZones:0,discardedSets:0,discardedBonusStocks:0,newAt:0,rewardZones:0});
 let state=empty();
 function bind(value,priorPeak=0){
  if(value?.version!==167)value={...empty(),next:2400*(1+Math.floor(Math.max(0,Number(priorPeak)||0)/2400))};
  state=value;
  state.next=Math.max(2400,Math.floor(Number(state.next)||2400));
  for(const k of Object.keys(empty()).filter(k=>!['version','next'].includes(k)))state[k]=Math.max(0,Math.floor(Number(state[k])||0));
  return state;
 }
 function reset(){state=empty();}
 function observeNet(net){while(Number(net)>=state.next){state.next+=2400;state.pending++;state.earned++;}}
 function drawSortie(setting,rng=Math.random){const won=rng()<1/NovaTuning.profile(setting).denominator;if(won)state.sorties++;return won;}
 function queueThreshold(value,net){
  observeNet(net);if(value?.phase!=='art')return value;const s={...value};
  if(state.pending&&!s.burstPending&&!s.researchChallengeActive&&!s.burstLeft){state.pending--;s.burstPending=true;s.researchChallengeSource='threshold';}
  return s;
 }
 function enterCheckpoint(c,rng=Math.random){state.newAt++;return {...a.enter(c,rng),remaining:'0',initialStage:'',initialWait:0};}
 function ready(s){return s?.phase==='art'&&!s.initialStage&&!s.zone&&!s.entryStage&&!s.atPrelude&&!s.burstPending&&!s.burstLeft&&!s.researchSortieLeft&&!s.queuedZones?.length&&Number(s.sets||0)===0&&Number(s.stock||0)===0;}
 function beforeBet(flow,c,net,blocked=false,rng=Math.random){
  if(blocked)return flow;
  observeNet(net);
  if(state.pending&&flow?.phase==='normal')flow=enterCheckpoint(c,rng);
  if(flow?.phase==='art')flow=queueThreshold(flow,net);
  if(state.sorties){
   if(flow?.phase==='normal')flow=enterInitial(c,rng);
   if(ready(flow)){state.sorties--;flow=a.beginResearchSortie(flow,rng,c.setting);}
  }
  return flow;
 }
 function clearCarry(s){
  const discarded={pt:Number(s.remaining||0),zones:s.queuedZones?.length||0,sets:Number(s.sets||0),bonusStocks:Number(s.stock||0)};
  Object.assign(s,{remaining:'0',sets:'0',stock:'0',queuedZones:[],pendingZone:'',entryStage:'',rouletteTable:0,comebackLeft:0,comebackLamp:'',comebackConfirmed:false,zoneSets:'0',zoneZones:'0',award:'0',initialAward:'0',atHigh:false,atHighLeft:0});
  return discarded;
 }
 function initial(s){
  if(s.phase==='art'&&s.researchChallengeSource==='initial')Object.assign(s,{initialStage:'',initialWait:0,initialPlan:[],initialIndex:0,remaining:'0'});
  return s;
 }
 function enterInitial(c,rng=Math.random){return initial(a.enterInitial(c,rng));}
 function afterBonus(v,c,won=0,rng=Math.random){const s=a.afterBonus(v,c,won,rng);return v?.phase!=='art'?initial(s):s;}
 function step(value,c,rng=Math.random,forced=''){
  const out=a.step(value,c,rng,forced),e=out.researchChallenge;
  if(e){
   if(e.started&&e.source==='threshold'){
    e.wasUpper=!!value.researchUpper;e.discarded=clearCarry(out.flow);out.flow.researchUpper=false;
    state.started++;state.upperRetries+=Number(e.wasUpper);state.discardedPt+=e.discarded.pt;
    state.discardedZones+=e.discarded.zones;state.discardedSets+=e.discarded.sets;state.discardedBonusStocks+=e.discarded.bonusStocks;
   }
   if(['threshold','initial'].includes(e.source)&&e.finished){
    Object.assign(out.flow,{researchUpper:e.won,burstWon:e.won,dryEligible:false,comebackLeft:0,comebackLamp:'',comebackConfirmed:false,
     pendingZone:a.pickAtZone(c.setting||3,false,rng),entryStage:'seven',giruSetting:c.setting||3,rouletteTable:0});
    e.reward='zone';state.rewardZones++;
   }
   out.message=e.won?'上位ATチャレンジ成功！':e.finished?'チャレンジ終了 / 通常ATへ':e.priorAim?'ノヴァ揃いなら上位AT！':e.nextAim?'HOLD / 次ゲームでノヴァを狙え':'上位ATチャレンジ 残り'+e.left+'G';
  }
  if(out.researchSortie){const e=out.researchSortie;out.message='ノヴァ出陣 '+(e.won?a.zoneName(e.zone)+'ゾーン獲得！':'ストック抽選')+' / 計'+e.hits+'個';}
  if(state.sorties&&out.flow.phase==='normal')out.flow={...a.normalize(value),remaining:'0',zone:'',entryStage:'',comebackLeft:0,comebackConfirmed:false,comebackLamp:'',dryEligible:false};
  return out;
 }
 // The simulator uses the same engine and state transitions as the browser.
 globalThis.NovaArt={...a,enterInitial,afterBonus,step,queueResearchThreshold:queueThreshold,observeResearchNet:observeNet,
  resetResearchCheckpoints:reset,researchCheckpointStats:()=>({...state}),hasResearchCheckpoint:()=>state.pending>0,enterResearchCheckpoint:enterCheckpoint};
 return Object.freeze({bind,beforeBet,drawSortie,observeNet,ready,snapshot:()=>({...state}),reset});
})();
