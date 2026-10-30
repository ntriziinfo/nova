import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {loadVoiceCatalog} from './helpers/voice-catalog.mjs';
const plain=v=>JSON.parse(JSON.stringify(v));
const gameFunction=(source,name)=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))?.[0]||(()=>{throw Error('Missing '+name);})();
function harness(){
 let now=0;
 const noop=()=>{},elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{textContent:'',classList:{add:noop}});return elements.get(id);};
 const flow={phase:'art',remaining:'900',queuedZones:['ura_giru','kushuri_nito'],researchSortieLeft:0};
 const c=vm.createContext({crypto:{getRandomValues:a=>(a[0]=0x80000000,a)},sfxOutputVolume:()=>1,Date:{now:()=>now+=1000},normalState:{flow},session:{active:false},currentSpin:null,isSpinning:false,spinCanStop:false,spinWaitTimer:null,debugFastSpinActive:false,speedToBonusActive:false,NEBULA_SYMBOL:'NEBULA',RESULT:{MISS:{cls:'miss'},BIG:{cls:'big'},NEBULA:{cls:'purple'}},$: $,stopBtns:[{},{},{}],reels:[0,1,2].map(i=>$('reel'+i)),REEL_STRIPS:[['REPLAY','BELL','BAR','CHERRY'],['REPLAY','BELL','BAR','CHERRY','BAR','BELL'],['REPLAY','BELL','BAR','BELL']],
  NovaProgress:{snapshot:()=>({pending:0,sorties:0}),ready:flow=>flow.phase==='art'&&!flow.queuedZones?.length},NovaSortie:{clear:noop,flash:noop},NovaSortieAim:{fail:noop},NovaBellNavi:{clear:noop},NovaDirectAward:{clear:noop},
  NovaAim:{hide:noop,bet:noop,stop:noop,stopVerdict:spin=>spin.resolved?.stockEntry&&spin.resolved.sortieEntry&&spin.auditStopOrder?.includes(1)?{kind:'sortie',won:!spin.resolved.sortieFake}:null},
  NovaLadder:{hide:noop},NovaResults:{hide:noop},NovaArt:{zoneName:z=>z},NovaReelMotion:{start:noop,stop:async()=>true},
  getReelWindowFromStrip:(i,symbol)=>['BELL',symbol,'REPLAY'],currentReelTopIndex:()=>0,cellHtml:noop,showZoneRoulette:noop,pauseNormalBgm:noop,persistState:noop,updateDisplay:noop,scheduleNextAuto:noop,syncCabinetControlState:noop,stopReel:noop,
  playRandomAimVoice:symbol=>{c.voiceSymbol=symbol;},playSevenAimVoice:resolved=>{c.voiceZone=resolved.flowBefore.pendingZone;},playOneShotSound:noop,voiceOutputVolume:()=>1,ZONE_START_VOICE_SRCS:{},
  SORTIE_SANDWICH_AIM_SOUND_SRC:'assets/media/nova/sortie-sandwich-aim.wav',SORTIE_SANDWICH_HIT_SOUND_SRC:'assets/media/nova/sortie-sandwich-hit.wav',
  setTimeout:f=>{f();return 1;},clearTimeout:noop,spinWaitMsForMode:()=>500,displayNovaResult:card=>{c.normalState.resultCard=card;}});
 c.MODE_EVENT_VOICE_SRCS=loadVoiceCatalog(c).MODE_EVENT_VOICE_SRCS;
 c.cues=[];c.audios=[];c.playOneShotSound=(src,volume)=>{
  const audio={src,paused:false,currentTime:3,pause(){this.paused=true;}};c.audios.push(audio);c.cues.push({src,volume});return {audio,promise:Promise.resolve()};
 };
 c.lockedVoices=[];c.playLockedBonusConfirmSound=(src,volume)=>c.lockedVoices.push({src,volume});
 for(const file of ['nova-aim-confidence.js','nova-stock-entry.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 c.NovaStockEntry.show=noop;c.NovaStockEntry.hide=noop;
 const source=fs.readFileSync('nova-game.js','utf8');
 for(const name of ['stopSortieSandwichAimSound','playSortieSandwichAimSound','playSortieSandwichHitSound','revealStoppedOutcome'])vm.runInContext(gameFunction(source,name),c);
 vm.runInContext(source.slice(source.indexOf('  function tryStockEntry(){'),source.indexOf('  async function spin(options={}')),c);
 vm.runInContext('Math.random=()=>{throw Error("entry consumed game RNG")}',c);return c;
}
test('each queued stock has a free preparation and seven stop before engine consumption',async()=>{
 const c=harness(),flowBefore=JSON.stringify(c.normalState.flow);
 assert.equal(c.tryStockEntry(),true);assert.equal(c.normalState.stockEntry.stage,'prepare');assert.equal(c.isSpinning,false);
 assert.equal(c.tryStockEntry(),true);assert.equal(c.normalState.stockEntry.stage,'seven');assert.equal(c.isSpinning,true);
 assert.equal(c.voiceZone,'ura_giru');
 await c.stopStockEntryReel(2);await c.stopStockEntryReel(1);await c.stopStockEntryReel(0);
 assert.equal(c.normalState.stockEntry.stage,'ready');assert.equal(c.isSpinning,false);assert.equal(c.currentSpin,null);assert.equal(JSON.stringify(c.normalState.flow),flowBefore);
 assert.equal(c.lockedVoices.length,0,'Ordinary character zone entry does not announce a sortie');
 assert.equal(c.tryStockEntry(),false);assert.equal(c.normalState.stockEntry,undefined);
 // Only the actual engine spin removes its awarded queue item.
 c.normalState.flow.queuedZones.shift();assert.equal(c.tryStockEntry(),true);assert.equal(c.normalState.stockEntry.zone,'kushuri_nito');assert.equal(c.normalState.stockEntry.stage,'prepare');
});
test('partial seven stops survive saving without charging a game or consuming the stock',async()=>{
 const c=harness();c.tryStockEntry();c.tryStockEntry();await c.stopStockEntryReel(2);
 c.currentSpin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(c.currentSpin),c.RESULT);
 assert.equal(c.currentSpin.resolved.stockEntry,true);assert.deepEqual(plain(c.currentSpin.stopped),[false,false,true]);
 await c.stopStockEntryReel(1);await c.stopStockEntryReel(0);assert.equal(c.normalState.stockEntry.stage,'ready');assert.equal(c.normalState.flow.queuedZones.length,2);
});

