import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadModel} from '../scripts/zone-v2-model.mjs';
test('parity profiles control upper entry and zone quality without changing weak-role hit frequency',()=>{
 loadModel();const a=NovaArt,entries=[.0225,.033,.0465,.063,.0615,.021];
 for(let setting=1;setting<=6;setting++){
  const profile=a.balanceFor(setting);assert.equal(a.initialBurstChance(setting),.05*profile.upperEntry);
  for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA'])assert.equal(a.burstChance(role,setting),a.burstRules.roles[role]*entries[setting-1]*profile.upperEntry);
  assert.deepEqual(a.atZoneWeights(setting,false,false,true),profile.upperGroups.flatMap(p=>[p/3,p/3,p/3]));
  for(const high of [false,true])assert(Math.abs(a.weakAtResponseChance(setting,true,high)-(high?.225:.15))<1e-12);
 }
 assert.equal(a.burstRules.initialSuccess,.5);assert.equal(a.burstRules.success,.65);
});
test('archived checkpoint-ten report retains six complete deterministic ledgers',()=>{
 const report=JSON.parse(fs.readFileSync('docs/checkpoint10-20261015.json'));
 assert.equal(report.deterministicFixtures.length,6);
 assert.deepEqual(report.deterministicFixtures.map(row=>row.setting),[1,2,3,4,5,6]);
 for(const row of report.deterministicFixtures){assert(row.atMetrics.directWins>0);assert.equal(row.games,report.games);assert.equal(row.totalBet,row.games*3);assert.equal(row.net,row.totalPaid-row.totalBet);assert.equal(row.rtp,row.totalPaid/row.totalBet);}
});
