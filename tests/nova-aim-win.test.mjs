import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){
 const elements=[],timers=new Map(),listeners={};let id=0;
 const host={dataset:{},append(){},querySelector(){return null;}};
 const context=vm.createContext({document:{hidden:false,getElementById:()=>host,addEventListener(name,fn){listeners[name]=fn;},createElement(tag){const e={tag,currentTime:0,style:{},dataset:{},append(){},setAttribute(){},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};elements.push(e);return e;}},window:{addEventListener(){},dispatchEvent(){}},Event:class{},setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);}});
 vm.runInContext(fs.readFileSync('nova-aim-presentation.js','utf8'),context);
 return {aim:context.NovaAim,elements,timers,hide(){context.document.hidden=true;listeners.visibilitychange();}};
}
test('win locks from playback for 3 seconds, plays once and defers result',()=>{
 const {aim,elements,timers}=setup();let sounds=0,results=0;
 aim.win(()=>sounds++);assert.equal(aim.busy,true);assert.equal(sounds,0);
 const video=elements.at(-1);assert.equal(video.loop,false);assert.equal(video.muted,true);
 const start=video.onplaying;start();start();assert.equal(sounds,1);
 aim.afterWin(()=>results++);assert.equal(results,0);
 const timer=[...timers.values()][0];assert.equal(timer.ms,3000);timer.fn();
 assert.equal(aim.busy,false);assert.equal(results,1);
 aim.bet(null);assert.equal(video.paused,true);assert.equal(sounds,1);
});
test('reset cancels pending playback and result callbacks',()=>{
 const {aim,elements,timers}=setup();let sounds=0,results=0;
 aim.win(()=>sounds++);const start=elements.at(-1).onplaying;start();
 aim.afterWin(()=>results++);const timer=[...timers.values()][0];aim.reset();timer.fn();start();
 assert.equal(aim.busy,false);assert.equal(results,0);assert.equal(sounds,1);
});

test('delayed voice starts two seconds after video playback, once, and reset cancels it',()=>{
 const t=setup();let sounds=0,voices=0;
 t.aim.win(()=>sounds++,'nebula',{},()=>voices++);
 assert.equal(t.timers.size,0);assert.equal(voices,0);
 const video=t.elements.find(e=>e.src==='assets/media/nova/aim/nebula-win.mp4'),start=video.onplaying;
 start();start();assert.equal(sounds,1);
 const voiceTimers=[...t.timers.values()].filter(timer=>timer.ms===2000);
 assert.equal(voiceTimers.length,1);assert.equal(voices,0);assert.equal(t.aim.busy,true);
 voiceTimers[0].fn();assert.equal(voices,1);assert.equal(t.aim.busy,true);
 [...t.timers.values()].find(timer=>timer.ms===3000).fn();assert.equal(t.aim.busy,false);
 t.aim.win(()=>{},'nebula',{},()=>voices++);video.onplaying();
 const pending=[...t.timers.values()].filter(timer=>timer.ms===2000).at(-1);t.aim.reset();pending.fn();assert.equal(voices,1);
});

test('hidden playback schedules the delayed voice; a newer win invalidates the old voice',()=>{
 const t=setup();let voices=0;t.hide();
 t.aim.win(()=>{},'nebula',{},()=>voices++);
 const old=[...t.timers.values()].find(timer=>timer.ms===2000);
 assert.ok(old);assert.equal(voices,0);
 t.aim.win(()=>{},'seven');old.fn();assert.equal(voices,0);
});

