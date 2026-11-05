/* View only. Keep the live reels, lottery, stop order and settlement untouched. */
globalThis.NovaSuperSpeedReels=(()=>{
 let host;
 function eligible({active,flow,bonus,blocked,spin}={}){
  const r=spin?.resolved;
  return !!active&&flow?.phase==='normal'&&!bonus&&!blocked&&
   !r?.aim&&!r?.stockEntry&&!r?.sortieEntry&&!r?.researchSortie&&
   !r?.czPrelude&&!r?.czLamp&&!r?.bonusReady&&!r?.bonusWaitSpin&&
   (!r?.flowBefore||r.flowBefore.phase==='normal')&&
   (!r?.flowAfter||r.flowAfter.phase==='normal');
 }
 function sync(state){
  host ||= document.querySelector('.reels');
  if(!host)return;
  // Keep the actual stopped symbols visible; no cover, dimming or status text.
  host.classList.toggle('novaSuperSpeedReelsStatic',eligible(state));
 }
 return Object.freeze({eligible,sync});
})();
