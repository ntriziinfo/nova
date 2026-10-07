/* Per-spin presentation only. The draw in NovaArt owns color, symbol and result. */
globalThis.NovaAim=(()=>{
 const {setTimeout,clearTimeout}=globalThis.NovaClock||globalThis;
 let host,root,active=null,czTitle,comebackTitle;
 const videos=new Map();
 let winLocked=false,winTimer=null,winVoiceTimer=null,winToken=0,afterWinCallbacks=[],pendingStart=null;
 function init(){
  if(root)return true;
  host=document.getElementById('machine');if(!host)return false;
  root=document.createElement('div');root.className='novaAimPresentation';root.hidden=true;host.append(root);
  for(const symbol of ['seven','nebula'])for(const color of ['blue','red','rainbow']){
   const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.hidden=true;
   video.src=`assets/media/nova/aim/${symbol}-${color}.mp4`;
   video.setAttribute('aria-label',`${symbol==='seven'?'7':'nebula'}を狙え！`);
   root.append(video);videos.set(symbol+':'+color,video);
  }
  const nebulaWin=document.createElement('video');nebulaWin.muted=true;nebulaWin.loop=false;nebulaWin.playsInline=true;nebulaWin.preload='auto';nebulaWin.hidden=true;nebulaWin.src='assets/media/nova/aim/nebula-win.mp4';root.append(nebulaWin);videos.set('nebula-win',nebulaWin);
  const bonusNebulaWin=document.createElement('video');bonusNebulaWin.muted=true;bonusNebulaWin.loop=false;bonusNebulaWin.playsInline=true;bonusNebulaWin.preload='auto';bonusNebulaWin.hidden=true;bonusNebulaWin.src='assets/media/nova/aim/bonus-nebula-win.mp4';root.append(bonusNebulaWin);videos.set('bonus-nebula-win',bonusNebulaWin);
  const bonusWait=document.createElement('video');bonusWait.muted=true;bonusWait.loop=true;bonusWait.playsInline=true;bonusWait.preload='auto';bonusWait.hidden=true;bonusWait.src='assets/media/nova/aim/bonus-nebula-win.mp4';bonusWait.setAttribute('aria-label','初当たりボーナス準備中');root.append(bonusWait);videos.set('bonus-wait',bonusWait);bonusWait.load?.();
  const entrySeven=document.createElement('video');entrySeven.muted=true;entrySeven.loop=true;entrySeven.playsInline=true;entrySeven.preload='auto';entrySeven.hidden=true;entrySeven.src='assets/media/nova/aim/seven-entry-red.mp4';entrySeven.setAttribute('aria-label','777を狙え！');root.append(entrySeven);videos.set('zone-entry-seven',entrySeven);entrySeven.load?.();
  const czIntro=document.createElement('video');czIntro.muted=true;czIntro.loop=true;czIntro.playsInline=true;czIntro.preload='auto';czIntro.hidden=true;czIntro.src='assets/media/nova/cz-intro-bg.mp4';root.append(czIntro);videos.set('cz-intro',czIntro);czIntro.load?.();
  czTitle=document.createElement('img');czTitle.className='novaCzIntroTitle';czTitle.hidden=true;czTitle.src='assets/ui/nova-shuketsu-zone.png';czTitle.alt='NOVA Familia 集結ゾーン';root.append(czTitle);
  const comeback=document.createElement('video');comeback.muted=true;comeback.loop=true;comeback.playsInline=true;comeback.preload='auto';comeback.hidden=true;comeback.src='assets/media/nova/comeback-fire.mp4';root.append(comeback);videos.set('comeback',comeback);
  comebackTitle=document.createElement('img');comebackTitle.className='novaComebackTitle';comebackTitle.hidden=true;comebackTitle.src='assets/ui/comeback-challenge-title.png';comebackTitle.alt='引き戻しチャレンジ';root.append(comebackTitle);
  const win=document.createElement('video');win.muted=true;win.loop=false;win.playsInline=true;win.preload='auto';win.hidden=true;win.src='assets/media/nova/aim/seven-win.mp4?v=20260918-rainbow-144';root.append(win);videos.set('win',win);
  return true;
 }
 // Same geometry as the ladder shutter: lamp bay, above the real reels.
 function layout(){
  if(!root||root.hidden)return;
  const reels=host.querySelector('.reels'),status=document.getElementById('novaFlowStatus');if(!reels)return;
  const base=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=base.width/host.offsetWidth||1;
  const bottom=(r.top-base.top)/scale-5;
  const top=Math.max(status?(status.getBoundingClientRect().bottom-base.top)/scale+4:0,bottom-r.width/scale*.26);
  Object.assign(root.style,{left:(r.left-base.left)/scale+'px',top:top+'px',width:r.width/scale+'px',height:Math.max(40,bottom-top)+'px'});
 }
 function hide(){
  if(active){active.pause();active.hidden=true;if(active.currentTime>0)active.currentTime=0;active=null;}
  if(czTitle)czTitle.hidden=true;
  if(comebackTitle)comebackTitle.hidden=true;
  if(root){root.hidden=true;delete root.dataset.failed;delete root.dataset.zoneEntry;delete root.dataset.bonusWait;delete root.dataset.czIntro;delete root.dataset.comeback;delete host.dataset.aimActive;}
 }
 function hasGuide(aim){return !!aim&&aim.guide!==false;}
 function drawGuide(aim,rng=Math.random){return aim.result!=='MISS'||rng()<.5;}
 function isBonusWait(resolved){return !!resolved?.bonusWaitSpin&&!resolved.aTypeBonusGame&&resolved.flowBefore?.phase!=='art';}
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
 function stop(resolved){
  // Reveal the winning character or result only after the last reel lands.
  if(resolved?.comebackEvent==='success'||resolved?.comebackEvent==='failure'){hide();return;}
  if(resolved?.comebackEvent==='entry'||isComeback(resolved)){showComeback();return;}
  if(!isBonusWait(resolved)&&!isCzIntro(resolved))hide();
 }
 function bet(aim,resolved={}){
  if(isComeback(resolved)){showComeback();return false;}
  if(isCzIntro(resolved)){showCzIntro();return false;}
  if(isBonusWait(resolved)){showBonusWait();return false;}
  hide();
  const zoneEntry=resolved.flowBefore?.phase==='art'&&resolved.flowBefore.entryStage==='seven'&&resolved.flowAfter?.entryStage==='roulette';
  const bonusEntry=!!(resolved.bonusPendingAtStart&&resolved.bonusReady&&!resolved.bonusWaitSpin);
  const entry=zoneEntry||bonusEntry;
  if((!entry&&!hasGuide(aim))||!init())return false;
  const video=videos.get(entry?'zone-entry-seven':aim.symbol+':'+aim.color);if(!video)return false;
  active=video;root.dataset.color=entry?'entry':aim.color;root.dataset.symbol=entry?'seven':aim.symbol;root.dataset.zoneEntry=String(entry);root.hidden=false;
  // Rewind on dismissal, while hidden; seeking again on BET discards ready frames.
  host.dataset.aimActive='true';video.hidden=false;if(video.currentTime>0)video.currentTime=0;layout();
  video.play().catch(()=>{ /* Remain on this cue's first frame if autoplay is blocked. */ });
  // Bonus entrance already plays its seven voice in triggerBonusConfirmBetSoundIfNeeded.
  return zoneEntry;
 }
 // Visual stop control does not redraw or cancel the internal award.
 function stopTarget(aim,result,order,index){
  const valid=order[0]===2,hit=result===(aim.symbol==='seven'?'BIG':'NEBULA');
  const rank=order.indexOf(index)+1;
  const onLine=valid&&hit || (rank<3 && !(valid&&!hit&&index===0));
  return {onLine,aligned:valid&&hit,rank};
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
 return {hasGuide,drawGuide,stopTarget,bet,stop,hide,layout,fail,win,afterWin,reset,isCzIntro,get busy(){return winLocked;}};
})();
