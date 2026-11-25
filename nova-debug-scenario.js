/* One-shot, session-bound operator reservations. Inactive reservations consume no RNG. */
globalThis.NovaDebugScenario=(()=>{
 function accept(command,context,previous){
  if(!context.enabled||!context.sessionId||command.sessionId!==context.sessionId||command.machineId!==context.machineId)return previous;
  if(typeof command.id!=='string'||!command.id||command.id===previous?.id||previous?.seen?.includes(command.id))return previous;
  const seen=[...(previous?.seen||[]),previous?.id].filter(Boolean).slice(-64);
  if(command.type==='cancelDebugScenario')return {id:command.id,seen,sessionId:command.sessionId,stage:'done'};
  if(command.type!=='reserveDebugScenario'||!Number.isInteger(command.zoneG)||command.zoneG<100||command.zoneG>800||command.zoneG%100)return previous;
  if(!Number.isInteger(command.sortieG)||command.sortieG<10||command.sortieG>20)return previous;
  return {id:command.id,seen,sessionId:command.sessionId,machineId:command.machineId,zoneG:command.zoneG,at:command.at===true,upper:command.upper===true,sortie:command.sortie===true,stage:'waiting',atGames:0,sortieG:command.sortieG};
 }
 function active(s,sessionId){return !!s&&s.sessionId===sessionId;}
 function guarantee(s){return s?.stage==='waiting'&&(s.at||s.upper||s.sortie);}
 function bonus(s){if(s?.stage==='waiting')s.stage='bonus';}
 function upper(s){return s?.stage==='bonus'&&s.upper;}
 function finishBonus(s,flow){
  if(s?.stage!=='bonus'||flow?.phase!=='art')return;
  if(s.upper)Object.assign(flow,{burstPending:true,burstUsed:true,researchChallengeSource:'initial',initialStage:'',initialWait:0,initialPlan:[],initialIndex:0,initialBoostActive:false,remaining:'0'});
  else if(s.at&&flow.researchChallengeSource==='initial')Object.assign(flow,{burstPending:false,burstUsed:false,researchChallengeSource:'',initialStage:'wait',initialBoostActive:true});
  afterBonus(s);
 }
 function afterBonus(s){if(s?.stage==='bonus')s.stage=s.sortie?'at':'done';}
 function atGame(s,flow){
  if(s?.stage!=='at'||flow?.phase!=='art'||flow.initialStage||flow.zone||flow.entryStage||flow.atPrelude||flow.burstPending||flow.burstLeft||flow.researchSortieLeft||flow.comebackLeft||flow.comebackConfirmed||flow.checkpointCountdown||flow.researchChallengeActive||flow.queuedZones?.length||Number(flow.sets)||Number(flow.stock))return false;
  s.atGames++;
  if(s.atGames>=s.sortieG){s.stage='sortie-role';return true;}
  return false;
 }
 const atResults=Object.freeze(["MISS","ONE_COIN","REPLAY","BELL","BELL15","WEAK_SUICA","WEAK_NOVA","STRONG_NOVA","SUPER_NOVA","URA_CHALLENGE","SORTIE_AIM_WIN_RED","ZONE_sosuke","ZONE_toto","ZONE_urapi","ZONE_giru","ZONE_sora","ZONE_ouma","ZONE_ura_giru","ZONE_ura_sora","ZONE_ura_ouma"]);
 function acceptAt(command,context,previous,flow){
  if(!context.enabled||!context.sessionId||command.sessionId!==context.sessionId||command.machineId!==context.machineId)return previous;
  if(typeof command.id!=='string'||!command.id||command.id===previous?.id||previous?.seen?.includes(command.id))return previous;
  if(!['reserveDebugAtForce','cancelDebugAtForce'].includes(command.type))return previous;
  if(command.type==='reserveDebugAtForce'&&!atResults.includes(command.result))return previous;
  const seen=[...(previous?.seen||[]),previous?.id].filter(Boolean).slice(-64);
  return {id:command.id,seen,sessionId:command.sessionId,machineId:command.machineId,result:command.result,stage:command.type==='cancelDebugAtForce'||flow?.phase!=='art'?'done':'waiting'};
 }
 function takeAt(s,sessionId,flow,held=false){
  if(!active(s,sessionId)||s.stage!=='waiting')return '';
  if(held)return '';
  if(flow?.phase!=='art'){s.stage='done';return '';}
  if(flow.initialStage||flow.zone||flow.entryStage||flow.atPrelude||flow.burstPending||flow.burstLeft||flow.researchSortieLeft||flow.comebackLeft||flow.comebackConfirmed||flow.checkpointCountdown||flow.researchThresholdPending||flow.researchChallengeActive||flow.queuedZones?.length||Number(flow.sets)||Number(flow.stock))return '';
  s.stage='done';return s.result;
 }
 return Object.freeze({atResults,acceptAt,takeAt,accept,active,guarantee,bonus,upper,afterBonus,finishBonus,atGame});
})();
