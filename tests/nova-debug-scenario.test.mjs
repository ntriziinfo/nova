import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync('nova-game.js','utf8');
const original=execFileSync('git',['show','c6ab76bc22cee21b518702df916c6c1f3b1428be:nova-game.js'],{encoding:'utf8',maxBuffer:5e6});
const moduleSource=fs.readFileSync('nova-debug-scenario.js','utf8');
const ctx=vm.createContext({});vm.runInContext(moduleSource,ctx);const d=ctx.NovaDebugScenario;
const command={type:'reserveDebugScenario',id:'one',machineId:'nova-01',sessionId:'a',zoneG:300,at:true,upper:true,sortie:true,sortieG:15};
const context={enabled:true,machineId:'nova-01',sessionId:'a'};
test('session binding, replacement, cancellation and duplicate delivery',()=>{
 let s=d.accept(command,context);assert.equal(s.stage,'waiting');assert.equal(d.accept(command,context,s),s);
 assert.equal(d.accept({...command,id:'two',sessionId:'b'},context,s),s);
 s=d.accept({...command,id:'cancel',type:'cancelDebugScenario'},context,s);assert.equal(s.stage,'done');
 assert.equal(d.accept(command,context,s),s);assert.equal(d.active(s,'b'),false);
});
test('natural BB follows selected upper route and sortie counts only AT games',()=>{
 let s=d.accept(command,context);assert.equal(d.guarantee(s),true);d.bonus(s);assert.equal(d.upper(s),true);d.afterBonus(s);
 for(const flow of [{phase:'normal'},{phase:'art',initialStage:'wait'},{phase:'art',zone:'sora'},{phase:'art',burstPending:true}])assert.equal(d.atGame(s,flow),false);
 for(let i=1;i<=15;i++){s=JSON.parse(JSON.stringify(s));assert.equal(d.atGame(s,{phase:'art'}),i===15);}
 assert.equal(d.atGame(s,{phase:'art'}),false);
});
test('BB handoff selects upper challenge ahead of normal AT, and normal-only keeps initial points',()=>{
 for(const upper of [false,true]){
  const s=d.accept({...command,upper},context);d.bonus(s);
  const flow={phase:'art',researchChallengeSource:'initial',burstPending:true,initialStage:'wait',remaining:'0'};
  d.finishBonus(s,flow);assert.equal(flow.burstPending,upper);assert.equal(flow.initialStage,upper?'':'wait');assert.equal(s.stage,'at');
 }
});
function extract(s,n){return s.match(new RegExp('  function '+n+'\\([^]*?\\n  }'))[0];}
function load(s,reservation,setting=3){
 const c=vm.createContext({PLAY_SESSION_ID:'a',normalState:{debugScenario:reservation,internal:{games:0},flow:{phase:'normal'}},settings:{setting},pendingForceResult:'',pendingArtStep:null,currentGameProfit:()=>0});
 for(const file of ['nova-tuning.js','nova-decrement.js','nova-art.js','nova-balance.js','nova-normal.js','nova-flow.js','nova-progress.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 vm.runInContext(moduleSource,c);vm.runInContext(extract(source,'activeDebugScenario'),c);
 vm.runInContext('let draws=0;Math.random=()=>{draws++;return .99};',c);vm.runInContext(extract(s,'drawIndependentATypeOutcome'),c);return c;
}
test('no reservation leaves roles, payouts, flow and RNG consumption identical',()=>{
 for(let setting=1;setting<=6;setting++)for(const phase of ['normal','art']){
  const a=load(original,undefined,setting),b=load(source,undefined,setting);
  for(const c of [a,b])if(phase==='art')c.normalState.flow={...c.NovaArt.enter({setting:3},()=>.99),remaining:'777'};
  for(let i=0;i<50;i++){
   assert.equal(JSON.stringify(a.drawIndependentATypeOutcome()),JSON.stringify(b.drawIndependentATypeOutcome()));
   assert.equal(JSON.stringify(a.pendingArtStep),JSON.stringify(b.pendingArtStep));
   assert.equal(vm.runInContext('draws',a),vm.runInContext('draws',b));
   for(const c of [a,b]){c.normalState.flow=c.pendingArtStep.flow;if(c.pendingArtStep.normalInternal)c.normalState.internal=c.pendingArtStep.normalInternal;}
  }
 }
});
test('reservation forces BB at target G and retains earlier natural BB',()=>{
 const c=load(source,d.accept(command,context));c.normalState.internal={...c.NovaNormal.normalize(null),games:299};
 assert.equal(c.drawIndependentATypeOutcome().internalBonus.kind,'BIG');
 const early=load(source,d.accept({...command,zoneG:800},context));early.NovaNormal.spin=()=>({state:{games:10},result:'MISS',czFlow:{phase:'normal'},internalBonus:{kind:'BIG',source:'natural'}});
 assert.equal(early.drawIndependentATypeOutcome().internalBonus.source,'natural');
});
