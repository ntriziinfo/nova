/* Stop-order presentation only. Bell draws and payouts remain in NovaArt. */
globalThis.NovaBellNavi=(()=>{
 const orders=Object.freeze([[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]].map(Object.freeze));
 const defaults=Object.freeze({x:0,y:0,w:100,h:7.6,gap:.4});
 const asset='assets/design/nova-navi-v1/navi-yellow-123.png';
 let host,root,items=[],active=null,previewing=false;
 function eligible(spin){
  const r=spin?.resolved,f=r?.flowBefore;
  return !!(spin?.result==='BELL'&&f?.phase==='art'&&!spin.aTypeBonusActiveAtStart&&!r.bonusPendingAtStart&&!r.zoneSpin&&!r.comebackEvent&&!r.burstEvent&&!f.zone&&!f.entryStage&&!f.initialStage&&!f.comebackLeft&&!f.comebackConfirmed&&!f.burstLeft&&!f.burstPending);
 }
 function drawOrder(rng=Math.random){return orders[Math.min(5,Math.max(0,Math.floor(rng()*6)))].slice();}
 function stopOrder(spin){return spin?.bellNaviOrder?.slice()||(spin?.resolved?.aim||spin?.zoneActiveAtStart?[2,1,0]:[0,1,2]);}
 function init(){
  if(root)return true;
  host=document.getElementById('machine');if(!host)return false;
  root=document.createElement('div');root.id='novaBellNavi';root.className='novaBellNavi';root.hidden=true;
  root.setAttribute('role','group');root.setAttribute('aria-label','ベル押し順ナビ');
  items=[0,1,2].map(i=>{
   const item=document.createElement('div');item.className='novaBellNaviItem';item.dataset.reel=String(i);
   const img=new Image();img.src=asset;img.alt='';img.draggable=false;item.append(img);root.append(item);return item;
  });
  host.append(root);
  if(typeof ResizeObserver!=='undefined'){
   const observer=new ResizeObserver(layout);observer.observe(host);
   const reels=host.querySelector('.reels');if(reels)observer.observe(reels);
  }
  return true;
 }
 function layout(){
  if(!init())return;
  const reels=host.querySelector('.reels');if(!reels)return;
  const base=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=base.width/host.offsetWidth||1;
  const width=r.width/scale,css=getComputedStyle(document.documentElement),cfg={};
  for(const key of Object.keys(defaults)){const n=parseFloat(css.getPropertyValue('--layout-navi-'+key));cfg[key]=Number.isFinite(n)?n:defaults[key];}
  const h=width*cfg.h/100;
  Object.assign(root.style,{left:(r.left-base.left)/scale+width*cfg.x/100+'px',top:(r.top-base.top)/scale-h-2+width*cfg.y/100+'px',width:width*cfg.w/100+'px',height:h+'px',gap:cfg.gap+'%'});
 }
 function render(){
  if(!init())return;
  const order=active?.bellNaviOrder||(previewing?[0,1,2]:null),stopped=active?.stopped||[];
  root.hidden=!order||!!(active&&stopped.every(Boolean));
  root.dataset.preview=String(!active&&previewing);
  if(root.hidden)return;
  const next=order.find(i=>!stopped[i]);
  items.forEach((item,i)=>{
   const number=order.indexOf(i)+1;item.dataset.number=String(number);item.dataset.stopped=String(!!stopped[i]);item.dataset.next=String(i===next);
   item.setAttribute('aria-label',['左','中','右'][i]+'リール '+number+'番目'+(stopped[i]?' 停止済み':''));
   item.firstChild.style.left=-(number-1)*100+'%';
  });
  layout();
 }
 function begin(spin,rng=Math.random){
  spin.bellNaviOrder=eligible(spin)?drawOrder(rng):null;
  active=spin.bellNaviOrder?spin:null;render();return spin.bellNaviOrder;
 }
 function stop(spin){if(active===spin)render();}
 function clear(){active=null;render();}
 function preview(on){previewing=!!on;render();}
 if(typeof document!=='undefined'){
  document.addEventListener('DOMContentLoaded',init);
  window.addEventListener('resize',layout);
 }
 return {defaults,eligible,drawOrder,stopOrder,begin,stop,clear,preview,layout};
})();
