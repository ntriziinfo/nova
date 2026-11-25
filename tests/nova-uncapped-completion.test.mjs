import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const baseline=JSON.parse(fs.readFileSync('tests/fixtures/uncapped-completion-source.json','utf8')); 
import assert from 'node:assert/strict';
import test from 'node:test';
test('completion correction preserves the exact uncapped RTP algorithm and its options',()=>{
 const old=vm.createContext({}),current=vm.createContext({});
 vm.runInContext(baseline.completeSource,old);
 vm.runInContext(fs.readFileSync('nova-complete.js','utf8'),current);
 assert.equal(old.NovaComplete.observe.toString().replaceAll('\r\n','\n'),current.NovaComplete.observe.toString().replaceAll('\r\n','\n'));
 assert.equal(old.NovaComplete.restore.toString().replaceAll('\r\n','\n'),current.NovaComplete.restore.toString().replaceAll('\r\n','\n'));
 for(const context of [old,current]){
  const settings=context.NovaComplete.configure({completeLimitPt:10000,completeMyLimitPt:19000},true,false);
  assert.equal(settings.completeLimitPt,0);assert.equal(context.NovaComplete.myLimit(settings),0);
  const state={};for(let i=0;i<100000;i++)context.NovaComplete.observe(state,(i%5-2)*i,0,0);
  assert.equal(Boolean(state.locked),false);
 }
 const next=fs.readFileSync('nova-game.js','utf8');
 // All differences are outside the simulation's lottery/payout modules.
 for(const [file,expected] of Object.entries(baseline.hashes))assert.equal(createHash('sha256').update(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')).digest('hex'),expected);
 assert(next.includes('completeRecoveryBackup'));
});
