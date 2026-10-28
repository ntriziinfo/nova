import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
function setup({async=false,order=[2,1,0]}={}){
 const timers=new Map(),pressed=[];let id=0;
 const spin={stopped:[false,false,false],visualStopping:[false,false,false],resolved:{aim:{symbol:'nebula',color:'rainbow'}}};
 const c=vm.createContext({currentSpin:spin,isSpinning:true,spinCanStop:false,
  NovaBellNavi:{stopOrder:()=>order.slice()},isPremiumBigConfirmStopLocked:()=>false,autoPollDelayMs:()=>10,
  setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(id){timers.delete(id);},
  stopSingleReel(i){pressed.push(i);if(async)spin.visualStopping[i]=true;else spin.stopped[i]=true;}
 });
 vm.runInContext(source.match(/  function stopAutoReelInOrder\([^]*?\n  }/)[0],c);
 const tick=()=>{for(const [id,fn]of [...timers]){timers.delete(id);fn();}};
 return {c,spin,timers,pressed,tick};
}
test('early first stop and out-of-order timer delivery never forfeit a drawn rainbow NEBULA',()=>{
 const {c,spin,pressed,tick}=setup();
 c.stopAutoReelInOrder(spin,2); // The old implementation dropped this right press.
 c.spinCanStop=true;
 c.stopAutoReelInOrder(spin,1);c.stopAutoReelInOrder(spin,0);
 assert.deepEqual(pressed,[]);tick();tick();
 assert.deepEqual(pressed,[2,1,0]);assert(spin.stopped.every(Boolean));
 assert.equal(spin.resolved.aim.color,'rainbow');
});
test('animation completion can overlap without reordering presses or duplicating stops',()=>{
 const {c,spin,pressed,timers,tick}=setup({async:true});c.spinCanStop=true;
 for(const i of [0,1,2,0,1,2])c.stopAutoReelInOrder(spin,i);
 tick();tick();assert.deepEqual(pressed,[2,1,0]);assert.equal(timers.size,0);
});
test('stale retries cannot stop a new spin or a completed game',()=>{
 for(const end of ['new','done']){
  const {c,spin,pressed,tick}=setup();c.stopAutoReelInOrder(spin,2);
  c.spinCanStop=true;if(end==='new')c.currentSpin={stopped:[false,false,false]};else c.isSpinning=false;
  tick();assert.deepEqual(pressed,[]);
 }
});
test('normal, middle-first and scissors AUTO orders survive reversed and duplicate timer delivery',()=>{
 for(const order of [[0,1,2],[1,0,2],[0,2,1]]){
  const {c,spin,pressed,tick}=setup({order});c.spinCanStop=true;
  for(const i of [2,1,0,2,1,0])c.stopAutoReelInOrder(spin,i);
  for(let guard=0;guard<6&&pressed.length<3;guard++)tick();
  assert.deepEqual(pressed,order);assert.equal(new Set(pressed).size,3);
 }
});
