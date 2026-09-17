import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
const fn=name=>html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(autoPlay=true){
 const calls=[],after=[];
 const c=vm.createContext({autoPlay,A_TYPE_MODE:true,debugFastSpinActive:false,normalState:{},session:{active:false},
  bonusEndBgmPlaying:false,bonusConfirmSoundPlaying:false,oumaPresentation:null,isSpinning:false,
  NovaDirectAward:{deferResult:()=>false,clear(){}},NovaAim:{busy:false,hide(){},afterWin:callback=>after.push(callback)},NovaLadder:{hide(){}},NovaResults:{show:card=>calls.push(['show',card])},
  pauseNormalBgm(){},stopAutoPlay:reason=>{c.autoPlay=false;calls.push(['stop',reason]);},stopSpeedToBonus(){},
  playLockedBonusConfirmSound:src=>{c.bonusConfirmSoundPlaying=true;calls.push(['sound',src]);},bgmOutputVolume:()=>.5,BGM_OUTPUT_SCALE:1,
  canPlayCompleteTrial:()=>true,isRogiThirdStopHoldActive:()=>false,queueAutoStep:()=>calls.push(['poll']),autoPollDelayMs:()=>75,autoDelayMs:()=>250,
  spin:()=>{calls.push(['spin']);c.normalState.resultCard=null;}});
 vm.runInContext(fn('displayNovaResult')+'\n'+fn('runAutoStep'),c);
 return {c,calls,after};
}
test('every zone result keeps AUTO on, waits for the eyecatch, then starts the next game',()=>{
 for(const character of ['sosuke','toto','urapi','giru','sora','ouma']){
  const {c,calls}=setup(),card={kind:'zone',character,pt:'500'};c.displayNovaResult(card);
  assert.equal(c.autoPlay,true,character);assert.equal(c.normalState.resultCard,card);
  c.runAutoStep();assert.equal(calls.filter(x=>x[0]==='spin').length,0);
  c.bonusConfirmSoundPlaying=false;c.runAutoStep();assert.equal(calls.filter(x=>x[0]==='spin').length,1);
 }
});
test('a result deferred behind a win still keeps AUTO on until its own audio ends',()=>{
 const {c,after,calls}=setup();c.NovaAim.busy=true;c.displayNovaResult({kind:'zone',character:'sora'});
 assert.equal(c.autoPlay,true);assert.equal(c.normalState.resultCard,undefined);assert.equal(after.length,1);
 c.NovaAim.busy=false;after[0]();assert.equal(c.autoPlay,true);assert.equal(c.bonusConfirmSoundPlaying,true);
 c.runAutoStep();assert.equal(calls.filter(x=>x[0]==='spin').length,0);
 c.bonusConfirmSoundPlaying=false;c.runAutoStep();assert.equal(calls.filter(x=>x[0]==='spin').length,1);
});
test('manual play and a user STOP during the result never restart AUTO',()=>{
 for(const initiallyAuto of [false,true]){
  const {c,calls}=setup(initiallyAuto);c.displayNovaResult({kind:'at',pt:'500'});
  if(initiallyAuto)c.stopAutoPlay('user');c.bonusConfirmSoundPlaying=false;c.runAutoStep();
  assert.equal(c.autoPlay,false);assert.equal(calls.filter(x=>x[0]==='spin').length,0);
 }
});