test('sortie has a guaranteed free NOVA center entrance, retains its award through reload, then hands off once',async()=>{
 const c=harness();c.normalState.flow.queuedZones=[];c.NovaProgress.snapshot=()=>({pending:0,sorties:1});
 const before=JSON.stringify(c.normalState.flow);
 assert(c.tryStockEntry());assert.equal(c.normalState.stockEntry.kind,'sortie');assert.match(c.$('resultText').textContent,/出陣チャンス.*NOVA/);
 assert(c.tryStockEntry());assert.equal(c.currentSpin.result,'NEBULA');
 assert.deepEqual(c.cues,[{src:'assets/media/nova/sortie-sandwich-aim.wav',volume:1}]);
 assert.equal(c.currentSpin.sortieSandwichAimSoundPlayed,true);assert.equal(c.voiceSymbol,undefined);assert.equal(c.voiceZone,undefined);
 const aimAudio=c.currentSpin.sortieSandwichAimAudio;assert.equal(aimAudio,c.audios[0]);assert.equal(aimAudio.paused,false);
 assert.equal(c.currentSpin.resolved.reward,0);assert.deepEqual(plain(c.currentSpin.grid[1]),['BAR','CHERRY','BAR']);
 await c.stopStockEntryReel(2);assert.equal(c.currentSpin.stopped[2],false);await c.stopStockEntryReel(1);
 assert.equal(c.lockedVoices.length,0);
 assert.deepEqual(c.cues.map(cue=>cue.src),['assets/media/nova/sortie-sandwich-aim.wav','assets/media/nova/sortie-sandwich-hit.wav']);
 assert.equal(aimAudio.paused,true);assert.equal(aimAudio.currentTime,0);assert.equal(c.currentSpin.sortieConfirmSoundPlayed,true);
 c.currentSpin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(c.currentSpin),c.RESULT);
 assert.equal(c.currentSpin.resolved.sortieEntry,true);assert.equal(c.currentSpin.sortieSandwichAimAudio,undefined);
 await c.stopStockEntryReel(2);assert.equal(c.lockedVoices.length,0);assert.equal(c.cues.length,2,'Second stop does not replay success');await c.stopStockEntryReel(0);
 assert.deepEqual(c.cues.map(cue=>cue.src),['assets/media/nova/sortie-sandwich-aim.wav','assets/media/nova/sortie-sandwich-hit.wav']);
 assert(!c.cues.some(cue=>cue.src==='assets/media/nova/sortie-nebula-cue.mp3'));
 assert.deepEqual(c.lockedVoices,[{src:c.MODE_EVENT_VOICE_SRCS.sortie,volume:1}]);
 c.finishStockEntry();assert.equal(c.cues.length,2);assert.equal(c.lockedVoices.length,1,'Repeated third-stop callback must not replay the title');
 assert.equal(c.normalState.stockEntry.stage,'ready');assert.equal(JSON.stringify(c.normalState.flow),before);assert.equal(c.NovaProgress.snapshot().sorties,1);
 assert.equal(c.tryStockEntry(),false);assert.equal(c.normalState.stockEntry,undefined);
 c.NovaProgress.snapshot=()=>({pending:0,sorties:0});assert.equal(c.tryStockEntry(),false);
});

