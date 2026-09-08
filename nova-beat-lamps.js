/* Display-only audio analysis. No recording, upload, training or asset rewriting. */
globalThis.NovaBeatLamps=(()=>{
 const links=new WeakMap(),sources=[];
 function detector(){let average=0,last=-Infinity;return (energy,time)=>{const threshold=Math.max(.025,average*1.2);const beat=energy>threshold&&time-last>=340;average=average*.94+energy*.06;if(beat)last=time;return {beat,last};};}
 const bands={sosuke:[40,100],toto:[100,250],urapi:[250,600],giru1:[600,1500],sora1:[1500,4000],ouma1:[4000,10000]};
 function bandEnergy(data,hz,range){const lo=Math.max(1,Math.floor(range[0]/hz)),hi=Math.min(data.length,Math.max(lo+1,Math.ceil(range[1]/hz)));let value=0;for(let i=lo;i<hi;i++)value+=data[i]/255;return value/Math.max(1,hi-lo);}
 function lightLevel(index,head,energy=0){return .18+.64*Math.exp(-(((index-head)/.85)**2))+.18*Math.min(1,energy);}
 const orders=[[0,1,2,3,4,5],[5,4,3,2,1,0],[0,2,4,1,3,5],[5,3,1,4,2,0]];
 function sequence(elapsed){const step=Math.floor(Math.max(0,elapsed)/340)%30;return step<24?{index:orders[Math.floor(step/6)][step%6],all:false}:{index:-1,all:step%2===0};}
 const detect=detector();let frame=0,lastBeat=-Infinity,lastTime=0,travel=0;const averages={};
 function start(){if(!frame)frame=requestAnimationFrame(tick);}
 if(typeof document!=='undefined'&&document.addEventListener){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
 function attach(audio,ctx){try{if(!audio||!ctx)return;if(!links.has(audio)){const analyser=ctx.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.35;const source=ctx.createMediaElementSource(audio);source.connect(analyser);analyser.connect(ctx.destination);const link={audio,ctx,analyser,data:new Uint8Array(analyser.frequencyBinCount)};links.set(audio,link);sources.push(link);}if(ctx.state==='suspended')ctx.resume().catch(()=>{});if(!frame)frame=requestAnimationFrame(tick);}catch{/* Native playback and fixed pulse remain available if attachment fails. */}}
 function tick(time){frame=0;const body=document.body,layer=document.querySelector('.novaArtLayer');if(layer){const active=['art','bonus'].includes(body.dataset.gamePhase);const source=active?sources.find(s=>!s.audio.paused&&!s.audio.ended&&!s.audio.muted&&s.audio.volume>0&&s.ctx.state==='running'):null;let ready=false,hz=0;if(source){source.analyser.getByteFrequencyData(source.data);hz=source.ctx.sampleRate/source.analyser.fftSize;const result=detect(bandEnergy(source.data,hz,[45,220]),time);if(result.beat)lastBeat=time;ready=time-lastBeat<2000;}
 const items=Array.from(layer.querySelectorAll?.('.novaArtItem')||[]).sort((a,b)=>parseFloat(a.style.left)-parseFloat(b.style.left));
 travel=active?travel+Math.min(50,Math.max(0,time-lastTime)):0;lastTime=time;
 const cue=sequence(travel);layer.dataset.musicSequence=String(active);
 items.forEach((item,index)=>{item.style.setProperty('--music-index',String(index));if(active){let accent=0;if(source&&ready){const id=item.dataset.artwork,energy=bandEnergy(source.data,hz,bands[id]||[250,600]);averages[id]=(averages[id]??energy)*.96+energy*.04;accent=Math.min(1,Math.max(0,(energy-averages[id])/Math.max(.03,averages[id])));}item.style.setProperty('--music-lamp-opacity',String(cue.all||cue.index===index?.9+.1*accent:.18));}else item.style.removeProperty('--music-lamp-opacity');});
 layer.dataset.musicBeat=String(!!source&&ready);layer.style.removeProperty('--music-lamp-opacity');}
 frame=requestAnimationFrame(tick);}
 return {attach,detector,bandEnergy,lightLevel,sequence};
})();
