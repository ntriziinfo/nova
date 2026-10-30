/* Presentation only: a queued sortie is already won or lost before this cue. */
globalThis.NovaSortieAim=(()=>{
 let host,video,fireVideo,effectLayer,images=[],previewing=false,previewButton=null;
 const backgrounds=new Map(),colors=['blue','red','rainbow'];
 function movie(className,src){
  const item=document.createElement('video');item.className=className;item.muted=true;item.loop=true;item.playsInline=true;item.preload='auto';item.hidden=true;item.src=src;host.append(item);return item;
 }
 function decode(img){img.decoding='async';img.decode?.().catch(()=>{});}
 function syncPreviewButton(on){
  previewButton?.setAttribute?.('aria-pressed',String(!!on));
 }
 function init(){
  if(video)return true;
  host=document.getElementById('machine');if(!host)return false;
  // Each color retains its buffer/first frame. Switching src on BET discarded it.
  for(const color of colors){const item=movie('novaSortieAimBg','assets/media/nova/sortie-aim-'+color+'-20261027.mp4');item.dataset.color=color;backgrounds.set(color,item);}
  video=backgrounds.get('blue');
  fireVideo=movie('novaSortieAimFire','assets/media/nova/sortie-challenge-fire-20261030.mp4');
  effectLayer=document.createElement('div');effectLayer.className='novaSortieAimEffects';effectLayer.setAttribute('aria-hidden','true');effectLayer.hidden=true;host.append(effectLayer);
  for(const [part,src,alt] of [['middle','middle-text','中リールに'],['symbol','center-symbol','NOVA・ブランク・NOVA'],['aim','aim-text','狙え！']]){
   const effect=document.createElement('div');effect.className='novaSortieAimFx novaSortieAimFx-'+part;effectLayer.append(effect);
   const img=document.createElement(part==='symbol'?'div':'img');img.className='novaSortieAimPart novaSortieAim-'+part;if(part==='symbol'){
    img.setAttribute('role','img');img.setAttribute('aria-label','NOVA・ブランク・NOVA');
    const stack=document.createElement('div');stack.className='novaSortieAimStack';
    for(const name of ['nova-only','blank','nova-only']){
     const file=name==='blank'?'blank-supernova-20261028-v1':'nova-only-20261027';
     const symbol=document.createElement('img');symbol.src='assets/lossless-20261027/'+file+'.webp';symbol.alt='';symbol.className=name==='blank'?'sortieBlank':'sortieNova';symbol.draggable=false;stack.append(symbol);decode(symbol);
    }
    img.append(stack);
   }else{img.src='assets/ui/sortie-aim-20261027/'+src+'.png';img.alt=alt;decode(img);}img.hidden=true;host.append(img);images.push(img);
  }
  return true;
 }
 function hide(){for(const item of [...backgrounds.values(),fireVideo])if(item){if(globalThis.NovaPresentation)NovaPresentation.stop(item);else item.pause();item.hidden=true;if(item.currentTime>0)item.currentTime=0;}images.forEach(img=>img.hidden=true);if(effectLayer){effectLayer.hidden=true;delete effectLayer.dataset.color;}if(host){delete host.dataset.aimActive;delete host.dataset.sortieAimColor;}previewing=false;syncPreviewButton(false);}
 function show(color='blue',preview=false){
  if(!init())return;
  hide();delete host.dataset.sortieAimFailed;previewing=preview;
  const cueColor=colors.includes(color)?color:'blue';video=backgrounds.get(cueColor);effectLayer.dataset.color=cueColor;host.dataset.sortieAimColor=cueColor;
  host.dataset.aimActive='true';video.hidden=false;fireVideo.hidden=false;effectLayer.hidden=false;images.forEach(img=>img.hidden=false);syncPreviewButton(preview);
  for(const item of [video,fireVideo]){if(globalThis.NovaPresentation)NovaPresentation.play(item,()=>!item.hidden);else item.play().catch(()=>{});}
 }
 previewButton=document.getElementById('sortieAimPreview');syncPreviewButton(false);
 previewButton?.addEventListener('click',()=>{if(previewing)hide();else show('red',true);});
 document.getElementById('layoutEditCloseBtn')?.addEventListener('click',()=>{if(previewing)hide();});
 function fail(){if(host)host.dataset.sortieAimFailed='true';}
 // Warm after initial rendering; no playback, audio, RNG, or visible cue here.
 function warm(){if(globalThis.requestIdleCallback)requestIdleCallback(init,{timeout:1500});else setTimeout(init,250);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',warm,{once:true});else warm();
 return {show,hide,fail};
})();
