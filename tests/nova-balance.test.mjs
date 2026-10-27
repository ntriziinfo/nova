import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createHash} from 'node:crypto';
const ctx=vm.createContext({});for(const f of ['nova-tuning.js','nova-art.js','nova-balance.js','nova-normal.js','nova-flow.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const a=ctx.NovaArt,b=ctx.NovaBalance;
const evidence=JSON.parse(fs.readFileSync('docs/parity-v174-at-onecoin-rtp-20261027-100m.json','utf8'));
test('AT one-coin RTP evidence hashes still identify every lottery input',()=>{
 for(const [file,expected]of Object.entries(evidence.sourceHashes)){
  if(file==='nova-balance.js')continue;
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),expected,file);
 }
 assert.match(evidence.sourceHashNote,/nova-balance\.js changed only to publish/);
});
test('RTP metadata matches the parity-v174 AT one-coin 100M evidence',()=>{
 const targets=evidence.targets;
 const measured=evidence.settings.map(row=>row.rtp);
 for(let i=0;i<6;i++){
  const p=b.profile(i+1);
  assert.equal(p.targetGamesPerTrial,100_000_000);
  assert.equal(p.gamesPerTrial,100_000_000);
  assert.equal(p.trials,1);
  assert.equal(p.totalVerifiedGames,evidence.settings[i].games);
  assert.equal(p.measuredRtp,measured[i]);
  assert.deepEqual(Array.from(p.measuredRtpCi95),evidence.settings[i].rtpCi95BatchMeans);
  assert.equal(p.verifiedModel,evidence.version);
  assert.match(p.verificationLabel,/AT中1枚役10%／奇数荒波・偶数安定／打ち切りなし1億G連続試算（1シード）/);
  assert.equal(p.target,targets[i]);
  assert.equal(p.scale,.21*(1+.12*a.settingBias[i]));
  assert.equal(evidence.settings[i].firstComplete,null);
  assert.equal(evidence.settings[i].completeReason,null);
  assert.equal(evidence.settings[i].totalBet,evidence.settings[i].games*3);
  assert.equal(evidence.settings[i].totalPaid-evidence.settings[i].totalBet,evidence.settings[i].net);
  assert.ok(evidence.settings[i].deltaFromTargetPoints>=-evidence.allowedLowDeltaPoints,`setting ${i+1} is more than ${evidence.allowedLowDeltaPoints}pt below target`);
  assert.ok(Math.abs(evidence.settings[i].deltaFromTargetPoints-(evidence.settings[i].rtp-evidence.settings[i].targetRtp)*100)<1e-6);
 }
 assert.deepEqual(Array.from(b.targets),targets);
 assert.equal(evidence.allowedLowDeltaPoints,1);
 assert.equal(evidence.totalGames,600_000_000);
});

test('standard RTP metadata applies only while both COMPLETE limits stay disabled',()=>{
 assert.equal(b.usesStandardSettings({completeEnabled:false,completeBasis:'none',completeLimitPt:0,completeMyLimitPt:0}),true);
 assert.equal(b.usesStandardSettings({completeEnabled:true,completeBasis:'none',completeLimitPt:0,completeMyLimitPt:0}),false);
 assert.equal(b.usesStandardSettings({completeEnabled:false,completeBasis:'net',completeLimitPt:0,completeMyLimitPt:0}),false);
 assert.equal(b.usesStandardSettings({completeEnabled:false,completeBasis:'none',completeLimitPt:10_000,completeMyLimitPt:0}),false);
 assert.equal(b.usesStandardSettings({completeEnabled:false,completeBasis:'none',completeLimitPt:0,completeMyLimitPt:19_000}),false);
});

test('initial-zone mean supports current and saved initial-point rules',()=>{
 const versions=[a.freshInitialRules.version,a.freshInitialRules.fixedVersion,a.freshInitialRules.previousVersion,a.freshInitialRules.legacyVersion];
 for(const version of versions)for(let setting=1;setting<=6;setting++){
  const expected=a.entryQuotaRules.games*Object.entries(a.initialRoleProbabilities(setting)).reduce((sum,[role,p])=>sum+p*a.freshInitialAward(setting,role,version),0);
  const actual=b.zoneMean('kushuri_nito',{setting,initialBoostActive:true,initialRuleVersion:version,initialMultiplier:1});
  assert.ok(Math.abs(actual-expected)<1e-9,`version ${version}, setting ${setting}`);
 }
 const current=b.zoneMean('kushuri_nito',{setting:6,initialBoostActive:true,initialMultiplier:1});
 const legacy=b.zoneMean('kushuri_nito',{setting:6,initialBoostActive:true,initialRuleVersion:a.freshInitialRules.legacyVersion,initialMultiplier:1});
 const fixed=b.zoneMean('kushuri_nito',{setting:6,initialBoostActive:true,initialRuleVersion:a.freshInitialRules.fixedVersion,initialMultiplier:5});
 assert.ok(Math.abs(current-legacy)<1e-9);assert.equal(fixed,300);
});

test('static page starts RTP fields in loading state and cache-busts current scripts',()=>{
 const html=fs.readFileSync('jag.html','utf8');
 assert.match(html,/id="targetRtpViewLegacy">読込中</);
 assert.match(html,/id="adminTargetRtpView">読込中</);
 assert.match(html,/nova-art\.js\?v=[^"\s]*parity-v174/);
 assert.match(html,/nova-complete\.js\?v=20261027-live-my/);
 assert.match(html,/nova-game\.js\?v=[^"\s]*parity-v174/);
 assert.match(html,/nova-balance\.js\?v=20261027-parity-v174-100m-at-onecoin-v1/);
 assert.match(html,/ライブ遊技はMY19,000ptを基準にコンプリート停止します/);
 assert.match(html,/奇数荒波・偶数安定調整後の、コンプリート・MY打ち切りなし1億G連続試算（各設定1シード）/);
 assert.doesNotMatch(html,/予備試算|最終検証待ち/);
 assert.doesNotMatch(html,/累計差枚＋10,000ptでコンプリートとなり停止します/);
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
 while(flow.initialStage)flow=a.step(flow,{},()=>.5,flow.initialStage==='wait'?'START_REPLAY_MIDDLE':'').flow;
 assert.equal(flow.remaining,String(a.freshInitialRules.quota));
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
