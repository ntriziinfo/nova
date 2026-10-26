/* Bell navigation presentation. Role draws and payouts stay in the game engines. */
globalThis.NovaBellNavi=(()=>{
 const orders=Object.freeze([[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]].map(Object.freeze));
 const defaults=Object.freeze({x:.5,y:44.3,w:100,h:7.9,gap:0});
 const asset='assets/design/nova-navi-v1/navi-yellow-123.png';
 const rareRoles=Object.freeze({WEAK_SUICA:['green',0],STRONG_SUICA:['green',1],CHANCE_A:['purple',0],CHANCE_B:['purple',1],WEAK_NOVA:['red',0],STRONG_NOVA:['red',1],SUPER_NOVA:['red',2]});
 const rareAsset=signal=>'assets/design/nova-navi-alert-v1/navi-'+signal.color+'-'+(signal.mark==='!!'?'double':'single')+'.png';
 let host,root,items=[],active=null,previewing=false;
 function available(spin){
  const r=spin?.resolved,f=r?.flowBefore;
  return !!(f?.phase==='art'&&!spin.aTypeBonusActiveAtStart&&!r.bonusPendingAtStart&&!r.zoneSpin&&!r.comebackEvent&&!r.burstEvent&&!f.zone&&!f.entryStage&&!f.initialStage&&!f.comebackLeft&&!f.comebackConfirmed&&!f.burstLeft&&!f.burstPending);
 }
 function eligible(spin){
  const r=spin?.resolved;
  const normal=r?.normalBellNavi&&r.flowBefore?.phase==='normal'&&!spin.aTypeBonusActiveAtStart&&!r.bonusPendingAtStart&&!r.zoneSpin;
  return ['BELL','BELL15'].includes(spin?.result)&&!!(normal||available(spin));
 }
 // Presentation-only randomness must not shift the game's lottery sequence.
 function cueRandom(){return globalThis.crypto?.getRandomValues?globalThis.crypto.getRandomValues(new Uint32Array(1))[0]/4294967296:1;}
 function drawRareNavi(spin,rng=Math.random,cueRng=cueRandom){
  const role=rareRoles[spin?.result];if(!role||!available(spin))return null;
  const [color,strength]=role;
  const double= strength===2||strength===1&&rng()<.5;
  if((color==='green'||color==='red')&&spin.resolved.atOutcome?.zone&&cueRng()<.2)
   return {color:color==='green'?'red':'green',mark:'!'};
  return {color,mark:double&&confirmed(spin)?'!!':'!'};
 }
 function confirmed(spin){
  const r=spin?.resolved;
  return !!(Number(r?.atOutcome?.direct)>0||r?.atOutcome?.zone||r?.sortieWon||r?.internalBonus);
 }
 function leftFirstAllowed(spin){
  const r=spin?.resolved;
  if(r?.flowBefore?.phase==='art')return confirmed(spin)||!!r.flowAfter?.atPrelude?.zones?.length||!!r.atPrelude?.confirmed;
  if(r?.flowBefore?.phase!=='normal')return false;
  if(r.internalBonus||r.bonusPendingAtStart)return false;
  const prelude=r.normalInternal?.prelude;
  return ['cz','strong_cz'].includes(r.flowAfter?.phase)||!!r.czPrelude?.enter||!!r.czPrelude?.announce||
    !!(prelude&&['cz','ceilingCz'].includes(prelude.kind));
 }
 function drawOrder(rng=Math.random,spin){
  const pool=spin&&!leftFirstAllowed(spin)?orders.slice(2):orders;
  return pool[Math.min(pool.length-1,Math.max(0,Math.floor(rng()*pool.length)))].slice();
 }
 function stopOrder(spin){if(spin?.resolved?.sortieEntry)return [1,2,0];return spin?.resolved?.researchSortie||spin?.resolved?.stockEntry||spin?.resolved?.researchChallenge?.priorAim||spin?.resolved?.zoneSpin&&['ouma','urapi'].includes(String((spin.resolved.zoneStartFlow||spin.resolved.flowBefore)?.zone||'').replace(/^ura_/,''))||spin?.resolved?.aim||spin?.resolved?.bonusPendingAtStart&&spin?.resolved?.bonusReady&&!spin?.resolved?.bonusWaitSpin?[2,1,0]:spin?.bellNaviOrder?.slice()||(spin?.resolved?.aim||spin?.zoneActiveAtStart?[2,1,0]:[0,1,2]);}
 function init(){
  if(root)return true;
  host=document.getElementById('machine');if(!host)return false;
  root=document.createElement('div');root.id='novaBellNavi';root.className='novaBellNavi';root.hidden=true;
  root.setAttribute('role','group');root.setAttribute('aria-label','ベル押し順ナビ');
  items=[0,1,2].map(i=>{
   const item=document.createElement('div');item.className='novaBellNaviItem';item.dataset.reel=String(i);
   const img=new Image();img.hidden=true;img.alt='';img.draggable=false;item.append(img);
   const symbol=new Image();symbol.className='novaBellNaviSymbol';symbol.hidden=true;symbol.draggable=false;item.append(symbol);
   root.append(item);return item;
  });
  host.append(root);
  if(!globalThis.NovaMedia?.compact){
   const bellPreload=new Image();bellPreload.src=asset;
   for(const color of ['green','purple','red'])for(const mark of ['!','!!']){const preload=new Image();preload.src=rareAsset({color,mark});}
  }
  if(typeof ResizeObserver!=='undefined'){
   const observer=new ResizeObserver(layout);observer.observe(host);
   const reels=host.querySelector('.reels');if(reels)observer.observe(reels);
  }
  return true;
 }
 function layout(){
  if(!init())return;
  const reels=host.querySelector('.reels');if(!reels)return;
  const base=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=base.width/host.offsetWidth||1;
  const width=r.width/scale,css=getComputedStyle(document.documentElement),cfg={};
  for(const key of Object.keys(defaults)){const n=parseFloat(css.getPropertyValue('--layout-navi-'+key));cfg[key]=Number.isFinite(n)?n:defaults[key];}
  const h=width*cfg.h/100;
  Object.assign(root.style,{left:(r.left-base.left)/scale+width*cfg.x/100+'px',top:(r.top-base.top)/scale-h-2+width*cfg.y/100+'px',width:width*cfg.w/100+'px',height:h+'px',gap:cfg.gap+'%'});
 }
 function render(){
  if(!init())return;
  // Also hide saved cues on resume; comeback reveals the role only on the reels.
  // Retain the existing visual draws in begin(); sortie owns the visible guide.
  if(active?.resolved?.researchSortie||active?.resolved?.comebackEvent||active?.resolved?.flowBefore?.comebackLeft){root.hidden=true;return;}
  const savedSignal=active?.rareNavi;
  const signal=savedSignal?.mark==='!!'&&!confirmed(active)?{...savedSignal,mark:'!'}:savedSignal,order=active?.bellNaviOrder||(!active&&previewing?[0,1,2]:null),stopped=active?.stopped||[];
  root.hidden=(!order&&!signal)||!!(active&&stopped.every(Boolean));
  root.dataset.preview=String(!active&&previewing);
  root.dataset.kind=signal?'rare':'bell';root.dataset.color=signal?.color||'yellow';
  const signalLabel=signal?({green:'スイカ',purple:'チャンス目',red:'ノヴァ目'}[signal.color]+'対応 '+signal.mark):'';
  root.setAttribute('aria-label',signalLabel||'ベル押し順ナビ');
  if(root.hidden)return;
  const next=order?.find(i=>!stopped[i]);
  items.forEach((item,i)=>{
   const number=order?order.indexOf(i)+1:0;
   if(signal){delete item.dataset.number;item.dataset.mark=signal.mark;}else{item.dataset.number=String(number);delete item.dataset.mark;}
   item.dataset.stopped=String(!!stopped[i]);item.dataset.next=String(!signal&&i===next);
   item.setAttribute('aria-label',['左','中','右'][i]+'リール '+(signal?signalLabel:number+'番目')+(stopped[i]?' 停止済み':''));
   const src=signal?rareAsset(signal):asset;setSprite(item.firstChild,src);
   item.firstChild.style.left=-(signal?i:number-1)*100+'%';
   const symbol=item.lastChild;symbol.hidden=active?.result!=='BELL15'||!!signal;
   if(!symbol.hidden){symbol.src='assets/symbols/gang-v3/bell.png';symbol.alt='ベル';}
  });
  layout();
 }
 // Changing img.src can retain the previous decoded bitmap until the new image
 // finishes loading. Hide it first and only reveal the latest decoded request.
 function setSprite(img,src){
  if(img.getAttribute('src')===src)return;
  img.hidden=true;const request=(img.naviRequest||0)+1;img.naviRequest=request;
  const ready=()=>{if(img.naviRequest===request&&img.getAttribute('src')===src&&img.complete&&img.naturalWidth>0)img.hidden=false;};
  img.onload=()=>{if(typeof img.decode==='function')img.decode().then(ready).catch(()=>{});else ready();};
  img.onerror=()=>{if(img.naviRequest===request)img.hidden=true;};
  img.src=src;
  if(img.complete&&img.naturalWidth>0)img.onload();
 }
 function begin(spin,rng=Math.random){
  spin.bellNaviOrder=eligible(spin)?drawOrder(rng,spin):null;
  spin.rareNavi=drawRareNavi(spin,rng);
  // The caller uses the returned numbered order to trigger the bell BET sound.
  active=spin;render();return spin.bellNaviOrder;
 }
 function stop(spin){if(active===spin)render();}
 function restore(spin){active=spin;render();}
 function clear(){active=null;render();}
 function preview(on){previewing=!!on;render();}
 if(typeof document!=='undefined'){
  document.addEventListener('DOMContentLoaded',init);
  window.addEventListener('resize',layout);
 }
 return {defaults,eligible,drawRareNavi,drawOrder,stopOrder,begin,restore,stop,clear,preview,layout};
})();
