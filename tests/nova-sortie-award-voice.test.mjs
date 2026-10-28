import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadVoiceCatalog} from './helpers/voice-catalog.mjs';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  (?:async )?function '+name+'\\([^]*?\\n  }'))[0];
const sortieVerdict=vm.runInNewContext(fs.readFileSync('nova-sortie-presentation.js','utf8')+';NovaSortie.stopVerdict;');
const spin=(zone,won=true)=>({stopped:[true,true,true],auditPressOrder:[0,1,2],resolved:{researchSortie:{zone,won,hits:2},reward:8,flowAfter:{queuedZones:[zone]}}});
function setup(){
 const played=[],watches=[],timers=[];
 class Audio{
  constructor(src){this.src=src;}pause(){}getAttribute(){return this.src;}
  play(){played.push({src:this.src,volume:this.volume,loop:this.loop});return Promise.resolve();}
 }
 const c=vm.createContext({Audio,debugFastSpinActive:false,speedToBonusActive:false,superSpeedActive:false,A_TYPE_MODE:true,
  SEVEN_CONFIRM_SOUND_SRC:'seven',oneShotSoundCache:new Map(),bonusConfirmSoundPlaying:false,bonusConfirmSoundAudio:null,bonusConfirmSoundTimer:null,
  sfxOutputVolume:()=>.4,voiceOutputVolume:()=>.7,soundOutputVolume:(s,v)=>v,prepareCharacterVoiceAudio(){},updateAutoUi(){},
  setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},watchPlaybackProgress:(a,f)=>{watches.push(f);return ()=>{};},
  isSpinning:false,NovaSortie:{busy:false,clear(){},stopVerdict:sortieVerdict},normalState:{},persistState(){},displayNovaResult(card){c.displayed=card;},
  updateDisplay(){c.showSortieResultIfReady();},scheduleNextAuto(){c.scheduled=(c.scheduled||0)+1;}
 });
 loadVoiceCatalog(c);
 vm.runInContext(source.match(/  const SORTIE_AWARD_VOICE_SRCS=[^\n]+/)[0],c);
 for(const name of ['clearBonusConfirmSoundLock','playLockedBonusConfirmSound','playSortieAwardVoice','showSortieResultIfReady'])vm.runInContext(fn(name),c);
 vm.runInContext('Math.random=()=>{throw Error("Voice must not consume game RNG");}',c);
 return {c,played,watches,timers};
}

test('each awarded character and its back variant speaks once on third stop, even with wrong press order',()=>{
 for(const [zone,character] of Object.entries({sosuke:'sosuke',sora:'sora',ura_sora:'sora',giru:'giru',ura_giru:'giru',ouma:'ouma',ura_ouma:'ouma',toto:'toto'})){
  const {c,played}=setup(),s=spin(zone),before=JSON.stringify(s.resolved);
  for(const stopped of [[false,false,false],[false,false,true],[false,true,true]]){s.stopped=stopped;c.playSortieAwardVoice(s);assert.equal(played.length,0);}
  s.stopped=[true,true,true];c.playSortieAwardVoice(s);c.playSortieAwardVoice(s);
  assert.deepEqual(played,[{src:`assets/media/nova/sortie-award-${character}.wav`,volume:.7,loop:false}]);
  assert(c.bonusConfirmSoundPlaying);assert.equal(JSON.stringify(s.resolved),before);
  c.bonusConfirmSoundAudio.onended();assert(!c.bonusConfirmSoundPlaying);assert.equal(c.scheduled,1);
 }
});

test('losses, early stops, unassigned characters and other games stay silent',()=>{
 const {c,played}=setup();
 for(const s of [spin('sora',false),spin('urapi'),spin('kushuri_nito'),{stopped:[true,true,true],resolved:{}},{...spin('sora'),stopped:[]}])c.playSortieAwardVoice(s);
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){c[flag]=true;c.playSortieAwardVoice(spin('sosuke'));c[flag]=false;}
 assert.equal(played.length,0);assert(!c.bonusConfirmSoundPlaying);
});

test('last-game result cannot interrupt a voice after the four-second visual hold expires',()=>{
 const {c}=setup(),card={kind:'sortie',hits:4};c.normalState.pendingSortieResult=card;
 c.playSortieAwardVoice(spin('ouma'));assert.equal(c.showSortieResultIfReady(),false);
 assert.equal(c.normalState.pendingSortieResult,card);assert.equal(c.displayed,undefined);
 c.bonusConfirmSoundAudio.onended();assert.equal(c.displayed,card);assert.equal(c.normalState.pendingSortieResult,undefined);
});

test('early voice end still respects four-second hold; failures and stale end events cannot wedge or unlock another voice',()=>{
 const {c,watches}=setup();c.NovaSortie.busy=true;c.normalState.pendingSortieResult={kind:'sortie'};
 c.playSortieAwardVoice(spin('sosuke'));c.bonusConfirmSoundAudio.onended();assert.equal(c.displayed,undefined);
 c.NovaSortie.busy=false;assert(c.showSortieResultIfReady());
 c.playSortieAwardVoice(spin('sora'));const stale=c.bonusConfirmSoundAudio.onended;
 c.clearBonusConfirmSoundLock();c.playSortieAwardVoice(spin('sora'));stale();assert(c.bonusConfirmSoundPlaying);
 c.bonusConfirmSoundAudio.onerror();assert(!c.bonusConfirmSoundPlaying);
 c.playSortieAwardVoice(spin('toto'));watches.at(-1)();assert(!c.bonusConfirmSoundPlaying);
});

test('third-stop and resume paths share routing; manual and AUTO both retain the audio gate',()=>{
 assert.match(fn('stopSingleReel'),/NovaSortie\.stop\(currentSpin\);\s*playSortieAwardVoice\(currentSpin\)/);
 assert.match(fn('restorePendingSpin'),/NovaSortie\.begin\(spin\);[\s\S]*?playSortieAwardVoice\(spin\)/);
 for(const name of ['spin','runAutoStep','scheduleNextAuto'])assert.match(fn(name),/bonusConfirmSoundPlaying/);
});

test('middle first and scissors announce at the decisive landed reel, once through the last stop',()=>{
 for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
  const {c,played}=setup(),s=spin('sosuke');s.stopped=[false,false,false];s.auditPressOrder=[];s.auditStopOrder=[];
  const decisive=order[0]===1?1:2-order[0],original=JSON.stringify(s.resolved);
  for(const i of order){
   s.auditPressOrder.push(i);c.playSortieAwardVoice(s);
   assert.equal(played.length,s.auditStopOrder.includes(decisive)?1:0);
   s.stopped[i]=true;s.auditStopOrder.push(i);c.playSortieAwardVoice(s);c.playSortieAwardVoice(s);
   assert.equal(played.length,s.auditStopOrder.includes(decisive)?1:0);
  }
  assert.equal(played.length,1);assert.equal(JSON.stringify(s.resolved),original);
 }
});
