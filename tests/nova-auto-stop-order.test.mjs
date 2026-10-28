import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
function setup({async=false,order=[2,1,0]}={}){
 const timers=new Map(),pressed=[],landed=[];let id=0;
 const spin={stopped:[false,false,false],visualStopping:[false,false,false],resolved:{aim:{symbol:'nebula',color:'rainbow'}}};
 const c=vm.createContext({currentSpin:spin,isSpinning:true,spinCanStop:false,
  NovaBellNavi:{stopOrder:()=>order.slice()},isPremiumBigConfirmStopLocked:()=>false,autoPollDelayMs:()=>10,
  setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(id){timers.delete(id);},
  stopSingleReel(i){pressed.push(i);if(async)spin.visualStopping[i]=true;else {spin.stopped[i]=true;landed.push(i);}}
 });
 vm.runInContext(source.match(/  function stopAutoReelInOrder\([^]*?\n  }/)[0],c);
 const tick=()=>{for(const [id,fn]of [...timers]){timers.delete(id);fn();}};
 const land=i=>{assert.equal(spin.visualStopping[i],true);spin.visualStopping[i]=false;spin.stopped[i]=true;landed.push(i);};
 return {c,spin,timers,pressed,landed,tick,land};
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
test('a later reel cannot begin stopping until the selected previous reel has landed',()=>{
 for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
  const {c,spin,pressed,landed,tick,land}=setup({async:true,order});c.spinCanStop=true;
  for(const i of [2,1,0,2,1,0])c.stopAutoReelInOrder(spin,i);
  tick();assert.deepEqual(pressed,[order[0]],String(order));
  land(order[0]);tick();assert.deepEqual(pressed,order.slice(0,2),String(order));
  land(order[1]);tick();assert.deepEqual(pressed,order,String(order));
  land(order[2]);tick();assert.deepEqual(landed,order,String(order));
 }
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
