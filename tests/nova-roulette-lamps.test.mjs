import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const panel={},body={dataset:{}},timers=new Map();let serial=0;
const ids=['sosuke','toto','urapi','giru1','sora1','ouma1','kushuri','nito'],lamps=ids.map(artwork=>({dataset:{artwork}}));
const ctx=vm.createContext({crypto:{getRandomValues:a=>{a[0]=12345678;return a;}},document:{body,getElementById:()=>panel,querySelectorAll:()=>lamps},setInterval:(fn,ms)=>{assert.equal(ms,55);timers.set(++serial,fn);return serial;},clearInterval:id=>timers.delete(id)});
vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-art.js','utf8'),ctx);
vm.runInContext('let zoneRouletteTimer=null;'+readGameSource().match(/  function showZoneRoulette\([^]*?\n  }/)[0],ctx);
test('fast roulette changes randomly without adjacent repeats or consuming gameplay RNG',()=>{
 vm.runInContext('Math.random=()=>{throw Error("animation must not consume game RNG")}',ctx);
 const flow={entryStage:'roulette',pendingZone:'ura_giru',remaining:'550',sets:'2'},saved=JSON.stringify(flow);
 ctx.showZoneRoulette(flow);assert.equal(body.dataset.zoneRouletteState,'roulette');
 const names=['宗介','とと','うらぴ','ギル','空','逢魔'],seen=new Set(),steps=new Set();let previous=-1;
 for(let i=0;i<120;i++){
  const index=ids.indexOf(body.dataset.zoneRouletteLamp);assert(index>=0&&index<6);assert.notEqual(index,previous);
  assert.equal(panel.textContent,'特化ゾーン抽選中… '+names[index]);
  assert.deepEqual(lamps.filter(l=>l.dataset.rouletteLit==='true').map(l=>l.dataset.artwork),[ids[index]]);
  seen.add(index);if(previous>=0)steps.add((index-previous+6)%6);previous=index;[...timers.values()][0]();
 }
 assert.equal(seen.size,6);assert(steps.size>3);assert.equal(JSON.stringify(flow),saved);
 ctx.showZoneRoulette(flow);assert.equal(timers.size,1);
});
test('confirmation stops cycling and lights the selected character including ura; clearing releases it',()=>{
 ctx.showZoneRoulette({entryStage:'confirmed',pendingZone:'ura_giru'});assert.equal(panel.textContent,'裏ギルゾーン確定！');assert.equal(body.dataset.zoneRouletteLamp,'giru1');assert.equal(timers.size,0);
 assert.equal(body.dataset.zoneRouletteState,'confirmed');assert.deepEqual(lamps.filter(l=>l.dataset.rouletteLit==='true').map(l=>l.dataset.artwork),['giru1']);
 ctx.showZoneRoulette(null);assert.equal(panel.hidden,true);assert.equal(body.dataset.zoneRouletteLamp,'');
 assert.equal(body.dataset.zoneRouletteState,'');assert(lamps.every(l=>l.dataset.rouletteLit==='false'));
});

test('legacy initial roulette omits ladder characters for unsupported amounts, ordinary roulette keeps them',()=>{
 for(const quota of [300,350,500,750,1000,1200]){
  ctx.showZoneRoulette({entryStage:'roulette',initialStage:'entry',entryQuota:String(quota)});
  const seen=new Set();for(let i=0;i<120;i++){seen.add(body.dataset.zoneRouletteLamp);[...timers.values()][0]();}
  const allowed=[300,500,1000].includes(quota);
  assert.equal(seen.has('sosuke'),allowed);assert.equal(seen.has('giru1'),allowed);
  for(const id of ['toto','urapi','sora1','ouma1'])assert.ok(seen.has(id));
 }
 ctx.showZoneRoulette(null);
});

test('new initial roulette selects the shared zone and lights both lamps',()=>{
 ctx.showZoneRoulette({entryStage:'roulette',initialStage:'entry',initialVersion:148,entryQuota:'200'});
 for(let i=0;i<8;i++){
  assert.equal(body.dataset.zoneRouletteLamp,'kushuri_nito');
  assert.equal(panel.textContent,'特化ゾーン抽選中… くしゅり＆にと');
  [...timers.values()][0]();
 }
 for(const id of ['kushuri_nito']){
  ctx.showZoneRoulette({entryStage:'confirmed',initialStage:'entry',initialVersion:148,pendingZone:id});
  assert.equal(body.dataset.zoneRouletteLamp,id);assert.equal(timers.size,0);
  assert.deepEqual(lamps.filter(l=>l.dataset.rouletteLit==='true').map(l=>l.dataset.artwork),['kushuri','nito']);
 }
 ctx.showZoneRoulette(null);
});
