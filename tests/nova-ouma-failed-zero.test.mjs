import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const h=fs.readFileSync('jag.html','utf8');
test('failed continuation bypasses fee, game counter and role/zone draws',()=>{
 const calls=[];const flow={phase:'art',zone:'ouma',zoneLeft:3,remaining:'150',award:'100'};
 const c=vm.createContext({options:{oumaFailed:true},normalState:{flow},normalActiveAtSpinStart:true,aTypeBonusActiveAtSpinStart:false,lineRow:1,countTotalSpinIfNeeded(){calls.push('count')},chargeSpinCost(){calls.push('fee')},drawNormalResult(){calls.push('draw');return 'SUPER_NOVA'},drawResult(){calls.push('draw')},resolveNormalOutcome(){calls.push('resolve')},resolveOutcome(){calls.push('resolve')}});
 const cost=h.match(/    if\(!options\?\.oumaFailed\)\{\s+countTotalSpinIfNeeded[^]*?\n    }/)[0];
 const draw=h.match(/    const result = options\?\.oumaFailed[^\n]+/)[0];const resolve=h.match(/    const resolved = options\?\.oumaFailed[^\n]+/)[0];
 vm.runInContext(cost+'\n'+draw+'\n'+resolve+'\nglobalThis.out=resolved;globalThis.role=result;',c);
 assert.equal(c.role,'MISS');assert.equal(c.out.reward,0);assert.equal(c.out.flowAfter,flow);assert.deepEqual(calls,[]);
});
test('failed continuation completion skips ordinary result application',()=>{
 const block=h.match(/    if\(resolved.oumaFailed\)\{[^]*?\n    }/)[0];let displayed=0;
 const c=vm.createContext({normalState:{},resolved:{oumaFailed:true},$:()=>({}),persistState(){},updateDisplay(){displayed++},playNormalBgm(){}});
 vm.runInContext('(function(){'+block+'throw new Error("ordinary payout path reached");})()',c);assert.equal(displayed,1);
});
