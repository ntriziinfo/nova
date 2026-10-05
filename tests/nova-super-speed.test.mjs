import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(){
 const timers=new Map();let id=0;
 const button={classList:{toggle(){}},setAttribute(){}};
 const c=vm.createContext({superSpeedActive:false,superSpeedAllowed:false,superSpeedPermissionTimer:null,
  normalState:{flow:{phase:'normal'}},session:{active:false},autoPlay:false,autoTimer:null,isSpinning:false,
  debugFastSpinActive:false,bonusEndBgmPlaying:false,bonusConfirmSoundPlaying:false,
  canUsePlayState:()=>true,isCompleteTrialLocked:()=>false,$:()=>button,
  setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
  stopSpeedToBonus(){},stopAutoPlay(reason){c.autoPlay=false;c.superSpeedActive=false;c.reason=reason;},
  startAutoPlay(){c.autoPlay=true;},updateAutoUi(){},queueAutoStep(){},AUTO_SPEED_MULTIPLIER:2,MIN_SPIN_WAIT_MS:500,
  settings:{autoDelay:.5}});
 vm.runInContext(fs.readFileSync('nova-super-speed.js','utf8'),c);
 for(const name of ['superSpeedUnavailableReason','updateSuperSpeedUi','applySuperSpeedPermission','stopSuperSpeedIfNeeded','startSuperSpeed','autoScaledDelayMs','autoDelayMs','autoStopDelayMs','autoPollDelayMs'])vm.runInContext(fn(name),c);
 return {c,button,timers};
}
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
