import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const a=ctx.NovaArt,b=ctx.NovaBalance,n=ctx.NovaNormal;
test('group lottery retains original strong share and its 3 percent super promotion',()=>{
 for(let setting=1;setting<=6;setting++)for(const boost of [false,true])for(const preparation of [false,true]){
  const original=a.zoneWeights[setting-1].map((w,i)=>w*(boost&&i>=3?2:1)*Math.exp((preparation?0:a.tuning.tilts[setting-1])*i));
  const strong=original.slice(3).reduce((s,v)=>s+v,0)/original.reduce((s,v)=>s+v,0)*100;
  const groups=a.zoneGroupWeights(setting,boost,preparation),row=a.atZoneWeights(setting,boost,preparation);
  assert.ok(Math.abs(groups[0]-(100-strong))<1e-10);assert.ok(Math.abs(groups[2]-strong*.03)<1e-10);
  assert.ok(Math.abs(groups[1]-strong*.97)<1e-10);assert.ok(Math.abs(row.reduce((s,v)=>s+v,0)-100)<1e-10);
  let offset=0;for(let i=0;i<9;i++){assert.equal(row[i],groups[Math.floor(i/3)]/3);assert.equal(a.pickAtZone(setting,boost,()=>(offset+row[i]/2)/100,preparation),a.zoneIds[i]);offset+=row[i];}
 }
});
test('selected super zones survive roulette and queued start without re-rolling',()=>{
 const selected=a.pickAtZone(1,false,()=>.99999);
 assert.equal(selected,'ura_ouma');
 let s={...a.enter(),entryStage:'confirmed',pendingZone:selected};s=a.prepareBet(s,{},()=>0);assert.equal(s.zone,'ouma');assert.equal(s.ura,true);
 for(const id of ['giru','sora','ouma']){
  const chosen=a.upgradeGuaranteedZone(id,()=>.029999);assert.equal(chosen,'ura_'+id);assert.equal(a.upgradeGuaranteedZone(id,()=>.03),id);
  assert.equal(a.startZone(a.enter(),id,{allowUra:true},()=>0).ura,false);
  assert.equal(a.startZone(a.enter(),chosen,{allowUra:true},()=>.99).ura,true);
 }
 assert.equal(a.upgradeGuaranteedZone('urapi',()=>0),'urapi');
 const claim=n.claim({impurity:100},true,()=>0);assert.deepEqual(Array.from(claim.zones),['urapi','ura_giru']);
});
test('Ura Ouma awards 100 or 200 on paid and free spins, normal Ouma stays 50 or100',()=>{
 for(const id of ['ouma','ura_ouma'])for(const zero of [false,true])for(const [roll,base]of [[0,100],[.99,50]]){
  const s={...a.startZone(a.enter(),id),zero};const t=a.step(s,{},()=>roll,'SUPER_NOVA');
  assert.equal(Number(t.flow.award),base*(id==='ura_ouma'?2:1));assert.equal(t.flow.zoneLeft,zero?5:4);assert.equal(t.oumaFreeze,zero);
 }
});
test('Ura Sora base reset stays25 percent and tail control reduces super means',()=>{
 const r=a.zoneRules(a.startZone(a.enter(),'ura_sora'));assert.equal(r.hit,.75);assert.equal(r.reset,.25);
 assert.equal(a.zoneRules(a.startZone(a.enter(),'sora')).reset,.06);
 assert.ok(b.zoneMean('ura_sora')<1800);
 assert.ok(b.zoneMean('ura_giru')<1900);assert.ok(b.zoneMean('ura_ouma')<2400);
});
