import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const a=ctx.NovaArt,b=ctx.NovaBalance;
test('the comeback change marks every RTP estimate historical, preserving its evidence source',()=>{
 const report=JSON.parse(fs.readFileSync('docs/role128-summary.json','utf8'));
 const measured=JSON.parse(fs.readFileSync('docs/s4-140-summary.json','utf8')).summary.horizons[30000].stopped;
 assert.equal(measured.trials,6000);assert.equal(measured.rtp,measured.paid/measured.bet);
 assert.ok(measured.ci95[0]>=1&&measured.ci95[1]<=1.01);
 for(let i=0;i<6;i++){
  const p=b.profile(i+1),evidence=report.settings[i];
  assert.equal(p.target,b.targets[i]);
  assert.equal(p.verifiedModel,'');
  assert.equal(p.previousVerifiedModel,i===3?'s4-140-30000g-complete-stop':'role128-30000g-complete-stop');
  assert.ok(Math.abs(p.target-(i===3?measured.rtp:evidence.stoppedRtp.value))<1e-6);assert.ok(p.scale>0);
 }
});

test('common AT evidence keeps session and episode denominators separate',()=>{
 const report=JSON.parse(fs.readFileSync('docs/common125-summary.json','utf8'));
 for(const r of report.settings){
  assert.equal(r.trials,1000);assert.equal(r.gamesPerTrial,30000);assert.equal(r.completeRate,r.complete/r.trials);
  assert.equal(r.rtp.value,r.rtp.paid/r.rtp.bet);assert.equal(r.stoppedRtp.value,r.rtp.value);
  const t=r.thresholds.find(x=>x.pt===2000);assert.equal(t.rate,t.observed/(r.episodes.completed+r.episodes.censored));
  assert(r.episodes.mid>r.prior.mid*1.4);assert(r.episodes.reach2000>r.prior.reach2000*1.4);
  assert(r.distribution.every(x=>x.rate===x.count/r.episodes.completed));
 }
});
test('preparation zone selection follows nine outcomes and original group weights',()=>{
 for(let i=1;i<=6;i++){const counts=Object.fromEntries(a.zoneIds.map(x=>[x,0])),row=a.atZoneWeights(i,false,true);for(let k=0;k<10000;k++)counts[a.pickZone(i,()=> (k+.5)/10000)]++;for(let j=0;j<9;j++)assert.ok(Math.abs(counts[a.zoneIds[j]]-row[j]*100)<=1);}
});
test('BIG finishes by gross payout and do not guarantee ART',()=>{
 for(const kind of ['BIG','MID']){
  let s={bonusKind:kind,paid:0,bonusArtSets:0};
  while(s.paid<a.bonusTarget(kind)){const next=a.advanceBonus(s,false,8);s={...s,...next,paid:s.paid+8};}
  assert.equal(s.bonusPointsRemaining,0);assert.ok(s.paid>=a.bonusTarget(kind));assert.ok(s.paid<a.bonusTarget(kind)+8);
  assert.equal(a.afterBonus(null,{},s.bonusArtSets).phase,'normal');
 }
});
test('bonus specials reserve ordinary zones after the first AT entitlement, without adding fixed points',()=>{
 let bonus={bonusKind:'BIG',paid:0,bonusArtSets:0};for(let i=0;i<2;i++)bonus={...bonus,...a.advanceBonus(bonus,true,0)};
 assert.equal(bonus.bonusArtSets,2);let flow=a.afterBonus(null,{},2,()=>.5);assert.equal(flow.remaining,'0');assert.equal(flow.sets,'1');
 while(flow.initialStage)flow=a.step(flow,{},()=>.5).flow;
 assert.equal(flow.remaining,String(a.drawEntryQuota({},()=>.5)));
 flow={...flow,remaining:'3'};const entry=a.step(flow,{},()=>0);flow=entry.flow;assert.equal(entry.result,'BIG');assert.equal(flow.remaining,'3');assert.equal(flow.sets,'0');assert.equal(flow.entryStage,'roulette');
 flow=a.step(flow,{},()=>.99,'MISS').flow;flow=a.prepareBet(flow,{},()=>0);assert.equal(flow.zone,'sosuke');assert.equal(flow.initialStage,'');
 flow=a.step(flow,{},()=>.99).flow;flow=a.step(flow,{},()=>.99,'MISS').flow;assert.equal(flow.remaining,'53');assert.equal(flow.zone,'');
 flow={...flow,remaining:'3'};flow=a.step(flow,{rare:0},()=>.99,'BELL').flow;assert.equal(flow.phase,'art');assert.equal(flow.comebackLeft,5);
 const held=a.afterBonus({...a.enter(),remaining:'17',sets:'2'}, {},1);assert.equal(held.remaining,'17');assert.equal(held.sets,'3');
});

test('paid-role mix targets net 4 with free replays and 15pt bells',()=>{
 for(const zero of [0,a.bonusSpecial,.02]){let bells=0;for(let i=0;i<100000;i++)if(a.drawPaidRole(zero,15,()=> (i+.5)/100000)==='BELL')bells++;
 const p=(1-zero)*bells/100000;assert.ok(Math.abs(12*p-3*zero-4)<.0002);}
});
