import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';
import {xoshiro128,xoshiro128State} from '../scripts/zone-v2-rng.mjs';
import {install,options} from '../research/release-173/model.mjs';
const baseline='../research/release-173/baseline';
const roles=['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B'];
const near=(a,b)=>assert(Math.abs(a-b)<1e-12,`${a} != ${b}`);

test('historical pre-merge: normal replay shifts one point to misses while every shared role table and bell navigation stay intact',()=>{
 for(let setting=1;setting<=6;setting++){
  loadModel(baseline);const prior=NovaNormal.normalRoleProbabilities(setting),shared=NovaNormal.roleProbabilities(setting),at=NovaArt.roleProbabilities(setting),comeback=NovaArt.comebackRoleProbabilities(setting);
  loadModel('../tests/fixtures/pre-role-merge');const actual=NovaNormal.normalRoleProbabilities(setting);
  near(actual.REPLAY,prior.REPLAY-.01);near(actual.MISS,prior.MISS+.01);
  for(const role of Object.keys(prior).filter(k=>!['REPLAY','MISS'].includes(k)))assert.equal(actual[role],prior[role]);
  near(Object.values(actual).reduce((a,b)=>a+b,0),1);
  assert.deepEqual(NovaNormal.roleProbabilities(setting),shared);
  assert.deepEqual(NovaArt.roleProbabilities(setting),at);
  assert.deepEqual(NovaArt.comebackRoleProbabilities(setting),comeback);
 }
});

test('historical pre-merge: only setting 5 CZ frequency changes; guarantees, saved regimes and zone performance remain intact',()=>{
 for(let setting=1;setting<=6;setting++){
  const zoneRules=()=>NovaArt.zoneIds.map(id=>NovaArt.zoneRules(NovaArt.startZone(NovaArt.enter({setting},()=>.5),id,{setting,allowUra:true},()=>.5)));
  loadModel(baseline);NovaDecrement.reset(setting,xoshiro128State('same-regime-'+setting));
  const saved=NovaDecrement.snapshot(),prior=NovaNormal.roleCzRate({level:'low'},'WEAK_SUICA',setting),groups=NovaArt.zoneGroupWeights(setting),rules=zoneRules();
  const stock=NovaArt.normalize({phase:'art',remaining:'850',sets:'2',stock:'1',queuedZones:['sora'],researchUpper:true});
  loadModel('../tests/fixtures/pre-role-merge');NovaDecrement.bind(saved,setting);assert.deepEqual(NovaDecrement.snapshot(),saved);
  near(NovaNormal.roleCzRate({level:'low'},'WEAK_SUICA',setting),prior*(setting===5?2.6/2.45:1));
  assert.equal(NovaNormal.roleCzRate({level:'low'},'STRONG_NOVA',setting),1);
  assert.deepEqual(NovaArt.zoneGroupWeights(setting),groups);assert.deepEqual(zoneRules(),rules);
  assert.deepEqual(NovaArt.normalize(stock),stock);
 }
});

test('historical pre-merge: additional zone chances include decrement once and upper once, without including common or nova roles',()=>{
 loadModel('../tests/fixtures/pre-role-merge');
 for(let setting=1;setting<=6;setting++){
  NovaDecrement.reset(setting,xoshiro128State('extra-'+setting));
  for(const upper of [false,true])for(const role of roles)near(NovaArt.extraZoneChance(setting,role,upper),.01*(upper?1.5:1)*(role==='STRONG_SUICA'?2:1));
  for(const role of ['MISS','REPLAY','BELL','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'])assert.equal(NovaArt.extraZoneChance(setting,role,true),0);
  const saved=NovaDecrement.snapshot();saved.low=!saved.low;NovaDecrement.bind(saved,setting);NovaDecrement.observe(20000);
  near(NovaArt.extraZoneChance(setting,'STRONG_SUICA',true),.03);
 }
 assert.throws(()=>NovaTuning.withOverrides({5:{extraZone:-.1}}));
 assert.throws(()=>NovaTuning.withOverrides({5:{normalReplayReduction:.9}}));
});

test('historical pre-merge: actual role resolver produces 1/2 percent normal and 1.5/3 percent upper supplemental hits',()=>{
 loadModel('../tests/fixtures/pre-role-merge');const n=100000;
 for(const setting of [1,5,6]){
  NovaDecrement.reset(setting,xoshiro128State('role-rates-'+setting));
  for(const upper of [false,true])for(const role of roles){
   const rng=xoshiro128('supplemental-'+setting+'-'+upper+'-'+role),expected=.01*(upper?1.5:1)*(role==='STRONG_SUICA'?2:1);let wins=0;
   for(let i=0;i<n;i++)wins+=!!NovaArt.resolveAtRole({atHigh:false,researchUpper:upper},role,setting,rng).zone;
   assert(Math.abs(wins/n-expected)<5*Math.sqrt(expected*(1-expected)/n),`${setting}/${upper}/${role}: ${wins/n}`);
  }
 }
});

test('historical pre-merge: production exactly reproduces the approved replay/zone proposal over 30,000G for all settings',()=>{
 for(let setting=1;setting<=6;setting++){
  const replay=[.4364,.4382,.44,.4418,.4436,.53][setting-1],seed='NOVA-v173-equivalence-'+setting;
  install({setting,replay,extraRate:setting>=5?.04:.01,...(setting===5?{cz:2.6}:{})});
  const expected=simulate(setting,30000,seed,options);
  loadModel('../tests/fixtures/pre-role-merge');assert.deepEqual(simulate(setting,30000,seed,options),expected,'setting '+setting);
 }
});
