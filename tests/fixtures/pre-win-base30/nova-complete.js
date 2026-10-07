/* Constant-size session accounting. MY is measured from the running low-water mark. */
globalThis.NovaComplete=(()=>{
 const finite=n=>Number.isFinite(Number(n))?Number(n):0;
 function observe(state,net,netLimit=10000,myLimit=15000){
  net=finite(net);
  state.lowestNet=Math.min(0,finite(state.lowestNet),net);
  state.maxMy=Math.max(finite(state.maxMy),net-state.lowestNet);
  if(!state.locked){
   const reason=netLimit>0&&net>=netLimit?'net':myLimit>0&&net-state.lowestNet>=myLimit?'my':'';
   if(reason){state.locked=true;state.reason=reason;state.completeProfit=net;state.completeMy=net-state.lowestNet;}
  }
  return state;
 }
 return {observe};
})();
