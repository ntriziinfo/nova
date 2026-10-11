/* Display-only upper AT lamp background. Never advances the game or draws RNG. */
globalThis.NovaUpperAtBackground=(()=>{
 let host,video,wanted=false,starting=false;
 function eligible(flow){
  return !!(flow?.phase==='art'&&flow.researchUpper&&!flow.researchChallengeActive&&!flow.burstPending&&!flow.comebackLeft);
 }
 function layout(){
  if(!video||video.hidden)return;
  const reels=host.querySelector('.reels'),status=document.getElementById('novaFlowStatus');if(!reels)return;
  // Match the existing seven/nebula presentation window above the real reels.
  const base=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=base.width/host.offsetWidth||1;
  const bottom=(r.top-base.top)/scale-5;
  const top=Math.max(status?(status.getBoundingClientRect().bottom-base.top)/scale+4:0,bottom-r.width/scale*.26);
  Object.assign(video.style,{left:(r.left-base.left)/scale+'px',top:top+'px',width:r.width/scale+'px',height:Math.max(40,bottom-top)+'px'});
 }
 function play(){
  if(!video||!wanted||document.hidden||!video.paused||starting)return;
  starting=true;
  try{
   Promise.resolve(video.play()).catch(()=>{}).finally(()=>{
    starting=false;
    if(!wanted||document.hidden)video.pause();
   });
  }catch{starting=false;}
 }
 function sync(flow){
  wanted=eligible(flow);
  if(!wanted){if(video){video.hidden=true;video.pause();}return;}
  if(!video){
   host=document.getElementById('machine');if(!host)return;
   video=document.createElement('video');video.id='novaUpperAtBackground';
   video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='metadata';
   video.setAttribute('aria-hidden','true');video.setAttribute('playsinline','');
   video.src='assets/media/nova/upper-at-background-20261012.mp4';host.append(video);
  }
  video.hidden=false;layout();play();
 }
 if(typeof document!=='undefined'){
  window.addEventListener('resize',layout);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video?.pause();else play();});
  document.addEventListener('pointerdown',play);
 }
 return Object.freeze({eligible,sync,layout});
})();