test('ordinary queued character zones keep priority and seven cues when a sortie is also pending',()=>{
 const c=harness();c.NovaProgress.snapshot=()=>({pending:0,sorties:1});
 assert(c.tryStockEntry());assert.equal(c.normalState.stockEntry.kind,undefined);assert(c.tryStockEntry());assert.equal(c.currentSpin.result,'BIG');assert.equal(c.currentSpin.resolved.sortieEntry,false);
});

test('normal-state success reveals the same free aim without entering AT before the stops',async()=>{
 const c=harness();c.normalState.flow={phase:'normal',remaining:0};c.NovaProgress.snapshot=()=>({pending:0,sorties:1});
 const before=JSON.stringify(c.normalState.flow);
 assert(c.tryStockEntry());assert(c.tryStockEntry());
 assert.equal(c.currentSpin.resolved.sortieFake,false);assert.equal(JSON.stringify(c.normalState.flow),before);
 await c.stopStockEntryReel(1);c.currentSpin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(c.currentSpin),c.RESULT);
 await c.stopStockEntryReel(0);await c.stopStockEntryReel(2);
 assert.equal(JSON.stringify(c.normalState.flow),before);assert.equal(c.normalState.stockEntry.stage,'ready');
 assert.equal(c.tryStockEntry(),false);assert.equal(c.NovaProgress.snapshot().sorties,1);
 assert.equal(c.lockedVoices.length,1);
});

test('a fresh normal save can reveal the forced sortie before its first paid game',()=>{
 const c=harness();delete c.normalState.flow;
 c.NovaFlow={normalize:()=>({phase:'normal',remaining:0,success:false})};
 c.NovaProgress.snapshot=()=>({pending:0,sorties:1});
 assert(c.tryStockEntry());assert.equal(c.normalState.flow.phase,'normal');
 assert(c.tryStockEntry());assert.equal(c.currentSpin.resolved.sortieEntry,true);
 assert.equal(c.normalState.flow.phase,'normal');
});

