import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {gunzipSync} from 'node:zlib';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';

test('adopted rare-entry report reconciles all 3,000 trials, fixed rates and actual cash accounting',()=>{
 loadModel();const report=JSON.parse(fs.readFileSync('docs/rare-sortie-50000-20261007.json'));
 const rows=JSON.parse(gunzipSync(fs.readFileSync('docs/rare-sortie-50000-20261007-rows.json.gz')));assert.equal(rows.length,3000);assert.equal(report.proposalOnly,false);
 for(const s of report.settings){
  const trials=rows.filter(r=>r.setting===s.setting);assert.equal(trials.length,500);assert.equal(new Set(trials.map(r=>r.seed)).size,500);
  for(const [role,rate]of Object.entries(s.rates))assert.equal(NovaProgress.sortieChance(s.setting,role),rate);
  for(const r of trials){assert.equal(r.net,r.totalPaid-r.totalBet);assert(r.games<=50000);assert(r.games===50000||r.firstComplete);}
  assert.equal(trials.reduce((n,r)=>n+r.totalPaid,0)/trials.reduce((n,r)=>n+r.totalBet,0),s.after.stopped.rtp);
  assert.equal(trials.filter(r=>r.net>0).length/500,s.after.stopped.winRate);assert.equal(trials.filter(r=>r.peak>=10000).length/500,s.after.reach);
 }
});

test('sortie draws only real rare roles, with the approved fixed rates and no RNG for other roles',()=>{
 loadModel();const p=NovaProgress;
 for(let setting=1;setting<=6;setting++){
  const weak=[.00397,.00276,.00390,.00272,.00383,.00212][setting-1];
  for(const role of ['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA']){
   p.reset();const chance=role==='STRONG_NOVA'?weak*10:weak;assert.equal(p.sortieChance(setting,role),chance);
   assert(!p.drawSortie(setting,role,{},()=>chance));assert.equal(p.snapshot().sorties,0);
   assert(p.drawSortie(setting,role,{},()=>chance-1e-10));assert.equal(p.snapshot().sorties,1);
   p.bind(JSON.parse(JSON.stringify(p.snapshot())));assert.equal(p.snapshot().sorties,1);
  }
  for(const role of ['MISS','BELL','BELL15','REPLAY','BIG','NEBULA','SUPER_NOVA','CHANCE_A','STRONG_SUICA'])assert(!p.drawSortie(setting,role,{},()=>{throw Error('ineligible role drew');}));
 }
 for(const resolved of [{flowBefore:{zero:true}},{oumaFailed:true},{researchSortie:{won:true}},{researchChallenge:{nextAim:true}},{stockEntry:true}])assert(!p.drawSortie(1,'STRONG_NOVA',resolved,()=>{throw Error('synthetic/zero game drew');}));
});

test('manual, AUTO and fast play use the same single resolved-role lottery; resume cannot reroll it',()=>{
 const source=fs.readFileSync('nova-game.js','utf8');let draws=0;
 const c=vm.createContext({A_TYPE_MODE:true,settings:{setting:4},NovaProgress:{drawSortie:(setting,role,resolved)=>{draws++;assert.equal(setting,4);assert.equal(role,'STRONG_NOVA');assert.equal(resolved.reward,1);return true;}}});
 vm.runInContext(source.match(/  function drawRareSortie\([^]*?\n  }/)[0],c);
 const out={reward:1};c.drawRareSortie('STRONG_NOVA',out);assert.equal(out.sortieWon,true);assert.equal(draws,1);
 assert.equal((source.match(/    drawRareSortie\(result,resolved\);/g)||[]).length,2);
 assert(!source.match(/function countTotalSpinIfNeeded[^]*?\n  }/)[0].includes('drawSortie'));
 assert(!source.match(/function restorePendingSpin[^]*?\n  }/)[0].includes('drawRareSortie'));
});

test('simulator rare triggers have a real eligible role and never originate inside sortie or upper aim games',()=>{
 loadModel();const r=simulate(3,1000,'rare-only-audit',{rng:'xoshiro128',exactGames:true,rareAudit:true,roleSortieRates:{WEAK_SUICA:1,WEAK_NOVA:1,STRONG_NOVA:1}});
 assert.equal(r.rare.triggered,Object.values(r.rare.eligibleRoles).reduce((a,b)=>a+b,0));assert(r.rare.triggered>0);
 assert(r.rare.audit.filter(e=>e.type==='trigger').every(e=>['WEAK_SUICA','WEAK_NOVA','STRONG_NOVA'].includes(e.role)));
 assert.equal(r.net,r.totalPaid-r.totalBet);assert.equal(r.games,1000);
});
