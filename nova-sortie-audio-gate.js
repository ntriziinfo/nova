/* Presentation-only stop gate. No game state, awards, or lottery draws. */
globalThis.NovaSortieAudioGate=(()=>{
 const gates=new WeakMap(),holdMs=4000;
 function begin(spin,playback,onReady){
  if(!spin?.resolved?.sortieEntry||gates.has(spin))return;
  const gate={locked:true,timer:null,loadTimer:null};gates.set(spin,gate);
  const audio=playback?.audio;
  const clean=()=>{clearTimeout(gate.loadTimer);audio?.removeEventListener('playing',started);audio?.removeEventListener('error',started);};
  function started(){
   if(gate.timer!==null)return;
   clean();
   gate.timer=setTimeout(()=>{gate.locked=false;onReady?.();},holdMs);
  }
  audio?.addEventListener('playing',started,{once:true});
  audio?.addEventListener('error',started,{once:true});
  // Muting retains the same wait. A blocked/missing sound cannot strand a reel.
  gate.loadTimer=setTimeout(started,10000);
  if(playback?.promise)Promise.resolve(playback.promise).then(started,started);
  else started();
 }
 function locked(spin){return !!(spin&&gates.get(spin)?.locked);}
 return Object.freeze({begin,locked,holdMs});
})();
