import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
test('AT first entries count once, while comeback, stock and upper transitions stay in the same AT',()=>{
  const c=vm.createContext({stats:{atFirstCount:0,totalSessions:5,bigCount:5,totalFee:123,totalPaid:456}});
  vm.runInContext(fn('recordAtFirstEntry')+';Math.random=()=>{throw Error("statistics consumed RNG")}',c);
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
  assert.deepEqual(JSON.parse(JSON.stringify(c.stats)),{atFirstCount:2,totalSessions:5,bigCount:5,totalFee:123,totalPaid:456});
  assert.match(fn('countTotalSpinIfNeeded'),/recordAtFirstEntry\(previous,normalState.flow\)/);
  assert.match(fn('resetNormalCountersAfterArt'),/recordAtFirstEntry\(before,after\)/);
  assert.match(source,/resetNormalCountersAfterArt\(beforeBonusResume,normalState.flow\)/);
  assert.match(fn('applyNormalResult'),/resetNormalCountersAfterArt\(resolved.flowBefore,normalState.flow\)/);
});

test('session baselines include AT counts so changing players does not double count prior ATs',()=>{
  const c=vm.createContext({});vm.runInContext(fn('sessionBaselineStats'),c);
  const result=c.sessionBaselineStats({atFirstCount:7,atFirstCountPartial:true,bigCount:11,totalSpins:3456});
  assert.equal(result.atFirstCount,7);assert.equal(result.atFirstCountPartial,true);assert.equal(result.bigCount,11);
});
