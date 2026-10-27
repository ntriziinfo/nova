import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';

const sum=values=>Object.values(values).reduce((total,value)=>total+value,0);

test('production simulator uses replay-gated preparation and reports its economics',()=>{
  loadModel();
  const result=simulate(3,100000,24681357,{stopAtComplete:false});
  const {bonus,at}=result.preparationMetrics;

  assert.equal(result.counts.prep,bonus.games);
  assert.ok(result.counts.at>=at.games);
  for(const phase of [bonus,at]){
    const completed=sum(phase.startOrders);
    assert.ok(phase.entries>100);
    assert.ok(completed===phase.entries||completed===phase.entries-1);
    assert.ok(phase.games/completed>2.2&&phase.games/completed<4);
    assert.ok((phase.paid-phase.bet)/phase.games>.7);
    assert.ok((phase.paid-phase.bet)/phase.games<1.7);
    assert.ok(Object.values(phase.startOrders).every(count=>count>0));
  }
});

test('simulator keeps CZ direct additive to the terminal BIG instead of entering AT early',()=>{
  const source=fs.readFileSync('scripts/zone-v2-model.mjs','utf8');
  assert.doesNotMatch(source,/else if\(t\.direct\)/);
  assert.match(source,/bonus\(t\.internalBonus\.kind,false,t\.internalBonus\)/);
});
