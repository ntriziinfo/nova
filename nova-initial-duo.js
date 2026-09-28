/* Presentation only. Licensed images stay unchanged; video alpha is a separate export. */
globalThis.NovaInitialDuo=(()=>{
 const characters=Object.freeze([Object.freeze(['nito']),Object.freeze(['kushuri']),Object.freeze(['nito','kushuri'])]);
 let host,root,video,actors=[],active=false,rank=0;
 const eligible=flow=>flow?.initialVersion===148&&flow.initialStage==='zone'&&['kushuri_nito','kushuri','nito'].includes(flow.zone);
 const gameCharacters=index=>characters[Math.max(0,Math.min(2,Math.floor(Number(index)||0)))];
 function init(){
  if(root)return true;host=document.querySelector('.reelArea');if(!host)return false;
  // The VP9 alpha export removes black without covering the reel or lamp layers.
  video=document.createElement('video');video.id='novaInitialParticles';video.hidden=true;
  video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='auto';
  video.setAttribute('aria-hidden','true');video.src='assets/media/nova/star-particle-01-alpha.webm';
  root=document.createElement('div');root.id='novaInitialDuo';root.hidden=true;
  root.setAttribute('aria-label','くしゅり＆にと 初期pt獲得ゾーン');
  for(const id of ['nito','kushuri']){
   const actor=document.createElement('div');actor.className='novaInitialActor';actor.dataset.character=id;
   const img=new Image();img.src=`assets/illustrations/lamps-20260928/${id}.png`;img.alt=id==='nito'?'にと':'くしゅり';img.draggable=false;
   actor.append(img);root.append(actor);actors.push(actor);
  }
  host.append(video,root);new ResizeObserver(layout).observe(host);return true;
 }
 function layout(){
  if(!root||root.hidden)return;const reels=host.querySelector('.reels');if(!reels)return;
  const base=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=base.width/host.offsetWidth||1;
  const height=r.height/scale*1.6;
  const rect={left:(r.left-base.left)/scale+'px',top:(r.bottom-base.top)/scale-height+'px',width:r.width/scale+'px',height:height+'px'};
  Object.assign(root.style,rect);Object.assign(video.style,rect);
 }
 function begin(resolved){
  const flow=resolved?.flowBefore;if(!eligible(flow)){clear();return false;}if(!init())return false;
  const game=Math.max(0,Math.min(2,Number(flow.initialIndex)||0)),ids=gameCharacters(game);
  rank=0;root.dataset.game=String(game+1);root.dataset.stop='0';root.dataset.pair=String(ids.length===2);
  for(const actor of actors)actor.hidden=!ids.includes(actor.dataset.character);
  root.hidden=false;video.hidden=false;document.body.dataset.initialDuoGame=String(game+1);layout();
  // Keep one continuous loop through all three BETs; rewind only on leaving the zone.
  if(!active||video.paused)video.play().catch(()=>{});active=true;return true;
 }
 function stop(order){
  if(!active||!Number.isInteger(order)||order<1||order>3||order<=rank)return false;
  rank=order;root.dataset.stop=String(rank);return true;
 }
 function clear(){
  active=false;rank=0;
  if(video){video.pause();if(video.currentTime>0)video.currentTime=0;video.hidden=true;}
  if(root){root.hidden=true;root.dataset.stop='0';}
  if(typeof document!=='undefined')delete document.body.dataset.initialDuoGame;
 }
 function sync(flow,spinning){
  if(spinning)return;
  if(eligible(flow)){if(!active)begin({flowBefore:flow});}
  // The last jump stays visible until the existing award/result delay completes.
  else if(rank!==3)clear();
 }
 if(typeof document!=='undefined'){
  document.addEventListener('DOMContentLoaded',init);window.addEventListener('resize',layout);
 }
 return {eligible,gameCharacters,begin,stop,clear,sync,layout};
})();
