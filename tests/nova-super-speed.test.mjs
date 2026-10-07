import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(){
 const timers=new Map();let id=0;
 const button={classList:{toggle(name,value){button[name]=value;}},setAttribute(name,value){button[name]=value;}};
 const debugButton={setAttribute(){}},debugStatus={};
 const c=vm.createContext({superFullAuto:false,superSpeedActive:false,superSpeedPending:false,superSpeedAllowed:false,superSpeedDebugAllowed:false,superSpeedPermissionTimer:null,superSpeedNextBetAt:0,performance:{now:()=>1000},
  SLOT_DEBUG_ENABLED:true,VERTEX_CONTROLLER_ENABLED:false,SLOT_PLAY_SESSION:false,
  normalState:{flow:{phase:'normal'}},session:{active:false},autoPlay:false,autoTimer:null,isSpinning:false,
  debugFastSpinActive:false,bonusEndBgmPlaying:false,bonusConfirmSoundPlaying:false,
  canUsePlayState:()=>true,isCompleteTrialLocked:()=>false,$:id=>({superSpeedBtn:button,debugSuperSpeedBtn:debugButton,debugSuperSpeedStatus:debugStatus}[id]),
  setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
  stopSpeedToBonus(){},stopAutoPlay(reason){c.autoPlay=false;c.superFullAuto=false;c.superSpeedActive=false;c.superSpeedPending=false;c.reason=reason;},
  startAutoPlay(){c.autoPlay=true;},updateAutoUi(){c.updateSuperSpeedUi();},log(){},queueAutoStep(){},AUTO_SPEED_MULTIPLIER:2,MIN_SPIN_WAIT_MS:500,
  settings:{autoDelay:.5}});
 vm.runInContext(fs.readFileSync('nova-super-speed.js','utf8'),c);
 for(const name of ['canDebugSuperSpeed','hasSuperSpeedPermission','setSuperSpeedDebugPermission','superSpeedUnavailableReason','updateSuperSpeedUi','applySuperSpeedPermission','stopSuperSpeedIfNeeded','startSuperSpeed','autoScaledDelayMs','autoDelayMs','autoStopDelayMs','autoPollDelayMs'])vm.runInContext(fn(name),c);
 return {c,button,debugButton,debugStatus,timers};
}

test('standalone debug permission enables the button without starting AUTO, and OFF stops it',()=>{
 const {c,button,debugButton,timers}=setup();
 c.setSuperSpeedDebugPermission(true);
 assert.equal(button.disabled,false);assert.equal(c.autoPlay,false);assert.equal(c.superSpeedAllowed,false);
 assert.equal(debugButton.textContent,'超ハイスピード使用許可：ON');assert.equal(timers.size,0);
 c.startSuperSpeed();assert.equal(c.superSpeedActive,true);
 c.applySuperSpeedPermission(false);assert.equal(c.superSpeedActive,true,'server state does not overwrite standalone debug permission');
 c.setSuperSpeedDebugPermission(false);assert.equal(c.autoPlay,false);assert.equal(button.disabled,true);
 assert.equal(setup().c.superSpeedDebugAllowed,false,'fresh page starts with debug permission OFF');
});

test('debug permission cannot bypass managed play or disabled debugging',()=>{
 for(const flags of [{VERTEX_CONTROLLER_ENABLED:true},{SLOT_PLAY_SESSION:true},{SLOT_DEBUG_ENABLED:false}]){
  const {c,button,debugButton}=setup();Object.assign(c,flags);
  c.setSuperSpeedDebugPermission(true);assert.equal(c.superSpeedDebugAllowed,false);assert.equal(debugButton.disabled,true);assert.equal(button.disabled,true);
  c.superSpeedDebugAllowed=true;assert.equal(c.hasSuperSpeedPermission(),false);
  c.startSuperSpeed();assert.equal(c.autoPlay,false);
  c.applySuperSpeedPermission(true);c.startSuperSpeed();assert.equal(c.superSpeedActive,true);
  c.applySuperSpeedPermission(false);assert.equal(c.autoPlay,false);
 }
});

