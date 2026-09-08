/* Visual presentation only; NovaArt remains the owner of all draws and awards. */
globalThis.NovaLadder=(()=>{
 const eligible=f=>f?.phase==='art'&&['sosuke','giru'].includes(f.zone)&&Array.isArray(f.ladder)&&f.ladder.length>0;
 const values=[50,100,200,300,500,1000,2000,3000],images=new Map();
 let host,root,upper,lower,amount,key='',timer,unlock,locked=false,token=0;
 function init(){if(root)return true;host=document.getElementById('machine');if(!host)return false;
  root=document.createElement('div');root.className='novaLadderPresentation';root.hidden=true;
  root.innerHTML='<img class="novaLadderAmount" alt=""><img class="novaLadderCharacter" alt=""><img class="novaLadderTargetJoined" alt=""><div class="novaLadderHalf novaLadderUpper"><div class="novaLadderMetal"><img class="novaLadderTarget" alt=""></div></div><div class="novaLadderHalf novaLadderLower"><div class="novaLadderMetal"><img class="novaLadderTarget" alt=""></div></div>';
  host.append(root);amount=root.querySelector('img');upper=root.querySelector('.novaLadderUpper');lower=root.querySelector('.novaLadderLower');
  for(const n of values){const img=new Image();img.src=`assets/ladder/${n}.png`;images.set(String(n),img);}
  return true;
 }
 // Follow the lamp bay above the reels, including cabinet scaling and layout edits.
 function layout(){
  const reels=host.querySelector('.reels'),status=document.getElementById('novaFlowStatus');
  if(!reels)return;
  const base=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=base.width/host.offsetWidth||1;
  const bottom=(r.top-base.top)/scale-5;
  const top=Math.max(status?(status.getBoundingClientRect().bottom-base.top)/scale+4:0,bottom-r.width/scale*.26);
  const height=Math.max(40,bottom-top);
  Object.assign(root.style,{left:(r.left-base.left)/scale+'px',top:top+'px',width:r.width/scale+'px',height:height+'px'});
  host.style.setProperty('--ladder-lamp-lift',-(height+30)+'px');
  host.style.setProperty('--ladder-lamp-top',top+'px');
  const layer=host.querySelector('.novaArtLayer');
  if(layer)host.style.setProperty('--ladder-lamp-bottom',Math.max(0,layer.clientHeight-bottom)+'px');
 }
 function hide(){token++;clearTimeout(timer);clearTimeout(unlock);locked=false;key='';if(root){root.hidden=true;root.dataset.stage='';delete host.dataset.ladderActive;}}
 function open(points,cycle){
  const request=++token;clearTimeout(timer);clearTimeout(unlock);locked=true;
  root.hidden=false;host.dataset.ladderActive='true';root.dataset.stage='closed';
  const reveal=()=>{if(request!==token)return;let loaded=false,opened=false;
   const release=()=>{if(request===token&&loaded&&opened)locked=false;};
   amount.style.visibility='hidden';amount.onload=()=>{if(request!==token)return;loaded=true;amount.style.visibility='visible';release();};
   amount.onerror=()=>{if(request!==token)return;loaded=true;amount.style.visibility='visible';release();};
   amount.src=`assets/ladder/${points}.png`;amount.alt=`確保 ${points}pt`;root.dataset.stage='open';unlock=setTimeout(()=>{opened=true;release();},420);
  };
  timer=setTimeout(reveal,cycle?230:450);
 }
 function sync(flow,spinning=false){
  if(spinning)return;
  if(!eligible(flow)){hide();return;}
  if(!init())return;
  const character=root.querySelector('.novaLadderCharacter');
  const id=flow.zone==='sosuke'?'sosuke':'giru1';
  if(character.dataset.character!==id){character.dataset.character=id;character.src=`assets/illustrations/originals/${id}.png`;}
  character.dataset.ura=String(!!flow.ura);
  const target=flow.ladder[Math.min(flow.ladder.length-1,(flow.ladderIndex||0)+(flow.ladderRevealed?1:0))];
  root.querySelectorAll('.novaLadderTarget,.novaLadderTargetJoined').forEach(img=>{if(img.dataset.pt!==String(target)){img.dataset.pt=String(target);img.src=`assets/ladder/${target}.png`;img.alt=`次の獲得 ${target}pt`;}});
  const next=[flow.zone,flow.ura,flow.ladder.join(','),flow.ladderIndex,flow.ladderRevealed].join(':');
  if(next===key){layout();return;}
  const cycle=!!key;key=next;layout();open(String(flow.award||flow.ladder[0]),cycle);
 }
 function bet(flow){if(!eligible(flow)){hide();return;}const entering=!root||root.hidden;if(entering)sync(flow,false);if(!root)return;clearTimeout(timer);clearTimeout(unlock);const request=++token;locked=false;
  if(entering){amount.style.visibility='hidden';amount.onload=()=>{if(request===token)amount.style.visibility='visible';};amount.src=`assets/ladder/${flow.award||flow.ladder[0]}.png`;amount.alt=`確保 ${flow.award||flow.ladder[0]}pt`;}
  root.dataset.stage='clamp';
 }
 function award(points,started){
  if(!init())return;
  const stage=started?'award':'settled';
  if(root.dataset.stage===stage&&amount.dataset.final===String(points))return;
  token++;clearTimeout(timer);clearTimeout(unlock);locked=false;
  root.hidden=false;host.dataset.ladderActive='true';layout();root.dataset.stage=stage;
  amount.onload=()=>{amount.style.visibility='visible';};
  amount.src=`assets/ladder/${points}.png`;amount.alt=`獲得 ${points}pt`;amount.dataset.final=String(points);amount.style.visibility='visible';
 }
 if(typeof document!=='undefined'){document.addEventListener('DOMContentLoaded',init);window.addEventListener('resize',()=>{if(root&&!root.hidden)layout();});}
 return {eligible,sync,bet,hide,award,get busy(){return locked;}};
})();
