import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const a=ctx.NovaArt,b=ctx.NovaBalance;
test('profiles show measured complete-stop RTP for the tuned AT level mix',()=>{
 const report=JSON.parse(fs.readFileSync('docs/balance118-final-summary.json','utf8'));
 for(let i=0;i<6;i++){const p=b.profile(i+1);assert.equal(p.target,b.targets[i]);assert.equal(p.verifiedModel,"balance118-30000g-complete-stop");assert.equal(p.previousVerifiedModel,"comeback116-30000g-complete-stop");assert.ok(Math.abs(p.target-report.settings[i].report.stoppedRtp.value)<1e-6);assert.ok(p.scale>0);}
});
test('preparation zone selection follows nine outcomes and original group weights',()=>{
 for(let i=1;i<=6;i++){const counts=Object.fromEntries(a.zoneIds.map(x=>[x,0])),row=a.atZoneWeights(i,false,true);for(let k=0;k<10000;k++)counts[a.pickZone(i,()=> (k+.5)/10000)]++;for(let j=0;j<9;j++)assert.ok(Math.abs(counts[a.zoneIds[j]]-row[j]*100)<=1);}
});
test('BIG150 and REG75 finish by gross payout and do not guarantee ART',()=>{
 for(const kind of ['BIG','MID']){
  let s={bonusKind:kind,paid:0,bonusArtSets:0};
  while(s.paid<a.bonusTarget(kind)){const next=a.advanceBonus(s,false,8);s={...s,...next,paid:s.paid+8};}
  assert.equal(s.bonusPointsRemaining,0);assert.ok(s.paid>=a.bonusTarget(kind));assert.ok(s.paid<a.bonusTarget(kind)+8);
  assert.equal(a.afterBonus(null,{},s.bonusArtSets).phase,'normal');
 }
});
test('specials award sets without consuming points; sets continue at 150pt',()=>{
 let bonus={bonusKind:'BIG',paid:0,bonusArtSets:0};for(let i=0;i<2;i++)bonus={...bonus,...a.advanceBonus(bonus,true,0)};
 assert.equal(bonus.bonusArtSets,2);let flow=a.afterBonus(null,{},2);assert.equal(flow.remaining,'150');assert.equal(flow.sets,'1');
 flow={...flow,remaining:'3'};flow=a.step(flow,{rare:0},()=>.99,'BELL').flow;assert.equal(flow.remaining,'150');assert.equal(flow.sets,'0');
 flow={...flow,remaining:'3'};flow=a.step(flow,{rare:0},()=>.99,'BELL').flow;assert.equal(flow.phase,'art');assert.equal(flow.comebackLeft,5);
 const held=a.afterBonus({...a.enter(),remaining:'17',sets:'2'}, {},1);assert.equal(held.remaining,'17');assert.equal(held.sets,'3');
});

test('paid-role mix targets net 4 with free replays and 15pt bells',()=>{
 for(const zero of [0,a.bonusSpecial,.02]){let bells=0;for(let i=0;i<100000;i++)if(a.drawPaidRole(zero,15,()=> (i+.5)/100000)==='BELL')bells++;
 const p=(1-zero)*bells/100000;assert.ok(Math.abs(12*p-3*zero-4)<.0002);}
});
