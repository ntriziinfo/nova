import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function load(){const c=vm.createContext({});for(const f of ['nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);return c;}
const {NovaNormal:n,NovaArt:a,NovaFlow:f}=load();
test('normal NOVA uses pre-spin CZ state; weak NOVA can promote high',()=>{
 for(const level of ['low','high']){
  const state={level,highLeft:10,games:100};const p=n.roleCzRate(state,'WEAK_NOVA',3);
  for(const [roll,expected]of [[p-1e-10,'CZ'],[p,'']])assert.equal(n.spin(state,{phase:'normal'},3,{},()=>roll,'WEAK_NOVA').state.prelude?.entry||'',expected);
  const t=n.spin(state,{phase:'normal'},3,{},()=>.25,'STRONG_NOVA');assert.equal(t.entry,'');assert.equal(t.state.prelude.entry,'STRONG_CZ');assert.equal(t.state.level,level);assert.equal(t.czOptions.strongChance,level==='high'?1:.85);
  assert.equal(f.enterCZ(true,t.czOptions,()=>.849).success,true);
  assert.equal(f.enterCZ(true,t.czOptions,()=>.999).success,level==='high');
 }
 for(const role of ['WEAK_SUICA','WEAK_NOVA'])assert.equal(n.spin({}, {phase:'normal'},3,{},()=>0,role).state.prelude.entry,'CZ');
});
test('normal guarantee protects exactly ten subsequent games without rare extension',()=>{
 let s=n.advance({mode:'通常C'},'WEAK_SUICA',{phase:'normal'},{},()=>0);assert.equal(s.highLeft,10);
 s=n.normalize(JSON.parse(JSON.stringify(s)));
 for(let i=9;i>=0;i--){s=n.advance(s,'REPLAY',{phase:'cz'},{},()=>0);assert.equal(s.highLeft,i);assert.equal(s.level,'high');}
 s=n.advance(s,'REPLAY',{phase:'normal'},{},()=>0);assert.equal(s.level,'low');
 s=n.advance({level:'high',highLeft:5},'WEAK_SUICA',{phase:'normal'},{},()=>0);assert.equal(s.highLeft,4);
});
test('AT high guarantee counts prelude games, pauses in roulette/zones and survives stock consumption',()=>{
 let s={...a.enter({},()=>.5),remaining:'150',atHigh:true,atHighLeft:10,burstUsed:true};
 s=a.step(s,{setting:3},()=>.25,'STRONG_NOVA').flow;assert.equal(s.atHighLeft,9);
 let expected=9;while(s.atPrelude){s=a.step(s,{setting:3},()=>.99,'REPLAY').flow;assert.equal(s.atHighLeft,--expected);}
 assert.equal(s.entryStage,'seven');
 for(let i=0;i<2;i++){s=a.step(s,{setting:3},()=>.99,'MISS').flow;assert.equal(s.atHighLeft,expected);}
 s=a.prepareBet(s,{setting:3},()=>.99);s=a.step(s,{setting:3},()=>.99).flow;assert.equal(s.atHighLeft,expected);
 s=a.normalize(JSON.parse(JSON.stringify({...a.enter({},()=>.5),atHigh:true,atHighLeft:1,remaining:'15',sets:'1'})));
 s=a.step(s,{setting:3},()=>0,'BELL').flow;assert.equal(s.remaining,'15');assert.equal(s.atHighLeft,1);assert.equal(s.sets,'0');assert.equal(s.entryStage,'roulette');
});

test('merged SUICA rare 300pt is literal points, not converted G, and pays 6pt',()=>{
 const seq=[.99,.99,.99,0,.999999,.99];const t=a.step(({...a.enter({},()=>.5),remaining:'150',entryQuota:'150'}),{setting:3},()=>seq.shift()??.99,'WEAK_SUICA');
 assert.equal(t.atOutcome.direct,300);assert.equal(t.flow.remaining,'444');assert.equal(a.payout(t.result),6);
});
test('live normal path passes strong CZ options and preserves normalized AT state',()=>{
 const c=load(),html=readGameSource();
 vm.runInContext("const normalState={internal:{level:'high',highLeft:10},flow:{phase:'normal'}},settings={setting:3};let pendingArtStep=null,pendingForceResult='STRONG_NOVA';"+html.match(/  function drawIndependentATypeOutcome\([^]*?\n  }/)[0],c);
 c.drawIndependentATypeOutcome();assert.equal(vm.runInContext('pendingArtStep.flow.phase',c),'normal');
 vm.runInContext("normalState.internal=pendingArtStep.normalInternal;pendingForceResult='BELL';",c);
 for(let i=0;i<11;i++){
  c.drawIndependentATypeOutcome();
  if(vm.runInContext('!!pendingArtStep.czEntry',c))break;
  vm.runInContext('normalState.internal=pendingArtStep.normalInternal;',c);
 }
 assert.equal(vm.runInContext('pendingArtStep.flow.success',c),true);assert.equal(vm.runInContext('pendingArtStep.flow.winProbability',c),1);
 assert.equal(f.normalize({...({...a.enter({},()=>.5),remaining:'150',entryQuota:'150'}),atHigh:true,atHighLeft:7}).atHighLeft,7);
});
test('old forced strong bell maps to ordinary bell in both engines',()=>{
 assert.equal(n.spin({}, {phase:'normal'},3,{},()=>.99,'STRONG_BELL').result,'BELL');
 const t=a.step(({...a.enter({},()=>.5),remaining:'150',entryQuota:'150'}),{setting:3},()=>.99,'STRONG_BELL');assert.equal(t.result,'BELL');assert.equal(t.flow.remaining,'142');
});
