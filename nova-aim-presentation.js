/* Per-spin presentation only. The draw in NovaArt owns color, symbol and result. */
globalThis.NovaAim=(()=>{
 const {setTimeout,clearTimeout}=globalThis.NovaClock||globalThis;
 let host,root,active=null,czTitle,comebackTitle,atWaitTitle,sortieTitle,superChallengeTitle,novaBarTitle,reverseNotice,aimSymbol;
 const videos=new Map();
 let winLocked=false,winTimer=null,winVoiceTimer=null,winToken=0,afterWinCallbacks=[],pendingStart=null;
 function init(){
  if(root)return true;
  host=document.getElementById('machine');if(!host)return false;
  root=document.createElement('div');root.className='novaAimPresentation';root.hidden=true;host.append(root);
  for(const symbol of ['seven','nebula'])for(const color of ['blue','red','rainbow']){
   const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload=globalThis.NovaMedia?.videoPreload||'auto';video.hidden=true;
   video.src=symbol==='seven'?'assets/media/nova/aim/seven-flash-20261027.mp4':`assets/media/nova/aim/${symbol}-${color}.mp4`;
   video.setAttribute('aria-label',`${symbol==='seven'?'7':'nebula'}を狙え！`);
   root.append(video);videos.set(symbol+':'+color,video);
  }
  // Seven and NOVA share the original color-specific presentation.
  for(const color of ['blue','red','rainbow']){
   const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='metadata';video.hidden=true;
   video.src=`assets/media/nova/aim/seven-${color}.mp4`;root.append(video);videos.set('sora-seven:'+color,video);
  }
  const nebulaWin=document.createElement('video');nebulaWin.muted=true;nebulaWin.loop=false;nebulaWin.playsInline=true;nebulaWin.preload=globalThis.NovaMedia?.videoPreload||'auto';nebulaWin.hidden=true;nebulaWin.src='assets/media/nova/aim/nebula-win.mp4';root.append(nebulaWin);videos.set('nebula-win',nebulaWin);
  const bonusNebulaWin=document.createElement('video');bonusNebulaWin.muted=true;bonusNebulaWin.loop=false;bonusNebulaWin.playsInline=true;bonusNebulaWin.preload=globalThis.NovaMedia?.videoPreload||'auto';bonusNebulaWin.hidden=true;bonusNebulaWin.src='assets/media/nova/aim/bonus-nebula-win.mp4';root.append(bonusNebulaWin);videos.set('bonus-nebula-win',bonusNebulaWin);
  const bonusWait=document.createElement('video');bonusWait.muted=true;bonusWait.loop=true;bonusWait.playsInline=true;bonusWait.preload=globalThis.NovaMedia?.videoPreload||'auto';bonusWait.hidden=true;bonusWait.src='assets/media/nova/aim/bonus-nebula-win.mp4';bonusWait.setAttribute('aria-label','初当たりボーナス準備中');root.append(bonusWait);videos.set('bonus-wait',bonusWait);if(!globalThis.NovaMedia?.compact)bonusWait.load?.();
  const entrySeven=document.createElement('video');entrySeven.muted=true;entrySeven.loop=true;entrySeven.playsInline=true;entrySeven.preload=globalThis.NovaMedia?.videoPreload||'auto';entrySeven.hidden=true;entrySeven.src='assets/media/nova/aim/seven-flash-20261027.mp4';entrySeven.setAttribute('aria-label','777を狙え！');root.append(entrySeven);videos.set('zone-entry-seven',entrySeven);if(!globalThis.NovaMedia?.compact)entrySeven.load?.();
  const czIntro=document.createElement('video');czIntro.muted=true;czIntro.loop=true;czIntro.playsInline=true;czIntro.preload=globalThis.NovaMedia?.videoPreload||'auto';czIntro.hidden=true;czIntro.src='assets/media/nova/cz-intro-bg.mp4';root.append(czIntro);videos.set('cz-intro',czIntro);if(!globalThis.NovaMedia?.compact)czIntro.load?.();
  czTitle=document.createElement('img');czTitle.className='novaCzIntroTitle';czTitle.hidden=true;czTitle.loading=globalThis.NovaMedia?.compact?'lazy':'eager';czTitle.src='assets/ui/nova-shuketsu-zone.png';czTitle.alt='NOVA Familia 集結ゾーン';root.append(czTitle);
  const comeback=document.createElement('video');comeback.muted=true;comeback.loop=true;comeback.playsInline=true;comeback.preload=globalThis.NovaMedia?.videoPreload||'auto';comeback.hidden=true;comeback.src='assets/media/nova/comeback-fire.mp4';root.append(comeback);videos.set('comeback',comeback);
  comebackTitle=document.createElement('img');comebackTitle.className='novaComebackTitle';comebackTitle.hidden=true;comebackTitle.loading=globalThis.NovaMedia?.compact?'lazy':'eager';comebackTitle.src='assets/ui/comeback-challenge-title.png';comebackTitle.alt='引き戻しチャレンジ';root.append(comebackTitle);
  const atWait=document.createElement('video');atWait.muted=true;atWait.loop=true;atWait.playsInline=true;atWait.preload=globalThis.NovaMedia?.videoPreload||'auto';atWait.hidden=true;atWait.src='assets/media/nova/at-wait-bg.mp4';root.append(atWait);videos.set('at-wait',atWait);
  atWaitTitle=document.createElement('img');atWaitTitle.className='novaAtWaitTitle';atWaitTitle.hidden=true;atWaitTitle.loading=globalThis.NovaMedia?.compact?'lazy':'eager';atWaitTitle.src='assets/ui/nova-rush-confirmed.png';atWaitTitle.alt='ノヴァラッシュ確定';root.append(atWaitTitle);
  const sortie=document.createElement('video');sortie.muted=true;sortie.loop=true;sortie.playsInline=true;sortie.preload=globalThis.NovaMedia?.compact?'none':'metadata';sortie.hidden=true;sortie.src='assets/media/nova/sortie-fire-round-20261011.mp4';sortie.id='novaSortieBackground';host.append(sortie);videos.set('sortie',sortie);
  sortieTitle=document.createElement('img');sortieTitle.className='novaSortieTitle';sortieTitle.hidden=true;sortieTitle.loading=globalThis.NovaMedia?.compact?'lazy':'eager';sortieTitle.src='assets/ui/sortie-challenge-title-20261011.png';sortieTitle.alt='出陣チャレンジ';root.append(sortieTitle);
  const superChallenge=document.createElement('video');superChallenge.muted=true;superChallenge.loop=true;superChallenge.playsInline=true;superChallenge.preload=globalThis.NovaMedia?.compact?'none':'metadata';superChallenge.hidden=true;superChallenge.src='assets/media/nova/super-nova-challenge-tunnel-20261012.mp4';superChallenge.id='novaSuperChallengeBackground';host.append(superChallenge);videos.set('super-challenge',superChallenge);
  superChallengeTitle=document.createElement('img');superChallengeTitle.className='novaSuperChallengeTitle';superChallengeTitle.hidden=true;superChallengeTitle.loading=globalThis.NovaMedia?.compact?'lazy':'eager';superChallengeTitle.src='assets/ui/super-nova-challenge-title-20261012.png';superChallengeTitle.alt='スーパーノヴァチャレンジ';host.append(superChallengeTitle);
  const novaCue=document.createElement('video');novaCue.muted=true;novaCue.loop=true;novaCue.playsInline=true;novaCue.preload='metadata';novaCue.hidden=true;novaCue.src='assets/media/nova/aim/seven-flash-20261027.mp4';root.append(novaCue);videos.set('nova',novaCue);
  novaBarTitle=document.createElement('div');novaBarTitle.className='novaBarAimTitle';novaBarTitle.hidden=true;aimSymbol=document.createElement('img');aimSymbol.src='assets/lossless-20261027/nova-only-20261027.webp';aimSymbol.alt='NOVA図柄';novaBarTitle.append(aimSymbol);root.append(novaBarTitle);
  reverseNotice=document.createElement('div');reverseNotice.className='novaAimReverseNotice';reverseNotice.hidden=true;reverseNotice.textContent='逆押し　右 → 中 → 左';root.append(reverseNotice);
  const win=document.createElement('video');win.muted=true;win.loop=false;win.playsInline=true;win.preload=globalThis.NovaMedia?.videoPreload||'auto';win.hidden=true;win.src='assets/media/nova/aim/seven-win.mp4?v=20260918-rainbow-144';root.append(win);videos.set('win',win);
  return true;
 }
 // Same geometry as the ladder shutter: lamp bay, above the real reels.
 function layout(){
  if(!root||root.hidden)return;
  const reels=host.querySelector('.reels');if(!reels)return;
  const base=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=base.width/host.offsetWidth||1;
  const bottom=(r.top-base.top)/scale-5;
  const top=Math.max(0,bottom-r.width/scale*.26);
  Object.assign(root.style,{left:(r.left-base.left)/scale+'px',top:top+'px',width:r.width/scale+'px',height:Math.max(40,bottom-top)+'px'});
 }
 function hide(){
  globalThis.NovaSortieAim?.hide();
  if(active){active.pause();active.hidden=true;if(active.currentTime>0)active.currentTime=0;active=null;}
  if(czTitle)czTitle.hidden=true;
  if(comebackTitle)comebackTitle.hidden=true;
  if(atWaitTitle)atWaitTitle.hidden=true;
  if(sortieTitle)sortieTitle.hidden=true;
  if(superChallengeTitle)superChallengeTitle.hidden=true;
  if(novaBarTitle)novaBarTitle.hidden=true;
  if(reverseNotice)reverseNotice.hidden=true;
  if(root){root.hidden=true;delete root.dataset.failed;delete root.dataset.zoneEntry;delete root.dataset.bonusWait;delete root.dataset.czIntro;delete root.dataset.comeback;delete root.dataset.atWait;delete root.dataset.sortie;delete root.dataset.superChallenge;delete root.dataset.novaCue;delete root.dataset.symbolMotion;delete root.dataset.specialZone;delete host.dataset.aimActive;}
 }
 function showSymbol(symbol){
  const image=aimSymbol;
  image.src=symbol==='nova'?'assets/lossless-20261027/nova-only-20261027.webp':symbol==='seven'?'assets/lossless-20261027/seven-nebula-original.webp':'assets/symbols/nebula-original.png';
  image.alt=symbol==='nova'?'NOVA図柄':symbol==='seven'?'赤7図柄':'ネビュラ図柄';
  root.dataset.symbolMotion='true';novaBarTitle.hidden=false;
 }
 function hasGuide(aim){return !!aim&&aim.guide!==false;}
 function drawGuide(aim,rng=Math.random){return aim.result!=='MISS'||rng()<.5;}
 function isBonusWait(resolved){return !!resolved?.bonusWaitSpin&&!resolved.aTypeBonusGame&&resolved.flowBefore?.phase!=='art';}
 function isAtWaitFlow(flow){return flow?.phase==='art'&&flow.initialStage==='wait'&&!flow.zone;}
 function isAtWait(resolved){return !resolved?.aTypeBonusGame&&!resolved?.bonusPendingAtStart&&isAtWaitFlow(resolved?.flowBefore);}
 function showAtWait(){
  if(!init())return;
  const video=videos.get('at-wait');
  if(active===video&&!root.hidden)return;
  hide();active=video;root.hidden=false;root.dataset.atWait='true';root.dataset.symbol='at-wait';
  host.dataset.aimActive='true';video.hidden=false;atWaitTitle.hidden=false;layout();video.play().catch(()=>{});
 }
 // Idle display covers bonus completion and saved preparation states as well as BETs.
 function syncAtWait(flow){
  if(winLocked)return;
  if(isAtWaitFlow(flow)){showAtWait();return;}
  // Keep the last preparation frame until the next BET starts the seven cue.
  if(root?.dataset.atWait==='true'&&!(flow?.phase==='art'&&flow.initialStage==='entry'&&flow.entryStage==='seven'))hide();
 }
 function isCzIntro(resolved){
  const flow=resolved?.flowBefore;
  return !resolved?.aTypeBonusGame&&!resolved?.bonusPendingAtStart&&['cz','strong_cz'].includes(flow?.phase)&&Number(flow.remaining)>0&&Number(flow.remaining)===Number(flow.totalGames);
 }
 function showCzIntro(){
  if(!init())return;
  const video=videos.get('cz-intro');
  if(active===video&&!root.hidden)return;
  hide();active=video;root.hidden=false;root.dataset.czIntro='true';root.dataset.symbol='cz-intro';
  host.dataset.aimActive='true';video.hidden=false;czTitle.hidden=false;layout();video.play().catch(()=>{});
 }
 function showBonusWait(){
  if(!init())return;
  const video=videos.get('bonus-wait');
  if(active===video&&!root.hidden)return; // Keep the loop continuous across BETs.
  hide();active=video;root.hidden=false;root.dataset.bonusWait='true';root.dataset.color='gold';root.dataset.symbol='bonus-wait';
  host.dataset.aimActive='true';video.hidden=false;layout();video.play().catch(()=>{});
 }
 function isComeback(resolved){return !resolved?.aTypeBonusGame&&!resolved?.bonusPendingAtStart&&resolved?.flowBefore?.phase==='art'&&Number(resolved.flowBefore.comebackLeft)>0;}
 function showComeback(){
  if(!init())return;
  const video=videos.get('comeback');
  if(active===video&&!root.hidden)return;
  hide();active=video;root.hidden=false;root.dataset.comeback='true';root.dataset.symbol='comeback';
  host.dataset.aimActive='true';video.hidden=false;comebackTitle.hidden=false;layout();video.play().catch(()=>{});
 }
 function showSortie(){
  if(!init())return;
  const video=videos.get('sortie');
  if(active===video&&!root.hidden)return;
  hide();active=video;root.hidden=false;root.dataset.sortie='true';root.dataset.symbol='sortie';
  host.dataset.aimActive='true';video.hidden=false;sortieTitle.hidden=false;layout();video.play().catch(()=>{});
 }
 function showSuperChallenge(){
  if(!init())return;
  const video=videos.get('super-challenge');
  if(active===video&&!root.hidden)return; // Keep the tunnel continuous through HOLD and subsequent BETs.
  hide();active=video;root.hidden=false;root.dataset.superChallenge='true';root.dataset.symbol='super-challenge';
  host.dataset.aimActive='true';video.hidden=false;superChallengeTitle.hidden=false;layout();video.play().catch(()=>{});
 }
 function stop(resolved){
  if(resolved?.researchChallenge){
   if(resolved.researchChallenge.finished)hide();else showSuperChallenge();
   return;
  }
  if(resolved?.researchSortie){
   // Winning lamps remain visible after the third stop; the next BET restores the title.
   if(resolved.researchSortie.won||resolved.researchSortie.finished)hide();else showSortie();
   return;
  }
  // Reveal the winning character or result only after the last reel lands.
  if(resolved?.comebackEvent==='success'||resolved?.comebackEvent==='failure'){hide();return;}
  if(resolved?.comebackEvent==='entry'||isComeback(resolved)){showComeback();return;}
  if(isAtWait(resolved)){showAtWait();return;}
  if(!isBonusWait(resolved)&&!isCzIntro(resolved))hide();
 }
 function isNovaCue(resolved){
  const f=resolved?.zoneStartFlow||resolved?.flowBefore;
  return !!(resolved?.researchChallenge?.priorAim||resolved?.zoneSpin&&!resolved.aTypeBonusGame&&!resolved.aim&&!resolved.oumaFailed&&!resolved.oumaFreeze&&!resolved.artReverse&&f?.phase==='art'&&!f.entryStage&&['ouma','urapi'].includes(String(f.zone||'').replace(/^ura_/,'')));
 }
 function bet(aim,resolved={}){
  if(resolved.sortieEntry&&globalThis.NovaSortieAim){hide();NovaSortieAim.show(resolved.sortieCueColor||'rainbow');return false;}
  if(isNovaCue(resolved)){
   if(!init())return false;hide();
   if(resolved.aimDisplay?.guide===false){if(resolved.researchChallenge)showSuperChallenge();return false;}
   const color=resolved.aimDisplay?.color||'blue';active=videos.get('nebula:'+color);root.hidden=false;root.dataset.novaCue='true';root.dataset.color=color;root.dataset.symbol='nova';host.dataset.aimActive='true';active.hidden=false;showSymbol('nova');reverseNotice.hidden=true;layout();active.play().catch(()=>{});return false;
  }
  if(resolved.researchChallenge){showSuperChallenge();return false;}
  if(resolved.researchSortie){showSortie();return false;}
  if(isAtWait(resolved)){showAtWait();return false;}
  if(isComeback(resolved)){showComeback();return false;}
  if(isCzIntro(resolved)){showCzIntro();return false;}
  if(isBonusWait(resolved)){showBonusWait();return false;}
  hide();
  const zoneEntry=resolved.flowBefore?.phase==='art'&&resolved.flowBefore.entryStage==='seven'&&resolved.flowAfter?.entryStage==='roulette';
  const bonusEntry=!!(resolved.bonusPendingAtStart&&resolved.bonusReady&&!resolved.bonusWaitSpin);
  const entry=zoneEntry||bonusEntry;
  if((!entry&&!hasGuide(aim))||!init())return false;
  const sortieEntry=!!resolved.sortieEntry,sortieColor=resolved.sortieCueColor||'rainbow';
  if(aim&&resolved.aimDisplay)aim={...aim,color:resolved.aimDisplay.color||aim.color};
  const soraSeven=!entry&&!sortieEntry&&aim?.symbol==='seven';
  const video=videos.get(soraSeven?'nebula:'+aim.color:sortieEntry?'nebula:'+sortieColor:entry?'zone-entry-seven':aim.symbol+':'+aim.color);if(!video)return false;
  root.dataset.specialZone=String(!!resolved.flowBefore?.zone);
  reverseNotice.hidden=true;
  active=video;root.dataset.color=sortieEntry?sortieColor:entry?'entry':aim.color;root.dataset.symbol=sortieEntry?'nebula':entry?'seven':aim.symbol;root.dataset.zoneEntry=String(entry);root.hidden=false;
  if(!entry)showSymbol(aim.symbol);
  // Rewind on dismissal, while hidden; seeking again on BET discards ready frames.
  host.dataset.aimActive='true';video.hidden=false;if(video.currentTime>0)video.currentTime=0;layout();
  video.play().catch(()=>{ /* Remain on this cue's first frame if autoplay is blocked. */ });
  // Bonus entrance already plays its seven voice in triggerBonusConfirmBetSoundIfNeeded.
  return zoneEntry&&!sortieEntry;
 }
 // Visual stop control does not redraw or cancel the internal award.
 function stopTarget(aim,result,order,index){
  if(aim.symbol==='nebula'){
   // BIG: middle-first reveals on the first stop; scissors on the second.
   // Left-first is eligible only when followed by the right reel.
   const first=order[0],rank=order.indexOf(index)+1;
   const valid=first===1||first===2||(first===0&&(order.length===1||order[1]===2));
   const hit=result==='NEBULA',missReel=first===1?1:2-first;
   return {onLine:valid&&hit||(!hit&&index!==missReel&&rank<3),aligned:valid&&hit,rank};
  }
  // Middle-first and right-first both honor the already drawn winning symbol.
  const valid=order[0]===1||order[0]===2,hit=result===(aim.symbol==='seven'?'BIG':'NEBULA');
  const rank=order.indexOf(index)+1;
  const onLine=valid&&hit || (rank<3 && !(valid&&!hit&&index===0));
  return {onLine,aligned:valid&&hit,rank};
 }
 // Three-cell NOVA logos in Ouma/Urapi use their own stop order cues. This
 // changes only the displayed strips, never the drawn result or 0G freeze.
 function isNovaZoneSpin(spin){
  const r=spin?.resolved,f=r?.zoneStartFlow||r?.flowBefore;
  return !!(r?.zoneSpin&&!r.aTypeBonusGame&&!r.stockEntry&&!r.researchSortie&&!r.aim&&!r.oumaFreeze&&!r.oumaFailed&&
   f?.phase==='art'&&!f.entryStage&&['ouma','urapi'].includes(String(f.zone).replace(/^ura_/,''))&&['MISS','SUPER_NOVA'].includes(spin.result));
 }
 function novaZoneStopTarget(spin,index,strips,results){
  if(!isNovaZoneSpin(spin))return null;
  const order=spin.auditPressOrder||spin.auditStopOrder||[],rank=order.indexOf(index)+1;
  if(!rank)return null;
  const won=spin.result==='SUPER_NOVA';
  // A middle-first miss reveals itself immediately. An outer-first miss
  // breaks on the other outer reel: second for scissors, third otherwise.
  const missReel=order[0]===1?1:2-order[0];
  const onLine=won||index!==missReel;
  const strip=strips[index],bar=strip.indexOf("BAR"),sheetColumn=globalThis.NovaReelSheetData?.stops?.SUPER_NOVA?.[0]?.map(row=>row[index]);
  const logo=sheetColumn?.length===3?sheetColumn:strip.includes(`NOVA_${index}_0`)?[0,1,2].map(row=>`NOVA_${index}_${row}`):[0,1,2].map(row=>strip[(bar+row-1+strip.length)%strip.length]);
  const column=onLine?logo:strip.map((_,top)=>[0,1,2].map(row=>strip[(top+row)%strip.length]))
   .find(col=>col.every(symbol=>!String(symbol).startsWith('NOVA_')&&symbol!=='BAR'&&symbol!==results.WEAK_SUICA.reel[index]));
  if(!column||!strip.some((_,top)=>column.every((symbol,row)=>strip[(top+row)%strip.length]===symbol)))throw new Error('No valid NOVA zone stop column');
  return {column,onLine,won,rank};
 }
 function fail(playSound){
  if(!active||!root||root.hidden||root.dataset.failed==='true')return;
  root.dataset.failed='true';playSound();
  // Let the miss remain visible before a final-game result or AUTO advances.
  const token=++winToken;winLocked=true;clearTimeout(winTimer);clearTimeout(winVoiceTimer);
  winTimer=setTimeout(()=>{
   if(token!==winToken)return;winLocked=false;
   const callbacks=afterWinCallbacks;afterWinCallbacks=[];callbacks.forEach(fn=>fn());
   window.dispatchEvent(new Event('nova-aim-unlocked'));
  },650);
 }
 function win(playSound,symbol='seven',resolved={},playDelayedVoice=null){
  if(!init())return;
  hide();const token=++winToken;winLocked=true;clearTimeout(winTimer);clearTimeout(winVoiceTimer);
  const key=symbol==='nebula'?(resolved.aTypeBonusGame?'bonus-nebula-win':'nebula-win'):'win';
  const video=videos.get(key);active=video;root.hidden=false;root.dataset.symbol=symbol;root.dataset.color='win';
  host.dataset.aimActive='true';video.hidden=false;video.currentTime=0;layout();
  let started=false;
  const start=()=>{
   if(started||token!==winToken)return;started=true;pendingStart=null;clearTimeout(winTimer);video.onplaying=null;video.onerror=null;
   playSound();
   if(playDelayedVoice)winVoiceTimer=setTimeout(()=>{winVoiceTimer=null;if(token===winToken)playDelayedVoice();},2000);
   winTimer=setTimeout(()=>{
    if(token!==winToken)return;winLocked=false;
    const callbacks=afterWinCallbacks;afterWinCallbacks=[];callbacks.forEach(fn=>fn());
    window.dispatchEvent(new Event('nova-aim-unlocked'));
   },3000);
  };
  pendingStart=start;video.onplaying=start;video.onerror=start;
  // A buffering video can leave play() pending without playing or error.
  // Keep the existing sound/three-second presentation even on a failed load.
  winTimer=setTimeout(start,10000);
  video.play().catch(start);
  // Hidden muted videos may defer playback until visible. Keep the award's
  // sound and three-second input lock progressing independently of that frame.
  if(document.hidden)start();
 }
 function afterWin(fn){if(winLocked)afterWinCallbacks.push(fn);else fn();}
 function reset(){winToken++;pendingStart=null;clearTimeout(winTimer);clearTimeout(winVoiceTimer);winLocked=false;afterWinCallbacks=[];for(const video of videos.values()){video.onplaying=null;video.onerror=null;}hide();}
 if(typeof document!=='undefined'){
  document.addEventListener('DOMContentLoaded',init);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pendingStart?.();});
  window.addEventListener('resize',layout);
 }
 return {hasGuide,drawGuide,stopTarget,isNovaZoneSpin,novaZoneStopTarget,bet,stop,hide,layout,fail,win,afterWin,reset,isCzIntro,syncAtWait,get busy(){return winLocked;}};
})();