test('AT confirmation keeps full-AUTO selected and the super button can cancel it during AT',()=>{
 const {c,button}=setup();c.setSuperSpeedDebugPermission(true);c.startSuperSpeed();
 c.session={active:true,bonusArtSets:1};assert.equal(c.stopSuperSpeedIfNeeded(),false);assert.equal(c.autoPlay,true);
 assert.equal(c.superSpeedActive,false);assert.equal(c.superFullAuto,true);assert.equal(button.on,true);assert.equal(button['aria-pressed'],'true');assert.equal(button.disabled,false);
 c.startSuperSpeed();assert.equal(c.autoPlay,false);assert.equal(c.superFullAuto,false);assert.equal(c.superSpeedActive,false);
 c.session={active:false};c.normalState.flow.phase='art';c.startSuperSpeed();assert.equal(c.autoPlay,false);
});

test('manual and AUTO spins accept super speed immediately but keep current spin timing',()=>{
 for(const autoPlay of [false,true]){
  const {c,button}=setup();c.isSpinning=true;c.autoPlay=autoPlay;c.setSuperSpeedDebugPermission(true);
  assert.equal(button.disabled,false,'permission clears disabled state during a spin');
  const delay=c.autoDelayMs();c.startSuperSpeed();
  assert.equal(c.autoPlay,true);assert.equal(c.superSpeedPending,true);assert.equal(c.superSpeedActive,false);
  assert.equal(c.autoDelayMs(),delay,'in-flight game retains its previous speed');
  assert.match(button.title,/次のゲーム/);assert.equal(c.stopSuperSpeedIfNeeded(),false);assert.equal(c.superSpeedPending,true);
  c.isSpinning=false;c.stopSuperSpeedIfNeeded();
  assert.equal(c.superSpeedPending,false);assert.equal(c.superSpeedActive,true);assert.equal(c.autoDelayMs(),delay/6);
 }
});

test('pending speed cancels on user STOP, debug OFF, server OFF or an AT win in the current spin',()=>{
 for(const end of ['user','debug','server','AT']){
  const {c}=setup();c.isSpinning=true;
  if(end==='server')c.applySuperSpeedPermission(true);else c.setSuperSpeedDebugPermission(true);
  c.startSuperSpeed();assert.equal(c.superSpeedPending,true);
  if(end==='user')c.startSuperSpeed();
  if(end==='debug')c.setSuperSpeedDebugPermission(false);
  if(end==='server')c.applySuperSpeedPermission(false);
  if(end==='AT'){c.session={active:true,bonusArtSets:1};c.isSpinning=false;c.stopSuperSpeedIfNeeded();}
  assert.equal(c.superSpeedPending,false);assert.equal(c.superSpeedActive,false);assert.equal(c.autoPlay,end==='AT');
 }
});

