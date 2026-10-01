import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const context=vm.createContext({});
for(const name of ['atCheckpointStatus','checkpointResultCard'])vm.runInContext(source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],context);
const label=context.atCheckpointStatus,card=context.checkpointResultCard;
const at=remaining=>({phase:'art',remaining:String(remaining)});

test('countdown follows cumulative net, not remaining AT payout; gold remains a projection',()=>{
 for(const [net,remaining,next,left,gold] of [[2000,399,2400,400,false],[2000,400,2400,400,true],[-1000,3500,2400,3400,true],[2500,500,4800,2300,false],[4300,500,4800,500,true]]){
  const view=label(at(remaining),{next},net);
  assert.equal(view.text,`上位ATチャレンジまで${left.toLocaleString('ja-JP')}pt`);assert.equal(view.gold,gold);
 }
 assert.equal(label(at(0),{next:2400},2000).text,'上位ATチャレンジまで400pt');
 assert.equal(label(at(500),{},0),null);assert.equal(label(at(500),{next:2400},NaN),null);
});

test('earned checkpoint stays at zero until the challenge; consumed line is not reused',()=>{
 assert.equal(label(at(0),{next:4800,pending:1},2399).text,'上位ATチャレンジまで0pt');
 const flow={...at(120),burstPending:true,researchChallengeSource:'threshold'};
 assert.equal(label(flow,{next:4800,pending:0},2399).text,'上位ATチャレンジまで0pt');
 assert.equal(label({...flow,researchChallengeActive:true,burstLeft:10},{next:4800},2399),null);
 assert.equal(label(at(120),{next:4800},2399).text,'上位ATチャレンジまで2,401pt');
});

test('all-character ending is once per earned line across queueing, reload, and next checkpoint',()=>{
 const progress=Object.freeze({next:4800,pending:1}),flow=Object.freeze({...at(500),stock:'2',sets:'1',queuedZones:Object.freeze(['sora'])});
 const before=JSON.stringify({flow,progress});
 const first=card(flow,progress,0,2402);
 assert.equal(first.kind,'checkpoint');assert.equal(first.character,'all');assert.equal(first.pt,'2402');assert.equal(first.checkpoint,2400);
 assert.equal(card(flow,progress,JSON.parse(JSON.stringify(first.checkpoint)),2402),null);
 const queued={...flow,burstPending:true,researchChallengeSource:'threshold'};
 assert.equal(card(queued,{next:4800,pending:0},0,2399).checkpoint,2400);
 assert.equal(card(queued,{next:4800,pending:0},2400,2399),null);
 assert.equal(card(flow,{next:7200,pending:1},2400,4801).checkpoint,4800);
 assert.equal(card(flow,{next:7200,pending:2},0,4801).checkpoint,2400);
 assert.equal(card({...at(0)}, {next:2400,pending:0},0,2000),null);
 assert.equal(JSON.stringify({flow,progress}),before);
});

test('special phases keep their instructions and wait to show the ending',()=>{
 for(const patch of [{phase:'cz'},{zone:'sora'},{entryStage:'roulette'},{initialStage:'zone'},{atPrelude:{}},{researchSortieLeft:10},{researchChallengeActive:true},{burstPending:true,researchChallengeSource:'rare'}]){
  const flow=Object.freeze({...at(10000),...patch});
  assert.equal(label(flow,{next:4800,pending:1},2400),null);
  assert.equal(card(flow,{next:4800,pending:1},0,2400),null);
 }
});

test('presentation gate does not mutate gameplay, consume RNG, overwrite other results, or repeat',()=>{
 let calls=0;const flow=Object.freeze(at(500)),progress=Object.freeze({next:4800,pending:1});
 const c=vm.createContext({A_TYPE_MODE:true,debugFastSpinActive:false,session:{active:false},normalState:{flow},isSpinning:false,isCompleteTrialLocked:()=>false,NovaAim:{busy:false},NovaDirectAward:{busy:false},NovaProgress:{snapshot:()=>progress},currentProfit:()=>2401,checkpointResultCard:card,displayNovaResult(result){calls++;c.normalState.resultCard=result;}});
 vm.runInContext(source.match(/  function showCheckpointResultIfReady\([^]*?\n  }/)[0],c);
 c.normalState.resultCard={kind:'zone'};assert.equal(c.showCheckpointResultIfReady(),false);
 assert.equal(c.showCheckpointResultIfReady(true),true);assert.equal(calls,1);
 assert.equal(c.normalState.checkpointResultShown,2400);assert.equal(c.normalState.flow,flow);
 assert.equal(c.showCheckpointResultIfReady(true),false);assert.equal(calls,1);
});
