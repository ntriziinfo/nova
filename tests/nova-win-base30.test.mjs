import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';

const report=JSON.parse(fs.readFileSync('docs/win-base30-20261007.json'));
const compressed=fs.readFileSync('docs/win-base30-20261007-rows.json.gz');
const rows=JSON.parse(gunzipSync(compressed));
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
const frozen='tests/fixtures/pre-win-rtp-20261008/';
const loadHistorical=()=>loadModel('../'+frozen);

test('historical common-base report matches frozen sources and reconciles all 3,500 trials',()=>{
 assert(report.adopted);assert.equal(rows.length,3500);
 assert.equal(createHash('sha256').update(compressed).digest('hex'),report.rowsSha256);
 for(const [file,hash] of Object.entries(report.sourceHashes))assert.equal(createHash('sha256').update(fs.readFileSync(frozen+file,'utf8').replaceAll('\r\n','\n')).digest('hex'),hash,file);
 for(const result of report.results){
  const data=rows.filter(row=>row.setting===result.setting),sum=key=>data.reduce((total,row)=>total+Number(row[key]),0);
  assert.equal(data.length,result.n);assert.equal(new Set(data.map(row=>row.seed)).size,result.n);
  assert.equal(sum('paid')/sum('bet'),result.rtp);assert.equal(sum('win')/data.length,result.win);
  assert.equal(sum('net10000')/data.length,result.net10000);assert.equal(sum('complete')/data.length,result.complete);
  for(const row of data){
   assert.equal(row.bet,row.games*3);assert.equal(row.net,row.paid-row.bet);assert.equal(row.win,row.net>0);
   assert.equal(row.net10000,row.peak>=10000);assert(row.games<=50000);
   if(row.complete)assert(row.net>=10000||row.maxMy>=15000);else assert.equal(row.games,50000);
  }
 }
});

test('historical model reproduces the prior independent full-session ledgers and pending resources',()=>{
 for(const item of report.manifest.settings){
  const data=rows.filter(row=>row.setting===item.setting);
  const sample=new Map();
  for(const index of [0,101,item.trials-1]){const row=data.find(row=>row.seed.endsWith('|'+index));assert(row);sample.set(row.seed,row);}
  for(const reason of ['net','my']){const row=data.find(row=>row.reason===reason);if(row)sample.set(row.seed,row);}
  for(const expected of sample.values()){
   loadHistorical();const actual=simulate(item.setting,50000,expected.seed,report.options);
   for(const [field,key] of [['totalBet','bet'],['totalPaid','paid'],['games','games'],['net','net'],['peak','peak'],['maxMy','maxMy'],['counts','counts'],['unspentAtQuota','unspentAtQuota'],['unspentZoneStocks','unspentZoneStocks'],['completeReason','reason']])assert.deepEqual(actual[field],expected[key],`${item.setting} ${field}`);
   if(actual.firstComplete){assert.equal(actual.games,actual.firstComplete.games);assert.equal(actual.net,actual.firstComplete.net);}
   const {completeLimitPt,completeMyLimitPt,...defaults}=report.options;
   if(expected.reason==='net'){
    loadHistorical();const defaultRun=simulate(item.setting,50000,expected.seed,defaults);
    assert.deepEqual(defaultRun.firstComplete,actual.firstComplete);
   }
  }
 }
});

test('base is 30G for every setting and AT pays net4.5/7 with three paid BETs after replays',()=>{
 loadModel();const a=NovaArt,n=NovaNormal;
 for(let setting=1;setting<=6;setting++){
  const normal=n.normalRoleProbabilities(setting);
  near(Object.values(normal).reduce((total,p)=>total+p,0),1);
  const normalCash=Object.entries(normal).reduce((total,[role,p])=>total+p*(role==='NAVI_BELL'?8:a.cashPayout(role)),0);
  near(50/(3-normalCash),30);
  for(const upper of [false,true]){
   const roles=a.roleProbabilities(setting,upper);
   assert(Object.values(roles).every(p=>Number.isFinite(p)&&p>=0&&p<=1));
   near(Object.values(roles).reduce((total,p)=>total+p,0),1);
   near(Object.entries(roles).reduce((total,[role,p])=>total+p*a.cashPayout(role),0)-3,upper?7:4.5);
  }
  let flow={...a.enter({setting},()=>.99),remaining:'200'};
  let net=0;
  for(const role of ['BELL','REPLAY','BELL15','MISS']){
   flow=a.restoreBetCost(flow,3);flow=a.step(flow,{setting},()=>.99,role).flow;
   net+=a.cashPayout(role)-3;assert.equal(Number(flow.remaining),200-net);
  }
 }
});

test('initial points, shared state roles and sortie cash mix retain the approved pre-change behavior',()=>{
 loadModel('../tests/fixtures/pre-win-base30');
 const expected=Array.from({length:6},(_,i)=>({shared:NovaNormal.roleProbabilities(i+1),initial:NovaArt.freshInitialRules,initialRoles:NovaArt.roleProbabilities(i+1)}));
 loadModel();
 for(let setting=1;setting<=6;setting++){
  assert.deepEqual(NovaNormal.roleProbabilities(setting),expected[setting-1].shared);
  assert.deepEqual(NovaArt.freshInitialRules,expected[setting-1].initial);
  assert.deepEqual(NovaArt.roleProbabilities(setting,false,5),expected[setting-1].initialRoles);
  let flow=NovaArt.enterInitial({setting},()=>.99);
  while(flow.initialStage)flow=NovaArt.step(flow,{setting},()=>.99).flow;
  assert.equal(flow.remaining,'300');
 }
});
