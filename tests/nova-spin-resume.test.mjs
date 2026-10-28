import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadVoiceCatalog} from './helpers/voice-catalog.mjs';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const json=value=>JSON.parse(JSON.stringify(value));
const noop=()=>{};
const sortieVerdict=vm.runInNewContext(fs.readFileSync('nova-sortie-presentation.js','utf8')+';NovaSortie.stopVerdict;');
function harness(saved=null){
 const storage=new Map(saved?[['state',JSON.stringify(saved)]]:[]),errors=[],timers=[],elements=new Map(),voices=[];
 const $=id=>{if(!elements.has(id))elements.set(id,{dataset:{},classList:{toggle:noop},disabled:false,textContent:''});return elements.get(id);};
 const c=vm.createContext({console:{warn:(...args)=>errors.push(args)},settings:{setting:1,title:'NOVA',audioBalanceVersion:12,masterVolume:.7,completeEnabled:false,completeBasis:'none',completeLimitPt:0,completeMyLimitPt:0},stats:{roleStatVersion:1,totalSpins:0,normalSpins:0,highSpins:0,totalFee:0,totalPaid:0,slumpHistory:[]},normalState:{},session:{active:false},completeTrialState:{},
  safeStorageGet:key=>storage.has(key)?storage.get(key):null,safeStorageSet:(key,value)=>{storage.set(key,value);return true;},
  storageRestoreBlocked:false,storeResumeState:null,displaySinceBonusOffset:null,storeEndSnapshot:null,playAccess:{owned:()=>true},VERTEX_CONTROLLER_ENABLED:false,
  PREFERENCES_STORAGE_KEY:'preferences',STORAGE_KEY:'state',STORAGE_RESUME_KEY:'resume',
  A_TYPE_MODE:true,AUDIO_BALANCE_VERSION:12,ROLE_STAT_COUNTER_VERSION:1,DEFAULT_COMPLETE_LIMIT_PT:0,COMPLETE_TRIAL_ENABLED:false,DEFAULT_MASTER_VOLUME:.7,DEFAULT_BGM_VOLUME:.2,DEFAULT_SFX_VOLUME:.3,DEFAULT_PAYOUT_VOLUME:.3,
  SETTING:{1:{},2:{},3:{},4:{},5:{},6:{}},RESULT:Object.fromEntries(['BELL','REPLAY','NEBULA','MISS','BIG','STRONG_NOVA'].map(k=>[k,{name:k,label:k,cls:k}])),
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),normalizeMachineTitle:v=>v,normalizeBonusAfterGames:v=>Number(v)||0,normalizeNovaRisingRemain:v=>Number(v)||0,normalizeForceResult:v=>v,isCompleteLockEnabled:()=>false,pickATypeBonusBgm:()=>({src:'bonus.wav'}),
  currentSpin:null,isSpinning:false,spinCanStop:false,spinWaitTimer:null,autoPlay:false,speedToBonusActive:false,
  debugFastSpinActive:false,voiceOutputVolume:()=>1,playLockedBonusConfirmSound:src=>voices.push(src),
  jagChainCount:null,jagLastGamePayout:0,jagLastBonusPayout:0,jagChanceHold:false,forceResult:'',forcePremiumEffect:false,pendingForceResult:'',pendingBonusStartOptions:null,devilZoneConfirmIntroPending:false,pendingDevilRushEntryEffect:'',speedFrameOffHold:false,barBgmActive:false,barBgmMode:'',battleBgmActive:false,rogiBgmMuted:false,
  syncNovaProgress:noop,auditCapture:noop,$,document:{getElementById:$},reels:[0,1,2].map(i=>$('reel'+i)),stopBtns:[0,1,2].map(i=>$('stop'+i)),
  setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout:noop,REEL_STRIPS:[[],[],[]],currentReelTopIndex:()=>0,cellHtml:noop,
  NovaAim:{bet:noop,stop:noop},NovaSortie:{begin:noop,eligible:()=>false,stopVerdict:sortieVerdict},NovaInitialDuo:{begin:noop,stop:noop},NovaLadder:{bet:noop,stop:noop},NovaReelMotion:{start:noop},NovaCzPresentation:{wait:()=>false},updateCompleteTrialState:noop,
  setReelColumn:noop,showZoneRoulette:noop,renderCzPrelude:noop,syncCzPreludeGlow:noop,updateDisplay:noop,syncCabinetControlState:noop,prepareManualBonusOutcome:noop,startOumaReverseAudio:noop,showCheckpointResultIfReady:()=>false
 });
 for(const file of ['nova-complete.js','nova-tuning.js','nova-art.js','nova-normal.js','nova-flow.js','nova-balance.js','nova-spin-resume.js','nova-history.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
 // Navigation renderer is tested separately with DOM stubs; restore must not draw an order.
 c.NovaBellNavi={restore:spin=>{c.shownOrder=json(spin.bellNaviOrder);},clear:noop};
 c.SORTIE_AWARD_VOICE_SRCS=loadVoiceCatalog(c).SORTIE_AWARD_VOICE_SRCS;
 for(const name of ['reduceSlumpPoints','canUsePlayState','clearBonusPreparationState','load','runtimeStateForStorage','compactStatsForResume','updateStorageStatus','persistState','playSortieAwardVoice','restoreCzLampPresentation','restorePendingSpin','prepareManualRareOutcome'])vm.runInContext(fn(name),c);
 c.migratePendingReelLayout=spin=>{c.restoredReelLayout=spin.reelLayoutVersion;};
 return {c,storage,errors,timers,$,voices};
}
function spin(c,overrides={}){
 return {result:'BELL',spec:c.RESULT.BELL,lineRow:1,grid:[['7','R','B'],['B','B','B'],['R','7','R']],resolved:{reward:15,flowBefore:{phase:'normal'},flowAfter:{phase:'normal'}},stopped:[false,false,false],normalActiveAtStart:true,bellNaviOrder:[2,0,1],...overrides};
}

function copyStorage(from,to){for(const [key,value] of from.storage)to.storage.set(key,value);}

test('a new player on another device restores server checkpoint without another BET or lottery',()=>{
 const phases=[
  {phase:'normal'}, {phase:'cz',czLeft:4},
  {phase:'art',remaining:543,stock:2},
  {phase:'art',zone:'sora',zoneLeft:3,remaining:765,stock:1},
  {phase:'art',researchSortieLeft:5,remaining:400,stock:3},
  {phase:'art',researchChallengeActive:true,researchChallengeLeft:4,remaining:200},
  {phase:'art',comebackLeft:3,remaining:0}
 ];
 for(const flow of phases)for(const stopped of [[false,false,false],[false,false,true],[false,true,true],[true,true,true]]){
  const old=harness();assert(old.c.load());
  old.c.normalState.flow=old.c.NovaFlow.normalize(flow);
  old.c.stats.totalSpins=1001;old.c.stats.totalFee=3003;old.c.stats.totalPaid=3700;
  old.c.currentSpin=spin(old.c,{stopped,commonStopColumns:[null,null,['7','B','R']],resolved:{reward:8,flowBefore:old.c.normalState.flow,flowAfter:old.c.normalState.flow}});
  old.c.displaySinceBonusOffset=30;old.c.persistState();
  const record=JSON.parse(old.storage.get('resume')),fresh=harness();
  fresh.c.storeResumeState={state:record,baseline:null};
  vm.runInContext('Math.random=()=>{throw Error("handoff must not redraw")}',fresh.c);
  assert(fresh.c.load());assert.deepEqual(fresh.errors,[]);
  assert.equal(fresh.c.stats.totalSpins,1001);assert.equal(fresh.c.stats.totalPaid,3700);assert.equal(fresh.c.stats.totalFee,3003);
  assert.deepEqual(json(fresh.c.currentSpin.resolved),record.runtimeState.pendingSpin.resolved);
  assert.deepEqual(json(fresh.c.currentSpin.stopped),stopped);
  assert.deepEqual(json(fresh.c.currentSpin.commonStopColumns),[null,null,['7','B','R']]);
  assert.equal(fresh.c.displaySinceBonusOffset,30);
 }
 const old=harness();old.c.load();Object.assign(old.c.session,{active:true,phase:'a_type_bonus',bonusKind:'BIG',paid:72,remaining:12});old.c.persistState();
 const fresh=harness();fresh.c.storeResumeState={state:JSON.parse(old.storage.get('resume'))};assert(fresh.c.load());
 assert.equal(fresh.c.session.active,true);assert.equal(fresh.c.session.paid,72);assert.equal(fresh.c.session.phase,'a_type_bonus');
});

test('same-player local checkpoint wins over an older server save, newer server repairs local corruption',()=>{
 const base=harness();base.c.load();base.c.stats.totalPaid=300;base.c.persistState();
 const old=JSON.parse(base.storage.get('state'));old.savedAt=1;old.stats.totalPaid=100;
 base.c.storeResumeState={state:old};assert(base.c.load());assert.equal(base.c.stats.totalPaid,300);
 base.storage.set('state','{broken');base.storage.set('resume','{broken');
 assert(base.c.load());assert.equal(base.c.stats.totalPaid,100);
});

test('preparing end freezes an immutable checkpoint and rejects late result callbacks',()=>{
 const h=harness();h.c.load();h.c.currentSpin=spin(h.c);h.c.isSpinning=true;
 Object.assign(h.c,{stopAutoPlay:noop,stopSpeedToBonus:noop,stopDebugFastSpin:noop,showPlayBlocked:noop,
  latestAdminSnapshot:()=>({runtimeState:h.c.runtimeStateForStorage(),stats:h.c.stats}),pushAdminState:noop});
 vm.runInContext(fn('prepareStoreEndSnapshot')+fn('finishSpin'),h.c);
 const saved=json(h.c.prepareStoreEndSnapshot());
 h.c.stats.totalPaid=999;h.c.finishSpin('BELL',h.c.currentSpin.resolved);
 assert.equal(h.c.canUsePlayState(),false);assert.deepEqual(json(h.c.prepareStoreEndSnapshot()),saved);
 assert.equal(h.c.isSpinning,true,'delayed finish does not settle after checkpoint');
});

test('reload preserves total games including BIG, without rebuilding it from the smaller role counters',()=>{
 const h=harness();h.c.load();Object.assign(h.c.stats,{totalSpins:1234,normalSpins:700,highSpins:100,totalFee:3702,totalPaid:4000});
 h.c.persistState();const again=harness(JSON.parse(h.storage.get('state')));again.c.load();
 assert.deepEqual(again.errors,[]);assert.equal(again.c.stats.totalSpins,1234);
 assert.equal(again.c.stats.totalFee,3702);assert.equal(again.c.stats.totalPaid,4000);
 assert.equal(again.c.stats.normalSpins,700);assert.equal(again.c.stats.highSpins,100);
});

test('corrupt preferences or either game copy still restore points, stock and an unpaid spin',()=>{
 const base=harness();base.c.load();base.c.stats.totalPaid=3456;
 base.c.normalState.flow=base.c.NovaArt.normalize({phase:'art',payoutVersion:1,remaining:'850',stock:'2'});
 base.c.currentSpin=spin(base.c);base.c.persistState();
 for(const key of ['preferences','state','resume'])for(const bad of ['{invalid','null','[]','42','{}','']){
  const h=harness();copyStorage(base,h);h.storage.set(key,bad);
  assert.equal(h.c.load(),true,key+' '+bad);
  assert.equal(h.c.stats.totalPaid,3456);assert.equal(h.c.normalState.flow.remaining,'850');assert.equal(h.c.normalState.flow.stock,'2');assert.equal(h.c.currentSpin.resolved.reward,15);
  vm.runInContext('Math.random=()=>{throw Error("saving must not redraw")}',h.c);
  assert(h.c.persistState());const again=harness();copyStorage(h,again);assert(again.c.load());assert.equal(again.c.stats.totalPaid,3456);
 }
});

test('no recoverable game copy blocks saving and leaves the original records untouched',()=>{
 const h=harness();h.storage.set('preferences',JSON.stringify({settings:{title:'NOVA'}}));h.storage.set('state','{broken');h.storage.set('resume','[]');
 const original=[...h.storage];assert.equal(h.c.load(),false);assert.equal(h.c.canUsePlayState(),false);
 assert.equal(h.c.persistState(),false);assert.deepEqual([...h.storage],original);
});

test('a restore migration exception cannot overwrite the saved source',()=>{
 const base=harness();base.c.load();base.c.persistState();const h=harness();copyStorage(base,h);
 h.c.NovaFlow={...h.c.NovaFlow,normalize(){throw Error('migration failed');}};
 const original=[...h.storage];assert.equal(h.c.load(),false);assert.equal(h.c.persistState(),false);assert.deepEqual([...h.storage],original);
});

test('admin setting updates commit both copies, preferences and pending runtime together',()=>{
 const h=harness(),c=h.c;c.load();c.settings.audioMuted=false;c.currentSpin=spin(c);c.persistState();
 c.readSettings=noop;c.log=noop;vm.runInContext(fn('applyAdminSettings'),c);
 c.applyAdminSettings({audioMuted:true});
 for(const key of ['state','resume','preferences']){const saved=JSON.parse(h.storage.get(key));assert.equal(saved.settings.audioMuted,true);assert(saved.savedAt>0);}
 const again=harness();copyStorage(h,again);assert(again.c.load());assert.equal(again.c.settings.audioMuted,true);assert.equal(again.c.currentSpin.resolved.reward,15);
 c.safeStorageSet=()=>false;c.applyAdminSettings({audioMuted:false});assert.equal(h.$('storageStatus').hidden,false);
});

test('a tab without ownership cannot overwrite state or apply an admin change',()=>{
 const a=harness();a.c.load();a.c.stats.totalPaid=4000;a.c.persistState();
 const stale=harness();copyStorage(a,stale);stale.c.load();stale.c.stats.totalPaid=3456;stale.c.playAccess={owned:()=>false};
 stale.c.readSettings=()=>{throw Error('non-owner must not read/apply controls');};stale.c.log=noop;
 vm.runInContext(fn('applyAdminSettings'),stale.c);
 const original=[...stale.storage];assert.equal(stale.c.persistState(),false);stale.c.applyAdminSettings({audioMuted:true});assert.deepEqual([...stale.storage],original);
});

test('first boot completes all migrations and reload retains the same active zone probabilities',()=>{
 const h=harness();h.c.load();assert.deepEqual(h.errors,[]);
 assert.equal(h.c.settings.initialSevenVersion,148);
 assert.deepEqual(
  {enabled:h.c.settings.completeEnabled,basis:h.c.settings.completeBasis,net:h.c.settings.completeLimitPt,my:h.c.settings.completeMyLimitPt},
  {enabled:false,basis:'none',net:0,my:0}
 );
 for(const key of ['totoHit','totoReset','soraHit','soraReset','soraUraHit','soraUraReset'])assert.equal(h.c.settings.novaArt[key],h.c.NovaArt.defaults[key],key);
 h.c.persistState();const saved=JSON.parse(h.storage.get('state'));assert.deepEqual(
  {enabled:saved.settings.completeEnabled,basis:saved.settings.completeBasis,net:saved.settings.completeLimitPt,my:saved.settings.completeMyLimitPt},
  {enabled:false,basis:'none',net:0,my:0}
 );
 const again=harness(saved);again.c.load();assert.deepEqual(again.errors,[]);
 assert.deepEqual(json(again.c.settings.novaArt),json(h.c.settings.novaArt));
});

test('saved custom settings, earned AT points/stocks and an unpaid BET survive actual save/load',()=>{
 const h=harness(),c=h.c;c.load();c.settings.novaArt.soraHit=.41;
 c.normalState={flow:c.NovaArt.normalize({phase:'art',payoutVersion:1,remaining:'850',stock:'2',queuedZones:['sora']}),replayFree:false};
 c.stats={...c.stats,totalSpins:11,normalSpins:10,totalFee:33,totalPaid:30};
 c.currentSpin=spin(c,{resolved:{reward:15,flowBefore:json(c.normalState.flow),flowAfter:{...json(c.normalState.flow),remaining:'835'}}});
 c.persistState();const again=harness(JSON.parse(h.storage.get('state')));again.c.load();assert.deepEqual(again.errors,[]);
 assert.equal(again.c.settings.novaArt.soraHit,.41);assert.equal(again.c.stats.totalSpins,11);assert.equal(again.c.stats.totalFee,33);assert.equal(again.c.stats.totalPaid,30);
 assert.equal(again.c.normalState.flow.remaining,'850');assert.equal(again.c.normalState.flow.stock,'2');
 assert.equal(again.c.currentSpin.resolved.reward,15);assert.deepEqual(json(again.c.currentSpin.bellNaviOrder),[2,0,1]);
});

test('resume preserves resolved prizes and reverse-stop decisions, excluding timers and live media',()=>{
 const {c}=harness();
 for(const result of ['BELL','REPLAY','NEBULA','STRONG_NOVA','MISS']){
  const original=spin(c,{result,aimStopOrder:[2,0],aimAligned:false,auditPressOrder:[2,0],auditStopOrder:[2],stopped:[false,false,true],pendingStopColumns:[['7','B','R'],null,null],resolved:{reward:result==='REPLAY'?0:15,artSetWon:1,aim:{symbol:'nebula',hit:true},flowAfter:{phase:'art',stock:'3'}}});
  original.audio=original;original.timer=99;
  const saved=c.NovaSpinResume.capture(original),restored=c.NovaSpinResume.restore(saved,c.RESULT);
  assert.equal(restored.result,result);assert.deepEqual(json(restored.resolved),original.resolved);assert.deepEqual(json(restored.aimStopOrder),[2,0]);assert.equal(restored.aimAligned,false);
  assert.deepEqual(json(restored.visualStopping),[true,false,false]);assert.equal(restored.audio,undefined);assert.equal(restored.timer,undefined);
  restored.resolved.reward=999;assert.notEqual(saved.resolved.reward,999);
 }
 assert.equal(c.NovaSpinResume.restore(null,c.RESULT),null);
 assert.equal(c.NovaSpinResume.restore({version:1,result:'unknown'},c.RESULT),null);
 assert.equal(c.NovaSpinResume.capture({...spin(c),finishing:true}),null);
});

test('resume preserves a bell navigation failure without serializing live audio objects',()=>{
 const {c}=harness(),liveAudio={pause:noop,currentTime:3};
 const original=spin(c,{bellNaviFailed:true,bellNaviFailurePlayed:true,bellNaviVoiceAudios:[liveAudio]});
 const saved=c.NovaSpinResume.capture(original),restored=c.NovaSpinResume.restore(saved,c.RESULT);
 assert.equal(saved.bellNaviFailed,true);assert.equal(saved.bellNaviFailurePlayed,true);
 assert.equal(restored.bellNaviFailed,true);assert.equal(restored.bellNaviFailurePlayed,true);
 assert.equal(saved.bellNaviVoiceAudios,undefined);assert.equal(restored.bellNaviVoiceAudios,undefined);
});

test('UI resume does not BET or redraw and lands already-pressed reels in the original order',()=>{
 const h=harness(),c=h.c;c.load();
 c.currentSpin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin(c,{stopped:[false,false,true],auditPressOrder:[2,0,1],pendingStopColumns:[['R','B','7'],['7','B','R'],null]})),c.RESULT);
 const before=json(c.stats),calls=[];c.stopSingleReel=(i,opt)=>calls.push([i,opt]);
 vm.runInContext('Math.random=()=>{throw Error("resume must not redraw")}',c);
 assert(c.restorePendingSpin());assert.deepEqual(json(c.stats),before);assert.deepEqual(c.shownOrder,[2,0,1]);assert.equal(c.spinCanStop,true);
 h.timers.forEach(f=>f());assert.deepEqual(calls.map(([i])=>i),[0,1]);assert.deepEqual(json(calls[0][1].visualColumn),['R','B','7']);
 assert(calls.every(([,o])=>o.visualReady));assert(h.$('stop2').disabled);
});

