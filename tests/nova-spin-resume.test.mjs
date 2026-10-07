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
  safeStorageGet:key=>storage.has(key)?storage.get(key):null,safeStorageSet:(key,value)=>{storage.set(key,value);return true;},
  storageRestoreBlocked:false,playAccess:{owned:()=>true},
  PREFERENCES_STORAGE_KEY:'preferences',STORAGE_KEY:'state',STORAGE_RESUME_KEY:'resume',
  A_TYPE_MODE:true,AUDIO_BALANCE_VERSION:12,ROLE_STAT_COUNTER_VERSION:1,DEFAULT_COMPLETE_LIMIT_PT:10000,DEFAULT_MASTER_VOLUME:.7,DEFAULT_BGM_VOLUME:.2,DEFAULT_SFX_VOLUME:.3,DEFAULT_PAYOUT_VOLUME:.3,
  SETTING:{1:{},2:{},3:{},4:{},5:{},6:{}},RESULT:Object.fromEntries(['BELL','REPLAY','NEBULA','MISS','BIG','STRONG_NOVA'].map(k=>[k,{name:k,label:k,cls:k}])),
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),normalizeMachineTitle:v=>v,normalizeBonusAfterGames:v=>Number(v)||0,normalizeNovaRisingRemain:v=>Number(v)||0,normalizeForceResult:v=>v,isCompleteLockEnabled:()=>true,pickATypeBonusBgm:()=>({src:'bonus.wav'}),
  currentSpin:null,isSpinning:false,spinCanStop:false,spinWaitTimer:null,autoPlay:false,speedToBonusActive:false,
  jagChainCount:null,jagLastGamePayout:0,jagLastBonusPayout:0,jagChanceHold:false,forceResult:'',forcePremiumEffect:false,pendingForceResult:'',pendingBonusStartOptions:null,devilZoneConfirmIntroPending:false,pendingDevilRushEntryEffect:'',speedFrameOffHold:false,barBgmActive:false,barBgmMode:'',battleBgmActive:false,rogiBgmMuted:false,
  syncNovaProgress:noop,auditCapture:noop,$,document:{getElementById:$},reels:[0,1,2].map(i=>$('reel'+i)),stopBtns:[0,1,2].map(i=>$('stop'+i)),
  setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout:noop,REEL_STRIPS:[[],[],[]],currentReelTopIndex:()=>0,cellHtml:noop,
  NovaAim:{bet:noop,stop:noop},NovaSortie:{begin:noop,eligible:()=>false},NovaInitialDuo:{begin:noop,stop:noop},NovaLadder:{bet:noop,stop:noop},NovaReelMotion:{start:noop},
  setReelColumn:noop,showZoneRoulette:noop,renderCzPrelude:noop,syncCzPreludeGlow:noop,updateDisplay:noop,syncCabinetControlState:noop,prepareManualBonusOutcome:noop,startOumaReverseAudio:noop,showCheckpointResultIfReady:()=>false
 });
 for(const file of ['nova-tuning.js','nova-art.js','nova-normal.js','nova-flow.js','nova-balance.js','nova-spin-resume.js','nova-history.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});
 // Navigation renderer is tested separately with DOM stubs; restore must not draw an order.
 c.NovaBellNavi={restore:spin=>{c.shownOrder=json(spin.bellNaviOrder);},clear:noop};
 for(const name of ['reduceSlumpPoints','canUsePlayState','load','runtimeStateForStorage','compactStatsForResume','updateStorageStatus','persistState','restorePendingSpin'])vm.runInContext(fn(name),c);
 return {c,storage,errors,timers,$};
}
function spin(c,overrides={}){
 return {result:'BELL',spec:c.RESULT.BELL,lineRow:1,grid:[['7','R','B'],['B','B','B'],['R','7','R']],resolved:{reward:15,flowBefore:{phase:'normal'},flowAfter:{phase:'normal'}},stopped:[false,false,false],normalActiveAtStart:true,bellNaviOrder:[2,0,1],...overrides};
}

function copyStorage(from,to){for(const [key,value] of from.storage)to.storage.set(key,value);}

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

test('displayed RTP uses the adopted 50k estimates and BIG fields use the engine target',()=>{
 const {c}=harness();vm.runInContext(fn('targetRtpText'),c);
 const estimates=JSON.parse(fs.readFileSync('docs/positive-net-50000-20261007.json')).settings.map(s=>(100*s.after.rtp).toFixed(2));
 for(let setting=1;setting<=6;setting++){
  assert(c.targetRtpText(setting).startsWith(estimates[setting-1]+'%'));
  assert(c.targetRtpText(setting).includes('5万G×1000回'));
 }
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

test('custom lottery and complete limits suppress standard RTP; presentation preferences do not',()=>{
 const {c}=harness();c.load();vm.runInContext(fn('targetRtpText'),c);
 const standard=json(c.settings);
 assert(c.NovaBalance.usesStandardSettings(standard));
 for(const change of [
  {novaFlow:{...standard.novaFlow,czChance:.99}},
  {novaNormal:{...standard.novaNormal,highMultiplier:3}},
  {novaArt:{...standard.novaArt,soraHit:.41}},
  {completeLimitPt:20000}
 ]){
  c.settings={...standard,...change};
  for(let n=1;n<=6;n++)assert.equal(c.targetRtpText(n),'未試算（独自設定）');
 }
 c.settings={...standard,audioMuted:true,voiceVolume:.1,autoDelay:2,title:'表示変更'};
 assert(c.targetRtpText(6).startsWith((100*c.NovaBalance.profile(6).measuredRtp).toFixed(2)+'%'));
 c.settings={...standard,novaFlow:{...standard.novaFlow,czChance:String(c.NovaFlow.defaults.czChance)}};
 assert(c.NovaBalance.usesStandardSettings(c.settings));
});
