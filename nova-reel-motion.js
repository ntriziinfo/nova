/* One continuous symbol strip for spinning and landing. Original image assets are reused. */
globalThis.NovaReelMotion=(()=>{
 const rotationMs=800;
 const active=new Map(),mod=(n,m)=>(n%m+m)%m;
 function clear(i){const s=active.get(i);if(!s)return;cancelAnimationFrame(s.raf);s.layer.remove();s.win.classList.remove('novaMotionActive');active.delete(i);s.resolve?.(false);}
 function start(i,reel,strip,top,reverse,html){
  clear(i);const win=reel.querySelector('.window'),scale=win.getBoundingClientRect().width/win.offsetWidth||1,h=win.getBoundingClientRect().height/3/(win.getBoundingClientRect().width/win.offsetWidth||1),layer=document.createElement('div');
  layer.className='novaMovingStrip';layer.setAttribute('aria-hidden','true');
  for(let n=0;n<strip.length*3;n++){const cell=document.createElement('div');cell.className='cell';cell.style.height=h+'px';cell.innerHTML=html(strip[n%strip.length]);layer.append(cell);}
  win.append(layer);win.classList.add('novaMotionActive');
  const cellHeight=layer.firstElementChild.getBoundingClientRect().height/scale;
  const s={win,layer,strip,h:cellHeight,stepMs:rotationMs/strip.length,pos:strip.length+mod(top,strip.length),direction:reverse?1:-1,last:performance.now(),raf:0};active.set(i,s);
  function frame(now){if(active.get(i)!==s)return;
   if(s.landing){const t=Math.min(1,(now-s.landing.time)/s.landing.duration);s.pos=s.landing.from+(s.landing.to-s.landing.from)*(1-(1-t)**2);if(t===1){s.layer.style.transform=`translateY(${-s.pos*s.h}px)`;s.raf=0;const resolve=s.resolve;s.resolve=null;resolve(true);return;}}
   else{s.pos=strip.length+mod(s.pos-strip.length+s.direction*(now-s.last)/s.stepMs,strip.length);}
   s.last=now;s.layer.style.transform=`translateY(${-s.pos*s.h}px)`;s.raf=requestAnimationFrame(frame);
  }s.raf=requestAnimationFrame(frame);
 }
 function stop(i,column){const s=active.get(i);if(!s)return Promise.resolve(false);const target=s.strip.findIndex((_,n)=>column.every((v,j)=>s.strip[(n+j)%s.strip.length]===v));
  if(target<0)throw new Error('Stop column is absent from reel strip '+i);
  let distance=s.direction>0?mod(target-mod(s.pos,s.strip.length),s.strip.length):mod(mod(s.pos,s.strip.length)-target,s.strip.length);
  if(distance<.001)distance=0;
  return new Promise(resolve=>{s.resolve=resolve;s.landing={from:s.pos,to:s.pos+s.direction*distance,time:performance.now(),duration:Math.max(140,distance*s.stepMs*2)};});
 }
 return {rotationMs,start,stop,clear,has:i=>active.has(i),top:i=>{const s=active.get(i);return s?mod(Math.round(s.pos),s.strip.length):null;},clearAll:()=>[...active.keys()].forEach(clear)};
})();