function settlementHarness(){
 const h=harness(),c=h.c;c.load();
 c.playUpperAtEntryVoice=noop;
 for(const name of ['showOverlay','showCzLamp','playArtEndSound','pauseNormalBgm','playNormalBgm','stopAutoPlay','startRogiThirdStopHold','stopGekiatsuEffect','updatePremiumBigReelMovie','hideDevilRushEntryEffect','clearReelVideos','scheduleNextSpeedToBonus','scheduleNextAuto','hideBattleIntro','ensureBarBgmContinuing'])c[name]=noop;
 c.lineName=()=>'';c.shouldHoldRogiThirdStopEffect=()=>false;c.isAtFirstHitForAuto=()=>false;c.novaPatternFromGrid=()=>null;c.NOVA_PATTERN_NAMES={};c.scheduleOumaZeroChain=()=>false;c.isGoraiZoneActive=()=>false;c.isATypeBonusComplete=()=>false;
 c.applyNormalResult=(_result,resolved)=>{c.stats.totalPaid+=resolved.reward;c.stats.normalSpins++;c.normalState.flow=json(resolved.flowAfter);c.persistState();};
 c.applyResult=(_result,resolved)=>{c.stats.totalPaid+=resolved.reward;c.session.paid+=resolved.reward;c.session.bonusArtSets+=resolved.artSetWon||0;c.persistState();};
 vm.runInContext(fn('finishSpin'),c);return h;
}

