import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const a=ctx.NovaArt,b=ctx.NovaBalance;
test('new mode profiles retain the six targets with positive fitted entry scales',()=>{
 for(let i=0;i<6;i++){const p=b.profile(i+1);assert.equal(p.target,b.targets[i]);assert.equal(p.verifiedModel,"red-seven-calibrated-v17");assert.ok(p.scale>0);if(i)assert.ok(p.directDenom<b.profile(i).directDenom);}
});
test('zone selection exactly follows each setting table with all six reachable',()=>{
 for(let i=1;i<=6;i++){const counts=Object.fromEntries(Object.keys(a.names).map(x=>[x,0]));for(let k=0;k<10000;k++)counts[a.pickZone(i,()=> (k+.5)/10000)]++;assert.deepEqual(Object.values(counts),Array.from(a.zoneWeights[i-1],p=>p*100));}
});
test('BIG165 and REG83 finish by gross payout and do not guarantee ART',()=>{
 for(const kind of ['BIG','MID']){
  let s={bonusKind:kind,paid:0,bonusArtSets:0};
  while(s.paid<a.bonusTarget(kind)){const next=a.advanceBonus(s,false,8);s={...s,...next,paid:s.paid+8};}
  assert.equal(s.bonusPointsRemaining,0);assert.ok(s.paid>=a.bonusTarget(kind));assert.ok(s.paid<a.bonusTarget(kind)+8);
  assert.equal(a.afterBonus(null,{},s.bonusArtSets).phase,'normal');
 }
});
test('specials award sets without consuming points; sets continue at 275pt',()=>{
 let bonus={bonusKind:'BIG',paid:0,bonusArtSets:0};for(let i=0;i<2;i++)bonus={...bonus,...a.advanceBonus(bonus,true,0)};
 assert.equal(bonus.bonusArtSets,2);let flow=a.afterBonus(null,{},2);assert.equal(flow.remaining,'275');assert.equal(flow.sets,'1');
 flow={...flow,remaining:'3'};flow=a.step(flow,{rare:0},()=>.99,'BELL').flow;assert.equal(flow.remaining,'275');assert.equal(flow.sets,'0');
 flow={...flow,remaining:'3'};flow=a.step(flow,{rare:0},()=>.99,'BELL').flow;assert.equal(flow.phase,'normal');
 const held=a.afterBonus({...a.enter(),remaining:'17',sets:'2'}, {},1);assert.equal(held.remaining,'17');assert.equal(held.sets,'3');
});

test('ART and bonus distributions have expected net 2.5pt including zero-pay special roles',()=>{
 for(const [zero,pay]of [[a.defaults.rare,8],[a.bonusSpecial,8]]){let paid=0;for(let i=0;i<100000;i++){const role=a.drawPaidRole(zero,pay,()=> (i+.5)/100000);paid+=role==='BELL'?pay:3;}assert.ok(Math.abs((1-zero)*paid/100000-3-2.5)<.0002);}
});
