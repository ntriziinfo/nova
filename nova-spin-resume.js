/* Persist a drawn, unpaid spin. Presentation timers and media objects are not saved. */
globalThis.NovaSpinResume=(()=>{
 const currentReelLayoutVersion=3;
 const fields=['reelLayoutVersion','result','lineRow','grid','resolved','stopped','pendingStopColumns','commonStopColumns',
  'stopControlVersion','pressStopColumns','pressStopDistances','rareRoleMissed','rareMissPaidApplied',
  'auditGrid','auditPressOrder','auditStopOrder','aimStopOrder','aimAligned','aimWinPlayed',
  'stopOutcomeRevealed','earlyAimSoundPlayed','earlyAimFailurePlayed','superNovaStopSoundPlayed','ladderOutcomeSoundPlayed','sortieSandwichAimSoundPlayed','sortieConfirmSoundPlayed',
  'sortieOutcomeSoundPlayed','sortieAwardVoicePlayed',
  'bellNaviOrder','rareNavi','bellNaviVoiceCharacter','bellNaviVoiceStage','bellNaviFailed','bellNaviFailurePlayed',
  'normalActiveAtStart','aTypeBonusActiveAtStart','zoneActiveAtStart','zoneType',
  'autoMissBarBottom','autoStopOrder','autoStopOrderMode',
  'battleActiveAtStart','battleRound','pendingBattleOutcome','artReverse',
  'manualBonusStop','manualOutcomeApplied','bonusConfirmWaitSpin','bonusConfirmPrizeSpin',
  'bonusAnnouncementTiming','bonusAnnouncementLit','premiumBigConfirmMovieEffect',
  'reversePushGuide','reversePushWrongOrder','ladderResultPresentation'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 // Decode retired save-file tokens once. Current strips/rendering use current symbols only.
 function currentSymbols(value){
  if(Array.isArray(value))return value.map(currentSymbols);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,currentSymbols(item)]));
  if(value==='\u{1f418}'||value==='\u{1f921}')return 'REPLAY';
  if(value==='\u{1f347}')return '🔔';
  if(typeof value==='string'&&/^NOVA_[0-2]_[0-2]$/.test(value))return ['🔔','BAR','REPLAY'][Number(value.at(-1))];
  return value;
 }
 function capture(spin){
  if(!spin||spin.finishing)return null;
  const data={version:1,reelLayoutVersion:spin.reelLayoutVersion||currentReelLayoutVersion};
  for(const field of fields)if(spin[field]!==undefined)data[field]=spin[field];
  return clone(data);
 }
 function restore(data,results){
  if(data?.version!==1||!Object.hasOwn(results,data.result)||!data.resolved||typeof data.resolved!=='object')return null;
  if(!Array.isArray(data.grid)||data.grid.length!==3||data.grid.some(row=>!Array.isArray(row)||row.length!==3||row.some(s=>typeof s!=='string')))return null;
  if(!Array.isArray(data.stopped)||data.stopped.length!==3||data.stopped.some(s=>typeof s!=='boolean'))return null;
  const spin=currentSymbols(clone(Object.fromEntries(fields.filter(f=>data[f]!==undefined).map(f=>[f,data[f]]))));
  const allowedAutoOrders=['0,1,2','1,0,2','0,2,1'];
  if(!Array.isArray(spin.autoStopOrder)||!allowedAutoOrders.includes(spin.autoStopOrder.join(',')))delete spin.autoStopOrder;
  if(!['normal','middle','scissors'].includes(spin.autoStopOrderMode))delete spin.autoStopOrderMode;
  if(spin.autoMissBarBottom!==true)delete spin.autoMissBarBottom;
  spin.reelLayoutVersion=data.reelLayoutVersion||1;
  spin.spec=results[spin.result];
  spin.pendingStopColumns=[0,1,2].map(i=>{
   const col=spin.pendingStopColumns?.[i];
   return !spin.stopped[i]&&Array.isArray(col)&&col.length===3&&col.every(s=>typeof s==='string')?col.slice():null;
  });
  spin.visualStopping=spin.pendingStopColumns.map(Boolean);
  spin.finishing=false;spin.finishScheduled=false;spin.autoStopAtStart=false;spin.speedModeAtStart=false;
  return spin;
 }
 return {capture,restore};
})();
