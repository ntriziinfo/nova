import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';
const reload=s=>NovaArt.normalize(JSON.parse(JSON.stringify(s)));
const noDraw=()=>{throw Error('handoff ran twice');};

test('normal rare win plays ten sortie games, saves its result and all stocks, then runs initial points before them',()=>{
 for(let setting=1;setting<=6;setting++)for(const upper of [false,true]){
  loadModel();const a=NovaArt,p=NovaProgress,c={setting};
  assert(p.drawSortie(setting,'STRONG_NOVA',{flowBefore:{phase:'normal'}},()=>0));
  let calls=0;const rolls=[.99,.99,upper?0:.99,0];
  let f=p.beforeBet({phase:'normal'},c,-100,false,()=>rolls[calls++]);
  assert.equal(calls,4);assert.equal(f.researchUpper,upper);
  assert.equal(f.researchSortieLeft,10);assert.equal(f.initialStage,'');assert.equal(f.remaining,'0');assert.equal(p.snapshot().sorties,0);
  let out;
  for(let i=0;i<10;i++){
   f=reload(f);assert.equal(f.sortieInitialPending,true);
   f=p.beforeBet(f,c,-100,false,noDraw);out=a.step(f,c,()=>.999);f=out.flow;
   assert(out.researchSortie);assert.equal(out.researchSortie.finished,i===9);assert.equal(f.initialStage,'');
   assert.equal(f.remaining,'0');assert.equal(f.researchSortieLeft,9-i);
  }
  assert.equal(f.researchSortieHits,2);const stocks=[...f.queuedZones];assert.equal(stocks.length,2);
  const ctx=vm.createContext({localStorage:{getItem:()=>null},globalThis:{}});
  vm.runInContext(fs.readFileSync('nova-results.js','utf8'),ctx);
  const card=ctx.globalThis.NovaResults.sortie(out.researchSortie,f);
  assert.equal(card.kind,'sortie');assert.equal(card.count,2);
  assert.equal(card.next,'initial');
  f=p.beforeBet(reload(f),c,-100,false,noDraw);
  assert.equal(f.initialStage,'wait');assert.equal(f.sortieInitialPending,false);
  assert.equal(f.researchUpper,upper);assert.equal(f.burstPending,false);assert.equal(f.researchChallengeSource,'');
  assert.deepEqual(f.queuedZones,stocks);f=p.beforeBet(reload(f),c,-100,false,noDraw);
  f=a.step(f,c,()=>.99,'START_REPLAY_RIGHT').flow;
  assert.equal(f.initialStage,'entry');assert.equal(f.pendingZone,'kushuri_nito');
  f=a.step(f,c,()=>.99).flow;f=a.step(f,c,()=>.99).flow;
  f=a.prepareBet(f,c,()=>.99);assert.equal(f.zone,'kushuri_nito');assert.equal(f.initialStage,'zone');
  for(let i=0;i<3;i++)f=a.step(reload(f),c,()=>.99,'BELL').flow;
  assert.equal(f.remaining,'300');assert.equal(f.initialStage,'');assert.deepEqual(f.queuedZones,stocks);assert.equal(f.researchUpper,upper);
  for(let zone=0;zone<stocks.length;zone++){
   const step=a.step(reload(f),c,()=>.99);assert(step.zoneStartFlow);f=step.flow;
   for(let guard=0;f.zone&&guard<50;guard++)f=a.step(reload(f),c,()=>.99).flow;
   assert.equal(f.zone,'');
  }
  assert.equal(f.queuedZones.length,0);assert(Number(f.remaining)>300);assert.equal(f.researchUpper,upper);
  const at=a.step(f,c,()=>.99);assert(at.atOutcome);assert.equal(at.researchChallenge,undefined);
 }
});

test('AT sortie retains remaining points and upper status, with no new initial award',()=>{
 loadModel();const a=NovaArt,p=NovaProgress,c={setting:6};p.queueSortie();
 let f=p.beforeBet({...a.enter(c,()=>.99),remaining:'777',researchUpper:true},c,-100,false,()=>0);
 assert.equal(f.sortieInitialPending,false);
 for(let i=0;i<10;i++)f=a.step(reload(f),c,()=>.999).flow;
 const restored=p.beforeBet(reload(f),c,-100,false,noDraw);
 assert.equal(restored.remaining,'777');assert.equal(restored.initialStage,'');assert.equal(restored.researchUpper,true);assert.equal(restored.queuedZones.length,2);
});

test('simulator starts a normal forced sortie immediately rather than after initial preparation',()=>{
 loadModel();const r=simulate(3,40,'normal-sortie-flow',{rng:'xoshiro128',exactGames:true,rareForcedGames:[1],rareAudit:true});
 assert.equal(r.games,40);assert.equal(r.net,r.totalPaid-r.totalBet);
 const start=r.rare.audit.find(e=>e.type==='start'),entry=r.rare.audit.find(e=>e.type==='newAt');
 assert(start);assert(entry);assert.equal(start.game,entry.game);assert.equal(r.rare.spins,10);assert.equal(r.rare.completed,1);
});
