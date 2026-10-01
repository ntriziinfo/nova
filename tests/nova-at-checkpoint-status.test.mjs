import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const context=vm.createContext({});
vm.runInContext(source.match(/  function atCheckpointStatus\([^]*?\n  }/)[0],context);
const label=context.atCheckpointStatus;
const at=remaining=>({phase:'art',remaining:String(remaining)});

test('notice compares net plus remaining against the next unconsumed checkpoint',()=>{
 assert.equal(label(at(399),{next:2400},2000),'');
 assert.equal(label(at(400),{next:2400},2000),'AT 残り400pt ＋上位ATチャレンジ');
 assert.equal(label(at(500),{next:2400},2000),'AT 残り500pt ＋上位ATチャレンジ');
 assert.equal(label(at(3000),{next:2400},-1000),'');
 assert.equal(label(at(3400),{next:2400},-1000),'AT 残り3,400pt ＋上位ATチャレンジ');
 assert.equal(label(at(500),{next:4800},2500),'');
 assert.equal(label(at(500),{next:4800},4300),'AT 残り500pt ＋上位ATチャレンジ');
 assert.equal(label({...at(500),researchUpper:true},{next:7200},6700),'上位AT 残り500pt ＋上位ATチャレンジ');
});

test('an earned checkpoint stays visible while waiting, then gives way to challenge progress',()=>{
 assert.equal(label(at(0),{next:4800,pending:1},2399),'AT 残り0pt ＋上位ATチャレンジ');
 const flow={...at(120),burstPending:true,researchChallengeSource:'threshold'};
 assert.equal(label(flow,{next:4800,pending:0},2399),'AT 残り120pt ＋上位ATチャレンジ');
 assert.equal(label({...flow,researchChallengeActive:true,burstLeft:10},{next:4800,pending:0},2399),'');
 assert.equal(label({...flow,burstPending:false,researchChallengeSource:''},{next:4800,pending:0},2399),'');
});

test('special phases keep their instructions and the notice cannot consume progress or stock',()=>{
 const progress=Object.freeze({next:2400,pending:0});
 for(const patch of [{phase:'normal'},{phase:'cz'},{zone:'sora'},{entryStage:'roulette'},{initialStage:'zone'},{atPrelude:{}},{researchSortieLeft:10},{comebackLeft:5},{comebackConfirmed:true},{burstPending:true,researchChallengeSource:'rare'}]){
  assert.equal(label(Object.freeze({...at(10000),...patch}),progress,0),'');
 }
 const flow=Object.freeze({...at(500),stock:'2',sets:'1',queuedZones:Object.freeze(['sora'])});
 const before=JSON.stringify({flow,progress});
 for(let i=0;i<100;i++)assert.equal(label(flow,progress,2000),'AT 残り500pt ＋上位ATチャレンジ');
 assert.equal(JSON.stringify({flow,progress}),before);
 assert.equal(label(at('10000000000000000000'),progress,0),'AT 残り10,000,000,000,000,000,000pt ＋上位ATチャレンジ');
 assert.equal(label(at(500),{},0),'');
 assert.equal(label(at(500),progress,NaN),'');
});
