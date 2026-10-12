/* Terminal presentation only. Completion limits and prize accounting live elsewhere. */
globalThis.NovaCompletePresentation=(()=>{
 'use strict';
 let host,root,audio=null,active=false,frame=0;
 function layout(){
  if(!active||!root)return;
  const reels=host.querySelector('.reels');if(!reels)return;
  const base=host.getBoundingClientRect(),scale=base.width/host.offsetWidth||1,r=reels.getBoundingClientRect();
  const rects=[r,...Array.from(host.querySelectorAll('.novaArtItem,#novaFlowStatus')).map(el=>el.getBoundingClientRect())].filter(b=>b.width>0&&b.height>0);
  // Include the existing lamp/movie bay even before the licensed artwork loads.
  const left=Math.max(base.left,Math.min(...rects.map(b=>b.left))-4*scale);
  const right=Math.min(base.right,Math.max(...rects.map(b=>b.right))+4*scale);
  const top=Math.max(base.top,Math.min(r.top-r.width*.26,...rects.map(b=>b.top))-4*scale);
  const bottom=Math.min(base.bottom,Math.max(...rects.map(b=>b.bottom))+4*scale);
  const width=(right-left)/scale;
  Object.assign(root.style,{left:(left-base.left)/scale+'px',top:(top-base.top)/scale+'px',width:width+'px',height:(bottom-top)/scale+'px',fontSize:width*.042+'px'});
 }
 function queueLayout(){if(active&&!frame)frame=requestAnimationFrame(()=>{frame=0;layout();});}
 function init(){
  if(root)return true;
  host=document.getElementById('machine');if(!host)return false;
  root=document.createElement('section');root.id='novaCompleteScreen';root.hidden=true;root.setAttribute('role','status');root.setAttribute('aria-live','polite');
  root.innerHTML='<div class="novaCompleteCopy"><strong aria-hidden="true">COMPLETE</strong><p>コンプリート機能が発動しました</p><p>本日の遊技は終了となります</p></div>';
  host.append(root);
  if(globalThis.ResizeObserver){const observer=new ResizeObserver(queueLayout);observer.observe(host);const reels=host.querySelector('.reels');if(reels)observer.observe(reels);}
  if(globalThis.MutationObserver)new MutationObserver(records=>{
   if(records.some(r=>r.target===host||r.target.matches?.('.reels,.novaArtItem,#novaFlowStatus,.novaArtLayer')))queueLayout();
  }).observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
  return true;
 }
 function stopAudio(){
  if(audio){audio.pause();try{audio.currentTime=0;}catch{}audio=null;}
 }
 function sync(locked){
  active=!!locked;
  if(!active){if(root)root.hidden=true;stopAudio();if(frame){cancelAnimationFrame(frame);frame=0;}return;}
  document.getElementById('overlay')?.classList?.remove('show');
  if(init()){root.hidden=false;layout();}
 }
 function setAudio(value){stopAudio();audio=value||null;if(audio)audio.loop=false;}
 if(typeof window!=='undefined')window.addEventListener('resize',queueLayout);
 return Object.freeze({sync,setAudio,layout,get active(){return active;}});
})();