test('third-stop reload settles a normal/CZ/AT result once and commits paid state without a pending spin',()=>{
 for(const phase of ['normal','cz','art']){
  const h=settlementHarness(),c=h.c;c.stats.totalFee=3;c.stats.totalSpins=1;
  c.currentSpin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin(c,{stopped:[true,true,true],resolved:{reward:15,flowBefore:{phase},flowAfter:{phase}}})),c.RESULT);
  c.restorePendingSpin();assert.equal(c.stats.totalPaid,15);assert.equal(c.stats.totalFee,3);assert.equal(c.stats.normalSpins,1);assert.equal(c.currentSpin,null);
  const saved=JSON.parse(h.storage.get('state'));assert.equal(saved.runtimeState.pendingSpin,null);assert.equal(saved.stats.totalPaid,15);
  c.finishSpin('BELL',{reward:15});assert.equal(c.stats.totalPaid,15);
  const again=harness(saved);again.c.load();assert.deepEqual(again.errors,[]);assert.equal(again.c.currentSpin,null);assert.equal(again.c.stats.totalPaid,15);assert.equal(again.c.stats.totalSpins,1);
 }
});

test('BIG unpaid award and zero-game failure settle once without another cost',()=>{
 const h=settlementHarness(),c=h.c;c.session={active:true,phase:'a_type_bonus',remain:10,paid:30,bonusArtSets:0};c.stats.totalFee=9;
 c.currentSpin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin(c,{normalActiveAtStart:false,aTypeBonusActiveAtStart:true,stopped:[true,true,true],resolved:{reward:15,artSetWon:1}})),c.RESULT);
 c.restorePendingSpin();assert.equal(c.session.paid,45);assert.equal(c.session.bonusArtSets,1);assert.equal(c.stats.totalFee,9);assert.equal(JSON.parse(h.storage.get('state')).runtimeState.pendingSpin,null);
 c.currentSpin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin(c,{stopped:[true,true,true],resolved:{reward:0,oumaFailed:true}})),c.RESULT);
 c.restorePendingSpin();assert.equal(c.stats.totalPaid,15);assert.equal(c.stats.totalFee,9);assert.equal(c.currentSpin,null);
});

