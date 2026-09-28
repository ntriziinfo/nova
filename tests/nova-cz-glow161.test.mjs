import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';
loadModel();
const html=fs.readFileSync('jag.html','utf8');
function setup(){
 const machine={dataset:{}};
 const c=vm.createContext({document:{getElementById:()=>machine},normalState:{},session:{active:false}});
 vm.runInContext(html.match(/  function syncCzPreludeGlow\([^]*?\n  }/)[0],c);
 return {c,machine};
}
test('real and fake CZ preludes keep the red frame during play and between games; exit and announcement clear it',()=>{
 for(const fake of [true,false]){
  const {c,machine}=setup();let rolls=[.99,.1,.1];
  let t=NovaNormal.spin({}, {phase:'normal'},3,{},fake?()=>rolls.shift()??.99:()=>.1,fake?'WEAK_NOVA':'STRONG_NOVA');
  for(let g=0;g<3;g++){
   c.syncCzPreludeGlow({czPrelude:t.czPrelude});assert.equal(machine.dataset.czPreludeActive,'true');
   c.normalState.internal=t.state;c.syncCzPreludeGlow();
   assert.equal(machine.dataset.czPreludeActive,String(!!t.state.prelude));
   if(g<2)t=NovaNormal.spin(t.state,{phase:'normal'},3,{},()=>.99,'BELL');
  }
  if(fake)assert.equal(machine.dataset.czPreludeActive,'false');
  else {c.syncCzPreludeGlow({czPrelude:{announce:true}});assert.equal(machine.dataset.czPreludeActive,'false');}
 }
});
test('bonus, AT prelude and reset do not retain the CZ red frame',()=>{
 const {c,machine}=setup();
 c.normalState.internal={prelude:{presentation:'reel'}};
 c.normalState.bonusPending=true;c.syncCzPreludeGlow();assert.equal(machine.dataset.czPreludeActive,'false');
 c.normalState.bonusPending=false;c.session.active=true;c.syncCzPreludeGlow();assert.equal(machine.dataset.czPreludeActive,'false');
 c.session.active=false;c.normalState.internal={};c.syncCzPreludeGlow({atPrelude:{after:2}});assert.equal(machine.dataset.czPreludeActive,'false');
 c.syncCzPreludeGlow();assert.equal(machine.dataset.czPreludeActive,'false');
});
