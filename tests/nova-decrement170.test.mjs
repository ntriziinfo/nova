import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';
import {xoshiro128,xoshiro128State} from '../scripts/zone-v2-rng.mjs';
const json=x=>JSON.parse(JSON.stringify(x));

test('only settings 5 and 6 use the selected time and net regimes',()=>{
 loadModel();const d=NovaDecrement;
 for(let s=1;s<=6;s++){
  const seed='decrement-initial-'+s,p=d.rules(s),rng=xoshiro128(seed);
  d.reset(s,xoshiro128State(seed));
  assert.equal(d.snapshot().enabled,s>=5);
  assert.equal(d.snapshot().low,s>=5&&rng()<p.lowMean/(p.lowMean+p.highMean));
  assert.equal(d.at(s),s>=5?.25:1);assert(Object.isFrozen(p));
  if(s<5){d.observe(30000);d.beforeBet('at');assert.equal(d.cz(s),1);assert.equal(d.at(s),1);}
 }
 assert.equal(d.rules(5).lowMean,150000);assert.equal(d.rules(6).lowMean,9000);
 assert.throws(()=>d.reset(5,[0,0,0,0]));
});

test('each BET advances the independent RNG once after the initial game; reload is continuous',()=>{
 loadModel();const d=NovaDecrement,seed='decrement-clock',rng=xoshiro128(seed),p=d.rules(6);
 d.reset(6,xoshiro128State(seed));let low=rng()<.25;
 for(let game=0;game<30000;game++){
  if(game>0&&rng()<1/(low?p.lowMean:p.highMean))low=!low;
  d.beforeBet(game%2?'bonus':'normal');assert.equal(d.snapshot().low,low);
  if(game===101){const saved=d.snapshot();d.reset(5);d.bind(json(saved),6);assert.deepEqual(d.snapshot(),saved);}
 }
 assert.equal(d.metrics().games,30000);
 const saved=d.snapshot(),a=[];
 for(let i=0;i<20;i++){d.beforeBet();a.push(d.snapshot());}
 d.bind(saved,6);for(let i=0;i<20;i++){d.beforeBet();assert.deepEqual(d.snapshot(),a[i]);}
 const other=d.reset(5),otherSaved=json(other);d.bind(saved,6);d.beforeBet();assert.deepEqual(other,otherSaved);
 const changed=d.bind(saved,4);assert.equal(changed.games,0);assert.equal(changed.enabled,false);
});

test('net hysteresis uses the weaker factor without stacking and cannot mutate earned resources',()=>{
 loadModel();const d=NovaDecrement;
 for(const s of [5,6]){
  d.reset(s);const saved=d.snapshot();saved.low=false;d.bind(saved,s);
  const p=d.rules(s),flow={...NovaArt.enter({setting:s},()=>.5),remaining:'1850',queuedZones:['sora','giru'],sets:'3',stock:'2'},before=json(flow);
  d.observe(p.netEnter-1);assert.equal(d.cz(s),p.highCz);
  d.observe(p.netEnter);assert.equal(d.cz(s),.25);assert(d.snapshot().netLow);
  d.observe(p.netExit+1);assert.equal(d.cz(s),.25);
  d.observe(p.netExit);assert.equal(d.cz(s),p.highCz);assert(!d.snapshot().netLow);
  saved.low=true;d.bind(saved,s);d.observe(p.netEnter);assert.equal(d.cz(s),.25);
  d.observe(-3000);assert.equal(d.cz(s),p.lowCz);assert.equal(d.at(s),.25);
  assert.deepEqual(flow,before);
  assert.equal(NovaNormal.roleCzRate({level:'low'},'STRONG_NOVA',s),1);
  const out=NovaArt.resolveAtRole(json(flow),'STRONG_NOVA',s,()=>.25);
  assert(out.zone);
 }
});

test('actual browser hooks clock bonus and AUTO BETs but not 0G, and observe settled net',()=>{
 loadModel();NovaDecrement.reset(6,xoshiro128State('browser-clock'));
 const html=readGameSource();
 const count=html.match(/  function countTotalSpinIfNeeded\([^]*?\n  }/)[0];
 assert(count.indexOf('NovaDecrement.beforeBet')>count.indexOf("flow?.zero)return false"));
 assert(count.indexOf('NovaDecrement.beforeBet')<count.indexOf('aTypeBonusActiveAtSpinStart) return false'));
 assert(html.includes('normalState.novaDecrement=NovaDecrement.bind(normalState.novaDecrement,settings.setting)'));
 assert(html.includes('recordSlumpPoint(false);'));
 assert(html.includes('if(settled)NovaDecrement.observe(currentProfit());'));
 const c=vm.createContext({A_TYPE_MODE:true,session:{active:false},normalState:{flow:{phase:'art',zero:true}},stats:{totalSpins:0},
  NovaDecrement,NovaFlow:{normalize:x=>x},NovaArt:{prepareBet:x=>x},NovaProgress:{beforeBet:x=>x,drawSortie:()=>{}},
  settings:{novaArt:{},setting:6},syncNovaProgress:()=>{},currentProfit:()=>0,auditCapture:()=>{}});
 vm.runInContext(count,c);
 assert.equal(c.countTotalSpinIfNeeded(false),false);assert.equal(NovaDecrement.metrics().games,0);
 c.normalState.flow={phase:'normal'};c.countTotalSpinIfNeeded(false);assert.equal(NovaDecrement.metrics().games,1);
 c.session.active=true;c.countTotalSpinIfNeeded(true);assert.equal(NovaDecrement.metrics().games,2);assert.equal(c.stats.totalSpins,1);
 c.session.active=false;c.normalState.replayFree=true;c.countTotalSpinIfNeeded(false);assert.equal(NovaDecrement.metrics().games,3);
});

test('history records interval entry and exit separately with complete state',()=>{
 vm.runInThisContext(fs.readFileSync('nova-audit.js','utf8'));
 const base={flow:{phase:'normal'},bonus:{},decrement:{enabled:true,setting:6,low:false,netLow:false}};
 const next={...base,decrement:{...base.decrement,low:true,netLow:true}};
 assert(NovaAudit.describe(base,next).includes('時間による減算区間へ移行'));
 assert(NovaAudit.describe(base,next).includes('差枚による減算区間へ移行'));
 assert(NovaAudit.describe(next,base).includes('差枚による減算区間から復帰'));
});

test('v170 tuning exactly replays pre-integration independent 30,000G trial ledgers and regimes',()=>{
 const fixture=JSON.parse(fs.readFileSync('tests/fixtures/nova-decrement170-trials.json'));
 for(const expected of fixture.trials){
  loadModel('../tests/fixtures/pre-role-merge',true,Object.fromEntries([1,2,3,4,5,6].map(s=>[s,{normalReplayReduction:0,extraZone:0,...(s===5?{cz:2.45}:{})}])));
  const actual=simulate(expected.setting,30000,expected.seed,{...fixture.options,decrementAudit:true});
  assert.deepEqual(json(actual),expected,expected.seed);
 }
});

test('settings 1–4 remain exactly unchanged with the new controller present',()=>{
 for(let setting=1;setting<=4;setting++){
  const options={rng:'xoshiro128',exactGames:true,stopAtComplete:false};
  loadModel();const actual=simulate(setting,30000,'unchanged-'+setting,options);
  loadModel();const disabled=simulate(setting,30000,'unchanged-'+setting,{...options,decrement:false});
  assert.deepEqual(actual,disabled);
 }
});