test('a resumed third-stop sortie announces its saved character without redrawing or charging another BET',()=>{
 const h=settlementHarness(),c=h.c;c.stats.totalFee=3;c.stats.totalSpins=1;
 c.currentSpin=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin(c,{stopped:[true,true,true],resolved:{reward:8,researchSortie:{won:true,zone:'ura_sora'},flowBefore:{phase:'art'},flowAfter:{phase:'art',queuedZones:['ura_sora']}}})),c.RESULT);
 vm.runInContext('Math.random=()=>{throw Error("resume must not redraw")}',c);
 assert(c.restorePendingSpin());assert.deepEqual(h.voices,['assets/media/nova/sortie-award-sora.wav']);
 assert.equal(c.stats.totalFee,3);assert.equal(c.stats.totalPaid,8);assert.equal(c.currentSpin,null);
 assert(!c.restorePendingSpin());assert.equal(h.voices.length,1);
});

test('a mid-settlement save cannot overwrite the last recoverable result',()=>{
 const h=harness(),c=h.c;c.load();c.currentSpin=spin(c);c.persistState();const before=h.storage.get('state');
 c.currentSpin.finishing=true;c.stats.totalPaid=15;assert.equal(c.persistState(),false);assert.equal(h.storage.get('state'),before);
 c.currentSpin=null;c.persistState();const saved=JSON.parse(h.storage.get('state'));assert.equal(saved.stats.totalPaid,15);assert.equal(saved.runtimeState.pendingSpin,null);
});

