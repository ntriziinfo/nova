import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-art.js','utf8'),ctx);const a=ctx.NovaArt;
const seq=(...values)=>()=>values.length>1?values.shift():values[0];
test('each zone and target use exact color success boundaries, even above 2000pt',()=>{
 for(const id of ['toto','sora','ura_sora'])for(const award of ['0','2500'])for(const symbol of ['seven','nebula'])for(const [roll,color,p] of [[.1,'blue',.2],[.7,'red',.8],[.97,'rainbow',1]]){
  const s={...a.startZone(a.enter(),id),award};
  const target=symbol==='seven'?.99:0;
  for(const [hitRoll,win] of [[p-1e-9,true],...(p<1?[[p,false]]:[])]){
   const out=a.step(s,{},seq(.5,target,roll,hitRoll,.1));
   assert.equal(out.aim.color,color);assert.equal(out.aim.symbol,symbol);
   assert.equal(out.result,win?(symbol==='seven'?'BIG':'NEBULA'):'MISS');
  }
 }
});
test('per-zone color distributions and color success rates converge',()=>{
 let seed=317;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const id of ['toto','sora','ura_sora']){
  const s=a.startZone(a.enter(),id),counts={blue:[0,0],red:[0,0],rainbow:[0,0]};
  for(let i=0;i<100000;i++){const out=a.drawSevenAim(s,a.defaults,rng);counts[out.color][0]++;counts[out.color][1]+=out.result!=='MISS';}
  for(const row of a.aimColorsFor(s,a.defaults)){const [n,win]=counts[row.color];assert.ok(Math.abs(n/100000-row.weight)<.01);assert.ok(Math.abs(win/n-row.hit)<.015);}
 }
});
test('final game cue survives settlement and nebula resets five games with 10pt',()=>{
 const s={...a.startZone(a.enter(),'sora'),zoneLeft:1,sevenHits:2};
 const fail=a.step(s,{},seq(.5,.9,.1,.8));assert.equal(fail.flow.zone,'');assert.equal(fail.aim.color,'blue');
 const win=a.step(s,{},seq(.5,0,.97,.99));assert.equal(win.flow.zoneLeft,5);assert.equal(win.flow.award,'10');assert.equal(win.aim.symbol,'nebula');
});

test('each seven zone guarantees a first seven on its last failed game',()=>{
 for(const id of ['toto','sora','ura_sora']){
  let s=a.startZone(a.enter(),id),out;
  for(let i=0;i<5;i++){out=a.step(s,{},()=>.1,'MISS');s=out.flow;if(i<(id==='sora'?3:4))assert.equal(out.result,'MISS');}
  assert.equal(out.result,'BIG');assert.equal(out.aim.guaranteed,true);assert.equal(out.aim.color,'rainbow');assert.equal(s.sevenHits,id==='sora'?2:1);assert.equal(s.zone,'');assert.ok(Number(s.award)>=50);
 }
});
test('nebula resets retain the guarantee and a prior seven consumes it',()=>{
 let s={...a.startZone(a.enter(),'sora'),zoneLeft:1};
 let out=a.step(s,{},()=>.1,'NEBULA');assert.equal(out.result,'NEBULA');assert.equal(out.flow.zoneLeft,5);assert.equal(out.flow.sevenHits,0);
 out=a.step({...out.flow,zoneLeft:1},{},()=>.1,'MISS');assert.equal(out.result,'BIG');
 out=a.step({...a.startZone(a.enter(),'toto'),sevenHits:1,zoneLeft:1},{},()=>.1,'MISS');assert.equal(out.result,'MISS');
 assert.equal(a.startZone(out.flow,'sora').sevenHits,0);
});
