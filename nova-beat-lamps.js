/* Display-only audio analysis. No recording, upload, training or asset rewriting. */
globalThis.NovaBeatLamps=(()=>{
 const links=new WeakMap(),sources=[];
 function detector(){let average=0,last=-Infinity;return (energy,time)=>{const threshold=Math.max(.025,average*1.2);const beat=energy>threshold&&time-last>=340;average=average*.94+energy*.06;if(beat)last=time;return {beat,last};};}
 const detect=detector();let frame=0,lastBeat=-Infinity;
 function attach(audio,ctx){try{if(!audio||!ctx)return;if(!links.has(audio)){const analyser=ctx.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.35;const source=ctx.createMediaElementSource(audio);source.connect(analyser);analyser.connect(ctx.destination);const link={audio,ctx,analyser,data:new Uint8Array(analyser.frequencyBinCount)};links.set(audio,link);sources.push(link);}if(ctx.state==='suspended')ctx.resume().catch(()=>{});if(!frame)frame=requestAnimationFrame(tick);}catch{/* Native playback and fixed pulse remain available if attachment fails. */}}
 function tick(time){frame=0;const body=document.body,layer=document.querySelector('.novaArtLayer');if(layer){const active=['art','bonus'].includes(body.dataset.gamePhase);const source=active?sources.find(s=>!s.audio.paused&&!s.audio.ended&&!s.audio.muted&&s.audio.volume>0&&s.ctx.state==='running'):null;let ready=false;if(source){source.analyser.getByteFrequencyData(source.data);const hz=source.ctx.sampleRate/source.analyser.fftSize,start=Math.max(1,Math.floor(45/hz)),end=Math.max(start+1,Math.ceil(220/hz));let energy=0;for(let i=start;i<end;i++)energy+=source.data[i]/255;const result=detect(energy/(end-start),time);if(result.beat)lastBeat=time;ready=time-lastBeat<2000;}
 layer.dataset.musicBeat=String(!!source&&ready);if(source&&ready)layer.style.setProperty('--music-lamp-opacity',String(.4+.6*Math.exp(-(time-lastBeat)/180)));else layer.style.removeProperty('--music-lamp-opacity');}
 frame=requestAnimationFrame(tick);}
 return {attach,detector};
})();
