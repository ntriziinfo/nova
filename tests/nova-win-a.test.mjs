import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {summarizeTrials} from '../scripts/tuning-statistics.mjs';
test('adopted A-plan evidence reconciles all 6,000 trials and published source hashes',()=>{
 const report=JSON.parse(fs.readFileSync('docs/win-a-50000-20261007.json'));
 const all=JSON.parse(gunzipSync(fs.readFileSync('docs/win-a-50000-20261007-rows.json.gz')));
 assert.equal(report.proposalOnly,false);assert.equal(all.length,6000);
 for(const [file,digest]of Object.entries(report.sourceHashes))assert.equal(createHash('sha256').update(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')).digest('hex'),digest,file);
 for(const s of report.settings){
  const rows=all.filter(r=>r.setting===s.setting);assert.equal(rows.length,1000);assert.equal(new Set(rows.map(r=>r.seed)).size,1000);
  for(const r of rows){assert.equal(r.net,r.totalPaid-r.totalBet);assert(r.games<=50000);assert(r.firstComplete||r.games===50000);}
  const stats=summarizeTrials(rows);assert.equal(stats.stopped.rtp,s.after.rtp);assert.equal(stats.stopped.winRate,s.after.win);assert.equal(stats.reach,s.after.reach);
  assert.deepEqual({bet:stats.stopped.bet,paid:stats.stopped.paid},s.ledger);
  for(const [pt,rate]of Object.entries(s.after.peakRates))assert.equal(rows.filter(r=>r.peak>=Number(pt)).length/rows.length,rate);
 }
});
