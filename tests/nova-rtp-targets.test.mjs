import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {summarizeTrials} from '../scripts/tuning-statistics.mjs';
import {loadModel} from '../scripts/zone-v2-model.mjs';

test('previous RTP report reconciles all 6,000 stopped trials',()=>{
 const report=JSON.parse(fs.readFileSync('docs/rtp-targets-50000-20261007.json'));
 const rows=JSON.parse(gunzipSync(fs.readFileSync('docs/rtp-targets-50000-20261007-rows.json.gz')));
 assert.equal(report.adopted,true);assert.equal(report.proposalOnly,false);assert.equal(rows.length,6000);
 assert.deepEqual(report.options,{rng:'xoshiro128',exactGames:true,completeLimitPt:10000,stopAtComplete:true,rareSortie:true,atBetRefund:true});
 for(const result of report.settings){
  const data=rows.filter(r=>r.setting===result.setting);assert.equal(data.length,1000);assert.equal(new Set(data.map(r=>r.seed)).size,1000);
  for(const row of data){
   assert.equal(row.totalPaid-row.totalBet,row.net);assert(row.games<=50000);
   if(row.firstComplete){
    assert.equal(row.games,row.firstComplete.games);assert.equal(row.totalBet,row.firstComplete.totalBet);assert.equal(row.totalPaid,row.firstComplete.totalPaid);assert(row.net>=10000);
   }else assert.equal(row.games,50000);
  }
  const stats=summarizeTrials(data);
  assert.equal(stats.stopped.rtp,result.after.rtp);assert.deepEqual(stats.stopped.rtpCi95,result.after.rtpCi95);
  assert.equal(stats.stopped.winRate,result.after.win);assert.equal(stats.reach,result.after.reach);
  assert.deepEqual({bet:stats.stopped.bet,paid:stats.stopped.paid},report.ledgers[result.setting]);
 }
});

test('base tuning retains approved CZ and non-positive AT weak-role probabilities',()=>{
 loadModel();const report=JSON.parse(fs.readFileSync('docs/rtp-targets-50000-20261007.json'));
 assert.deepEqual(NovaNormal.czEntryFactors,report.parameters.czEntryFactors.after);
 for(const result of report.settings){
  const {setting,changes}=result;
  assert(Math.abs(NovaNormal.roleCzRate({level:'low'},'WEAK_SUICA',setting)-changes.normalLowCzAfter)<1e-14);
  assert(Math.abs(NovaArt.extraZoneChance(setting,'WEAK_NOVA')-changes.weakAtZoneAfter)<1e-14);
 }
});
