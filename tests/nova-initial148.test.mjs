import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt,b=NovaBalance;
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));

test('the shared Kushuri/Nito zone is initial-only; ordinary zones never include it',()=>{
 for(let setting=1;setting<=6;setting++)for(const quota of a.entryQuotaRules.values){
  assert.equal(a.pickInitialZone(setting,quota,()=>.499999),'kushuri_nito');
  assert.equal(a.pickInitialZone(setting,quota,()=>.5),'kushuri_nito');
  assert.deepEqual([...a.rouletteZones({initialStage:'entry',initialVersion:148})],['kushuri_nito']);
  for(let i=0;i<100;i++)assert(!a.initialZoneIds.includes(a.pickZone(setting,()=>(i+.5)/100)));
 }
 for(const id of a.initialZoneIds){
  assert(!a.rouletteZones({}).includes(id));assert(!a.zoneIds.includes(id));
  assert.equal(a.startZone(a.enter({},()=>.5),id,{},()=>.5).zone,'');
 }
});

test('three initial increments have independent 2/3 and 1/3 marginals and no extra base grant',()=>{
 const rng=xoshiro128('initial148'),trials=30000,hundreds=[0,0,0],totals={150:0,200:0,250:0,300:0};let sum=0;
 for(let i=0;i<trials;i++){
  let s={...a.enterInitial({},rng),initialStage:'entry',entryStage:'confirmed',pendingZone:i%2?'nito':'kushuri'};
  s=a.prepareBet(reload(s),{},rng);assert.equal(s.zoneLeft,3);const target=Number(s.entryQuota);
  for(let g=0;g<3;g++){
   const t=a.step(reload(s),{},rng);assert([50,100].includes(t.zoneAward));hundreds[g]+=t.zoneAward===100;
   assert.equal(t.aim,null);assert(['BELL','REPLAY'].includes(t.result));s=t.flow;
  }
  assert.equal(s.remaining,String(target));assert.equal(s.initialStage,'');assert.equal(s.zone,'');
  totals[target]++;sum+=target;
 }
 assert(Math.abs(sum/trials-200)<1);
 for(const n of hundreds)assert(Math.abs(n/trials-1/3)<.01);
 for(const [pt,weight] of [[150,8],[200,12],[250,6],[300,1]])assert(Math.abs(totals[pt]/trials-weight/27)<.01);
});

test('seven gains are always 100; floors survive five misses and short legacy saves',()=>{
 for(const [id,minimum] of [['toto',100],['sora',200],['ura_sora',500]]){
  for(const short of [false,true]){
   const base=a.enter({},()=>.5);let s=a.startZone(base,id,{},()=>.5),g=0,total=0;
   if(short)s.zoneLeft=1;
   while(s.zone&&g++<10){const t=a.step(reload(s),{},()=>.999,'MISS');if(t.result==='BIG')assert.equal(t.zoneAward,100);total+=t.zoneAward;s=t.flow;}
   assert.equal(s.zone,'');assert.equal(total,minimum);assert.equal(Number(s.remaining)-Number(base.remaining),minimum);
  }
  const s=a.startZone(a.enter({},()=>.5),id,{},()=>.5);
  const reset=a.step({...s,zoneLeft:1},{},()=>.5,'NEBULA');assert.equal(reset.flow.zoneLeft,5);assert.equal(reset.zoneAward,10);
 }
});

test('reset probabilities differ while seven probabilities match; color confidence is preserved',()=>{
 const rng=xoshiro128('seven148');let prior=0;
 for(const [id,reset] of [['toto',.02],['sora',.15],['ura_sora',.3]]){
  const s=a.startZone(a.enter({},()=>.5),id,{},()=>.5),r=a.sevenAimRules(s),colors=a.aimColorsFor(s);
  assert.equal(r.hit,.35);assert.equal(r.reset,reset);assert(reset>prior);prior=reset;
  assert.deepEqual(colors.map(c=>c.hit),[.2,.8,1]);assert(Math.abs(colors.reduce((n,c)=>n+c.weight,0)-1)<1e-12);
  assert(Math.abs(colors.reduce((n,c)=>n+c.weight*c.hit,0)-(.35+reset))<1e-12);
  const count={BIG:0,NEBULA:0,MISS:0};
  for(let i=0;i<100000;i++)count[a.drawSevenAim(s,a.defaults,rng).result]++;
  assert(Math.abs(count.BIG/100000-.35)<.006);assert(Math.abs(count.NEBULA/100000-reset)<.006);
 }
});

test('current analytic zone averages agree with independently consumed zones',()=>{
 const rng=xoshiro128('seven148-mean');let previous=0;
 for(const id of ['toto','sora','ura_sora']){
  let total=0;const trials=10000;
  for(let i=0;i<trials;i++){
   let s=a.startZone(a.enter({},()=>.5),id,{},rng),g=0;
   while(s.zone&&g++<10000)s=a.step(s,{},rng).flow;
   assert.equal(s.zone,'');total+=Number(s.award);
  }
  const mean=b.zoneMean(id);assert(Math.abs(total/trials-mean)<mean*.04,`${id}: ${total/trials} / ${mean}`);assert(mean>previous);previous=mean;
 }
});

test('initial result cards keep their own character and do not emit setting hints',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-results.js','utf8'),c);
 for(const zone of ['kushuri','nito','kushuri_nito'])for(let setting=1;setting<=6;setting++){
  const card=c.NovaResults.transition({zone,initialStage:'zone'},{zone:'',award:'200'},setting,()=>{throw Error('initial result must not draw a setting hint');});
  assert.equal(card.character,zone);assert.equal(card.color,'initial');assert.equal(card.pt,'200');
 }
});
