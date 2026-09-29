/* iOS audio transport. Decode locally; no recording, upload or asset modification. */
globalThis.NovaAudio=(()=>{
 'use strict';
 const NativeAudio=globalThis.Audio;
 const enabled=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const players=new WeakMap(),active=new Set(),cache=new Map();
 const maxBytes=48*1024*1024;
 let ctx=null,bytes=0,unlocked=false,authorized=false,lastError='',started=0;
 function context(){
  if(!ctx){
   ctx=new (globalThis.AudioContext||globalThis.webkitAudioContext)();
   ctx.addEventListener('statechange',()=>{if(enabled&&ctx.state!=='running')notify('nova-audio-blocked');});
  }
  return ctx;
 }
 function notify(type){window.dispatchEvent(new Event(type));}
 function unlock(event){
  if(event&&event.isTrusted===false)return Promise.resolve(false);
  if(event?.isTrusted)authorized=true;
  if(!authorized)return Promise.resolve(false);
  try{
   // Request the media playback category on supporting iOS versions.
   try{if(enabled&&navigator.audioSession)navigator.audioSession.type='playback';}catch{}
   const c=context(),resume=c.state==='running'?Promise.resolve():c.resume();
   const silent=c.createBufferSource();silent.buffer=c.createBuffer(1,1,c.sampleRate);silent.connect(c.destination);silent.start();
   return Promise.resolve(resume).then(()=>{
    unlocked=c.state==='running';
    if(unlocked){lastError='';notify('nova-audio-ready');}
    else notify('nova-audio-blocked');
    return unlocked;
   }).catch(error=>{lastError=error.name||'AudioError';notify('nova-audio-blocked');return false;});
  }catch(error){lastError=error.name||'AudioError';notify('nova-audio-blocked');return Promise.resolve(false);}
 }
 async function buffer(src){
  const key=new URL(src,document.baseURI).href;
  if(cache.has(key)){const item=cache.get(key);cache.delete(key);cache.set(key,item);return item.promise;}
  const item={size:0,promise:null};
  item.promise=fetch(key).then(r=>{if(!r.ok)throw new Error('Audio HTTP '+r.status);return r.arrayBuffer();})
   .then(data=>context().decodeAudioData(data)).then(decoded=>{
    item.size=decoded.length*decoded.numberOfChannels*4;bytes+=item.size;
    for(const [oldKey,old]of cache){if(bytes<=maxBytes)break;if(!old.size)continue;cache.delete(oldKey);bytes-=old.size;}
    return decoded;
   }).catch(error=>{if(cache.get(key)===item)cache.delete(key);throw error;});
  cache.set(key,item);return item.promise;
 }
 function adopt(audio){
  if(!enabled||!audio||players.has(audio))return audio;
  const originalClone=audio.cloneNode.bind(audio),originalSet=audio.setAttribute.bind(audio);
  const originalGet=audio.getAttribute.bind(audio);
  // Web Audio owns loading. Avoid a second native decoder for each voice.
  let preload=audio.preload;audio.preload='none';
  const state={node:null,gain:null,route:null,time:0,at:0,duration:NaN,paused:true,ended:false,volume:audio.volume,muted:audio.muted,loop:audio.loop,token:0,promise:null,ticker:null};
  players.set(audio,state);
  const emit=name=>audio.dispatchEvent(new Event(name));
  const position=()=>{
   let t=state.time+(state.node?Math.max(0,context().currentTime-state.at):0);
   if(Number.isFinite(state.duration)&&state.duration>0)t=state.loop?t%state.duration:Math.min(t,state.duration);
   return t;
  };
  const gain=()=>{
   if(!state.gain){state.gain=context().createGain();state.gain.connect(context().destination);}
   state.gain.gain.value=state.muted?0:state.volume;return state.gain;
  };
  const stop=()=>{
   if(state.node){state.node.onended=null;try{state.node.stop();}catch{}state.node.disconnect();state.node=null;}
   clearInterval(state.ticker);state.ticker=null;active.delete(audio);
  };
  const pause=()=>{
   const wasPlaying=!state.paused;state.time=position();state.token++;stop();state.promise=null;state.paused=true;
   if(wasPlaying)emit('pause');
  };
  const load=()=>{pause();state.time=0;state.duration=NaN;state.ended=false;};
  const play=()=>{
   if(!state.paused&&state.promise)return state.promise;
   const src=originalGet('src');
   if(!src)return Promise.reject(new Error('Audio source missing'));
   const generation=++state.token;state.paused=false;state.ended=false;
   state.promise=(async()=>{
    try{
     const c=context();
     if(!authorized)throw new DOMException('Tap to enable audio','NotAllowedError');
     if(c.state!=='running')await c.resume();
     if(c.state!=='running')throw new DOMException('Tap to enable audio','NotAllowedError');
     const decoded=await buffer(src);
     if(generation!==state.token)return;
     state.duration=decoded.duration;emit('loadedmetadata');emit('canplay');
     const node=c.createBufferSource();node.buffer=decoded;node.loop=state.loop;node.connect(gain());
     state.time=state.time<decoded.duration?state.time:0;state.at=c.currentTime;state.node=node;
     node.onended=()=>{
      if(generation!==state.token||state.node!==node)return;
      state.time=state.duration;stop();state.paused=true;state.ended=true;state.promise=null;emit('timeupdate');emit('ended');
     };
     node.start(0,state.time);active.add(audio);started++;
     state.ticker=setInterval(()=>emit('timeupdate'),250);emit('play');emit('playing');
    }catch(error){
     if(generation!==state.token)return;
     state.paused=true;state.promise=null;lastError=error.name||'AudioError';
     if(error.name==='NotAllowedError')notify('nova-audio-blocked');else emit('error');
     throw error;
    }
   })();
   return state.promise;
  };
  const field=(name,get,set)=>Object.defineProperty(audio,name,{configurable:true,get,set});
  field('preload',()=>preload,value=>{preload=String(value);});
  field('src',()=>{const src=originalGet('src');return src?new URL(src,document.baseURI).href:'';},value=>{load();originalSet('src',value);});
  field('currentSrc',()=>audio.src);
  field('currentTime',position,value=>{
   const wasPlaying=!state.paused;pause();state.time=Math.max(0,Number(value)||0);state.ended=false;
   if(wasPlaying)play().catch(()=>{});
  });
  field('duration',()=>state.duration);
  field('paused',()=>state.paused);
  field('ended',()=>state.ended);
  field('readyState',()=>Number.isFinite(state.duration)?4:0);
  field('volume',()=>state.volume,value=>{state.volume=Math.max(0,Math.min(1,Number(value)||0));if(state.gain)gain();});
  field('muted',()=>state.muted,value=>{state.muted=!!value;if(state.gain)gain();});
  field('loop',()=>state.loop,value=>{state.loop=!!value;if(state.node)state.node.loop=state.loop;});
  audio.setAttribute=(name,value)=>{if(name.toLowerCase()==='src')load();originalSet(name,value);};
  audio.load=load;audio.play=play;audio.pause=pause;
  audio.cloneNode=deep=>{const copy=adopt(originalClone(deep));copy.loop=state.loop;return copy;};
  state.output=gain;
  return audio;
 }
 function Audio(src){const audio=new NativeAudio();adopt(audio);if(src)audio.src=src;return audio;}
 function connect(audio,target){
  const state=players.get(audio);if(!state)return false;
  const output=state.output();if(state.route!==target){output.disconnect();output.connect(target);state.route=target;}
  return true;
 }
 function disconnect(audio){const state=players.get(audio);if(state?.gain){state.gain.disconnect();state.route=null;}}
 const api={enabled,Audio:enabled?Audio:NativeAudio,adopt,context,unlock,connect,disconnect,
  status:()=>({enabled,state:ctx?.state||'not-started',unlocked,active:active.size,cachedBytes:bytes,started,lastError})};
 if(enabled){
  for(const event of ['touchend','click','keydown'])window.addEventListener(event,unlock,{capture:true,passive:true});
  window.addEventListener('pageshow',()=>{if(unlocked)unlock();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&unlocked)unlock();});
 }
 return Object.freeze(api);
})();