test('hidden seven and nebula wins keep the full lock without waiting for video playback',()=>{
 for(const symbol of ['seven','nebula'])for(const hiddenBefore of [true,false]){
  const t=setup();let sounds=0,results=0;if(hiddenBefore)t.hide();
  t.aim.win(()=>sounds++,symbol);t.aim.afterWin(()=>results++);
  if(!hiddenBefore){assert.equal(sounds,0);t.hide();}
  assert.equal(sounds,1);assert.equal(results,0);assert.equal(t.aim.busy,true);
  const timer=[...t.timers.values()][0];assert.equal(timer.ms,3000);timer.fn();
  assert.equal(t.aim.busy,false);assert.equal(results,1);t.hide();assert.equal(sounds,1);
 }
});
test('reset while waiting for visible playback cannot start an old sound when hidden',()=>{
 const t=setup();let sounds=0;t.aim.win(()=>sounds++);t.aim.reset();t.hide();
 assert.equal(sounds,0);assert.equal(t.aim.busy,false);assert.equal(t.timers.size,0);
});
test('consecutive wins create independent nonlooping audio instances',()=>{
 const html=fs.readFileSync('jag.html','utf8'),audios=[];
 const c=vm.createContext({prepareCharacterVoiceAudio(){},releaseCharacterVoiceAudio(){},debugFastSpinActive:false,aimWinAudios:new Set(),clearInterval(){},aimWinOutputVolume:()=>.5,oneShotSoundCache:new Map([['assets/media/nova/aim/seven-win.wav',{cloneNode(){const a={play(){return Promise.resolve();}};audios.push(a);return a;}}]])});
 vm.runInContext(html.match(/  function playAimSevenWinSound\([^]*?\n  }/)[0],c);
 c.playAimSevenWinSound();c.playAimSevenWinSound();assert.equal(audios.length,2);assert.notEqual(audios[0],audios[1]);assert.equal(audios[0].loop,false);assert.equal(c.aimWinAudios.size,2);audios[0].onended();assert.equal(c.aimWinAudios.size,1);
});
const aimCode=fs.readFileSync('nova-aim-presentation.js','utf8');
test('right first aligns both symbols; other orders miss while internal result stays intact',()=>{
 const c=vm.createContext({});vm.runInContext(aimCode,c);
 for(const symbol of ['seven','nebula'])for(const order of [[2,1,0],[2,0,1],[0,1,2],[0,2,1],[1,0,2],[1,2,0]]){
  const result=symbol==='seven'?'BIG':'NEBULA';
  const stops=order.map((index,n)=>c.NovaAim.stopTarget({symbol},result,order.slice(0,n+1),index));
  assert.equal(stops.every(s=>s.onLine),order[0]===2);
  assert.equal(stops.at(-1).aligned,order[0]===2);
 }
});
test('reverse miss breaks on third stop, scissors left-middle is a two-stop confirmation',()=>{
 const c=vm.createContext({});vm.runInContext(aimCode,c);
 for(const symbol of ['seven','nebula']){
  assert.deepEqual([2,1,0].map((index,n)=>c.NovaAim.stopTarget({symbol},'MISS',[2,1,0].slice(0,n+1),index).onLine),[true,true,false]);
  assert.equal(c.NovaAim.stopTarget({symbol},'MISS',[2,0],0).onLine,false);
  assert.equal(c.NovaAim.stopTarget({symbol},symbol==='seven'?'BIG':'NEBULA',[2,0],0).onLine,true);
 }
});
test('artwork rendering preserves configured coordinates while dimensions are unavailable',()=>{
 const source=fs.readFileSync('nova-artwork.js','utf8');
 const render=source.match(/  function render\(id\){[^]*?\n  }/)[0];
 const position={x:19.7667,y:34.0807,w:17.6},item={style:{},querySelector:()=>({naturalWidth:0})};
 const c=vm.createContext({items:new Map([['urapi',item]]),positions:{urapi:position},layer:{clientWidth:1000,clientHeight:0}});
 vm.runInContext(render,c);c.render('urapi');assert.equal(position.y,34.0807);assert.equal(item.style.top,'34.0807%');
});
test('miss guide uses 50 percent boundary; wins always guide',()=>{
 const {aim}=setup();assert.equal(aim.drawGuide({result:'MISS'},()=>.499999),true);assert.equal(aim.drawGuide({result:'MISS'},()=>.5),false);
 for(const result of ['BIG','NEBULA'])assert.equal(aim.drawGuide({result},()=>.999),true);
 let seed=198,shown=0;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<100000;i++)shown+=aim.drawGuide({result:'MISS'},rng);
 assert.ok(Math.abs(shown/100000-.5)<.01);
});
test('suppressed miss cue never opens video',()=>{
 const {aim,elements}=setup();aim.bet({symbol:'seven',color:'blue',result:'MISS',guide:false});assert.equal(elements.length,0);assert.equal(aim.hasGuide({guide:false}),false);
});
test('cue dismissal runs after real reel landing, not button acceptance',()=>{
 const html=fs.readFileSync('jag.html','utf8');const stop=html.slice(html.indexOf('  function stopSingleReel(i,'),html.indexOf('  function stopAllReels()'));
 assert.equal(stop.slice(0,stop.indexOf('await NovaReelMotion.stop')).includes('NovaAim.hide()'),false);
 const landed=stop.indexOf('currentSpin.stopped[i] = true;'),finished=stop.indexOf('if(currentSpin.stopped.every(Boolean)){',landed);
 assert.ok(landed>=0&&finished>landed);assert.ok(stop.indexOf('else NovaAim.hide();')>finished);
 assert.ok(stop.indexOf('NovaAim.fail(')>stop.indexOf('currentSpin.stopped[i] = true'));
 assert.ok(stop.indexOf('NovaAim.win(')>stop.indexOf('currentSpin.stopped[i] = true'));
});