test('normal prelude and post-sortie initial handoff cannot be bypassed by an entry presentation',()=>{
 const c=harness();c.normalState.flow={phase:'normal'};c.normalState.internal={prelude:{left:2}};c.NovaProgress.snapshot=()=>({pending:0,sorties:1});
 assert.equal(c.tryStockEntry(),false);
 c.normalState.flow={phase:'art',sortieInitialPending:true,queuedZones:['sora'],researchSortieLeft:0};
 assert.equal(c.tryStockEntry(),false);assert.equal(c.normalState.stockEntry,undefined);
});
test('results, checkpoints and active engine phases keep their priority',()=>{
 const c=harness();c.normalState.ladderAwardPresentation={card:{pt:'500'}};
 assert.equal(c.tryStockEntry(),true);assert.equal(c.normalState.resultCard.pt,'500');assert.equal(c.normalState.stockEntry,undefined);
 c.NovaProgress.snapshot=()=>({pending:1});assert.equal(c.tryStockEntry(),false);
 for(const key of ['zone','initialStage','entryStage','atPrelude','researchSortieLeft','burstPending','researchChallengeActive','comebackLeft'])assert.equal(c.NovaStockEntry.eligible({...c.normalState.flow,[key]:true}),false,key);
});
test('won lamps map back variants to their character and the duo to both lamps',()=>{
 const lamps=['sosuke','giru1','sora1','ouma1','kushuri','nito'].map(artwork=>({dataset:{artwork}})),c=vm.createContext({document:{querySelectorAll:()=>lamps}});
 vm.runInContext(fs.readFileSync('nova-sortie-presentation.js','utf8'),c);
 const lit=()=>lamps.filter(l=>l.dataset.sortieWon==='true').map(l=>l.dataset.artwork);
 c.NovaSortie.flash('ura_sora');assert.deepEqual(lit(),['sora1']);c.NovaSortie.flash('kushuri_nito');assert.deepEqual(lit(),['kushuri','nito']);c.NovaSortie.flash('');assert.deepEqual(lit(),[]);
});
test('restored preparation renders even before the status bar has been mounted',()=>{
 const panel={style:{},setAttribute(){}},rect={width:500,top:20,left:0,bottom:70},host={offsetWidth:500,append(){},querySelector:()=>({getBoundingClientRect:()=>rect}),getBoundingClientRect:()=>rect};
 const c=vm.createContext({document:{createElement:()=>panel,getElementById:id=>id==='machine'?host:null},NovaArt:{zoneName:z=>z}});
 vm.runInContext(fs.readFileSync('nova-stock-entry.js','utf8'),c);c.NovaStockEntry.show({zone:'sora',stage:'prepare'});assert.equal(panel.hidden,false);assert.equal(panel.style.width,'500px');
});
test('the first queued zone game exposes its pre-draw display state without consuming another game',()=>{
 const c=vm.createContext({});for(const file of ['nova-tuning.js','nova-art.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 for(const zone of [...c.NovaArt.zoneIds,'kushuri_nito']){
  const flow={...c.NovaArt.enter({setting:3},()=>.5),queuedZones:[zone,'sora']},out=c.NovaArt.step(flow,{setting:3},()=>.5),view=out.zoneStartFlow;
  assert(view,zone);assert.equal(view.zone,c.NovaArt.baseZone(zone));assert.equal(view.ura,zone.startsWith('ura_'));assert.deepEqual(plain(view.queuedZones),['sora']);
  assert.deepEqual(flow.queuedZones,[zone,'sora']);
  if(zone==='kushuri_nito'){assert.equal(view.initialIndex,0);assert.equal(out.flow.initialIndex,1);assert.equal(view.zoneLeft,3);assert.equal(view.award,'0');}
  if(['sosuke','giru','ura_giru'].includes(zone)){assert.equal(view.ladderRevealed,false);assert.equal(out.flow.ladderRevealed,true);}
 }
});

test('fake reverse cue consumes only its presentation ticket, preserves paid flow and saved stop progress',async()=>{
 const c=harness();c.normalState.flow={phase:'normal',remaining:'900',queuedZones:[]};c.normalState.pendingFakeSortie=2;const before=JSON.stringify(c.normalState.flow);
 assert(c.tryStockEntry());assert.equal(c.normalState.stockEntry.kind,'sortieFake');assert(c.tryStockEntry());assert.equal(c.currentSpin.result,'MISS');assert.equal(c.currentSpin.resolved.reward,0);assert.equal(c.currentSpin.resolved.sortieCueColor,'blue');
 await c.stopStockEntryReel(1);c.currentSpin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(c.currentSpin),c.RESULT);await c.stopStockEntryReel(2);await c.stopStockEntryReel(0);
 assert.equal(c.cues[0].src,'assets/media/nova/sortie-sandwich-aim.wav');
 assert(!c.cues.some(cue=>cue.src==='assets/media/nova/sortie-sandwich-hit.wav'),'Missed entry never plays success');
 assert.equal(c.normalState.pendingFakeSortie,1);assert.equal(c.normalState.stockEntry,undefined);assert.equal(c.lockedVoices.length,0);assert.equal(JSON.stringify(c.normalState.flow),before);assert.equal(c.NovaProgress.snapshot().sorties,0);
});

