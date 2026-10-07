import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';
import {summarizeTrials} from '../scripts/tuning-statistics.mjs';
const modelPath='..';
const gameFile='nova-game.js';
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-12,actual+' != '+expected);

test('positive net ramps restore recovery rates and never impose a payout cap',()=>{
 loadModel(modelPath);const a=NovaArt;
 for(let setting=1;setting<=6;setting++){
  const rule=a.positiveNetZoneRules[setting-1];assert(Object.isFrozen(rule));
  near(a.positiveNetZoneFactor(setting,-10000),1);near(a.positiveNetZoneFactor(setting,rule.start),1);
  near(a.positiveNetZoneFactor(setting,(rule.start+rule.end)/2),(1+rule.floor)/2);
  near(a.positiveNetZoneFactor(setting,rule.end),rule.floor);near(a.positiveNetZoneFactor(setting,20000),rule.floor);
  near(a.positiveNetZoneFactor(setting,rule.start-1),1);
  const state={remaining:'9000',sets:'2',queuedZones:['ura_sora'],atHigh:false};
  a.resolveAtRole(state,'WEAK_NOVA',setting,()=>.999,15000);
  assert.equal(state.remaining,'9000');assert.equal(state.sets,'2');assert.deepEqual(state.queuedZones,['ura_sora']);
 }
 assert(Object.isFrozen(a.positiveNetZoneRules));
});

test('rare draw uses current post-BET net, one RNG draw, and retains awarded sortie stocks',()=>{
 loadModel(modelPath);const p=NovaProgress,a=NovaArt;
 for(let setting=1;setting<=6;setting++)for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA']){
  const rule=a.positiveNetZoneRules[setting-1],base=p.sortieChance(setting,role,0),rate=p.sortieChance(setting,role,10000);
  near(rate,base*(rule.sortie?rule.floor:1));near(p.sortieChance(setting,role,-2000),base);
  p.reset();let calls=0;p.observeNet(-1000);
  assert(!p.drawSortie(setting,role,{},()=>{calls++;return rate;},10000));assert.equal(calls,1);assert.equal(p.snapshot().sorties,0);
  assert(p.drawSortie(setting,role,{},()=>rate-1e-10,10000));assert.equal(p.snapshot().sorties,1);
  const saved=JSON.parse(JSON.stringify(p.snapshot()));p.bind(saved);assert.equal(p.snapshot().sorties,1);
  p.observeNet(15000);assert.equal(p.snapshot().sorties,1);
 }
 const source=fs.readFileSync(gameFile,'utf8');let count=0;
 const c=vm.createContext({A_TYPE_MODE:true,settings:{setting:1},currentProfit:()=>1497,NovaProgress:{drawSortie:(s,r,out,rng,net)=>{assert.equal(net,1497);assert.equal(typeof rng,'function');count++;return true;}}});
 vm.runInContext(source.match(/  function drawRareSortie\([^]*?\n  }/)[0],c);const out={};c.drawRareSortie('WEAK_NOVA',out);assert.equal(count,1);assert.equal(out.sortieWon,true);
});

test('simulator reevaluates rare entry from the actual net instead of freezing reset-time odds',()=>{
 loadModel(modelPath);const original=NovaProgress,observed=[];
 globalThis.NovaProgress={...original,sortieChance:(setting,role,net)=>{if(net!==undefined)observed.push(net);return original.sortieChance(setting,role,net);}};
 const result=simulate(1,2000,'positive-net-role-audit',{rng:'xoshiro128',exactGames:true,atBetRefund:true,rareForcedGames:[1]});
 assert(observed.length>10);assert(observed.some(n=>n>0));assert(observed.every(Number.isFinite));
 observed.length=0;simulate(1,500,'positive-net-recovery-audit',{rng:'xoshiro128',exactGames:true,atBetRefund:true,rareSortie:false});
 assert(observed.some(n=>n<0));
 assert.equal(result.totalPaid-result.totalBet,result.net);
});

test('previous suppression evidence reconciles all 6,000 trials',()=>{
 const report=JSON.parse(fs.readFileSync('docs/positive-net-50000-20261007.json'));
 const all=JSON.parse(gunzipSync(fs.readFileSync('docs/positive-net-50000-20261007-rows.json.gz')));
 assert.equal(report.proposalOnly,false);assert.equal(all.length,6000);
 for(const s of report.settings){
  const rows=all.filter(r=>r.setting===s.setting);assert.equal(rows.length,1000);assert.equal(new Set(rows.map(r=>r.seed)).size,1000);
  for(const r of rows){assert.equal(r.net,r.totalPaid-r.totalBet);assert(r.games<=50000);assert(r.firstComplete||r.games===50000);}
  const stats=summarizeTrials(rows);assert.equal(stats.stopped.rtp,s.after.rtp);assert.equal(stats.stopped.winRate,s.after.win);assert.equal(stats.reach,s.after.reach);
  assert.deepEqual({bet:stats.stopped.bet,paid:stats.stopped.paid},s.ledger);
  for(const [pt,rate]of Object.entries(s.after.peakRates))assert.equal(rows.filter(r=>r.peak>=Number(pt)).length/rows.length,rate);
 }
});
