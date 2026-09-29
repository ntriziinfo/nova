/* Display-only audio analysis. No recording, upload, training or asset rewriting. */
globalThis.NovaBeatLamps=(()=>{
 const links=new WeakMap(),sources=[];
 function detector(){let average=0,last=-Infinity;return (energy,time)=>{const threshold=Math.max(.025,average*1.2);const beat=energy>threshold&&time-last>=340;average=average*.94+energy*.06;if(beat)last=time;return {beat,last};};}
 const bands={sosuke:[40,100],toto:[100,250],urapi:[250,600],giru1:[600,1500],sora1:[1500,4000],ouma1:[4000,10000]};
 function bandEnergy(data,hz,range){const lo=Math.max(1,Math.floor(range[0]/hz)),hi=Math.min(data.length,Math.max(lo+1,Math.ceil(range[1]/hz)));let value=0;for(let i=lo;i<hi;i++)value+=data[i]/255;return value/Math.max(1,hi-lo);}
 function lightLevel(index,head,energy=0){return .18+.64*Math.exp(-(((index-head)/.85)**2))+.18*Math.min(1,energy);}
 const orderCache=new Map();
 function sequence(elapsed,phase='art',count=6){
  count=Number.isFinite(count)?Math.max(1,Math.floor(count)):6;
  if(!orderCache.has(count)){
   const forward=Array.from({length:count},(_,i)=>i),even=forward.filter(i=>i%2===0),odd=forward.filter(i=>i%2===1),alternating=[...even,...odd];
   orderCache.set(count,{orders:[forward,[...forward].reverse(),alternating,[...alternating].reverse()],even,odd});
  }
  const {orders,even,odd}=orderCache.get(count),position=(Math.max(0,elapsed)/340)%(count*4+18),step=Math.floor(position);
  if(phase==='bonus'&&step<count*2)return {head:position<count?position*(count-1)/count:(count*2-position)*(count-1)/count,index:-1,all:false};
  if(step<count*4)return {index:orders[Math.floor(step/count)][step%count],all:false};
  if(step<count*4+12)return {index:-1,all:false,group:(step-count*4)%4===0?even:(step-count*4)%4===2?odd:[]};
  return {index:-1,all:step%2===0};
 }
 function sequenceLight(index,cue,accent=0){if(Number.isFinite(cue.head))return lightLevel(index,cue.head,accent*.4);return cue.all||cue.index===index||cue.group?.includes(index)?.9+.1*accent:.18;}

 const detect=detector();let frame=0,lastBeat=-Infinity,lastTime=0,travel=0;const averages={};
 function start(){if(!frame)frame=requestAnimationFrame(tick);}
 if(typeof document!=='undefined'&&document.addEventListener){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
 function attach(audio,ctx){try{if(!audio||!ctx)return;if(!links.has(audio)){const analyser=ctx.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.35;if(!globalThis.NovaAudio?.connect(audio,analyser)){const source=ctx.createMediaElementSource(audio);source.connect(analyser);}analyser.connect(ctx.destination);const link={audio,ctx,analyser,data:new Uint8Array(analyser.frequencyBinCount)};links.set(audio,link);sources.push(link);}if(ctx.state==='suspended')ctx.resume().catch(()=>{});if(!frame)frame=requestAnimationFrame(tick);}catch{/* Native playback and fixed pulse remain available if attachment fails. */}}
 function tick(time){frame=0;const body=document.body,layer=document.querySelector('.novaArtLayer');if(layer){const active=['art','bonus'].includes(body.dataset.gamePhase);const source=active?sources.find(s=>!s.audio.paused&&!s.audio.ended&&!s.audio.muted&&s.audio.volume>0&&s.ctx.state==='running'):null;let ready=false,hz=0;if(source){source.analyser.getByteFrequencyData(source.data);hz=source.ctx.sampleRate/source.analyser.fftSize;const result=detect(bandEnergy(source.data,hz,[45,220]),time);if(result.beat)lastBeat=time;ready=time-lastBeat<2000;}
 const items=Array.from(layer.querySelectorAll?.('.novaArtItem')||[]).sort((a,b)=>parseFloat(a.style.left)-parseFloat(b.style.left));
 travel=active?travel+Math.min(50,Math.max(0,time-lastTime)):0;lastTime=time;
 const cue=sequence(travel,body.dataset.gamePhase,items.length||6);layer.dataset.musicSequence=String(active);
 items.forEach((item,index)=>{item.style.setProperty('--music-index',String(index));if(active){let accent=0;if(source&&ready){const id=item.dataset.artwork,energy=bandEnergy(source.data,hz,bands[id]||[250,600]);averages[id]=(averages[id]??energy)*.96+energy*.04;accent=Math.min(1,Math.max(0,(energy-averages[id])/Math.max(.03,averages[id])));}item.style.setProperty('--music-lamp-opacity',String(sequenceLight(index,cue,accent)));}else item.style.removeProperty('--music-lamp-opacity');});
 layer.dataset.musicBeat=String(!!source&&ready);layer.style.removeProperty('--music-lamp-opacity');}
 frame=requestAnimationFrame(tick);}
 return {attach,detector,bandEnergy,lightLevel,sequence,sequenceLight};
})();
