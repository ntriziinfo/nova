import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8'),ctx=vm.createContext({A_TYPE_MODE:true,NOVA_BIG_BGM_SRC:'assets/media/nova/BIG.wav',NOVA_REG_BGM_SRC:'assets/media/nova/NovaREG.wav',normalizeATypeBonusKind:kind=>kind==='MID'?'MID':'BIG'});
vm.runInContext(html.match(/  function pickATypeBonusBgm\([^]*?\n  }/)[0],ctx);
test('all NOVA BIG variants use supplied BIG and REG uses supplied NovaREG',()=>{
 for(const within50 of [false,true])for(const options of [{},{premiumBonus:true},{oneGameRenBonus:true}]){
  assert.equal(ctx.pickATypeBonusBgm('BIG',within50,options).src,'assets/media/nova/BIG.wav');
  assert.equal(ctx.pickATypeBonusBgm('MID',within50,options).src,'assets/media/nova/NovaREG.wav');
 }
});
