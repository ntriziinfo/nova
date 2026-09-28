/* Confirmation BGM and effect use separate players, synchronized to media time. */
globalThis.NovaRushConfirm=(()=>{
 const clock=globalThis.NovaClock||globalThis;
 const sources={bgm:'assets/media/nova/rush-confirm-bgm.mp3',se:'assets/media/nova/rush-confirm-se.wav'};
 const preload={};
 for(const [key,src]of Object.entries(sources)){const audio=new Audio(src);audio.preload='auto';audio.loop=false;audio.load();preload[key]=audio;}
 let playing=null,timer=null,token=0,volumes={bgm:0,se:0};
 function updateVolumes(bgm,se){
  volumes={bgm:Math.max(0,Math.min(1,Number(bgm)||0)),se:Math.max(0,Math.min(1,Number(se)||0))};
  if(!playing)return;
  playing.bgm.volume=volumes.bgm*playing.gain;playing.se.volume=volumes.se*playing.gain;
 }
 function reset(notify=false){
  token++;clock.clearInterval(timer);timer=null;
  const old=playing;playing=null;
  if(old)for(const audio of [old.bgm,old.se]){audio.onended=null;audio.onerror=null;audio.ontimeupdate=null;audio.pause();}
  if(old&&notify)window.dispatchEvent(new Event('nova-rush-confirm-ended'));
 }
 function play(bgmVolume,seVolume){
  reset();const generation=token;
  const bgm=preload.bgm.cloneNode(true),se=preload.se.cloneNode(true);
  bgm.loop=false;se.loop=false;
  const state={bgm,se,gain:1,fadeAt:null,sePlayed:false};playing=state;updateVolumes(bgmVolume,seVolume);
  const tick=()=>{
   if(generation!==token||playing!==state)return;
   if(!state.sePlayed&&bgm.currentTime>=3){state.sePlayed=true;se.play().catch(()=>{});}
   if(state.fadeAt!==null){
    state.gain=Math.max(0,1-(performance.now()-state.fadeAt)/3000);updateVolumes(volumes.bgm,volumes.se);
    if(!state.gain)reset(true);
   }
  };
  bgm.ontimeupdate=tick;
  bgm.onended=bgm.onerror=()=>{if(generation===token)reset(true);};
  timer=clock.setInterval(tick,50);
  bgm.play().catch(()=>{if(generation===token)reset(true);});
 }
 function fadeOnBet(){if(playing&&playing.fadeAt===null)playing.fadeAt=performance.now();}
 return {play,fadeOnBet,updateVolumes,reset,get active(){return !!playing;}};
})();
