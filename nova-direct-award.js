/* Presentation only: show the already resolved direct award after all reels land. */
globalThis.NovaDirectAward=(()=>{
 const values=Object.freeze([10,20,30,50,100,300]);
 const source=pt=>'assets/design/nova-direct-pt-v1/direct-plus-'+pt+'pt.png';
 let root,img,fallback;
 function amount(resolved){
  const n=Number(resolved?.atOutcome?.direct);
  return resolved?.flowBefore?.phase==='art'&&Number.isSafeInteger(n)&&n>0?n:0;
 }
 function init(){
  if(root)return true;
  const host=document.querySelector('.reelArea');if(!host)return false;
  root=document.createElement('div');root.id='novaDirectAward';root.hidden=true;
  root.setAttribute('role','status');root.setAttribute('aria-live','polite');
  img=new Image();img.alt='';img.draggable=false;
  fallback=document.createElement('span');fallback.hidden=true;
  img.addEventListener('error',()=>{img.hidden=true;fallback.hidden=false;});
  root.append(img,fallback);host.append(root);
  for(const pt of values){const preload=new Image();preload.src=source(pt);}
  return true;
 }
 function show(resolved){
  const pt=amount(resolved);if(!pt||!init())return false;
  const label='＋'+pt+'pt';root.dataset.pt=String(pt);root.setAttribute('aria-label','直乗せ '+label);
  fallback.textContent=label;fallback.hidden=values.includes(pt);img.hidden=!values.includes(pt);
  if(values.includes(pt))img.src=source(pt);
  root.hidden=false;root.classList.remove('show');void root.offsetWidth;root.classList.add('show');
  return true;
 }
 function clear(){if(root){root.hidden=true;root.classList.remove('show');delete root.dataset.pt;}}
 if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
 return {values,amount,show,clear};
})();
