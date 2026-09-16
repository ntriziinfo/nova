import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {simulate} from '../burst112/production-model.mjs';
const results=[];
function load(cache){
 for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js']){
  let s=fs.readFileSync(f,'utf8');
  if(cache&&f==='nova-art.js')s=s.replace('function atMix(setting=3){','const mixCache=new Map();function atMix(setting=3){let r=mixCache.get(setting);if(!r){r=computeAtMix(setting);mixCache.set(setting,r);}return {...r,r:{...r.r}};}function computeAtMix(setting=3){');
  if(cache&&f==='nova-flow.js')s=s.replace('function lampWeights(p){','const lampCache=new Map();function lampWeights(p){if(!lampCache.has(p))lampCache.set(p,computeLampWeights(p));return lampCache.get(p);}function computeLampWeights(p){');
  vm.runInThisContext(s,{filename:f});
 }
}
for(const setting of [1,6]){
 const seed=128999000+setting,options={rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:true};
 load(false);const plain=simulate(setting,30000,seed,options);
 load(true);const cached=simulate(setting,30000,seed,options);
 assert.deepEqual(cached,plain);
 results.push({setting,seed,games:plain.games,paid:plain.totalPaid,bet:plain.totalBet,identical:true});
}
fs.writeFileSync('research/role128/parity.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));
