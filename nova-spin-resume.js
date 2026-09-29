/* Persist a drawn, unpaid spin. Presentation timers and media objects are not saved. */
globalThis.NovaSpinResume=(()=>{
 const fields=['result','lineRow','grid','resolved','stopped','pendingStopColumns',
  'auditGrid','auditPressOrder','auditStopOrder','aimStopOrder','aimAligned','aimWinPlayed',
  'bellNaviOrder','rareNavi','bellNaviVoiceCharacter','bellNaviVoiceStage',
  'normalActiveAtStart','aTypeBonusActiveAtStart','zoneActiveAtStart','zoneType',
  'battleActiveAtStart','battleRound','pendingBattleOutcome','artReverse',
  'manualBonusStop','manualOutcomeApplied','bonusConfirmWaitSpin','bonusConfirmPrizeSpin',
  'bonusAnnouncementTiming','bonusAnnouncementLit','premiumBigConfirmMovieEffect',
  'reversePushGuide','reversePushWrongOrder','ladderResultPresentation'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 function capture(spin){
  if(!spin||spin.finishing)return null;
  const data={version:1};
  for(const field of fields)if(spin[field]!==undefined)data[field]=spin[field];
  return clone(data);
 }
 function restore(data,results){
  if(data?.version!==1||!Object.hasOwn(results,data.result)||!data.resolved||typeof data.resolved!=='object')return null;
  if(!Array.isArray(data.grid)||data.grid.length!==3||data.grid.some(row=>!Array.isArray(row)||row.length!==3||row.some(s=>typeof s!=='string')))return null;
  if(!Array.isArray(data.stopped)||data.stopped.length!==3||data.stopped.some(s=>typeof s!=='boolean'))return null;
  const spin=clone(Object.fromEntries(fields.filter(f=>data[f]!==undefined).map(f=>[f,data[f]])));
  spin.spec=results[spin.result];
  spin.pendingStopColumns=[0,1,2].map(i=>{
   const col=data.pendingStopColumns?.[i];
   return !spin.stopped[i]&&Array.isArray(col)&&col.length===3&&col.every(s=>typeof s==='string')?col.slice():null;
  });
  spin.visualStopping=spin.pendingStopColumns.map(Boolean);
  spin.finishing=false;spin.finishScheduled=false;spin.autoStopAtStart=false;spin.speedModeAtStart=false;
  return spin;
 }
 return {capture,restore};
})();
