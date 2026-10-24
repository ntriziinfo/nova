import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(stats,baseline=null,carry=0){
  const storage=new Map();
  const c=vm.createContext({stats:structuredClone(stats),SLOT_PLAY_SESSION:true,PLAY_SESSION_BASELINE_STORAGE_KEY:'baseline',
    playSessionStartStats:null,storeResumeState:{baseline,creditCarry:carry},CREDIT_BASELINE_PROFIT:0,displaySinceBonusOffset:0,
    safeStorageGet:key=>storage.get(key),safeStorageSet:(key,value)=>storage.set(key,value),
    machineDisplayBase:{totalSpins:6000,bigCount:8,atFirstCount:6},normalState:{sinceBonus:6}});
  for(const file of ['nova-role-counter.js','nova-data-counter.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
  for(const name of ['sessionBaselineStats','initializePlaySessionBaseline','reconcilePlaySessionBaseline','playSessionBaselineProfit','playSessionCredit','machineDisplayStats'])vm.runInContext(fn(name),c);
  vm.runInContext('Math.random=()=>{throw Error("credit display must not draw")}',c);
  return {c,storage};
}
test('a new customer starts at zero while cabinet counters and pending game state stay untouched',()=>{
  const stats={totalSpins:4152,totalFee:12867,totalPaid:10371,bigCount:7,atFirstCount:5};
  const {c}=setup(stats);c.initializePlaySessionBaseline();
  assert.equal(c.playSessionCredit(),0);assert.equal(c.machineDisplayStats().totalSpins,6000);
  assert.deepEqual(JSON.parse(JSON.stringify(c.stats)),stats);
  c.stats.totalSpins+=100;c.stats.totalFee+=300;c.stats.totalPaid+=500;
  assert.equal(c.playSessionCredit(),200);assert.equal(c.machineDisplayStats().totalSpins,6100);
});
test('consecutive same-customer display carries signed profit but the settlement baseline remains current entry',()=>{
  for(const carry of [2500,-900,0]){
    const {c,storage}=setup({totalSpins:1000,totalFee:3000,totalPaid:4200},null,carry);
    c.initializePlaySessionBaseline();assert.equal(c.playSessionCredit(),carry);
    c.stats.totalFee+=300;c.stats.totalPaid+=200;c.stats.totalSpins+=100;
    assert.equal(c.playSessionCredit(),carry-100);
    c.initializePlaySessionBaseline();assert.equal(c.playSessionCredit(),carry-100,'reload uses the same baseline');
    assert.equal(JSON.parse(storage.get('baseline')).profit,1200);
  }
});
test('Kai regression: stale negative baseline cannot inflate 184 to 2680, including after counts grow past the old baseline',()=>{
  const baseline={totalSpins:4152,totalFee:12867,totalPaid:10371,profit:-2496};
  const stats={totalSpins:883,totalFee:2697,totalPaid:2881};
  const {c,storage}=setup(stats,baseline);c.initializePlaySessionBaseline();
  assert.equal(c.playSessionCredit(),184);assert.equal(JSON.parse(storage.get('baseline')).profit,0);
  assert.deepEqual(JSON.parse(JSON.stringify(c.stats)),stats);
  c.stats.totalSpins=5000;c.stats.totalFee=15000;c.stats.totalPaid=15500;
  c.initializePlaySessionBaseline();assert.equal(c.playSessionCredit(),500);
});
test('a reset during an open page reconciles its saved baseline once; standalone credit stays gross',()=>{
  const {c,storage}=setup({totalSpins:1000,totalFee:3000,totalPaid:4200});c.initializePlaySessionBaseline();
  c.stats={totalSpins:0,totalFee:0,totalPaid:0};assert.equal(c.playSessionCredit(),0);
  assert.equal(JSON.parse(storage.get('baseline')).totalSpins,0);
  c.SLOT_PLAY_SESSION=false;c.stats={totalPaid:400,totalFee:500};c.storeResumeState.creditCarry=2000;
  assert.equal(c.playSessionCredit(),-100);
});
