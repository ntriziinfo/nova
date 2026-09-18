import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const panel={},body={dataset:{}},timers=new Map();let serial=0;
const ctx=vm.createContext({document:{body,getElementById:()=>panel},setInterval:fn=>{timers.set(++serial,fn);return serial;},clearInterval:id=>timers.delete(id)});
vm.runInContext(fs.readFileSync('nova-art.js','utf8'),ctx);
vm.runInContext('let zoneRouletteTimer=null;'+fs.readFileSync('jag.html','utf8').match(/  function showZoneRoulette\([^]*?\n  }/)[0],ctx);
test('roulette text and character lamp advance together through all six characters',()=>{
 ctx.showZoneRoulette({entryStage:'roulette'});
 const names=['宗介','とと','うらぴ','ギル','空','逢魔'],ids=['sosuke','toto','urapi','giru1','sora1','ouma1'];
 for(let i=0;i<12;i++){assert.equal(panel.textContent,'特化ゾーン抽選中… '+names[i%6]);assert.equal(body.dataset.zoneRouletteLamp,ids[i%6]);[...timers.values()][0]();}
});
test('confirmation stops cycling and lights the selected character including ura; clearing releases it',()=>{
 ctx.showZoneRoulette({entryStage:'confirmed',pendingZone:'ura_giru'});assert.equal(panel.textContent,'裏ギルゾーン確定！');assert.equal(body.dataset.zoneRouletteLamp,'giru1');assert.equal(timers.size,0);
 ctx.showZoneRoulette(null);assert.equal(panel.hidden,true);assert.equal(body.dataset.zoneRouletteLamp,'');
});

test('initial roulette omits ladder characters for unsupported amounts, ordinary roulette keeps them',()=>{
 for(const quota of [300,350,500,750,1000,1200]){
  ctx.showZoneRoulette({entryStage:'roulette',initialStage:'entry',entryQuota:String(quota)});
  const seen=new Set();for(let i=0;i<12;i++){seen.add(body.dataset.zoneRouletteLamp);[...timers.values()][0]();}
  const allowed=[300,500,1000].includes(quota);
  assert.equal(seen.has('sosuke'),allowed);assert.equal(seen.has('giru1'),allowed);
  for(const id of ['toto','urapi','sora1','ouma1'])assert.ok(seen.has(id));
 }
 ctx.showZoneRoulette(null);
});
