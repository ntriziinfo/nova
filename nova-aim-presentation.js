/* Per-spin presentation only. The draw in NovaArt owns color, symbol and result. */
globalThis.NovaAim=(()=>{
 let host,root,active=null;
 const videos=new Map();
 let winLocked=false,winTimer=null,winToken=0,afterWinCallbacks=[];
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
  const win=document.createElement('video');win.muted=true;win.loop=false;win.playsInline=true;win.preload='auto';win.hidden=true;win.src='assets/media/nova/aim/seven-win.mp4';root.append(win);videos.set('win',win);
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
  if(active){active.pause();active.hidden=true;active=null;}
  if(root){root.hidden=true;delete host.dataset.aimActive;}
 }
 function hasGuide(aim){return !!aim&&aim.guide!==false;}
 function drawGuide(aim,rng=Math.random){return aim.result!=='MISS'||rng()<.5;}
 function bet(aim){
  hide();if(!hasGuide(aim)||!init())return;
  const video=videos.get(aim.symbol+':'+aim.color);if(!video)return;
  active=video;root.dataset.color=aim.color;root.dataset.symbol=aim.symbol;root.hidden=false;
  host.dataset.aimActive='true';video.hidden=false;video.currentTime=0;layout();
  video.play().catch(()=>{ /* Remain on this cue's first frame if autoplay is blocked. */ });
 }
 // Visual stop control does not redraw or cancel the internal award.
 function stopTarget(aim,result,order,index){
  const valid=order[0]===2,hit=result===(aim.symbol==='seven'?'BIG':'NEBULA');
  const rank=order.indexOf(index)+1;
  const onLine=valid&&hit || (rank<3 && !(valid&&!hit&&index===0));
  return {onLine,aligned:valid&&hit,rank};
 }
 function win(playSound){
  if(!init())return;
  hide();const token=++winToken;winLocked=true;clearTimeout(winTimer);
  const video=videos.get('win');active=video;root.hidden=false;root.dataset.symbol='seven';root.dataset.color='win';
  host.dataset.aimActive='true';video.hidden=false;video.currentTime=0;layout();
  let started=false;
  const start=()=>{
   if(started||token!==winToken)return;started=true;video.onplaying=null;video.onerror=null;
   playSound();
   winTimer=setTimeout(()=>{
    if(token!==winToken)return;winLocked=false;
    const callbacks=afterWinCallbacks;afterWinCallbacks=[];callbacks.forEach(fn=>fn());
    window.dispatchEvent(new Event('nova-aim-unlocked'));
   },3000);
  };
  video.onplaying=start;video.onerror=start;
  video.play().catch(start);
 }
 function afterWin(fn){if(winLocked)afterWinCallbacks.push(fn);else fn();}
 function reset(){winToken++;clearTimeout(winTimer);winLocked=false;afterWinCallbacks=[];if(videos.has('win')){videos.get('win').onplaying=null;videos.get('win').onerror=null;}hide();}
 if(typeof document!=='undefined'){
  document.addEventListener('DOMContentLoaded',init);
  window.addEventListener('resize',layout);
 }
 return {hasGuide,drawGuide,stopTarget,bet,hide,layout,win,afterWin,reset,get busy(){return winLocked;}};
})();
