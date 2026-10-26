/* Sortie reel presentation only. The engine's role, payout and stock draw stay intact. */
globalThis.NovaSortie=(()=>{
 const {requestAnimationFrame,cancelAnimationFrame}=globalThis.NovaFrameClock||globalThis;
 const order=Object.freeze([2,1,0]);
 const characters={sosuke:['sosuke','宗介'],toto:['toto','とと'],urapi:['urapi','うらぴ'],giru:['giru1','ギル'],sora:['sora1','空'],ouma:['ouma1','逢魔'],nito:['nito','にと'],kushuri:['kushuri','くしゅり']};
 const candidates=['sosuke','toto','urapi','giru','sora','ouma','kushuri_nito'];
 const previews=new WeakMap();
 let root,host,reveal,portraits,caption,actors=[],animation=null,revealSpin=null,revealStage=-1;
 let soundPlayer=null,awardSound=null,duoSound=null,awardFrame=0,removeSoundListeners=null;
 let holdUntil=0,holdTimer=null,holdToken=0;
 const waitMs=()=>Math.max(0,Math.ceil(holdUntil-performance.now()));
 function clearHold(){
  ++holdToken;holdUntil=0;
  if(holdTimer!==null){NovaClock.clearTimeout(holdTimer);holdTimer=null;}
 }
 function holdAward(){
  clearHold();holdUntil=performance.now()+4000;
  const token=holdToken;
  const release=()=>{
   if(token!==holdToken)return;
   if(waitMs()>0){holdTimer=NovaClock.setTimeout(release,waitMs());return;}
   holdTimer=null;holdUntil=0;
   window.dispatchEvent(new Event('nova-sortie-unlocked'));
  };
  holdTimer=NovaClock.setTimeout(release,4000);
 }
 const awardSoundSrc='assets/media/nova/sortie-award.mp3';
 // 10 ms RMS envelope of the supplied original; read against the actual audio clock.
 const awardEnvelope=[
  255,255,254,255,253,248,253,228,125,78,205,255,254,255,253,248,253,230,129,78,204,251,245,252,255,255,255,255,255,253,248,247,
  243,240,249,252,248,252,252,254,251,243,246,241,249,248,245,245,239,233,240,244,251,248,241,237,240,242,242,239,241,234,243,244,
  240,235,240,241,244,243,235,242,245,242,241,238,236,229,227,242,242,241,243,243,243,247,244,232,232,235,226,225,234,231,220,223,
  227,227,231,236,228,224,218,218,221,212,206,209,223,228,223,216,223,219,211,225,226,220,215,216,219,225,219,212,213,217,210,204,
  213,221,216,216,214,216,212,210,208,210,216,211,203,202,204,203,202,204,199,195,193,193,195,196,192,193,194,189,175,169,176,178,
  180,190,196,191,186,182,173,166,166,164,162,169,185,188,185,184,179,169,165,163,162,167,177,180,180,180,178,172,165,166,165,167,
  172,177,179,178,177,175,170,169,170,172,173,173,175,174,175,174,172,173,176,185,189,185,172,171,180,186,183,174,170,171,174,176,
  174,173,173,174,178,179,171,171,181,185,184,177,173,168,165,166,173,179,178,175,174,178,179,174,167,166,170,171,173,180,182,178,
  173,170,167,163,164,168,173,177,181,183,179,168,164,166,168,174,169,168,172,173,174,169,168,177,181,180,175,172,176,181,183,181,
  176,174,169,167,169,181,186,186,185,187,187,184,186,189,188,184,181,182,183,181,175,171,169,172,173,168,170,175,181,184,184,178,
  175,172,170,169,166,170,176,182,184,186,182,178,172,173,173,173,175,178,180,178,171,166,165,164,167,172,176,177,179,172,126,51,
  28,24,23,21,20,22,28,32,36,39,39,32,25,22,18,18,18,18,19,19,20,20,20,18,10,5,4,4,4,4,5,5,
  5,5,4,4,4,4,4,5,6,7,7,7,5,4,4,3,3,3,3,3,3,4,4,4,3,1,1,1,1,1,1,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0
 ];
 function awardScale(time){
  const pos=Math.max(0,Number(time)||0)*100,i=Math.min(awardEnvelope.length-1,Math.floor(pos)),next=Math.min(i+1,awardEnvelope.length-1);
  return .8+.2*(awardEnvelope[i]+(awardEnvelope[next]-awardEnvelope[i])*(pos-Math.floor(pos)))/255;
 }
 function stopAward(){
  if(awardFrame){globalThis.cancelAnimationFrame?.(awardFrame);awardFrame=0;}
  removeSoundListeners?.();removeSoundListeners=null;
  const audio=awardSound;awardSound=null;
  if(audio){audio.loop=false;audio.pause();try{audio.currentTime=0;}catch{}}
  portraits?.style.setProperty('--sortie-win-scale','1');
 }
 function startAward(reduced,zone){
  // The duo cue accompanies the common win SE; it must not replace it.
  if(baseZone(zone)==='kushuri_nito')try{
   const playback=soundPlayer?.('assets/media/nova/sortie-award-duo.wav');
   duoSound=playback?.audio||null;if(duoSound)duoSound.loop=false;
   Promise.resolve(playback?.promise).catch(()=>{});
  }catch{}
  try{
   const playback=soundPlayer?.(awardSoundSrc),audio=playback?.audio;if(!audio)return;
   awardSound=audio;audio.loop=false;
   const onFinish=()=>{if(awardSound===audio)stopAward();};
   audio.addEventListener('error',onFinish);audio.addEventListener('ended',onFinish);
   removeSoundListeners=()=>{audio.removeEventListener('error',onFinish);audio.removeEventListener('ended',onFinish);};
   const tick=()=>{
    if(awardSound!==audio)return;
    if(!audio.paused&&audio.readyState>=2)portraits.style.setProperty('--sortie-win-scale',String(awardScale(audio.currentTime)));
    awardFrame=requestAnimationFrame(tick);
   };
   if(!reduced)tick();
   Promise.resolve(playback.promise).catch(onFinish);
  }catch{stopAward();}
 }
 const eligible=spin=>!!spin?.resolved?.researchSortie;
 // Translate legacy engine/save labels only at the presentation boundary.
 const label=text=>String(text||'').replace(/ノヴァ出陣(?:ゾーン|チャンス|チャレンジ)?|出陣ゾーン|出陣チャンス/g,'出陣チャレンジ');
 const baseZone=zone=>String(zone||'').replace(/^(ura_|normal_)/,'');
 function previewZone(spin){
  const event=spin?.resolved?.researchSortie;if(!event)return '';
  if(event.won)return candidates.includes(baseZone(event.zone))?event.zone:'';
  // A losing game still teases a character. This visual draw never uses the game's RNG.
  if(!previews.has(spin))previews.set(spin,candidates[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296*candidates.length)]);
  return previews.get(spin);
 }
 function target(spin,index,strips){
  if(!eligible(spin))return null;
  const presses=spin.auditPressOrder||[];
  // Middle-first may stop the left reel second, before the final reveal.
  const canAlign=!!spin.resolved.researchSortie.won&&(presses[0]===1||presses.length===3&&order.every((n,i)=>presses[i]===n));
  const aligned=canAlign&&presses.length===3;
  const strip=strips[index],legacy=strip.indexOf(`NOVA_${index}_0`),bar=strip.indexOf("BAR"),top=legacy>=0?legacy:bar-1;
  if(legacy<0&&bar<0)throw Error('Missing sortie BAR column');
  const windowAt=n=>[0,1,2].map(row=>strip[((n+row)%strip.length+strip.length)%strip.length]);
  const shift=index===0&&!canAlign;
  return {aligned,column:windowAt(top-(shift?1:0))};
 }
 function init(){
  if(root)return true;
  host=document.getElementById('machine');if(!host)return false;
  root=document.createElement('div');root.id='novaSortieGuide';root.hidden=true;root.setAttribute('role','status');
  const title=document.createElement('strong');title.textContent='逆押しでノヴァを狙え';root.append(title);
  for(const [i,name]of ['左','中','右'].entries()){const cell=document.createElement('span');cell.dataset.reel=String(i);cell.textContent=`${3-i} ${name}`;root.append(cell);}
  reveal=document.createElement('div');reveal.id='novaSortieCharacter';reveal.hidden=true;reveal.setAttribute('aria-hidden','true');
  portraits=document.createElement('div');portraits.className='novaSortiePortraits';
  for(const [id,[file,name]] of Object.entries(characters)){
   const img=document.createElement('img');img.dataset.character=id;img.alt=name;img.draggable=false;img.hidden=true;
   img.src=`assets/illustrations/lamps-${['nito','kushuri'].includes(id)?'20260928':'20260916'}/${file}.png`;
   portraits.append(img);actors.push(img);
  }
  caption=document.createElement('strong');reveal.append(portraits,caption);host.append(root,reveal);return true;
 }
 function layout(){
  if(!root||root.hidden)return;
  const reels=host.querySelector('.reels'),base=host.getBoundingClientRect(),r=reels.getBoundingClientRect(),scale=base.width/host.offsetWidth||1;
  const w=r.width/scale,h=w*.11;
  Object.assign(root.style,{left:(r.left-base.left)/scale+'px',top:(r.top-base.top)/scale-h-3+'px',width:w+'px',height:h+'px',fontSize:w*.026+'px'});
  if(reveal&&!reveal.hidden)Object.assign(reveal.style,{left:(r.left-base.left)/scale+'px',top:(r.top-base.top)/scale+'px',width:w+'px',height:r.height/scale+'px',fontSize:w*.038+'px'});
 }
 function revealCharacter(spin,stage){
  if(revealSpin===spin&&revealStage===stage)return;
  stopAward();
  animation?.cancel();animation=null;revealSpin=spin;revealStage=stage;
  const event=spin.resolved.researchSortie;
  // The final reveal follows the internal stock award, even if NOVA was not aligned manually.
  if(stage===3&&!event.won){reveal.hidden=true;return;}
  const zone=previewZone(spin),base=baseZone(zone);if(!zone){reveal.hidden=true;return;}
  const pair=base==='kushuri_nito',ids=pair?['nito','kushuri']:[base];
  for(const img of actors)img.hidden=!ids.includes(img.dataset.character);
  reveal.dataset.stage=String(stage);reveal.dataset.confirmed=String(stage===3);reveal.dataset.pair=String(pair);reveal.dataset.zone=zone;
  caption.textContent=stage===3?(zone.startsWith('ura_')?'裏':'')+(pair?'くしゅり＆にと':characters[base][1])+'ゾーン獲得！':'';
  reveal.hidden=false;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  animation=reveal.animate(stage===3?[{opacity:0},{opacity:1}]:[{opacity:0,offset:0},{opacity:.85,offset:.2},{opacity:.85,offset:.5},{opacity:0,offset:1}],{duration:stage===3?(reduced?1:220):520,easing:'ease-in-out'});
  if(stage===3){holdAward();startAward(reduced,spin.resolved?.researchSortie?.zone);}
 }
 function render(spin){
  if(!eligible(spin)||!init())return;
  root.hidden=false;
  const stopped=spin.stopped||[],next=order.find(i=>!stopped[i]);
  if(stopped.length===3&&stopped.every(Boolean)&&spin.resolved.researchSortie.won)flash(spin.resolved.researchSortie.zone);
  root.firstChild.textContent=stopped.every(Boolean)?(spin.resolved.researchSortie.won?'特化ゾーン獲得！':'ノヴァ不揃い'):'逆押しでノヴァを狙え';
  for(const cell of root.querySelectorAll('[data-reel]')){const i=Number(cell.dataset.reel);cell.dataset.stopped=String(!!stopped[i]);cell.dataset.next=String(i===next);}
  for(const reel of host.querySelectorAll('.reel')){const i=Number(reel.dataset.reel);reel.classList.toggle('sortieStopped',!!stopped[i]);reel.style.setProperty('--ouma-rattle-speed',[35,41.5,30.5][i]+'ms');reel.style.setProperty('--ouma-rattle-delay',[0,-15.5,-8.5][i]+'ms');}
  revealCharacter(spin,stopped.filter(Boolean).length);
  layout();
 }
 function clear(){
  clearHold();
  stopAward();
  if(duoSound){duoSound.loop=false;duoSound.pause();try{duoSound.currentTime=0;}catch{}duoSound=null;}
  if(root)root.hidden=true;
  animation?.cancel();animation=null;revealSpin=null;revealStage=-1;
  if(reveal)reveal.hidden=true;
  if(typeof document!=='undefined')document.querySelectorAll('.reel.sortieStopped').forEach(reel=>reel.classList.remove('sortieStopped'));
  flash('');
 }
 function flash(zone){
  if(typeof document==='undefined')return;
  const base=String(zone||'').replace(/^(ura_|normal_)/,''),artwork={giru:'giru1',sora:'sora1',ouma:'ouma1'},id=artwork[base]||base;
  document.querySelectorAll('.novaArtItem').forEach(lamp=>{lamp.dataset.sortieWon=String(lamp.dataset.artwork===id||(id==='kushuri_nito'&&['kushuri','nito'].includes(lamp.dataset.artwork)));});
 }
 function begin(spin){clear();render(spin);}
 if(typeof window!=='undefined')window.addEventListener('resize',layout);
 return {eligible,label,target,begin,stop:render,clear,flash,awardScale,
  get busy(){return waitMs()>0;},get waitMs(){return waitMs();},
  setSoundPlayer:player=>{soundPlayer=player;},
  updateVolume:volume=>{for(const audio of [awardSound,duoSound])if(audio)audio.volume=Math.max(0,Math.min(1,Number(volume)||0));}
 };
})();
