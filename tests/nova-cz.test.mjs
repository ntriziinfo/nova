import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const f=ctx.NovaFlow,n=ctx.NovaNormal;
test('only rare roles rewrite losses; wins are absorbing and reload retains probability',()=>{
 for(const role of ['MISS','BELL','REPLAY'])assert.equal(f.rewrite(f.enterCZ(false,undefined,()=>.9),role,{},()=>0).success,false);
 for(const [role,p] of Object.entries(f.rewriteRates)){
  const loss=f.enterCZ(false,undefined,()=>.9);
  assert.equal(f.rewrite(loss,role,{},()=>p).success,false);
  const win=f.rewrite(loss,role,{},()=>p/2);
  assert.equal(win.success,true);
  assert.ok(Math.abs(win.winProbability-(.4+.6*p))<1e-12);
  assert.equal(f.rewrite(f.normalize(JSON.parse(JSON.stringify(win))),role,{},()=>.999).success,true);
 }
});
test('last game rewrite awards success and does not add CZ failure impurity',()=>{
 const loss={phase:'cz',remaining:1,success:false,winProbability:.4};
 const t=n.spin({games:0},loss,1,{},()=>0,'STRONG_NOVA');
 assert.equal(t.czFlow.success,true);assert.equal(t.direct,true);
 assert.equal(t.state.impurity,n.rare.STRONG_NOVA.gain);
 const fail=n.spin({games:0},loss,1,{},()=>.99,'MISS');
 assert.equal(fail.direct,false);assert.equal(fail.internalBonus,null);assert.equal(fail.state.impurity,10);
});
test('Bayes lamp weights reproduce all six final confidences for ordinary and strong CZ',()=>{
 for(const p of [.4,.7,.43,.775,.95]){
  const weights=f.lampWeights(p);
  assert.ok(Math.abs(weights.reduce((s,w,i)=>s+w*f.lampConfidence[i],0)-p)<1e-10);
  weights.forEach((w,i)=>{const win=w*f.lampConfidence[i],loss=w*(1-f.lampConfidence[i]);assert.ok(Math.abs(win/(win+loss)-f.lampConfidence[i])<1e-12);});
 }
});
test('losing CZ never reveals Ouma or rainbow; winners support both confirmations',()=>{
 for(let i=0;i<1000;i++){
  const lamp=f.drawLamp({phase:'cz',remaining:1,success:false,winProbability:.7},()=>i/1000);
  assert.ok(lamp.stage<6);assert.equal(lamp.rainbow,false);
 }
 const win={phase:'cz',remaining:1,success:true,winProbability:1};
 assert.equal(f.drawLamp(win,()=>.9).stage,6);
 assert.equal(f.drawLamp(win,()=>.1).rainbow,true);
});

test('shared presentation quantile never lowers the target after probability increases or a rewrite',()=>{
 for(const u of [.001,.01,.05,.1,.2,.4,.6,.8,.95,.999])for(const coin of [.1,.9]){
  let lastLoss=0,lastWin=0;
  for(const p of [.4,.43,.5,.6,.7,.8,.9,.99,1]){
   const state={phase:'cz',remaining:5,totalGames:10,winProbability:p,lampRoll:u,rainbowRoll:coin};
   const rank=s=>{const lamp=f.drawLamp(s);return lamp.rainbow?6:lamp.stage;};
   const win=rank({...state,success:true});assert.ok(win>=lastWin);lastWin=win;
   if(p<1){const loss=rank({...state,success:false});assert.ok(loss>=lastLoss);assert.ok(win>=loss);lastLoss=loss;}
  }
 }
 const saved=f.normalize(JSON.parse(JSON.stringify(f.enterCZ(false,undefined,()=>.35))));
 assert.equal(saved.lampRoll,.35);assert.equal(saved.rainbowRoll,.35);assert.equal(saved.totalGames,17);
});

test('duration draws all 15 through 20G evenly and migrates old 10G defaults',()=>{
 for(const strong of [false,true])for(let i=0;i<6;i++){
  let calls=0;const state=f.enterCZ(strong,{czGames:10,strongGames:10},()=>calls++===0?.9:(i+.5)/6);
  assert.equal(state.remaining,15+i);assert.equal(state.totalGames,15+i);
 }
});
test('only third stop advances lamps and surprise rainbow can appear from the first CZ game',()=>{
 const lamp={stage:5,rainbow:true,rainbowAt:1,totalGames:20,remaining:20};
 assert.equal(f.lampAtStop(lamp,1),null);assert.equal(f.lampAtStop(lamp,2),null);
 const shown=f.lampAtStop(lamp,3);assert.equal(shown.stage,1);assert.equal(shown.rainbow,true);
 assert.equal(f.lampAtStop({...lamp,rainbowAt:20},3).rainbow,false);
 assert.equal(f.lampAtStop({...lamp,rainbowAt:20,remaining:1},3).rainbow,true);
});

test('live stop handler leaves first two stops dark and applies surprise rainbow on third',()=>{
 const html=fs.readFileSync('jag.html','utf8'),handler=html.match(/  function showCzLamp\([^]*?\n  }/)[0];
 const machine={dataset:{czLamp:'0',czRainbow:'false'}};
 ctx.document={getElementById:()=>machine};ctx.setTimeout=fn=>{fn();return 1;};ctx.clearTimeout=()=>{};
 vm.runInContext('let czLampTimers=[];'+handler,ctx);
 ctx.showCzLamp(1,{czLamp:{stage:5,rainbow:true,rainbowAt:1,totalGames:20,remaining:20}});
 ctx.showCzLamp(2,{czLamp:{stage:5,rainbow:true,rainbowAt:1,totalGames:20,remaining:20}});
 assert.equal(machine.dataset.czLamp,'0');assert.equal(machine.dataset.czRainbow,'false');
 ctx.showCzLamp(3,{czLamp:{stage:5,rainbow:true,rainbowAt:1,totalGames:20,remaining:20}});
 assert.equal(machine.dataset.czLamp,'1');assert.equal(machine.dataset.czRainbow,'true');
});

test('full or rainbow lamps end CZ early with a bonus even when direct ART chance is 100%',()=>{
 for(const [remaining,rainbowRoll] of [[2,.9],[20,0]]){
  const flow={phase:'cz',remaining,totalGames:20,success:true,winProbability:1,lampRoll:.9,rainbowRoll};
  const t=n.spin({games:50},flow,1,{art:{czArt:1}},()=>.9,'MISS');
  assert.equal(t.direct,false);assert.equal(t.internalBonus.source,'CZ全員点灯');
  assert.ok(['BIG','MID'].includes(t.internalBonus.kind));
 }
});
test('partial lamps keep CZ running and never award a premature bonus',()=>{
 const t=n.spin({games:50},{phase:'cz',remaining:20,totalGames:20,success:true,winProbability:1,lampRoll:.9,rainbowRoll:.9},1,{},()=>.9,'MISS');
 assert.equal(t.internalBonus,null);assert.equal(t.direct,false);
});