test('guided miss stays grayscale, plays failure once and resets on next BET',()=>{
 const {aim,elements,timers}=setup();let sounds=0,results=0;
 aim.bet({symbol:'seven',color:'blue',result:'MISS',guide:true});
 const root=elements[0];aim.fail(()=>sounds++);aim.fail(()=>sounds++);
 assert.equal(root.dataset.failed,'true');assert.equal(root.hidden,false);assert.equal(sounds,1);
 aim.afterWin(()=>results++);assert.equal(results,0);
 [...timers.values()][0].fn();assert.equal(results,1);assert.equal(aim.busy,false);
 aim.bet({symbol:'nebula',color:'red',result:'NEBULA'});assert.equal(root.dataset.failed,undefined);
});
test('no-guide miss has no failure video or sound',()=>{
 const {aim}=setup();let sounds=0;aim.bet({guide:false});aim.fail(()=>sounds++);assert.equal(sounds,0);assert.equal(aim.busy,false);
});
test('nebula win uses dedicated silent video and same 3 second lock',()=>{
 const {aim,elements,timers}=setup();let sounds=0;aim.win(()=>sounds++,'nebula');
 const video=elements.find(e=>e.src?.endsWith('nebula-win.mp4'));
 assert.equal(video.hidden,false);assert.equal(video.muted,true);assert.equal(video.loop,false);
 assert.equal(elements[0].dataset.symbol,'nebula');assert.equal(aim.busy,true);
 video.onplaying();assert.equal(sounds,1);const timer=[...timers.values()][0];assert.equal(timer.ms,3000);timer.fn();assert.equal(aim.busy,false);
});

test('zone entry loops the supplied cue until the reels finish, for initial and regular entries',()=>{
 for(const initialStage of ['', 'entry']){
  const {aim,elements}=setup();
  assert.equal(aim.bet(null,{flowBefore:{phase:'art',entryStage:'seven',initialStage},flowAfter:{phase:'art',entryStage:'roulette'}}),true);
  const video=elements.find(e=>e.src?.includes('/zone-entry-seven.webm'));
  assert.equal(video.hidden,false);assert.equal(video.loop,true);assert.equal(video.muted,true);assert.equal(video.currentTime,0);assert.equal(video.paused,false);
  assert.equal(elements[0].dataset.zoneEntry,'true');assert.equal(aim.busy,false);
  aim.hide();assert.equal(video.hidden,true);assert.equal(video.paused,true);assert.equal(elements[0].dataset.zoneEntry,undefined);
  assert.equal(aim.bet(null,{flowBefore:{phase:'art',entryStage:'roulette'},flowAfter:{phase:'art',entryStage:'confirmed'}}),false);
  assert.equal(video.hidden,true);
 }
});

test('cue rewinds while hidden and reuses the prepared first frame on the next BET',()=>{
 const {aim,elements}=setup();
 const entry={flowBefore:{phase:'art',entryStage:'seven'},flowAfter:{phase:'art',entryStage:'roulette'}};
 aim.bet(null,entry);
 const video=elements.find(e=>e.src?.includes('/zone-entry-seven.webm'));
 let time=1.5;const seeks=[];
 Object.defineProperty(video,'currentTime',{get:()=>time,set(value){seeks.push({value,hidden:this.hidden,paused:this.paused});time=value;}});
 aim.hide();assert.deepEqual(seeks,[{value:0,hidden:true,paused:true}]);
 aim.bet(null,entry);assert.equal(seeks.length,1);assert.equal(video.paused,false);assert.equal(video.hidden,false);
});

