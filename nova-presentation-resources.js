/* Shared presentation resources. Never owns game timers, RNG, awards or input locks. */
globalThis.NovaPresentation=(()=>{
 const players=new Map(),warmQueue=[],warmSeen=new Set();
 let warming=0;
 function visible(video,state){return state.wanted()&&!video.hidden&&!document.hidden;}
 function attempt(video,state){
  if(!visible(video,state)||state.starting||!video.paused||state.failures>=3)return;
  const token=++state.token;state.starting=true;
  try{
   Promise.resolve(video.play()).then(()=>{
    if(!visible(video,state))video.pause();
    if(token===state.token)state.failures=0;
   },()=>{if(token===state.token)state.failures++;}).finally(()=>{
    if(token===state.token){
     state.starting=false;
     if(state.failures>0&&state.failures<3&&visible(video,state)){
      clearTimeout(state.retry);state.retry=setTimeout(()=>attempt(video,state),250*state.failures);
     }
    }
   });
  }catch{state.starting=false;state.failures++;}
 }
 function play(video,wanted=()=>true){
  let state=players.get(video);
  if(!state){
   state={wanted,token:0,starting:false,failures:0};players.set(video,state);
   for(const event of ['canplay','loadeddata'])video.addEventListener(event,()=>attempt(video,state));
  }
  state.wanted=wanted;attempt(video,state);
 }
 function stop(video){
  const state=players.get(video);
  if(state){clearTimeout(state.retry);state.wanted=()=>false;state.token++;state.starting=false;state.failures=0;}
  video.pause();
 }
 function resume(){for(const [video,state]of players)attempt(video,state);}
 if(typeof document!=='undefined'){
  document.addEventListener('visibilitychange',()=>{
   for(const [video,state]of players){if(document.hidden){clearTimeout(state.retry);state.token++;state.starting=false;video.pause();}else attempt(video,state);}
  });
  document.addEventListener('pointerdown',()=>{for(const state of players.values())state.failures=0;resume();},{passive:true});
 }
 // Start at most two preparation jobs at once. Yield between jobs, including
 // on desktop, rather than competing with the first video and reel assets.
 function pump(){
  while(warming<2&&warmQueue.length){
   const job=warmQueue.shift();warming++;
   let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timeout);warming--;setTimeout(pump,0);};
   const timeout=setTimeout(finish,8000);
   try{Promise.resolve(job()).then(finish,finish);}catch{finish();}
  }
 }
 function warm(key,job){
  if(warmSeen.has(key))return;warmSeen.add(key);warmQueue.push(job);
  if(globalThis.requestIdleCallback)requestIdleCallback(pump,{timeout:2000});else setTimeout(pump,100);
 }
 // Fetch/decode the first frame before a short AUTO cue. Never call play() or
 // reload an active video: preparing a future cue must not interrupt this one.
 function warmVideo(video,{buffer=false}={}){
  warm(video,async()=>{
   // Short cues must not reopen a network range after the browser discards a
   // hidden player's buffer. Keep these small clips local for this page only.
   // Never swap a source once its cue has appeared, even if fetch finishes late.
   if(buffer&&video.hidden&&video.paused&&typeof fetch==='function'&&typeof URL!=='undefined'&&typeof URL.createObjectURL==='function'){
    const source=video.getAttribute('src'),controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5000);
    try{
     const response=await fetch(source,{signal:controller.signal});
     if(!response.ok)throw Error('Video preload failed');
     const blob=await response.blob();
     if(video.hidden&&video.paused&&video.getAttribute('src')===source){
      video.src=URL.createObjectURL(blob); // Released with this document.
      video.preload='auto';video.load();
     }
    }catch{/* Native video loading remains available on a slow/offline link. */}
    finally{clearTimeout(timer);}
   }
   if(video.readyState>=2||!video.paused)return;
   return new Promise(resolve=>{
    let timeout;
    const finish=()=>{clearTimeout(timeout);video.removeEventListener('loadeddata',finish);video.removeEventListener('error',finish);resolve();};
    video.addEventListener('loadeddata',finish);video.addEventListener('error',finish);
    timeout=setTimeout(finish,buffer?1000:6000);
    video.preload='auto';
    if(video.networkState===0)video.load();
   });
  });
 }
 return Object.freeze({play,stop,warm,warmVideo});
})();