test('replay entitlement and zero-game cost exemptions survive pending saves',()=>{
 for(const replayFree of [false,true])for(const zero of [false,true]){
  const h=harness(),c=h.c;c.load();c.normalState={replayFree,flow:zero?{...c.NovaArt.enter({setting:1},()=>.5),zero:true}:c.NovaFlow.normalize(null)};
  c.stats.totalFee=81;c.currentSpin=spin(c,{result:'REPLAY',resolved:{reward:0,flowAfter:json(c.normalState.flow)}});c.persistState();
  const next=harness(JSON.parse(h.storage.get('state')));next.c.load();assert.deepEqual(next.errors,[]);assert.equal(next.c.stats.totalFee,81);assert.equal(next.c.normalState.replayFree,replayFree);assert.equal(!!next.c.normalState.flow.zero,zero);
 }
});

test('displayed RTP identifies the uncapped verification profile; BIG fields still use the engine target',()=>{
 const {c}=harness();vm.runInContext(fn('targetRtpText'),c);
 c.NovaRtpCurrent={status:'ready',gamesPerSetting:1000000000,conditions:'2.5億G×4系列合算・MY／差枚停止なし',settings:[1,2,3,4,5,6].map(setting=>({setting,rtpPct:94+setting}))};
 for(let setting=1;setting<=6;setting++){
   assert.equal(c.targetRtpText(setting),`${(94+setting).toFixed(2)}%（2.5億G×4系列合算・MY／差枚停止なし）`);
 }
 c.NovaRtpCurrent.status='pending';assert.match(c.targetRtpText(6),/試算待ち/);
 delete c.NovaRtpCurrent;assert.match(c.targetRtpText(6),/試算待ち/);
 assert.equal(c.NovaArt.bonusTarget(),50);
 for(const field of ['midMulInput','bigMulInput','bigAddInput'])assert(fn('applySettings').includes('$("'+field+'").value = NovaArt.bonusTarget()'));
});

