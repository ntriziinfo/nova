import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function load(){const c=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);return c;}
const {NovaNormal:n,NovaArt:a,NovaFlow:f}=load();
test('normal NOVA uses pre-spin state for CZ and never promotes state',()=>{
 for(const level of ['low','high']){
  const state={level,highLeft:10,games:100};const p=level==='high'?.75:.25;
  for(const [roll,expected]of [[p-1e-10,'CZ'],[p,'']])assert.equal(n.spin(state,{phase:'normal'},3,{},()=>roll,'WEAK_NOVA').entry,expected);
  const t=n.spin(state,{phase:'normal'},3,{},()=>.99,'STRONG_NOVA');assert.equal(t.entry,'STRONG_CZ');assert.equal(t.state.level,level);assert.equal(t.czOptions.strongChance,level==='high'?1:.85);
  assert.equal(f.enterCZ(true,t.czOptions,()=>.849).success,true);
  assert.equal(f.enterCZ(true,t.czOptions,()=>.999).success,level==='high');
 }
 for(const role of ['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B'])assert.equal(n.spin({}, {phase:'normal'},3,{},()=>0,role).entry,'');
});
test('normal guarantee protects exactly ten subsequent games without rare extension',()=>{
 let s=n.advance({mode:'通常C'},'STRONG_SUICA',{phase:'normal'},{},()=>0);assert.equal(s.highLeft,10);
 s=n.normalize(JSON.parse(JSON.stringify(s)));
 for(let i=9;i>=0;i--){s=n.advance(s,'REPLAY',{phase:'cz'},{},()=>0);assert.equal(s.highLeft,i);assert.equal(s.level,'high');}
 s=n.advance(s,'REPLAY',{phase:'normal'},{},()=>0);assert.equal(s.level,'low');
 s=n.advance({level:'high',highLeft:5},'STRONG_SUICA',{phase:'normal'},{},()=>0);assert.equal(s.highLeft,4);
});
test('AT guarantee pauses during roulette and zones, carries through sets and save',()=>{
 let s={...a.enter(),atHigh:true,atHighLeft:10};
 s=a.step(s,{setting:3},()=>.99,'STRONG_NOVA').flow;assert.equal(s.atHighLeft,9);
 for(let i=0;i<2;i++)s=a.step(s,{setting:3},()=>.99).flow;
 assert.equal(s.atHighLeft,9);s=a.prepareBet(s,{setting:3},()=>.99);
 s=a.step(s,{setting:3},()=>.99).flow;assert.equal(s.atHighLeft,9);
 s=a.normalize(JSON.parse(JSON.stringify({...a.enter(),atHigh:true,atHighLeft:1,remaining:'15',sets:'1'})));
 s=a.step(s,{setting:3},()=>0,'BELL').flow;assert.equal(s.remaining,'275');assert.equal(s.atHigh,true);assert.equal(s.atHighLeft,0);
 s=a.step(s,{setting:3},()=>0,'REPLAY').flow;assert.equal(s.atHigh,false);
});
test('strong SUICA rare 300pt is literal points, not converted G, and pays 6pt',()=>{
 const seq=[.99,.99,0,.99999];const t=a.step(a.enter(),{setting:3},()=>seq.shift()??.99,'STRONG_SUICA');
 assert.equal(t.atOutcome.direct,300);assert.equal(t.flow.remaining,'569');assert.equal(a.payout(t.result),6);
});
test('live normal path passes strong CZ options and preserves normalized AT state',()=>{
 const c=load(),html=fs.readFileSync('jag.html','utf8');
 vm.runInContext("const normalState={internal:{level:'high',highLeft:10},flow:{phase:'normal'}},settings={setting:3};let pendingArtStep=null,pendingForceResult='STRONG_NOVA';"+html.match(/  function drawIndependentATypeOutcome\([^]*?\n  }/)[0],c);
 c.drawIndependentATypeOutcome();assert.equal(vm.runInContext('pendingArtStep.flow.success',c),true);assert.equal(vm.runInContext('pendingArtStep.flow.winProbability',c),1);
 assert.equal(f.normalize({...a.enter(),atHigh:true,atHighLeft:7}).atHighLeft,7);
});
test('old forced strong bell maps to ordinary bell in both engines',()=>{
 assert.equal(n.spin({}, {phase:'normal'},3,{},()=>.99,'STRONG_BELL').result,'BELL');
 const t=a.step(a.enter(),{setting:3},()=>.99,'STRONG_BELL');assert.equal(t.result,'BELL');assert.equal(t.flow.remaining,'260');
});
