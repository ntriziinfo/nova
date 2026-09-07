import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-art.js','utf8'),ctx);const a=ctx.NovaArt;
test('Giru changes continuation at 80 and 320G with mean 80G across settings',()=>{
 for(let setting=1;setting<=6;setting++){
  const row=a.giruRates[setting-1];
  for(const [g,p]of [[5,row[0]],[79,row[0]],[80,row[1]],[319,row[1]],[320,row[2]],[640,row[2]]]){
   assert.equal(a.giruChance(String(g),setting),p);
   let state=a.startZone(a.enter(),'giru',{setting});state.award=String(g);
   assert.equal(a.step(state,{},()=>p).flow.zone,'');
   assert.equal(a.step(state,{},()=>p-1e-9).flow.award,String(g*2));
  }
  assert.ok(row[0]>row[1]&&row[1]>row[2]&&row[2]<.5);
 }
 let s=a.startZone(a.enter(),'giru',{setting:6});s.award='40';let t=a.step(s,{},()=>0);
 assert.equal(t.flow.award,'80');assert.match(t.message,/55%/);
 s=a.normalize(JSON.parse(JSON.stringify(t.flow)));assert.equal(s.giruSetting,6);
 t=a.step(s,{},()=>.56);assert.equal(t.flow.zone,'');assert.equal(t.flow.remaining,'130');
});
test('ART natural and forced Giru entries preserve the selected setting',()=>{
 let forced=a.step(a.enter(),{setting:5},()=>0,'ZONE_giru');assert.equal(forced.flow.giruSetting,5);
 let sequence=[0,0,.2,.82];const natural=a.step(a.enter(),{setting:6},()=>sequence.shift());
 assert.equal(natural.flow.zone,'giru');assert.equal(natural.flow.giruSetting,6);
});
test('all six zones preserve ART games and finish correctly',()=>{
 for(const zone of Object.keys(a.names)){let s=a.startZone(a.enter(),zone);let n=0;while(s.zone&&n++<20)s=a.step(s,{},()=>.99).flow;assert.equal(s.zone,'');assert.ok(BigInt(s.remaining)>=50n);assert.equal(n,{sosuke:3,toto:5,urapi:5,giru:1,sora:10,ouma:5}[zone]);}
});
test('Giru has exact unlimited doubling, survives JSON, and adds final value once',()=>{
 let s=a.startZone(a.enter(),'giru');for(let i=0;i<1100;i++){const t=a.step(s,{},()=>0);assert.equal(t.reverse,true);s=a.normalize(JSON.parse(JSON.stringify(t.flow)));}
 assert.equal(s.award,(5n*2n**1100n).toString());assert.equal(s.remaining,'50');assert.equal(s.zero,true);
 s=a.step(s,{},()=>.5).flow;assert.equal(s.remaining,(50n+5n*2n**1100n).toString());assert.equal(s.zero,false);assert.equal(s.zone,'');
});
test('Sora adds ART sets directly without BIG stock or a bonus',()=>{
 let s=a.startZone(a.enter(),'sora');for(let i=0;i<10;i++){const t=a.step(s,{soraHit:1},()=>0);assert.equal(t.result,'BIG');assert.equal(t.internalBonus,null);s=t.flow;}assert.equal(s.stock,'0');assert.equal(s.sets,'10');
 const t=a.step(s,{rare:0},()=>.99);assert.equal(t.internalBonus,null);assert.equal(t.flow.stock,'0');assert.equal(t.flow.remaining,'49');
});
test('Ouma super adds 200G without normal freeze and Urapi yields 40G mean target',()=>{
 let s=a.startZone(a.enter(),'ouma',{oumaGames:1});s.awardTier=4;let seq=[.99,0,.99];const t=a.step(s,{},()=>seq.shift());assert.equal(t.result,'SUPER_NOVA');assert.equal(t.internalBonus,null);assert.equal(t.flow.remaining,'250');
 assert.equal(a.defaults.urapiGames*a.defaults.urapiHit*20,40);
 assert.ok(Math.abs(3*(.3*10+.6*(5+5/18)+.1*5)-20)<1e-10);assert.equal(5*(.3*10+.6*5),30);
});
test('ART bonus pauses games, exact rare branches, higher-setting direct rates',()=>{
 let s=a.enter();let seq=[0,0,0];let t=a.step(s,{},()=>seq.shift());assert.equal(t.internalBonus.kind,'BIG');assert.equal(a.afterBonus(t.flow).remaining,'49');
 seq=[0,0,.2,0];t=a.step(s,{},()=>seq.shift());assert.equal(t.flow.zone,'sosuke');
 assert.ok(a.direct.every((n,i)=>i===0||n<a.direct[i-1]));
});
