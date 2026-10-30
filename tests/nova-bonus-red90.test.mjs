import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx=vm.createContext({});
for(const f of ['nova-tuning.js','nova-art.js','nova-aim-presentation.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const art=ctx.NovaArt,aim=ctx.NovaAim;

test('first-hit BIG cue confidence remains blue 20%, red 90%, rainbow 100%',()=>{
  let seed=271027;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const counts={blue:[0,0],red:[0,0],rainbow:[0,0]};
  for(let i=0;i<300000;i++){
    const won=rng()<.5,cue=art.bonusAim(won?'NEBULA':'MISS',rng,3,false);
    if(cue.guide){counts[cue.color][0]++;counts[cue.color][1]+=Number(won);}
  }
  for(const [color,target]of [['blue',.2],['red',.9],['rainbow',1]]){
    const [n,w]=counts[color];assert(n>100);
    assert(Math.abs(w/n-target)<.012,`${color}: ${w/n}`);
    if(color==='rainbow')assert.equal(w,n);
  }
});

test('planned extra wins reuse the success cue while secured misses are blue with a 50% guide',()=>{
  for(let setting=1;setting<=6;setting++){
    let calls=0;
    const hit=art.bonusAim('NEBULA',()=>{calls++;return .4;},setting,true);
    assert.equal(calls,1);assert.equal(hit.result,'NEBULA');assert.equal(hit.guide,true);

    calls=0;
    const guided=art.bonusAim('MISS',()=>{calls++;return calls===1?.9:.49;},setting,true);
    assert.equal(calls,2);assert.equal(guided.color,'blue');assert.equal(guided.guide,true);
    calls=0;
    const hidden=art.bonusAim('MISS',()=>{calls++;return calls===1?.1:.5;},setting,true);
    assert.equal(calls,2);assert.equal(hidden.color,'blue');assert.equal(hidden.guide,false);
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

test('bonus aim never consumes RNG for non-aim roles and keeps result identity',()=>{
  for(const role of ['BELL','REPLAY'])for(const secured of [false,true]){
    let calls=0;const cue=art.bonusAim(role,()=>{calls++;return .4;},6,secured);
    assert.equal(calls,0);assert.equal(cue,null);
  }
  for(const secured of [false,true])for(const role of ['NEBULA','MISS']){
    const cue=art.bonusAim(role,()=>.4,6,secured);
    assert.equal(cue.result,role);
  }
});
