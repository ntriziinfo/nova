import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=readGameSource();
const fn=html.match(/  function normalBgmSrc\([^]*?\n  }/)[0];
const constants=[...html.matchAll(/  const \w+_ZONE_BGM_SRC = "[^"]+";/g)].map(m=>m[0]).join('\n');
const ctx=vm.createContext({session:{active:false},normalState:{flow:{phase:'normal'}},currentSpin:null,NOVA_ART_BGM_SRC:'rush',CZ_BGM_SRC:'cz',DEFAULT_NORMAL_BGM_SRC:'normal',SPEED_BGM_SRC:'speed',HIGH_MODE_BGM_SRC:'high',speedToBonusActive:false,isHighMode:()=>false});vm.runInContext(constants+'\n'+fn,ctx);

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
