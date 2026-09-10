import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluate,goal} from '../research/balance118/evaluate.mjs';
test('a reach match cannot hide a stopped-RTP miss or substitute unstopped RTP',()=>{
 const r={setting:6,gamesPerTrial:30000,trials:3000,games:90000000,completeRate:.2,rtp:{value:1.14},stoppedRtp:{value:1.07}};
 assert.equal(evaluate(r,{holdout:true}).pass,false);
 assert.equal(evaluate({...r,completeRate:.5,stoppedRtp:{value:1.14}},{holdout:true}).pass,false);
 assert.equal(evaluate({...r,stoppedRtp:{value:1.14}},{holdout:true}).pass,true);
 assert.equal(evaluate({...r,stoppedRtp:{value:1.14},trials:200,games:6000000},{holdout:true}).pass,false);
});
test('rejected v117 does not pass the jointly approved targets',()=>{
 const data=JSON.parse(fs.readFileSync('docs/balance117-summary.json'));
 assert.deepEqual(goal.rtp,[.95,.965,.98,1.02,1.07,1.14]);
 assert.deepEqual(goal.reach,[.02,.04,.06,.10,.15,.20]);
 assert.equal(data.settings.every(s=>evaluate(s.report).pass),false);
 assert.equal(evaluate(data.settings[5].report).rtpPass,false);
});