test('real and fake sandwich aim cues are one-shot even when the helper is retried or the spin is serialized',()=>{
 for(const fake of [false,true]){
  const c=harness();c.normalState.flow={phase:fake?'normal':'art',remaining:'900',queuedZones:[]};c.normalState.pendingFakeSortie=fake?1:0;c.NovaProgress.snapshot=()=>({pending:0,sorties:fake?0:1});
  assert(c.tryStockEntry());assert(c.tryStockEntry());assert.equal(c.currentSpin.resolved.sortieFake,fake);
  c.playSortieSandwichAimSound(c.currentSpin);c.playSortieSandwichAimSound(c.currentSpin);
  const restored=c.NovaSpinResume.restore(c.NovaSpinResume.capture(c.currentSpin),c.RESULT);c.playSortieSandwichAimSound(restored);
  assert.deepEqual(c.cues.map(cue=>cue.src),['assets/media/nova/sortie-sandwich-aim.wav']);
  assert.equal(restored.sortieSandwichAimSoundPlayed,true);assert.equal(restored.sortieSandwichAimAudio,undefined);
 }
});
test('fake probability is twice the real hit probability, and color draws never call game RNG',()=>{
 const c=harness(),a=c.NovaStockEntry;
 for(const p of [.00212,.00397,.0212,.0397]){const rate=2*p/(1-p);assert(a.drawFake(p,false,()=>rate-1e-10));assert(!a.drawFake(p,false,()=>rate));assert(Math.abs((1-p)*rate-2*p)<1e-12);assert(!a.drawFake(p,true,()=>{throw Error('winner must not draw fake');}));}
 for(const [r,color] of [[0,'blue'],[.5,'red'],[.99,'rainbow']])assert.equal(a.cueColor(false,()=>r),color);for(let i=0;i<100;i++)assert.notEqual(a.cueColor(true,()=>i/100),'rainbow');
});

test('sortie windows are contiguous and the fake never stops the middle NOVA sandwich',()=>{
 const c=harness();
 for(const kind of ['sortie','sortieFake']){
  const cols=c.NovaStockEntry.sortieColumns({kind},c.REEL_STRIPS);
  cols.forEach((col,i)=>assert(c.REEL_STRIPS[i].some((_,j)=>col.every((s,r)=>s===c.REEL_STRIPS[i][(j+r)%c.REEL_STRIPS[i].length]))));
  assert.equal(cols[1][0]==='BAR'&&cols[1][2]==='BAR',kind==='sortie');
 }
});

test('sortie colors share blue20 red90 rainbow100 confidence with a 1:2 real/fake prior',()=>{
 const c=harness(),a=c.NovaStockEntry,n=30000,counts={blue:[0,0],red:[0,0],rainbow:[0,0]};
 for(let i=0;i<n;i++){const r=(i+.5)/n;counts[a.cueColor(false,()=>r)][0]++;counts[a.cueColor(true,()=>r)][1]+=2;}
 for(const [color,target] of Object.entries({blue:.2,red:.9,rainbow:1})){const [win,miss]=counts[color];assert.ok(Math.abs(win/(win+miss)-target)<.001,color);}
});
