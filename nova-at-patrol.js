/* Visuals for the existing rare-role AT prelude and its third-stop sound. */
globalThis.NovaAtPatrol=(()=>{
  const assets='assets/media/nova/patrol-beacon/';
  let host,off,on,flash,mode='';

  function prepare(){
    if(host)return;
    host=document.getElementById('machine');
    off=new Image();
    off.id='novaPatrolOff';
    off.alt='';
    off.hidden=true;
    off.src=assets+'patrol-off.webp';
    function movie(id,file){
      const video=document.createElement('video');
      video.id=id;
      video.hidden=true;
      video.muted=true;
      video.defaultMuted=true;
      video.loop=true;
      video.playsInline=true;
      video.preload='auto';
      video.setAttribute('aria-hidden','true');
      video.src=assets+file;
      return video;
    }
    on=movie('novaPatrolOn','patrol-on-loop.webm');
    on.poster=off.src;
    flash=movie('novaPatrolFlash','patrol-background-flash.webm');
    host.append(flash,off,on);
  }

  function display(next){
    if(next===mode)return;
    prepare();
    const wasLit=mode==='on';
    mode=next;
    if(mode)host.dataset.atPatrol=mode;
    else delete host.dataset.atPatrol;
    off.hidden=mode!=='off';
    for(const video of [on,flash]){
      video.hidden=mode!=='on';
      if(wasLit)NovaPresentation.stop(video);
      if(mode==='on'){
        video.currentTime=0;
        NovaPresentation.play(video,()=>mode==='on');
      }
    }
  }

  function sync(flow,resolved){
    if(flow?.phase!=='art'||flow.checkpointCountdown||flow.researchChallengeActive){
      display('');
      return;
    }
    const cue=resolved?.atPrelude;
    if(cue?.started){
      // Load during the rare role itself. Reveal only from the following game.
      prepare();
      display('');
    }else if(cue){
      display(cue.confirmed&&resolved.zonePatrolPlayed?'on':'off');
    }else if(!resolved&&mode==='on'&&(flow.entryStage==='seven'||flow.atPrelude?.left===1)){
      // Settlement repaints before and after applying the result. Keep the cue until BET.
      return;
    }else{
      const pending=!resolved&&flow.atPrelude;
      display(pending&&pending.left<pending.total-1?'off':'');
    }
  }

  return Object.freeze({sync,confirm(){display('on');}});
})();
