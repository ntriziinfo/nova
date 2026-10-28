import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=readGameSource();
const fn=html.match(/^  function presentedArtFlow\(.*$/m)[0]+'\n'+html.match(/  function normalBgmSrc\([^]*?\n  }/)[0];
const constants=[...html.matchAll(/  const \w+_ZONE_BGM_SRC = "[^"]+";/g)].map(m=>m[0]).join('\n');
function context(){
  const c=vm.createContext({atCheckpointStatus:()=>null,NovaProgress:{snapshot:()=>({})},currentGameProfit:()=>0,isSpinning:false,currentSpin:null,session:{active:false},normalState:{flow:{phase:'art',zone:''}},NOVA_ART_BGM_SRC:'at',CZ_BGM_SRC:'cz',DEFAULT_NORMAL_BGM_SRC:'normal',speedToBonusActive:false,isHighMode:()=>false});
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

test('sortie BGM starts with active games, covers the final spinning game, and returns to the next phase',()=>{
  const c=context();
  c.normalState.flow={phase:'art',researchSortieLeft:0};assert.equal(c.normalBgmSrc(),'at','queued stock is not an active challenge');
  for(const remaining of [10,9,1]){
    c.normalState.flow.researchSortieLeft=remaining;assert.equal(c.normalBgmSrc(),'assets/media/nova/sortie-bgm.mp3');
  }
  c.normalState.flow.researchSortieLeft=0;c.isSpinning=true;c.currentSpin={resolved:{researchSortie:{finished:true}}};
  assert.equal(c.normalBgmSrc(),'assets/media/nova/sortie-bgm.mp3','pre-drawn final game must retain the challenge BGM');
  c.isSpinning=false;c.currentSpin=null;assert.equal(c.normalBgmSrc(),'at');
  c.normalState.flow.zone='toto';assert.equal(c.normalBgmSrc(),'assets/media/nova/toto-bgm.wav');
  c.normalState.flow={phase:'normal'};assert.equal(c.normalBgmSrc(),'normal');
});

test('upper challenge starts its supplied BGM on BET, continues during HOLD, and exits on either result',()=>{
 for(const won of [false,true]){
  const c=context();c.normalState.flow={phase:'art',burstPending:true,researchChallengeActive:false};
  assert.equal(c.normalBgmSrc(),'at','pending entry is not an active challenge');
  c.isSpinning=true;c.currentSpin={resolved:{researchChallenge:{started:true}}};
  c.normalState.flow.researchChallengeActive=true;assert.equal(c.normalBgmSrc(),'assets/media/nova/sortie-bgm.mp3');
  c.isSpinning=false;c.currentSpin=null;c.normalState.flow.researchAim='nova';
  assert.equal(c.normalBgmSrc(),'assets/media/nova/sortie-bgm.mp3','HOLD keeps the same track');
  c.normalState.flow.researchChallengeActive=false;c.isSpinning=true;c.currentSpin={resolved:{researchChallenge:{finished:true,won}}};
  assert.equal(c.normalBgmSrc(),'assets/media/nova/sortie-bgm.mp3','do not reveal the pre-drawn final result');
  c.isSpinning=false;c.currentSpin=null;assert.equal(c.normalBgmSrc(),'at');
 }
});
