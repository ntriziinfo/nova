import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const a=ctx.NovaArt,b=ctx.NovaBalance;
const save=s=>a.normalize(JSON.parse(JSON.stringify(s)));
test('nine zones and retired aliases preserve queued awards without new promotion',()=>{
 assert.equal(a.zoneIds.length,9);
 for(const base of ['sosuke','toto','urapi']){
  assert.equal(a.startZone(a.enter(),'ura_'+base,{},()=>0).ura,false);
  assert.equal(a.startZone(a.enter(),base,{allowUra:true},()=>0).ura,false);
  assert.equal(a.normalize({pendingZone:'ura_'+base,queuedZones:['ura_'+base]}).pendingZone,base);
 }
 for(const base of ['giru','sora','ouma']){
  assert.equal(a.upgradeGuaranteedZone(base,()=>.029999),'ura_'+base);
  assert.equal(a.upgradeGuaranteedZone(base,()=>.03),base);
  assert.equal(a.startZone(a.enter(),base,{allowUra:true},()=>0).ura,false);
 }
});
test('shared tables and one-shot settle once on the first challenge',()=>{
 for(const id of ['sosuke','giru','ura_giru']){
  const rows=a.ladderTables[id];assert.equal(rows.length,7);
  let cum=0;const weights=a.ladderWeightsFor({zone:a.baseZone(id),ura:id.startsWith('ura_')},1);for(let i=0;i<7;i++){assert.deepEqual(Array.from(a.startZone(a.enter(),id,{},()=>(cum+weights[i]/2)/100).ladder),Array.from(rows[i]));cum+=weights[i];}
  let s=a.startZone(a.enter(),id,{},()=>.999);assert.equal(s.zoneLeft,2);
  s=save(a.step(s,{},()=>0).flow);assert.equal(s.award,'50');assert.equal(s.zoneLeft,1);
  const win=a.step(s,{},()=>0,'REPLAY').flow;assert.equal(win.zone,'');assert.equal(win.remaining,'2150');
  const lose=a.step(s,{},()=>0,'MISS').flow;assert.equal(lose.zone,'');assert.equal(lose.remaining,'200');
 }
});

