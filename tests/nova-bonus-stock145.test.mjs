import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt;
const reload=s=>a.normalize(JSON.parse(JSON.stringify(s)));

test('first normal BIG win awards initial AT; extra wins and all in-AT wins reserve zones',()=>{
 const normal={phase:'normal'},active={...a.enter({},()=>.5),remaining:'417'};
 const first=a.afterBonus(normal,{},1,()=>.5);
 assert.equal(first.initialWait,3);assert.equal(first.entryQuota,'750');assert.equal(first.sets,'0');
 assert.equal(a.afterBonus(normal,{},0).phase,'normal');
 assert.equal(a.afterBonus(normal,{},3,()=>.5).sets,'2');
 const resumed=a.afterBonus(active,{},3,()=>{throw Error('no draw before stock BET');});
 assert.equal(resumed.remaining,'417');assert.equal(resumed.sets,'3');assert.equal(resumed.initialStage,'');
 assert.equal(a.bonusStockLabel({bonusArtSets:1},normal),'AT確定 / 特化ストック0個');
 assert.equal(a.bonusStockLabel({bonusArtSets:3,bonusZones:['giru']},normal),'AT確定 / 特化ストック3個');
 assert.equal(a.bonusStockLabel({bonusArtSets:3},active),'特化ストック3個');
 assert.equal(a.advanceBonus({paid:50,bonusArtSets:3},true).bonusArtSets,3);
});

test('stock BET selects each ordinary AT zone once and preserves its choice through reload',()=>{
 let edge=0;
 for(const [i,weight] of a.atZoneWeights(1).entries()){
  const roll=(edge+weight/2)/100;edge+=weight;let draws=0;
  let s=a.prepareBet({...a.enter({},()=>.5),remaining:'417',sets:'2'},{setting:1},()=>{draws++;return roll;});
  assert.equal(s.sets,'1');assert.equal(s.remaining,'417');assert.equal(s.entryStage,'seven');assert.equal(s.pendingZone,a.zoneIds[i]);
  s=a.prepareBet(reload(s),{setting:1},()=>{throw Error('stock redrawn');});assert.equal(draws,1);
  let t=a.step(s,{setting:1},()=>.99);assert.equal(t.result,'BIG');assert.equal(t.flow.entryStage,'roulette');
  t=a.step(reload(t.flow),{setting:1},()=>.99,'MISS');assert.equal(t.flow.entryStage,'confirmed');
  s=a.prepareBet(reload(t.flow),{setting:1},()=>.5);
  assert.equal((s.ura?'ura_':'')+s.zone,a.zoneIds[i]);assert.equal(s.initialStage,'');assert.equal(s.remaining,'417');assert.equal(s.sets,'1');
 }
});

test('multiple stocks finish one by one, adding only actual zone awards before normal AT resumes',()=>{
 for(let setting=1;setting<=6;setting++){
  const rng=xoshiro128(1450+setting);let s=a.afterBonus(a.enter({},rng),{setting},4,rng),completed=0,awarded=0,steps=0;
  const base=Number(s.remaining);
  while(s.sets!=='0'||s.entryStage||s.zone){
   assert.ok(++steps<2000,'stock sequence must complete');
   const before=reload(s);s=a.prepareBet(before,{setting},rng);
   if(before.zone&&!s.zone){completed++;awarded+=Number(s.award);}
   assert.equal(Number(s.remaining),base+awarded);
   if(s.sets==='0'&&!s.entryStage&&!s.zone)break;
   const prepared=s,t=a.step(s,{setting},rng);s=reload(t.flow);
   if(prepared.zone&&!s.zone){completed++;awarded+=Number(s.award);}
   assert.equal(s.initialStage,'');assert.equal(s.comebackLeft,0);assert.equal(Number(s.remaining),base+awarded);
  }
  assert.equal(completed,4);assert.ok(awarded>=200);assert.equal(s.phase,'art');
  const next=a.step(s,{setting},rng,'BELL');assert.equal(Number(next.flow.remaining),base+awarded-15);
 }
});

test('already active zones, selected entries and queued awards keep precedence over bonus stocks',()=>{
 const base={...a.enter({},()=>.5),sets:'2'};
 for(const s of [a.startZone(base,'toto',{},()=>.5),{...base,entryStage:'seven',pendingZone:'giru'},
  {...base,queuedZones:['sora']},{...base,burstPending:true},a.afterBonus(a.enterInitial({},()=>.5),{},2)]){
  const next=a.prepareBet(reload(s),{},()=>{throw Error('stock must wait');});
  assert.equal(next.sets,'2');assert.equal(next.remaining,s.remaining);
 }
});

test('AUTO uses the live entry path to consume multiple bonus stocks without stopping',()=>{
 const html=fs.readFileSync('jag.html','utf8'),rng=xoshiro128(145);
 let spins=0;
 const ctx=vm.createContext({autoPlay:true,A_TYPE_MODE:true,isSpinning:false,bonusEndBgmPlaying:false,
  bonusConfirmSoundPlaying:false,oumaPresentation:null,session:{active:false},normalState:{flow:a.afterBonus(a.enter({},rng),{},3)},
  canPlayCompleteTrial:()=>true,isRogiThirdStopHoldActive:()=>false,queueAutoStep(){},autoDelayMs:()=>0,
  spin:()=>{spins++;ctx.normalState.flow=a.step(a.prepareBet(ctx.normalState.flow,{},rng),{},rng).flow;}});
 vm.runInContext(html.match(/  function runAutoStep\([^]*?\n  }/)[0],ctx);
 do{ctx.runAutoStep();assert.equal(ctx.autoPlay,true);assert.ok(spins<2000);}while(ctx.normalState.flow.sets!=='0'||ctx.normalState.flow.entryStage||ctx.normalState.flow.zone);
 assert.ok(spins>3);assert.equal(ctx.normalState.flow.phase,'art');
});

test('audit distinguishes the first AT win, extra zone stocks and their consumption',()=>{
 const ctx=vm.createContext({Date});vm.runInContext(fs.readFileSync('nova-audit.js','utf8'),ctx);
 const {describe}=ctx.NovaAudit;
 const snapshot=(sets,flow={phase:'normal'})=>({flow,bonus:{active:true,sets},internal:{}});
 assert.ok(describe(snapshot(0),snapshot(1),{artSetWon:1}).includes('ネビュラ揃い / AT確定'));
 assert.ok(describe(snapshot(1),snapshot(2),{artSetWon:1}).includes('ネビュラ揃い / 上乗せ特化ゾーン獲得'));
 assert.ok(describe(snapshot(0,{phase:'art'}),snapshot(1,{phase:'art'}),{artSetWon:1}).includes('ネビュラ揃い / 上乗せ特化ゾーン獲得'));
 const notes=describe(snapshot(1,{phase:'art',sets:'2'}),snapshot(1,{phase:'art',sets:'1',entryStage:'seven'}));
 assert.ok(notes.includes('特化ストック消化 / 赤7待機 / 残り1個'));
});
