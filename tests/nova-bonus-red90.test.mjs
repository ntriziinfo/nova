import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx=vm.createContext({});
for(const f of ['nova-tuning.js','nova-art.js','nova-aim-presentation.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const art=ctx.NovaArt,aim=ctx.NovaAim;
test('BIG red confidence is 90% before and after AT acquisition in all settings',()=>{
 let seed=271027;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let setting=1;setting<=6;setting++)for(const stock of [false,true]){
  const p=(stock?art.bonusStockFactor(setting):1)/2;
  const counts={blue:[0,0],red:[0,0],rainbow:[0,0]};
  for(let i=0;i<100000;i++){
   const won=rng()<p,cue=art.bonusAim(won?'NEBULA':'MISS',rng,setting,stock);
   if(cue.guide){counts[cue.color][0]++;counts[cue.color][1]+=Number(won);}
  }
  for(const [color,target]of [['blue',.2],['red',.9],['rainbow',1]]){
   const [n,w]=counts[color];assert(n>100);
   assert(Math.abs(w/n-target)<.012,`${setting}/${stock}/${color}: ${w/n}`);
   if(color==='rainbow')assert.equal(w,n);
  }
 }
});
test('BIG middle one-stop and both scissors two-stop confirmations never occur on a miss',()=>{
 for(const order of [[1,0,2],[1,2,0],[0,2,1],[2,0,1]])for(const won of [true,false]){
  const stops=order.map((index,n)=>aim.stopTarget({symbol:'nebula'},won?'NEBULA':'MISS',order.slice(0,n+1),index));
  const decisive=order[0]===1?0:1;
  assert.equal(stops[decisive].onLine,won);
  assert.equal(stops.at(-1).aligned,won);
  assert.equal(stops.every(s=>s.onLine),won);
 }
});
test('color changes consume the same RNG calls and never alter the result or guide frequency',()=>{
 for(const role of ['BELL','REPLAY','NEBULA','MISS'])for(const stock of [false,true]){
  let calls=0;const cue=art.bonusAim(role,()=>{calls++;return .4;},6,stock);
  assert.equal(calls,role==='MISS'?2:role==='NEBULA'?1:0);
  if(cue){assert.equal(cue.result,role);assert.equal(cue.guide,true);}
 }
});