test('first game reveals secured rung, four successes grant highest only in five paid games',()=>{
 for(const id of ['sosuke','giru','ura_giru']){
  let s=a.startZone(a.enter(),id,{},()=>0);const steps=Array.from(s.ladder);
  s=a.step(s,{},()=>.99).flow;assert.equal(s.award,String(steps[0]));assert.equal(s.zoneLeft,4);assert.ok(s.zone);
  for(let i=1;i<=4;i++){s=save(a.step(s,{},()=>.99,'REPLAY').flow);assert.equal(s.award,String(steps[i]));assert.equal(s.zero,false);}
  assert.equal(s.zone,'');assert.equal(s.remaining,String(150+steps[4]));assert.equal(a.settleZone(s).remaining,s.remaining);
 }
});
test('50 to 100 then MISS settles exactly 100 and sixth table can reach 3000',()=>{
 let s=a.startZone(a.enter(),'giru',{},()=>0);s=a.step(s,{},()=>0).flow;s=a.step(s,{},()=>0,'REPLAY').flow;
 s=a.step(s,{},()=>0,'MISS').flow;assert.equal(s.zone,'');assert.equal(s.remaining,'250');
 s=a.startZone(a.enter(),'ura_giru',{},()=>.9);for(let i=0;i<5;i++)s=a.step(s,{},()=>0,'BELL').flow;
 assert.equal(s.award,'3000');assert.equal(s.remaining,'3150');
});
test('ladder strength changes success probability, with exact boundary failure',()=>{
 let prev=0;
 for(const id of ['sosuke','giru','ura_giru']){
  let s=a.startZone(a.enter(),id,{},()=>.999);s=a.step(s,{},()=>0).flow;
  const p=a.zoneRules(s).success;assert.ok(p>prev);prev=p;
  assert.equal(a.step(s,{},()=>p).flow.zone,'');assert.equal(a.step(s,{},()=>p-1e-10).flow.award,'2000');
 }
});
test('seven family can award each amount, grants no sets and resets final game to five',()=>{
 for(const id of ['toto','sora','ura_sora']){
  const s=a.startZone(a.enter(),id,{},()=>.5),weights=a.zoneRules(s).weights;let cumulative=0;
  for(let i=0;i<6;i++){
   const roll=cumulative+weights[i]/2;cumulative+=weights[i];
   const t=a.step({...s,zoneLeft:1},{},()=>roll,'BIG');
   assert.equal(t.flow.award,String(a.sevenValues[i]));assert.equal(t.flow.remaining,String(150+a.sevenValues[i]));assert.equal(t.flow.sets,'0');assert.equal(t.flow.queuedZones.length,0);assert.equal(t.internalBonus,null);
  }
  const t=a.step({...s,zoneLeft:1},{},()=>.99,'NEBULA');assert.equal(t.flow.zoneLeft,5);assert.equal(t.flow.award,'10');assert.equal(t.flow.zero,false);
  const miss=a.step({...s,zoneLeft:1},{},()=>.99,'MISS');assert.equal(miss.flow.remaining,'150');assert.equal(miss.flow.zone,'');
 }
});
test('NOVA family uses SUPER only and literal 50 or100 points; urapi never freezes',()=>{
 for(const id of ['urapi','ouma','ura_ouma'])for(const [roll,award]of [[0,100],[.99,50]]){
  const s=a.startZone(a.enter(),id,{},()=>.5),t=a.step(s,{},()=>roll,'SUPER_NOVA');
  assert.equal(t.flow.award,String(award*(id==='ura_ouma'?2:1)));assert.equal(t.internalBonus,null);assert.equal(t.result,'SUPER_NOVA');assert.equal(t.flow.oumaPending,id!=='urapi');
 }
});
test('last-game Ouma hit continues free SUPER chains then settles only once',()=>{
 let s={...a.startZone(a.enter(),'ouma'),zoneLeft:1};s=a.step(s,{},()=>.99,'SUPER_NOVA').flow;
 assert.equal(s.zoneLeft,0);assert.equal(s.oumaPending,true);assert.equal(s.award,'50');
 s=a.prepareBet(save(s),{},()=>0);assert.equal(s.zero,true);
 const t=a.step(s,{},()=>0);s=t.flow;assert.equal(t.oumaFreeze,true);assert.equal(t.result,'SUPER_NOVA');assert.equal(s.zoneLeft,0);assert.equal(s.award,'150');assert.equal(s.remaining,'150');
 s=a.prepareBet(s,{},()=>.99);assert.equal(s.remaining,'300');assert.equal(s.zone,'');assert.equal(a.prepareBet(s,{},()=>0).remaining,'300');
});
test('legacy active zone closes once and keeps earned points, remaining quota and sets',()=>{
 const s=a.normalize({payoutVersion:1,zone:'giru',remaining:'200',award:'847',sets:'3',zero:true});
 assert.equal(s.remaining,'1047');assert.equal(s.zone,'');assert.equal(s.sets,'3');assert.equal(s.zero,false);assert.equal(save(s).remaining,'1047');
 const sora=a.normalize({payoutVersion:1,zone:'sora',remaining:'200',award:'0',sets:'3'});assert.equal(sora.sets,'3');assert.equal(sora.remaining,'200');
});
test('analytic expectations agree with independent simulation and strength ordering',()=>{
 let seed=987654;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const id of a.zoneIds){let total=0;
  for(let i=0;i<15000;i++){let s=a.startZone(a.enter(),id,{},rng),g=0;while(s.zone&&g++<10000){s=a.prepareBet(s,{},rng);if(s.zone)s=a.step(s,{},rng).flow;}assert.equal(s.zone,'');total+=Number(s.remaining)-150;}
  assert.ok(Math.abs(total/15000-b.zoneMean(id))<b.zoneMean(id)*.055,`${id}: ${total/15000} / ${b.zoneMean(id)}`);
 }
 for(const group of [['sosuke','giru','ura_giru'],['toto','sora','ura_sora'],['urapi','ouma','ura_ouma']])assert.ok(b.zoneMean(group[0])<b.zoneMean(group[1])&&b.zoneMean(group[1])<b.zoneMean(group[2]));
});
test('live zero-chain wiring automatically stops reels and continues with state guards',()=>{
 const h=fs.readFileSync('jag.html','utf8');assert.match(h,/autoPlay \|\| speedModeSpinAtStart \|\| resolved.oumaFreeze/);
 assert.match(h,/!\(scheduleOumaZeroChain\(\)\)/);assert.match(h,/normalState.flow!==previous/);assert.match(h,/normalState.flow.zero\)\{clearOumaPresentation\(\);spin\(\)/);
});
