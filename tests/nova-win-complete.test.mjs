import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';

test('previous approved report accounts for all 6,000 trials and retains separate win/reach targets',()=>{
 const report=JSON.parse(fs.readFileSync('docs/win-complete-50000-20261006.json'));
 const all=JSON.parse(gunzipSync(fs.readFileSync('docs/win-complete-50000-20261006-rows.json.gz')));
 assert.equal(report.proposalOnly,false);assert.equal(all.length,6000);
 for(const s of report.settings){
  const rows=all.filter(r=>r.setting===s.setting);assert.equal(rows.length,1000);assert.equal(new Set(rows.map(r=>r.seed)).size,1000);
  for(const r of rows){assert.equal(r.net,r.totalPaid-r.totalBet);assert(r.games<=50000);assert.equal(r.games===50000||!!r.firstComplete,true);}
  const bet=rows.reduce((sum,r)=>sum+r.totalBet,0),paid=rows.reduce((sum,r)=>sum+r.totalPaid,0);
  assert.equal(paid/bet,s.result.rtp);assert.equal(rows.filter(r=>r.net>0).length/1000,s.result.win);
  assert.equal(rows.filter(r=>r.peak>=10000).length/1000,s.result.reach);
 }
});

test('net tier affects only future weak-role zones, including upper AT; strong NOVA is preserved',()=>{
 loadModel();
 for(let setting=1;setting<=6;setting++)for(const upper of [false,true]){
  for(let seed=0;seed<100;seed++){
   const state={researchUpper:upper,remaining:'7000',sets:'2',queuedZones:['ura_sora']};
   const a=NovaArt.resolveAtRole({...state},'STRONG_NOVA',setting,xoshiro128(seed),4999);
   const b=NovaArt.resolveAtRole({...state},'STRONG_NOVA',setting,xoshiro128(seed),5000);
   assert.deepEqual(a,b);
  }
  // The old +5,000pt tier stacks with the new ramp; recovery below its start is ordinary.
  for(const high of [false,true])for(const role of ['WEAK_SUICA','WEAK_NOVA']){
   const ordinary=NovaArt.extraZoneChance(setting,role,upper,high,4999);
   const highNet=NovaArt.extraZoneChance(setting,role,upper,high,5000);
   const recovered=NovaArt.extraZoneChance(setting,role,upper,high,-20000);assert.equal(NovaArt.extraZoneChance(setting,role,upper,high,0),recovered);assert(ordinary<=recovered);
   if(setting===6)assert.equal(highNet,ordinary);else assert(highNet<ordinary);
  }
 }
});
