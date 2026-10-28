/* Display-only upper AT lamp background. Never advances the game or draws RNG. */
globalThis.NovaUpperAtBackground=(()=>{
 let host,video,wanted=false,starting=false,checkpoint=false,prelude=false;
 const foreground='.novaAimPresentation,.novaLadderPresentation,.novaResultsLayer,#novaStockPreparation,#zoneRoulette,#novaInitialDuo,#novaDirectAward,#novaSortieGuide';
 function eligible(flow,confirmed=false){
  return !!(flow?.phase==='art'&&(flow.researchUpper||confirmed)&&!flow.zone&&!flow.initialStage&&!flow.entryStage&&!flow.atPrelude&&!flow.researchSortieLeft&&!flow.researchChallengeActive&&!flow.burstPending&&!flow.burstLeft&&!flow.comebackLeft&&!flow.comebackConfirmed);
 }
 function blocked(){
  return (!prelude&&host.dataset.atPreludeActive==='true')||Array.from(host.querySelectorAll(foreground)).some(el=>!el.hidden);
 }
 function init(){
  if(host)return true;
  host=document.getElementById('machine');if(!host)return false;
  // Cue/result visibility can change between display updates. Watch only those
  // presentation roots; do not poll, observe animation styles, or watch this video.
  new MutationObserver(records=>{
   if(records.some(r=>r.target===host||r.target.matches(foreground)))refresh();
  }).observe(host,{subtree:true,attributes:true,attributeFilter:['hidden','data-at-prelude-active']});
  return true;
 }
 function layout(){
  if(!video||video.hidden)return;
  const reels=host.querySelector('.reels');if(!reels)return;
  // Match the existing seven/nebula presentation window above the real reels.
  const base=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=base.width/host.offsetWidth||1;
  const bottom=(r.top-base.top)/scale-5;
  const top=Math.max(0,bottom-r.width/scale*.26);
  Object.assign(video.style,{left:(r.left-base.left)/scale+'px',top:top+'px',width:r.width/scale+'px',height:Math.max(40,bottom-top)+'px'});
 }
 // Coalesce repeated game/observer refreshes into one geometry read per frame.
 let layoutPending=false;
 function requestLayout(){
  if(layoutPending)return;
  if(!globalThis.requestAnimationFrame){layout();return;}
  layoutPending=true;requestAnimationFrame(()=>{layoutPending=false;layout();});
 }
 function play(){
  if(!video||!wanted||video.hidden||blocked()||document.hidden||!video.paused||starting)return;
  if(globalThis.NovaPresentation){NovaPresentation.play(video,()=>wanted&&!video.hidden&&!blocked());return;}
  starting=true;
  try{
   Promise.resolve(video.play()).catch(()=>{}).finally(()=>{
    starting=false;
    if(!wanted||video.hidden||blocked()||document.hidden)video.pause();
   });
  }catch{starting=false;}
 }
 function refresh(){
  if(!wanted||blocked()){if(video){video.hidden=true;video.pause();}return;}
  if(!video){
   video=document.createElement('video');video.id='novaUpperAtBackground';
   video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='metadata';
   video.setAttribute('aria-hidden','true');video.setAttribute('playsinline','');
   host.append(video);
  }
  const src=prelude?'assets/media/nova/at-prelude-background-20261013.mp4':checkpoint?'assets/media/nova/checkpoint-confirmed-background-20261013.mp4':'assets/media/nova/upper-at-background-20261012.mp4';
  if(video.getAttribute('src')!==src){video.pause();video.src=src;video.load?.();}
  const backgroundMovie=String(!prelude);
  if(video.dataset.backgroundMovie!==backgroundMovie)video.dataset.backgroundMovie=backgroundMovie;
  if(video.hidden)video.hidden=false;
  requestLayout();play();
 }
 function sync(flow,confirmed=false,atPrelude=false){
  checkpoint=!!confirmed;prelude=!!atPrelude;wanted=prelude||eligible(flow,checkpoint);
  if(init())refresh();
 }
 if(typeof document!=='undefined'){
  window.addEventListener('resize',requestLayout);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video?.pause();else play();});
  document.addEventListener('pointerdown',play);
 }
 return Object.freeze({eligible,sync,layout});
})();
