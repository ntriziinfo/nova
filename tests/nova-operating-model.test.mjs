import test from 'node:test';import assert from 'node:assert/strict';
import * as current from '../scripts/zone-v2-model.mjs';
import * as operating from '../scripts/operating-model.mjs';
import {REQUIRED_OPTIONS} from '../scripts/rtp-current.mjs';
current.loadModel();operating.loadModel();
test('operating adapter leaves RNG and accounting identical when cap extension is disabled',()=>{
 for(const setting of [1,4,6])for(let i=0;i<3;i++){
  const args=[setting,1000,'parity-'+i,{...REQUIRED_OPTIONS,recordBlocks:0}];
  assert.deepEqual(operating.simulate(...args),current.simulate(...args));
 }
});
test('operating cap keeps current art chain and stops at normal, while MY can end early',()=>{
 for(let i=0;i<20;i++){
  const r=operating.simulate(6,300,'tail-'+i,{...REQUIRED_OPTIONS,recordBlocks:0,operatingLimit:true,stopAtComplete:true,completeMyLimitPt:10000});
  assert.equal(r.totalPaid-r.totalBet,r.net);assert.equal(r.totalBet,r.games*3);
  assert.ok(r.games>=300||r.firstComplete);if(!r.firstComplete)assert.notEqual(r.endPhase,'art');
 }
});
