/* Constant-size session accounting. MY is measured from the running low-water mark. */
globalThis.NovaComplete=(()=>{
 const finite=n=>Number.isFinite(Number(n))?Number(n):0;
 // MY remains a statistic. An explicit MY limit is only for historical trials.
 const defaultMyLimitPt=0;
 function observe(state,net,netLimit=10000,myLimit=defaultMyLimitPt){
  net=finite(net);
  state.lowestNet=Math.min(0,finite(state.lowestNet),net);
  state.maxMy=Math.max(finite(state.maxMy),net-state.lowestNet);
  if(!state.locked){
   const reason=netLimit>0&&net>=netLimit?'net':myLimit>0&&net-state.lowestNet>=myLimit?'my':'';
   if(reason){state.locked=true;state.reason=reason;state.completeProfit=net;state.completeMy=net-state.lowestNet;}
  }
  return state;
 }
 function restore(state,net,netLimit=10000){
  if(state.reason!=='my')return state;
  const setting=state.lockedSetting;
  state.locked=false;state.lockedSetting=0;state.completeProfit=0;
  delete state.reason;delete state.completeMy;
  observe(state,net,netLimit);
  if(state.locked)state.lockedSetting=setting;
  return state;
 }
 return {observe,restore,defaultMyLimitPt};
})();
