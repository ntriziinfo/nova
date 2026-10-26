/* Rendering cadence only. Game timers, audio and lotteries use their existing clocks. */
globalThis.NovaFrameClock=(()=>{
 const interval=1000/60,pending=new Map();
 let id=0,frame=0,last=-Infinity;
 function tick(time){
  frame=0;
  if(time-last>=interval-.01){
   last=Number.isFinite(last)?time-((time-last)%interval):time;
   // Avoid floating-point modulo turning a complete interval into zero progress.
   if(time-last>interval-.01)last=time;
   const batch=[...pending];
   for(const [key,callback] of batch){
    if(!pending.delete(key))continue;
    try{callback(time);}catch(error){setTimeout(()=>{throw error;},0);}
   }
  }
  if(pending.size&&!frame)frame=globalThis.requestAnimationFrame(tick);
 }
 function requestAnimationFrame(callback){const key=++id;pending.set(key,callback);if(!frame)frame=globalThis.requestAnimationFrame(tick);return key;}
 function cancelAnimationFrame(key){pending.delete(key);if(!pending.size&&frame){globalThis.cancelAnimationFrame(frame);frame=0;}}
 return Object.freeze({fps:60,requestAnimationFrame,cancelAnimationFrame});
})();
