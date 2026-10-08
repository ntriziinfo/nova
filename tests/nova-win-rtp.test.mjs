import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';
import {xoshiro128State} from '../scripts/zone-v2-rng.mjs';

const report=JSON.parse(fs.readFileSync('docs/win-rtp-20261008.json'));
const compressed=fs.readFileSync(report.rowsFile);
const rows=JSON.parse(gunzipSync(compressed));
const previous='../tests/fixtures/pre-win-rtp-20261008';
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);

test('adopted calibration matches deployed sources and all 3,000 complete-stop ledgers',()=>{
 assert(report.adopted);assert.equal(rows.length,3000);
 assert.equal(createHash('sha256').update(compressed).digest('hex'),report.rowsSha256);
 for(const [file,hash] of Object.entries(report.sourceHashes)){
  assert.equal(createHash('sha256').update(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')).digest('hex'),hash,file);
 }
 for(const result of report.results.filter(r=>r.setting>=4)){
  const data=rows.filter(r=>r.setting===result.setting),sum=key=>data.reduce((n,r)=>n+Number(r[key]),0);
  assert.equal(data.length,result.n);assert.equal(new Set(data.map(r=>r.seed)).size,result.n);
  assert.equal(sum('paid')/sum('bet'),result.rtp);assert.equal(sum('win')/data.length,result.win);
  assert.equal(sum('net10000')/data.length,result.net10000);assert.equal(sum('complete')/data.length,result.complete);
  assert.equal(sum('games')/data.length,result.games);assert.equal(sum('net')/data.length,result.net);
  for(const r of data){
   assert.equal(r.bet,r.games*3);assert.equal(r.net,r.paid-r.bet);assert.equal(r.win,r.net>0);
   assert.equal(r.net10000,r.peak>=10000);assert(r.games>0&&r.games<=50000);
   if(r.complete){assert(r.net>=10000||r.maxMy>=15000);assert(['net','my'].includes(r.reason));}
   else{assert.equal(r.games,50000);assert.equal(r.reason,null);}
  }
 }
});

test('production replays approved sessions including early stops and unspent quota/stocks',()=>{
 for(const setting of [4,5,6]){
  const data=rows.filter(r=>r.setting===setting),samples=new Map();
  for(const row of [data[0],data.at(-1),data.find(r=>r.reason==='net'),data.find(r=>r.reason==='my')])if(row)samples.set(row.seed,row);
  for(const [seed,expected] of samples){
   loadModel();const actual=simulate(setting,50000,seed,report.options);
   for(const [a,b] of [['games','games'],['totalBet','bet'],['totalPaid','paid'],['net','net'],['peak','peak'],['maxMy','maxMy'],['counts','counts'],['unspentAtQuota','unspentAtQuota'],['unspentZoneStocks','unspentZoneStocks'],['completeReason','reason']]){
    assert.deepEqual(actual[a],expected[b],`setting ${setting}, ${seed}, ${a}`);
   }
   if(actual.firstComplete){assert.equal(actual.games,actual.firstComplete.games);assert.equal(actual.net,actual.firstComplete.net);}
  }
 }
});

test('setting 5 sampling is proportional to the approved initial regime and not selected by outcome',()=>{
 loadModel();const sampling=report.seedSelection[0];assert.equal(sampling.setting,5);
 const p=NovaDecrement.rules(5);assert.equal(p.initialLowChance,.53);assert.equal(sampling.lowChance,p.initialLowChance);
 const data=rows.filter(r=>r.setting===5);
 const low=data.filter(r=>NovaDecrement.reset(5,xoshiro128State(r.seed+'|decrement-interval')).initialLow).length;
 assert.equal(low,530);assert.equal(data.length-low,470);assert.equal(low/data.length,sampling.lowChance);
 // Reconstruct the selection solely from the initial state, before any game is run.
 const chosen=[],counts={low:0,high:0};
 for(let i=0;i<sampling.scannedSeeds;i++){
  const seed=report.seedPrefix[5]+'|s5|'+i;
  const key=NovaDecrement.reset(5,xoshiro128State(seed+'|decrement-interval')).initialLow?'low':'high';
  if(counts[key]>=sampling[key+'Count'])continue;
  counts[key]++;chosen.push(seed);
 }
 assert.deepEqual(data.map(r=>r.seed).sort(),chosen.sort());
});

test('new reset probability retains RNG consumption and saved intervals',()=>{
 vm.runInThisContext(fs.readFileSync('tests/fixtures/pre-win-rtp-20261008/nova-decrement.js','utf8'));
 const before=NovaDecrement;loadModel();const after=NovaDecrement;let changed=0;
 for(let i=0;i<200;i++)for(let setting=1;setting<=6;setting++){
  const seed=xoshiro128State('initial-selection-audit|'+setting+'|'+i);
  const a=structuredClone(before.reset(setting,seed)),b=structuredClone(after.reset(setting,seed));
  assert.deepEqual(b.rng,a.rng);
  if(setting!==5)assert.deepEqual(b,a);
  else{assert(!a.initialLow||b.initialLow);if(a.initialLow!==b.initialLow)changed++;assert.equal(b.low,b.initialLow);}
  assert.deepEqual(after.bind(structuredClone(a),setting),a,'Existing saves must not reroll');
  assert.deepEqual(after.bind(structuredClone(b),setting),b);
 }
 assert(changed>0);
 for(const setting of [5,6])for(const key of ['lowMean','highMean'])assert.equal(after.rules(setting)[key],before.rules(setting)[key]);
});

test('settings 1–3 replay identically to the prior production model',()=>{
 for(let setting=1;setting<=3;setting++){
  const seed='win-rtp-unchanged|'+setting;
  loadModel(previous);const before=simulate(setting,50000,seed,report.options);
  loadModel();assert.deepEqual(simulate(setting,50000,seed,report.options),before);
 }
});

test('base, net AT, initial points and shared roles are unchanged; all adjusted probabilities stay valid',()=>{
 const capture=s=>({roles:[NovaNormal.normalRoleProbabilities(s),NovaNormal.roleProbabilities(s),NovaArt.roleProbabilities(s),NovaArt.roleProbabilities(s,true)],initial:NovaArt.freshInitialRules,boost:NovaArt.initialBoostRules,bonus:NovaArt.bonusRules,comeback:NovaArt.comebackRules,burst:NovaArt.burstRules});
 for(let setting=1;setting<=6;setting++){
  loadModel(previous);const before=capture(setting);loadModel();assert.deepEqual(capture(setting),before);
  const mean=r=>Object.entries(r).reduce((n,[role,p])=>n+p*(role==='NAVI_BELL'?8:NovaArt.cashPayout(role)),0);
  near(50/(3-mean(before.roles[0])),30);near(mean(before.roles[2])-3,4.5);near(mean(before.roles[3])-3,7);
  const state=NovaDecrement.reset(setting,[1,2,3,4]);
  for(const low of [false,true])for(const netLow of [false,true])for(const level of ['low','high'])for(const net of [-10000,0,500,1500,2000,3000,4999,5000,6500,10000]){
   state.low=low;state.netLow=netLow;
   for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA','BELL','REPLAY','MISS']){
    const cz=NovaNormal.roleCzRate({level},role,setting);
    const zone=NovaArt.extraZoneChance(setting,role,false,level==='high',net);
    assert(Number.isFinite(cz)&&cz>=0&&cz<=1);assert(Number.isFinite(zone)&&zone>=0&&zone<=1);
   }
  }
 }
});
