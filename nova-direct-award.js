/* Presentation only: show this spin's resolved gain after all reels land. */
globalThis.NovaDirectAward=(()=>{
 const values=Object.freeze([10,20,30,50,100,300]);
 const source=pt=>'assets/design/nova-direct-pt-v1/direct-plus-'+pt+'pt.png';
 const atlas='assets/design/nova-award-glyphs-v1/glyphs.png';
 let root,img,fallback,glyphs,shownAt=0,resultTimer=null;
 function directAmount(resolved){
  const n=Number(resolved?.atOutcome?.direct);
  return resolved?.flowBefore?.phase==='art'&&Number.isSafeInteger(n)&&n>0?n:0;
 }
 function amount(resolved){
  const zone=Number(resolved?.zoneAward);
  const ladder=['sosuke','giru','ura_giru'].includes(resolved?.flowBefore?.zone)||['sosuke','giru','ura_giru'].includes(resolved?.flowAfter?.zone);
  return directAmount(resolved)+(!ladder&&Number.isSafeInteger(zone)&&zone>0?zone:0);
 }
 function init(){
  if(root)return true;
  const host=document.querySelector('.reelArea');if(!host)return false;
  root=document.createElement('div');root.id='novaDirectAward';root.hidden=true;
  root.setAttribute('role','status');root.setAttribute('aria-live','polite');
  img=new Image();img.alt='';img.draggable=false;
  fallback=document.createElement('span');fallback.className='awardFallback';fallback.hidden=true;
  glyphs=document.createElement('div');glyphs.className='awardGlyphs';glyphs.setAttribute('aria-hidden','true');glyphs.hidden=true;
  img.addEventListener('error',()=>{img.hidden=true;fallback.hidden=false;});
  root.append(img,glyphs,fallback);host.append(root);
  for(const pt of values){const preload=new Image();preload.src=source(pt);}
  const preload=new Image();preload.src=atlas;
  preload.onerror=()=>{if(root&&!glyphs.hidden){glyphs.hidden=true;fallback.hidden=false;}};
  return true;
 }
 function show(resolved){
  const pt=amount(resolved);if(!pt||!init())return false;
  const label='＋'+pt+'pt';root.dataset.pt=String(pt);root.setAttribute('aria-label',(resolved.zoneAward?'ゾーン上乗せ ':'直乗せ ')+label);
  fallback.textContent=label;fallback.hidden=true;img.hidden=!values.includes(pt);glyphs.hidden=values.includes(pt);
  if(values.includes(pt))img.src=source(pt);
  else{
   glyphs.replaceChildren(...[10,...String(pt).split('').map(Number),11].map(index=>{
    const cell=document.createElement('span');cell.style.backgroundPosition=(index%6)*20+'% '+(index<6?0:100)+'%';return cell;
   }));
  }
  shownAt=performance.now();
  root.hidden=false;root.classList.remove('show');void root.offsetWidth;root.classList.add('show');
  return true;
 }
 function clear(){
  if(resultTimer!==null){NovaClock.clearTimeout(resultTimer);resultTimer=null;}
  if(root){root.hidden=true;root.classList.remove('show');delete root.dataset.pt;}
 }
 // A last-game award must remain readable before the result card covers it.
 // The shared clock also advances while AUTO is in a background tab.
 function deferResult(callback){
  if(resultTimer!==null)return true;
  const remaining=root&&!root.hidden?1000-(performance.now()-shownAt):0;
  if(remaining<=0)return false;
  resultTimer=NovaClock.setTimeout(()=>{resultTimer=null;callback();},Math.ceil(remaining));
  return true;
 }
 if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
 return {values,amount,directAmount,show,clear,deferResult,get busy(){return resultTimer!==null;}};
})();
