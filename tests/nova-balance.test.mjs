import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const a=ctx.NovaArt,b=ctx.NovaBalance;
test('all target RTPs solve a stable finite ART reward model',()=>{
 for(let i=0;i<6;i++){const p=b.profile(i+1);assert.ok(Math.abs(p.rtp-b.targets[i])<1e-10);assert.ok(p.offspring<1);assert.ok(p.scale>0);if(i)assert.ok(p.directDenom<b.profile(i).directDenom);}
});
test('zone selection exactly follows each setting table with all six reachable',()=>{
 for(let i=1;i<=6;i++){const counts=Object.fromEntries(Object.keys(a.names).map(x=>[x,0]));for(let k=0;k<10000;k++)counts[a.pickZone(i,()=> (k+.5)/10000)]++;assert.deepEqual(Object.values(counts),Array.from(a.zoneWeights[i-1],p=>p*100));}
});
test('fixed BIG30 / REG15 end by games, with no first-hit ART guarantee',()=>{
 for(const games of [15,30]){let s={bonusGamesRemaining:games,bonusArtSets:0};for(let n=0;n<games;n++){s=a.advanceBonus(s,false);assert.equal(s.bonusGamesRemaining,games-n-1);}assert.equal(a.afterBonus(null,{},s.bonusArtSets).phase,'normal');}
});
test('each special adds one set; next set starts only after remaining games end',()=>{
 let bonus={bonusGamesRemaining:30,bonusArtSets:0};for(let i=0;i<30;i++)bonus=a.advanceBonus(bonus,i===0||i===29);
 assert.equal(bonus.bonusArtSets,2);let flow=a.afterBonus(null,{},2);assert.equal(flow.remaining,'50');assert.equal(flow.sets,'1');
 flow=a.normalize(JSON.parse(JSON.stringify(flow)));for(let i=0;i<50;i++)flow=a.step(flow,{rare:0},()=>.99).flow;assert.equal(flow.remaining,'50');assert.equal(flow.sets,'0');
 for(let i=0;i<50;i++)flow=a.step(flow,{rare:0},()=>.99).flow;assert.equal(flow.phase,'normal');
 const held=a.afterBonus({...a.enter(),remaining:'17',sets:'2'}, {},1);assert.equal(held.remaining,'17');assert.equal(held.sets,'3');
});
test('ART and bonus distributions have expected net 2.5pt including zero-pay special roles',()=>{
 for(const [zero,pay]of [[a.defaults.rare,8],[a.bonusSpecial,15]]){let paid=0;for(let i=0;i<100000;i++){const role=a.drawPaidRole(zero,pay,()=> (i+.5)/100000);paid+=role==='BELL'?pay:3;}assert.ok(Math.abs((1-zero)*paid/100000-3-2.5)<.0002);}
});
test('live game lottery uses the calibrated entry thresholds',()=>{
 vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),ctx);
 const source=fs.readFileSync('jag.html','utf8');const fn=source.match(/  function drawIndependentATypeOutcome\([^]*?\n  }/)[0];
 vm.runInContext('let settings={setting:1};let normalState={flow:{phase:"normal"}};let pendingArtStep=null;'+fn,ctx);
 for(let setting=1;setting<=6;setting++){
  const p=b.profile(setting);
  vm.runInContext(`settings.setting=${setting};Math.random=()=>${1/p.directDenom-1e-12};drawIndependentATypeOutcome();`,ctx);
  assert.equal(vm.runInContext('pendingArtStep.message',ctx),'ART直撃');
  vm.runInContext(`globalThis.rolls=[${1/p.directDenom+1e-12},0];Math.random=()=>rolls.shift();globalThis.result=drawIndependentATypeOutcome();`,ctx);
  assert.equal(ctx.result.result,'STRONG_CZ');
  vm.runInContext(`globalThis.rolls=[${1/p.directDenom+1e-12},${1/p.strongDenom+1e-12}];globalThis.result=drawIndependentATypeOutcome();`,ctx);
  assert.equal(ctx.result.result,'CZ');
 }
});
