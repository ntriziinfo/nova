import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
const prior=vm.createContext({}),current=vm.createContext({});
for(const file of ['nova-art.js','nova-flow.js','nova-normal.js']){
 vm.runInContext(execFileSync('git',['show',`90f739d:${file}`],{encoding:'utf8'}),prior);
 vm.runInContext(fs.readFileSync(file,'utf8'),current);
}
const plain=v=>JSON.parse(JSON.stringify(v));
test('normal rare probabilities, bonus chances, Lv5 and initial AT weights are unchanged',()=>{
 const a=current.NovaArt,b=prior.NovaArt;
 assert.deepEqual(plain(a.atLevelRules.levels[5]),plain(b.atLevelRules.levels[5]));
 assert.deepEqual(plain(a.atLevelRules.weights),plain(b.atLevelRules.weights));
 assert.deepEqual(plain(a.bonusRules),plain(b.bonusRules));
 for(let s=1;s<=6;s++){
  const next=current.NovaNormal.roleProbabilities(s),old=prior.NovaNormal.roleProbabilities(s);
  for(const role of Object.keys(current.NovaNormal.rare))assert.equal(next[role],old[role]);
  assert(next.REPLAY>old.REPLAY);assert.equal(current.NovaNormal.pay('REPLAY'),0);
 }
});
test('each of the nine zones retains its exact awards and continuation trace',()=>{
 const trace=(ctx,id,seed)=>{
  const a=ctx.NovaArt,rng=xoshiro128(seed);let s=a.startZone({...a.enter({setting:6},rng),atLevel:1},id,{setting:6},rng);const rows=[];
  for(let g=0;s.zone&&g<10000;g++){s=a.prepareBet(s,{setting:6},rng);const step=a.step(s,{setting:6},rng);rows.push(plain(step));s=step.flow;}
  assert.equal(s.zone,'');return rows;
 };
 for(const id of current.NovaArt.zoneIds)for(const seed of [118,99118,118219])assert.deepEqual(trace(current,id,seed),trace(prior,id,seed),id);
});
