import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const json=value=>JSON.parse(JSON.stringify(value));
const noop=()=>{};
function harness(saved=null){
 const storage=new Map(saved?[['state',JSON.stringify(saved)]]:[]),errors=[],timers=[],elements=new Map();
 const $=id=>{if(!elements.has(id))elements.set(id,{dataset:{},classList:{toggle:noop},disabled:false,textContent:''});return elements.get(id);};
 const c=vm.createContext({console:{warn:(...args)=>errors.push(args)},settings:{setting:1,title:'NOVA',audioBalanceVersion:12,masterVolume:.7},stats:{roleStatVersion:1,totalSpins:0,normalSpins:0,highSpins:0,totalFee:0,totalPaid:0,slumpHistory:[]},normalState:{},session:{active:false},completeTrialState:{},
  safeStorageGet:key=>storage.get(key)||null,safeStorageSet:(key,value)=>{storage.set(key,value);return true;},
  PREFERENCES_STORAGE_KEY:'preferences',STORAGE_KEY:'state',STORAGE_RESUME_KEY:'resume',
  A_TYPE_MODE:true,AUDIO_BALANCE_VERSION:12,ROLE_STAT_COUNTER_VERSION:1,DEFAULT_COMPLETE_LIMIT_PT:10000,DEFAULT_MASTER_VOLUME:.7,DEFAULT_BGM_VOLUME:.2,DEFAULT_SFX_VOLUME:.3,DEFAULT_PAYOUT_VOLUME:.3,
  SETTING:{1:{},2:{},3:{},4:{},5:{},6:{}},RESULT:Object.fromEntries(['BELL','REPLAY','NEBULA','MISS','BIG','STRONG_NOVA'].map(k=>[k,{name:k,label:k,cls:k}])),
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),normalizeMachineTitle:v=>v,normalizeBonusAfterGames:v=>Number(v)||0,normalizeNovaRisingRemain:v=>Number(v)||0,normalizeForceResult:v=>v,isCompleteLockEnabled:()=>true,pickATypeBonusBgm:()=>({src:'bonus.wav'}),
  currentSpin:null,isSpinning:false,spinCanStop:false,spinWaitTimer:null,autoPlay:false,speedToBonusActive:false,
  jagChainCount:null,jagLastGamePayout:0,jagLastBonusPayout:0,jagChanceHold:false,forceResult:'',forcePremiumEffect:false,pendingForceResult:'',pendingBonusStartOptions:null,devilZoneConfirmIntroPending:false,pendingDevilRushEntryEffect:'',speedFrameOffHold:false,barBgmActive:false,barBgmMode:'',battleBgmActive:false,rogiBgmMuted:false,
  syncNovaProgress:noop,auditCapture:noop,$,document:{getElementById:$},reels:[0,1,2].map(i=>$('reel'+i)),stopBtns:[0,1,2].map(i=>$('stop'+i)),
  setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout:noop,REEL_STRIPS:[[],[],[]],currentReelTopIndex:()=>0,cellHtml:noop,
  NovaAim:{bet:noop,stop:noop},NovaInitialDuo:{begin:noop,stop:noop},NovaLadder:{bet:noop,stop:noop},NovaReelMotion:{start:noop},
  setReelColumn:noop,renderCzPrelude:noop,syncCzPreludeGlow:noop,updateDisplay:noop,syncCabinetControlState:noop,prepareManualBonusOutcome:noop,startOumaReverseAudio:noop
 });
 for(const file of ['nova-tuning.js','nova-art.js','nova-normal.js','nova-flow.js','nova-balance.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
 // Navigation renderer is tested separately with DOM stubs; restore must not draw an order.
 c.NovaBellNavi={restore:spin=>{c.shownOrder=json(spin.bellNaviOrder);},clear:noop};
 for(const name of ['load','runtimeStateForStorage','compactStatsForResume','persistState','restorePendingSpin'])vm.runInContext(fn(name),c);
 return {c,storage,errors,timers,$};
}
function spin(c,overrides={}){
 return {result:'BELL',spec:c.RESULT.BELL,lineRow:1,grid:[['7','R','B'],['B','B','B'],['R','7','R']],resolved:{reward:15,flowBefore:{phase:'normal'},flowAfter:{phase:'normal'}},stopped:[false,false,false],normalActiveAtStart:true,bellNaviOrder:[2,0,1],...overrides};
}

test('first boot completes all migrations and reload retains the same active zone probabilities',()=>{
 const h=harness();h.c.load();assert.deepEqual(h.errors,[]);
 assert.equal(h.c.settings.initialSevenVersion,148);
 for(const key of ['totoHit','totoReset','soraHit','soraReset','soraUraHit','soraUraReset'])assert.equal(h.c.settings.novaArt[key],h.c.NovaArt.defaults[key],key);
 h.c.persistState();const again=harness(JSON.parse(h.storage.get('state')));again.c.load();assert.deepEqual(again.errors,[]);
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

test('displayed RTP uses the current approved estimates and BIG fields use the engine target',()=>{
 const {c}=harness();vm.runInContext(fn('targetRtpText'),c);
 const estimates=['94.27','96.14','98.70','100.25','105.29','114.02'];
 for(let setting=1;setting<=6;setting++){
  assert(c.targetRtpText(setting).startsWith(estimates[setting-1]+'%'));
  assert(c.targetRtpText(setting).includes('×'+(setting===2||setting===4?600:500)+'回'));
 }
 assert.equal(c.NovaArt.bonusTarget(),50);
 for(const field of ['midMulInput','bigMulInput','bigAddInput'])assert(fn('applySettings').includes('$("'+field+'").value = NovaArt.bonusTarget()'));
});
