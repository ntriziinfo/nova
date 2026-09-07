import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8'),calls=[],machine={dataset:{czLamp:'0',czRainbow:'false'}};
const ctx=vm.createContext({document:{getElementById:()=>machine},setTimeout:fn=>{fn();return 1;},clearTimeout:()=>{},sfxOutputVolume:()=>.6,playLockedBonusConfirmSound:(...args)=>calls.push(args)});
vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),ctx);
for(const name of ['playCzConfirmedSound','showCzLamp'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],ctx);
vm.runInContext('let czLampTimers=[];',ctx);
test('full and rainbow confirmation play exactly once despite repeated finish callbacks',()=>{
 for(const rainbow of [false,true]){
  calls.length=0;machine.dataset.czLamp='0';machine.dataset.czRainbow='false';
  const resolved={bonusHit:true,czLamp:{stage:rainbow?5:6,rainbow,rainbowAt:1,totalGames:20,remaining:1}};
  ctx.showCzLamp(1,resolved);ctx.showCzLamp(2,resolved);assert.equal(calls.length,0);
  ctx.showCzLamp(3,resolved);ctx.showCzLamp(3,resolved);ctx.showCzLamp(3,resolved);
  assert.deepEqual(calls,[['assets/media/jag/cz_patrol_confirm.wav?v=19',.6]]);
 }
});
test('partial lamps and unconfirmed outcomes stay silent',()=>{
 calls.length=0;machine.dataset.czLamp='0';
 ctx.showCzLamp(3,{bonusHit:false,czLamp:{stage:3,rainbow:false,totalGames:20,remaining:1}});
 ctx.playCzConfirmedSound({bonusHit:false});assert.equal(calls.length,0);
});
