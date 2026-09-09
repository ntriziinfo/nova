import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));const a=NovaArt;
test('all setting table weights match proposed means and weighted selection',()=>{
 const expected={sosuke:[167.196,182.4544],giru:[388.9375,397.4375],ura_giru:[933.5864197530863,957.6851851851852]};
 for(const [id,ends] of Object.entries(expected).filter(([id])=>id!=='ura_giru'))for(let setting=1;setting<=6;setting++){
  const f={zone:a.baseZone(id),ura:id.startsWith('ura_')},w=a.ladderWeightsFor(f,setting);assert.ok(Math.abs(w.reduce((x,y)=>x+y)-100)<1e-10);let cum=0;
  for(let i=0;i<5;i++){const s=a.startZone(a.enter(),id,{setting},()=>(cum+w[i]/2)/100);assert.deepEqual(s.ladder,a.ladderTables[id][i]);assert.equal(a.normalize(JSON.parse(JSON.stringify(s))).giruSetting,setting);cum+=w[i];}
  assert.equal(w[5],0);assert.equal(w[6],0);assert.ok(Number.isFinite(NovaBalance.zoneMean(id,{setting})));
 }
});
test('guarantee follows current secured amount and never applies to table seven',()=>{
 for(const [id,threshold]of [['sosuke',0],['giru',100],['ura_giru',301]])for(const table of a.ladderTables[id]){
  for(let i=0;i<table.length-1;i++){
   const s={...a.startZone(a.enter(),id),ladder:table,ladderIndex:i,ladderRevealed:true,award:String(table[i]),zoneLeft:table.length-i-1};
   const saved=a.normalize(JSON.parse(JSON.stringify(s)));const guaranteed=table.length!==2&&table[i]<threshold;
   const t=a.step(saved,{},()=>.9999);assert.equal(t.result==='MISS',!guaranteed);
   if(guaranteed)assert.equal(t.flow.award,String(table[i+1]));else assert.equal(t.flow.zone,'');
  }
 }
});
test('confirmed zone uses saved setting, not config defaults',()=>{
 const state={...a.enter(),entryStage:'confirmed',pendingZone:'giru',giruSetting:6};
 const got=a.prepareBet(state,{},()=>.20);assert.deepEqual(got.ladder,a.ladderTables.giru[1]);assert.equal(got.giruSetting,6);
});
