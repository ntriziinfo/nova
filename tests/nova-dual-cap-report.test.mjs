import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {summarizeTrials} from '../scripts/tuning-statistics.mjs';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';
const report=JSON.parse(fs.readFileSync('docs/replay-dual-cap-20261007.json'));
const rows=JSON.parse(gunzipSync(fs.readFileSync('docs/replay-dual-cap-20261007-rows.json.gz')));

test('historical dual-cap report matches its frozen source and reconciles every trial in both horizons',()=>{
 assert(report.adopted);assert.equal(rows.length,12000);
 for(const [f,digest]of Object.entries(report.sourceHashes))assert.equal(createHash('sha256').update(fs.readFileSync(fs.existsSync('tests/fixtures/pre-win-base30/'+f)?'tests/fixtures/pre-win-base30/'+f:f,'utf8').replaceAll('\r\n','\n')).digest('hex'),digest,f);
 for(const group of report.results)for(const result of group.settings){
  const data=rows.filter(r=>r.horizon===group.gamesPerTrial&&r.setting===result.setting);assert.equal(data.length,1000);assert.equal(new Set(data.map(r=>r.seed)).size,1000);
  for(const row of data){
   assert.equal(row.totalBet,row.games*3);assert.equal(row.net,row.totalPaid-row.totalBet);assert(row.games<=row.horizon);
   if(row.firstComplete){assert.equal(row.firstComplete.games,row.games);assert.equal(row.firstComplete.net,row.net);assert.equal(row.firstComplete.totalPaid,row.totalPaid);assert.equal(row.firstComplete.totalBet,row.totalBet);if(row.firstComplete.reason==='my'){assert(row.net<10000);assert(row.net-row.lowestNet>=15000);}else assert(row.net>=10000);}
   else{assert.equal(row.games,row.horizon);assert(row.peak<10000);assert(row.maxMy<15000);}
  }
  const s=summarizeTrials(data);assert.equal(s.stopped.rtp,result.rtp);assert.deepEqual(s.stopped.rtpCi95,result.rtpCi95);assert.equal(s.stopped.winRate,result.win);assert.equal(s.reach,result.reach);
  assert.equal(data.filter(r=>r.firstComplete).length/1000,result.complete);assert.equal(data.filter(r=>r.firstComplete?.reason==='my').length/1000,result.myComplete);
 }
});

test('cash-refund simulator reproduces horizon, MY stop and net stop trials',()=>{
 for(const horizon of [10000,50000]){
  const data=rows.filter(r=>r.horizon===horizon),sample=[data.find(r=>!r.firstComplete),data.find(r=>r.firstComplete?.reason==='my'),data.find(r=>r.firstComplete?.reason==='net')].filter(Boolean);
  for(const expected of sample){
   loadModel('../tests/fixtures/pre-win-base30');const actual=simulate(expected.setting,horizon,expected.seed,report.options);
   for(const key of ['games','totalBet','totalPaid','net','peak','lowestNet','maxMy','firstComplete','counts'])assert.deepEqual(actual[key],expected[key],key);
  }
 }
});

test('historical default completion limits match explicit 10k net and 15k MY settings',()=>{
 const r=rows.find(r=>r.horizon===50000&&r.firstComplete?.reason==='net');assert(r);
 const {completeLimitPt,completeMyLimitPt,...options}=report.options;loadModel('../tests/fixtures/pre-win-base30');const actual=simulate(r.setting,r.horizon,r.seed,options);assert.deepEqual(actual.firstComplete,r.firstComplete);assert.equal(actual.net,r.net);
});
