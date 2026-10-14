import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {loadModel} from '../scripts/zone-v2-model.mjs';
test('checkpoint quiet mode protects earned quota and suppresses all new rare rewards only after guaranteed reach',()=>{loadModel();for(const upper of [false,true])for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA']){const flow={...NovaArt.enter({setting:6},()=>.9),remaining:'500',researchUpper:upper},opts={setting:6,netPt:2000,checkpointNext:2400,checkpointQuiet:true};const r=NovaArt.step(flow,opts,()=>0,role);assert.equal(r.atOutcome.checkpointQuiet,true);assert.equal(r.atOutcome.direct,0);assert.equal(r.atOutcome.zone,'');assert(!r.flow.burstPending);assert(!r.flow.atPrelude);assert.equal(NovaProgress.sortieEligible(role,r),false);assert.equal(Number(r.flow.remaining),500-NovaArt.cashPayout(role));assert.equal(flow.remaining,'500');}for(const patch of [{zone:'sora'},{entryStage:'seven'},{initialStage:'wait'},{atPrelude:{}},{queuedZones:['sora']},{stock:'1'},{sets:'1'}])assert(!NovaArt.checkpointGuaranteed({phase:'art',remaining:'500',...patch},2000,2400));assert(!NovaArt.checkpointGuaranteed({phase:'art',remaining:'399'},2000,2400));});
test('setting hint probabilities are exclusive and definite colors never appear below their setting',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-checkpoint-hint.js','utf8'),c);
 // White, blue (even), yellow (odd), green (2+), purple (4+), red (5+), rainbow (6).
 const colors=['white','blue','yellow','green','purple','red','rainbow'];
 const percentages=[[70,10,20,0,0,0,0],[60,20,10,10,0,0,0],[60,10,20,10,0,0,0],[54,20,10,10,6,0,0],[52,10,20,10,6,2,0],[51,20,10,10,6,2,1]];
 for(let s=1;s<=6;s++){
  const w=c.NovaCheckpointHint.weights(s),counts={};
  for(let i=0;i<10000;i++){const color=c.NovaCheckpointHint.draw(s,()=>(i+.5)/10000);counts[color]=(counts[color]||0)+1;}
  colors.forEach((color,i)=>{assert(Math.abs(w[color]-percentages[s-1][i]/100)<1e-12);assert.equal(counts[color]||0,percentages[s-1][i]*100);});
 }
});
test('patrol starts on the completed third stop, never BET, and repeated settlement keeps its one-shot guard',()=>{const src=fs.readFileSync('nova-game.js','utf8'),bet=src.slice(src.indexOf('  async function spin(options={}'),src.indexOf('  function stopAllReels'));assert(!bet.includes('playZoneInternalConfirmedSound(resolved)'));assert.match(src,/if\(currentSpin.stopped.every\(Boolean\)\)\{\s*playZoneInternalConfirmedSound\(currentSpin.resolved\)/);});

import {simulate} from '../scripts/zone-v2-model.mjs';
test('historical quiet-mode model replays its approved cash ledger and MY stop',()=>{for(const row of JSON.parse(fs.readFileSync('tests/fixtures/checkpoint-quiet-20261013-trials.json'))){loadModel('../tests/fixtures/pre-upper-value-20261014');assert.equal(NovaArt.checkpointQuietRules.enabled,true);const r=simulate(row.setting,10000,row.seed,{rng:'xoshiro128',exactGames:true,stopAtComplete:true,atBetRefund:true,replayRefund:true});for(const [a,b]of [['totalBet','bet'],['totalPaid','paid'],['net','net'],['peak','peak']])assert.equal(r[a],row.after[b],row.seed+'/'+a);assert.equal(!!r.firstComplete,row.after.complete);}});
