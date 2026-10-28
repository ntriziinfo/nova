import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const source=process.env.NOVA_AUDIT_BEFORE==='1'?execFileSync('git',['show','HEAD:nova-game.js'],{encoding:'utf8'}):fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const noop=()=>{};
function scheduled(){
 const callbacks=[],paid=[];
 const old={stopped:[true,true,true],result:'NEBULA',resolved:{reward:0,artSetWon:1},lineRow:1};
 const c=vm.createContext({currentSpin:old,isSpinning:true,superSpeedActive:false,RESULT_WAIT_MS:300,
  prepareManualBonusOutcome:noop,updatePremiumBigReelMovie:noop,willEnterBattleAfterCurrentSpin:()=>false,
  normalState:{},NovaLadder:{eligible:()=>false},isPremiumBigFinalBonusSpin:()=>false,$:()=>({}),
  autoScaledDelayMs:x=>x,setTimeout:f=>callbacks.push(f),finishSpin:(...args)=>paid.push(args)});
 const begin=source.indexOf('    if(currentSpin.stopped.every(Boolean) && !currentSpin.finishScheduled){');
 const endMatch=/\r?\n    persistState\(\);\r?\n  }/g;endMatch.lastIndex=begin;const end=endMatch.exec(source)?.index??-1;
 assert(end>begin,'settlement scheduling block was not found');
 vm.runInContext(source.slice(begin,end),c);
 return {c,old,callbacks,paid};
}
test('a delayed third-stop callback cannot settle a different spin after a reset',()=>{
 const {c,callbacks,paid}=scheduled();
 c.currentSpin={stopped:[false,false,false],result:'BELL15',resolved:{reward:15},lineRow:1};
 callbacks.forEach(f=>f());assert.equal(paid.length,0,'old timer paid an unstopped new spin');
});
test('ordinary and background-delayed result callbacks settle only their own completed spin',()=>{
 const {old,callbacks,paid}=scheduled();callbacks.forEach(f=>f());
 assert.equal(paid.length,1);assert.equal(paid[0][0],'NEBULA');assert.equal(paid[0][1],old.resolved);
});
test('settlement refuses unstopped, stale, already-finishing or unowned results',()=>{
 for(const mode of ['unstopped','stale','finishing','unowned']){
  const resolved={reward:15},spin={resolved,stopped:[true,true,true]};
  if(mode==='unstopped')spin.stopped[0]=false;if(mode==='finishing')spin.finishing=true;
  const c=vm.createContext({storeEndSnapshot:null,canUsePlayState:()=>mode!=='unowned',isSpinning:true,currentSpin:spin,
   NovaBellNavi:{clear:()=>{throw Error('invalid settlement advanced');}},persistState:noop});
  vm.runInContext(fn('finishSpin'),c);c.finishSpin('BELL15',mode==='stale'?{reward:15}:resolved);
 }
});
