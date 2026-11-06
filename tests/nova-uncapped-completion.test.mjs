import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
test('completion correction preserves the exact uncapped RTP algorithm and its options',()=>{
 const old=vm.createContext({}),current=vm.createContext({});
 vm.runInContext(execFileSync('git',['show','791c8b30fc10306ddc147266a41c5ed091b8888b:nova-complete.js'],{encoding:'utf8'}),old);
 vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),current);
 assert.equal(old.NovaComplete.observe.toString(),current.NovaComplete.observe.toString());
 assert.equal(old.NovaComplete.restore.toString(),current.NovaComplete.restore.toString());
 for(const context of [old,current]){
  const settings=context.NovaComplete.configure({completeLimitPt:10000,completeMyLimitPt:19000},true,false);
  assert.equal(settings.completeLimitPt,0);assert.equal(context.NovaComplete.myLimit(settings),0);
  const state={};for(let i=0;i<100000;i++)context.NovaComplete.observe(state,(i%5-2)*i,0,0);
  assert.equal(Boolean(state.locked),false);
 }
 const prior=execFileSync('git',['show','791c8b30fc10306ddc147266a41c5ed091b8888b:nova-game.js'],{encoding:'utf8'});
 const next=fs.readFileSync('nova-game.js','utf8');
 // All differences are outside the simulation's lottery/payout modules.
 for(const file of ['nova-normal.js','nova-flow.js','nova-art.js','nova-progress.js','scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs'])assert.equal(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n'),execFileSync('git',['show','791c8b30fc10306ddc147266a41c5ed091b8888b:'+file],{encoding:'utf8'}).replaceAll('\r\n','\n'));
 assert(prior.includes('function applyStoreCompleteSettings'));assert(next.includes('completeRecoveryBackup'));
});
