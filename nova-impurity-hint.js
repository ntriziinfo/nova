/* Presentation only. No automatic triggers, gameplay RNG, or state writes. */
globalThis.NovaImpurityHint=(()=>{
 const presets={large:'#ff243d',medium:'#30ff64',small:'#3299ff'};
 let root=null,image=null,timer=null,level='',pending='';
 function layout(){
  if(!root||root.hidden)return;
  let box;
  if(level==='large'){
   // Cabinet display interior: character lamps + reels, excluding lower counters.
   // The transformed machine rectangle also follows display-group scale/position.
   const machine=document.querySelector('#machine');
   if(!machine){hide();return;}
   const rect=machine.getBoundingClientRect();
   box={left:rect.left+rect.width*.198,top:rect.top+rect.height*.298,width:rect.width*.604,height:rect.height*.264};
  }
  else {
   const target=document.querySelector(level==='medium'?'.reels':'.reel[data-reel="1"] .window');
   if(!target){hide();return;}
   box=target.getBoundingClientRect();
   if(level==='small')box={left:box.left+box.width*.15,top:box.top+box.height*.2,width:box.width*.7,height:box.height*.6};
  }
  Object.assign(root.style,{left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});
 }
 function hide(){clearTimeout(timer);timer=null;if(root)root.hidden=true;}
 function show(size,{duration=3000}={}){
  if(!presets[size])return false;
  hide();level=size;
  if(!root){
   root=document.createElement('div');root.id='novaImpurityHint';root.setAttribute('aria-hidden','true');
   image=document.createElement('img');image.src='assets/ui/impurity-head-20261028.png';image.alt='';image.draggable=false;
   root.append(image);document.body.append(root);
   addEventListener('resize',layout);addEventListener('scroll',layout,true);
  }
  root.dataset.level=size;root.style.setProperty('--impurity-glow',presets[size]);root.hidden=false;layout();
  if(duration>0)timer=setTimeout(hide,duration);
  return !root.hidden;
 }
 function mountDebug(panel){
  const controls=document.createElement('div');controls.className='novaImpurityPreview';
  const label=document.createElement('p');label.textContent='穢れ示唆・表示プレビュー（3秒／抽選への接続なし）';controls.append(label);
  for(const [size,text] of [['large','大・赤'],['medium','中・緑'],['small','小・青']]){
   const button=document.createElement('button');button.type='button';button.textContent=text;button.onclick=()=>show(size);controls.append(button);
  }
  const stop=document.createElement('button');stop.type='button';stop.textContent='表示を消す';stop.onclick=hide;controls.append(stop);panel.append(controls);
 }
 function arm(size){pending=presets[size]?size:'';}
 function onBet(){const size=pending;pending='';if(size)show(size);}
 return {show,hide,mountDebug,arm,onBet};
})();
