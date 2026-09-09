/* Per-spin presentation only. The draw in NovaArt owns color, symbol and result. */
globalThis.NovaAim=(()=>{
 let host,root,active=null;
 const videos=new Map();
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
 function bet(aim){
  hide();if(!aim||!init())return;
  const video=videos.get(aim.symbol+':'+aim.color);if(!video)return;
  active=video;root.dataset.color=aim.color;root.dataset.symbol=aim.symbol;root.hidden=false;
  host.dataset.aimActive='true';video.hidden=false;video.currentTime=0;layout();
  video.play().catch(()=>{ /* Remain on this cue's first frame if autoplay is blocked. */ });
 }
 if(typeof document!=='undefined'){
  document.addEventListener('DOMContentLoaded',init);
  window.addEventListener('resize',layout);
 }
 return {bet,hide,layout};
})();
