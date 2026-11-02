/* Live cabinet game limit. Draws, awards and settlement are owned by the game. */
globalThis.NovaPlayLimit=(()=>{
 'use strict';
 const games=10000;
 function continuingAt(normalState){return normalState?.flow?.phase==='art';}
 function normalize(value){
  return {reached:!!value?.reached,finishingAt:!!value?.finishingAt,locked:!!value?.locked,
   reachedAt:Math.max(0,Math.floor(Number(value?.reachedAt)||0)),
   stoppedAt:Math.max(0,Math.floor(Number(value?.stoppedAt)||0))};
 }
 function observe(value,{totalSpins,continuingAt=false,unsettled=false}={}){
  const state=normalize(value),count=Math.max(0,Math.floor(Number(totalSpins)||0));
  // Counted BETs and partially stopped reels must finish their existing payout.
  // In particular, restoring the 10,000th spin must not cancel that spin.
  if(state.locked||unsettled||(!state.reached&&count<games))return state;
  if(!state.reached){state.reached=true;state.reachedAt=count;}
  if(continuingAt){state.finishingAt=true;return state;}
  state.finishingAt=false;state.locked=true;state.stoppedAt=Math.max(count,state.reachedAt);
  return state;
 }
 return Object.freeze({games,normalize,observe,continuingAt});
})();
