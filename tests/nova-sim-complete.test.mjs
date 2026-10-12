import test from 'node:test';import assert from 'node:assert/strict';import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';loadModel();test('simulation honors configured complete threshold without starting another game',()=>{const r=simulate(6,10000,12345,{rng:'xoshiro128',completeLimitPt:10});assert.ok(r.firstComplete);assert.ok(r.games<10000);assert.equal(r.net,r.firstComplete.net);assert.equal(r.games,r.firstComplete.games);assert.ok(r.net>=10);});


test('current simulator continues beyond the old MY stop with identical draws and awards up to it',()=>{
 const seed='win-rtp-independent-e-20261008|s4|981',options={rng:'xoshiro128',exactGames:true,stopAtComplete:true};
 loadModel();const old=simulate(4,50000,seed,{...options,completeMyLimitPt:15000});assert.equal(old.completeReason,'my');
 loadModel();const prefix=simulate(4,old.games,seed,options);
 for(const key of ['totalBet','totalPaid','net','counts','unspentAtQuota','unspentZoneStocks'])assert.deepEqual(prefix[key],old[key],key);
 assert.equal(prefix.firstComplete,null);assert(prefix.maxMy>=15000);
 loadModel();const current=simulate(4,50000,seed,options);assert(current.games>old.games);
 if(current.firstComplete){assert.equal(current.completeReason,'net');assert(current.net>=10000);}else assert.equal(current.games,50000);
});
