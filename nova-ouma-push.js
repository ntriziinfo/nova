// Presentation gate only. The engine has already drawn the freeze result.
globalThis.NovaOumaPush=(()=>{
 let pending=null,timer=null;
 function reset(){
  pending=null;
  if(timer!==null){clearTimeout(timer);timer=null;}
  const button=document.getElementById('novaOumaPush');
  if(button){button.onclick=null;button.hidden=true;button.disabled=true;}
 }
 function autoPress(){
  const offer=pending;
  if(!offer)return false;
  if(!offer.valid())return false;
  if(!offer.auto())return false;
  if(timer===null){
   const ownTimer=setTimeout(()=>{
    if(timer!==ownTimer)return;
    timer=null;
    if(pending===offer&&offer.auto())offer.accept();
   },1000);
   timer=ownTimer;
  }
  return true;
 }
 function show({valid,auto,onOffer,reveal,won,probability}){
  reset();
  if(!valid())return;
  let button=document.getElementById('novaOumaPush');
  if(!button){
   button=document.createElement('button');button.id='novaOumaPush';
   button.type='button';button.textContent='PUSH';
   button.setAttribute('aria-label','PUSHでフリーズ継続を告知');
   document.querySelector('.novaPushLayer').append(button);
  }
  const offer=pending={valid,auto,accept:()=>{
   if(pending!==offer)return;
   if(!valid())return;
   reset();reveal();
  }};
  // Browser entropy is presentation-only: never consume the game RNG.
  const seed=globalThis.crypto?.getRandomValues(new Uint32Array(1))[0];
  const cue=NovaCzPresentation.pushCue({won,probability,seed});
  button.className=cue.variant;button.disabled=false;button.hidden=false;
  button.onclick=offer.accept;
  onOffer(cue);
  autoPress();
 }
 return {show,reset,autoPress,get busy(){return pending!==null;}};
})();
