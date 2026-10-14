/* Read-only reference viewer. No game state, timers or game RNG are used here. */
(() => {
  'use strict';
  const button=document.getElementById('flowToggleBtn');
  const dialog=document.getElementById('novaFlowGuide');
  if(!button||!dialog)return;
  const image=document.getElementById('novaFlowGuideImage');
  const viewport=dialog.querySelector('.novaFlowGuideViewport');
  const tabs=[...dialog.querySelectorAll('[data-flow-page]')];
  const zoom=document.getElementById('novaFlowGuideZoom');
  const status=document.getElementById('novaFlowGuideStatus');
  const retry=document.getElementById('novaFlowGuideRetry');
  const pages=[
    {src:'assets/guide/game-flow-20261014-1.webp',alt:'通常時からCZ、BIG、AT初当たりまでのゲームフロー'},
    {src:'assets/guide/game-flow-20261014-2.webp',alt:'AT、上乗せ特化、出陣チャレンジ、上位AT、引き戻しのゲームフロー'}
  ];
  let current=0;
  function select(index,force=false){
    current=index;
    tabs.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(i===current)));
    viewport.scrollTo(0,0);
    if(!force&&image.getAttribute('src')===pages[index].src)return;
    status.textContent='画像を読み込んでいます…';status.hidden=false;retry.hidden=true;
    image.hidden=true;image.alt=pages[index].alt;image.src=pages[index].src;
  }
  image.addEventListener('load',()=>{status.hidden=true;retry.hidden=true;image.hidden=false;});
  image.addEventListener('error',()=>{
    image.hidden=true;status.hidden=false;status.textContent='画像を読み込めませんでした。再読み込みしてください。';retry.hidden=false;
  });
  button.addEventListener('click',()=>{
    if(dialog.open)return;
    dialog.showModal();button.setAttribute('aria-expanded','true');select(current);
  });
  document.getElementById('novaFlowGuideClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');button.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('keydown',event=>{
    // Arrow/space input must not reach the cabinet's BET/stop shortcuts.
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();dialog.close();}
  });
  tabs.forEach((tab,index)=>tab.addEventListener('click',()=>select(index)));
  zoom.addEventListener('click',()=>{
    const expanded=viewport.classList.toggle('isZoomed');
    zoom.setAttribute('aria-pressed',String(expanded));zoom.textContent=expanded?'縮小':'拡大';
  });
  retry.addEventListener('click',()=>select(current,true));
})();
