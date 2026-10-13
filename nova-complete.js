/* MY is measured from the running low-water mark. */
globalThis.NovaComplete=(()=>{
 const finite=n=>Number.isFinite(Number(n))?Number(n):0;
 const defaultNetLimitPt=0,defaultMyLimitPt=19000;
 function myLimit(settings){const n=Number(settings?.completeMyLimitPt);return Number.isInteger(n)&&n>=1&&n<=999999?n:defaultMyLimitPt;}
 function observe(state,net,netLimit=defaultNetLimitPt,myLimit=defaultMyLimitPt){
  net=finite(net);state.lowestNet=Math.min(0,finite(state.lowestNet),net);state.maxMy=Math.max(finite(state.maxMy),net-state.lowestNet);
  if(!state.locked){const reason=netLimit>0&&net>=netLimit?'net':myLimit>0&&net-state.lowestNet>=myLimit?'my':'';
   if(reason){state.locked=true;state.reason=reason;state.completeProfit=net;state.completeMy=net-state.lowestNet;}}
  return state;
 }
 function restore(state,net,netLimit=defaultNetLimitPt,myLimit=defaultMyLimitPt){
  const setting=state.lockedSetting;state.locked=false;state.lockedSetting=0;state.completeProfit=0;delete state.reason;delete state.completeMy;
  observe(state,net,netLimit,myLimit);
  if(!state.locked&&myLimit>0&&state.maxMy>=myLimit){state.locked=true;state.reason='my';state.completeProfit=finite(net);state.completeMy=state.maxMy;}
  if(state.locked)state.lockedSetting=setting;return state;
 }
 return {observe,restore,myLimit,defaultNetLimitPt,defaultMyLimitPt};
})();
