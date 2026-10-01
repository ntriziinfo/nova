import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('nova-flow.js','utf8'),c=vm.createContext({});vm.runInContext(source,c);const f=c.NovaFlow;
const plain=v=>JSON.parse(JSON.stringify(v));
test('each CZ seed produces an eight-character permutation with every character able to light first or last',()=>{
 const counts=Array.from({length:8},()=>new Map(f.lampCharacters.map(id=>[id,0]))),orders=new Set();
 for(let seed=0;seed<4096;seed++){
  const order=f.lampOrder({timingSeed:seed},1);assert.deepEqual([...order].sort(),[...f.lampCharacters].sort());
  orders.add(order.join(','));order.forEach((id,position)=>counts[position].set(id,counts[position].get(id)+1));
 }
 assert(orders.size>3000);for(const position of counts)for(const count of position.values())assert(count>280&&count<850);
});
test('lighting order survives stage changes, success rewrites and JSON reload without gameplay RNG',()=>{
 vm.runInContext('Math.random=()=>{throw Error("presentation must not draw game RNG")}',c);
 const state=Object.freeze({phase:'cz',totalGames:20,remaining:20,success:false,winProbability:.4,lampRoll:.125,rainbowRoll:.8});
 const expected=plain(f.lampOrder(state));
 for(let remaining=20;remaining>=1;remaining--)for(const success of [false,true]){
  const lamp=f.drawLamp({...state,remaining,success});
  for(const stage of [1,3,6])assert.deepEqual(plain(f.lampOrder(plain({...lamp,stage,remaining}))),expected);
 }
 assert.deepEqual(plain(state),{phase:'cz',totalGames:20,remaining:20,success:false,winProbability:.4,lampRoll:.125,rainbowRoll:.8});
 assert.deepEqual(plain(f.lampOrder({})),plain(f.lampCharacters));
});
test('renderer uses the shuffled prefix, keeps positions, and reserves rainbow for confirmation',()=>{
 const order=['ouma1','sora1','giru1','urapi','toto','sosuke','nito','kushuri'];
 c.items=new Map(f.lampCharacters.map(id=>[id,{dataset:{},style:{left:id}}]));c.machine={dataset:{czLamp:'1',czOrder:order.join(',')},classList:{contains:()=>false}};
 c.chance={classList:{contains:()=>false}};c.layer={dataset:{}};c.lampMode={value:'auto'};
 vm.runInContext(fs.readFileSync('nova-artwork.js','utf8').match(/  function syncLamp\(\)\{[^]*?\n  }/)[0],c);
 for(let stage=1;stage<=8;stage++){
  c.machine.dataset.czLamp=String(stage);c.syncLamp();
  for(const [id,item]of c.items){assert.equal(item.dataset.czLit,String(order.indexOf(id)<stage));assert.equal(item.style.left,id);}
  assert.equal(c.layer.dataset.lamp,stage===8?'cz-rainbow':'cz');
 }
 c.machine.dataset.czLamp='2';c.machine.dataset.czRainbow='true';c.syncLamp();assert.equal(c.layer.dataset.lamp,'cz-rainbow');
 c.machine.dataset={czLamp:'2',czOrder:'not,a,valid,order'};c.syncLamp();assert.equal(c.items.get('kushuri').dataset.czLit,'true');
 c.machine.dataset={czLamp:'0',czOrder:''};c.syncLamp();assert.equal(c.layer.dataset.lamp,'dim');
});
test('live stop handler applies the same shuffled prefix throughout one CZ and clears it afterward',()=>{
 const machine={dataset:{}},sounds=[],ctx=vm.createContext({settings:{setting:1},normalState:{},document:{getElementById:()=>machine},NovaFlow:f,sfxOutputVolume:()=>.5,playOneShotSound:()=>sounds.push('light'),playCzConfirmedSound:()=>sounds.push('confirm')});
 vm.runInContext(fs.readFileSync('nova-game.js','utf8').match(/  function showCzLamp\([^]*?\n  }/)[0],ctx);
 let previous=0;const expected=f.lampOrder({timingSeed:42}).join(',');
 for(let remaining=20;remaining>=1;remaining--){
  const resolved={czLamp:{stage:4,totalGames:20,remaining,timingSeed:42}};
  for(let stop=0;stop<=3;stop++){
   const count=sounds.length;ctx.showCzLamp(stop,resolved);assert.equal(machine.dataset.czOrder,expected);
   if(stop<3||remaining===20){assert.equal(Number(machine.dataset.czLamp),previous);assert.equal(sounds.length,count);}
   previous=Number(machine.dataset.czLamp)||0;
  }
 }
 assert.equal(previous,6);assert.equal(machine.dataset.czRainbow,'false');
 ctx.showCzLamp(3,{bonusHit:true,czLamp:{stage:4,totalGames:20,remaining:1,timingSeed:42}});assert.equal(machine.dataset.czLamp,'8');assert.equal(machine.dataset.czRainbow,'true');
 ctx.showCzLamp(0,null);assert.equal(machine.dataset.czOrder,'');assert.equal(machine.dataset.czLamp,'0');
});

