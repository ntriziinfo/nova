/* Live completion uses MY from the running low-water mark. Simulation caps are explicit. */
globalThis.NovaComplete=(()=>{
 const finite=n=>Number.isFinite(Number(n))?Number(n):0;
 const defaultNetLimitPt=0,defaultMyLimitPt=19000;
 const validLimit=n=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=999999;
 function myLimit(settings){if(settings?.completeBasis==='net'||settings?.completeBasis==='none')return 0;const n=Number(settings?.completeMyLimitPt);return validLimit(n)?n:defaultMyLimitPt;}
 function configure(settings={},store=false,enabled=true){
  if(enabled===false)return {...settings,completeEnabled:false,completeBasis:'none',completeLimitPt:0,completeMyLimitPt:0};
  // Admin completeLimitPt is a transport alias, never a net-zero cap in live play.
  const limit=store&&validLimit(settings.completeLimitPt)?Number(settings.completeLimitPt):validLimit(settings.completeMyLimitPt)?Number(settings.completeMyLimitPt):defaultMyLimitPt;
  return {...settings,completeEnabled:true,completeBasis:'my',completeLimitPt:0,completeMyLimitPt:limit};
 }
 function label(settings,reason){return reason==='net'?`累計差枚＋${Number(settings.completeLimitPt).toLocaleString()}pt`:`MY${myLimit(settings).toLocaleString()}pt`;}
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
 return {observe,restore,myLimit,configure,label,defaultNetLimitPt,defaultMyLimitPt};
})();
