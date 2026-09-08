import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const a=ctx.NovaArt;
test('ART consumes actual gross payout, with free replay, and zero-pay roles preserve its quota',()=>{
 for(const [role,pay] of [['BELL',15],['REPLAY',0],['WEAK_SUICA',6],['STRONG_BELL',15],['MISS',0],['NEBULA',0]]){
  const t=a.step(a.enter(),{big:0,zone:0},()=>.99,role);assert.equal(t.flow.remaining,String(150-pay));
 }
 const t=a.step({...a.enter(),remaining:'5'},{big:0,zone:0},()=>.99,'BELL');assert.equal(t.flow.phase,'normal');assert.equal(ctx.NovaNormal.pay(t.result),15);
});
test('legacy G counters migrate exactly once, including huge awards, while sets remain sets',()=>{
 const g=2n**200n,s=a.normalize({phase:'art',remaining:'50',award:String(g),initialAward:'50',sets:'3'});
 assert.equal(s.remaining,'275');assert.equal(s.award,String(g*11n/2n));assert.equal(s.initialAward,'275');assert.equal(s.sets,'3');
 assert.equal(a.normalize(JSON.parse(JSON.stringify(s))).award,s.award);
 const c=a.config({initial:50});assert.equal(c.initial,275);assert.equal(a.config(c).initial,275);
});
test('bonus special and blank outcomes do not consume payout quota and final bell is not truncated',()=>{
 for(const kind of ['BIG','MID']){
  const target=a.bonusTarget(kind),s={bonusKind:kind,paid:target-5,cost:999,bonusArtSets:0};
  assert.equal(a.advanceBonus(s,false,0).bonusPointsRemaining,5);
  assert.equal(a.advanceBonus(s,true,0).bonusArtSets,1);
  assert.equal(a.advanceBonus(s,false,8).bonusPointsRemaining,0);
 }
});
