import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c=vm.createContext({});for(const f of ['nova-tuning.js','nova-art.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);const a=c.NovaArt;
const at=upper=>({...a.enter({setting:3},()=>.99),remaining:'200',researchUpper:upper});
test('150pt quota pays 150pt net over 30 consecutive eight-point bells',()=>{
 let flow={...at(false),remaining:'150'},fee=0,paid=0;
 for(let game=1;game<=30;game++){
  fee+=3;flow=a.restoreBetCost(flow,3);
  flow=a.step(flow,{setting:3},()=>.999,'BELL').flow;paid+=8;
  assert.equal(Number(flow.remaining),150-(paid-fee));
  assert.equal(Number(flow.remaining),150-5*game);
 }
 assert.equal(fee,90);assert.equal(paid,240);assert.equal(paid-fee,150);
 assert.equal(flow.remaining,'0');assert.equal(flow.comebackLeft,5);
});
test('normal and upper AT refund a charged BET before payout, including during AT prelude',()=>{
 for(const upper of [false,true])for(const atPrelude of [null,{total:5,left:3,zones:[]}]){
  const before=at(upper);before.atPrelude=atPrelude;if(atPrelude){before.queuedZones=['toto'];before.stock='1';before.sets='1';}
  const refunded=a.restoreBetCost(before,3);assert.equal(before.remaining,'200');assert.equal(refunded.remaining,'203');
  const spin=a.step(refunded,{setting:3},()=>.999,'BELL');assert.equal(spin.flow.remaining,'195');
  assert.equal(a.restoreBetCost(spin.flow,3).remaining,'198');
  assert.equal(a.restoreBetCost(spin.flow,0),spin.flow);
 }
});
test('suspended quota phases and zero remaining cannot receive unearned refunds',()=>{
 for(const patch of [{phase:'normal'},{phase:'cz'},{zone:'sora'},{initialStage:'wait'},{entryStage:'seven'},{researchSortieLeft:10},{burstPending:true},{burstLeft:1},{researchChallengeActive:true},{comebackLeft:5},{comebackConfirmed:true},{queuedZones:['toto']},{stock:'1'},{sets:'1'},{zero:true},{remaining:'0'}]){
  const flow={...at(false),...patch};assert.equal(a.restoreBetCost(flow,3),flow);
 }
 for(const charge of [0,-3,NaN,Infinity,1.5]){const flow=at(false);assert.equal(a.restoreBetCost(flow,charge),flow);}
 const big={...at(false),remaining:'9007199254740999'};assert.equal(a.restoreBetCost(big,3).remaining,'9007199254741002');
});
test('live BET billing refunds once, keeps the actual fee, and excludes replays, BIG and pending bonus',()=>{
 const h=vm.createContext({A_TYPE_MODE:true,NovaArt:a,SPIN_COST:3,session:{active:false},normalState:{flow:at(false)},stats:{totalFee:0},clearCzReelBlackout(){},recordSlumpPoint(){},updateCompleteTrialState(){}});
 vm.runInContext(fs.readFileSync('nova-game.js','utf8').match(/  function chargeSpinCost\([^]*?\n  }/)[0],h);
 h.chargeSpinCost();assert.equal(h.stats.totalFee,3);assert.equal(h.normalState.flow.remaining,'203');
 h.normalState.replayFree=true;h.chargeSpinCost();assert.equal(h.stats.totalFee,3);assert.equal(h.normalState.flow.remaining,'203');assert.equal(h.normalState.replayFree,false);
 h.normalState.bonusPending=true;h.chargeSpinCost();assert.equal(h.stats.totalFee,6);assert.equal(h.normalState.flow.remaining,'203');
 h.normalState.bonusPending=false;h.session.active=true;h.chargeSpinCost();assert.equal(h.stats.totalFee,9);assert.equal(h.session.cost,3);assert.equal(h.normalState.flow.remaining,'203');
 h.session.active=false;h.normalState.flow={...at(false),zero:true};h.chargeSpinCost();assert.equal(h.stats.totalFee,9);assert.equal(h.normalState.flow.remaining,'200');
});
test('paid final game enters comeback normally and a free following BET never revives quota',()=>{
 const flow=a.restoreBetCost({...at(false),remaining:'1'},3),out=a.step(flow,{setting:3},()=>.999,'BELL');
 assert.equal(out.flow.remaining,'0');assert.equal(out.flow.comebackLeft,5);assert.equal(a.restoreBetCost(out.flow,3),out.flow);
});
