/* Gameplay deadlines must not depend on visible animation frames. AUTO enables
   a worker clock; native timers remain a fallback. Both share one-shot tokens. */
globalThis.NovaClock=(()=>{
 const nativeSet=globalThis.setTimeout.bind(globalThis),nativeClear=globalThis.clearTimeout.bind(globalThis);
 const workerUrl=new URL('nova-clock-worker.js?v=20260917-background-129',document.currentScript.src);
 const timers=new Map();let nextId=0,nextToken=0,worker=null;
 function disableWorker(){if(worker){worker.terminate();worker=null;}}
 function post(message){try{worker?.postMessage(message);}catch{disableWorker();}}
 function arm(entry){
  entry.token=++nextToken;
  const token=entry.token,delay=Math.max(0,Math.ceil(entry.due-performance.now()));
  entry.native=nativeSet(()=>fire(entry.id,token),delay);
  post({type:'arm',id:entry.id,token,delay});
 }
 function fire(id,token){
  const entry=timers.get(id);if(!entry||entry.token!==token)return;
  nativeClear(entry.native);post({type:'cancel',id});
  // Remove before invoking user code: cancellation and reset cannot replay it.
  if(!entry.repeat)timers.delete(id);
  else entry.token=++nextToken;
  try{entry.callback(...entry.args);}finally{
   if(entry.repeat&&timers.get(id)===entry){
    // Resume at normal speed after a delayed wake-up, without catch-up spins.
    entry.due=performance.now()+entry.delay;arm(entry);
   }
  }
 }
 function schedule(callback,delay,repeat,args){
  if(typeof callback!=='function')throw new TypeError('NovaClock requires a callback');
  delay=Math.max(repeat?1:0,Math.min(2147483647,Number(delay)||0));
  const entry={id:++nextId,callback,args,delay,repeat,due:performance.now()+delay};
  timers.set(entry.id,entry);arm(entry);return entry.id;
 }
 function cancel(id){const entry=timers.get(id);if(!entry)return;timers.delete(id);nativeClear(entry.native);post({type:'cancel',id});}
 function setBackgroundEnabled(enabled){
  if(!enabled){disableWorker();return;}
  if(worker||typeof Worker==='undefined')return;
  try{
   const candidate=new Worker(workerUrl);worker=candidate;
   candidate.onmessage=event=>{if(worker===candidate)fire(event.data.id,event.data.token);};
   candidate.onerror=()=>{if(worker===candidate)disableWorker();};
   for(const entry of timers.values())post({type:'arm',id:entry.id,token:entry.token,delay:Math.max(0,Math.ceil(entry.due-performance.now()))});
  }catch{disableWorker();}
 }
 return {setTimeout:(fn,ms,...args)=>schedule(fn,ms,false,args),clearTimeout:cancel,
  setInterval:(fn,ms,...args)=>schedule(fn,ms,true,args),clearInterval:cancel,setBackgroundEnabled};
})();
