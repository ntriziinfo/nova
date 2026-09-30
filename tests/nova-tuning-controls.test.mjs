import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';

const bands=[{net:0,chance:.65},{net:4800,chance:.55},{net:7200,chance:.45},{net:9600,chance:.4}];

test('historical pre-merge: setting controls are immutable, isolated and reject invalid distributions',()=>{
 loadModel('../tests/fixtures/pre-role-merge');const original=NovaTuning,snapshot=JSON.stringify(original.snapshot());
 const tuned=original.withOverrides({5:{cz:1.5,zone:2},6:{base:65,replay:.64,upper:2}});
 assert.equal(JSON.stringify(original.snapshot()),snapshot);assert.equal(tuned.profile(5).cz,1.5);
 for(const s of [1,2,3,4])assert.deepEqual(tuned.profile(s),original.profile(s));
 assert(Object.isFrozen(tuned.profile(6)));assert(Object.isFrozen(tuned.profile(6).groups));
 assert.throws(()=>original.withOverrides({7:{cz:1}}));
 assert.throws(()=>original.withOverrides({1:{winRate:.7}}));
 assert.throws(()=>original.withOverrides({1:{cz:NaN}}));
 assert.throws(()=>original.withOverrides({1:{weights:[1]}}));
 assert.throws(()=>original.withOverrides({1:{groups:[0,0,0]}}));
 assert.throws(()=>original.withOverrides({1:{thresholdBands:[{net:9600,chance:.35}]}}));
 assert.throws(()=>original.withOverrides({1:{thresholdBands:[{net:0,chance:.4},{net:2400,chance:.65}]}}));
 assert.throws(()=>loadModel('../tests/fixtures/pre-role-merge',true,{6:{base:42,replay:.9}}),/invalid role probabilities/);
});

test('historical pre-merge: net tiers freeze at challenge start, survive save/reload, and preserve rare guarantees',()=>{
 loadModel('../tests/fixtures/pre-role-merge',true,{6:{thresholdBands:bands}});
 assert.equal(NovaTuning.thresholdSuccess(6,4799),.65);assert.equal(NovaTuning.thresholdSuccess(6,4800),.55);
 assert.equal(NovaTuning.thresholdSuccess(6,7200),.45);assert.equal(NovaTuning.thresholdSuccess(6,9600),.4);
 assert.equal(NovaTuning.thresholdSuccess(5,20000),undefined);
 NovaProgress.observeNet(9800);
 let s={...NovaArt.enter({setting:6},()=>.5),burstPending:true,researchChallengeSource:'threshold'};
 let out=NovaArt.step(s,{setting:6},()=>.999,'BELL');
 assert.equal(out.researchChallenge.targetChance,.4);assert.equal(out.flow.researchChallengeSuccess,.4);
 const saved=JSON.parse(JSON.stringify(out.flow));
 loadModel('../tests/fixtures/pre-role-merge',true,{6:{thresholdBands:bands}});NovaProgress.observeNet(2500);
 out=NovaArt.step(saved,{setting:6},()=>.1,'MISS');
 assert.equal(out.researchChallenge.targetChance,.4);assert.equal(out.researchChallenge.won,false);
 assert.equal(out.flow.burstLeft,10);
 out=NovaArt.step(out.flow,{setting:6},()=>.999,'WEAK_NOVA');
 assert.equal(out.researchChallenge.nextAim,'rare');
 out=NovaArt.step(out.flow,{setting:6},()=>.999,'MISS');
 assert.equal(out.researchChallenge.won,true);assert.equal(out.researchChallenge.targetChance,.4);
 assert.equal(out.flow.researchChallengeSuccess,undefined);
 for(const source of ['initial','rare']){
  s={...NovaArt.enter({setting:6},()=>.5),burstPending:true,researchChallengeSource:source};
  out=NovaArt.step(s,{setting:6},()=>.999,'BELL');
  assert.equal(out.researchChallenge.targetChance,undefined);
 }
});

test('historical pre-merge: a paid BET at a net tier boundary uses the pre-BET tier in both paths',()=>{
 loadModel('../tests/fixtures/pre-role-merge',true,{6:{thresholdBands:bands}});
 const s={...NovaArt.enter({setting:6},()=>.5),burstPending:true,researchChallengeSource:'threshold'};
 const pinned=NovaArt.queueResearchThreshold(s,4800);
 assert.equal(pinned.researchChallengeSuccess,.55);
 NovaProgress.observeNet(4797);
 const out=NovaArt.step(pinned,{setting:6,netPt:4797},()=>.999,'BELL');
 assert.equal(out.researchChallenge.targetChance,.55);
 const pending={...s,zone:'sora'};delete pending.researchChallengeSuccess;
 assert.equal(NovaArt.queueResearchThreshold(pending,4800).researchChallengeSuccess,undefined);
 const later=NovaArt.queueResearchThreshold({...pending,zone:''},4700);
 assert.equal(later.researchChallengeSuccess,.65);
});

test('historical pre-merge: net-tier breakthrough targets include all HOLD and rare-rewrite games',()=>{
 loadModel('../tests/fixtures/pre-role-merge',true,{6:{thresholdBands:bands}});
 for(const {net,chance}of bands){
  const rng=xoshiro128('NOVA-tier-validation-'+chance);let wins=0;
  for(let i=0;i<5000;i++){
   NovaProgress.reset();NovaProgress.observeNet(net);
   let s={...NovaArt.enter({setting:6},rng),burstPending:true,researchChallengeSource:'threshold'},out;
   do {out=NovaArt.step(s,{setting:6},rng);s=out.flow;}while(!out.researchChallenge.finished);
   wins+=Number(out.researchChallenge.won);
  }
  assert(Math.abs(wins/5000-chance)<.025,`${chance}: ${wins/5000}`);
 }
});

test('historical pre-merge: every setting uses configured base, replay, CZ, upper power and zone groups',()=>{
 for(let s=1;s<=6;s++){
  loadModel('../tests/fixtures/pre-role-merge',true,{[s]:{base:65,replay:.60,cz:.5,zone:2,direct:2,upper:3,groups:[0,100,0]}});
  const row=NovaNormal.roleProbabilities(s),paid=Object.entries(row).reduce((sum,[role,p])=>sum+p*NovaNormal.pay(role),0);
  assert(Math.abs(50/(3*(1-row.REPLAY)-paid)-65)<1e-9);assert.equal(row.REPLAY,.60);
  assert(Math.abs(Object.values(row).reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.deepEqual(NovaArt.zoneGroupWeights(s),[0,100,0]);
  assert.equal(NovaArt.commonAtRulesFor(s).direct,1.2);
  assert.equal(NovaTuning.profile(s).upper,3);
  assert(NovaNormal.roleCzRate({level:'low'},'WEAK_NOVA',s)<.2);
 }
});

test('historical pre-merge: with decrement disabled, setting 6 preserves the v167 30,000G fixture',()=>{
 const fixture=JSON.parse(fs.readFileSync('tests/fixtures/nova-v167-session-digests.json','utf8'));
 for(const trial of fixture.trials.filter(row=>row.setting===6)){
  loadModel('../tests/fixtures/pre-role-merge',true,{6:{normalReplayReduction:0,extraZone:0}});const actual=simulate(trial.setting,trial.games,trial.seed,{...fixture.options,decrement:false});
  assert.equal(createHash('sha256').update(JSON.stringify(actual)).digest('hex'),trial.sha256);
 }
});
