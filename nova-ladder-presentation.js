/* Visual presentation only; NovaArt remains the owner of all draws and awards. */
globalThis.NovaLadder=(()=>{
 const eligible=f=>f?.phase==='art'&&['sosuke','giru'].includes(f.zone)&&Array.isArray(f.ladder)&&f.ladder.length>0;
 const values=[50,100,200,300,500,1000,2000,3000],images=new Map();
 let host,root,upper,lower,amount,key='',timer,unlock,locked=false,token=0;
 function init(){if(root)return true;host=document.querySelector('.reels');if(!host)return false;
  root=document.createElement('div');root.className='novaLadderPresentation';root.hidden=true;
  root.innerHTML='<img class="novaLadderAmount" alt=""><div class="novaLadderHalf novaLadderUpper"></div><div class="novaLadderHalf novaLadderLower"></div>';
  host.append(root);amount=root.querySelector('img');upper=root.children[1];lower=root.children[2];
  for(const n of values){const img=new Image();img.src=`assets/ladder/${n}.png`;images.set(String(n),img);}
  return true;
 }
 // Copy computed styles so the inert snapshots do not share live reel classes, IDs or controls.
 function snapshotNode(el){const clone=el.cloneNode(false),style=getComputedStyle(el);
  for(const attr of [...clone.attributes])if(!['src','alt'].includes(attr.name))clone.removeAttribute(attr.name);
  for(const property of style)clone.style.setProperty(property,style.getPropertyValue(property));
  clone.style.animation='none';clone.style.transition='none';clone.style.visibility='visible';
  for(const child of el.childNodes)clone.append(child.nodeType===1?snapshotNode(child):child.cloneNode());
  return clone;
 }
 function snapshot(){
  const scale=host.getBoundingClientRect().width/host.offsetWidth||1,h=host.clientHeight;
  const row=document.createElement('div');row.className='novaLadderSnapshot';row.style.height=h+'px';
  const origin=host.getBoundingClientRect();
  host.querySelectorAll(':scope > .reel').forEach((reel,i)=>{
   const rect=reel.getBoundingClientRect(),clone=snapshotNode(reel),column=document.createElement('div');
   column.className='novaLadderColumn';column.style.cssText=`position:absolute;left:${(rect.left-origin.left)/scale}px;top:${(rect.top-origin.top)/scale}px;width:${rect.width/scale}px;height:${rect.height/scale}px;--ladder-rattle:${[35,41.5,30.5][i]}ms;--ladder-delay:${[0,-15.5,-8.5][i]}ms`;
   clone.style.position='relative';clone.style.inset='auto';clone.style.width='100%';clone.style.height='100%';clone.style.margin='0';column.append(clone);row.append(column);
  });
  upper.replaceChildren(row);lower.replaceChildren(row.cloneNode(true));
 }
 function hide(){token++;clearTimeout(timer);clearTimeout(unlock);locked=false;key='';if(root){root.hidden=true;root.dataset.stage='';host.classList.remove('novaLadderActive');}}
 function open(points,cycle){
  const request=++token;clearTimeout(timer);clearTimeout(unlock);locked=true;
  root.hidden=false;host.classList.add('novaLadderActive');root.dataset.stage='closed';
  const reveal=()=>{if(request!==token)return;let loaded=false,opened=false;
   const release=()=>{if(request===token&&loaded&&opened)locked=false;};
   amount.style.visibility='hidden';amount.onload=()=>{if(request!==token)return;loaded=true;amount.style.visibility='visible';release();};
   amount.onerror=()=>{if(request!==token)return;loaded=true;amount.style.visibility='visible';release();};
   amount.src=`assets/ladder/${points}.png`;amount.alt=`確保 ${points}pt`;root.dataset.stage='open';unlock=setTimeout(()=>{opened=true;release();},420);
  };
  timer=setTimeout(reveal,cycle?230:30);
 }
 function sync(flow,spinning=false){
  if(spinning)return;
  if(!eligible(flow)){hide();return;}
  if(!init())return;
  const next=[flow.zone,flow.ura,flow.ladder.join(','),flow.ladderIndex,flow.ladderRevealed].join(':');
  if(next===key)return;
  const cycle=!!key;key=next;snapshot();open(String(flow.award||flow.ladder[0]),cycle);
 }
 function bet(flow){if(!eligible(flow)){hide();return;}const entering=!root||root.hidden;if(entering)sync(flow,false);if(!root)return;clearTimeout(timer);clearTimeout(unlock);const request=++token;locked=false;
  if(entering){amount.style.visibility='hidden';amount.onload=()=>{if(request===token)amount.style.visibility='visible';};amount.src=`assets/ladder/${flow.award||flow.ladder[0]}.png`;amount.alt=`確保 ${flow.award||flow.ladder[0]}pt`;}
  root.dataset.stage='clamp';
 }
 if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',init);
 return {eligible,sync,bet,hide,get busy(){return locked;}};
})();
