import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const plain=v=>JSON.parse(JSON.stringify(v));
function harness(){
 let now=0;
 const noop=()=>{},elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{textContent:'',classList:{add:noop}});return elements.get(id);};
 const flow={phase:'art',remaining:'900',queuedZones:['ura_giru','kushuri_nito'],researchSortieLeft:0};
 const c=vm.createContext({Date:{now:()=>now+=1000},normalState:{flow},session:{active:false},currentSpin:null,isSpinning:false,spinCanStop:false,spinWaitTimer:null,RESULT:{BIG:{cls:'big'}},$: $,stopBtns:[{},{},{}],reels:[0,1,2].map(i=>$('reel'+i)),REEL_STRIPS:[[],[],[]],
  NovaProgress:{snapshot:()=>({pending:0})},NovaSortie:{clear:noop,flash:noop},NovaBellNavi:{clear:noop},NovaDirectAward:{clear:noop},NovaAim:{hide:noop,bet:noop,stop:noop},NovaLadder:{hide:noop},NovaResults:{hide:noop},NovaArt:{zoneName:z=>z},NovaReelMotion:{start:noop,stop:async()=>true},
  getReelWindowFromStrip:()=>['BELL','7','REPLAY'],currentReelTopIndex:()=>0,cellHtml:noop,showZoneRoulette:noop,pauseNormalBgm:noop,persistState:noop,updateDisplay:noop,scheduleNextAuto:noop,syncCabinetControlState:noop,stopReel:noop,
  playSevenAimVoice:resolved=>{c.voiceZone=resolved.flowBefore.pendingZone;},playOneShotSound:noop,voiceOutputVolume:()=>1,ZONE_START_VOICE_SRCS:{},setTimeout:f=>{f();return 1;},clearTimeout:noop,spinWaitMsForMode:()=>500,displayNovaResult:card=>{c.normalState.resultCard=card;}});
 for(const file of ['nova-stock-entry.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 c.NovaStockEntry.show=noop;c.NovaStockEntry.hide=noop;
 const source=fs.readFileSync('nova-game.js','utf8');vm.runInContext(source.slice(source.indexOf('  function tryStockEntry(){'),source.indexOf('  async function spin(options={}')),c);
 vm.runInContext('Math.random=()=>{throw Error("entry consumed game RNG")}',c);return c;
}
test('each queued stock has a free preparation and seven stop before engine consumption',async()=>{
 const c=harness(),flowBefore=JSON.stringify(c.normalState.flow);
 assert.equal(c.tryStockEntry(),true);assert.equal(c.normalState.stockEntry.stage,'prepare');assert.equal(c.isSpinning,false);
 assert.equal(c.tryStockEntry(),true);assert.equal(c.normalState.stockEntry.stage,'seven');assert.equal(c.isSpinning,true);
 assert.equal(c.voiceZone,'ura_giru');
 await c.stopStockEntryReel(2);await c.stopStockEntryReel(1);await c.stopStockEntryReel(0);
 assert.equal(c.normalState.stockEntry.stage,'ready');assert.equal(c.isSpinning,false);assert.equal(c.currentSpin,null);assert.equal(JSON.stringify(c.normalState.flow),flowBefore);
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