test('preferences alone cannot mask a failed game save; successful retry clears the warning',()=>{
 const h=harness(),c=h.c;c.load();
 c.stats.totalPaid=480;c.normalState.flow=c.NovaArt.normalize({phase:'art',remaining:'850',stock:'2',payoutVersion:1});
 const before=json({stats:c.stats,normal:c.normalState});
 const write=c.safeStorageSet;
 c.safeStorageSet=(key,value)=>key==='preferences'&&write(key,value);
 vm.runInContext('Math.random=()=>{throw Error("saving must not draw")}',c);
 assert.equal(c.persistState(),false);assert.equal(h.$('storageStatus').hidden,false);
 assert.match(h.$('storageStatusMessage').textContent,/遊技状態を保存できません/);
 assert.deepEqual(json({stats:c.stats,normal:c.normalState}),before);
 c.safeStorageSet=write;assert.equal(c.persistState(),true);assert.equal(h.$('storageStatus').hidden,true);
 const restored=harness(JSON.parse(h.storage.get('state')));restored.c.load();
 assert.equal(restored.c.stats.totalPaid,480);assert.equal(restored.c.normalState.flow.remaining,'850');assert.equal(restored.c.normalState.flow.stock,'2');
});

test('compact-only and full-only game saves remain recoverable',()=>{
 for(const allowed of ['resume','state']){
  const h=harness(),c=h.c;c.load();c.stats.totalPaid=975;
  const write=c.safeStorageSet;c.safeStorageSet=(key,value)=>key===allowed&&write(key,value);
  assert.equal(c.persistState(),true);
  assert.match(h.$('storageStatusMessage').textContent,/遊技状態は保存済み/);
  const restored=harness();restored.storage.set(allowed,h.storage.get(allowed));restored.c.load();
  assert.equal(restored.c.stats.totalPaid,975);assert.deepEqual(restored.errors,[]);
 }
});

