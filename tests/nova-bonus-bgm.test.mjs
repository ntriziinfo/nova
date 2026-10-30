import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=readGameSource(),ctx=vm.createContext({A_TYPE_MODE:true,NOVA_BIG_BGM_SRC:'assets/media/nova/BIG.wav',NOVA_IMPURITY_BGM_SRC:'assets/media/nova/impurity-release-bgm-1143035-20261030.mp3',NOVA_REG_BGM_SRC:'assets/media/nova/NovaREG.wav',normalizeATypeBonusKind:kind=>kind==='MID'?'MID':'BIG'});
vm.runInContext(html.match(/  function pickATypeBonusBgm\([^]*?\n  }/)[0],ctx);
test('all NOVA BIG variants and migrated REG use the supplied BIG BGM',()=>{
 for(const within50 of [false,true])for(const options of [{},{premiumBonus:true},{oneGameRenBonus:true}]){
  assert.equal(ctx.pickATypeBonusBgm('BIG',within50,options).src,'assets/media/nova/BIG.wav');
  assert.equal(ctx.pickATypeBonusBgm('MID',within50,options).src,'assets/media/nova/BIG.wav');
 }
});

test('impurity release overrides only the BB audio and survives saved-session selection',()=>{
 for(const options of [{impurityReleased:true},{impurityReleased:true,premiumBonus:true},{impurityReleased:true,bonusTier:'upper'}]){
  const before=JSON.stringify(options);
  assert.equal(ctx.pickATypeBonusBgm('BIG',false,options).src,ctx.NOVA_IMPURITY_BGM_SRC);
  assert.equal(ctx.pickATypeBonusBgm('BIG',false,JSON.parse(before)).src,ctx.NOVA_IMPURITY_BGM_SRC);
  assert.equal(JSON.stringify(options),before);
 }
 assert.equal(ctx.pickATypeBonusBgm('BIG',false,{impurityReleased:false}).src,ctx.NOVA_BIG_BGM_SRC);
 assert.match(html,/pickATypeBonusBgm\(bonusKind, within50, \{premiumBonus, oneGameRenBonus, impurityReleased\}\)/);
 assert.match(html,/pickATypeBonusBgm\(session.bonusKind,false,session\)/);
});
