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
