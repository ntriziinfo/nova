import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
const fn=html.match(/  function normalBgmSrc\([^]*?\n  }/)[0];
const ctx=vm.createContext({session:{active:false},normalState:{flow:{phase:'normal'}},NOVA_ART_BGM_SRC:'rush',CZ_BGM_SRC:'cz',DEFAULT_NORMAL_BGM_SRC:'normal',SPEED_BGM_SRC:'speed',HIGH_MODE_BGM_SRC:'high',speedToBonusActive:false,isHighMode:()=>false});vm.runInContext(fn,ctx);
test('CZ and strong CZ select the supplied BGM, then release it on exit',()=>{
 for(const phase of ['cz','strong_cz']){ctx.normalState.flow.phase=phase;assert.equal(ctx.normalBgmSrc(),'cz');}
 for(const phase of ['normal']){ctx.normalState.flow.phase=phase;assert.equal(ctx.normalBgmSrc(),'normal');}
 ctx.normalState.flow.phase='cz';ctx.session.active=true;assert.notEqual(ctx.normalBgmSrc(),'cz');
});

test('ART including zones uses RUSH, bonus suspends it and normal return releases it',()=>{
 ctx.session.active=false;
 for(const zone of ['', 'sora', 'ouma', 'giru']){ctx.normalState.flow={phase:'art',zone};assert.equal(ctx.normalBgmSrc(),'rush');}
 ctx.session.active=true;assert.notEqual(ctx.normalBgmSrc(),'rush');
 ctx.session.active=false;assert.equal(ctx.normalBgmSrc(),'rush');
 ctx.normalState.flow={phase:'normal'};assert.equal(ctx.normalBgmSrc(),'normal');
});
