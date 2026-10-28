import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';const c=vm.createContext({});for(const f of ['nova-tuning.js','nova-art.js','nova-balance.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);const a=c.NovaArt;
test('ouma final miss reaches 100 through fixed 50pt wins without freeze',()=>{
 for(const award of ['0','50']){
  let state={...a.startZone(a.enter(),'ouma'),zoneLeft:1,award},wins=0;
  while(state.zone){const before=Number(state.award),out=a.step(state,{},()=>.9,'MISS');assert.equal(out.result,'SUPER_NOVA');assert.equal(out.zoneAward,50);assert.equal(Number(out.flow.award)-before,50);assert.equal(out.flow.oumaPending,false);state=out.flow;wins++;}
  assert.equal(state.award,'100');assert.equal(wins,award==='0'?2:1);
 }
 const out=a.step({...a.startZone(a.enter(),'ouma'),zoneLeft:1,award:'100'},{},()=>.9,'MISS');assert.equal(out.result,'MISS');
});
test('natural final nova still gets a freeze lottery before its fixed wins satisfy the 100 floor',()=>{
 let out=a.step({...a.startZone(a.enter(),'ouma'),zoneLeft:1},{},()=>.9,'SUPER_NOVA');assert.equal(out.flow.award,'50');assert.equal(out.zoneAward,50);assert.equal(out.flow.oumaPending,true);
 const continued=a.prepareBet(out.flow,{},()=>.999);assert.equal(continued.zone,'ouma');assert.equal(continued.zoneLeft,1);assert.equal(continued.zero,false);
 out=a.step(continued,{},()=>.9,'MISS');assert.equal(out.result,'SUPER_NOVA');assert.equal(out.zoneAward,50);assert.equal(out.flow.award,'100');assert.equal(out.flow.zone,'');
});
test('zone awards no longer reduce hit or freeze chances above 2000',()=>{
 for(const id of ['urapi','ouma','ura_ouma','toto','sora','ura_sora']){const s=a.startZone(a.enter(),id);const low=a.zoneRules(s,a.defaults),high=a.zoneRules({...s,award:'10000'},a.defaults);assert.equal(high.hit,low.hit);assert.equal(high.reset,low.reset);assert.equal(high.freeze,low.freeze);}
 assert.equal(a.zoneAwardFactor('100000',500),1);
 const out=a.step({...a.startZone(a.enter(),'ura_ouma'),award:'10000'},{},()=>.2);assert.equal(out.result,'SUPER_NOVA');assert.ok(Number(out.flow.award)>10000);
});
test('updated reset rates retain the confidence of each cue color',()=>{
 assert.ok(Math.abs(c.NovaBalance.zoneMean('ura_ouma')-1000)<2);
 assert.ok(Math.abs(c.NovaBalance.zoneMean('ura_sora')-800)<2);
 for(const [id,total]of [['toto',.37],['sora',.50],['ura_sora',.65]]){
  const colors=a.aimColorsFor(a.startZone(a.enter(),id));
  assert.deepEqual([...colors.map(x=>x.hit)],[.2,.8,1]);
  assert.ok(Math.abs(colors.reduce((n,x)=>n+x.hit*x.weight,0)-total)<1e-12);
 }
});
