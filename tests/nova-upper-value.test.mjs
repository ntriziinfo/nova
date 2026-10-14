import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';
test('approved upper AT allocation strengthens weak-role zones and reduces only initial/rare entries',()=>{
 loadModel();const a=NovaArt,factors=[.5,.5,.4,.5,.5,.25],weak=[.15,.15,.15,.18,.3,.3],entries=[.0225,.033,.0465,.063,.0615,.021];
 for(let setting=1;setting<=6;setting++){
  assert.equal(a.initialBurstChance(setting),.05*factors[setting-1]);
  for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA'])assert.equal(a.burstChance(role,setting),a.burstRules.roles[role]*entries[setting-1]*factors[setting-1]);
  for(const high of [false,true])for(const upper of [false,true])assert.equal(a.extraZoneChance(setting,'WEAK_NOVA',upper,high),(upper?12:1)*(high?.25:.15)*weak[setting-1]);
 }
 assert.equal(a.burstRules.initialSuccess,.5);assert.equal(a.burstRules.success,.65);
});
test('live engine exactly replays approved upper proposal sessions including upper entries and cap',()=>{
 for(const row of JSON.parse(fs.readFileSync('tests/fixtures/upper-value-20261014-trials.json'))){
  loadModel();const r=simulate(row.setting,10000,row.seed,{rng:'xoshiro128',exactGames:true,completeLimitPt:19000,completeMyLimitPt:0,stopAtComplete:true,atBetRefund:true,replayRefund:true});
  for(const [actual,expected]of [['totalBet','bet'],['totalPaid','paid'],['net','net'],['peak','peak'],['games','games'],['upper','upper'],['actualAtZone','zone']])assert.deepEqual(r[actual],row[expected],row.seed+'/'+actual);
  assert.equal(!!r.firstComplete,row.complete);
 }
});
