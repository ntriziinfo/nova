/* View only. Keep the live reels, lottery, stop order and settlement untouched. */
globalThis.NovaSuperSpeedReels=(()=>{
 let host,cover;
 function eligible({active,flow,bonus,blocked,spin}={}){
  const r=spin?.resolved;
  return !!active&&flow?.phase==='normal'&&!bonus&&!blocked&&
   !r?.aim&&!r?.stockEntry&&!r?.sortieEntry&&!r?.researchSortie&&
   !r?.czPrelude&&!r?.czLamp&&!r?.bonusReady&&!r?.bonusWaitSpin&&
   (!r?.flowBefore||r.flowBefore.phase==='normal')&&
   (!r?.flowAfter||r.flowAfter.phase==='normal');
 }
 function sync(state){
  const visible=eligible(state);
  host ||= document.querySelector('.reels');
  if(!host)return;
  if(visible&&!cover){
   cover=document.createElement('div');cover.className='novaSuperSpeedReelCover';
   cover.setAttribute('role','status');cover.hidden=true;
   const label=document.createElement('span');label.textContent='超ハイスピード中';
   cover.append(label);host.append(cover);
  }
  if(visible&&cover.hidden){
   // Take one still frame per entry. Live symbol updates remain hidden behind it.
   const still=document.createElement('div');still.className='novaSuperSpeedReelStill';
   still.setAttribute('aria-hidden','true');
   for(const reel of host.querySelectorAll(':scope > .reel')){
    const column=document.createElement('div');column.className='novaSuperSpeedFrozenReel';
    for(const cell of reel.querySelectorAll('.window > .cell')){
     const copy=cell.cloneNode(true);copy.classList.remove('win');
     copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
     column.append(copy);
    }
    still.append(column);
   }
   cover.querySelector('.novaSuperSpeedReelStill')?.remove();cover.prepend(still);
  }
  host.classList.toggle('novaSuperSpeedReelsStatic',visible);
  if(cover)cover.hidden=!visible;
 }
 return Object.freeze({eligible,sync});
})();
