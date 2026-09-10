import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluate,goal} from '../research/balance120/evaluate.mjs';

test('weighted-challenge acceptance still requires both objectives and 3000 full trials',()=>{
 const r={setting:6,gamesPerTrial:30000,trials:3000,games:90000000,completeRate:.2,rtp:{value:1.14},stoppedRtp:{value:1.14}};
 assert(evaluate(r,{holdout:true}).pass);
 for(const change of [{stoppedRtp:{value:1.10}},{completeRate:.3},{games:30000000,trials:1000},{gamesPerTrial:10000}])assert.equal(evaluate({...r,...change},{holdout:true}).pass,false);
 assert.deepEqual(goal.rtp,[.95,.965,.98,1.02,1.07,1.14]);
 assert.deepEqual(goal.reach,[.02,.04,.06,.10,.15,.20]);
});

test('all six published estimates use accepted complete-stop results',()=>{
 const summary=JSON.parse(fs.readFileSync('docs/balance120-final-summary.json'));
 assert(summary.allPass);assert.deepEqual(summary.settings.map(s=>s.setting),[1,2,3,4,5,6]);
 for(const s of summary.settings){assert(evaluate(s.report,{holdout:true}).pass);assert.equal(s.report.trials,3000);assert(s.runtimeProof.commonCodeMatches);assert(s.runtimeProof.settingCoefficientsMatch);}
});
