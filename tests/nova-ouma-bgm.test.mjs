import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
const fn=html.match(/  function normalBgmSrc\([^]*?\n  }/)[0];
const constants=[...html.matchAll(/  const \w+_ZONE_BGM_SRC = "[^"]+";/g)].map(m=>m[0]).join('\n');
function context(){
  const c=vm.createContext({session:{active:false},normalState:{flow:{phase:'art',zone:''}},NOVA_ART_BGM_SRC:'at',CZ_BGM_SRC:'cz',DEFAULT_NORMAL_BGM_SRC:'normal',speedToBonusActive:false,isHighMode:()=>false});
  vm.runInContext(constants+'\n'+fn,c);return c;
}
test('all nine zones select their corresponding audio and return to AT on exit',()=>{
  const c=context();
  for(const [zone,file] of Object.entries({sosuke:'sosuke-bgm.wav',toto:'toto-bgm.wav',urapi:'urapi-bgm.wav',giru:'giru-bgm.wav',sora:'sora-bgm.wav',ouma:'oumafreez.wav'})){
    for(const ura of (['giru','sora','ouma'].includes(zone)?[false,true]:[false])){
      c.normalState.flow={phase:'art',zone,ura};
      assert.equal(c.normalBgmSrc(),'assets/media/nova/'+file);
      assert.ok(fs.existsSync(c.normalBgmSrc()));
      c.normalState.flow.zone='';assert.equal(c.normalBgmSrc(),'at');
    }
  }
});
test('zone music does not override CZ or normal music',()=>{
  const c=context();
  for(const phase of ['cz','strong_cz','normal']){
    c.normalState.flow={phase,zone:'sora'};
    assert.equal(c.normalBgmSrc(),phase==='normal'?'normal':'cz');
  }
});
