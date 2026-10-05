import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(){
 const timers=new Map();let id=0;
 const button={classList:{toggle(){}},setAttribute(){}};
 const debugButton={setAttribute(){}},debugStatus={};
 const c=vm.createContext({superSpeedActive:false,superSpeedPending:false,superSpeedAllowed:false,superSpeedDebugAllowed:false,superSpeedPermissionTimer:null,
  SLOT_DEBUG_ENABLED:true,VERTEX_CONTROLLER_ENABLED:false,SLOT_PLAY_SESSION:false,
  normalState:{flow:{phase:'normal'}},session:{active:false},autoPlay:false,autoTimer:null,isSpinning:false,
  debugFastSpinActive:false,bonusEndBgmPlaying:false,bonusConfirmSoundPlaying:false,
  canUsePlayState:()=>true,isCompleteTrialLocked:()=>false,$:id=>({superSpeedBtn:button,debugSuperSpeedBtn:debugButton,debugSuperSpeedStatus:debugStatus}[id]),
  setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
  stopSpeedToBonus(){},stopAutoPlay(reason){c.autoPlay=false;c.superSpeedActive=false;c.superSpeedPending=false;c.reason=reason;},
  startAutoPlay(){c.autoPlay=true;},updateAutoUi(){},queueAutoStep(){},AUTO_SPEED_MULTIPLIER:2,MIN_SPIN_WAIT_MS:500,
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

test('debug permission still stops on AT confirmation and rejects starting during AT',()=>{
 const {c,button}=setup();c.setSuperSpeedDebugPermission(true);c.startSuperSpeed();
 c.session={active:true,bonusArtSets:1};assert.equal(c.stopSuperSpeedIfNeeded(),true);assert.equal(c.autoPlay,false);
 c.startSuperSpeed();assert.equal(c.autoPlay,false);assert.equal(button.disabled,true);
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
  assert.equal(c.superSpeedPending,false);assert.equal(c.superSpeedActive,false);assert.equal(c.autoPlay,false);
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
test('CZ and non-winning bonus continue; AT win or premium guarantee stops before another BET',()=>{
 const {c}=setup();c.applySuperSpeedPermission(true);c.startSuperSpeed();
 for(const phase of ['normal','cz','strong_cz']){c.normalState.flow.phase=phase;assert.equal(c.stopSuperSpeedIfNeeded(),false);}
 c.session={active:true,bonusArtSets:0};assert.equal(c.stopSuperSpeedIfNeeded(),false);
 c.session.bonusArtSets=1;assert.equal(c.stopSuperSpeedIfNeeded(),true);assert.equal(c.autoPlay,false);
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