test('all storage writes failing reports an error without modifying the running game',()=>{
 const h=harness(),c=h.c;c.load();const before=json({stats:c.stats,normal:c.normalState});
 c.safeStorageSet=()=>false;assert.equal(c.persistState(),false);
 assert.equal(h.$('storageStatus').hidden,false);assert.deepEqual(json({stats:c.stats,normal:c.normalState}),before);
});

test('custom lottery suppresses reference RTP; live COMPLETE and presentation preferences do not',()=>{
 const {c}=harness();c.load();vm.runInContext(fn('targetRtpText'),c);
 const standard=json(c.settings);
 assert(c.NovaBalance.usesStandardSettings(standard));
 for(const change of [
  {novaFlow:{...standard.novaFlow,czChance:.99}},
  {novaNormal:{...standard.novaNormal,highMultiplier:3}},
  {novaArt:{...standard.novaArt,soraHit:.41}}
 ]){
  c.settings={...standard,...change};
  for(let n=1;n<=6;n++)assert.equal(c.targetRtpText(n),'未試算（独自設定）');
 }
 c.NovaRtpCurrent={status:'ready',gamesPerSetting:1000000000,conditions:'2.5億G×4系列合算・MY／差枚停止なし',settings:[{setting:6,rtpPct:114.123}]};
 c.settings={...standard,audioMuted:true,voiceVolume:.1,autoDelay:2,title:'表示変更',completeEnabled:true,completeBasis:'my',completeMyLimitPt:19000,completeLimitPt:10000};
 assert.equal(c.targetRtpText(6),'114.12%（2.5億G×4系列合算・MY／差枚停止なし）');
 c.settings={...standard,novaFlow:{...standard.novaFlow,czChance:String(c.NovaFlow.defaults.czChance)}};
 assert(c.NovaBalance.usesStandardSettings(c.settings));
});

test('pre-update pending replay finishes with one legacy free BET; new saves retain cash accounting',()=>{
 const base=harness();base.c.load();base.c.currentSpin=spin(base.c,{result:'REPLAY',resolved:{reward:0,flowBefore:{phase:'normal'},flowAfter:{phase:'normal'}}});base.c.persistState();
 const old=JSON.parse(base.storage.get('state'));delete old.runtimeState.replayAccountingVersion;
 const h=harness(old);assert(h.c.load());assert.equal(h.c.currentSpin.resolved.replayAccounting,'legacy');
 h.c.persistState();const again=harness(JSON.parse(h.storage.get('state')));assert(again.c.load());assert.equal(again.c.currentSpin.resolved.replayAccounting,'legacy');
 const modern=JSON.parse(base.storage.get('state'));modern.runtimeState.pendingSpin.resolved.reward=3;
 const cash=harness(modern);cash.c.load();assert.equal(cash.c.currentSpin.resolved.reward,3);assert.notEqual(cash.c.currentSpin.resolved.replayAccounting,'legacy');
});
test('legacy MY-only lock is released on restore without resetting stats, quota or stocks',()=>{
 for(const net of [-5000,-1001,10000]){
  const h=harness();h.c.load();h.c.completeTrialState={lowestNet:-20000,locked:true,lockedSetting:1,reason:'my',completeProfit:net,completeMy:15000,maxMy:15000};h.c.stats={...h.c.stats,totalFee:20000,totalPaid:20000+net,slumpHistory:[]};h.c.normalState.flow=h.c.NovaArt.normalize({phase:'art',remaining:'850',stock:'2',queuedZones:['sora'],payoutVersion:1});h.c.persistState();
  const again=harness(JSON.parse(h.storage.get('state')));assert(again.c.load());assert.deepEqual(again.errors,[]);
  assert.equal(again.c.completeTrialState.lowestNet,-20000);assert.equal(again.c.completeTrialState.locked,false);assert.equal(again.c.completeTrialState.lockedSetting,0);assert.equal(again.c.completeTrialState.completeProfit,0);assert.equal(again.c.completeTrialState.reason,undefined);assert.equal(again.c.completeTrialState.completeMy,undefined);
  assert.equal(again.c.stats.totalPaid-h.c.stats.totalFee,net);assert.equal(again.c.normalState.flow.remaining,'850');assert.equal(again.c.normalState.flow.stock,'2');assert.deepEqual(json(again.c.normalState.flow.queuedZones),['sora']);
  again.c.persistState();const third=harness(JSON.parse(again.storage.get('state')));third.c.load();assert.equal(third.c.completeTrialState.locked,false);assert.equal(third.c.completeTrialState.reason,undefined);assert.equal(third.c.completeTrialState.completeMy,undefined);
 }
});
test('saved legacy net-completion is released below MY19k',()=>{
 const h=harness();h.c.load();h.c.completeTrialState={locked:true,reason:'net',completeProfit:10000};h.c.persistState();
 const again=harness(JSON.parse(h.storage.get('state')));assert(again.c.load());assert(!again.c.completeTrialState.locked);assert.equal(again.c.completeTrialState.reason,undefined);
});

