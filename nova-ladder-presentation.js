/* Visual presentation only; NovaArt remains the owner of all draws and awards. */
globalThis.NovaLadder=(()=>{
 const eligible=f=>f?.phase==='art'&&['sosuke','giru'].includes(f.zone)&&Array.isArray(f.ladder)&&f.ladder.length>0;
 const values=[50,100,200,300,500,1000,2000,3000],images=new Map();
 let host,root,upper,lower,amount,key='',timer,unlock,locked=false,token=0;
 function init(){if(root)return true;host=document.getElementById('machine');if(!host)return false;
  root=document.createElement('div');root.className='novaLadderPresentation';root.hidden=true;
  root.innerHTML='<div class="novaLadderTable"></div><img class="novaLadderAmount" alt=""><img class="novaLadderCharacter" alt=""><div class="novaLadderDoor"><img class="novaLadderIntegrated" alt=""></div>';
  host.append(root);amount=root.querySelector('.novaLadderAmount');upper=root.querySelector('.novaLadderDoor');
  for(const n of values){const img=new Image();img.src=`assets/ladder/${n}.png`;images.set(String(n),img);const shutter=new Image();shutter.src=`assets/ladder/shutter-${n}.png`;images.set(`shutter-${n}`,shutter);}
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
 function hide(){token++;clearTimeout(timer);clearTimeout(unlock);locked=false;key='';if(amount)delete amount.dataset.final;if(root){root.hidden=true;root.dataset.stage='';delete host.dataset.ladderActive;}}
 function open(points,promote=false){
  const request=++token;clearTimeout(timer);clearTimeout(unlock);locked=promote;
  root.hidden=false;host.dataset.ladderActive='true';
  amount.src=`assets/ladder/${points}.png`;amount.alt=`確保 ${points}pt`;amount.style.visibility='visible';
  root.dataset.stage=promote?'promote':'open';
  if(promote)timer=setTimeout(()=>{if(request!==token)return;root.dataset.stage='open';locked=false;},850);
 }
 function sync(flow,spinning=false){
  if(spinning)return;
  if(!eligible(flow)){hide();return;}
  if(!init())return;
  const character=root.querySelector('.novaLadderCharacter');
  const id=flow.zone==='sosuke'?'sosuke':'giru1';
  if(character.dataset.character!==id){character.dataset.character=id;character.src=`assets/illustrations/originals/${id}.png`;}
  character.dataset.ura=String(!!flow.ura);
  const next=[flow.zone,flow.ura,flow.ladder.join(','),flow.ladderIndex,flow.ladderRevealed].join(':');
  if(next===key){layout();return;}
  const promote=!!key&&Number(flow.ladderIndex)>Number(root.dataset.index||0);
  key=next;layout();root.hidden=false;host.dataset.ladderActive='true';
  root.dataset.index=flow.ladderIndex||0;
  const table=root.querySelector('.novaLadderTable');table.replaceChildren();
  flow.ladder.forEach((pt,i)=>{const item=document.createElement('div');item.className='novaLadderTableItem';item.dataset.current=String(i===(flow.ladderIndex||0));const img=new Image();img.src=`assets/ladder/${pt}.png`;img.alt=`${i+1}段階 ${pt}pt`;item.append(img);table.append(item);});
  open(String(flow.award||flow.ladder[0]),promote);
  if(!flow.ladderRevealed||(!promote&&flow.ladderIndex===0))root.dataset.stage='table';
 }
 function bet(flow){
  if(!eligible(flow)){hide();return;}
  if(!root||root.hidden)sync(flow,false);
  if(!root)return;
  token++;clearTimeout(timer);clearTimeout(unlock);locked=false;
  if(!flow.ladderRevealed){root.dataset.stage='table';return;}
  const target=flow.ladder[Math.min(flow.ladder.length-1,(flow.ladderIndex||0)+1)];
  const img=root.querySelector('.novaLadderIntegrated');img.src=`assets/ladder/shutter-${target}.png`;img.alt=`昇格チャレンジ ${target}pt`;
  root.dataset.stage='challenge';
 }
 function award(points,started,promoted=false){
  if(!init())return;
  const stage=started?'award':'settled';
  if(root.dataset.awardStarted===String(!!started)&&amount.dataset.final===String(points))return;
  root.dataset.awardStarted=String(!!started);
  token++;clearTimeout(timer);clearTimeout(unlock);locked=false;
  root.hidden=false;host.dataset.ladderActive='true';layout();root.dataset.stage=stage;
  amount.onload=()=>{amount.style.visibility='visible';};
  amount.src=`assets/ladder/${points}.png`;amount.alt=`獲得 ${points}pt`;amount.dataset.final=String(points);amount.style.visibility='visible';
  if(!started&&promoted){root.dataset.stage='promote';locked=true;const request=token;timer=setTimeout(()=>{if(request!==token)return;root.dataset.stage='settled';locked=false;},850);}
 }
 if(typeof document!=='undefined'){document.addEventListener('DOMContentLoaded',init);window.addEventListener('resize',()=>{if(root&&!root.hidden)layout();});}
 return {eligible,sync,bet,hide,award,get busy(){return locked;}};
})();
