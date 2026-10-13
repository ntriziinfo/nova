import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
test('AT first entries count once, while comeback, stock and upper transitions stay in the same AT',()=>{
  const c=vm.createContext({stats:{atFirstCount:0,totalSessions:5,bigCount:5,totalFee:123,totalPaid:456}});
  vm.runInContext(fs.readFileSync('nova-data-counter.js','utf8')+fn('recordAtFirstEntry')+';Math.random=()=>{throw Error("statistics consumed RNG")}',c);
  for(const [before,after] of [
    [{phase:'normal'},{phase:'normal'}], // Failed BIG
    [{phase:'normal'},{phase:'art',initialStage:'wait'}],
    [{phase:'art',initialStage:'wait'},{phase:'art',zone:'kushuri_nito'}],
    [{phase:'art',comebackLeft:1},{phase:'art',zone:'sora'}],
    [{phase:'art',researchChallengeActive:true},{phase:'art',upper:true}],
    [{phase:'art'},{phase:'normal'}],
    [{phase:'normal'},{phase:'art',researchSortieLeft:10}]
  ]){
    const saved=JSON.stringify([before,after]);c.recordAtFirstEntry(before,after);assert.equal(JSON.stringify([before,after]),saved);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(c.stats)),{atFirstCount:2,totalSessions:5,bigCount:5,totalFee:123,totalPaid:456,dataLastHitSpin:0,dataHitSeq:2,dataHits:[{seq:1,spin:0,kind:'AT',zone:'',games:0},{seq:2,spin:0,kind:'AT',zone:'',games:0}]});
  assert.match(fn('countTotalSpinIfNeeded'),/recordAtFirstEntry\(previous,normalState.flow\)/);
  assert.match(fn('resetNormalCountersAfterArt'),/recordAtFirstEntry\(before,after\)/);
  assert.match(source,/resetNormalCountersAfterArt\(beforeBonusResume,normalState.flow\)/);
  assert.match(fn('applyNormalResult'),/resetNormalCountersAfterArt\(resolved.flowBefore,normalState.flow\)/);
});

test('session baselines include AT counts so changing players does not double count prior ATs',()=>{
  const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-role-counter.js','utf8')+fs.readFileSync('nova-data-counter.js','utf8')+fn('sessionBaselineStats'),c);
  const result=c.sessionBaselineStats({atFirstCount:7,atFirstCountPartial:true,bigCount:11,totalSpins:3456});
  assert.equal(result.atFirstCount,7);assert.equal(result.atFirstCountPartial,true);assert.equal(result.bigCount,11);
});

test('cabinet totals survive player changes and reloads without changing gameplay counters',()=>{
  const c=vm.createContext({machineDisplayBase:{totalSpins:1500,bigCount:8,atFirstCount:4,sinceBonus:50},
    stats:{totalSpins:0,bigCount:0,atFirstCount:0,totalFee:0,totalPaid:0},playSessionStartStats:{totalSpins:0,bigCount:0,atFirstCount:0},normalState:{sinceBonus:0}});
  vm.runInContext(fn('machineDisplayStats')+';Math.random=()=>{throw Error("display must not draw")}',c);
  assert.equal(c.machineDisplayStats().totalSpins,1500);
  Object.assign(c.stats,{totalSpins:100,bigCount:0,atFirstCount:0,totalFee:300,totalPaid:200});c.normalState.sinceBonus=100;
  const before=JSON.stringify(c.stats);
  assert.equal(c.machineDisplayStats().totalSpins,1600);assert.equal(c.machineDisplayStats().sinceBonus,150);
  assert.equal(c.machineDisplayStats().totalSpins,1600,'rendering/reloading does not count baseline twice');
  assert.equal(JSON.stringify(c.stats),before);
  c.stats.bigCount=1;c.stats.atFirstCount=1;c.normalState.sinceBonus=3;
  assert.equal(c.machineDisplayStats().bigCount,9);assert.equal(c.machineDisplayStats().atFirstCount,5);assert.equal(c.machineDisplayStats().sinceBonus,3);
  c.machineDisplayBase=null;
  assert.equal(c.machineDisplayStats().totalSpins,100,'standalone keeps existing display');
});

test('machine display query rejects malformed values and is ignored for standalone play',()=>{
  const c=vm.createContext({bootPlaySessionId:'player',bootParams:new URLSearchParams('machineDisplay=broken')});
  vm.runInContext(fn('readMachineDisplayBase'),c);assert.equal(c.readMachineDisplayBase(),null);
  c.bootParams.set('machineDisplay',JSON.stringify({totalSpins:125}));assert.equal(c.readMachineDisplayBase().totalSpins,125);
  c.bootPlaySessionId='';assert.equal(c.readMachineDisplayBase(),null);
});