test('confirmed prefixes cannot occur below their minimum, and ordinary shuffle cannot accidentally produce any hint',()=>{
 const seen=Array.from({length:6},()=>new Map()),samples=20000;
 assert.equal(new Set(f.lampHints.map(h=>h.prefix.join(','))).size,9);
 for(let setting=1;setting<=6;setting++)for(let seed=0;seed<samples;seed++){
  const p=f.lampPresentation({timingSeed:seed},setting),hint=f.lampHints.find(h=>h.id===p.hint);
  assert.equal(f.lampHintForOrder(p.order),p.hint);
  if(hint){assert(hint.rates[setting-1]>0);assert((hint.minimumSetting||0)<=setting);assert.deepEqual([...p.order.slice(0,3)],[...hint.prefix]);}
  assert(p.minimumSetting<=setting);seen[setting-1].set(p.hint,(seen[setting-1].get(p.hint)||0)+1);
 }
 for(let setting=1;setting<=6;setting++)for(const h of f.lampHints){
  const frequency=(seen[setting-1].get(h.id)||0)/samples,expected=h.rates[setting-1];
  if(expected===0)assert.equal(frequency,0);else{assert(frequency>0);assert(Math.abs(frequency-expected)<.006,`${setting} ${h.id}: ${frequency}`);}
 }
});
test('CZ setting hints survive reload without reselecting or changing awards and timing',()=>{
 const seed=Array.from({length:5000},(_,i)=>i).find(timingSeed=>f.lampPresentation({timingSeed},6).hint==='min6');assert.notEqual(seed,undefined);
 const machine={dataset:{}},ctx=vm.createContext({settings:{setting:6},normalState:{},document:{getElementById:()=>machine},NovaFlow:f,sfxOutputVolume:()=>.5,playOneShotSound(){},playCzConfirmedSound(){}});
 vm.runInContext(fs.readFileSync('nova-game.js','utf8').match(/  function showCzLamp\([^]*?\n  }/)[0],ctx);
 const first={czLamp:{stage:4,totalGames:20,remaining:20,timingSeed:seed},reward:15,bonusHit:false};ctx.showCzLamp(0,first);
 const expected=machine.dataset.czOrder;assert.equal(first.czLampPresentation.minimumSetting,6);assert.equal(first.reward,15);assert.equal(first.bonusHit,false);assert.equal(machine.dataset.czLamp,'0');
 ctx.normalState=plain(ctx.normalState);ctx.settings.setting=1;
 const next={czLamp:{stage:4,totalGames:20,remaining:19,timingSeed:seed}};ctx.showCzLamp(0,next);assert.equal(machine.dataset.czOrder,expected);assert.equal(next.czLampPresentation.setting,6);
 ctx.showCzLamp(0,null);assert.equal(ctx.normalState.czLampPresentation,null);
});
