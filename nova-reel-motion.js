/* One continuous symbol strip for spinning and landing. Original image assets are reused. */
globalThis.NovaReelMotion=(()=>{
 const rotationMs=750;
 const active=new Map(),mod=(n,m)=>(n%m+m)%m;
 function clear(i){const s=active.get(i);if(!s)return;cancelAnimationFrame(s.raf);s.layer.remove();s.win.classList.remove('novaMotionActive');active.delete(i);s.resolve?.(false);}
 function start(i,reel,strip,top,reverse,html,sync=null){
  clear(i);const win=reel.querySelector('.window'),scale=win.getBoundingClientRect().width/win.offsetWidth||1,h=win.getBoundingClientRect().height/3/(win.getBoundingClientRect().width/win.offsetWidth||1),layer=document.createElement('div');
  layer.className='novaMovingStrip';layer.setAttribute('aria-hidden','true');
  for(let n=0;n<strip.length*3;n++){const cell=document.createElement('div');cell.className='cell';cell.style.height=h+'px';cell.innerHTML=html(strip[n%strip.length]);layer.append(cell);}
  win.append(layer);win.classList.add('novaMotionActive');
  const cellHeight=layer.firstElementChild.getBoundingClientRect().height/scale;
  const s={win,layer,strip,h:cellHeight,stepMs:rotationMs/strip.length,pos:strip.length+mod(top,strip.length),direction:reverse?1:-1,last:performance.now(),raf:0};active.set(i,s);
  function frame(now){if(active.get(i)!==s)return;
   if(sync){
    const elapsed=Math.min(sync.duration,Math.max(0,sync.clock()*1000));
    s.pos=strip.length+mod(top+s.direction*(sync.steps===undefined?elapsed/s.stepMs:sync.steps*elapsed/sync.duration),strip.length);
    s.layer.style.transform=`translateY(${-s.pos*s.h}px)`;
    if(elapsed>=sync.duration){s.raf=0;sync.done();return;}
   }
   else if(s.landing){const t=Math.min(1,(now-s.landing.time)/s.landing.duration);s.pos=s.landing.from+(s.landing.to-s.landing.from)*t;if(t===1){s.layer.style.transform=`translateY(${-s.pos*s.h}px)`;s.raf=0;const resolve=s.resolve;s.resolve=null;resolve(true);return;}}
   else{s.pos=strip.length+mod(s.pos-strip.length+s.direction*(now-s.last)/s.stepMs,strip.length);}
   s.last=now;s.layer.style.transform=`translateY(${-s.pos*s.h}px)`;s.raf=requestAnimationFrame(frame);
  }s.layer.style.transform=`translateY(${-s.pos*s.h}px)`;s.raf=requestAnimationFrame(frame);
 }
 function startSynced(i,reel,strip,column,reverse,html,clock,duration,done,initialTop){
  const target=strip.findIndex((_,n)=>column.every((v,j)=>strip[(n+j)%strip.length]===v));
  if(target<0)throw new Error('Synced stop absent from strip');
  const direction=reverse?1:-1;
  const syncedRotationMs=reverse?rotationMs/2:rotationMs;
  const top=initialTop===undefined?target-direction*duration/(syncedRotationMs/strip.length):initialTop;
  const distance=mod(direction*(target-top),strip.length);
  const steps=distance+Math.max(0,Math.round((duration/(syncedRotationMs/strip.length)-distance)/strip.length))*strip.length;
  start(i,reel,strip,top,reverse,html,{clock,duration,done,steps});
 }
 function distance(i,column){
  const s=active.get(i);if(!s)return Infinity;
  const pos=mod(s.pos+s.direction*(performance.now()-s.last)/s.stepMs,s.strip.length);
  const ds=s.strip.flatMap((_,n)=>column.every((v,j)=>s.strip[(n+j)%s.strip.length]===v)?[s.direction>0?mod(n-pos,s.strip.length):mod(pos-n,s.strip.length)]:[]);
  return ds.length?Math.min(...ds):Infinity;
 }
 function stop(i,column){
  const s=active.get(i);if(!s)return Promise.resolve(false);
  const now=performance.now();
  s.pos=s.strip.length+mod(s.pos-s.strip.length+s.direction*(now-s.last)/s.stepMs,s.strip.length);s.last=now;
  const distances=s.strip.flatMap((_,n)=>column.every((v,j)=>s.strip[(n+j)%s.strip.length]===v)?[s.direction>0?mod(n-mod(s.pos,s.strip.length),s.strip.length):mod(mod(s.pos,s.strip.length)-n,s.strip.length)]:[]);
  if(!distances.length)throw new Error('Stop column is absent from reel strip '+i);
  const distance=Math.min(...distances);
  if(distance<1e-9){cancelAnimationFrame(s.raf);s.layer.style.transform=`translateY(${-s.pos*s.h}px)`;return Promise.resolve(true);}
  return new Promise(resolve=>{s.resolve=resolve;s.landing={from:s.pos,to:s.pos+s.direction*distance,time:now,duration:distance*s.stepMs};});
 }

 return {rotationMs,startSynced,distance,start,stop,clear,has:i=>active.has(i),top:i=>{const s=active.get(i);return s?mod(Math.round(s.pos),s.strip.length):null;},clearAll:()=>[...active.keys()].forEach(clear)};
})();