test('pending speed waits through result audio and disabled state explains AT restriction',()=>{
 const {c,button,debugStatus}=setup();c.isSpinning=true;c.setSuperSpeedDebugPermission(true);c.startSuperSpeed();
 c.isSpinning=false;c.bonusConfirmSoundPlaying=true;c.stopSuperSpeedIfNeeded();assert.equal(c.superSpeedPending,true);
 c.bonusConfirmSoundPlaying=false;c.stopSuperSpeedIfNeeded();assert.equal(c.superSpeedActive,true);
 c.stopAutoPlay();c.normalState.flow.phase='art';c.updateSuperSpeedUi();
 assert.equal(button.disabled,true);assert.match(debugStatus.textContent,/AT確定後は使用できません/);
});
test('permission is required, reversible, and expires if server is unreachable',()=>{
 const {c,button,timers}=setup();c.startSuperSpeed();assert.equal(c.autoPlay,false);
 c.applySuperSpeedPermission(true);assert.equal(button.disabled,false);c.startSuperSpeed();assert.equal(c.superSpeedActive,true);
 c.applySuperSpeedPermission(false);assert.equal(c.autoPlay,false);assert.equal(button.disabled,true);
 c.applySuperSpeedPermission(true);c.startSuperSpeed();assert.equal(timers.size,1);[...timers.values()][0].fn();assert.equal(c.autoPlay,false);assert.equal(c.superSpeedAllowed,false);
});
test('CZ and non-winning bonus stay fast; AT win returns to normal AUTO before another BET',()=>{
 const {c}=setup();c.applySuperSpeedPermission(true);c.startSuperSpeed();
 for(const phase of ['normal','cz','strong_cz']){c.normalState.flow.phase=phase;assert.equal(c.stopSuperSpeedIfNeeded(),false);}
 c.session={active:true,bonusArtSets:0};assert.equal(c.stopSuperSpeedIfNeeded(),false);
 c.session.bonusArtSets=1;assert.equal(c.stopSuperSpeedIfNeeded(),false);assert.equal(c.autoPlay,true);assert.equal(c.superSpeedActive,false);
 assert.equal(c.NovaSuperSpeed.atConfirmed({phase:'art'}),true);
 assert.equal(c.NovaSuperSpeed.atConfirmed({phase:'normal'},{},{bonusPending:true,premiumBonus:true}),true);
 assert.equal(c.NovaSuperSpeed.atConfirmed({phase:'normal'},{},{bonusPending:true,prepSets:1}),true);
 assert.equal(c.NovaSuperSpeed.atConfirmed({phase:'normal'},{active:false,bonusArtSets:2}),false,'past bonus wins must not block normal play');
});
test('all AUTO spin, stop, result and inter-game delays use exactly one sixth, with no engine or RNG calls',()=>{
 const {c}=setup();const before=[c.autoDelayMs(),c.autoPollDelayMs(),...[0,1,2].map(i=>c.autoStopDelayMs(i)),c.autoScaledDelayMs(1000)];
 c.superSpeedActive=true;
 const after=[c.autoDelayMs(),c.autoPollDelayMs(),...[0,1,2].map(i=>c.autoStopDelayMs(i)),c.autoScaledDelayMs(1000)];
 before.forEach((v,i)=>assert.equal(after[i],v/6));
});

test('every AT confirmation route schedules the next BET at normal AUTO speed without changing game state',()=>{
 for(const route of ['art','bonus','premium','prep']){
  const {c,timers,button}=setup();let spins=0,logs=0;
  Object.assign(c,{A_TYPE_MODE:true,oumaPresentation:null,readSettings(){},canPlayCompleteTrial:()=>true,
   isRogiThirdStopHoldActive:()=>false,spin(){spins++;c.isSpinning=true;},log(){logs++;}});
  for(const name of ['queueAutoStep','runAutoStep','scheduleNextAuto'])vm.runInContext(fn(name),c);
  const normalDelay=c.autoDelayMs();c.setSuperSpeedDebugPermission(true);c.startSuperSpeed();
  if(route==='art')c.normalState.flow={phase:'art',remaining:'750',sets:'2'};
  if(route==='bonus')c.session={active:true,bonusArtSets:1};
  if(route==='premium')Object.assign(c.normalState,{bonusPending:true,premiumBonus:true});
  if(route==='prep')Object.assign(c.normalState,{bonusPending:true,prepSets:1});
  const state=JSON.stringify([c.normalState,c.session]);
  vm.runInContext('Math.random=()=>{throw Error("mode switch must not draw");}',c);
  c.scheduleNextAuto();
  assert.equal(c.autoPlay,true);assert.equal(c.superSpeedActive,false);assert.equal(c.superSpeedPending,false);
  assert.equal(c.superFullAuto,true);assert.equal(button.disabled,false);assert.equal(button.on,true);assert.equal(logs,1);
  assert.equal(timers.size,1);const scheduled=timers.get(c.autoTimer);assert.equal(scheduled.ms,normalDelay);
  timers.delete(c.autoTimer);scheduled.fn();assert.equal(spins,1);assert.equal(logs,1);
  assert.equal(JSON.stringify([c.normalState,c.session]),state);
 }
});

