import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync('nova-art.js','utf8'));const a=NovaArt;
test('net restraint has smooth setting-specific thresholds and a nonzero floor',()=>{
 for(let setting=1;setting<=5;setting++){const t=[2000,2000,4000,4000,5000][setting-1];assert.equal(a.netRewardFactor(setting,-1999),1);assert.equal(a.netRewardFactor(setting,0),1);assert.ok(Math.abs(a.netRewardFactor(setting,t*.5)-.525)<1e-12);assert.ok(Math.abs(a.netRewardFactor(setting,t)-.05)<1e-12);assert.ok(a.netRewardFactor(setting,t*100)>0);}
 assert.equal(a.netRewardFactor(6,1e12),1);
});
test('new strong Nova zone wins retain 5 percent at threshold; chosen-zone distribution is unchanged',()=>{
 let won=0;for(let i=0;i<1000;i++){let calls=0;const r=a.resolveAtRole(a.enter(),'STRONG_NOVA',1,()=>++calls===1?.5:(i+.5)/1000,2000);if(r.zone)won++;}assert.equal(won,50);
});
test('direct awards can be suppressed but state promotion is not suppressed',()=>{
 let rolls=[0,0,0,.9];let s=a.enter();const r=a.resolveAtRole(s,'STRONG_SUICA',1,()=>rolls.shift(),2000);assert.equal(r.direct,0);assert.equal(s.atHigh,true);
});
test('earned quota, sets and all started zones are unaffected by net restraint',()=>{
 for(const id of a.zoneIds){const s={...a.startZone(a.enter(),id,{},()=>.2),sets:'3'};assert.deepEqual(a.step(s,{setting:1,netPt:20000},()=>.4),a.step(s,{setting:1,netPt:0},()=>.4));}
});
test('setting6 and negative net preserve both outcomes and random consumption',()=>{
 for(const [setting,netPt] of [[6,20000],[1,-1999]]){let x=0,y=0;const s=a.enter();assert.deepEqual(a.step(s,{setting,netPt},()=>{x++;return .1;},'STRONG_NOVA'),a.step(s,{setting,netPt:0},()=>{y++;return .1;},'STRONG_NOVA'));assert.equal(x,y);}
});
test('browser and simulators provide actual cumulative net to the shared engine',()=>{
 const h=fs.readFileSync('jag.html','utf8');assert.match(h,/function currentProfit\(\)\{\s*return \(Number\(stats.totalPaid\) \|\| 0\) - \(Number\(stats.totalFee\) \|\| 0\)/);assert.equal((h.match(/netPt:currentProfit\(\)/g)||[]).length,2);
 for(const file of ['scripts/zone-v2-model.mjs','scripts/simulate-normal.mjs'])assert.match(fs.readFileSync(file,'utf8'),/netPt:options.netGuard===false\?0:paid-fee/);
});
