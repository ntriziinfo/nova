import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-tuning.js','nova-art.js','nova-balance.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));const a=NovaArt;
const sequence=values=>()=>{assert.ok(values.length);return values.shift();};
test('retired 2000pt threshold never attenuates awards including huge saved balances',()=>{
 for(const [award,next]of [['1999',0],['1950',50],['2000',0],['999999999999999999999999',0]])assert.equal(a.zoneAwardFactor(award,next),1);
});

test('ladder actual role advances beyond 2000 without another draw',()=>{const s={...a.startZone(({...a.enter({},()=>.5),remaining:'150',entryQuota:'150'}),'ura_giru',{},()=>.9),ladderRevealed:true,ladderIndex:3,award:'2000',zoneLeft:1};const t=a.step(s,{},sequence([.1,0]));assert.equal(t.result,'REPLAY');assert.equal(t.flow.remaining,'3150');assert.equal(t.flow.zone,'');});

test('seven wins and five-game reset rates are unchanged across 2000pt',()=>{
 for(const id of ['toto','sora','ura_sora']){
  const base={...a.startZone({...a.enter({},()=>.5),remaining:'150'},id),sevenHits:10,zoneLeft:1};
  for(const award of ['1900','2000','5000']){
   const s={...base,award},t=a.step(s,{},()=>.1,'BIG');assert.equal(t.zoneAward,100);assert.equal(t.flow.remaining,String(150+Number(award)+100));
   assert.equal(a.zoneRules(s).reset,a.zoneRules(base).reset);
   const reset=a.step(s,{},()=>.1,'NEBULA');assert.equal(reset.flow.zoneLeft,5);assert.equal(reset.zoneAward,10);
  }
 }
});

test('paid and free NOVA awards and freeze rate remain unchanged beyond 2000pt',()=>{
 for(const id of ['urapi','ouma','ura_ouma']){
  const base=a.startZone({...a.enter({},()=>.5),remaining:'150'},id);
  for(const award of ['1900','2000','5000'])for(const zero of [false,true]){
   const s={...base,award,zero,zoneLeft:2},t=a.step(s,{},()=>0,'SUPER_NOVA');
   assert.equal(t.result,'SUPER_NOVA');assert.equal(t.zoneAward,id==='ura_ouma'?200:100);
   assert.equal(a.oumaFreezeRate(s,a.defaults),a.oumaFreezeRate(base,a.defaults));
  }
 }
});

test('reload retains the whole award and a new zone starts with an empty award',()=>{
 const s=JSON.parse(JSON.stringify({...a.startZone({...a.enter({},()=>.5),remaining:'150'},'sora'),award:'2300'}));
 assert.equal(a.normalize(s).award,'2300');assert.equal(a.zoneAwardFactor(a.normalize(s).award),1);
 const end=a.settleZone(s);assert.equal(end.remaining,'2450');assert.equal(a.startZone(end,'sora').award,'0');
});

test('all current zone means are finite and tail attenuation stays disabled',()=>{
 assert.equal(a.zoneTailControl.factor,1);
 for(const id of a.zoneIds)assert(Number.isFinite(NovaBalance.zoneMean(id))&&NovaBalance.zoneMean(id)>0,id);
 // Detailed independent simulation comparison is in nova-zone-redesign.test.mjs.
});
