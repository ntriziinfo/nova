import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
function load(setting=3){
 const logs=[],c=vm.createContext({crypto:globalThis.crypto,A_TYPE_MODE:true,settings:{setting},stats:{slumpHigh:0},normalState:{flow:{phase:'normal'},bonusPending:false},forceResult:'SORTIE',bonusActive:false,RESULT:{},log:m=>logs.push(m)});
 for(const f of ['nova-tuning.js','nova-decrement.js','nova-art.js','nova-balance.js','nova-normal.js','nova-flow.js','nova-progress.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
 vm.runInContext('function isATypeBonusActive(){return bonusActive;}',c);
 for(const name of ['syncNovaProgress','normalizeForceResult','forceResultName','takeForcedResult'])vm.runInContext(source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
 return {c,logs};
}

test('sortie flag queues once without spending RNG, changing existing carry, or becoming a reel role',()=>{
 for(let setting=1;setting<=6;setting++){
  const {c,logs}=load(setting),a=c.NovaArt,p=c.NovaProgress;
  c.normalState.flow={...a.enter({setting},()=>.9),remaining:'765',stock:'2',sets:'3',queuedZones:['sora'],researchUpper:true};
  const before=plain(c.normalState.flow);
  vm.runInContext('Math.random=()=>{throw Error("debug queue must not consume RNG")}',c);
  assert.equal(c.normalizeForceResult('SORTIE'),'SORTIE');assert.match(c.forceResultName('SORTIE'),/出陣/);
  assert.equal(c.takeForcedResult(),'');assert.equal(c.forceResult,'');assert.equal(p.snapshot().sorties,1);
  assert.deepEqual(plain(c.normalState.flow),before);assert.equal(c.takeForcedResult(),'');assert.equal(p.snapshot().sorties,1);assert.equal(logs.length,1);
 }
});

test('saved queue survives BIG, CZ and active zones and enters the existing ten-game draw once ready',()=>{
 for(const phase of ['bonus','cz','zone']){
  const {c}=load(),a=c.NovaArt,p=c.NovaProgress;
  c.bonusActive=phase==='bonus';c.takeForcedResult();
  c.normalState.novaProgress=plain(c.normalState.novaProgress);c.syncNovaProgress();
  const flow=phase==='cz'?{phase:'cz',remaining:10}:phase==='zone'?a.startZone(a.enter({},()=>.9),'sora',{},()=>.9):{phase:'normal'};
  assert.deepEqual(plain(p.beforeBet(flow,{setting:3},0,phase==='bonus',()=>.9)),plain(flow));
  assert.equal(p.snapshot().sorties,1);
  const ready={...a.enter({setting:3},()=>.9),remaining:'765'};
  let out=p.beforeBet(ready,{setting:3},0,false,()=>.01);
  assert.equal(out.researchSortieLeft,10);assert.equal(out.remaining,'765');assert.equal(p.snapshot().sorties,0);
  for(let i=0;i<10;i++)out=a.step(out,{setting:3},()=>.999).flow;
  assert.equal(out.researchSortieLeft,0);assert.equal(out.researchSortieHits,2);assert.equal(out.queuedZones.length,2);assert.equal(out.remaining,'765');
 }
});

test('normal-state force uses the natural initial-AT route and keeps the queued sortie',()=>{
 const {c}=load(),p=c.NovaProgress;c.takeForcedResult();
 const flow=p.beforeBet({phase:'normal'},{setting:3},0,false,()=>.9);
 assert.equal(flow.initialStage,'wait');assert.equal(p.snapshot().sorties,1);
});

test('other forced roles and manual/AUTO/fast shared flag consumption remain intact',()=>{
 const {c}=load();c.syncNovaProgress();c.forceResult='BELL';assert.equal(c.takeForcedResult(),'BELL');assert.equal(c.NovaProgress.snapshot().sorties,0);
 c.forceResult='URA_CHALLENGE';c.bonusActive=true;assert.equal(c.takeForcedResult(),'');assert.equal(c.forceResult,'URA_CHALLENGE');
 assert.equal((source.match(/pendingForceResult = takeForcedResult\(\);/g)||[]).length,2);
 assert(source.includes("['SORTIE','ノヴァ出陣チャレンジ（10G・1回予約）']"));
});
