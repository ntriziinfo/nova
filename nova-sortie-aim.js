/* Presentation only: a queued sortie is already won or lost before this cue. */
globalThis.NovaSortieAim=(()=>{
 let host,video,images=[],previewing=false;
 function init(){
  if(video)return true;
  host=document.getElementById('machine');if(!host)return false;
  video=document.createElement('video');video.className='novaSortieAimBg';video.muted=true;video.loop=true;video.playsInline=true;video.preload='metadata';video.hidden=true;host.append(video);
  for(const [part,src,alt] of [['middle','middle-text','中リールに'],['symbol','center-symbol','NOVA・チェリー・NOVA'],['aim','aim-text','狙え！']]){
   const img=document.createElement('img');img.className='novaSortieAimPart novaSortieAim-'+part;img.src='assets/ui/sortie-aim-20261027/'+src+'.png';img.alt=alt;img.hidden=true;host.append(img);images.push(img);
  }
  return true;
 }
 function hide(){if(video){video.pause();video.hidden=true;video.currentTime=0;}images.forEach(img=>img.hidden=true);if(host)delete host.dataset.aimActive;previewing=false;}
 function show(color='blue',preview=false){
  if(!init())return;
  hide();previewing=preview;video.dataset.color=color;
  const src='assets/media/nova/sortie-aim-'+(color==='blue'?'blue':'red')+'-20261027.mp4';
  if(video.getAttribute('src')!==src)video.src=src;
  host.dataset.aimActive='true';video.hidden=false;images.forEach(img=>img.hidden=false);video.play().catch(()=>{});
 }
 document.getElementById('sortieAimPreview')?.addEventListener('click',()=>{if(previewing)hide();else show('red',true);});
 document.getElementById('layoutEditCloseBtn')?.addEventListener('click',()=>{if(previewing)hide();});
 return {show,hide};
})();
