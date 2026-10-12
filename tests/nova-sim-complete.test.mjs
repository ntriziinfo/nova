import test from 'node:test';import assert from 'node:assert/strict';import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';loadModel();test('simulation honors configured complete threshold without starting another game',()=>{const r=simulate(6,10000,12345,{rng:'xoshiro128',completeLimitPt:10});assert.ok(r.firstComplete);assert.ok(r.games<10000);assert.equal(r.net,r.firstComplete.net);assert.equal(r.games,r.firstComplete.games);assert.ok(r.net>=10);});


test('default MY19k stop matches explicit limits and preserves its exact prefix',()=>{
 const seed='day-prefix|0',options={rng:'xoshiro128',exactGames:true};loadModel();const current=simulate(6,50000,seed,options);loadModel();assert.deepEqual(simulate(6,50000,seed,{...options,completeLimitPt:0,completeMyLimitPt:19000}),current);
 if(current.firstComplete){assert.equal(current.completeReason,'my');loadModel();const prefix=simulate(6,current.games,seed,{...options,stopAtComplete:false});for(const key of ['totalBet','totalPaid','net','counts','unspentAtQuota','unspentZoneStocks'])assert.deepEqual(prefix[key],current[key]);}
});
