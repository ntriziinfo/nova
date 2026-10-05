import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=readGameSource();
const fn=html.match(/^  function presentedArtFlow\(.*$/m)[0]+'\n'+html.match(/  function normalBgmSrc\([^]*?\n  }/)[0];
const constants=[...html.matchAll(/  const \w+_ZONE_BGM_SRC = "[^"]+";/g)].map(m=>m[0]).join('\n');
const ctx=vm.createContext({isSpinning:false,session:{active:false},normalState:{flow:{phase:'normal'}},currentSpin:null,NOVA_ART_BGM_SRC:'rush',CZ_BGM_SRC:'cz',DEFAULT_NORMAL_BGM_SRC:'normal',SPEED_BGM_SRC:'speed',HIGH_MODE_BGM_SRC:'high',speedToBonusActive:false,isHighMode:()=>false});vm.runInContext(constants+'\n'+fn,ctx);

test('CZ BGM waits for the first BET, survives a pending-spin reload and continues after the intro',()=>{
 ctx.session.active=false;
 for(const phase of ['cz','strong_cz']){
  ctx.normalState.flow={phase,remaining:20,totalGames:20};
  ctx.currentSpin={resolved:{flowBefore:{phase:'normal'},czPrelude:{enter:true}}};
  assert.equal(ctx.normalBgmSrc(),'normal','confirmation stop must not start CZ music');
  ctx.currentSpin=null;
  assert.equal(ctx.normalBgmSrc(),'normal','reload before BET must still wait');
  ctx.currentSpin=JSON.parse(JSON.stringify({resolved:{flowBefore:{phase,remaining:20,totalGames:20},czIntro:true}}));
  assert.equal(ctx.normalBgmSrc(),'cz','first BET / restored pending BET starts CZ music');
  ctx.normalState.flow.remaining=19;ctx.currentSpin=null;
  assert.equal(ctx.normalBgmSrc(),'cz','CZ music continues after the intro');
  ctx.normalState.flow={phase:'normal'};
  assert.equal(ctx.normalBgmSrc(),'normal');
 }
});
test('CZ and strong CZ select the supplied BGM, then release it on exit',()=>{
 for(const phase of ['cz','strong_cz']){ctx.normalState.flow.phase=phase;assert.equal(ctx.normalBgmSrc(),'cz');}
 for(const phase of ['normal']){ctx.normalState.flow.phase=phase;assert.equal(ctx.normalBgmSrc(),'normal');}
 ctx.normalState.flow.phase='cz';ctx.session.active=true;assert.notEqual(ctx.normalBgmSrc(),'cz');
});

test('ordinary ART uses RUSH, bonus suspends it and normal return releases it',()=>{
 ctx.session.active=false;
 ctx.normalState.flow={phase:'art',zone:''};assert.equal(ctx.normalBgmSrc(),'rush');
 ctx.session.active=true;assert.notEqual(ctx.normalBgmSrc(),'rush');
 ctx.session.active=false;assert.equal(ctx.normalBgmSrc(),'rush');
 ctx.normalState.flow={phase:'normal'};assert.equal(ctx.normalBgmSrc(),'normal');
});

test('CZ intro plays once, returns to normal BGM, survives reload, and re-arms for a new CZ',()=>{
 let saves=0,plays=0,src='normal';
 const c=vm.createContext({session:{active:false},normalState:{flow:{phase:'cz',remaining:20,totalGames:20}},currentSpin:{resolved:{czIntro:true}},NOVA_ART_BGM_SRC:'rush',CZ_BGM_SRC:'cz',DEFAULT_NORMAL_BGM_SRC:'normal',SPEED_BGM_SRC:'',HIGH_MODE_BGM_SRC:'',speedToBonusActive:false,isHighMode:()=>false,
  bgm:{loop:true,getAttribute:()=>src,setAttribute:(key,value)=>src=value,load(){}},persistState(){saves++;},playNormalBgm(){plays++;c.ensureNormalBgmSource();}});
 const functions=['normalBgmSrc','ensureNormalBgmSource','finishCzIntroBgm'].map(name=>html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0]).join('\n');
 vm.runInContext(constants+'\n'+functions,c);
 c.ensureNormalBgmSource();assert.equal(src,'cz');assert.equal(c.bgm.loop,false);
 c.bgm.onended();assert.equal(src,'normal');assert.equal(c.bgm.loop,true);assert.equal(saves,1);assert.equal(plays,1);
 c.normalState=JSON.parse(JSON.stringify(c.normalState));c.currentSpin=null;
 // Source setup can run before restoring the first game's pending spin.
 c.ensureNormalBgmSource();c.currentSpin={resolved:{czIntro:true}};c.ensureNormalBgmSource();assert.equal(src,'normal');
 c.normalState.flow.remaining=19;c.currentSpin=null;c.ensureNormalBgmSource();assert.equal(src,'normal');
 c.finishCzIntroBgm();assert.equal(saves,1,'unrelated/stale ended event is ignored');
 c.normalState.flow={phase:'normal'};c.ensureNormalBgmSource();assert.equal(c.normalState.czBgmFinished,false);
 c.normalState.flow={phase:'strong_cz',remaining:20,totalGames:20};c.ensureNormalBgmSource();assert.equal(src,'normal');
 c.currentSpin={resolved:{czIntro:true}};c.ensureNormalBgmSource();assert.equal(src,'cz');assert.equal(c.bgm.loop,false);
 c.bgm.ended=true;c.ensureNormalBgmSource();assert.equal(src,'normal','AUTO must not restart a track waiting to dispatch ended');assert.equal(c.bgm.loop,true);
});

test('CZ entry voice plays once on the title BET, preserves reload guards and never changes lottery state',()=>{
 const sounds=[],c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,voiceOutputVolume:()=>.6,clearCzIntroVoiceHold(){},holdCzIntroVoice(){},playOneShotSound:(src,volume,options)=>sounds.push({src,volume,options})});
 const aim=fs.readFileSync('nova-aim-presentation.js','utf8').match(/ function isCzIntro\([^]*?\n }/)[0];
 vm.runInContext(aim+'\nglobalThis.NovaAim={isCzIntro};\nMath.random=()=>{throw Error("Unexpected lottery draw");};\n'+html.match(/  function playCzIntroBetVoice\([^]*?\n  }/)[0],c);
 for(const phase of ['cz','strong_cz']){
  const resolved={flowBefore:{phase,remaining:20,totalGames:20},flowAfter:{phase,remaining:19,totalGames:20}};
  const before=JSON.stringify(resolved);c.playCzIntroBetVoice(resolved);c.playCzIntroBetVoice(resolved);
  c.playCzIntroBetVoice(JSON.parse(JSON.stringify(resolved)));
  const {czIntroVoicePlayed,...engine}=resolved;assert.equal(czIntroVoicePlayed,true);assert.equal(JSON.stringify(engine),before);
 }
 assert.equal(sounds.length,2);assert(sounds.every(s=>s.src==='assets/media/nova/cz-entry-voice.wav'&&s.volume===.6&&s.options.allowDuringPremiumConfirm));
 for(const resolved of [
  {flowBefore:{phase:'normal'},czPrelude:{enter:true},flowAfter:{phase:'cz',remaining:20,totalGames:20}},
  {flowBefore:{phase:'normal'},czPrelude:{failed:true}},
  {flowBefore:{phase:'cz',remaining:19,totalGames:20}},
  {flowBefore:{phase:'art',remaining:20,totalGames:20}},
  {flowBefore:{phase:'cz',remaining:20,totalGames:20},aTypeBonusGame:true},
  {flowBefore:{phase:'cz',remaining:20,totalGames:20},bonusPendingAtStart:true}
 ])c.playCzIntroBetVoice(resolved);
 c.debugFastSpinActive=true;c.playCzIntroBetVoice({flowBefore:{phase:'cz',remaining:20,totalGames:20}});assert.equal(sounds.length,2);
});
