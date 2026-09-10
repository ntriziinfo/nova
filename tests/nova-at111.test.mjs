import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
for(const f of ['nova-art.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const a=ctx.NovaArt;
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const plain=v=>JSON.parse(JSON.stringify(v));

test('draw exactly once at AT initial entry; bonus loss has no level draw',()=>{
 let calls=0;const rng=()=>{calls++;return .5;};
 assert.equal(a.afterBonus({phase:'normal'},{setting:1},0,rng).phase,'normal');assert.equal(calls,0);
 const s=a.afterBonus({phase:'normal'},{setting:1,atLevelWeights:[0,0,100,0,0]},2,rng);
 assert.equal(calls,1);assert.equal(s.atLevel,3);assert.equal(s.remaining,'150');assert.equal(s.sets,'1');
 for(let setting=1;setting<=6;setting++){
  const row=a.atLevelRules.weights[setting-1];assert.equal(row.reduce((x,y)=>x+y,0),100);
  let start=0;for(let level=1;level<=5;level++){
   const end=start+row[level-1]/100;
   if(end>start)assert.equal(a.enter({setting},()=>(start+end)/2).atLevel,level);
   start=end;
  }
  if(setting>1)for(let k=1;k<5;k++)assert.ok(row.slice(0,k).reduce((x,y)=>x+y,0)<=a.atLevelRules.weights[setting-2].slice(0,k).reduce((x,y)=>x+y,0),'higher setting shifts toward upper levels');
 }
 assert.equal(a.enter({atLevelWeights:[0,0,0,0,100]},()=>0).atLevel,5);
 assert.equal(a.enter({atLevelWeights:[100,0,0,0,0]},()=>.999999).atLevel,1);
});

test('all five AT levels survive sets, bonus resume, zone transitions and saved states',()=>{
 for(let level=1;level<=5;level++){
  let s={...a.enter({},()=>.5),atLevel:level,remaining:'1',sets:'1'};
  s=a.step(s,{setting:3},()=>.99,'BELL').flow;
  assert.equal(s.atLevel,level);assert.equal(s.remaining,'150');
  s=a.afterBonus(s,{setting:6},1,()=>{throw Error('AT was redrawn');});assert.equal(s.atLevel,level);
  s=a.startZone(s,'sosuke',{setting:3},()=>.5);assert.equal(s.atLevel,level);
  s=a.settleZone(a.normalize(plain(s)));assert.equal(s.atLevel,level);
  let ended=a.step({...s,remaining:'1',sets:'0'},{setting:3},()=>.99,'BELL').flow;
  assert.equal(ended.phase,'art');assert.equal(ended.comebackLeft,5);assert.equal(ended.atLevel,level);
  for(let i=0;i<5;i++)ended=a.step(ended,{setting:3},()=>.99,'MISS').flow;
  assert.equal(ended.phase,'normal');assert.equal(ended.atLevel,undefined);
 }
 const old=a.normalize({phase:'art',payoutVersion:1,remaining:'999',sets:'2'});
 assert.equal(old.atLevel,0);assert.equal(old.remaining,'999');assert.equal(old.sets,'2');
});

test('level role mixes normalize, retain net 4pt/G and preserve BIG chances',()=>{
 for(let setting=1;setting<=6;setting++)for(let level=1;level<=5;level++){
  const row=a.roleProbabilities(setting,level),base=a.roleProbabilities(setting,1);
  assert.ok(Object.values(row).every(p=>p>=0&&p<=1));
  assert.ok(Math.abs(Object.values(row).reduce((s,p)=>s+p,0)-1)<1e-12);
  const net=Object.entries(row).reduce((s,[k,p])=>s+a.payout(k)*p,0)-3*(1-row.REPLAY);
  assert.ok(Math.abs(net-4)<1e-12);
  assert.ok(Math.abs(row.WEAK_NOVA/base.WEAK_NOVA-a.atLevelRules.levels[level].rare/a.atLevelRules.levels[1].rare)<1e-12);
  assert.equal(a.bonusRules.normal.atChance,.52);assert.equal(a.bonusRules.upper.atChance,.8);
 }
});

test('same chosen zone retains identical guarantees and outcome across all AT levels',()=>{
 for(const id of a.zoneIds){
  function trace(level){const rng=random(111819);let s=a.startZone({...a.enter({},rng),atLevel:level},id,{setting:3},rng);const out=[];
   for(let i=0;i<100&&s.zone;i++){s=a.prepareBet(s,{},rng);const t=a.step(s,{setting:3},rng);s=t.flow;const clean=plain(t);delete clean.flow.atLevel;out.push(clean);}return out;
  }
  for(let level=2;level<=5;level++)assert.deepEqual(trace(level),trace(1),id+' Lv.'+level);
 }
});

test('level zone distribution increases smoothly and preparation is independent',()=>{
 for(let level=1;level<=5;level++)for(let setting=1;setting<=6;setting++){
  const groups=a.zoneGroupWeights(setting,false,false,level),rule=a.atLevelRules.levels[level];
  groups.forEach((p,i)=>assert.ok(Math.abs(p-rule.groups[i])<1e-10));
  const boosted=a.zoneGroupWeights(setting,true,false,level);assert.ok(boosted[0]<rule.groups[0]);
  assert.ok(Math.abs(boosted.reduce((x,y)=>x+y,0)-100)<1e-10);
  assert.deepEqual(plain(a.zoneGroupWeights(setting,false,true,level)),plain(a.zoneGroupWeights(setting,false,true,0)));
  if(level>1){const prior=a.atLevelRules.levels[level-1];assert.ok(rule.rare>prior.rare&&rule.direct>prior.direct&&rule.weakNova>prior.weakNova&&rule.groups[0]<prior.groups[0]);}
 }
});
