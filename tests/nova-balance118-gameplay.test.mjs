import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
const current=vm.createContext({});
for(const file of ['nova-tuning.js','nova-art.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(file,'utf8'),current);
const plain=v=>JSON.parse(JSON.stringify(v));
test('discarded AT levels do not alter current normal roles or the two BIG success tiers',()=>{
 const a=current.NovaArt;assert.equal(a.atLevelRules,undefined);assert(a.commonAtRules);
 assert.equal(a.bonusRules.normal.atChance,.52);assert.equal(a.bonusRules.upper.atChance,.8);
 for(let setting=1;setting<=6;setting++){
  const row=current.NovaNormal.roleProbabilities(setting);assert(Object.values(row).every(p=>p>=0&&p<=1));
  assert(Math.abs(Object.values(row).reduce((sum,p)=>sum+p,0)-1)<1e-12);
  for(const atLevel of [0,1,5])assert.deepEqual(a.enter({setting,atLevel},()=>.5),a.enter({setting},()=>.5));
 }
});

test('legacy AT levels cannot change any current zone award or continuation trace',()=>{
 const trace=(id,seed,atLevel)=>{
  const a=current.NovaArt,rng=xoshiro128(seed);let s=a.startZone({...a.enter({setting:6},()=>.5),atLevel,remaining:'500'},id,{setting:6},rng);const rows=[];
  for(let g=0;s.zone&&g<10000;g++){s=a.prepareBet(s,{setting:6},rng);const step=a.step(s,{setting:6},rng);rows.push(plain(step));s=step.flow;}
  assert.equal(s.zone,'');return rows;
 };
 for(const id of current.NovaArt.zoneIds)for(const seed of [118,99118,118219])for(const level of [1,5])assert.deepEqual(trace(id,seed,level),trace(id,seed,undefined),id);
});
