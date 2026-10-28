/* Presentation only: a queued sortie is already won or lost before this cue. */
globalThis.NovaSortieAim=(()=>{
 let host,video,images=[],previewing=false;
 function init(){
  if(video)return true;
  host=document.getElementById('machine');if(!host)return false;
  video=document.createElement('video');video.className='novaSortieAimBg';video.muted=true;video.loop=true;video.playsInline=true;video.preload='metadata';video.hidden=true;host.append(video);
  for(const [part,src,alt] of [['middle','middle-text','中リールに'],['symbol','center-symbol','NOVA・チェリー・NOVA'],['aim','aim-text','狙え！']]){
   const img=document.createElement(part==='symbol'?'div':'img');img.className='novaSortieAimPart novaSortieAim-'+part;if(part==='symbol'){
    img.setAttribute('role','img');img.setAttribute('aria-label','NOVA・ブランク・NOVA');
    const stack=document.createElement('div');stack.className='novaSortieAimStack';
    for(const name of ['nova-only','blank','nova-only']){
     const symbol=document.createElement('img');symbol.src='assets/lossless-20261027/'+name+'-20261027.webp';symbol.alt='';symbol.className=name==='blank'?'sortieBlank':'sortieNova';symbol.draggable=false;stack.append(symbol);
    }
    img.append(stack);
   }else{img.src='assets/ui/sortie-aim-20261027/'+src+'.png';img.alt=alt;}img.hidden=true;host.append(img);images.push(img);
  }
  return true;
 }
 function hide(){if(video){if(globalThis.NovaPresentation)NovaPresentation.stop(video);else video.pause();video.hidden=true;video.currentTime=0;}images.forEach(img=>img.hidden=true);if(host)delete host.dataset.aimActive;previewing=false;}
 function show(color='blue',preview=false){
  if(!init())return;
  hide();delete host.dataset.sortieAimFailed;previewing=preview;video.dataset.color=color;
  const src='assets/media/nova/sortie-aim-'+(['blue','red','rainbow'].includes(color)?color:'blue')+'-20261027.mp4';
  if(video.getAttribute('src')!==src)video.src=src;
  host.dataset.aimActive='true';video.hidden=false;images.forEach(img=>img.hidden=false);if(globalThis.NovaPresentation)NovaPresentation.play(video,()=>!video.hidden);else video.play().catch(()=>{});
 }
 document.getElementById('sortieAimPreview')?.addEventListener('click',()=>{if(previewing)hide();else show('red',true);});
 document.getElementById('layoutEditCloseBtn')?.addEventListener('click',()=>{if(previewing)hide();});
 function fail(){if(host)host.dataset.sortieAimFailed='true';}
 return {show,hide,fail};
})();