test('AUTO handoff respects audio, manual STOP and permission revocation; AT exit resumes super speed',()=>{
 const {c}=setup();let spins=0;const waits=[];
 Object.assign(c,{A_TYPE_MODE:true,oumaPresentation:null,isRogiThirdStopHoldActive:()=>false,canPlayCompleteTrial:()=>true,
  queueAutoStep:ms=>waits.push(ms),spin:()=>spins++});
 vm.runInContext(fn('runAutoStep'),c);
 c.setSuperSpeedDebugPermission(true);c.startSuperSpeed();c.normalState.flow.phase='art';
 c.bonusConfirmSoundPlaying=true;c.runAutoStep();
 assert.equal(c.autoPlay,true);assert.equal(c.superSpeedActive,false);assert.equal(spins,0);assert.equal(waits.at(-1),75);
 c.bonusConfirmSoundPlaying=false;c.runAutoStep();assert.equal(spins,1);assert.equal(waits.at(-1),250);
 c.normalState.flow.phase='normal';c.runAutoStep();assert.equal(c.superSpeedActive,true);assert.equal(spins,2);
 c.stopAutoPlay('user');c.runAutoStep();assert.equal(spins,2);
 c.startSuperSpeed();c.normalState.flow.phase='art';c.setSuperSpeedDebugPermission(false);
 c.runAutoStep();assert.equal(c.autoPlay,false);assert.equal(spins,2);
});

test('full AUTO repeats AT cycles, waits for comeback and result audio, and never changes the game state',()=>{
 const {c}=setup();c.setSuperSpeedDebugPermission(true);c.startSuperSpeed();
 vm.runInContext('Math.random=()=>{throw Error("speed handoff consumed RNG");}',c);
 for(let cycle=0;cycle<2;cycle++){
  for(const flow of [{phase:'art',remaining:'200'},{phase:'art',comebackLeft:5},{phase:'art',comebackConfirmed:true,entryStage:'confirmed'},{phase:'art',zone:'sora',zoneLeft:5},{phase:'art',comebackLeft:1}]){
   c.normalState.flow=flow;const state=JSON.stringify([c.normalState,c.session]);
   c.stopSuperSpeedIfNeeded();assert.equal(c.autoPlay,true);assert.equal(c.superFullAuto,true);assert.equal(c.superSpeedActive,false);assert.equal(c.superSpeedPending,false);
   assert.equal(JSON.stringify([c.normalState,c.session]),state);
  }
  c.normalState.flow={phase:'normal'};c.normalState.resultCard={kind:'at'};c.bonusConfirmSoundPlaying=true;
  c.stopSuperSpeedIfNeeded();assert.equal(c.superSpeedActive,false);assert.equal(c.superSpeedPending,true);
  c.bonusConfirmSoundPlaying=false;c.isSpinning=true;c.stopSuperSpeedIfNeeded();assert.equal(c.superSpeedActive,false);
  c.isSpinning=false;c.stopSuperSpeedIfNeeded();assert.equal(c.superSpeedActive,true);assert.equal(c.superSpeedPending,false);assert.equal(c.superFullAuto,true);
 }
});

test('ordinary AUTO never enables sixfold speed by itself after AT',()=>{
 const {c}=setup();c.autoPlay=true;c.setSuperSpeedDebugPermission(true);
 for(const phase of ['art','normal']){c.normalState.flow={phase};c.stopSuperSpeedIfNeeded();assert.equal(c.superFullAuto,false);assert.equal(c.superSpeedActive,false);assert.equal(c.superSpeedPending,false);}
});

test('user STOP, super button, permission loss and COMPLETE cancel the pending return during AT',()=>{
 for(const end of ['user','super','debug','server','expiry','COMPLETE']){
  const {c,timers}=setup();
  Object.assign(c,{stopAutoWatchdog(){},NovaClock:{setBackgroundEnabled(){}}});vm.runInContext(fn('stopAutoPlay'),c);
  if(['server','expiry'].includes(end))c.applySuperSpeedPermission(true);else c.setSuperSpeedDebugPermission(true);
  c.startSuperSpeed();c.normalState.flow={phase:'art'};c.stopSuperSpeedIfNeeded();
  assert.equal(c.superFullAuto,true);assert.equal(c.superSpeedActive,false);
  if(end==='super')c.startSuperSpeed();else if(end==='debug')c.setSuperSpeedDebugPermission(false);else if(end==='server')c.applySuperSpeedPermission(false);else if(end==='expiry')[...timers.values()][0].fn();else c.stopAutoPlay(end);
  assert.equal(c.autoPlay,false,end);assert.equal(c.superFullAuto,false,end);
  c.normalState.flow={phase:'normal'};c.stopSuperSpeedIfNeeded();assert.equal(c.superSpeedActive,false,end);assert.equal(c.superSpeedPending,false,end);
 }
});

