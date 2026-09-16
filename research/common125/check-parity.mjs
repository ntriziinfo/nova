import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {loadModel,simulate} from '../burst112/production-model.mjs';
const results=[];
for(const setting of [1,6]){
 loadModel('..',false);const plain=simulate(setting,30000,125999000+setting,{rng:'xoshiro128',completeLimitPt:10000});
 let source=fs.readFileSync('nova-art.js','utf8').replace('function atMix(setting=3){','const memo=new Map();function atMix(setting=3){let r=memo.get(setting);if(!r){r=computeMix(setting);memo.set(setting,r);}return {...r,r:{...r.r}};}function computeMix(setting=3){');
 vm.runInThisContext(source);
 const cached=simulate(setting,30000,125999000+setting,{rng:'xoshiro128',completeLimitPt:10000});
 assert.deepEqual(cached,plain);results.push({setting,games:plain.games,paid:plain.totalPaid,bet:plain.totalBet,identical:true});
}
fs.writeFileSync('research/common125/parity.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
