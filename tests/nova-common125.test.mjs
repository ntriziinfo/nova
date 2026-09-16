import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';

test('AT entry has no performance lottery, including legacy level-weight overrides',()=>{
 loadModel();const a=NovaArt,rng=()=>{throw Error('AT entry consumed a lottery');};
 for(let setting=1;setting<=6;setting++){
  const s=a.enter({setting,atLevelWeights:[0,0,0,0,100]},rng);
  assert.equal(s.remaining,'300');assert(!('atLevel' in s));
  const bonus=a.afterBonus({phase:'normal'},{setting},2,rng);
  assert.equal(bonus.remaining,'300');assert.equal(bonus.sets,'1');assert(!('atLevel' in bonus));
 }
 assert.equal(a.atLevelRules,undefined);assert.equal(a.drawAtLevel,undefined);
});

test('old Lv5 and other saved levels produce the same ordinary AT outcomes',()=>{
 loadModel();const a=NovaArt;
 for(const role of Object.keys(a.rareRoles).concat('BELL','REPLAY'))for(let setting=1;setting<=6;setting++){
  const run=level=>a.step({...a.enter({setting}),atLevel:level,remaining:'9876',burstUsed:true},{setting},xoshiro128(125),role);
  for(const level of [0,1,2,3,4,5])assert.deepEqual(run(level),run(undefined));
 }
});

test('shared AT probabilities are valid with net four pt and no level dependence',()=>{
 loadModel();const a=NovaArt;
 for(let setting=1;setting<=6;setting++){
  const p=a.roleProbabilities(setting);
  assert(Object.values(p).every(p=>p>=0&&p<=1));
  assert(Math.abs(Object.values(p).reduce((a,b)=>a+b,0)-1)<1e-12);
  assert(Math.abs(Object.entries(p).reduce((n,[role,p])=>n+p*a.payout(role),0)-3*(1-p.REPLAY)-4)<1e-12);
  assert.deepEqual(a.roleProbabilities(setting,5),p);
  assert.deepEqual(a.zoneGroupWeights(setting),a.commonAtRules.groups);
  assert(a.zoneGroupWeights(setting,true)[0]<a.commonAtRules.groups[0]);
 }
});

test('retiring an unawarded point challenge preserves quota, sets, stock and queued zones',()=>{
 loadModel();const a=NovaArt;
 for(const burstLeft of [0,1,3]){
  const old={...a.enter(),burstVersion:1,burstType:'points',burstPending:true,burstLeft,burstWon:true,burstUsed:true,atLevel:5,remaining:'98765432109876543210',sets:'2',stock:'3',queuedZones:['ura_sora']};
  const s=a.normalize(old);assert.equal(s.remaining,old.remaining);assert.equal(s.sets,'2');assert.equal(s.stock,'3');assert.deepEqual(s.queuedZones,['ura_sora']);
  assert.equal(s.burstLeft,0);assert.equal(s.burstPending,false);assert.equal(s.burstWon,false);assert(!('atLevel' in s));assert.deepEqual(a.normalize(s),s);
 }
});

test('existing ura challenge progress and earned rewards survive the migration',()=>{
 loadModel();const a=NovaArt;
 const s=a.normalize({...a.enter(),burstVersion:1,burstType:'ura',burstLeft:2,burstUsed:true,remaining:'777',atLevel:5});
 assert.equal(s.burstLeft,2);assert.equal(s.burstUsed,true);
 const win=a.step(s,{},()=>0);assert.equal(win.burstEvent,'success');assert.equal(win.flow.remaining,'777');assert.equal(win.burstReward.type,'ura');assert.equal(win.burstReward.points,0);
 const saved=a.normalize(JSON.parse(JSON.stringify(win.flow))),entered=a.prepareBet(saved,{},()=>.5);
 assert.equal(entered.zone,'giru');assert(entered.ura);assert(!('atLevel' in entered));
 assert.equal(a.afterBonus(entered,{},0).remaining,'777');
});

test('2000pt is no cap or reward-damping threshold',()=>{
 loadModel();const a=NovaArt;
 const run=netPt=>a.step({...a.enter(),remaining:'9999',burstUsed:true},{setting:6,netPt},xoshiro128(125),'STRONG_NOVA');
 assert.deepEqual(run(-10000),run(10000));assert.equal(a.netRewardControl.enabled,false);assert.equal(a.zoneTailControl.factor,1);
});
