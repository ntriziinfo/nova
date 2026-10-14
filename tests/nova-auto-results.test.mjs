import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=readGameSource();
const fn=name=>html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(autoPlay=true){
 const calls=[],after=[];
 const c=vm.createContext({stopSuperSpeedIfNeeded:()=>false,$:()=>null,autoPlay,A_TYPE_MODE:true,debugFastSpinActive:false,normalState:{},session:{active:false},
  bonusEndBgmPlaying:false,bonusConfirmSoundPlaying:false,oumaPresentation:null,isSpinning:false,
  NovaSortie:{busy:false,clear:()=>calls.push(['clear-sortie'])},persistState:()=>calls.push(['save']),
  NovaInitialDuo:{clear(){}},NovaDirectAward:{deferResult:()=>false,clear(){}},NovaAim:{busy:false,hide(){},afterWin:callback=>after.push(callback)},NovaLadder:{hide(){}},NovaResults:{show:card=>calls.push(['show',card])},
  pauseNormalBgm(){},stopAutoPlay:reason=>{c.autoPlay=false;calls.push(['stop',reason]);},stopSpeedToBonus(){},
  playLockedBonusConfirmSound:src=>{c.bonusConfirmSoundPlaying=true;calls.push(['sound',src]);},bgmOutputVolume:()=>.5,BGM_OUTPUT_SCALE:1,
  canPlayCompleteTrial:()=>true,isRogiThirdStopHoldActive:()=>false,queueAutoStep:()=>calls.push(['poll']),autoPollDelayMs:()=>75,autoDelayMs:()=>250,
  spin:()=>{calls.push(['spin']);c.normalState.resultCard=null;}});
 vm.runInContext(fn('displayNovaResult')+'\n'+fn('showSortieResultIfReady')+'\n'+fn('runAutoStep'),c);
 return {c,calls,after};
}
test('every zone result keeps AUTO on, waits for the eyecatch, then starts the next game',()=>{
 for(const character of ['sosuke','toto','urapi','giru','sora','ouma','kushuri_nito']){
  const {c,calls}=setup(),card={kind:'zone',character,pt:'500'};c.displayNovaResult(card);
  assert.equal(c.autoPlay,true,character);assert.equal(c.normalState.resultCard,card);
  c.runAutoStep();assert.equal(calls.filter(x=>x[0]==='spin').length,0);
  c.bonusConfirmSoundPlaying=false;c.runAutoStep();assert.equal(calls.filter(x=>x[0]==='spin').length,1);
 }
});

test('BB result keeps AUTO selected and advances only after the result sound finishes',()=>{
 const {c,calls}=setup();c.normalState.flow={phase:'normal'};
 c.displayNovaResult({kind:'bonus',character:'nova',color:'blue',pt:'150',next:'通常'});
 c.runAutoStep();assert.equal(c.autoPlay,true);assert.equal(calls.filter(x=>x[0]==='spin').length,0);
 c.bonusConfirmSoundPlaying=false;c.runAutoStep();assert.equal(calls.filter(x=>x[0]==='spin').length,1);
});

test('final sortie award completes its hold before the result, then AUTO waits for result audio and advances once',()=>{
 const {c,calls}=setup();c.normalState.pendingSortieResult={kind:'sortie',character:'all',color:'gold',count:4};
 c.normalState.flow={phase:'art',remaining:'500',queuedZones:['sora','sora','toto','giru']};const flow=JSON.stringify(c.normalState.flow);
 c.NovaSortie.busy=true;assert.equal(c.showSortieResultIfReady(),false);assert.equal(calls.length,0);
 c.NovaSortie.busy=false;c.isSpinning=true;assert.equal(c.showSortieResultIfReady(),false);
 c.isSpinning=false;assert.equal(c.showSortieResultIfReady(),true);assert.equal(c.normalState.resultCard.count,4);assert.equal(c.normalState.pendingSortieResult,undefined);
 assert.equal(c.showSortieResultIfReady(),false);assert.equal(calls.filter(x=>x[0]==='show').length,1);assert.equal(c.autoPlay,true);
 c.runAutoStep();assert.equal(calls.filter(x=>x[0]==='spin').length,0);
 c.bonusConfirmSoundPlaying=false;c.runAutoStep();assert.equal(calls.filter(x=>x[0]==='spin').length,1);assert.equal(JSON.stringify(c.normalState.flow),flow);
});

test('saved pending sortie result resumes without a new game, while reset or fast simulation does not show stale results',()=>{
 const {c,calls}=setup(false);c.normalState=JSON.parse(JSON.stringify({pendingSortieResult:{kind:'sortie',character:'all',color:'gold',count:2}}));
 c.debugFastSpinActive=true;assert.equal(c.showSortieResultIfReady(),false);assert.equal(calls.length,0);
 c.debugFastSpinActive=false;assert.equal(c.showSortieResultIfReady(),true);assert.equal(c.autoPlay,false);
 c.normalState={};assert.equal(c.showSortieResultIfReady(),false);assert.equal(calls.filter(x=>x[0]==='show').length,1);
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