test('reference audio mix migrates once to all50 without changing saved play or mute',()=>{
 const h=harness();h.c.load();Object.assign(h.c.settings,{masterVolume:.25,bgmVolume:.34,sfxVolume:.5,voiceVolume:.64,payoutVolume:.5,audioMuted:true});h.c.stats.totalPaid=321;delete h.c.settings.audioCalibrationVersion;h.c.persistState();
 const again=harness(JSON.parse(h.storage.get('state')));again.c.load();for(const key of ['masterVolume','bgmVolume','sfxVolume','voiceVolume','payoutVolume'])assert.equal(again.c.settings[key],.5);assert.equal(again.c.settings.audioMuted,true);assert.equal(again.c.stats.totalPaid,321);assert.equal(again.c.settings.audioCalibrationVersion,1);
 again.c.settings.voiceVolume=.7;again.c.persistState();const third=harness(JSON.parse(again.storage.get('state')));third.c.load();assert.equal(third.c.settings.voiceVolume,.7);
});

test('reel layout version survives repeat saves so the game can migrate obsolete visual windows',()=>{
 const {c}=harness(),fresh=c.NovaSpinResume.capture(spin(c));
 assert.equal(fresh.reelLayoutVersion,3);
 const v2=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin(c,{reelLayoutVersion:2})),c.RESULT);
 assert.equal(v2.reelLayoutVersion,2);assert.equal(c.NovaSpinResume.capture(v2).reelLayoutVersion,2);
 delete fresh.reelLayoutVersion;
 const restored=c.NovaSpinResume.restore(fresh,c.RESULT);assert.equal(restored.reelLayoutVersion,1);
 assert.equal(c.NovaSpinResume.capture(restored).reelLayoutVersion,1);
});

test('retired symbol tokens are decoded on restore without changing the paid spin or stop order',()=>{
 const {c}=harness();
 const original=spin(c,{reelLayoutVersion:3,grid:[['🐘','🤡','🍇'],['7','BAR','NEBULA'],['NOVA_0_0','NOVA_1_1','NOVA_2_2']],
  pendingStopColumns:[['🐘','🔔','🤡'],null,null],auditStopOrder:[1],stopped:[false,true,false]});
 const saved=c.NovaSpinResume.capture(original),before=JSON.stringify(saved);
 const restored=c.NovaSpinResume.restore(saved,c.RESULT);
 assert.deepEqual(json(restored.grid),[['REPLAY','REPLAY','🔔'],['7','BAR','NEBULA'],['🔔','BAR','REPLAY']]);
 assert.deepEqual(json(restored.pendingStopColumns[0]),['REPLAY','🔔','REPLAY']);
 for(const key of ['resolved','stopped','bellNaviOrder','auditStopOrder'])assert.deepEqual(json(restored[key]),json(original[key]));
 assert.equal(restored.result,original.result);assert.equal(restored.reelLayoutVersion,3);assert.equal(JSON.stringify(saved),before);
});

test('CZ reload hides rainbow before an all-stopped spin re-enters PUSH wait',()=>{
 const {c,$}=harness();
 const saved=c.NovaSpinResume.capture(spin(c,{reelLayoutVersion:3,stopped:[true,true,true],resolved:{
  reward:0,flowBefore:{phase:'cz'},flowAfter:{phase:'normal'},czLamp:{stage:8,totalGames:15,remaining:1,timingSeed:42},czCompleted:true,bonusHit:true,czLampAtBet:8
 }}));
 c.currentSpin=c.NovaSpinResume.restore(saved,c.RESULT);
 let waitCalls=0,finishCalls=0;
 c.NovaCzPresentation.wait=resolved=>{waitCalls++;assert.equal(resolved,c.currentSpin.resolved);return true;};
 c.finishSpin=(result,resolved)=>{finishCalls++;c.finishLamp={...$('machine').dataset};c.NovaCzPresentation.wait(resolved);};
 assert.equal(c.restorePendingSpin(),true);
 assert.equal(c.restoredReelLayout,3);assert.equal(finishCalls,1);assert.equal(waitCalls,1);
 assert.equal(c.finishLamp.czLamp,'7');assert.equal(c.finishLamp.czColor,'red');assert.equal(c.finishLamp.czRainbow,'false');assert.match(c.finishLamp.czOrder,/^([^,]+,){7}[^,]+$/);
});
