import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const h=fs.readFileSync('jag.html','utf8');const fn=h.match(/  function normalBgmSrc\([^]*?\n  }/)[0];
test('Giru and Ura Giru use the supplied BGM and return to AT on exit',()=>{
  const c=vm.createContext({session:{active:false},normalState:{flow:{phase:'art',zone:'giru'}},GIRU_ZONE_BGM_SRC:'giru',OUMA_ZONE_BGM_SRC:'ouma',NOVA_ART_BGM_SRC:'at'});
  vm.runInContext(fn,c);
  assert.equal(c.normalBgmSrc(),'giru');
  c.normalState.flow.ura=true;
  assert.equal(c.normalBgmSrc(),'giru');
  c.normalState.flow.zone='';
  assert.equal(c.normalBgmSrc(),'at');
  c.normalState.flow.zone='ouma';
  assert.equal(c.normalBgmSrc(),'ouma');
});
test('Ouma and Ura Ouma loop their zone music and return to AT on exit',()=>{const c=vm.createContext({session:{active:false},normalState:{flow:{phase:'art',zone:'ouma'}},OUMA_ZONE_BGM_SRC:'ouma',NOVA_ART_BGM_SRC:'at',CZ_BGM_SRC:'cz',DEFAULT_NORMAL_BGM_SRC:'normal',speedToBonusActive:false,isHighMode:()=>false});vm.runInContext(fn,c);assert.equal(c.normalBgmSrc(),'ouma');c.normalState.flow.ura=true;assert.equal(c.normalBgmSrc(),'ouma');c.normalState.flow.zone='';assert.equal(c.normalBgmSrc(),'at');c.normalState.flow.zone='sora';assert.equal(c.normalBgmSrc(),'at');c.normalState.flow.phase='cz';assert.equal(c.normalBgmSrc(),'cz');c.normalState.flow.phase='normal';assert.equal(c.normalBgmSrc(),'normal');});
