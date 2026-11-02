/* The game owns the limit state; this screen does not end or settle a session. */
globalThis.NovaPlayLimitPresentation=(()=>{
 'use strict';
 let root,host,active=false;
 function layout(){
  if(!active||!root)return;
  const reels=host.querySelector('.reels');if(!reels)return;
  const base=host.getBoundingClientRect(),scale=base.width/host.offsetWidth||1,r=reels.getBoundingClientRect();
  const rects=[r,...Array.from(host.querySelectorAll('.novaArtItem')).map(el=>el.getBoundingClientRect())].filter(b=>b.width>0&&b.height>0);
  const left=Math.max(base.left,Math.min(...rects.map(b=>b.left))),right=Math.min(base.right,Math.max(...rects.map(b=>b.right)));
  const top=Math.max(base.top,Math.min(r.top-r.width*.26,...rects.map(b=>b.top))),bottom=Math.min(base.bottom,r.bottom);
  Object.assign(root.style,{left:(left-base.left)/scale+'px',top:(top-base.top)/scale+'px',width:(right-left)/scale+'px',height:(bottom-top)/scale+'px',fontSize:(right-left)/scale*.035+'px'});
 }
 function sync(state){
  active=!!state?.locked;
  if(!active){if(root)root.hidden=true;return;}
  if(!root){
   host=document.getElementById('machine');if(!host)return;
   root=document.createElement('section');root.id='novaPlayLimitScreen';root.setAttribute('role','status');root.setAttribute('aria-live','polite');
   root.innerHTML='<div><strong>遊技終了</strong><p>10,000Gの遊技上限に到達しました</p><p>本日の遊技は終了となります</p><small>終了手続きでデータを送信してください</small></div>';
   host.append(root);
   if(globalThis.ResizeObserver)new ResizeObserver(layout).observe(host);
  }
  root.hidden=false;layout();
 }
 if(typeof window!=='undefined')window.addEventListener('resize',layout);
 return Object.freeze({sync,layout,get active(){return active;}});
})();