test('sortie and Ouma freeze retain ordinary AUTO until all AT work ends',()=>{
 const {c}=setup();let spins=0,challenges=0;const waits=[];
 Object.assign(c,{A_TYPE_MODE:true,oumaPresentation:null,canPlayCompleteTrial:()=>true,isRogiThirdStopHoldActive:()=>false,
  queueAutoStep:ms=>waits.push(ms),spin(){spins++;},resolveOumaChallenge(){challenges++;c.oumaPresentation.stage='lift';},requestAutoStopCurrentSpin(){waits.push('stop');}});
 vm.runInContext(fn('runAutoStep'),c);
 c.setSuperSpeedDebugPermission(true);c.startSuperSpeed();
 for(const flow of [{phase:'art',researchSortieLeft:10},{phase:'art',researchSortieLeft:9},{phase:'art',researchSortieLeft:0,queuedZones:['sora']},{phase:'art',entryStage:'seven'},{phase:'art',zone:'sora',zoneLeft:5}]){
  c.normalState.flow=flow;c.runAutoStep();assert.equal(c.superSpeedActive,false);assert.equal(c.autoPlay,true);assert.equal(c.superFullAuto,true);
 }
 assert.equal(spins,5);
 c.normalState.flow={phase:'art',zone:'ouma',oumaPending:true};c.oumaPresentation={stage:'hold'};
 c.runAutoStep();assert.equal(challenges,0);assert.equal(spins,5);
 c.oumaPresentation.stage='bet';c.runAutoStep();assert.equal(challenges,1);assert.equal(spins,5);
 c.runAutoStep();assert.equal(challenges,1);assert.equal(spins,5);
 c.oumaPresentation=null;c.runAutoStep();assert.equal(spins,6);
 c.normalState.flow={phase:'normal'};c.runAutoStep();assert.equal(c.superSpeedActive,true);assert.equal(spins,7);
});

test('watchdog recovers a spinning bonus with no remaining AUTO callback',()=>{
 const {c}=setup();let watchdog,queued=0;
 Object.assign(c,{autoPlay:true,isSpinning:true,autoWatchdogTimer:null,pendingAtStartTimer:null,
  setInterval(cb){watchdog=cb;return 1;},canPlayCompleteTrial:()=>true,queueAutoStep(){queued++;}});
 vm.runInContext(fn('startAutoWatchdog'),c);c.startAutoWatchdog();watchdog();
 assert.equal(queued,1,'an in-flight spin must still be polled when its stop callbacks were missed');
 c.autoPlay=false;watchdog();assert.equal(queued,1,'manual STOP stays stopped');
});

test('AUTO retries a rejected stop sequence without duplicating in-flight stops',()=>{
 const {c,timers}=setup();let stops=0;
 Object.assign(c,{autoPlay:true,isSpinning:true,spinCanStop:true,currentSpin:{resolved:{},stopped:[false,false,false]},
  isPremiumBigConfirmStopLocked:()=>false,stopAllReels(){stops++;}});
 vm.runInContext(fn('requestAutoStopCurrentSpin'),c);
 c.requestAutoStopCurrentSpin();c.requestAutoStopCurrentSpin();assert.equal(stops,1);
 assert.equal(timers.size,1,'release the takeover latch so a missed stop can be retried');
 [...timers.values()][0].fn();c.requestAutoStopCurrentSpin();assert.equal(stops,2);
 c.currentSpin.resolved.oumaFreeze=true;[...timers.values()].at(-1).fn();c.requestAutoStopCurrentSpin();assert.equal(stops,2);
});
