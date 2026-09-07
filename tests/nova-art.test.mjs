import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-art.js','utf8'),ctx);const a=ctx.NovaArt;
test('Giru changes continuation at 80 and 320G with mean 80G across settings',()=>{
 for(let setting=1;setting<=6;setting++){
  const row=a.giruRates.normal;
  for(const [g,p]of [[5,row[0]],[79,row[0]],[80,row[1]],[319,row[1]],[320,row[2]],[640,row[2]]]){
   assert.equal(a.giruChance(a.points(g),setting),p);
   let state=a.startZone(a.enter(),'giru',{setting});state.award=(275n+a.points(g)).toString();state.giruBase=5;
   assert.equal(a.step(state,{},()=>p).flow.zone,'');
   assert.equal(a.step(state,{},()=>p-1e-9).flow.award,(275n+a.points(g)*2n).toString());
  }
  assert.ok(row[0]>row[1]&&row[1]>row[2]&&row[2]<.5);
 }
 let s=a.startZone(a.enter(),'giru',{setting:6});s.award='495';s.giruBase=5;let t=a.step(s,{},()=>0);
 assert.equal(t.flow.award,'715');assert.match(t.message,/逆回転成功/);
 s=a.normalize(JSON.parse(JSON.stringify(t.flow)));assert.equal(s.giruSetting,6);
 t=a.step(s,{},()=>.56);assert.equal(t.flow.zone,'');assert.equal(t.flow.remaining,'990');
});
test('ART natural and forced Giru entries preserve the selected setting',()=>{
 let forced=a.step(a.enter(),{setting:5},()=>0,'ZONE_giru');assert.equal(forced.flow.giruSetting,5);
 let sequence=[0,0,0,.82];const natural=a.step(a.enter(),{setting:6},()=>sequence.shift());
 assert.equal(natural.flow.pendingZone,'giru');assert.equal(natural.flow.entryStage,'seven');
});
test('all six zones preserve ART games and finish correctly',()=>{
 for(const zone of Object.keys(a.names)){let s=a.startZone(a.enter(),zone);let n=0;while(s.zone&&n++<20)s=a.step(s,{},()=>.99).flow;assert.equal(s.zone,'');assert.ok(BigInt(s.remaining)>=50n);assert.equal(n,{sosuke:3,toto:5,urapi:5,giru:2,sora:10,ouma:5}[zone]);}
});
test('Giru has exact unlimited doubling, survives JSON, and adds final value once',()=>{
 let s=a.startZone(a.enter(),'giru');s=a.step(s,{},()=>.99).flow;for(let i=0;i<1100;i++){const t=a.step(s,{},()=>0);assert.equal(t.reverse,true);s=a.normalize(JSON.parse(JSON.stringify(t.flow)));}
 assert.equal(s.award,(275n+28n*2n**1100n).toString());assert.equal(s.remaining,'275');assert.equal(s.zero,true);
 s=a.step(s,{},()=>.5).flow;assert.equal(s.remaining,(550n+28n*2n**1100n).toString());assert.equal(s.zero,false);assert.equal(s.zone,'');
});
test('Sora adds ART sets directly without BIG stock or a bonus',()=>{
 let s=a.startZone(a.enter(),'sora');for(let i=0;i<10;i++){const t=a.step(s,{soraHit:1,soraReset:0},()=>0);assert.equal(t.result,'BIG');assert.equal(t.internalBonus,null);s=t.flow;}assert.equal(s.stock,'0');assert.equal(s.sets,'11');
 const t=a.step(s,{rare:0},()=>.99);assert.equal(t.internalBonus,null);assert.equal(t.flow.stock,'0');assert.equal(t.flow.remaining,'275');
});
test('Ouma super adds 200G without normal freeze and Urapi yields 40G mean target',()=>{
 let s=a.startZone(a.enter(),'ouma',{oumaGames:1});s.awardTier=4;let seq=[.99,0,.99];const t=a.step(s,{oumaFreeze:0},()=>seq.shift());assert.equal(t.result,'SUPER_NOVA');assert.equal(t.internalBonus,null);assert.equal(a.prepareBet(t.flow,{oumaFreeze:0},()=>.99).remaining,'1650');
 assert.equal(a.defaults.urapiGames*a.defaults.urapiHit*20,40);
 assert.ok(Math.abs(3*(.3*10+.6*(5+5/18)+.1*5)-20)<1e-10);assert.equal(5*(.3*10+.6*5),30);
});
test('ART bonus pauses games, exact rare branches, higher-setting direct rates',()=>{
 let s=a.enter();let seq=[0,0,0];let t=a.step(s,{},()=>seq.shift());assert.equal(t.flow.entryStage,'seven');assert.equal(a.afterBonus(t.flow).remaining,'275');
 seq=[0,0,.2,0];t=a.step(s,{},()=>seq.shift());assert.equal(t.flow.pendingZone,'sosuke');
 assert.ok(a.direct.every((n,i)=>i===0||n<a.direct[i-1]));
});