test('zone entry and colored seven cues play one character voice on BET with their existing presentation',()=>{
 const t=setup(),sounds=[];
 const context=vm.createContext({NovaAim:t.aim,debugFastSpinActive:false,speedToBonusActive:false,voiceOutputVolume:()=>.6,sfxOutputVolume:()=>.4,playOneShotSound:(src,volume)=>sounds.push({src,volume})});
 const html=fs.readFileSync('jag.html','utf8');
 vm.runInContext(html.match(/  const AIM_VOICE_SRCS=[^\n]+/)[0]+'\n'+html.match(/  function playRandomAimVoice\([^]*?\n  }/)[0],context);
 vm.runInContext(html.match(/  function playAimBetPresentation\([^]*?\n  }/)[0],context);
 context.playAimBetPresentation({flowBefore:{phase:'art',entryStage:'seven'},flowAfter:{phase:'art',entryStage:'roulette'}},()=>0);
 assert.deepEqual(sounds,[{src:'assets/media/nova/aim_seven_sosuke.wav',volume:.6}]);
 context.playAimBetPresentation({aim:{symbol:'seven',color:'red',guide:true},flowBefore:{phase:'art',zone:'toto'}},()=>.9);
 assert.deepEqual(sounds[1],{src:'assets/media/nova/aim/cue-red.wav',volume:.4});
 assert.deepEqual(sounds[2],{src:'assets/media/nova/aim-seven-giru.wav',volume:.6});
 const entry=t.elements.find(e=>e.src?.includes('/zone-entry-seven.webm'));
 assert.equal(entry.hidden,true);assert.equal(entry.paused,true);assert.equal(t.elements[0].dataset.zoneEntry,'false');
 context.playAimBetPresentation({flowBefore:{phase:'art'},flowAfter:{phase:'art',entryStage:'seven'}});assert.equal(sounds.length,3);
 context.debugFastSpinActive=true;
 context.playAimBetPresentation({flowBefore:{phase:'art',entryStage:'seven'},flowAfter:{phase:'art',entryStage:'roulette'}});assert.equal(sounds.length,3);
});

test('bonus nebula confirmation switches back to the original video for character zones',()=>{
 const {aim,elements,timers}=setup();let sounds=0;
 aim.win(()=>sounds++,'nebula',{aTypeBonusGame:true});
 const bonusVideo=elements.find(e=>e.src==='assets/media/nova/aim/bonus-nebula-win.mp4');
 const zoneVideo=elements.find(e=>e.src==='assets/media/nova/aim/nebula-win.mp4');
 assert.equal(bonusVideo.hidden,false);assert.equal(zoneVideo.hidden,true);
 assert.equal(bonusVideo.muted,true);assert.equal(bonusVideo.loop,false);
 bonusVideo.onplaying();assert.equal(sounds,1);assert.equal(aim.busy,true);
 const timer=[...timers.values()][0];assert.equal(timer.ms,3000);timer.fn();assert.equal(aim.busy,false);
 for(const zone of ['toto','sora','ura_sora']){
  aim.win(()=>sounds++,'nebula',{zoneSpin:true,flowBefore:{phase:'art',zone}});
  assert.equal(bonusVideo.hidden,true);assert.equal(bonusVideo.paused,true);assert.equal(zoneVideo.hidden,false);
  aim.reset();
 }
 aim.win(()=>{},'seven',{aTypeBonusGame:true});
 assert.equal(elements.find(e=>e.src?.includes('/seven-win.mp4')).hidden,false);
 assert.equal(bonusVideo.hidden,true);
});
test('nebula audio uses dedicated source and continues independently from video',()=>{
 const html=fs.readFileSync('jag.html','utf8');let played=0;const audio={play(){played++;return Promise.resolve();}};
 const c=vm.createContext({prepareCharacterVoiceAudio(){},releaseCharacterVoiceAudio(){},debugFastSpinActive:false,aimWinAudios:new Set(),clearInterval(){},aimWinOutputVolume:()=>.5,oneShotSoundCache:new Map([['assets/media/nova/aim/nebula-win.wav',{cloneNode:()=>audio}]])});
 vm.runInContext(html.match(/  function playAimSevenWinSound\([^]*?\n  }/)[0],c);c.playAimSevenWinSound('nebula');assert.equal(played,1);assert.equal(audio.loop,false);assert.equal(c.aimWinAudios.has(audio),true);
});

test('BET fades existing win sound over three seconds and repeat BET does not restart',()=>{
 const html=fs.readFileSync('jag.html','utf8');let now=0,frame,id=0;const audio={paused:false,ended:false,volume:.5,pause(){this.paused=true;}};
 const c=vm.createContext({releaseCharacterVoiceAudio(){},aimWinAudios:new Set([audio]),performance:{now:()=>now},aimWinOutputVolume:a=>.5*(a.aimFadeGain??1),setInterval(fn){frame=fn;return ++id;},clearInterval(){}});
 vm.runInContext(html.match(/  function fadeAimWinSoundsOnBet\([^]*?\n  }/)[0],c);
 c.fadeAimWinSoundsOnBet();now=1500;frame();assert.equal(audio.volume,.25);
 c.fadeAimWinSoundsOnBet();assert.equal(id,1);
 const next={paused:false,ended:false,volume:.5};c.aimWinAudios.add(next);
 now=3000;frame();assert.equal(audio.volume,0);assert.equal(audio.paused,true);assert.equal(c.aimWinAudios.has(audio),false);assert.equal(next.volume,.5);
});
