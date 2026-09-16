import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {simulate} from '../burst112/production-model.mjs';

const baseline='8d95cfff19f69a2348572650d7c2ae04ff0e5d0f';
const files=['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'];
function load(previous=false,cache=true){
 for(const f of files){
  let s=previous?execFileSync('git',['show',`${baseline}:${f}`],{encoding:'utf8',windowsHide:true}):fs.readFileSync(f,'utf8');
  if(cache&&f==='nova-art.js')s=s.replace('function atMix(setting=3){','const mixCache=new Map();function atMix(setting=3){let r=mixCache.get(setting);if(!r){r=computeAtMix(setting);mixCache.set(setting,r);}return {...r,r:{...r.r}};}function computeAtMix(setting=3){');
  if(cache&&f==='nova-flow.js')s=s.replace('function lampWeights(p){','const lampCache=new Map();function lampWeights(p){if(!lampCache.has(p))lampCache.set(p,computeLampWeights(p));return lampCache.get(p);}function computeLampWeights(p){');
  vm.runInThisContext(s,{filename:f});
 }
}
const options={rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:true};
const unchanged=[];
for(const setting of [1,2,3,4,5]){
 const seed=127990000+setting;
 load(true);const previous=simulate(setting,30000,seed,options);
 load();const current=simulate(setting,30000,seed,options);
 assert.deepEqual(current,previous);
 unchanged.push({setting,seed,games:current.games,paid:current.totalPaid,bet:current.totalBet,identical:true});
}
load(false,false);const plain=simulate(6,30000,127999006,options);
load();const cached=simulate(6,30000,127999006,options);
assert.deepEqual(cached,plain);
const result={baseline,unchanged,cacheParity:{setting:6,seed:127999006,games:plain.games,paid:plain.totalPaid,bet:plain.totalBet,identical:true}};
fs.writeFileSync('research/s6-127/parity.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
